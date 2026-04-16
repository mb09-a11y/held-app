// ─── consultantStore.js ───────────────────────────────────────────────────────
// All localStorage reads/writes for the consultant side.
// Swap each function body for a Supabase call later — UI never changes.

import { useStorage, genId, now } from "../../../core/shared.jsx";

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_FAMILIES = [
  {
    id: "fam_chen",
    name: "Chen Family",
    parents: "Sarah & James Chen",
    nsState: "activated", // regulated | activated | overwhelmed
    nsTrend: [2, 2, 3, 4, 4], // 1–5 scale, last 5 days
    nsNote: "Activated 4 days running. Benji's rough nights are the likely driver.",
    children: [
      {
        id: "child_maya",
        name: "Maya",
        age: "9 months",
        emoji: "👶",
        status: "watch", // good | watch | urgent
        planId: "plan_maya",
        method: "settled_support",
        planDay: 6,
      },
      {
        id: "child_benji",
        name: "Benji",
        age: "3 years",
        emoji: "🧒",
        status: "urgent",
        planId: "plan_benji",
        method: "chair_method",
        planDay: 9,
      },
    ],
    lastMessage: "I don't know how much more of this I can do. 😢",
    lastMessageTime: "2h ago",
    unread: true,
    urgency: "urgent",
    insight: "Benji — night wakings up after nap >2h. Maya — on track, no action needed.",
    flags: ["Benji: undertired", "Parent NS: activated"],
    positives: ["Maya: improving"],
  },
  {
    id: "fam_sharma",
    name: "Sharma Family",
    parents: "Priya & Arjun Sharma",
    nsState: "regulated",
    nsTrend: [2, 2, 2, 3, 3],
    nsNote: "Slightly elevated. Day 5 anxiety typical — monitor tonight.",
    children: [
      {
        id: "child_leo",
        name: "Leo",
        age: "5 months",
        emoji: "🌙",
        status: "watch",
        planId: "plan_leo",
        method: "fading",
        planDay: 5,
      },
    ],
    lastMessage: "How long does this take?",
    lastMessageTime: "6h ago",
    unread: false,
    urgency: "watch",
    insight: "Day 5 regression window. Sleep latency increasing slightly — within normal range.",
    flags: ["Regression window"],
    positives: ["Method working"],
  },
  {
    id: "fam_okafor",
    name: "Okafor Family",
    parents: "Amara & Dele Okafor",
    nsState: "regulated",
    nsTrend: [3, 2, 2, 2, 1],
    nsNote: "Regulated and improving. Parent confidence increasing.",
    children: [
      {
        id: "child_rina",
        name: "Rina",
        age: "11 months",
        emoji: "⭐",
        status: "good",
        planId: "plan_rina",
        method: "chair_method",
        planDay: 14,
      },
    ],
    lastMessage: "Last night was amazing!",
    lastMessageTime: "1d ago",
    unread: false,
    urgency: "good",
    insight: "Sleep latency decreased 18 min this week. Night wakings down 4 → 1.",
    flags: [],
    positives: ["Improving", "Parent confident"],
  },
];

