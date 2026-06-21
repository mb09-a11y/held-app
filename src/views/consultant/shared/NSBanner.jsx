// shared/NSBanner.jsx
import { useT, font } from "../../../core/shared.jsx";

// Keyed on the real state values written by NSCheckinFlow.jsx /
// ConsultantNSCheckin.jsx. "no_data" is its own neutral entry — it must
// never visually read as "Regulated" (calm green) or imply any state at all.
const STATE_COLOR = {
  Regulated:  { bg: "rgba(92,122,94,0.12)",  border: "rgba(92,122,94,0.35)",  text: "#5C7A5E", label: "Regulated" },
  Stretched:  { bg: "rgba(184,146,74,0.12)", border: "rgba(184,146,74,0.35)", text: "#B8924A", label: "Stretched" },
  Flight:     { bg: "rgba(168,155,90,0.12)", border: "rgba(168,155,90,0.35)", text: "#A89B5A", label: "Flight" },
  Freeze:     { bg: "rgba(123,143,170,0.12)",border: "rgba(123,143,170,0.35)",text: "#7B8FAA", label: "Freeze" },
  Fight:      { bg: "rgba(192,112,112,0.12)",border: "rgba(192,112,112,0.35)",text: "#C07070", label: "Fight" },
  Shutdown:   { bg: "rgba(138,123,170,0.12)",border: "rgba(138,123,170,0.35)",text: "#8A7BAA", label: "Shutdown" },
  no_data:    { bg: "rgba(120,120,120,0.08)",border: "rgba(120,120,120,0.25)",text: "#888888", label: "No check-in yet" },
};

// Trend bar fill count per state — how many of the 5 bars read as "filled".
const FILLED_BARS_BY_STATE = {
  Shutdown:  5,
  Fight:     5,
  Freeze:    3,
  Flight:    3,
  Stretched: 3,
  Regulated: 2,
  no_data:   0,
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
  // No fallback to "Regulated" — an unrecognized or missing state is treated
  // as no_data, never as a real (and falsely reassuring) clinical state.
  const state     = family?.nsState && STATE_COLOR[family.nsState] ? family.nsState : "no_data";
  const col       = STATE_COLOR[state];
  const trend     = family?.nsTrend || [2, 2, 2, 2, 2];
  const note      = family?.nsNote || "";
  const timeStr   = fmtRelTime(family?.nsCheckinTime);
  const maxTrend  = Math.max(...trend, 1);
  const filledBars = FILLED_BARS_BY_STATE[state] ?? 0;
  const hasCheckin = state !== "no_data";

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
            : !hasCheckin
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
