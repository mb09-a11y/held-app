// src/views/parent/MorningMoment.jsx
// Morning Moment — full screen overlay.
// Intention variant (2×2 grid) or Grounding variant (body-based list).
// Saves chosen intention to regulation_checkins with source="morning_moment".

import { useState } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

const INTENTIONS = [
  { id: "steady",    emoji: "🌲", label: "Steady",    anchor: "I can hold steady even when it's hard.",               sub: "Grounded in the chaos."           },
  { id: "connected", emoji: "🤝", label: "Connected", anchor: "I am present with my child today.",                    sub: "Here, not just nearby."           },
  { id: "gentle",    emoji: "🌿", label: "Gentle",    anchor: "I lead with softness — with myself and with them.",    sub: "Gentle is a strength."            },
  { id: "patient",   emoji: "🕊", label: "Patient",   anchor: "I have more capacity than I think.",                   sub: "One moment at a time."            },
];

const GROUNDS = [
  { id: "shoulders", emoji: "🫁", label: "Drop my shoulders",               cue: "Breathe in, lift them to your ears — then let everything fall on the exhale." },
  { id: "exhale",    emoji: "💨", label: "Take one long exhale",             cue: "Breathe in for 4, out for 7. That exhale activates your vagus nerve."         },
  { id: "anchor",    emoji: "📖", label: "Read an anchor statement",         cue: "\"I don't have to be perfect to be exactly what they need.\""                 },
  { id: "visual",    emoji: "🌅", label: "Do a 10-second visualization",     cue: "Close your eyes. Picture one moment of connection you want to create today."  },
];

const BG = "linear-gradient(155deg, #F4EDE0 0%, #E8DDD0 50%, #F0E8DA 100%)";

function MorningHeader({ subtitle, onSkip, T }) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return (
    <div style={{ padding: "14px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(58,46,40,0.4)", fontWeight: 600, fontFamily: font }}>{greeting}</div>
        <div style={{ fontFamily: serif, fontSize: 24, color: T.headingText }}>{subtitle}</div>
      </div>
      <button onClick={onSkip} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: "rgba(58,46,40,0.4)", cursor: "pointer", padding: "6px" }}>
        Skip
      </button>
    </div>
  );
}

