// src/views/parent/EveningClose.jsx
// Evening Close — always dark forest/gold gradient, ignores app theme.
// 5 steps: Intro → Q1 → Q2 → Q3 → Q4 → Summary
// Saves each answer to regulation_checkins with source="evening_close".

import { useState } from "react";
import { useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

// ─── ALWAYS DARK — not theme-dependent ──────────────────────────────────────
const EC = {
  bg:      "linear-gradient(160deg,#1E2B1A 0%,#2C3B24 40%,#1A2318 100%)",
  text:    "rgba(245,237,214,0.88)",
  muted:   "rgba(245,237,214,0.5)",
  dim:     "rgba(245,237,214,0.3)",
  card:    "rgba(255,255,255,0.07)",
  border:  "rgba(255,255,255,0.10)",
  gold:    "#C9A84C",
  goldDim: "rgba(201,168,76,0.18)",
  check:   "rgba(201,168,76,0.25)",
};

const QUESTIONS = [
  {
    id: "q1", step: 1,
    prompt: "How did your body feel today?",
    sub: "Not what you did — how you actually felt.",
    options: [
      { id: "tight",    emoji: "🪨", label: "Tight and braced"   },
      { id: "tired",    emoji: "🌊", label: "Drained and heavy"   },
      { id: "okay",     emoji: "🌿", label: "Okay, mostly fine"   },
      { id: "grounded", emoji: "🌲", label: "Steady and grounded" },
    ],
  },
  {
    id: "q2", step: 2,
    prompt: "What was the hardest moment?",
    sub: "You don't have to solve it. Just name it.",
    options: [
      { id: "morning",    emoji: "☀️",  label: "Morning chaos"          },
      { id: "transition", emoji: "🔄",  label: "Transitions or drop-off" },
      { id: "meltdown",   emoji: "😭",  label: "A meltdown or blowup"   },
      { id: "evening",    emoji: "🌙",  label: "Bedtime resistance"      },
      { id: "internal",   emoji: "💭",  label: "My own inner state"      },
      { id: "nothing",    emoji: "✨",  label: "Nothing stood out"       },
    ],
  },
  {
    id: "q3", step: 3,
    prompt: "What was one good thing — even small?",
    sub: "It counts even if the rest was hard.",
    options: [
      { id: "laugh",     emoji: "😄", label: "We laughed together"        },
      { id: "moment",    emoji: "🤝", label: "A connected moment"         },
      { id: "repair",    emoji: "🌱", label: "I repaired after something"  },
      { id: "showed-up", emoji: "💛", label: "I showed up even when hard"  },
      { id: "quiet",     emoji: "🕊", label: "Some quiet or calm"          },
    ],
  },
  {
    id: "q4", step: 4,
    prompt: "What do you want to let go of before tomorrow?",
    sub: "You can't take everything into the night.",
    options: [
      { id: "guilt",    emoji: "😔", label: "Guilt about today"         },
      { id: "snap",     emoji: "⚡", label: "The moment I snapped"      },
      { id: "worry",    emoji: "🌀", label: "Worrying about tomorrow"   },
      { id: "standard", emoji: "📏", label: "The standard I didn't hit" },
      { id: "nothing",  emoji: "🌙", label: "I'm okay — nothing today"  },
    ],
  },
];

const REFLECTIONS = {
  guilt: "Letting go of guilt doesn't mean it didn't matter. It means you're choosing rest.",
  snap: "You snapped, and you're here reflecting. That's the repair already beginning.",
  worry: "Tomorrow isn't here yet. You don't have to be ready for it tonight.",
  standard: "The standard you didn't hit today isn't the measure of who you are.",
  nothing: "Sometimes the release is just sleep. That's enough.",
  tight: "You carried a lot today. The tightness was your body doing its job.",
  tired: "Drained means you gave. That counts for something.",
  okay: "Okay is underrated. You held the line.",
  grounded: "Steadiness is a skill. You practiced it today.",
};

// ─── SMALL PIECES ─────────────────────────────────────────────────────────────
function ECHeader({ onSkip }) {
  return (
    <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontFamily: font, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: EC.dim, fontWeight: 600 }}>
        Evening Close
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

// ─── SCREENS ──────────────────────────────────────────────────────────────────
function IntroScreen({ onStart, onSkip }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", gap: 20 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🌙</div>
        <div style={{ fontFamily: serif, fontSize: 28, color: EC.text, lineHeight: 1.35, fontStyle: "italic", marginBottom: 8 }}>
          Let's land<br />the day.
        </div>
        <div style={{ fontFamily: font, fontSize: 13, color: EC.muted, lineHeight: 1.5 }}>
          4 questions. Less than 2 minutes.<br />Then you can rest.
        </div>
      </div>
      <div style={{ background: EC.card, borderRadius: 14, padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(245,237,214,0.15)" }} />
          ))}
        </div>
        <div style={{ fontFamily: font, fontSize: 11, color: EC.dim, lineHeight: 1.6 }}>
          How your body felt · The hard moment · The good thing · What to release
        </div>
      </div>
      <button onClick={onStart} style={{
        background: EC.gold, color: "#2D4A35", borderRadius: 16,
        padding: 15, fontFamily: font, fontSize: 14, fontWeight: 700,
        cursor: "pointer", border: "none",
      }}>
        Start Evening Close
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
      {/* Progress */}
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

      {/* Question */}
      <div style={{ padding: "0 22px 20px" }}>
        <div style={{ fontFamily: serif, fontSize: 22, color: EC.text, lineHeight: 1.4, fontStyle: "italic", marginBottom: 6 }}>{q.prompt}</div>
        <div style={{ fontFamily: font, fontSize: 12, color: EC.muted }}>{q.sub}</div>
      </div>

      {/* Options */}
      <div style={{ padding: "0 20px", flex: 1 }}>
        {q.options.map(opt => (
          <OptionCard key={opt.id} opt={opt} selected={selected === opt.id} onSelect={() => onSelect(opt.id)} />
        ))}
      </div>

      {/* Micro reflection */}
      {selected && REFLECTIONS[selected] && (
        <div style={{ margin: "12px 20px 0", background: EC.card, borderLeft: `3px solid ${EC.gold}`, borderRadius: "0 12px 12px 0", padding: "10px 14px" }}>
          <div style={{ fontFamily: font, fontSize: 12, color: EC.muted, fontStyle: "italic", lineHeight: 1.55 }}>
            {REFLECTIONS[selected]}
          </div>
        </div>
      )}

      {/* Continue */}
      {selected && (
        <div style={{ padding: "16px 20px 0" }}>
          <button onClick={onNext} style={{
            width: "100%", background: EC.gold, color: "#2D4A35",
            borderRadius: 16, padding: 14, fontFamily: font,
            fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none",
          }}>
            {step === 4 ? "Close my day →" : "Continue →"}
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryScreen({ answers, onClose }) {
  const q4Opt = QUESTIONS[3].options.find(o => o.id === answers.q4);
  const releaseText = REFLECTIONS[answers.q4] || "You landed the day. Rest now.";
  const lines = [
    { label: "Body",       opt: QUESTIONS[0].options.find(o => o.id === answers.q1) },
    { label: "Hard moment",opt: QUESTIONS[1].options.find(o => o.id === answers.q2) },
    { label: "Good thing", opt: QUESTIONS[2].options.find(o => o.id === answers.q3) },
    { label: "Letting go", opt: QUESTIONS[3].options.find(o => o.id === answers.q4) },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 24px 48px" }}>
      <div style={{ fontSize: 42, margin: "20px 0 10px", textAlign: "center" }}>🌙</div>
      <div style={{ fontFamily: serif, fontSize: 26, color: EC.text, fontStyle: "italic", textAlign: "center", lineHeight: 1.4, marginBottom: 6 }}>
        Day landed.
      </div>
      <div style={{ fontFamily: font, fontSize: 12, color: EC.muted, textAlign: "center", marginBottom: 24 }}>
        You showed up. That's what they'll remember.
      </div>

      {/* Summary card */}
      <div style={{ background: EC.card, borderRadius: 20, padding: 18, width: "100%", marginBottom: 16 }}>
        <div style={{ fontFamily: font, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: EC.dim, marginBottom: 12 }}>Today in brief</div>
        {lines.map(({ label, opt }) => (
          <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 9 }}>
            <div style={{ fontFamily: font, fontSize: 10, color: EC.dim, textTransform: "uppercase", letterSpacing: ".07em", width: 80, flexShrink: 0, paddingTop: 2 }}>{label}</div>
            <div style={{ fontFamily: font, fontSize: 13, color: EC.muted }}>{opt ? `${opt.emoji} ${opt.label}` : "—"}</div>
          </div>
        ))}
      </div>

      {/* Release note */}
      <div style={{ background: EC.goldDim, border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 16, padding: "16px 18px", width: "100%", marginBottom: 20 }}>
        <div style={{ fontFamily: font, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: EC.gold, marginBottom: 6 }}>Carry this into rest</div>
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
export function EveningClose({ onClose }) {
  const { currentUser, activeFamily } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const q = QUESTIONS.find(q => q.step === step);

  async function saveReflection(finalAnswers) {
    if (!currentUser?.id || !activeFamily?.id) return;
    try {
      await supabase.from("regulation_checkins").insert({
        user_id: currentUser.id,
        family_id: activeFamily.id,
        state: `ec_${finalAnswers.q1 || "completed"}`,
        source: "evening_close",
        metadata: finalAnswers,
        checked_in_at: new Date().toISOString(),
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
          q={q}
          step={step}
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
