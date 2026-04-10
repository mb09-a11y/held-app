// src/views/parent/HeldInsights.jsx
// Rebuilt to match wireframe: NS narrative, meaning maker cards,
// behavior pattern, parent's own pattern with real alert, end of day reflection.

import { useState, useEffect, useMemo } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

// ─── COLORS ──────────────────────────────────────────────────────────────────
// C is now generated inside components using T tokens - no file-level constant needed

// ─── DATA HOOK — 30 days for pattern detection ───────────────────────────────
function useInsightsData(userId, familyId, childId) {
  const [data, setData] = useState({ checkins: [], sleepSessions: [], loading: true });

  useEffect(() => {
    if (!userId || !familyId) { setData(d => ({ ...d, loading: false })); return; }
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const since7  = new Date(Date.now() - 7  * 86400000).toISOString();

    Promise.all([
      supabase.from("regulation_checkins")
        .select("state, checked_in_at")
        .eq("user_id", userId)
        .gte("checked_in_at", since30)
        .order("checked_in_at", { ascending: true }),
      (() => {
        // Query by family_id only — child_id may not be set on all entries.
        // Filter by child_id client-side after fetch to avoid empty results.
        return supabase.from("sleep_logs")
          .select("type, ts, end_ts, total_sleep_ms, session_type, child_id")
          .eq("family_id", familyId)
          .gte("ts", since30)
          .eq("type", "sleep_session")
          .order("ts", { ascending: false });
      })(),
    ]).then(([{ data: checkins }, { data: sleep }]) => {
      const allSleep = (sleep || []).filter(s => s.end_ts);
      // Only filter by child_id client-side if entries have child_id set
      const hasChildIds = allSleep.some(s => s.child_id);
      const filteredSleep = hasChildIds && childId
        ? allSleep.filter(s => !s.child_id || s.child_id === childId)
        : allSleep;
      setData({
        checkins: checkins || [],
        sleepSessions: filteredSleep,
        loading: false,
      });
    });
  }, [userId, familyId, childId]);

  return data;
}

// ─── PATTERN ANALYSIS ────────────────────────────────────────────────────────
function analyzePatterns(checkins, sleepSessions) {
  const now = Date.now();
  const week = 7 * 86400000;
  // Use 30 days for checkins (not 7) so existing data shows up
  const month = 30 * 86400000;
  const recent = checkins.filter(c => now - new Date(c.checked_in_at) < month);
  const realCheckins = recent.filter(c =>
    c.source !== "evening_close" && !c.state?.startsWith("ec_") && c.state != null
  );

  // State frequency
  const stateFreq = {};
  realCheckins.forEach(c => {
    if (c.state) stateFreq[c.state] = (stateFreq[c.state] || 0) + 1;
  });
  const topState = Object.entries(stateFreq).sort((a, b) => b[1] - a[1])[0];
  const activationCount = realCheckins.filter(c =>
    ["Fight","Flight","Freeze","Shutdown","Stretched"].includes(c.state)
  ).length;
  const steadyCount = realCheckins.filter(c => (c.state === "Steady" || c.state === "Regulated")).length;

  // Time-of-day pattern (30 days of activated states)
  const hourBuckets = {};
  checkins.filter(c => c.state && !["Steady", "Regulated"].includes(c.state) && !c.source?.includes?.("evening")).forEach(c => {
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

  // Sleep quality — use total_sleep_ms if available, fall back to ts/end_ts diff
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
  // Rough night = night session under 8h, OR any session under 6h if no session_type set
  const roughNights = sleepSessions.filter(s => {
    const hrs = getSleepMs(s) / 3600000;
    if (hrs <= 0) return false;
    return s.session_type === "night" ? hrs < 8 : hrs < 6;
  }).length;
  const shortNapCount = sleepSessions.filter(s => {
    const hrs = getSleepMs(s) / 3600000;
    return hrs > 0 && hrs < 1.5 && s.session_type !== "night";
  }).length;

  // Morning/evening
  const morningCheckins = recent.filter(c => c.source === "morning_moment");
  const eveningCheckins = recent.filter(c => c.source === "evening_close");

  // Bar chart
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const label = d.toLocaleDateString("en", { weekday: "short" }).slice(0, 1);
    const dc = realCheckins.filter(c => new Date(c.checked_in_at).toDateString() === d.toDateString());
    const score = dc.length > 0
      ? dc.reduce((s, c) => s + ((c.state === "Steady" || c.state === "Regulated") ? 5 : c.state === "Stretched" ? 3 : 1.5), 0) / dc.length
      : 0;
    return { label, score, count: dc.length, hasData: dc.length > 0 };
  });

  // Consecutive activated days
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

  // Week narrative
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

  // Meaning maker
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

  // Behavior pattern — show if there's any activation, regardless of steady ratio
  let behaviorPattern = null;
  if (activationCount >= 1) {
    if (topState?.[0] === "Shutdown" || topState?.[0] === "Freeze") {
      behaviorPattern = {
        quote: `Withdrawal isn't weakness — it's a protective response.`,
        body: `When the system shuts down, it's protecting itself from overload. Connection and gentle movement are the way back — not willpower.`,
        chip: { emoji: "🌿", label: "Polyvagal" },
      };
    } else if (topState?.[0] === "Flight") {
      behaviorPattern = {
        quote: `More boundary pushing = seeking control, not defiance.`,
        body: `Boundary-testing spikes when a child's world feels unpredictable. They're not pushing your buttons — they're looking for the edges to feel safe.`,
        chip: { emoji: "🌿", label: "Attachment" },
      };
    } else if (topState?.[0] === "Fight" && realCheckins.length >= 3) {
      behaviorPattern = {
        quote: `Meltdowns cluster when the tank is empty.`,
        body: `High-activation states in parents and children are contagious — not because of bad parenting, but because nervous systems mirror each other. Your regulation is your child's regulation.`,
        chip: { emoji: "🌿", label: "Co-regulation" },
      };
    }
  }

  // Your pattern
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

  // End of day
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

  return {
    days, weekNarrative, meaningMaker, behaviorPattern, yourPattern,
    endOfDay, topState, realCheckins, avgSleepHrs, morningCheckins, eveningCheckins,
    roughNights, shortNapCount, sessionsWithDuration,
  };
}

