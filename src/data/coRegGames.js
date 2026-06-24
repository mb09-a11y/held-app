// src/data/coRegGames.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the co-regulation game prompt library.
// Used by CoRegGame.jsx to look up the correct prompt by child state + age band.
//
// CHILD STATES:   flooded | shutdown | tipping
// AGE BANDS:      0_18m | 18m_3y | 3_5y | 5_7y
//
// Each entry has:
//   key         — unique identifier, stored in sos_sessions.game_key
//   title       — the "spell name" shown as eyebrow text (1-3 words)
//   prompt      — the action text shown in giant type (10 words max)
//   subPrompt   — optional second line for context (shown smaller)
//   why         — internal clinical rationale (never shown to parent)
//   timerSecs   — how long the root timer runs (default 30)
// ─────────────────────────────────────────────────────────────────────────────

export const CO_REG_GAMES = {

  // ─── FLOODED CHILD 🔥 ────────────────────────────────────────────────────
  // Child: moving, loud, coming at you
  // Mechanism: parent becomes unexpected stimulus → recruits curiosity involuntarily
  // Rule: NO directives to child, NO compliance required, NO escalating energy

  flooded: {
    "0_18m": {
      key: "anchor",
      title: "Anchor",
      prompt: "Get on the floor. Hum one low note. Wait.",
      subPrompt: "No words. Just your body and your voice.",
      why: "Baby reads your nervous system, not your words. Floor level + low hum signals safety somatically.",
      timerSecs: 30,
    },
    "18m_3y": {
      key: "slow_motion",
      title: "Slow Motion",
      prompt: "Move in slow motion. Say nothing. Let them watch.",
      subPrompt: "Exaggerate it. Slower than feels natural.",
      why: "Novel, unexpected movement recruits attention involuntarily. No compliance required from child.",
      timerSecs: 30,
    },
    "3_5y": {
      key: "the_secret_flooded",
      title: "The Secret",
      prompt: 'Whisper: "The purple platypus ate the wallpaper."',
      subPrompt: "Say it completely seriously. Script is provided — no thinking needed.",
      why: "Absurdity + whisper interrupts fight-flight loop. Whisper requires child to quiet system just to hear. Script removes cognitive load from flooded parent.",
      timerSecs: 30,
    },
    "5_7y": {
      key: "system_pause",
      title: "System Pause",
      prompt: 'Say: "System pause." Then freeze completely. Hold it.',
      subPrompt: "Don't explain. Just stop. Let curiosity do the work.",
      why: "Framing the freeze as a game prevents it reading as withdrawal. Sudden stillness interrupts escalation loop.",
      timerSecs: 30,
    },
  },

  // ─── SHUTDOWN CHILD 🧊 ───────────────────────────────────────────────────
  // Child: still, quiet, pulling away
  // Mechanism: match low energy first, then gently coax system back up
  // Rule: NO demands, NO eye contact pressure, NO big energy

  shutdown: {
    "0_18m": {
      key: "just_here_infant",
      title: "Just Here",
      prompt: "Sit close. Hum something familiar. No eye contact pressure.",
      subPrompt: "Proximity and sound. Nothing asked of them.",
      why: "Infant shutdown needs safe proximity + familiar auditory stimulus. Direct eye contact can feel like demand.",
      timerSecs: 30,
    },
    "18m_3y": {
      key: "micro_narration",
      title: "Micro-Narration",
      prompt: 'Play nearby. Say quietly: "Red block. Blue block."',
      subPrompt: "Three words at a time. Don't invite them. Just be there.",
      why: "Parallel play + minimal narration coaxes system back without demand. Child regulates through proximity.",
      timerSecs: 30,
    },
    "3_5y": {
      key: "just_here",
      title: "Just Here",
      prompt: 'Sit next to them. Say: "I\'m just here." Nothing else.',
      subPrompt: "No fixing. No asking. Just your presence.",
      why: "Safe presence without demand allows shutdown child to begin self-initiating contact. Waiting is the intervention.",
      timerSecs: 30,
    },
    "5_7y": {
      key: "notice_together",
      title: "Notice Together",
      prompt: '"I see the blue chair. I see the window." Quietly.',
      subPrompt: "Narrate the room softly. No response needed from them.",
      why: "Gentle environmental narration provides low-level stimulation to coax dorsal vagal system back toward window of tolerance.",
      timerSecs: 30,
    },
  },

  // ─── TIPPING CHILD ⚡ ────────────────────────────────────────────────────
  // Child: bouncing between both, unpredictable
  // Mechanism: intercept before full dysregulation, redirect attention outward
  // Rule: low cognitive demand, sensory or relational hook

  tipping: {
    "0_18m": {
      key: "steady",
      title: "Steady",
      prompt: "Pick up. Hold firm. Sway slowly. You are the regulator.",
      subPrompt: "Your nervous system is the safe place.",
      why: "Co-regulation is literal at this age. Firm hold + rhythmic movement activates parasympathetic via proprioception.",
      timerSecs: 30,
    },
    "18m_3y": {
      key: "come_down_with_me",
      title: "Come Down With Me",
      prompt: "Sit on the floor slowly. Start stacking something. Say nothing.",
      subPrompt: "Don't invite them. Just start. They'll come.",
      why: "Parallel floor play with no invitation removes demand. Child's curiosity pulls them in naturally.",
      timerSecs: 30,
    },
    "3_5y": {
      key: "the_secret_tipping",
      title: "The Secret",
      prompt: '"I have a secret. Come here." Then wait.',
      subPrompt: "Whisper it. Don't explain what the secret is.",
      why: "Curiosity is incompatible with threat response. The mystery creates an involuntary orientation response.",
      timerSecs: 30,
    },
    "5_7y": {
      key: "heavy_work",
      title: "Heavy Work",
      prompt: '"Help me push this wall." Push together for 30 seconds.',
      subPrompt: "Any wall. Press hard together. Feel your bodies working as a team.",
      why: "Proprioceptive heavy work is inherently regulating. Shared physical goal bypasses PFC entirely.",
      timerSecs: 30,
    },
  },
};

