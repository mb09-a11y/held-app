// src/views/consultant/ConsultantMorning.jsx
// Consultant Morning Moment — before-session regulation ritual.
// Mirrors parent MorningMoment aesthetic exactly (same BG, same card style,
// same serif/font tokens) but copy is work-session-oriented, not parenting.
// Saves to consultant_checkins with source="morning_session".

import { useState } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

// ─── SAME WARM GRADIENT AS PARENT MORNING MOMENT ─────────────────────────────
const BG = "linear-gradient(155deg, #F4EDE0 0%, #E8DDD0 50%, #F0E8DA 100%)";

// ─── CONSULTANT-SPECIFIC INTENTIONS ──────────────────────────────────────────
const INTENTIONS = [
  { id: "present",   emoji: "🌿", label: "Present",    anchor: "I'm here for my families, not just their data.",         sub: "Presence before problem-solving."  },
  { id: "grounded",  emoji: "🌲", label: "Grounded",   anchor: "My regulated presence is the most useful thing I bring.", sub: "Steadiness is a skill."            },
  { id: "clear",     emoji: "✦",  label: "Clear",      anchor: "I can hold complexity without being consumed by it.",     sub: "Think clearly. Act cleanly."       },
  { id: "boundaried",emoji: "🪨", label: "Boundaried", anchor: "I can care deeply without carrying it all.",              sub: "Empathy with edges."               },
];

const GROUNDS = [
  { id: "shoulders", emoji: "🫁", label: "Drop my shoulders",           cue: "Breathe in, lift them to your ears — then let everything fall on the exhale." },
  { id: "exhale",    emoji: "💨", label: "One long exhale",              cue: "Breathe in for 4, out for 7. That exhale activates your parasympathetic brake." },
  { id: "scan",      emoji: "🔍", label: "Quick body scan",              cue: "Start at your feet. Notice where you're holding tension. Soften those places." },
  { id: "orient",    emoji: "👁", label: "Orient to the room",           cue: "Slowly look around your space. Name 3 things you can see. Let your eyes land somewhere soft." },
];

