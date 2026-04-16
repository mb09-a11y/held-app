// shared/InsightCard.jsx
import { useT, font, serif } from "../../../core/shared.jsx";

export default function InsightCard({ label, title, body, actions = [] }) {
  const T = useT();
  return (
    <div style={{
      margin: "0 18px 10px",
      borderRadius: 18,
      padding: "14px 16px",
      background: `linear-gradient(135deg, ${T.bg2}, ${T.card})`,
      border: `1px solid ${T.teal}44`,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", right: 14, top: 12,
        fontSize: 28, color: T.teal, opacity: 0.12,
        fontFamily: "monospace",
      }}>◎</div>
      <div style={{
        fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
        fontWeight: 600, color: T.teal, marginBottom: 6, fontFamily: font,
      }}>{label}</div>
      {title && (
        <div style={{
          fontFamily: serif, fontSize: 17, fontStyle: "italic",
          color: T.headingText, lineHeight: 1.45, marginBottom: 7,
        }}>{title}</div>
      )}
      {body && (
        <div style={{
          fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: actions.length ? 9 : 0,
          fontFamily: font,
        }}>{body}</div>
      )}
      {actions.length > 0 && (
        <div style={{ display: "flex", gap: 6 }}>
          {actions.map((a, i) => (
            <button key={i} onClick={a.onClick} style={{
              background: i === 0 ? T.teal : "transparent",
              color: i === 0 ? "#fff" : T.muted,
              border: i === 0 ? "none" : `1.5px solid ${T.border}`,
              borderRadius: 20, padding: "6px 13px",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: font,
            }}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
