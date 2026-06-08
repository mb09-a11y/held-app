// src/modules/nscheckin/NSCheckinFlow.jsx
// Held — True physiological NS check-in.
// 4 cards: Body → Head → Craving → Relational (day or sleep-session variant)
// AI infers actual state from pattern across all 4 cards + context signals.
// Post-check-in: reflection line + optional regulation exercise offer.
// Saves to regulation_checkins with individual card columns + inferred_state.

import { useState } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { RegCheckinsCache, RecentCheckinCache, FamilyStateCache } from "../../lib/heldCache.js";

// ─── CARD DATA ────────────────────────────────────────────────────────────────

const BODY_OPTIONS = [
  { id: "loose",   label: "Loose and easy",                    ns: "ventral" },
  { id: "tense",   label: "A little tense — jaw, shoulders, neck", ns: "sympathetic_mild" },
  { id: "achy",    label: "Achy or in pain somewhere",         ns: "sympathetic_stress" },
  { id: "heavy",   label: "Heavy and slow",                    ns: "dorsal_mild" },
  { id: "numb",    label: "Numb or kind of not there",         ns: "dorsal" },
  { id: "buzzy",   label: "Buzzy or restless, can't settle",   ns: "sympathetic" },
];

const HEAD_OPTIONS = [
  { id: "clear",     label: "Clear and present",               ns: "ventral" },
  { id: "foggy_ok",  label: "A little foggy but okay",         ns: "dorsal_mild" },
  { id: "foggy",     label: "Pretty foggy or achey",           ns: "dorsal_mild" },
  { id: "scattered", label: "Scattered, hard to focus",        ns: "sympathetic" },
  { id: "racing",    label: "Racing, can't slow it down",      ns: "sympathetic" },
  { id: "blank",     label: "Blank — not much going on",       ns: "dorsal" },
];

const CRAVING_OPTIONS = [
  { id: "move",    label: "To move — walk, stretch, get outside", ns: "ventral" },
  { id: "cozy",    label: "Something warm and cozy — tea, blanket, quiet", ns: "dorsal_mild" },
  { id: "scroll",  label: "To scroll or zone out",             ns: "dorsal" },
  { id: "coffee",  label: "Coffee or something cold and sharp", ns: "sympathetic" },
  { id: "connect", label: "To talk to someone or connect",     ns: "ventral" },
  { id: "nothing", label: "Honestly nothing sounds good",      ns: "dorsal" },
];

// Day version — relational impulse
const RELATIONAL_DAY_OPTIONS = [
  { id: "easy",      label: "Respond when they come to me — feels easy",       ns: "ventral" },
  { id: "jump_in",   label: "Jump in before they even ask",                    ns: "sympathetic_mild" },
  { id: "available", label: "Wait and let them try — I'm here if they need me", ns: "ventral" },
  { id: "hope_not",  label: "Wait and honestly hope they don't need me",       ns: "dorsal_mild" },
  { id: "frustrated","label": "Feel a flash of frustration when they ask",     ns: "sympathetic" },
];

// Sleep session version — co-regulation capacity during a waking
const RELATIONAL_SLEEP_OPTIONS = [
  { id: "ready",   label: "Natural — I'm ready to be there",  ns: "ventral" },
  { id: "tired",   label: "Fine, just tired",                 ns: "dorsal_mild" },
  { id: "heavy",   label: "Heavy — I really don't want to go in", ns: "dorsal" },
  { id: "tense",   label: "Tense — I just need them to sleep", ns: "sympathetic" },
];

// ─── REGULATION EXERCISES (imported from single source of truth) ─────────────
import { getPrimaryExercise } from "../regulation/regulationData.js";
import { ExerciseScreen } from "../regulation/RegulationModule.jsx";

// ─── NS INFERENCE ENGINE ──────────────────────────────────────────────────────
// Weighs pattern across all 4 cards. No single card is diagnostic.
// Returns: { state, label, reflection, color }

