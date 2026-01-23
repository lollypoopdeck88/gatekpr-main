import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("User not authenticated");

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const paymentRequestId = session.metadata?.payment_request_id;
    const residentId = session.metadata?.resident_id;

    if (!paymentRequestId || residentId !== user.id) {
      throw new Error("Invalid payment session");
    }

    // Check if already processed
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("request_id", paymentRequestId)
      .single();

    if (existingPayment) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment already recorded" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Record the payment
    const amountPaid = (session.amount_total || 0) / 100;
    
    const { error: insertError } = await supabaseAdmin
      .from("payments")
      .insert({
        resident_id: user.id,
        request_id: paymentRequestId,
        amount: amountPaid,
        payment_method: "stripe",
        stripe_transaction_id: session.payment_intent as string,
      });

    if (insertError) {
      console.error("Failed to insert payment:", insertError);
      throw new Error("Failed to record payment");
    }

    // Update payment request status
    const { data: paymentRequest, error: updateError } = await supabaseAdmin
      .from("payment_requests")
      .update({ status: "paid" })
      .eq("id", paymentRequestId)
      .select("*, payment_schedule:schedule_id(name)")
      .single();

    if (updateError) {
      console.error("Failed to update payment request:", updateError);
    }

    // Get resident profile for email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name, email")
      .eq("user_id", user.id)
      .single();

    // Send confirmation email
    if (profile?.email) {
      const appUrl = req.headers.get("origin") || "https://gatekpr.app";
      const paymentName = paymentRequest?.payment_schedule?.name || "HOA Payment";
      
      try {
        await resend.emails.send({
          from: "GateKpr <onboarding@resend.dev>",
          to: [profile.email],
          subject: `✅ Payment Confirmed: $${amountPaid.toFixed(2)}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #16a34a 0%, #4ade80 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">✅ Payment Successful!</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <h2 style="color: #16a34a; margin-top: 0;">Thank You, ${escapeHtml(profile.name)}!</h2>
                <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                  Your payment has been successfully processed.
                </p>
                <table style="width: 100%; margin: 20px 0; background: #f0fdf4; border-radius: 8px; padding: 20px;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Description:</td>
                    <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(paymentName)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Amount Paid:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 20px; color: #16a34a;">$${amountPaid.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Date:</td>
                    <td style="padding: 8px 0; font-weight: 600;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Transaction ID:</td>
                    <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${session.payment_intent || 'N/A'}</td>
                  </tr>
                </table>
                <p style="font-size: 14px; color: #6b7280;">
                  A receipt has been saved to your payment history.
                </p>
                <a href="${appUrl}/payments" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">View Payment History</a>
              </div>
            </div>
          `,
        });
        console.log("Payment confirmation email sent to:", profile.email);
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Payment recorded successfully",
      amount: amountPaid,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
