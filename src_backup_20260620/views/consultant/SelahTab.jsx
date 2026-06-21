// views/consultant/SelahTab.jsx
// Selah tab landing — replaces the old Co-Pilot tab. On open, surfaces two
// entry points: "Your assistant" (the AI chat, formerly Co-Pilot) and
// "NS check-in" (the 4-card check-in). Matches the approved wireframe.
//
// Props:
//   onNavigate — passed through to the assistant for responseBuilder etc.
//   onCheckin  — opens the daily ConsultantNSCheckin overlay (from ConsultantShell)

import { useState } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import CoPilotWorkspace from "./CoPilotWorkspace.jsx";
import selahOrb from "../../assets/Selah-orb.png";

export default function SelahTab({ onNavigate, onCheckin }) {
  const T = useT();
  const [view, setView] = useState("landing"); // 'landing' | 'assistant'

  if (view === "assistant") {
    return (
      <CoPilotWorkspace
        onNavigate={onNavigate}
        onBack={() => setView("landing")}
        onCheckin={onCheckin}
      />
    );
  }

  return (
    <div style={{ background: T.gradientBg, flex: 1, overflowY: "auto", padding: "40px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <img
          src={selahOrb}
          alt="Selah"
          style={{ width: 88, height: 88, borderRadius: "50%", marginBottom: 16, boxShadow: "0 6px 24px rgba(0,0,0,0.12)" }}
        />
        <div style={{ fontFamily: serif, fontSize: 30, color: T.headingText, marginBottom: 6 }}>Selah</div>
        <div style={{ fontSize: 13, color: T.muted, fontFamily: font, lineHeight: 1.5 }}>
          Holding you while you hold your families.
        </div>
      </div>

      <button onClick={() => setView("assistant")} style={{
        display: "block", width: "100%", textAlign: "left",
        background: "#2D4A35", border: "none", borderRadius: 18,
        padding: "18px 20px", marginBottom: 12, cursor: "pointer",
      }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>✨</div>
        <div style={{ fontFamily: serif, fontSize: 18, color: "#fff", marginBottom: 4 }}>Your assistant</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: font, lineHeight: 1.5 }}>
          Ask about families, draft messages, get clinical insights
        </div>
      </button>

      <button onClick={onCheckin} style={{
        display: "block", width: "100%", textAlign: "left",
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 18,
        padding: "18px 20px", cursor: "pointer", boxShadow: T.shadow,
      }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>🌿</div>
        <div style={{ fontFamily: serif, fontSize: 18, color: T.headingText, marginBottom: 4 }}>NS check-in</div>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: font, lineHeight: 1.5 }}>
          Check in with yourself before you open your caseload
        </div>
      </button>
    </div>
  );
}
