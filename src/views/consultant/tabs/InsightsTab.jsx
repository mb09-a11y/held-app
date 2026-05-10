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
    family?.id, activeChild?.id, activeChild?.dob
  );

  if (!activeChild) return null;

  const hasData   = (stats.nights?.length || 0) + (stats.naps?.length || 0) > 0;
  const childName = activeChild?.name ?? "your child";
  const nsState   = family?.nsState   || "regulated";
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
  const isUrgent = status === "urgent" || nsState === "overwhelmed";
  const isWatch  = !isUrgent && (status === "watch" || nsState === "activated");

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
    return {
      title: "Strong progress. Stay the course.",
      body:  `${childName} is consistently hitting targets. Night wakings trending down. Parent confidence is building — a brief celebration message goes a long way right now.`,
    };
  })();

  // ── Co-Pilot parent state insight ─────────────────────────────────────────
  const parentInsight = (() => {
    if (nsState === "overwhelmed") return {
      title: "Validate first. Data second.",
      body:  `NS trend shows ${nsTrendDays || "several"} days activated${nsNote ? ` — "${nsNote}"` : ""}. Parent needs emotional anchoring before any plan discussion. Lead with warmth.`,
      actions: [
        { label: "Draft support message", onClick: () => onNavigate("responseBuilder") },
        { label: "See NS log",            onClick: () => {} },
      ],
    };
    if (nsState === "activated") return {
      title: "Parent NS activated — check in proactively.",
      body:  `${nsTrendDays > 0 ? `${nsTrendDays} days activated` : "Recent check-in shows activation"}${nsNote ? ` — "${nsNote}"` : ""}. Reach out before they message you tonight.`,
      actions: [
        { label: "Draft check-in", onClick: () => onNavigate("responseBuilder") },
        { label: "See NS log",     onClick: () => {} },
      ],
    };
    return {
      title: "Parent is regulated — good window for data sharing.",
      body:  family?.nsCheckinTime
        ? `Last check-in ${fmtRelTime(family.nsCheckinTime)} shows regulation. This is a good moment to share progress data or set expectations for the next phase.`
        : `No recent NS check-in. Encourage the parent to log how they're feeling — it helps you calibrate your support.`,
      actions: [
        { label: "Draft check-in", onClick: () => onNavigate("responseBuilder") },
      ],
    };
  })();

  // ── Proactive suggestion ───────────────────────────────────────────────────
  const proactiveText = (() => {
    if (nsState === "overwhelmed")
      return `Parent is in overwhelm. Reach out before they message you — a short "thinking of you" note can regulate their system before tonight.`;
    if (isUrgent)
      return `${childName}'s stats are flagged urgent. Prepare a regulated response now so you're not drafting under pressure when the message arrives tonight.`;
    if (flaggedNaps > 0)
      return `${childName} had a long nap recently. A quick heads-up about bedtime timing tonight could prevent a panic message.`;
    if (planDay != null && [3, 5, 7, 10, 14].includes(planDay))
      return `Day ${planDay} is a common regression window. Send a proactive note to normalize any bumps — parents who feel prepared panic less.`;
    return `Check in proactively before tonight — it builds trust and reduces reactive messages.`;
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

      {/* Proactive suggestion */}
      <ProactiveCard
        icon={isUrgent ? "⚠️" : nsState === "overwhelmed" ? "🫂" : "🔮"}
        label={isUrgent ? "Tonight, watch for" : "Proactive suggestion"}
        text={proactiveText}
        cta="Draft message →"
        onCta={() => onNavigate("responseBuilder")}
      />
    </div>
  );
}
