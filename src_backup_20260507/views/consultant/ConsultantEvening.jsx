// src/views/consultant/ConsultantEvening.jsx
// Consultant Session Close — end-of-session debrief ritual.
// Mirrors parent EveningClose aesthetic exactly (same dark forest BG, EC tokens,
// same gold, same serif, same step pattern) but copy is consultant-work-oriented.
// Saves to consultant_checkins with source="session_close".

import { useState } from "react";
import { useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

// ─── ALWAYS DARK — exact same tokens as parent EveningClose ──────────────────
const EC = {
  bg:      "linear-gradient(160deg,#1E2B1A 0%,#2C3B24 40%,#1A2318 100%)",
  text:    "rgba(245,237,214,0.88)",
  muted:   "rgba(245,237,214,0.5)",
  dim:     "rgba(245,237,214,0.3)",
  card:    "rgba(255,255,255,0.07)",
  border:  "rgba(255,255,255,0.10)",
  gold:    "#C9A84C",
  goldDim: "rgba(201,168,76,0.18)",
};

// ─── CONSULTANT-SPECIFIC QUESTIONS ───────────────────────────────────────────
const QUESTIONS = [
  {
    id: "q1", step: 1,
    prompt: "How did your nervous system hold up today?",
    sub: "Not how productive you were — how you actually felt.",
    options: [
      { id: "tight",    emoji: "🪨", label: "Tight and reactive"   },
      { id: "tired",    emoji: "🌊", label: "Drained and depleted"  },
      { id: "okay",     emoji: "🌿", label: "Okay, mostly steady"   },
      { id: "grounded", emoji: "🌲", label: "Regulated throughout"  },
    ],
  },
  {
    id: "q2", step: 2,
    prompt: "What was the hardest case or moment today?",
    sub: "You don't have to solve it tonight. Just name it.",
    options: [
      { id: "distress",   emoji: "💔", label: "A distressed parent"          },
      { id: "complexity", emoji: "🔄", label: "A case I couldn't figure out"  },
      { id: "boundary",   emoji: "⚡", label: "My own boundary was tested"    },
      { id: "outcome",    emoji: "😔", label: "A family that didn't improve"   },
      { id: "admin",      emoji: "📋", label: "Admin and logistics stress"     },
      { id: "nothing",    emoji: "✨", label: "Nothing stood out"              },
    ],
  },
  {
    id: "q3", step: 3,
    prompt: "What went well — even one small thing?",
    sub: "It counts even if the day was hard.",
    options: [
      { id: "connection",  emoji: "🤝", label: "I connected with a family"       },
      { id: "clarity",     emoji: "✦",  label: "My thinking was sharp today"     },
      { id: "message",     emoji: "💬", label: "I sent a message that landed"    },
      { id: "improvement", emoji: "🌱", label: "A family made real progress"     },
      { id: "boundary",    emoji: "🪨", label: "I held a boundary well"          },
    ],
  },
  {
    id: "q4", step: 4,
    prompt: "What do you want to leave at work tonight?",
    sub: "You can't carry every family home with you.",
    options: [
      { id: "worry",    emoji: "🌀", label: "Worrying about a family"        },
      { id: "guilt",    emoji: "😔", label: "Guilt about my response"        },
      { id: "unsolved", emoji: "❓", label: "A case I didn't resolve"        },
      { id: "standard", emoji: "📏", label: "The standard I didn't meet"     },
      { id: "nothing",  emoji: "🌙", label: "I'm clear — nothing to release" },
    ],
  },
];

const REFLECTIONS = {
  tight:      "Reactivity is information. It tells you what mattered most today.",
  tired:      "Depleted means you gave. Tomorrow you can give from a fuller place.",
  okay:       "Steady enough is exactly enough.",
  grounded:   "That regulated presence is exactly what your families needed.",
  distress:   "Holding a parent's distress is some of the most demanding work there is.",
  complexity: "Not every case resolves cleanly. Sitting with uncertainty is a clinical skill.",
  boundary:   "Noticing a boundary was tested is the first step to holding it better next time.",
  outcome:    "Sleep is nonlinear. Your care is not measured in one family's timeline.",
  admin:      "The logistics are real. They also don't define your clinical work.",
  nothing:    "A calm session is still a session worth closing out well.",
  worry:      "Tonight isn't the time to solve it. Fresh eyes tomorrow will serve them better.",
  guilt:      "Reflection and rumination are different things. You've reflected. Now rest.",
  unsolved:   "Unresolved isn't failure. It's where tomorrow's work begins.",
  standard:   "The standard you missed today isn't the measure of who you are as a consultant.",
};

// ─── SHARED PIECES ────────────────────────────────────────────────────────────
function ECHeader({ onSkip }) {
  return (
    <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontFamily: font, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: EC.dim, fontWeight: 600 }}>
        Session Close
      </div>
      <button onClick={onSkip} style={{ background: "none", border: "none", color: EC.dim, cursor: "pointer", padding: 4, fontSize: 16 }}>✕</button>
    </div>
  );
}