// ─── INSIGHT CARD ────────────────────────────────────────────────────────────
function InsightCard({ eyebrow, quote, body, chip, accentColor }) {
  const T = useT();
  return (
    <div style={{
      borderRadius: 16, padding: "18px 18px 16px",
      background: T.card2, border: `1px solid ${T.border}`,
      borderLeft: `4px solid ${accentColor}`,
      marginBottom: 12,
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
          <span>{chip.emoji}</span>
          <span>{chip.label}</span>
        </div>
      )}
    </div>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export function HeldInsights({ setTab, onOpenDrawer, onScripts }) {
  const T = useT();
  const { currentUser, activeFamily, activeChild } = useApp();

  const { checkins, sleepSessions, loading } = useInsightsData(
    currentUser?.id, activeFamily?.id, activeChild?.id
  );

  const patterns = useMemo(() => analyzePatterns(checkins, sleepSessions), [checkins, sleepSessions]);

  const {
    days, weekNarrative, meaningMaker, behaviorPattern, yourPattern,
    endOfDay, realCheckins, avgSleepHrs, morningCheckins, eveningCheckins,
    roughNights, shortNapCount, sessionsWithDuration,
  } = patterns;

  const hasData = realCheckins.length >= 1 || sleepSessions.length >= 1;
  const maxScore = Math.max(...days.map(d => d.score), 1);

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

      <div style={{ padding: "0 20px" }}>

        {/* ── THIS WEEK ── */}
        <div style={{ borderRadius: 18, padding: "18px 20px 16px", background: `linear-gradient(160deg, ${T.bark}, ${T.bark})`, marginBottom: 16 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: font, marginBottom: 12, fontWeight: 700 }}>
            This week
          </div>
          {weekNarrative && (
            <div style={{ fontFamily: serif, fontSize: 17, fontStyle: "italic", color: "rgba(255,255,255,0.88)", lineHeight: 1.55, marginBottom: 16 }}>
              "{weekNarrative}"
            </div>
          )}
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: font, marginBottom: 6, letterSpacing: ".08em" }}>
            The taller the bar, the more regulated you were
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 48, marginBottom: 10 }}>
            {days.map((day, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", borderRadius: "3px 3px 0 0", height: day.score > 0 ? `${(day.score / maxScore) * 40}px` : "3px", background: day.hasData ? `rgba(123,170,138,${0.35 + (day.score / maxScore) * 0.65})` : "rgba(255,255,255,0.08)", minHeight: 3, transition: "height 0.4s" }} />
                <div style={{ fontFamily: font, fontSize: 9.5, color: "rgba(255,255,255,0.3)" }}>{day.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
            {[
              { label: "Check-ins", value: realCheckins.length || "—" },
              { label: "Avg sleep", value: avgSleepHrs ? `${avgSleepHrs}h` : (sessionsWithDuration?.length ? `${Math.round(sessionsWithDuration.reduce((s,l)=>s+(l.total_sleep_ms||(new Date(l.end_ts)-new Date(l.ts))),0)/sessionsWithDuration.length/3600000*10)/10}h` : "—") },
              { label: "Mornings",  value: morningCheckins.length > 0 ? morningCheckins.length : (realCheckins.filter(c => new Date(c.checked_in_at).getHours() < 12).length || "—") },
              { label: "Evenings",  value: eveningCheckins.length > 0 ? eveningCheckins.length : (realCheckins.filter(c => new Date(c.checked_in_at).getHours() >= 17).length || "—") },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontFamily: serif, fontSize: 18, color: "rgba(255,255,255,0.85)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: font, fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 3, lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── EMPTY STATE ── */}
        {!hasData && !loading && (
          <div style={{ borderRadius: 16, padding: "24px 20px", marginBottom: 12, background: T.card2, border: `1px solid ${T.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🌱</div>
            <div style={{ fontFamily: serif, fontSize: 16, color: T.headingText, marginBottom: 6 }}>Patterns need a little time</div>
            <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.65, marginBottom: 16 }}>
              Log a few check-ins or sleep sessions and your personalized insights will appear here.
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
    </div>
  );
}
