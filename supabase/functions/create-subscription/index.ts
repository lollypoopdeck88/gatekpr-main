import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gatekpr subscription plans with Stripe price IDs
const PLANS = {
  starter: {
    priceId: "price_1SouliFMqR7dUL8yLHyqVbm5",
    name: "Starter",
    amount: 7900,
  },
  standard: {
    priceId: "price_1SoulxFMqR7dUL8yeuWDDkic",
    name: "Standard",
    amount: 12900,
  },
  plus: {
    priceId: "price_1Soum2FMqR7dUL8yFT5DueJx",
    name: "Plus",
    amount: 17900,
  },
  partner: {
    priceId: "price_1Soum4FMqR7dUL8y5ZTn9Qzl",
    name: "Partner",
    amount: 2900,
  },
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

    const { planId, hoaId, hoaName, billingEmail } = await req.json();

    if (!planId || !PLANS[planId as keyof typeof PLANS]) {
      throw new Error("Invalid plan selected");
    }

    if (!hoaId || !hoaName) {
      throw new Error("HOA information required");
    }

    const plan = PLANS[planId as keyof typeof PLANS];
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer already exists
    const email = billingEmail || user.email;
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        name: hoaName,
        metadata: {
          hoa_id: hoaId,
          user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create Stripe Checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        metadata: {
          hoa_id: hoaId,
          plan_name: planId,
        },
      },
      success_url: `${req.headers.get("origin")}/admin/settings?subscription=success`,
      cancel_url: `${req.headers.get("origin")}/admin/settings?subscription=canceled`,
      metadata: {
        hoa_id: hoaId,
        plan_name: planId,
      },
    });

    // Store the Stripe customer ID on the HOA
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseAdmin
      .from("hoas")
      .update({ 
        stripe_customer_id: customerId,
        billing_email: email,
      })
      .eq("id", hoaId);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
