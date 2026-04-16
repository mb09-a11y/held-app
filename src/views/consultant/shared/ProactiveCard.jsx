// shared/ProactiveCard.jsx
import { useT, font } from "../../../core/shared.jsx";

export default function ProactiveCard({ icon = "🔮", label, text, cta, onCta }) {
  const T = useT();
  return (
    <div style={{
      margin: "0 18px 10px",
      background: `linear-gradient(135deg, ${T.bg2}, ${T.card})`,
      border: `1px solid ${T.warm}44`,
      borderRadius: 16,
      padding: "13px 15px",
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
    }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div>
        <div style={{
          fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
          color: T.warm, fontWeight: 600, marginBottom: 2, fontFamily: font,
        }}>{label}</div>
        <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5, fontFamily: font }}>{text}</div>
        {cta && (
          <div onClick={onCta} style={{
            fontSize: 11, color: T.warm, fontWeight: 600,
            marginTop: 4, cursor: "pointer", fontFamily: font,
          }}>{cta}</div>
        )}
      </div>
    </div>
  );
}
