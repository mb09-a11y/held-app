// src/modules/sos/steps/ParentReset.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Screen 2 of the co-regulation flow — Parent Reset.
// Three mechanics based on parent state:
//
//   A — "Exhale the Wind"    mic input, leaf floats on slow exhale
//   B — "The Grounding Tree" haptic + visual pulse, 75→60 BPM entrainment
//   C — "Clear the Fog"      drag with resistance, fog clears to fireflies
//
// Timer: 20 seconds root-grows-across-bottom animation.
// On complete: screen warms to amber, bridge text appears, onComplete() called.
//
// NOTE: iOS does not support navigator.vibrate() — haptic is Android/desktop only.
// Visual entrainment still works on all platforms.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useT, font, serif } from "../../../core/shared.jsx";
import { PARENT_RESETS } from "../../../data/coRegGames.js";

const TIMER_DURATION = 20; // seconds

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function ParentReset({ resetType, childName, onComplete, onClose }) {
  const T = useT();
  const reset = PARENT_RESETS[resetType];
  const [phase, setPhase] = useState("active"); // active | complete
  const [progress, setProgress] = useState(0);  // 0–1 for root timer
  const timerRef = useRef(null);
  const startRef = useRef(null);

  // ── Root timer ──────────────────────────────────────────────────────────────
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
  }, [resetType]);

  // ── Auto-advance after completion ───────────────────────────────────────────
  useEffect(() => {
    if (phase === "complete") {
      const t = setTimeout(() => onComplete(), 2200);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  const isComplete = phase === "complete";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 310,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "env(safe-area-inset-top, 24px) 24px 40px",
      transition: "background 1.2s ease",
      background: isComplete
        ? "linear-gradient(160deg, #3d5a3e 0%, #5c7a4a 50%, #8a6a3a 100%)"
        : "#0e1610",
      overflow: "hidden",
    }}>

      {/* Close button — top right */}
      <button onClick={onClose} style={{
        position: "absolute", top: "calc(env(safe-area-inset-top, 24px) + 8px)", right: 20,
        width: 36, height: 36, borderRadius: "50%",
        background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.4)", fontSize: 16,
      }}>✕</button>

      {/* Content area */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        width: "100%", maxWidth: 360, gap: 32,
      }}>

        {/* Title eyebrow */}
        {!isComplete && (
          <div style={{
            fontFamily: font, fontSize: 11, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.35)",
            fontWeight: 600,
          }}>
            🌲 {reset.title}
          </div>
        )}

        {/* Mechanic visual */}
        {!isComplete && (
          <>
            {resetType === "A" && <ResetA T={T} />}
            {resetType === "B" && <ResetB progress={progress} />}
            {resetType === "C" && <ResetC />}
          </>
        )}

        {/* Prompt text */}
        {!isComplete && (
          <div style={{
            fontFamily: serif, fontSize: 26, fontStyle: "italic",
            color: "rgba(255,255,255,0.92)", textAlign: "center",
            lineHeight: 1.3, letterSpacing: "0.01em",
          }}>
            {reset.prompt}
          </div>
        )}

        {/* Completion state */}
        {isComplete && (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 20,
            animation: "fadeUp 0.6s ease forwards",
          }}>
            <style>{`
              @keyframes fadeUp {
                from { opacity: 0; transform: translateY(16px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              @keyframes leafDrop {
                0%   { opacity: 0; transform: translateY(-30px) rotate(-15deg); }
                60%  { opacity: 1; }
                100% { opacity: 1; transform: translateY(0) rotate(5deg); }
              }
            `}</style>
            <div style={{
              fontSize: 52,
              animation: "leafDrop 0.8s ease forwards",
            }}>🍂</div>
            <div style={{
              fontFamily: serif, fontSize: 22, fontStyle: "italic",
              color: "rgba(255,255,255,0.95)", textAlign: "center",
              lineHeight: 1.4,
            }}>
              {childName
                ? `${childName} needs you. You're ready.`
                : "You're ready."}
            </div>
          </div>
        )}
      </div>

      {/* Root timer — grows across the bottom */}
      {!isComplete && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 3, background: "rgba(255,255,255,0.08)",
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

// ─── RESET A — EXHALE THE WIND ────────────────────────────────────────────────
// Mic input: slow exhale → leaf glides; fast/sharp → leaf shakes + turns red

function ResetA({ T }) {
  const [leafState, setLeafState] = useState("idle"); // idle | gliding | erratic
  const [leafX, setLeafX] = useState(10);             // % from left
  const [leafY, setLeafY] = useState(50);             // % from top
  const [leafRed, setLeafRed] = useState(false);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const volumeHistoryRef = useRef([]);
  const [micGranted, setMicGranted] = useState(false);
  const [micDenied, setMicDenied] = useState(false);

  useEffect(() => {
    startMic();
    return () => {
      stopMic();
    };
  }, []);

  async function startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      setMicGranted(true);
      tick();
    } catch {
      setMicDenied(true);
    }
  }

  function stopMic() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }

  function tick() {
    rafRef.current = requestAnimationFrame(tick);
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    // Rolling average volume — prevents false triggers from ambient noise
    const raw = data.reduce((a, b) => a + b, 0) / data.length;
    const history = volumeHistoryRef.current;
    history.push(raw);
    if (history.length > 8) history.shift();
    const avg = history.reduce((a, b) => a + b, 0) / history.length;

    // Detect breath type
    const isBrowing = avg > 8;        // any meaningful exhale
    const isSharp = raw > avg * 2.2;  // spike = fast/sharp exhale

    if (isBrowing && isSharp) {
      // Fast exhale — leaf goes erratic, turns red
      setLeafState("erratic");
      setLeafRed(true);
      setLeafX(x => Math.max(5, x - 3 + Math.random() * 8 - 4));
      setLeafY(y => Math.max(10, Math.min(85, y + Math.random() * 20 - 10)));
    } else if (isBrowing && !isSharp) {
      // Slow exhale — leaf glides smoothly toward soil (right + slightly down)
      setLeafState("gliding");
      setLeafRed(false);
      setLeafX(x => Math.min(88, x + 1.2));
      setLeafY(y => Math.min(75, y + 0.4));
    } else {
      // No breath
      setLeafState("idle");
      setLeafRed(false);
    }
  }

  return (
    <div style={{
      width: 280, height: 200, position: "relative",
      borderRadius: 20, overflow: "hidden",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <style>{`
        @keyframes leafErratic {
          0%, 100% { transform: rotate(-10deg) scale(1); }
          25%       { transform: rotate(15deg) scale(1.1); }
          50%       { transform: rotate(-20deg) scale(0.9); }
          75%       { transform: rotate(10deg) scale(1.05); }
        }
        @keyframes leafGlide {
          0%, 100% { transform: rotate(-5deg); }
          50%       { transform: rotate(5deg); }
        }
      `}</style>

      {/* Ground line */}
      <div style={{
        position: "absolute", bottom: 24, left: 0, right: 0,
        height: 1, background: "rgba(255,255,255,0.1)",
      }} />

      {/* Soil label */}
      <div style={{
        position: "absolute", bottom: 8, left: 0, right: 0,
        textAlign: "center", fontFamily: font, fontSize: 10,
        color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em",
      }}>
        {leafState === "gliding" ? "keep going..." : "blow slowly ↓"}
      </div>

      {/* Leaf */}
      {micGranted && (
        <div style={{
          position: "absolute",
          left: `${leafX}%`, top: `${leafY}%`,
          transform: "translate(-50%, -50%)",
          fontSize: 28,
          filter: leafRed ? "hue-rotate(120deg) saturate(2)" : "none",
          animation: leafState === "erratic"
            ? "leafErratic 0.3s ease infinite"
            : leafState === "gliding"
            ? "leafGlide 1.2s ease-in-out infinite"
            : "none",
          transition: leafState === "gliding"
            ? "left 0.3s ease-out, top 0.3s ease-out"
            : "left 0.1s, top 0.1s",
        }}>
          🍃
        </div>
      )}

      {/* Mic permission states */}
      {!micGranted && !micDenied && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 8,
        }}>
          <div style={{ fontSize: 28 }}>🎤</div>
          <div style={{
            fontFamily: font, fontSize: 12,
            color: "rgba(255,255,255,0.4)", textAlign: "center",
          }}>
            Allow microphone to continue
          </div>
        </div>
      )}
      {micDenied && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 8, padding: 16,
        }}>
          <div style={{ fontSize: 24 }}>🌬️</div>
          <div style={{
            fontFamily: font, fontSize: 12,
            color: "rgba(255,255,255,0.4)", textAlign: "center",
            lineHeight: 1.5,
          }}>
            Take a long slow exhale through your mouth. Longer out than in.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RESET B — THE GROUNDING TREE ─────────────────────────────────────────────
