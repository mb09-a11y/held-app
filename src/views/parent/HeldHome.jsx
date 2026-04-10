// src/views/parent/HeldHome.jsx
// Held-style parent home screen.
// Reads from AppCtx (currentUser, activeChild, activeFamily, consultants).
// Props: onSOS, onNSCheckin, onMorningMoment, onEveningClose, setTab, onOpenDrawer

import { useState, useEffect, useMemo } from "react";
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

const INVITATIONS = [
  "What do you want to bring to today?",
  "One breath before you begin.",
  "You don't have to be perfect. You just have to show up.",
  "Your presence is the thing they'll remember.",
  "Tired parents can still be loving parents.",
  "Small, consistent steps build something real.",
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
  useEffect(() => {
    if (!userId) return;
    const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
    supabase
      .from("regulation_checkins")
      .select("state, checked_in_at, source")
      .eq("user_id", userId)
      .gte("checked_in_at", since7)
      .order("checked_in_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setCheckins(data || []));
  }, [userId, refreshKey]);
  return checkins;
}

function useRecentCheckin(userId, refreshKey = 0) {
  const [checkin, setCheckin] = useState(null);
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("regulation_checkins")
      .select("state, checked_in_at")
      .eq("user_id", userId)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setCheckin(data));
  }, [userId, refreshKey]);
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

