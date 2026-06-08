// src/views/parent/HeldInsights.jsx
// Three-tab Insights: Your story / Foundation / Root cellar

import { useState, useEffect, useMemo } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import HeldTree from "./HeldTree.jsx";

// ─── DATA HOOK ───────────────────────────────────────────────────────────────
function useInsightsData(userId, familyId, childId, checkinRefreshKey) {
  const [data, setData] = useState({ checkins: [], sleepSessions: [], ventralCount: 0, loading: true });

  useEffect(() => {
    if (!userId || !familyId) { setData(d => ({ ...d, loading: false })); return; }
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

    Promise.all([
      supabase.from("regulation_checkins")
        .select("state, checked_in_at")
        .eq("user_id", userId)
        .gte("checked_in_at", since30)
        .order("checked_in_at", { ascending: true }),
      supabase.from("sleep_logs")
        .select("type, ts, end_ts, total_sleep_ms, session_type, child_id")
        .eq("family_id", familyId)
        .gte("ts", since30)
        .eq("type", "sleep_session")
        .order("ts", { ascending: false }),
      supabase.from("regulation_checkins")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("state", ["Regulated"]),
    ]).then(([{ data: checkins }, { data: sleep }, { count: ventralCount }]) => {
      const allSleep = (sleep || []).filter(s => s.end_ts);
      const hasChildIds = allSleep.some(s => s.child_id);
      const filteredSleep = hasChildIds && childId
        ? allSleep.filter(s => !s.child_id || s.child_id === childId)
        : allSleep;
      setData({ checkins: checkins || [], sleepSessions: filteredSleep, ventralCount: ventralCount ?? 0, loading: false });
    });
  }, [userId, familyId, childId, checkinRefreshKey]);

  return data;
}

