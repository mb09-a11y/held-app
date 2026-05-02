// src/modules/nscheckin/NSCheckinFlow.jsx
// Held-style NS check-in — full screen overlay.
// 3 steps: Feeling picker → Body check (I don't know path) → Result + Reset
// Saves to regulation_checkins on completion (same schema as before).

import { useState } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const FEELINGS = [
  { id: "Fight",    emoji: "🔥", label: "On edge / snapping easily"  },
  { id: "Flight",   emoji: "😰", label: "Anxious / restless"          },
  { id: "Shutdown", emoji: "🪨", label: "Shut down / checked out"     },
  { id: "Freeze",   emoji: "😶‍🌫️", label: "Exhausted and done"       },
  { id: "Steady",   emoji: "🌿", label: "Steady / holding together"  },
  { id: "Off",      emoji: "🤔", label: "I just feel off"             },
];

const BODY_QUESTIONS = [
  {
    id: "breath",
    question: "Are you holding your breath, or breathing normally?",
    options: [
      { id: "shallow", label: "Holding my breath / shallow",       signals: ["Fight","Flight"] },
      { id: "normal",  label: "Breathing pretty normally",         signals: ["Freeze","Shutdown"] },
    ],
  },
  {
    id: "tension",
    question: "Does your body feel tense, or heavy?",
    options: [
      { id: "tense",  label: "Tense — like I can't unwind",        signals: ["Fight","Flight"] },
      { id: "heavy",  label: "Heavy — like I have nothing left",   signals: ["Freeze","Shutdown"] },
    ],
  },
  {
    id: "urge",
    question: "Do you want to move around, or disappear?",
    options: [
      { id: "move",      label: "Move — I feel restless and wired",  signals: ["Fight","Flight"] },
      { id: "disappear", label: "Disappear — I want to hide a bit",  signals: ["Freeze","Shutdown"] },
    ],
  },
];

const RESULTS = {
  Fight: {
    label: "Your system is activated",
    color: "#C07070",
    insight: "Your body is in protection mode right now. That's not a character flaw — that's a nervous system doing exactly what it was built to do when things feel unsafe or out of control.",
    reset: ["Exhale longer than you inhale.", "Drop your shoulders and unclench your jaw.", "Press your feet flat into the floor."],
    action: "Lower your voice by one notch before you speak. That's it. One notch.",
    cta: "That's enough. →",
    from: "Activated", to: "Steadier",
    headline: "You caught it before it escalated.",
    sub: "Week by week, this becomes a language you speak fluently. You're already speaking it.",
  },
  Flight: {
    label: "Your system is anxious",
    color: "#A89B5A",
    insight: "Anxiety is your nervous system scanning for danger and finding it everywhere. The feeling is real even when the threat isn't immediate. Your body is trying to keep you safe.",
    reset: ["Look around slowly and name what you see.", "Exhale longer than you inhale.", "Press your feet into the ground."],
    action: "Name 3 things you can see right now. Slowly. That's the whole practice.",
    cta: "That's enough. →",
    from: "Anxious", to: "Grounded",
    headline: "You oriented. That's the nervous system tool.",
    sub: "You're learning how to come back.",
  },
  Freeze: {
    label: "Your system is frozen",
    color: "#7B8FAA",
    insight: "Freeze is the body's third option after fight and flight — when the system concludes neither will work. It's a protective state, not a failure state. Gentle movement helps more than pressure.",
    reset: ["Gentle shoulder rolls — both directions.", "Exhale slowly, then hum softly on the exhale.", "Wiggle your fingers and toes."],
    action: "One very small movement. Stand up. Walk to the window. That's enough to shift the state.",
    cta: "Start with one thing. →",
    from: "Frozen", to: "Moving",
    headline: "Movement is the medicine.",
    sub: "You're coming back faster now.",
  },
  Shutdown: {
    label: "Your system is in shutdown",
    color: "#8A7BAA",
    insight: "Shutdown is the body saying it's had enough. It's a protective response to prolonged overwhelm. You're not broken — you're depleted. Rest is the only right response here.",
    reset: ["Exhale slowly. Don't force anything.", "Warmth helps — a warm drink, a blanket, a hand on your own chest.", "No action required right now."],
    action: "Lower your expectations for the next 10 minutes. Not forever. Just right now.",
    cta: "That's enough. →",
    from: "Shutdown", to: "Back online",
    headline: "You chose to resource yourself.",
    sub: "That's the whole regulation practice.",
  },
  Steady: {
    label: "You're holding together",
    color: "#7BAA8A",
    insight: "Steady doesn't mean easy — it means your system is coping. That's real. The regulation work you've been doing is showing up in moments like this one.",
    reset: ["One slow breath — just to anchor.", "Notice what's feeling okay right now.", "You don't need to fix anything."],
    action: "Carry this forward. Steady is contagious — your child's nervous system will feel it.",
    cta: "I've got this. →",
    from: "Holding on", to: "Steady",
    headline: "You showed up regulated.",
    sub: "Your calm is the anchor. They feel it.",
  },
  Stretched: {
    label: "Your system is a little overloaded",
    color: "#B8924A",
    insight: "Your capacity is just a bit maxed right now. That makes complete sense — you're carrying a lot. Not broken. Not failing. Just full. We can work with this.",
    reset: ["Exhale longer than you inhale.", "Press your feet into the ground.", "Name 3 things you can see right now."],
    action: "Lower your expectations for the next 10 minutes. Not forever. Just right now.",
    cta: "That's enough. →",
    from: "Maxed out", to: "Back online",
    headline: "You stayed connected instead of correcting.",
    sub: "Week by week, this becomes a language you speak fluently. You're already speaking it.",
  },
};