// ─── HELPER ──────────────────────────────────────────────────────────────────
// Get the correct game for a child state + age band.
// Returns null if no match found.

export function getCoRegGame(childState, ageBand) {
  return CO_REG_GAMES[childState]?.[ageBand] ?? null;
}

// ─── AGE BAND CALCULATOR ─────────────────────────────────────────────────────
// Derives age band from a child's date of birth string (ISO format).
// Used to auto-select age band from child profile DOB.

export function getAgeBand(dobString) {
  if (!dobString) return null;
  const dob = new Date(dobString);
  const now = new Date();
  const ageInMonths =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth());

  if (ageInMonths < 18)  return "0_18m";
  if (ageInMonths < 36)  return "18m_3y";
  if (ageInMonths < 60)  return "3_5y";
  if (ageInMonths < 84)  return "5_7y";
  return null; // outside 0-7 range
}

// ─── PARENT RESET CONTENT ────────────────────────────────────────────────────
// Content for Screen 2 parent reset games.
// Keyed by reset type: A | B | C

export const PARENT_RESETS = {
  A: {
    type: "A",
    title: "Exhale the Wind",
    prompt: "Blow slowly. Keep the leaf floating.",
    mechanic: "mic", // uses microphone input
    bpm: null,
    why: "Extended exhale activates parasympathetic NS fastest. Visual consequence of fast blow teaches pacing without instruction.",
  },
  B: {
    type: "B",
    title: "The Grounding Tree",
    prompt: "Press both thumbs. Match the pulse.",
    mechanic: "haptic", // uses haptic + touch
    bpmStart: 75,
    bpmEnd: 60,
    why: "Physical anchor engages motor cortex. Rhythmic haptic at 75→60 BPM entrains NS down via biological entrainment.",
  },
  C: {
    type: "C",
    title: "Clear the Fog",
    prompt: "Drag slowly. See what's there.",
    mechanic: "drag", // uses touch drag with friction
    bpm: null,
    why: "Shutdown needs somatic tracking + sensory awakening. Deliberate dragging with resistance wakes frozen dorsal system.",
  },
};

// ─── PARENT STATE → RESET MAPPING ────────────────────────────────────────────
// Maps parent state selection to the correct reset type.
// wont_listen has a substate branch handled in SOSFlow.

export const PARENT_STATE_TO_RESET = {
  twitchy_wired:  "A",
  drowning:       "B",
  foggy:          "C",
  already_snapped: "B", // repair flow uses grounding tree
  // wont_listen → determined by substate: mad_anxious → A, done_exhausted → C
};

// ─── CHILD STATE LABELS ───────────────────────────────────────────────────────
// Display labels for Screen 3 child read cards.

export const CHILD_STATE_OPTIONS = [
  {
    id: "flooded",
    emoji: "🔥",
    label: "Moving, loud, coming at you",
  },
  {
    id: "shutdown",
    emoji: "🧊",
    label: "Still, quiet, pulling away",
  },
  {
    id: "tipping",
    emoji: "⚡",
    label: "Bouncing between both",
  },
];

// ─── REPAIR FLOW CONTENT ─────────────────────────────────────────────────────

export const REPAIR_FLOW = {
  acknowledge: {
    heading: "It happened.",
    body: "You're not a bad parent. You're a human one.",
    cta: "Take one breath. Then we'll figure out what's next.",
  },
  script: {
    heading: "Kneel down. Say this.",
    line: '"I got too big back there. That wasn\'t okay. I love you."',
    subPrompt: "Then just hold them if they'll let you.",
  },
  complete: {
    heading: "Repair is one of the most powerful things a parent can do.",
    body: "Your child just learned: relationships can heal.",
    leaves: 1,
  },
};
