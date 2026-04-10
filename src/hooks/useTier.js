// ─── useTier — Held App Subscription Tier Logic ──────────────────────────────
//
// Single source of truth for ALL feature access decisions.
//
// TIERS (parent-facing):
//   free     → $0/mo   — Basic logging, AI coach (10 msg/mo), free library, NS Pulse, regulation trends
//   plus     → $10/mo  — Everything + full library, troubleshooting PDFs, dashboard insights,
//                         regulation insights, AI sleep plan (AI-generated), AI coach (50 msg/mo)
//   premium  → $50/mo  — Everything in plus + consultant-reviewed sleep plan, wake window/nap
//                         adjustments by consultant, async text support (24hr guarantee),
//                         full library, AI coach (100 msg/mo)
//   vip      → Free (consultant-granted) — Everything + human messaging, files, custom human-built
//                         plan, Zoom/phone per package agreement, unlimited AI coach
//
// TIERS (consultant-facing):
//   internal → Free    — RCC/BBB consultants, covered by 20% revenue split
//   external → $20/mo  — Independent consultants using Held for their practice
//
// AI COACH MESSAGE LIMITS (resets monthly):
//   free:    10  messages/month
//   plus:    50  messages/month
//   premium: 100 messages/month
//   vip:     unlimited

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
  plus: 50,
  premium: 100,
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
  plus: "$10/mo",
  premium: "$50/mo",
  vip: "Included with your package",
};

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

    // ── Resolve tier ──────────────────────────────────────────────────────────
    // VIP = consultant-assigned families get full access automatically.
    // This is the business model: parents invited by a consultant don't pay extra —
    // the consultant's subscription covers their access.
    let tier = currentUser?.subscription_tier || TIERS.FREE;

    if (isConsultantRole || isAdminRole) {
      tier = TIERS.VIP; // consultants/admins see everything
    } else if (hasConsultantAssigned) {
      tier = TIERS.VIP; // parent invited by a consultant → full VIP access
    }

    const isVIP = tier === TIERS.VIP;
    const isPremium = tier === TIERS.PREMIUM || isVIP;
    const isPlus = tier === TIERS.PLUS || isPremium;
    const isFree = tier === TIERS.FREE;

    // ── AI Coach message limit ────────────────────────────────────────────────
    const aiMessageLimit = AI_MESSAGE_LIMITS[tier] ?? AI_MESSAGE_LIMITS.free;
    const aiMessagesUsed = currentUser?.ai_messages_used ?? 0;
    const aiMessagesRemaining =
      aiMessageLimit === Infinity
        ? Infinity
        : Math.max(0, aiMessageLimit - aiMessagesUsed);
    const canSendAIMessage = aiMessagesRemaining > 0;

    // ── Feature flags ─────────────────────────────────────────────────────────

    // HOME — always visible for everyone
    const canAccessHome = true;

    // SLEEP LOG — full log always visible; plan tab gated
    const canAccessSleepLog = true;
    const canAccessSleepPlan = isPlus; // Plus+ gets AI-generated plan
    const canAccessConsultantReviewedPlan = isPremium; // Premium+ gets consultant-reviewed plan
    const canAccessCustomHumanPlan = isVIP; // VIP only — built by consultant

    // REGULATION — trends free, insights paid
    const canAccessRegulationTrends = true;
    const canAccessRegulationInsights = isPlus;

    // NS PULSE — always free
    const canAccessNSPulse = true;

    // LIBRARY — free resources always; full library gated
    const canAccessFreeLibrary = true;
    const canAccessFullLibrary = isPlus;
    const canAccessTroubleshootingPDFs = isPlus;

    // DASHBOARD — basic always; insights gated
    const canAccessDashboard = true;
    const canAccessDashboardInsights = isPlus;

    // MESSAGING — AI coach always (with limits); human messaging Premium+
    const canAccessAICoach = true; // always, but message-limited
    const canAccessHumanMessaging = isPremium; // Premium: async text (24hr guarantee)
    const canAccessFilesTab = isVIP; // VIP only (part of consultant relationship)

    // ASYNC TEXT SUPPORT copy — varies by tier
    // Premium: "Your consultant will respond within 24 hours."
    // VIP: "Your consultant will respond according to your package agreement."
    const asyncSupportCopy = isVIP
      ? "Your consultant will respond according to your package agreement."
      : isPremium
      ? "Your consultant will respond within 24 hours."
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

      // AI coach
      aiMessageLimit,
      aiMessagesUsed,
      aiMessagesRemaining,
      canSendAIMessage,

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
  }, [currentUser, families]);
}

// ─── PAYWALL UPSELL CONFIG ────────────────────────────────────────────────────
// Used by PaywallPrompt components to show the right upgrade message
export function getUpgradePrompt(feature) {
  const prompts = {
    sleep_plan: {
      title: "Get your personalized sleep plan",
      body: "Plus members get an AI-generated sleep plan built from your intake — tailored to your child's temperament and your family's rhythm.",
      cta: "Upgrade to Plus — $10/mo",
      tier: TIERS.PLUS,
    },
    consultant_review: {
      title: "Have a consultant check your plan",
      body: "A real sleep consultant will review your AI-generated plan, adjust wake windows and nap lengths for your child specifically.",
      cta: "Upgrade to Premium — $50/mo",
      tier: TIERS.PREMIUM,
    },
    full_library: {
      title: "Unlock the full resource library",
      body: "Access every course, masterclass, and workshop — including Postpartum Secrets, Cycle Breakers, and the Comprehensive Newborn Course.",
      cta: "Upgrade to Plus — $10/mo",
      tier: TIERS.PLUS,
    },
    troubleshooting_pdfs: {
      title: "Get the sleep troubleshooting guides",
      body: "Targeted PDFs for the 4-month regression, early rising, nap transitions, and more. Exactly what you need at 3am.",
      cta: "Upgrade to Plus — $10/mo",
      tier: TIERS.PLUS,
    },
    dashboard_insights: {
      title: "Unlock full dashboard insights",
      body: "See trends, patterns, and deeper analysis of your child's sleep and regulation data.",
      cta: "Upgrade to Plus — $10/mo",
      tier: TIERS.PLUS,
    },
    regulation_insights: {
      title: "Understand your regulation patterns",
      body: "Plus members get insights that help you make sense of what your data is showing — not just the trends, but what to do with them.",
      cta: "Upgrade to Plus — $10/mo",
      tier: TIERS.PLUS,
    },
    human_messaging: {
      title: "Talk to a real sleep consultant",
      body: "Premium members get async text support from an RCC consultant — real human guidance, guaranteed response within 24 hours.",
      cta: "Upgrade to Premium — $50/mo",
      tier: TIERS.PREMIUM,
    },
    ai_coach_limit: {
      title: "You've reached your message limit",
      body: "Upgrade to keep the conversation going. Plus members get 50 messages/month, Premium gets 100.",
      cta: "Upgrade to Plus — $10/mo",
      tier: TIERS.PLUS,
    },
  };
  return prompts[feature] || null;
}
