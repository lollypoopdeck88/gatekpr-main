import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML sanitization helper - escapes HTML special characters to prevent XSS
function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get overdue payment requests (status pending and due_date < now)
    const { data: overduePayments, error: paymentsError } = await supabase
      .from("payment_requests")
      .select(`
        *,
        schedule:schedule_id (name, hoa_id),
        profile:profiles!payment_requests_resident_id_fkey (name, email, user_id)
      `)
      .eq("status", "pending")
      .lt("due_date", new Date().toISOString());

    if (paymentsError) {
      throw new Error(`Failed to fetch overdue payments: ${paymentsError.message}`);
    }

    const appUrl = req.headers.get("origin") || "https://gatekpr.app";
    const results: any[] = [];
    const adminNotifications: Record<string, any[]> = {};

    for (const payment of overduePayments || []) {
      const dueDate = new Date(payment.due_date);
      const now = new Date();
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminder to resident
      if (payment.profile?.email) {
        try {
          const emailResponse = await resend.emails.send({
            from: "GateKpr <onboarding@resend.dev>",
            to: [payment.profile.email],
            subject: `⚠️ Payment Reminder: ${escapeHtml(payment.schedule?.name || 'HOA Payment')}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #f87171 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">⚠️ Payment Reminder</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #dc2626; margin-top: 0;">Payment Overdue</h2>
                  <p style="font-size: 16px; color: #374151;">Hi ${escapeHtml(payment.profile.name)},</p>
                  <p style="font-size: 16px; color: #374151;">You have an overdue payment that requires your attention:</p>
                  <table style="width: 100%; margin: 20px 0; background: #fef2f2; border-radius: 8px; padding: 20px;">
                    <tr><td style="padding: 8px 0; color: #6b7280;">Description:</td><td style="font-weight: 600;">${escapeHtml(payment.schedule?.name || 'HOA Payment')}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Amount:</td><td style="font-weight: 600; font-size: 20px; color: #dc2626;">$${payment.amount.toFixed(2)}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Due Date:</td><td style="font-weight: 600;">${dueDate.toLocaleDateString()}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Days Overdue:</td><td style="font-weight: 600; color: #dc2626;">${daysOverdue} days</td></tr>
                  </table>
                  <a href="${appUrl}/dashboard" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Make Payment</a>
                </div>
              </div>
            `,
          });
          results.push({ residentEmail: payment.profile.email, status: "sent", response: emailResponse });
        } catch (e: any) {
          results.push({ residentEmail: payment.profile.email, status: "failed", error: e.message });
        }
      }

      // Group for admin notification
      const hoaId = payment.schedule?.hoa_id;
      if (hoaId) {
        if (!adminNotifications[hoaId]) {
          adminNotifications[hoaId] = [];
        }
        adminNotifications[hoaId].push({
          residentName: payment.profile?.name,
          amount: payment.amount,
          daysOverdue,
          scheduleName: payment.schedule?.name,
        });
      }
    }

    // Send admin digest emails
    for (const [hoaId, payments] of Object.entries(adminNotifications)) {
      // Get admin users for this HOA
      const { data: admins } = await supabase
        .from("profiles")
        .select("email, name, user_id")
        .eq("hoa_id", hoaId);

      if (!admins) continue;

      // Check which ones are actually admins
      for (const admin of admins) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", admin.user_id)
          .in("role", ["admin", "super_admin"]);

        if (roles && roles.length > 0) {
          const totalOverdue = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
          
          try {
            await resend.emails.send({
              from: "GateKpr <onboarding@resend.dev>",
              to: [admin.email],
              subject: `📊 Admin Alert: ${payments.length} Overdue Payments`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 28px;">📊 Overdue Payments Report</h1>
                  </div>
                  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #1e40af; margin-top: 0;">Summary</h2>
                    <table style="width: 100%; margin: 20px 0; background: #eff6ff; border-radius: 8px; padding: 20px;">
                      <tr><td style="padding: 8px 0; color: #6b7280;">Total Overdue:</td><td style="font-weight: 600;">${payments.length} payments</td></tr>
                      <tr><td style="padding: 8px 0; color: #6b7280;">Total Amount:</td><td style="font-weight: 600; font-size: 20px; color: #dc2626;">$${totalOverdue.toFixed(2)}</td></tr>
                    </table>
                    <h3 style="color: #374151;">Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <thead>
                        <tr style="background: #f3f4f6;">
                          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Resident</th>
                          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Amount</th>
                          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Days Overdue</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${payments.map((p: any) => `
                          <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(p.residentName)}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">$${p.amount.toFixed(2)}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">${p.daysOverdue} days</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                    <a href="${appUrl}/admin/payments" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">View All Payments</a>
                  </div>
                </div>
              `,
            });
          } catch (e) {
            console.error("Failed to send admin email:", e);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      overdueCount: overduePayments?.length || 0,
      results 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-payment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
