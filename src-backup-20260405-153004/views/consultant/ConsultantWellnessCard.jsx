// ─── ConsultantWellnessCard ───────────────────────────────────────────────────
// Appears on the Consultant Home Screen when caseload is heavy OR the consultant
// has checked in as stressed. Surfaces a grounded reflection + regulation offer.
//
// Props:
//   currentUser     — user object (needs .id)
//   urgentCount     — number of urgent clients
//   watchCount      — number of watch clients
//   totalClients    — total caseload size

import { useState, useEffect, useRef } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

// ─── CHECK-IN STATE OPTIONS ───────────────────────────────────────────────────
const ARRIVAL_STATES = [
  { id: "grounded",  label: "Grounded",   emoji: "🌿", color: "#2D6A4F", bg: "#EAF3EB", regulated: true  },
  { id: "stretched", label: "Stretched",  emoji: "⚡", color: "#D4820A", bg: "#FEF6E4", regulated: false },
  { id: "activated", label: "Activated",  emoji: "🔥", color: "#C0392B", bg: "#FDECEA", regulated: false },
  { id: "depleted",  label: "Depleted",   emoji: "🌑", color: "#7B4FBF", bg: "#F3EEF9", regulated: false },
];

// ─── REGULATION EXERCISES (subset mapped from RegulationModule) ───────────────
const QUICK_EXERCISES = [
  {
    id: "reset",
    title: "Reset Breathing",
    duration: "1 min",
    desc: "4 in, 6 out. Longer exhales activate the parasympathetic brake.",
    audioUrl: "https://res.cloudinary.com/dosa5mjyg/video/upload/v1770320497/reset_l6bq1j.m4a",
    states: ["activated", "stretched"],
  },
  {
    id: "drop_shoulders",
    title: "Drop the Shoulders",
    duration: "35 sec",
    desc: "Exhale, roll your shoulders back and down. Unclench your jaw.",
    audioUrl: "https://res.cloudinary.com/dosa5mjyg/video/upload/v1770320498/Drop_the_shoulders_khikvb.m4a",
    states: ["activated"],
  },
  {
    id: "orient",
    title: "Orient",
    duration: "1 min",
    desc: "Slowly look around your space. Name what you see. Let your eyes land somewhere soft.",
    audioUrl: "https://res.cloudinary.com/dosa5mjyg/video/upload/v1770319380/orient_lhnf0c.m4a",
    states: ["stretched", "depleted", "activated"],
  },
  {
    id: "butterfly_hug",
    title: "Butterfly Hug",
    duration: "1 min 25 sec",
    desc: "Cross your arms over your chest and tap alternating sides gently. Bilateral movement helps settle.",
    audioUrl: "https://res.cloudinary.com/dosa5mjyg/video/upload/v1770320497/butterfly_hug_lkdcqo.m4a",
    states: ["activated", "stretched"],
  },
  {
    id: "gentle_wake_up",
    title: "Gentle Wake Up",
    duration: "1 min 18 sec",
    desc: "Soft movement and breath to gently activate without overwhelming a depleted system.",
    audioUrl: "https://res.cloudinary.com/dosa5mjyg/video/upload/v1770319380/gentlewakeup_emkew6.m4a",
    states: ["depleted"],
  },
];

function exerciseForState(stateId) {
  const matches = QUICK_EXERCISES.filter(e => e.states.includes(stateId));
  return matches[0] || QUICK_EXERCISES[0];
}

// ─── REFLECTION COPY ──────────────────────────────────────────────────────────
function buildReflection(urgentCount, watchCount, totalClients, arrivalState) {
  const load = urgentCount >= 3 ? "heavy"
    : urgentCount >= 1 || watchCount >= 3 ? "moderate"
    : "steady";

  const stressed = arrivalState && !ARRIVAL_STATES.find(s => s.id === arrivalState)?.regulated;

  if (load === "heavy" && stressed) {
    return {
      headline: "You're holding a lot right now.",
      body: `${urgentCount} urgent ${urgentCount === 1 ? "family" : "families"} and you're arriving ${arrivalState}. That's a full nervous system before you even begin. You can't pour from empty — a minute before you dive in matters.`,
      weight: 3,
    };
  }
  if (load === "heavy") {
    return {
      headline: `${urgentCount} urgent ${urgentCount === 1 ? "case" : "cases"} today.`,
      body: `That's a meaningful amount to hold. Before you open the first family, take a breath that actually lands. Your regulated presence is the most useful thing you bring.`,
      weight: 2,
    };
  }
  if (stressed) {
    return {
      headline: `You checked in ${arrivalState} today.`,
      body: `Your caseload is manageable, but you're not arriving at your steadiest. A quick reset before you start helps you show up as the consultant your families need.`,
      weight: 2,
    };
  }
  if (load === "moderate") {
    return {
      headline: "A few families need your attention.",
      body: `Before you respond to anyone, take one conscious breath. You'll think more clearly, write more grounded messages, and hold the space better.`,
      weight: 1,
    };
  }
  return null; // stable load + no stress signal = card doesn't appear
}

