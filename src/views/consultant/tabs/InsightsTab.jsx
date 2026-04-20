// views/consultant/tabs/InsightsTab.jsx
import { useT, font, serif } from "../../../core/shared.jsx";
import { useSleepStats } from "../data/consultantStore.js";
import InsightCard from "../shared/InsightCard.jsx";
import ProactiveCard from "../shared/ProactiveCard.jsx";

export default function InsightsTab({ family, activeChild, onNavigate }) {
  const T = useT();

  // Hooks must be called before any early returns (Rules of Hooks)
  const stats = useSleepStats(activeChild?.id, family?.id, 7);

  if (!activeChild) return null;

  const hasData = (stats.nights?.length || 0) + (stats.naps?.length || 0) > 0;

  // Derive urgency from real data rather than the status field alone
  // NS state from family regulation checkins
  const nsState = family?.nsState || "regulated";
  const nsActivated = nsState === "activated" || nsState === "overwhelmed";
  const nsTrendDays = (family?.nsTrend || []).filter(v => v >= 3).length;

  // Child sleep status — comes from Supabase sleep_status column
  // Fall back to deriving from NS state if not set
  const status = activeChild?.status || "good";
  const isUrgent = status === "urgent" || nsState === "overwhelmed";
  const isWatch  = status === "watch"  || nsActivated;

  const childName = activeChild?.name ?? "your child";
  const planDay   = activeChild?.plan_day ?? activeChild?.planDay ?? 0;

  // Dynamic insights based on child status
  // If no sleep data logged for this child, show a "not tracking" state
  if (!hasData) {
    return (
      <div>
        <div style={{ margin: "10px 18px 10px", background: T.bg2, borderRadius: 12, padding: "10px 13px", display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 18 }}>{activeChild?.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: font }}>{activeChild?.name} · {activeChild?.age}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1, fontFamily: font }}>{activeChild?.method?.replace(/_/g, " ") || "No method assigned"}</div>
          </div>
          <div style={{ padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600, fontFamily: font, background: "#F0F0EE", color: T.muted }}>
            Not tracking
          </div>
        </div>
        <div style={{ margin: "0 18px", background: T.card, borderRadius: 18, padding: "22px 18px", boxShadow: T.shadow, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>😴</div>
          <div style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: T.headingText, marginBottom: 8 }}>
            {childName} isn't being tracked yet.
          </div>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.7 }}>
            No sleep data has been logged for {childName} in the last 7 days. Insights and Co-Pilot suggestions will appear once the family starts logging.
          </div>
        </div>
      </div>
    );
  }

  const insights = isUrgent ? [
    {
      label: `◎ Co-Pilot insight · Day ${planDay}`,
      title: "Nap length is driving the night waking pattern.",
      body: `Over the past 4 days, ${childName}'s nap has exceeded 2h on days where night wakings increased. Arriving undertired at bedtime. This is a plan adjustment opportunity — not a failure signal.`,
      actions: [
        { label: "Adjust plan", onClick: () => onNavigate("plan") },
        { label: "View data",   onClick: () => onNavigate("sleepData") },
      ],
    },
    {
      label: "◎ Co-Pilot · Parent state",
      title: "Validate first. Data second.",
      body: `NS trend shows ${nsTrendDays || 'several'} days activated — parent needs emotional anchoring before any plan discussion. Lead with warmth.`,
      actions: [
        { label: "Draft support message", onClick: () => onNavigate("responseBuilder") },
        { label: "See NS log",            onClick: () => {} },
      ],
    },
  ] : isWatch ? [
    {
      label: `◎ Co-Pilot insight · Day ${planDay}`,
      title: "Day 5 regression window — normal and expected.",
      body: `Sleep latency may increase tonight. This is a common plateau, not a method failure. Prepare the parent now so they don't panic when it happens.`,
      actions: [
        { label: "Prepare message", onClick: () => onNavigate("responseBuilder") },
        { label: "View data",       onClick: () => onNavigate("sleepData") },
      ],
    },
  ] : [
    {
      label: `◎ Co-Pilot insight · Day ${planDay}`,
      title: "Strong progress. Stay the course.",
      body: `${childName} is consistently hitting targets. Night wakings trending down. Parent confidence is building — a brief celebration message goes a long way right now.`,
      actions: [
        { label: "Draft check-in", onClick: () => onNavigate("responseBuilder") },
        { label: "View data",      onClick: () => onNavigate("sleepData") },
      ],
    },
  ];

  return (
    <div>
      {/* Child context card */}
      <div style={{
        margin: "10px 18px 10px",
        background: T.bg2, borderRadius: 12, padding: "10px 13px",
        display: "flex", gap: 8, alignItems: "center",
      }}>
        <div style={{ fontSize: 18 }}>{activeChild?.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: font }}>
            {activeChild?.name} · {activeChild?.age} · Day {planDay} of plan
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 1, fontFamily: font }}>
            {activeChild?.method?.replace(/_/g, " ")}
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

      {insights.map((ins, i) => (
        <InsightCard key={i} {...ins} />
      ))}

      {/* Suggested next moves */}
      {isUrgent && (
        <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8, fontFamily: font }}>
            Suggested next moves
          </div>
          {[
            { step: "1️⃣", title: "Validate emotion first", body: "She said 'I don't know how much more I can do.' That's a cry, not a question. Meet it there." },
            { step: "2️⃣", title: "Normalize the process",  body: `Day ${planDay} plateaus are common. Reframe the data as information, not failure.` },
            { step: "3️⃣", title: "Anchor to one action",   body: "Cap nap at 90 min today. Give her something concrete to hold onto tonight." },
          ].map((m, i) => (
            <div key={i} style={{
              display: "flex", gap: 9, alignItems: "flex-start",
              padding: "9px 0",
              borderBottom: i < 2 ? `1px solid ${T.border}` : "none",
            }}>
              <div style={{ fontSize: 16 }}>{m.step}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text, fontFamily: font }}>{m.title}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.5, fontFamily: font }}>{m.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProactiveCard
        icon={isUrgent ? "⚠️" : "🔮"}
        label={isUrgent ? "Tonight, watch for" : "Proactive suggestion"}
        text={
          isUrgent
            ? `${activeChild?.name}'s parent is statistically likely to message tonight after a rough night. Prepare your regulated response now.`
            : `Check in proactively before tonight — it builds trust and reduces reactive messages.`
        }
        cta="Draft message →"
        onCta={() => onNavigate("responseBuilder")}
      />
    </div>
  );
}
