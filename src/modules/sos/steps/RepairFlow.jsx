// src/modules/sos/steps/RepairFlow.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Repair pathway — triggered when parent selects "I already snapped".
// Warm, non-shaming, 4-screen sequence:
//
//   Screen 1 — Acknowledge: it happened, every parent has a moment like this
//   Screen 2 — Reset: Grounding Tree (Reset B) to get steady first
//   Screen 3 — Repair Script: exact words to say, kneel down
//   Screen 4 — Complete: repair is powerful, +1 leaf
//
// PROPS:
//   childName  — string (from child profile)
//   userId     — for Supabase insert
//   familyId   — for Supabase insert
//   onClose    — called when done
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { font, serif } from "../../../core/shared.jsx";
import { useT } from "../../../core/shared.jsx";
import { supabase } from "../../../lib/supabase.js";
import leafImg from "../../../assets/leaf.png";

const JAR_IMG = "/tree/jar-open.png";

const TIMER_DURATION = 20; // seconds for grounding tree reset

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function RepairFlow({ childName, userId, familyId, onClose }) {
  const [screen, setScreen] = useState(1); // 1 | 2 | 3 | 4
  const T = useT();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 310,
      display: "flex", flexDirection: "column",
      alignItems: "center",
      overflowY: "auto",
      background: screen === 4
        ? "linear-gradient(160deg, #3d5a3e 0%, #5c7a4a 60%, #8a6a3a 100%)"
        : T.bg,
      transition: "background 1s ease",
      padding: "env(safe-area-inset-top, 24px) 24px 48px",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        {screen === 1 && (
          <RepairAcknowledge
            onContinue={() => setScreen(2)}
            onClose={onClose}
            T={T}
          />
        )}
        {screen === 2 && (
          <RepairReset
            onComplete={() => setScreen(3)}
            onClose={onClose}
          />
        )}
        {screen === 3 && (
          <RepairScript
            childName={childName}
            onComplete={() => setScreen(4)}
            onClose={onClose}
            T={T}
          />
        )}
        {screen === 4 && (
          <RepairComplete
            childName={childName}
            userId={userId}
            familyId={familyId}
            onClose={onClose}
          />
        )}

      </div>
    </div>
  );
}

// ─── SCREEN 1 — ACKNOWLEDGE ──────────────────────────────────────────────────

function RepairAcknowledge({ onContinue, onClose, T }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      paddingTop: 8, paddingBottom: 32,
    }}>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "flex-end", marginBottom: 32,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: "50%",
          background: T.faint, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: T.muted, fontSize: 16,
        }}>✕</button>
      </div>

      {/* Heart icon */}
      <div style={{
        fontSize: 52, textAlign: "center", marginBottom: 28,
        lineHeight: 1,
      }}>
        💔
      </div>

      {/* Headline */}
      <div style={{
        fontFamily: serif,
        fontSize: 32,
        fontStyle: "italic",
        color: T.headingText,
        lineHeight: 1.25,
        textAlign: "center",
        marginBottom: 20,
      }}>
        It happened.
      </div>

      {/* Body */}
      <div style={{
        fontFamily: serif,
        fontSize: 18,
        color: T.text,
        lineHeight: 1.7,
        textAlign: "center",
        marginBottom: 12,
        fontStyle: "italic",
      }}>
        "Every parent has a moment like this."
        
      </div>

      <div style={{
        fontFamily: font,
        fontSize: 14,
        color: T.muted,
        lineHeight: 1.75,
        textAlign: "center",
        marginBottom: 40,
        padding: "0 16px",
      }}>
        The ones who come back are the ones who heal it.
        You came back.
      </div>

      {/* CTA */}
      <button
        onClick={onContinue}
        style={{
          padding: "15px 32px",
          borderRadius: 32,
          border: "none",
          background: "#5C7A5E",
          color: "#fff",
          fontFamily: font,
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          width: "100%",
          letterSpacing: "0.03em",
          transition: "background 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#4a6650"}
        onMouseLeave={e => e.currentTarget.style.background = "#5C7A5E"}
      >
        Get steady first →
      </button>
    </div>
  );
}

