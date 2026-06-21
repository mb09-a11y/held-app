// views/consultant/ConsultantNSCheckin.jsx
// Consultant 4-card NS check-in — mirrors the parent NSCheckinFlow's
// Body → Engagement → Craving → Relational structure and inference engine,
// but in consultant voice and saving to consultant_ns_checkins.
//
// Props:
//   onClose          — called to dismiss the flow (back arrow on card 1, or
//                       after a "Regulated" result)
//   onCheckinSaved    — called with the inferred result object after a
//                       successful save: { state, label, color, reflection }
//   checkinContext    — 'daily' | 'pre_reply' (default 'daily')
//   familyId          — set when checkinContext === 'pre_reply', logs which
//                        family triggered the check-in
//   familyName        — optional, used only for the pre-reply framing line

import { useState } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { getPrimaryExercise } from "../../modules/regulation/regulationData.js";
import { ExerciseScreen } from "../../modules/regulation/RegulationModule.jsx";

// ─── CARD DATA ────────────────────────────────────────────────────────────────

// Card 1 — identical to the parent flow's body card (and the approved mockup)
const BODY_OPTIONS = [
  { id: "loose",  label: "Loose and easy",                       ns: "ventral" },
  { id: "tense",  label: "A little tense — jaw, shoulders, neck", ns: "sympathetic_mild" },
  { id: "achy",   label: "Achy or in pain somewhere",            ns: "sympathetic_stress" },
  { id: "heavy",  label: "Heavy and slow",                       ns: "dorsal_mild" },
  { id: "buzzy",  label: "Buzzy or restless, can't settle",      ns: "sympathetic" },
];

// Card 2 — "engagement" (consultant framing of the parent's "head" card)
const ENGAGEMENT_OPTIONS = [
  { id: "clear",     label: "Clear and present",            ns: "ventral" },
  { id: "foggy_ok",  label: "A little foggy but okay",      ns: "dorsal_mild" },
  { id: "scattered", label: "Scattered, hard to focus",     ns: "sympathetic" },
  { id: "racing",    label: "Racing, can't slow it down",   ns: "sympathetic" },
  { id: "checked_out", label: "Checked out — not much going on", ns: "dorsal" },
];

// Card 3 — same craving signals as the parent flow
const CRAVING_OPTIONS = [
  { id: "move",    label: "To move — walk, stretch, get outside",          ns: "ventral" },
  { id: "cozy",    label: "Something warm and cozy — tea, blanket, quiet", ns: "dorsal_mild" },
  { id: "scroll",  label: "To scroll or zone out",                         ns: "dorsal" },
  { id: "coffee",  label: "Coffee or something cold and sharp",            ns: "sympathetic" },
  { id: "connect", label: "To talk to someone or connect",                 ns: "ventral" },
  { id: "nothing", label: "Honestly nothing sounds good",                  ns: "dorsal" },
];

// Card 4 — relational capacity toward families (consultant framing of the
// parent flow's "When my child needs something" card). Framed around the
// felt sense of a message landing, since "a family reaching out" isn't a
// constant live event the way a child's need is.
const RELATIONAL_OPTIONS = [
  { id: "easy",       label: "Easy — I'm glad to hear from them",                ns: "ventral" },
  { id: "jump_in",    label: "Like I should get ahead of it before they even ask", ns: "sympathetic_mild" },
  { id: "available",  label: "Fine — I'll get to it when I get to it",            ns: "ventral" },
  { id: "hope_not",   label: "Like one more thing I don't have room for right now", ns: "dorsal_mild" },
  { id: "frustrated", label: "A flash of dread before I even open it",            ns: "sympathetic" },
];

// ─── NS INFERENCE ENGINE ──────────────────────────────────────────────────────
// Identical logic to the parent flow's inferState — same 5 canonical states,
// same scoring, so "today's state" means the same thing everywhere in the app.

function inferState({ body, engagement, craving, relational }) {
  const signals = [
    body?.ns, engagement?.ns, craving?.ns, relational?.ns,
  ].filter(Boolean);

  const scores = {
    ventral: 0,
    sympathetic: 0,
    sympathetic_mild: 0,
    sympathetic_stress: 0,
    dorsal_mild: 0,
    dorsal: 0,
  };

  signals.forEach(s => { if (scores[s] !== undefined) scores[s]++; });

  const ventral    = scores.ventral;
  const symHigh    = scores.sympathetic + scores.sympathetic_stress;
  const symMild    = scores.sympathetic_mild;
  const dorsalHigh = scores.dorsal;
  const dorsalMild = scores.dorsal_mild;

  if (dorsalHigh >= 2 && ventral === 0) {
    return { state: "Shutdown", ...RESULT_META.Shutdown };
  }
  if (dorsalMild >= 2 && ventral <= 1 && symHigh === 0) {
    return { state: "Freeze", ...RESULT_META.Freeze };
  }
  if (symHigh >= 2) {
    return { state: "Fight", ...RESULT_META.Fight };
  }
  if (symMild >= 2 && ventral <= 1) {
    return { state: "Flight", ...RESULT_META.Flight };
  }
  if ((dorsalMild >= 1 || dorsalHigh >= 1) && (symMild >= 1 || symHigh >= 1)) {
    return { state: "Stretched", ...RESULT_META.Stretched };
  }
  if (ventral >= 2) {
    return { state: "Regulated", ...RESULT_META.Regulated };
  }
  return { state: "Stretched", ...RESULT_META.Stretched };
}

