// src/modules/milestones/components/WonderWeeksCard.jsx
import { useT, useApp, font, serif } from "../../../core/shared.jsx";
import { getCurrentWonderWeeksLeap } from "../data/milestones.js";

export function WonderWeeksCard({ child, isPremium, showUpgrade }) {
  const T = useT();

  if (!child?.dob) return null;

  // Calculate weeks from due date (use dob as approximation if no due date stored)
  const dueDate = child.due_date ? new Date(child.due_date) : new Date(child.dob);
  const weeksFromDue = Math.floor((Date.now() - dueDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const leap = getCurrentWonderWeeksLeap(weeksFromDue);

  if (!leap) return null;

  const isActive = leap.status === "active";
  const accentColor = isActive ? T.purple : T.teal;

  return (
    <div style={{
      borderRadius: 14,
      border: `1.5px solid ${accentColor}30`,
      background: `${accentColor}08`,
      padding: "16px 18px",
      marginBottom: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{isActive ? "🌀" : "🔭"}</span>
          <span style={{
            fontFamily: font, fontSize: 10, fontWeight: 700,
            letterSpacing: ".12em", textTransform: "uppercase",
            color: accentColor,
          }}>
            {isActive ? `Wonder Weeks · Leap ${leap.leap}` : `Coming soon · Leap ${leap.leap}`}
          </span>
        </div>
        {isActive && (
          <div style={{
            padding: "3px 10px", borderRadius: 20,
            background: `${accentColor}18`,
            fontFamily: font, fontSize: 10.5, fontWeight: 700, color: accentColor,
          }}>
            Active now
          </div>
        )}
      </div>

      {/* Leap title */}
      <div style={{
        fontFamily: serif, fontSize: 17,
        color: T.headingText, marginBottom: 6,
      }}>
        {leap.title}
      </div>

      {/* What baby is learning — always free (basic) */}
      <p style={{
        fontFamily: font, fontSize: 13, color: T.text,
        lineHeight: 1.65, margin: "0 0 12px",
      }}>
        {leap.what_baby_is_learning}
      </p>

      {/* NS context — Plus only */}
      {isPremium ? (
        <div style={{
          padding: "10px 13px", borderRadius: 10,
          background: `${T.sage}0d`, border: `1px solid ${T.sage}20`,
          marginBottom: 10,
        }}>
          <div style={{
            fontFamily: font, fontSize: 10, fontWeight: 700,
            letterSpacing: ".1em", textTransform: "uppercase",
            color: T.sage, marginBottom: 5,
          }}>
            🌿 Nervous system lens
          </div>
          <p style={{
            fontFamily: font, fontSize: 13, color: T.text,
            lineHeight: 1.7, margin: 0,
          }}>
            {leap.ns_context}
          </p>
        </div>
      ) : (
        <button onClick={showUpgrade} style={{
          width: "100%", padding: "9px 13px", borderRadius: 10,
          border: `1px dashed ${T.sage}50`,
          background: `${T.sage}06`,
          display: "flex", alignItems: "center", gap: 8,
          cursor: "pointer", marginBottom: 10, textAlign: "left",
        }}>
          <span style={{ fontSize: 15 }}>🌿</span>
          <div>
            <div style={{ fontFamily: font, fontSize: 12.5, color: T.sage, fontWeight: 600 }}>
              What this means for their nervous system
            </div>
            <div style={{ fontFamily: font, fontSize: 11.5, color: T.muted }}>
              Unlock with Held Plus →
            </div>
          </div>
        </button>
      )}

      {/* Wonder Weeks app link — always shown */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 10, borderTop: `1px solid ${T.border}`,
      }}>
        <span style={{ fontFamily: font, fontSize: 11.5, color: T.muted }}>
          Source: The Wonder Weeks (Plooij & van de Rijt)
        </span>
        <a
          href="https://thewonderweeks.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: font, fontSize: 11.5, color: T.teal,
            textDecoration: "none", fontWeight: 600,
          }}
        >
          Explore the app →
        </a>
      </div>
    </div>
  );
}
