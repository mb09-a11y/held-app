// src/modules/milestones/data/milestones.js
//
// Held Milestones & Development Data
// Sources: CDC (2022 updated), WHO Motor Development Study, AAP, Zero to Three, Wonder Weeks
//
// IMPORTANT PHILOSOPHY:
// - Ranges reflect typical variation, NOT pass/fail thresholds
// - "Typical range" means most children get here somewhere in this window
// - A child not yet reaching a milestone is NOT behind — they are still developing
// - Always redirect to pediatrician for concerns — we never diagnose or alarm
// - The nervous system lens is woven throughout — sensitive systems, birth experience,
//   temperament, and environment all affect developmental timing
// - Wonder Weeks leaps are based on DUE DATE, not birth date
//
// ─── DATA SHAPE ──────────────────────────────────────────────────────────────
//
// Each milestone:
// {
//   id: string,               — unique, stable identifier
//   domain: string,           — one of the DOMAINS keys below
//   title: string,            — short, celebratory name
//   description: string,      — what this looks like in real life
//   typical_range: [min, max], — months (inclusive), 10th–90th percentile where available
//   source: string[],         — attribution
//   ns_context: string,       — nervous system lens — why this happens, what affects timing
//   ped_note: string | null,  — when/why to mention pediatrician (null = no specific concern flag)
//   age_group: string,        — for grouping in UI: "newborn" | "infant" | "older_infant" | "toddler" | "older_toddler"
// }
//
// ─── DOMAINS ─────────────────────────────────────────────────────────────────

export const DOMAINS = {
  gross_motor:    { id: "gross_motor",    label: "Gross Motor",              emoji: "🏃", color: "#7B9EA8" },
  fine_motor:     { id: "fine_motor",     label: "Fine Motor",               emoji: "✋", color: "#A8907B" },
  language:       { id: "language",       label: "Language & Communication", emoji: "💬", color: "#8A7BAA" },
  social:         { id: "social",         label: "Social & Emotional",       emoji: "❤️", color: "#A87B8A" },
  cognitive:      { id: "cognitive",      label: "Cognitive & Play",         emoji: "🧠", color: "#7BAA8A" },
  sensory_ns:     { id: "sensory_ns",     label: "Sensory & Nervous System", emoji: "🌿", color: "#AA9B7B" },
};

// ─── AGE GROUPS ──────────────────────────────────────────────────────────────

export const AGE_GROUPS = [
  { id: "newborn",       label: "Newborn",        range: [0, 2],   emoji: "🌱" },
  { id: "infant",        label: "Infant",          range: [2, 6],   emoji: "🌼" },
  { id: "older_infant",  label: "Older Infant",    range: [6, 12],  emoji: "🌿" },
  { id: "young_toddler", label: "Young Toddler",   range: [12, 18], emoji: "🌻" },
  { id: "toddler",       label: "Toddler",         range: [18, 24], emoji: "🌳" },
  { id: "older_toddler", label: "Older Toddler",   range: [24, 30], emoji: "🌈" },
];

// ─── BRAIN DEVELOPMENT CONTEXT ───────────────────────────────────────────────
// Shown as a persistent banner/card throughout the module.
// Grounded in peer-reviewed neuroscience.

export const BRAIN_DEVELOPMENT_CONTEXT = [
  {
    age_range: [0, 3],
    title: "The Brain is Being Built",
    body: "In the first three years of life, your baby's brain forms over a million new neural connections every second. The prefrontal cortex — the part responsible for self-regulation, impulse control, and decision-making — is barely online yet. This is why babies and toddlers cannot calm themselves down without your help. Co-regulation isn't a parenting choice, it's a biological necessity.",
    source: "Zero to Three; PMC research on early prefrontal cortex development",
  },
  {
    age_range: [3, 7],
    title: "Still Under Construction",
    body: "Big feelings, meltdowns, and difficulty waiting are all developmentally normal in preschool years — not signs of bad behavior. The prefrontal cortex is rapidly expanding but still years from maturity. Your child genuinely cannot regulate without a calm, co-regulating adult nearby. Your nervous system is their external regulator.",
    source: "AAP; Polyvagal Theory (Porges); CDC developmental guidelines",
  },
  {
    age_range: [7, 12],
    title: "Growing, But Not There Yet",
    body: "School-age children can handle more emotional complexity, but still rely heavily on co-regulation from trusted adults. The prefrontal cortex begins a major pruning process around age 11 that won't complete until ~25. Big feelings, peer conflicts, and sensory sensitivities are all part of a developing nervous system — not personality flaws.",
    source: "Research on prefrontal cortex maturation (Steinberg; Casey et al.)",
  },
  {
    age_range: [12, 18],
    title: "The Powerful Engine, Still Building Brakes",
    body: "Adolescent brains have a highly active limbic system (emotional, reward-driven) but a still-developing prefrontal cortex (brakes, judgment, planning). Teens genuinely feel emotions more intensely than adults — it's neurological, not dramatic. Co-regulation remains essential even for teenagers. They still need calm, present adults.",
    source: "Steinberg (2008); Galván, UCLA Developmental Neuroscience Lab; PMC neuroscience research",
  },
  {
    age_range: [18, 30],
    title: "Almost There — But the Journey Continues",
    body: "The prefrontal cortex doesn't fully mature until around age 25. Young adults in their early 20s are still completing the wiring needed for consistent impulse control, long-term planning, and emotional regulation. This is normal. Development is not a race with a finish line — it's a lifelong process.",
    source: "Galván (UCLA); PMC adolescent brain maturation research",
  },
];

// ─── WONDER WEEKS LEAPS ──────────────────────────────────────────────────────
// Based on due date, not birth date.
// Source: Plooij, van de Rijt — The Wonder Weeks (original research)
// Note: We reference the framework, not reproduce proprietary content.

