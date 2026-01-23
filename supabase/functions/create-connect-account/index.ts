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

    const { hoaId, hoaName, refreshUrl, returnUrl } = await req.json();

    if (!hoaId) {
      throw new Error("HOA ID required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if HOA already has a Connect account
    const { data: hoa, error: hoaError } = await supabaseAdmin
      .from("hoas")
      .select("stripe_connect_id, stripe_connect_status, name")
      .eq("id", hoaId)
      .single();

    if (hoaError) throw new Error("Failed to fetch HOA");

    let accountId = hoa.stripe_connect_id;

    // Create new Express account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "non_profit", // HOAs are typically non-profit
        business_profile: {
          name: hoaName || hoa.name,
          mcc: "8641", // Civic, social, fraternal associations
        },
        metadata: {
          hoa_id: hoaId,
          user_id: user.id,
        },
      });

      accountId = account.id;

      // Save Connect account ID to HOA
      await supabaseAdmin
        .from("hoas")
        .update({
          stripe_connect_id: accountId,
          stripe_connect_status: "pending",
        })
        .eq("id", hoaId);
    }

    // Create account link for onboarding
    const origin = req.headers.get("origin") || "";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || `${origin}/admin/settings?connect=refresh`,
      return_url: returnUrl || `${origin}/admin/settings?connect=complete`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      accountId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Connect account error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
