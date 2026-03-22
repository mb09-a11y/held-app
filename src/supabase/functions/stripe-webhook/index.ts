// ─── Held App: Stripe Webhook Handler ────────────────────────────────────────
// Deploy to: supabase/functions/stripe-webhook/index.ts
//
// This function handles Stripe events and syncs subscription_tier
// back to the profiles table in Supabase.
//
// SETUP:
// 1. Deploy: supabase functions deploy stripe-webhook
// 2. Set secrets:
//    supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
//    supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
// 3. In Stripe Dashboard → Webhooks, add endpoint:
//    https://<project>.supabase.co/functions/v1/stripe-webhook
//    Events to listen for:
//      - checkout.session.completed
//      - customer.subscription.updated
//      - customer.subscription.deleted
//      - invoice.payment_failed

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

// ─── STRIPE PRICE → TIER MAPPING ─────────────────────────────────────────────
// Add your actual Stripe Price IDs here after creating products in Stripe
const PRICE_TO_TIER: Record<string, string> = {
  // Parent tiers
  [Deno.env.get("STRIPE_PRICE_PLUS") ?? "price_plus_placeholder"]:    "plus",
  [Deno.env.get("STRIPE_PRICE_PREMIUM") ?? "price_premium_placeholder"]: "premium",
  // Consultant tier
  [Deno.env.get("STRIPE_PRICE_CONSULTANT") ?? "price_consultant_placeholder"]: "consultant_external",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function setUserTier(userId: string, tier: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ subscription_tier: tier })
    .eq("id", userId);

  if (error) {
    console.error(`Failed to set tier for user ${userId}:`, error);
    throw error;
  }
  console.log(`✓ Set tier=${tier} for user=${userId}`);
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  // Look up user by stripe_customer_id stored on their profile
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`Processing Stripe event: ${event.type}`);

  try {
    switch (event.type) {

      // ── Payment succeeded → activate tier ──────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const tier = session.metadata?.tier; // set when creating checkout session

        if (!userId || !tier) {
          console.warn("checkout.session.completed missing user_id or tier in metadata");
          break;
        }

        // Store stripe_customer_id for future lookups
        if (session.customer) {
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: session.customer as string })
            .eq("id", userId);
        }

        await setUserTier(userId, tier);
        break;
      }

      // ── Subscription updated (plan change, renewal) ────────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const userId = await getUserIdFromCustomer(customerId);

        if (!userId) {
          console.warn(`No user found for customer ${customerId}`);
          break;
        }

        // Determine tier from price
        const priceId = sub.items.data[0]?.price?.id;
        const tier = priceId ? PRICE_TO_TIER[priceId] : null;

        if (!tier) {
          console.warn(`Unknown price ID: ${priceId}`);
          break;
        }

        // Only update if subscription is active
        if (sub.status === "active" || sub.status === "trialing") {
          await setUserTier(userId, tier);
        } else if (sub.status === "past_due" || sub.status === "unpaid") {
          // Payment failed but grace period — keep current tier for now
          console.log(`Subscription ${sub.id} is ${sub.status} — keeping tier for grace period`);
        }
        break;
      }

      // ── Subscription cancelled/expired → downgrade to free ─────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const userId = await getUserIdFromCustomer(customerId);

        if (!userId) {
          console.warn(`No user found for customer ${customerId}`);
          break;
        }

        // Check if this is a consultant subscription
        const priceId = sub.items.data[0]?.price?.id;
        const wasConsultantTier = priceId === Deno.env.get("STRIPE_PRICE_CONSULTANT");

        if (wasConsultantTier) {
          // Consultant subscription ended — their families stay VIP
          // (VIP is tied to the family relationship, not the consultant's billing)
          console.log(`Consultant subscription ended for user ${userId}`);
          // Note: don't touch family VIP status here — handle separately
        } else {
          // Parent subscription ended → downgrade to free
          await setUserTier(userId, "free");
        }
        break;
      }

      // ── Payment failed → notify but don't immediately downgrade ────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await getUserIdFromCustomer(customerId);

        if (!userId) break;

        // Log the failure — Stripe will retry and send subscription.deleted
        // if it ultimately fails. We don't downgrade immediately.
        console.log(`Payment failed for user ${userId} — Stripe will retry`);

        // Optional: set a payment_failed flag on profile to show an in-app banner
        await supabase
          .from("profiles")
          .update({ payment_failed: true })
          .eq("id", userId);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response(`Internal error: ${err.message}`, { status: 500 });
  }
});
