// views/consultant/DistressIntercept.jsx
// "Before you reply…" gate. Surfaces before every reply regardless of the
// family's NS state — ConsultantShell only routes here when the consultant's
// last NS check-in is more than an hour old. Names the family's current state
// plainly, then offers the 4-card NS check-in inline before proceeding.
//
// Props:
//   familyId       — passed through to ConsultantNSCheckin (checkinContext='pre_reply')
//   familyName     — used in the framing line
//   familyNsState  — 'overwhelmed' | 'activated' | 'regulated' (or undefined)
//   onCheckinSaved(result) — called immediately once the 4-card check-in saves;
//                            parent updates lastNSCheckin but does NOT navigate yet
//   onProceed()    — called once the consultant dismisses the result/exercise
//                    screen — proceed to Response Builder
//   onSkip()       — called if the consultant skips the check-in

import { useState } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { ConsultantNSCheckin } from "./ConsultantNSCheckin.jsx";

function familyStateLine(nsState, familyName) {
  const name = familyName || "This family";
  if (nsState === "Fight" || nsState === "Shutdown") return `${name} is flooded right now. Respond with care.`;
  if (nsState === "Freeze" || nsState === "Flight" || nsState === "Stretched") return `${name}'s nervous system is activated right now. Take your time.`;
  return `Take a moment with yourself before you respond${familyName ? ` to ${familyName}` : ""}.`;
}

export default function DistressIntercept({ familyId, familyName, familyNsState, onCheckinSaved, onProceed, onSkip }) {
  const T = useT();
  const [showCheckin, setShowCheckin] = useState(false);

  if (showCheckin) {
    return (
      <ConsultantNSCheckin
        checkinContext="pre_reply"
        familyId={familyId}
        familyName={familyName}
        onClose={() => setShowCheckin(false)}
        onDone={() => onProceed?.()}
        onCheckinSaved={(result) => onCheckinSaved?.(result)}
      />
    );
  }

  return (
    <div style={{
      background: `linear-gradient(180deg, #EAF4F0, #F4F0EA)`,
      flex: 1, overflowY: "auto",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "28px 18px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
        <div style={{ fontFamily: serif, fontSize: 24, fontStyle: "italic", color: T.text, marginBottom: 8, lineHeight: 1.3 }}>
          Before you reply{familyName ? ` to ${familyName}` : ""}…
        </div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, fontFamily: font }}>
          {familyStateLine(familyNsState, familyName)}
        </div>
      </div>

      <div style={{
        margin: "0 18px 10px",
        background: "linear-gradient(135deg, #EAF4F0, #F4F0EA)",
        border: `1px solid #C4D2C2`,
        borderRadius: 18, padding: "18px 20px",
      }}>
        <div style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: T.text, marginBottom: 8 }}>
          It's been a bit since you checked in with yourself.
        </div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, fontFamily: font, marginBottom: 16 }}>
          A 60-second check-in helps you arrive at this reply from a steadier place — for you and for them.
        </div>
        <button onClick={() => setShowCheckin(true)} style={{
          width: "100%", background: "#5C7A5E", color: "white",
          border: "none", borderRadius: 14, padding: 12,
          fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: font,
        }}>
          Check in →
        </button>
      </div>

      <div style={{ margin: "0 18px", textAlign: "center", fontSize: 12, color: T.muted, fontStyle: "italic", lineHeight: 1.6, fontFamily: font }}>
        "By grounding yourself first, you create the calm, regulated space necessary to support the parents you're working with."
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ textAlign: "center", marginTop: 16, marginBottom: 24 }}>
        <button onClick={onSkip} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: T.muted, fontFamily: font,
        }}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
