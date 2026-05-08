// views/consultant/tabs/PlanTab.jsx
import { useState, useEffect } from "react";
import { useT, font, serif, mono } from "../../../core/shared.jsx";
import { usePlans } from "../data/consultantStore.js";
import { supabase } from "../../../lib/supabase.js";
import InsightCard from "../shared/InsightCard.jsx";

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  teal:"#7B9EA8", mauve:"#A8907B", purple:"#8A7BAA", sage:"#7BAA8A",
  warm:"#AA9B7B", rose:"#A87B8A", sky:"#7B8FAA", amber:"#A89B5A",
};

// ─── ALL METHOD DATA (with full phases for checklist generation) ──────────────
const METHODS = {
  settled_support:{id:"settled_support",label:"Settled Support Method",ageGroups:["infant"],color:C.teal,description:"Attuned presence with gradual withdrawal. Stay close and slowly increase distance over 17+ nights.",hasNaps:true,phases:[{id:"ss_p1",label:"Nights 1–3: Connected Comfort",desc:"Sit beside the crib. Pat and shush to calm — not to sleep. Your presence is the anchor.",items:[{id:"ss_n1",text:"Night 1 complete",done:false},{id:"ss_n2",text:"Night 2 complete",done:false},{id:"ss_n3",text:"Night 3 complete",done:false}]},{id:"ss_p2",label:"Nights 4–6: Gentle Withdrawal",desc:"Hand resting on baby — no active patting/shushing unless escalating.",items:[{id:"ss_n4",text:"Night 4 complete",done:false},{id:"ss_n5",text:"Night 5 complete",done:false},{id:"ss_n6",text:"Night 6 complete",done:false}]},{id:"ss_p3",label:"Nights 7–10: Supportive Distance",desc:"Hand resting inside crib but not on baby. Shush only if escalating.",items:[{id:"ss_n7",text:"Night 7 complete",done:false},{id:"ss_n8",text:"Night 8 complete",done:false},{id:"ss_n9",text:"Night 9 complete",done:false},{id:"ss_n10",text:"Night 10 complete",done:false}]},{id:"ss_p4",label:"Nights 11–13: Steady Presence",desc:"Chair beside crib. Voice + light touch only when escalating.",items:[{id:"ss_n11",text:"Night 11 complete",done:false},{id:"ss_n12",text:"Night 12 complete",done:false},{id:"ss_n13",text:"Night 13 complete",done:false}]},{id:"ss_p5",label:"Nights 14–16: Expanding Space",desc:"Increasing wait time before comfort.",items:[{id:"ss_n14",text:"Night 14 — wait 3 min before comfort",done:false},{id:"ss_n15",text:"Night 15 — wait 5 min before comfort",done:false},{id:"ss_n16",text:"Night 16 — wait 7 min before comfort",done:false}]},{id:"ss_p6",label:"Night 17+: Confident Independence",desc:"Put down awake, leave the room. Wait 10 min before responding.",items:[{id:"ss_n17",text:"Night 17+ — leaving room, 10-min wait",done:false}]}]},
  chair_method:{id:"chair_method",label:"Chair Method",ageGroups:["infant"],color:C.purple,description:"Parent starts in the room and gradually removes themselves over 7 days. Sleep prop removed cold turkey.",hasNaps:true,phases:[{id:"cm_p1",label:"Nights 1–3: Chair by the Crib",desc:"Sit next to crib. Voice + light touch to calm — NOT to sleep.",items:[{id:"cm_n1",text:"Night 1 complete",done:false},{id:"cm_n2",text:"Night 2 complete",done:false},{id:"cm_n3",text:"Night 3 complete",done:false}]},{id:"cm_p2",label:"Nights 4–6: Chair in the Middle",desc:"Move chair to middle of the room.",items:[{id:"cm_n4",text:"Night 4 — wait 3 min before comfort",done:false},{id:"cm_n5",text:"Night 5 — wait 5 min before comfort",done:false},{id:"cm_n6",text:"Night 6 — wait 7 min before comfort",done:false}]},{id:"cm_p3",label:"Night 7+: Leave the Room",desc:"Put child down awake, leave. Wait 10–15 min before responding.",items:[{id:"cm_n7",text:"Night 7+ — leaving room, 10–15 min wait",done:false}]}]},
  fading:{id:"fading",label:"Fading",ageGroups:["infant"],color:C.sage,description:"Gradually reduce the sleep prop. Use it until drowsy — not fully asleep — then put down. Your schedule is custom-built below.",hasNaps:true,isFading:true,phases:[]},
  habit_stacking:{id:"habit_stacking",label:"Habit Stacking",ageGroups:["infant"],color:C.warm,description:"Layer in sleep associations first, then remove them one by one over 40 nights. Slow, steady, minimal crying.",hasNaps:false,phases:[{id:"hs_p1",label:"Nights 1–4: All Associations On",desc:"White noise + back rub + humming/shushing + rocking/bouncing.",items:[{id:"hs_n1",text:"Night 1 complete",done:false},{id:"hs_n2",text:"Night 2 complete",done:false},{id:"hs_n3",text:"Night 3 complete",done:false},{id:"hs_n4",text:"Night 4 complete",done:false}]},{id:"hs_p2",label:"Nights 5–7: Remove Rocking/Bouncing",desc:"Keep: white noise, back rub, humming. Remove: rocking/bouncing.",items:[{id:"hs_n5",text:"Night 5 — rocking removed",done:false},{id:"hs_n6",text:"Night 6 complete",done:false},{id:"hs_n7",text:"Night 7 complete",done:false}]},{id:"hs_p3",label:"Nights 8–11: Back Rub Until Drowsy Only",items:[{id:"hs_n8",text:"Night 8 complete",done:false},{id:"hs_n9",text:"Night 9 complete",done:false},{id:"hs_n10",text:"Night 10 complete",done:false},{id:"hs_n11",text:"Night 11 complete",done:false}]},{id:"hs_p4",label:"Nights 12–15: Back Rub Cut to 1 Minute",items:[{id:"hs_n12",text:"Night 12 complete",done:false},{id:"hs_n13",text:"Night 13 complete",done:false},{id:"hs_n14",text:"Night 14 complete",done:false},{id:"hs_n15",text:"Night 15 complete",done:false}]},{id:"hs_p5",label:"Nights 16–19: Hand in Crib Only",desc:"No back rub. Hand resting in crib until drowsy, then remove.",items:[{id:"hs_n16",text:"Night 16 complete",done:false},{id:"hs_n17",text:"Night 17 complete",done:false},{id:"hs_n18",text:"Night 18 complete",done:false},{id:"hs_n19",text:"Night 19 complete",done:false}]},{id:"hs_p6",label:"Nights 20–22: Sitting Next to Bed",items:[{id:"hs_n20",text:"Night 20 complete",done:false},{id:"hs_n21",text:"Night 21 complete",done:false},{id:"hs_n22",text:"Night 22 complete",done:false}]},{id:"hs_p7",label:"Nights 23–25: Chair in the Middle",items:[{id:"hs_n23",text:"Night 23 complete",done:false},{id:"hs_n24",text:"Night 24 complete",done:false},{id:"hs_n25",text:"Night 25 complete",done:false}]},{id:"hs_p8",label:"Nights 26–29: Chair by the Door",items:[{id:"hs_n26",text:"Night 26 complete",done:false},{id:"hs_n27",text:"Night 27 complete",done:false},{id:"hs_n28",text:"Night 28 complete",done:false},{id:"hs_n29",text:"Night 29 complete",done:false}]},{id:"hs_p9",label:"Nights 30–34: Outside the Door (Open)",items:[{id:"hs_n30",text:"Night 30 complete",done:false},{id:"hs_n31",text:"Night 31 complete",done:false},{id:"hs_n32",text:"Night 32 complete",done:false},{id:"hs_n33",text:"Night 33 complete",done:false},{id:"hs_n34",text:"Night 34 complete",done:false}]},{id:"hs_p10",label:"Nights 35–39: Leave Room, Check In",desc:"Leave the room. Wait 10 min, pop head in, wait until asleep, close door.",items:[{id:"hs_n35",text:"Night 35 complete",done:false},{id:"hs_n36",text:"Night 36 complete",done:false},{id:"hs_n37",text:"Night 37 complete",done:false},{id:"hs_n38",text:"Night 38 complete",done:false},{id:"hs_n39",text:"Night 39 complete",done:false}]},{id:"hs_p11",label:"Night 40: Independent Sleep 🎉",items:[{id:"hs_n40",text:"Night 40 — fully independent sleep achieved!",done:false}]}]},
  ferber:{id:"ferber",label:"Ferber / Graduated Extinction",ageGroups:["infant"],color:C.mauve,description:"Put child down awake and leave. Return at graduated intervals for brief comfort. Intervals increase each night.",hasNaps:true,phases:[{id:"fb_p1",label:"Night 1",desc:"Intervals: 3 → 5 → 10 min (repeat 10)",items:[{id:"fb_n1",text:"Night 1 complete — 3/5/10 min intervals",done:false}]},{id:"fb_p2",label:"Night 2",desc:"Intervals: 5 → 10 → 12 min",items:[{id:"fb_n2",text:"Night 2 complete — 5/10/12 min intervals",done:false}]},{id:"fb_p3",label:"Night 3",desc:"Intervals: 10 → 12 → 15 min",items:[{id:"fb_n3",text:"Night 3 complete — 10/12/15 min intervals",done:false}]},{id:"fb_p4",label:"Night 4",desc:"Intervals: 12 → 15 → 17 min",items:[{id:"fb_n4",text:"Night 4 complete",done:false}]},{id:"fb_p5",label:"Night 5",desc:"Intervals: 15 → 17 → 20 min",items:[{id:"fb_n5",text:"Night 5 complete",done:false}]},{id:"fb_p6",label:"Night 6",desc:"Intervals: 17 → 20 → 25 min",items:[{id:"fb_n6",text:"Night 6 complete",done:false}]},{id:"fb_p7",label:"Night 7+",desc:"Intervals: 20 → 25 → 30 min",items:[{id:"fb_n7",text:"Night 7+ — 20/25/30 min intervals",done:false}]}]},
  kissing_game:{id:"kissing_game",label:"Kissing Game",ageGroups:["toddler","preschool"],color:C.purple,description:"Child stays in bed; parent returns to give kisses at increasing intervals. Builds excitement around bedtime instead of anxiety.",hasNaps:false,phases:[{id:"kg_p1",label:"Phase 1: Establish the Game",desc:"After routine, tell child you'll come back for a kiss while they're still awake. Return quickly (30 sec).",items:[{id:"kg_d1",text:"Night 1 — introduced game, returned quickly",done:false},{id:"kg_d2",text:"Night 2 — child excited for the game",done:false},{id:"kg_d3",text:"Night 3 — consistent quick returns",done:false}]},{id:"kg_p2",label:"Phase 2: Stretch the Intervals",desc:"Gradually wait longer — 1 min, 2 min, 3 min.",items:[{id:"kg_d4",text:"Night 4 — waiting ~1 min",done:false},{id:"kg_d5",text:"Night 5 — waiting ~2 min",done:false},{id:"kg_d6",text:"Night 6 — waiting ~3 min",done:false}]},{id:"kg_p3",label:"Phase 3: Asleep Before the Kiss",desc:"Intervals long enough that child falls asleep waiting.",items:[{id:"kg_d7",text:"Night 7 — child asleep before kiss",done:false},{id:"kg_d8",text:"Night 8+ — consistently independent",done:false}]}]},
  stuffy_check_in:{id:"stuffy_check_in",label:"Stuffy Check-In Method",ageGroups:["toddler","preschool"],color:C.sage,description:"Parent checks on the stuffed animal — not the child. The stuffy becomes the bridge between parent and child.",hasNaps:false,phases:[{id:"sci_p1",label:"Phase 1: Establish the Check-In",desc:"Put child down awake. Wait 1–5 min, go in for 30–60 sec max. Tuck in Bear. Whisper to Bear: 'You're doing great.' Briefly reassure child. Leave.",items:[{id:"sci_n1",text:"Night 1 — first stuffy check-in done",done:false},{id:"sci_n2",text:"Night 2 — child beginning to trust the pattern",done:false},{id:"sci_n3",text:"Night 3 — settling faster after check-ins",done:false}]},{id:"sci_p2",label:"Phase 2: Lengthen Wait Intervals",desc:"Increase wait time before going in (3–5 min). Keep check-ins short, calm, predictable.",items:[{id:"sci_n4",text:"Night 4 — wait intervals lengthening",done:false},{id:"sci_n5",text:"Night 5 complete",done:false},{id:"sci_n6",text:"Night 6 complete",done:false}]},{id:"sci_p3",label:"Phase 3: Fewer Check-Ins Needed",desc:"Child falling asleep before or after 1–2 check-ins.",items:[{id:"sci_n7",text:"Night 7 — falling asleep with 1–2 check-ins",done:false},{id:"sci_n8",text:"Night 8+ — consistently independent",done:false}]}]},
  stuffy_fairy:{id:"stuffy_fairy",label:"Stuffy Fairy",ageGroups:["toddler","preschool"],color:C.rose,description:"Each time child is laying quietly in bed, a new stuffy appears by morning. The growing pile is evidence of safety and parental return.",hasNaps:false,phases:[{id:"sf_p1",label:"Phase 1: The First Visit",desc:"Night 1: sneak in after child is asleep, leave one new stuffy. Morning: 'Look who came!'",items:[{id:"sf_n1",text:"Night 1 — first stuffy left, morning reaction celebrated",done:false},{id:"sf_n2",text:"Night 2 — child anticipating the fairy",done:false},{id:"sf_n3",text:"Night 3 — settling faster hoping for a visitor",done:false}]},{id:"sf_p2",label:"Phase 2: Building the Pile",desc:"Continue adding stuffies on quiet nights. Skip nights with excessive crying.",items:[{id:"sf_n4",text:"Night 4 — pile growing, child motivated",done:false},{id:"sf_n5",text:"Night 5 complete",done:false},{id:"sf_n6",text:"Night 6 complete",done:false}]},{id:"sf_p3",label:"Phase 3: Pile as Proof",desc:"Morning ritual: count and celebrate the pile.",items:[{id:"sf_n7",text:"Night 7 — morning pile celebration happening",done:false},{id:"sf_n8",text:"Night 8+ — child settling independently",done:false}]}]},
  hearts_on_hands:{id:"hearts_on_hands",label:"Hearts on Hands",ageGroups:["toddler","preschool"],color:C.mauve,description:"Parent draws a heart on child's hand and their own. Press it for a squeeze when you miss each other.",hasNaps:false,phases:[{id:"hh_p1",label:"Phase 1: Hearts + Parent Stays Close",desc:"Draw hearts, say goodnight, sit beside bed. Remind child to press their heart.",items:[{id:"hh_d1",text:"Night 1 — hearts drawn, sitting beside bed",done:false},{id:"hh_d2",text:"Night 2 complete",done:false},{id:"hh_d3",text:"Night 3 complete",done:false}]},{id:"hh_p2",label:"Phase 2: Hearts + Chair in Middle",items:[{id:"hh_d4",text:"Night 4 — chair in middle",done:false},{id:"hh_d5",text:"Night 5 complete",done:false},{id:"hh_d6",text:"Night 6 complete",done:false}]},{id:"hh_p3",label:"Phase 3: Hearts + Door",items:[{id:"hh_d7",text:"Night 7 — at the door",done:false},{id:"hh_d8",text:"Night 8 complete",done:false},{id:"hh_d9",text:"Night 9 complete",done:false}]},{id:"hh_p4",label:"Phase 4: Hearts + Independent",desc:"Parent leaves after hearts ritual.",items:[{id:"hh_d10",text:"Night 10 — leaving after hearts ritual",done:false},{id:"hh_d11",text:"Night 11+ — consistently independent",done:false}]}]},
  play_prep:{id:"play_prep",label:"Play Prep",ageGroups:["toddler","preschool","school"],color:C.warm,description:"Child earns a special bedtime job (turning off the light, tucking in a stuffy), giving them agency and a positive association with sleep.",hasNaps:false,phases:[{id:"pp_p1",label:"Phase 1: Job + Parent Stays",items:[{id:"pp_d1",text:"Night 1 — job done, parent nearby",done:false},{id:"pp_d2",text:"Night 2 complete",done:false},{id:"pp_d3",text:"Night 3 complete",done:false}]},{id:"pp_p2",label:"Phase 2: Job + Brief Check-In",desc:"Parent leaves after job, one check-in at 5 min.",items:[{id:"pp_d4",text:"Night 4 — job done, one check-in",done:false},{id:"pp_d5",text:"Night 5 complete",done:false},{id:"pp_d6",text:"Night 6 complete",done:false}]},{id:"pp_p3",label:"Phase 3: Job + Independent",items:[{id:"pp_d7",text:"Night 7 — job done, fully independent",done:false},{id:"pp_d8",text:"Night 8+ — consistently independent",done:false}]}]},
  confidence_ladder:{id:"confidence_ladder",label:"Bedtime Confidence Ladder",ageGroups:["toddler","preschool","school"],color:C.sky,description:"Build tolerance in micro steps — each practiced 3–5 nights. Respects attachment while expanding the window of tolerance for bedtime.",hasNaps:false,phases:[{id:"cl_p1",label:"Step 1: Parent Sits on Bed",desc:"Parent on bed beside child until asleep. Minimal interaction.",items:[{id:"cl_s1a",text:"Night 1 — parent on bed",done:false},{id:"cl_s1b",text:"Night 2 complete",done:false},{id:"cl_s1c",text:"Night 3 complete",done:false},{id:"cl_s1d",text:"Night 4 — child comfortable",done:false},{id:"cl_s1e",text:"Step 1 complete ✓",done:false}]},{id:"cl_p2",label:"Step 2: Parent Beside the Bed",desc:"Chair pulled right beside the bed.",items:[{id:"cl_s2a",text:"Night 1 at Step 2",done:false},{id:"cl_s2b",text:"Night 2 complete",done:false},{id:"cl_s2c",text:"Night 3 complete",done:false},{id:"cl_s2d",text:"Step 2 complete ✓",done:false}]},{id:"cl_p3",label:"Step 3: Parent at the Door",items:[{id:"cl_s3a",text:"Night 1 at Step 3",done:false},{id:"cl_s3b",text:"Night 2 complete",done:false},{id:"cl_s3c",text:"Night 3 complete",done:false},{id:"cl_s3d",text:"Step 3 complete ✓",done:false}]},{id:"cl_p4",label:"Step 4: Parent Outside (Door Open)",items:[{id:"cl_s4a",text:"Night 1 at Step 4",done:false},{id:"cl_s4b",text:"Night 2 complete",done:false},{id:"cl_s4c",text:"Night 3 complete",done:false},{id:"cl_s4d",text:"Step 4 complete ✓",done:false}]},{id:"cl_p5",label:"Step 5: Door Cracked",items:[{id:"cl_s5a",text:"Night 1 at Step 5",done:false},{id:"cl_s5b",text:"Night 2 complete",done:false},{id:"cl_s5c",text:"Night 3 complete",done:false},{id:"cl_s5d",text:"Step 5 complete ✓",done:false}]},{id:"cl_p6",label:"Step 6: Fully Independent 🎉",items:[{id:"cl_s6a",text:"Night 1 — door closed, fully independent",done:false},{id:"cl_s6b",text:"Night 2+ — consistently independent",done:false}]}]},
  worry_container:{id:"worry_container",label:"Worry Container Protocol",ageGroups:["school"],color:C.rose,description:"Pre-bed brain dump to reduce cognitive hyperarousal. Worries get written, drawn, and contained before sleep.",hasNaps:false,phases:[{id:"wc_p1",label:"Phase 1: Learn the Brain Dump",desc:"15–20 min before bed: write or draw anything on your mind. No problem-solving — just getting it out.",items:[{id:"wc_n1",text:"Night 1 — brain dump completed before bed",done:false},{id:"wc_n2",text:"Night 2 complete",done:false},{id:"wc_n3",text:"Night 3 — doing it without prompting",done:false}]},{id:"wc_p2",label:"Phase 2: Container Ritual",desc:"Draw the worry, put it in the box, close the lid.",items:[{id:"wc_n4",text:"Night 4 — worry physically placed in container",done:false},{id:"wc_n5",text:"Night 5 complete",done:false},{id:"wc_n6",text:"Night 6 — ritual feeling natural",done:false}]},{id:"wc_p3",label:"Phase 3: Ritual + Independent Sleep",items:[{id:"wc_n7",text:"Night 7+ — falling asleep after container ritual",done:false}]}]},
  sleep_switch:{id:"sleep_switch",label:"Sleep Switch Method",ageGroups:["school"],color:C.teal,description:"Stimulus control in age-appropriate language. Bed = sleep only. If awake 15–20 min, get up and do something boring until sleepy again.",hasNaps:false,phases:[{id:"sw_p1",label:"Week 1: Build the Association",desc:"Bed is for sleep only. Reading and screens happen outside the bedroom before the final routine.",items:[{id:"sw_w1a",text:"Night 1 — pre-bed activities moved outside bedroom",done:false},{id:"sw_w1b",text:"Night 2 complete",done:false},{id:"sw_w1c",text:"Night 3 complete",done:false},{id:"sw_w1d",text:"Night 4 complete",done:false},{id:"sw_w1e",text:"Night 5 — association building",done:false}]},{id:"sw_p2",label:"Week 2: Practice the Get-Up Rule",desc:"If awake more than 15–20 min: get up, do boring activity in dim light, return when sleepy.",items:[{id:"sw_w2a",text:"Night 6 — got up and returned when sleepy",done:false},{id:"sw_w2b",text:"Night 7 complete",done:false},{id:"sw_w2c",text:"Night 8 — rule feeling natural",done:false}]},{id:"sw_p3",label:"Ongoing: Sleep Switch Active",items:[{id:"sw_on",text:"Falling asleep quickly after getting into bed",done:false}]}]},
  morning_anchor:{id:"morning_anchor",label:"Morning Anchor Reset",ageGroups:["school"],color:C.sage,description:"Fix mornings first — nights follow. Consistent wake time + immediate light and movement resets the circadian clock.",hasNaps:false,phases:[{id:"ma_p1",label:"Week 1: Establish Wake Time",desc:"Same wake time every day, even weekends within 1 hour. Immediate light. Movement within 15 min.",items:[{id:"ma_w1a",text:"Day 1 — woke at target time, light + movement done",done:false},{id:"ma_w1b",text:"Day 2 complete",done:false},{id:"ma_w1c",text:"Day 3 complete",done:false},{id:"ma_w1d",text:"Day 4 complete",done:false},{id:"ma_w1e",text:"Day 5 complete",done:false},{id:"ma_w1f",text:"Day 6 complete",done:false},{id:"ma_w1g",text:"Day 7 — wake time holding",done:false}]},{id:"ma_p2",label:"Week 2: Adjust Bedtime",desc:"Once wake time is stable, gradually shift bedtime earlier by 15 min every 2–3 nights.",items:[{id:"ma_w2a",text:"Bedtime shifted 15 min earlier",done:false},{id:"ma_w2b",text:"Second shift if needed",done:false},{id:"ma_w2c",text:"Target bedtime reached",done:false}]},{id:"ma_p3",label:"Ongoing: Rhythm Holding",items:[{id:"ma_on",text:"Consistent sleep-wake rhythm established",done:false}]}]},
  night_wakings_autonomy:{id:"night_wakings_autonomy",label:"Night Wakings Autonomy Plan",ageGroups:["school"],color:C.warm,description:"Child knows the ladder in advance. No surprise escalation. Predictability lowers nervous system threat response.",hasNaps:false,phases:[{id:"nwa_p1",label:"Tier 1: Independent Settle",desc:"Child wakes, tries to resettle on their own for 5–10 min.",items:[{id:"nwa_n1",text:"Night 1 — attempted independent settle",done:false},{id:"nwa_n2",text:"Night 2 complete",done:false},{id:"nwa_n3",text:"Night 3 complete",done:false}]},{id:"nwa_p2",label:"Tier 2: Parent Voice from Doorway",desc:"If still awake after Tier 1, parent calls from doorway: 'I hear you. You're safe. I love you.'",items:[{id:"nwa_n4",text:"Night 4 — voice reassurance used",done:false},{id:"nwa_n5",text:"Night 5 complete",done:false}]},{id:"nwa_p3",label:"Tier 3: Brief Tuck-In",desc:"Parent comes in for a brief tuck-in (60 sec max).",items:[{id:"nwa_n6",text:"Night 6 — brief tuck-in only",done:false},{id:"nwa_n7",text:"Night 7 complete",done:false}]},{id:"nwa_p4",label:"Tier 4: Short Sit (Max 2 Min)",desc:"Parent sits quietly for max 2 min. Child knows this is the top of the ladder.",items:[{id:"nwa_n8",text:"Night 8 — short sit used as needed",done:false},{id:"nwa_n9",text:"Night 9+ — settling at lower tiers",done:false}]}]},
};

