// ─── useTier — Held App Subscription Tier Logic ──────────────────────────────
//
// Single source of truth for ALL feature access decisions.
//
// TIERS (parent-facing):
//   free     → $0/mo   — Basic logging, AI coach (10 msg/mo), free library,
//                         NS check-in, SOS, forest journey, Root Cellar,
//                         Your Story tab, weather cards
//   plus     → $15/mo  — Everything in Free + full library (incl. courses),
//                         troubleshooting docs, Foundation tab, regulation
//                         insights, sleep patterns & trends, milestone NS
//                         context, Pattern I'm Noticing (full), AI coach
//                         (25 msg/mo) + chat history saved
//   premium  → $30/mo  — Everything in Plus + AI-generated sleep plan,
//                         async email support (human, 24hr response, no
//                         Sundays), wake window & nap adjustments by
//                         consultant, AI coach (50 msg/mo)
//   vip      → Consultant-granted — Everything + human messaging & files,
//                         custom human-built sleep plan, consultant-reviewed
//                         sleep plan, Zoom/phone per package, unlimited coach
//
// TIERS (consultant-facing):
//   internal → Free    — RCC/BBB consultants, covered by 20% revenue split
//   external → $20/mo  — Independent consultants using Held for their practice
//
// AI COACH MESSAGE LIMITS (resets monthly):
//   free:    10  messages/month  (no history saved)
//   plus:    25  messages/month  (history saved)
//   premium: 50  messages/month  (history saved)
//   vip:     unlimited           (history saved)

import { useMemo } from "react";

// ─── TIER CONSTANTS ───────────────────────────────────────────────────────────
export const TIERS = {
  FREE: "free",
  PLUS: "plus",
  PREMIUM: "premium",
  VIP: "vip",
};

export const AI_MESSAGE_LIMITS = {
  free: 10,
  plus: 25,
  premium: 50,
  vip: Infinity,
};

// ─── TIER LABELS (for UI display) ────────────────────────────────────────────
export const TIER_LABELS = {
  free: "Free",
  plus: "Plus",
  premium: "Premium",
  vip: "VIP",
};

export const TIER_PRICES = {
  free: "$0",
  plus: "$15/mo",
  premium: "$30/mo",
  vip: "Included with your package",
};

// ─── STRIPE PRICE IDS ────────────────────────────────────────────────────────
// These must match the secrets set in Supabase Edge Function config.
// STRIPE_PRICE_PLUS        → price_1TCVclElBtdZshsNqveDRCkf  ($15/mo)
// STRIPE_PRICE_PREMIUM     → price_1TDbF3ElBtdZshsNf4fcC7OW  ($30/mo)
// STRIPE_PRICE_CONSULTANT  → price_1T6Xj8ElBtdZshsN2RT3O96R  ($20/mo)