const SEED_PLANS = {
  plan_benji: {
    id: "plan_benji",
    childId: "child_benji",
    familyId: "fam_chen",
    method: "chair_method",
    methodLabel: "Chair Method",
    startDate: "2026-04-02",
    napCapMinutes: 120,
    consultantNotes: {
      night_7: "Parent reported significant protest — normal for this transition",
      night_9: "Nap was 1h 52m today — may affect settling tonight",
    },
    phases: [
      {
        id: "ph1", label: "Nights 1–3: Chair by the Crib",
        desc: "Sit next to crib. Voice + light touch to calm — NOT to sleep.",
        status: "done",
        items: [
          { id: "n1", text: "Night 1 complete", done: true },
          { id: "n2", text: "Night 2 complete", done: true },
          { id: "n3", text: "Night 3 complete", done: true },
        ],
      },
      {
        id: "ph2", label: "Nights 4–6: Chair in the Middle",
        desc: "Move chair to middle of the room.",
        status: "done",
        items: [
          { id: "n4", text: "Night 4 — wait 3 min before comfort", done: true },
          { id: "n5", text: "Night 5 — wait 5 min before comfort", done: true },
          { id: "n6", text: "Night 6 — wait 7 min before comfort", done: true },
        ],
      },
      {
        id: "ph3", label: "Night 7+: Leave the Room",
        desc: "Put child down awake, leave. Wait 10–15 min before responding.",
        status: "current",
        items: [
          { id: "n7", text: "Night 7 — leaving room, 10–15 min wait", done: true },
          { id: "n8", text: "Night 8 complete", done: true },
          { id: "n9", text: "Night 9 — tonight", done: false },
        ],
      },
    ],
  },
  plan_maya: {
    id: "plan_maya",
    childId: "child_maya",
    familyId: "fam_chen",
    method: "settled_support",
    methodLabel: "Settled Support",
    startDate: "2026-04-05",
    napCapMinutes: 90,
    consultantNotes: {},
    phases: [
      {
        id: "ph1", label: "Nights 1–3: Connected Comfort",
        desc: "Sit beside the crib. Pat and shush to calm — not to sleep.",
        status: "done",
        items: [
          { id: "n1", text: "Night 1 complete", done: true },
          { id: "n2", text: "Night 2 complete", done: true },
          { id: "n3", text: "Night 3 complete", done: true },
        ],
      },
      {
        id: "ph2", label: "Nights 4–6: Gentle Withdrawal",
        desc: "Hand resting on baby — no active patting unless escalating.",
        status: "current",
        items: [
          { id: "n4", text: "Night 4 complete", done: true },
          { id: "n5", text: "Night 5 complete", done: true },
          { id: "n6", text: "Night 6 — tonight", done: false },
        ],
      },
    ],
  },
  plan_leo: {
    id: "plan_leo",
    childId: "child_leo",
    familyId: "fam_sharma",
    method: "fading",
    methodLabel: "Fading",
    startDate: "2026-04-06",
    napCapMinutes: 90,
    consultantNotes: {},
    phases: [
      {
        id: "ph1", label: "Practicing stopping the prop while drowsy",
        desc: "Use prop until drowsy — not fully asleep — then put down.",
        status: "current",
        items: [
          { id: "n1", text: "Night 1 — prop to drowsy only", done: true },
          { id: "n2", text: "Night 2 complete", done: true },
          { id: "n3", text: "Night 3 complete", done: true },
          { id: "n4", text: "Night 4 complete", done: true },
          { id: "n5", text: "Night 5 — tonight", done: false },
        ],
      },
    ],
  },
  plan_rina: {
    id: "plan_rina",
    childId: "child_rina",
    familyId: "fam_okafor",
    method: "chair_method",
    methodLabel: "Chair Method",
    startDate: "2026-03-28",
    napCapMinutes: 90,
    consultantNotes: {},
    phases: [
      {
        id: "ph1", label: "Nights 1–3: Chair by the Crib", status: "done",
        items: [
          { id: "n1", text: "Night 1 complete", done: true },
          { id: "n2", text: "Night 2 complete", done: true },
          { id: "n3", text: "Night 3 complete", done: true },
        ],
      },
      {
        id: "ph2", label: "Nights 4–6: Chair in the Middle", status: "done",
        items: [
          { id: "n4", text: "Night 4 complete", done: true },
          { id: "n5", text: "Night 5 complete", done: true },
          { id: "n6", text: "Night 6 complete", done: true },
        ],
      },
      {
        id: "ph3", label: "Night 7+: Leave the Room", status: "done",
        items: [
          { id: "n7", text: "Night 7+ — independently sleeping 🎉", done: true },
        ],
      },
    ],
  },
};

const SEED_INTAKE = {
  child_benji: {
    sleep_location: "Crib in own room",
    sleep_props: "Rocking to sleep, white noise",
    typical_bedtime: "8:00pm",
    bedtime_worst: "9:30pm",
    night_wakings_description: "2–4 times per night, needs rocking back",
    consistency_capacity: 3,
    stress_gag_vomit: false,
    activity: 4, routine: 3, sociability: 3,
    adaptability: 2, intensity: 5, sensitivity: 4,
    mood: 3, distractibility: 3, persistence: 4,
    ns_birth_body: "Emergency c-section after prolonged labor. 'It was traumatic.'",
    ns_parent_anxiety: true,
    ns_postpartum_concerns: true,
    ns_unresolved: "Still feel guilty about the birth.",
    goals: "Benji sleeping 7pm–6am with no wakings in 3 weeks",
    non_negotiables: "No cry-it-out. I can't do it.",
    magic_wand: "He just goes to sleep on his own and sleeps all night.",
  },
  child_maya: {
    sleep_location: "Crib in own room",
    sleep_props: "Nursing to sleep",
    typical_bedtime: "7:00pm",
    night_wakings_description: "1–2 wakings, nurses back to sleep",
    consistency_capacity: 4,
    activity: 3, routine: 4, sociability: 3,
    adaptability: 3, intensity: 2, sensitivity: 3,
    mood: 4, distractibility: 2, persistence: 3,
    ns_parent_anxiety: true,
    goals: "Sleep through the night independently",
    non_negotiables: "Stay responsive, no extinction",
    magic_wand: "She just sleeps.",
  },
};