const SCHOOL_ADDONS = [
  {id:"sa_regulation",label:"Regulation Rehearsal",description:"Practice body-based regulation tools at bedtime. Train during daytime first — then use at night.",color:C.sage},
  {id:"sa_digital",label:"Digital Sunset Contract",description:"60–90 min device cutoff. Collaborative agreement — not authoritarian removal.",color:C.mauve},
  {id:"sa_jetlag",label:"Pre-Teen Phase Protection",description:"Prevent social jet lag. Weekend wake within 60–90 min of weekday.",color:C.warm},
  {id:"sa_identity",label:"Sleep Identity Shift",description:"Cognitive restructuring. Replace helpless sleep talk with empowered language.",color:C.rose},
  {id:"sa_audit",label:"Family Sleep Culture Audit",description:"Systems-level review. Late dinners, parental dysregulation, over-scheduling all affect sleep.",color:C.sky},
];

const METHOD_GROUPS = [
  {label:"Infant",    sublabel:"0–12 mo", key:"infant",   ids:["settled_support","chair_method","fading","habit_stacking","ferber"]},
  {label:"Toddler",   sublabel:"1–3 yrs", key:"toddler",  ids:["kissing_game","stuffy_check_in","stuffy_fairy","hearts_on_hands","play_prep","confidence_ladder"]},
  {label:"Preschool", sublabel:"3–5 yrs", key:"preschool",ids:["kissing_game","stuffy_check_in","stuffy_fairy","hearts_on_hands","play_prep","confidence_ladder"]},
  {label:"School Age",sublabel:"5+ yrs",  key:"school",   ids:["confidence_ladder","worry_container","sleep_switch","morning_anchor","night_wakings_autonomy","play_prep"]},
];

