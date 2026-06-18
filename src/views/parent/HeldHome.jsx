// src/views/parent/HeldHome.jsx
// Held-style parent home screen.
// Reads from AppCtx (currentUser, activeChild, activeFamily, consultants).
// Props: onSOS, onNSCheckin, onMorningMoment, onEveningClose, setTab, onOpenDrawer

import { useState, useEffect, useMemo, useCallback } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { HeldCheckin, useFamilyState, useCheckinHistory } from "./ParentHome.jsx";
import { supabase } from "../../lib/supabase.js";
import { getCurrentWonderWeeksLeap, getMilestonesForAge } from "../../modules/milestones/data/milestones.js";
import { useNextSleep } from "../../modules/sleep/sleepHelpers.js";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getGreeting(name) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${time}${name ? `, ${name.split(" ")[0]}` : ""}.`;
}

function ageLabel(dob) {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44));
  return months < 24 ? `${months}mo` : `${Math.floor(months / 12)}y`;
}

const DAILY_PROMPTS = [
  { invitation: "You don't have to be perfect today — just present.", reset: "Put one hand on your chest, one on your stomach. Take 3 slow breaths.", script: "\"I'm here with you. We'll figure this out together.\"" },
  { invitation: "Pause before you respond. Your nervous system leads the moment.", reset: "Drop your shoulders. Unclench your jaw. Inhale for 4, exhale for 6.", script: "\"Give me a second… I want to respond, not react.\"" },
  { invitation: "A little frustration is okay. It's what you do with it that matters.", reset: "Name it silently: \"I'm feeling frustrated.\" Let it exist without acting.", script: "\"I'm feeling frustrated, so I'm going to slow down before we keep going.\"" },
  { invitation: "Try taking three slow breaths before replying to your child.", reset: "Breathe in through your nose, out through your mouth — slow and audible.", script: "\"Okay, I'm ready now.\"" },
  { invitation: "Connection first. Correction can come later.", reset: "Get physically lower — kneel or sit near your child.", script: "\"I see you're upset. I'm here. We'll talk about what happened.\"" },
  { invitation: "Notice what's coming up for you before focusing on your child.", reset: "Ask yourself: \"What am I feeling right now?\" No fixing, just noticing.", script: "\"I need a quick pause so I can show up the way I want to.\"" },
  { invitation: "You can hold a boundary and stay calm. Both can be true.", reset: "Stand or sit tall. Feel your feet grounded.", script: "\"I won't let you hit. I'm right here with you.\"" },
  { invitation: "Let this moment be messy without needing to fix it immediately.", reset: "Take a breath and soften your eyes. Release urgency.", script: "\"We don't have to solve this right now.\"" },
  { invitation: "Your child doesn't need perfection — they need your presence.", reset: "Make eye contact. Put your phone down.", script: "\"You have my attention right now.\"" },
  { invitation: "Slow down. You don't have to rush through this moment.", reset: "Intentionally move 10% slower in your next action.", script: "\"Let's take this one step at a time.\"" },
  { invitation: "If you raised your voice, repair is always available.", reset: "Exhale fully. Release the tension in your chest.", script: "\"I didn't like how I just spoke. I'm sorry. Let's try again.\"" },
  { invitation: "Observe before you react. What's actually happening here?", reset: "Silently narrate: \"They're crying… they're tired… they're overwhelmed.\"", script: "\"Something feels hard for you right now.\"" },
  { invitation: "Meet your child where they are, not where you wish they'd be.", reset: "Adjust your expectations in real time.", script: "\"This feels big for you, even if it seems small.\"" },
  { invitation: "You're allowed to take a breath before deciding what to do next.", reset: "One full inhale, one full exhale — no rush.", script: "\"I'm thinking about what to do here.\"" },
  { invitation: "This is a moment to guide, not control.", reset: "Relax your hands. Release physical tension.", script: "\"I'm going to help you through this.\"" },
  { invitation: "Let go of the \"right\" response — choose a connected one.", reset: "Ask: \"What would connection look like right now?\"", script: "\"Let's figure this out together.\"" },
  { invitation: "Your calm is more powerful than your control.", reset: "Lengthen your exhale. Slow your body down.", script: "\"I'm here. You're safe.\"" },
  { invitation: "Notice your body — are you tense, rushed, overwhelmed?", reset: "Do a quick body scan from head to toe.", script: "\"I need to slow myself down for a second.\"" },
  { invitation: "Stay in the gray. It doesn't have to be all or nothing.", reset: "Release the need for a perfect solution.", script: "\"We can find something that works for both of us.\"" },
  { invitation: "You can be firm and kind at the same time.", reset: "Soften your tone without changing your boundary.", script: "\"I won't let that happen, and I'm here to help you.\"" },
  { invitation: "Before correcting your child, check in with yourself.", reset: "Ask: \"Am I reacting or responding?\"", script: "\"Give me a second, I want to handle this well.\"" },
  { invitation: "Not every moment needs a lesson. Some just need presence.", reset: "Sit beside your child without talking for 10 seconds.", script: "\"I'm right here.\"" },
  { invitation: "Let your response come from intention, not reaction.", reset: "Pause → breathe → choose your next move.", script: "\"Here's what we're going to do.\"" },
  { invitation: "Your child's behavior is communication — what are they telling you?", reset: "Ask: \"What need is underneath this?\"", script: "\"Are you feeling overwhelmed or needing help?\"" },
  { invitation: "You don't have to solve this right now. Stay with them instead.", reset: "Place a gentle hand on their back or shoulder.", script: "\"I'm here with you while this feels hard.\"" },
  { invitation: "Take one small step toward connection today.", reset: "Offer a hug, smile, or sit close.", script: "\"Come sit with me for a minute.\"" },
  { invitation: "Trust yourself — you know your child better than anyone.", reset: "Take a breath and ground into your body.", script: "\"I've got this.\"" },
  { invitation: "It's okay if this feels hard. You're still showing up.", reset: "Acknowledge yourself: \"This is hard, and I'm here.\"", script: "\"We're figuring this out together.\"" },
  { invitation: "Choose curiosity over control in this moment.", reset: "Ask one genuine question before reacting.", script: "\"What happened from your perspective?\"" },
  { invitation: "Come back to center. That's where your parenting lives.", reset: "Feel your feet. Take a slow breath. Return to your body.", script: "\"Let's reset together.\"" },
];

const RETURN_LOOPS = [
  {
    id: "preventative",
    label: "Preventative",
    emoji: "🌿",
    desc: "Use this when you're okay — to stay that way.",
    cta: "Check in →",
    target: "ns",
  },
  {
    id: "pattern",
    label: "Pattern",
    emoji: "✦",
    desc: "Something keeps happening. Let's understand it.",
    cta: "See patterns →",
    target: "insights",
  },
  {
    id: "refuge",
    label: "Refuge",
    emoji: "🌙",
    desc: "It's been a hard day. Come here.",
    cta: "Find support →",
    target: "sos",
  },
];

// ─── RECENT NS PULSE ─────────────────────────────────────────────────────────
function useRecentRegulationCheckins(userId, refreshKey = 0) {
  const [checkins, setCheckins] = useState([]);
  const fetch = useCallback(() => {
    if (!userId) return;
    const since14 = new Date(Date.now() - 14 * 86400000).toISOString();
    supabase
      .from("regulation_checkins")
      .select("state, checked_in_at, source")
      .eq("user_id", userId)
      .gte("checked_in_at", since14)
      .order("checked_in_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setCheckins(data || []));
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch, refreshKey]);


  return checkins;
}

// ─── NS CHECK-IN COUNT (for jar/leaves card) ──────────────────────────────────
function useNSCheckinCount(userId) {
  const [count, setCount] = useState(null);
  const fetch = useCallback(() => {
    if (!userId) return;
    supabase
      .from("regulation_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [userId]);
  useEffect(() => { fetch(); }, [fetch]);
  return count;
}

// ─── FOREST STAGE HELPERS ─────────────────────────────────────────────────────
const SUPABASE_FOREST_BASE = "https://fzokhiqiulflvgkbzqel.supabase.co/storage/v1/object/public/forest-stages";

function getForestStage(totalCheckins) {
  const count = totalCheckins ?? 0;
  return Math.min(Math.floor(count / 10) + 1, 16);
}

function getForestProgress(totalCheckins) {
  const count = totalCheckins ?? 0;
  return (count % 10) / 10; // 0.0–1.0 within current stage
}

function getForestImageUrl(stage, orientation = "landscape") {
  const padded = String(stage).padStart(2, "0");
  return `${SUPABASE_FOREST_BASE}/${orientation}/stage-${padded}.png`;
}

// ─── FOREST JOURNEY MODAL ─────────────────────────────────────────────────────
function ForestJourneyModal({ stage, totalCheckins, onClose, onCheckin, T }) {
  const progress = getForestProgress(totalCheckins);
  const checkinIntoStage = (totalCheckins ?? 0) % 10;
  const portraitUrl = getForestImageUrl(stage, "portrait");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0a1608",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Portrait image */}
      <div style={{ position: "relative", width: "100%", flex: 1 }}>
        <img
          src={portraitUrl}
          alt={`Forest stage ${stage}`}
          style={{
            width: "100%",
            display: "block",
            objectFit: "cover",
            minHeight: "60vh",
          }}
        />

        {/* Top gradient + close */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 40%)",
          padding: "16px 18px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{
            fontFamily: font, fontSize: 9, letterSpacing: ".14em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.65)",
          }}>
            Your forest journey
          </div>
          <button onClick={onClose} style={{
            background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "50%", width: 32, height: 32,
            color: "rgba(255,255,255,0.8)", fontSize: 16,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Bottom gradient + stage info */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(10,22,8,0.95) 0%, rgba(10,22,8,0.6) 60%, transparent 100%)",
          padding: "32px 22px 24px",
        }}>
          {/* Stage pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 20, padding: "3px 10px", marginBottom: 10,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#9acd60" }} />
            <span style={{ fontFamily: font, fontSize: 9, color: "rgba(255,255,255,0.65)", letterSpacing: ".08em" }}>
              STAGE {stage} OF 16
            </span>
          </div>

          {/* Progress line */}
          <div style={{ fontFamily: font, fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>
            {checkinIntoStage} of 10 check-ins to next stage
          </div>

          {/* Vine progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{
              flex: 1, height: 4,
              background: "rgba(255,255,255,0.12)", borderRadius: 4, overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${Math.round(progress * 100)}%`,
                background: "linear-gradient(to right, #4a7828, #8ac848)",
                borderRadius: 4,
                transition: "width 0.6s ease",
              }} />
            </div>
            <span style={{ fontSize: 13 }}>🌿</span>
            <span style={{ fontFamily: font, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              {totalCheckins ?? 0} leaves
            </span>
          </div>

          {/* CTA */}
          <button onClick={() => { onClose(); onCheckin(); }} style={{
            width: "100%", padding: "15px",
            borderRadius: 14, border: "none",
            background: "linear-gradient(135deg, #2e5a18, #4a8828)",
            color: "#fff", fontFamily: font, fontSize: 14,
            fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(74,136,40,0.35)",
          }}>
            Check in to grow your forest →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FOREST BANNER ────────────────────────────────────────────────────────────
function ForestBanner({ stage, totalCheckins, invitation, onTap, T }) {
  const progress = getForestProgress(totalCheckins);
  const landscapeUrl = getForestImageUrl(stage, "landscape");
  const checkinIntoStage = (totalCheckins ?? 0) % 10;

  return (
    <div
      onClick={onTap}
      style={{
        position: "relative", width: "100%",
        overflow: "hidden",
        marginBottom: 0, cursor: "pointer",
      }}
    >
      {/* Landscape image */}
      <img
        src={landscapeUrl}
        alt={`Forest stage ${stage}`}
        style={{
          width: "100%", height: 200,
          objectFit: "cover", objectPosition: "center 30%",
          display: "block",
        }}
      />

      {/* Full gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(8,14,6,0.72) 0%, rgba(8,14,6,0.15) 42%, rgba(8,14,6,0.0) 55%, rgba(8,14,6,0.78) 78%, rgba(8,14,6,0.94) 100%)",
        pointerEvents: "none",
      }} />

      {/* TOP — invitation copy */}
      <div style={{
        position: "absolute", top: 13, left: 16, right: 16,
        textAlign: "center", pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: font, fontSize: 9, letterSpacing: ".14em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.55)",
          marginBottom: 6,
        }}>
          Today's Invitation
        </div>
        <div style={{
          fontFamily: serif, fontStyle: "italic", fontSize: 14,
          color: "rgba(255,255,255,0.92)", lineHeight: 1.45,
        }}>
          "{invitation}"
        </div>
      </div>

      {/* Stage pill — top right */}
      <div style={{
        position: "absolute", top: 13, right: 14,
        display: "inline-flex", alignItems: "center", gap: 4,
        background: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 20, padding: "3px 9px",
      }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#9acd60" }} />
        <span style={{ fontFamily: font, fontSize: 8.5, color: "rgba(255,255,255,0.6)", letterSpacing: ".06em" }}>
          {stage}/16
        </span>
      </div>

      {/* BOTTOM — CTA + vine bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 15px 13px" }}>
        <div style={{
          fontFamily: font, fontSize: 10, letterSpacing: ".1em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.6)",
          marginBottom: 7, textAlign: "center",
        }}>
          Tap to explore your journey
        </div>

        {/* Vine progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            flex: 1, height: 4,
            background: "rgba(255,255,255,0.12)", borderRadius: 4, overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${Math.round(progress * 100)}%`,
              background: "linear-gradient(to right, #4a7828, #8ac848)",
              borderRadius: 4,
            }} />
          </div>
          <span style={{ fontSize: 12 }}>🌿</span>
          <span style={{ fontFamily: font, fontSize: 9.5, color: "rgba(255,255,255,0.45)" }}>
            {checkinIntoStage}/10
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── STREAK MESSAGES per tier ─────────────────────────────────────────────────
const STREAK_MESSAGES = {
  zero:  ["Log your first check-in to start your streak."],
  low:   [                                           // 1–6 days
    "X days of checking in. Every one counts.",
    "X days in. You're building something.",
    "X days of showing up for yourself.",
  ],
  week:  [                                           // 7–13 days
    "X days of noticing your system. That's a pattern forming.",
    "X days in a row. Your nervous system is getting used to being seen.",
    "X days of checking in. The data is starting to tell a story.",
  ],
  mid:   [                                           // 14–29 days
    "X days. Your nervous system is starting to trust the practice.",
    "X days of consistent noticing. That's not routine — that's regulation.",
    "X days in. You're building real capacity here.",
  ],
  high:  [                                           // 30+ days
    "X days. This is what a regulated parent looks like.",
    "X days in a row. Your roots are deep.",
    "X days. Thirty days of showing up — that's your foundation.",
  ],
};

function getStreakMessage(streak) {
  if (streak === 0) return STREAK_MESSAGES.zero[0];
  const pool = streak >= 30 ? STREAK_MESSAGES.high
    : streak >= 14 ? STREAK_MESSAGES.mid
    : streak >= 7  ? STREAK_MESSAGES.week
    : STREAK_MESSAGES.low;
  const msg = pool[streak % pool.length];
  return msg.replace("X", streak);
}

// ─── ALL-TIME STREAK HOOK ─────────────────────────────────────────────────────
// Fetches enough history to calculate the current consecutive streak
// and determine which milestones (10/20/30) have ever been reached.
function useCheckinStreak(userId) {
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    milestonesEver: { 10: false, 20: false, 30: false },
    loading: true,
  });

  const compute = useCallback(() => {
    if (!userId) { setStreakData(d => ({ ...d, loading: false })); return; }
    // Fetch last 90 days — enough to find a 30-day streak plus buffer
    const since90 = new Date(Date.now() - 90 * 86400000).toISOString();
    supabase
      .from("regulation_checkins")
      .select("checked_in_at")
      .eq("user_id", userId)
      .gte("checked_in_at", since90)
      .order("checked_in_at", { ascending: false })
      .then(({ data }) => {
        const logs = data || [];
        // Build set of unique days (local date string)
        const daySet = new Set(logs.map(l => new Date(l.checked_in_at).toDateString()));

        // Current consecutive streak — if today has no check-in yet, start from yesterday
        let streak = 0;
        const todayStr = new Date().toDateString();
        const startOffset = daySet.has(todayStr) ? 0 : 1;
        for (let i = startOffset; i < 90 + startOffset; i++) {
          const d = new Date(Date.now() - i * 86400000).toDateString();
          if (daySet.has(d)) streak++;
          else break;
        }

        // Best ever streak in the 90-day window (to detect milestone unlocks)
        // Walk all unique days sorted descending and find longest run
        const sortedDays = Array.from(daySet)
          .map(d => new Date(d).getTime())
          .sort((a, b) => b - a);

        let bestStreak = 0;
        let run = 0;
        for (let i = 0; i < sortedDays.length; i++) {
          if (i === 0) { run = 1; continue; }
          const prev = sortedDays[i - 1];
          const curr = sortedDays[i];
          const diffDays = Math.round((prev - curr) / 86400000);
          if (diffDays === 1) { run++; }
          else { bestStreak = Math.max(bestStreak, run); run = 1; }
        }
        bestStreak = Math.max(bestStreak, run, streak);

        setStreakData({
          currentStreak: streak,
          milestonesEver: {
            10: bestStreak >= 10,
            20: bestStreak >= 20,
            30: bestStreak >= 30,
          },
          loading: false,
        });
      });
  }, [userId]);

  useEffect(() => { compute(); }, [compute]);

  return streakData;
}

// ─── MILESTONE UNLOCK WRITER ──────────────────────────────────────────────────
// Called once per session when a new milestone is detected — writes to profiles
async function unlockStreakMilestone(userId, milestoneKey, currentMilestones) {
  if (!userId || currentMilestones?.[milestoneKey]) return; // already unlocked
  const updated = { ...currentMilestones, [milestoneKey]: true };
  await supabase
    .from("profiles")
    .update({ streak_milestones: updated })
    .eq("id", userId);
}

function useRecentCheckin(userId, refreshKey = 0) {
  const [checkin, setCheckin] = useState(null);
  const fetch = useCallback(() => {
    if (!userId) return;
    supabase
      .from("regulation_checkins")
      .select("state, checked_in_at")
      .eq("user_id", userId)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setCheckin(data));
  }, [userId]);
  useEffect(() => { fetch(); }, [fetch, refreshKey]);
  return checkin;
}

// ─── RECENT SLEEP ─────────────────────────────────────────────────────────────
function useRecentSleep(familyId, childId) {
  const [data, setData] = useState({ totalMs: 0, sessions: 0, lastWake: null, openSession: null });
  useEffect(() => {
    if (!familyId) return;
    const since = new Date(Date.now() - 86400000).toISOString();
    let q = supabase.from("sleep_logs")
      .select("type, ts, end_ts, total_sleep_ms, session_type, fell_asleep_ts")
      .eq("family_id", familyId)
      .gte("ts", since)
      .order("ts", { ascending: false });
    if (childId) q = q.eq("child_id", childId);
    q.then(({ data: logs }) => {
      const allSessions = (logs || []).filter(l => l.type === "sleep_session");
      const completed = allSessions.filter(l => l.end_ts);
      const totalMs = completed.reduce((s, l) => s + (l.total_sleep_ms || 0), 0);
      const lastWake = completed[0]?.end_ts || null;
      const openSession = allSessions.find(l => !l.end_ts) || null;
      setData({ totalMs, sessions: completed.length, lastWake, openSession });
    });
  }, [familyId, childId]);
  return data;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
// ─── HELD CHECKIN INLINE ─────────────────────────────────────────────────────
// Wraps HeldCheckin for use inside the invitation card on HeldHome.
// Overrides the idle state to match "Need a friend?" framing.
function HeldCheckinInline({ familyState, patterns, saveCheckin }) {
  const T = useT();
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
        onClick={() => setExpanded(true)}
      >
        <div>
          <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: T.text, marginBottom: 2 }}>
            Need a friend?
          </div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>
            I'm here to listen — no structure needed
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setExpanded(true); }}
          style={{
            padding: "9px 16px", borderRadius: 24, border: "none",
            background: T.teal, color: "#fff",
            fontFamily: font, fontSize: 13, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          Talk →
        </button>
      </div>
    );
  }

  // Expanded: show full HeldCheckin flow inline
  return (
    <div style={{ marginTop: 4 }}>
      <HeldCheckin
        familyState={familyState}
        patterns={patterns}
        saveCheckin={saveCheckin}
      />
    </div>
  );
}

export function HeldHome({ onSOS, onNSCheckin, onMorningMoment, onEveningClose, setTab, onScripts, onOpenDrawer, onNotifications, onGrounding, checkinRefreshKey = 0, familyStateProp = null }) {
  const T = useT();
  const { currentUser, activeChild, activeFamily, canAccessFullPattern } = useApp();

  // ── Checkin flow data ──
  const { familyState: fetchedFamilyState, refresh: refreshFamilyState } = useFamilyState(activeFamily?.id, activeChild?.id, currentUser?.id);
  const familyState = familyStateProp ?? fetchedFamilyState;

  // Re-fetch when a check-in completes
  useEffect(() => {
    if (checkinRefreshKey > 0) refreshFamilyState?.();
  }, [checkinRefreshKey]);
  const { patterns, saveCheckin } = useCheckinHistory(currentUser?.id, activeFamily?.id);

  const checkin = useRecentCheckin(currentUser?.id, checkinRefreshKey);
  const recentRegCheckins = useRecentRegulationCheckins(currentUser?.id, checkinRefreshKey);
  const nsCheckinCount = useNSCheckinCount(currentUser?.id);
  const { currentStreak, milestonesEver } = useCheckinStreak(currentUser?.id);

  // ── Forest stage ──
  const [showJourney, setShowJourney] = useState(false);
  const forestStage = getForestStage(nsCheckinCount);
  const forestProgress = getForestProgress(nsCheckinCount);
  const { nextSleepStr, minsUntil: minsUntilSleep, isSleeping } = useNextSleep(
    activeFamily?.id, activeChild?.id, activeChild?.dob
  );

  const greeting = getGreeting(currentUser?.name);

  // Unlock streak milestones into profiles when newly reached — one-time, permanent
  useEffect(() => {
    if (!currentUser?.id || !milestonesEver) return;
    // We need the stored milestones to avoid double-writing — fetch inline
    supabase
      .from("profiles")
      .select("streak_milestones")
      .eq("id", currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        const stored = data?.streak_milestones || {};
        [10, 20, 30].forEach(m => {
          if (milestonesEver[m] && !stored[m]) {
            unlockStreakMilestone(currentUser.id, m, stored);
          }
        });
      });
  }, [currentUser?.id, milestonesEver?.[10], milestonesEver?.[20], milestonesEver?.[30]]); // eslint-disable-line
  const childName = activeChild?.name || "your little one";
  const childAge = activeChild?.dob ? ageLabel(activeChild.dob) : null;

  // Daily prompt — cycles by day of year so it's consistent for all users on same day
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const todayPrompt = DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
  const invitation = todayPrompt.invitation;

  // Detect whether morning or evening check-in has already happened today
  const today = new Date().toDateString();
  const doneMorningToday = recentRegCheckins.some(c =>
    new Date(c.checked_in_at).toDateString() === today &&
    c.source === "morning_moment"
  );
  const doneEveningToday = recentRegCheckins.some(c =>
    new Date(c.checked_in_at).toDateString() === today &&
    c.source === "evening_close"
  );

  // 14-day rolling count — any check-in on a given day counts
  const uniqueDaysCheckedIn = new Set(
    recentRegCheckins.map(c => new Date(c.checked_in_at).toDateString())
  ).size;

  // ── SCENARIO ENGINE — decides what the app says ──────────────────────────
  const scenario = useMemo(() => {
    const hr = new Date().getHours();
    const sleepSessions = familyState?.sleepData?.weekSessions || [];
    const lastNight = sleepSessions.filter(s =>
      s.session_type === "night" && s.end_ts &&
      new Date(s.ts).toDateString() === new Date(Date.now() - 86400000).toDateString()
    );
    const roughLastNight = lastNight.length > 0 &&
      lastNight.some(s => {
        const hrs = s.total_sleep_ms ? s.total_sleep_ms / 3600000
          : s.end_ts ? (new Date(s.end_ts) - new Date(s.ts)) / 3600000 : null;
        return hrs !== null && hrs < 7;
      });

    const activatedStates = recentRegCheckins.filter(c =>
      ["Fight","Flight","Freeze","Shutdown","Stretched"].includes(c.state)
    );
    const morningCheckins = recentRegCheckins.filter(c =>
      new Date(c.checked_in_at).getHours() < 12
    );
    const hasNoData = recentRegCheckins.length === 0 && sleepSessions.length === 0;

    // Scenario A: rough last night
    if (roughLastNight && hr < 14) {
      return {
        id: "rough_night",
        headline: "Last night was rough. Let's keep today lighter.",
        sub: "Your window of tolerance is smaller after broken sleep — that's physiology, not weakness.",
        cta1: { label: "1-minute reset", action: "library" },
        cta2: { label: "What to expect today", action: "insights" },
      };
    }

    // Scenario B: morning is the hardest time (pattern detected)
    if (morningCheckins.length >= 3 && activatedStates.length >= 2 && hr < 11) {
      return {
        id: "morning_pattern",
        headline: "Mornings have been the hardest this week.",
        sub: "You're not imagining it — your data shows a real pattern. Let's get ahead of it.",
        cta1: { label: "Prep for this morning", action: "ns_checkin" },
        cta2: null,
      };
    }

    // Scenario C: no data yet — invite them in
    if (hasNoData) {
      return {
        id: "no_data",
        headline: "Let's check in so I can support you better.",
        sub: "The more you share, the more I can see. It only takes a moment.",
        cta1: { label: "Check in now", action: "ns_checkin" },
        cta2: null,
      };
    }

    return null; // use default invitation card
  }, [recentRegCheckins, familyState]);

  // ── NS state color
  const stateColors = {
    Fight: "#C07070", Flight: "#A89B5A", Freeze: "#7B8FAA",
    Shutdown: "#8A7BAA", Steady: "#7BAA8A", Stretched: "#B8924A",
  };
  const stateColor = checkin ? (stateColors[checkin.state] || T.teal) : T.teal;

  // Wonder Weeks leap
  const leap = useMemo(() => {
    if (!activeChild?.dob) return null;
    const weeks = Math.floor((Date.now() - new Date(activeChild.dob)) / (7 * 24 * 60 * 60 * 1000));
    return getCurrentWonderWeeksLeap(weeks);
  }, [activeChild?.dob]);

  // Upcoming milestones
  const upcomingMilestones = useMemo(() => {
    if (!activeChild?.dob) return [];
    const months = Math.floor((Date.now() - new Date(activeChild.dob)) / (1000 * 60 * 60 * 24 * 30.44));
    return getMilestonesForAge(months).slice(0, 2);
  }, [activeChild?.dob]);

  const hour = new Date().getHours();
  const showMorning = hour >= 5 && hour < 11;
  const showEvening = hour >= 18 || hour < 2;

  return (
    <div style={{ paddingBottom: 90 }}>

      {/* ── STATUS BAR ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 18px 8px",
        background: T.bg,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Child pill */}
          <button onClick={onOpenDrawer} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: T.faint, border: `1px solid ${T.border}`,
            borderRadius: 20, padding: "5px 12px 5px 8px",
            cursor: "pointer", fontFamily: font, fontSize: 12.5,
            color: T.text, fontWeight: 500,
          }}>
            <span style={{ fontSize: 15 }}>🧒</span>
            <span>{childName}</span>
            {childAge && <span style={{ color: T.muted, fontSize: 11 }}>{childAge}</span>}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Morning / Evening ritual shortcuts */}
          {showMorning && (
            <button onClick={onMorningMoment} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13.5, color: T.warm, fontFamily: font,
              fontWeight: 600, padding: "4px 8px",
            }}>
              ☀️
            </button>
          )}
          {showEvening && (
            <button onClick={onEveningClose} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13.5, color: T.teal, fontFamily: font,
              fontWeight: 600, padding: "4px 8px",
            }}>
              🌙
            </button>
          )}
          <button onClick={onOpenDrawer} style={{
            background: "none", border: "none", cursor: "pointer",
            color: T.muted, fontSize: 18, lineHeight: 1, padding: "4px",
          }}>
            ☰
          </button>
        </div>
      </div>

      {/* ── GREETING ── */}
      <div style={{ padding: "0 18px", marginBottom: 14 }}>
        <div style={{
          fontFamily: serif, fontSize: 28, color: T.headingText,
          lineHeight: 1.2,
        }}>
          {greeting}
        </div>
      </div>

      {/* ── FOREST BANNER — full bleed ── */}
      <ForestBanner
        stage={forestStage}
        totalCheckins={nsCheckinCount}
        invitation={invitation}
        onTap={() => setShowJourney(true)}
        T={T}
      />

      {/* ── FOREST JOURNEY MODAL ── */}
      {showJourney && (
        <ForestJourneyModal
          stage={forestStage}
          totalCheckins={nsCheckinCount}
          onClose={() => setShowJourney(false)}
          onCheckin={() => { setShowJourney(false); onNSCheckin(); }}
          T={T}
        />
      )}

      <div style={{ padding: "14px 18px 0" }}>

        {/* ── JAR + STREAK ROW ── */}
        {(() => {
          const streak = currentStreak;
          const streakMsg = getStreakMessage(streak);
          const leaves = nsCheckinCount ?? 0;

          // Last 7 days dot calendar
          const todayStr = new Date().toDateString();
          const last7 = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(Date.now() - (6 - i) * 86400000);
            const label = d.toLocaleDateString("en", { weekday: "short" }).slice(0, 1);
            const dateStr = d.toDateString();
            const filled = recentRegCheckins.some(c =>
              new Date(c.checked_in_at).toDateString() === dateStr
            );
            const isToday = dateStr === todayStr;
            return { label, filled, isToday };
          });

          // Milestone badge
          const milestoneBadge = milestonesEver?.[30] ? "30-day milestone ✦"
            : milestonesEver?.[20] ? "20-day milestone ✦"
            : milestonesEver?.[10] ? "10-day milestone ✦"
            : null;

          return (
            <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 10, marginBottom: 12 }}>

              {/* ── JAR CARD (left) ── */}
              <div style={{
                background: T.bg, borderRadius: 16,
                border: `1px solid ${T.border}`,
                padding: "6px 4px 6px",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3,
              }}>
                <div style={{
                  width: "80%", maxWidth: 80,
                  backgroundColor: T.bg,
                  borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <img
                    src={leaves > 0 ? "/tree/jar-open.png" : "/tree/jar-empty.png"}
                    alt="leaf jar"
                    style={{
                      width: "100%",
                      objectFit: "contain",
                      display: "block",
                      filter: leaves > 0 ? "drop-shadow(0 0 6px rgba(92,122,94,0.35))" : "none",
                    }}
                  />
                </div>
                <span style={{
                  fontFamily: serif, fontSize: 10,
                  color: "#5C7A5E", letterSpacing: ".05em",
                }}>
                  {leaves === 1 ? "1 leaf" : `${leaves} leaves`}
                </span>
              </div>

              {/* ── STREAK CARD (right) ── */}
              <div style={{
                background: T.card, borderRadius: 16,
                border: `1px solid ${T.border}`,
                borderLeft: "3px solid #5C7A5E",
                padding: "8px 10px",
                display: "flex", flexDirection: "column", gap: 5,
              }}>
                {/* Streak number + message */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    background: "#5C7A5E14", borderRadius: 8,
                    padding: "5px 8px", flexShrink: 0,
                    minWidth: 38,
                  }}>
                    <span style={{ fontSize: 17, fontWeight: 600, color: "#5C7A5E", lineHeight: 1, fontFamily: serif }}>
                      {streak}
                    </span>
                    <span style={{ fontSize: 8, color: "#5C7A5E", letterSpacing: ".05em", marginTop: 1, fontFamily: font }}>
                      {streak === 1 ? "day" : "days"}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {milestoneBadge && (
                      <div style={{
                        fontSize: 7.5, letterSpacing: ".08em", textTransform: "uppercase",
                        color: "#B8924A", fontFamily: font, fontWeight: 600, marginBottom: 2,
                      }}>
                        {milestoneBadge}
                      </div>
                    )}
                    <p style={{ fontFamily: font, fontSize: 10.5, color: T.text, lineHeight: 1.4, margin: 0 }}>
                      {streakMsg}
                    </p>
                  </div>
                </div>

                {/* 7-day dot calendar */}
                <div style={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
                  {last7.map((day, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <div style={{
                        width: 17, height: 17, borderRadius: "50%",
                        background: day.filled ? "#5C7A5E" : T.faint,
                        border: day.isToday && !day.filled ? `2px dashed #5C7A5E60` : "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.3s",
                      }}>
                        {day.filled && (
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "white" }} />
                        )}
                      </div>
                      <span style={{ fontSize: 7.5, color: T.muted, fontFamily: font }}>{day.label}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button onClick={onNSCheckin} style={{
                  background: "none", border: "none", padding: 0,
                  fontFamily: font, fontSize: 10.5, color: "#5C7A5E",
                  fontWeight: 600, cursor: "pointer", textAlign: "left",
                }}>
                  {streak === 0 ? "Start your streak →" : "Check in now →"}
                </button>
              </div>

            </div>
          );
        })()}

        {/* ── SCENARIO CARD — additive layer, only when condition is met ── */}
        {scenario && (
          <div style={{
            borderRadius: 16, padding: "16px 18px", marginBottom: 14,
            background: `linear-gradient(135deg, ${T.bark}, ${T.bark}ee)`,
          }}>
            <div style={{
              fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)", fontFamily: font, fontWeight: 700, marginBottom: 8,
            }}>
              What I'm seeing
            </div>
            <div style={{
              fontFamily: serif, fontSize: 16, color: "rgba(255,255,255,0.92)",
              lineHeight: 1.5, marginBottom: 6,
            }}>
              {scenario.headline}
            </div>
            <div style={{
              fontFamily: font, fontSize: 12.5, color: "rgba(255,255,255,0.55)",
              lineHeight: 1.6, marginBottom: 14,
            }}>
              {scenario.sub}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  if (scenario.cta1.action === "ns_checkin") onNSCheckin();
                  else if (scenario.cta1.action === "library") setTab("library");
                  else setTab(scenario.cta1.action);
                }}
                style={{
                  padding: "8px 16px", borderRadius: 20,
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff", fontFamily: font, fontSize: 12.5,
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                {scenario.cta1.label}
              </button>
              {scenario.cta2 && (
                <button
                  onClick={() => {
                    if (scenario.cta2.action === "ns_checkin") onNSCheckin();
                    else setTab(scenario.cta2.action);
                  }}
                  style={{
                    padding: "8px 16px", borderRadius: 20,
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.7)", fontFamily: font,
                    fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {scenario.cta2.label}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STATE OF DAY + NS PULSE ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>

          {/* Next Sleep tile */}
          <div onClick={() => setTab("sleep")} style={{
            borderRadius: 14, padding: "13px 14px",
            background: T.card, border: `1px solid ${T.border}`,
            cursor: "pointer",
          }}>
            <div style={{
              fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase",
              color: T.muted, fontFamily: font, marginBottom: 6,
            }}>
              {isSleeping ? "Sleeping Now" : "Next Sleep"}
            </div>
            {isSleeping ? (
              <>
                <div style={{ fontFamily: serif, fontSize: 20, color: T.teal, lineHeight: 1 }}>
                  💤
                </div>
                <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 4 }}>
                  In progress
                </div>
              </>
            ) : nextSleepStr ? (
              <>
                <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: T.headingText, lineHeight: 1 }}>
                  {minsUntilSleep < -720 ? "––" : nextSleepStr}
                </div>
                <div style={{ fontFamily: font, fontSize: 11, color: minsUntilSleep < 0 ? "#A87B8A" : T.muted, marginTop: 4 }}>
                  {minsUntilSleep < -720
                    ? "No sleep logged today"
                    : minsUntilSleep < 0
                    ? (() => { const m = Math.abs(minsUntilSleep); return m < 60 ? `${m}m overdue` : `${Math.floor(m/60)}h ${m%60}m overdue`; })()
                    : minsUntilSleep < 60
                    ? `in ${minsUntilSleep}m`
                    : `in ${Math.floor(minsUntilSleep/60)}h ${minsUntilSleep%60}m`}
                </div>
              </>
            ) : (
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
                Log a wake-up to see window
              </div>
            )}

          </div>

          {/* NS Pulse */}
          <div onClick={onNSCheckin} style={{
            borderRadius: 14, padding: "13px 14px",
            background: T.card, border: `1px solid ${T.border}`,
            cursor: "pointer",
          }}>
            <div style={{
              fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase",
              color: T.muted, fontFamily: font, marginBottom: 6,
            }}>
              Nervous System
            </div>
            {checkin ? (
              <>
                <div style={{
                  display: "inline-flex", padding: "3px 10px", borderRadius: 20,
                  border: `1.5px solid ${stateColor}`,
                  fontFamily: font, fontSize: 11.5, fontWeight: 600,
                  color: stateColor, marginBottom: 4,
                }}>
                  {checkin.state}
                </div>
                <div style={{ fontFamily: font, fontSize: 10.5, color: T.muted }}>
                  {new Date(checkin.checked_in_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </div>
                {/* Show affirmation if checked in within last 5 minutes */}
                {(Date.now() - new Date(checkin.checked_in_at)) < 5 * 60 * 1000 && (
                  <div style={{
                    fontFamily: font, fontSize: 10.5, color: T.teal,
                    fontStyle: "italic", marginTop: 4, lineHeight: 1.4,
                  }}>
                    You paused. That's the work. 🌿
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
                Not checked in yet
              </div>
            )}

          </div>
        </div>

        {/* ── DIAPER + FEED TILES (under-2 only) ── */}
        {(() => {
          // Use any available dob source — activeChild, familyState, or cached profile
          const dob = activeChild?.dob || familyState?.childProfile?.dob || null;
          // If no dob from any source yet, show placeholder tiles so they don't flash in late
          // (hides completely only if we're certain child is 2+ or no child is set at all)
          if (!dob && !activeChild) return null;
          if (!dob) {
            // dob not loaded yet — show skeleton tiles so layout doesn't shift
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {["Diapers", "Feed"].map(label => (
                  <div key={label} style={{ borderRadius: 14, padding: "13px 14px", background: T.card, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: T.muted, fontFamily: font, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: T.muted, lineHeight: 1 }}>—</div>
                  </div>
                ))}
              </div>
            );
          }
          const ageMonths = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44));
          if (ageMonths >= 24) return null;

          const todayStr = new Date().toLocaleDateString("en-CA");
          const allLogs = familyState?.sleepData?.weekSessions || [];
          const todayLogs = allLogs.filter(l => {
            return new Date(l.ts).toLocaleDateString("en-CA") === todayStr &&
              (!activeChild?.id || !l.child_id || l.child_id === activeChild.id);
          });

          const wetCount   = todayLogs.filter(l => l.type === "diaper" && l.sub_type === "wet").length;
          const dirtyCount = todayLogs.filter(l => l.type === "diaper" && l.sub_type === "dirty").length;
          const feedLogs   = todayLogs.filter(l => l.type === "feed");
          const feedCount  = feedLogs.length;
          const totalOz    = feedLogs.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
          const nursingLogs = feedLogs.filter(l => l.mode === "nursing");
          const totalNursingMins = nursingLogs.reduce((s, l) => {
            if (l.duration_mins) return s + l.duration_mins;
            if (l.ts && l.end_ts) return s + Math.round((new Date(l.end_ts) - new Date(l.ts)) / 60000);
            return s;
          }, 0);
          const lastNursingLog = [...nursingLogs].sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
          const lastSide = lastNursingLog?.side || null;
          const hasNursing = nursingLogs.length > 0;
          const hasFormula = feedLogs.some(l => l.mode === "bottle" || l.mode === "formula" || (!l.mode && l.amount));
          const feedingMode = hasNursing && hasFormula ? "combo" : hasNursing ? "breast" : "formula";

          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ borderRadius: 14, padding: "13px 14px", background: T.card, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: T.muted, fontFamily: font, marginBottom: 6 }}>
                  Diapers
                </div>
                <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: T.headingText, lineHeight: 1 }}>
                  {wetCount} <span style={{ color: T.muted, fontWeight: 400, fontSize: 16 }}>/</span> {dirtyCount}
                </div>
                <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 4 }}>Wet / Dirty</div>
              </div>

              <div style={{ borderRadius: 14, padding: "13px 14px", background: T.card, border: `1px solid ${T.border}`, position: "relative" }}>
                <div style={{ position: "absolute", top: 10, right: 11, fontSize: 8, color: T.muted, fontFamily: font, letterSpacing: ".06em", textTransform: "uppercase" }}>
                  {feedingMode === "combo" ? "Combo" : feedingMode === "breast" ? "Breast" : "Formula"}
                </div>
                <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: T.muted, fontFamily: font, marginBottom: 6 }}>
                  Feed
                </div>
                <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: T.headingText, lineHeight: 1 }}>
                  {feedCount}
                </div>
                {feedingMode === "breast" && (
                  <>
                    <div style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: T.text, marginTop: 3 }}>{totalNursingMins} min today</div>
                    {lastSide && <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 2 }}>Last: {lastSide}</div>}
                  </>
                )}
                {feedingMode === "formula" && (
                  <div style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: T.text, marginTop: 3 }}>{totalOz > 0 ? `${totalOz} oz today` : "—"}</div>
                )}
                {feedingMode === "combo" && (
                  <>
                    <div style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: T.text, marginTop: 3 }}>
                      {totalOz > 0 ? `${totalOz} oz` : ""}{totalOz > 0 && totalNursingMins > 0 ? " · " : ""}{totalNursingMins > 0 ? `${totalNursingMins} min` : ""}
                    </div>
                    {lastSide && <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 2 }}>Last: {lastSide}</div>}
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── PATTERN I'M NOTICING ── */}
        {(() => {
          const sessions = familyState?.sleepData?.weekSessions || [];
          const napSessions = sessions.filter(s => s.session_type !== "night" && s.end_ts);
          const napTimes = napSessions.map(s => new Date(s.ts).getHours() * 60 + new Date(s.ts).getMinutes());
          const avgNapStart = napTimes.length > 0 ? napTimes.reduce((a, b) => a + b, 0) / napTimes.length : null;
          const napTimeStr = avgNapStart !== null
            ? (() => {
                const h = Math.floor(avgNapStart / 60);
                const m = Math.round(avgNapStart % 60);
                const h12 = h % 12 || 12;
                const ampm = h >= 12 ? "pm" : "am";
                return `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
              })()
            : null;
          const steadyDominant = ["Regulated"].includes(familyState?.parentState?.nervousSystemTrend);
          const patternText = napTimeStr && steadyDominant
            ? `"You tend to feel steadier on days when ${childName}'s first nap lands before ${napTimeStr}. Want to see why?"`
            : `"${childName}'s nap timing and your regulation patterns are connected. The data is starting to show it."`;

          if (!canAccessFullPattern) {
            // Free tier — teaser only
            return (
              <div style={{
                borderRadius: 16, padding: "14px 16px", marginBottom: 10,
                background: T.card, border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${T.warm}`,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>🔍</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase",
                      color: T.warm, fontFamily: font, fontWeight: 700, marginBottom: 6,
                    }}>
                      Pattern I'm Noticing
                    </div>
                    <p style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.6, marginBottom: 8, fontStyle: "italic" }}>
                      Your data is starting to show a pattern worth knowing about.
                    </p>
                    <button onClick={async (e) => {
                      e.currentTarget.textContent = "Opening Stripe…";
                      e.currentTarget.disabled = true;
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-parent-checkout-session`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${session?.access_token}`,
                            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
                          },
                          body: JSON.stringify({
                            email: currentUser?.email,
                            name: currentUser?.name,
                            user_id: currentUser?.id,
                            tier: "plus",
                          }),
                        });
                        const data = await res.json();
                        if (data.url) {
                          window.open(data.url, "_blank");
                        } else {
                          e.currentTarget.textContent = "Try again →";
                          e.currentTarget.disabled = false;
                        }
                      } catch {
                        e.currentTarget.textContent = "Try again →";
                        e.currentTarget.disabled = false;
                      }
                    }} style={{
                      background: "none", border: `1px solid ${T.warm}`, padding: "5px 12px",
                      borderRadius: 20, fontFamily: font, fontSize: 12, color: T.warm,
                      fontWeight: 600, cursor: "pointer",
                    }}>
                      Unlock with Plus — $15/mo →
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div style={{
              borderRadius: 16, padding: "14px 16px", marginBottom: 10,
              background: T.card, border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${T.warm}`,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>🔍</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase",
                    color: T.warm, fontFamily: font, fontWeight: 700, marginBottom: 6,
                  }}>
                    Pattern I'm Noticing
                  </div>
                  <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.6, marginBottom: 8 }}>
                    {patternText}
                  </p>
                  <button onClick={() => setTab("insights")} style={{
                    background: "none", border: "none", padding: 0,
                    fontFamily: font, fontSize: 12.5, color: T.warm,
                    fontWeight: 600, cursor: "pointer",
                  }}>
                    See the full pattern →
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── MILESTONES PROGRESS ── */}
        {upcomingMilestones.length > 0 && (() => {
          const months = activeChild?.dob
            ? Math.floor((Date.now() - new Date(activeChild.dob)) / (1000 * 60 * 60 * 24 * 30.44))
            : null;
          const domainColors = {
            gross_motor: "#7B9EA8", fine_motor: "#A8907B", language: "#8A7BAA",
            social: "#A87B8A", cognitive: "#7BAA8A", sensory_ns: "#AA9B7B",
          };
          const domainEmojis = {
            gross_motor: "🏃", fine_motor: "✋", language: "💬",
            social: "❤️", cognitive: "🧠", sensory_ns: "🌿",
          };
          return (
            <div
              onClick={() => setTab("milestones")}
              style={{
                borderRadius: 16, padding: "14px 16px", marginBottom: 10,
                background: T.card, border: `1px solid ${T.border}`,
                borderLeft: `3px solid #7BAA8A`,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{
                  fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase",
                  color: "#7BAA8A", fontFamily: font, fontWeight: 700,
                }}>
                  🌱 Milestones — {childName}
                </div>
                {months !== null && (
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: font }}>{months}mo</div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {upcomingMilestones.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `${domainColors[m.domain] || "#7BAA8A"}22`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14,
                    }}>
                      {domainEmojis[m.domain] || "🌱"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: font, fontSize: 12.5, color: T.text, fontWeight: 600, marginBottom: 2 }}>
                        {m.title}
                      </div>
                      <div style={{ fontFamily: font, fontSize: 11, color: T.muted, lineHeight: 1.4 }}>
                        {m.description?.slice(0, 72)}{m.description?.length > 72 ? "…" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontFamily: font, fontSize: 11.5, color: "#7BAA8A", fontWeight: 600 }}>
                See full tracker →
              </div>
            </div>
          );
        })()}

        {/* ── WONDER WEEKS / STATE SHIFT ── */}
        {leap && (
          <a
            href="https://www.thewonderweeks.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", display: "block", marginBottom: 14 }}
          >
            <div style={{
              borderRadius: 16, padding: "14px 16px",
              background: `${T.teal}10`, border: `1px solid ${T.teal}25`,
            }}>
              <div style={{
                fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase",
                color: T.teal, fontFamily: font, fontWeight: 700, marginBottom: 6,
              }}>
                {leap.status === "active" ? "🌀 Wonder Weeks leap active" : "🔭 Leap approaching"}
              </div>
              <div style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.6, fontWeight: 600, marginBottom: 4 }}>
                {leap.title}
              </div>
              <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.6, marginBottom: 8 }}>
                {leap.what_baby_is_learning}
              </div>
              <div style={{ fontFamily: font, fontSize: 11.5, color: T.teal, fontWeight: 600 }}>
                Learn more at thewonderweeks.com →
              </div>
            </div>
          </a>
        )}



        {/* ── YESTERDAY'S SHIFT — real data driven ── */}
        {(() => {
          const checkins = recentRegCheckins;
          if (checkins.length < 2) return null;

          // Find yesterday's checkins
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          const yesterdayCheckins = checkins.filter(c =>
            new Date(c.checked_in_at).toDateString() === yesterday
          );
          if (yesterdayCheckins.length < 2) return null;

          // Did they shift from an activated state to a steadier one?
          const firstState = yesterdayCheckins[yesterdayCheckins.length - 1]?.state;
          const lastState = yesterdayCheckins[0]?.state;
          const wasActivated = ["Fight","Flight","Freeze","Shutdown","Stretched"].includes(firstState);
          const endedSteady = ["Steady","Regulated"].includes(lastState) || lastState === "Off";
          if (!wasActivated || !endedSteady) return null;

          const stateLabel = { Fight: "on edge", Flight: "anxious", Freeze: "frozen", Shutdown: "shut down", Stretched: "stretched" }[firstState] || "activated";

          return (
            <div style={{
              borderRadius: 16, padding: "16px 18px", marginBottom: 14,
              background: `${T.teal}08`, border: `1px solid ${T.teal}22`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <div style={{
                  fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase",
                  color: T.teal, fontFamily: font, fontWeight: 700,
                }}>
                  Yesterday's Shift
                </div>
              </div>
              <p style={{
                fontFamily: serif, fontSize: 15, color: T.headingText,
                lineHeight: 1.5, marginBottom: 6,
              }}>
                "You went from {stateLabel} → steady. That's not small."
              </p>
              <p style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.55, marginBottom: 12 }}>
                You checked in {yesterdayCheckins.length} times yesterday. You caught it before it escalated.
              </p>
              <div style={{
                display: "inline-block", padding: "6px 14px", borderRadius: 20,
                background: `${T.teal}15`,
                fontFamily: font, fontSize: 12.5, fontStyle: "italic",
                color: T.teal, fontWeight: 500,
              }}>
                I'm becoming the parent I want to be.
              </div>
            </div>
          );
        })()}


      </div>
    </div>
  );
}
