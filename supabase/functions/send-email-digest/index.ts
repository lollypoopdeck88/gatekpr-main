import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DigestItem {
  type: string;
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  timestamp: string;
}

function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'high': return '#dc2626';
    case 'medium': return '#f59e0b';
    default: return '#6b7280';
  }
}

function getUrgencyBadge(urgency: string): string {
  const color = getUrgencyColor(urgency);
  const label = urgency.charAt(0).toUpperCase() + urgency.slice(1);
  return `<span style="display: inline-block; padding: 2px 8px; background: ${color}20; color: ${color}; border-radius: 4px; font-size: 12px; font-weight: 600;">${label}</span>`;
}

function generateDigestHtml(items: DigestItem[], userName: string, hoaName: string, appUrl: string): string {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  `;

  const headerStyles = `
    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
    color: white;
    padding: 30px;
    text-align: center;
    border-radius: 8px 8px 0 0;
  `;

  const contentStyles = `
    background: #ffffff;
    padding: 30px;
    border: 1px solid #e5e7eb;
    border-top: none;
    border-radius: 0 0 8px 8px;
  `;

  const buttonStyles = `
    display: inline-block;
    background: #1e40af;
    color: white;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    margin-top: 20px;
  `;

  const highUrgencyItems = items.filter(i => i.urgency === 'high');
  const mediumUrgencyItems = items.filter(i => i.urgency === 'medium');
  const lowUrgencyItems = items.filter(i => i.urgency === 'low');

  const renderItems = (items: DigestItem[], sectionTitle: string, borderColor: string) => {
    if (items.length === 0) return '';
    return `
      <div style="margin-bottom: 24px;">
        <h3 style="color: ${borderColor}; margin-bottom: 12px; font-size: 16px;">${sectionTitle} (${items.length})</h3>
        ${items.map(item => `
          <div style="padding: 12px; background: #f9fafb; border-left: 3px solid ${borderColor}; margin-bottom: 8px; border-radius: 0 4px 4px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="color: #1f2937;">${escapeHtml(item.title)}</strong>
              ${getUrgencyBadge(item.urgency)}
            </div>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">${escapeHtml(item.description)}</p>
            <p style="color: #9ca3af; margin: 4px 0 0; font-size: 12px;">${new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        `).join('')}
      </div>
    `;
  };

  return `
    <div style="${baseStyles}">
      <div style="${headerStyles}">
        <h1 style="margin: 0; font-size: 28px;">📋 Your Daily Digest</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">${escapeHtml(hoaName)}</p>
      </div>
      <div style="${contentStyles}">
        <h2 style="color: #1e40af; margin-top: 0;">Hi ${escapeHtml(userName)},</h2>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Here's a summary of items that need your attention:
        </p>
        
        ${items.length === 0 ? `
          <div style="text-align: center; padding: 40px;">
            <p style="font-size: 48px; margin: 0;">✅</p>
            <p style="color: #16a34a; font-weight: 600; font-size: 18px;">You're all caught up!</p>
            <p style="color: #6b7280;">No pending items require your attention.</p>
          </div>
        ` : `
          ${renderItems(highUrgencyItems, '🔴 Urgent Items', '#dc2626')}
          ${renderItems(mediumUrgencyItems, '🟡 Pending Items', '#f59e0b')}
          ${renderItems(lowUrgencyItems, '🔵 Updates', '#3b82f6')}
        `}
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        
        <div style="text-align: center;">
          <a href="${appUrl}/dashboard" style="${buttonStyles}">View Dashboard</a>
        </div>
        
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px;">
          You're receiving this digest because you have email notifications enabled.<br/>
          <a href="${appUrl}/profile" style="color: #3b82f6;">Manage notification preferences</a>
        </p>
      </div>
    </div>
  `;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const appUrl = req.headers.get("origin") || "https://gatekpr.lovable.app";
    
    console.log("[Email Digest] Starting digest generation...");

    // Get all profiles with email notifications enabled
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id, email, name, hoa_id, notify_by_email")
      .eq("notify_by_email", true)
      .not("hoa_id", "is", null);

    if (profilesError) {
      console.error("[Email Digest] Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`[Email Digest] Found ${profiles?.length || 0} profiles with email notifications enabled`);

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const profile of profiles || []) {
      try {
        // Get HOA info
        const { data: hoa } = await supabase
          .from("hoas")
          .select("name")
          .eq("id", profile.hoa_id)
          .single();

        const hoaName = hoa?.name || "Your Community";
        const digestItems: DigestItem[] = [];

        // Check for pending/overdue payments
        const { data: payments } = await supabase
          .from("payment_requests")
          .select("*, payment_schedules(name)")
          .eq("resident_id", profile.user_id)
          .in("status", ["pending", "overdue"]);

        payments?.forEach((payment: any) => {
          digestItems.push({
            type: "payment",
            title: payment.status === "overdue" ? "Overdue Payment" : "Payment Due",
            description: `$${Number(payment.amount).toFixed(2)} - ${payment.payment_schedules?.name || "HOA Dues"}`,
            urgency: payment.status === "overdue" ? "high" : "medium",
            timestamp: payment.due_date,
          });
        });

        // Check for active violations
        const { data: violations } = await supabase
          .from("violations")
          .select("id, title, status, created_at")
          .eq("resident_id", profile.id)
          .in("status", ["sent", "disputed"]);

        violations?.forEach((violation: any) => {
          digestItems.push({
            type: "violation",
            title: "Violation Notice",
            description: violation.title,
            urgency: "high",
            timestamp: violation.created_at,
          });
        });

        // Check for pending maintenance requests
        const { data: maintenance } = await supabase
          .from("maintenance_requests")
          .select("id, title, status, created_at")
          .eq("resident_id", profile.id)
          .in("status", ["submitted", "in_progress"]);

        maintenance?.forEach((request: any) => {
          digestItems.push({
            type: "maintenance",
            title: request.status === "in_progress" ? "Maintenance In Progress" : "Request Submitted",
            description: request.title,
            urgency: "low",
            timestamp: request.created_at,
          });
        });

        // Check for pending reservations
        const { data: reservations } = await supabase
          .from("space_reservations")
          .select("id, purpose, status, reservation_date, community_spaces(name)")
          .eq("resident_id", profile.id)
          .eq("status", "pending");

        reservations?.forEach((reservation: any) => {
          digestItems.push({
            type: "reservation",
            title: "Reservation Pending Approval",
            description: `${reservation.community_spaces?.name || "Space"} - ${new Date(reservation.reservation_date).toLocaleDateString()}`,
            urgency: "low",
            timestamp: reservation.reservation_date,
          });
        });

        // Only send if there are items or it's been a week since last digest
        if (digestItems.length > 0) {
          const html = generateDigestHtml(digestItems, profile.name, hoaName, appUrl);

          const emailResult = await resend.emails.send({
            from: "GateKpr <notifications@resend.dev>",
            to: [profile.email],
            subject: `📋 Your Daily Digest - ${digestItems.length} item${digestItems.length === 1 ? '' : 's'} need attention`,
            html,
          });

          console.log(`[Email Digest] Sent digest to ${profile.email}:`, emailResult);
          results.push({ email: profile.email, success: true });

          // Log the notification
          await supabase.from("notification_logs").insert({
            hoa_id: profile.hoa_id,
            recipient_id: profile.id,
            recipient_email: profile.email,
            notification_type: "email",
            subject: `Daily Digest - ${digestItems.length} items`,
            body: `Digest sent with ${digestItems.length} pending items`,
            status: "sent",
            sent_at: new Date().toISOString(),
          });
        } else {
          console.log(`[Email Digest] Skipping ${profile.email} - no pending items`);
        }
      } catch (userError: any) {
        console.error(`[Email Digest] Error processing ${profile.email}:`, userError);
        results.push({ email: profile.email, success: false, error: userError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Email Digest] Complete. Sent ${successCount}/${results.length} digests`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: results.length,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[Email Digest] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