// Haptic + visual pulse rings. 75 BPM → 60 BPM over 20 seconds.
// iOS: visual only. Android/desktop: haptic + visual.

function ResetB({ progress }) {
  const pulseRef = useRef(null);
  const bpmRef = useRef(75);
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    // BPM steps from 75 down to 60 over 20 seconds
    bpmRef.current = Math.round(75 - progress * 15);
    schedulePulse();
    return () => clearTimeout(pulseRef.current);
  }, [progress]);

  function schedulePulse() {
    clearTimeout(pulseRef.current);
    const intervalMs = (60 / bpmRef.current) * 1000;
    pulseRef.current = setTimeout(() => {
      // Expand
      setPulseScale(1.18);
      // Haptic — works on Android/desktop, silently ignored on iOS
      try { navigator.vibrate?.([80]); } catch {}
      setTimeout(() => setPulseScale(1), intervalMs * 0.45);
      schedulePulse();
    }, intervalMs);
  }

  // Ring colors — outer to inner
  const rings = [
    { size: 200, opacity: 0.08 },
    { size: 160, opacity: 0.13 },
    { size: 120, opacity: 0.18 },
    { size: 80,  opacity: 0.28 },
  ];

  const currentBpm = Math.round(75 - progress * 15);

  return (
    <div style={{
      width: 220, height: 220, position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Concentric rings */}
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

      {/* Center tree trunk */}
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

      {/* BPM label — shows entrainment progress */}
      <div style={{
        position: "absolute", bottom: -8,
        fontFamily: font, fontSize: 10,
        color: "rgba(255,255,255,0.2)",
        letterSpacing: "0.08em",
      }}>
        {currentBpm} bpm
      </div>
    </div>
  );
}

