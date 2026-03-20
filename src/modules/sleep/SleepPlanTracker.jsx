import { useState, useCallback, useContext, useEffect, useRef } from "react";
import { useT, font, serif, mono } from "../../core/shared.jsx";
import { AppCtx } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

// ─── STATIC COLOR PALETTE ─────────────────────────────────────────────────────
const C = {
  teal:"#7B9EA8", mauve:"#A8907B", purple:"#8A7BAA", sage:"#7BAA8A",
  warm:"#AA9B7B", rose:"#A87B8A", sky:"#7B8FAA", amber:"#A89B5A",
};

// ─── ALL METHOD DATA ──────────────────────────────────────────────────────────
const METHODS = {
  settled_support:{id:"settled_support",label:"Settled Support Method",ageGroups:["infant"],color:C.teal,description:"Attuned presence with gradual withdrawal. Stay close and slowly increase distance over 17+ nights.",hasNaps:true,phases:[{id:"ss_p1",label:"Nights 1–3: Connected Comfort",description:"Sit beside the crib. Pat and shush to calm — not to sleep. Your presence is the anchor.",items:[{id:"ss_n1",text:"Night 1 complete"},{id:"ss_n2",text:"Night 2 complete"},{id:"ss_n3",text:"Night 3 complete"}]},{id:"ss_p2",label:"Nights 4–6: Gentle Withdrawal",description:"Hand resting on baby — no active patting/shushing unless escalating.",items:[{id:"ss_n4",text:"Night 4 complete"},{id:"ss_n5",text:"Night 5 complete"},{id:"ss_n6",text:"Night 6 complete"}]},{id:"ss_p3",label:"Nights 7–10: Supportive Distance",description:"Hand resting inside the crib but not on baby. Shush only if escalating.",items:[{id:"ss_n7",text:"Night 7 complete"},{id:"ss_n8",text:"Night 8 complete"},{id:"ss_n9",text:"Night 9 complete"},{id:"ss_n10",text:"Night 10 complete"}]},{id:"ss_p4",label:"Nights 11–13: Steady Presence",description:"Chair beside the crib. Voice + light touch only when escalating.",items:[{id:"ss_n11",text:"Night 11 complete"},{id:"ss_n12",text:"Night 12 complete"},{id:"ss_n13",text:"Night 13 complete"}]},{id:"ss_p5",label:"Nights 14–16: Expanding Space",description:"Increasing wait time before comfort.",items:[{id:"ss_n14",text:"Night 14 — wait 3 min before comfort"},{id:"ss_n15",text:"Night 15 — wait 5 min before comfort"},{id:"ss_n16",text:"Night 16 — wait 7 min before comfort"}]},{id:"ss_p6",label:"Night 17+: Confident Independence",description:"Put down awake, leave the room. Wait 10 min before responding.",items:[{id:"ss_n17",text:"Night 17+ — leaving room, 10-min wait"}]}],napPhases:[{id:"ss_np1",label:"Days 1–3: Chair by the Crib",description:"Voice + light touch to calm (not to sleep).",items:[{id:"ss_nd1",text:"Day 1 complete"},{id:"ss_nd2",text:"Day 2 complete"},{id:"ss_nd3",text:"Day 3 complete"}]},{id:"ss_np2",label:"Days 4–6: Chair in the Middle",description:"Increasing wait times.",items:[{id:"ss_nd4",text:"Day 4 — wait 3 min"},{id:"ss_nd5",text:"Day 5 — wait 5 min"},{id:"ss_nd6",text:"Day 6 — wait 7 min"}]},{id:"ss_np3",label:"Day 7+: Leaving the Room",description:"Put down awake, leave. 10–15 min wait. Nap rescue after 1 hour if needed.",items:[{id:"ss_nd7",text:"Day 7+ — leaving room for naps"}]}]},
  chair_method:{id:"chair_method",label:"Chair Method",ageGroups:["infant"],color:C.purple,description:"Parent starts in the room and gradually removes themselves over 7 days. Sleep prop removed cold turkey.",hasNaps:true,setupItems:[{id:"cm_prop",text:"Sleep prop identified and removed from ALL sleep situations"},{id:"cm_both",text:"Both caregivers aligned on the plan"}],phases:[{id:"cm_p1",label:"Nights 1–3: Chair by the Crib",description:"Sit next to crib. Voice + light touch to calm — NOT to sleep.",items:[{id:"cm_n1",text:"Night 1 complete"},{id:"cm_n2",text:"Night 2 complete"},{id:"cm_n3",text:"Night 3 complete"}]},{id:"cm_p2",label:"Nights 4–6: Chair in the Middle",description:"Move chair to middle of the room.",items:[{id:"cm_n4",text:"Night 4 — wait 3 min before comfort"},{id:"cm_n5",text:"Night 5 — wait 5 min before comfort"},{id:"cm_n6",text:"Night 6 — wait 7 min before comfort"}]},{id:"cm_p3",label:"Night 7+: Leave the Room",description:"Put child down awake, leave. Wait 10–15 min before responding.",items:[{id:"cm_n7",text:"Night 7+ — leaving room, 10–15 min wait"}]}],napPhases:[{id:"cm_np1",label:"Days 1–3: Chair by the Crib",items:[{id:"cm_nd1",text:"Day 1 complete"},{id:"cm_nd2",text:"Day 2 complete"},{id:"cm_nd3",text:"Day 3 complete"}]},{id:"cm_np2",label:"Days 4–6: Chair in the Middle",items:[{id:"cm_nd4",text:"Day 4 — wait 3 min"},{id:"cm_nd5",text:"Day 5 — wait 5 min"},{id:"cm_nd6",text:"Day 6 — wait 7 min"}]},{id:"cm_np3",label:"Day 7+: Leave the Room",items:[{id:"cm_nd7",text:"Day 7+ — leaving room for naps"}]}]},
  fading:{id:"fading",label:"Fading",ageGroups:["infant"],color:C.sage,description:"Gradually reduce the sleep prop. Use it until drowsy — not fully asleep — then put down. Your schedule is custom-built below.",hasNaps:true,isFading:true,setupItems:[{id:"fd_drowsy",text:"Practicing stopping the prop while drowsy — not fully asleep"}],napPhases:[{id:"fd_np1",label:"Mirror your bedtime fading schedule at naps",description:"Apply the same prop reduction to nap put-downs. Naps may take longer to consolidate — completely normal.",items:[{id:"fd_npa",text:"Nap fading started (matching bedtime schedule)"},{id:"fd_npb",text:"Nap prop reduced"},{id:"fd_npc",text:"Brief prop only at naps"},{id:"fd_npd",text:"Independent nap sleep achieved 🎉"}]}]},
  habit_stacking:{id:"habit_stacking",label:"Habit Stacking",ageGroups:["infant"],color:C.warm,description:"Layer in sleep associations first, then remove them one by one over 40 nights. Slow, steady, minimal crying.",hasNaps:false,setupItems:[{id:"hs_wn",text:"White noise machine ready and positioned"}],phases:[{id:"hs_p1",label:"Nights 1–4: All Associations On",description:"White noise + back rub + humming/shushing + rocking/bouncing.",items:[{id:"hs_n1",text:"Night 1 complete"},{id:"hs_n2",text:"Night 2 complete"},{id:"hs_n3",text:"Night 3 complete"},{id:"hs_n4",text:"Night 4 complete"}]},{id:"hs_p2",label:"Nights 5–7: Remove Rocking/Bouncing",description:"Keep: white noise, back rub, humming/shushing. Remove: rocking/bouncing or laying together.",items:[{id:"hs_n5",text:"Night 5 — rocking/bouncing removed"},{id:"hs_n6",text:"Night 6 complete"},{id:"hs_n7",text:"Night 7 complete"}]},{id:"hs_p3",label:"Nights 8–11: Back Rub Until Drowsy Only",description:"Rub back until drowsy, move hand next to them. No humming/shushing.",items:[{id:"hs_n8",text:"Night 8 complete"},{id:"hs_n9",text:"Night 9 complete"},{id:"hs_n10",text:"Night 10 complete"},{id:"hs_n11",text:"Night 11 complete"}]},{id:"hs_p4",label:"Nights 12–15: Back Rub Cut to 1 Minute",items:[{id:"hs_n12",text:"Night 12 complete"},{id:"hs_n13",text:"Night 13 complete"},{id:"hs_n14",text:"Night 14 complete"},{id:"hs_n15",text:"Night 15 complete"}]},{id:"hs_p5",label:"Nights 16–19: Hand in Crib Only",description:"No back rub. Hand resting in crib until drowsy, then remove.",items:[{id:"hs_n16",text:"Night 16 complete"},{id:"hs_n17",text:"Night 17 complete"},{id:"hs_n18",text:"Night 18 complete"},{id:"hs_n19",text:"Night 19 complete"}]},{id:"hs_p6",label:"Nights 20–22: Sitting Next to Bed",description:"Sit next to bed until asleep. No touch.",items:[{id:"hs_n20",text:"Night 20 complete"},{id:"hs_n21",text:"Night 21 complete"},{id:"hs_n22",text:"Night 22 complete"}]},{id:"hs_p7",label:"Nights 23–25: Chair in the Middle",items:[{id:"hs_n23",text:"Night 23 complete"},{id:"hs_n24",text:"Night 24 complete"},{id:"hs_n25",text:"Night 25 complete"}]},{id:"hs_p8",label:"Nights 26–29: Chair by the Door",items:[{id:"hs_n26",text:"Night 26 complete"},{id:"hs_n27",text:"Night 27 complete"},{id:"hs_n28",text:"Night 28 complete"},{id:"hs_n29",text:"Night 29 complete"}]},{id:"hs_p9",label:"Nights 30–34: Outside the Door (Open)",items:[{id:"hs_n30",text:"Night 30 complete"},{id:"hs_n31",text:"Night 31 complete"},{id:"hs_n32",text:"Night 32 complete"},{id:"hs_n33",text:"Night 33 complete"},{id:"hs_n34",text:"Night 34 complete"}]},{id:"hs_p10",label:"Nights 35–39: Leave Room, Check In",description:"Leave the room. Wait 10 min, pop head in, wait until asleep, close door.",items:[{id:"hs_n35",text:"Night 35 complete"},{id:"hs_n36",text:"Night 36 complete"},{id:"hs_n37",text:"Night 37 complete"},{id:"hs_n38",text:"Night 38 complete"},{id:"hs_n39",text:"Night 39 complete"}]},{id:"hs_p11",label:"Night 40: Independent Sleep 🎉",items:[{id:"hs_n40",text:"Night 40 — fully independent sleep achieved!"}]}],napPhases:[]},
  ferber:{id:"ferber",label:"Ferber / Graduated Extinction",ageGroups:["infant"],color:C.mauve,description:"Put child down awake and leave. Return at graduated intervals for brief comfort. Intervals increase each night.",hasNaps:true,setupItems:[{id:"fb_aligned",text:"Both caregivers aligned and committed"},{id:"fb_prop",text:"Sleep prop identified and removed from all sleep situations"}],phases:[{id:"fb_p1",label:"Night 1",description:"Intervals: 3 → 5 → 10 min (repeat 10)",items:[{id:"fb_n1",text:"Night 1 complete — 3 / 5 / 10 min intervals"}]},{id:"fb_p2",label:"Night 2",description:"Intervals: 5 → 10 → 12 min (repeat 12)",items:[{id:"fb_n2",text:"Night 2 complete — 5 / 10 / 12 min intervals"}]},{id:"fb_p3",label:"Night 3",description:"Intervals: 10 → 12 → 15 min (repeat 15)",items:[{id:"fb_n3",text:"Night 3 complete — 10 / 12 / 15 min intervals"}]},{id:"fb_p4",label:"Night 4",description:"Intervals: 12 → 15 → 17 min (repeat 17)",items:[{id:"fb_n4",text:"Night 4 complete — 12 / 15 / 17 min intervals"}]},{id:"fb_p5",label:"Night 5",description:"Intervals: 15 → 17 → 20 min (repeat 20)",items:[{id:"fb_n5",text:"Night 5 complete — 15 / 17 / 20 min intervals"}]},{id:"fb_p6",label:"Night 6",description:"Intervals: 17 → 20 → 25 min (repeat 25)",items:[{id:"fb_n6",text:"Night 6 complete — 17 / 20 / 25 min intervals"}]},{id:"fb_p7",label:"Night 7+",description:"Intervals: 20 → 25 → 30 min (repeat 30)",items:[{id:"fb_n7",text:"Night 7+ — 20 / 25 / 30 min intervals"}]}],napPhases:[{id:"fb_np1",label:"Naps: Match Current Night's Intervals",description:"Same wait intervals as current bedtime night. Cap at 1 hour, then nap rescue if needed.",items:[{id:"fb_nd1",text:"Nap intervals matching bedtime schedule"},{id:"fb_nd2",text:"Nap rescue used when needed"},{id:"fb_nd3",text:"Nap consolidation improving"}]}]},
  kissing_game:{id:"kissing_game",label:"Kissing Game",ageGroups:["toddler","preschool"],color:C.purple,description:"Child stays in bed; parent returns to give kisses at increasing intervals. Builds excitement around bedtime instead of anxiety.",hasNaps:false,phases:[{id:"kg_p1",label:"Phase 1: Establish the Game",description:"After routine, tell child you'll come back for a kiss while they're still awake. Return quickly (30 sec).",items:[{id:"kg_d1",text:"Night 1 — introduced game, returned quickly"},{id:"kg_d2",text:"Night 2 — child excited for the game"},{id:"kg_d3",text:"Night 3 — consistent quick returns"}]},{id:"kg_p2",label:"Phase 2: Stretch the Intervals",description:"Gradually wait longer — 1 min, 2 min, 3 min.",items:[{id:"kg_d4",text:"Night 4 — waiting ~1 min"},{id:"kg_d5",text:"Night 5 — waiting ~2 min"},{id:"kg_d6",text:"Night 6 — waiting ~3 min"}]},{id:"kg_p3",label:"Phase 3: Asleep Before the Kiss",description:"Intervals long enough that child falls asleep waiting.",items:[{id:"kg_d7",text:"Night 7 — child asleep before kiss"},{id:"kg_d8",text:"Night 8+ — consistently independent"}]}],napPhases:[]},
  stuffy_check_in:{id:"stuffy_check_in",label:"Stuffy Check-In Method",ageGroups:["toddler","preschool"],color:C.sage,description:"Parent checks on the stuffed animal — not the child. The stuffy becomes the bridge between parent and child.",hasNaps:false,setupItems:[{id:"sci_intro",text:"Introduced stuffy's role before Night 1: 'Bear is going to help you sleep tonight.'"},{id:"sci_phrase",text:"Practiced the check-in phrase: 'I'll come check on Bear if you need me.'"}],phases:[{id:"sci_p1",label:"Phase 1: Establish the Check-In",description:"Put child down awake. If they cry, wait 1–5 min (based on temperament), go in for 30–60 sec max. Tuck in Bear. Whisper to Bear: 'You're doing a great job helping.' Briefly reassure child: 'You're safe. It's sleep time.' Leave. No picking up, no long explanations.",items:[{id:"sci_n1",text:"Night 1 — first stuffy check-in done"},{id:"sci_n2",text:"Night 2 — child beginning to trust the pattern"},{id:"sci_n3",text:"Night 3 — settling faster after check-ins"}]},{id:"sci_p2",label:"Phase 2: Lengthen Wait Intervals",description:"Increase wait time before going in (timed or consistent 3–5 min intervals). Keep check-ins short, calm, predictable.",items:[{id:"sci_n4",text:"Night 4 — wait intervals lengthening"},{id:"sci_n5",text:"Night 5 complete"},{id:"sci_n6",text:"Night 6 complete"}]},{id:"sci_p3",label:"Phase 3: Fewer Check-Ins Needed",description:"Child falling asleep before or after 1–2 check-ins. Confidence building.",items:[{id:"sci_n7",text:"Night 7 — falling asleep with 1–2 check-ins"},{id:"sci_n8",text:"Night 8+ — consistently independent"}]}],napPhases:[]},
  stuffy_fairy:{id:"stuffy_fairy",label:"Stuffy Fairy",ageGroups:["toddler","preschool"],color:C.rose,description:"Each time child is laying quietly in bed, a new stuffy appears by morning. The growing pile is evidence of safety and parental return.",hasNaps:false,setupItems:[{id:"sf_stuffies",text:"Gathered a collection of small stuffed animals (start with 3–5)"},{id:"sf_intro",text:"Introduced the concept: 'When you're resting quietly, the Stuffy Fairy visits and brings a friend to watch over you.'"},{id:"sf_rule",text:"Understood: stuffy only appears when child is laying quietly — NOT when crying or out of bed"}],phases:[{id:"sf_p1",label:"Phase 1: The First Visit",description:"Night 1: sneak in after child is quiet and asleep, leave one new stuffy. Morning: 'Look who came to visit!'",items:[{id:"sf_n1",text:"Night 1 — first stuffy left, morning reaction celebrated"},{id:"sf_n2",text:"Night 2 — child anticipating the fairy"},{id:"sf_n3",text:"Night 3 — settling faster hoping for a visitor"}]},{id:"sf_p2",label:"Phase 2: Building the Pile",description:"Continue adding stuffies on quiet nights. Skip nights with excessive crying/leaving bed — the fairy only comes when resting quietly.",items:[{id:"sf_n4",text:"Night 4 — pile growing, child motivated"},{id:"sf_n5",text:"Night 5 complete"},{id:"sf_n6",text:"Night 6 complete"}]},{id:"sf_p3",label:"Phase 3: Pile as Proof",description:"Morning ritual: count and celebrate the pile. 'Look how many times we checked on you while you were sleeping!'",items:[{id:"sf_n7",text:"Night 7 — morning pile celebration happening"},{id:"sf_n8",text:"Night 8+ — child settling independently to 'earn' a visit"}]}],napPhases:[]},
  hearts_on_hands:{id:"hearts_on_hands",label:"Hearts on Hands",ageGroups:["toddler","preschool"],color:C.mauve,description:"Parent draws a heart on child's hand and their own. Press it for a squeeze when you miss each other.",hasNaps:false,setupItems:[{id:"hh_introduce",text:"Hearts ritual introduced during a calm daytime moment (not at bedtime)"},{id:"hh_practiced",text:"Practiced pressing the heart and 'sending a squeeze' before Night 1"}],phases:[{id:"hh_p1",label:"Phase 1: Hearts + Parent Stays Close",description:"Draw hearts, say goodnight, sit beside bed. Remind child to press their heart.",items:[{id:"hh_d1",text:"Night 1 — hearts drawn, sitting beside bed"},{id:"hh_d2",text:"Night 2 complete"},{id:"hh_d3",text:"Night 3 complete"}]},{id:"hh_p2",label:"Phase 2: Hearts + Chair in Middle",items:[{id:"hh_d4",text:"Night 4 — chair in middle"},{id:"hh_d5",text:"Night 5 complete"},{id:"hh_d6",text:"Night 6 complete"}]},{id:"hh_p3",label:"Phase 3: Hearts + Door",items:[{id:"hh_d7",text:"Night 7 — at the door"},{id:"hh_d8",text:"Night 8 complete"},{id:"hh_d9",text:"Night 9 complete"}]},{id:"hh_p4",label:"Phase 4: Hearts + Independent",description:"Parent leaves after hearts ritual.",items:[{id:"hh_d10",text:"Night 10 — leaving after hearts ritual"},{id:"hh_d11",text:"Night 11+ — consistently independent"}]}],napPhases:[]},
  play_prep:{id:"play_prep",label:"Play Prep",ageGroups:["toddler","preschool","school"],color:C.warm,description:"Child earns a special bedtime job (turning off the light, tucking in a stuffy), giving them agency and a positive association with sleep.",hasNaps:false,setupItems:[{id:"pp_job",text:"Child's special bedtime job identified and practiced during daytime"},{id:"pp_intro",text:"Child understands they are in charge of this job every night"}],phases:[{id:"pp_p1",label:"Phase 1: Job + Parent Stays",items:[{id:"pp_d1",text:"Night 1 — job done, parent nearby"},{id:"pp_d2",text:"Night 2 complete"},{id:"pp_d3",text:"Night 3 complete"}]},{id:"pp_p2",label:"Phase 2: Job + Brief Check-In",description:"Parent leaves after job, one check-in at 5 min.",items:[{id:"pp_d4",text:"Night 4 — job done, one check-in"},{id:"pp_d5",text:"Night 5 complete"},{id:"pp_d6",text:"Night 6 complete"}]},{id:"pp_p3",label:"Phase 3: Job + Independent",items:[{id:"pp_d7",text:"Night 7 — job done, fully independent"},{id:"pp_d8",text:"Night 8+ — consistently independent"}]}],napPhases:[]},
  confidence_ladder:{id:"confidence_ladder",label:"Bedtime Confidence Ladder",ageGroups:["toddler","preschool","school"],color:C.sky,description:"Build tolerance in micro steps — each practiced 3–5 nights. Respects attachment while expanding the window of tolerance for bedtime.",hasNaps:false,phases:[{id:"cl_p1",label:"Step 1: Parent Sits on Bed",description:"Parent on bed beside child until asleep. Minimal interaction.",items:[{id:"cl_s1a",text:"Night 1 — parent on bed"},{id:"cl_s1b",text:"Night 2 complete"},{id:"cl_s1c",text:"Night 3 complete"},{id:"cl_s1d",text:"Night 4 — child comfortable, ready to move"},{id:"cl_s1e",text:"Step 1 complete ✓"}]},{id:"cl_p2",label:"Step 2: Parent Beside the Bed",description:"Chair pulled right beside the bed.",items:[{id:"cl_s2a",text:"Night 1 at Step 2"},{id:"cl_s2b",text:"Night 2 complete"},{id:"cl_s2c",text:"Night 3 complete"},{id:"cl_s2d",text:"Step 2 complete ✓"}]},{id:"cl_p3",label:"Step 3: Parent at the Door",items:[{id:"cl_s3a",text:"Night 1 at Step 3"},{id:"cl_s3b",text:"Night 2 complete"},{id:"cl_s3c",text:"Night 3 complete"},{id:"cl_s3d",text:"Step 3 complete ✓"}]},{id:"cl_p4",label:"Step 4: Parent Outside (Door Open)",items:[{id:"cl_s4a",text:"Night 1 at Step 4"},{id:"cl_s4b",text:"Night 2 complete"},{id:"cl_s4c",text:"Night 3 complete"},{id:"cl_s4d",text:"Step 4 complete ✓"}]},{id:"cl_p5",label:"Step 5: Door Cracked",items:[{id:"cl_s5a",text:"Night 1 at Step 5"},{id:"cl_s5b",text:"Night 2 complete"},{id:"cl_s5c",text:"Night 3 complete"},{id:"cl_s5d",text:"Step 5 complete ✓"}]},{id:"cl_p6",label:"Step 6: Fully Independent 🎉",items:[{id:"cl_s6a",text:"Night 1 — door closed, fully independent"},{id:"cl_s6b",text:"Night 2+ — consistently independent"}]}],napPhases:[]},
  worry_container:{id:"worry_container",label:"Worry Container Protocol",ageGroups:["school"],color:C.rose,description:"Pre-bed brain dump to reduce cognitive hyperarousal. Worries get written, drawn, and contained before sleep.",hasNaps:false,setupItems:[{id:"wc_box",text:"Worry container/box gathered (can be decorated together)"},{id:"wc_journal",text:"Worry journal or paper ready at bedside"},{id:"wc_intro",text:"Concept introduced to child during a calm daytime conversation"}],phases:[{id:"wc_p1",label:"Phase 1: Learn the Brain Dump",description:"15–20 min before bed: write or draw anything on your mind. No problem-solving — just getting it out.",items:[{id:"wc_n1",text:"Night 1 — brain dump completed before bed"},{id:"wc_n2",text:"Night 2 complete"},{id:"wc_n3",text:"Night 3 — doing it without prompting"}]},{id:"wc_p2",label:"Phase 2: Container Ritual",description:"Draw the worry, put it in the box, close the lid. Optional: place box outside bedroom.",items:[{id:"wc_n4",text:"Night 4 — worry physically placed in container"},{id:"wc_n5",text:"Night 5 complete"},{id:"wc_n6",text:"Night 6 — ritual feeling natural"}]},{id:"wc_p3",label:"Phase 3: Ritual + Independent Sleep",items:[{id:"wc_n7",text:"Night 7+ — falling asleep after container ritual"}]}],napPhases:[]},
  sleep_switch:{id:"sleep_switch",label:"Sleep Switch Method",ageGroups:["school"],color:C.teal,description:"Stimulus control in age-appropriate language. Bed = sleep only. If awake 15–20 min, get up and do something boring until sleepy again.",hasNaps:false,setupItems:[{id:"sw_explain",text:"Explained: 'We're teaching your brain that bed = sleep'"},{id:"sw_plan",text:"Agreed on a boring activity to do if awake too long (e.g. sitting in dim spot with a dull book)"},{id:"sw_screens",text:"Screens out of bedroom — charging station established outside room"}],phases:[{id:"sw_p1",label:"Week 1: Build the Association",description:"Bed is for sleep only. Reading, screens, or quiet play happen outside the bedroom before the final routine.",items:[{id:"sw_w1a",text:"Night 1 — pre-bed activities moved outside bedroom"},{id:"sw_w1b",text:"Night 2 complete"},{id:"sw_w1c",text:"Night 3 complete"},{id:"sw_w1d",text:"Night 4 complete"},{id:"sw_w1e",text:"Night 5 — association building"}]},{id:"sw_p2",label:"Week 2: Practice the Get-Up Rule",description:"If awake more than 15–20 min: get up, do boring activity in dim light, return when sleepy. No screens.",items:[{id:"sw_w2a",text:"Night 6 — got up and returned when sleepy"},{id:"sw_w2b",text:"Night 7 complete"},{id:"sw_w2c",text:"Night 8 — rule feeling natural"}]},{id:"sw_p3",label:"Ongoing: Sleep Switch Active",items:[{id:"sw_on",text:"Falling asleep quickly after getting into bed"}]}],napPhases:[]},
  morning_anchor:{id:"morning_anchor",label:"Morning Anchor Reset",ageGroups:["school"],color:C.sage,description:"Fix mornings first — nights follow. Consistent wake time + immediate light and movement resets the circadian clock.",hasNaps:false,setupItems:[{id:"ma_time",text:"Fixed wake time agreed upon (within 1 hour on weekends too)"},{id:"ma_light",text:"Light source ready for morning (sunlight, bright lamp, or light therapy)"},{id:"ma_move",text:"Morning movement plan in place (walk, stretch, active play within 15 min of waking)"}],phases:[{id:"ma_p1",label:"Week 1: Establish Wake Time",description:"Same wake time every day, even weekends within 1 hour. Immediate light. Movement within 15 min. No naps.",items:[{id:"ma_w1a",text:"Day 1 — woke at target time, light + movement done"},{id:"ma_w1b",text:"Day 2 complete"},{id:"ma_w1c",text:"Day 3 complete"},{id:"ma_w1d",text:"Day 4 complete"},{id:"ma_w1e",text:"Day 5 complete"},{id:"ma_w1f",text:"Day 6 complete"},{id:"ma_w1g",text:"Day 7 — wake time holding"}]},{id:"ma_p2",label:"Week 2: Adjust Bedtime",description:"Once wake time is stable, gradually shift bedtime earlier by 15 min every 2–3 nights.",items:[{id:"ma_w2a",text:"Bedtime shifted 15 min earlier"},{id:"ma_w2b",text:"Second shift if needed"},{id:"ma_w2c",text:"Target bedtime reached"}]},{id:"ma_p3",label:"Ongoing: Rhythm Holding",items:[{id:"ma_on",text:"Consistent sleep-wake rhythm established"}]}],napPhases:[]},
  night_wakings_autonomy:{id:"night_wakings_autonomy",label:"Night Wakings Autonomy Plan",ageGroups:["school"],color:C.warm,description:"Child knows the ladder in advance. No surprise escalation. Predictability lowers nervous system threat response.",hasNaps:false,setupItems:[{id:"nwa_ladder",text:"Ladder explained to child during daytime — they know exactly what each level looks like"},{id:"nwa_agree",text:"Child and parent agreed on the plan together"}],phases:[{id:"nwa_p1",label:"Tier 1: Independent Settle",description:"Child wakes, tries to resettle on their own for 5–10 min.",items:[{id:"nwa_n1",text:"Night 1 — attempted independent settle"},{id:"nwa_n2",text:"Night 2 complete"},{id:"nwa_n3",text:"Night 3 complete"}]},{id:"nwa_p2",label:"Tier 2: Parent Voice from Doorway",description:"If still awake after Tier 1, parent calls from doorway: 'I hear you. You're safe. I love you.'",items:[{id:"nwa_n4",text:"Night 4 — voice reassurance used"},{id:"nwa_n5",text:"Night 5 complete"}]},{id:"nwa_p3",label:"Tier 3: Brief Tuck-In",description:"Parent comes in for a brief tuck-in (60 sec max). No talking beyond 1 short phrase.",items:[{id:"nwa_n6",text:"Night 6 — brief tuck-in only"},{id:"nwa_n7",text:"Night 7 complete"}]},{id:"nwa_p4",label:"Tier 4: Short Sit (Max 2 Min)",description:"Parent sits quietly for max 2 min. Child knows this is the top of the ladder.",items:[{id:"nwa_n8",text:"Night 8 — short sit used as needed"},{id:"nwa_n9",text:"Night 9+ — settling at lower tiers"}]}],napPhases:[]},
};