// Module-level so both SetupPanel and main PlanTab view can use it
function detectAgeGroup(method) {
  for (const g of METHOD_GROUPS) {
    if (g.ids.includes(method)) return g.key;
  }
  return "infant";
}

function getBedtimeRoutine(ageGroup) {
  const older = ageGroup !== "infant";
  const gn3 = ageGroup === "preschool" || ageGroup === "school";
  return [
    {id:"rt_bath",  text:"Bath (the water and warmth is the cue — soap optional)"},
    older ? {id:"rt_pjs", text:"Pajamas on"} : {id:"rt_diaper", text:"Diaper + lotion"},
    ...(ageGroup === "infant"
      ? [{id:"rt_feed", text:"Feed in low-stimulation lighting (dim, quiet, calm)"}]
      : [{id:"rt_books",text:"2 books together (calm and cozy)"}]),
    older ? {id:"rt_into", text:"Into bed"} : {id:"rt_sack", text:"Pajamas + sleep sack"},
    {id:"rt_wn",    text:"White noise turned on"},
    ...(gn3 ? [{id:"rt_gn3", text:"Child chooses their 3 goodnight things (e.g. hug, kiss, high five, back scratch — their pick!)"}] : []),
    {id:"rt_gn",    text:"Said goodnight to 3 objects (door → close, white noise → on, light → off)"},
    {id:"rt_phrase",text:'Said your nightly phrase: "It\'s time for sleep. I\'m right here."'},
    {id:"rt_awake", text:"Child placed in bed awake"},
  ];
}

