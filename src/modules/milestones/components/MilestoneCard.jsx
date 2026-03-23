// src/modules/milestones/components/MilestoneCard.jsx
import { useState } from "react";
import { useT, useApp, font, serif } from "../../../core/shared.jsx";
import { DOMAINS } from "../data/milestones.js";

const STATUS_CONFIG = {
  reached:       { label: "Reached",      emoji: "✅", color: "#7BAA8A" },
  not_yet:       { label: "Not yet",      emoji: "🕐", color: "#AA9B7B" },
  not_concerned: { label: "Not concerned", emoji: "💛", color: "#A89B5A" },
};

export function MilestoneCard({ milestone, log, onLog, isPremium, showUpgrade }) {
  const T = useT();
  const [expanded, setExpanded] = useState(false);
  const [logging, setLogging] = useState(false);

  const domain = DOMAINS[milestone.domain];
  const currentStatus = log?.status || null;

  async function handleStatus(status) {
    if (logging) return;
    setLogging(true);
    try {
      await onLog(milestone.id, status);
    } finally {
      setLogging(false);
    }
  }

  const hasNsContext = !!milestone.ns_context;
  const hasPedNote = !!milestone.ped_note;

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${currentStatus === "reached" ? `${T.sage}40` : T.border}`,
      background: currentStatus === "reached" ? `${T.sage}08` : T.card,
      padding: "14px 16px",
      marginBottom: 10,
      transition: "all .2s",
    }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{domain?.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: serif,
            fontSize: 15,
            color: T.headingText,
            lineHeight: 1.3,
            marginBottom: 3,
          }}>
            {milestone.title}
          </div>
          <div style={{
            fontFamily: font,
            fontSize: 12,
            color: T.muted,
            lineHeight: 1.5,
          }}>
            {milestone.description}
          </div>
        </div>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(e => !e)} style={{
          background: "none", border: "none",
          fontFamily: font, fontSize: 11, color: T.muted,
          cursor: "pointer", flexShrink: 0, padding: "2px 0",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {expanded ? "Less" : "More"}
          <span style={{ fontSize: 10 }}>{expanded ? "↑" : "↓"}</span>
        </button>
      </div>

      {/* Typical range badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 10px", borderRadius: 20,
        background: T.faint, marginBottom: 10,
      }}>
        <span style={{ fontFamily: font, fontSize: 11, color: T.muted }}>
          Typical range:
        </span>
        <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 600, color: T.text }}>
          {milestone.typical_range[0]}–{milestone.typical_range[1]} months
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginBottom: 12 }}>

          {/* NS Context — Plus only */}
          {hasNsContext && (
            isPremium ? (
              <div style={{
                padding: "11px 13px", borderRadius: 10,
                background: `${T.sage}0d`, border: `1px solid ${T.sage}25`,
                marginBottom: 8,
              }}>
                <div style={{
                  fontFamily: font, fontSize: 10, fontWeight: 700,
                  letterSpacing: ".1em", textTransform: "uppercase",
                  color: T.sage, marginBottom: 6,
                }}>
                  🌿 Nervous system context
                </div>
                <p style={{
                  fontFamily: font, fontSize: 13, color: T.text,
                  lineHeight: 1.7, margin: 0,
                }}>
                  {milestone.ns_context}
                </p>
              </div>
            ) : (
              <button onClick={showUpgrade} style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: `1px dashed ${T.sage}50`,
                background: `${T.sage}06`,
                display: "flex", alignItems: "center", gap: 8,
                cursor: "pointer", marginBottom: 8, textAlign: "left",
              }}>
                <span style={{ fontSize: 16 }}>🌿</span>
                <div>
                  <div style={{ fontFamily: font, fontSize: 12.5, color: T.sage, fontWeight: 600 }}>
                    Nervous system context
                  </div>
                  <div style={{ fontFamily: font, fontSize: 11.5, color: T.muted }}>
                    Unlock with Held Plus →
                  </div>
                </div>
              </button>
            )
          )}

          {/* Pediatrician note */}
          {hasPedNote && (
            <div style={{
              padding: "10px 13px", borderRadius: 10,
              background: `${T.amber}0d`, border: `1px solid ${T.amber}25`,
              marginBottom: 8,
            }}>
              <div style={{
                fontFamily: font, fontSize: 10, fontWeight: 700,
                letterSpacing: ".1em", textTransform: "uppercase",
                color: T.amber, marginBottom: 5,
              }}>
                👩‍⚕️ Talk to your pediatrician
              </div>
              <p style={{
                fontFamily: font, fontSize: 12.5, color: T.text,
                lineHeight: 1.65, margin: 0,
              }}>
                {milestone.ped_note}
              </p>
            </div>
          )}

          {/* Sources */}
          <div style={{
            fontFamily: font, fontSize: 11, color: T.subText,
            lineHeight: 1.6,
          }}>
            Sources: {milestone.source.join(" · ")}
          </div>
        </div>
      )}

      {/* Status buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const isActive = currentStatus === status;
          return (
            <button
              key={status}
              onClick={() => handleStatus(isActive ? null : status)}
              disabled={logging}
              style={{
                padding: "6px 12px", borderRadius: 20,
                border: `1.5px solid ${isActive ? cfg.color : T.border}`,
                background: isActive ? `${cfg.color}18` : "none",
                color: isActive ? cfg.color : T.muted,
                fontFamily: font, fontSize: 12, fontWeight: isActive ? 700 : 400,
                cursor: logging ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 5,
                transition: "all .15s",
              }}
            >
              <span>{cfg.emoji}</span>
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