// ─── PATTERN ANALYSIS ────────────────────────────────────────────────────────
function analyzePatterns(checkins, sleepSessions) {
  const now = Date.now();
  const month = 30 * 86400000;
  const recent = checkins.filter(c => now - new Date(c.checked_in_at) < month);
  const realCheckins = recent.filter(c =>
    c.source !== "evening_close" && !c.state?.startsWith("ec_") && c.state != null
  );

  const stateFreq = {};
  realCheckins.forEach(c => {
    if (c.state) stateFreq[c.state] = (stateFreq[c.state] || 0) + 1;
  });
  const topState = Object.entries(stateFreq).sort((a, b) => b[1] - a[1])[0];
  const activationCount = realCheckins.filter(c =>
    ["Fight","Flight","Freeze","Shutdown","Stretched"].includes(c.state)
  ).length;
  const steadyCount = realCheckins.filter(c => c.state === "Regulated").length;

  const hourBuckets = {};
  checkins.filter(c => c.state && c.state !== "Regulated" && !c.source?.includes?.("evening")).forEach(c => {
    const h = new Date(c.checked_in_at).getHours();
    hourBuckets[h] = (hourBuckets[h] || 0) + 1;
  });
  const peakHour = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];
  let peakTimeStr = null;
  let alertTimeStr = null;
  if (peakHour && parseInt(peakHour[1]) >= 2) {
    const h = parseInt(peakHour[0]);
    const fmt = (hr) => {
      const ap = hr >= 12 ? "pm" : "am";
      const h12 = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
      return `${h12}${ap}`;
    };
    peakTimeStr = fmt(h);
    alertTimeStr = fmt(h > 0 ? h - 1 : 23);
  }

  const getSleepMs = s => {
    if (s.total_sleep_ms) return s.total_sleep_ms;
    if (s.ts && s.end_ts) return Math.max(0, new Date(s.end_ts) - new Date(s.ts));
    return 0;
  };
  const sessionsWithDuration = sleepSessions.filter(s => getSleepMs(s) > 0);
  const avgSleepMs = sessionsWithDuration.length
    ? sessionsWithDuration.reduce((s, l) => s + getSleepMs(l), 0) / sessionsWithDuration.length
    : 0;
  const avgSleepHrs = avgSleepMs > 0 ? parseFloat((avgSleepMs / 3600000).toFixed(1)) : null;
  const since7 = new Date(Date.now() - 7 * 86400000);
  const roughNights = sleepSessions.filter(s => {
    const hrs = getSleepMs(s) / 3600000;
    if (hrs <= 0) return false;
    if (new Date(s.ts) < since7) return false; // only last 7 days
    return s.session_type === "night" ? hrs < 8 : hrs < 6;
  }).length;
  const shortNapCount = sleepSessions.filter(s => {
    const hrs = getSleepMs(s) / 3600000;
    if (new Date(s.ts) < since7) return false; // only last 7 days
    return hrs > 0 && hrs < 1.5 && s.session_type !== "night";
  }).length;

  const morningCheckins = recent.filter(c => c.source === "morning_moment");
  const eveningCheckins = recent.filter(c => c.source === "evening_close");

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const label = d.toLocaleDateString("en", { weekday: "short" }).slice(0, 1);
    const dc = realCheckins.filter(c => new Date(c.checked_in_at).toDateString() === d.toDateString());
    const score = dc.length > 0
      ? dc.reduce((s, c) => s + (c.state === "Regulated" ? 5 : c.state === "Stretched" ? 3 : 1.5), 0) / dc.length
      : 0;
    return { label, score, count: dc.length, hasData: dc.length > 0 };
  });

  let consecutiveActivated = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const dc = realCheckins.filter(c =>
      new Date(c.checked_in_at).toDateString() === d.toDateString() &&
      ["Fight","Flight","Freeze","Shutdown","Stretched"].includes(c.state)
    );
    if (dc.length > 0) consecutiveActivated++;
    else break;
  }

  let weekNarrative = null;
  if (realCheckins.length > 0) {
    if (consecutiveActivated >= 3) {
      weekNarrative = `You've been in '${topState?.[0] || "go"}' mode for ${consecutiveActivated} days. Your window of tolerance is narrowing — that's biology, not failure.`;
    } else if (steadyCount > activationCount) {
      weekNarrative = `More steady than stretched this week. Your nervous system is finding its rhythm.`;
    } else if (activationCount >= 4) {
      weekNarrative = `A stretched week. Every check-in is proof you're paying attention — that's the work.`;
    } else {
      weekNarrative = `${realCheckins.length} check-in${realCheckins.length === 1 ? "" : "s"} this week. Your patterns are starting to take shape.`;
    }
  }

  let meaningMaker = null;
  const sleepAndActivation = roughNights >= 2 && activationCount >= 3;
  const sleepDebt = roughNights >= 2 || shortNapCount >= 3;
  if (sleepAndActivation || (sleepDebt && realCheckins.length >= 2)) {
    const napNote = shortNapCount >= 2 ? ` + ${shortNapCount} short nap${shortNapCount > 1 ? "s" : ""}` : "";
    meaningMaker = {
      quote: `${roughNights} rough night${roughNights === 1 ? "" : "s"}${napNote} → nervous system is maxed.`,
      body: `When sleep debt accumulates, regulation capacity shrinks — in your child and in you. The fussiness, the clinginess, the resistance — all of it makes sense right now.`,
      chip: { emoji: "🧠", label: "Nervous System" },
    };
  } else if (topState?.[0] === "Stretched" && topState[1] >= 3) {
    meaningMaker = {
      quote: `Stretched ${topState[1]}× this week → running on reserve.`,
      body: `Stretched isn't crisis — but it's close to the edge. Even 10 minutes of genuine rest changes what's available tonight.`,
      chip: { emoji: "🧠", label: "Nervous System" },
    };
  } else if (topState?.[0] === "Fight") {
    meaningMaker = {
      quote: `High activation + caregiving = your nervous system doing double duty.`,
      body: `Fight state while parenting is like driving with one foot on the brake. The patterns you're tracking help you catch it sooner.`,
      chip: { emoji: "🧠", label: "Nervous System" },
    };
  } else if (topState?.[0] === "Freeze" && topState[1] >= 2) {
    meaningMaker = {
      quote: `Freeze state ${topState[1]}× this week → your system hit its limit.`,
      body: `Freeze isn't laziness or checked-out parenting. It's your nervous system's last resort protection. Recovery needs safety, rest, and tiny moments of connection — not more effort.`,
      chip: { emoji: "🧠", label: "Nervous System" },
    };
  } else if (topState?.[0] === "Shutdown" && topState[1] >= 2) {
    meaningMaker = {
      quote: `Shutdown is the body saying: I have nothing left right now.`,
      body: `When shutdown happens repeatedly, it's a signal the load has been too high for too long. The fact that you're tracking it means you're already doing the most important thing.`,
      chip: { emoji: "🧠", label: "Nervous System" },
    };
  } else if (realCheckins.length >= 3 && steadyCount >= activationCount) {
    meaningMaker = {
      quote: `More steady than activated this week — that's real regulation.`,
      body: `Steady doesn't mean easy. It means your nervous system has some capacity available. The check-ins you're doing are part of why.`,
      chip: { emoji: "🌿", label: "Regulation" },
    };
  } else if (avgSleepHrs && avgSleepHrs < 7 && realCheckins.length > 0) {
    meaningMaker = {
      quote: `Short sleep windows + check-in patterns tell the same story.`,
      body: `Less than 7 hours of average sleep significantly reduces emotional regulation capacity. This isn't personal. It's physiological.`,
      chip: { emoji: "💤", label: "Sleep + Regulation" },
    };
  } else if (realCheckins.length >= 1) {
    meaningMaker = {
      quote: `${realCheckins.length} check-in${realCheckins.length === 1 ? "" : "s"} logged. Your patterns are starting to form.`,
      body: `The more you check in, the clearer the picture gets — not just for you, but for how we can support you. Keep going.`,
      chip: { emoji: "🌱", label: "Pattern Building" },
    };
  }

  let behaviorPattern = null;
  if (activationCount >= 2) {
    if ((topState?.[0] === "Shutdown" || topState?.[0] === "Freeze") && topState[1] >= 2) {
      behaviorPattern = {
        quote: `Withdrawal isn't weakness — it's a protective response.`,
        body: `When the system shuts down, it's protecting itself from overload. Connection and gentle movement are the way back — not willpower.`,
        chip: { emoji: "🌿", label: "Polyvagal" },
      };
    } else if (topState?.[0] === "Flight" && topState[1] >= 2) {
      behaviorPattern = {
        quote: `More boundary pushing = seeking control, not defiance.`,
        body: `Boundary-testing spikes when a child's world feels unpredictable. They're not pushing your buttons — they're looking for the edges to feel safe.`,
        chip: { emoji: "🌿", label: "Attachment" },
      };
    } else if (topState?.[0] === "Fight" && topState[1] >= 2) {
      behaviorPattern = {
        quote: `Meltdowns cluster when the tank is empty.`,
        body: `High-activation states in parents and children are contagious — not because of bad parenting, but because nervous systems mirror each other. Your regulation is your child's regulation.`,
        chip: { emoji: "🌿", label: "Co-regulation" },
      };
    } else if (topState?.[0] === "Stretched" && topState[1] >= 2) {
      behaviorPattern = {
        quote: `Running on fumes changes how everything lands.`,
        body: `When you're stretched, your window of tolerance narrows — what would normally roll off you sticks. That's not a character flaw. That's biology asking for a reset.`,
        chip: { emoji: "🌿", label: "Nervous System" },
      };
    }
  }

  let yourPattern = null;
  if (peakTimeStr && alertTimeStr) {
    const peakHr = parseInt(peakHour[0]);
    const timeOfDay = peakHr < 12 ? "morning" : peakHr < 17 ? "afternoon" : "evening";
    yourPattern = {
      quote: `You tend to feel 'on edge' around ${peakTimeStr}.`,
      body: `This is predictable — which means it's workable. A 2-minute reset at ${alertTimeStr} could change your whole ${timeOfDay}.`,
      alertLabel: `${alertTimeStr} Reminder`,
    };
  }

  const today = new Date().toDateString();
  const todayCheckins = realCheckins.filter(c => new Date(c.checked_in_at).toDateString() === today);
  const hadEvening = eveningCheckins.some(c => new Date(c.checked_in_at).toDateString() === today);
  const endOfDay = {
    checkinsToday: todayCheckins.length,
    sleepLoggedToday: sleepSessions.some(s => new Date(s.ts).toDateString() === today),
    eveningDone: hadEvening,
    quote: todayCheckins.length >= 3
      ? `"You had a hard day — and you showed up anyway. That's the whole thing."`
      : todayCheckins.length >= 1
      ? `"Every check-in is data. You're learning your own system."`
      : `"Even one moment of noticing is the practice."`,
  };

  // 7-day streak — if today has no check-in yet, start counting from yesterday
  let streak = 0;
  const todayHasLog = checkins.some(c => new Date(c.checked_in_at).toDateString() === new Date().toDateString());
  const startOffset = todayHasLog ? 0 : 1;
  for (let i = startOffset; i < 7 + startOffset; i++) {
    const d = new Date(Date.now() - i * 86400000).toDateString();
    const hasLog = checkins.some(c => new Date(c.checked_in_at).toDateString() === d);
    if (hasLog) streak++;
    else break;
  }
  const streakDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000).toDateString();
    return checkins.some(c => new Date(c.checked_in_at).toDateString() === d);
  });

  return {
    days, weekNarrative, meaningMaker, behaviorPattern, yourPattern,
    endOfDay, topState, realCheckins, avgSleepHrs, morningCheckins, eveningCheckins,
    roughNights, shortNapCount, sessionsWithDuration, streak, streakDays,
  };
}