// ─── RESULT META — consultant-voiced reflections ─────────────────────────────
// Same colors/states as the parent flow for visual consistency, but the
// reflection copy speaks to a consultant holding a caseload, not a parent.

const RESULT_META = {
  Regulated: {
    color: "#7BAA8A",
    label: "You're in a regulated place",
    reflection: () => "You're showing up steady. That's real capacity for the families counting on you today.",
  },
  Fight: {
    color: "#C07070",
    label: "Your system is activated",
    reflection: () => "Something has your system on alert. Worth a breath before you open the next message.",
  },
  Flight: {
    color: "#A89B5A",
    label: "Your system is anxious",
    reflection: () => "There's an anxious hum running underneath things. Your system is trying to stay ahead of what's coming.",
  },
  Freeze: {
    color: "#7B8FAA",
    label: "You're running low",
    reflection: () => "Sounds like you're running low. A family will feel that, even if you don't say it.",
  },
  Shutdown: {
    color: "#8A7BAA",
    label: "Your system is in shutdown",
    reflection: () => "Your system has had enough for now. Rest is the right response here — not pushing through to the next family.",
  },
  Stretched: {
    color: "#B8924A",
    label: "Your system is a little maxed",
    reflection: () => "You're inside your window, but close to the edge. Worth noticing before you open your caseload.",
  },
};

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

function BackBtn({ onClick, T }) {
  return (
    <button onClick={onClick} style={{
      width: 36, height: 36, borderRadius: "50%",
      background: T.faint, border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: T.muted, fontSize: 15, flexShrink: 0,
    }}>←</button>
  );
}

function ProgressDots({ current, total, T }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 18 : 6,
          height: 6, borderRadius: 3,
          background: i === current ? T.teal : i < current ? `${T.teal}60` : T.faint,
          transition: "all .25s",
        }} />
      ))}
    </div>
  );
}

function OptionButton({ option, selected, onSelect, T }) {
  return (
    <button
      onClick={() => onSelect(option)}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: "13px 16px", marginBottom: 8, borderRadius: 14,
        border: `1.5px solid ${selected ? T.teal : T.border}`,
        background: selected ? `${T.teal}10` : T.card,
        fontFamily: font, fontSize: 14,
        color: selected ? T.teal : T.text,
        fontWeight: selected ? 600 : 400,
        cursor: "pointer", transition: "all .15s",
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = `${T.teal}50`; } }}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = T.border; } }}
    >
      {option.label}
    </button>
  );
}

// ─── CARD SCREEN (shared shell for all 4 cards) ──────────────────────────────

function CardScreen({ stepIndex, title, subtitle, options, value, onSelect, onPrimary, primaryLabel, onBack, onClose, T }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackBtn onClick={stepIndex === 0 ? onClose : onBack} T={T} />
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: T.teal }}>
            NS Check-In
          </div>
        </div>
        <ProgressDots current={stepIndex} total={4} T={T} />
      </div>

      <h2 style={{ fontFamily: serif, fontSize: 24, color: T.headingText, lineHeight: 1.25, marginBottom: 6 }}>
        {title}
      </h2>
      <p style={{ fontFamily: font, fontSize: 13, color: T.muted, marginBottom: 22 }}>
        {subtitle}
      </p>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {options.map(opt => (
          <OptionButton key={opt.id} option={opt} selected={value?.id === opt.id} onSelect={onSelect} T={T} />
        ))}
      </div>

      <button
        onClick={onPrimary}
        disabled={!value}
        style={{
          width: "100%", padding: "14px", borderRadius: 16, border: "none",
          background: value ? T.teal : T.faint,
          color: value ? "#fff" : T.muted,
          fontFamily: font, fontSize: 14, fontWeight: 600,
          cursor: value ? "pointer" : "default", transition: "all .2s",
          marginTop: 12,
        }}
      >
        {primaryLabel}
      </button>
    </div>
  );
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────────

