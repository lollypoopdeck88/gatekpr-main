import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user - only super admins can transfer funds
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Not authenticated");
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", {
      _user_id: user.id,
    });

    if (!isSuperAdmin) {
      throw new Error("Only super admins can transfer funds");
    }

    const { hoa_id: hoaId, transferIds } = await req.json();

    if (!hoaId) {
      throw new Error("HOA ID required");
    }

    // Get HOA Connect account
    const { data: hoa, error: hoaError } = await supabaseAdmin
      .from("hoas")
      .select("id, name, billing_email, stripe_connect_id, stripe_connect_payouts_enabled")
      .eq("id", hoaId)
      .single();

    if (hoaError) throw new Error("Failed to fetch HOA");
    if (!hoa.stripe_connect_id) throw new Error("HOA does not have a connected bank account");
    if (!hoa.stripe_connect_payouts_enabled) throw new Error("Payouts are not enabled for this HOA");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get pending transfers for this HOA
    let query = supabaseAdmin
      .from("hoa_fund_transfers")
      .select("*")
      .eq("hoa_id", hoaId)
      .eq("status", "received");

    if (transferIds && transferIds.length > 0) {
      query = query.in("id", transferIds);
    }

    const { data: pendingTransfers, error: transfersError } = await query;

    if (transfersError) throw new Error("Failed to fetch pending transfers");
    if (!pendingTransfers || pendingTransfers.length === 0) {
      return new Response(JSON.stringify({ message: "No pending transfers found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const results = [];

    for (const transfer of pendingTransfers) {
      try {
        // Create transfer to connected account
        const stripeTransfer = await stripe.transfers.create({
          amount: transfer.net_amount,
          currency: "usd",
          destination: hoa.stripe_connect_id,
          source_transaction: transfer.stripe_payment_intent_id ? undefined : undefined, // Optional: link to original charge
          metadata: {
            hoa_id: hoaId,
            fund_transfer_id: transfer.id,
            payment_id: transfer.payment_id || "",
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

        results.push({
          id: transfer.id,
          success: true,
          transferId: stripeTransfer.id,
          amount: transfer.net_amount,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Update transfer record with failure
        await supabaseAdmin
          .from("hoa_fund_transfers")
          .update({
            status: "failed",
            failure_reason: errorMessage,
          })
          .eq("id", transfer.id);

        results.push({
          id: transfer.id,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalAmount = results.filter(r => r.success).reduce((sum, r) => sum + (r.amount || 0), 0);

    // Send email notification if transfers were successful
    if (successCount > 0) {
      await sendTransferNotification(supabaseAdmin, hoa, successCount, totalAmount);
    }

    return new Response(JSON.stringify({
      message: `Transferred ${successCount} of ${results.length} payments`,
      totalAmount,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Transfer funds error:", error);
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
