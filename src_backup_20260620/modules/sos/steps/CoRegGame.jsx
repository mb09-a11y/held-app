// src/modules/sos/steps/CoRegGame.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Screen 4 of the co-regulation flow — The Game.
// Serves one prompt based on child state + age band.
// Dark screen, forest-at-night aesthetic.
// Giant text, 10 words max, root timer 30 seconds.
//
// PROPS:
//   childState   — "flooded" | "shutdown" | "tipping"
//   ageBand      — "0_18m" | "18m_3y" | "3_5y" | "5_7y"
//   childName    — string (from child profile)
//   onComplete   — called when timer finishes
//   onClose      — called when X is tapped
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { font, serif } from "../../../core/shared.jsx";
import { getCoRegGame } from "../../../data/coRegGames.js";

const TIMER_DURATION = 30; // seconds

// ─── STATE COLORS ────────────────────────────────────────────────────────────
const STATE_PALETTE = {
  flooded:  { accent: "#c4714a", glow: "rgba(196,113,74,0.15)",  label: "🔥 Flooded"  },
  shutdown: { accent: "#7b9ea8", glow: "rgba(123,158,168,0.15)", label: "🧊 Shutdown" },
  tipping:  { accent: "#b8924a", glow: "rgba(184,146,74,0.15)",  label: "⚡ Tipping"  },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function CoRegGame({ childState, ageBand, childName, onComplete, onClose }) {
  const game = getCoRegGame(childState, ageBand);
  const palette = STATE_PALETTE[childState] || STATE_PALETTE.tipping;

  const [phase, setPhase] = useState("ready");   // ready | active | complete
  const [progress, setProgress] = useState(0);   // 0–1 for root timer
  const timerRef = useRef(null);
  const startRef = useRef(null);

  // ── Start timer on tap ──────────────────────────────────────────────────────
  function startGame() {
    setPhase("active");
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const p = Math.min(elapsed / TIMER_DURATION, 1);
      setProgress(p);
      if (p >= 1) {
        clearInterval(timerRef.current);
        setPhase("complete");
      }
    }, 50);
  }

  // ── Auto-advance after completion ───────────────────────────────────────────
  useEffect(() => {
    if (phase === "complete") {
      const t = setTimeout(() => onComplete(), 2000);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Fallback if no game found ────────────────────────────────────────────────
  if (!game) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 310,
        background: "#0e1610",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 24,
      }}>
        <div style={{
          fontFamily: serif, fontSize: 22, fontStyle: "italic",
          color: "rgba(255,255,255,0.7)", textAlign: "center",
          lineHeight: 1.5,
        }}>
          Just be with them right now.
        </div>
        <button onClick={onClose} style={{
          marginTop: 32, padding: "12px 28px", borderRadius: 24,
          background: "rgba(255,255,255,0.1)", border: "none",
          color: "rgba(255,255,255,0.6)", fontFamily: font,
          fontSize: 14, cursor: "pointer",
        }}>
          Done
        </button>
      </div>
    );
  }

  const isComplete = phase === "complete";
  const isReady = phase === "ready";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 310,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "env(safe-area-inset-top, 24px) 28px 48px",
      transition: "background 1.2s ease",
      background: isComplete
        ? "linear-gradient(160deg, #3d5a3e 0%, #5c7a4a 50%, #8a6a3a 100%)"
        : "#0e1610",
      overflow: "hidden",
    }}>

      {/* ── Close button ── */}
      <button onClick={onClose} style={{
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 24px) + 8px)",
        right: 20,
        width: 36, height: 36, borderRadius: "50%",
        background: "rgba(255,255,255,0.08)", border: "none",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.35)", fontSize: 16,
      }}>✕</button>

      {/* ── Content ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        width: "100%", maxWidth: 360, gap: 28,
        textAlign: "center",
      }}>

        {/* READY phase — tap to start */}
        {isReady && (
          <>
            {/* State label eyebrow */}
            <div style={{
              fontFamily: font, fontSize: 11,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: palette.accent, fontWeight: 600, opacity: 0.8,
            }}>
              {palette.label}
            </div>

            {/* Spell title */}
            <div style={{
              fontFamily: font, fontSize: 11,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.3)", fontWeight: 600,
            }}>
              🌲 {game.title}
            </div>

            {/* Main prompt — giant serif */}
            <div style={{
              fontFamily: serif,
              fontSize: 30,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.95)",
              lineHeight: 1.25,
              letterSpacing: "0.01em",
              textShadow: `0 0 40px ${palette.glow}`,
            }}>
              {game.prompt}
            </div>

            {/* Sub-prompt */}
            {game.subPrompt && (
              <div style={{
                fontFamily: font,
                fontSize: 13,
                color: "rgba(255,255,255,0.35)",
                lineHeight: 1.6,
                maxWidth: 280,
              }}>
                {game.subPrompt}
              </div>
            )}

            {/* Tap to start */}
            <button
              onClick={startGame}
              style={{
                marginTop: 8,
                padding: "14px 36px",
                borderRadius: 32,
                border: `1.5px solid ${palette.accent}`,
                background: "transparent",
                color: palette.accent,
                fontFamily: font,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.04em",
                transition: "all .2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = palette.glow;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              I'm doing it
            </button>
          </>
        )}

        {/* ACTIVE phase — timer running */}
        {phase === "active" && (
          <>
            {/* Spell title */}
            <div style={{
              fontFamily: font, fontSize: 11,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.3)", fontWeight: 600,
            }}>
              🌲 {game.title}
            </div>

            {/* Main prompt */}
            <div style={{
              fontFamily: serif,
              fontSize: 30,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.95)",
              lineHeight: 1.25,
              textShadow: `0 0 40px ${palette.glow}`,
            }}>
              {game.prompt}
            </div>

            {/* Seconds remaining */}
            <div style={{
              fontFamily: font,
              fontSize: 13,
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.06em",
            }}>
              {Math.ceil(TIMER_DURATION - progress * TIMER_DURATION)}s
            </div>
          </>
        )}

        {/* COMPLETE phase — warm completion */}
        {isComplete && (
          <>
            <style>{`
              @keyframes fadeUpGame {
                from { opacity: 0; transform: translateY(16px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              @keyframes leafDropGame {
                0%   { opacity: 0; transform: translateY(-30px) rotate(-15deg); }
                60%  { opacity: 1; }
                100% { opacity: 1; transform: translateY(0) rotate(5deg); }
              }
            `}</style>
            <div style={{
              fontSize: 48,
              animation: "leafDropGame 0.8s ease forwards",
            }}>
              🍂
            </div>
            <div style={{
              fontFamily: serif,
              fontSize: 22,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.45,
              animation: "fadeUpGame 0.6s 0.3s ease forwards",
              opacity: 0,
            }}>
              {childName
                ? `You showed up for ${childName}.`
                : "You showed up."}
            </div>
            <div style={{
              fontFamily: font,
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              animation: "fadeUpGame 0.6s 0.6s ease forwards",
              opacity: 0,
            }}>
              Almost there...
            </div>
          </>
        )}
      </div>

      {/* ── Root timer — grows across bottom ── */}
      {phase === "active" && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 3,
          background: "rgba(255,255,255,0.07)",
        }}>
          <div style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${palette.accent}, #8AA67A)`,
            transition: "width 0.05s linear",
            borderRadius: "0 2px 2px 0",
          }} />
        </div>
      )}

      {/* ── Ambient glow behind prompt ── */}
      {!isComplete && (
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 300, height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${palette.glow} 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: -1,
        }} />
      )}
    </div>
  );
}