function inferState({ body, head, craving, relational }) {
  const signals = [
    body?.ns, head?.ns, craving?.ns, relational?.ns,
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

  // Roll up into 5 canonical states
  const ventral   = scores.ventral;
  const symHigh   = scores.sympathetic + scores.sympathetic_stress;
  const symMild   = scores.sympathetic_mild;
  const dorsalHigh = scores.dorsal;
  const dorsalMild = scores.dorsal_mild;

  // Shutdown: dorsal dominant, high score
  if (dorsalHigh >= 2 && ventral === 0) {
    return { state: "Shutdown", ...RESULT_META.Shutdown };
  }
  // Dorsal lean (edge of window) — the "fine on phone wanting a blanket" state
  if (dorsalMild >= 2 && ventral <= 1 && symHigh === 0) {
    return { state: "Freeze", ...RESULT_META.Freeze };
  }
  // High sympathetic — activated/anxious
  if (symHigh >= 2) {
    return { state: "Fight", ...RESULT_META.Fight };
  }
  // Mild sympathetic — anxious edge
  if (symMild >= 2 && ventral <= 1) {
    return { state: "Flight", ...RESULT_META.Flight };
  }
  // Mixed dorsal + sympathetic — depleted/stretched
  if ((dorsalMild >= 1 || dorsalHigh >= 1) && (symMild >= 1 || symHigh >= 1)) {
    return { state: "Stretched", ...RESULT_META.Stretched };
  }
  // Ventral dominant — regulated
  if (ventral >= 2) {
    return { state: "Regulated", ...RESULT_META.Regulated };
  }
  // Default: stretched (mixed or unclear)
  return { state: "Stretched", ...RESULT_META.Stretched };
}

// ─── RESULT META ─────────────────────────────────────────────────────────────
const RESULT_META = {
  Regulated: {
    color: "#7BAA8A",
    label: "You're in a regulated place",
    reflection: (cards) => buildReflection("regulated", cards),
  },
  Fight: {
    color: "#C07070",
    label: "Your system is activated",
    reflection: (cards) => buildReflection("fight", cards),
  },
  Flight: {
    color: "#A89B5A",
    label: "Your system is anxious",
    reflection: (cards) => buildReflection("flight", cards),
  },
  Freeze: {
    color: "#7B8FAA",
    label: "You're running low",
    reflection: (cards) => buildReflection("freeze", cards),
  },
  Shutdown: {
    color: "#8A7BAA",
    label: "Your system is in shutdown",
    reflection: (cards) => buildReflection("shutdown", cards),
  },
  Stretched: {
    color: "#B8924A",
    label: "Your system is a little maxed",
    reflection: (cards) => buildReflection("stretched", cards),
  },
};

// Builds the 1–2 sentence warm reflection line — RCC voice, no labels
// Reads the actual card answers to feel personal, not generic
function buildReflection(state, { body, head, craving, relational }) {
  const bodyLabel   = body?.label?.toLowerCase()   || "";
  const headLabel   = head?.label?.toLowerCase()   || "";
  const cravingLabel = craving?.label?.toLowerCase() || "";

  switch (state) {
    case "regulated":
      return "Your body and head are both showing up — that's real capacity right now.";

    case "fight":
      if (bodyLabel.includes("buzzy") || bodyLabel.includes("tense"))
        return "Your body is working hard. That's not a flaw — that's protection.";
      return "Something has your system on alert. It makes sense given what you're carrying.";

    case "flight":
      if (headLabel.includes("racing") || headLabel.includes("scattered"))
        return "Your mind is scanning for what needs handling. It won't let you rest until it feels safe.";
      return "There's an anxious hum underneath things right now. Your system is trying to stay ahead of it.";

    case "freeze":
      if (cravingLabel.includes("scroll") || cravingLabel.includes("zone"))
        return "Sounds like you might be running low.";
      if (cravingLabel.includes("cozy") || cravingLabel.includes("warm"))
        return "Sounds like you might be running low.";
      return "Sounds like you might be running low.";

    case "shutdown":
      return "Your system has had enough for now. Rest is the only right response here — not pushing through.";

    case "stretched":
      return "You're inside your window but close to the edge. That's worth noticing.";

    default:
      return "Your body is telling you something. That's enough.";
  }
}

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
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = `${T.teal}50`; }}}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = T.border; }}}
    >
      {option.label}
    </button>
  );
}

