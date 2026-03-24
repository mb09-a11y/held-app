import { useState, useEffect, useMemo } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { callAI } from "../../lib/ai.js";
import { getPrompt } from "../../lib/prompts.js";
import { getCurrentWonderWeeksLeap, getMilestonesForAge } from "../../modules/milestones/data/milestones.js";
import { HamburgerButton } from "../shared/AppDrawer.jsx";
import { NSCheckin } from "../../modules/held/NSCheckin.jsx";

// ─── AGE LABEL ────────────────────────────────────────────────────────────────
function ageLabel(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  const totalMonths = years * 12 + months;
  return totalMonths < 24 ? `${totalMonths}mo` : `${years}y`;
}

// ─── LOCKED CONTENT WRAPPER ───────────────────────────────────────────────────
function Locked({ teaser, cta = "Unlock with Premium", onUpgrade, T, children, isPremium }) {
  if (isPremium) return children;
  return (
    <div style={{ position: "relative" }}>
      {/* Blurred teaser */}
      <div style={{ filter: "blur(3px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}>
        {teaser}
      </div>
      {/* Overlay */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: `${T.bg}CC`, borderRadius: 12, gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>🔒</span>
        <button onClick={onUpgrade}
          style={{ padding: "9px 20px", borderRadius: 20, border: "none", background: T.teal, color: "#fff", fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {cta}
        </button>
      </div>
    </div>
  );
}

// ─── UPGRADE MODAL ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose, T, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleUpgrade() {
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-parent-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: currentUser?.email,
          name: currentUser?.name,
          user_id: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
        onClose();
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: T.bg2, borderRadius: "20px 20px 0 0", width: "100%", padding: "28px 24px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
          <div style={{ fontFamily: serif, fontSize: 24, color: T.headingText, marginBottom: 8 }}>Held Premium</div>
          <p style={{ fontFamily: font, fontSize: 14, color: T.muted, lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>
            Get AI-powered sleep insights, a personalized daily focus, and a context-aware coach that knows your baby.
          </p>
        </div>
        {[
          { icon: "✦", label: "AI sleep insights & pattern recognition" },
          { icon: "🎯", label: "Personalized Focus for Today" },
          { icon: "💬", label: "Context-aware sleep coach" },
          { icon: "📚", label: "Full resource library" },
          { icon: "🌿", label: "Nervous system insights" },
        ].map(f => (
          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{f.icon}</span>
            <span style={{ fontFamily: font, fontSize: 13.5, color: T.text }}>{f.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontSize: 22, color: T.teal, marginBottom: 4 }}>$10/month</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 20 }}>Cancel anytime</div>
          {error && <div style={{ fontFamily: font, fontSize: 12.5, color: T.rose, marginBottom: 12 }}>{error}</div>}
          <button onClick={handleUpgrade} disabled={loading}
            style={{ display: "block", width: "100%", padding: "14px", borderRadius: 12, border: "none", background: loading ? T.faint : T.teal, color: loading ? T.muted : "#fff", fontFamily: font, fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer", marginBottom: 12 }}>
            {loading ? "Opening Stripe…" : "Get Premium →"}
          </button>
          <button onClick={onClose}
            style={{ background: "none", border: "none", fontFamily: font, fontSize: 13, color: T.muted, cursor: "pointer" }}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EMOTIONAL HEADER ─────────────────────────────────────────────────────────
const EMOTIONAL_HEADERS = [
  "Today is a reset, not a continuation of yesterday.",
  "You don't have to be perfect. You just have to show up.",
  "Your presence matters more than your performance.",
  "Small, consistent steps build something real.",
  "Rest is not a reward. It's part of the work.",
  "You're doing better than you think.",
  "Even regulated-enough is good enough.",
  "Progress isn't always visible. It's still happening.",
  "One moment at a time is enough.",
  "Tired parents can still be loving parents.",
];

function getEmotionalHeader(currentUser) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = currentUser?.name?.split(" ")[0] || "there";
  const msg = EMOTIONAL_HEADERS[new Date().getDate() % EMOTIONAL_HEADERS.length];
  return { greeting: `${greeting}, ${name}.`, message: msg };
}

// ─── FAMILY STATE HOOK ────────────────────────────────────────────────────────
function useFamilyState(familyId, childId, userId) {
  const [familyState, setFamilyState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) { setLoading(false); return; }

    async function load() {
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const since24 = new Date(Date.now() - 86400000).toISOString();

      const [
        { data: sleepLogs },
        { data: checkins },
        { data: child },
        { data: intakeData },
        { data: sleepConfig },
      ] = await Promise.all([
        (() => {
          let q = supabase.from("sleep_logs").select("*").eq("family_id", familyId).gte("ts", since7);
          if (childId) q = q.eq("child_id", childId);
          return q.order("ts", { ascending: false });
        })(),
        supabase.from("regulation_checkins").select("*").eq("user_id", userId)
          .gte("checked_in_at", since7).order("checked_in_at", { ascending: false }),
        childId ? supabase.from("children").select("*").eq("id", childId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("intake_responses").select("*").eq("family_id", familyId).maybeSingle(),
        supabase.from("sleep_configs").select("recommended_wake_windows").eq("family_id", familyId).maybeSingle(),
      ]);

      const logs = sleepLogs || [];
      const todayLogs = logs.filter(l => new Date(l.ts) > new Date(since24));
      // Include open sessions (no end_ts) so the home screen can detect an active sleep
      const sessions = logs.filter(l => l.type === "sleep_session" && l.end_ts);
      const allSessions = logs.filter(l => l.type === "sleep_session"); // includes open
      const todaySessions = todayLogs.filter(l => l.type === "sleep_session" && l.end_ts);

      // Sleep metrics
      const totalSleepToday = todaySessions.reduce((s, l) => s + (l.total_sleep_ms || 0), 0);
      const avgNightWakes = sessions.length
        ? Math.round(logs.filter(l => l.type === "night_waking").length / Math.max(sessions.length, 1) * 10) / 10
        : null;
      const recentMoods = sessions.slice(0, 5).map(l => l.mood).filter(Boolean);
      const lastWakeUp = sessions[0]?.end_ts || null;

      // Regulation
      const recentCheckins = (checkins || []).slice(0, 7);
      const overwhelmScore = recentCheckins.reduce((s, c) => s + (c.reactivity || 5), 0) / Math.max(recentCheckins.length, 1);
      const stateFrequency = recentCheckins.reduce((acc, c) => { acc[c.state] = (acc[c.state] || 0) + 1; return acc; }, {});
      const dominantState = Object.entries(stateFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Child profile from intake
      const intake = intakeData || {};

      setFamilyState({
        childProfile: {
          name: child?.data?.name || child?.name || null,
          age: child?.data ? ageLabel(child.data.dob) : child ? ageLabel(child.dob) : null,
          dob: child?.data?.dob || child?.dob || null,
          temperament: intake.temperament || null,
          sensoryPreferences: intake.sensory_preferences || null,
        },
        parentState: {
          overwhelmLevel: Math.round(overwhelmScore),
          nervousSystemTrend: dominantState,
          recentCheckIns: recentCheckins.slice(0, 3),
          lastCheckinState: recentCheckins[0]?.state || null,
        },
        sleepData: {
          totalSleepTodayHours: (totalSleepToday / 3600000).toFixed(1),
          napCountToday: todaySessions.length,
          feedCountToday: todayLogs.filter(l => l.type === "feed").length,
          nightWakesAvg: avgNightWakes,
          lastWakeUp,
          recentMoods,
          weekSessions: allSessions.slice(0, 14), // includes open session if one exists
          consistency: sessions.length >= 5 ? "building" : sessions.length >= 2 ? "starting" : "new",
        },
        planData: {
          hasIntake: !!intakeData,
          currentPhase: intake.sleep_phase || null,
          targetMorningWake: intake.ideal_wake_time || intake.wake_time || null,
          recommendedWakeWindows: sleepConfig?.recommended_wake_windows || null,
        },
      });
      setLoading(false);
    }

    load();
  }, [familyId, childId, userId]);

  return { familyState, loading };
}

// ─── AI INSIGHT HOOK ──────────────────────────────────────────────────────────
function useAIInsight(familyState, isPremium) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPremium || !familyState) return;
    if (familyState.sleepData.weekSessions.length < 2) return;

    const cacheKey = `rcc_insight_${new Date().toDateString()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setInsight(JSON.parse(cached)); return; }

    setLoading(true);
    const { sleepData, parentState, childProfile } = familyState;

    callAI({
      max_tokens: 600,
      system: getPrompt("sleep_insight"),
      messages: [{
        role: "user",
        content: `Child: ${childProfile.name || "baby"}, ${childProfile.age || "young"}.
Sleep today: ${sleepData.totalSleepTodayHours}h across ${sleepData.napCountToday} nap(s).
Recent night wakes average: ${sleepData.nightWakesAvg ?? "unknown"}.
Parent nervous system trend: ${parentState.nervousSystemTrend || "unknown"}, overwhelm level: ${parentState.overwhelmLevel}/10.
Consistency: ${sleepData.consistency}.
Recent wake-up moods: ${sleepData.recentMoods.join(", ") || "none logged"}.`
      }],
    })
      .then(text => {
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        setInsight(parsed);
        localStorage.setItem(cacheKey, JSON.stringify(parsed));
      })
      .catch(() => setInsight(null))
      .finally(() => setLoading(false));
  }, [isPremium, familyState?.sleepData?.napCountToday]);

  return { insight, loading };
}

// ─── CHECKIN HISTORY HOOK ────────────────────────────────────────────────────
function useCheckinHistory(userId, familyId) {
  const [history, setHistory] = useState([]);
  const [patterns, setPatterns] = useState(null);

  useEffect(() => {
    if (!userId || !familyId) return;
    const since = new Date(Date.now() - 28 * 86400000).toISOString(); // 28 days
    supabase
      .from("parent_checkins")
      .select("situation, feeling, checked_in_at, hour_of_day, ai_summary")
      .eq("user_id", userId)
      .eq("family_id", familyId)
      .gte("checked_in_at", since)
      .order("checked_in_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        setHistory(data);

        // ── Derive patterns client-side ──
        const total = data.length;

        // Time-of-day: bucket into morning/nap/bedtime
        const timeSlots = data.reduce((acc, c) => {
          const h = c.hour_of_day;
          const slot = h < 11 ? "morning" : h < 16 ? "nap time" : "bedtime";
          acc[slot] = (acc[slot] || 0) + 1;
          return acc;
        }, {});
        const hardestTime = Object.entries(timeSlots).sort((a,b) => b[1]-a[1])[0];

        // Emotional: most frequent feeling
        const feelingCounts = data.reduce((acc, c) => {
          acc[c.feeling] = (acc[c.feeling] || 0) + 1;
          return acc;
        }, {});
        const dominantFeeling = Object.entries(feelingCounts).sort((a,b) => b[1]-a[1])[0];

        // Situation+feeling combos
        const combos = data.reduce((acc, c) => {
          const key = `${c.situation}__${c.feeling}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        const topCombo = Object.entries(combos).sort((a,b) => b[1]-a[1])[0];

        // Progress: compare last 7 days vs prior 7 days
        const now = Date.now();
        const last7 = data.filter(c => new Date(c.checked_in_at) > new Date(now - 7*86400000));
        const prior7 = data.filter(c => {
          const t = new Date(c.checked_in_at).getTime();
          return t > now - 14*86400000 && t <= now - 7*86400000;
        });
        const hardFeelings = ["overwhelmed","anxious","exhausted","frustrated"];
        const hardLast7 = last7.filter(c => hardFeelings.includes(c.feeling)).length;
        const hardPrior7 = prior7.filter(c => hardFeelings.includes(c.feeling)).length;
        const progressDelta = prior7.length > 0 ? hardLast7 - hardPrior7 : null;

        setPatterns({
          total,
          hardestTime: hardestTime?.[0] || null,
          hardestTimeCount: hardestTime?.[1] || 0,
          dominantFeeling: dominantFeeling?.[0] || null,
          dominantFeelingCount: dominantFeeling?.[1] || 0,
          topComboSituation: topCombo?.[0]?.split("__")[0] || null,
          topComboFeeling: topCombo?.[0]?.split("__")[1] || null,
          topComboCount: topCombo?.[1] || 0,
          progressDelta, // negative = fewer hard check-ins = improvement
          last7Count: last7.length,
          prior7Count: prior7.length,
        });
      });
  }, [userId, familyId]);

  async function saveCheckin(situation, feeling, aiSummary) {
    if (!userId || !familyId) return;
    await supabase.from("parent_checkins").insert({
      user_id: userId,
      family_id: familyId,
      situation,
      feeling,
      hour_of_day: new Date().getHours(), // computed client-side (avoids Postgres timezone immutability issue)
      ai_summary: aiSummary || null,
    });
    // Refresh history
    const since = new Date(Date.now() - 28 * 86400000).toISOString();
    const { data } = await supabase
      .from("parent_checkins")
      .select("situation, feeling, checked_in_at, hour_of_day, ai_summary")
      .eq("user_id", userId)
      .eq("family_id", familyId)
      .gte("checked_in_at", since)
      .order("checked_in_at", { ascending: false })
      .limit(30);
    if (data) setHistory(data);
  }

  return { history, patterns, saveCheckin };
}

// ─── PARENT HOME ──────────────────────────────────────────────────────────────
export function ParentHome({ user, onLogout, onInviteCo, onAddChild, onOpenDrawer, onFindConsultant }) {
  const T = useT();
  const { setTab, consultants, currentUser, activeChild, activeFamily, isPremium, hasConsultantAssigned, setPendingSleepAction } = useApp();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [whatStep, setWhatStep] = useState("idle"); // idle | baby | parent | loading | response
  const [whatAnswers, setWhatAnswers] = useState({});
  const [whatResponse, setWhatResponse] = useState(null);
  const consultant = consultants?.[0];
  const isCo = currentUser?.role === "co_caregiver";

  const { familyState, loading: fsLoading } = useFamilyState(
    activeFamily?.id,
    activeChild?.id,
    currentUser?.id
  );
  const { insight, loading: insightLoading } = useAIInsight(familyState, isPremium);
  const { history: checkinHistory, patterns, saveCheckin } = useCheckinHistory(currentUser?.id, activeFamily?.id);
  const { greeting, message } = getEmotionalHeader(currentUser);

  // ── "What's happening right now?" guided check-in ──
  function resetCheckin() {
    setWhatStep("idle");
    setWhatAnswers({});
    setWhatResponse(null);
  }

  function answerBaby(val) {
    if (val === "just_understand") {
      // Skip "how are you?" — go straight to insight mode
      const answers = { baby: val, parent: "curious" };
      setWhatAnswers(answers);
      submitCheckin(answers);
    } else {
      setWhatAnswers(a => ({ ...a, baby: val }));
      setWhatStep("parent");
    }
  }

  function answerParent(val) {
    const answers = { ...whatAnswers, parent: val };
    setWhatAnswers(answers);
    submitCheckin(answers);
  }

  async function submitCheckin(answers) {
    setWhatStep("loading");

    const childAge = activeChild?.dob
      ? (() => {
          const birth = new Date(activeChild.dob);
          const now = new Date();
          let years = now.getFullYear() - birth.getFullYear();
          let mos = now.getMonth() - birth.getMonth();
          if (now.getDate() < birth.getDate()) mos--;
          if (mos < 0) { years--; mos += 12; }
          const totalMonths = years * 12 + mos;
          // Always use months up to 24 for sleep coaching — a 19mo and 12mo are very different
          return totalMonths < 24 ? `${totalMonths} month old` : `${years} year old`;
        })()
      : "young baby";
    const childName = activeChild?.name || "your baby";

    const situationLabels = {
      just_understand: "I don't have a specific problem — I just want to understand what might be going on for my baby developmentally and what's normal for this age",
      bedtime_mess:  "bedtime has been a real struggle — it feels chaotic and hard",
      short_naps:    "naps have been short today and I'm not sure why",
      wont_settle:   "baby won't settle and nothing seems to be working",
      doing_wrong:   "I don't know what I'm doing wrong and I'm starting to doubt myself",
      something_off: "something feels off but I can't quite put my finger on it",
      just_woke:     "baby just woke up",
      unsure:        "I'm not sure exactly what's going on — just checking in",
    };
    const parentLabels = {
      overwhelmed: "overwhelmed",
      anxious:     "anxious about sleep",
      exhausted:   "running on empty",
      frustrated:  "frustrated",
      okay:        "hanging in there",
      good:        "actually doing okay",
    };

    const situation = situationLabels[answers.baby] || answers.baby;
    const parentState = parentLabels[answers.parent] || answers.parent;

    // ── Build check-in history context for pattern awareness ──
    const historyContext = checkinHistory.length > 0
      ? `This parent's recent check-in history (most recent first):\n` +
        checkinHistory.slice(0, 10).map(c => {
          const d = new Date(c.checked_in_at);
          const timeStr = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) +
            " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return `- ${timeStr}: "${c.situation}" / feeling ${c.feeling}`;
        }).join("\n")
      : "This is their first check-in — no history yet.";

    const patternContext = patterns && patterns.total >= 3 ? [
      patterns.hardestTime && patterns.hardestTimeCount >= 2
        ? `Pattern: ${patterns.hardestTimeCount} of their recent check-ins happened at ${patterns.hardestTime}.`
        : "",
      patterns.dominantFeeling && patterns.dominantFeelingCount >= 2
        ? `Pattern: they've felt "${patterns.dominantFeeling}" in ${patterns.dominantFeelingCount} of their last ${patterns.total} check-ins.`
        : "",
      patterns.topComboCount >= 2
        ? `Pattern: "${patterns.topComboSituation}" paired with feeling "${patterns.topComboFeeling}" has come up ${patterns.topComboCount} times.`
        : "",
      patterns.progressDelta !== null
        ? patterns.progressDelta < 0
          ? `Progress: they had fewer hard check-ins this week than last week — ${Math.abs(patterns.progressDelta)} fewer.`
          : patterns.progressDelta > 0
          ? `Note: hard check-ins have increased by ${patterns.progressDelta} compared to last week.`
          : ""
        : "",
    ].filter(Boolean).join(" ") : "";

    // Build rich context from logged data — used when available, but response
    // is designed to be just as meaningful without it.
    const hasLoggedData = familyState && (
      familyState.sleepData.napCountToday > 0 ||
      familyState.sleepData.weekSessions?.length > 0 ||
      familyState.sleepData.nightWakesAvg != null
    );

    const sleepContext = hasLoggedData ? [
      `Today: ${familyState.sleepData.napCountToday} nap(s), ${familyState.sleepData.totalSleepTodayHours}h total sleep logged.`,
      familyState.sleepData.nightWakesAvg != null ? `Average night wakings this week: ${familyState.sleepData.nightWakesAvg}.` : "",
      familyState.sleepData.recentMoods.length > 0 ? `Recent wake-up moods: ${familyState.sleepData.recentMoods.slice(0,3).join(", ")}.` : "",
      familyState.parentState.nervousSystemTrend ? `Parent nervous system trend: ${familyState.parentState.nervousSystemTrend}.` : "",
    ].filter(Boolean).join(" ") : "";

    // Tell the AI explicitly whether data exists so it responds appropriately
    const dataNote = hasLoggedData
      ? `Sleep data context: ${sleepContext}`
      : `No sleep data has been logged yet — this parent is brand new or just getting started. Do not reference any data. Instead, respond entirely from the situation and feeling they described, and from what you know developmentally about a ${childAge}. Make them feel completely seen without needing any numbers.`;

    const isInsightMode = answers.baby === "just_understand";

    // Prompts now live in src/lib/prompts.js — resolved via getPrompt()

    try {
      const raw = await callAI({
        max_tokens: 700,
        system: getPrompt(isInsightMode ? "sleep_checkin_insight" : "sleep_checkin"),
        messages: [{
          role: "user",
          content: `My ${childAge}, ${childName}: ${situation}. I'm feeling ${parentState}. ${dataNote}${patternContext ? " " + patternContext : ""}

${historyContext}`,
        }],
      });

      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setWhatResponse(parsed);
      setWhatStep("response");
      // Save this check-in for pattern tracking — fire and forget
      const aiSummary = parsed.what_this_might_be?.slice(0, 200) || null;
      saveCheckin(answers.baby, answers.parent, aiSummary).catch(() => {});
    } catch {
      setWhatResponse({
        what_this_might_be: "Something interrupted that response — but the fact that you're checking in matters.",
        what_you_might_be_feeling: "Whatever you're feeling right now is valid. This is hard work.",
        what_baby_might_be_communicating: "Your baby is communicating with you — you're learning their language together.",
        try_this: ["Take one slow breath before your next response to baby", "Remind yourself: you don't have to fix everything right now"],
      });
      setWhatStep("response");
    }
  }



  // ── Smart status card data — filtered to active child ──
  const sleepLogs = (familyState?.sleepData?.weekSessions || [])
    .filter(l => !activeChild?.id || !l.child_id || l.child_id === activeChild.id);
  const recentSessions = [...sleepLogs].sort((a,b) => new Date(b.ts) - new Date(a.ts));
  const openSession = recentSessions.find(s => !s.end_ts);
  // Sort completed sessions by end_ts (wake time) not ts (put down time)
  // so lastCompleted always reflects the most recent wake-up across all caregivers
  const lastCompleted = [...sleepLogs]
    .filter(s => s.end_ts)
    .sort((a,b) => new Date(b.end_ts) - new Date(a.end_ts))[0] || null;
  const lastWokeMs = lastCompleted ? new Date(lastCompleted.end_ts).getTime() : null;
  const minsAwake = lastWokeMs ? Math.round((Date.now() - lastWokeMs) / 60000) : null;

  // ── Next put-down suggestion (when awake) ──
  // Use age-based wake windows — rough but meaningful without full SleepLog config here
  const childDobHome = activeChild?.dob;
  const ageMonthsHome = (() => {
    if (!childDobHome) return null;
    const birth = new Date(childDobHome);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let mos = now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) mos--;
    if (mos < 0) { years--; mos += 12; }
    return years * 12 + mos;
  })();
  const napCountToday = sleepLogs.filter(l =>
    l.type === "sleep_session" && l.end_ts &&
    new Date(l.ts).toDateString() === new Date().toDateString() &&
    l.session_type !== "night"
  ).length;
  // Simple age-based wake window lookup (mirrors SleepLog logic)
  function homeWakeWindow(months, napIdx) {
    const ww = months === null ? [2.0, 3.0] :
      months * 4.33 < 4   ? [0.75, 0.75, 0.75, 0.75, 0.75, 1.0] :
      months * 4.33 < 12  ? [1.0,  1.0,  1.25, 1.25, 1.5,  1.75] :
      months < 5  ? [1.25, 1.5,  1.75, 2.0,  2.25] :
      months < 7  ? [2.0,  2.25, 2.75, 3.0] :
      months < 11 ? [2.5,  3.0,  3.5] :
      months < 14 ? [3.0,  4.0] :
      months < 37 ? [4.5,  5.75] : [11.0];
    return ww[napIdx] ?? ww[ww.length - 1];
  }
  // Use consultant-configured wake windows if available, fall back to age-based
  const consultantWindows = familyState?.planData?.recommendedWakeWindows;
  const nextWindowHrs = consultantWindows
    ? (consultantWindows[napCountToday] ?? consultantWindows[consultantWindows.length - 1])
    : homeWakeWindow(ageMonthsHome, napCountToday);
  const nextPutDownTs = lastWokeMs ? new Date(lastWokeMs + nextWindowHrs * 3600000) : null;
  const nextPutDownStr = nextPutDownTs ? nextPutDownTs.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const minsUntilPutDown = nextPutDownTs ? Math.round((nextPutDownTs - Date.now()) / 60000) : null;

  // ── Suggested wake time (when sleeping) ──
  const putDownMs = openSession ? new Date(openSession.ts).getTime() : null;
  const asleepMs = openSession?.fell_asleep_ts ? new Date(openSession.fell_asleep_ts).getTime() : putDownMs;
  const isNightSession = openSession?.session_type === "night";
  const suggestedWakeTs = (() => {
    if (!openSession) return null;
    if (isNightSession) {
      // Check for a targetMorningWake time from family config/intake
      const targetWakeStr = familyState?.planData?.targetMorningWake || null;
      if (targetWakeStr) {
        const match = targetWakeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
        if (match) {
          let h = parseInt(match[1]);
          const m = parseInt(match[2]);
          const meridiem = match[3]?.toLowerCase();
          if (meridiem === "pm" && h < 12) h += 12;
          if (meridiem === "am" && h === 12) h = 0;
          // Find the next occurrence of target wake time >= 7h after put-down.
          // Use local date so UTC offsets don't shift the calendar day.
          const ref = putDownMs || Date.now();
          const wakeDate = new Date(ref);
          wakeDate.setHours(h, m, 0, 0);
          if (wakeDate.getTime() <= ref + 7 * 3600000) {
            wakeDate.setDate(wakeDate.getDate() + 1);
            wakeDate.setHours(h, m, 0, 0);
          }
          if (wakeDate.getTime() > ref + 7 * 3600000) return wakeDate;
        }
      }
      // Fallback: 12h from bedtime
      return new Date((putDownMs || Date.now()) + 12 * 3600000);
    } else {
      // Age-based nap target: 45min <6mo, 60min 6-12mo, 75min 12mo+
      const napMins = ageMonthsHome === null ? 60 : ageMonthsHome < 6 ? 45 : ageMonthsHome < 12 ? 60 : 75;
      return new Date((asleepMs || Date.now()) + napMins * 60000);
    }
  })();
  const suggestedWakeStr = suggestedWakeTs ? suggestedWakeTs.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const minsUntilWake = suggestedWakeTs ? Math.round((suggestedWakeTs - Date.now()) / 60000) : null;

  return (
    <div style={{ paddingBottom: 20 }}>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} T={T} currentUser={currentUser} />}

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ paddingTop: 6 }}>
            <HamburgerButton onOpen={onOpenDrawer} T={T} />
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: T.subText, marginBottom: 4, fontFamily: font }}>
              Rooted Connections Collective
            </div>
            <h1 style={{ fontFamily: serif, fontSize: 26, color: T.headingText, lineHeight: 1.15, marginBottom: 6 }}>
              {greeting}
            </h1>
            <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, fontStyle: "italic", maxWidth: 300 }}>
              "{message}"
            </p>
            {isCo && <div style={{ fontSize: 11.5, color: T.muted, fontFamily: font, marginTop: 4 }}>Co-caregiver view</div>}
          </div>
        </div>
      </div>

      {/* Child switcher pills */}
      <ChildSwitcher onAddChild={onAddChild} />

      {/* ── 1. HERO CHECK-IN CARD ── */}
      {whatStep === "idle" && (
        <div style={{ marginBottom: 14 }}>
          {/* Big tappable check-in — the hero */}
          <button onClick={() => setWhatStep("baby")} style={{
            width: "100%", background: "none", border: "none", cursor: "pointer",
            textAlign: "left", padding: 0, marginBottom: 10,
          }}>
            <div style={{
              borderRadius: 16, padding: "20px 20px",
              background: `linear-gradient(135deg, ${T.teal}18 0%, #A87B8A14 100%)`,
              border: `1.5px solid ${T.teal}30`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 26 }}>💭</span>
                <div style={{
                  padding: "6px 14px", borderRadius: 20,
                  background: T.teal, color: "#fff",
                  fontFamily: font, fontSize: 12, fontWeight: 700,
                }}>
                  Check in →
                </div>
              </div>
              <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText, lineHeight: 1.3, marginBottom: 4 }}>
                {openSession
                  ? "How are you doing right now?"
                  : "How's the rhythm today?"}
              </div>
              <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
                {openSession
                  ? `${activeChild?.name || "Baby"} is sleeping — a moment just for you`
                  : "Tell me what's happening — I'll help you make sense of it"}
              </div>
            </div>
          </button>

          {/* NS Check-In card — Held ambient presence */}
          <NSCheckin />

          {/* Quick log — secondary, compact */}
          <div style={{
            borderRadius: 12, border: `1px solid ${T.border}`,
            background: T.card, padding: "12px 16px", marginBottom: 10,
          }}>
            <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 9 }}>
              Quick log
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "🛏️ Put down",     action: "put_down" },
                { label: "☀️ Woke up",      action: "woke_up" },
                { label: "🌙 Night waking", action: "night_waking" },
              ].map(q => (
                <button key={q.label} onClick={() => { setPendingSleepAction(q.action); setTab("sleep"); }} style={{
                  padding: "7px 13px", borderRadius: 20,
                  border: `1px solid ${T.border}`,
                  background: T.faint, color: T.text,
                  fontFamily: font, fontSize: 12.5, fontWeight: 500,
                  cursor: "pointer",
                }}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Smart sleep status card */}
          <div style={{
            borderRadius: 12, border: `1px solid ${T.border}`,
            background: T.card, padding: "14px 16px", marginBottom: 10,
          }}>
            {openSession ? (
              // ── SLEEPING: show suggested wake time ──
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: isNightSession ? "#8A7BAA" : "#A89B5A", marginBottom: 4 }}>
                    {isNightSession ? "🌙 Night sleep" : "☀️ Nap"} in progress
                  </div>
                  <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 2 }}>
                    Wake by {suggestedWakeStr || "—"}
                  </div>
                  <div style={{ fontFamily: font, fontSize: 11, color: T.muted }}>
                    {minsUntilWake === null ? "" :
                      minsUntilWake < 0 ? `${Math.abs(minsUntilWake)}m past target` :
                      minsUntilWake < 60 ? `in ${minsUntilWake}m` :
                      `in ${Math.floor(minsUntilWake/60)}h ${minsUntilWake%60}m`}
                    {" · "}
                    {isNightSession ? "12h night sleep" : `~${ageMonthsHome !== null && ageMonthsHome < 6 ? 45 : ageMonthsHome !== null && ageMonthsHome < 12 ? 60 : 75}min nap`}
                  </div>
                </div>
                <button onClick={() => { setPendingSleepAction("woke_up"); setTab("sleep"); }} style={{
                  padding: "8px 14px", borderRadius: 10, border: `1px solid ${T.teal}`,
                  background: `${T.teal}12`, color: T.teal,
                  fontFamily: font, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  Log wake →
                </button>
              </div>
            ) : minsAwake !== null ? (
              // ── AWAKE: show next put-down time ──
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 4 }}>
                    {lastCompleted?.session_type === "night" ? "🌅 Good morning" : "☀️ Awake"}
                    {" · "}{minsAwake < 60 ? `${minsAwake}m` : `${Math.floor(minsAwake/60)}h ${minsAwake%60}m`}
                  </div>
                  {nextPutDownStr ? (
                    <>
                      <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 2 }}>
                        Next {napCountToday === 0 && lastCompleted?.session_type !== "night" ? "nap" : napCountToday >= 1 ? "nap" : "sleep"} ~ {nextPutDownStr}
                      </div>
                      <div style={{ fontFamily: font, fontSize: 11, color: T.muted }}>
                        {minsUntilPutDown !== null && minsUntilPutDown < 0
                          ? `${Math.abs(minsUntilPutDown)}m past window — watch for tired cues`
                          : minsUntilPutDown !== null && minsUntilPutDown < 30
                          ? `${minsUntilPutDown}m — start winding down soon`
                          : minsUntilPutDown !== null
                          ? `in ${minsUntilPutDown < 60 ? minsUntilPutDown + "m" : Math.floor(minsUntilPutDown/60) + "h " + minsUntilPutDown%60 + "m"} · ${nextWindowHrs}h wake window`
                          : `${nextWindowHrs}h wake window`}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>
                      woke at {new Date(lastCompleted.end_ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
                <button onClick={() => { setPendingSleepAction("put_down"); setTab("sleep"); }} style={{
                  padding: "8px 14px", borderRadius: 10,
                  border: `1px solid ${minsUntilPutDown !== null && minsUntilPutDown <= 15 ? T.teal : T.border}`,
                  background: minsUntilPutDown !== null && minsUntilPutDown <= 15 ? `${T.teal}12` : T.faint,
                  color: minsUntilPutDown !== null && minsUntilPutDown <= 15 ? T.teal : T.muted,
                  fontFamily: font, fontSize: 12, fontWeight: minsUntilPutDown !== null && minsUntilPutDown <= 15 ? 600 : 400, cursor: "pointer",
                }}>
                  Log put down →
                </button>
              </div>
            ) : (
              // ── NO DATA: first use ──
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 4 }}>
                    Sleep status
                  </div>
                  <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>
                    No sessions logged yet today
                  </div>
                </div>
                <button onClick={() => { setPendingSleepAction("put_down"); setTab("sleep"); }} style={{
                  padding: "8px 14px", borderRadius: 10, border: `1px solid ${T.teal}`,
                  background: `${T.teal}12`, color: T.teal,
                  fontFamily: font, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  Start logging →
                </button>
              </div>
            )}
          </div>

          {/* Dashboard link — quiet, at the bottom */}
          <button onClick={() => setTab("dashboard")} style={{
            width: "100%", padding: "11px", borderRadius: 12,
            border: `1px solid ${T.border}`, background: "none",
            color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <span>📊</span> View Insights
          </button>
        </div>
      )}

      {/* ── CHECK-IN FLOW (steps + response) ── */}
      {whatStep !== "idle" && (() => {
        const C_teal = T.teal;
        const chipStyle = (active) => ({
          padding: "9px 14px", borderRadius: 20, border: `1.5px solid ${active ? C_teal : T.border}`,
          background: active ? `${C_teal}18` : T.card,
          color: active ? C_teal : T.text,
          fontFamily: font, fontSize: 13, fontWeight: active ? 700 : 500,
          cursor: "pointer", transition: "all .15s", textAlign: "left",
        });
        return (
        <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>

            {/* STEP 1 — What's going on? */}
            {whatStep === "baby" && (
              <div>
                <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>
                  Step 1 of 2 · What's going on right now?
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* ✨ Insight option — visually elevated */}
                  <button onClick={() => answerBaby("just_understand")} style={{
                    padding: "12px 16px", borderRadius: 20,
                    border: `1.5px solid ${T.teal}`,
                    background: `linear-gradient(135deg, ${T.teal}15 0%, #A87B8A12 100%)`,
                    color: T.teal,
                    fontFamily: font, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", transition: "all .15s", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span>✨</span>
                    <span>Just help me understand what might be going on</span>
                  </button>

                  {/* Divider */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0" }}>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                    <span style={{ fontFamily: font, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>or something specific</span>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                  </div>

                  {[
                    { val: "bedtime_mess",    label: "🌙 Bedtime is a mess" },
                    { val: "short_naps",      label: "😩 Naps were short today" },
                    { val: "wont_settle",     label: "🙅 Baby won't settle" },
                    { val: "doing_wrong",     label: "💭 I don't know what I'm doing wrong" },
                    { val: "something_off",   label: "🌀 Something feels off" },
                    { val: "just_woke",       label: "☀️ Baby just woke up" },
                    { val: "unsure",          label: "🤷 Not sure — just checking in" },
                  ].map(o => (
                    <button key={o.val} onClick={() => answerBaby(o.val)} style={chipStyle(false)}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 14, alignItems: "center" }}>
                  <button onClick={resetCheckin}
                    style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.muted, cursor: "pointer", padding: 0 }}>
                    ← Cancel
                  </button>
                  <button onClick={() => { resetCheckin(); setTab("sleep"); }}
                    style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.teal, cursor: "pointer", padding: 0 }}>
                    Log something first →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — How are you? */}
            {whatStep === "parent" && (
              <div>
                <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>
                  Step 2 of 2 · And how are <em>you</em>?
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { val: "overwhelmed", label: "😵 Overwhelmed" },
                    { val: "anxious",     label: "😰 Anxious about sleep" },
                    { val: "exhausted",   label: "🥱 Running on empty" },
                    { val: "frustrated",  label: "😤 Frustrated" },
                    { val: "okay",        label: "😐 Hanging in there" },
                    { val: "good",        label: "🙂 Actually doing okay" },
                  ].map(o => (
                    <button key={o.val} onClick={() => answerParent(o.val)} style={chipStyle(false)}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 14, alignItems: "center" }}>
                  <button onClick={() => setWhatStep("baby")}
                    style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.muted, cursor: "pointer", padding: 0 }}>
                    ← Back
                  </button>
                  <button onClick={() => { resetCheckin(); setTab("sleep"); }}
                    style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.teal, cursor: "pointer", padding: 0 }}>
                    Log something first →
                  </button>
                </div>
              </div>
            )}

            {/* LOADING */}
            {whatStep === "loading" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                <div style={{ fontSize: 18 }}>🌿</div>
                <div style={{ fontFamily: font, fontSize: 13.5, color: T.muted, fontStyle: "italic" }}>
                  Thinking about what you shared…
                </div>
              </div>
            )}

            {/* RESPONSE */}
            {whatStep === "response" && whatResponse && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* 🧠 What this might be */}
                <div style={{ padding: "13px 15px", borderRadius: 12, background: `${T.teal}0f`, border: `1px solid ${T.teal}25` }}>
                  <div style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.teal, marginBottom: 7 }}>
                    🧠 What this might be
                  </div>
                  <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7, margin: 0 }}>
                    {whatResponse.what_this_might_be}
                  </p>
                </div>

                {/* ❤️ What you might be feeling */}
                <div style={{ padding: "13px 15px", borderRadius: 12, background: "#A87B8A0f", border: "1px solid #A87B8A25" }}>
                  <div style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#A87B8A", marginBottom: 7 }}>
                    ❤️ What you might be feeling
                  </div>
                  <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7, margin: 0 }}>
                    {whatResponse.what_you_might_be_feeling}
                  </p>
                </div>

                {/* 👶 What baby might be communicating */}
                <div style={{ padding: "13px 15px", borderRadius: 12, background: "#8A7BAA0f", border: "1px solid #8A7BAA25" }}>
                  <div style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#8A7BAA", marginBottom: 7 }}>
                    👶 What {activeChild?.name || "baby"} might be communicating
                  </div>
                  <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7, margin: 0 }}>
                    {whatResponse.what_baby_might_be_communicating}
                  </p>
                </div>

                {/* 🌿 Try this */}
                {whatResponse.try_this?.length > 0 && (
                  <div style={{ padding: "13px 15px", borderRadius: 12, background: "#7BAA8A0f", border: "1px solid #7BAA8A25" }}>
                    <div style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#7BAA8A", marginBottom: 10 }}>
                      🌿 If it feels right, you could try…
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {whatResponse.try_this.map((item, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#7BAA8A22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#7BAA8A", flexShrink: 0, marginTop: 2 }}>
                            {i + 1}
                          </div>
                          <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65, margin: 0 }}>{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={resetCheckin}
                    style={{ flex: 1, background: "none", border: `1px solid ${T.border}`, borderRadius: 10, fontFamily: font, fontSize: 12, color: T.muted, cursor: "pointer", padding: "9px 14px" }}>
                    Close
                  </button>
                  <button onClick={() => { setWhatStep("baby"); setWhatAnswers({}); setWhatResponse(null); }}
                    style={{ flex: 1, background: "none", border: `1px solid ${T.teal}50`, borderRadius: 10, fontFamily: font, fontSize: 12, color: T.teal, cursor: "pointer", padding: "9px 14px" }}>
                    Check in again
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── 2. PATTERN INSIGHT CARD — shows after 3+ check-ins ── */}
      {patterns && patterns.total >= 3 && (() => {
        const lines = [
          patterns.progressDelta !== null && patterns.progressDelta < 0
            ? `🌱 You've had fewer hard moments this week than last — that's real progress, even if it doesn't feel that way yet.`
            : null,
          patterns.hardestTime && patterns.hardestTimeCount >= 2
            ? `🕐 ${patterns.hardestTimeCount} of your recent check-ins happened at ${patterns.hardestTime}. That time of day seems to carry extra weight for you right now.`
            : null,
          patterns.dominantFeeling && patterns.dominantFeelingCount >= 2
            ? `💭 You've been feeling "${patterns.dominantFeeling}" a lot lately. That's worth honoring — it's not a sign you're failing, it's a sign you're carrying a lot.`
            : null,
          patterns.topComboCount >= 2 && patterns.topComboSituation !== patterns.dominantFeeling
            ? `🔗 When ${patterns.topComboSituation?.replace(/_/g," ")} comes up, you tend to feel ${patterns.topComboFeeling}. That connection makes a lot of sense.`
            : null,
        ].filter(Boolean);
        if (lines.length === 0) return null;
        return (
          <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
              ✦ What I'm noticing
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {lines.map((line, i) => (
                <p key={i} style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7, margin: 0 }}>{line}</p>
              ))}
            </div>
          </div>
        );
      })()}


    </div>
  );
}

