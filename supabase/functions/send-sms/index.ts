import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmsRequest {
  to: string;
  message: string;
  hoaId?: string;
  recipientId?: string;
  subject?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate - only admins should send bulk SMS
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for logging
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { to, message, hoaId, recipientId, subject }: SmsRequest = await req.json();

    if (!to || !message) {
      throw new Error("Missing required fields: to, message");
    }

    let status = 'sent';
    let errorMessage = null;
    let sid = null;

    // MOCK SMS - In production, replace with Twilio
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      // Real Twilio implementation
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      
      const response = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: twilioPhoneNumber,
          Body: message,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        status = 'failed';
        errorMessage = result.message || 'Twilio error';
        throw new Error(`Twilio error: ${result.message || 'Unknown error'}`);
      }

      sid = result.sid;
      console.log("SMS sent via Twilio:", result.sid);
    } else {
      // Mock mode - just log
      console.log("==============================================");
      console.log("📱 MOCK SMS (Twilio not configured)");
      console.log(`To: ${to}`);
      console.log(`Message: ${message}`);
      console.log("==============================================");
    }

    // Log the notification if hoaId provided
    if (hoaId) {
      await supabaseAdmin.from('notification_logs').insert({
        hoa_id: hoaId,
        recipient_id: recipientId || null,
        recipient_phone: to,
        notification_type: 'sms',
        subject: subject || null,
        body: message,
        status,
        error_message: errorMessage,
        sent_at: new Date().toISOString(),
        created_by: user.id,
      });
    }

    return new Response(
      JSON.stringify({ success: true, mock: !twilioAccountSid, sid }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-sms:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