export function MorningMoment({ onClose }) {
  const T = useT();
  const { currentUser, activeFamily } = useApp();
  const [step, setStep] = useState(0);
  const [variant, setVariant] = useState("intention");
  const [choice, setChoice] = useState(null);

  async function saveIntention(label) {
    if (!currentUser?.id || !activeFamily?.id) return;
    try {
      await supabase.from("regulation_checkins").insert({
        user_id: currentUser.id,
        family_id: activeFamily.id,
        state: "Regulated", // morning moment = regulated moment; intention stored in metadata
        source: "morning_moment",
        metadata: { choice_id: choice?.id, anchor: choice?.anchor, cue: choice?.cue },
        checked_in_at: new Date().toISOString(),
      });
    } catch { /* silent */ }
  }

  function handleIntentionPick(int) {
    setChoice(int);
    setStep(1);
  }

  function handleGroundPick(g) {
    setChoice(g);
    setStep(1);
  }

  function handleCarry() {
    if (choice) saveIntention(choice.label);
    setStep(2);
  }

  const container = {
    position: "fixed", inset: 0, zIndex: 300,
    background: BG,
    display: "flex", flexDirection: "column",
    overflowY: "auto",
    paddingBottom: 32,
  };

  // ── COMPLETION ──
  if (step === 2) {
    const item = choice;
    return (
      <div style={{ ...container, alignItems: "center", justifyContent: "center", padding: "32px 24px", textAlign: "center", gap: 20 }}>
        <div style={{ width: 62, height: 62, borderRadius: "50%", background: "#5C7A5E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "white" }}>✓</div>
        <div style={{ fontFamily: serif, fontSize: 24, fontStyle: "italic", color: T.headingText, lineHeight: 1.4 }}>
          You're carrying<br />{item?.emoji} {item?.label} with you.
        </div>
        <div style={{ background: "white", borderRadius: 18, padding: 20, width: "100%", boxShadow: "0 4px 20px rgba(90,70,60,0.10)" }}>
          <div style={{ fontSize: 10, color: "rgba(58,46,40,0.4)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8, fontFamily: font }}>Your anchor today</div>
          <div style={{ fontFamily: serif, fontSize: 17, fontStyle: "italic", color: T.headingText, lineHeight: 1.5 }}>
            {item?.anchor || item?.cue || "You showed up."}
          </div>
        </div>
        <div style={{ fontFamily: font, fontSize: 12, color: "rgba(58,46,40,0.55)", lineHeight: 1.6, maxWidth: 280 }}>
          When things get hard today, come back to this.
        </div>
        <button onClick={onClose} style={{
          background: T.bark, color: "white", borderRadius: 16,
          padding: "14px 32px", fontFamily: font, fontSize: 14,
          fontWeight: 600, cursor: "pointer", border: "none", width: "100%",
        }}>
          Start my day
        </button>
      </div>
    );
  }

  // ── GROUNDING: step 1 (cue card) ──
  if (variant === "grounding" && step === 1 && choice) {
    return (
      <div style={container}>
        <MorningHeader subtitle="Take a moment" onSkip={onClose} T={T} />
        <div style={{ flex: 1, padding: "0 20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, marginTop: 20 }}>
          <div style={{ background: "white", borderRadius: 22, padding: "26px 22px", boxShadow: "0 4px 20px rgba(90,70,60,0.10)", textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>{choice.emoji}</div>
            <div style={{ fontSize: 10, color: "#5C7A5E", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8, fontFamily: font }}>{choice.label}</div>
            <div style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: T.headingText, lineHeight: 1.55 }}>"{choice.cue}"</div>
          </div>
          <div style={{ background: "rgba(92,122,94,0.08)", borderRadius: 18, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#5C7A5E", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6, fontFamily: font }}>Take 10 seconds</div>
            <div style={{ fontSize: 13, color: "rgba(58,46,40,0.6)", lineHeight: 1.5, fontFamily: font }}>Set this down and actually do it.<br />I'll be right here.</div>
          </div>
          <button onClick={handleCarry} style={{ background: T.bark, color: "white", borderRadius: 16, padding: 15, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none" }}>
            Done — I'm carrying this with me
          </button>
          <button onClick={() => { setStep(0); setChoice(null); }} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: "rgba(58,46,40,0.4)", cursor: "pointer", textAlign: "center" }}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── GROUNDING: step 0 (picker) ──
  if (variant === "grounding" && step === 0) {
    return (
      <div style={container}>
        <MorningHeader subtitle="Ground yourself first" onSkip={onClose} T={T} />
        <div style={{ padding: "0 20px 16px", fontFamily: serif, fontSize: 20, color: T.headingText, lineHeight: 1.4, fontStyle: "italic", marginTop: 8 }}>
          Pick one thing to do for your body right now.
        </div>
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {GROUNDS.map(g => (
            <button key={g.id} onClick={() => handleGroundPick(g)} style={{
              background: "white", border: "1.5px solid rgba(184,146,74,0.2)", borderRadius: 14,
              padding: "13px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              transition: "all 0.18s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(92,122,94,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "white"}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{g.emoji}</span>
              <span style={{ fontFamily: font, fontSize: 13, fontWeight: 500, color: T.text }}>{g.label}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(58,46,40,0.3)" }}>→</span>
            </button>
          ))}
        </div>
        <button onClick={() => setVariant("intention")} style={{ textAlign: "center", fontFamily: font, fontSize: 12, color: "#5C7A5E", fontWeight: 600, cursor: "pointer", background: "none", border: "none", padding: "8px 20px" }}>
          ← Back to intention options
        </button>
      </div>
    );
  }

  // ── INTENTION: step 1 (anchor card) ──
  if (variant === "intention" && step === 1 && choice) {
    return (
      <div style={container}>
        <MorningHeader subtitle="Carry this with you" onSkip={onClose} T={T} />
        <div style={{ flex: 1, padding: "0 20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, marginTop: 20 }}>
          <div style={{ background: "white", borderRadius: 22, padding: "26px 22px", boxShadow: "0 4px 20px rgba(90,70,60,0.10)", textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>{choice.emoji}</div>
            <div style={{ fontSize: 10, color: "#5C7A5E", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8, fontFamily: font }}>Your intention: {choice.label}</div>
            <div style={{ fontFamily: serif, fontSize: 22, fontStyle: "italic", color: T.headingText, lineHeight: 1.45, marginBottom: 10 }}>"{choice.anchor}"</div>
            <div style={{ fontSize: 12, color: "rgba(58,46,40,0.5)", fontFamily: font }}>{choice.sub}</div>
          </div>
          <button onClick={handleCarry} style={{ background: T.bark, color: "white", borderRadius: 16, padding: 15, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none" }}>
            I'm carrying this with me today
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: "rgba(58,46,40,0.4)", cursor: "pointer", textAlign: "center" }}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // ── INTENTION: step 0 (picker) ──
  return (
    <div style={container}>
      <MorningHeader subtitle="Good morning" onSkip={onClose} T={T} />
      <div style={{ padding: "0 20px 16px", fontFamily: serif, fontSize: 22, color: T.headingText, lineHeight: 1.4, fontStyle: "italic", marginTop: 8 }}>
        What do you want to carry into today?
      </div>
      <div style={{ padding: "0 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {INTENTIONS.map(int => (
          <button key={int.id} onClick={() => handleIntentionPick(int)} style={{
            background: "white", border: "1.5px solid rgba(184,146,74,0.2)", borderRadius: 16,
            padding: "16px 14px", cursor: "pointer", textAlign: "center",
            transition: "all 0.18s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(92,122,94,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "white"}
          >
            <div style={{ fontSize: 26, marginBottom: 8 }}>{int.emoji}</div>
            <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text }}>{int.label}</div>
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