const SCHOOL_ADDONS = [
  {id:"sa_regulation",label:"Regulation Rehearsal",description:"Practice body-based regulation tools at bedtime. Train during daytime first — then use at night.",color:C.sage,items:[{id:"sa_r1",text:"4-7-8 breathing practiced during daytime"},{id:"sa_r2",text:"Progressive muscle squeeze introduced"},{id:"sa_r3",text:"Body scan practiced at bedtime"},{id:"sa_r4",text:"'Name 5 calm things' grounding used at night"}]},
  {id:"sa_digital",label:"Digital Sunset Contract",description:"60–90 min device cutoff. Collaborative agreement — not authoritarian removal.",color:C.mauve,items:[{id:"sa_d1",text:"Device cutoff time agreed on together"},{id:"sa_d2",text:"Charging station outside bedroom established"},{id:"sa_d3",text:"Natural consequences discussed (not imposed)"},{id:"sa_d4",text:"First week check-in done"},{id:"sa_d5",text:"Contract holding"}]},
  {id:"sa_jetlag",label:"Pre-Teen Phase Protection",description:"Prevent social jet lag. Weekend wake within 60–90 min of weekday.",color:C.warm,items:[{id:"sa_j1",text:"Friday 'buffer bedtime' set (no dramatic shift)"},{id:"sa_j2",text:"Weekend wake time within 60–90 min of weekday"},{id:"sa_j3",text:"Sunday gradual shift earlier started"},{id:"sa_j4",text:"Circadian rhythm holding across the week"}]},
  {id:"sa_identity",label:"Sleep Identity Shift",description:"Cognitive restructuring. Replace helpless sleep talk with empowered language.",color:C.rose,items:[{id:"sa_i1",text:"'I can't sleep' reframed to 'I'm learning how to settle'"},{id:"sa_i2",text:"'My body knows how to sleep' practiced daily"},{id:"sa_i3",text:"Psychoeducation about sleep pressure and cycles done"},{id:"sa_i4",text:"Child using empowered sleep language"}]},
  {id:"sa_audit",label:"Family Sleep Culture Audit",description:"Systems-level review. Late dinners, parental dysregulation, over-scheduling all affect sleep.",color:C.sky,items:[{id:"sa_a1",text:"Bedtime consistency reviewed"},{id:"sa_a2",text:"Emotional tone at night assessed"},{id:"sa_a3",text:"Parental regulation check done"},{id:"sa_a4",text:"Household noise/light reviewed"},{id:"sa_a5",text:"Schedule load reviewed — over-scheduling flagged if needed"},{id:"sa_a6",text:"Sibling interference addressed if needed"}]},
];

