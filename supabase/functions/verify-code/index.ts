import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  type: "email" | "phone";
  code: string;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

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

    const { type, code }: VerifyRequest = await req.json();

    if (!type || !code) {
      throw new Error("Missing required fields: type, code");
    }

    // Validate code format (6 digits only)
    if (!/^\d{6}$/.test(code)) {
      throw new Error("Invalid code format");
    }

    // Check for rate limiting
    const { data: attempts } = await supabaseAdmin
      .from("verification_attempts")
      .select("*")
      .eq("user_id", user.id)
      .eq("verification_type", type)
      .maybeSingle();

    // Check if user is locked out
    if (attempts?.locked_until && new Date(attempts.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(attempts.locked_until).getTime() - Date.now()) / 60000
      );
      console.log(`User ${user.id} is locked out for ${remainingMinutes} more minutes`);
      throw new Error(`Too many failed attempts. Please try again in ${remainingMinutes} minute(s).`);
    }

    // Get profile to check code
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !profile) {
      throw new Error("Profile not found");
    }

    // Helper function to handle failed verification
    const handleFailedAttempt = async () => {
      const newFailedAttempts = (attempts?.failed_attempts || 0) + 1;
      const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;
      
      const updateData: Record<string, any> = {
        user_id: user.id,
        verification_type: type,
        failed_attempts: newFailedAttempts,
        last_attempt: new Date().toISOString(),
      };

      if (shouldLock) {
        updateData.locked_until = new Date(
          Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
        ).toISOString();
        console.log(`User ${user.id} locked out for ${LOCKOUT_DURATION_MINUTES} minutes after ${newFailedAttempts} failed attempts`);
      }

      await supabaseAdmin
        .from("verification_attempts")
        .upsert(updateData, { onConflict: "user_id,verification_type" });

      if (shouldLock) {
        // Also invalidate the verification code to force a new one
        if (type === "email") {
          await supabaseAdmin
            .from("profiles")
            .update({
              email_verification_code: null,
              email_verification_expires_at: null,
            })
            .eq("user_id", user.id);
        } else if (type === "phone") {
          await supabaseAdmin
            .from("profiles")
            .update({
              phone_verification_code: null,
              phone_verification_expires_at: null,
            })
            .eq("user_id", user.id);
        }
        throw new Error(`Too many failed attempts. Your account has been locked for ${LOCKOUT_DURATION_MINUTES} minutes. Please request a new code.`);
      }

      const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedAttempts;
      throw new Error(`Invalid verification code. ${remainingAttempts} attempt(s) remaining.`);
    };

    // Helper function to clear attempts on success
    const clearAttempts = async () => {
      await supabaseAdmin
        .from("verification_attempts")
        .delete()
        .eq("user_id", user.id)
        .eq("verification_type", type);
    };

    if (type === "email") {
      if (!profile.email_verification_code) {
        throw new Error("No verification code pending");
      }

      if (new Date(profile.email_verification_expires_at) < new Date()) {
        throw new Error("Verification code has expired");
      }

      if (profile.email_verification_code !== code) {
        await handleFailedAttempt();
        return new Response(null, { status: 500 }); // Never reached, handleFailedAttempt throws
      }

      // Mark email as verified
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          email_verified: true,
          email_verification_code: null,
          email_verification_expires_at: null,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Clear failed attempts on success
      await clearAttempts();
      console.log(`Email verified for user ${user.id}`);

    } else if (type === "phone") {
      if (!profile.phone_verification_code) {
        throw new Error("No verification code pending");
      }

      if (new Date(profile.phone_verification_expires_at) < new Date()) {
        throw new Error("Verification code has expired");
      }

      if (profile.phone_verification_code !== code) {
        await handleFailedAttempt();
        return new Response(null, { status: 500 }); // Never reached, handleFailedAttempt throws
      }

      // Mark phone as verified
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          phone_verified: true,
          phone_verification_code: null,
          phone_verification_expires_at: null,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Clear failed attempts on success
      await clearAttempts();
      console.log(`Phone verified for user ${user.id}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: `${type} verified successfully` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in verify-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