function OptionCard({ opt, selected, onSelect }) {
  return (
    <button onClick={onSelect} style={{
      background: selected ? EC.goldDim : EC.card,
      border: `1.5px solid ${selected ? EC.gold : EC.border}`,
      borderRadius: 13, padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 12,
      cursor: "pointer", textAlign: "left", width: "100%",
      marginBottom: 8, transition: "all 0.18s",
    }}>
      <span style={{ fontSize: 20 }}>{opt.emoji}</span>
      <span style={{ fontFamily: font, fontSize: 13, color: selected ? EC.text : EC.muted, fontWeight: selected ? 600 : 400 }}>
        {opt.label}
      </span>
      {selected && <span style={{ marginLeft: "auto", color: EC.gold, fontSize: 14 }}>✓</span>}
    </button>
  );
}

function IntroScreen({ onStart, onSkip }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", gap: 20 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🌙</div>
        <div style={{ fontFamily: serif, fontSize: 28, color: EC.text, lineHeight: 1.35, fontStyle: "italic", marginBottom: 8 }}>
          Close the<br />session well.
        </div>
        <div style={{ fontFamily: font, fontSize: 13, color: EC.muted, lineHeight: 1.5 }}>
          4 questions. Less than 2 minutes.<br />Then leave work at work.
        </div>
      </div>
      <div style={{ background: EC.card, borderRadius: 14, padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(245,237,214,0.15)" }} />
          ))}
        </div>
        <div style={{ fontFamily: font, fontSize: 11, color: EC.dim, lineHeight: 1.6 }}>
          Your nervous system · Hardest moment · What went well · What to release
        </div>
      </div>
      <button onClick={onStart} style={{
        background: EC.gold, color: "#2D4A35", borderRadius: 16,
        padding: 15, fontFamily: font, fontSize: 14, fontWeight: 700,
        cursor: "pointer", border: "none",
      }}>
        Start Session Close
      </button>
      <button onClick={onSkip} style={{
        background: "none", border: "none", fontFamily: font,
        fontSize: 12, color: EC.dim, cursor: "pointer", textAlign: "center",
      }}>
        Skip for tonight
      </button>
    </div>
  );
}