// Seed sleep session data (mirrors what parent would log)
const SEED_SESSIONS = {
  child_benji: [
    { id: "s1", type: "night", emoji: "🌙", date: "Thu, Apr 9", time: "09:00 PM", duration: "11h 46m", settling: "11m", flag: null },
    { id: "s2", type: "nap",   emoji: "☀️", date: "Thu, Apr 9", time: "01:30 PM", duration: "1h 52m",  settling: "13m", flag: "Long" },
    { id: "s3", type: "night", emoji: "🌙", date: "Wed, Apr 8", time: "09:38 PM", duration: "11h 10m", settling: "2m",  flag: null },
    { id: "s4", type: "nap",   emoji: "☀️", date: "Wed, Apr 8", time: "02:15 PM", duration: "1h 30m",  settling: "8m",  flag: null },
    { id: "s5", type: "night", emoji: "🌙", date: "Tue, Apr 7", time: "09:05 PM", duration: "12h 25m", settling: "60m", flag: "Long settle" },
    { id: "s6", type: "nap",   emoji: "☀️", date: "Tue, Apr 7", time: "01:45 PM", duration: "1h 35m",  settling: "0m",  flag: null },
    { id: "s7", type: "night", emoji: "🌙", date: "Mon, Apr 6", time: "08:40 PM", duration: "10h 20m", settling: "35m", flag: "Long settle" },
  ],
  child_maya: [
    { id: "m1", type: "night", emoji: "🌙", date: "Thu, Apr 9", time: "07:10 PM", duration: "11h 30m", settling: "8m",  flag: null },
    { id: "m2", type: "nap",   emoji: "☀️", date: "Thu, Apr 9", time: "10:00 AM", duration: "1h 20m",  settling: "5m",  flag: null },
    { id: "m3", type: "night", emoji: "🌙", date: "Wed, Apr 8", time: "07:00 PM", duration: "11h 45m", settling: "6m",  flag: null },
    { id: "m4", type: "nap",   emoji: "☀️", date: "Wed, Apr 8", time: "10:15 AM", duration: "1h 15m",  settling: "4m",  flag: null },
  ],
};

const SEED_NS_LOG = {
  fam_chen: [
    { id: "ns1", date: "Apr 9", state: "overwhelmed", note: "Three wakings last night" },
    { id: "ns2", date: "Apr 8", state: "activated",   note: "Tired but managing" },
    { id: "ns3", date: "Apr 7", state: "activated",   note: "" },
    { id: "ns4", date: "Apr 6", state: "activated",   note: "Long night" },
    { id: "ns5", date: "Apr 5", state: "regulated",   note: "Good day" },
  ],
  fam_sharma: [
    { id: "ns6", date: "Apr 9", state: "activated", note: "Anxious about tonight" },
    { id: "ns7", date: "Apr 8", state: "regulated",  note: "" },
  ],
  fam_okafor: [
    { id: "ns8", date: "Apr 9", state: "regulated", note: "Feeling hopeful!" },
    { id: "ns9", date: "Apr 8", state: "regulated", note: "" },
  ],
};

// ─── HOOKS ────────────────────────────────────────────────────────────────────

export function useFamilies() {
  const [families, setFamilies] = useStorage("cons_families", SEED_FAMILIES);
  return { families, setFamilies };
}

export function usePlans() {
  const [plans, setPlans] = useStorage("cons_plans", SEED_PLANS);

  const updatePlan = (planId, updater) => {
    setPlans(prev => ({
      ...prev,
      [planId]: typeof updater === "function" ? updater(prev[planId]) : { ...prev[planId], ...updater },
    }));
  };

  const toggleItem = (planId, phaseId, itemId) => {
    setPlans(prev => {
      const plan = prev[planId];
      if (!plan) return prev;
      return {
        ...prev,
        [planId]: {
          ...plan,
          phases: plan.phases.map(ph =>
            ph.id !== phaseId ? ph : {
              ...ph,
              items: ph.items.map(it =>
                it.id !== itemId ? it : { ...it, done: !it.done }
              ),
            }
          ),
        },
      };
    });
  };

  const addConsultantNote = (planId, nightKey, note) => {
    setPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        consultantNotes: { ...prev[planId]?.consultantNotes, [nightKey]: note },
      },
    }));
  };

  const changeMethod = (planId, method, methodLabel) => {
    setPlans(prev => ({
      ...prev,
      [planId]: { ...prev[planId], method, methodLabel },
    }));
  };

  return { plans, updatePlan, toggleItem, addConsultantNote, changeMethod };
}

