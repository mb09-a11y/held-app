// src/modules/sos/steps/SharedReward.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Screen 5 of the co-regulation flow — Shared Reward.
// Two leaves arc and drop into the jar with smooth CSS animation.
// Adds 2 leaves by inserting into regulation_checkins (source: sos_coregulation)
// so they show up automatically in the home screen jar count.
//
// LEAF ASSET: /src/assets/leaf.png (watercolor leaf, transparent bg)
// JAR ASSET:  /tree/jar-full.png (existing public asset)
//
// ANIMATION SEQUENCE:
//   0ms    — screen fades in, jar visible
//   200ms  — leaf 1 begins arc from top-left
//   400ms  — leaf 2 begins arc from top-right
//   1200ms — both leaves land in jar, jar glows
//   1400ms — +2 leaves badge fades up
//   1600ms — headline fades up
//   1900ms — sub-copy fades up
//   2200ms — done button fades up
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { font, serif } from "../../../core/shared.jsx";
import { supabase } from "../../../lib/supabase.js";
import leafImg from "../../../assets/leaf.png";

const JAR_IMG = "/tree/jar-open.png";

export function SharedReward({ childName, userId, familyId, onClose }) {
  const [phase, setPhase] = useState("dropping"); // dropping | landed
  const [leavesAdded, setLeavesAdded] = useState(false);

  // ── Add 2 leaves to regulation_checkins ─────────────────────────────────────
  useEffect(() => {
    if (leavesAdded) return;
    setLeavesAdded(true);
    async function addLeaves() {
      if (!userId || !familyId) return;
      try {
        const now = new Date().toISOString();
        await supabase.from("regulation_checkins").insert([
          {
            user_id:       userId,
            family_id:     familyId,
            state:         "Regulated",
            source:        "sos_coregulation",
            checkin_type:  "sos",
            checked_in_at: now,
            notes:         "Parent reset — co-regulation complete",
            answers:       {},
          },
          {
            user_id:       userId,
            family_id:     familyId,
            state:         "Regulated",
            source:        "sos_coregulation",
            checkin_type:  "sos",
            checked_in_at: now,
            notes:         "Child co-regulation — shared moment",
            answers:       {},
          },
        ]);
      } catch (err) {
        console.error("[SharedReward] Failed to add leaves:", err);
      }
    }
    addLeaves();
  }, [userId, familyId, leavesAdded]);

  // ── Animation sequence ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setPhase("landed"), 1200);
    return () => clearTimeout(t);
  }, []);

  const landed = phase === "landed";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 310,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "env(safe-area-inset-top, 24px) 28px 56px",
      background: "linear-gradient(160deg, #3d5a3e 0%, #5c7a4a 60%, #8a6a3a 100%)",
      overflow: "hidden",
    }}>

      <style>{`
        /* ── Leaf 1: arcs in from top-left ── */
        @keyframes leaf1Arc {
          0%   {
            opacity: 0;
            transform: translate(-80px, -120px) rotate(-40deg) scale(0.7);
          }
          15%  { opacity: 1; }
          60%  {
            transform: translate(-20px, -30px) rotate(10deg) scale(1);
          }
          80%  {
            transform: translate(-8px, 4px) rotate(5deg) scale(0.95);
          }
          100% {
            opacity: 0.9;
            transform: translate(-12px, 0px) rotate(8deg) scale(0.9);
          }
        }

        /* ── Leaf 2: arcs in from top-right, slightly delayed ── */
        @keyframes leaf2Arc {
          0%   {
            opacity: 0;
            transform: translate(80px, -100px) rotate(35deg) scale(0.65);
          }
          15%  { opacity: 1; }
          60%  {
            transform: translate(16px, -20px) rotate(-8deg) scale(0.95);
          }
          80%  {
            transform: translate(10px, 6px) rotate(-4deg) scale(0.88);
          }
          100% {
            opacity: 0.85;
            transform: translate(14px, 2px) rotate(-6deg) scale(0.85);
          }
        }

        /* ── Jar glow pulse once leaves land ── */
        @keyframes jarGlow {
          0%   { filter: drop-shadow(0 0 8px rgba(140,200,100,0.2)); }
          50%  { filter: drop-shadow(0 0 28px rgba(140,200,100,0.65)); }
          100% { filter: drop-shadow(0 0 14px rgba(140,200,100,0.35)); }
        }

        /* ── Content fade up ── */
        @keyframes rewardFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Ambient shimmer dots ── */
        @keyframes shimmerDot {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.4); }
        }

        /* ── Leaf gentle float after landing ── */
        @keyframes leafSettle {
          0%, 100% { transform: translate(-12px, 0px) rotate(8deg) scale(0.9); }
          50%       { transform: translate(-12px, -4px) rotate(6deg) scale(0.91); }
        }
        @keyframes leaf2Settle {
          0%, 100% { transform: translate(14px, 2px) rotate(-6deg) scale(0.85); }
          50%       { transform: translate(14px, -3px) rotate(-4deg) scale(0.86); }
        }
      `}</style>

      {/* ── Animation stage ── */}
      <div style={{
        position: "relative",
        width: 200,
        height: 240,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        marginBottom: 8,
      }}>

        {/* Jar */}
        <img
          src={JAR_IMG}
          alt="leaf jar"
          style={{
            width: 140,
            height: 180,
            objectFit: "contain",
            position: "relative",
            zIndex: 1,
            animation: landed
              ? "jarGlow 1.8s ease-in-out infinite"
              : "none",
            transition: "filter 0.6s ease",
          }}
        />

        {/* Leaf 1 — parent leaf, larger, arcs from top-left */}
        <img
          src={leafImg}
          alt=""
          style={{
            position: "absolute",
            bottom: 60,
            left: "50%",
            marginLeft: -28,
            width: 56,
            height: 56,
            objectFit: "contain",
            zIndex: 2,
            animation: landed
              ? "leafSettle 3s ease-in-out infinite"
              : "leaf1Arc 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s forwards",
            opacity: 0,
            animationFillMode: "forwards",
          }}
        />

        {/* Leaf 2 — child leaf, slightly smaller, arcs from top-right */}
        <img
          src={leafImg}
          alt=""
          style={{
            position: "absolute",
            bottom: 48,
            left: "50%",
            marginLeft: -20,
            width: 44,
            height: 44,
            objectFit: "contain",
            zIndex: 2,
            animation: landed
              ? "leaf2Settle 3.4s ease-in-out infinite"
              : "leaf2Arc 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s forwards",
            opacity: 0,
            animationFillMode: "forwards",
          }}
        />
      </div>

      {/* ── Reward copy — fades up in sequence ── */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 14,
        textAlign: "center", maxWidth: 300,
      }}>

        {/* +2 leaves badge */}
        {landed && (
          <div style={{
            padding: "6px 20px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.28)",
            fontFamily: font,
            fontSize: 13,
            color: "rgba(255,255,255,0.85)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            animation: "rewardFadeUp 0.5s ease forwards",
          }}>
            +2 leaves to your forest
          </div>
        )}

        {/* Headline */}
        {landed && (
          <div style={{
            fontFamily: serif,
            fontSize: 27,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.97)",
            lineHeight: 1.3,
            animation: "rewardFadeUp 0.5s 0.15s ease forwards",
            opacity: 0,
            animationFillMode: "forwards",
          }}>
            You anchored the storm.
            <br />
            For both of you.
          </div>
        )}

        {/* Sub-copy */}
        {landed && (
          <div style={{
            fontFamily: font,
            fontSize: 14,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.65,
            fontStyle: "italic",
            animation: "rewardFadeUp 0.5s 0.3s ease forwards",
            opacity: 0,
            animationFillMode: "forwards",
          }}>
            That took courage. Even when it was hard.
          </div>
        )}
      </div>

      {/* ── Done button ── */}
      {landed && (
        <button
          onClick={onClose}
          style={{
            marginTop: 36,
            padding: "15px 52px",
            borderRadius: 32,
            border: "1.5px solid rgba(255,255,255,0.32)",
            background: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.9)",
            fontFamily: font,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.04em",
            animation: "rewardFadeUp 0.5s 0.5s ease forwards",
            opacity: 0,
            animationFillMode: "forwards",
            transition: "background 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
        >
          Done
        </button>
      )}

      {/* ── Ambient shimmer dots ── */}
      {[...Array(7)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${12 + i * 13}%`,
          top: `${18 + (i % 4) * 20}%`,
          width: i % 2 === 0 ? 3 : 2,
          height: i % 2 === 0 ? 3 : 2,
          borderRadius: "50%",
          background: "rgba(210,240,160,0.5)",
          animation: `shimmerDot ${1.6 + i * 0.35}s ease-in-out infinite`,
          animationDelay: `${i * 0.25}s`,
          pointerEvents: "none",
        }} />
      ))}
    </div>
  );
}