// ─── AUDIO PLAYER ─────────────────────────────────────────────────────────────
function AudioExercise({ exercise, T }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function toggle() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, background: T.faint, border: `0.5px solid ${T.border}` }}>
      <audio
        ref={audioRef}
        src={exercise.audioUrl}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (el && el.duration) setProgress(el.currentTime / el.duration);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Play button */}
        <button
          onClick={toggle}
          style={{
            width: 36, height: 36, borderRadius: "50%", border: "none",
            background: T.sage, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, cursor: "pointer", flexShrink: 0,
          }}
        >
          {playing ? "⏸" : "▶"}
        </button>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.headingText, marginBottom: 1 }}>
            {exercise.title}
          </div>
          <div style={{ fontFamily: font, fontSize: 11, color: T.subText }}>{exercise.duration}</div>
        </div>
      </div>

      {/* Desc */}
      <div style={{ fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.55, marginTop: 8 }}>
        {exercise.desc}
      </div>

      {/* Progress bar */}
      {playing && (
        <div style={{ marginTop: 10, height: 2, borderRadius: 2, background: T.border, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: T.sage, transition: "width 0.5s linear" }} />
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function ConsultantWellnessCard({ currentUser, urgentCount, watchCount, totalClients }) {
  const T = useT();
  const [arrivalState, setArrivalState] = useState(null);     // from today's check-in
  const [dismissed, setDismissed] = useState(false);
  const [showExercise, setShowExercise] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [todayCheckinDone, setTodayCheckinDone] = useState(false);

  // ── Load today's check-in from Supabase ──
  useEffect(() => {
    if (!currentUser?.id) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    supabase
      .from("consultant_checkins")
      .select("arrival_state, created_at")
      .eq("consultant_id", currentUser.id)
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setArrivalState(data.arrival_state);
          setTodayCheckinDone(true);
        }
      });
  }, [currentUser?.id]);

  async function saveCheckin(stateId) {
    setSaving(true);
    const state = ARRIVAL_STATES.find(s => s.id === stateId);
    setArrivalState(stateId);
    setTodayCheckinDone(true);
    setShowCheckin(false);

    try {
      await supabase.from("consultant_checkins").insert({
        consultant_id: currentUser.id,
        arrival_state: stateId,
        is_regulated: state?.regulated ?? false,
        urgent_clients: urgentCount,
        total_clients: totalClients,
      });
    } catch {
      // Silent — state is set in UI regardless
    } finally {
      setSaving(false);
    }
  }

  // ── Decide whether to show ──
  const reflection = buildReflection(urgentCount, watchCount, totalClients, arrivalState);
  if (!reflection || dismissed) return null;

  const stateConfig = arrivalState ? ARRIVAL_STATES.find(s => s.id === arrivalState) : null;
  const exercise = arrivalState ? exerciseForState(arrivalState) : exerciseForState("stretched");

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        borderRadius: 14,
        border: `0.5px solid ${T.border}`,
        background: T.card,
        overflow: "hidden",
      }}>
        {/* Accent strip — weight-based color */}
        <div style={{
          height: 3,
          background: reflection.weight >= 3
            ? "linear-gradient(90deg, #C0392B, #D4820A)"
            : reflection.weight === 2
            ? "linear-gradient(90deg, #D4820A, #7B4FBF)"
            : `linear-gradient(90deg, ${T.sage}, ${T.sage})`,
        }} />

        <div style={{ padding: "16px 18px" }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🌿</span>
              <span style={{ fontFamily: font, fontSize: 10, fontWeight: 500, color: T.subText, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Before You Begin
              </span>
            </div>
            <button
              onClick={() => setDismissed(true)}
              style={{ background: "none", border: "none", color: T.subText, fontSize: 13, cursor: "pointer", padding: 0, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Reflection */}
          <div style={{ fontFamily: serif, fontSize: 17, color: T.headingText, lineHeight: 1.35, marginBottom: 8 }}>
            {reflection.headline}
          </div>
          <div style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.7, marginBottom: 14 }}>
            {reflection.body}
          </div>

          {/* Arrival state — either showing current or check-in prompt */}
          {!todayCheckinDone && !showCheckin && (
            <button
              onClick={() => setShowCheckin(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: `0.5px solid ${T.border}`,
                borderRadius: 20, padding: "5px 12px",
                fontFamily: font, fontSize: 12, color: T.muted,
                cursor: "pointer", marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 11 }}>+ </span> How are you arriving today?
            </button>
          )}

          {showCheckin && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: font, fontSize: 11, color: T.subText, marginBottom: 8 }}>
                How are you arriving today?
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ARRIVAL_STATES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => saveCheckin(s.id)}
                    disabled={saving}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 13px", borderRadius: 20,
                      border: `0.5px solid ${s.color}60`,
                      background: s.bg,
                      fontFamily: font, fontSize: 12, fontWeight: 500,
                      color: s.color, cursor: "pointer",
                    }}
                  >
                    <span>{s.emoji}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {stateConfig && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: stateConfig.bg, marginBottom: 14 }}>
              <span>{stateConfig.emoji}</span>
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 500, color: stateConfig.color }}>
                Arriving {stateConfig.label.toLowerCase()}
              </span>
              {!stateConfig.regulated && (
                <button
                  onClick={() => { setTodayCheckinDone(false); setArrivalState(null); setShowCheckin(true); }}
                  style={{ background: "none", border: "none", fontFamily: font, fontSize: 11, color: T.subText, cursor: "pointer", padding: "0 0 0 4px" }}
                >
                  edit
                </button>
              )}
            </div>
          )}

          {/* Regulation offer */}
          {!showExercise ? (
            <button
              onClick={() => setShowExercise(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "10px 14px",
                borderRadius: 10, border: `0.5px solid ${T.border}`,
                background: T.faint, cursor: "pointer",
                fontFamily: font, fontSize: 13, fontWeight: 600, color: T.sage,
              }}
            >
              <span>🎧</span>
              Take a minute — {exercise.title} ({exercise.duration})
            </button>
          ) : (
            <div>
              <AudioExercise exercise={exercise} T={T} />
              <button
                onClick={() => setShowExercise(false)}
                style={{ marginTop: 8, background: "none", border: "none", fontFamily: font, fontSize: 11, color: T.subText, cursor: "pointer", padding: 0 }}
              >
                ↑ Hide
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