// ─── MAIN HOOK ────────────────────────────────────────────────────────────────
export function useTier({ currentUser, families, consultants }) {
  return useMemo(() => {
    const role = currentUser?.role || "parent";
    const isConsultantRole =
      role === "consultant" ||
      role === "consultant_internal" ||
      role === "admin";
    const isAdminRole = role === "admin";

    // Check both the family record AND the loaded consultants array
    // so VIP works even if consultant_id isn't set on the family row yet
    const hasConsultantAssigned = !!(
      families?.[0]?.consultant_id ||
      (consultants && consultants.length > 0)
    );

    // ── Downgrade grace period check ─────────────────────────────────────────
    // When a consultant ends a relationship, downgrade_scheduled_at is set to
    // now + 3 days. The parent keeps VIP access until that timestamp passes.
    const downgradeScheduledAt = families?.[0]?.downgrade_scheduled_at;
    const isInGracePeriod = downgradeScheduledAt
      ? new Date(downgradeScheduledAt) > new Date()
      : false;

    // ── Resolve tier ──────────────────────────────────────────────────────────
    // VIP = consultant-assigned families get full access automatically.
    // This is the business model: parents invited by a consultant don't pay
    // extra — the consultant's subscription covers their access.
    let tier = currentUser?.subscription_tier || TIERS.FREE;

    if (isConsultantRole || isAdminRole) {
      tier = TIERS.VIP; // consultants/admins see everything
    } else if (hasConsultantAssigned) {
      tier = TIERS.VIP; // parent invited by a consultant → full VIP access
    } else if (isInGracePeriod) {
      tier = TIERS.VIP; // relationship ended but still within 3-day grace window
    }

    const isVIP     = tier === TIERS.VIP;
    const isPremium = tier === TIERS.PREMIUM || isVIP;
    const isPlus    = tier === TIERS.PLUS    || isPremium;
    const isFree    = tier === TIERS.FREE;

    // ── AI Coach message limit ────────────────────────────────────────────────
    const aiMessageLimit = AI_MESSAGE_LIMITS[tier] ?? AI_MESSAGE_LIMITS.free;
    const aiMessagesUsed = currentUser?.ai_messages_used ?? 0;
    const aiMessagesRemaining =
      aiMessageLimit === Infinity
        ? Infinity
        : Math.max(0, aiMessageLimit - aiMessagesUsed);
    const canSendAIMessage = aiMessagesRemaining > 0;

    // ── Feature flags ─────────────────────────────────────────────────────────

    // HOME — always free
    const canAccessHome = true;

    // SLEEP LOG — logging always free; plan tab gated to Premium
    const canAccessSleepLog              = true;
    const canAccessSleepPlan             = isPremium; // Premium+ gets AI-generated plan
    const canAccessConsultantReviewedPlan = isVIP;    // VIP only — consultant-reviewed
    const canAccessCustomHumanPlan        = isVIP;    // VIP only — built by consultant

    // REGULATION — trends free, insights Plus+
    const canAccessRegulationTrends   = true;
    const canAccessRegulationInsights = isPlus;

    // NS PULSE — always free
    const canAccessNSPulse = true;

    // LIBRARY — free resources always; full library (incl. courses) Plus+
    const canAccessFreeLibrary        = true;
    const canAccessFullLibrary        = isPlus; // includes courses & workshops
    const canAccessTroubleshootingPDFs = isPlus;

    // INSIGHTS / DASHBOARD
    const canAccessDashboard         = true;   // Your Story tab — always free
    const canAccessDashboardInsights = isPlus; // Foundation tab — Plus+
    const canAccessFoundationTab     = isPlus; // explicit flag for Foundation tab
    const canAccessRootCellar        = true;   // badges & leaf bank — always free

    // HOME — Pattern I'm Noticing
    const canAccessFullPattern = isPlus; // free users see teaser only

    // MILESTONES
    const canAccessMilestoneList      = true;   // view milestones always free
    const canAccessMilestoneNSContext = isPlus; // NS context layer is Plus+

    // MESSAGING — AI coach always (message-limited); history saved Plus+
    const canAccessAICoach        = true;      // always, but message-limited
    const canSaveCoachHistory     = isPlus;    // free tier is ephemeral
    const canAccessHumanMessaging = isPremium; // Premium: async email (24hr, no Sundays)
    const canAccessFilesTab       = isVIP;     // VIP only (part of consultant relationship)

    // ASYNC EMAIL SUPPORT copy
    const asyncSupportCopy = isVIP
      ? "Your consultant will respond according to your package agreement."
      : isPremium
      ? "Your RCC consultant will respond by email within 24 hours (excluding Sundays)."
      : null;

    // ZOOM / PHONE — VIP only, per package agreement
    const canAccessZoomPhone = isVIP;
    const zoomPhoneCopy = isVIP
      ? "Scheduled according to your package agreement with your consultant."
      : null;

    return {
      // Tier identity
      tier,
      isFree,
      isPlus,
      isPremium,
      isVIP,
      isConsultantRole,
      isAdminRole,
      hasConsultantAssigned,
      isInGracePeriod,
      downgradeScheduledAt,

      // AI coach
      aiMessageLimit,
      aiMessagesUsed,
      aiMessagesRemaining,
      canSendAIMessage,
      canSaveCoachHistory,

      // Feature flags
      canAccessHome,
      canAccessSleepLog,
      canAccessSleepPlan,
      canAccessConsultantReviewedPlan,
      canAccessCustomHumanPlan,
      canAccessRegulationTrends,
      canAccessRegulationInsights,
      canAccessNSPulse,
      canAccessFreeLibrary,
      canAccessFullLibrary,
      canAccessTroubleshootingPDFs,
      canAccessDashboard,
      canAccessDashboardInsights,
      canAccessFoundationTab,
      canAccessRootCellar,
      canAccessFullPattern,
      canAccessMilestoneList,
      canAccessMilestoneNSContext,
      canAccessAICoach,
      canAccessHumanMessaging,
      canAccessFilesTab,
      canAccessZoomPhone,

      // UI copy
      asyncSupportCopy,
      zoomPhoneCopy,

      // Legacy alias so existing isPremium checks still work
      // during the transition — gradually replace with specific flags above
      isPremiumLegacy: isPremium,
    };
  }, [currentUser, families, consultants]);
}

