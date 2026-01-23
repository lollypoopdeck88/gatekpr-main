import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  type: "email" | "phone";
  value: string; // email address or phone number
}

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client for auth check
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Service client for updates
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { type, value }: VerificationRequest = await req.json();

    if (!type || !value) {
      throw new Error("Missing required fields: type, value");
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    if (type === "email") {
      // Update profile with email verification code
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          email_verification_code: code,
          email_verification_expires_at: expiresAt,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Send email with code
      const emailResponse = await resend.emails.send({
        from: "GateKpr <onboarding@resend.dev>",
        to: [value],
        subject: "🔐 Your GateKpr Verification Code",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">🔐 Verification Code</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Your verification code is:
              </p>
              <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace; border-radius: 8px; margin: 20px 0;">
                ${code}
              </div>
              <p style="font-size: 14px; color: #6b7280;">
                This code expires in 10 minutes. If you didn't request this, please ignore this email.
              </p>
            </div>
          </div>
        `,
      });

      console.log("Email verification code sent:", emailResponse);

    } else if (type === "phone") {
      // Update profile with phone verification code
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          phone_verification_code: code,
          phone_verification_expires_at: expiresAt,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // MOCK SMS - In production, replace with Twilio
      // const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      // const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      // const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
      
      console.log("==============================================");
      console.log("📱 MOCK SMS (Twilio not configured)");
      console.log(`To: ${value}`);
      console.log(`Message: Your GateKpr verification code is: ${code}`);
      console.log("==============================================");
      
      // When Twilio is configured, use this:
      // const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      // const response = await fetch(twilioUrl, {
      //   method: "POST",
      //   headers: {
      //     "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
      //     "Content-Type": "application/x-www-form-urlencoded",
      //   },
      //   body: new URLSearchParams({
      //     To: value,
      //     From: twilioPhoneNumber,
      //     Body: `Your GateKpr verification code is: ${code}`,
      //   }),
      // });
    }

    return new Response(
      JSON.stringify({ success: true, message: `Verification code sent to ${type}` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-verification-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
