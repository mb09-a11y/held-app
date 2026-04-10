// src/modules/milestones/components/MilestoneCard.jsx
import { useState } from "react";
import { useT, useApp, font, serif } from "../../../core/shared.jsx";
import { DOMAINS } from "../data/milestones.js";

// RCC color constants now derived from theme tokens - no hardcoding
function getRCC(T) {
  return {
    forest:     T.bark,
    sage:       T.teal,
    sageMid:    T.sage,
    sageLight:  T.faint,
    sageBorder: T.border,
    amber:      T.warm,
    amberLight: T.faint,
    amberBorder:T.border,
    sand:       T.border,
    sandLight:  T.card2,
    muted:      T.muted,
    text:       T.text,
    heading:    T.headingText,
  };
}

function ageLabel(months) {
  if (months == null) return "";
  if (months < 24) return `${months}mo`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y}y` : `${y}y ${m}mo`;
}

export function MilestoneCard({ milestone, log, onLog, isPremium, showUpgrade }) {
  const T = useT();
  const RCC = getRCC(T);
  const [expanded, setExpanded] = useState(false);
  const [logging, setLogging] = useState(false);
  const domain = DOMAINS[milestone.domain];
  const currentStatus = log?.status || null;
  const isReached = currentStatus === "reached";

  async function handleStatus(status) {
    if (logging) return;
    setLogging(true);
    try { await onLog(milestone.id, status); }
    finally { setLogging(false); }
  }

  return (
    <div style={{
      borderRadius: 16,
      border: `1px solid ${isReached ? RCC.sageBorder : T.border}`,
      background: isReached ? `${RCC.sageLight}22` : T.card,
      padding: "16px 18px", marginBottom: 10, transition: "all .2s",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{domain?.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: serif, fontSize: 16, color: T.headingText, lineHeight: 1.3, fontWeight: 600, marginBottom: 4 }}>
            {milestone.title}
          </div>
          <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.55 }}>
            {milestone.description}
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} style={{
          background: "none", border: "none", fontFamily: font, fontSize: 11,
          color: RCC.muted, cursor: "pointer", flexShrink: 0, padding: "2px 0",
        }}>
          {expanded ? "Less ↑" : "More ↓"}
        </button>
      </div>

      {/* Typical range — warm dusty gold pill like wireframe */}
      <div style={{
        display: "inline-flex", alignItems: "center",
        padding: "4px 12px", borderRadius: 20,
        background: T.border, marginBottom: 12,
      }}>
        <span style={{ fontFamily: font, fontSize: 11, color: T.muted, marginRight: 5 }}>
          Typical range:
        </span>
        <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: T.text }}>
          {ageLabel(milestone.typical_range[0])}–{ageLabel(milestone.typical_range[1])}
        </span>
      </div>

      {/* NS context — always inline, italic sage */}
      {milestone.ns_context && isPremium && (
        <div style={{
          display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 12,
          fontFamily: font, fontSize: 12.5, color: RCC.sage,
          fontStyle: "italic", lineHeight: 1.6,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🌿</span>
          <span>{milestone.ns_context}</span>
        </div>
      )}
      {milestone.ns_context && !isPremium && (
        <button onClick={showUpgrade} style={{
          width: "100%", padding: "9px 14px", borderRadius: 10, marginBottom: 12,
          border: `1px dashed ${RCC.sageBorder}`, background: T.faint,
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left",
        }}>
          <span>🌿</span>
          <div>
            <div style={{ fontFamily: font, fontSize: 12.5, color: RCC.sage, fontWeight: 600 }}>Nervous system context</div>
            <div style={{ fontFamily: font, fontSize: 11.5, color: RCC.muted }}>Unlock with Held Plus →</div>
          </div>
        </button>
      )}

      {/* Expanded */}
      {expanded && (
        <div style={{ marginBottom: 12 }}>
          {milestone.ped_note && (
            <div style={{ padding: "11px 13px", borderRadius: 10, marginBottom: 8, background: RCC.amberLight, border: `1px solid ${RCC.amberBorder}` }}>
              <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: RCC.amber, marginBottom: 5 }}>
                👩‍⚕️ Talk to your pediatrician
              </div>
              <p style={{ fontFamily: font, fontSize: 12.5, color: RCC.text, lineHeight: 1.65, margin: 0 }}>
                {milestone.ped_note}
              </p>
            </div>
          )}
          <div style={{ fontFamily: font, fontSize: 11, color: RCC.muted, lineHeight: 1.6 }}>
            Sources: {milestone.source?.join(" · ")}
          </div>
        </div>
      )}

      {/* Status buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { id: "reached",       label: "Reached",       emoji: "✅", activeBg: `${RCC.sageMid}25`,   activeBorder: RCC.sageMid,   activeColor: RCC.sageMid,  inactiveBorder: T.border },
          { id: "not_yet",       label: "Not yet",       emoji: "🕐", activeBg: T.faint,              activeBorder: T.muted,       activeColor: T.text,       inactiveBorder: T.border },
          { id: "not_concerned", label: "Not concerned", emoji: "💛", activeBg: `${RCC.amber}15`,     activeBorder: RCC.amber,     activeColor: RCC.amber,    inactiveBorder: T.border },
        ].map(btn => {
          const active = currentStatus === btn.id;
          return (
            <button key={btn.id}
              onClick={() => handleStatus(active ? null : btn.id)}
              disabled={logging}
              style={{
                padding: "7px 14px", borderRadius: 20,
                border: `1.5px solid ${active ? btn.activeBorder : btn.inactiveBorder}`,
                background: active ? btn.activeBg : "transparent",
                color: active ? btn.activeColor : RCC.muted,
                fontFamily: font, fontSize: 12.5, fontWeight: active ? 700 : 400,
                cursor: logging ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 5, transition: "all .15s",
              }}>
              {btn.emoji} {btn.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
