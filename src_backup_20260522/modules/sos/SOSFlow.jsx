// src/modules/sos/SOSFlow.jsx
// Held-style SOS flow — full screen overlay.
// Step 0: choose feeling grid (4 options)
// Step 1: intervention (body / reframe / action / script / shift card)
// Saves to regulation_checkins on use.

import { useState } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

// ─── CONTENT ──────────────────────────────────────────────────────────────────
const FEELINGS = [
  { id: "snap",       emoji: "🤬", label: "I'm about to snap"      },
  { id: "overwhelmed",emoji: "😰", label: "I feel overwhelmed"      },
  { id: "wont_listen",emoji: "😵", label: "My kid won't listen"     },
  { id: "failing",    emoji: "😔", label: "I feel like I'm failing" },
];

const INTERVENTIONS = {
  snap: {
    eyebrow: "First — your body",
    bodySteps: [
      "Drop your shoulders right now.",
      "Unclench your jaw.",
      "Press your tongue to the roof of your mouth.",
      "Exhale longer than you inhale.",
    ],
    reframeTitle: "What I'm seeing",
    reframe: "Your nervous system just hit a wall. That's not weakness — that's a body doing exactly what it was built to do. This moment makes complete sense.",
    actionTitle: "One grounded action",
    actionSteps: [
      "Sit next to your child instead of correcting.",
      "Lower your voice before you speak.",
      "Connection before direction.",
    ],
    actionCta: "Lower your voice first →",
    from: "Maxed Out", to: "Present",
    headline: "You caught it before it escalated.",
    sub: "That was earlier than yesterday. You're learning your own system.",
    scripts: null,
  },
  overwhelmed: {
    eyebrow: "First — your body",
    bodySteps: [
      "Both feet flat on the floor.",
      "Breate in waves - in for 4, out for 6. In for 4, out for 6.",
      "Roll your shoulders back and down.",
      "You don't have to fix anything right now.",
    ],
    reframeTitle: "What I'm seeing",
    reframe: "Overwhelm means your system took on more than it could hold. That's not a character flaw — that's a nervous system doing its job. You're not broken. You're full.",
    actionTitle: "One grounded action",
    actionSteps: [
      "Name one thing you can put down for the next 10 minutes.",
      "Not forever. Just right now.",
      "Lower your standards for this hour.",
    ],
    actionCta: "That's enough →",
    from: "Overwhelmed", to: "Back online",
    headline: "You chose to resource yourself first.",
    sub: "That's the whole regulation practice. You're already doing it.",
    scripts: null,
  },
  wont_listen: {
    eyebrow: "First — your body",
    bodySteps: [
      "Bring your shoulders up to your ears and then squeeze. Then drop them as far as they'll go.",
      "Soften your jaw.",
      "Exhale longer than you inhale.",
      "Name what is happening - for you and them",
    ],
    reframeTitle: "What I'm seeing",
    reframe: "When a child 'won't listen,' their nervous system is usually too activated to process language. This is a body trying to survive a dysregulated moment.",
    actionTitle: "One grounded action",
    actionSteps: [
      "Offer connection before direction.",
      "Lower your voice.",
      "Sit next to them instead of standing over them.",
      "Touch a shoulder before you ask anything.",
    ],
    actionCta: "Come close first →",
    from: "Frustrated", to: "Grounded",
    headline: "You stayed connected instead of correcting.",
    sub: "You're coming back faster now.",
    scripts: {
      title: "What to say right now",
      line: "\"I need your eyes. Can I have them?\"",
      tone: "Slow. Low. Like you have all the time in the world.",
      body: "Get physically close before you speak. Eye level if you can.",
    },
  },
  failing: {
    eyebrow: "First — your body",
    bodySteps: [
      "Hand on your chest.",
      "Feel your heartbeat.",
      "You are still here. That matters.",
      "One slow breath. In through the nose, out through the mouth.",
    ],
    reframeTitle: "What I'm seeing",
    reframe: "Parents who worry they're failing are almost never the ones actually failing. The fact that you're here — asking this question — is the evidence. You care. That's the whole thing.",
    actionTitle: "One grounded action",
    actionSteps: [
      "Name one moment this week when you showed up.",
      "It doesn't have to be big.",
      "You're building something — even when you can't see it.",
    ],
    actionCta: "I see you →",
    from: "Doubting", to: "Present",
    headline: "You chose to look for evidence instead of disappearing into the doubt.",
    sub: "That's the whole practice.",
    scripts: null,
  },
};

