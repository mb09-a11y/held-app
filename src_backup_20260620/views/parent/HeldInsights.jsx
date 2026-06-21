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
  const week = 7 * 86400000;

  // ── This week vs last week ────────────────────────────────────────────────
  const thisWeekCheckins = checkins.filter(c =>
    now - new Date(c.checked_in_at) < week &&
    c.source !== "evening_close" && !c.state?.startsWith("ec_") && c.state != null
  );
  const lastWeekCheckins = checkins.filter(c => {
    const age = now - new Date(c.checked_in_at);
    return age >= week && age < 2 * week &&
      c.source !== "evening_close" && !c.state?.startsWith("ec_") && c.state != null;
  });

  const realCheckins = thisWeekCheckins;
  const recent = checkins.filter(c => now - new Date(c.checked_in_at) < 30 * 86400000);

  const countStates = (arr) => {
    const freq = {};
    arr.forEach(c => { if (c.state) freq[c.state] = (freq[c.state] || 0) + 1; });
    return freq;
  };

  const thisFreq  = countStates(thisWeekCheckins);
  const topState  = Object.entries(thisFreq).sort((a, b) => b[1] - a[1])[0];

  const activationStates = ["Fight","Flight","Freeze","Shutdown","Stretched"];
  const thisActivation = thisWeekCheckins.filter(c => activationStates.includes(c.state)).length;
  const lastActivation = lastWeekCheckins.filter(c => activationStates.includes(c.state)).length;
  const activationCount = thisActivation;
  const steadyCount = thisWeekCheckins.filter(c => c.state === "Regulated").length;

  // Trend: "improving" | "worsening" | "holding" | "new"
  const getTrend = () => {
    if (lastWeekCheckins.length < 2) return "new";
    if (thisActivation < lastActivation - 1) return "improving";
    if (thisActivation > lastActivation + 1) return "worsening";
    return "holding";
  };
  const trend = getTrend();

  const trendNote = () => {
    if (trend === "new") return null;
    const diff = Math.abs(thisActivation - lastActivation);
    if (trend === "improving") return `That's ${diff} fewer activation${diff === 1 ? "" : "s"} than last week — your system is finding some ground.`;
    if (trend === "worsening") return `That's ${diff} more than last week. Something is accumulating. Notice it without judgment.`;
    return `About the same as last week. Consistency means you can work with it.`;
  };

  // Deterministic rotation: changes each calendar week
  const weekOfYear = Math.floor(now / (7 * 86400000));
  const pick = (arr) => arr[weekOfYear % arr.length];

  // ── Sleep data ────────────────────────────────────────────────────────────
  const getSleepMs = s => {
    if (s.total_sleep_ms) return s.total_sleep_ms;
    if (s.ts && s.end_ts) return Math.max(0, new Date(s.end_ts) - new Date(s.ts));
    return 0;
  };
  const since7 = new Date(now - week);
  const since14 = new Date(now - 2 * week);
  const sessionsWithDuration = sleepSessions.filter(s => getSleepMs(s) > 0);
  const avgSleepMs = sessionsWithDuration.length
    ? sessionsWithDuration.reduce((s, l) => s + getSleepMs(l), 0) / sessionsWithDuration.length : 0;
  const avgSleepHrs = avgSleepMs > 0 ? parseFloat((avgSleepMs / 3600000).toFixed(1)) : null;

  const roughNights = sleepSessions.filter(s => {
    const hrs = getSleepMs(s) / 3600000;
    if (hrs <= 0 || new Date(s.ts) < since7) return false;
    return s.session_type === "night" && hrs < 8;
  }).length;
  const lastWeekRoughNights = sleepSessions.filter(s => {
    const hrs = getSleepMs(s) / 3600000;
    const ts = new Date(s.ts);
    if (hrs <= 0 || ts < since14 || ts >= since7) return false;
    return s.session_type === "night" && hrs < 8;
  }).length;
  const shortNapCount = sleepSessions.filter(s => {
    const hrs = getSleepMs(s) / 3600000;
    if (new Date(s.ts) < since7) return false;
    return hrs > 0 && hrs < 1.5 && s.session_type !== "night";
  }).length;

  // ── Peak activation hour ──────────────────────────────────────────────────
  const hourBuckets = {};
  checkins.filter(c => c.state && c.state !== "Regulated" && !c.source?.includes?.("evening")).forEach(c => {
    const h = new Date(c.checked_in_at).getHours();
    hourBuckets[h] = (hourBuckets[h] || 0) + 1;
  });
  const peakHour = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];
  let peakTimeStr = null, alertTimeStr = null;
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

  // ── 7-day dot calendar ────────────────────────────────────────────────────
  const morningCheckins = recent.filter(c => c.source === "morning_moment");
  const eveningCheckins = recent.filter(c => c.source === "evening_close");
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    const label = d.toLocaleDateString("en", { weekday: "short" }).slice(0, 1);
    const dc = realCheckins.filter(c => new Date(c.checked_in_at).toDateString() === d.toDateString());
    const score = dc.length > 0
      ? dc.reduce((s, c) => s + (c.state === "Regulated" ? 5 : c.state === "Stretched" ? 3 : 1.5), 0) / dc.length : 0;
    return { label, score, count: dc.length, hasData: dc.length > 0 };
  });

  let consecutiveActivated = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = new Date(now - (6 - i) * 86400000);
    const dc = realCheckins.filter(c =>
      new Date(c.checked_in_at).toDateString() === d.toDateString() &&
      activationStates.includes(c.state)
    );
    if (dc.length > 0) consecutiveActivated++;
    else break;
  }

  // ── Week narrative ────────────────────────────────────────────────────────
  let weekNarrative = null;
  if (realCheckins.length > 0) {
    if (consecutiveActivated >= 3) {
      weekNarrative = `You've been in '${topState?.[0] || "go"}' mode for ${consecutiveActivated} days. Your window of tolerance is narrowing — that's biology, not failure.`;
    } else if (steadyCount > activationCount) {
      weekNarrative = trend === "improving"
        ? `More steady than stretched — and improving on last week. Your system is responding.`
        : `More steady than stretched this week. Your nervous system is finding its rhythm.`;
    } else if (activationCount >= 4) {
      weekNarrative = trend === "worsening"
        ? `A hard week — harder than last week. Something is accumulating. That's worth paying attention to.`
        : `A stretched week. Every check-in is proof you're paying attention — that's the work.`;
    } else {
      weekNarrative = `${realCheckins.length} check-in${realCheckins.length === 1 ? "" : "s"} this week. Your patterns are starting to take shape.`;
    }
  }

  // ── Meaning Maker ─────────────────────────────────────────────────────────
  let meaningMaker = null;
  const note = trendNote();

  const sleepAndActivation = roughNights >= 2 && activationCount >= 3;
  const sleepDebt = roughNights >= 2;

  if (sleepAndActivation || (sleepDebt && realCheckins.length >= 2)) {
    const napNote = shortNapCount >= 2 ? ` + ${shortNapCount} short nap${shortNapCount > 1 ? "s" : ""}` : "";
    const sleepTrend = roughNights < lastWeekRoughNights
      ? ` Sleep was harder last week (${lastWeekRoughNights} rough nights), so this may be a turning point.`
      : roughNights > lastWeekRoughNights
      ? ` Last week had ${lastWeekRoughNights} rough nights — this week is harder.`
      : null;
    meaningMaker = {
      quote: `${roughNights} rough night${roughNights === 1 ? "" : "s"}${napNote} → nervous system is maxed.`,
      body: pick([
        `When sleep debt accumulates, regulation capacity shrinks — in your child and in you. The fussiness, the clinginess, the resistance — all of it makes sense right now.${sleepTrend || ""}`,
        `Sleep loss doesn't just make you tired — it actively reduces your prefrontal cortex's ability to regulate. You're not doing anything wrong. Your biology is just maxed.${sleepTrend || ""}`,
        `The connection between rough nights and hard days isn't coincidence — it's physiology. Your nervous system is doing the best it can with a depleted tank.${sleepTrend || ""}`,
      ]),
      chip: { emoji: "🧠", label: "Nervous System" },
      trend: note,
    };
  } else if (topState?.[0] === "Stretched" && topState[1] >= 3) {
    meaningMaker = {
      quote: pick([
        `Stretched ${topState[1]}x this week — running on reserve.`,
        `Your system has been in high gear. Reserve is low.`,
        `Stretched repeatedly — the body is asking for something different.`,
      ]),
      body: pick([
        `Stretched isn't crisis — but it's close to the edge. Even 10 minutes of genuine rest changes what's available tonight.`,
        `Running stretched means your window of tolerance is narrow. Small things feel big. That's not you being dramatic — that's biology.`,
        `When you're consistently stretched, your nervous system starts anticipating threat. A moment of genuine safety — not productivity — is what resets it.`,
      ]),
      chip: { emoji: "🧠", label: "Nervous System" },
      trend: note,
    };
  } else if (topState?.[0] === "Fight") {
    meaningMaker = {
      quote: pick([
        `High activation + caregiving = your nervous system doing double duty.`,
        `Fight state this week: your system is mobilized. That costs something.`,
        `Activation while caregiving is one of the hardest combinations on the nervous system.`,
      ]),
      body: pick([
        `Fight state while parenting is like driving with one foot on the brake. The patterns you're tracking help you catch it sooner.`,
        `High activation + caregiving means your system is managing two full-time jobs simultaneously. That's exhausting in ways sleep alone won't fix.`,
        `Fight state isn't anger — it's your nervous system mobilizing resources. The challenge is that children mirror it. Your regulation is their regulation.`,
      ]),
      chip: { emoji: "🧠", label: "Nervous System" },
      trend: note,
    };
  } else if (topState?.[0] === "Freeze" && topState[1] >= 2) {
    meaningMaker = {
      quote: pick([
        `Freeze state ${topState[1]}x this week — your system hit its limit.`,
        `Freeze is protection, not weakness. Your system needed to conserve.`,
        `When the system can't fight or flee, it freezes. That's biology, not failure.`,
      ]),
      body: pick([
        `Freeze isn't laziness or checked-out parenting. It's your nervous system's last resort protection. Recovery needs safety, rest, and tiny moments of connection — not more effort.`,
        `When the system freezes, it's not giving up — it's conserving. The path back isn't pushing harder. It's small, safe moments that signal: the threat has passed.`,
        `Freeze happens when fight and flight feel impossible. It's not a character flaw. It's your nervous system doing exactly what it's designed to do under pressure.`,
      ]),
      chip: { emoji: "🧠", label: "Nervous System" },
      trend: note,
    };
  } else if (topState?.[0] === "Shutdown" && topState[1] >= 2) {
    meaningMaker = {
      quote: pick([
        `Shutdown is the body saying: I have nothing left right now.`,
        `Dorsal shutdown ${topState[1]}x this week. Your system needed to go offline.`,
        `Shutdown this week: your body did what it had to do. Now it needs recovery.`,
      ]),
      body: pick([
        `When shutdown happens repeatedly, it's a signal the load has been too high for too long. The fact that you're tracking it means you're already doing the most important thing.`,
        `Shutdown is the deepest dorsal vagal response — the body going offline to protect itself. Coming back from it requires safety, not effort.`,
        `Repeated shutdown is your nervous system's way of saying: something needs to change. Not you — the conditions.`,
      ]),
      chip: { emoji: "🧠", label: "Nervous System" },
      trend: note,
    };
  } else if (realCheckins.length >= 3 && steadyCount >= activationCount) {
    meaningMaker = {
      quote: pick([
        `More steady than activated this week — that's real regulation.`,
        `Your system is finding capacity. Steady shows up in the small moments.`,
        `A regulated week. Your nervous system had room to breathe.`,
      ]),
      body: trend === "improving"
        ? pick([
            `Steady doesn't mean easy. It means your nervous system has some capacity available. And this is an improvement on last week — that's momentum.`,
            `More regulated than activated — and better than last week. That's not luck. That's the result of noticing and adjusting.`,
          ])
        : pick([
            `Steady doesn't mean easy. It means your nervous system has some capacity available. The check-ins you're doing are part of why.`,
            `More regulated than activated — that's not luck. It's the result of noticing, adjusting, and showing up. Keep going.`,
            `Steady state means your window of tolerance is open. You have more access to your prefrontal cortex — which means parenting from intention, not reaction.`,
          ]),
      chip: { emoji: "🌿", label: "Regulation" },
      trend: note,
    };
  } else if (avgSleepHrs && avgSleepHrs < 7 && realCheckins.length > 0) {
    meaningMaker = {
      quote: pick([
        `Short sleep windows + check-in patterns tell the same story.`,
        `Under 7 hours of average sleep changes everything downstream.`,
        `Sleep and regulation aren't separate systems — they're the same system.`,
      ]),
      body: pick([
        `Less than 7 hours of average sleep significantly reduces emotional regulation capacity. This isn't personal. It's physiological.`,
        `Sleep debt compounds. Each short night narrows your window of tolerance a little more. The data you're logging is helping us see the full picture.`,
        `Your check-ins and your sleep windows are telling the same story. When sleep improves, regulation follows — not the other way around.`,
      ]),
      chip: { emoji: "💤", label: "Sleep + Regulation" },
      trend: note,
    };
  } else if (realCheckins.length >= 1) {
    meaningMaker = {
      quote: pick([
        `${realCheckins.length} check-in${realCheckins.length === 1 ? "" : "s"} logged. Your patterns are starting to form.`,
        `Every check-in is a data point. The picture is building.`,
        `You showed up and noticed. That's the whole practice.`,
      ]),
      body: pick([
        `The more you check in, the clearer the picture gets — not just for you, but for how we can support you. Keep going.`,
        `Patterns take time to emerge. You're building something real here. Each check-in adds resolution to the picture.`,
        `Noticing is the first step in regulation. You're already doing it.`,
      ]),
      chip: { emoji: "🌱", label: "Pattern Building" },
      trend: note,
    };
  }

  // ── Behavior Pattern ──────────────────────────────────────────────────────
  let behaviorPattern = null;
  if (activationCount >= 2) {
    if ((topState?.[0] === "Shutdown" || topState?.[0] === "Freeze") && topState[1] >= 2) {
      behaviorPattern = {
        quote: pick([
          `Withdrawal isn't weakness — it's a protective response.`,
          `Going offline is the nervous system's way of saying: I need safety, not more.`,
          `Freeze and shutdown are protection strategies. They work — until they don't.`,
        ]),
        body: pick([
          `When the system shuts down, it's protecting itself from overload. Connection and gentle movement are the way back — not willpower.`,
          `Dorsal vagal states feel like collapse, but they're actually regulation — the deepest kind. What brings you back is safety, rhythm, and small moments of connection.`,
          `When shutdown is frequent, it's worth asking: what is the system protecting against? The answer is usually load — not weakness.`,
        ]),
        chip: { emoji: "🌿", label: "Polyvagal" },
        trend: note,
      };
    } else if (topState?.[0] === "Flight" && topState[1] >= 2) {
      behaviorPattern = {
        quote: pick([
          `More boundary pushing = seeking control, not defiance.`,
          `Flight state in parenting often looks like avoidance — yours or theirs.`,
          `The urge to escape is survival. What is your system trying to escape from?`,
        ]),
        body: pick([
          `Boundary-testing spikes when a child's world feels unpredictable. They're not pushing your buttons — they're looking for the edges to feel safe.`,
          `Flight activation is mobilized energy with nowhere to go. Discharge it safely — movement, breath, shaking it out — before re-engaging.`,
          `When you're in flight state, connection feels threatening. But connection is exactly what brings the system back. Start tiny.`,
        ]),
        chip: { emoji: "🌿", label: "Attachment" },
        trend: note,
      };
    } else if (topState?.[0] === "Fight" && topState[1] >= 2) {
      behaviorPattern = {
        quote: pick([
          `Meltdowns cluster when the tank is empty.`,
          `High activation is contagious. Your state sets the temperature in the room.`,
          `Fight state + parenting: two activated systems. Someone has to go first.`,
        ]),
        body: pick([
          `High-activation states in parents and children are contagious — not because of bad parenting, but because nervous systems mirror each other. Your regulation is your child's regulation.`,
          `When you're in fight state, the part of your brain that parents intentionally goes partially offline. That's not a flaw — it's physiology. The repair matters more than the reaction.`,
          `Fight activation means your system sensed threat. Parenting from that state is hard. Naming it — even just to yourself — starts to bring the cortex back online.`,
        ]),
        chip: { emoji: "🌿", label: "Co-regulation" },
        trend: note,
      };
    } else if (topState?.[0] === "Stretched" && topState[1] >= 2) {
      behaviorPattern = {
        quote: pick([
          `Running on fumes changes how everything lands.`,
          `Stretched means your tolerance window is narrow. Small things feel large.`,
          `Consistently stretched: managing more than you're recovering from.`,
        ]),
        body: pick([
          `When you're stretched, your window of tolerance narrows — what would normally roll off you sticks. That's not a character flaw. That's biology asking for a reset.`,
          `Stretched state isn't as loud as fight or flight, but it's just as costly. Your system is working hard to stay in the window. It can't do that indefinitely.`,
          `Being stretched consistently is a signal, not a verdict. It means the input is exceeding the recovery. Something in the equation needs to shift.`,
        ]),
        chip: { emoji: "🌿", label: "Nervous System" },
        trend: note,
      };
    }
  }

  // ── Your Pattern (peak time) ───────────────────────────────────────────────
  let yourPattern = null;
  if (peakTimeStr && alertTimeStr) {
    const peakHr = parseInt(peakHour[0]);
    const timeOfDay = peakHr < 12 ? "morning" : peakHr < 17 ? "afternoon" : "evening";
    yourPattern = {
      quote: `You tend to feel 'on edge' around ${peakTimeStr}.`,
      body: `This is predictable — which means it's workable. A 2-minute reset at ${alertTimeStr} could change your whole ${timeOfDay}.`,
      alertLabel: `${alertTimeStr} Reminder`,
      alertHour: peakHr > 0 ? peakHr - 1 : 23,
      peakTimeLabel: peakTimeStr,
    };
  }

  // ── Streak calculation ────────────────────────────────────────────────────
  // Count consecutive days with at least one check-in, going back from today.
  let streak = 0;
  if (checkins.length > 0) {
    const sortedDates = [...new Set(
      checkins
        .filter(c => c.checked_in_at)
        .map(c => new Date(c.checked_in_at).toLocaleDateString("en-CA")) // YYYY-MM-DD
    )].sort().reverse();

    const today = new Date().toLocaleDateString("en-CA");
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

    // Only count streak if there's a check-in today or yesterday
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      let expected = sortedDates[0];
      for (const date of sortedDates) {
        if (date === expected) {
          streak++;
          const d = new Date(expected);
          d.setDate(d.getDate() - 1);
          expected = d.toLocaleDateString("en-CA");
        } else {
          break;
        }
      }
    }
  }

  return {
    days, weekNarrative, meaningMaker, behaviorPattern, yourPattern,
    topState, realCheckins, avgSleepHrs, morningCheckins, eveningCheckins,
    roughNights, shortNapCount, sessionsWithDuration, trend, streak,
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
  const { currentUser, activeFamily, canAccessFoundationTab } = useApp();
  const {
    meaningMaker, behaviorPattern, yourPattern,
    realCheckins, trend,
  } = patterns;

  const total = profile?.total_ns_logs ?? 0;
  const ventral = ventralCount ?? 0;
  const leaves = profile?.leaves ?? 0;
  const stabilityRate = total > 0 ? Math.round((ventral / total) * 100) : 0;
  const capacityLabel = stabilityRate >= 60 ? "Deeply anchored" : stabilityRate >= 35 ? "Structure stabilizing" : "Foundation building";

  // ── Tension-reset reminder state ─────────────────────────────────────────
  const [resetReminderActive, setResetReminderActive] = useState(false);
  const [resetReminderChecked, setResetReminderChecked] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    supabase
      .from("insight_reminders")
      .select("status, end_date")
      .eq("user_id", currentUser.id)
      .eq("reminder_key", "tension_reset")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const todayISO = new Date().toISOString().slice(0, 10);
        setResetReminderActive(!!data && data.status === "active" && data.end_date >= todayISO);
        setResetReminderChecked(true);
      });
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  async function handleSetResetReminder() {
    if (!currentUser?.id || !activeFamily?.id || !yourPattern || resetReminderActive) return;
    setResetReminderActive(true); // optimistic

    const toISO = (d) => d.toISOString().slice(0, 10);
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 11); // 12 days inclusive

    const { error } = await supabase.from("insight_reminders").upsert({
      user_id: currentUser.id,
      family_id: activeFamily.id,
      reminder_key: "tension_reset",
      target_time: `${String(yourPattern.alertHour).padStart(2, "0")}:00:00`,
      peak_time_label: yourPattern.peakTimeLabel,
      start_date: toISO(start),
      end_date: toISO(end),
      last_sent_date: null,
      status: "active",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,reminder_key" });

    if (error) {
      console.error("Failed to set tension-reset reminder:", error);
      setResetReminderActive(false);
    }
  }

  let nsQuote = null;
  if (total === 0) {
    nsQuote = `Your first check-in starts the map. Everything you log from here becomes data your system can learn from.`;
  } else if (stabilityRate >= 60) {
    nsQuote = `${stabilityRate}% regulated. You've been in a steady state more than you haven't — that's not luck, that's practice. ${total} check-ins logged over ${weekCount} weeks.`;
  } else if (stabilityRate >= 35) {
    nsQuote = `${ventral} regulated moments out of ${total} check-ins — ${stabilityRate}% of the time, your system found steady ground. ${weekCount} weeks of showing up.`;
  } else {
    nsQuote = `${stabilityRate}% of your ${total} check-ins have been regulated. Your nervous system has been under load — the fact that you're tracking it is the first step toward changing it.`;
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
          { label: "LEAVES",   value: leaves },
          { label: "VENTRAL",  value: `${stabilityRate}%` },
          { label: "WEEK",     value: weekCount },
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
          Ventral ratio
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontFamily: font, fontSize: 13, color: T.headingText }}>{capacityLabel}</div>
          <div style={{ fontFamily: serif, fontSize: 15, color: T.teal, fontWeight: 700 }}>{stabilityRate}%</div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: T.border, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", width: `${stabilityRate}%`, borderRadius: 3, background: T.teal, transition: "width 0.6s" }} />
        </div>
        <div style={{ fontFamily: font, fontSize: 12, color: T.muted, fontStyle: "italic", lineHeight: 1.6 }}>
          {stabilityRate}% of your check-ins have been in a regulated state. Every ventral moment builds your foundation.
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
      {meaningMaker && canAccessFoundationTab && (
        <>
          <InsightCard eyebrow="Meaning Maker" quote={meaningMaker.quote} body={meaningMaker.body} chip={meaningMaker.chip} accentColor={T.warm} />
          {meaningMaker.trend && (
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, fontStyle: "italic", marginTop: -6, marginBottom: 12, paddingLeft: 4 }}>
              {meaningMaker.trend}
            </div>
          )}
        </>
      )}

      {/* ── BEHAVIOR PATTERN ── */}
      {behaviorPattern && canAccessFoundationTab && (
        <>
          <InsightCard eyebrow="Behavior Pattern" quote={behaviorPattern.quote} body={behaviorPattern.body} chip={behaviorPattern.chip} accentColor={T.teal} />
          {behaviorPattern.trend && (
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, fontStyle: "italic", marginTop: -6, marginBottom: 12, paddingLeft: 4 }}>
              {behaviorPattern.trend}
            </div>
          )}
        </>
      )}

      {/* ── YOUR PATTERN ── */}
      {yourPattern && canAccessFoundationTab && (
        <div style={{ borderRadius: 16, padding: "18px 18px 16px", background: T.card2, border: `1px solid ${T.border}`, borderLeft: `4px solid ${T.teal}`, marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.teal, fontFamily: font, fontWeight: 700, marginBottom: 10 }}>Your Pattern</div>
          <div style={{ fontFamily: serif, fontSize: 17, fontStyle: "italic", color: T.headingText, lineHeight: 1.55, marginBottom: 10 }}>"{yourPattern.quote}"</div>
          <div style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.7, marginBottom: 14 }}>{yourPattern.body}</div>
          <div
            onClick={resetReminderActive ? undefined : handleSetResetReminder}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: T.tealLight, border: `1px solid ${T.teal}40`, fontFamily: font, fontSize: 12, fontWeight: 600, color: T.teal, cursor: resetReminderActive ? "default" : "pointer", opacity: resetReminderChecked ? 1 : 0.6 }}
          >
            {resetReminderActive ? "✓ Reminder set · 12 days" : `⏰ ${yourPattern.alertLabel}`}
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
    </div>
  );
}