function StepResult({ result, onClose, onBack, onOpenExercise, T }) {
  const exercise = getPrimaryExercise(result.state);
  const reflection = result.reflection();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <BackBtn onClick={onBack} T={T} />
        <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText }}>
          Got it.
        </div>
      </div>

      <div style={{
        alignSelf: "flex-start", padding: "6px 14px", borderRadius: 20, marginBottom: 18,
        border: `1.5px solid ${result.color}`,
        fontFamily: font, fontSize: 13, fontWeight: 600, color: result.color,
      }}>
        {result.label}
      </div>

      <div style={{
        borderRadius: 16, padding: "18px 20px", marginBottom: 14,
        background: T.card, border: `1px solid ${T.border}`,
      }}>
        <p style={{
          fontFamily: serif, fontSize: 17, fontStyle: "italic",
          color: T.headingText, lineHeight: 1.6, margin: 0,
        }}>
          "{reflection}"
        </p>
      </div>

      {result.state !== "Regulated" && exercise && (
        <div style={{
          borderRadius: 16, padding: "16px 18px", marginBottom: 14,
          background: T.card, border: `1px solid ${T.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontFamily: font, fontSize: 14, color: T.text, lineHeight: 1.5, margin: 0, flex: 1 }}>
              Want a quick reset?
            </p>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
              <button
                onClick={() => onOpenExercise(exercise.id, result.state)}
                style={{
                  padding: "8px 16px", borderRadius: 20, border: "none",
                  background: T.teal, color: "#fff",
                  fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Yes please
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: "8px 16px", borderRadius: 20,
                  border: `1px solid ${T.border}`, background: "none",
                  color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer",
                }}
              >
                Not right now
              </button>
            </div>
          </div>
        </div>
      )}

      {result.state === "Regulated" && (
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "14px", borderRadius: 16, border: "none",
            background: T.teal, color: "#fff",
            fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          I've got this. →
        </button>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function ConsultantNSCheckin({ onClose, onDone, onCheckinSaved, checkinContext = "daily", familyId = null, familyName = null }) {
  const T = useT();
  const { currentUser } = useApp();

  const finish = onDone || onClose;

  const [step, setStep] = useState("body"); // body | engagement | craving | relational | result | exercise
  const [cards, setCards] = useState({ body: null, engagement: null, craving: null, relational: null });
  const [result, setResult] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(null); // { id, preState }

  function setCard(key, value) {
    setCards(prev => ({ ...prev, [key]: value }));
  }

  function openExercise(id, preState) {
    setCurrentExercise({ id, preState });
    setStep("exercise");
  }

  async function handleSubmit(relationalValue) {
    const finalCards = { ...cards, relational: relationalValue };
    setCards(finalCards);

    const inferred = inferState(finalCards);
    setResult(inferred);
    setStep("result");

    if (!currentUser?.id) return;
    try {
      const { error } = await supabase.from("consultant_ns_checkins").insert({
        consultant_id:   currentUser.id,
        card_body:       finalCards.body?.id       || null,
        card_engagement: finalCards.engagement?.id || null,
        card_craving:    finalCards.craving?.id    || null,
        card_relational: finalCards.relational?.id || null,
        inferred_state:  inferred.state,
        checkin_context: checkinContext,
        family_id:       familyId || null,
      });

      if (error) {
        console.error("[ConsultantNSCheckin] Insert failed:", error);
      } else {
        onCheckinSaved?.(inferred);
      }
    } catch (err) {
      console.error("[ConsultantNSCheckin] Unexpected error:", err);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: T.bg,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
      padding: "env(safe-area-inset-top, 20px) 20px 0",
    }}>
      {step === "body" && (
        <CardScreen
          stepIndex={0}
          title="Right now my body feels…"
          subtitle="Choose what's closest."
          options={BODY_OPTIONS}
          value={cards.body}
          onSelect={v => setCard("body", v)}
          onPrimary={() => setStep("engagement")}
          primaryLabel="Next →"
          onClose={onClose}
          T={T}
        />
      )}
      {step === "engagement" && (
        <CardScreen
          stepIndex={1}
          title="My focus right now feels…"
          subtitle="Choose what's closest."
          options={ENGAGEMENT_OPTIONS}
          value={cards.engagement}
          onSelect={v => setCard("engagement", v)}
          onPrimary={() => setStep("craving")}
          primaryLabel="Next →"
          onBack={() => setStep("body")}
          T={T}
        />
      )}
      {step === "craving" && (
        <CardScreen
          stepIndex={2}
          title="If I had 10 free minutes right now, I'd want…"
          subtitle="Choose what feels honest."
          options={CRAVING_OPTIONS}
          value={cards.craving}
          onSelect={v => setCard("craving", v)}
          onPrimary={() => setStep("relational")}
          primaryLabel="Next →"
          onBack={() => setStep("engagement")}
          T={T}
        />
      )}
      {step === "relational" && (
        <CardScreen
          stepIndex={3}
          title="Right now, opening a message from a family feels…"
          subtitle="Choose what's closest."
          options={RELATIONAL_OPTIONS}
          value={cards.relational}
          onSelect={v => setCard("relational", v)}
          onPrimary={() => cards.relational && handleSubmit(cards.relational)}
          primaryLabel="See what this means →"
          onBack={() => setStep("craving")}
          T={T}
        />
      )}
      {step === "result" && result && (
        <StepResult
          result={result}
          onClose={finish}
          onBack={() => setStep("relational")}
          onOpenExercise={openExercise}
          T={T}
        />
      )}
      {step === "exercise" && currentExercise?.id && (
        <ExerciseScreen
          exerciseId={currentExercise.id}
          preState={currentExercise.preState}
          onBack={finish}
          onComplete={finish}
          onLogSession={() => {}}
        />
      )}
    </div>
  );
}