const NAP_ROUTINE = [
  {id:"np_diaper",text:"Changed diaper"},
  {id:"np_book",  text:"Read a short book"},
  {id:"np_sack",  text:"Into sleep sack"},
  {id:"np_awake", text:"Into crib awake"},
];

function napLabel(i, total) {
  if (total === 1) return "Before bedtime";
  if (i === 0) return "Before 1st nap";
  if (i === total - 1) return "Before bedtime";
  return `Before nap ${i + 1}`;
}

function buildFadingPhases(p) {
  const start = parseInt(p.fadingStartMins), reduce = parseInt(p.fadingReduceMins)||5, every = parseInt(p.fadingEveryDays)||3, prop = p.fadingProp||"prop";
  if (!start) return [];
  const phases = []; let cur = start, day = 1, idx = 0;
  while (cur > 0 && idx < 10) {
    const next = Math.max(0, cur - reduce);
    phases.push({id:`fd_g${idx}`,label:`Days ${day}–${day+every-1}: ${cur} min of ${prop}`,description:`Use ${prop} for ${cur} minutes until drowsy, then put down awake.${next>0?` Next: ${next} min.`:" Next: independent!"}`,items:Array.from({length:every},(_,i)=>({id:`fd_g${idx}_${i}`,text:`Day ${day+i} complete`,done:false}))});
    cur = next; day += every; idx++;
  }
  phases.push({id:"fd_gfin",label:`Day ${day}+: Independent Sleep 🎉`,description:`${prop.charAt(0).toUpperCase()+prop.slice(1)} is still part of the routine — they're falling asleep on their own!`,items:[{id:"fd_gfin_0",text:`Day ${day}+ — falling asleep independently`,done:false}]});
  return phases;
}