export const WONDER_WEEKS_LEAPS = [
  {
    leap: 1,
    title: "The World of Sensations",
    weeks_from_due: [4, 6],
    approx_months: 1,
    what_baby_is_learning: "Becoming more aware of sights, sounds, tastes, smells, and touch. The world suddenly feels more vivid and overwhelming.",
    ns_context: "The nervous system is flooded with new input. Increased fussiness, clinginess, and need for closeness is the baby communicating: 'this is a lot, I need you.' Proximity to a regulated caregiver is the nervous system's reset button at this stage.",
  },
  {
    leap: 2,
    title: "The World of Patterns",
    weeks_from_due: [7, 10],
    approx_months: 2,
    what_baby_is_learning: "Starting to recognize simple patterns — in sound, movement, and vision. Beginning to understand that things repeat and are predictable.",
    ns_context: "Predictability is deeply regulating to the nervous system. As baby starts to detect patterns, familiar rhythms (feeding cues, voices, routines) become more soothing than ever.",
  },
  {
    leap: 3,
    title: "The World of Smooth Transitions",
    weeks_from_due: [11, 13],
    approx_months: 3,
    what_baby_is_learning: "Discovering that things move and change fluidly — movement, sounds, light. Beginning to track objects and follow motion with their eyes.",
    ns_context: "Rapid perceptual change can feel destabilizing. A highly sensitive nervous system may struggle more during this leap, showing increased startle responses or difficulty settling.",
  },
  {
    leap: 4,
    title: "The World of Events",
    weeks_from_due: [14, 20],
    approx_months: 4,
    what_baby_is_learning: "Beginning to understand that things happen in sequence — cause and effect. This leap often coincides with the 4-month sleep regression as the brain reorganizes sleep cycles.",
    ns_context: "This is one of the most neurologically intensive leaps. The brain is literally restructuring sleep architecture, which is why the 4-month regression is so significant and so hard to 'fix' — it's not a problem, it's brain growth.",
  },
  {
    leap: 5,
    title: "The World of Relationships",
    weeks_from_due: [22, 27],
    approx_months: 6,
    what_baby_is_learning: "Understanding that things and people exist in relationship to each other — distance, space, and connection. Object permanence begins here. Separation anxiety emerges as a direct result of this awareness.",
    ns_context: "Separation anxiety at this stage is neurologically expected and healthy — it means your baby's brain now understands that you can leave. Their nervous system needs time to learn that departure is safe and temporary.",
  },
  {
    leap: 6,
    title: "The World of Categories",
    weeks_from_due: [33, 38],
    approx_months: 8,
    what_baby_is_learning: "Grouping and categorizing the world — things that are alike, things that are different, things that belong together. This is a huge cognitive leap.",
    ns_context: "As baby develops stronger opinions and preferences, what looks like stubbornness is actually an emerging cognitive sophistication. The nervous system is becoming more discerning.",
  },
  {
    leap: 7,
    title: "The World of Sequences",
    weeks_from_due: [41, 47],
    approx_months: 10,
    what_baby_is_learning: "Understanding that actions follow a sequence — first this, then that. Beginning to do things in order purposefully.",
    ns_context: "Predictable routines become even more regulating now because baby can anticipate what comes next. A consistent sequence before sleep (bath, book, feed, down) is deeply regulating for a nervous system that now understands 'what happens next.'",
  },
  {
    leap: 8,
    title: "The World of Programs",
    weeks_from_due: [51, 56],
    approx_months: 12,
    what_baby_is_learning: "Understanding that sequences can be combined into 'programs' — flexible plans that can be adapted. The beginning of true problem-solving.",
    ns_context: "The 12-month developmental leap often brings intense clinginess and sleep disruption. This isn't regression — it's the nervous system integrating enormous complexity.",
  },
  {
    leap: 9,
    title: "The World of Principles",
    weeks_from_due: [60, 65],
    approx_months: 15,
    what_baby_is_learning: "Discovering the underlying principles that guide behavior — fairness, rules, how things should work. Testing boundaries is part of this.",
    ns_context: "What looks like defiance at 15 months is often a toddler whose nervous system is running experiments to understand cause and effect in relationships. The 'no' phase is cognitive development in action.",
  },
  {
    leap: 10,
    title: "The World of Systems",
    weeks_from_due: [70, 76],
    approx_months: 17,
    what_baby_is_learning: "Beginning to understand that the world is made up of interrelated systems — families, rules, communities, values. This is the final Wonder Weeks leap.",
    ns_context: "By 17-20 months, a toddler is developing a sense of self within a larger world. Emotional intensity during this period reflects a nervous system working hard to integrate complex new awareness.",
  },
];

// ─── MILESTONES DATA ─────────────────────────────────────────────────────────