export function useIntake() {
  const [intake] = useStorage("cons_intake", SEED_INTAKE);
  return { intake };
}

export function useSessions() {
  const [sessions] = useStorage("cons_sessions", SEED_SESSIONS);
  return { sessions };
}

export function useNSLog() {
  const [nsLog] = useStorage("cons_nslog", SEED_NS_LOG);
  return { nsLog };
}

export function useConsultantNotes() {
  const [notes, setNotes] = useStorage("cons_notes", {});

  const addNote = (familyId, childId, text, tags) => {
    const key = childId || familyId;
    setNotes(prev => ({
      ...prev,
      [key]: [{ id: genId(), text, tags, createdAt: now() }, ...(prev[key] || [])],
    }));
  };

  return { notes, addNote };
}

export function useMessages() {
  const [messages, setMessages] = useStorage("cons_messages", {
    fam_chen: [
      { id: "msg1", from: "parent", text: "She went down at 7 but woke up at 9 again. Third night in a row.", time: "Yesterday 8:12 PM" },
      { id: "msg2", from: "consultant", text: "That's really hard. Three nights in a row is exhausting. I've been watching her data too — can I share what I'm seeing?", time: "8:14 PM" },
      { id: "msg3", from: "parent", text: "Yes please. I feel like I'm failing her.", time: "10:02 PM" },
      { id: "msg4", from: "consultant", text: "You are not failing her. What I'm seeing is a pattern I can explain — and adjust. Her nap yesterday was 2h 18m, keeping her undertired at bedtime.", time: "10:04 PM" },
      { id: "msg5", from: "parent", text: "She woke up 3 times. I don't know how much more of this I can do. 😢", time: "This morning 7:48 AM" },
    ],
    fam_sharma: [
      { id: "msg6", from: "parent", text: "How long does this take?", time: "Yesterday 2:00 PM" },
      { id: "msg7", from: "consultant", text: "Great question. Most families see real change by night 7–10. You're on night 5 — right in the hardest stretch. Hang in there.", time: "2:10 PM" },
    ],
    fam_okafor: [
      { id: "msg8", from: "parent", text: "Last night was amazing! She went down in 5 minutes!", time: "Yesterday 7:00 AM" },
      { id: "msg9", from: "consultant", text: "That is incredible! This is exactly what we've been working toward. How do you feel?", time: "7:15 AM" },
    ],
  });

  const sendMessage = (familyId, text) => {
    setMessages(prev => ({
      ...prev,
      [familyId]: [
        ...(prev[familyId] || []),
        { id: genId(), from: "consultant", text, time: "Just now" },
      ],
    }));
  };

  return { messages, sendMessage };
}

// Sleep stats derived from sessions
export function useSleepStats(childId) {
  const { sessions } = useSessions();
  const childSessions = sessions[childId] || [];
  const nights = childSessions.filter(s => s.type === "night");
  const naps   = childSessions.filter(s => s.type === "nap");

  const parseMin = str => {
    if (!str || str === "—") return 0;
    const h = (str.match(/(\d+)h/) || [0, 0])[1];
    const m = (str.match(/(\d+)m/) || [0, 0])[1];
    return Number(h) * 60 + Number(m);
  };

  const avgNight = nights.length
    ? Math.round(nights.reduce((a, s) => a + parseMin(s.duration), 0) / nights.length)
    : 0;
  const avgNap = naps.length
    ? Math.round(naps.reduce((a, s) => a + parseMin(s.duration), 0) / naps.length)
    : 0;
  const avgSettling = nights.length
    ? Math.round(nights.reduce((a, s) => a + parseMin(s.settling), 0) / nights.length)
    : 0;
  const flaggedNaps = naps.filter(s => s.flag === "Long").length;

  const fmtMin = m => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  return {
    avgNightStr: fmtMin(avgNight),
    avgNapStr: fmtMin(avgNap),
    avgSettlingStr: fmtMin(avgSettling),
    flaggedNaps,
    sessions: childSessions,
    nights,
    naps,
  };
}