// ─── FOUNDATION TAB ───────────────────────────────────────────────────────────
function FoundationTab({ profile, weekCount, patterns, ventralCount }) {
  const T = useT();
  const { streak: rawFoundationStreak } = patterns;
  const streak = rawFoundationStreak ?? 0;

  const total = profile?.total_ns_logs ?? 0;
  const ventral = ventralCount ?? 0;
  const leaves = profile?.leaves ?? 0;
  const stabilityRate = total > 0 ? Math.round((ventral / total) * 100) : 0;
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
          <div style={{ fontFamily: serif, fontSize: 38, color: T.headingText, lineHeight: 1 }}>{stabilityRate}%</div>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, textAlign: "right", paddingTop: 6 }}>{capacityLabel}</div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: T.border, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", width: `${stabilityRate}%`, borderRadius: 3, background: T.teal, transition: "width 0.6s" }} />
        </div>
        <div style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.7 }}>
          Every regulated check-in adds to your rolling system stability average. {stabilityRate}% of your check-ins have been in a regulated state. Every ventral moment builds your foundation.
        </div>
      </div>

      {/* ── BY THE NUMBERS ── */}
      <SectionLabel text="By the numbers" />
      <div style={{ borderRadius: 16, padding: "18px 18px 4px", background: T.card2, border: `1px solid ${T.border}`, marginBottom: 16 }}>
        {[
          { label: "Regulated check-ins", sub: "Ventral (Steady/Regulated) states", value: `${ventral} of ${total}` },
          { label: "Leaves banked",        sub: "Deep forest green — hard earned", value: String(leaves) },
          { label: "Repair moments",       sub: "SOS flows completed with repair",  value: String(profile?.repair_count ?? 0) },
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
  const { canAccessFoundationTab, currentUser } = useApp();
  const { streak: rawStreak } = patterns;
  const streak = rawStreak ?? 0; // guard against undefined causing NaN
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
      {!canAccessFoundationTab && (
        <UpgradeToFoundationCard T={T} currentUser={currentUser} />
      )}
    </div>
  );
}