const METHOD_GROUPS = [
  {label:"Infant",    sublabel:"0–12 mo", key:"infant",   ids:["settled_support","chair_method","fading","habit_stacking","ferber"]},
  {label:"Toddler",   sublabel:"1–3 yrs", key:"toddler",  ids:["kissing_game","stuffy_check_in","stuffy_fairy","hearts_on_hands","play_prep","confidence_ladder"]},
  {label:"Preschool", sublabel:"3–5 yrs", key:"preschool",ids:["kissing_game","stuffy_check_in","stuffy_fairy","hearts_on_hands","play_prep","confidence_ladder"]},
  {label:"School Age",sublabel:"5+ yrs",  key:"school",   ids:["confidence_ladder","worry_container","sleep_switch","morning_anchor","night_wakings_autonomy","play_prep"]},
];

function getBedtimeRoutine(ageGroup) {
  const older = ageGroup !== "infant";
  const gn3 = ageGroup === "preschool" || ageGroup === "school";
  return [
    {id:"rt_bath",  text:"Bath (the water and warmth is the cue — soap optional)"},
    older ? {id:"rt_pjs", text:"Pajamas on"} : {id:"rt_diaper", text:"Diaper + lotion"},
    ...(ageGroup === "infant" ? [{id:"rt_feed",  text:"Feed in low-stimulation lighting (dim, quiet, calm)"}]
                              : [{id:"rt_books", text:"2 books together (calm and cozy)"}]),
    older ? {id:"rt_into", text:"Into bed"} : {id:"rt_sack", text:"Pajamas + sleep sack"},
    {id:"rt_wn",     text:"White noise turned on"},
    ...(gn3 ? [{id:"rt_gn3", text:"Child chooses their 3 goodnight things (e.g. hug, kiss, high five, back scratch — their pick!)"}] : []),
    {id:"rt_gn",     text:"Said goodnight to 3 objects (door → close, white noise → on, light → off)"},
    {id:"rt_phrase", text:'Said your nightly phrase: "It\'s time for sleep. I\'m right here."'},
    {id:"rt_awake",  text:"Child placed in bed awake"},
  ];
}

const NAP_ROUTINE  = [{id:"np_diaper",text:"Changed diaper"},{id:"np_book",text:"Read a short book"},{id:"np_sack",text:"Into sleep sack"},{id:"np_awake",text:"Into crib awake"}];
const ENV_ITEMS    = [{id:"env_wn",text:"White noise machine set up — steady, not pulsing"},{id:"env_dark",text:"Room is pitch dark — blackout curtains installed"},{id:"env_temp",text:"Room temperature set between 68–72°F"},{id:"env_therm",text:"Thermostat set to increase 1°F around 3:00–3:30 AM"},{id:"env_toys",text:"No toys, pillows, or extra items in the crib/bed"},{id:"env_nl",text:"If using a nightlight — confirmed it is red light only"}];
const SAFE_ITEMS   = [{id:"ss_firm",text:"Baby sleeps on a firm, flat surface (CPSC 2021 standards)"},{id:"ss_sheet",text:"Only a fitted sheet in the crib — no loose bedding"},{id:"ss_back",text:"Always placing baby on their back to sleep"},{id:"ss_flat",text:"Mattress is not inclined or elevated"},{id:"ss_sit",text:"Baby not routinely sleeping in car seat, swing, or stroller"},{id:"ss_room",text:"Baby's sleep space is in or near parents' room (first 6 months)"},{id:"ss_wt",text:"No weighted swaddles or weighted objects near baby"},{id:"ss_swad",text:"If still swaddling — confirmed baby shows no signs of rolling"}];
const GROUND_ITEMS = [{id:"gr_breath",text:"Took a slow breath before entering (4 in, 6 out)"},{id:"gr_shoulders",text:"Dropped shoulders and unclenched jaw"},{id:"gr_feet",text:"Feet grounded flat on the floor"},{id:"gr_mantra",text:'Used an anchor statement: "They are safe. I am supporting them."'},{id:"gr_phone",text:"Left phone outside the room"},{id:"gr_partner",text:"Connected with partner — ready to tag-team if needed"}];

