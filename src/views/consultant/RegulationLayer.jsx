// views/consultant/RegulationLayer.jsx
import { useState } from "react";
import { useT, font, serif } from "../../core/shared.jsx";

const STATES = [
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😰", label: "Overwhelmed" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😌", label: "Grounded" },
];

const RESET_STEPS = [
  { icon: "🫁", text: "Drop your shoulders" },
  { icon: "🌬️", text: "Slow exhale — longer than the inhale" },
  { icon: "👁",  text: "Name 3 things you can see right now" },
  { icon: "🤲", text: "Feel your feet on the floor" },
];

export default function RegulationLayer({ familyName, onRegulated, onSkip }) {
  const T = useT();
  const [selectedState, setSelectedState] = useState(null);
  const [showReset, setShowReset] = useState(false);

  const handleStateSelect = (s) => {
    setSelectedState(s);
    if (s.label !== "Grounded") setShowReset(true);
  };

  const handleRegulated = () => {
    onRegulated({ state: selectedState, skipped: false });
  };

  const handleSkip = () => {
    onSkip({ state: null, skipped: true });
  };

  return (
    <div style={{
      background: `linear-gradient(180deg, #EAF4F0, #F4F0EA)`,
      flex: 1, overflowY: "auto",
    }}>
      <div style={{ padding: "28px 18px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
        <div style={{ fontFamily: serif, fontSize: 24, fontStyle: "italic", color: T.text, marginBottom: 8, lineHeight: 1.3 }}>
          Before you reply{familyName ? ` to ${familyName}` : ""}…
        </div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, fontFamily: font }}>
          This parent is in distress. You're their anchor right now. Check in with yourself first.
        </div>
      </div>

      <div style={{
        margin: "0 18px 10px",
        background: "linear-gradient(135deg, #EAF4F0, #F4F0EA)",
        border: `1px solid #C4D2C2`,
        borderRadius: 18, padding: "16px 18px",
      }}>
        <div style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: T.text, marginBottom: 10 }}>
          How are you feeling right now?
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 11 }}>
          {STATES.map(s => (
            <button key={s.label} onClick={() => handleStateSelect(s)} style={{
              flex: 1, background: selectedState?.label === s.label ? "#FAF3E6" : "white",
              border: `1.5px solid ${selectedState?.label === s.label ? "#D4AE72" : "#E8DDD0"}`,
              borderRadius: 11, padding: "9px 5px",
              textAlign: "center", cursor: "pointer",
              transition: "all 0.18s",
            }}>
              <span style={{ fontSize: 18, display: "block", marginBottom: 2 }}>{s.emoji}</span>
              <span style={{ fontSize: 9, color: T.muted, fontFamily: font }}>{s.label}</span>
            </button>
          ))}
        </div>

        {(showReset || selectedState) && (
          <div style={{ background: "white", borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5C7A5E", fontWeight: 600, marginBottom: 6, fontFamily: font }}>
              30-second reset
            </div>
            {RESET_STEPS.map((step, i) => (
              <div key={i} style={{ fontSize: 13, color: T.text, lineHeight: 1.7, fontFamily: font }}>
                {step.icon} &nbsp;{step.text}
              </div>
            ))}
          </div>
        )}

        <button onClick={handleRegulated} style={{
          width: "100%", background: "#5C7A5E", color: "white",
          border: "none", borderRadius: 14, padding: 11,
          fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
        }}>
          I'm regulated — reply from here →
        </button>
      </div>

      <div style={{ margin: "0 18px", textAlign: "center", fontSize: 12, color: T.muted, fontStyle: "italic", lineHeight: 1.6, fontFamily: font }}>
        "Your nervous system is part of the consultation.<br />Respond from regulation."
      </div>

      <div style={{ textAlign: "center", marginTop: 16, marginBottom: 16 }}>
        <button onClick={handleSkip} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: T.muted, fontFamily: font,
        }}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