export const MILESTONES = [

  // ── GROSS MOTOR ────────────────────────────────────────────────────────────

  {
    id: "gm_tummy_lifts_head",
    domain: "gross_motor",
    title: "Lifts head during tummy time",
    description: "When placed on their tummy, baby begins lifting their head briefly, building neck strength.",
    typical_range: [1, 3],
    source: ["CDC 2022", "AAP"],
    ns_context: "Tummy time is not just physical — it activates the vestibular system (balance and spatial awareness), which is foundational for nervous system organization. Some babies with a sensitive nervous system find tummy time overwhelming at first. Short, frequent sessions with you close by can help.",
    ped_note: null,
    age_group: "newborn",
  },
  {
    id: "gm_rolls_front_to_back",
    domain: "gross_motor",
    title: "Rolls front to back",
    description: "Baby rolls from their tummy to their back.",
    typical_range: [2, 5],
    source: ["CDC 2022", "WHO Motor Study"],
    ns_context: "Rolling is a sign the nervous system is developing integration between the two sides of the body (bilateral coordination). Some babies skip or delay rolling without any underlying concern — it's one of the most variable gross motor milestones.",
    ped_note: "If your child has not rolled either direction by 6 months, it's worth mentioning to your pediatrician — not to alarm, but to get their perspective.",
    age_group: "infant",
  },
  {
    id: "gm_rolls_back_to_front",
    domain: "gross_motor",
    title: "Rolls back to front",
    description: "Baby rolls from their back to their tummy, a more complex movement than the reverse.",
    typical_range: [4, 6],
    source: ["CDC 2022", "WHO Motor Study"],
    ns_context: "This direction of rolling requires more core activation and neurological coordination. It often follows front-to-back rolling by a few weeks.",
    ped_note: null,
    age_group: "infant",
  },
  {
    id: "gm_sits_with_support",
    domain: "gross_motor",
    title: "Sits with support",
    description: "Baby can sit upright when supported by your hands or a surface.",
    typical_range: [3, 5],
    source: ["CDC 2022", "AAP"],
    ns_context: "Sitting with support reflects developing core tone and proprioceptive awareness (knowing where the body is in space). A baby who seems 'floppy' or unusually tense in supported sitting may have a nervous system that benefits from gentle movement-based play.",
    ped_note: null,
    age_group: "infant",
  },
  {
    id: "gm_sits_without_support",
    domain: "gross_motor",
    title: "Sits without support",
    description: "Baby can sit independently without hands or props for a sustained period.",
    typical_range: [4, 9],
    source: ["WHO Motor Study (range: 3.8–9.2 months)", "CDC 2022"],
    ns_context: "The WHO's research across five countries found this window spans nearly 5 months — one of the clearest examples of how wide 'typical' really is. Premature babies, babies with highly sensitive systems, or babies with less tummy time experience may reach this on the later end of the range.",
    ped_note: "If your child is not sitting independently by 9 months, share this with your pediatrician at your next visit.",
    age_group: "infant",
  },
  {
    id: "gm_standing_with_assistance",
    domain: "gross_motor",
    title: "Stands with assistance",
    description: "Baby can hold a standing position when supported by your hands or pulling up on furniture.",
    typical_range: [5, 11],
    source: ["WHO Motor Study (range: 4.8–11.4 months)"],
    ns_context: "Weight-bearing through the legs activates deep proprioceptive pathways that contribute to overall nervous system regulation. Many babies find this calming once they can do it.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "gm_crawls_hands_knees",
    domain: "gross_motor",
    title: "Crawls on hands and knees",
    description: "Baby moves on hands and knees in a coordinated pattern.",
    typical_range: [5, 14],
    source: ["WHO Motor Study (range: 5.2–13.5 months)", "CDC 2022"],
    ns_context: "Hands-and-knees crawling is neurologically significant — the cross-body pattern (right arm, left knee) integrates both brain hemispheres and builds neural pathways used later in reading and complex movement. However, about 4% of typically developing children never crawl in this pattern, opting instead to scoot, roll, or bottom-shuffle. This is a normal variation, not a concern.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "gm_pulls_to_stand",
    domain: "gross_motor",
    title: "Pulls to standing",
    description: "Baby pulls themselves up to standing using furniture or your hands.",
    typical_range: [7, 12],
    source: ["CDC 2022", "AAP"],
    ns_context: "This milestone reflects a major integration of gross motor control, balance, and problem-solving. The vestibular system (balance) and proprioceptive system are both heavily engaged.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "gm_stands_alone",
    domain: "gross_motor",
    title: "Stands alone",
    description: "Baby stands independently without holding anything.",
    typical_range: [7, 17],
    source: ["WHO Motor Study (range: 6.9–16.9 months)", "CDC 2022"],
    ns_context: "The WHO's 10-month window for this milestone is a powerful reminder that 'typical' spans a very wide range. A baby who is pulling to stand and cruising confidently at 10 months is developmentally on track even if they don't let go and stand alone until 14 or 15 months.",
    ped_note: "If your child is not standing alone by 15 months, mention it to your pediatrician — not urgently, but as a topic for your next visit.",
    age_group: "young_toddler",
  },
  {
    id: "gm_walks_alone",
    domain: "gross_motor",
    title: "Walks independently",
    description: "Child walks on their own without support.",
    typical_range: [8, 18],
    source: ["WHO Motor Study (range: 8.2–17.6 months)", "CDC 2022"],
    ns_context: "Walking is one of the most variable milestones in human development — the WHO found a nearly 10-month window of typical onset. A baby who walks at 17 months is walking at a completely typical age. Factors that can affect timing include temperament (cautious babies often walk later), body type, amount of time spent in baby equipment, and nervous system sensitivity.",
    ped_note: "If your child is not walking independently by 18 months, your pediatrician will want to know — this is a well-established clinical checkpoint.",
    age_group: "young_toddler",
  },
  {
    id: "gm_runs",
    domain: "gross_motor",
    title: "Runs (though may be unsteady)",
    description: "Toddler runs — usually with a wide base and occasional falls — but propels forward with some airtime.",
    typical_range: [16, 24],
    source: ["CDC 2022", "AAP"],
    ns_context: "Running requires the nervous system to process balance, proprioception, and motor planning simultaneously. Falls at this age are completely expected and part of how the nervous system learns to calibrate movement.",
    ped_note: null,
    age_group: "toddler",
  },
  {
    id: "gm_kicks_ball",
    domain: "gross_motor",
    title: "Kicks a ball",
    description: "Child kicks a ball forward while standing.",
    typical_range: [18, 24],
    source: ["CDC 2022"],
    ns_context: "Kicking requires weight-shifting and single-leg balance — a significant vestibular and proprioceptive challenge. Children with sensory processing differences may reach this later.",
    ped_note: null,
    age_group: "toddler",
  },
  {
    id: "gm_jumps",
    domain: "gross_motor",
    title: "Jumps with both feet",
    description: "Child lifts both feet off the ground in a jump.",
    typical_range: [22, 30],
    source: ["CDC 2022", "AAP"],
    ns_context: "Jumping is a complex vestibular and proprioceptive milestone. Children who seek or avoid sensory input may reach this milestone at opposite ends of the range — both are normal.",
    ped_note: null,
    age_group: "older_toddler",
  },
  {
    id: "gm_climbs_stairs",
    domain: "gross_motor",
    title: "Climbs stairs with support",
    description: "Child navigates stairs while holding a railing or hand.",
    typical_range: [15, 24],
    source: ["CDC 2022", "AAP"],
    ns_context: "Stair climbing requires graded motor control and spatial reasoning. Some toddlers approach this cautiously — a cautious nervous system is not the same as a delayed one.",
    ped_note: null,
    age_group: "toddler",
  },

  // ── FINE MOTOR ─────────────────────────────────────────────────────────────

  {
    id: "fm_hands_fisted",
    domain: "fine_motor",
    title: "Hands mostly fisted (newborn reflex)",
    description: "Newborn keeps hands in tight fists — a normal neonatal pattern.",
    typical_range: [0, 2],
    source: ["AAP", "CDC 2022"],
    ns_context: "The palmar grasp reflex is hardwired into the newborn nervous system. It will gradually release over the first few months as voluntary motor control develops.",
    ped_note: null,
    age_group: "newborn",
  },
  {
    id: "fm_bats_at_objects",
    domain: "fine_motor",
    title: "Bats at objects",
    description: "Baby swipes or reaches toward objects within their visual field.",
    typical_range: [2, 4],
    source: ["CDC 2022", "AAP"],
    ns_context: "The hand-eye coordination beginning here is a foundational sensory-motor loop — the brain is learning to connect what it sees with what the body can do.",
    ped_note: null,
    age_group: "infant",
  },
  {
    id: "fm_reaches_grasps",
    domain: "fine_motor",
    title: "Reaches and grasps objects",
    description: "Baby intentionally reaches for and grasps a toy or object.",
    typical_range: [3, 6],
    source: ["CDC 2022", "Zero to Three"],
    ns_context: "Intentional reaching marks a major shift in voluntary motor control — the baby's nervous system is now initiating goal-directed movement rather than reflexive responses.",
    ped_note: "If your baby is not reaching for objects by 6 months, mention it at their well visit.",
    age_group: "infant",
  },
  {
    id: "fm_transfers_hands",
    domain: "fine_motor",
    title: "Transfers objects hand to hand",
    description: "Baby passes a toy from one hand to the other.",
    typical_range: [5, 8],
    source: ["CDC 2022"],
    ns_context: "Hand-to-hand transfer is a bilateral coordination milestone — both brain hemispheres are beginning to work together. This is an early precursor to the same neural pathways used in reading.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "fm_pincer_grasp",
    domain: "fine_motor",
    title: "Develops pincer grasp",
    description: "Baby picks up small objects using thumb and index finger.",
    typical_range: [8, 12],
    source: ["CDC 2022", "AAP"],
    ns_context: "The pincer grasp reflects significant neural maturation in the cortex. It's often one of the first signs of the refined hand control that will eventually enable writing, drawing, and self-feeding.",
    ped_note: "If pincer grasp has not emerged by 12 months, mention it at your pediatric appointment.",
    age_group: "older_infant",
  },
  {
    id: "fm_bangs_objects",
    domain: "fine_motor",
    title: "Bangs objects together",
    description: "Baby deliberately bangs two objects together.",
    typical_range: [7, 10],
    source: ["CDC 2022"],
    ns_context: "Banging is not just play — it's proprioceptive input-seeking. Many babies use banging to regulate their nervous system. The sensory feedback from impact helps the brain calibrate force and spatial relationships.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "fm_self_feeds_finger",
    domain: "fine_motor",
    title: "Self-feeds finger foods",
    description: "Baby picks up and brings finger foods to their mouth independently.",
    typical_range: [8, 12],
    source: ["AAP", "CDC 2022"],
    ns_context: "Self-feeding engages multiple sensory systems simultaneously — tactile, proprioceptive, oral, and visual. Babies with oral sensory sensitivity may resist certain textures; this is a nervous system response, not pickiness.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "fm_stacks_blocks",
    domain: "fine_motor",
    title: "Stacks two or more blocks",
    description: "Toddler places one block on top of another.",
    typical_range: [12, 18],
    source: ["CDC 2022", "Zero to Three"],
    ns_context: "Stacking requires hand-eye coordination, graded force control, and spatial reasoning — three separate neural systems working in concert.",
    ped_note: null,
    age_group: "young_toddler",
  },
  {
    id: "fm_scribbles",
    domain: "fine_motor",
    title: "Scribbles with crayons",
    description: "Toddler makes intentional marks on paper with a writing tool.",
    typical_range: [15, 24],
    source: ["CDC 2022", "AAP"],
    ns_context: "Scribbling is the earliest form of symbolic communication. It reflects both fine motor development and the beginning of understanding that marks carry meaning.",
    ped_note: null,
    age_group: "toddler",
  },
  {
    id: "fm_uses_spoon",
    domain: "fine_motor",
    title: "Uses a spoon",
    description: "Child attempts to use a spoon to bring food to their mouth.",
    typical_range: [15, 24],
    source: ["CDC 2022", "AAP"],
    ns_context: "Spoon use requires wrist rotation, grip control, and proprioceptive feedback — a sophisticated motor achievement. Messy eating is not a sign of failure — it's sensory motor learning happening in real time.",
    ped_note: null,
    age_group: "toddler",
  },
  {
    id: "fm_turns_pages",
    domain: "fine_motor",
    title: "Turns book pages",
    description: "Child turns pages in a book, initially several at once, later one at a time.",
    typical_range: [12, 24],
    source: ["Zero to Three", "CDC 2022"],
    ns_context: "Page-turning requires fine proprioceptive control and the ability to apply graded pressure — skills being built across many other fine motor activities.",
    ped_note: null,
    age_group: "young_toddler",
  },

  // ── LANGUAGE & COMMUNICATION ───────────────────────────────────────────────

  {
    id: "lang_cries_communicates",
    domain: "language",
    title: "Cries to communicate needs",
    description: "Newborn uses crying as their primary communication tool for hunger, discomfort, tiredness, and overstimulation.",
    typical_range: [0, 1],
    source: ["AAP", "Zero to Three"],
    ns_context: "Crying is a nervous system output — it activates the social engagement system and signals a need for co-regulation. Responding consistently to cries in the early months builds the neural pathways for secure attachment and emotional regulation.",
    ped_note: null,
    age_group: "newborn",
  },
  {
    id: "lang_social_smile",
    domain: "language",
    title: "Social smile",
    description: "Baby smiles in response to a face, voice, or interaction — not just gas.",
    typical_range: [1, 3],
    source: ["CDC 2022", "AAP"],
    ns_context: "The social smile is one of the earliest markers of the social engagement system (vagal nerve) coming online. It reflects the baby's nervous system beginning to recognize and respond to safe, connected faces.",
    ped_note: "If your baby is not smiling in response to you by 3 months, mention it at your next pediatric visit.",
    age_group: "newborn",
  },
  {
    id: "lang_coos",
    domain: "language",
    title: "Coos and makes soft sounds",
    description: "Baby produces vowel-like sounds ('ooh', 'aah') in response to faces and voices.",
    typical_range: [2, 4],
    source: ["CDC 2022", "Zero to Three"],
    ns_context: "Cooing is the beginning of the serve-and-return interaction pattern — one of the most foundational experiences for brain development. Each time you respond to your baby's sound, you're building neural connections.",
    ped_note: null,
    age_group: "infant",
  },
  {
    id: "lang_laughs",
    domain: "language",
    title: "Laughs and squeals",
    description: "Baby produces laughter and high-pitched sounds of delight.",
    typical_range: [3, 5],
    source: ["CDC 2022"],
    ns_context: "Laughter is a ventral vagal expression — it signals that the baby's nervous system is in a state of safe connection. It's both a communication milestone and a regulation milestone.",
    ped_note: null,
    age_group: "infant",
  },
  {
    id: "lang_babbles_consonants",
    domain: "language",
    title: "Babbles with consonants",
    description: "Baby produces consonant-vowel combinations like 'ba', 'da', 'ma'.",
    typical_range: [5, 9],
    source: ["CDC 2022", "ASHA"],
    ns_context: "Babbling is not random — babies babble more with caregivers who respond contingently. The serve-and-return interaction pattern literally shapes language development at a neural level.",
    ped_note: "If there is no babbling by 9 months, mention it to your pediatrician.",
    age_group: "older_infant",
  },
  {
    id: "lang_first_words",
    domain: "language",
    title: "First words with meaning",
    description: "Child uses one or more words consistently with clear intent (mama, dada, hi, no, dog).",
    typical_range: [9, 14],
    source: ["CDC 2022 (by 12 months)", "AAP", "ASHA"],
    ns_context: "First words represent an enormous neurological achievement — connecting a sound pattern to a concept and using it intentionally. Children who are quieter observers may begin speaking later but with more complex words. Highly sensitive children sometimes take longer to produce words while their nervous system processes everything it's absorbing.",
    ped_note: "If your child has no words by 16 months, discuss this with your pediatrician — not with alarm, but it's a milestone they'll want to know about.",
    age_group: "young_toddler",
  },
  {
    id: "lang_word_combinations",
    domain: "language",
    title: "Combines two words",
    description: "Child puts two words together ('more milk', 'daddy go', 'big dog').",
    typical_range: [18, 24],
    source: ["CDC 2022", "ASHA", "AAP"],
    ns_context: "Two-word combinations signal a developmental leap in cognitive and language processing — the child's brain is now holding two concepts and their relationship simultaneously. This is a significant neural milestone.",
    ped_note: "If your child is not combining two words by 24 months, this is worth mentioning to your pediatrician. They may suggest a speech evaluation — this is not cause for alarm, just gathering more information.",
    age_group: "toddler",
  },
  {
    id: "lang_points_to_request",
    domain: "language",
    title: "Points to communicate",
    description: "Baby points to request objects, share interest, or direct your attention.",
    typical_range: [10, 14],
    source: ["CDC 2022", "AAP"],
    ns_context: "Pointing to share interest (protodeclarative pointing, like 'look at that!') is distinct from pointing to request. Both are important, but pointing to share is especially significant — it reflects a developing theory of mind, the understanding that other people have different perspectives.",
    ped_note: "If your child is not pointing by 14 months, mention this to your pediatrician.",
    age_group: "young_toddler",
  },
  {
    id: "lang_follows_simple_directions",
    domain: "language",
    title: "Follows simple directions",
    description: "Child responds to simple one-step requests ('bring me the ball', 'come here').",
    typical_range: [10, 15],
    source: ["CDC 2022", "ASHA"],
    ns_context: "Following directions requires both language comprehension and the emerging executive function to inhibit other impulses and respond to a request. It's a window into how the language and regulatory systems are developing together.",
    ped_note: null,
    age_group: "young_toddler",
  },
  {
    id: "lang_uses_20_words",
    domain: "language",
    title: "Uses approximately 20 words",
    description: "Child has a vocabulary of around 20 words used regularly and intentionally.",
    typical_range: [18, 22],
    source: ["ASHA", "AAP"],
    ns_context: "Vocabulary growth at this age is exponential — some children have 5 words at 18 months and 100 at 24 months. The range is wide. What matters more than the exact number is that the child is communicating intentionally and that vocabulary is growing.",
    ped_note: "If your child has fewer than 10 words at 18 months, mention it at their well visit.",
    age_group: "toddler",
  },
  {
    id: "lang_two_word_sentences",
    domain: "language",
    title: "Uses simple 2-3 word sentences",
    description: "Child speaks in short sentences or phrases regularly.",
    typical_range: [24, 30],
    source: ["CDC 2022", "ASHA"],
    ns_context: "Sentence construction requires the brain to hold multiple words, their order, and their relationship simultaneously — a remarkable cognitive and linguistic achievement. Children who are later talkers often make rapid gains once they begin.",
    ped_note: "If your child is not using two-word phrases by 24 months, discuss this with your pediatrician.",
    age_group: "older_toddler",
  },

  // ── SOCIAL & EMOTIONAL ─────────────────────────────────────────────────────

  {
    id: "se_calms_with_caregiver",
    domain: "social",
    title: "Calms with a familiar caregiver",
    description: "Baby is soothed by being held, rocked, or comforted by a familiar person.",
    typical_range: [0, 3],
    source: ["Zero to Three", "AAP"],
    ns_context: "Co-regulation — the ability to calm because of proximity to a regulated caregiver — is not a spoiling mechanism. It is the foundational biological process through which babies eventually learn to self-regulate. You cannot over-hold a baby who needs to be held.",
    ped_note: null,
    age_group: "newborn",
  },
  {
    id: "se_recognizes_familiar_faces",
    domain: "social",
    title: "Recognizes familiar faces",
    description: "Baby shows recognition of familiar people through visual tracking, smiling, or calming.",
    typical_range: [1, 3],
    source: ["Zero to Three", "CDC 2022"],
    ns_context: "Face recognition is processed by some of the most primitive neural circuits — the face is literally the first 'safe signal' in the human nervous system. The faces a baby sees most frequently become associated with safety and regulation.",
    ped_note: null,
    age_group: "newborn",
  },
  {
    id: "se_shows_interest_others",
    domain: "social",
    title: "Shows interest in other people",
    description: "Baby watches people with interest, reaches toward faces, or becomes animated in social interactions.",
    typical_range: [2, 5],
    source: ["CDC 2022", "Zero to Three"],
    ns_context: "Social engagement is hardwired — humans are wired for connection. The ventral vagal nerve (part of the polyvagal system) specifically mediates facial expression, voice tone, and social engagement. A baby who is less socially engaged may be in a more mobilized or shut-down state, often related to sensory overwhelm.",
    ped_note: null,
    age_group: "infant",
  },
  {
    id: "se_separation_anxiety",
    domain: "social",
    title: "Shows separation anxiety",
    description: "Baby becomes upset when a familiar caregiver leaves — even briefly.",
    typical_range: [6, 12],
    source: ["AAP", "Zero to Three", "Wonder Weeks Leap 5"],
    ns_context: "Separation anxiety is neurologically healthy — it means baby now has object permanence (they know you exist when you're gone) but hasn't yet built the neural pathways to trust that absence is temporary. Co-regulation of this experience ('I'll be right back, I love you') builds exactly those pathways over time.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "se_stranger_anxiety",
    domain: "social",
    title: "Shows stranger wariness",
    description: "Baby becomes cautious or distressed around unfamiliar people.",
    typical_range: [6, 10],
    source: ["AAP", "Zero to Three"],
    ns_context: "Stranger wariness reflects healthy attachment — the nervous system has learned who is 'safe' and is appropriately cautious with the unfamiliar. Forcing interactions with strangers ('give grandma a hug') can dysregulate an already wary nervous system. Allowing the child to set the pace is protective.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "se_plays_peekaboo",
    domain: "social",
    title: "Enjoys peekaboo",
    description: "Baby anticipates and delights in peekaboo games.",
    typical_range: [5, 9],
    source: ["CDC 2022", "Zero to Three"],
    ns_context: "Peekaboo is essentially practice for separation and reunion — one of the most regulating games a caregiver can play with a baby. It teaches, through joy and play, that disappearance is followed by return.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "se_imitates_actions",
    domain: "social",
    title: "Imitates actions and expressions",
    description: "Baby mirrors facial expressions, sounds, or gestures back to you.",
    typical_range: [6, 10],
    source: ["CDC 2022", "Zero to Three"],
    ns_context: "Imitation is powered by mirror neurons — a neural system that activates both when we perform an action and when we watch someone else perform it. This system is foundational for empathy, language, and social learning.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "se_parallel_play",
    domain: "social",
    title: "Plays alongside other children (parallel play)",
    description: "Toddler plays near other children without directly playing with them — this is developmentally expected and healthy.",
    typical_range: [18, 30],
    source: ["Zero to Three", "AAP"],
    ns_context: "Parallel play is not antisocial — it's a developmentally appropriate precursor to collaborative play. The nervous systems of toddlers are not yet equipped to consistently regulate the unpredictability of other toddlers. Playing side-by-side is exactly the right level of social challenge at this age.",
    ped_note: null,
    age_group: "toddler",
  },
  {
    id: "se_shows_empathy",
    domain: "social",
    title: "Shows signs of empathy",
    description: "Child notices when others are upset and shows concern — offering a toy, patting, or looking worried.",
    typical_range: [18, 30],
    source: ["Zero to Three", "CDC 2022"],
    ns_context: "Empathy has its roots in early co-regulation experiences — babies who have had their own distress responded to consistently are more likely to notice and respond to others' distress. This is one of the most beautiful downstream effects of secure attachment.",
    ped_note: null,
    age_group: "toddler",
  },
  {
    id: "se_big_feelings_tantrums",
    domain: "social",
    title: "Experiences intense emotions / tantrums",
    description: "Toddler has meltdowns or intense emotional reactions that feel disproportionate to the trigger.",
    typical_range: [15, 30],
    source: ["AAP", "Zero to Three"],
    ns_context: "Tantrums are not manipulation — they are a dysregulated nervous system in overwhelm. The toddler's prefrontal cortex (the part that would allow them to 'calm down') is simply not developed enough to override the emotional brain. What looks like a tantrum is a child drowning in a flood of feelings with no life raft yet. Your calm presence is the life raft.",
    ped_note: null,
    age_group: "young_toddler",
  },

  // ── COGNITIVE & PLAY ───────────────────────────────────────────────────────

  {
    id: "cog_tracks_visually",
    domain: "cognitive",
    title: "Tracks objects visually",
    description: "Baby follows a moving object or face with their eyes.",
    typical_range: [0, 2],
    source: ["CDC 2022", "AAP"],
    ns_context: "Visual tracking is one of the earliest forms of sustained attention. The neural pathway between the eye and brain is actively being built in these first weeks.",
    ped_note: "If your baby is not tracking faces or objects by 2 months, mention it at your next well visit.",
    age_group: "newborn",
  },
  {
    id: "cog_object_permanence",
    domain: "cognitive",
    title: "Develops object permanence",
    description: "Baby understands that objects (and people) continue to exist even when out of sight.",
    typical_range: [6, 10],
    source: ["Zero to Three", "Piaget; validated by developmental research", "Wonder Weeks Leap 5"],
    ns_context: "Object permanence is a cognitive revolution — before it, 'out of sight, out of mind' was literally true for the baby's brain. After it, absence becomes meaningful, which is why separation anxiety and sleep challenges often intensify around this time. This is normal and developmentally healthy.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "cog_cause_effect",
    domain: "cognitive",
    title: "Explores cause and effect",
    description: "Baby deliberately repeats actions to produce a result — banging a toy, pressing a button, dropping food to watch it fall.",
    typical_range: [6, 10],
    source: ["Zero to Three", "CDC 2022", "Wonder Weeks Leap 4"],
    ns_context: "Cause-and-effect play is one of the purest expressions of scientific inquiry. When a baby drops food from their high chair for the 15th time, they are not being naughty — they are running experiments. This is the nervous system learning that actions have predictable consequences.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "cog_pretend_play",
    domain: "cognitive",
    title: "Begins pretend play",
    description: "Toddler uses objects symbolically — pretending to feed a stuffed animal, talking on a pretend phone.",
    typical_range: [12, 18],
    source: ["CDC 2022", "Zero to Three"],
    ns_context: "Pretend play reflects the emergence of symbolic thinking — the ability to let one thing represent another. This is the cognitive foundation for language (where sounds represent objects) and eventually, literacy (where letters represent sounds).",
    ped_note: null,
    age_group: "young_toddler",
  },
  {
    id: "cog_solves_simple_problems",
    domain: "cognitive",
    title: "Solves simple problems",
    description: "Child figures out how to get a toy that's out of reach, removes a lid to get something inside, or finds a creative solution to a small challenge.",
    typical_range: [10, 15],
    source: ["Zero to Three", "CDC 2022"],
    ns_context: "Problem-solving draws on the prefrontal cortex, which is still early in development. What we see at 10-15 months is the very beginning of executive function — planning, holding a goal in mind, and taking steps toward it.",
    ped_note: null,
    age_group: "young_toddler",
  },
  {
    id: "cog_names_body_parts",
    domain: "cognitive",
    title: "Points to or names body parts",
    description: "Child identifies at least 2 body parts when asked ('where's your nose?').",
    typical_range: [18, 24],
    source: ["CDC 2022"],
    ns_context: "Body awareness (interoception) is closely linked to nervous system regulation — children who have a strong sense of their own body are often better able to identify and communicate their internal states, which supports self-regulation over time.",
    ped_note: null,
    age_group: "toddler",
  },
  {
    id: "cog_sorts_shapes_colors",
    domain: "cognitive",
    title: "Begins sorting shapes and colors",
    description: "Child groups objects by simple categories — putting all the red blocks together, or fitting shapes into corresponding holes.",
    typical_range: [18, 30],
    source: ["CDC 2022", "Wonder Weeks Leap 6"],
    ns_context: "Categorization is a sophisticated cognitive achievement — the brain is building hierarchical knowledge structures that will eventually support math, reading, and abstract thinking.",
    ped_note: null,
    age_group: "toddler",
  },
  {
    id: "cog_symbolic_play_complex",
    domain: "cognitive",
    title: "Engages in more complex pretend play",
    description: "Child creates play scenarios, assigns roles to toys, or acts out simple stories.",
    typical_range: [24, 30],
    source: ["Zero to Three", "CDC 2022"],
    ns_context: "Complex pretend play is the brain practicing narrative — creating a story with a beginning, sequence, and often resolution. This is one of the most powerful ways children process their experiences and regulate emotions.",
    ped_note: null,
    age_group: "older_toddler",
  },

  // ── SENSORY & NERVOUS SYSTEM ───────────────────────────────────────────────

  {
    id: "sns_calms_to_voice",
    domain: "sensory_ns",
    title: "Calms to a familiar voice",
    description: "Newborn shows recognition of and soothing response to a familiar caregiver's voice.",
    typical_range: [0, 1],
    source: ["Zero to Three", "Polyvagal Theory (Porges)"],
    ns_context: "The prosody (rhythm and tone) of a caregiver's voice is processed by the nervous system before the words themselves. A calm, warm voice literally activates the ventral vagal system, shifting the baby from a state of activation toward safety and connection.",
    ped_note: null,
    age_group: "newborn",
  },
  {
    id: "sns_orients_to_sound",
    domain: "sensory_ns",
    title: "Orients to sounds",
    description: "Baby turns toward the source of a sound.",
    typical_range: [2, 4],
    source: ["CDC 2022", "ASHA"],
    ns_context: "Auditory orienting is a function of the superior colliculus and auditory cortex working together — an early integration of sensory processing and motor response. Babies who seem slow to orient to sounds may have hearing differences worth evaluating.",
    ped_note: "If your baby does not seem to respond to sounds by 4 months, mention it to your pediatrician.",
    age_group: "infant",
  },
  {
    id: "sns_self_soothe_emerging",
    domain: "sensory_ns",
    title: "Shows emerging self-soothing behaviors",
    description: "Baby begins using strategies to calm themselves — sucking their hand, looking away from overstimulating input, or rooting.",
    typical_range: [3, 6],
    source: ["Zero to Three", "AAP"],
    ns_context: "Self-soothing is a developmental skill, not an innate ability. Babies develop it through thousands of co-regulation experiences with caregivers. Sucking, swaying, and gaze aversion are all nervous system tools. They emerge gradually and unevenly — this is not something that can be taught, only supported.",
    ped_note: null,
    age_group: "infant",
  },
  {
    id: "sns_sensory_preferences",
    domain: "sensory_ns",
    title: "Develops clear sensory preferences",
    description: "Baby begins showing consistent likes and dislikes around texture, sound, light, or movement.",
    typical_range: [3, 8],
    source: ["Zero to Three", "Sensory Processing research"],
    ns_context: "Sensory preferences are a window into the child's nervous system. A baby who arches away from textures, startles easily, or cries at moderate sounds may have a highly sensitive nervous system — not a problem, but important information for caregiving. These babies often need more transition time, more predictability, and a lower-stimulation environment to feel safe.",
    ped_note: null,
    age_group: "infant",
  },
  {
    id: "sns_tolerates_transitions",
    domain: "sensory_ns",
    title: "Tolerates transitions with support",
    description: "Child can move from one activity to another with advance notice and caregiver support without complete dysregulation.",
    typical_range: [12, 24],
    source: ["Zero to Three", "Polyvagal Theory"],
    ns_context: "Transitions are a major nervous system challenge — the brain must disengage from one state and re-engage with another. This requires executive function (still developing) and nervous system flexibility (still developing). Warning children about upcoming transitions ('five more minutes, then we go') gives the nervous system time to prepare.",
    ped_note: null,
    age_group: "young_toddler",
  },
  {
    id: "sns_names_emotions",
    domain: "sensory_ns",
    title: "Begins naming emotions",
    description: "Child uses words like 'mad', 'sad', 'happy', 'scared' to label their internal states.",
    typical_range: [18, 30],
    source: ["Zero to Three", "Polyvagal Theory"],
    ns_context: "The ability to name emotions ('name it to tame it') is one of the most powerful self-regulation tools available to humans. When a child can label a feeling, the prefrontal cortex activates and the amygdala calms. Building an emotional vocabulary is literally building regulation capacity.",
    ped_note: null,
    age_group: "toddler",
  },
  {
    id: "sns_seeks_or_avoids_movement",
    domain: "sensory_ns",
    title: "Shows movement preferences (seeks or avoids)",
    description: "Child either craves movement (spinning, swinging, jumping) or avoids it (dislikes being upside down, resists playground equipment).",
    typical_range: [6, 18],
    source: ["Sensory Processing research", "Zero to Three"],
    ns_context: "Movement preferences reflect the vestibular system's calibration. A child who constantly seeks movement has a vestibular system that needs more input to feel organized; one who avoids it has a system that is easily overwhelmed. Neither is better or worse — they're different nervous system signatures that benefit from different kinds of sensory support.",
    ped_note: null,
    age_group: "older_infant",
  },
  {
    id: "sns_co_regulation_needed",
    domain: "sensory_ns",
    title: "Requires co-regulation for big emotions (expected at all ages)",
    description: "Child needs a calm, present adult to help them return to regulation during or after emotional flooding.",
    typical_range: [0, 30],
    source: ["Polyvagal Theory (Porges)", "Zero to Three", "AAP"],
    ns_context: "Co-regulation is not a phase children grow out of quickly — it is the biological mechanism through which self-regulation is built over years. A toddler who 'still' needs you to help them calm down is not delayed; they are exactly where they should be. The prefrontal cortex — the self-regulation center — doesn't fully mature until around age 25. All children (and many adults) need co-regulation support. This is not a failure of parenting or of the child.",
    ped_note: null,
    age_group: "newborn",
  },
];

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

