// src/modules/milestones/data/birthContext.js
//
// Held — Birth & Prenatal Nervous System Context
//
// This file defines the birth/prenatal context options a parent can add to
// their child's profile, and the nervous system framing associated with each.
//
// PHILOSOPHY:
// - This is information, not a diagnosis
// - Nothing here predicts or determines a child's outcome
// - The goal is to help parents understand their child's nervous system story
//   so they can meet them with more compassion and less self-blame
// - The science is real — we honor it honestly, without catastrophizing
// - Every context entry includes a HOPE note: research consistently shows
//   that warm, responsive caregiving can buffer and often reverse the effects
//   of early stress. The parent reading this is already providing that.
// - We ALWAYS redirect to the pediatrician for clinical concerns
//
// Sources: PMC prenatal stress research, NICU neurodevelopmental literature,
// postpartum depression/anxiety & attachment research, polyvagal theory,
// Zero to Three, fetal programming research (Barker, Glover, Meaney)
//
// ─── CONTEXT OPTIONS ─────────────────────────────────────────────────────────

export const BIRTH_CONTEXT_OPTIONS = [
  {
    id: "high_stress_pregnancy",
    label: "High stress pregnancy",
    emoji: "🌊",
    description: "Significant ongoing stress during pregnancy — work, relationships, life circumstances, grief, or anything that kept your nervous system activated for a sustained period.",
  },
  {
    id: "pregnancy_complications",
    label: "Pregnancy complications",
    emoji: "🏥",
    description: "Preeclampsia, gestational diabetes, placenta issues, bed rest, hyperemesis, or other medical complications during pregnancy.",
  },
  {
    id: "traumatic_difficult_birth",
    label: "Traumatic or difficult birth",
    emoji: "⚡",
    description: "An unexpected, frightening, or physically difficult birth experience — emergency C-section, prolonged labor, forceps or vacuum delivery, cord complications, or a birth that left you feeling powerless or unsafe.",
  },
  {
    id: "nicu_stay",
    label: "NICU stay",
    emoji: "🫀",
    description: "Your baby spent time in the Neonatal Intensive Care Unit after birth.",
  },
  {
    id: "postpartum_depression_anxiety",
    label: "Postpartum depression or anxiety",
    emoji: "🌧️",
    description: "You experienced depression, anxiety, rage, or other significant mental health challenges in the postpartum period.",
  },
  {
    id: "prematurity",
    label: "Premature birth",
    emoji: "🌱",
    description: "Your baby was born before 37 weeks gestation.",
  },
  {
    id: "early_medical_interventions",
    label: "Early medical interventions",
    emoji: "💉",
    description: "Significant medical procedures, surgeries, or interventions in the newborn period.",
  },
  {
    id: "twin_or_more",
    label: "Twin or multiple pregnancy",
    emoji: "👯",
    description: "This pregnancy involved twins, triplets, or more.",
  },
  {
    id: "subsequent_pregnancy",
    label: "Pregnancy with older children at home",
    emoji: "🏃",
    description: "You were pregnant while caring for one or more young children — a toddler, preschooler, or school-age child — which added significant physical and emotional load to the pregnancy.",
  },
];

// ─── NS FRAMING PER CONTEXT ───────────────────────────────────────────────────
// Each entry includes:
//   what_happened:   The honest science — what we know about this context's effect
//   what_it_means:   What this might look like in the child's nervous system day-to-day
//   what_it_doesnt_mean: The non-shaming reframe — what this is NOT
//   what_helps:      Practical, nervous-system-informed caregiving that makes a difference
//   hope:            The research on resilience — because it's real and it matters
//   ped_note:        When/whether to mention the pediatrician
//   source:          Research grounding