// ─── STEP 0: FEELING PICKER ───────────────────────────────────────────────────
function StepFeelings({ onSelect, onClose, T }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 32, maxWidth: 480, width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontFamily: serif, fontSize: 30, color: T.headingText, lineHeight: 1.15, fontStyle: "italic" }}>
          I need help right now.
        </div>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: T.faint, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: T.muted, fontSize: 16, marginLeft: 12, marginTop: 4,
        }}>✕</button>
      </div>

      <div style={{ fontFamily: font, fontSize: 14, color: T.muted, marginBottom: 22 }}>
        What's happening for you right now?
      </div>

      {/* Single-column feeling list — warm blush borders like wireframe */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {FEELINGS.map(f => (
          <button key={f.id} onClick={() => onSelect(f.id)} style={{
            display: "flex", flexDirection: "row", alignItems: "center",
            gap: 14, padding: "14px 18px",
            borderRadius: 14, border: `1.5px solid ${T.border}`,
            background: T.card2, cursor: "pointer", textAlign: "left",
            transition: "all .15s", width: "100%",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.warm; e.currentTarget.style.background = T.faint; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card2; }}
          >
            <span style={{ fontSize: 26, flexShrink: 0 }}>{f.emoji}</span>
            <span style={{ fontFamily: font, fontSize: 15, color: T.text, lineHeight: 1.4, fontWeight: 500 }}>
              {f.label}
            </span>
          </button>
        ))}
      </div>

      {/* Hint */}
      <div style={{
        marginTop: 14, padding: "12px 16px", borderRadius: 12,
        background: T.faint, border: `1px solid ${T.border}`,
      }}>
        <span style={{ fontFamily: font, fontSize: 13, color: T.muted, fontStyle: "italic", lineHeight: 1.6 }}>
          "You don't have to name it perfectly. Just tap what's closest."
        </span>
      </div>
    </div>
  );
}
function StepIntervention({ feelingId, onClose, onBack, T, sosUseCount, setTab }) {
  const int = INTERVENTIONS[feelingId];
  if (!int) return null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: "50%",
          background: T.faint, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: T.muted, fontSize: 16,
        }}>←</button>
        <div style={{ fontFamily: serif, fontSize: 20, fontStyle: "italic", color: T.headingText }}>
          {FEELINGS.find(f => f.id === feelingId)?.label}
        </div>
        <button onClick={onClose} style={{
          marginLeft: "auto",
          width: 32, height: 32, borderRadius: "50%",
          background: T.faint, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: T.muted, fontSize: 14,
        }}>✕</button>
      </div>

      {/* Body steps — with breathing circle */}
      <IntCard eyebrow={int.eyebrow} T={T}>
        {/* Breathing circle — icon and color tuned to regulation intent */}
        {(() => {
          const stateVisual = {
            snap:         { emoji: "🌊", bg: "#F5EDE0", border: "#D4A574" },
            overwhelmed:  { emoji: "🌳", bg: T.faint, border: T.border },
            wont_listen:  { emoji: "🫁", bg: "#E8EEF0", border: "#A8C4CA" },
            failing:      { emoji: "🕯️", bg: "#F5F0E8", border: "#D4C9A8" },
          };
          const v = stateVisual[feelingId] || { emoji: "🌿", bg: T.faint, border: T.border };
          return (
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: v.bg,
              border: `2px solid ${v.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 32,
              animation: "breathe 4s ease-in-out infinite",
            }}>
              {v.emoji}
            </div>
          );
        })()}
        <style>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 ${
              feelingId === "snap" ? "rgba(212,165,116,0.2)" :
              feelingId === "wont_listen" ? "rgba(168,196,202,0.2)" :
              feelingId === "failing" ? "rgba(212,201,168,0.2)" :
              "rgba(92,122,94,0.15)"
            }; }
            50% { transform: scale(1.08); box-shadow: 0 0 0 14px ${
              feelingId === "snap" ? "rgba(212,165,116,0)" :
              feelingId === "wont_listen" ? "rgba(168,196,202,0)" :
              feelingId === "failing" ? "rgba(212,201,168,0)" :
              "rgba(92,122,94,0)"
            }; }
          }
        `}</style>
        {int.bodySteps.map((step, i) => step ? (
          <div key={i} style={{
            fontFamily: font, fontSize: 14.5, color: T.text,
            lineHeight: 1.7, marginBottom: 2,
          }}>
            {step}
          </div>
        ) : <div key={i} style={{ height: 8 }} />)}
      </IntCard>

      {/* Reframe */}
      <IntCard eyebrow={int.reframeTitle} T={T}>
        <div style={{
          fontFamily: serif, fontSize: 16, fontStyle: "italic",
          color: T.text, lineHeight: 1.65,
        }}>
          "{int.reframe}"
        </div>
      </IntCard>

      {/* Script card — rich wireframe style */}
      {int.scripts && (
        <div style={{
          borderRadius: 14, padding: "16px 18px", marginBottom: 10,
          background: T.faint, border: `1px solid ${T.border}`,
        }}>
          <div style={{
            fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase",
            color: "#5C7A5E", fontFamily: font, fontWeight: 700, marginBottom: 12,
          }}>
            {int.scripts.title}
          </div>

          {/* Script line with green left border */}
          <div style={{
            background: "#fff", borderRadius: 10, padding: "12px 14px",
            borderLeft: "3px solid #5C7A5E", marginBottom: 12,
            fontFamily: serif, fontSize: 16, fontStyle: "italic",
            color: "#1E2D1E", lineHeight: 1.6,
          }}>
            {int.scripts.line}
          </div>

          {/* Tone chip */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "#F5EDE0", border: "1px solid #E0C896",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 1,
            }}>
              <span style={{ fontSize: 13 }}>🎵</span>
              <span style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: "#B8924A" }}>Tone</span>
            </div>
            <div style={{ fontFamily: font, fontSize: 13, color: "#5C5C5C", lineHeight: 1.6, paddingTop: 3 }}>
              {int.scripts.tone}
            </div>
          </div>

          {/* Body chip */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "#F5EDE0", border: "1px solid #E0C896",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 1,
            }}>
              <span style={{ fontSize: 13 }}>👐</span>
              <span style={{ fontFamily: font, fontSize: 8, fontWeight: 700, color: "#B8924A" }}>Body</span>
            </div>
            <div style={{ fontFamily: font, fontSize: 13, color: "#5C5C5C", lineHeight: 1.6, paddingTop: 3 }}>
              {int.scripts.body}
            </div>
          </div>

          {/* Divider + see more link */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
            <button onClick={() => { onClose(); setTab?.("library"); }} style={{
              background: "none", border: "none", padding: 0,
              fontFamily: font, fontSize: 13, fontWeight: 600,
              color: "#5C7A5E", cursor: "pointer",
            }}>
              See more scripts for this moment →
            </button>
          </div>
        </div>
      )}

      {/* Action */}
      <IntCard eyebrow={int.actionTitle} T={T}>
        {int.actionSteps.map((step, i) => (
          <div key={i} style={{
            fontFamily: font, fontSize: 14.5, color: T.text,
            lineHeight: 1.7, marginBottom: 2,
          }}>
            {step}
          </div>
        ))}
        <button onClick={onClose} style={{
          marginTop: 14, padding: "11px 22px",
          borderRadius: 24, border: "none",
          background: T.bark, color: "#fff",
          fontFamily: font, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        }}>
          {int.actionCta}
        </button>
      </IntCard>

      {/* State shift banner — dusty sage, matches wireframe */}
      <div style={{
        borderRadius: 16, padding: "18px 20px", marginBottom: 10,
        background: "#8AA693",
      }}>
        <div style={{
          fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.7)", fontFamily: font, fontWeight: 700, marginBottom: 12,
        }}>
          Your shift right now
        </div>

        {sosUseCount > 1 && (
          <div style={{
            marginBottom: 10,
            fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.6)",
            fontStyle: "italic",
          }}>
            {sosUseCount}× you've come here instead of spiraling. That's the practice.
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            padding: "5px 14px", borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.4)", background: "transparent",
            fontFamily: font, fontSize: 12.5, color: "rgba(255,255,255,0.75)",
          }}>{int.from}</div>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}>→</span>
          <div style={{
            padding: "5px 14px", borderRadius: 20,
            background: T.bark,
            fontFamily: font, fontSize: 12.5, fontWeight: 700, color: "#fff",
          }}>{int.to}</div>
        </div>
        <div style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
          {int.headline}
        </div>
        <div style={{ fontFamily: font, fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>
          {int.sub}
        </div>
      </div>
    </div>
  );
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function IntCard({ eyebrow, children, T, accent }) {
  return (
    <div style={{
      borderRadius: 14, padding: "16px 18px", marginBottom: 10,
      background: T.card, border: `1px solid ${T.border}`,
    }}>
      {eyebrow && (
        <div style={{
          fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase",
          color: accent || "#B8924A", fontFamily: font, fontWeight: 700, marginBottom: 10,
        }}>
          {eyebrow}
        </div>
      )}
      {children}
    </div>
  );
}

function Chip({ label, color, filled, T }) {
  return (
    <div style={{
      padding: "5px 12px", borderRadius: 20,
      background: filled ? color : T.faint,
      border: `1px solid ${color}`,
      fontFamily: font, fontSize: 12.5,
      fontWeight: filled ? 600 : 400,
      color: filled ? "#fff" : T.muted,
    }}>
      {label}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function SOSFlow({ onClose, setTab }) {
  const T = useT();
  const { currentUser, activeFamily } = useApp();
  const [step, setStep] = useState(0); // 0 = picker, 1 = intervention
  const [feelingId, setFeelingId] = useState(null);
  const [sosUseCount, setSosUseCount] = useState(0);

  async function handleSelectFeeling(id) {
    setFeelingId(id);
    setStep(1);

    // Save to regulation_checkins — SOS category maps to a state
    const stateMap = {
      snap: "Fight",
      overwhelmed: "Shutdown",
      wont_listen: "Fight",
      failing: "Freeze",
    };
    const state = stateMap[id] || "Stretched";

    if (currentUser?.id && activeFamily?.id) {
      try {
        await supabase.from("regulation_checkins").insert({
          user_id: currentUser.id,
          family_id: activeFamily.id,
          state,
          source: "sos",
          feeling_id: id,
          checked_in_at: new Date().toISOString(),
        });
      } catch { /* silent */ }
    }

    // Track local use count in session
    setSosUseCount(c => c + 1);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: T.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center",
      overflowY: "auto",
      padding: "env(safe-area-inset-top, 24px) 20px 0",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
      {step === 0 && (
        <StepFeelings
          onSelect={handleSelectFeeling}
          onClose={onClose}
          T={T}
        />
      )}
      {step === 1 && feelingId && (
        <StepIntervention
          feelingId={feelingId}
          onClose={onClose}
          onBack={() => { setStep(0); setFeelingId(null); }}
          T={T}
          sosUseCount={sosUseCount}
          setTab={setTab}
        />
      )}
      </div>
    </div>
  );
}
