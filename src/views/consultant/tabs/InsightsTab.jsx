// views/consultant/tabs/InsightsTab.jsx
import { useT, font, serif } from "../../../core/shared.jsx";
import InsightCard from "../shared/InsightCard.jsx";
import ProactiveCard from "../shared/ProactiveCard.jsx";

export default function InsightsTab({ family, activeChild, onNavigate }) {
  const T = useT();
  const isUrgent = activeChild?.status === "urgent";
  const isWatch  = activeChild?.status === "watch";

  // Dynamic insights based on child status
  const insights = isUrgent ? [
    {
      label: `◎ Co-Pilot insight · Day ${activeChild.planDay}`,
      title: "Nap length is driving the night waking pattern.",
      body: `Over the past 4 days, ${activeChild.name}'s nap has exceeded 2h on days where night wakings increased. Arriving undertired at bedtime. This is a plan adjustment opportunity — not a failure signal.`,
      actions: [
        { label: "Adjust plan", onClick: () => onNavigate("plan") },
        { label: "View data",   onClick: () => onNavigate("sleepData") },
      ],
    },
    {
      label: "◎ Co-Pilot · Parent state",
      title: "Validate first. Data second.",
      body: `NS trend shows ${family.nsTrend?.length || 4} days activated — parent needs emotional anchoring before any plan discussion. Lead with warmth.`,
      actions: [
        { label: "Draft support message", onClick: () => onNavigate("responseBuilder") },
        { label: "See NS log",            onClick: () => {} },
      ],
    },
  ] : isWatch ? [
    {
      label: `◎ Co-Pilot insight · Day ${activeChild.planDay}`,
      title: "Day 5 regression window — normal and expected.",
      body: `Sleep latency may increase tonight. This is a common plateau, not a method failure. Prepare the parent now so they don't panic when it happens.`,
      actions: [
        { label: "Prepare message", onClick: () => onNavigate("responseBuilder") },
        { label: "View data",       onClick: () => onNavigate("sleepData") },
      ],
    },
  ] : [
    {
      label: `◎ Co-Pilot insight · Day ${activeChild.planDay}`,
      title: "Strong progress. Stay the course.",
      body: `${activeChild.name} is consistently hitting targets. Night wakings trending down. Parent confidence is building — a brief celebration message goes a long way right now.`,
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
            {activeChild?.name} · {activeChild?.age} · Day {activeChild?.planDay} of plan
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
            { step: "2️⃣", title: "Normalize the process",  body: `Day ${activeChild?.planDay} plateaus are common. Reframe the data as information, not failure.` },
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