// ─── PAYWALL UPSELL CONFIG ────────────────────────────────────────────────────
// Used by PaywallPrompt components to show the right upgrade message
export function getUpgradePrompt(feature) {
  const prompts = {
    sleep_plan: {
      title: "Get your personalized sleep plan",
      body: "Premium members get an AI-generated sleep plan built from your intake — tailored to your child's temperament and your family's rhythm.",
      cta: "Upgrade to Premium — $30/mo",
      tier: TIERS.PREMIUM,
    },
    consultant_review: {
      title: "Have a consultant check your plan",
      body: "Your consultant will review your sleep plan and adjust wake windows and nap lengths specifically for your child.",
      cta: "Available when working with a consultant",
      tier: TIERS.VIP,
    },
    full_library: {
      title: "Unlock the full resource library",
      body: "Access every course, masterclass, workshop, and troubleshooting guide — including Postpartum Secrets, Cycle Breakers, and the Comprehensive Newborn Course.",
      cta: "Upgrade to Plus — $15/mo",
      tier: TIERS.PLUS,
    },
    troubleshooting_pdfs: {
      title: "Get the sleep troubleshooting guides",
      body: "Targeted guides for the 4-month regression, early rising, nap transitions, and more. Exactly what you need at 3am.",
      cta: "Upgrade to Plus — $15/mo",
      tier: TIERS.PLUS,
    },
    foundation_tab: {
      title: "See your nervous system foundation",
      body: "Your ventral capacity score, growth rings, and foundation status — the interpretation layer behind everything you're tracking.",
      cta: "Upgrade to Plus — $15/mo",
      tier: TIERS.PLUS,
    },
    dashboard_insights: {
      title: "Unlock your full insights",
      body: "See the patterns, trends, and deeper analysis behind your check-in data.",
      cta: "Upgrade to Plus — $15/mo",
      tier: TIERS.PLUS,
    },
    regulation_insights: {
      title: "Understand your regulation patterns",
      body: "Plus members get insights that help make sense of what the data is showing — not just the trends, but what to do with them.",
      cta: "Upgrade to Plus — $15/mo",
      tier: TIERS.PLUS,
    },
    pattern_noticing: {
      title: "Your pattern is coming into focus",
      body: "Plus members can see the full pattern — what your data is showing and what it means for your day.",
      cta: "Upgrade to Plus — $15/mo",
      tier: TIERS.PLUS,
    },
    milestone_ns_context: {
      title: "See the nervous system story behind each milestone",
      body: "Plus members get the polyvagal context for every developmental leap — what's happening in your child's nervous system right now.",
      cta: "Upgrade to Plus — $15/mo",
      tier: TIERS.PLUS,
    },
    human_messaging: {
      title: "Get support from a real sleep consultant",
      body: "Premium members get async email support from an RCC consultant — real human guidance with a response guaranteed within 24 hours (excluding Sundays).",
      cta: "Upgrade to Premium — $30/mo",
      tier: TIERS.PREMIUM,
    },
    ai_coach_limit: {
      title: "You've reached your message limit",
      body: "Upgrade to keep the conversation going. Plus members get 25 messages/month with history saved. Premium gets 50.",
      cta: "Upgrade to Plus — $15/mo",
      tier: TIERS.PLUS,
    },
    coach_history: {
      title: "Your conversations don't have to start over",
      body: "Plus members get coach history saved across sessions — so the context you've built carries forward.",
      cta: "Upgrade to Plus — $15/mo",
      tier: TIERS.PLUS,
    },
  };
  return prompts[feature] || null;
}