// ─── SHARED SUB-COMPONENTS ────────────────────────────────────────────────────
function InsightCard({ eyebrow, quote, body, chip, accentColor }) {
  const T = useT();
  return (
    <div style={{
      borderRadius: 16, padding: "18px 18px 16px",
      background: T.card2, border: `1px solid ${T.border}`,
      borderLeft: `4px solid ${accentColor}`, marginBottom: 12,
    }}>
      {eyebrow && (
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: accentColor, fontFamily: font, fontWeight: 700, marginBottom: 10 }}>
          {eyebrow}
        </div>
      )}
      <div style={{ fontFamily: serif, fontSize: 17, fontStyle: "italic", color: T.headingText, lineHeight: 1.55, marginBottom: 10 }}>
        "{quote}"
      </div>
      <div style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.7, marginBottom: chip ? 14 : 0 }}>
        {body}
      </div>
      {chip && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: T.tealLight, border: "1px solid #C4D8CA", fontFamily: font, fontSize: 12, fontWeight: 600, color: T.teal }}>
          <span>{chip.emoji}</span><span>{chip.label}</span>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ text }) {
  const T = useT();
  return (
    <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: T.muted, fontFamily: font, fontWeight: 700, marginBottom: 10, marginTop: 4 }}>
      {text}
    </div>
  );
}