function buildFadingPhases(p) {
  const start = parseInt(p.fadingStartMins), reduce = parseInt(p.fadingReduceMins)||5, every = parseInt(p.fadingEveryDays)||3, prop = p.fadingProp||"prop";
  if (!start) return [];
  const phases = []; let cur = start, day = 1, idx = 0;
  while (cur > 0 && idx < 10) {
    const next = Math.max(0, cur - reduce);
    phases.push({id:`fd_g${idx}`,label:`Days ${day}–${day+every-1}: ${cur} min of ${prop}`,description:`Use ${prop} for ${cur} minutes until drowsy, then put down awake.${next>0?` Next: ${next} min.`:" Next: independent!"}`,items:Array.from({length:every},(_,i)=>({id:`fd_g${idx}_${i}`,text:`Day ${day+i} complete`}))});
    cur = next; day += every; idx++;
  }
  phases.push({id:"fd_gfin",label:`Day ${day}+: Independent Sleep 🎉`,description:`${prop.charAt(0).toUpperCase()+prop.slice(1)} is still part of the routine — they're falling asleep on their own!`,items:[{id:"fd_gfin_0",text:`Day ${day}+ — falling asleep independently`}]});
  return phases;
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function CheckItem({ item, checked, onToggle, color }) {
  const T = useT();
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 200); onToggle(item.id); }}
      style={{ display:"flex", alignItems:"flex-start", gap:12, width:"100%", background:"none", border:"none",
        cursor:"pointer", padding:"10px 0", textAlign:"left", borderBottom:`1px solid ${T.faint}`,
        transform: pressed ? "scale(0.98)" : "scale(1)", transition:"transform 0.15s" }}
    >
      <div style={{ flexShrink:0, width:22, height:22, borderRadius:6,
        border:`2px solid ${checked ? color : T.checkBorder}`,
        background: checked ? color : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center", marginTop:1,
        transition:"all .2s", boxShadow: checked ? `0 2px 8px ${color}40` : "none" }}>
        {checked && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span style={{ fontSize:13.5, lineHeight:1.55, color: checked ? T.muted : T.text,
        textDecoration: checked ? "line-through" : "none", fontFamily:font, transition:"all .2s", flex:1 }}>
        {item.text}
      </span>
    </button>
  );
}

function MiniBar({ done, total, color }) {
  const T = useT();
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
      <div style={{ flex:1, height:4, borderRadius:2, background:T.faint, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, transition:"width .5s ease", borderRadius:2 }}/>
      </div>
      <span style={{ fontFamily:mono, fontSize:11, color, minWidth:40, textAlign:"right", fontWeight:700 }}>{done}/{total}</span>
    </div>
  );
}

function Accordion({ title, emoji, color, children, defaultOpen=false, badge, subtle }) {
  const [open, setOpen] = useState(defaultOpen);
  const T = useT();
  return (
    <div style={{ background: subtle ? T.faint : T.card, border:`1px solid ${subtle ? T.faint : T.border}`,
      borderRadius:14, overflow:"hidden", marginBottom:10, boxShadow: subtle ? "none" : T.shadow,
      transition:"box-shadow 0.2s" }}>
      <button onClick={() => setOpen(!open)} style={{ width:"100%", padding:"15px 18px", background:"none",
        border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:11, textAlign:"left" }}>
        {emoji && <span style={{ fontSize:18 }}>{emoji}</span>}
        <span style={{ flex:1, fontFamily:serif, fontSize:15.5, color:T.headingText, letterSpacing:".01em" }}>{title}</span>
        {badge && <span style={{ fontSize:10, background:color, color:"#fff", borderRadius:20, padding:"2px 9px", fontFamily:font, fontWeight:700 }}>{badge}</span>}
        <span style={{ color:T.muted, fontSize:14, transform:open?"rotate(180deg)":"none", transition:"transform .25s", display:"inline-block" }}>▾</span>
      </button>
      {open && <div style={{ padding:"0 18px 18px" }}>{children}</div>}
    </div>
  );
}

function Phase({ phase, checks, onToggle, color }) {
  const T = useT();
  const done = phase.items.filter(i => checks[i.id]).length;
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
        <span style={{ fontFamily:font, fontSize:12.5, fontWeight:700, color, letterSpacing:".02em" }}>{phase.label}</span>
        {done === phase.items.length && <span style={{ fontSize:12, color }}>✓</span>}
      </div>
      {phase.description && <div style={{ fontSize:12, color:T.muted, fontFamily:font, fontStyle:"italic", lineHeight:1.55, marginBottom:6 }}>{phase.description}</div>}
      {phase.items.map(item => <CheckItem key={item.id} item={item} checked={!!checks[item.id]} onToggle={onToggle} color={color}/>)}
    </div>
  );
}