// ─── SHARED PIECES ────────────────────────────────────────────────────────────
function Header({ subtitle, onSkip }) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return (
    <div style={{ padding: "14px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(58,46,40,0.4)", fontWeight: 600, fontFamily: font }}>{greeting}</div>
        <div style={{ fontFamily: serif, fontSize: 24, color: "#2D4A35" }}>{subtitle}</div>
      </div>
      <button onClick={onSkip} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: "rgba(58,46,40,0.4)", cursor: "pointer", padding: "6px" }}>
        Skip
      </button>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export function ConsultantMorning({ onClose }) {
  const T = useT();
  const { currentUser } = useApp();
  const [step, setStep] = useState(0);          // 0=picker, 1=anchor card, 2=done
  const [variant, setVariant] = useState("intention");
  const [choice, setChoice] = useState(null);

  async function saveCheckin(label) {
    if (!currentUser?.id) return;
    try {
      await supabase.from("consultant_checkins").insert({
        consultant_id: currentUser.id,
        arrival_state: label.toLowerCase(),
        is_regulated: true,
        source: "morning_session",
        created_at: new Date().toISOString(),
      });
    } catch { /* silent */ }
  }

  function pickAndAdvance(item) {
    setChoice(item);
    setStep(1);
  }

  function carry() {
    if (choice) saveCheckin(choice.label);
    setStep(2);
  }

  const container = {
    position: "fixed", inset: 0, zIndex: 300,
    background: BG,
    display: "flex", flexDirection: "column",
    overflowY: "auto", paddingBottom: 32,
  };

  // ── COMPLETION ──
  if (step === 2) {
    return (
      <div style={{ ...container, alignItems: "center", justifyContent: "center", padding: "32px 24px", textAlign: "center", gap: 20 }}>
        <div style={{ width: 62, height: 62, borderRadius: "50%", background: "#5C7A5E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "white" }}>✓</div>
        <div style={{ fontFamily: serif, fontSize: 24, fontStyle: "italic", color: "#2D4A35", lineHeight: 1.4 }}>
          You're arriving as<br />{choice?.emoji} {choice?.label}.
        </div>
        <div style={{ background: "white", borderRadius: 18, padding: 20, width: "100%", boxShadow: "0 4px 20px rgba(90,70,60,0.10)" }}>
          <div style={{ fontSize: 10, color: "rgba(58,46,40,0.4)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8, fontFamily: font }}>Your anchor for this session</div>
          <div style={{ fontFamily: serif, fontSize: 17, fontStyle: "italic", color: "#2D4A35", lineHeight: 1.5 }}>
            {choice?.anchor || choice?.cue || "You showed up."}
          </div>
        </div>
        <div style={{ fontFamily: font, fontSize: 12, color: "rgba(58,46,40,0.55)", lineHeight: 1.6, maxWidth: 280 }}>
          When the caseload gets heavy today, come back to this.
        </div>
        <button onClick={onClose} style={{
          background: "#2D4A35", color: "white", borderRadius: 16,
          padding: "14px 32px", fontFamily: font, fontSize: 14,
          fontWeight: 600, cursor: "pointer", border: "none", width: "100%",
        }}>
          Open my caseload
        </button>
      </div>
    );
  }

  // ── GROUNDING step 1 (cue card) ──
  if (variant === "grounding" && step === 1 && choice) {
    return (
      <div style={container}>
        <Header subtitle="Take a moment" onSkip={onClose} />
        <div style={{ flex: 1, padding: "0 20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, marginTop: 20 }}>
          <div style={{ background: "white", borderRadius: 22, padding: "26px 22px", boxShadow: "0 4px 20px rgba(90,70,60,0.10)", textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>{choice.emoji}</div>
            <div style={{ fontSize: 10, color: "#5C7A5E", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8, fontFamily: font }}>{choice.label}</div>
            <div style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: "#2D4A35", lineHeight: 1.55 }}>"{choice.cue}"</div>
          </div>
          <div style={{ background: "rgba(92,122,94,0.08)", borderRadius: 18, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#5C7A5E", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6, fontFamily: font }}>Take 10 seconds</div>
            <div style={{ fontSize: 13, color: "rgba(58,46,40,0.6)", lineHeight: 1.5, fontFamily: font }}>Actually do it.<br />Your first family can wait 10 seconds.</div>
          </div>
          <button onClick={carry} style={{ background: "#2D4A35", color: "white", borderRadius: 16, padding: 15, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none" }}>
            Done — I'm ready to begin
          </button>
          <button onClick={() => { setStep(0); setChoice(null); }} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: "rgba(58,46,40,0.4)", cursor: "pointer", textAlign: "center" }}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── GROUNDING step 0 (picker) ──
  if (variant === "grounding" && step === 0) {
    return (
      <div style={container}>
        <Header subtitle="Ground yourself first" onSkip={onClose} />
        <div style={{ padding: "0 20px 16px", fontFamily: serif, fontSize: 20, color: "#2D4A35", lineHeight: 1.4, fontStyle: "italic", marginTop: 8 }}>
          Pick one thing to do for your body before you open a single chart.
        </div>
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {GROUNDS.map(g => (
            <button key={g.id} onClick={() => pickAndAdvance(g)} style={{
              background: "white", border: "1.5px solid rgba(184,146,74,0.2)", borderRadius: 14,
              padding: "13px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(92,122,94,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "white"}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{g.emoji}</span>
              <span style={{ fontFamily: font, fontSize: 13, fontWeight: 500, color: "#3A2E28" }}>{g.label}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(58,46,40,0.3)" }}>→</span>
            </button>
          ))}
        </div>
        <button onClick={() => setVariant("intention")} style={{ textAlign: "center", fontFamily: font, fontSize: 12, color: "#5C7A5E", fontWeight: 600, cursor: "pointer", background: "none", border: "none", padding: "8px 20px" }}>
          ← Set an intention instead
        </button>
      </div>
    );
  }

  // ── INTENTION step 1 (anchor card) ──
  if (variant === "intention" && step === 1 && choice) {
    return (
      <div style={container}>
        <Header subtitle="Carry this with you" onSkip={onClose} />
        <div style={{ flex: 1, padding: "0 20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, marginTop: 20 }}>
          <div style={{ background: "white", borderRadius: 22, padding: "26px 22px", boxShadow: "0 4px 20px rgba(90,70,60,0.10)", textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>{choice.emoji}</div>
            <div style={{ fontSize: 10, color: "#5C7A5E", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8, fontFamily: font }}>Your intention: {choice.label}</div>
            <div style={{ fontFamily: serif, fontSize: 22, fontStyle: "italic", color: "#2D4A35", lineHeight: 1.45, marginBottom: 10 }}>"{choice.anchor}"</div>
            <div style={{ fontSize: 12, color: "rgba(58,46,40,0.5)", fontFamily: font }}>{choice.sub}</div>
          </div>
          <button onClick={carry} style={{ background: "#2D4A35", color: "white", borderRadius: 16, padding: 15, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none" }}>
            I'm carrying this into my session
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: "rgba(58,46,40,0.4)", cursor: "pointer", textAlign: "center" }}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // ── INTENTION step 0 (picker) ──
  return (
    <div style={container}>
      <Header subtitle="Before you begin" onSkip={onClose} />
      <div style={{ padding: "0 20px 16px", fontFamily: serif, fontSize: 22, color: "#2D4A35", lineHeight: 1.4, fontStyle: "italic", marginTop: 8 }}>
        How do you want to show up for your families today?
      </div>
      <div style={{ padding: "0 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {INTENTIONS.map(int => (
          <button key={int.id} onClick={() => pickAndAdvance(int)} style={{
            background: "white", border: "1.5px solid rgba(184,146,74,0.2)", borderRadius: 16,
            padding: "16px 14px", cursor: "pointer", textAlign: "center",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(92,122,94,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "white"}
          >
            <div style={{ fontSize: 26, marginBottom: 8 }}>{int.emoji}</div>
            <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: "#3A2E28" }}>{int.label}</div>
            <div style={{ fontFamily: font, fontSize: 10, color: "rgba(58,46,40,0.5)", marginTop: 4, lineHeight: 1.4 }}>{int.sub}</div>
          </button>
        ))}
      </div>
      <button onClick={() => setVariant("grounding")} style={{ textAlign: "center", fontFamily: font, fontSize: 12, color: "#5C7A5E", fontWeight: 600, cursor: "pointer", background: "none", border: "none", padding: "8px 20px" }}>
        Show me a grounding option instead →
      </button>
      <button onClick={onClose} style={{ textAlign: "center", fontFamily: font, fontSize: 12, color: "rgba(58,46,40,0.4)", cursor: "pointer", background: "none", border: "none", padding: "6px 20px" }}>
        Skip morning moment
      </button>
    </div>
  );
}