// ─── YOUR STORY TAB ───────────────────────────────────────────────────────────
function YourStoryTab({ profile, weekCount, patterns, loading, ventralCount, setTab, onScripts }) {
  const T = useT();
  const {
    meaningMaker, behaviorPattern, yourPattern, endOfDay,
    realCheckins, streak, streakDays,
  } = patterns;

  const total = profile?.total_ns_logs ?? 0;
  const ventral = ventralCount ?? 0;
  const leaves = profile?.leaves ?? 0;
  const resilience = Math.min(Math.round((total / 120) * 100), 100);
  const visualProgress = Math.min(Math.round((weekCount / 22) * 100), 100);
  const stabilityRate = total > 0 ? Math.round((ventral / total) * 100) : 0;
  const capacityLabel = resilience >= 75 ? "Deeply anchored" : resilience >= 45 ? "Structure stabilizing" : "Foundation building";

  let nsQuote = null;
  if (weekCount <= 3) {
    nsQuote = `Your nervous system has been checked in ${total} time${total === 1 ? "" : "s"}. You are noticing — and the roots are real, even when you can't see them yet.`;
  } else if (weekCount <= 7) {
    nsQuote = `${ventral} of your ${total} check-ins have been ventral — a ${stabilityRate}% stability rate. Your trunk is rising. The work below ground is starting to show.`;
  } else if (weekCount <= 12) {
    const direction = resilience >= 50 ? "climbing" : "building";
    nsQuote = `Your system stability is at ${stabilityRate}% and ${direction}. You've been showing up for ${weekCount} weeks. That's ${total} moments of noticing — each one a ring in your trunk.`;
  } else {
    nsQuote = `Something is shifting. ${stabilityRate}% stability, ${leaves} leaves banked. Your branches are reaching because your roots earned it.`;
  }

  const hasData = realCheckins.length >= 1;

  return (
    <div>
      {/* ── REGULATION TREE ── */}
      {/* hideStats wrapper — hides the score row HeldTree renders internally */}
      <div style={{ paddingBottom: 16 }} className="held-tree-no-stats">
        <style>{`.held-tree-no-stats .tree-stats-row { display: none !important; }`}</style>
        <HeldTree
          userWeekCount={weekCount}
          totalNsLogs={total}
          ventralPoints={ventral}
          latestNsState={profile?.latest_ns_state ?? null}
          hideStats={true}
        />
      </div>

      {/* ── STATS ROW ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { label: "CHECK-INS", value: total },
          { label: "LEAVES",    value: leaves },
          { label: "WEEK",      value: weekCount },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, borderRadius: 14, padding: "14px 10px 12px",
            background: T.card2, border: `1px solid ${T.border}`, textAlign: "center",
          }}>
            <div style={{ fontFamily: serif, fontSize: 26, color: T.headingText, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: font, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── NS NARRATIVE ── */}
      <SectionLabel text="Your nervous system story" />
      <div style={{
        borderRadius: 16, padding: "18px 18px 16px",
        background: T.card2, border: `1px solid ${T.border}`,
        borderLeft: `4px solid ${T.teal}`, marginBottom: 16,
      }}>
        <div style={{ fontFamily: serif, fontSize: 17, fontStyle: "italic", color: T.headingText, lineHeight: 1.6, marginBottom: 14 }}>
          "{nsQuote}"
        </div>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.muted, fontFamily: font, fontWeight: 700, marginBottom: 8 }}>
          System resilience
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontFamily: font, fontSize: 13, color: T.headingText }}>{capacityLabel}</div>
          <div style={{ fontFamily: serif, fontSize: 15, color: T.teal, fontWeight: 700 }}>{resilience}%</div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: T.border, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", width: `${resilience}%`, borderRadius: 3, background: T.teal, transition: "width 0.6s" }} />
        </div>
        <div style={{ fontFamily: font, fontSize: 12, color: T.muted, fontStyle: "italic", lineHeight: 1.6 }}>
          Visual progress is {visualProgress}% — but your foundation is at {resilience}%. The canopy is coming.
        </div>
      </div>

      {/* ── 7-DAY STREAK ── */}
      <SectionLabel text="7-day streak" />
      <div style={{ borderRadius: 16, padding: "16px 18px", background: T.card2, border: `1px solid ${T.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {streakDays.map((filled, i) => (
            <div key={i} style={{
              flex: 1, height: 10, borderRadius: 5,
              background: filled ? T.teal : T.border,
              transition: "background 0.3s",
            }} />
          ))}
        </div>
        <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
          {streak >= 7
            ? "7-day streak complete — your roots are locked in 🌳"
            : `${streak} of 7 days — ${7 - streak} more day${7 - streak === 1 ? "" : "s"} locks in this progress permanently`}
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {!hasData && !loading && (
        <div style={{ borderRadius: 16, padding: "24px 20px", marginBottom: 12, background: T.card2, border: `1px solid ${T.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🌱</div>
          <div style={{ fontFamily: serif, fontSize: 16, color: T.headingText, marginBottom: 6 }}>Patterns need a little time</div>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.65, marginBottom: 16 }}>
            Log a few check-ins and your personalized insights will appear here.
          </div>
          <button onClick={() => setTab("home")} style={{ padding: "10px 20px", borderRadius: 24, background: T.bark, color: "#fff", border: "none", fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Do a check-in →
          </button>
        </div>
      )}

      {/* ── MEANING MAKER ── */}
      {meaningMaker && (
        <InsightCard eyebrow="Meaning Maker" quote={meaningMaker.quote} body={meaningMaker.body} chip={meaningMaker.chip} accentColor={T.warm} />
      )}

      {/* ── BEHAVIOR PATTERN ── */}
      {behaviorPattern && (
        <InsightCard eyebrow="Behavior Pattern" quote={behaviorPattern.quote} body={behaviorPattern.body} chip={behaviorPattern.chip} accentColor={T.teal} />
      )}

      {/* ── YOUR PATTERN ── */}
      {yourPattern && (
        <div style={{ borderRadius: 16, padding: "18px 18px 16px", background: T.card2, border: `1px solid ${T.border}`, borderLeft: `4px solid ${T.teal}`, marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.teal, fontFamily: font, fontWeight: 700, marginBottom: 10 }}>Your Pattern</div>
          <div style={{ fontFamily: serif, fontSize: 17, fontStyle: "italic", color: T.headingText, lineHeight: 1.55, marginBottom: 10 }}>"{yourPattern.quote}"</div>
          <div style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.7, marginBottom: 14 }}>{yourPattern.body}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: T.tealLight, border: `1px solid ${T.teal}40`, fontFamily: font, fontSize: 12, fontWeight: 600, color: T.teal, cursor: "pointer" }}>
            ⏰ {yourPattern.alertLabel}
          </div>
        </div>
      )}

      {/* ── END OF DAY ── */}
      {(endOfDay.checkinsToday > 0 || endOfDay.sleepLoggedToday) && (
        <div style={{ borderRadius: 16, padding: "18px 20px", background: T.card2, border: `1px solid ${T.border}`, marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.muted, fontFamily: font, fontWeight: 700, marginBottom: 12 }}>End of Day</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[
              { done: endOfDay.checkinsToday >= 1 },
              { done: endOfDay.sleepLoggedToday },
              { done: endOfDay.checkinsToday >= 2 },
              { done: endOfDay.eveningDone },
            ].map((item, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: item.done ? T.tealMid : T.border, transition: "background 0.3s" }} />
            ))}
          </div>
          <div style={{ fontFamily: serif, fontSize: 17, fontStyle: "italic", color: T.headingText, lineHeight: 1.6 }}>
            {endOfDay.quote}
          </div>
        </div>
      )}

      {/* ── NO INSIGHTS YET ── */}
      {hasData && !meaningMaker && !behaviorPattern && !yourPattern && (
        <div style={{ borderRadius: 16, padding: "16px 18px", marginBottom: 12, background: T.card2, border: `1px solid ${T.border}` }}>
          <div style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.7 }}>
            🌿 Keep logging — your meaning maker and behavior patterns will appear after a few more days of data.
          </div>
        </div>
      )}

      {/* ── SCRIPTS LINK ── */}
      <button onClick={() => onScripts ? onScripts() : setTab("library")} style={{ width: "100%", padding: "16px 18px", borderRadius: 16, background: T.card2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", marginBottom: 8 }}>
        <span style={{ fontSize: 24 }}>💬</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: T.headingText }}>Scripts for right now</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 2 }}>What to say in hard parenting moments</div>
        </div>
        <span style={{ color: T.muted, fontSize: 16 }}>›</span>
      </button>
    </div>
  );
}