// ─── CHILD SWITCHER ───────────────────────────────────────────────────────────
function ChildSwitcher({ onAddChild }) {
  const T = useT();
  const { children, activeChild, setActiveChildId } = useApp();
  if (!children || children.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>
        Viewing child
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {children.map(c => {
          const isActive = activeChild?.id === c.id;
          const age = ageLabel(c.dob);
          return (
            <button key={c.id} onClick={() => setActiveChildId(c.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 24, border: `1.5px solid ${isActive ? T.teal : T.border}`, background: isActive ? `${T.teal}18` : T.faint, color: isActive ? T.teal : T.text, fontFamily: font, fontSize: 13, fontWeight: isActive ? 700 : 400, cursor: "pointer", transition: "all .2s" }}>
              {c.photo_url ? (
                <>
                  <img src={c.photo_url} alt={c.name}
                    onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "inline"; }}
                    style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  <span style={{ fontSize: 16, display: "none" }}>{c.gender === "girl" ? "👧" : c.gender === "boy" ? "👦" : "🧒"}</span>
                </>
              ) : (
                <span style={{ fontSize: 16 }}>{c.gender === "girl" ? "👧" : c.gender === "boy" ? "👦" : "🧒"}</span>
              )}
              {c.name}
              {age && <span style={{ fontSize: 10.5, color: isActive ? T.teal : T.muted, fontWeight: 400 }}>{age}</span>}
            </button>
          );
        })}
        <button onClick={onAddChild}
          style={{ padding: "8px 12px", borderRadius: 24, border: `1.5px dashed ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 12.5, cursor: "pointer" }}>
          + Add child
        </button>
      </div>
    </div>
  );
}

export { ChildSwitcher };

// ─── PARENT DASHBOARD ─────────────────────────────────────────────────────────
export function ParentDashboard({ user, onFindConsultant, onInviteCo }) {
  const T = useT();
  const { setTab, consultants, currentUser, activeChild, activeFamily, isPremium } = useApp();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const consultant = consultants?.[0];
  const isCo = currentUser?.role === "co_caregiver";

  const { familyState, loading: fsLoading } = useFamilyState(
    activeFamily?.id,
    activeChild?.id,
    currentUser?.id
  );
  const { insight, loading: insightLoading } = useAIInsight(familyState, isPremium);

  return (
    <div style={{ fontFamily: font, color: T.text, paddingBottom: 80 }}>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} T={T} currentUser={currentUser} />}

      <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: T.subText, marginBottom: 4, fontFamily: font }}>
        Rooted Connections Collective
      </div>
      <h1 style={{ fontFamily: serif, fontSize: 24, color: T.headingText, lineHeight: 1.2, marginBottom: 18 }}>
        Your Dashboard
      </h1>

      <ChildSwitcher onAddChild={() => {}} />

      {/* ── REGULATION SUPPORT ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>
          🌿 You Matter Too
        </div>
        {isPremium && familyState?.parentState?.lastCheckinState ? (
          <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65, marginBottom: 12 }}>
            {familyState.parentState.overwhelmLevel >= 7
              ? `Your nervous system has been working hard lately. Before you jump into the next task, take 60 seconds for yourself.`
              : familyState.parentState.lastCheckinState === "Regulated"
              ? `You checked in as regulated. That energy transfers — your baby feels it.`
              : `A ${familyState.parentState.lastCheckinState?.toLowerCase()} state is honest and valid. A short reset might help before the next sleep window.`}
          </p>
        ) : (
          <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65, marginBottom: 12 }}>
            Take a moment for yourself today. Your regulation is the foundation everything else rests on.
          </p>
        )}
        <button onClick={() => setTab("regulation")}
          style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${T.teal}`, background: `${T.teal}12`, color: T.teal, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Open Regulation →
        </button>
      </div>

      {/* ── TODAY AT A GLANCE ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 12 }}>
          📊 Today at a Glance
        </div>
        {familyState ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Naps",  value: familyState.sleepData.napCountToday,                  icon: "🌙" },
              { label: "Sleep", value: `${familyState.sleepData.totalSleepTodayHours}h`,     icon: "💤" },
              { label: "Feeds", value: familyState.sleepData.feedCountToday,                 icon: "🍼" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 10, background: T.faint }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: T.headingText }}>{s.value}</div>
                <div style={{ fontFamily: font, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {["🌙", "💤", "🍼"].map((icon, i) => (
              <div key={i} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 10, background: T.faint }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: T.muted }}>—</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setTab("sleep")}
          style={{ marginTop: 12, width: "100%", padding: "9px", borderRadius: 9, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 12.5, cursor: "pointer" }}>
          Log today →
        </button>
      </div>

      {/* ── PROGRESS ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
          📈 Sleep Progress
        </div>
        {isPremium && familyState ? (
          <div>
            {familyState.sleepData.weekSessions.length >= 3 ? (
              <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65 }}>
                {familyState.sleepData.nightWakesAvg !== null && familyState.sleepData.nightWakesAvg < 2
                  ? `Night wakings are averaging ${familyState.sleepData.nightWakesAvg} — that's meaningful progress.`
                  : `You've logged ${familyState.sleepData.weekSessions.length} sleep sessions this week. The data is building a picture.`}
                {familyState.sleepData.recentMoods.length > 0 && ` Wake-up moods have been mostly ${familyState.sleepData.recentMoods[0]}.`}
              </p>
            ) : (
              <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65 }}>
                You're building your baseline. Log a few more sessions and we'll start tracking real trends.
              </p>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65, marginBottom: 12 }}>
              {familyState?.sleepData?.weekSessions?.length >= 3
                ? `You've been logging consistently this week. That habit is building something real.`
                : `Every log you add helps build a clearer picture of your baby's patterns.`}
            </p>
            {!isPremium && (
              <button onClick={() => setShowUpgrade(true)}
                style={{ background: "none", border: "none", fontFamily: font, fontSize: 12.5, color: T.teal, cursor: "pointer", padding: 0, fontWeight: 600 }}>
                See what the patterns mean →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── INSIGHT CARD ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
          ✦ Today's Insight
        </div>
        {isPremium ? (
          insightLoading ? (
            <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>Reading your data thoughtfully…</div>
          ) : insight ? (
            <>
              <p style={{ fontFamily: font, fontSize: 14, color: T.text, lineHeight: 1.65, marginBottom: 8, fontWeight: 600 }}>{insight.pattern}</p>
              <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 8, fontStyle: "italic" }}>{insight.likely_cause}</p>
              <p style={{ fontFamily: font, fontSize: 13, color: T.teal, lineHeight: 1.6 }}>🌿 {insight.reassurance}</p>
            </>
          ) : (
            <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              Log a few sleep sessions and we'll start generating personalized insights for you.
            </p>
          )
        ) : (
          <Locked isPremium={false} T={T} onUpgrade={() => setShowUpgrade(true)}
            cta="Unlock insights →"
            teaser={
              <div>
                <p style={{ fontFamily: font, fontSize: 14, color: T.text, lineHeight: 1.65, marginBottom: 6, fontWeight: 600 }}>
                  Sleep patterns are starting to form.
                </p>
                <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                  Things are shifting in an interesting direction. Understanding why could help you get ahead of it.
                </p>
              </div>
            }
          />
        )}
      </div>

      {/* ── GROWING ── */}
      {(() => {
        const dob = activeChild?.dob || activeFamily?.birth_date;
        if (!dob) return null;
        const birth = new Date(dob);
        const now = new Date();
        let years = now.getFullYear() - birth.getFullYear();
        let mos = now.getMonth() - birth.getMonth();
        if (now.getDate() < birth.getDate()) mos--;
        if (mos < 0) { years--; mos += 12; }
        const ageMonths = years * 12 + mos;
        const weeksFromDue = Math.floor((Date.now() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const leap = getCurrentWonderWeeksLeap(weeksFromDue);
        const upcomingMilestones = getMilestonesForAge(ageMonths).slice(0, 2);
        return (
          <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
              🌱 Growing
            </div>
            {leap && (
              <div style={{ padding: "10px 13px", borderRadius: 10, background: `${T.purple}0a`, border: `1px solid ${T.purple}20`, marginBottom: 10 }}>
                <div style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.purple, marginBottom: 4 }}>
                  {leap.status === "active" ? "🌀 Wonder Weeks leap active" : "🔭 Leap approaching"}
                </div>
                <p style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.65, margin: 0 }}>
                  <strong>{leap.title}</strong> — {leap.what_baby_is_learning.slice(0, 100)}{leap.what_baby_is_learning.length > 100 ? "…" : ""}
                </p>
              </div>
            )}
            {upcomingMilestones.length > 0 && (
              <div>
                <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginBottom: 8 }}>Coming up for {activeChild?.name || "your child"}:</div>
                {upcomingMilestones.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>🌱</span>
                    <span style={{ fontFamily: font, fontSize: 13, color: T.text }}>{m.title}</span>
                    <span style={{ fontFamily: font, fontSize: 11, color: T.muted, marginLeft: "auto" }}>{m.typical_range[0]}–{m.typical_range[1]}mo</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setTab("milestones")} style={{
              marginTop: 10, background: "none", border: "none",
              fontFamily: font, fontSize: 12.5, color: T.teal,
              cursor: "pointer", padding: 0, fontWeight: 600,
            }}>
              View all milestones →
            </button>
          </div>
        );
      })()}

      {/* ── FOCUS FOR TODAY ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
          🎯 Focus for Today
        </div>
        {isPremium && insightLoading ? (
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, fontStyle: "italic" }}>Pulling your insights…</div>
        ) : isPremium && insight?.focus_items ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insight.focus_items.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.teal, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.6, margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
        ) : isPremium ? (
          (() => {
            const totalMonths = (() => {
              const dob = activeChild?.dob || activeFamily?.birth_date || activeFamily?.birthDate;
              if (!dob) return 3;
              const birth = new Date(dob);
              const now = new Date();
              let years = now.getFullYear() - birth.getFullYear();
              let mos = now.getMonth() - birth.getMonth();
              if (now.getDate() < birth.getDate()) mos--;
              if (mos < 0) { years--; mos += 12; }
              return years * 12 + mos;
            })();
            const defaults = totalMonths < 4
              ? ["Watch for sleepy cues — yawning, eye-rubbing, or a brief stare", "Keep nap environment consistent: same place, same wind-down", "Your baby is still learning day from night — this takes time"]
              : totalMonths < 8
              ? ["Aim for wake windows appropriate for your baby's age", "A short outdoor reset before nap can help regulate the nervous system", "Watch for overtired signs — they appear fast at this age"]
              : totalMonths < 14
              ? ["Consistency in the bedtime routine matters more than timing right now", "Night waking at this age is often developmental — not a regression", "If naps are short, try extending wake windows by 15 minutes"]
              : ["One consistent nap time anchors the whole day", "Big feelings before sleep are normal — name them, don't fix them", "Sleep pressure builds — outdoor time and movement help"];

            // Weave in Wonder Weeks leap context if active
            const leapWeeks = Math.floor((Date.now() - new Date(activeChild?.dob || Date.now()).getTime()) / (7 * 24 * 60 * 60 * 1000));
            const activeLeap = getCurrentWonderWeeksLeap(leapWeeks);
            if (activeLeap?.status === "active") {
              defaults.unshift(`${activeLeap.title} leap is active right now — extra fussiness, clinginess, or sleep disruption this week is likely developmental, not a setback`);
              if (defaults.length > 3) defaults.pop();
            }
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {defaults.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.teal, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.6, margin: 0 }}>{item}</p>
                  </div>
                ))}
                <p style={{ fontFamily: font, fontSize: 11.5, color: T.muted, marginTop: 4, fontStyle: "italic" }}>
                  Personalized insights appear after a few days of logging. 🌱
                </p>
              </div>
            );
          })()
        ) : (
          <Locked isPremium={isPremium} T={T} onUpgrade={() => setShowUpgrade(true)}
            cta="Get personalized plan →"
            teaser={
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Keep bedtime routine consistent", "Watch for sleepy cues around wake window", "Try a short outdoor reset before nap"].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.teal, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.6, margin: 0 }}>{item}</p>
                  </div>
                ))}
              </div>
            }
          />
        )}
      </div>

      {/* ── CONSULTANT CARD ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, padding: "16px 18px", background: T.card, marginBottom: 12 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>Your Consultant</div>
        {consultant ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.teal, flexShrink: 0 }}>
              {(consultant.name || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: T.text }}>{consultant.name}</div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{consultant.email}</div>
            </div>
            <button onClick={() => setTab("messages")}
              style={{ marginLeft: "auto", background: T.faint, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", fontFamily: font, fontSize: 12, color: T.teal, cursor: "pointer" }}>
              Message
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 12 }}>
              No consultant assigned yet.
            </p>
            <button onClick={onFindConsultant}
              style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${T.teal}`, background: `${T.teal}12`, color: T.teal, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              🌿 Find a Consultant →
            </button>
          </div>
        )}
      </div>

      {/* ── CO-CAREGIVER INVITE ── */}
      {!isCo && (
        <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, padding: "16px 18px", background: T.card, marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>Co-Caregiver</div>
          <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 12 }}>
            Invite a partner or co-caregiver to view the sleep plan and check off items.
          </p>
          <button onClick={onInviteCo}
            style={{ background: T.faint, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontFamily: font, fontSize: 13, color: T.teal, cursor: "pointer" }}>
            + Invite co-caregiver
          </button>
        </div>
      )}

      {/* ── LIBRARY LINK ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, padding: "16px 18px", background: T.card, marginBottom: 12 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>📚 Library</div>
        <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 12 }}>
          Resources, guides, and sleep education from RCC.
        </p>
        <button onClick={() => setTab("library")}
          style={{ background: T.faint, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontFamily: font, fontSize: 13, color: T.teal, cursor: "pointer" }}>
          Open Library →
        </button>
      </div>
    </div>
  );
}