// ─── CARD SCREENS ─────────────────────────────────────────────────────────────

function CardBody({ value, onSelect, onNext, onClose, T }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackBtn onClick={onClose} T={T} />
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: T.teal }}>
            NS Check-In
          </div>
        </div>
        <ProgressDots current={0} total={4} T={T} />
      </div>

      <h2 style={{ fontFamily: serif, fontSize: 24, color: T.headingText, lineHeight: 1.25, marginBottom: 6 }}>
        Right now my body feels…
      </h2>
      <p style={{ fontFamily: font, fontSize: 13, color: T.muted, marginBottom: 22 }}>
        Choose what's closest.
      </p>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {BODY_OPTIONS.map(opt => (
          <OptionButton key={opt.id} option={opt} selected={value?.id === opt.id} onSelect={onSelect} T={T} />
        ))}
      </div>

      <button
        onClick={onNext}
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
        Next →
      </button>
    </div>
  );
}

function CardHead({ value, onSelect, onNext, onBack, T }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackBtn onClick={onBack} T={T} />
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: T.teal }}>
            NS Check-In
          </div>
        </div>
        <ProgressDots current={1} total={4} T={T} />
      </div>

      <h2 style={{ fontFamily: serif, fontSize: 24, color: T.headingText, lineHeight: 1.25, marginBottom: 6 }}>
        My head feels…
      </h2>
      <p style={{ fontFamily: font, fontSize: 13, color: T.muted, marginBottom: 22 }}>
        Choose what's closest.
      </p>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {HEAD_OPTIONS.map(opt => (
          <OptionButton key={opt.id} option={opt} selected={value?.id === opt.id} onSelect={onSelect} T={T} />
        ))}
      </div>

      <button
        onClick={onNext}
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
        Next →
      </button>
    </div>
  );
}

function CardCraving({ value, onSelect, onNext, onBack, T }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackBtn onClick={onBack} T={T} />
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: T.teal }}>
            NS Check-In
          </div>
        </div>
        <ProgressDots current={2} total={4} T={T} />
      </div>

      <h2 style={{ fontFamily: serif, fontSize: 24, color: T.headingText, lineHeight: 1.25, marginBottom: 6 }}>
        If I had 10 free minutes right now, I'd want…
      </h2>
      <p style={{ fontFamily: font, fontSize: 13, color: T.muted, marginBottom: 22 }}>
        Choose what feels honest.
      </p>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {CRAVING_OPTIONS.map(opt => (
          <OptionButton key={opt.id} option={opt} selected={value?.id === opt.id} onSelect={onSelect} T={T} />
        ))}
      </div>

      <button
        onClick={onNext}
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
        Next →
      </button>
    </div>
  );
}

function CardRelational({ value, onSelect, onSubmit, onBack, isSleepSession, T }) {
  const options = isSleepSession ? RELATIONAL_SLEEP_OPTIONS : RELATIONAL_DAY_OPTIONS;
  const question = isSleepSession
    ? "Going to my child right now feels…"
    : "When my child needs something right now, I…";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackBtn onClick={onBack} T={T} />
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: T.teal }}>
            NS Check-In
          </div>
        </div>
        <ProgressDots current={3} total={4} T={T} />
      </div>

      <h2 style={{ fontFamily: serif, fontSize: 24, color: T.headingText, lineHeight: 1.25, marginBottom: 6 }}>
        {question}
      </h2>
      <p style={{ fontFamily: font, fontSize: 13, color: T.muted, marginBottom: 22 }}>
        Choose what's closest.
      </p>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {options.map(opt => (
          <OptionButton key={opt.id} option={opt} selected={value?.id === opt.id} onSelect={onSelect} T={T} />
        ))}
      </div>

      <button
        onClick={onSubmit}
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
        See what this means →
      </button>
    </div>
  );
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────────