// ─── SCREEN 2 — RESET (GROUNDING TREE) ───────────────────────────────────────

function RepairReset({ onComplete, onClose }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("active"); // active | complete
  const timerRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
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
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (phase === "complete") {
      const t = setTimeout(() => onComplete(), 1800);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  const bpm = Math.round(75 - progress * 15);
  const currentBpm = Math.max(60, bpm);
  const [pulseScale, setPulseScale] = useState(1);
  const pulseRef = useRef(null);

  useEffect(() => {
    function schedulePulse() {
      clearTimeout(pulseRef.current);
      const intervalMs = (60 / currentBpm) * 1000;
      pulseRef.current = setTimeout(() => {
        setPulseScale(1.18);
        try { navigator.vibrate?.([80]); } catch {}
        setTimeout(() => setPulseScale(1), intervalMs * 0.45);
        schedulePulse();
      }, intervalMs);
    }
    schedulePulse();
    return () => clearTimeout(pulseRef.current);
  }, [currentBpm]);

  const rings = [
    { size: 180, opacity: 0.08 },
    { size: 140, opacity: 0.13 },
    { size: 100, opacity: 0.2  },
    { size: 64,  opacity: 0.3  },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 320,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "env(safe-area-inset-top, 24px) 28px 48px",
      background: "#0e1610",
      overflow: "hidden",
    }}>

      <button onClick={onClose} style={{
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 24px) + 8px)", right: 20,
        width: 36, height: 36, borderRadius: "50%",
        background: "rgba(255,255,255,0.08)", border: "none",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.35)", fontSize: 16,
      }}>✕</button>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 32, textAlign: "center",
      }}>

        {/* Eyebrow */}
        <div style={{
          fontFamily: "DM Sans, sans-serif", fontSize: 11,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)", fontWeight: 600,
        }}>
          🌲 The Grounding Tree
        </div>

        {/* Pulse rings */}
        {phase === "active" && (
          <div style={{
            width: 200, height: 200, position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {rings.map((ring, i) => (
              <div key={i} style={{
                position: "absolute",
                width: ring.size, height: ring.size,
                borderRadius: "50%",
                border: `1.5px solid rgba(140,180,120,${ring.opacity})`,
                background: `radial-gradient(circle, rgba(92,122,94,${ring.opacity * 0.5}) 0%, transparent 70%)`,
                transform: `scale(${1 + (pulseScale - 1) * (1 - i * 0.15)})`,
                transition: `transform ${60 / currentBpm * 0.45}s ease-out`,
              }} />
            ))}
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "radial-gradient(circle, #5C7A5E 0%, #2D4A35 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
              transform: `scale(${pulseScale})`,
              transition: `transform ${60 / currentBpm * 0.45}s ease-out`,
              boxShadow: "0 0 20px rgba(92,122,94,0.4)",
            }}>
              🌲
            </div>
          </div>
        )}

        {/* Prompt */}
        {phase === "active" && (
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 26, fontStyle: "italic",
            color: "rgba(255,255,255,0.92)", lineHeight: 1.3,
          }}>
            Press both thumbs. Match the pulse.
          </div>
        )}

        {/* Sub */}
        {phase === "active" && (
          <div style={{
            fontFamily: "DM Sans, sans-serif", fontSize: 13,
            color: "rgba(255,255,255,0.3)", lineHeight: 1.6,
          }}>
            Get yourself steady first. Then we go to them.
          </div>
        )}

        {/* Complete state */}
        {phase === "complete" && (
          <>
            <style>{`
              @keyframes repairReadyFade {
                from { opacity: 0; transform: translateY(14px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <div style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 24, fontStyle: "italic",
              color: "rgba(255,255,255,0.9)", lineHeight: 1.4,
              animation: "repairReadyFade 0.6s ease forwards",
            }}>
              You're steady.
              <br />
              Now we go to them.
            </div>
          </>
        )}
      </div>

      {/* Root timer */}
      {phase === "active" && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 3, background: "rgba(255,255,255,0.07)",
        }}>
          <div style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: "linear-gradient(90deg, #5C7A5E, #8AA67A)",
            transition: "width 0.05s linear",
            borderRadius: "0 2px 2px 0",
          }} />
        </div>
      )}
    </div>
  );
}

// ─── SCREEN 3 — REPAIR SCRIPT ─────────────────────────────────────────────────

function RepairScript({ childName, onComplete, onClose, T }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      paddingTop: 8, paddingBottom: 32,
    }}>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "flex-end", marginBottom: 32,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: "50%",
          background: T.faint, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: T.muted, fontSize: 16,
        }}>✕</button>
      </div>

      {/* Eyebrow */}
      <div style={{
        fontFamily: font, fontSize: 11,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: "#B8924A", fontWeight: 600,
        marginBottom: 16,
      }}>
        Repair Script
      </div>

      {/* Instruction */}
      <div style={{
        fontFamily: serif,
        fontSize: 26,
        fontStyle: "italic",
        color: T.headingText,
        lineHeight: 1.3,
        marginBottom: 28,
      }}>
        Kneel down.
        {childName ? ` Find ${childName}.` : ""} Say this.
      </div>

      {/* Script card — green left border like existing script cards */}
      <div style={{
        background: T.card2,
        borderRadius: 14,
        padding: "18px 20px",
        borderLeft: "4px solid #5C7A5E",
        marginBottom: 20,
      }}>
        <div style={{
          fontFamily: serif,
          fontSize: 20,
          fontStyle: "italic",
          color: T.text,
          lineHeight: 1.65,
        }}>
          "I got too big back there.
          <br />
          That wasn't okay.
          <br />
          I love you."
        </div>
      </div>

      {/* Then hold them */}
      <div style={{
        fontFamily: font,
        fontSize: 14,
        color: T.muted,
        lineHeight: 1.7,
        marginBottom: 16,
        padding: "0 4px",
      }}>
        Then just hold them if they'll let you.
        <br />
        You don't have to fix everything right now.
        <br />
        Just be close.
      </div>

      {/* Clinical note — small, muted */}
      <div style={{
        fontFamily: font,
        fontSize: 12,
        color: T.subText,
        lineHeight: 1.6,
        fontStyle: "italic",
        marginBottom: 40,
        padding: "12px 14px",
        borderRadius: 10,
        background: T.faint,
        border: `1px solid ${T.border}`,
      }}>
        Repair teaches children that relationships can survive hard moments.
        That's one of the most important things a parent can model.
      </div>

      {/* CTA */}
      <button
        onClick={onComplete}
        style={{
          padding: "15px 32px",
          borderRadius: 32,
          border: "none",
          background: "#5C7A5E",
          color: "#fff",
          fontFamily: font,
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          width: "100%",
          letterSpacing: "0.03em",
          transition: "background 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#4a6650"}
        onMouseLeave={e => e.currentTarget.style.background = "#5C7A5E"}
      >
        I said it →
      </button>
    </div>
  );
}

// ─── SCREEN 4 — REPAIR COMPLETE ──────────────────────────────────────────────

function RepairComplete({ childName, userId, familyId, onClose }) {
  const [leafLanded, setLeafLanded] = useState(false);
  const [leavesAdded, setLeavesAdded] = useState(false);

  // Add 1 leaf for repair
  useEffect(() => {
    if (leavesAdded) return;
    setLeavesAdded(true);
    async function addLeaf() {
      if (!userId || !familyId) return;
      try {
        await supabase.from("regulation_checkins").insert({
          user_id:       userId,
          family_id:     familyId,
          state:         "Regulated",
          source:        "sos_repair",
          checkin_type:  "sos",
          checked_in_at: new Date().toISOString(),
          notes:         "Repair complete — came back after snapping",
          answers:       {},
        });
      } catch (err) {
        console.error("[RepairComplete] Failed to add leaf:", err);
      }
    }
    addLeaf();
  }, [userId, familyId, leavesAdded]);

  // Leaf lands after drop animation
  useEffect(() => {
    const t = setTimeout(() => setLeafLanded(true), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "100vh",
      padding: "40px 28px 56px",
      textAlign: "center",
    }}>
      <style>{`
        @keyframes repairLeafDrop {
          0%   { opacity: 0; transform: translateY(-60px) rotate(-20deg); }
          50%  { opacity: 1; }
          80%  { transform: translateY(6px) rotate(6deg); }
          100% { opacity: 1; transform: translateY(0) rotate(4deg); }
        }
        @keyframes repairJarGlow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(140,200,100,0.3)); }
          50%       { filter: drop-shadow(0 0 24px rgba(140,200,100,0.6)); }
        }
        @keyframes repairFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Leaf + jar */}
      <div style={{
        position: "relative", width: 140, height: 180,
        marginBottom: 32,
      }}>
        <img
          src={JAR_IMG}
          alt="leaf jar"
          style={{
            width: 120, height: 160,
            objectFit: "contain",
            position: "absolute", bottom: 0, left: "50%",
            transform: "translateX(-50%)",
            animation: leafLanded ? "repairJarGlow 2s ease-in-out infinite" : "none",
          }}
        />
        <img
          src={leafImg}
          alt=""
          style={{
            width: 48, height: 48,
            objectFit: "contain",
            position: "absolute",
            top: 0, left: "50%",
            marginLeft: -8,
            animation: "repairLeafDrop 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s forwards",
            opacity: 0,
            animationFillMode: "forwards",
          }}
        />
      </div>

      {/* +1 leaf badge */}
      {leafLanded && (
        <div style={{
          padding: "6px 20px", borderRadius: 20,
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.28)",
          fontFamily: font, fontSize: 13,
          color: "rgba(255,255,255,0.85)", fontWeight: 600,
          letterSpacing: "0.04em", marginBottom: 20,
          animation: "repairFadeUp 0.5s ease forwards",
        }}>
          +1 leaf to your forest
        </div>
      )}

      {/* Headline */}
      {leafLanded && (
        <div style={{
          fontFamily: serif, fontSize: 26, fontStyle: "italic",
          color: "rgba(255,255,255,0.97)", lineHeight: 1.35,
          marginBottom: 16,
          animation: "repairFadeUp 0.5s 0.15s ease forwards",
          opacity: 0, animationFillMode: "forwards",
        }}>
          Repair is one of the most
          <br />
          powerful things a parent can do.
        </div>
      )}

      {/* Sub */}
      {leafLanded && (
        <div style={{
          fontFamily: font, fontSize: 14,
          color: "rgba(255,255,255,0.55)",
          lineHeight: 1.7, fontStyle: "italic",
          marginBottom: 40, maxWidth: 280,
          animation: "repairFadeUp 0.5s 0.3s ease forwards",
          opacity: 0, animationFillMode: "forwards",
        }}>
          {childName
            ? `${childName} just learned: relationships can heal.`
            : "Your child just learned: relationships can heal."}
        </div>
      )}

      {/* Done */}
      {leafLanded && (
        <button
          onClick={onClose}
          style={{
            padding: "15px 52px", borderRadius: 32,
            border: "1.5px solid rgba(255,255,255,0.32)",
            background: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.9)",
            fontFamily: font, fontSize: 15, fontWeight: 600,
            cursor: "pointer", letterSpacing: "0.04em",
            animation: "repairFadeUp 0.5s 0.5s ease forwards",
            opacity: 0, animationFillMode: "forwards",
            transition: "background 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
        >
          Done
        </button>
      )}
    </div>
  );
}
