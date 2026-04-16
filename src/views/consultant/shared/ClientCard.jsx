// shared/ClientCard.jsx
import { useT, font, serif } from "../../../core/shared.jsx";

const URGENCY = {
  urgent: { accent: "#C0543A", badgeBg: "rgba(192,84,58,0.15)", badgeText: "#C0543A", label: "Urgent" },
  watch:  { accent: "#C08A3A", badgeBg: "rgba(192,138,58,0.15)", badgeText: "#C08A3A", label: "Watch" },
  good:   { accent: "#5C7A5E", badgeBg: "rgba(92,122,94,0.15)", badgeText: "#5C7A5E", label: "On track" },
};

const STATUS_DOT = { good: "#7FD98A", watch: "#C08A3A", urgent: "#C0543A" };

export default function ClientCard({ family, onPress }) {
  const T = useT();
  const u = URGENCY[family.urgency] || URGENCY.good;

  return (
    <div onClick={() => onPress(family)} style={{
      margin: "0 18px 9px",
      background: T.card,
      borderRadius: 18,
      padding: "14px 16px",
      boxShadow: T.shadow,
      cursor: "pointer",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Left accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: 4,
        borderRadius: "4px 0 0 4px",
        background: u.accent,
      }} />
      <div style={{ paddingLeft: 8 }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 9 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: u.badgeBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
          }}>
            {family.children?.length > 1 ? "👨‍👩‍👧" : family.children?.[0]?.emoji || "👶"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: font }}>
              {family.name}
            </div>
            {/* Multi-child status dots */}
            {family.children?.length > 1 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                {family.children.map(c => (
                  <span key={c.id} style={{ fontSize: 11, color: T.muted, fontFamily: font }}>
                    {c.name} <span style={{ fontSize: 9 }}>●</span>
                    {" "}<span style={{ color: STATUS_DOT[c.status] }}>●</span>
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: T.muted, marginTop: 1, fontFamily: font }}>
                {family.children?.[0]?.name} · {family.children?.[0]?.age} · Day {family.children?.[0]?.planDay} of plan
              </div>
            )}
          </div>
          <div style={{
            padding: "3px 9px", borderRadius: 20,
            background: u.badgeBg, color: u.badgeText,
            fontSize: 10, fontWeight: 600, fontFamily: font,
          }}>{u.label}</div>
        </div>

        {/* Insight */}
        <div style={{
          background: T.bg2, borderRadius: 10, padding: "9px 11px",
          fontSize: 12, color: T.text, lineHeight: 1.5, marginBottom: 9,
          fontFamily: font,
        }}>
          {family.insight}
        </div>

        {/* Pills */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 9 }}>
          {(family.flags || []).map((f, i) => (
            <span key={i} style={{
              background: "rgba(192,84,58,0.15)", color: "#E87A5E",
              borderRadius: 20, padding: "3px 9px", fontSize: 10, fontFamily: font,
            }}>{f}</span>
          ))}
          {(family.positives || []).map((p, i) => (
            <span key={i} style={{
              background: "rgba(92,122,94,0.15)", color: "#7BAA8A",
              borderRadius: 20, padding: "3px 9px", fontSize: 10, fontFamily: font,
            }}>{p}</span>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center",
          paddingTop: 9, borderTop: `1px solid ${T.border}`,
        }}>
          <div style={{
            fontSize: 11, color: T.subText, fontStyle: "italic", flex: 1, fontFamily: font,
          }}>"{family.lastMessage}" · {family.lastMessageTime}</div>
          <div style={{
            background: T.teal, color: "#fff",
            padding: "5px 13px", borderRadius: 20,
            fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font,
          }}>
            {family.urgency === "urgent" ? "Respond" : family.urgency === "watch" ? "Prepare" : "Check in"}
          </div>
        </div>
      </div>
    </div>
  );
}
