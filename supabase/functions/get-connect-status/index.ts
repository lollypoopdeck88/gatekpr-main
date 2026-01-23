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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Not authenticated");
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const { hoaId } = await req.json();

    if (!hoaId) {
      throw new Error("HOA ID required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get HOA Connect account info
    const { data: hoa, error: hoaError } = await supabaseAdmin
      .from("hoas")
      .select("stripe_connect_id, stripe_connect_status, stripe_connect_payouts_enabled, stripe_connect_onboarding_completed")
      .eq("id", hoaId)
      .single();

    if (hoaError) throw new Error("Failed to fetch HOA");

    if (!hoa.stripe_connect_id) {
      return new Response(JSON.stringify({
        connected: false,
        status: "not_connected",
        payoutsEnabled: false,
        onboardingCompleted: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get current account status from Stripe
    const account = await stripe.accounts.retrieve(hoa.stripe_connect_id);

    const status = {
      connected: true,
      status: account.details_submitted ? "active" : "pending",
      payoutsEnabled: account.payouts_enabled || false,
      chargesEnabled: account.charges_enabled || false,
      onboardingCompleted: account.details_submitted || false,
      requiresAction: account.requirements?.currently_due?.length > 0,
      pendingRequirements: account.requirements?.currently_due || [],
      externalAccounts: account.external_accounts?.data?.length || 0,
    };

    // Update HOA with latest status
    await supabaseAdmin
      .from("hoas")
      .update({
        stripe_connect_status: status.status,
        stripe_connect_payouts_enabled: status.payoutsEnabled,
        stripe_connect_onboarding_completed: status.onboardingCompleted,
      })
      .eq("id", hoaId);

    return new Response(JSON.stringify(status), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Get connect status error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