// ─── RESET C — CLEAR THE FOG ──────────────────────────────────────────────────
// Drag with friction to clear fog and reveal fireflies beneath.

function ResetC() {
  const canvasRef = useRef(null);
  const clearedRef = useRef(new Set());
  const [clearPercent, setClearPercent] = useState(0);
  const firefliesRef = useRef([]);

  // Initialize fireflies once
  useEffect(() => {
    firefliesRef.current = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 15 + Math.random() * 70,
      size: 3 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  const GRID = 20; // grid cell size for tracking cleared areas
  const W = 280, H = 180;

  function getCell(x, y) {
    const col = Math.floor(x / GRID);
    const row = Math.floor(y / GRID);
    return `${col}-${row}`;
  }

  function handleDrag(clientX, clientY, rect) {
    // Apply dampening — drag feels heavy/resistant
    // We track cleared cells on a grid so small slow swipes feel deliberate
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Clear a circle around the touch point (radius = 28px)
    const radius = 28;
    for (let dy = -radius; dy <= radius; dy += GRID / 2) {
      for (let dx = -radius; dx <= radius; dx += GRID / 2) {
        if (dx * dx + dy * dy <= radius * radius) {
          const cell = getCell(x + dx, y + dy);
          clearedRef.current.add(cell);
        }
      }
    }

    const totalCells = Math.ceil(W / GRID) * Math.ceil(H / GRID);
    const pct = Math.min(clearedRef.current.size / totalCells, 1);
    setClearPercent(pct);
  }

  function onMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    handleDrag(e.clientX, e.clientY, rect);
  }

  function onTouchMove(e) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    handleDrag(touch.clientX, touch.clientY, rect);
  }

  const fogOpacity = Math.max(0, 1 - clearPercent * 1.4);

  return (
    <div
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      style={{
        width: W, height: H,
        position: "relative", borderRadius: 16, overflow: "hidden",
        background: "#0a1209",
        border: "1px solid rgba(255,255,255,0.07)",
        cursor: "crosshair",
        touchAction: "none", // prevent scroll during drag
      }}
    >
      {/* Fireflies beneath fog */}
      {firefliesRef.current.map(f => (
        <FireflyDot key={f.id} {...f} visible={clearPercent > 0.1} />
      ))}

      {/* Fog overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: `rgba(14,22,16, ${fogOpacity})`,
        backdropFilter: `blur(${fogOpacity * 8}px)`,
        transition: "background 0.3s, backdrop-filter 0.3s",
        pointerEvents: "none",
        borderRadius: 16,
      }} />

      {/* Instruction overlay — fades as clearing progresses */}
      {clearPercent < 0.15 && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            fontFamily: font, fontSize: 12,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.06em",
          }}>
            drag slowly ←→
          </div>
        </div>
      )}
    </div>
  );
}

// Single animated firefly dot
function FireflyDot({ x, y, size, phase, visible }) {
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setGlow(g => !g);
    }, 800 + phase * 400);
    return () => clearInterval(interval);
  }, [visible, phase]);

  return (
    <div style={{
      position: "absolute",
      left: `${x}%`, top: `${y}%`,
      width: size, height: size,
      borderRadius: "50%",
      background: glow ? "#c8e87a" : "#8ab84a",
      boxShadow: glow
        ? `0 0 ${size * 3}px ${size}px rgba(180,230,80,0.6)`
        : `0 0 ${size}px ${size / 2}px rgba(140,185,60,0.3)`,
      transition: "all 0.8s ease",
      opacity: visible ? 1 : 0,
    }} />
  );
}