export const BIRTH_CONTEXT_FRAMING = {

  high_stress_pregnancy: {
    title: "High Stress Pregnancy",
    what_happened: "When a parent experiences sustained stress during pregnancy, cortisol — the body's primary stress hormone — crosses the placenta and reaches the developing baby. Research across multiple studies shows this can affect how the fetal HPA axis (the stress response system) is calibrated. Babies exposed to higher levels of prenatal cortisol may emerge with a stress response system that is set to a lower threshold — meaning it activates more easily and takes longer to settle.",
    what_it_means: "Your child may have a nervous system that is more easily activated by stimulation, transitions, or unpredictability. This might show up as: heightened startle responses, difficulty settling, lower tolerance for frustration, more intense emotional reactions, or needing more transition time and predictability than other babies the same age. These are not character flaws or parenting failures — they are a nervous system doing exactly what it was set up to do.",
    what_it_doesnt_mean: "This does not mean your child is damaged, destined for difficulty, or that you caused harm by being stressed. Stress during pregnancy is extraordinarily common — and the fact that you're here, paying attention to your child's nervous system story, is exactly what the research says makes the biggest difference. You cannot go back and un-stress a pregnancy. You can, and clearly do, show up with awareness and care right now.",
    what_helps: "Predictability is deeply regulating for a nervous system calibrated to expect uncertainty. Consistent routines, advance notice before transitions, calm and warm co-regulation during big feelings, and a low-stimulation environment when possible. Your regulated nervous system is the most powerful tool you have. When you're calm and present, your baby's nervous system receives the signal: the world is safe.",
    hope: "Research consistently shows that warm, responsive caregiving after birth can significantly buffer — and in many cases reverse — the effects of prenatal stress on the nervous system. One study found that the quality of early infant-mother attachment moderated the cognitive effects of prenatal cortisol exposure entirely. You are not fighting biology. You are working with it.",
    ped_note: null,
    source: ["PMC prenatal stress & cortisol research", "Glover & O'Connor prenatal stress review", "Bergman et al. 2010 — attachment as buffer for prenatal stress effects"],
  },

  pregnancy_complications: {
    title: "Pregnancy Complications",
    what_happened: "Medical complications during pregnancy — preeclampsia, gestational diabetes, placenta previa, bed rest, hyperemesis — create physiological and psychological stress for both the pregnant person and the developing baby. Reduced placental blood flow, altered hormone levels, and maternal stress responses can all reach the developing nervous system in utero. Additionally, the psychological weight of a complicated pregnancy — the fear, the uncertainty, the loss of the expected experience — is its own significant stress.",
    what_it_means: "Depending on the nature and timing of the complication, your child's nervous system may have had a different intrauterine environment than a straightforward pregnancy. This might show up as heightened sensitivity, a lower threshold for overwhelm, or a stress response that activates quickly. It may also mean nothing noticeable at all — the nervous system is remarkably resilient and adaptive.",
    what_it_doesnt_mean: "Complications during pregnancy are medical events, not evidence of failure. Your body was doing its best in a difficult situation. Your baby's nervous system adapted to the environment it was in. That adaptation is information — not a verdict.",
    what_helps: "Consistent, predictable caregiving. Co-regulation during distress. Generous transition time. A calm environment when your child is already at the edge of their window of tolerance. Over time, repeated experiences of safety and repair build the neural pathways for regulation that the nervous system is still developing.",
    hope: "The brain's plasticity — its ability to change in response to experience — is most powerful in the first years of life. The environment you're providing now is actively shaping your child's nervous system in real time. Early intervention and responsive caregiving have robust evidence behind them.",
    ped_note: "If your pregnancy involved significant complications, mention this history to your child's pediatrician so they can factor it into any developmental monitoring.",
    source: ["Prenatal stress & fetal programming research (Barker)", "PMC cortisol & fetal development research"],
  },

  traumatic_difficult_birth: {
    title: "Traumatic or Difficult Birth",
    what_happened: "Birth is one of the most physiologically intense experiences a human nervous system undergoes. A traumatic or difficult birth — emergency procedures, prolonged labor, instrumental delivery, fetal distress, hemorrhage, or an experience that felt life-threatening or out of control — activates the stress response system of both the birthing person and the baby simultaneously. The baby's first experience of the world outside the womb is shaped, in part, by the conditions of their arrival.",
    what_it_means: "Some babies who experience a difficult birth show signs of nervous system dysregulation in the newborn period — difficulty settling, heightened startle responses, or feeding challenges. These usually resolve as the nervous system integrates the experience and begins to learn safety signals. For some babies, especially those with a highly sensitive temperament, the echoes of a difficult birth experience may take longer to settle. This is not about blame — it's about understanding your child's starting point.",
    what_it_doesnt_mean: "A traumatic birth does not cause permanent damage to your child's nervous system. And it is not your fault. Birth is unpredictable. Your body and your baby's body did what they needed to do to get through. The trauma you may be carrying about that experience is real and valid — and if you haven't had space to process it, you deserve support for that too.",
    what_helps: "Skin-to-skin contact, gentle rhythmic movement, and the sound of a familiar voice are some of the most powerful early regulators for a newborn nervous system that had a rough start. Over time, consistent and warm caregiving builds the neural pathways of safety. Therapies like craniosacral therapy or infant massage are sometimes helpful for babies who show persistent dysregulation after a difficult birth — worth discussing with your pediatrician.",
    hope: "The research on early intervention is unambiguous: responsive, attuned caregiving in the weeks and months after birth can significantly reshape a nervous system's baseline. You don't have to fix the birth. You just have to keep showing up — which you clearly already are.",
    ped_note: "If you experienced a traumatic birth, mention it to your child's pediatrician and also to your own care provider. Both of you went through something significant, and both of you deserve support.",
    source: ["Polyvagal Theory (Porges)", "Zero to Three newborn regulation research", "NICU & birth trauma literature"],
  },

  nicu_stay: {
    title: "NICU Stay",
    what_happened: "The NICU is a medical miracle — it saves lives every day. It is also, from a nervous system perspective, an environment of significant stress. Research on NICU infants shows that repeated medical procedures, bright lights, noise, separation from parents, and the absence of the sensory environment of the womb all activate the stress response system during a critical window of brain development. Studies have found that higher levels of NICU stress are associated with differences in brain connectivity, particularly in regions related to emotion, attention, and self-regulation.",
    what_it_means: "NICU graduates may have a nervous system that was shaped by an early environment of heightened arousal and unpredictability. This can show up as: sensory sensitivity, difficulty with transitions, a lower threshold for overwhelm, or regulatory challenges that persist beyond what parents expect. Communication and problem-solving delays are also more common in NICU graduates, though they often close with time and support. These are not permanent — they are the nervous system's adaptation to its earliest environment.",
    what_it_doesnt_mean: "Your child's NICU stay was a medical necessity. The stress they experienced was the price of their survival, and no parent who made the decisions you made in that time did anything wrong. The research also shows clearly that what happened in the NICU does not determine what happens next — parental presence, touch, and responsiveness are among the most powerful moderators of NICU stress outcomes.",
    what_helps: "Predictability, routine, and lots of skin-to-skin contact in the months following NICU discharge. Reducing unnecessary sensory load when your child is already at their limit. Understanding that what looks like 'difficult behavior' may be a nervous system that is still learning what 'safe and calm' feels like. A parent who responds consistently to distress is literally building those pathways.",
    hope: "Research from the NICU literature is clear: parental presence during the NICU stay, and the quality of the parent-infant relationship at discharge, are among the strongest predictors of long-term developmental outcomes — more powerful than gestational age or length of NICU stay. One study found that a strong parent-infant relationship at NICU discharge predicted cognitive outcomes 20 years later. The relationship is the medicine.",
    ped_note: "NICU graduates typically have follow-up developmental monitoring — make sure you're connected with that program. Early intervention services can be incredibly valuable if any developmental differences emerge.",
    source: ["PMC NICU stress & brain development research", "Children's National NICU pain & neurodevelopment study", "ScienceDirect: NICU infant mental health & parent-infant relationship", "Frontiers in Psychiatry: prematurity & developmental programming"],
  },

  postpartum_depression_anxiety: {
    title: "Postpartum Depression or Anxiety",
    what_happened: "Postpartum depression and anxiety affect a significant number of new parents — and they matter not just for the parent experiencing them, but for the developing baby. When a parent is in the grip of postpartum depression or anxiety, it can temporarily affect their capacity to read and respond to infant cues — not because of lack of love, but because a dysregulated nervous system cannot easily attune to another. Research shows that postpartum depression and anxiety are associated with altered infant stress reactivity and, in some cases, attachment security.",
    what_it_means: "A baby whose primary caregiver was struggling with postpartum depression or anxiety in the early months may have had some disruption in the serve-and-return interaction that builds the neural pathways of regulation and attachment. This might show up as: a baby who seems harder to settle, more anxious about separations, or who has a more reactive stress response. These are not fixed — they are patterns that respond to experience.",
    what_it_doesnt_mean: "Postpartum depression and anxiety are medical conditions, not choices. They are not signs of bad parenting, insufficient love, or weakness. The research consistently shows that treated postpartum depression — or even just recovered postpartum depression — does not produce lasting harm to infant development when the parent reconnects with responsiveness. You being here, aware, and invested in understanding your child's nervous system is the repair.",
    what_helps: "Repair is more powerful than perfection. Children's nervous systems do not need a parent who is always regulated — they need a parent who repairs after ruptures. If postpartum depression created disconnection, reconnecting with warmth, play, and presence now is the intervention. And if you are still struggling, please reach out for support — not just for your child's sake, but for your own.",
    hope: "Studies show that infant attachment security — the strongest predictor of long-term social-emotional development — is significantly shaped by the quality of caregiving in the months following diagnosis and treatment. The window is not closed. Responsive caregiving heals — in both directions.",
    ped_note: "Mention your postpartum experience to your child's pediatrician at their next visit. They can incorporate this context into any developmental monitoring and connect you with resources.",
    source: ["JAMA Pediatrics meta-analysis: perinatal depression/anxiety & child development", "PMC: maternal depression & infant attachment systematic review", "ScienceDirect: PPD impact on infant development in first year", "Zero to Three"],
  },

  prematurity: {
    title: "Premature Birth",
    what_happened: "A premature baby arrives before the nervous system has completed its intrauterine development — before the sensory systems, the stress response, and the neural architecture that would have been built in the womb have had their full time. The third trimester in particular is a critical window for brain development: synaptogenesis, neuronal migration, and myelination are all happening at rapid pace. Being born early means those processes continue outside the womb, in an environment they were not designed for.",
    what_it_means: "Premature babies frequently show a wider range of developmental timing — reaching milestones later than their birth age would suggest, but often on track or close to track when calculated from their due date (corrected age). Sensory sensitivities are common. Regulatory challenges, feeding difficulties, and heightened stress reactivity are part of many premature babies' early experience. None of this is a life sentence — it is a starting point.",
    what_it_doesnt_mean: "Prematurity is not a predictor of what your child will be capable of. Many premature babies develop typically across all domains, especially with early support and responsive caregiving. And even for those who carry some lasting differences, those differences are manageable and often invisible in the long run.",
    what_helps: "Always use your child's corrected age (calculated from their due date, not their birthday) when thinking about developmental milestones. A 6-month-old born 2 months early is developmentally closer to 4 months. Kangaroo care, skin-to-skin, and gentle sensory regulation are especially important in the months following NICU discharge. Early intervention services — speech, occupational therapy, physical therapy — are highly effective and most powerful when started early.",
    hope: "The brain's plasticity is most powerful in the early years — and premature babies benefit enormously from early, targeted support. The research on early intervention for premature infants is some of the most encouraging in all of developmental science. With responsive caregiving and appropriate support, outcomes are far better than any NICU chart would suggest.",
    ped_note: "Make sure you're connected with a developmental follow-up program for premature infants if one is available in your area. Use corrected age when discussing milestones with your pediatrician.",
    source: ["PMC: premature birth & developmental programming", "Frontiers in Psychiatry: prematurity, resilience & vulnerability", "NICU stress & neurodevelopment literature"],
  },

  early_medical_interventions: {
    title: "Early Medical Interventions",
    what_happened: "Medical procedures in the newborn period — surgeries, significant interventions, extended hospitalization — expose a developing nervous system to pain, separation, and stress during the most sensitive window of early brain development. Research on procedural pain in neonates shows that repeated painful experiences can alter the developing nervous system's pain threshold and stress reactivity. This is not an argument against necessary medical care — it is simply an honest accounting of what those experiences mean for the nervous system.",
    what_it_means: "A baby who underwent significant medical procedures early in life may have a stress response system that is more sensitized than average. This might show up as heightened startle responses, increased sensitivity to physical contact or discomfort, or a lower tolerance for overwhelming sensory experiences. It may also have no noticeable effect at all — nervous systems are remarkably resilient when surrounded by warmth and responsiveness.",
    what_it_doesnt_mean: "Medical interventions that saved your child's life or protected their health were the right choice. The stress associated with necessary medical care is not something you caused or could have prevented. What matters now is what the nervous system experiences going forward — and you clearly care deeply about that.",
    what_helps: "Gentle, predictable physical contact. Being present during any ongoing medical appointments or procedures when possible. Pain management taken seriously. And at home: a calm, low-stimulation environment when your child is already at their sensory limit. Over time, positive sensory experiences — skin-to-skin, warm baths, gentle massage — help rebuild the association between physical contact and safety.",
    hope: "Research on neonatal pain shows that parental presence during procedures significantly reduces infant cortisol response. And in the weeks and months after, responsive caregiving is the most powerful regulator of a stress system that got an early workout. The nervous system is not fixed at birth — it is continuously shaped by experience.",
    ped_note: "Keep a record of early medical procedures to share with your child's developmental team. This context matters for interpreting their developmental profile and can inform early intervention.",
    source: ["Children's National NICU pain & neurodevelopment research", "PMC: NICU stress & brain development", "Polyvagal Theory (Porges)"],
  },

  twin_or_more: {
    title: "Twin or Multiple Pregnancy",
    what_happened: "A multiple pregnancy carries significantly higher physiological demands on the pregnant parent — increased cardiovascular load, higher likelihood of complications, earlier delivery, and a NICU stay are all more common. The stress of a higher-risk pregnancy, alongside the practical overwhelm of preparing for more than one baby, means the prenatal environment is often more activated than a singleton pregnancy.",
    what_it_means: "Each baby in a multiple pregnancy deserves to be seen as an individual nervous system, with their own story. Some twins have nearly identical experiences; others have quite different ones depending on positioning, cord dynamics, birth order, and their time in the NICU. If your babies have different temperaments, different regulatory styles, or different developmental timelines, this is not surprising — and it does not mean one is 'easier' or 'better.' It means two different nervous systems had two different experiences.",
    what_it_doesnt_mean: "Being a twin does not determine developmental outcome. And the challenges of a twin pregnancy and early parenting period — the sheer demand on a parent's resources — are not evidence of inadequate parenting. You were managing an enormous amount. The fact that you have any bandwidth left to think about your children's nervous systems is remarkable.",
    what_helps: "For each child: individual time, individual attunement. Twins sometimes get regulated as a unit — fed together, slept together, soothed together — and this is often necessary. But each child also benefits from moments of being seen and responded to as an individual. Even small windows of one-on-one connection matter deeply.",
    hope: "Twins who are raised with warm, responsive caregiving show attachment and developmental outcomes equivalent to singleton children. The nervous system responds to the quality of relationship, not the quantity of siblings.",
    ped_note: null,
    source: ["Zero to Three", "Twin pregnancy & developmental outcomes research"],
  },

  subsequent_pregnancy: {
    title: "Pregnancy with Young Children at Home",
    what_happened: "Pregnancy while parenting young children is physically and emotionally demanding in ways that a first pregnancy is not. The body is simultaneously growing a new human while managing the relentless demands of toddler and preschooler care. Sleep deprivation, physical depletion, emotional stretch, and the near-impossibility of resting when your body needs it — all of these are chronic stressors. And chronic stress during pregnancy, as the research shows, does reach the developing nervous system.",
    what_it_means: "A baby born into a family already running on depleted reserves may have a nervous system that received a slightly more activated prenatal environment. They may also arrive into a world where the primary caregiver's resources are genuinely stretched thin. Both of these things are real — and neither of them is a failure.",
    what_it_doesnt_mean: "Having older children at home during a pregnancy is not a mistake or a cause for guilt. Humans have been having subsequent pregnancies for all of human history. The vast majority of children born into busy, imperfect, resource-stretched families grow up well. What you provide matters more than the conditions of the pregnancy.",
    what_helps: "Accepting help — from a partner, family, community, or any available support — is not weakness. It is the most nervous-system-smart thing you can do. A parent whose own nervous system gets even small windows of restoration is more available to co-regulate their children. You cannot pour from a completely empty cup, and being generous with yourself is being generous with your baby.",
    hope: "Children are extraordinarily resilient in the context of loving, responsive families — even imperfect, exhausted, doing-their-best families. The research on resilience consistently points to one factor above all others: at least one warm, consistent, attuned relationship. You are clearly that person for your child.",
    ped_note: null,
    source: ["Prenatal stress research", "Zero to Three", "Resilience research (Masten)"],
  },
};

