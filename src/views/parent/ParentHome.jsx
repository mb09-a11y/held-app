import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { callAI } from "../../lib/ai.js";
import { getPrompt } from "../../lib/prompts.js";
import { getPractice, getNoticedStatement } from "../../lib/practices.js";
import { getCurrentWonderWeeksLeap, getMilestonesForAge } from "../../modules/milestones/data/milestones.js";
import { HamburgerButton, ChildPill } from "../shared/AppDrawer.jsx";
import { SOSFlow } from "../../modules/sos/SOSFlow.jsx";
import { NSCheckinFlow } from "../../modules/nscheckin/NSCheckinFlow.jsx";

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
export function useFamilyState(familyId, childId, userId) {
  const [familyState, setFamilyState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const refresh = useCallback(() => setRefreshCounter(c => c + 1), []);

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
          if (childId) q = q.or(`child_id.eq.${childId},child_id.is.null`);
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
          weekSessions: logs.slice(0, 200), // all log types — consumers filter by type themselves
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
  }, [familyId, childId, userId, refreshCounter]);

  return { familyState, loading, refresh };
}

// ─── AI INSIGHT HOOK ──────────────────────────────────────────────────────────
function useAIInsight(familyState, isPremium) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPremium || !familyState) return;
    if (familyState.sleepData.weekSessions.length < 2) return;
    (async () => {

    const today = new Date().toDateString();
    const familyId = familyState?.childProfile?.familyId;
    if (!familyId) return;

    // Check Supabase cache first (persists across devices)
    setLoading(true);
    const { data: cached } = await supabase
      .from("ai_insights")
      .select("insight, generated_date")
      .eq("family_id", familyId)
      .eq("insight_type", "sleep_daily")
      .eq("generated_date", new Date().toISOString().split("T")[0])
      .maybeSingle();

    if (cached?.insight) { setInsight(cached.insight); setLoading(false); return; }

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
      .then(async text => {
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        setInsight(parsed);
        // Save to Supabase so it persists across devices and sessions
        await supabase.from("ai_insights").upsert({
          family_id: familyId,
          insight_type: "sleep_daily",
          generated_date: new Date().toISOString().split("T")[0],
          insight: parsed,
          generated_at: new Date().toISOString(),
        }, { onConflict: "family_id,insight_type,generated_date" });
      })
      .catch(() => setInsight(null))
      .finally(() => setLoading(false));
    })();
  }, [isPremium, familyState?.sleepData?.napCountToday]);

  return { insight, loading };
}

