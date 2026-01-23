import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    // Verify webhook signature
    if (!signature) {
      console.error("No stripe-signature header found");
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Webhook signature verification failed:", message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Received verified Stripe event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === "subscription" && session.subscription) {
          const hoaId = session.metadata?.hoa_id;
          const planName = session.metadata?.plan_name;
          
          if (hoaId) {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );

            // Upsert subscription record
            await supabase
              .from("hoa_subscriptions")
              .upsert({
                hoa_id: hoaId,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscription.id,
                stripe_price_id: subscription.items.data[0]?.price.id,
                plan_name: planName || "starter",
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                trial_ends_at: subscription.trial_end 
                  ? new Date(subscription.trial_end * 1000).toISOString() 
                  : null,
              }, {
                onConflict: "hoa_id",
              });

            console.log(`Subscription created for HOA ${hoaId}`);
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const hoaId = subscription.metadata?.hoa_id;

        if (hoaId) {
          await supabase
            .from("hoa_subscriptions")
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              canceled_at: subscription.canceled_at 
                ? new Date(subscription.canceled_at * 1000).toISOString() 
                : null,
            })
            .eq("stripe_subscription_id", subscription.id);

          console.log(`Subscription updated for HOA ${hoaId}: ${subscription.status}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment succeeded for invoice:", invoice.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment failed for invoice:", invoice.id);
        // Could send notification email here
        break;
      }

      // Connect account events
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const hoaId = account.metadata?.hoa_id;

        if (hoaId) {
          await supabase
            .from("hoas")
            .update({
              stripe_connect_status: account.details_submitted ? "active" : "pending",
              stripe_connect_payouts_enabled: account.payouts_enabled || false,
              stripe_connect_onboarding_completed: account.details_submitted || false,
            })
            .eq("id", hoaId);

          console.log(`Connect account updated for HOA ${hoaId}: payouts_enabled=${account.payouts_enabled}`);
        }
        break;
      }

      // Resident dues payment events - track fund transfers
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const hoaId = paymentIntent.metadata?.hoa_id;
        const paymentRequestId = paymentIntent.metadata?.payment_request_id;
        const residentPaymentId = paymentIntent.metadata?.payment_id;

        if (hoaId) {
          // Calculate platform fee (e.g., 2.9% + $0.30 for Stripe, plus platform margin)
          const amount = paymentIntent.amount;
          const stripeFee = Math.round(amount * 0.029 + 30); // Stripe's standard fee
          const platformFee = Math.round(amount * 0.01); // 1% platform fee
          const totalFee = stripeFee + platformFee;
          const netAmount = amount - totalFee;

          // Create fund transfer record
          await supabase
            .from("hoa_fund_transfers")
            .insert({
              hoa_id: hoaId,
              payment_id: residentPaymentId || null,
              payment_request_id: paymentRequestId || null,
              stripe_payment_intent_id: paymentIntent.id,
              amount: amount,
              platform_fee: totalFee,
              net_amount: netAmount,
              status: "received",
              received_at: new Date().toISOString(),
            });

          console.log(`Fund transfer record created for HOA ${hoaId}: amount=${amount}, net=${netAmount}`);
        }
        break;
      }

      // Track payout events
      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        
        // Find transfers associated with this payout via the connected account
        // Note: This requires additional tracking - for now, log the event
        console.log("Payout completed:", payout.id, "amount:", payout.amount);
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        console.log("Payout failed:", payout.id, "reason:", payout.failure_code);
        break;
      }

      // Transfer events
      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        const fundTransferId = transfer.metadata?.fund_transfer_id;

        if (fundTransferId) {
          await supabase
            .from("hoa_fund_transfers")
            .update({
              stripe_transfer_id: transfer.id,
              status: "transferred",
              transferred_at: new Date().toISOString(),
            })
            .eq("id", fundTransferId);

          console.log(`Transfer created: ${transfer.id} for fund transfer ${fundTransferId}`);
        }
        break;
      }

      case "transfer.failed": {
        const transfer = event.data.object as Stripe.Transfer;
        const fundTransferId = transfer.metadata?.fund_transfer_id;

        if (fundTransferId) {
          await supabase
            .from("hoa_fund_transfers")
            .update({
              status: "failed",
              failure_reason: "Transfer failed",
            })
            .eq("id", fundTransferId);

          console.log(`Transfer failed: ${transfer.id}`);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