function deriveStateFromBody(answers) {
  const signals = answers.flatMap(a => a?.signals ?? []);
  const counts = signals.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return dominant ? dominant[0] : "Stretched";
}

// ─── HEADER BACK BUTTON ───────────────────────────────────────────────────────
function BackBtn({ onClick, T }) {
  return (
    <button onClick={onClick} style={{
      width: 38, height: 38, borderRadius: "50%",
      background: T.faint, border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: T.muted, fontSize: 16, flexShrink: 0,
    }}>
      ←
    </button>
  );
}

// ─── STEP 1: PULSE ────────────────────────────────────────────────────────────
function StepPulse({ onSelect, onDontKnow, onClose, T }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <BackBtn onClick={onClose} T={T} />
        <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: T.teal }}>
          NS Check-In
        </div>
      </div>

      <h2 style={{ fontFamily: serif, fontSize: 26, color: T.headingText, lineHeight: 1.25, marginBottom: 6 }}>
        How is your nervous system right now?
      </h2>
      <p style={{ fontFamily: font, fontSize: 13.5, color: T.muted, marginBottom: 24 }}>
        Choose what feels closest.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {FEELINGS.map(f => (
          <button key={f.id} onClick={() => onSelect(f.state ?? f.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "flex-start",
            gap: 8, padding: "14px 14px",
            borderRadius: 14, border: `1px solid ${T.border}`,
            background: T.card, cursor: "pointer", textAlign: "left",
            transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.teal; e.currentTarget.style.background = `${T.teal}0a`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}
          >
            <span style={{ fontSize: 24 }}>{f.emoji}</span>
            <span style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.4 }}>{f.label}</span>
          </button>
        ))}
      </div>

      <button onClick={onDontKnow} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        width: "100%", padding: "14px 20px", borderRadius: 16,
        border: "none", background: T.teal, color: "#fff",
        fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>
        <span style={{ fontSize: 18 }}>💭</span>
        I don't know — help me figure it out
      </button>
    </div>
  );
}

// ─── STEP 2: BODY CHECK ───────────────────────────────────────────────────────
function StepBodyCheck({ onResult, onBack, T }) {
  const [answers, setAnswers] = useState([null, null, null]);
  const allAnswered = answers.every(a => a !== null);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <BackBtn onClick={onBack} T={T} />
        <div style={{ fontFamily: serif, fontSize: 18, color: T.headingText, fontStyle: "italic" }}>
          Let's figure it out together
        </div>
      </div>
      <p style={{ fontFamily: font, fontSize: 13, color: T.muted, marginBottom: 28 }}>
        No typing needed. Just tap.
      </p>

      {BODY_QUESTIONS.map((q, qIdx) => (
        <div key={q.id} style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: serif, fontSize: 17, color: T.headingText, lineHeight: 1.4, marginBottom: 12 }}>
            {q.question}
          </p>
          {q.options.map(opt => {
            const selected = answers[qIdx]?.id === opt.id;
            return (
              <button key={opt.id} onClick={() => {
                const next = [...answers]; next[qIdx] = opt; setAnswers(next);
              }} style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "13px 16px", marginBottom: 8, borderRadius: 14,
                border: `1.5px solid ${selected ? T.teal : T.border}`,
                background: selected ? `${T.teal}12` : T.card,
                fontFamily: font, fontSize: 13.5,
                color: selected ? T.teal : T.text,
                fontWeight: selected ? 600 : 400,
                cursor: "pointer", transition: "all .15s",
              }}>
                {opt.label}
              </button>
            );
          })}
        </div>
      ))}

      <button
        onClick={() => allAnswered && onResult(deriveStateFromBody(answers))}
        disabled={!allAnswered}
        style={{
          width: "100%", padding: "14px", borderRadius: 16,
          border: "none",
          background: allAnswered ? T.teal : T.faint,
          color: allAnswered ? "#fff" : T.muted,
          fontFamily: font, fontSize: 14, fontWeight: 600,
          cursor: allAnswered ? "pointer" : "default",
          transition: "all .2s",
        }}
      >
        See what your body is telling you →
      </button>
    </div>
  );
}

