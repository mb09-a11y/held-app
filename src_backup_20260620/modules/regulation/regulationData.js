// src/modules/regulation/regulationData.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for NS state metadata, exercise library, and
// state → exercise mappings. Import from here — never duplicate.
// ─────────────────────────────────────────────────────────────────────────────

// ─── STATE METADATA ───────────────────────────────────────────────────────────
export const STATE_META = {
  Regulated: { color:"#7BAA8A", icon:"🌿", label:"Regulated",  short:"Ventral",    bg:"rgba(123,170,138,0.14)" },
  Fight:     { color:"#C07070", icon:"🔥", label:"Fight",       short:"Activated",  bg:"rgba(192,112,112,0.14)" },
  Flight:    { color:"#A89B5A", icon:"⚡", label:"Flight",      short:"Anxious",    bg:"rgba(168,155,90,0.14)"  },
  Freeze:    { color:"#7B8FAA", icon:"❄️", label:"Freeze",      short:"Low Energy", bg:"rgba(123,143,170,0.14)" },
  Shutdown:  { color:"#8A7BAA", icon:"🌑", label:"Shutdown",    short:"Dorsal",     bg:"rgba(138,123,170,0.14)" },
  Stretched: { color:"#B8924A", icon:"〰️", label:"Stretched",   short:"Depleted",   bg:"rgba(184,146,74,0.14)"  },
};

// ─── EXERCISE LIBRARY ─────────────────────────────────────────────────────────
export const EXERCISES = {
  body_scan: {
    id:"body_scan", title:"Body Scan", duration:"1 min 42 sec", durationSec:102,
    tag:"soothing",
    desc:"A slow, gentle scan from head to toe to locate where you're holding tension — and let it soften.",
    audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770311704/bodyscan_cqugpk.m4a",
    states:["Flight","Regulated"],
  },
  butterfly_hug: {
    id:"butterfly_hug", title:"Butterfly Hug", duration:"1 min 25 sec", durationSec:85,
    tag:"soothing",
    desc:"Cross your arms over your chest and tap alternating sides gently. Bilateral movement helps your nervous system settle.",
    audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770320497/butterfly_hug_lkdcqo.m4a",
    states:["Fight","Flight"],
  },
  drop_shoulders: {
    id:"drop_shoulders", title:"Drop the Shoulders", duration:"35 sec", durationSec:35,
    tag:"downshift",
    desc:"Exhale, roll your shoulders back and down. Unclench your jaw. Let your spine soften.",
    audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770320498/Drop_the_shoulders_khikvb.m4a",
    states:["Fight"],
  },
  gentle_wake_up: {
    id:"gentle_wake_up", title:"Gentle Wake Up", duration:"1 min 18 sec", durationSec:78,
    tag:"upshift",
    desc:"Soft movement and breath to gently activate without overwhelming a frozen system.",
    audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770319380/gentlewakeup_emkew6.m4a",
    states:["Freeze","Flight"],
  },
  gratitude: {
    id:"gratitude", title:"Gratitude Pause", duration:"1 min 35 sec", durationSec:95,
    tag:"orienting",
    desc:"Three slow breaths, then one small thing that felt okay today. Just one. That's enough.",
    audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770311704/gratitude_xoiksx.m4a",
    states:["Regulated","Freeze"],
  },
  grounding: {
    id:"grounding", title:"Roots Grounding", duration:"2 min", durationSec:120,
    tag:"grounding",
    desc:"A visualization to anchor you back into your body and the present moment. Feet on the floor, roots in the ground.",
    audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1779495201/full_grounding_uhy9bf.m4a",
    states:["Shutdown"],
  },
  held_visualization: {
    id:"held_visualization", title:"Held Visualization", duration:"1 min 30 sec", durationSec:90,
    tag:"soothing",
    desc:"A gentle guided visualization to help you feel held and safe. Good for moments when you need to feel less alone.",
    audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770312081/heldvisualization_syjyp8.m4a",
    states:["Shutdown","Freeze","Flight"],
  },
  humming: {
    id:"humming", title:"Humming", duration:"1 min 20 sec", durationSec:80,
    tag:"downshift",
    desc:"Humming activates the vagus nerve through vibration. Even a soft hum counts.",
    audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770319380/humming_tll9hs.m4a",
    states:["Fight","Freeze"],
  },
  orient: {
    id:"orient", title:"Orient", duration:"1 min 21 sec", durationSec:81,
    tag:"orienting",
    desc:"Slowly look around your space. Name what you see. Let your eyes land somewhere that feels neutral or soft.",
    audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770319380/orient_lhnf0c.m4a",
    states:["Flight","Freeze","Shutdown","Regulated"],
  },
  reset: {
    id:"reset", title:"Reset Breathing", duration:"1 min", durationSec:60,
    tag:"downshift",
    desc:"Extended exhale breathing (4 in, 6 out). Longer exhales activate the parasympathetic brake.",
    audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770320497/reset_l6bq1j.m4a",
    states:["Fight","Flight"],
    // NOTE: removed from Shutdown — breathing is not accessible in deep dorsal shutdown
  },
  tapping: {
    id:"tapping", title:"Freeze Reset Tapping", duration:"3 min", durationSec:180,
    tag:"bilateral",
    desc:"EFT-style tapping through 8 points to move stuck energy and come back to your body. A PDF guide is available below.",
    audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1779495085/tapping_full_dzuqv4.m4a",
    pdfUrl:"https://fzokhiqiulflvgkbzqel.supabase.co/storage/v1/object/public/Library/EFT_Tapping_Guide_v2.pdf",
    states:["Freeze"],
  },
};

// ─── STATE → EXERCISE MAPPINGS ────────────────────────────────────────────────
// Order matters — first item is the primary suggestion in post-checkin offer.
// Clinical rationale:
//   Regulated → maintenance and deepening (gratitude, body scan, orient)
//   Fight     → discharge + slow down (drop shoulders, reset breathing, humming, butterfly hug)
//   Flight    → give the scan something to do (orient, gentle wake up, reset)
//   Freeze    → bilateral activation to move stuck energy (tapping, gentle wake up, humming)
//   Shutdown  → gentle return to present (grounding, orient, held visualization)
//   Stretched → gentle mixed (orient, body scan, humming)
export const STATE_EXERCISES = {
  Regulated: ["gratitude",  "body_scan",     "orient"            ],
  Fight:     ["drop_shoulders", "reset",     "humming", "butterfly_hug"],
  Flight:    ["orient",     "gentle_wake_up","reset"             ],
  Freeze:    ["tapping",    "gentle_wake_up","humming"           ],
  Shutdown:  ["grounding",  "orient",        "held_visualization"],
  Stretched: ["orient",     "body_scan",     "humming"           ],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Returns ordered exercise objects for a given NS state.
 * Falls back to Stretched if state not found.
 */
export function getExercisesForState(state) {
  const ids = STATE_EXERCISES[state] || STATE_EXERCISES["Stretched"];
  return ids.map(id => EXERCISES[id]).filter(Boolean);
}

/**
 * Returns the primary (first) exercise for a given NS state.
 * Used in post-checkin regulation offer.
 */
export function getPrimaryExercise(state) {
  return getExercisesForState(state)[0] || null;
}
