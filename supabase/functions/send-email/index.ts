import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEmailContent } from "./utils.ts";

/**
 * https://resend.com/
 * Testing Notes:
 *   The 'to' must be sent to the owners email.
 *   Run: supabase functions serve --no-verify-jwt --env-file supabase/.env before using.
 */
const resend = new Resend(Deno.env.get("GATEKPR_RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type:
    | "invite"
    | "announcement"
    | "document"
    | "payment_reminder"
    | "join_request_approved"
    | "join_request_denied"
    | "payment_success"
    | "payment_due"
    | "maintenance_request_submitted"
    | "maintenance_request_updated"
    | "reservation_submitted"
    | "reservation_approved"
    | "reservation_denied"
    | "fund_transfer_complete"
    | "fund_transfer_failed";
  to: string;
  data: Record<string, any>;
  hoaId?: string;
  recipientId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Allow CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data, hoaId, recipientId }: EmailRequest =
      await req.json();

    if (!type || !to || !data) {
      throw new Error("Missing required fields: type, to, data");
    }

    const { subject, html } = getEmailContent(type, data);

    let status = "sent";
    let errorMessage = null;

    let isProd = Deno.env.get("GATEKPR_RESEND_API_KEY") == "prod";

    try {
      const emailResponse = await resend.emails.send({
        from: isProd
          ? "GateKpr <gatekpr@gmail.com>"
          : "GateKpr <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      });
      console.log("Email sent successfully:", emailResponse);
    } catch (emailError: any) {
      status = "failed";
      errorMessage = emailError.message;
      console.error("Email send failed:", emailError);
    }

    // Log the notification if hoaId provided
    if (hoaId) {
      const supabaseUrl = Deno.env.get("GATEKPR_SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get(
        "GATEKPR_SUPABASE_SERVICE_ROLE_KEY"
      )!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      await supabaseAdmin.from("notification_logs").insert({
        hoa_id: hoaId,
        recipient_id: recipientId || null,
        recipient_email: to,
        notification_type: "email",
        subject,
        body: html,
        status,
        error_message: errorMessage,
        sent_at: new Date().toISOString(),
      });
    }

    if (status === "failed") {
      throw new Error(errorMessage || "Email send failed");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