export function HeldHome({ onSOS, onNSCheckin, onMorningMoment, onEveningClose, setTab, onOpenDrawer, onNotifications, onGrounding, checkinRefreshKey = 0 }) {
  const T = useT();
  const { currentUser, activeChild, activeFamily } = useApp();

  // ── Checkin flow data ──
  const { familyState } = useFamilyState(activeFamily?.id, activeChild?.id, currentUser?.id);
  const { patterns, saveCheckin } = useCheckinHistory(currentUser?.id, activeFamily?.id);

  const checkin = useRecentCheckin(currentUser?.id, checkinRefreshKey);
  const recentRegCheckins = useRecentRegulationCheckins(currentUser?.id, checkinRefreshKey);
  const { nextSleepStr, minsUntil: minsUntilSleep, isSleeping } = useNextSleep(
    activeFamily?.id, activeChild?.id, activeChild?.dob
  );

  const greeting = getGreeting(currentUser?.name);
  const childName = activeChild?.name || "your little one";
  const childAge = activeChild?.dob ? ageLabel(activeChild.dob) : null;

  // Daily invitation — cycles by day of month
  const invitation = INVITATIONS[new Date().getDate() % INVITATIONS.length];

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

      <div style={{ padding: "0 18px" }}>

        {/* ── GREETING ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            fontFamily: serif, fontSize: 28, color: T.headingText,
            lineHeight: 1.2, marginBottom: 4,
          }}>
            {greeting}
          </div>
        </div>

        {/* ── TODAY'S INVITATION — always present ── */}
        <div style={{
          borderRadius: 18, padding: "18px 20px 16px 24px", marginBottom: 14,
          background: T.card,
          borderLeft: `4px solid ${T.warm}`,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase",
            color: T.warm, fontFamily: font, fontWeight: 700, marginBottom: 10,
          }}>
            Today's Invitation
          </div>
          <div style={{
            fontFamily: serif, fontSize: 18, fontStyle: "italic",
            color: T.headingText, lineHeight: 1.55, marginBottom: 12,
          }}>
            "{invitation}"
          </div>
          {(showMorning || showEvening) && (
            <button
              onClick={showMorning ? onMorningMoment : onEveningClose}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "none", border: `1px solid ${T.teal}40`,
                borderRadius: 20, padding: "6px 14px",
                fontFamily: font, fontSize: 12.5, color: T.teal,
                fontWeight: 600, cursor: "pointer", marginBottom: 12,
              }}
            >
              {showMorning ? "☀️ Morning moment →" : "🌙 Evening close →"}
            </button>
          )}
          <div style={{ height: 1, background: T.border, margin: "4px 0 12px" }} />
          <HeldCheckinInline
            familyState={familyState}
            patterns={patterns}
            saveCheckin={saveCheckin}
          />
        </div>

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
                  {nextSleepStr}
                </div>
                <div style={{ fontFamily: font, fontSize: 11, color: minsUntilSleep < 0 ? "#A87B8A" : T.muted, marginTop: 4 }}>
                  {minsUntilSleep < 0
                    ? `${Math.abs(minsUntilSleep)}m overdue`
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

        {/* ── SOS BUTTON ── */}
        <button onClick={onSOS} style={{
          width: "100%", marginBottom: 14,
          padding: "16px 18px",
          borderRadius: 16, border: "none",
          background: `linear-gradient(135deg, ${T.warm}, ${T.gold})`,
          display: "flex", alignItems: "center", gap: 14,
          cursor: "pointer", textAlign: "left",
          boxShadow: `0 4px 16px ${T.warm}70`,
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: "#fff" }}>
              I Need Help Right Now
            </div>
            <div style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              Tap for immediate support
            </div>
          </div>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 18 }}>›</span>
        </button>

        {/* ── WONDER WEEKS / STATE SHIFT ── */}
        {leap && (
          <div style={{
            borderRadius: 16, padding: "14px 16px", marginBottom: 14,
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
            <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>
              {leap.what_baby_is_learning?.slice(0, 120)}
              {(leap.what_baby_is_learning?.length || 0) > 120 ? "…" : ""}
            </div>
          </div>
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

        {/* ── PATTERN I'M NOTICING — real sleep + checkin correlation ── */}
        {(() => {
          const sessions = familyState?.sleepData?.weekSessions || [];
          const checkins = recentRegCheckins;
          if (sessions.length < 3 || checkins.length < 3) return null;

          // Find days where first nap was early vs late, compare parent state
          const napSessions = sessions.filter(s => s.session_type !== "night" && s.end_ts);
          if (napSessions.length < 3) return null;

          // Get earliest nap start time
          const napTimes = napSessions.map(s => new Date(s.ts).getHours() * 60 + new Date(s.ts).getMinutes());
          const avgNapStart = napTimes.reduce((a, b) => a + b, 0) / napTimes.length;
          const earlyNapHr = Math.floor(avgNapStart / 60);
          const earlyNapMin = Math.round(avgNapStart % 60);
          const napTimeStr = `${earlyNapHr}:${earlyNapMin.toString().padStart(2, "0")}${earlyNapHr >= 12 ? "pm" : "am"}`.replace("am","am").replace("12:","12:");

          // Check if parent tends to be steadier on days with early naps
          const steadyDominant = ["Steady","Regulated"].includes(familyState?.parentState?.nervousSystemTrend);

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
                    {steadyDominant
                      ? `"You tend to feel steadier on days when ${childName}'s first nap lands before ${napTimeStr}. Want to see why?"`
                      : `"${childName}'s nap timing and your regulation patterns are connected. The data is starting to show it."`
                    }
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

        {/* ── HELD IS THINKING ABOUT YOU ── */}
        <div style={{
          fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase",
          color: T.subText, fontFamily: font, marginBottom: 10,
        }}>
          Held is thinking about you
        </div>

        {/* Card 1: Time-of-day check-in prompt */}
        {(() => {
          const hr = new Date().getHours();
          const card = hr < 10
            ? { emoji: "🌅", label: "Morning reset", text: "Before the day picks up — one breath. What do you need right now?", cta: "Morning moment →", action: onMorningMoment }
            : hr < 14
            ? { emoji: "☀️", label: "Midday check-in", text: "How's your window of tolerance holding up? A quick check-in goes a long way.", cta: "Check in →", action: onNSCheckin }
            : hr < 17
            ? { emoji: "🍃", label: "Afternoon reset", text: "The afternoon stretch is real. Even 60 seconds of regulation changes what's available for the evening.", cta: "Regulation tools →", action: () => setTab("library") }
            : hr < 19
            ? { emoji: "🌿", label: "Evening reset", text: "Before the bedtime push — a moment to resource yourself. Even 60 seconds shifts what's available.", cta: "Regulation tools →", action: () => setTab("library") }
            : { emoji: "🌙", label: "Close the day", text: "You showed up today. Take a moment — just for you — before everything starts again tomorrow.", cta: "Evening close →", action: onEveningClose };
          return (
            <div style={{
              borderRadius: 16, padding: "14px 16px", marginBottom: 10,
              background: T.card, border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${T.teal}`,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{card.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase",
                    color: T.teal, fontFamily: font, fontWeight: 700, marginBottom: 6,
                  }}>
                    {card.label}
                  </div>
                  <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.6, marginBottom: 8 }}>
                    {card.text}
                  </p>
                  <button onClick={card.action} style={{
                    background: "none", border: "none", padding: 0,
                    fontFamily: font, fontSize: 12.5, color: T.teal,
                    fontWeight: 600, cursor: "pointer",
                  }}>
                    {card.cta}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}



        {/* ── RETURN LOOPS (Where do you want to go?) ── */}
        <div style={{
          fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase",
          color: T.muted, fontFamily: font, marginBottom: 10,
        }}>
          Where do you want to go?
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {RETURN_LOOPS.map(loop => (
            <button
              key={loop.id}
              onClick={() => {
                if (loop.target === "sos") onSOS();
                else if (loop.target === "ns") onNSCheckin();
                else setTab(loop.target);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 14,
                background: T.card, border: `1px solid ${T.border}`,
                cursor: "pointer", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{loop.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: font, fontSize: 11, fontWeight: 700, color: T.teal,
                  letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2,
                }}>
                  {loop.label}
                </div>
                <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted }}>{loop.desc}</div>
              </div>
              <span style={{ fontFamily: font, fontSize: 12, color: T.teal, fontWeight: 600, whiteSpace: "nowrap" }}>
                {loop.cta}
              </span>
            </button>
          ))}
        </div>

        {/* ── QUICK ACCESS ── */}
        <div style={{
          fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase",
          color: T.muted, fontFamily: font, marginBottom: 10,
        }}>
          Quick access
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
          {[
            { emoji: "🌙", label: "Log Sleep",    action: () => setTab("sleep") },
            { emoji: "🧠", label: "NS Check-in",  action: () => onNSCheckin() },
            { emoji: "💬", label: "What do I say?", action: () => setTab("library") },
            { emoji: "📊", label: "Insights",     action: () => setTab("insights") },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                padding: "12px 6px 10px",
                borderRadius: 14, border: `1px solid ${T.border}`,
                background: T.card, cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: 22 }}>{item.emoji}</span>
              <span style={{ fontFamily: font, fontSize: 10.5, color: T.muted, textAlign: "center", lineHeight: 1.3 }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