function StepResult({ result, cards, onClose, onBack, onOpenExercise, T }) {
  const exercise = getPrimaryExercise(result.state);
  const reflection = result.reflection(cards);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <BackBtn onClick={onBack} T={T} />
        <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText }}>
          Got it.
        </div>
      </div>

      {/* State label */}
      <div style={{
        alignSelf: "flex-start", padding: "6px 14px", borderRadius: 20, marginBottom: 18,
        border: `1.5px solid ${result.color}`,
        fontFamily: font, fontSize: 13, fontWeight: 600, color: result.color,
      }}>
        {result.label}
      </div>

      {/* Reflection */}
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

      {/* Regulation offer — only if not already regulated */}
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

      {/* Close — regulated state */}
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

export function NSCheckinFlow({ onClose, onCheckinSaved, sleepSessionId = null }) {
  const T = useT();
  const { currentUser, activeFamily } = useApp();

  const [step, setStep] = useState("body"); // body | head | craving | relational | result | exercise
  const [cards, setCards] = useState({ body: null, head: null, craving: null, relational: null });
  const [result, setResult] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(null); // { id, preState }

  const isSleepSession = !!sleepSessionId;

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

    // Save to DB
    if (!currentUser?.id || !activeFamily?.id) return;
    try {
      const dbState = inferred.state === "Steady" ? "Regulated" : inferred.state;
      const { error } = await supabase.from("regulation_checkins").insert({
        user_id:         currentUser.id,
        family_id:       activeFamily.id,
        type:            new Date().getHours() < 12 ? "am" : "pm",
        state:           dbState,
        inferred_state:  dbState,
        source:          "ns_checkin_4card",
        checked_in_at:   new Date().toISOString(),
        checkin_context: isSleepSession ? "sleep_session" : "standard",
        sleep_session_id: sleepSessionId || null,
        card_body:       finalCards.body?.id       || null,
        card_head:       finalCards.head?.id       || null,
        card_craving:    finalCards.craving?.id    || null,
        card_relational: finalCards.relational?.id || null,
        answers: {
          body:       finalCards.body,
          head:       finalCards.head,
          craving:    finalCards.craving,
          relational: finalCards.relational,
        },
      });

      if (error) {
        console.error("[NSCheckinFlow] Insert failed:", error);
      } else {
        RegCheckinsCache.invalidate(currentUser.id);
        RecentCheckinCache.invalidate(currentUser.id);
        FamilyStateCache.invalidateFamily?.(activeFamily.id) ||
          FamilyStateCache.invalidate(activeFamily.id, null, currentUser.id);
        onCheckinSaved?.();
      }
    } catch (err) {
      console.error("[NSCheckinFlow] Unexpected error:", err);
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
        <CardBody
          value={cards.body}
          onSelect={v => setCard("body", v)}
          onNext={() => setStep("head")}
          onClose={onClose}
          T={T}
        />
      )}
      {step === "head" && (
        <CardHead
          value={cards.head}
          onSelect={v => setCard("head", v)}
          onNext={() => setStep("craving")}
          onBack={() => setStep("body")}
          T={T}
        />
      )}
      {step === "craving" && (
        <CardCraving
          value={cards.craving}
          onSelect={v => setCard("craving", v)}
          onNext={() => setStep("relational")}
          onBack={() => setStep("head")}
          T={T}
        />
      )}
      {step === "relational" && (
        <CardRelational
          value={cards.relational}
          onSelect={v => setCard("relational", v)}
          onSubmit={() => cards.relational && handleSubmit(cards.relational)}
          onBack={() => setStep("craving")}
          isSleepSession={isSleepSession}
          T={T}
        />
      )}
      {step === "result" && result && (
        <StepResult
          result={result}
          cards={cards}
          onClose={onClose}
          onBack={() => setStep("relational")}
          onOpenExercise={openExercise}
          T={T}
        />
      )}
      {step === "exercise" && currentExercise?.id && (
        <ExerciseScreen
          exerciseId={currentExercise.id}
          preState={currentExercise.preState}
          onBack={onClose}
          onComplete={onClose}
          onLogSession={() => {}}
        />
      )}
    </div>
  );
}