// ─── CHECKIN HISTORY HOOK ────────────────────────────────────────────────────
export function useCheckinHistory(userId, familyId) {
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

// ─── CARD CHROME ──────────────────────────────────────────────────────────────
// Shared palette for DailyMoment + HeldCheckin.
// Fixed RCC sage — intentionally not theme-adaptive.
// This card is the emotional anchor of the home screen.

// Only accent colors are hardcoded — everything else comes from T (theme tokens)
// so both cards adapt automatically to light/dark mode.
const CARD_SAGE = "#4A8C73"; // RCC brand green — intentional, fixed
const CARD_ROSE = "#A87B8A"; // mic listening state — intentional, fixed

// ─── DAILY MOMENT ─────────────────────────────────────────────────────────────
// Structure (always):
//   Today's invitation (practice from practices.js)
//   ── divider ──
//   Streak bar + days label
//   Held noticed (getNoticedStatement — from real data)
//   ── divider (morning/evening only) ──
//   Time-based prompt (morning moment | evening close)

function DailyMoment({ setTab, activeChild, familyState, patterns, daysShowingUp }) {
  const T = useT();
  const hour = new Date().getHours();
  const period = hour < 10 ? "morning" : hour < 20 ? "day" : "evening";
  const seed   = new Date().getDate();
  const wSeed  = new Date().getDay();

  const [morningAnswer, setMorningAnswer]     = useState(null);
  const [eveningDone,   setEveningDone]       = useState(false);
  const [invitationTap, setInvitationTap]     = useState(null);

  const practice  = getPractice(period === "morning" ? "morning" : period === "evening" ? "evening" : "invitation", familyState?.parentState?.lastCheckinState, seed);
  const noticed   = getNoticedStatement(patterns, { ...familyState, daysShowingUp }, wSeed);
  const days      = daysShowingUp ?? 0;
  const TOTAL_BARS = 14;

  const childName = activeChild?.name || "them";

  // ── Shared styles ──────────────────────────────────────────────────────────
  const cardStyle = {
    borderRadius: 16, padding: "20px 22px",
    background: T.card, marginBottom: 10,
  };
  const capsStyle = {
    fontSize: 10, fontWeight: 500, letterSpacing: ".12em",
    textTransform: "uppercase", color: CARD_SAGE, fontFamily: font, marginBottom: 8,
  };
  const titleStyle = {
    fontFamily: serif, fontSize: 20, color: T.text,
    lineHeight: 1.3, marginBottom: 6, fontWeight: 500,
  };
  const subStyle = {
    fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6,
  };
  const divStyle = {
    height: "0.5px", background: T.border, margin: "14px 0",
  };
  const chipStyle = (active) => ({
    display: "inline-block", padding: "6px 14px", borderRadius: 20,
    border: `0.5px solid ${active ? CARD_SAGE : T.border}`,
    background: active ? T.card2 || T.card : T.faint,
    fontSize: 12, fontFamily: font,
    color: active ? CARD_SAGE : T.muted,
    cursor: "pointer", marginRight: 6, marginTop: 8,
  });
  const mChipStyle = {
    width: "100%", textAlign: "left", padding: "9px 13px", borderRadius: 10,
    border: `0.5px solid ${T.border}`, background: T.faint,
    fontSize: 13, fontFamily: font, color: T.text, cursor: "pointer",
    marginBottom: 6,
  };
  const responseSurfaceStyle = {
    background: T.faint, borderLeft: `2px solid ${T.border}`,
    borderRadius: "0 8px 8px 0", padding: "11px 13px", marginTop: 10,
  };

  // ── Sub-components ─────────────────────────────────────────────────────────
  const Bars = () => (
    <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
      {[...Array(TOTAL_BARS)].map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 3,
          background: i < days ? CARD_SAGE + "55" : T.faint,
        }} />
      ))}
    </div>
  );

  const StreakSection = () => (
    <>
      <Bars />
      <div style={{ fontSize: 11, color: T.muted, fontFamily: font, marginBottom: 10 }}>
        {days > 0 ? `${days} days showing up · keep going` : "Start your first day today"}
      </div>
      <div style={{ fontSize: 13, color: T.text, fontFamily: font, lineHeight: 1.65, fontStyle: "italic", opacity: 0.85 }}>
        {noticed}
      </div>
    </>
  );

  const InvitationTop = () => (
    <>
      <div style={capsStyle}>Today's invitation</div>
      <div style={titleStyle}>{practice.text}</div>
      <div style={{ ...subStyle, marginBottom: period === "day" ? 6 : 0 }}>{practice.sub}</div>
      {period === "day" && (
        <div>
          <span style={chipStyle(invitationTap === "noticed")} onClick={() => setInvitationTap("noticed")}>I noticed something</span>
          <span style={chipStyle(invitationTap === "remind")}  onClick={() => setInvitationTap("remind")}>Remind me tonight</span>
          {invitationTap === "noticed" && (
            <div style={{ ...responseSurfaceStyle, marginTop: 10 }}>
              <div style={{ ...capsStyle, marginBottom: 4 }}>Held that</div>
              <div style={{ fontSize: 13.5, color: T.text, fontFamily: font, lineHeight: 1.65 }}>
                Good. Come back tonight and tell me what it was. That's the whole practice.
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  // ── MORNING ────────────────────────────────────────────────────────────────
  if (period === "morning" && !morningAnswer) {
    return (
      <div style={cardStyle}>
        <InvitationTop />
        <div style={divStyle} />
        <StreakSection />
        <div style={divStyle} />
        <div style={capsStyle}>Morning moment</div>
        <div style={titleStyle}>How did last night actually go?</div>
        <div style={{ ...subStyle, marginBottom: 12 }}>Not compared to the plan. Just — for you, in your body.</div>
        {[
          { val: "hard",  label: "Honestly hard — I'm running on nothing" },
          { val: "mixed", label: "Mixed — some rough patches but we got through it" },
          { val: "good",  label: "Better than expected, actually" },
        ].map(o => (
          <button key={o.val} onClick={() => setMorningAnswer(o.val)} style={mChipStyle}>{o.label}</button>
        ))}
      </div>
    );
  }

  if (period === "morning" && morningAnswer) {
    const responses = {
      hard:  { label: "For you right now", text: "That kind of tired lives in your body, not just your eyes. Today doesn't need to be impressive — it just needs to be survivable." },
      mixed: { label: "For you right now", text: "Mixed nights are where most of the growth happens — for both of you. Getting through it counts." },
      good:  { label: "Hold onto that",    text: `Better than expected is worth naming. Your body relaxed a little, which means ${childName}'s did too.` },
    };
    const r = responses[morningAnswer];
    return (
      <div style={cardStyle}>
        <InvitationTop />
        <div style={divStyle} />
        <StreakSection />
        <div style={divStyle} />
        <div style={capsStyle}>Morning moment</div>
        <div style={responseSurfaceStyle}>
          <div style={{ ...capsStyle, marginBottom: 4 }}>{r.label}</div>
          <div style={{ fontSize: 13.5, color: T.text, fontFamily: font, lineHeight: 1.65 }}>{r.text}</div>
        </div>
      </div>
    );
  }

  // ── DAY ────────────────────────────────────────────────────────────────────
  if (period === "day") {
    return (
      <div style={cardStyle}>
        <InvitationTop />
        <div style={divStyle} />
        <StreakSection />
      </div>
    );
  }

  // ── EVENING ────────────────────────────────────────────────────────────────
  const eveningPractice = getPractice("evening", familyState?.parentState?.lastCheckinState, seed);
  const napCount = familyState?.sleepData?.napCountToday ?? 0;
  const intention = napCount > 0
    ? `${childName} had ${napCount} nap${napCount !== 1 ? "s" : ""} today. ${eveningPractice.text}`
    : eveningPractice.text;

  if (!eveningDone) {
    return (
      <div style={cardStyle}>
        <InvitationTop />
        <div style={divStyle} />
        <StreakSection />
        <div style={divStyle} />
        <div style={capsStyle}>Evening close</div>
        <div style={titleStyle}>Before tonight's sleep window — one thing.</div>
        <div style={{ background: T.faint, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "11px 13px", margin: "10px 0 12px" }}>
          <div style={{ ...capsStyle, marginBottom: 4 }}>Tonight's intention</div>
          <div style={{ fontSize: 13.5, color: T.text, fontFamily: font, lineHeight: 1.6 }}>{intention}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setEveningDone(true); setTab("regulation"); }} style={{ ...mChipStyle, flex: 1, textAlign: "center", marginBottom: 0 }}>Got it →</button>
          <button onClick={() => setEveningDone(true)} style={{ ...mChipStyle, flex: 1, textAlign: "center", marginBottom: 0 }}>Different idea</button>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <InvitationTop />
      <div style={divStyle} />
      <StreakSection />
      <div style={divStyle} />
      <div style={capsStyle}>Evening close</div>
      <div style={responseSurfaceStyle}>
        <div style={{ ...capsStyle, marginBottom: 4 }}>You're ready</div>
        <div style={{ fontSize: 13.5, color: T.text, fontFamily: font, lineHeight: 1.65 }}>
          Trust your read of {childName} tonight. You know more than you think you do.
        </div>
      </div>
    </div>
  );
}

// ─── HELD CHECKIN ─────────────────────────────────────────────────────────────
// Replaces both the old hero check-in card AND the NSCheckin card.
// Freeform text/voice is the primary path.
// Structured chips are a secondary swap — same card, no stacking.
// All AI calls go through the existing callAI + getPrompt infrastructure.
// Pattern tracking (saveCheckin) is preserved for both paths.

export function HeldCheckin({ familyState, patterns, saveCheckin }) {
  const T = useT();
  const { currentUser, activeChild, activeFamily, isPremium } = useApp();

  const [mode,       setMode]       = useState("idle");   // idle | text | listening | chips | loading | response
  const [inputText,  setInputText]  = useState("");
  const [response,   setResponse]   = useState(null);
  const [situation,  setSituation]  = useState(null);
  const [feeling,    setFeeling]    = useState(null);
  const [isListening, setIsListening] = useState(false);

  const textareaRef   = useRef(null);
  const recognitionRef = useRef(null);

  const speechSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // ── Restore sticky response from sessionStorage ──
  const sessionKey = activeFamily?.id
    ? `held_checkin_${activeFamily.id}_${new Date().toDateString()}`
    : null;

  useEffect(() => {
    if (!sessionKey) return;
    const cached = sessionStorage.getItem(sessionKey);
    if (cached) {
      try { setResponse(JSON.parse(cached)); setMode("response"); } catch { sessionStorage.removeItem(sessionKey); }
    }
  }, [sessionKey]);

  useEffect(() => {
    if (mode === "text" && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [mode]);

  // ── Voice ──
  function startListening() {
    if (!speechSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    recognitionRef.current = rec;
    rec.onresult = (e) => setInputText(Array.from(e.results).map(r => r[0].transcript).join(""));
    rec.onend  = () => { setIsListening(false); recognitionRef.current = null; };
    rec.onerror = () => { setIsListening(false); recognitionRef.current = null; };
    rec.start();
    setIsListening(true);
    setMode("listening");
  }

  function stopListening() {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setIsListening(false);
    setMode("text");
  }

  // ── Submit — freeform path ──
  async function submitFreeform() {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setMode("loading");

    const childAge  = getChildAge(activeChild);
    const childName = activeChild?.name || "my baby";
    const userMsg   = [childAge ? `I'm parenting a ${childAge}, ${childName}.` : `I'm parenting ${childName}.`, trimmed].join(" ");
    const histCtx   = buildHistoryContext(patterns);

    try {
      const raw    = await callAI({ system: getPrompt("ns_checkin"), model: "claude-haiku-4-5-20251001", max_tokens: 700, messages: [{ role: "user", content: `${userMsg}${histCtx ? "\n\n" + histCtx : ""}` }] });
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      persistResponse(parsed);
      saveCheckin?.(trimmed, "freeform", parsed.validation?.slice(0, 200)).catch(() => {});
    } catch {
      persistResponse(fallbackResponse());
    }
  }

  // ── Submit — chips path ──
  async function submitChips() {
    if (!situation) return;
    setMode("loading");

    const childAge  = getChildAge(activeChild);
    const childName = activeChild?.name || "your baby";
    const sitLabel  = SITUATION_LABELS[situation] || situation;
    const feelLabel = FEELING_LABELS[feeling]     || "checking in";
    const sleepCtx  = buildSleepContext(familyState);
    const histCtx   = buildHistoryContext(patterns);
    const dataNote  = sleepCtx
      ? `Sleep data context: ${sleepCtx}`
      : `No sleep data logged yet — respond entirely from what they described.`;

    try {
      const raw    = await callAI({
        system: getPrompt(situation === "just_understand" ? "sleep_checkin_insight" : "sleep_checkin"),
        max_tokens: 700,
        messages: [{ role: "user", content: `My ${childAge || "baby"}, ${childName}: ${sitLabel}. I'm feeling ${feelLabel}. ${dataNote}${histCtx ? " " + histCtx : ""}` }],
      });
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      persistResponse(parsed);
      saveCheckin?.(situation, feeling, parsed.what_this_might_be?.slice(0, 200)).catch(() => {});
    } catch {
      persistResponse(fallbackResponse());
    }
  }

  function persistResponse(parsed) {
    setResponse(parsed);
    setMode("response");
    if (sessionKey) sessionStorage.setItem(sessionKey, JSON.stringify(parsed));
  }

  function reset() {
    if (sessionKey) sessionStorage.removeItem(sessionKey);
    setMode("idle"); setInputText(""); setResponse(null);
    setSituation(null); setFeeling(null);
  }

  // ── Shared card shell styles ───────────────────────────────────────────────
  const cardShell = {
    borderRadius: 16, padding: "20px 22px",
    background: T.card, marginBottom: 10,
  };
  const capsS = {
    fontSize: 10, fontWeight: 500, letterSpacing: ".12em",
    textTransform: "uppercase", color: CARD_SAGE, fontFamily: font,
  };
  const titleS = {
    fontFamily: serif, fontSize: 20, color: T.text, lineHeight: 1.3,
    fontWeight: 500, marginBottom: 4,
  };
  const subS = { fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.55 };
  const pillBtn = {
    padding: "9px 20px", borderRadius: 20, border: "none",
    background: CARD_SAGE, color: "#fff",
    fontFamily: font, fontSize: 13, fontWeight: 500, cursor: "pointer",
  };
  const ghostBtn = {
    background: "none", border: "none", fontFamily: font,
    fontSize: 12, color: T.muted, cursor: "pointer", padding: 0,
  };
  const chipBtnS = (sel) => ({
    width: "100%", textAlign: "left", padding: "9px 13px", borderRadius: 10,
    border: `0.5px solid ${sel ? CARD_SAGE : T.border}`,
    background: sel ? T.card2 || T.card : T.faint,
    fontSize: 13, fontFamily: font,
    color: sel ? CARD_SAGE : T.text,
    cursor: "pointer", marginBottom: 6,
  });
  const taStyle = {
    width: "100%", boxSizing: "border-box", borderRadius: 10,
    border: `1px solid ${T.border}`,
    background: T.inputBg || T.faint,
    color: T.text, fontFamily: font, fontSize: 13.5, lineHeight: 1.6,
    padding: "11px 13px", resize: "none", outline: "none",
    flex: 1,
  };
  const talkBtnS = (listening) => ({
    width: 56, height: 56, borderRadius: "50%", border: "none",
    background: listening ? CARD_ROSE : CARD_SAGE,
    color: "#fff", fontSize: 22, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    animation: listening ? "heldPulse 1.5s ease-in-out infinite" : "none",
  });

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (mode === "idle") {
    return (
      <div style={{ ...cardShell, cursor: "pointer" }} onClick={() => setMode("text")}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontSize: 26 }}>🌿</span>
          <div style={pillBtn}>Check in →</div>
        </div>
        <div style={titleS}>How is everybody doing today?</div>
        <div style={subS}>I'm here to listen — no structure needed</div>
      </div>
    );
  }

  // ── TEXT INPUT ────────────────────────────────────────────────────────────
  if (mode === "text") {
    const canSubmit = inputText.trim().length > 3;
    return (
      <div style={cardShell}>
        <style>{`@keyframes heldPulse { 0%,100%{box-shadow:0 0 0 0 rgba(168,123,138,0.3)} 50%{box-shadow:0 0 0 10px rgba(168,123,138,0)} }`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>🌿</span>
          <span style={capsS}>Held</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) submitFreeform(); }}
            placeholder="What's going on right now…"
            rows={3}
            style={taStyle}
          />
          {speechSupported && (
            <button onClick={startListening} style={talkBtnS(false)}>🎤</button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setMode("idle")} style={ghostBtn}>Cancel</button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setMode("chips")} style={{ ...ghostBtn, fontSize: 11.5, textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: T.border }}>
              Use chips instead
            </button>
            <button onClick={submitFreeform} disabled={!canSubmit} style={{ ...pillBtn, opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "default" }}>
              Send →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LISTENING ─────────────────────────────────────────────────────────────
  if (mode === "listening") {
    return (
      <div style={cardShell}>
        <style>{`@keyframes heldPulse { 0%,100%{box-shadow:0 0 0 0 rgba(168,123,138,0.3)} 50%{box-shadow:0 0 0 10px rgba(168,123,138,0)} }`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 16 }}>🌿</span>
          <span style={capsS}>Held</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "8px 0 20px" }}>
          <button onClick={stopListening} style={talkBtnS(true)}>⏹</button>
          <div style={{ fontFamily: serif, fontSize: 18, color: T.text, textAlign: "center" }}>I'm listening…</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted, textAlign: "center" }}>Tap to stop when you're done</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <button onClick={() => setMode("idle")} style={ghostBtn}>Cancel</button>
        </div>
      </div>
    );
  }

  // ── CHIPS ─────────────────────────────────────────────────────────────────
  if (mode === "chips") {
    return (
      <div style={cardShell}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🌿</span>
            <span style={capsS}>Held</span>
          </div>
          <button onClick={() => setMode("text")} style={{ ...ghostBtn, fontSize: 11.5, textDecoration: "underline", textUnderlineOffset: 3 }}>← Type instead</button>
        </div>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, fontFamily: font, marginBottom: 8 }}>
          What's going on?
        </div>
        {SITUATIONS.map(o => (
          <button key={o.val} onClick={() => setSituation(o.val)} style={chipBtnS(situation === o.val)}>{o.label}</button>
        ))}
        {situation && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, fontFamily: font, marginBottom: 8 }}>
              And how are you?
            </div>
            {FEELINGS.map(o => (
              <button key={o.val} onClick={() => setFeeling(o.val)} style={chipBtnS(feeling === o.val)}>{o.label}</button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <button onClick={() => setMode("idle")} style={ghostBtn}>Cancel</button>
          <button onClick={submitChips} disabled={!situation} style={{ ...pillBtn, opacity: situation ? 1 : 0.45, cursor: situation ? "pointer" : "default" }}>
            Send →
          </button>
        </div>
      </div>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (mode === "loading") {
    return (
      <div style={{ ...cardShell, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>🌿</span>
        <span style={{ fontFamily: font, fontSize: 13.5, color: T.muted, fontStyle: "italic" }}>
          Held is with you…
        </span>
      </div>
    );
  }

  // ── RESPONSE ──────────────────────────────────────────────────────────────
  if (mode === "response" && response) {
    // Response may be NS-checkin format or sleep-checkin format — handle both
    const validation    = response.validation    || response.what_this_might_be;
    const whatHappening = response.what_might_be_happening || response.what_baby_might_be_communicating;
    const forYou        = response.for_you       || response.what_you_might_be_feeling;
    const tryThis       = response.try_this      || [];

    return (
      <div style={{ ...cardShell }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>🌿</span>
          <span style={capsS}>Held</span>
        </div>

        {validation && (
          <div style={{ fontFamily: serif, fontSize: 15.5, color: T.text, lineHeight: 1.55, marginBottom: 14 }}>
            {validation}
          </div>
        )}

        {whatHappening && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: T.faint, border: `0.5px solid ${T.border}`, marginBottom: 10 }}>
            <div style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7 }}>
              {whatHappening}
            </div>
          </div>
        )}

        {forYou && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(168,123,138,0.07)", border: "0.5px solid rgba(168,123,138,0.2)", marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: CARD_ROSE, fontFamily: font, marginBottom: 6 }}>
              ❤️ For you
            </div>
            <div style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7 }}>{forYou}</div>
          </div>
        )}

        {tryThis.length > 0 && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(74,140,115,0.07)", border: `0.5px solid ${T.border}`, marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: CARD_SAGE, fontFamily: font, marginBottom: 8 }}>
              🌿 If it feels right…
            </div>
            {tryThis.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < tryThis.length - 1 ? 8 : 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(74,140,115,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: CARD_SAGE, flexShrink: 0, marginTop: 3 }}>{i + 1}</div>
                <div style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65 }}>{item}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: font, fontSize: 12.5, color: T.muted, fontStyle: "italic" }}>Want to chat more?</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reset} style={{ padding: "7px 12px", borderRadius: 10, border: `0.5px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 11.5, cursor: "pointer" }}>
              Clear
            </button>
            <button onClick={() => { setInputText(""); setMode("text"); }} style={{ padding: "7px 14px", borderRadius: 10, border: `0.5px solid ${CARD_SAGE}50`, background: `${CARD_SAGE}10`, color: CARD_SAGE, fontFamily: font, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
              Keep going →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── Chips data ──────────────────────────────────────────────────────────────
const SITUATIONS = [
  { val: "bedtime_mess",  label: "🌙 Bedtime is a mess" },
  { val: "short_naps",    label: "😩 Naps were short today" },
  { val: "wont_settle",   label: "🙅 Baby won't settle" },
  { val: "doing_wrong",   label: "💭 I don't know what I'm doing wrong" },
  { val: "something_off", label: "🌀 Something feels off" },
  { val: "just_woke",     label: "☀️ Baby just woke up" },
  { val: "just_understand", label: "✨ Just help me understand" },
];
const FEELINGS = [
  { val: "overwhelmed", label: "😵 Overwhelmed" },
  { val: "exhausted",   label: "🥱 Running on empty" },
  { val: "anxious",     label: "😰 Anxious about sleep" },
  { val: "frustrated",  label: "😤 Frustrated" },
  { val: "okay",        label: "😐 Hanging in there" },
  { val: "good",        label: "🙂 Actually doing okay" },
];
const SITUATION_LABELS = {
  bedtime_mess:   "bedtime has been a real struggle — it feels chaotic and hard",
  short_naps:     "naps have been short today and I'm not sure why",
  wont_settle:    "baby won't settle and nothing seems to be working",
  doing_wrong:    "I don't know what I'm doing wrong and I'm starting to doubt myself",
  something_off:  "something feels off but I can't quite put my finger on it",
  just_woke:      "baby just woke up",
  just_understand:"I don't have a specific problem — I just want to understand what might be going on developmentally",
};
const FEELING_LABELS = {
  overwhelmed: "overwhelmed", exhausted: "running on empty",
  anxious: "anxious about sleep", frustrated: "frustrated",
  okay: "hanging in there", good: "actually doing okay",
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function getChildAge(activeChild) {
  if (!activeChild?.dob) return null;
  const birth = new Date(activeChild.dob), now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let mos   = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) mos--;
  if (mos < 0) { years--; mos += 12; }
  const total = years * 12 + mos;
  return total < 24 ? `${total} month old` : `${years} year old`;
}

function buildSleepContext(familyState) {
  if (!familyState) return "";
  const { sleepData, parentState } = familyState;
  if (!sleepData?.napCountToday && !sleepData?.weekSessions?.length) return "";
  return [
    `Today: ${sleepData.napCountToday} nap(s), ${sleepData.totalSleepTodayHours}h total sleep.`,
    sleepData.nightWakesAvg != null ? `Avg night wakings: ${sleepData.nightWakesAvg}.` : "",
    parentState?.nervousSystemTrend ? `Parent NS trend: ${parentState.nervousSystemTrend}.` : "",
  ].filter(Boolean).join(" ");
}

function buildHistoryContext(patterns) {
  if (!patterns || patterns.total < 3) return "";
  return [
    patterns.hardestTime && patterns.hardestTimeCount >= 2
      ? `Pattern: ${patterns.hardestTimeCount} recent check-ins at ${patterns.hardestTime}.` : "",
    patterns.dominantFeeling && patterns.dominantFeelingCount >= 2
      ? `Pattern: felt "${patterns.dominantFeeling}" in ${patterns.dominantFeelingCount} of last ${patterns.total} check-ins.` : "",
    patterns.progressDelta !== null && patterns.progressDelta < 0
      ? `Progress: ${Math.abs(patterns.progressDelta)} fewer hard check-ins this week than last.` : "",
  ].filter(Boolean).join(" ");
}

function fallbackResponse() {
  return {
    validation: "Something interrupted that response — but the fact that you're checking in matters.",
    what_might_be_happening: "Whatever is going on right now is real and valid.",
    for_you: "Take one slow breath. You're doing the work just by paying attention.",
    try_this: ["Give yourself permission to not have it figured out right now", "One small thing: a glass of water, a moment outside, a text to someone who gets it"],
  };
}

// ─── PARENT HOME ──────────────────────────────────────────────────────────────
export function ParentHome({ user, onLogout, onInviteCo, onAddChild, onOpenDrawer, onFindConsultant }) {
  const T = useT();
  const { setTab, consultants, currentUser, activeChild, activeFamily, isPremium, hasConsultantAssigned, setPendingSleepAction } = useApp();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showNS, setShowNS] = useState(false);
  const consultant = consultants?.[0];
  const isCo = currentUser?.role === "co_caregiver";

  const { familyState, loading: fsLoading, refresh: refreshFamilyState } = useFamilyState(
    activeFamily?.id,
    activeChild?.id,
    currentUser?.id,
  );
  const { insight, loading: insightLoading } = useAIInsight(familyState, isPremium);
  const { history: checkinHistory, patterns, saveCheckin } = useCheckinHistory(currentUser?.id, activeFamily?.id);
  const { greeting, message } = getEmotionalHeader(currentUser);

  // ── "What's happening right now?" guided check-in ──
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

  // ── Under-2 diaper + feed tiles ──────────────────────────────────────────
  const isUnder2 = ageMonthsHome !== null && ageMonthsHome < 24;
  const todayLocalStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local tz
  const allTodayLogs = (familyState?.sleepData?.weekSessions || []).filter(l => {
    const logLocalStr = new Date(l.ts).toLocaleDateString("en-CA");
    const isToday = logLocalStr === todayLocalStr;
    const isThisChild = !activeChild?.id || !l.child_id || l.child_id === activeChild.id;
    return isToday && isThisChild;
  });
  const wetCount   = allTodayLogs.filter(l => l.type === "diaper" && l.sub_type === "wet").length;
  const dirtyCount = allTodayLogs.filter(l => l.type === "diaper" && l.sub_type === "dirty").length;
  const feedLogs   = allTodayLogs.filter(l => l.type === "feed");
  const feedCount  = feedLogs.length;
  const totalOz    = feedLogs.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const nursingLogs = feedLogs.filter(l => l.mode === "nursing");
  const totalNursingMins = nursingLogs.reduce((s, l) => {
    if (l.duration_mins) return s + l.duration_mins;
    if (l.ts && l.end_ts) return s + Math.round((new Date(l.end_ts) - new Date(l.ts)) / 60000);
    return s;
  }, 0);
  const lastNursingLog = [...nursingLogs].sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
  const lastSide = lastNursingLog?.side || null;
  const hasNursing = nursingLogs.length > 0;
  const hasFormula = feedLogs.some(l => l.mode === "bottle" || l.mode === "formula" || (!l.mode && l.amount));
  const feedingMode = hasNursing && hasFormula ? "combo" : hasNursing ? "breast" : "formula";
  // ─────────────────────────────────────────────────────────────────────────

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

  // NS state gradient position
  const nsGradientPos = {
    Regulated: 12, Steady: 35, Stretched: 60,
    Fight: 72, Flight: 55, Freeze: 75, Overloaded: 83, Shutdown: 92,
  }[familyState?.parentState?.lastCheckinState] ?? null;

  const nsState = familyState?.parentState?.lastCheckinState;
  const daysCount = familyState?.daysShowingUp ?? checkinHistory.length;

  return (
    <div style={{ paddingBottom: 100 }}>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} T={T} currentUser={currentUser} />}
      {showSOS && <SOSFlow onClose={() => setShowSOS(false)} setTab={setTab} />}
      {showNS  && <NSCheckinFlow onClose={() => setShowNS(false)} onCheckinSaved={refreshFamilyState} />}

      {/* ── SOS FLOATING BUTTON ── */}
      <button onClick={() => setShowSOS(true)} style={{
        position: "fixed", bottom: 90, right: 20, zIndex: 99,
        width: 54, height: 54, borderRadius: "50%", border: "none",
        background: "linear-gradient(135deg, #B8924A, #C9A84C)",
        color: "white", fontSize: 20, cursor: "pointer",
        boxShadow: "0 4px 20px rgba(184,146,74,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>⚡</button>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={onOpenDrawer} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "4px 6px", color: T.muted, fontSize: 20, lineHeight: 1,
          }}>☰</button>
          <ChildPill onOpen={onOpenDrawer} />
        </div>
        <div style={{ fontSize: 9.5, letterSpacing: ".15em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 4 }}>
          Rooted Connections Collective
        </div>
        <div style={{ fontFamily: serif, fontSize: 14, fontWeight: 400, color: T.muted, marginBottom: 2 }}>
          {new Date().getHours() < 12 ? "Good morning," : new Date().getHours() < 17 ? "Good afternoon," : "Good evening,"}
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 32, color: T.headingText, lineHeight: 1.1, marginBottom: 0 }}>
          {currentUser?.name?.split(" ")[0] ?? "there"} 🌿
        </h1>
      </div>

      {/* ── TODAY'S INVITATION ── */}
      <div style={{
        borderRadius: 18, padding: "18px 20px 16px 24px",
        background: T.card, marginBottom: 12,
        borderLeft: `4px solid ${T.warm}`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: T.warm, fontFamily: font, fontWeight: 700, marginBottom: 10 }}>
          Today's Invitation
        </div>
        <p style={{ fontFamily: serif, fontSize: 17, color: T.text, lineHeight: 1.55, marginBottom: 10, fontStyle: "italic" }}>
          {message ? `"${message}"` : "“You don’t have to be perfect. You just have to show up.”"}
        </p>
        {/* Grounding CTA */}
        <button onClick={() => setTab("regulation")} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 20,
          border: `1px solid ${T.teal}40`,
          background: `${T.teal}10`, color: T.teal,
          fontFamily: font, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          marginBottom: 12,
        }}>
          🌬 Try a grounding exercise →
        </button>
        {/* Divider */}
        <div style={{ height: 1, background: T.border, margin: "4px 0 12px" }} />
        {/* Need a few minutes */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: T.text, marginBottom: 2 }}>
              Need a few minutes?
            </div>
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>
              Naptime. Quick break. Just for you.
            </div>
          </div>
          <button onClick={() => setTab("regulation")} style={{
            padding: "9px 16px", borderRadius: 24, border: "none",
            background: T.teal, color: "#fff",
            fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer",
            whiteSpace: "nowrap",
          }}>
            Come in →
          </button>
        </div>
      </div>

      {/* ── STATE OF YOUR DAY + NS PULSE (side by side) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {/* Left: State of Your Day */}
        <div style={{
          borderRadius: 16, padding: "14px 14px",
          background: T.card, border: `1px solid ${T.border}`,
        }}>
          <div style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>
            State of Your Day
          </div>
          <p style={{ fontFamily: serif, fontSize: 13, fontStyle: "italic", color: T.text, lineHeight: 1.5, marginBottom: 8 }}>
            {nsState === "Regulated" ? "“You stayed in it today. That counts.”"
             : nsState === "Stretched" ? "“Carrying a lot. That’s allowed.”"
             : nsState ? `“${nsState} is honest.”`
             : "“Check in to see your state.”"}
          </p>
          {/* Gradient bar — no labels */}
          <div style={{
            height: 7, borderRadius: 5,
            background: "linear-gradient(90deg,#5C7A5E 0%,#8A9E8B 30%,#B8924A 65%,#A87B7B 100%)",
            position: "relative",
          }}>
            {nsGradientPos !== null && (
              <div style={{
                position: "absolute", top: "50%",
                transform: "translate(-50%,-50%)",
                left: `${nsGradientPos}%`,
                width: 11, height: 11, borderRadius: "50%",
                background: "white", border: `2px solid ${T.bg}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
              }} />
            )}
          </div>
        </div>

        {/* Right: NS Pulse */}
        <div style={{
          borderRadius: 16, padding: "14px 14px",
          background: T.card, border: `1px solid ${T.border}`,
        }}>
          <div style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>
            Nervous System
          </div>
          {nsState ? (
            <>
              <div style={{
                display: "inline-block", padding: "3px 10px", borderRadius: 20,
                background: `${T.teal}18`,
                fontFamily: font, fontSize: 12, fontWeight: 600, color: T.teal,
                marginBottom: 6,
              }}>
                {nsState}
              </div>
              <p style={{ fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.5, margin: "0 0 8px" }}>
                {nsState === "Regulated" ? "Your calm is contagious." : "You’re carrying a lot. That’s allowed."}
              </p>
            </>
          ) : (
            <p style={{ fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 8 }}>
              How are you right now?
            </p>
          )}
          <button onClick={() => setTab("regulation")} style={{
            background: "none", border: "none", padding: 0,
            fontFamily: font, fontSize: 12, color: T.teal,
            fontWeight: 600, cursor: "pointer",
          }}>
            Check in now →
          </button>
        </div>
      </div>

      {/* ── DIAPER + FEED TILES (under-2 only) ── */}
      {isUnder2 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {/* Diapers */}
          <div style={{ borderRadius: 16, padding: "14px 14px", background: T.card, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 6 }}>
              Diapers
            </div>
            <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1 }}>
              {wetCount} <span style={{ color: T.muted, fontWeight: 400, fontSize: 18 }}>/</span> {dirtyCount}
            </div>
            <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 4 }}>Wet / Dirty</div>
          </div>

          {/* Feed */}
          <div style={{ borderRadius: 16, padding: "14px 14px", background: T.card, border: `1px solid ${T.border}`, position: "relative" }}>
            <div style={{ position: "absolute", top: 10, right: 12, fontSize: 8, color: T.muted, fontFamily: font, letterSpacing: ".06em", textTransform: "uppercase" }}>
              {feedingMode === "combo" ? "Combo" : feedingMode === "breast" ? "Breast" : "Formula"}
            </div>
            <div style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 6 }}>
              Feed
            </div>
            <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1 }}>
              {feedCount}
            </div>
            {feedingMode === "breast" && (
              <>
                <div style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: T.text, marginTop: 3 }}>{totalNursingMins} min today</div>
                {lastSide && <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 2 }}>Last: {lastSide}</div>}
              </>
            )}
            {feedingMode === "formula" && (
              <div style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: T.text, marginTop: 3 }}>{totalOz > 0 ? `${totalOz} oz today` : "—"}</div>
            )}
            {feedingMode === "combo" && (
              <>
                <div style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: T.text, marginTop: 3 }}>
                  {totalOz > 0 ? `${totalOz} oz` : ""}{totalOz > 0 && totalNursingMins > 0 ? " · " : ""}{totalNursingMins > 0 ? `${totalNursingMins} min` : ""}
                </div>
                {lastSide && <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 2 }}>Last: {lastSide}</div>}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── I NEED HELP RIGHT NOW (SOS card — prominent) ── */}
      <button onClick={() => setShowSOS(true)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "16px 20px", marginBottom: 12,
        borderRadius: 16, border: "none",
        background: "linear-gradient(135deg, #B8924A, #9A7030)",
        cursor: "pointer", textAlign: "left",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <div>
            <div style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: "white", marginBottom: 2 }}>
              I Need Help Right Now
            </div>
            <div style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              Tap for immediate support
            </div>
          </div>
        </div>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 18 }}>›</span>
      </button>

      {/* ── YESTERDAY'S SHIFT ── */}
      {daysCount >= 2 && (
        <div style={{
          borderRadius: 16, padding: "16px 18px", marginBottom: 12,
          background: `${T.teal}08`,
          border: `1px solid ${T.teal}22`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>✨</span>
            <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.teal, fontFamily: font, fontWeight: 700 }}>
              Yesterday's Shift
            </div>
          </div>
          <p style={{ fontFamily: serif, fontSize: 15, color: T.headingText, lineHeight: 1.5, marginBottom: 6 }}>
            {patterns?.progressDelta < 0
              ? `"${Math.abs(patterns.progressDelta)} fewer hard check-ins this week. You went from ${patterns.dominantFeeling ?? "overwhelmed"} → steadier. That’s not small."`
              : `"You’ve shown up ${daysCount} day${daysCount !== 1 ? "s" : ""} in a row."`}
          </p>
          <p style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.55, marginBottom: 12 }}>
            {patterns?.progressDelta < 0
              ? "You caught it before it escalated. That was earlier than the day before."
              : "Most parents don’t make it past three. Whatever’s keeping you here — keep doing it."}
          </p>
          <div style={{
            display: "inline-block", padding: "6px 14px", borderRadius: 20,
            background: `${T.teal}15`,
            fontFamily: font, fontSize: 12.5, fontStyle: "italic",
            color: T.teal, fontWeight: 500,
          }}>
            I’m becoming the parent I want to be.
          </div>
        </div>
      )}

      {/* ── SOMETHING I NOTICED (curiosity tension card) ── */}
      {isPremium && familyState?.sleepData?.weekSessions?.length >= 3 && (
        <button onClick={() => setTab("insights")} style={{
          display: "block", width: "100%", textAlign: "left",
          padding: "16px 18px", marginBottom: 12, borderRadius: 16,
          border: "none",
          background: `linear-gradient(135deg, ${T.bark}, ${T.bark}dd)`,
          cursor: "pointer",
        }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontFamily: font, fontWeight: 700, marginBottom: 8 }}>
            Something I noticed
          </div>
          <p style={{ fontFamily: serif, fontSize: 15, fontStyle: "italic", color: "rgba(255,255,255,0.88)", lineHeight: 1.55, marginBottom: 10 }}>
            {insight?.pattern
              ? `"${insight.pattern}"`
              : "“There’s a pattern forming this week — and it might explain why mornings have felt the way they have.”"}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
              Tap to see what I’m seeing
            </span>
            <span style={{
              padding: "6px 14px", borderRadius: 20,
              background: "rgba(255,255,255,0.12)",
              fontFamily: font, fontSize: 12, fontWeight: 600,
              color: "white",
            }}>
              See pattern →
            </span>
          </div>
        </button>
      )}

      {/* ── HELD IS THINKING ABOUT YOU (return loop cards) ── */}
      <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>
        Held is thinking about you
      </div>

      {/* Return loop 1: Check yourself first (regulation) */}
      <div style={{
        borderRadius: 16, padding: "14px 16px", marginBottom: 10,
        background: T.card, border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${T.teal}`,
      }}>
        <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: T.teal, fontFamily: font, fontWeight: 700, marginBottom: 6 }}>
          Check yourself first
        </div>
        <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.6, marginBottom: 8 }}>
          {nsState === "Stretched" || nsState === "Overloaded" || nsState === "Shutdown"
            ? "Your system has been working hard. A 2-minute reset before the next hard moment could change everything."
            : "Evenings have felt harder lately. Want a 2-minute reset before dinner tonight?"}
        </p>
        <button onClick={() => setTab("regulation")} style={{
          background: "none", border: "none", padding: 0,
          fontFamily: font, fontSize: 12.5, color: T.teal,
          fontWeight: 600, cursor: "pointer",
        }}>
          Set a reminder for 5pm →
        </button>
      </div>

      {/* Return loop 2: Pattern I'm noticing (insights) */}
      {isPremium && familyState?.sleepData?.weekSessions?.length >= 3 && (
        <div style={{
          borderRadius: 16, padding: "14px 16px", marginBottom: 10,
          background: T.card, border: `1px solid ${T.border}`,
          borderLeft: `3px solid ${T.warm}`,
        }}>
          <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: T.warm, fontFamily: font, fontWeight: 700, marginBottom: 6 }}>
            Pattern I’m noticing
          </div>
          <p style={{ fontFamily: serif, fontSize: 14, fontStyle: "italic", color: T.text, lineHeight: 1.55, marginBottom: 8 }}>
            {insight?.likely_cause
              ? `"${insight.likely_cause}"`
              : `"You tend to feel steadier on days when ${activeChild?.name ?? "their"} first nap lands early. Want to see why?"`}
          </p>
          <button onClick={() => setTab("insights")} style={{
            background: "none", border: "none", padding: 0,
            fontFamily: font, fontSize: 12.5, color: T.warm,
            fontWeight: 600, cursor: "pointer",
          }}>
            See the full pattern →
          </button>
        </div>
      )}

      {/* Return loop 3: Whenever you need it (grounding space) */}
      <div style={{
        borderRadius: 16, padding: "16px 18px", marginBottom: 14,
        background: `linear-gradient(135deg, ${T.bark}, ${T.bark}dd)`,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>🌿</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: font, fontWeight: 700, marginBottom: 6 }}>
              Whenever you need it
            </div>
            <p style={{ fontFamily: serif, fontSize: 14, fontStyle: "italic", color: "rgba(255,255,255,0.85)", lineHeight: 1.55, marginBottom: 10 }}>
              “This is your space. No agenda. Just come back when you need to feel like yourself again.”
            </p>
            <button onClick={() => setTab("regulation")} style={{
              background: "none", border: "none", padding: 0,
              fontFamily: font, fontSize: 13, color: "rgba(255,255,255,0.7)",
              fontWeight: 600, cursor: "pointer",
            }}>
              Open grounding space →
            </button>
          </div>
        </div>
      </div>

      {/* ── QUICK ACCESS ── */}
      <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
        Quick Access
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { icon: "🌙", label: "Log Sleep",   action: () => { setPendingSleepAction("put_down"); setTab("sleep"); } },
          { icon: "🧠", label: "NS Check-in", action: () => setShowNS(true) },
          { icon: "💬", label: "What do I say?", action: () => setTab("library") },
          { icon: "📊", label: "Insights",    action: () => setTab("insights") },
        ].map(q => (
          <button key={q.label} onClick={q.action} style={{
            padding: "12px 6px 10px",
            borderRadius: 14, border: `1px solid ${T.border}`,
            background: T.card, cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 22 }}>{q.icon}</span>
            <span style={{ fontFamily: font, fontSize: 10.5, color: T.muted, textAlign: "center", lineHeight: 1.3 }}>
              {q.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── SLEEP STATUS CARD (contextual) ── */}
      {(openSession || lastCompleted) && (
        <div style={{
          borderRadius: 14, border: `1px solid ${T.border}`,
          background: T.card, padding: "14px 16px", marginBottom: 10,
        }}>
          {openSession ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: font, fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: isNightSession ? "#8A7BAA" : "#A89B5A", marginBottom: 4 }}>
                  {isNightSession ? "🌙 Night sleep" : "☀️ Nap"} in progress
                </div>
                <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 2 }}>
                  Wake by {suggestedWakeStr || "—"}
                </div>
                <div style={{ fontFamily: font, fontSize: 11, color: T.muted }}>
                  {minsUntilWake === null ? "" : minsUntilWake < 0 ? `${Math.abs(minsUntilWake)}m past target` : minsUntilWake < 60 ? `in ${minsUntilWake}m` : `in ${Math.floor(minsUntilWake/60)}h ${minsUntilWake%60}m`}
                  {" · "}{isNightSession ? "night sleep" : `~${ageMonthsHome !== null && ageMonthsHome < 6 ? 45 : ageMonthsHome !== null && ageMonthsHome < 12 ? 60 : 75}min nap`}
                </div>
              </div>
              <button onClick={() => { setPendingSleepAction("woke_up"); setTab("sleep"); }} style={{
                padding: "8px 14px", borderRadius: 10, border: `1px solid ${T.teal}`,
                background: `${T.teal}12`, color: T.teal,
                fontFamily: font, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>Log wake →</button>
            </div>
          ) : minsAwake !== null ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: font, fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 4 }}>
                  {lastCompleted?.session_type === "night" ? "🌅 Good morning" : "☀️ Awake"} · {minsAwake < 60 ? `${minsAwake}m` : `${Math.floor(minsAwake/60)}h ${minsAwake%60}m`}
                </div>
                {nextPutDownStr && (
                  <>
                    <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText, marginBottom: 2 }}>
                      Next nap ~ {nextPutDownStr}
                    </div>
                    <div style={{ fontFamily: font, fontSize: 11, color: T.muted }}>
                      {minsUntilPutDown < 0 ? `${Math.abs(minsUntilPutDown)}m past window` : minsUntilPutDown < 30 ? "start winding down soon" : `in ${minsUntilPutDown < 60 ? minsUntilPutDown + "m" : Math.floor(minsUntilPutDown/60) + "h " + minsUntilPutDown%60 + "m"} · ${nextWindowHrs}h wake window`}
                    </div>
                  </>
                )}
              </div>
              <button onClick={() => { setPendingSleepAction("put_down"); setTab("sleep"); }} style={{
                padding: "8px 14px", borderRadius: 10,
                border: `1px solid ${minsUntilPutDown <= 15 ? T.teal : T.border}`,
                background: minsUntilPutDown <= 15 ? `${T.teal}12` : T.faint,
                color: minsUntilPutDown <= 15 ? T.teal : T.muted,
                fontFamily: font, fontSize: 12,
                fontWeight: minsUntilPutDown <= 15 ? 600 : 400, cursor: "pointer",
              }}>Log put down →</button>
            </div>
          ) : null}
        </div>
      )}



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
