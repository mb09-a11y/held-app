// shared/NSBanner.jsx
import { useT, font } from "../../../core/shared.jsx";

const STATE_COLOR = {
  regulated:   { bg: "rgba(92,122,94,0.12)",  border: "rgba(92,122,94,0.35)",  text: "#5C7A5E", label: "Regulated" },
  activated:   { bg: "rgba(192,138,58,0.12)", border: "rgba(192,138,58,0.35)", text: "#C08A3A", label: "Activated" },
  overwhelmed: { bg: "rgba(192,84,58,0.12)",  border: "rgba(192,84,58,0.35)",  text: "#C0543A", label: "Overwhelmed" },
};

function fmtRelTime(iso) {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export default function NSBanner({ family }) {
  const T = useT();
  const state     = family?.nsState      || "regulated";
  const col       = STATE_COLOR[state]   || STATE_COLOR.regulated;
  const trend     = family?.nsTrend      || [2, 2, 2, 2, 2];
  const note      = family?.nsNote       || "";
  const timeStr   = fmtRelTime(family?.nsCheckinTime);
  const maxTrend  = Math.max(...trend, 1);

  // How many bars to "fill" based on state
  const filledBars = state === "overwhelmed" ? 5 : state === "activated" ? 3 : 2;

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
          fontWeight: 700, color: col.text, marginBottom: 3, fontFamily: font,
          display: "flex", alignItems: "center", gap: 5,
        }}>
          Parent NS · Family · {col.label}
          {timeStr && (
            <span style={{ fontWeight: 400, opacity: 0.7, textTransform: "none", letterSpacing: 0 }}>
              · {timeStr}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: T.text, lineHeight: 1.45, fontFamily: font }}>
          {note
            ? note
            : !family?.nsCheckinTime
              ? "No recent check-ins."
              : `${col.label} — no note left.`
          }
        </div>
      </div>

      {/* Trend bars — height driven by trend values, color driven by state */}
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 34, flexShrink: 0 }}>
        {trend.map((v, i) => (
          <div key={i} style={{
            width: 5,
            height: `${Math.round((v / maxTrend) * 100)}%`,
            minHeight: 4,
            borderRadius: 2,
            background: col.text,
            opacity: i < filledBars ? 0.85 : 0.25,
          }} />
        ))}
      </div>
    </div>
  );
}
