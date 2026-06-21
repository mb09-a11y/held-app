// views/consultant/tabs/InsightsTab.jsx
import { useState, useEffect } from "react";
import { useT, font, serif } from "../../../core/shared.jsx";
import { useSleepStats } from "../data/consultantStore.js";
import { useNextSleep } from "../../../modules/sleep/sleepHelpers.js";
import { supabase } from "../../../lib/supabase.js";
import InsightCard from "../shared/InsightCard.jsx";
import ProactiveCard from "../shared/ProactiveCard.jsx";

function fmtRelTime(iso) {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export default function InsightsTab({ family, activeChild, onNavigate }) {
  const T = useT();
  const familyTz = family?.timezone || null;
  const stats    = useSleepStats(activeChild?.id, family?.id, 7, familyTz);

  // Load plan startDate directly from Supabase — don't depend on PlanTab having seeded usePlans
  const [planStartDate, setPlanStartDate] = useState(null);
  const [planMethodLabel, setPlanMethodLabel] = useState(null);
  useEffect(() => {
    if (!family?.id) return;
    supabase.from("families").select("sleep_plan_profile").eq("id", family.id).maybeSingle()
      .then(({ data }) => {
        if (data?.sleep_plan_profile?.startDate) setPlanStartDate(data.sleep_plan_profile.startDate);
        if (data?.sleep_plan_profile?.methodLabel) setPlanMethodLabel(data.sleep_plan_profile.methodLabel);
      });
  }, [family?.id]);

  // Next put-down — same hook as parent view
  const { nextSleepStr, minsUntil, isSleeping } = useNextSleep(
    family?.id, activeChild?.id, activeChild?.dob, familyTz
  );

  if (!activeChild) return null;

  const hasData   = (stats.nights?.length || 0) + (stats.naps?.length || 0) > 0;
  const childName = activeChild?.name ?? "your child";
  // No fallback to "regulated" — missing/unrecognized state reads as no_data.
  const nsState   = family?.nsState || "no_data";
  const nsNote    = family?.nsNote    || "";
  const nsTrendDays = (family?.nsTrend || []).filter(v => v >= 3).length;

  // ── Real plan day ──────────────────────────────────────────────────────────
  const planDay = (() => {
    if (planStartDate) {
      return Math.max(1, Math.floor((Date.now() - new Date(planStartDate)) / 86400000) + 1);
    }
    return activeChild?.planDay ?? null;
  })();
  const planDayLabel = planDay != null ? `Day ${planDay}` : "Day —";

  // ── Status ─────────────────────────────────────────────────────────────────
  const status   = activeChild?.status || "good";
  const isUrgent = status === "urgent" || nsState === "Shutdown" || nsState === "Fight";
  const isWatch  = !isUrgent && (status === "watch" || nsState === "Freeze" || nsState === "Flight" || nsState === "Stretched");

  // ── Sleep signals ──────────────────────────────────────────────────────────
  const avgNightWakes = stats.avgNightWakes ?? 0;
  const avgNightStr   = stats.avgNightStr   || "—";
  const flaggedNaps   = stats.flaggedNaps   || 0;

  // Waking trend: recent 3 nights vs prior 3
  const recentNights = stats.nights?.slice(0, 3) || [];
  const olderNights  = stats.nights?.slice(3, 6) || [];
  const recentWakes  = recentNights.length ? recentNights.reduce((a, n) => a + (n.nightWakes || 0), 0) / recentNights.length : null;
  const olderWakes   = olderNights.length  ? olderNights.reduce((a, n)  => a + (n.nightWakes || 0), 0) / olderNights.length  : null;
  const wakingsTrend = recentWakes != null && olderWakes != null
    ? (recentWakes < olderWakes - 0.3 ? "down" : recentWakes > olderWakes + 0.3 ? "up" : "flat")
    : null;

  // ── Pattern detection: consistent waking window ───────────────────────────
  const wakingWindowPattern = (() => {
    const nights = stats.nights || [];
    if (nights.length < 3) return null;
    // Collect the first night waking time (in minutes from midnight) for each of last 3+ nights
    const allSessions = (stats.sessions || []);
    const wakingSessions = allSessions.filter(s => s.type === "night_waking");
    // Group wakings by night date
    const wakingsByNight = {};
    for (const w of wakingSessions) {
      const nightKey = w.date;
      if (!wakingsByNight[nightKey]) wakingsByNight[nightKey] = [];
      wakingsByNight[nightKey].push(w);
    }
    const nightKeys = Object.keys(wakingsByNight).slice(0, 5); // last 5 nights max
    if (nightKeys.length < 3) return null;
    // Get first waking time in minutes-since-midnight for each night
    const firstWakingMins = nightKeys.map(k => {
      const w = wakingsByNight[k][0];
      if (!w?.time) return null;
      const match = w.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      // Normalize: wakings after midnight (0-6am) add 24h so they sort after 7pm
      if (h < 6) h += 24;
      return h * 60 + m;
    }).filter(v => v != null);
    if (firstWakingMins.length < 3) return null;
    // Check if all first wakings are within ±15 min of each other
    const minT = Math.min(...firstWakingMins);
    const maxT = Math.max(...firstWakingMins);
    if (maxT - minT > 30) return null; // >30 min spread = not a consistent pattern
    // Get waking durations for trend (most recent first)
    const durations = nightKeys.slice(0, 3).map(k => {
      const w = wakingsByNight[k][0];
      return w?.durationMin ?? null;
    }).filter(v => v != null);
    const isTrending = durations.length >= 2 && durations[0] < durations[durations.length - 1];
    // Format the consistent time for display
    const midMins = Math.round((minT + maxT) / 2);
    const displayH = midMins >= 24 * 60 ? Math.floor((midMins - 24 * 60) / 60) : Math.floor(midMins / 60);
    const displayM = midMins % 60;
    const ampm = displayH >= 12 ? "PM" : "AM";
    const h12 = displayH % 12 || 12;
    const timeLabel = `${h12}:${String(displayM).padStart(2, "0")} ${ampm}`;
    const durationTrend = durations.length >= 2
      ? durations.map(d => d < 60 ? `${d}m` : `${Math.floor(d/60)}h ${d%60}m`).reverse().join(" → ")
      : null;
    return { timeLabel, durationTrend, isTrending, nightCount: nightKeys.length };
  })();

  // ── Co-Pilot sleep insight ─────────────────────────────────────────────────
  const sleepInsight = (() => {
    if (!hasData) return {
      title: "No data logged yet.",
      body:  `No sleep sessions for ${childName} in the last 7 days. Insights will appear once tracking begins.`,
    };
    if (flaggedNaps > 0 && avgNightWakes >= 2) return {
      title: `Nap length is driving ${childName}'s night pattern.`,
      body:  `Over ${flaggedNaps} day${flaggedNaps > 1 ? "s" : ""}, naps exceeding 2h correlated with ${avgNightWakes}+ night wakings. Arriving undertired at bedtime. This is adjustable — not a method failure.`,
    };
    if (avgNightWakes >= 3) return {
      title: "Frequent night wakings — check for overtiredness.",
      body:  `${childName} is averaging ${avgNightWakes} wakings per night. This often points to daytime sleep debt accumulating. Review nap timing and total daytime sleep.`,
    };
    if (wakingsTrend === "down" && planDay != null && planDay >= 4 && planDay <= 6) return {
      title: `Day ${planDay} — regression window is coming. Stay ready.`,
      body:  `Progress is real — wakings are trending down. But days 4–6 commonly bring one harder night before things consolidate. Prepare the parent now so they don't panic if tonight is rougher.`,
    };
    if (wakingsTrend === "down") return {
      title: "Night wakings trending down. Stay the course.",
      body:  `${childName}'s wakings have dropped over recent nights — the nervous system is consolidating. A brief celebration message builds parent confidence right now.`,
    };
    if (wakingsTrend === "up") return {
      title: "Night wakings increasing — check for a trigger.",
      body:  `Wakings have crept up over recent nights. Common culprits: developmental leap, schedule shift, or a nap that ran long. Review the last 3 days.`,
    };
    if (planDay != null && [5, 7, 10, 14].includes(planDay)) return {
      title: `Day ${planDay} regression window — normal and expected.`,
      body:  `Sleep latency may increase tonight. This is a common plateau, not a method failure. Prepare the parent now so they don't panic when it happens.`,
    };
    if (planDay === 1) return {
      title: `Night 1 — hold the plan and hold the parent.`,
      body:  `The first night is the hardest emotionally for parents, not always the hardest for the child. Your most important job tonight is keeping the parent regulated enough to stay consistent.`,
    };
    if (planDay === 2) return {
      title: `Night 2 — wakings can spike before they drop.`,
      body:  `Night 2 is often harder than night 1 — this is normal. The nervous system is still calibrating. Prepare the parent now so they aren't blindsided if tonight feels like a step back.`,
    };
    if (planDay === 3) return {
      title: `Night 3 — things often start to shift here.`,
      body:  `Most families see meaningful improvement around night 3. Celebrate any progress, even small. Parent confidence built now carries them through the regression window ahead.`,
    };
    return {
      title: "Strong progress. Stay the course.",
      body:  `${childName} is consistently hitting targets. Night wakings trending down. Parent confidence is building — a brief celebration message goes a long way right now.`,
    };
  })();

  // ── Co-Pilot parent state insight ─────────────────────────────────────────
  const parentInsight = (() => {
    if (nsState === "Shutdown" || nsState === "Fight") return {
      title: "Validate first. Data second.",
      body:  `NS trend shows ${nsTrendDays || "several"} days activated${nsNote ? ` — "${nsNote}"` : ""}. Parent needs emotional anchoring before any plan discussion. Lead with warmth.`,
      actions: [
        { label: "Draft support message", onClick: () => onNavigate("responseBuilder") },
        { label: "See NS log",            onClick: () => {} },
      ],
    };
    if (nsState === "Freeze" || nsState === "Flight" || nsState === "Stretched") return {
      title: "Parent NS activated — check in proactively.",
      body:  `${nsTrendDays > 0 ? `${nsTrendDays} days activated` : "Recent check-in shows activation"}${nsNote ? ` — "${nsNote}"` : ""}. Reach out before they message you tonight.`,
      actions: [
        { label: "Draft check-in", onClick: () => onNavigate("responseBuilder") },
        { label: "See NS log",     onClick: () => {} },
      ],
    };
    if (nsState === "no_data") return {
      title: "No check-in yet — nothing to report.",
      body:  "Encourage the parent to log how they're feeling — it helps you calibrate your support.",
      actions: [
        { label: "Draft check-in", onClick: () => onNavigate("responseBuilder") },
      ],
    };
    return {
      title: "Parent is regulated — good window for data sharing.",
      body:  `Last check-in ${fmtRelTime(family.nsCheckinTime)} shows regulation. This is a good moment to share progress data or set expectations for the next phase.`,
      actions: [
        { label: "Draft check-in", onClick: () => onNavigate("responseBuilder") },
      ],
    };
  })();

  // ── Proactive suggestion (day-triggered anticipatory guidance) ────────────
  const proactiveSuggestion = (() => {
    // NS state always takes priority
    if (nsState === "Shutdown" || nsState === "Fight") return {
      icon: "🫂",
      label: "Parent state · Act now",
      text: `Parent is in distress. Reach out before they message you — a short, warm note can regulate their system before tonight's session.`,
      cta: "Draft support message →",
    };
    if (isUrgent) return {
      icon: "⚠️",
      label: "Tonight, watch for",
      text: `${childName}'s stats are flagged. Prepare a regulated response now so you're not drafting under pressure when the message arrives.`,
      cta: "Draft message →",
    };
    // Day-triggered anticipatory guidance
    if (planDay === 1) return {
      icon: "🌱",
      label: "Proactive · Night 1",
      text: `Before tonight, send a warm grounding message. Let the parent know what to expect and remind them you're in their corner. They need to feel held, not managed.`,
      cta: "Draft night 1 message →",
    };
    if (planDay === 2) return {
      icon: "🌊",
      label: "Proactive · Night 2 heads-up",
      text: `Night 2 often feels harder before it gets easier — prep the parent now. A quick message normalizing a potential spike protects them from interpreting a hard night as failure.`,
      cta: "Draft heads-up →",
    };
    if (planDay === 3) return {
      icon: "🌿",
      label: "Proactive · Celebrate progress",
      text: `Night 3 is usually when families start to feel the shift. Send a celebration message — even small wins deserve acknowledgment and it builds the parent's confidence for what's ahead.`,
      cta: "Draft celebration →",
    };
    if (planDay != null && planDay >= 4 && planDay <= 6) return {
      icon: "🔮",
      label: "Proactive · Regression window",
      text: `Days 4–6 commonly bring one harder night before things consolidate. Send a heads-up now so the parent knows this is normal — parents who are prepared don't panic.`,
      cta: "Draft regression prep →",
    };
    if (flaggedNaps > 0) return {
      icon: "⏰",
      label: "Proactive · Nap watch",
      text: `${childName} had a long nap recently. A quick heads-up about bedtime timing tonight could prevent a panic message at 9pm.`,
      cta: "Draft heads-up →",
    };
    if (planDay != null && [7, 10, 14].includes(planDay)) return {
      icon: "🔮",
      label: `Proactive · Day ${planDay} plateau`,
      text: `Day ${planDay} is a common consolidation plateau. Send a proactive note to normalize any bumps — parents who feel prepared stay regulated.`,
      cta: "Draft message →",
    };
    return {
      icon: "🔮",
      label: "Proactive suggestion",
      text: `Check in proactively before tonight — it builds trust and reduces reactive messages.`,
      cta: "Draft message →",
    };
  })();

  // ── Next put-down ──────────────────────────────────────────────────────────
  const putDownDisplay = (() => {
    if (isSleeping) return { label: "Currently sleeping", sub: null };
    if (nextSleepStr && minsUntil != null) {
      if (minsUntil < 0)   return { label: nextSleepStr, sub: "overdue" };
      if (minsUntil < 60)  return { label: nextSleepStr, sub: `in ${minsUntil}m` };
      return { label: nextSleepStr, sub: `in ${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m` };
    }
    return null;
  })();

  // ── No data state ──────────────────────────────────────────────────────────
  if (!hasData) {
    return (
      <div>
        <div style={{ margin: "10px 18px 10px", background: T.bg2, borderRadius: 12, padding: "10px 13px", display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 18 }}>{activeChild?.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: font }}>{childName} · {activeChild?.age} · {planDayLabel}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1, fontFamily: font }}>{planMethodLabel || activeChild?.method?.replace(/_/g, " ") || "No method assigned"}</div>
          </div>
          <div style={{ padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: font, background: "#F0F0EE", color: T.muted }}>Not tracking</div>
        </div>
        <div style={{ margin: "0 18px", background: T.card, borderRadius: 18, padding: "22px 18px", boxShadow: T.shadow, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>😴</div>
          <div style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: T.headingText, marginBottom: 8 }}>{childName} isn't being tracked yet.</div>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.7 }}>No sleep data logged in the last 7 days. Insights will appear once tracking begins.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Child context row */}
      <div style={{ margin: "10px 18px 10px", background: T.bg2, borderRadius: 12, padding: "10px 13px", display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 18 }}>{activeChild?.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: font }}>
            {childName} · {activeChild?.age} · {planDayLabel} of {planMethodLabel || activeChild?.method?.replace(/_/g, " ") || "plan"}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 1, fontFamily: font }}>
            {isUrgent ? "High intensity · Anxious parent NS" : isWatch ? "Monitor closely" : "On track"}
          </div>
        </div>
        <div style={{
          padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: font,
          background: isUrgent ? "#FBF0EC" : isWatch ? "#FBF4E6" : "#EAF0E8",
          color:      isUrgent ? "#C0543A" : isWatch ? "#C08A3A" : "#5C7A5E",
        }}>
          {isUrgent ? "🔴 Urgent" : isWatch ? "🟡 Watch" : "🟢 On track"}
        </div>
      </div>

      {/* Next put-down */}
      {putDownDisplay && (
        <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 14, padding: "11px 14px", boxShadow: T.shadow, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{isSleeping ? "💤" : "⏰"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
              {isSleeping ? "Sleep status" : "Next put-down"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.teal, fontFamily: serif, marginTop: 1 }}>
              {putDownDisplay.label}
              {putDownDisplay.sub && <span style={{ fontSize: 11, color: T.muted, fontWeight: 400, fontFamily: font, marginLeft: 6 }}>· {putDownDisplay.sub}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Co-Pilot sleep insight */}
      <InsightCard
        label={`◎ Co-Pilot insight · ${planDayLabel}`}
        title={sleepInsight.title}
        body={sleepInsight.body}
        actions={[
          { label: isUrgent ? "Adjust plan" : "Draft check-in", onClick: () => onNavigate(isUrgent ? "plan" : "responseBuilder") },
          { label: "View data", onClick: () => onNavigate("sleepData") },
        ]}
      />

      {/* Co-Pilot parent state insight */}
      <InsightCard
        label="◎ Co-Pilot · Parent state"
        title={parentInsight.title}
        body={parentInsight.body}
        actions={parentInsight.actions}
      />

      {/* Suggested next moves — urgent only */}
      {isUrgent && (
        <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8, fontFamily: font }}>Suggested next moves</div>
          {[
            { step: "1️⃣", title: "Validate emotion first",   body: nsNote ? `She said: "${nsNote}" — meet them there before any data conversation.` : "Acknowledge the difficulty before sharing any numbers. Regulation requires felt safety first." },
            { step: "2️⃣", title: "Normalize the process",    body: `${planDayLabel} challenges are expected. Reframe the data as information — not a sign the plan is failing.` },
            { step: "3️⃣", title: "Anchor to one action",     body: flaggedNaps > 0 ? "Cap nap at 90 min today. One concrete step gives the parent something to hold onto tonight." : "Confirm tonight's bedtime window. Consistency in the short term builds the pattern." },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "9px 0", borderBottom: i < 2 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontSize: 16 }}>{m.step}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text, fontFamily: font }}>{m.title}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.5, fontFamily: font }}>{m.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pattern detection card — fires when consistent waking window detected */}
      {wakingWindowPattern && (
        <InsightCard
          label="◎ Co-Pilot · Sleep pattern"
          title={`Waking clustering at ${wakingWindowPattern.timeLabel} — this is expected.`}
          body={[
            `${childName}'s night wakings on the last ${wakingWindowPattern.nightCount} nights all occurred around ${wakingWindowPattern.timeLabel}. This timing reflects a natural transition out of the first deep sleep cycle — a predictable arousal point in sleep architecture.`,
            wakingWindowPattern.durationTrend
              ? `Duration trend: ${wakingWindowPattern.durationTrend}. ${wakingWindowPattern.isTrending ? "The decreasing duration shows the skill is consolidating." : "Duration is stable — may need a few more nights to fully bridge."}`
              : null,
            `No intervention needed. The pattern is the nervous system working through something specific, not a sign something is wrong.`,
          ].filter(Boolean).join(" ")}
          actions={[
            { label: "Draft a message", onClick: () => onNavigate("responseBuilder", {
                prefill: `I wanted to share something reassuring — I've been watching ${childName}'s data closely and noticed her wakings have been happening around the same time each night (around ${wakingWindowPattern.timeLabel}). This is actually really normal. It's a natural transition point as she moves between sleep cycles. The fact that the wakings are getting shorter each night is exactly what we want to see. Stay the course — she's doing the work.`,
                tone: "Educational",
              })
            },
            { label: "View data", onClick: () => onNavigate("sleepData") },
          ]}
        />
      )}

      {/* Proactive suggestion */}
      <ProactiveCard
        icon={proactiveSuggestion.icon}
        label={proactiveSuggestion.label}
        text={proactiveSuggestion.text}
        cta={proactiveSuggestion.cta}
        onCta={() => onNavigate("responseBuilder")}
      />
    </div>
  );
}