// ─── FOUNDATION TAB ───────────────────────────────────────────────────────────
function FoundationTab({ profile, weekCount, patterns, ventralCount }) {
  const T = useT();
  const { streak } = patterns;

  const total = profile?.total_ns_logs ?? 0;
  const ventral = ventralCount ?? 0;
  const leaves = profile?.leaves ?? 0;
  const milestones = profile?.streak_milestones || {};
  const resilience = Math.min(Math.round((total / 120) * 100), 100);
  const visualProgress = Math.min(Math.round((weekCount / 22) * 100), 100);

  // Base root depth + permanent milestone bonuses (earned once, kept forever)
  const milestoneBonus = (milestones[10] ? 5 : 0) + (milestones[20] ? 8 : 0) + (milestones[30] ? 15 : 0);
  const rootDepth = Math.min(Math.round(resilience * 0.35) + milestoneBonus, 100);
  const isSecure = streak >= 7;
  const capacityLabel = resilience >= 75 ? "Deeply anchored" : resilience >= 45 ? "Structure stabilizing" : "Foundation building";
  const anchorStrength = streak >= 7 ? "Level 2" : streak >= 5 ? "Level 1" : "Building";

  // Seeded ring heights — stable across re-renders
  const ringHeights = Array.from({ length: Math.max(weekCount, 5) }).map((_, i) => {
    const seed = ((i * 7 + 3) % 5) + 1;
    return 8 + seed * 5;
  });

  return (
    <div>
      {/* ── FOUNDATION STATUS REPORT ── */}
      <SectionLabel text="Foundation status report" />
      <div style={{
        borderRadius: 18, padding: "20px 20px 18px",
        background: `linear-gradient(160deg, ${T.bark}, ${T.bark})`,
        marginBottom: 16,
      }}>
        <div style={{ fontFamily: serif, fontSize: 17, fontStyle: "italic", color: "rgba(255,255,255,0.88)", lineHeight: 1.65 }}>
          "Foundation Status: {isSecure ? "Secure" : "Building"}. You've spent {weekCount} day{weekCount === 1 ? "" : "s"} noticing your state. Your roots have expanded {rootDepth}% deeper. Your biological capacity for stress {isSecure ? "has levelled up" : "is increasing"}."
        </div>
      </div>

      {/* ── VENTRAL CAPACITY SCORE ── */}
      <SectionLabel text="Ventral capacity score" />
      <div style={{ borderRadius: 16, padding: "18px 18px 16px", background: T.card2, border: `1px solid ${T.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: serif, fontSize: 38, color: T.headingText, lineHeight: 1 }}>{resilience}%</div>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, textAlign: "right", paddingTop: 6 }}>{capacityLabel}</div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: T.border, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", width: `${resilience}%`, borderRadius: 3, background: T.teal, transition: "width 0.6s" }} />
        </div>
        <div style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.7 }}>
          Every regulated check-in adds to your rolling system stability average. Visual progress is {visualProgress}% — but your foundation is at {resilience}%. The canopy is coming.
        </div>
      </div>

      {/* ── BY THE NUMBERS ── */}
      <SectionLabel text="By the numbers" />
      <div style={{ borderRadius: 16, padding: "18px 18px 4px", background: T.card2, border: `1px solid ${T.border}`, marginBottom: 16 }}>
        {[
          { label: "Regulated check-ins", sub: "Ventral (Steady/Regulated) states", value: `${ventral} of ${total}` },
          { label: "Leaves banked",        sub: "Deep forest green — hard earned", value: String(leaves) },
          { label: "Repair blooms",        sub: "Worth 3× root depth each",        value: "0" },
          { label: "Anchor strength",      sub: "Meltdown resistance rating",       value: anchorStrength, useSerif: true },
        ].map((row, i, arr) => (
          <div key={row.label}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14 }}>
              <div>
                <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: T.headingText, marginBottom: 2 }}>{row.label}</div>
                <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{row.sub}</div>
              </div>
              <div style={{ fontFamily: serif, fontSize: row.useSerif ? 20 : 22, color: T.headingText, fontWeight: 400, marginLeft: 12 }}>
                {row.value}
              </div>
            </div>
            {i < arr.length - 1 && <div style={{ height: 1, background: T.border, marginBottom: 14 }} />}
          </div>
        ))}
      </div>

      {/* ── STREAK MILESTONES ── */}
      {(milestones[10] || milestones[20] || milestones[30]) && (
        <>
          <SectionLabel text="Streak milestones" />
          <div style={{ borderRadius: 16, padding: "16px 18px", background: T.card2, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <p style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.6, margin: "0 0 14px" }}>
              These are permanent. Breaking a streak doesn't take them away.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { key: 10, label: "10 days in a row",  reward: "+5% root depth",  desc: "A pattern is forming." },
                { key: 20, label: "20 days in a row",  reward: "+8% root depth",  desc: "Your system is learning to trust the practice." },
                { key: 30, label: "30 days in a row",  reward: "+15% root depth", desc: "This is what a regulated parent looks like." },
              ].map(m => {
                const unlocked = !!milestones[m.key];
                return (
                  <div key={m.key} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    opacity: unlocked ? 1 : 0.38,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: unlocked ? "#5C7A5E" : T.border,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {unlocked && (
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "white" }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: T.headingText, marginBottom: 1 }}>
                        {m.label}
                        <span style={{ fontFamily: font, fontSize: 11, fontWeight: 400, color: "#5C7A5E", marginLeft: 8 }}>
                          {m.reward}
                        </span>
                      </div>
                      <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{m.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── GROWTH RINGS ── */}
      <SectionLabel text="Growth rings" />
      <div style={{ borderRadius: 16, padding: "18px 18px 16px", background: T.card2, border: `1px solid ${T.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 5, alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap" }}>
          {ringHeights.map((h, i) => {
            const opacity = 0.35 + (i / Math.max(ringHeights.length - 1, 1)) * 0.65;
            const colorPick = i % 3 === 0 ? T.teal : i % 3 === 1 ? T.tealMid : T.bark;
            return (
              <div key={i} style={{
                width: 28, height: h, borderRadius: 4,
                background: colorPick, opacity, flexShrink: 0,
              }} />
            );
          })}
        </div>
        <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.7 }}>
          Each ring is a week. Thin rings were harder. Thick rings were weeks of steady ventral access. Growth is not linear — but it is cumulative.
        </div>
      </div>
    </div>
  );
}

// ─── ROOT CELLAR TAB ──────────────────────────────────────────────────────────
function RootCellarTab({ profile, patterns }) {
  const T = useT();
  const { streak } = patterns;
  const total = profile?.total_ns_logs ?? 0;
  const leaves = profile?.leaves ?? 0;
  const jarFill = Math.min(leaves / 40, 1);
  const jarGlowing = leaves >= 10;

  const badges = [
    { icon: "⚓", name: "Foundational anchor", desc: "7 consecutive days of noticing your state",  earnedProof: "Proof of consistent self-awareness",   lockedProof: `${Math.max(0, 7 - streak)} more days to unlock`,         earned: streak >= 7 },
    { icon: "🏛", name: "NS architect",         desc: "20 logs of identifying your state",          earnedProof: "Proof of naming it to tame it",         lockedProof: `${Math.max(0, 20 - total)} more check-ins to unlock`,    earned: total >= 20 },
    { icon: "🔧", name: "Repair master",         desc: "5 rupture + repair sequences logged",        earnedProof: "Proof of biological recovery speed",    lockedProof: `${Math.max(0, 20 - total)} more check-ins to unlock`,    earned: total >= 20, warmAccent: true },
    { icon: "🌱", name: "Steady ground",          desc: "30 total check-ins completed",              earnedProof: "Proof of sustained commitment",          lockedProof: `${Math.max(0, 30 - total)} more check-ins to unlock`,    earned: total >= 30 },
    { icon: "🌳", name: "Deeply rooted",          desc: "60 total check-ins completed",              earnedProof: "Proof of long-term resilience building", lockedProof: `${Math.max(0, 60 - total)} more check-ins to unlock`,    earned: total >= 60 },
  ];

  return (
    <div>
      {/* ── INTRO ── */}
      <div style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: T.muted, lineHeight: 1.7, marginBottom: 20 }}>
        Your root cellar holds the proof of everything you've built. These aren't rewards — they're records.
      </div>

      {/* ── BADGES ── */}
      <SectionLabel text="Your badges" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {badges.map(b => (
          <div key={b.name} style={{
            borderRadius: 16, padding: "14px 16px",
            background: T.card2,
            border: `1px solid ${T.border}`,
            borderLeft: b.earned ? `4px solid ${b.warmAccent ? T.warm : T.teal}` : `1px solid ${T.border}`,
            display: "flex", alignItems: "center", gap: 14,
            opacity: b.earned ? 1 : 0.45,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
              background: b.earned ? T.tealLight : T.border,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}>
              {b.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: T.headingText, marginBottom: 2 }}>{b.name}</div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 4 }}>{b.desc}</div>
              <div style={{
                fontFamily: font, fontSize: 12, fontWeight: 600,
                color: b.earned ? (b.warmAccent ? T.warm : T.teal) : T.muted,
              }}>
                {b.earned ? `Earned · ${b.earnedProof}` : `Locked · ${b.lockedProof}`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── LEAF BANK ── */}
      <SectionLabel text="Leaf bank" />
      <div style={{ borderRadius: 16, padding: "16px 18px", background: T.card2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <div style={{ position: "relative", width: 42, height: 52, flexShrink: 0 }}>
          <img
            src={jarGlowing ? "/tree/jar-full.png" : "/tree/jar-empty.png"}
            alt="leaf jar"
            style={{
              width: "100%", height: "100%", objectFit: "contain",
              boxShadow: jarGlowing ? `0 0 14px ${T.teal}66` : "none",
              transition: "box-shadow 0.4s",
            }}
          />
          <div style={{
            position: "absolute", bottom: 3, left: 4, right: 4,
            height: `${Math.round(jarFill * 70)}%`,
            borderRadius: "0 0 4px 4px",
            background: `${T.teal}44`,
            transition: "height 0.5s",
            pointerEvents: "none",
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: serif, fontSize: 18, color: T.headingText, marginBottom: 4 }}>
            {leaves} leaves banked
          </div>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
            {jarGlowing
              ? "Your jar is glowing. These are hard-earned."
              : `${10 - leaves} more to your next milestone. At 10 leaves your jar glows.`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function HeldInsights({ setTab, onOpenDrawer, onScripts }) {
  const T = useT();
  const { currentUser, activeFamily, activeChild, checkinRefreshKey } = useApp();
  const [insightTab, setInsightTab] = useState("story");

  const { checkins, sleepSessions, ventralCount, loading } = useInsightsData(
    currentUser?.id, activeFamily?.id, activeChild?.id, checkinRefreshKey
  );

  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from("profiles")
      .select("created_at, total_ns_logs, ventral_points, latest_ns_state, leaves, streak_milestones")
      .eq("id", currentUser.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [currentUser?.id, checkinRefreshKey]);

  const weekCount = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7))
    : 0;

  const patterns = useMemo(() => analyzePatterns(checkins, sleepSessions), [checkins, sleepSessions]);

  const tabs = [
    { id: "story",      label: "Your story" },
    { id: "foundation", label: "Foundation" },
    { id: "cellar",     label: "Root cellar" },
  ];

  return (
    <div style={{ paddingBottom: 90, background: T.bg, minHeight: "100vh" }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: T.muted, fontFamily: font, marginBottom: 4 }}>Insights</div>
          <div style={{ fontFamily: serif, fontSize: 28, color: T.headingText, lineHeight: 1.1 }}>What I'm seeing</div>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, marginTop: 3 }}>Your patterns, translated.</div>
        </div>
        {onOpenDrawer && (
          <button onClick={onOpenDrawer} style={{ width: 38, height: 38, flexShrink: 0, marginTop: 4, background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 18, height: 1.5, borderRadius: 2, background: T.muted }} />)}
          </button>
        )}
      </div>

      {/* ── THREE-TAB NAV ── */}
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ display: "flex", background: T.card2, borderRadius: 22, padding: 4, border: `1px solid ${T.border}` }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setInsightTab(t.id)} style={{
              flex: 1, padding: "9px 6px", borderRadius: 18, border: "none", cursor: "pointer",
              fontFamily: font, fontSize: 13, fontWeight: insightTab === t.id ? 700 : 500,
              background: insightTab === t.id ? T.card : "transparent",
              color: insightTab === t.id ? T.headingText : T.muted,
              boxShadow: insightTab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.2s",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ padding: "0 20px" }}>
        {insightTab === "story" && (
          <YourStoryTab
            profile={profile}
            weekCount={weekCount}
            patterns={patterns}
            loading={loading}
            ventralCount={ventralCount}
            setTab={setTab}
            onScripts={onScripts}
          />
        )}
        {insightTab === "foundation" && (
          <FoundationTab
            profile={profile}
            weekCount={weekCount}
            patterns={patterns}
            ventralCount={ventralCount}
          />
        )}
        {insightTab === "cellar" && (
          <RootCellarTab
            profile={profile}
            patterns={patterns}
          />
        )}
      </div>
    </div>
  );
}
