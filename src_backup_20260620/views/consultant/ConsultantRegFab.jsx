// src/views/consultant/ConsultantRegFab.jsx
// Consultant Regulation FAB — mirrors the parent SOSFab but for consultant regulation.
// Taps open a quick-access sheet: Morning / Evening / Quick reset.
// Sits above the bottom nav, bottom-right, same positioning as SOSFab.

import { useState } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { ConsultantMorning } from "./ConsultantMorning.jsx";
import { ConsultantEvening } from "./ConsultantEvening.jsx";

// ─── QUICK REGULATION OPTIONS (shown in bottom sheet) ────────────────────────
// These are the ConsultantWellnessCard audio exercises,
// surfaced directly here for speed.
const QUICK_RESETS = [
  {
    id: "exhale",
    emoji: "💨",
    label: "Reset breath",
    sub: "4 in · 6 out · 1 min",
    audioUrl: "https://res.cloudinary.com/dosa5mjyg/video/upload/v1770320497/reset_l6bq1j.m4a",
  },
  {
    id: "orient",
    emoji: "👁",
    label: "Orient",
    sub: "Look around · Name what you see · 1 min",
    audioUrl: "https://res.cloudinary.com/dosa5mjyg/video/upload/v1770319380/orient_lhnf0c.m4a",
  },
  {
    id: "butterfly",
    emoji: "🦋",
    label: "Butterfly hug",
    sub: "Bilateral tapping · 1 min 25 sec",
    audioUrl: "https://res.cloudinary.com/dosa5mjyg/video/upload/v1770320497/butterfly_hug_lkdcqo.m4a",
  },
];

// ─── AUDIO PLAYER (inline, minimal) ──────────────────────────────────────────
import { useRef } from "react";

function QuickAudio({ exercise, T, onDone }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function toggle() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }

  return (
    <div style={{ padding: "14px 18px", borderRadius: 16, background: T.faint, border: `0.5px solid ${T.border}` }}>
      <audio
        ref={audioRef}
        src={exercise.audioUrl}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (el?.duration) setProgress(el.currentTime / el.duration);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); if (onDone) onDone(); }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={toggle} style={{
          width: 38, height: 38, borderRadius: "50%", border: "none",
          background: T.teal, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, cursor: "pointer", flexShrink: 0,
        }}>
          {playing ? "⏸" : "▶"}
        </button>
        <div>
          <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.headingText }}>{exercise.label}</div>
          <div style={{ fontFamily: font, fontSize: 11, color: T.subText }}>{exercise.sub}</div>
        </div>
      </div>
      {playing && (
        <div style={{ height: 2, borderRadius: 2, background: T.border, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: T.teal, transition: "width 0.5s linear" }} />
        </div>
      )}
    </div>
  );
}

// ─── BOTTOM SHEET ─────────────────────────────────────────────────────────────
function RegSheet({ onClose, onMorning, onEvening, T }) {
  const [activeAudio, setActiveAudio] = useState(null);
  const h = new Date().getHours();
  const isMorning = h < 12;
  const isEvening = h >= 17;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 290, background: "rgba(0,0,0,0.45)" }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430, zIndex: 295,
        background: T.bg,
        borderRadius: "20px 20px 0 0",
        padding: "18px 20px 40px",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
        animation: "sheetUp 0.22s ease-out",
      }}>
        <style>{`@keyframes sheetUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }`}</style>

        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 18px" }} />

        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText, marginBottom: 3 }}>Regulate</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>
            A regulated consultant is the most effective tool you have.
          </div>
        </div>

        {/* Morning / Evening CTAs — surfaced by time of day */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={onMorning}
            style={{
              flex: 1, padding: "11px 12px", borderRadius: 14,
              background: isMorning ? "#2D4A35" : T.card,
              border: `0.5px solid ${isMorning ? "#2D4A35" : T.border}`,
              fontFamily: font, fontSize: 12, fontWeight: 600,
              color: isMorning ? "white" : T.muted,
              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}
          >
            <span style={{ fontSize: 18 }}>🌅</span>
            <span>Morning Moment</span>
            <span style={{ fontWeight: 400, fontSize: 10, opacity: 0.7 }}>Before you begin</span>
          </button>
          <button
            onClick={onEvening}
            style={{
              flex: 1, padding: "11px 12px", borderRadius: 14,
              background: isEvening ? "#2D4A35" : T.card,
              border: `0.5px solid ${isEvening ? "#2D4A35" : T.border}`,
              fontFamily: font, fontSize: 12, fontWeight: 600,
              color: isEvening ? "white" : T.muted,
              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}
          >
            <span style={{ fontSize: 18 }}>🌙</span>
            <span>Session Close</span>
            <span style={{ fontWeight: 400, fontSize: 10, opacity: 0.7 }}>End-of-day ritual</span>
          </button>
        </div>

        {/* Quick resets */}
        <div style={{ fontFamily: font, fontSize: 10, fontWeight: 600, color: T.subText, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
          Quick reset — right now
        </div>

        {activeAudio ? (
          <div>
            <QuickAudio
              exercise={QUICK_RESETS.find(r => r.id === activeAudio)}
              T={T}
              onDone={() => {}}
            />
            <button
              onClick={() => setActiveAudio(null)}
              style={{ marginTop: 10, background: "none", border: "none", fontFamily: font, fontSize: 11, color: T.subText, cursor: "pointer", padding: 0 }}
            >
              ← Choose different exercise
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {QUICK_RESETS.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveAudio(r.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", borderRadius: 12,
                  background: T.card, border: `0.5px solid ${T.border}`,
                  fontFamily: font, cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{r.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: T.subText, marginTop: 1 }}>{r.sub}</div>
                </div>
                <span style={{ fontSize: 13, color: T.muted }}>▶</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function ConsultantRegFab() {
  const T = useT();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showMorning, setShowMorning] = useState(false);
  const [showEvening, setShowEvening] = useState(false);

  // Only show on mobile — desktop uses the side nav layout
  const isMobile = window.innerWidth < 768;
  if (!isMobile) return null;

  if (showMorning) return <ConsultantMorning onClose={() => setShowMorning(false)} />;
  if (showEvening) return <ConsultantEvening onClose={() => setShowEvening(false)} />;

  return (
    <>
      {/* FAB — mirrors SOSFab but moss green */}
      <button
        onClick={() => setSheetOpen(s => !s)}
        style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)",
          right: "max(18px, calc(50vw - 215px + 18px))",
          zIndex: 90,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: `linear-gradient(135deg, #5C7A5E 0%, #7BAA8A 100%)`,
          border: "none",
          boxShadow: "0 4px 20px rgba(92,122,94,0.55), 0 2px 8px rgba(0,0,0,0.2)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 28px rgba(92,122,94,0.7), 0 3px 12px rgba(0,0,0,0.25)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(92,122,94,0.55), 0 2px 8px rgba(0,0,0,0.2)";
        }}
        aria-label="Regulation — check in with yourself"
      >
        <span style={{ fontSize: 22, lineHeight: 1, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}>🌿</span>
      </button>

      {/* Bottom sheet */}
      {sheetOpen && (
        <RegSheet
          onClose={() => setSheetOpen(false)}
          onMorning={() => { setSheetOpen(false); setShowMorning(true); }}
          onEvening={() => { setSheetOpen(false); setShowEvening(true); }}
          T={T}
        />
      )}
    </>
  );
}