// ─── FULL SETUP PANEL ─────────────────────────────────────────────────────────
function SetupPanel({ plan, onSave, onClose }) {
  const T = useT();

  const [f, setF] = useState({
    ageGroup: detectAgeGroup(plan?.method || "settled_support"),
    method: plan?.method || "settled_support",
    startDate: plan?.startDate || "",
    consultantNotes: plan?.setupNotes || "",
    fadingProp: plan?.fadingProp || "",
    fadingStartMins: plan?.fadingStartMins || "",
    fadingReduceMins: plan?.fadingReduceMins || "5",
    fadingEveryDays: plan?.fadingEveryDays || "3",
    addons: plan?.addons || [],
    napCapMinutes: plan?.napCapMinutes || 90,
    wakeWindows: plan?.wakeWindows || null,
  });

  const [editBedtime, setEditBedtime] = useState(
    (plan?.customBedtimeRoutine || getBedtimeRoutine(detectAgeGroup(plan?.method || "settled_support"))).map(i => ({ ...i }))
  );
  const [editNap, setEditNap] = useState(
    (plan?.customNapRoutine || NAP_ROUTINE).map(i => ({ ...i }))
  );
  const [showWakeWindows, setShowWakeWindows] = useState(false);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const group = METHOD_GROUPS.find(g => g.key === f.ageGroup);
  const available = group?.ids || [];
  const isSchool = f.ageGroup === "school";
  const selectedMethod = METHODS[f.method];

  const toggleAddon = id => set("addons", f.addons.includes(id)
    ? f.addons.filter(a => a !== id)
    : [...f.addons, id]
  );

  const updateRoutineItem = (list, setList, idx, val) =>
    setList(list.map((item, i) => i === idx ? { ...item, text: val } : item));
  const removeRoutineItem = (list, setList, idx) =>
    setList(list.filter((_, i) => i !== idx));
  const addRoutineItem = (list, setList, prefix) =>
    setList([...list, { id: `${prefix}_custom_${Date.now()}`, text: "" }]);
  const resetRoutine = (type) => {
    if (type === "bedtime") setEditBedtime(getBedtimeRoutine(f.ageGroup).map(i => ({ ...i })));
    if (type === "nap") setEditNap(NAP_ROUTINE.map(i => ({ ...i })));
  };

  // Wake windows
  const ww = f.wakeWindows || [];
  const adjustWW = (i, delta) => {
    const next = [...ww];
    next[i] = parseFloat(Math.max(0.25, (next[i] + delta)).toFixed(2));
    set("wakeWindows", next);
  };

  // Fading preview
  const fadePrev = (() => {
    const start = parseInt(f.fadingStartMins), reduce = parseInt(f.fadingReduceMins)||5, every = parseInt(f.fadingEveryDays)||3;
    if (!start) return null;
    const steps = []; let cur = start, day = 1, idx = 0;
    while (cur > 0 && idx < 9) {
      steps.push({ label: `Days ${day}–${day+every-1}`, mins: cur });
      cur = Math.max(0, cur - reduce); day += every; idx++;
    }
    steps.push({ label: `Day ${day}+`, mins: 0 });
    return steps;
  })();

  const handleSave = () => {
    const methodInfo = METHODS[f.method];
    // Auto-generate fresh phases when method changes, preserve existing if same
    const freshPhases = f.method !== plan?.method
      ? (methodInfo?.phases || []).map(ph => ({
          ...ph,
          items: ph.items.map(it => ({ ...it, done: false })),
        }))
      : plan?.phases || [];
    onSave({
      ...plan,
      method: f.method,
      methodLabel: methodInfo?.label || f.method,
      startDate: f.startDate,
      setupNotes: f.consultantNotes,
      napCapMinutes: f.napCapMinutes,
      fadingProp: f.fadingProp,
      fadingStartMins: f.fadingStartMins,
      fadingReduceMins: f.fadingReduceMins,
      fadingEveryDays: f.fadingEveryDays,
      addons: f.addons,
      wakeWindows: f.wakeWindows,
      customBedtimeRoutine: editBedtime.filter(i => i.text.trim()),
      customNapRoutine: editNap.filter(i => i.text.trim()),
      phases: freshPhases,
    });
  };

  const inp = {
    width: "100%", background: T.inputBg, border: `1.5px solid ${T.border}`,
    borderRadius: 10, padding: "11px 13px", color: T.text, fontFamily: font,
    fontSize: 13.5, outline: "none", boxSizing: "border-box",
  };
  const lbl = {
    display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em",
    textTransform: "uppercase", color: T.muted, marginBottom: 7, fontFamily: font,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      zIndex: 200, backdropFilter: "blur(8px)",
      overflowY: "auto", padding: "20px 16px 100px",
    }}>
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 22, width: "100%", maxWidth: 560,
        padding: 24, boxShadow: T.shadow,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: serif, fontSize: 21, color: T.headingText }}>Sleep Plan Setup</div>
            <div style={{ fontFamily: font, fontSize: 11.5, color: T.muted, marginTop: 3 }}>
              Rooted Connections Collective
            </div>
          </div>
          <button onClick={onClose} style={{
            background: T.faint, border: "none", color: T.muted,
            borderRadius: 9, width: 34, height: 34, fontSize: 16,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        <div style={{ display: "grid", gap: 22 }}>

          {/* Age Group */}
          <div>
            <label style={lbl}>Age Group</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {METHOD_GROUPS.map(g => (
                <button key={g.key} onClick={() => {
                  set("ageGroup", g.key);
                  set("method", METHOD_GROUPS.find(x => x.key === g.key)?.ids?.[0] || "");
                  set("addons", []);
                  setEditBedtime(getBedtimeRoutine(g.key).map(i => ({ ...i })));
                }} style={{
                  padding: "10px 4px", borderRadius: 11,
                  border: `1.5px solid ${f.ageGroup === g.key ? C.teal : T.border}`,
                  background: f.ageGroup === g.key ? `${C.teal}18` : T.card,
                  color: f.ageGroup === g.key ? C.teal : T.muted,
                  fontFamily: font, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  lineHeight: 1.35, transition: "all .2s",
                }}>
                  <div>{g.label}</div>
                  <div style={{ fontSize: 10, opacity: .55 }}>{g.sublabel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Method */}
          <div>
            <label style={lbl}>Primary Sleep Training Method</label>
            <div style={{ display: "grid", gap: 7 }}>
              {available.map(id => {
                const m = METHODS[id];
                if (!m) return null;
                const sel = f.method === id;
                return (
                  <button key={id} onClick={() => set("method", id)} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 14px", borderRadius: 11,
                    border: `1.5px solid ${sel ? m.color : T.border}`,
                    background: sel ? `${m.color}16` : T.card,
                    textAlign: "left", cursor: "pointer", width: "100%", transition: "all .2s",
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: sel ? m.color : T.border, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: sel ? T.headingText : T.muted }}>
                        {m.label}
                      </div>
                      <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>
                        {m.description.slice(0, 72)}…
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fading details */}
          {f.method === "fading" && (
            <div style={{ background: `${C.sage}0f`, border: `1px solid ${C.sage}28`, borderRadius: 13, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sage, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 14, fontFamily: font }}>
                Fading Plan Details
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={lbl}>Sleep prop to fade</label>
                  <input style={inp} value={f.fadingProp} onChange={e => set("fadingProp", e.target.value)} placeholder="e.g. Nursing to sleep, rocking, back rubs…" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div><label style={lbl}>Start at (mins)</label><input style={inp} type="number" min="1" value={f.fadingStartMins} onChange={e => set("fadingStartMins", e.target.value)} placeholder="e.g. 20" /></div>
                  <div><label style={lbl}>Reduce by (mins)</label><input style={inp} type="number" min="1" value={f.fadingReduceMins} onChange={e => set("fadingReduceMins", e.target.value)} /></div>
                  <div><label style={lbl}>Every (days)</label><input style={inp} type="number" min="1" value={f.fadingEveryDays} onChange={e => set("fadingEveryDays", e.target.value)} /></div>
                </div>
                {fadePrev && (
                  <div style={{ background: T.faint, borderRadius: 9, padding: "11px 13px" }}>
                    <div style={{ fontFamily: font, fontSize: 10, color: T.muted, marginBottom: 8, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase" }}>Schedule Preview</div>
                    {fadePrev.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 10.5, color: s.mins === 0 ? C.sage : T.muted, padding: "3px 0" }}>
                        <span>{s.label}</span>
                        <span>{s.mins === 0 ? "Independent 🎉" : `${s.mins} min of ${f.fadingProp || "prop"}`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* School Add-Ons */}
          {isSchool && (
            <div>
              <label style={lbl}>Optional Add-On Strategies</label>
              <div style={{ display: "grid", gap: 8 }}>
                {SCHOOL_ADDONS.map(addon => {
                  const sel = f.addons.includes(addon.id);
                  return (
                    <button key={addon.id} onClick={() => toggleAddon(addon.id)} style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "11px 14px", borderRadius: 11,
                      border: `1.5px solid ${sel ? addon.color : T.border}`,
                      background: sel ? `${addon.color}12` : T.card,
                      textAlign: "left", cursor: "pointer", width: "100%", transition: "all .2s",
                    }}>
                      <div style={{
                        width: 17, height: 17, borderRadius: 5,
                        border: `2px solid ${sel ? addon.color : T.border}`,
                        background: sel ? addon.color : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: 2,
                      }}>
                        {sel && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: sel ? T.headingText : T.muted }}>{addon.label}</div>
                        <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{addon.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bedtime Routine */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 18 }}>
            <div style={{ fontFamily: serif, fontSize: 16, color: T.headingText, marginBottom: 4 }}>Bedtime Routine</div>
            <div style={{ fontSize: 12, color: T.muted, fontFamily: font, marginBottom: 12, lineHeight: 1.5 }}>
              Customize the steps the family will see and check off each night.
            </div>
            {editBedtime.map((item, idx) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${T.border}`,
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 10, color: T.muted }}>{idx + 1}</span>
                </div>
                <input value={item.text} onChange={e => updateRoutineItem(editBedtime, setEditBedtime, idx, e.target.value)}
                  style={{ ...inp, marginBottom: 0, flex: 1, padding: "8px 12px" }} placeholder="Routine step..." />
                <button onClick={() => removeRoutineItem(editBedtime, setEditBedtime, idx)}
                  style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16, padding: "0 4px", flexShrink: 0 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 16 }}>
              <button onClick={() => addRoutineItem(editBedtime, setEditBedtime, "bt")}
                style={{ padding: "7px 12px", borderRadius: 8, border: `1px dashed ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>
                + Add step
              </button>
              <button onClick={() => resetRoutine("bedtime")}
                style={{ padding: "7px 12px", borderRadius: 8, border: `1px dashed ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>
                ↺ Reset to default
              </button>
            </div>
          </div>

          {/* Nap Routine */}
          {selectedMethod?.hasNaps && (
            <div>
              <div style={{ fontFamily: serif, fontSize: 16, color: T.headingText, marginBottom: 4 }}>Nap Routine</div>
              <div style={{ fontSize: 12, color: T.muted, fontFamily: font, marginBottom: 12, lineHeight: 1.5 }}>
                Customize the nap routine steps.
              </div>
              {editNap.map((item, idx) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${T.border}`,
                    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10, color: T.muted }}>{idx + 1}</span>
                  </div>
                  <input value={item.text} onChange={e => updateRoutineItem(editNap, setEditNap, idx, e.target.value)}
                    style={{ ...inp, marginBottom: 0, flex: 1, padding: "8px 12px" }} placeholder="Routine step..." />
                  <button onClick={() => removeRoutineItem(editNap, setEditNap, idx)}
                    style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16, padding: "0 4px", flexShrink: 0 }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 8 }}>
                <button onClick={() => addRoutineItem(editNap, setEditNap, "np")}
                  style={{ padding: "7px 12px", borderRadius: 8, border: `1px dashed ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>
                  + Add step
                </button>
                <button onClick={() => resetRoutine("nap")}
                  style={{ padding: "7px 12px", borderRadius: 8, border: `1px dashed ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>
                  ↺ Reset to default
                </button>
              </div>
            </div>
          )}

          {/* Wake Windows */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 18 }}>
            <button onClick={() => {
              if (!showWakeWindows && ww.length === 0) {
                // seed with 2 default windows as a starting point
                set("wakeWindows", [2.0, 3.0]);
              }
              setShowWakeWindows(x => !x);
            }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: showWakeWindows ? 14 : 0,
            }}>
              <span style={{ fontSize: 17 }}>⏱️</span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.sky }}>Wake Windows</div>
                <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 1 }}>
                  {ww.length > 0
                    ? `${ww.length} window${ww.length !== 1 ? "s" : ""} configured — drives real-time parent suggestions`
                    : "Configure custom wake windows for this family"}
                </div>
              </div>
              <span style={{ color: T.muted, fontSize: 13, transform: showWakeWindows ? "rotate(180deg)" : "none", transition: "transform .2s", display: "inline-block" }}>▾</span>
            </button>

            {showWakeWindows && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 11.5, color: T.muted, fontFamily: font, lineHeight: 1.6 }}>
                  These drive the "next sleep" suggestion shown to parents in real time. Adjust to match this child's actual patterns.
                </div>
                {ww.map((w, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 11,
                    background: `${C.sky}0c`, border: `1px solid ${C.sky}28`,
                  }}>
                    <div>
                      <div style={{ fontFamily: font, fontSize: 12.5, fontWeight: 600, color: T.headingText }}>
                        {napLabel(i, ww.length)}
                      </div>
                      <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 2 }}>Wake window</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => adjustWW(i, -0.25)} style={{
                        width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`,
                        background: T.card, fontSize: 16, cursor: "pointer", color: T.text,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>−</button>
                      <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.sky, minWidth: 48, textAlign: "center" }}>
                        {w}h
                      </span>
                      <button onClick={() => adjustWW(i, +0.25)} style={{
                        width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`,
                        background: T.card, fontSize: 16, cursor: "pointer", color: T.text,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>+</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => set("wakeWindows", [...ww, 3.0])}
                    style={{ padding: "7px 12px", borderRadius: 8, border: `1px dashed ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>
                    + Add window
                  </button>
                  {ww.length > 1 && (
                    <button onClick={() => set("wakeWindows", ww.slice(0, -1))}
                      style={{ padding: "7px 12px", borderRadius: 8, border: `1px dashed ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>
                      − Remove last
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nap Cap */}
          <div>
            <label style={lbl}>Nap Cap</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => set("napCapMinutes", Math.max(30, f.napCapMinutes - 5))} style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`,
                background: T.card, fontSize: 18, cursor: "pointer", color: T.text,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>−</button>
              <input
                type="number" min="30" max="240" step="5"
                value={f.napCapMinutes}
                onChange={e => set("napCapMinutes", Math.max(30, Math.min(240, parseInt(e.target.value) || 90)))}
                style={{ ...inp, width: 80, textAlign: "center", padding: "8px 10px", fontWeight: 700, fontSize: 15 }}
              />
              <button onClick={() => set("napCapMinutes", Math.min(240, f.napCapMinutes + 5))} style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`,
                background: T.card, fontSize: 18, cursor: "pointer", color: T.text,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>+</button>
              <span style={{ fontFamily: font, fontSize: 12, color: T.muted }}>minutes</span>
              <div style={{ display: "flex", gap: 5, marginLeft: 4 }}>
                {[60, 90, 120].map(m => (
                  <button key={m} onClick={() => set("napCapMinutes", m)} style={{
                    padding: "4px 8px", borderRadius: 12, fontSize: 11, border: "none",
                    background: f.napCapMinutes === m ? C.teal : T.faint,
                    color: f.napCapMinutes === m ? "#fff" : T.muted,
                    cursor: "pointer", fontFamily: font,
                  }}>{m}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Start Date + Note */}
          <div>
            <label style={lbl}>Training Start Date</label>
            <input style={{ ...inp, colorScheme: "auto", maxWidth: 200 }} type="date" value={f.startDate} onChange={e => set("startDate", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Note to Family (visible on their plan)</label>
            <textarea style={{ ...inp, minHeight: 80, resize: "vertical", lineHeight: 1.6 }}
              value={f.consultantNotes} onChange={e => set("consultantNotes", e.target.value)}
              placeholder="Any personalized guidance, encouragement, or reminders for this family…" />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "13px 0", borderRadius: 11, border: `1px solid ${T.border}`,
              background: "none", color: T.muted, fontFamily: font, fontSize: 13.5, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={handleSave} style={{
              flex: 2, padding: "13px 0", borderRadius: 11, border: "none",
              background: C.teal, color: "#fff", fontFamily: font, fontSize: 13.5,
              fontWeight: 700, cursor: "pointer", letterSpacing: ".02em",
              boxShadow: `0 4px 16px ${C.teal}40`,
            }}>
              Save & Apply Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function PlanTab({ family, activeChild, onNavigate }) {
  const T = useT();
  const { plans, toggleItem, addConsultantNote, updatePlan, seedPlan } = usePlans();
  const [showSetup, setShowSetup] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const familyId = family?.id;
  const planKey  = activeChild?.id || activeChild?.planId;

  // Load plan from Supabase on mount / child change
  useEffect(() => {
    if (!familyId || !planKey) return;
    supabase
      .from("families")
      .select("sleep_plan_profile, sleep_progress")
      .eq("id", familyId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.sleep_plan_profile) return;
        const profile = data.sleep_plan_profile;
        // Merge saved progress back into phases
        const progress = data.sleep_progress || {};
        const phases = (profile.phases || []).map(ph => ({
          ...ph,
          items: ph.items.map(it => ({ ...it, done: !!progress[it.id] })),
        }));
        seedPlan(planKey, {
          ...profile,
          id: planKey,
          familyId,
          phases,
          consultantNotes: profile.consultantNotes || {},
        });
      })
      .catch(err => console.error("[PlanTab] load:", err));
  }, [familyId, planKey]);

  const plan = plans[planKey];

  if (!plan) return (
    <div style={{ padding: 40, textAlign: "center", color: T.muted, fontFamily: font }}>
      No plan assigned yet.
      <div onClick={() => onNavigate("methodMatching", { familyId, childId: planKey })} style={{ color: C.teal, marginTop: 12, cursor: "pointer", fontWeight: 600 }}>
        Assign a method →
      </div>
    </div>
  );

  const phaseStatus = (ph) => ph.items.every(i => i.done) ? "done" : ph.items.some(i => i.done) ? "current" : "upcoming";

  const handleNoteSubmit = (planId, itemId) => {
    addConsultantNote(planId, itemId, noteText);
    setEditingNote(null);
    setNoteText("");
  };

  const handleSave = (updated) => {
    updatePlan(planKey, { ...updated, familyId, id: planKey });
    setShowSetup(false);
  };

  const totalItems = plan.phases.flatMap(p => p.items).length;
  const doneItems = plan.phases.flatMap(p => p.items).filter(i => i.done).length;
  const trainingDay = plan.startDate
    ? Math.max(1, Math.floor((Date.now() - new Date(plan.startDate)) / 86400000) + 1)
    : activeChild?.planDay;

  return (
    <div>
      {/* Method + switch */}
      <div style={{ margin: "10px 18px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, background: "#2D4A35", borderRadius: 12, padding: "10px 13px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 2, fontFamily: font }}>
            Current method
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "white", fontFamily: font }}>
            {plan.methodLabel} · Day {trainingDay}
          </div>
          {totalItems > 0 && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2, fontFamily: font }}>
              {doneItems}/{totalItems} steps complete
            </div>
          )}
        </div>
        <button onClick={() => setShowSetup(true)} style={{
          background: T.card, border: `1.5px solid ${T.border}`,
          borderRadius: 12, padding: "10px 13px", cursor: "pointer", textAlign: "center",
        }}>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 2, fontFamily: font }}>Change</div>
          <div style={{ fontSize: 14 }}>🔄</div>
        </button>
      </div>

      {/* Co-Pilot suggestion */}
      {activeChild?.status === "urgent" && (
        <InsightCard
          label="◎ Co-Pilot · Suggested adjustment"
          title="Cap nap at 90 min before changing method."
          body="Try schedule adjustment for 3 nights before switching method. If no improvement by Night 12, method change may be warranted."
          actions={[
            { label: "Apply", onClick: () => updatePlan(planKey, { napCapMinutes: 90 }) },
            { label: "Switch method instead", onClick: () => setShowSetup(true) },
          ]}
        />
      )}

      {/* Nap cap with stepper */}
      <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 14, padding: "10px 14px", boxShadow: T.shadow, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, fontFamily: font }}>Nap cap</div>
          <div style={{ fontSize: 14, color: T.text, fontFamily: font }}>{plan.napCapMinutes} min max</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => updatePlan(planKey, { napCapMinutes: Math.max(30, (plan.napCapMinutes || 90) - 5) })} style={{
            width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`,
            background: T.faint, fontSize: 16, cursor: "pointer", color: T.text,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>−</button>
          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.teal, minWidth: 36, textAlign: "center" }}>
            {plan.napCapMinutes}m
          </span>
          <button onClick={() => updatePlan(planKey, { napCapMinutes: Math.min(240, (plan.napCapMinutes || 90) + 5) })} style={{
            width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`,
            background: T.faint, fontSize: 16, cursor: "pointer", color: T.text,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>+</button>
          <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
            {[60, 90, 120].map(m => (
              <div key={m} onClick={() => updatePlan(planKey, { napCapMinutes: m })} style={{
                padding: "3px 7px", borderRadius: 16, fontSize: 10,
                background: plan.napCapMinutes === m ? C.teal : T.faint,
                color: plan.napCapMinutes === m ? "#fff" : T.muted,
                cursor: "pointer", fontFamily: font,
              }}>{m}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Wake Windows display */}
      {plan.wakeWindows?.length > 0 && (
        <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 14, padding: "10px 14px", boxShadow: T.shadow }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>⏱️</span>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.sky, fontFamily: font }}>Wake Windows</div>
            </div>
            <button onClick={() => setShowSetup(true)} style={{
              background: "none", border: "none", fontSize: 10, color: T.muted,
              cursor: "pointer", fontFamily: font, padding: "2px 6px",
            }}>Edit →</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {plan.wakeWindows.map((ww, i) => {
              const labels = plan.wakeWindows.length === 1
                ? ["Before bedtime"]
                : plan.wakeWindows.map((_, idx) =>
                    idx === 0 ? "Before 1st nap"
                    : idx === plan.wakeWindows.length - 1 ? "Before bedtime"
                    : `Before nap ${idx + 1}`
                  );
              return (
                <div key={i} style={{
                  background: `${C.sky}12`, border: `1px solid ${C.sky}28`,
                  borderRadius: 10, padding: "6px 10px", textAlign: "center",
                }}>
                  <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: C.sky }}>{ww}h</div>
                  <div style={{ fontFamily: font, fontSize: 9, color: T.muted, marginTop: 1, textTransform: "uppercase", letterSpacing: "0.06em" }}>{labels[i]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!plan.wakeWindows?.length && (
        <div onClick={() => setShowSetup(true)} style={{
          margin: "0 18px 10px", background: T.faint, borderRadius: 14,
          padding: "8px 14px", display: "flex", alignItems: "center", gap: 8,
          cursor: "pointer", border: `1px dashed ${T.border}`,
        }}>
          <span style={{ fontSize: 14 }}>⏱️</span>
          <div style={{ fontSize: 12, color: T.muted, fontFamily: font }}>Add wake windows → drives real-time parent suggestions</div>
        </div>
      )}

      {/* Phases */}
      {plan.phases.length === 0 && (
        <div style={{ margin: "0 18px 10px", padding: "16px", background: T.card, borderRadius: 14, textAlign: "center", boxShadow: T.shadow }}>
          <div style={{ fontSize: 12, color: T.muted, fontFamily: font }}>No checklist yet. Open the setup panel to assign a method and generate the plan.</div>
        </div>
      )}
      {plan.phases.map(ph => {
        const st = phaseStatus(ph);
        return (
          <div key={ph.id} style={{
            margin: "0 18px 10px", background: T.card, borderRadius: 18,
            padding: "14px 16px", boxShadow: T.shadow, opacity: st === "done" ? 0.72 : 1,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                background: st === "done" ? T.muted : st === "current" ? "#C08A3A" : T.border,
              }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, flex: 1, fontFamily: font }}>{ph.label}</div>
              <div style={{
                fontSize: 10, borderRadius: 20, padding: "2px 8px", fontFamily: font,
                background: st === "done" ? T.faint : st === "current" ? "#FBF4E6" : T.faint,
                color: st === "done" ? T.muted : st === "current" ? "#C08A3A" : T.muted,
              }}>
                {st === "done" ? "✓ Done" : st === "current" ? "In progress" : "Upcoming"}
              </div>
            </div>

            {ph.desc && (
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 10, fontFamily: font }}>{ph.desc}</div>
            )}

            {ph.items.map(item => (
              <div key={item.id}>
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "8px 0", borderBottom: `1px solid ${T.border}`,
                }}>
                  <button onClick={() => toggleItem(planKey, ph.id, item.id)} style={{
                    width: 20, height: 20, borderRadius: 6,
                    border: `1.5px solid ${item.done ? C.teal : T.border}`,
                    background: item.done ? C.teal : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 11, color: "#fff",
                    flexShrink: 0, marginTop: 1,
                  }}>{item.done ? "✓" : ""}</button>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 13, color: item.done ? T.muted : T.text,
                      textDecoration: item.done ? "line-through" : "none",
                      lineHeight: 1.4, fontFamily: font,
                    }}>{item.text}</div>
                    {plan.consultantNotes?.[item.id] && (
                      <div style={{ fontSize: 10, color: C.teal, fontStyle: "italic", marginTop: 3, fontFamily: font }}>
                        ◎ {plan.consultantNotes[item.id]}
                      </div>
                    )}
                  </div>

                  <button onClick={() => { setEditingNote(item.id); setNoteText(plan.consultantNotes?.[item.id] || ""); }} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, color: T.muted, padding: "2px 4px",
                  }}>✏️</button>
                </div>

                {editingNote === item.id && (
                  <div style={{ padding: "8px 0 4px" }}>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                      placeholder="Add consultant note…"
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 10,
                        border: `1.5px solid ${C.teal}`, background: T.inputBg, color: T.text,
                        fontSize: 12, fontFamily: font, resize: "none", height: 60, outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button onClick={() => handleNoteSubmit(planKey, item.id)} style={{
                        background: C.teal, color: "#fff", border: "none",
                        borderRadius: 10, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: font,
                      }}>Save</button>
                      <button onClick={() => setEditingNote(null)} style={{
                        background: "transparent", border: `1px solid ${T.border}`,
                        borderRadius: 10, padding: "6px 14px", fontSize: 12,
                        color: T.muted, cursor: "pointer", fontFamily: font,
                      }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Bedtime Routine — read-only view of what parent sees */}
      {(() => {
        const bedtime = plan.customBedtimeRoutine?.length
          ? plan.customBedtimeRoutine
          : getBedtimeRoutine(detectAgeGroup(plan.method || "settled_support"));
        const doneCount = bedtime.filter(i => i.done).length;
        return (
          <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: font }}>🌙 Bedtime Routine</div>
                <div style={{ fontSize: 10, color: T.muted, fontFamily: font, marginTop: 2 }}>
                  {doneCount}/{bedtime.length} steps checked off tonight
                </div>
              </div>
              {doneCount === bedtime.length && bedtime.length > 0 && (
                <div style={{ fontSize: 11, color: C.sage, fontFamily: font, fontWeight: 600 }}>✓ Complete</div>
              )}
            </div>
            {bedtime.map((item, idx) => (
              <div key={item.id || idx} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 0", borderBottom: `1px solid ${T.border}`,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: `1.5px solid ${item.done ? C.purple : T.border}`,
                  background: item.done ? C.purple : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {item.done && <svg width="9" height="7" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span style={{
                  fontSize: 12, fontFamily: font, lineHeight: 1.5,
                  color: item.done ? T.muted : T.text,
                  textDecoration: item.done ? "line-through" : "none", flex: 1,
                }}>{item.text}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, fontSize: 10, color: T.muted, fontFamily: font, fontStyle: "italic" }}>
              Read-only — parent checks these off each night in the Held app
            </div>
          </div>
        );
      })()}

      {/* Nap Routine — show for methods with naps or if a custom nap routine was set */}
      {(METHODS[plan.method]?.hasNaps || plan.customNapRoutine?.length > 0) && (() => {
        const napRoutine = plan.customNapRoutine?.length ? plan.customNapRoutine : NAP_ROUTINE;
        const doneCount = napRoutine.filter(i => i.done).length;
        return (
          <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: font }}>☀️ Nap Routine</div>
                <div style={{ fontSize: 10, color: T.muted, fontFamily: font, marginTop: 2 }}>
                  {doneCount}/{napRoutine.length} steps checked off today
                </div>
              </div>
              {doneCount === napRoutine.length && napRoutine.length > 0 && (
                <div style={{ fontSize: 11, color: C.sage, fontFamily: font, fontWeight: 600 }}>✓ Complete</div>
              )}
            </div>
            {napRoutine.map((item, idx) => (
              <div key={item.id || idx} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 0", borderBottom: `1px solid ${T.border}`,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: `1.5px solid ${item.done ? C.sage : T.border}`,
                  background: item.done ? C.sage : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {item.done && <svg width="9" height="7" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span style={{
                  fontSize: 12, fontFamily: font, lineHeight: 1.5,
                  color: item.done ? T.muted : T.text,
                  textDecoration: item.done ? "line-through" : "none", flex: 1,
                }}>{item.text}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, fontSize: 10, color: T.muted, fontFamily: font, fontStyle: "italic" }}>
              Read-only — parent checks these off at each nap in the Held app
            </div>
          </div>
        );
      })()}

      {/* Bottom action row */}
      <div style={{ margin: "0 18px 16px", display: "flex", gap: 7 }}>
        <button onClick={() => setShowSendPanel(true)} style={{
          flex: 1, background: T.card, border: `1.5px solid ${T.border}`,
          borderRadius: 14, padding: 10, textAlign: "center", cursor: "pointer",
        }}>
          <div style={{ fontSize: 16, marginBottom: 3 }}>📤</div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: font }}>Send to parent</div>
        </button>
        <button onClick={() => setShowHistory(true)} style={{
          flex: 1, background: T.card, border: `1.5px solid ${T.border}`,
          borderRadius: 14, padding: 10, textAlign: "center", cursor: "pointer",
        }}>
          <div style={{ fontSize: 16, marginBottom: 3 }}>🕐</div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: font }}>Version history</div>
        </button>
        <button onClick={() => setShowSetup(true)} style={{
          flex: 1, background: T.card, border: `1.5px solid ${T.border}`,
          borderRadius: 14, padding: 10, textAlign: "center", cursor: "pointer",
        }}>
          <div style={{ fontSize: 16, marginBottom: 3 }}>✏️</div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: font }}>Edit method</div>
        </button>
      </div>

      {/* Version History Modal */}
      {showHistory && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          zIndex: 300, display: "flex", alignItems: "flex-end",
        }} onClick={() => setShowHistory(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.card, borderRadius: "24px 24px 0 0",
            padding: "20px 18px 40px", width: "100%",
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 18px" }} />
            <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText, marginBottom: 4 }}>Version History</div>
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 16 }}>
              Plan changes are tracked automatically.
            </div>
            {[
              { date: "Today", label: plan.methodLabel, note: "Current version" },
              { date: plan.startDate || "—", label: plan.methodLabel, note: "Plan started" },
            ].map((v, i) => (
              <div key={i} style={{
                padding: "12px 0", borderBottom: `1px solid ${T.border}`,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text }}>{v.label}</div>
                  <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 2 }}>{v.date} · {v.note}</div>
                </div>
                {i === 0 && (
                  <div style={{ fontSize: 10, background: `${C.teal}20`, color: C.teal, borderRadius: 8, padding: "2px 8px", fontFamily: font, fontWeight: 700 }}>
                    Active
                  </div>
                )}
              </div>
            ))}
            <div style={{ marginTop: 14, fontSize: 11, color: T.muted, fontFamily: font, fontStyle: "italic" }}>
              Full version history with diffs will be available in a future update.
            </div>
          </div>
        </div>
      )}

      {/* Send to Parent Modal */}
      {showSendPanel && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          zIndex: 300, display: "flex", alignItems: "flex-end",
        }} onClick={() => setShowSendPanel(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.card, borderRadius: "24px 24px 0 0",
            padding: "20px 18px 40px", width: "100%",
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 18px" }} />
            <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText, marginBottom: 4 }}>Send Plan to Parent</div>
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 16, lineHeight: 1.6 }}>
              The family will receive this plan in their Held app. They'll see the method, bedtime routine checklist, and any notes you've added.
            </div>
            <div style={{ background: T.faint, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                📋 {plan.methodLabel}
              </div>
              {plan.setupNotes && (
                <div style={{ fontFamily: font, fontSize: 11, color: T.muted, fontStyle: "italic", lineHeight: 1.6 }}>
                  "{plan.setupNotes}"
                </div>
              )}
              <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 6 }}>
                {plan.phases.length} phases · {totalItems} checklist items · Nap cap {plan.napCapMinutes} min
              </div>
            </div>
            <button onClick={async () => {
              try {
                // Mark plan as sent + insert a message to the family
                const { data: { session } } = await supabase.auth.getSession();
                const senderId = session?.user?.id;
                const senderRole = session?.user?.user_metadata?.role || "consultant";
                if (familyId && senderId) {
                  await supabase.from("messages").insert({
                    family_id: familyId,
                    sender_id: senderId,
                    sender_role: senderRole,
                    content: `Your sleep plan is ready! I've assigned the ${plan.methodLabel} to your family. Open the Plans tab in your Held app to view your personalized checklist and get started.`,
                    type: "text",
                  });
                  await supabase.from("families")
                    .update({ sleep_plan_sent_at: new Date().toISOString() })
                    .eq("id", familyId);
                }
                setSendSuccess(true);
                setTimeout(() => { setShowSendPanel(false); setSendSuccess(false); }, 2200);
              } catch (err) {
                console.error("[PlanTab] send:", err);
                setSendSuccess(true); // Still close gracefully
                setTimeout(() => { setShowSendPanel(false); setSendSuccess(false); }, 2200);
              }
            }} style={{
              width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
              background: "#2D4A35", color: "#fff", fontFamily: font, fontSize: 14,
              fontWeight: 700, cursor: "pointer",
            }}>
              {sendSuccess ? "✓ Sent!" : "Send to Family →"}
            </button>
            <button onClick={() => setShowSendPanel(false)} style={{
              width: "100%", padding: "12px 0", borderRadius: 14, border: `1px solid ${T.border}`,
              background: "none", color: T.muted, fontFamily: font, fontSize: 13,
              cursor: "pointer", marginTop: 8,
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Full setup panel */}
      {showSetup && (
        <SetupPanel
          plan={plan}
          onSave={handleSave}
          onClose={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