// ─── STEP 3: RESULT ───────────────────────────────────────────────────────────
function StepResult({ state, onClose, onBack, T }) {
  const r = RESULTS[state] ?? RESULTS.Stretched;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <BackBtn onClick={onBack} T={T} />
        <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText }}>Ahh. Got it.</div>
      </div>

      {/* State label */}
      <div style={{
        alignSelf: "flex-start", padding: "6px 14px", borderRadius: 20, marginBottom: 16,
        border: `1.5px solid ${r.color}`,
        fontFamily: font, fontSize: 13, fontWeight: 600, color: r.color,
      }}>
        {r.label}
      </div>

      {/* Insight */}
      <div style={{ borderRadius: 16, padding: "16px 18px", marginBottom: 10, background: T.card, border: `1px solid ${T.border}` }}>
        <p style={{ fontFamily: serif, fontSize: 15.5, fontStyle: "italic", color: T.text, lineHeight: 1.65, marginBottom: 8 }}>
          "{r.insight}"
        </p>
        <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.55, margin: 0 }}>
          Not broken. Not failing. Just full. We can work with this.
        </p>
      </div>

      {/* 10-second reset */}
      <div style={{ borderRadius: 16, padding: "16px 18px", marginBottom: 10, background: T.card, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: T.warm, fontFamily: font, fontWeight: 700, marginBottom: 12 }}>
          10-second reset
        </div>
        {r.reset.map((s, i) => (
          <div key={i} style={{ fontFamily: font, fontSize: 14, color: T.text, lineHeight: 1.65, marginBottom: 3 }}>{s}</div>
        ))}
      </div>

      {/* One action */}
      <div style={{ borderRadius: 16, padding: "16px 18px", marginBottom: 10, background: T.card, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: T.teal, fontFamily: font, fontWeight: 700, marginBottom: 10 }}>
          One action
        </div>
        <p style={{ fontFamily: font, fontSize: 14, color: T.text, lineHeight: 1.65, marginBottom: 14 }}>
          {r.action}
        </p>
        <button onClick={onClose} style={{
          padding: "10px 20px", borderRadius: 24,
          border: "none", background: T.teal, color: "#fff",
          fontFamily: font, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        }}>
          {r.cta}
        </button>
      </div>

      {/* State shift */}
      <div style={{
        borderRadius: 16, padding: "18px 20px",
        background: `${T.teal}12`, border: `1px solid ${T.teal}25`,
      }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: T.teal, fontFamily: font, fontWeight: 700, marginBottom: 12 }}>
          What just happened
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          {[
            { label: r.from, filled: false },
            { label: "→", arrow: true },
            { label: r.to, filled: true },
          ].map((item, i) => item.arrow ? (
            <span key={i} style={{ color: T.muted, fontSize: 16 }}>→</span>
          ) : (
            <div key={i} style={{
              padding: "5px 12px", borderRadius: 20,
              background: item.filled ? T.teal : T.faint,
              border: `1px solid ${item.filled ? T.teal : T.border}`,
              fontFamily: font, fontSize: 12.5,
              fontWeight: item.filled ? 600 : 400,
              color: item.filled ? "#fff" : T.muted,
            }}>{item.label}</div>
          ))}
        </div>
        <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: T.headingText, lineHeight: 1.4, marginBottom: 6 }}>
          {r.headline}
        </p>
        <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.55, margin: 0 }}>
          {r.sub}
        </p>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export function NSCheckinFlow({ onClose, onCheckinSaved }) {
  const T = useT();
  const { currentUser, activeFamily } = useApp();
  const [step, setStep] = useState("pulse");
  const [selectedState, setSelectedState] = useState(null);

  async function saveCheckin(state) {
    if (!currentUser?.id || !activeFamily?.id) {
      console.warn("[NSCheckinFlow] Missing user or family ID — skipping save", { userId: currentUser?.id, familyId: activeFamily?.id });
      return;
    }
    try {
      const { error } = await supabase.from("regulation_checkins").insert({
        user_id: currentUser.id,
        family_id: activeFamily.id,
        type: new Date().getHours() < 12 ? "am" : "pm",
        state,
        source: "ns_checkin",
        checked_in_at: new Date().toISOString(),
      });
      if (error) {
        console.error("[NSCheckinFlow] Insert failed:", error);
      } else {
        onCheckinSaved?.();
      }
    } catch (err) {
      console.error("[NSCheckinFlow] Unexpected error:", err);
    }
  }

  function handleSelectState(state) {
    setSelectedState(state);
    saveCheckin(state);
    setStep("result");
  }

  function handleBodyResult(state) {
    setSelectedState(state);
    saveCheckin(state);
    setStep("result");
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: T.bg,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
      padding: "env(safe-area-inset-top, 20px) 20px 0",
    }}>
      {step === "pulse" && (
        <StepPulse onSelect={handleSelectState} onDontKnow={() => setStep("body")} onClose={onClose} T={T} />
      )}
      {step === "body" && (
        <StepBodyCheck onResult={handleBodyResult} onBack={() => setStep("pulse")} T={T} />
      )}
      {step === "result" && selectedState && (
        <StepResult state={selectedState} onClose={onClose} onBack={() => setStep("pulse")} T={T} />
      )}
    </div>
  );
}