/**
 * getMilestonesForAge(ageInMonths)
 * Returns milestones that are relevant for a child of a given age —
 * meaning milestones whose typical range overlaps with ±3 months of the child's age.
 */
export function getMilestonesForAge(ageInMonths) {
  const buffer = 3;
  return MILESTONES.filter(m =>
    m.typical_range[0] <= ageInMonths + buffer &&
    m.typical_range[1] >= ageInMonths - buffer
  );
}

/**
 * getMilestonesByDomain(domain)
 * Returns all milestones for a given domain ID.
 */
export function getMilestonesByDomain(domain) {
  return MILESTONES.filter(m => m.domain === domain);
}

/**
 * getCurrentWonderWeeksLeap(weeksFromDueDate)
 * Returns the active Wonder Weeks leap if the child is in one, or the upcoming leap.
 */
export function getCurrentWonderWeeksLeap(weeksFromDueDate) {
  const active = WONDER_WEEKS_LEAPS.find(
    l => weeksFromDueDate >= l.weeks_from_due[0] && weeksFromDueDate <= l.weeks_from_due[1]
  );
  if (active) return { ...active, status: "active" };

  const upcoming = WONDER_WEEKS_LEAPS.find(
    l => l.weeks_from_due[0] > weeksFromDueDate
  );
  if (upcoming && upcoming.weeks_from_due[0] - weeksFromDueDate <= 3) {
    return { ...upcoming, status: "upcoming" };
  }
  return null;
}

/**
 * getBrainContext(ageInYears)
 * Returns the brain development context for the child's current age.
 */
export function getBrainContext(ageInYears) {
  return BRAIN_DEVELOPMENT_CONTEXT.find(
    c => ageInYears >= c.age_range[0] && ageInYears < c.age_range[1]
  ) || null;
}
