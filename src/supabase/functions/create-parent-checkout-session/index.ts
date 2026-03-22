// ─── Held App: Create Parent Checkout Session ────────────────────────────────
// Deploy to: supabase/functions/create-parent-checkout-session/index.ts
//
// Called from the UpgradeModal in the app. Creates a Stripe Checkout session
// for the requested tier and returns a redirect URL.
//
// SETUP:
// 1. Create products in Stripe Dashboard:
//    - Held Plus:    $10/month recurring  → copy Price ID → STRIPE_PRICE_PLUS
//    - Held Premium: $50/month recurring  → copy Price ID → STRIPE_PRICE_PREMIUM
//    - Consultant:   $20/month recurring  → copy Price ID → STRIPE_PRICE_CONSULTANT
//
// 2. Set secrets:
//    supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
//    supabase secrets set STRIPE_PRICE_PLUS=price_xxx
//    supabase secrets set STRIPE_PRICE_PREMIUM=price_xxx
//    supabase secrets set STRIPE_PRICE_CONSULTANT=price_xxx
//    supabase secrets set APP_URL=https://held-app.vercel.app

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.1.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const APP_URL = Deno.env.get("APP_URL") ?? "https://held-app.vercel.app";

// ─── TIER → STRIPE PRICE MAPPING ─────────────────────────────────────────────
const TIER_PRICES: Record<string, string | undefined> = {
  plus:    Deno.env.get("STRIPE_PRICE_PLUS"),
  premium: Deno.env.get("STRIPE_PRICE_PREMIUM"),
  consultant_external: Deno.env.get("STRIPE_PRICE_CONSULTANT"),
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { email, name, user_id, tier = "plus" } = await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or email" }),
        { headers: { ...CORS, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const priceId = TIER_PRICES[tier];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Unknown tier: ${tier}` }),
        { headers: { ...CORS, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Look up or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user_id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: name || email,
        metadata: { user_id },
      });
      customerId = customer.id;

      // Store customer ID for future lookups
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user_id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}?upgrade_success=true&tier=${tier}`,
      cancel_url: `${APP_URL}?upgrade_cancelled=true`,
      metadata: {
        user_id,
        tier,
      },
      subscription_data: {
        metadata: { user_id, tier },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("Checkout session error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to create checkout session" }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
