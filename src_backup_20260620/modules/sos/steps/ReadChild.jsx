// src/modules/sos/steps/ReadChild.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Screen 3 of the co-regulation flow — Read Your Child.
// Parent selects what their child looks like right now.
//
// CHILD STATES:
//   flooded  → moving, loud, coming at you
//   shutdown → still, quiet, pulling away
//   tipping  → bouncing between both
//
// On selection: calls onSelect(childState)
// ─────────────────────────────────────────────────────────────────────────────

import { useT, font, serif } from "../../../core/shared.jsx";
import { CHILD_STATE_OPTIONS } from "../../../data/coRegGames.js";

export function ReadChild({ childName, onSelect, onClose }) {
  const T = useT();

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
          fontSize: 28,
          color: T.headingText,
          lineHeight: 1.2,
          fontStyle: "italic",
          flex: 1,
          paddingRight: 12,
        }}>
          What does {childName ? childName : "your child"} look like right now?
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: T.faint, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: T.muted, fontSize: 16, marginTop: 4,
          }}
        >✕</button>
      </div>

      <div style={{
        fontFamily: font,
        fontSize: 14,
        color: T.muted,
        marginBottom: 28,
      }}>
        Just pick what's closest.
      </div>

      {/* ── Child state cards ── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        {CHILD_STATE_OPTIONS.map(option => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              padding: "18px 20px",
              borderRadius: 16,
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
            {/* State emoji — larger for quick scanning */}
            <span style={{ fontSize: 32, flexShrink: 0 }}>
              {option.emoji}
            </span>

            {/* Label */}
            <span style={{
              fontFamily: font,
              fontSize: 16,
              color: T.text,
              lineHeight: 1.4,
              fontWeight: 500,
            }}>
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Hint card ── */}
      <div style={{
        marginTop: 20,
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
          "You know your child. Trust what you see."
        </span>
      </div>
    </div>
  );
}
