import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransferResult {
  hoaId: string;
  hoaName: string;
  success: boolean;
  transferCount: number;
  totalAmount: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if this is a manual trigger or scheduled
    const authHeader = req.headers.get("Authorization");
    const isManualTrigger = !!authHeader;

    if (isManualTrigger) {
      // For manual triggers, verify super admin
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !user) {
        throw new Error("Invalid authentication");
      }

      const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", {
        _user_id: user.id,
      });

      if (!isSuperAdmin) {
        throw new Error("Only super admins can trigger scheduled transfers manually");
      }
    } else {
      // For scheduled invocations, check the transfer schedule settings
      const { data: scheduleSettings, error: settingsError } = await supabaseAdmin
        .from("platform_settings")
        .select("value")
        .eq("key", "transfer_schedule")
        .single();

      if (settingsError) {
        console.log("Could not fetch schedule settings, proceeding with transfer");
      } else {
        const config = scheduleSettings?.value as { frequency: string; day_of_week: number; enabled: boolean } | null;
        
        if (!config?.enabled) {
          console.log("Automatic transfers are disabled");
          return new Response(JSON.stringify({ 
            message: "Automatic transfers are disabled", 
            processedHoas: 0 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        if (config.frequency === "manual") {
          console.log("Transfer frequency set to manual only");
          return new Response(JSON.stringify({ 
            message: "Transfer frequency set to manual only", 
            processedHoas: 0 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // For weekly frequency, check if today is the correct day
        if (config.frequency === "weekly") {
          const today = new Date().getUTCDay();
          if (today !== config.day_of_week) {
            console.log(`Skipping: Today is ${today}, scheduled day is ${config.day_of_week}`);
            return new Response(JSON.stringify({ 
              message: `Weekly transfer scheduled for day ${config.day_of_week}, today is ${today}`, 
              processedHoas: 0 
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        }
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get all HOAs with Connect enabled and pending transfers
    const { data: hoasWithPending, error: hoasError } = await supabaseAdmin
      .from("hoas")
      .select(`
        id,
        name,
        billing_email,
        stripe_connect_id,
        stripe_connect_payouts_enabled
      `)
      .eq("stripe_connect_payouts_enabled", true)
      .not("stripe_connect_id", "is", null);

    if (hoasError) {
      throw new Error(`Failed to fetch HOAs: ${hoasError.message}`);
    }

    if (!hoasWithPending || hoasWithPending.length === 0) {
      console.log("No HOAs with enabled payouts found");
      return new Response(JSON.stringify({ 
        message: "No HOAs with enabled payouts", 
        processedHoas: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const results: TransferResult[] = [];

    for (const hoa of hoasWithPending) {
      try {
        // Get pending transfers for this HOA
        const { data: pendingTransfers, error: transfersError } = await supabaseAdmin
          .from("hoa_fund_transfers")
          .select("*")
          .eq("hoa_id", hoa.id)
          .in("status", ["pending", "received"]);

        if (transfersError) {
          console.error(`Failed to fetch transfers for HOA ${hoa.id}:`, transfersError);
          results.push({
            hoaId: hoa.id,
            hoaName: hoa.name,
            success: false,
            transferCount: 0,
            totalAmount: 0,
            error: transfersError.message,
          });
          continue;
        }

        if (!pendingTransfers || pendingTransfers.length === 0) {
          console.log(`No pending transfers for HOA: ${hoa.name}`);
          continue;
        }

        let successCount = 0;
        let totalTransferred = 0;

        for (const transfer of pendingTransfers) {
          try {
            // Create transfer to connected account
            const stripeTransfer = await stripe.transfers.create({
              amount: transfer.net_amount,
              currency: "usd",
              destination: hoa.stripe_connect_id!,
              metadata: {
                hoa_id: hoa.id,
                fund_transfer_id: transfer.id,
                payment_id: transfer.payment_id || "",
                scheduled: "true",
              },
            });

            // Update transfer record
            await supabaseAdmin
              .from("hoa_fund_transfers")
              .update({
                stripe_transfer_id: stripeTransfer.id,
                status: "transferred",
                transferred_at: new Date().toISOString(),
              })
              .eq("id", transfer.id);

            successCount++;
            totalTransferred += transfer.net_amount;
          } catch (transferError) {
            const errorMessage = transferError instanceof Error ? transferError.message : "Unknown error";
            console.error(`Transfer failed for ${transfer.id}:`, errorMessage);
            
            await supabaseAdmin
              .from("hoa_fund_transfers")
              .update({
                status: "failed",
                failure_reason: errorMessage,
              })
              .eq("id", transfer.id);
          }
        }

        if (successCount > 0) {
          results.push({
            hoaId: hoa.id,
            hoaName: hoa.name,
            success: true,
            transferCount: successCount,
            totalAmount: totalTransferred,
          });

          // Send email notification to HOA admins
          await sendTransferNotification(supabaseAdmin, hoa, successCount, totalTransferred);
        }
      } catch (hoaError) {
        const errorMessage = hoaError instanceof Error ? hoaError.message : "Unknown error";
        console.error(`Error processing HOA ${hoa.id}:`, errorMessage);
        results.push({
          hoaId: hoa.id,
          hoaName: hoa.name,
          success: false,
          transferCount: 0,
          totalAmount: 0,
          error: errorMessage,
        });
      }
    }

    const successfulHoas = results.filter(r => r.success);
    const totalTransferred = successfulHoas.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalTransferCount = successfulHoas.reduce((sum, r) => sum + r.transferCount, 0);

    console.log(`Scheduled transfers complete: ${successfulHoas.length} HOAs, ${totalTransferCount} transfers, $${(totalTransferred / 100).toFixed(2)}`);

    return new Response(JSON.stringify({
      message: "Scheduled transfers processed",
      processedHoas: results.length,
      successfulHoas: successfulHoas.length,
      totalTransfers: totalTransferCount,
      totalAmount: totalTransferred,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Scheduled transfer error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function sendTransferNotification(
  supabaseAdmin: any,
  hoa: { id: string; name: string; billing_email: string | null },
  transferCount: number,
  totalAmount: number
) {
  try {
    // Get admin users for this HOA
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, name")
      .eq("hoa_id", hoa.id)
      .eq("status", "active");

    if (adminsError || !admins) {
      console.error("Failed to fetch HOA admins:", adminsError);
      return;
    }

    // Get admin role users
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Failed to fetch admin roles:", rolesError);
      return;
    }

    const adminUserIds = new Set((adminRoles as Array<{ user_id: string }>)?.map(r => r.user_id) || []);
    const adminProfiles = (admins as Array<{ id: string; email: string; name: string }>).filter(p => adminUserIds.has(p.id));

    // Also include billing email if set
    const emailRecipients = new Set<string>();
    
    if (hoa.billing_email) {
      emailRecipients.add(hoa.billing_email);
    }
    
    adminProfiles.forEach(admin => {
      if (admin.email) {
        emailRecipients.add(admin.email);
      }
    });

    if (emailRecipients.size === 0) {
      console.log(`No email recipients for HOA ${hoa.name}`);
      return;
    }

    // Send email via send-email function
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "";
    
    for (const email of emailRecipients) {
      try {
        const { error: emailError } = await supabaseAdmin.functions.invoke("send-email", {
          body: {
            type: "fund_transfer_complete",
            to: email,
            data: {
              hoaName: hoa.name,
              transferCount,
              totalAmount: totalAmount / 100,
              appUrl,
            },
            hoaId: hoa.id,
          },
        });

        if (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError);
        } else {
          console.log(`Transfer notification sent to ${email}`);
        }
      } catch (err) {
        console.error(`Error sending email to ${email}:`, err);
      }
    }
  } catch (error) {
    console.error("Error sending transfer notifications:", error);
  }
}