// PIN keypad modal
function PinModal({ onSuccess, onCancel, correctPin }) {
  const T = useT();
  const [digits, setDigits] = useState("");
  const [shake, setShake] = useState(false);
  const [err, setErr] = useState(false);
  const tap = d => {
    if (d === "⌫") { setDigits(p => p.slice(0, -1)); return; }
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) setTimeout(() => {
      if (next === String(correctPin)) { onSuccess(); }
      else { setShake(true); setErr(true); setTimeout(() => { setShake(false); setDigits(""); setErr(false); }, 600); }
    }, 150);
  };
  return (
    <div style={{ position:"fixed", inset:0, background:T.overlayBg, display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(12px)" }}>
      <div style={{ background:T.modalBg, border:`1px solid ${T.border}`, borderRadius:22, padding:"36px 28px", width:296, textAlign:"center", boxShadow:T.shadow }}>
        <div style={{ fontFamily:serif, fontSize:21, color:T.headingText, marginBottom:5 }}>Consultant Access</div>
        <div style={{ fontFamily:font, fontSize:12.5, color:T.muted, marginBottom:26 }}>Enter your PIN to configure this plan</div>
        <div style={{ display:"flex", justifyContent:"center", gap:14, marginBottom:26, animation:shake?"shake .5s":"none" }}>
          {[0,1,2,3].map(i => <div key={i} style={{ width:14, height:14, borderRadius:"50%", background: i<digits.length ? (err?"#c06060":C.teal) : T.faint, border:`1px solid ${T.border}`, transition:"background .15s" }}/>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9, marginBottom:14 }}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i) => (
            <button key={i} onClick={() => d !== "" && tap(String(d))} style={{ padding:"13px 0", borderRadius:10, border:`1px solid ${T.border}`, background:d===""?"transparent":T.card, color:T.text, fontSize:18, fontFamily:font, cursor:d===""?"default":"pointer", transition:"background .15s" }}>{d}</button>
          ))}
        </div>
        <button onClick={onCancel} style={{ background:"none", border:"none", color:T.muted, fontSize:12.5, fontFamily:font, cursor:"pointer" }}>Cancel</button>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`}</style>
    </div>
  );
}

// ─── AI INSIGHTS ENGINE ───────────────────────────────────────────────────────
// Analyzes intake form data and generates method recommendations + flags
function generateInsights(intake) {
  if (!intake) return { recommendations: [], flags: [], suggestedMethod: null, suggestedAddons: [] };

  const flags = [];
  const recommendations = [];
  let suggestedMethod = null;
  const suggestedAddons = [];

  const ageGroup = intake.age_group || "infant";
  const temperament = (intake.temperament || "").toLowerCase();
  const feedToSleep = intake.feed_to_sleep;
  const feedFreq = intake.night_feed_frequency || 0;
  const naps = intake.nap_count || 0;
  const stressResponse = (intake.stress_response || "").toLowerCase();
  const parentAnxiety = intake.parent_anxiety_level || 3;
  const prevAttempts = intake.previous_attempts || "";
  const coSleeping = intake.co_sleeping;
  const swaddled = intake.still_swaddled;
  const rollingSigns = intake.showing_roll_signs;
  const screenTime = intake.screen_time_before_bed;
  const bedtimeResistance = intake.bedtime_resistance || "";
  const childAnxiety = (intake.child_anxiety || "").toLowerCase();

  // ── Infant flags ──
  if (ageGroup === "infant") {
    if (swaddled && rollingSigns) {
      flags.push({ level:"urgent", color:C.rose, icon:"⚠️", text:"Baby is swaddled and showing signs of rolling — safe sleep risk. Swaddle transition should happen before or alongside sleep training." });
    }
    if (stressResponse.includes("gag") || stressResponse.includes("vomit") || stressResponse.includes("sick")) {
      flags.push({ level:"consider", color:C.amber, icon:"💛", text:"Child shows stress gag response when distressed — gentler, presence-based methods like Settled Support or Habit Stacking are recommended over graduated extinction." });
      suggestedMethod = "settled_support";
      recommendations.push("Stress gag reflex noted. Avoid methods that allow extended crying (Ferber, extinction). Settled Support or Habit Stacking keeps you present while building independence gradually.");
    }
    if (feedToSleep && feedFreq > 2) {
      flags.push({ level:"consider", color:C.mauve, icon:"🍼", text:`Feeding to sleep ${feedFreq}+ times per night — this is the primary sleep prop. Fading or Settled Support allows gradual removal.` });
      if (!suggestedMethod) suggestedMethod = "fading";
      recommendations.push("Nursing/bottle to sleep is a strong sleep association. Fading lets you reduce this gradually without cold-turkey removal — gentler on baby and parent.");
    }
    if (temperament.includes("sensitive") || temperament.includes("high needs") || temperament.includes("intense")) {
      flags.push({ level:"consider", color:C.sky, icon:"🌊", text:"Sensitive/high-needs temperament noted. Methods that keep parent present (Settled Support, Habit Stacking) tend to work better and cause less stress." });
      if (!suggestedMethod) suggestedMethod = "settled_support";
    }
    if (parentAnxiety >= 4) {
      flags.push({ level:"support", color:C.purple, icon:"🌿", text:"Parent anxiety is elevated. A gentle, gradual method with clear steps will feel more manageable. The 'For You' section has grounding tools to use each night." });
    }
    if (naps < 2 && ageGroup === "infant") {
      flags.push({ level:"consider", color:C.warm, icon:"☁️", text:"Fewer than 2 naps for an infant — sleep pressure may be irregular. Ensure wake windows are appropriate before starting bedtime training." });
    }
    if (!suggestedMethod) {
      suggestedMethod = "settled_support";
      recommendations.push("Based on the intake, Settled Support is the recommended starting point — responsive, gradual, and appropriate for infants.");
    }
  }

  // ── Toddler/Preschool flags ──
  if (ageGroup === "toddler" || ageGroup === "preschool") {
    if (bedtimeResistance.includes("curtain calls") || bedtimeResistance.includes("coming out") || bedtimeResistance.includes("leaving")) {
      flags.push({ level:"consider", color:C.purple, icon:"🚪", text:"Curtain-call behavior noted. Kissing Game or Stuffy Check-In reframe the dynamic and give the child a reason to stay in bed." });
      if (!suggestedMethod) suggestedMethod = "kissing_game";
      recommendations.push("This child's stall tactics are about connection, not defiance. Kissing Game turns 'come back' into a game they're excited to play.");
    }
    if (childAnxiety.includes("anxiety") || childAnxiety.includes("scared") || childAnxiety.includes("monsters") || childAnxiety.includes("alone")) {
      flags.push({ level:"consider", color:C.rose, icon:"💛", text:"Separation anxiety or bedtime fears noted. Connection-based methods (Stuffy Check-In, Hearts on Hands, Confidence Ladder) help build felt safety." });
      if (!suggestedMethod) suggestedMethod = "stuffy_check_in";
      recommendations.push("Child is expressing nighttime fear. Stuffy Check-In or Hearts on Hands address the underlying nervous system need while still building independence.");
    }
    if (coSleeping) {
      flags.push({ level:"consider", color:C.teal, icon:"🛏️", text:"Currently co-sleeping. Transition will need to be gradual. Confidence Ladder or Hearts on Hands work well for moving from shared sleep to independent." });
      if (!suggestedMethod) suggestedMethod = "confidence_ladder";
    }
    if (!suggestedMethod) {
      suggestedMethod = "kissing_game";
      recommendations.push("Kissing Game is a warm, effective starting point for toddlers who need connection at bedtime.");
    }
  }

  // ── School age flags ──
  if (ageGroup === "school") {
    if (screenTime) {
      flags.push({ level:"consider", color:C.mauve, icon:"📱", text:"Screens before bed noted — blue light suppresses melatonin for 1–2 hours. Digital Sunset add-on is strongly recommended." });
      if (!suggestedAddons.includes("sa_digital")) suggestedAddons.push("sa_digital");
      recommendations.push("Screen use before bed is disrupting sleep onset. Digital Sunset Contract add-on addresses this collaboratively, not as a punishment.");
    }
    if (childAnxiety.includes("worry") || childAnxiety.includes("anxious") || childAnxiety.includes("overthink")) {
      flags.push({ level:"consider", color:C.rose, icon:"🧠", text:"Cognitive hyperarousal / worry at bedtime noted. Worry Container Protocol is specifically designed to externalize and contain pre-sleep anxiety." });
      if (!suggestedMethod) suggestedMethod = "worry_container";
      if (!suggestedAddons.includes("sa_regulation")) suggestedAddons.push("sa_regulation");
      recommendations.push("The worry response is a nervous system pattern. Worry Container + Regulation Rehearsal gives this child concrete tools instead of just 'try harder to sleep'.");
    }
    if (intake.late_bedtime || intake.early_wake) {
      flags.push({ level:"consider", color:C.sage, icon:"🌅", text:"Inconsistent or delayed sleep schedule noted. Morning Anchor Reset addresses the circadian root cause — fix the wake time first, bedtime follows." });
      if (!suggestedMethod) suggestedMethod = "morning_anchor";
      if (!suggestedAddons.includes("sa_jetlag")) suggestedAddons.push("sa_jetlag");
    }
    if (!suggestedMethod) {
      suggestedMethod = "sleep_switch";
      recommendations.push("Sleep Switch is a great foundation for school-age children — age-appropriate, empowering, and builds sleep identity.");
    }
    if (suggestedAddons.length === 0) suggestedAddons.push("sa_regulation");
  }

  return { flags, recommendations, suggestedMethod, suggestedAddons };
}

// ─── CONSULTANT SETUP PANEL ───────────────────────────────────────────────────
function SetupPanel({ profile, intake, onSave, onClose }) {
  const T = useT();
  const insights = generateInsights(intake);
  const [f, setF] = useState({
    childName:"", dob:"", ageGroup:"infant", method: insights.suggestedMethod || "settled_support",
    startDate:"", consultantNotes:"", fadingProp:"", fadingStartMins:"", fadingReduceMins:"5",
    fadingEveryDays:"3", addons: insights.suggestedAddons || [],
    customBedtimeRoutine: null, customNapRoutine: null,
    ...profile
  });
  // Local editable copies of routines — seeded from custom or defaults
  const defaultBedtime = getBedtimeRoutine(f.ageGroup);
  const defaultNap = NAP_ROUTINE;
  const [editBedtime, setEditBedtime] = useState(
    (profile.customBedtimeRoutine || getBedtimeRoutine(profile.ageGroup || "infant")).map(i => ({ ...i }))
  );
  const [editNap, setEditNap] = useState(
    (profile.customNapRoutine || NAP_ROUTINE).map(i => ({ ...i }))
  );
  const updateRoutineItem = (list, setList, idx, val) => {
    const next = list.map((item, i) => i === idx ? { ...item, text: val } : item);
    setList(next);
  };
  const removeRoutineItem = (list, setList, idx) => setList(list.filter((_, i) => i !== idx));
  const addRoutineItem = (list, setList, prefix) => setList([...list, { id: `${prefix}_custom_${Date.now()}`, text: "" }]);
  const resetRoutine = (type) => {
    if (type === "bedtime") setEditBedtime(getBedtimeRoutine(f.ageGroup).map(i => ({ ...i })));
    if (type === "nap") setEditNap(NAP_ROUTINE.map(i => ({ ...i })));
  };
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const group = METHOD_GROUPS.find(g => g.key === f.ageGroup);
  const available = group?.ids || [];
  const isSchool = f.ageGroup === "school";
  const toggleAddon = id => set("addons", f.addons.includes(id) ? f.addons.filter(a => a !== id) : [...f.addons, id]);
  const [aiExpanded, setAiExpanded] = useState(insights.flags.length > 0 || insights.recommendations.length > 0);

  const fadePrev = (() => {
    const start = parseInt(f.fadingStartMins), reduce = parseInt(f.fadingReduceMins)||5, every = parseInt(f.fadingEveryDays)||3;
    if (!start) return null;
    const steps = []; let cur = start, day = 1, idx = 0;
    while (cur > 0 && idx < 9) { steps.push({label:`Days ${day}–${day+every-1}`, mins:cur}); cur = Math.max(0, cur-reduce); day += every; idx++; }
    steps.push({label:`Day ${day}+`, mins:0}); return steps;
  })();

  const inp = { width:"100%", background:T.inputBg, border:`1.5px solid ${T.border}`, borderRadius:10, padding:"11px 13px", color:T.text, fontFamily:font, fontSize:13.5, outline:"none", boxSizing:"border-box", transition:"border .2s" };
  const lbl = { display:"block", fontSize:10.5, fontWeight:700, letterSpacing:".09em", textTransform:"uppercase", color:T.muted, marginBottom:7, fontFamily:font };

  return (
    <div style={{ position:"fixed", inset:0, background:T.overlayBg, display:"flex", alignItems:"flex-start", justifyContent:"center", zIndex:50, backdropFilter:"blur(8px)", overflowY:"auto", padding:"20px 16px 80px" }}>
      <div style={{ background:T.panelBg, border:`1px solid ${T.border}`, borderRadius:22, width:"100%", maxWidth:560, padding:28, boxShadow:T.shadow }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <div style={{ fontFamily:serif, fontSize:21, color:T.headingText }}>Client Setup</div>
            <div style={{ fontFamily:font, fontSize:11.5, color:T.subText, marginTop:3 }}>Rooted Connections Collective</div>
          </div>
          <button onClick={onClose} style={{ background:T.faint, border:"none", color:T.muted, borderRadius:9, width:34, height:34, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        <div style={{ display:"grid", gap:20 }}>

          {/* AI Insights from Intake */}
          {(insights.flags.length > 0 || insights.recommendations.length > 0) && (
            <div style={{ background:`${C.teal}0d`, border:`1.5px solid ${C.teal}35`, borderRadius:14, overflow:"hidden" }}>
              <button onClick={() => setAiExpanded(x => !x)} style={{ width:"100%", padding:"13px 16px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:10, textAlign:"left" }}>
                <span style={{ fontSize:18 }}>✨</span>
                <span style={{ flex:1, fontFamily:font, fontSize:13.5, fontWeight:700, color:C.teal }}>AI Insights from Intake</span>
                <span style={{ fontSize:10, background:`${C.teal}22`, color:C.teal, borderRadius:12, padding:"2px 8px", fontFamily:font, fontWeight:700 }}>{insights.flags.length} flag{insights.flags.length !== 1 ? "s" : ""}</span>
                <span style={{ color:T.muted, fontSize:13, transform:aiExpanded?"rotate(180deg)":"none", transition:"transform .2s", display:"inline-block" }}>▾</span>
              </button>
              {aiExpanded && (
                <div style={{ padding:"0 16px 16px", display:"grid", gap:10 }}>
                  {insights.flags.map((flag, i) => (
                    <div key={i} style={{ display:"flex", gap:10, padding:"10px 12px", borderRadius:10, background:`${flag.color}12`, border:`1px solid ${flag.color}30` }}>
                      <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{flag.icon}</span>
                      <p style={{ fontSize:12.5, color:T.text, lineHeight:1.6, fontFamily:font }}>{flag.text}</p>
                    </div>
                  ))}
                  {insights.recommendations.map((rec, i) => (
                    <div key={i} style={{ padding:"9px 12px", borderRadius:10, background:T.notesBg, border:`1px solid ${T.border}` }}>
                      <p style={{ fontSize:12, color:T.muted, lineHeight:1.6, fontFamily:font, fontStyle:"italic" }}>{rec}</p>
                    </div>
                  ))}
                  {insights.suggestedMethod && METHODS[insights.suggestedMethod] && (
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, background:`${METHODS[insights.suggestedMethod].color}15`, border:`1px solid ${METHODS[insights.suggestedMethod].color}30` }}>
                      <span style={{ fontSize:13 }}>💡</span>
                      <span style={{ fontSize:12, fontFamily:font, fontWeight:700, color:METHODS[insights.suggestedMethod].color }}>Suggested: {METHODS[insights.suggestedMethod].label}</span>
                      <button onClick={() => set("method", insights.suggestedMethod)} style={{ marginLeft:"auto", fontSize:11, fontFamily:font, fontWeight:700, color:"#fff", background:METHODS[insights.suggestedMethod].color, border:"none", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>Apply</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Child Info */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div><label style={lbl}>Child's Name</label><input style={inp} value={f.childName} onChange={e=>set("childName",e.target.value)} placeholder="First name"/></div>
            <div><label style={lbl}>Date of Birth</label><input style={{...inp,colorScheme:"auto"}} type="date" value={f.dob} onChange={e=>set("dob",e.target.value)}/></div>
          </div>

          {/* Age Group */}
          <div>
            <label style={lbl}>Age Group</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {METHOD_GROUPS.map(g => (
                <button key={g.key} onClick={() => { set("ageGroup",g.key); set("method",METHOD_GROUPS.find(x=>x.key===g.key)?.ids?.[0]||""); set("addons",[]); }}
                  style={{ padding:"10px 4px", borderRadius:11, border:`1.5px solid ${f.ageGroup===g.key?C.teal:T.border}`, background:f.ageGroup===g.key?`${C.teal}18`:T.card, color:f.ageGroup===g.key?C.teal:T.muted, fontFamily:font, fontSize:12, fontWeight:600, cursor:"pointer", lineHeight:1.35, transition:"all .2s" }}>
                  <div>{g.label}</div><div style={{fontSize:10,opacity:.55}}>{g.sublabel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Method Picker */}
          <div>
            <label style={lbl}>Primary Sleep Training Method</label>
            <div style={{ display:"grid", gap:7 }}>
              {available.map(id => { const m = METHODS[id]; if (!m) return null; const sel = f.method === id; return (
                <button key={id} onClick={() => set("method",id)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:11, border:`1.5px solid ${sel?m.color:T.border}`, background:sel?`${m.color}16`:T.card, textAlign:"left", cursor:"pointer", width:"100%", transition:"all .2s" }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:sel?m.color:T.border, flexShrink:0, transition:"background .2s" }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:font, fontSize:13, fontWeight:600, color:sel?T.headingText:T.muted }}>{m.label}</div>
                    <div style={{ fontFamily:font, fontSize:11, color:T.subText, marginTop:2, lineHeight:1.4 }}>{m.description.slice(0,70)}…</div>
                  </div>
                  {id === insights.suggestedMethod && <span style={{ fontSize:10, background:`${m.color}22`, color:m.color, borderRadius:10, padding:"2px 7px", fontFamily:font, fontWeight:700, flexShrink:0 }}>AI Pick</span>}
                </button>
              );})}
            </div>
          </div>

          {/* Fading Details */}
          {f.method === "fading" && (
            <div style={{ background:`${C.sage}0f`, border:`1px solid ${C.sage}28`, borderRadius:13, padding:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.sage, letterSpacing:".07em", textTransform:"uppercase", marginBottom:14, fontFamily:font }}>Fading Plan Details</div>
              <div style={{ display:"grid", gap:12 }}>
                <div><label style={lbl}>Sleep prop to fade</label><input style={inp} value={f.fadingProp} onChange={e=>set("fadingProp",e.target.value)} placeholder="e.g. Nursing to sleep, rocking, back rubs…"/></div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <div><label style={lbl}>Start at (mins)</label><input style={inp} type="number" min="1" value={f.fadingStartMins} onChange={e=>set("fadingStartMins",e.target.value)} placeholder="e.g. 20"/></div>
                  <div><label style={lbl}>Reduce by (mins)</label><input style={inp} type="number" min="1" value={f.fadingReduceMins} onChange={e=>set("fadingReduceMins",e.target.value)}/></div>
                  <div><label style={lbl}>Every (days)</label><input style={inp} type="number" min="1" value={f.fadingEveryDays} onChange={e=>set("fadingEveryDays",e.target.value)}/></div>
                </div>
                {fadePrev && (
                  <div style={{ background:T.notesBg, borderRadius:9, padding:"11px 13px" }}>
                    <div style={{ fontFamily:font, fontSize:10, color:T.muted, marginBottom:8, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase" }}>Schedule Preview</div>
                    {fadePrev.map((s,i) => <div key={i} style={{ display:"flex", justifyContent:"space-between", fontFamily:mono, fontSize:10.5, color:s.mins===0?C.sage:T.muted, padding:"3px 0" }}><span>{s.label}</span><span>{s.mins===0?"Independent 🎉":`${s.mins} min of ${f.fadingProp||"prop"}`}</span></div>)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* School Add-Ons */}
          {isSchool && (
            <div>
              <label style={lbl}>Optional Add-On Strategies</label>
              <div style={{ display:"grid", gap:8 }}>
                {SCHOOL_ADDONS.map(addon => { const sel = f.addons.includes(addon.id); const isAi = insights.suggestedAddons.includes(addon.id); return (
                  <button key={addon.id} onClick={() => toggleAddon(addon.id)}
                    style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 14px", borderRadius:11, border:`1.5px solid ${sel?addon.color:T.border}`, background:sel?`${addon.color}12`:T.card, textAlign:"left", cursor:"pointer", width:"100%", transition:"all .2s" }}>
                    <div style={{ width:17, height:17, borderRadius:5, border:`2px solid ${sel?addon.color:T.border}`, background:sel?addon.color:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2, transition:"all .15s" }}>
                      {sel && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ fontFamily:font, fontSize:13, fontWeight:600, color:sel?T.headingText:T.muted }}>{addon.label}</div>
                        {isAi && <span style={{ fontSize:9, background:`${addon.color}22`, color:addon.color, borderRadius:8, padding:"1px 6px", fontFamily:font, fontWeight:700 }}>Recommended</span>}
                      </div>
                      <div style={{ fontFamily:font, fontSize:11, color:T.subText, marginTop:2, lineHeight:1.4 }}>{addon.description}</div>
                    </div>
                  </button>
                );})}
              </div>
            </div>
          )}

          {/* ── ROUTINE EDITOR ── */}
          <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:18, marginTop:4 }}>
            <div style={{ fontFamily:serif, fontSize:16, color:T.headingText, marginBottom:4 }}>Bedtime Routine</div>
            <div style={{ fontSize:12, color:T.muted, fontFamily:font, marginBottom:12, lineHeight:1.5 }}>
              Customize the steps the family will see and check off each night.
            </div>
            {editBedtime.map((item, idx) => (
              <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ width:22, height:22, borderRadius:6, border:`1.5px solid ${T.border}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:10, color:T.muted }}>{idx+1}</span>
                </div>
                <input
                  value={item.text}
                  onChange={e => updateRoutineItem(editBedtime, setEditBedtime, idx, e.target.value)}
                  style={{ ...inp, marginBottom:0, flex:1, padding:"8px 12px" }}
                  placeholder="Routine step..."
                />
                <button onClick={() => removeRoutineItem(editBedtime, setEditBedtime, idx)}
                  style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:16, padding:"0 4px", flexShrink:0 }}>×</button>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:4, marginBottom:16 }}>
              <button onClick={() => addRoutineItem(editBedtime, setEditBedtime, "bt")}
                style={{ padding:"7px 12px", borderRadius:8, border:`1px dashed ${T.border}`, background:"none", color:T.muted, fontFamily:font, fontSize:12, cursor:"pointer" }}>
                + Add step
              </button>
              <button onClick={() => resetRoutine("bedtime")}
                style={{ padding:"7px 12px", borderRadius:8, border:`1px dashed ${T.border}`, background:"none", color:T.muted, fontFamily:font, fontSize:12, cursor:"pointer" }}>
                ↺ Reset to default
              </button>
            </div>

            {/* Nap routine — only show for methods with naps */}
            {METHODS[f.method]?.hasNaps && (<>
              <div style={{ fontFamily:serif, fontSize:16, color:T.headingText, marginBottom:4, marginTop:8 }}>Nap Routine</div>
              <div style={{ fontSize:12, color:T.muted, fontFamily:font, marginBottom:12, lineHeight:1.5 }}>
                Customize the nap routine steps.
              </div>
              {editNap.map((item, idx) => (
                <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:22, height:22, borderRadius:6, border:`1.5px solid ${T.border}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:10, color:T.muted }}>{idx+1}</span>
                  </div>
                  <input
                    value={item.text}
                    onChange={e => updateRoutineItem(editNap, setEditNap, idx, e.target.value)}
                    style={{ ...inp, marginBottom:0, flex:1, padding:"8px 12px" }}
                    placeholder="Routine step..."
                  />
                  <button onClick={() => removeRoutineItem(editNap, setEditNap, idx)}
                    style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:16, padding:"0 4px", flexShrink:0 }}>×</button>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:4, marginBottom:16 }}>
                <button onClick={() => addRoutineItem(editNap, setEditNap, "np")}
                  style={{ padding:"7px 12px", borderRadius:8, border:`1px dashed ${T.border}`, background:"none", color:T.muted, fontFamily:font, fontSize:12, cursor:"pointer" }}>
                  + Add step
                </button>
                <button onClick={() => resetRoutine("nap")}
                  style={{ padding:"7px 12px", borderRadius:8, border:`1px dashed ${T.border}`, background:"none", color:T.muted, fontFamily:font, fontSize:12, cursor:"pointer" }}>
                  ↺ Reset to default
                </button>
              </div>
            </>)}
          </div>

          {/* Wake Windows callout */}
          <div style={{
            padding:"12px 16px", borderRadius:10,
            background:`${C.sky}12`, border:`1px solid ${C.sky}30`,
            display:"flex", alignItems:"flex-start", gap:10,
          }}>
            <span style={{ fontSize:16, flexShrink:0 }}>⏱️</span>
            <div>
              <div style={{ fontFamily:font, fontSize:12.5, fontWeight:700, color:C.sky, marginBottom:2 }}>
                Wake Windows
              </div>
              <div style={{ fontFamily:font, fontSize:12, color:T.muted, lineHeight:1.6 }}>
                Custom wake windows for this family are configured in the <strong>Sleep Log → Configure tab</strong>. They drive the next sleep suggestion shown to parents in real time.
              </div>
            </div>
          </div>

          {/* Start Date + Notes */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div><label style={lbl}>Training Start Date</label><input style={{...inp,colorScheme:"auto"}} type="date" value={f.startDate} onChange={e=>set("startDate",e.target.value)}/></div>
          </div>
          <div>
            <label style={lbl}>Note to Family (visible on their plan)</label>
            <textarea style={{...inp, minHeight:80, resize:"vertical", lineHeight:1.6}} value={f.consultantNotes} onChange={e=>set("consultantNotes",e.target.value)} placeholder="Any personalized guidance, encouragement, or reminders for this family…"/>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:"13px 0", borderRadius:11, border:`1px solid ${T.border}`, background:"none", color:T.muted, fontFamily:font, fontSize:13.5, cursor:"pointer" }}>Cancel</button>
            <button onClick={() => onSave({ ...f, customBedtimeRoutine: editBedtime.filter(i => i.text.trim()), customNapRoutine: editNap.filter(i => i.text.trim()) })} style={{ flex:2, padding:"13px 0", borderRadius:11, border:"none", background:C.teal, color:"#fff", fontFamily:font, fontSize:13.5, fontWeight:700, cursor:"pointer", letterSpacing:".02em", boxShadow:`0 4px 16px ${C.teal}40` }}>Save & Apply Plan</button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── CONSULTANT PLAN VIEW ─────────────────────────────────────────────────────
function ConsultantPlanView({ checks, history, allItems, profile, method, mc, bedtimeRoutine, fadingPhases, addons, onEditPlan }) {
  const T = useT();
  const [histTab, setHistTab] = useState("tonight");
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (key) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  const today = new Date().toISOString().split("T")[0];
  const todaySnap = history.find(h => h.date === today);
  const todayChecks = todaySnap?.checks || checks;

  const sections = [
    { label: "Environment", items: ENV_ITEMS, color: C.teal },
    { label: "Bedtime Routine", items: bedtimeRoutine, color: C.purple },
    ...(method.setupItems?.length ? [{ label: "Setup", items: method.setupItems, color: mc }] : []),
    ...( (method.phases || []).map(p => ({ label: p.label, items: p.items, color: mc })) ),
    ...( fadingPhases.map(p => ({ label: p.label, items: p.items, color: mc })) ),
    ...( (method.napPhases || []).map(p => ({ label: p.label, items: p.items, color: C.sage })) ),
    ...( addons.map(a => ({ label: a.label, items: a.items, color: a.color })) ),
    { label: "For You (Regulation)", items: GROUND_ITEMS, color: C.sage },
  ].filter(s => s.items?.length > 0);

  const totalChecked = allItems.filter(i => todayChecks[i.id]).length;
  const totalItems = allItems.length;
  const pct = totalItems ? Math.round((totalChecked / totalItems) * 100) : 0;

  return (
    <div>
      {/* Edit Plan button */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button onClick={onEditPlan} style={{
          padding:"9px 16px", borderRadius:10,
          border:`1px solid ${mc}55`, background:`${mc}12`,
          color:mc, fontFamily:font, fontSize:13, fontWeight:600,
          cursor:"pointer", display:"flex", alignItems:"center", gap:6,
        }}>
          ✏️ Edit Plan & Routine
        </button>
      </div>

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:4, background:T.faint, borderRadius:12, padding:4, marginBottom:20 }}>
        {[
          { id:"tonight", label:"Tonight", icon:"🌙" },
          { id:"history", label:"Night History", icon:"📅" },
        ].map(t => (
          <button key={t.id} onClick={() => setHistTab(t.id)} style={{
            flex:1, padding:"9px 4px", borderRadius:9, border:"none", fontFamily:font,
            fontSize:13, fontWeight:histTab===t.id?700:400,
            background:histTab===t.id?`${mc}22`:"transparent",
            color:histTab===t.id?mc:T.muted, cursor:"pointer", transition:"all .2s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TONIGHT VIEW ── */}
      {histTab === "tonight" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ fontFamily:serif, fontSize:17, color:T.headingText }}>Tonight's Progress</div>
            <div style={{ fontFamily:font, fontSize:13, color:mc, fontWeight:700 }}>
              {totalChecked}/{totalItems} checked
            </div>
          </div>

          <div style={{ height:6, borderRadius:3, background:T.faint, marginBottom:20, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${mc},${C.purple})`, borderRadius:3, transition:"width .5s" }}/>
          </div>

          {sections.map((section, si) => {
            const sectionChecked = section.items.filter(i => todayChecks[i.id]);
            const sectionTotal = section.items.length;
            const allDone = sectionChecked.length === sectionTotal;
            const noneDone = sectionChecked.length === 0;
            const isOpen = openSections[si] !== false && !allDone; // open by default unless all done
            return (
              <div key={si} style={{ marginBottom:10, borderRadius:12, border:`1px solid ${allDone ? C.sage+"44" : T.border}`, overflow:"hidden" }}>
                {/* Collapsible header */}
                <button
                  onClick={() => toggleSection(si)}
                  style={{
                    width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"12px 16px", border:"none", cursor:"pointer", textAlign:"left",
                    background: allDone ? `${C.sage}18` : noneDone ? T.faint : `${mc}0e`,
                  }}
                >
                  <div style={{ fontFamily:font, fontSize:13, fontWeight:700, color:T.headingText }}>
                    {section.label}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ fontFamily:font, fontSize:12, color:allDone?C.sage:T.muted }}>
                      {sectionChecked.length}/{sectionTotal}
                    </div>
                    {allDone && <span style={{ fontSize:15 }}>✅</span>}
                    {!allDone && noneDone && <span style={{ fontSize:13, color:T.muted }}>○</span>}
                    {!allDone && !noneDone && <span style={{ fontSize:13, color:mc }}>◑</span>}
                    <span style={{ fontSize:11, color:T.muted, marginLeft:4 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Collapsible items */}
                {isOpen && (
                  <div style={{ padding:"6px 16px 10px" }}>
                    {section.items.map(item => {
                      const done = !!todayChecks[item.id];
                      return (
                        <div key={item.id} style={{
                          display:"flex", alignItems:"center", gap:10, padding:"7px 0",
                          borderBottom:`1px solid ${T.faint}`,
                        }}>
                          <div style={{
                            width:18, height:18, borderRadius:5, flexShrink:0,
                            border:`2px solid ${done ? section.color : T.border}`,
                            background: done ? section.color : "transparent",
                            display:"flex", alignItems:"center", justifyContent:"center",
                          }}>
                            {done && <svg width="9" height="7" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span style={{
                            fontSize:13, fontFamily:font, lineHeight:1.5,
                            color: done ? T.muted : T.text,
                            textDecoration: done ? "line-through" : "none",
                            flex:1,
                          }}>
                            {item.text}
                          </span>
                          {!done && <span style={{ fontSize:11, color:C.rose, fontFamily:font, fontWeight:600, flexShrink:0 }}>missed</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {!todaySnap && (
            <div style={{ textAlign:"center", padding:"16px 0", color:T.muted, fontFamily:font, fontSize:13 }}>
              No activity logged yet today. Check back after the family's bedtime routine.
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY VIEW ── */}
      {histTab === "history" && (
        <div>
          <div style={{ fontFamily:serif, fontSize:17, color:T.headingText, marginBottom:16 }}>
            Night-by-Night History
          </div>

          {history.length === 0 && (
            <div style={{
              textAlign:"center", padding:"40px 24px",
              borderRadius:14, border:`2px dashed ${T.border}`,
              color:T.muted, fontFamily:font,
            }}>
              <div style={{ fontSize:32, marginBottom:10 }}>📅</div>
              <div style={{ fontFamily:serif, fontSize:15, color:T.headingText, marginBottom:6 }}>No history yet</div>
              <div style={{ fontSize:13 }}>History builds automatically as the family checks items each night.</div>
            </div>
          )}

          {[...history].reverse().map((snap, si) => {
            const snapChecked = allItems.filter(i => snap.checks?.[i.id]).length;
            const snapPct = totalItems ? Math.round((snapChecked / totalItems) * 100) : 0;
            const missed = allItems.filter(i => !snap.checks?.[i.id]);
            const isToday = snap.date === today;
            const trainingDay = profile.startDate
              ? Math.floor((new Date(snap.date) - new Date(profile.startDate)) / 86400000) + 1
              : null;
            const isOpen = openSections["hist_"+si] === true;

            return (
              <div key={si} style={{
                marginBottom:10, borderRadius:12,
                border:`1px solid ${isToday ? mc+"44" : T.border}`,
                overflow:"hidden",
              }}>
                <button
                  onClick={() => toggleSection("hist_"+si)}
                  style={{
                    width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"12px 16px", border:"none", cursor:"pointer", textAlign:"left",
                    background: isToday ? `${mc}12` : T.faint,
                  }}
                >
                  <div>
                    <div style={{ fontFamily:font, fontSize:13, fontWeight:700, color:T.headingText }}>
                      {isToday ? "Tonight" : new Date(snap.date + "T12:00:00").toLocaleDateString([], { weekday:"short", month:"short", day:"numeric" })}
                      {trainingDay ? ` — Day ${trainingDay}` : ""}
                    </div>
                    <div style={{ fontFamily:font, fontSize:11, color:T.muted, marginTop:2 }}>
                      {snapChecked}/{totalItems} items checked · {snapPct}% complete
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{
                      fontSize:16, fontWeight:700, fontFamily:font,
                      color: snapPct >= 80 ? C.sage : snapPct >= 50 ? mc : C.rose,
                    }}>
                      {snapPct}%
                    </div>
                    <span style={{ fontSize:11, color:T.muted }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ padding:"10px 16px 12px" }}>
                    {missed.length === 0 ? (
                      <div style={{ fontSize:13, color:C.sage, fontFamily:font }}>✅ All items completed</div>
                    ) : (
                      <>
                        <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:C.rose, marginBottom:8, fontFamily:font }}>
                          Not checked ({missed.length})
                        </div>
                        {missed.slice(0,8).map(item => (
                          <div key={item.id} style={{
                            fontSize:12.5, color:T.muted, fontFamily:font, lineHeight:1.5,
                            padding:"4px 0", borderBottom:`1px solid ${T.faint}`,
                          }}>
                            ○ {item.text}
                          </div>
                        ))}
                        {missed.length > 8 && (
                          <div style={{ fontSize:12, color:T.muted, fontFamily:font, marginTop:4, fontStyle:"italic" }}>
                            + {missed.length - 8} more not checked
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function SleepPlanTracker({ user, activeFamily }) {
  const T = useT();
  const { currentUser } = useContext(AppCtx);
  const resolvedUser = user || currentUser;

  // ── State ──
  const [profile, setProfileState] = useState({
    childName: activeFamily?.child_name || "Your Child",
    dob: activeFamily?.birth_date || activeFamily?.birthDate || "",
    ageGroup: "infant", method: "settled_support", startDate: "",
    consultantNotes: "", fadingProp: "", fadingStartMins: "", fadingReduceMins: "5",
    fadingEveryDays: "3", addons: [],
  });
  const [checks, setChecksState] = useState({});
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("setup");
  const [showPin, setShowPin] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intake, setIntake] = useState(null);

  const familyId = activeFamily?.id;
  const isConsultant = resolvedUser?.role === "consultant" || resolvedUser?.role === "consultant_internal" || resolvedUser?.role === "admin";

  // ── Load data from Supabase ──
  useEffect(() => {
    if (!familyId) { setLoading(false); return; }
    Promise.all([
      supabase.from("families").select("sleep_plan_profile, sleep_progress, sleep_progress_history").eq("id", familyId).maybeSingle(),
      supabase.from("intake_responses").select("*").eq("family_id", familyId).maybeSingle(),
    ]).then(([{ data: fam }, { data: intakeData }]) => {
      if (fam?.sleep_plan_profile) setProfileState(p => ({ ...p, ...fam.sleep_plan_profile }));
      if (fam?.sleep_progress_history) setHistory(fam.sleep_progress_history || []);
      if (intakeData) setIntake(intakeData);

      // ── Daily routine auto-reset ──
      // Routine checks (bedtime/nap) reset each new day so parents start fresh.
      // Training/setup checks are permanent progress markers — they never reset.
      const today = new Date().toISOString().split("T")[0];
      const lastReset = fam?.sleep_plan_profile?.lastRoutineResetDate;
      const savedChecks = fam?.sleep_progress || {};
      if (lastReset !== today) {
        // Get all routine item IDs so we only clear those, not training/setup items
        const planProfile = fam?.sleep_plan_profile || {};
        const bedtimeItems = (planProfile.customBedtimeRoutine || getBedtimeRoutine(planProfile.ageGroup || "infant")).map(i => i.id);
        const napItems = (planProfile.customNapRoutine || NAP_ROUTINE).map(i => i.id);
        const routineIds = new Set([...bedtimeItems, ...napItems]);
        const resetChecks = Object.fromEntries(Object.entries(savedChecks).filter(([id]) => !routineIds.has(id)));
        setChecksState(resetChecks);
        // Persist reset + new date
        if (familyId) {
          const updatedProfile = { ...(fam?.sleep_plan_profile || {}), lastRoutineResetDate: today };
          supabase.from("families").update({ sleep_progress: resetChecks, sleep_plan_profile: updatedProfile }).eq("id", familyId);
        }
      } else {
        if (fam?.sleep_progress) setChecksState(fam.sleep_progress);
      }

      setLoading(false);
    });
  }, [familyId]);

  // ── Persist profile ──
  const saveProfile = useCallback(async (newProfile) => {
    setProfileState(newProfile);
    if (!familyId) return;
    setSaving(true);
    await supabase.from("families").update({ sleep_plan_profile: newProfile }).eq("id", familyId);
    setSaving(false);
  }, [familyId]);

  // ── Toggle a single check ──
  const toggle = useCallback(async (itemId) => {
    if (isConsultant) return; // consultants read-only on checks
    const updated = { ...checks, [itemId]: !checks[itemId] };
    setChecksState(updated);
    if (familyId) {
      // Snapshot today's state for history if no entry for today yet
      const today = new Date().toISOString().split("T")[0];
      const existingIdx = history.findIndex(h => h.date === today);
      let newHistory;
      if (existingIdx >= 0) {
        newHistory = history.map((h, i) => i === existingIdx ? { ...h, checks: updated } : h);
      } else {
        newHistory = [...history, { date: today, checks: updated }];
      }
      setHistory(newHistory);
      await supabase.from("families").update({
        sleep_progress: updated,
        sleep_progress_history: newHistory,
      }).eq("id", familyId);
    }
  }, [checks, familyId, history, isConsultant]);

  // ── Derived values ──
  const method = METHODS[profile.method] || METHODS.settled_support;
  const mc = method.color;
  const fadingPhases = profile.method === "fading" ? buildFadingPhases(profile) : [];
  const bedtimeRoutine = (profile.customBedtimeRoutine?.length ? profile.customBedtimeRoutine : getBedtimeRoutine(profile.ageGroup));
  const addons = (profile.addons || []).map(id => SCHOOL_ADDONS.find(a => a.id === id)).filter(Boolean);
  const isSchool = profile.ageGroup === "school";
  const isOlderWithLadder = (profile.ageGroup === "toddler" || profile.ageGroup === "preschool") && profile.method !== "confidence_ladder";
  const isLadder = profile.method === "confidence_ladder";

  const allItems = [
    ...ENV_ITEMS,
    ...(profile.ageGroup === "infant" ? SAFE_ITEMS : []),
    ...bedtimeRoutine,
    ...(method.hasNaps ? (profile.customNapRoutine?.length ? profile.customNapRoutine : NAP_ROUTINE) : []),
    ...(method.setupItems || []),
    ...(method.phases || []).flatMap(p => p.items),
    ...fadingPhases.flatMap(p => p.items),
    ...(method.napPhases || []).flatMap(p => p.items),
    ...(isOlderWithLadder ? METHODS.confidence_ladder.phases.flatMap(p => p.items) : []),
    ...addons.flatMap(a => a.items),
    ...GROUND_ITEMS,
  ];
  const totalDone = allItems.filter(i => checks[i.id]).length;
  const totalAll  = allItems.length;
  const pct = totalAll ? Math.round((totalDone / totalAll) * 100) : 0;

  const age = (() => {
    if (!profile.dob) return null;
    const m = Math.floor((new Date() - new Date(profile.dob)) / (1000*60*60*24*30.4));
    return m < 24 ? `${m} mo` : `${Math.floor(m/12)}y ${m%12}mo`;
  })();
  const trainingDay = profile.startDate ? Math.floor((new Date() - new Date(profile.startDate)) / 86400000) + 1 : null;

  const tabs = [
    { id:"setup",    label:"Setup",    emoji:"🛡️" },
    { id:"routine",  label:"Routine",  emoji:"✨" },
    { id:"training", label:"Training", emoji:"🌙" },
    { id:"you",      label:"For You",  emoji:"🌿" },
  ];

  if (loading) return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:T.muted }}>
      <div style={{ fontSize:32, marginBottom:12 }}>🌙</div>
      <p style={{ fontFamily:serif, fontSize:16 }}>Loading sleep plan…</p>
    </div>
  );

  return (
    <div style={{ fontFamily:font, color:T.text, paddingBottom:80 }}>

      {/* ── HEADER ── */}
      <div style={{ padding:"0 20px", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:9.5, letterSpacing:".18em", textTransform:"uppercase", color:T.subText, fontWeight:600, marginBottom:6 }}>Rooted Connections Collective</div>
            <h1 style={{ fontFamily:serif, fontSize:26, letterSpacing:"-.01em", lineHeight:1.1, color:T.headingText }}>{profile.childName}'s</h1>
            <div style={{ fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:mc, marginTop:5, fontWeight:700 }}>{method.label}</div>
          </div>
          <div style={{ textAlign:"right", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
            <div style={{ fontFamily:mono, fontSize:30, fontWeight:700, color:mc, lineHeight:1 }}>{pct}%</div>
            <div style={{ fontSize:9.5, color:T.muted, letterSpacing:".06em", marginTop:-3 }}>complete</div>
            {age && <div style={{ fontSize:11, color:T.muted, fontFamily:mono }}>{age}</div>}
            {trainingDay && <div style={{ fontSize:9.5, color:T.subText, fontFamily:mono }}>day {trainingDay}</div>}
            {saving && <div style={{ fontSize:10, color:C.teal }}>saving…</div>}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:4, borderRadius:2, background:T.faint }}>
          <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${mc},${C.purple})`, borderRadius:2, transition:"width .6s ease" }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
          <span style={{ fontFamily:mono, fontSize:9, color:T.subText }}>{totalDone} checked</span>
          <span style={{ fontFamily:mono, fontSize:9, color:T.subText }}>{totalAll} total</span>
        </div>

        {/* Consultant note */}
        {profile.consultantNotes && (
          <div style={{ marginTop:14, padding:"12px 15px", borderRadius:12, background:`${mc}0f`, border:`1px solid ${mc}28` }}>
            <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:mc, marginBottom:5, fontFamily:font }}>Note from your consultant</div>
            <p style={{ fontSize:13, color:T.muted, lineHeight:1.7, fontStyle:"italic", fontFamily:font }}>{profile.consultantNotes}</p>
          </div>
        )}
      </div>

      {/* ── TAB BAR — parent only ── */}
      {!isConsultant && (
        <div style={{ padding:"0 20px", marginBottom:18 }}>
          <div style={{ display:"flex", gap:3, background:T.faint, borderRadius:14, padding:4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex:1, padding:"9px 4px", borderRadius:10, border:"none", fontFamily:font,
                fontSize:12, fontWeight:tab===t.id?700:400,
                background:tab===t.id?`${mc}22`:"transparent",
                color:tab===t.id?mc:T.muted, cursor:"pointer", transition:"all .2s",
                display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              }}>
                <span style={{ fontSize:14 }}>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT ── */}
      <div style={{ padding:"0 20px" }}>

        {/* ── CONSULTANT READ-ONLY VIEW ── */}
        {isConsultant && (
          <ConsultantPlanView
            checks={checks}
            history={history}
            allItems={allItems}
            profile={profile}
            method={method}
            mc={mc}
            bedtimeRoutine={bedtimeRoutine}
            fadingPhases={fadingPhases}
            addons={addons}
            onEditPlan={() => setShowSetup(true)}
          />
        )}

        {/* ── SETUP TAB ── */}
        {!isConsultant && tab === "setup" && (<>
          <Accordion title="Sleep Environment" emoji="🌙" color={C.teal} defaultOpen>
            <MiniBar done={ENV_ITEMS.filter(i=>checks[i.id]).length} total={ENV_ITEMS.length} color={C.teal}/>
            {ENV_ITEMS.map(i => <CheckItem key={i.id} item={i} checked={!!checks[i.id]} onToggle={toggle} color={C.teal}/>)}
          </Accordion>

          {profile.ageGroup === "infant" && (
            <Accordion title="Safe Sleep Guidelines (AAP)" emoji="🛡️" color={C.mauve}>
              <p style={{ fontSize:12, color:T.muted, marginBottom:10, fontStyle:"italic", lineHeight:1.55 }}>Confirm each item to ensure you're following current AAP safe sleep recommendations.</p>
              <MiniBar done={SAFE_ITEMS.filter(i=>checks[i.id]).length} total={SAFE_ITEMS.length} color={C.mauve}/>
              {SAFE_ITEMS.map(i => <CheckItem key={i.id} item={i} checked={!!checks[i.id]} onToggle={toggle} color={C.mauve}/>)}
            </Accordion>
          )}

          {method.setupItems?.length > 0 && (
            <Accordion title={`${method.label} — Before You Begin`} emoji="📋" color={mc}>
              <MiniBar done={method.setupItems.filter(i=>checks[i.id]).length} total={method.setupItems.length} color={mc}/>
              {method.setupItems.map(i => <CheckItem key={i.id} item={i} checked={!!checks[i.id]} onToggle={toggle} color={mc}/>)}
            </Accordion>
          )}

          <div style={{ padding:"13px 15px", borderRadius:11, background:T.faint, border:`1px dashed ${T.border}`, textAlign:"center" }}>
            <p style={{ fontSize:11.5, color:T.muted, lineHeight:1.6 }}>Setup items are one-time. Use Consultant Access below to update this plan.</p>
          </div>
        </>)}

        {/* ── ROUTINE TAB ── */}
        {!isConsultant && tab === "routine" && (<>
          <Accordion title="Bedtime Routine" emoji="✨" color={C.purple} defaultOpen>
            <p style={{ fontSize:12, color:T.muted, marginBottom:10, fontStyle:"italic", lineHeight:1.55 }}>30–40 minutes. Same order, every night. Check off as you go.</p>
            <MiniBar done={bedtimeRoutine.filter(i=>checks[i.id]).length} total={bedtimeRoutine.length} color={C.purple}/>
            {bedtimeRoutine.map(i => <CheckItem key={i.id} item={i} checked={!!checks[i.id]} onToggle={toggle} color={C.purple}/>)}
          </Accordion>

          {method.hasNaps && (
            <Accordion title="Nap Routine" emoji="☁️" color={C.sage}>
              <MiniBar done={(profile.customNapRoutine?.length ? profile.customNapRoutine : NAP_ROUTINE).filter(i=>checks[i.id]).length} total={(profile.customNapRoutine?.length ? profile.customNapRoutine : NAP_ROUTINE).length} color={C.sage}/>
              {(profile.customNapRoutine?.length ? profile.customNapRoutine : NAP_ROUTINE).map(i => <CheckItem key={i.id} item={i} checked={!!checks[i.id]} onToggle={toggle} color={C.sage}/>)}
            </Accordion>
          )}

          <div style={{ padding:"13px 15px", borderRadius:11, background:T.faint, border:`1px dashed ${T.border}`, textAlign:"center" }}>
            <p style={{ fontSize:11.5, color:T.muted, lineHeight:1.6 }}>Check these off fresh each night as a real-time tracker — they reset with your progress.</p>
          </div>
        </>)}

        {/* ── TRAINING TAB ── */}
        {!isConsultant && tab === "training" && (<>
          <div style={{ padding:"12px 15px", borderRadius:13, background:`${mc}0e`, border:`1px solid ${mc}22`, marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:mc, marginBottom:5, fontFamily:font }}>{method.label}</div>
            <p style={{ fontSize:12.5, color:T.muted, lineHeight:1.65 }}>{method.description}</p>
          </div>

          {method.isFading ? (
            <Accordion title="Your Fading Schedule" emoji="🌒" color={mc} defaultOpen badge={fadingPhases.length===0?"Setup needed":undefined}>
              {fadingPhases.length === 0
                ? <p style={{ fontSize:13, color:T.muted, fontStyle:"italic", padding:"8px 0" }}>Your consultant hasn't entered the fading details yet. Use Consultant Access below to configure.</p>
                : (<>
                    <div style={{ marginBottom:12, padding:"10px 12px", borderRadius:9, background:T.notesBg }}>
                      <div style={{ fontFamily:mono, fontSize:11, color:T.muted }}>Prop: <span style={{ color:mc }}>{profile.fadingProp}</span></div>
                      <div style={{ fontFamily:mono, fontSize:11, color:T.muted, marginTop:2 }}>Reduce {profile.fadingReduceMins} min every {profile.fadingEveryDays} days</div>
                    </div>
                    <MiniBar done={fadingPhases.flatMap(p=>p.items).filter(i=>checks[i.id]).length} total={fadingPhases.flatMap(p=>p.items).length} color={mc}/>
                    {fadingPhases.map(phase => <Phase key={phase.id} phase={phase} checks={checks} onToggle={toggle} color={mc}/>)}
                  </>)
              }
            </Accordion>
          ) : (
            method.phases?.length > 0 && (
              <Accordion title={isLadder?"Confidence Steps":"Night Training"} emoji={isLadder?"🪜":"🌙"} color={mc} defaultOpen>
                <MiniBar done={method.phases.flatMap(p=>p.items).filter(i=>checks[i.id]).length} total={method.phases.flatMap(p=>p.items).length} color={mc}/>
                <div style={{ marginTop:10 }}>{method.phases.map(phase => <Phase key={phase.id} phase={phase} checks={checks} onToggle={toggle} color={mc}/>)}</div>
              </Accordion>
            )
          )}

          {method.hasNaps && method.napPhases?.length > 0 && (
            <Accordion title="Nap Training" emoji="🌤️" color={C.sage}>
              <p style={{ fontSize:12, color:T.muted, marginBottom:10, fontStyle:"italic", lineHeight:1.55 }}>Night sleep matures first. Naps follow 2–3 steps behind — completely normal.</p>
              <MiniBar done={method.napPhases.flatMap(p=>p.items).filter(i=>checks[i.id]).length} total={method.napPhases.flatMap(p=>p.items).length} color={C.sage}/>
              <div style={{ marginTop:10 }}>{method.napPhases.map(phase => <Phase key={phase.id} phase={phase} checks={checks} onToggle={toggle} color={C.sage}/>)}</div>
            </Accordion>
          )}

          {isOlderWithLadder && (
            <Accordion title="Bedtime Confidence Ladder (Add-On)" emoji="🪜" color={C.sky} subtle>
              <p style={{ fontSize:12, color:T.muted, marginBottom:10, fontStyle:"italic", lineHeight:1.55 }}>Use alongside your primary method if your child needs gradual parent withdrawal. Each step: 3–5 nights minimum.</p>
              <MiniBar done={METHODS.confidence_ladder.phases.flatMap(p=>p.items).filter(i=>checks[i.id]).length} total={METHODS.confidence_ladder.phases.flatMap(p=>p.items).length} color={C.sky}/>
              <div style={{ marginTop:10 }}>{METHODS.confidence_ladder.phases.map(phase => <Phase key={phase.id} phase={phase} checks={checks} onToggle={toggle} color={C.sky}/>)}</div>
            </Accordion>
          )}

          {isSchool && addons.map(addon => (
            <Accordion key={addon.id} title={addon.label} emoji="⚙️" color={addon.color} subtle>
              <p style={{ fontSize:12, color:T.muted, marginBottom:10, fontStyle:"italic", lineHeight:1.55 }}>{addon.description}</p>
              <MiniBar done={addon.items.filter(i=>checks[i.id]).length} total={addon.items.length} color={addon.color}/>
              {addon.items.map(i => <CheckItem key={i.id} item={i} checked={!!checks[i.id]} onToggle={toggle} color={addon.color}/>)}
            </Accordion>
          ))}

          <div style={{ padding:"13px 15px", borderRadius:11, background:T.faint, border:`1px dashed ${T.border}`, textAlign:"center" }}>
            <p style={{ fontSize:11.5, color:T.muted, lineHeight:1.6 }}>Progress isn't always linear — and that's okay. Every night forward is still forward.</p>
          </div>
        </>)}

        {/* ── FOR YOU TAB ── */}
        {!isConsultant && tab === "you" && (<>
          <div style={{ padding:"14px 16px", borderRadius:13, background:`${C.sage}10`, border:`1px solid ${C.sage}22`, marginBottom:14 }}>
            <p style={{ fontSize:13, color:T.muted, lineHeight:1.75, fontStyle:"italic" }}>"Your calm is the anchor that helps them settle. Before you go in — put your own oxygen mask on first."</p>
          </div>

          <Accordion title="Regulation Check-In" emoji="🌿" color={C.sage} defaultOpen>
            <p style={{ fontSize:12, color:T.muted, marginBottom:10, fontStyle:"italic" }}>Check in with yourself each night before you begin.</p>
            <MiniBar done={GROUND_ITEMS.filter(i=>checks[i.id]).length} total={GROUND_ITEMS.length} color={C.sage}/>
            {GROUND_ITEMS.map(i => <CheckItem key={i.id} item={i} checked={!!checks[i.id]} onToggle={toggle} color={C.sage}/>)}
          </Accordion>

          <Accordion title="Anchor Statements" emoji="⚓" color={C.purple}>
            {["They are safe.","I am supporting them.","This is temporary.","Crying is communication, not harm.","My calm is their anchor."].map((s,i) => (
              <div key={i} style={{ padding:"11px 0", borderBottom:`1px solid ${T.faint}`, fontSize:13.5, color:T.muted, fontStyle:"italic", fontFamily:font }}>"{s}"</div>
            ))}
          </Accordion>

          <Accordion title="Grounding Tools" emoji="🧘" color={C.warm}>
            {[
              {title:"4-6 Breathing", body:"Breathe in for 4 counts, out for 6. Do this 2–3 times before entering the room."},
              {title:"Drop the Shoulders", body:"Gently drop your shoulders down and back. Let your jaw unclench. Exhale slowly."},
              {title:"Orient to Safety", body:"Look around and name 3 things you can see that feel neutral or safe. Feel your feet on the floor."},
              {title:"5-4-3-2-1 Grounding", body:"5 things you see · 4 you touch · 3 you hear · 2 you smell · 1 you taste."},
              {title:"Butterfly Hug", body:"Cross arms over chest, hands on opposite shoulders. Tap alternating sides gently. Bilateral movement helps regulate your nervous system."},
            ].map((t,i) => (
              <div key={i} style={{ padding:"12px 0", borderBottom:`1px solid ${T.faint}` }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.warm, marginBottom:5, fontFamily:font }}>{t.title}</div>
                <div style={{ fontSize:13, color:T.muted, lineHeight:1.65, fontFamily:font }}>{t.body}</div>
              </div>
            ))}
          </Accordion>
        </>)}

        {/* ── CONSULTANT ACCESS ── */}
        <div style={{ marginTop:28, textAlign:"center", borderTop:`1px solid ${T.faint}`, paddingTop:24 }}>
          <button onClick={() => isConsultant ? setShowSetup(true) : setShowPin(true)}
            style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:10, padding:"9px 20px", color:T.muted, fontFamily:font, fontSize:11, letterSpacing:".08em", textTransform:"uppercase", cursor:"pointer", transition:"all .2s" }}>
            {isConsultant ? "✏️ Edit Plan" : "🔐 Consultant Access"}
          </button>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showPin && (
        <PinModal
          onSuccess={() => { setShowPin(false); setShowSetup(true); }}
          onCancel={() => setShowPin(false)}
          correctPin={resolvedUser?.consultant_pin}
        />
      )}
      {showSetup && (
        <SetupPanel
          profile={profile}
          intake={intake}
          onSave={f => { saveProfile(f); setChecksState({}); setShowSetup(false); }}
          onClose={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
