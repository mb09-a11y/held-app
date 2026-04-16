// shared/NSBanner.jsx
import { useT, font } from "../../../core/shared.jsx";

const STATE_COLOR = {
  regulated:   { bg: "rgba(92,122,94,0.15)", border: "rgba(92,122,94,0.4)", text: "#7BAA8A", label: "Regulated" },
  activated:   { bg: "rgba(192,138,58,0.15)", border: "rgba(192,138,58,0.4)", text: "#C08A3A", label: "Activated" },
  overwhelmed: { bg: "rgba(192,84,58,0.15)", border: "rgba(192,84,58,0.4)", text: "#E87A5E", label: "Overwhelmed" },
};

export default function NSBanner({ family, nsLog }) {
  const T = useT();
  const state = family?.nsState || "regulated";
  const col = STATE_COLOR[state] || STATE_COLOR.regulated;
  const trend = family?.nsTrend || [2, 2, 2, 2, 2];
  const maxTrend = Math.max(...trend, 1);

  return (
    <div style={{
      margin: "8px 18px 4px",
      borderRadius: 14,
      padding: "10px 14px",
      background: col.bg,
      border: `1px solid ${col.border}`,
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
          fontWeight: 600, color: col.text, marginBottom: 2, fontFamily: font,
        }}>
          Parent Nervous System · Family · {col.label}
        </div>
        <div style={{ fontSize: 12, color: T.text, lineHeight: 1.4, fontFamily: font }}>
          {family?.nsNote || "No recent check-ins."}
        </div>
      </div>
      {/* Mini trend bars */}
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 34 }}>
        {trend.map((v, i) => (
          <div key={i} style={{
            width: 5,
            height: `${Math.round((v / maxTrend) * 100)}%`,
            minHeight: 4,
            borderRadius: 2,
            background: col.text,
            opacity: 0.5 + (i / trend.length) * 0.5,
          }} />
        ))}
      </div>
    </div>
  );
}