// ─── FOUNDATIONAL CARD ───────────────────────────────────────────────────────
// Shown once when a parent first opens the milestones module,
// before any specific context is selected.

export const FOUNDATIONAL_NS_CARD = {
  title: "Your Baby's Nervous System Story Begins Before Birth",
  body: `The nervous system doesn't start forming at birth — it starts forming at conception. By the time your baby arrives, their stress response system has already been calibrated by nine months of experience: the sounds they heard, the movements they felt, the hormonal environment of the womb, and the conditions of their birth.

This means that two babies born on the same day, at the same gestational age, to equally loving families, can have genuinely different nervous systems — not because of anything anyone did wrong, but because their stories began differently.

Some babies arrive calm and easily soothed. Others arrive with a nervous system that is more easily activated, slower to settle, or more sensitive to input. Neither is better. Both are valid. And both deserve to be understood on their own terms.

The milestones you see in this module reflect typical ranges across large, diverse populations. They are information — not judgments. Your child's developmental timeline is their own story. We're here to help you read it with curiosity, not fear.

If you experienced a stressful pregnancy, a difficult birth, a NICU stay, postpartum depression, or any of the other experiences that shape a nervous system before and after birth — you can add that context to your child's profile. It won't change how we present milestones, but it will help us offer better nervous system framing along the way.

And if you ever have concerns about your child's development, your pediatrician is always the right next call.`,
  cta: "Add your child's story",
  source: "PMC prenatal stress & fetal programming research; Polyvagal Theory; Zero to Three",
};

// ─── HELPER ──────────────────────────────────────────────────────────────────

/**
 * getFramingForContexts(contextIds)
 * Returns an array of NS framing objects for the given context IDs.
 */
export function getFramingForContexts(contextIds = []) {
  return contextIds
    .map(id => BIRTH_CONTEXT_FRAMING[id])
    .filter(Boolean);
}

/**
 * getContextLabels(contextIds)
 * Returns human-readable labels for display.
 */
export function getContextLabels(contextIds = []) {
  return contextIds
    .map(id => BIRTH_CONTEXT_OPTIONS.find(o => o.id === id))
    .filter(Boolean);
}