// ─── UPGRADE TO FOUNDATION CARD (bottom of Your Story for free users) ─────────
function UpgradeToFoundationCard({ T, currentUser }) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
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
          tier: "plus",
        }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } catch {}
    finally { setLoading(false); }
  }

  return (
    <div style={{
      margin: "24px 0 8px",
      borderRadius: 16,
      background: `linear-gradient(135deg, ${T.teal}12, ${T.warm}10)`,
      border: `1px solid ${T.teal}30`,
      padding: "20px 20px 24px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>🌳</div>
      <div style={{ fontFamily: serif, fontSize: 18, color: T.headingText, marginBottom: 8 }}>
        Your pattern is becoming clearer
      </div>
      <p style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.7, marginBottom: 16, maxWidth: 280, margin: "0 auto 16px" }}>
        Foundation gives you the full picture — your ventral capacity score, growth rings, and what it all means for your nervous system.
      </p>
      <button onClick={handleUpgrade} disabled={loading} style={{
        background: loading ? T.faint : T.teal,
        border: "none", borderRadius: 12,
        padding: "12px 24px",
        fontFamily: font, fontSize: 14, fontWeight: 700,
        color: loading ? T.muted : "#fff",
        cursor: loading ? "default" : "pointer",
        width: "100%", maxWidth: 300,
      }}>
        {loading ? "Opening Stripe…" : "Unlock Foundation — Plus →"}
      </button>
      <div style={{ fontFamily: font, fontSize: 11.5, color: T.muted, marginTop: 8 }}>
        $15/month · Cancel anytime
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// ─── FOUNDATION PAYWALL ───────────────────────────────────────────────────────
function FoundationPaywall({ T }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useApp();

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
          tier: "plus",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
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
    <div style={{ paddingTop: 24, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🌳</div>
      <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 10 }}>
        Your foundation is growing
      </div>
      <p style={{ fontFamily: font, fontSize: 14, color: T.muted, lineHeight: 1.7, maxWidth: 300, margin: "0 auto 24px" }}>
        Your ventral capacity score, growth rings, and foundation status report — the interpretation layer behind everything you're tracking.
      </p>
      {[
        { icon: "📊", label: "Ventral capacity score" },
        { icon: "🌀", label: "Growth rings — week by week" },
        { icon: "⚓", label: "Foundation status report" },
        { icon: "🔢", label: "By the numbers breakdown" },
      ].map(f => (
        <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, textAlign: "left", maxWidth: 280, margin: "0 auto 10px" }}>
          <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{f.icon}</span>
          <span style={{ fontFamily: font, fontSize: 13.5, color: T.text }}>{f.label}</span>
        </div>
      ))}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontFamily: serif, fontSize: 20, color: T.teal, marginBottom: 4 }}>$15/month</div>
        <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 16 }}>Cancel anytime</div>
        {error && <div style={{ fontFamily: font, fontSize: 12.5, color: T.rose, marginBottom: 12 }}>{error}</div>}
        <button onClick={handleUpgrade} disabled={loading} style={{
          display: "block", width: "100%", maxWidth: 320, margin: "0 auto",
          padding: "14px", borderRadius: 12, border: "none",
          background: loading ? T.faint : T.teal, color: loading ? T.muted : "#fff",
          fontFamily: font, fontSize: 15, fontWeight: 700,
          cursor: loading ? "default" : "pointer",
        }}>
          {loading ? "Opening Stripe…" : "Unlock Foundation — Plus →"}
        </button>
      </div>
    </div>
  );
}

export function HeldInsights({ setTab, onOpenDrawer, onScripts }) {
  const T = useT();
  const { currentUser, activeFamily, activeChild, checkinRefreshKey, canAccessFoundationTab } = useApp();
  const [insightTab, setInsightTab] = useState("story");

  const { checkins, sleepSessions, ventralCount, loading } = useInsightsData(
    currentUser?.id, activeFamily?.id, activeChild?.id, checkinRefreshKey
  );

  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from("profiles")
      .select("created_at, total_ns_logs, ventral_points, latest_ns_state, leaves, streak_milestones, repair_count")
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
        {insightTab === "foundation" && canAccessFoundationTab && (
          <FoundationTab
            profile={profile}
            weekCount={weekCount}
            patterns={patterns}
            ventralCount={ventralCount}
          />
        )}
        {insightTab === "foundation" && !canAccessFoundationTab && (
          <FoundationPaywall T={T} />
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
