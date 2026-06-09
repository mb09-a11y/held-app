// src/modules/sos/steps/SOSEntry.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Screen 1 of the co-regulation flow.
// Parent selects what's happening for them right now.
//
// STATES:
//   twitchy_wired   → Reset A (Exhale the Wind)
//   drowning        → Reset B (Grounding Tree)
//   foggy           → Reset C (Clear the Fog)
//   wont_listen     → micro-branch → Reset A or C
//   already_snapped → Repair Flow
//
// On selection: creates the sos_sessions row via useSOSSession,
// then calls onSelect(parentState, parentSubstate, resetType).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useT, font, serif } from "../../../core/shared.jsx";

// ─── PARENT STATE OPTIONS ────────────────────────────────────────────────────

const PARENT_STATES = [
  {
    id: "twitchy_wired",
    emoji: "⚡",
    label: "My body feels twitchy/wired",
    resetType: "A",
    substate: null,
  },
  {
    id: "drowning",
    emoji: "🌊",
    label: "I feel like I'm drowning",
    resetType: "B",
    substate: null,
  },
  {
    id: "foggy",
    emoji: "🌫️",
    label: "I feel foggy/checked out",
    resetType: "C",
    substate: null,
  },
  {
    id: "wont_listen",
    emoji: "😵",
    label: "My kid won't listen",
    resetType: null, // determined by micro-branch
    substate: null,
  },
  {
    id: "already_snapped",
    emoji: "💔",
    label: "I already snapped",
    resetType: "B", // repair flow uses grounding tree
    substate: null,
  },
];

// ─── MICRO-BRANCH OPTIONS ────────────────────────────────────────────────────
// Shown instantly when parent taps "My kid won't listen"

const SUBSTATES = [
  {
    id: "mad_anxious",
    emoji: "💥",
    label: "Mad / Anxious",
    resetType: "A",
  },
  {
    id: "done_exhausted",
    emoji: "🏳️",
    label: "Done / Exhausted",
    resetType: "C",
  },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function SOSEntry({ onSelect, onClose }) {
  const T = useT();
  const [showBranch, setShowBranch] = useState(false);

  function handleStateSelect(state) {
    if (state.id === "wont_listen") {
      // Show micro-branch instantly — no delay
      setShowBranch(true);
      return;
    }
    // All other states route directly
    onSelect(state.id, null, state.resetType);
  }

  function handleSubstateSelect(substate) {
    onSelect("wont_listen", substate.id, substate.resetType);
  }

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      paddingBottom: 32,
      maxWidth: 480,
      width: "100%",
    }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <div style={{
          fontFamily: serif,
          fontSize: 30,
          color: T.headingText,
          lineHeight: 1.15,
          fontStyle: "italic",
        }}>
          I need help right now.
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: T.faint, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: T.muted, fontSize: 16, marginLeft: 12, marginTop: 4,
          }}
        >✕</button>
      </div>

      <div style={{
        fontFamily: font,
        fontSize: 14,
        color: T.muted,
        marginBottom: 22,
      }}>
        What's happening for you right now?
      </div>

      {/* ── Parent state cards ── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        {PARENT_STATES.map(state => (
          <button
            key={state.id}
            onClick={() => handleStateSelect(state)}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              borderRadius: 14,
              border: `1.5px solid ${T.border}`,
              background: T.card2,
              cursor: "pointer",
              textAlign: "left",
              transition: "all .15s",
              width: "100%",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = T.warm;
              e.currentTarget.style.background = T.faint;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = T.border;
              e.currentTarget.style.background = T.card2;
            }}
          >
            <span style={{ fontSize: 26, flexShrink: 0 }}>{state.emoji}</span>
            <span style={{
              fontFamily: font,
              fontSize: 15,
              color: T.text,
              lineHeight: 1.4,
              fontWeight: 500,
            }}>
              {state.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Micro-branch: "My kid won't listen" sub-options ── */}
      {/* Slides up instantly when wont_listen is tapped */}
      <div style={{
        overflow: "hidden",
        maxHeight: showBranch ? 200 : 0,
        opacity: showBranch ? 1 : 0,
        transition: "max-height 0.18s ease-out, opacity 0.15s ease-out",
        marginTop: showBranch ? 8 : 0,
      }}>
        <div style={{
          padding: "14px 16px",
          borderRadius: 14,
          background: T.faint,
          border: `1.5px solid ${T.border}`,
        }}>
          <div style={{
            fontFamily: font,
            fontSize: 12,
            color: T.muted,
            marginBottom: 10,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}>
            How does it make you feel?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {SUBSTATES.map(sub => (
              <button
                key={sub.id}
                onClick={() => handleSubstateSelect(sub)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `1.5px solid ${T.border}`,
                  background: T.card2,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = T.warm;
                  e.currentTarget.style.background = T.card;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.background = T.card2;
                }}
              >
                <span style={{ fontSize: 20 }}>{sub.emoji}</span>
                <span style={{
                  fontFamily: font,
                  fontSize: 14,
                  color: T.text,
                  fontWeight: 500,
                }}>
                  {sub.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hint card ── */}
      <div style={{
        marginTop: 14,
        padding: "12px 16px",
        borderRadius: 12,
        background: T.faint,
        border: `1px solid ${T.border}`,
      }}>
        <span style={{
          fontFamily: font,
          fontSize: 13,
          color: T.muted,
          fontStyle: "italic",
          lineHeight: 1.6,
        }}>
          "You don't have to name it perfectly. Just tap what's closest."
        </span>
      </div>
    </div>
  );
}