function QuestionScreen({ q, step, selected, onSelect, onNext, onSkip }) {
  const pct = ((step - 1) / 4) * 100;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 40 }}>
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: EC.gold, borderRadius: 2, transition: "width 0.4s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <div style={{ fontFamily: font, fontSize: 9, color: EC.dim, letterSpacing: ".08em", textTransform: "uppercase" }}>
            Question {step} of 4
          </div>
          <button onClick={onSkip} style={{ fontFamily: font, fontSize: 9, color: EC.dim, background: "none", border: "none", cursor: "pointer" }}>
            Skip →
          </button>
        </div>
      </div>

      <div style={{ padding: "0 22px 20px" }}>
        <div style={{ fontFamily: serif, fontSize: 22, color: EC.text, lineHeight: 1.4, fontStyle: "italic", marginBottom: 6 }}>{q.prompt}</div>
        <div style={{ fontFamily: font, fontSize: 12, color: EC.muted }}>{q.sub}</div>
      </div>

      <div style={{ padding: "0 20px", flex: 1 }}>
        {q.options.map(opt => (
          <OptionCard key={opt.id} opt={opt} selected={selected === opt.id} onSelect={() => onSelect(opt.id)} />
        ))}
      </div>

      {selected && REFLECTIONS[selected] && (
        <div style={{ margin: "12px 20px 0", background: EC.card, borderLeft: `3px solid ${EC.gold}`, borderRadius: "0 12px 12px 0", padding: "10px 14px" }}>
          <div style={{ fontFamily: font, fontSize: 12, color: EC.muted, fontStyle: "italic", lineHeight: 1.55 }}>
            {REFLECTIONS[selected]}
          </div>
        </div>
      )}

      {selected && (
        <div style={{ padding: "16px 20px 0" }}>
          <button onClick={onNext} style={{
            width: "100%", background: EC.gold, color: "#2D4A35",
            borderRadius: 16, padding: 14, fontFamily: font,
            fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none",
          }}>
            {step === 4 ? "Close my session →" : "Continue →"}
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryScreen({ answers, onClose }) {
  const releaseText = REFLECTIONS[answers.q4] || "You closed the session well. Rest now.";
  const lines = [
    { label: "Your NS",      opt: QUESTIONS[0].options.find(o => o.id === answers.q1) },
    { label: "Hard moment",  opt: QUESTIONS[1].options.find(o => o.id === answers.q2) },
    { label: "Went well",    opt: QUESTIONS[2].options.find(o => o.id === answers.q3) },
    { label: "Releasing",    opt: QUESTIONS[3].options.find(o => o.id === answers.q4) },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 24px 48px" }}>
      <div style={{ fontSize: 42, margin: "20px 0 10px", textAlign: "center" }}>🌙</div>
      <div style={{ fontFamily: serif, fontSize: 26, color: EC.text, fontStyle: "italic", textAlign: "center", lineHeight: 1.4, marginBottom: 6 }}>
        Session closed.
      </div>
      <div style={{ fontFamily: font, fontSize: 12, color: EC.muted, textAlign: "center", marginBottom: 24 }}>
        Your families are okay. You can be offline now.
      </div>

      <div style={{ background: EC.card, borderRadius: 20, padding: 18, width: "100%", marginBottom: 16 }}>
        <div style={{ fontFamily: font, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: EC.dim, marginBottom: 12 }}>This session in brief</div>
        {lines.map(({ label, opt }) => (
          <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 9 }}>
            <div style={{ fontFamily: font, fontSize: 10, color: EC.dim, textTransform: "uppercase", letterSpacing: ".07em", width: 88, flexShrink: 0, paddingTop: 2 }}>{label}</div>
            <div style={{ fontFamily: font, fontSize: 13, color: EC.muted }}>{opt ? `${opt.emoji} ${opt.label}` : "—"}</div>
          </div>
        ))}
      </div>

      <div style={{ background: EC.goldDim, border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 16, padding: "16px 18px", width: "100%", marginBottom: 20 }}>
        <div style={{ fontFamily: font, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: EC.gold, marginBottom: 6 }}>Leave this here</div>
        <div style={{ fontFamily: serif, fontSize: 15, fontStyle: "italic", color: "rgba(245,237,214,0.85)", lineHeight: 1.55 }}>"{releaseText}"</div>
      </div>

      <button onClick={onClose} style={{
        background: EC.gold, color: "#2D4A35", borderRadius: 16,
        padding: 14, fontFamily: font, fontSize: 14, fontWeight: 700,
        cursor: "pointer", border: "none", width: "100%",
      }}>
        Goodnight ✦
      </button>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export function ConsultantEvening({ onClose }) {
  const { currentUser } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const q = QUESTIONS.find(q => q.step === step);

  async function saveReflection(finalAnswers) {
    if (!currentUser?.id) return;
    try {
      await supabase.from("consultant_checkins").insert({
        consultant_id: currentUser.id,
        arrival_state: `close_${finalAnswers.q1 || "completed"}`,
        is_regulated: finalAnswers.q1 === "grounded" || finalAnswers.q1 === "okay",
        source: "session_close",
        created_at: new Date().toISOString(),
      });
    } catch { /* silent */ }
  }

  function selectOption(qId, optId) {
    setAnswers(prev => ({ ...prev, [qId]: optId }));
  }

  function advanceStep() {
    const next = step + 1;
    if (next > 4) {
      saveReflection(answers);
      setStep(5);
    } else {
      setStep(next);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: EC.bg,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      <ECHeader onSkip={onClose} />
      {step === 0 && <IntroScreen onStart={() => setStep(1)} onSkip={onClose} />}
      {step >= 1 && step <= 4 && q && (
        <QuestionScreen
          q={q} step={step}
          selected={answers[q.id]}
          onSelect={id => selectOption(q.id, id)}
          onNext={advanceStep}
          onSkip={advanceStep}
        />
      )}
      {step === 5 && <SummaryScreen answers={answers} onClose={onClose} />}
    </div>
  );
}
