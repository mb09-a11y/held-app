// src/modules/sos/SOSFlow.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Held SOS flow — full screen overlay.
//
// FLOW A — Co-regulation (new):
//   Screen 1: SOSEntry       — parent selects their state
//   Screen 2: ParentReset    — 20s somatic reset game (A/B/C)
//   Screen 2.5: ChildSelect  — only shown if family has >1 child
//   Screen 3: ReadChild      — parent reads child's state
//   Screen 4: CoRegGame      — age/state-matched game prompt
//   Screen 5: SharedReward   — two leaves into jar
//
// FLOW B — Repair (new):
//   Triggered by "I already snapped"
//   Handled entirely by RepairFlow component
//
// FLOW C — Classic intervention (preserved):
//   Triggered by "I feel like I'm failing" → existing StepIntervention
//   Kept intact so existing users aren't disrupted
//
// SESSION LOGGING:
//   useSOSSession creates a row in sos_sessions on Screen 1 selection,
//   then updates it at each subsequent screen.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

// ── New co-regulation steps ──────────────────────────────────────────────────
import { SOSEntry }     from "./steps/SOSEntry.jsx";
import { ParentReset }  from "./steps/ParentReset.jsx";
import { ReadChild }    from "./steps/ReadChild.jsx";
import { CoRegGame }    from "./steps/CoRegGame.jsx";
import { SharedReward } from "./steps/SharedReward.jsx";
import { RepairFlow }   from "./steps/RepairFlow.jsx";

// ── Session hook ─────────────────────────────────────────────────────────────
import { useSOSSession } from "../../hooks/useSOSSession.js";

// ── Age band helper ──────────────────────────────────────────────────────────
import { getAgeBand } from "../../data/coRegGames.js";

// ─── PRESERVED: Classic intervention content ──────────────────────────────────
// StepIntervention and its supporting content kept exactly as-is.
// Only "I feel like I'm failing" routes here now.

const CLASSIC_INTERVENTION = {
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

function IntCard({ eyebrow, children, T }) {
  return (
    <div style={{
      borderRadius: 14, padding: "16px 18px", marginBottom: 10,
      background: T.card, border: `1px solid ${T.border}`,
    }}>
      {eyebrow && (
        <div style={{
          fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase",
          color: "#B8924A", fontFamily: font, fontWeight: 700, marginBottom: 10,
        }}>
          {eyebrow}
        </div>
      )}
      {children}
    </div>
  );
}

function StepIntervention({ onClose, onBack, T, sosUseCount }) {
  const int = CLASSIC_INTERVENTION.failing;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: "50%",
          background: T.faint, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: T.muted, fontSize: 16,
        }}>←</button>
        <div style={{ fontFamily: serif, fontSize: 20, fontStyle: "italic", color: T.headingText }}>
          I feel like I'm failing
        </div>
        <button onClick={onClose} style={{
          marginLeft: "auto", width: 32, height: 32, borderRadius: "50%",
          background: T.faint, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: T.muted, fontSize: 14,
        }}>✕</button>
      </div>

      <IntCard eyebrow={int.eyebrow} T={T}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "#F5F0E8", border: "2px solid #D4C9A8",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px", fontSize: 32,
          animation: "breathe 4s ease-in-out infinite",
        }}>🕯️</div>
        <style>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50%       { transform: scale(1.08); }
          }
        `}</style>
        {int.bodySteps.map((step, i) => (
          <div key={i} style={{ fontFamily: font, fontSize: 14.5, color: T.text, lineHeight: 1.7, marginBottom: 2 }}>
            {step}
          </div>
        ))}
      </IntCard>

      <IntCard eyebrow={int.reframeTitle} T={T}>
        <div style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: T.text, lineHeight: 1.65 }}>
          "{int.reframe}"
        </div>
      </IntCard>

      <IntCard eyebrow={int.actionTitle} T={T}>
        {int.actionSteps.map((step, i) => (
          <div key={i} style={{ fontFamily: font, fontSize: 14.5, color: T.text, lineHeight: 1.7, marginBottom: 2 }}>
            {step}
          </div>
        ))}
        <button onClick={onClose} style={{
          marginTop: 14, padding: "11px 22px", borderRadius: 24, border: "none",
          background: T.bark, color: "#fff",
          fontFamily: font, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        }}>
          {int.actionCta}
        </button>
      </IntCard>

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
          <div style={{ marginBottom: 10, fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>
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

// ─── CHILD SELECTOR ───────────────────────────────────────────────────────────
// Shown only when family has more than one child.
// Single-child families skip this screen entirely.

function ChildSelect({ children, onSelect, onClose, T }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      paddingBottom: 32, maxWidth: 480, width: "100%",
    }}>
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", marginBottom: 6,
      }}>
        <div style={{
          fontFamily: serif, fontSize: 28, color: T.headingText,
          lineHeight: 1.2, fontStyle: "italic", flex: 1, paddingRight: 12,
        }}>
          Which child are you with right now?
        </div>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: T.faint, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: T.muted, fontSize: 16, marginTop: 4,
        }}>✕</button>
      </div>

      <div style={{ fontFamily: font, fontSize: 14, color: T.muted, marginBottom: 24 }}>
        We'll match the game to their age.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children.map(child => (
          <button
            key={child.id}
            onClick={() => onSelect(child)}
            style={{
              display: "flex", flexDirection: "row", alignItems: "center",
              gap: 14, padding: "14px 18px", borderRadius: 14,
              border: `1.5px solid ${T.border}`, background: T.card2,
              cursor: "pointer", textAlign: "left",
              transition: "all .15s", width: "100%",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.warm; e.currentTarget.style.background = T.faint; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card2; }}
          >
            <span style={{ fontSize: 28, flexShrink: 0 }}>{child.emoji || "🌱"}</span>
            <div>
              <div style={{ fontFamily: font, fontSize: 15, color: T.text, fontWeight: 500 }}>
                {child.name}
              </div>
              {child.dob && (
                <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 2 }}>
                  {getAgeBandLabel(getAgeBand(child.dob))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function getAgeBandLabel(band) {
  const labels = {
    "0_18m":  "0–18 months",
    "18m_3y": "18 months – 3 years",
    "3_5y":   "3–5 years",
    "5_7y":   "5–7 years",
  };
  return labels[band] || "";
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function SOSFlow({ onClose, setTab }) {
  const T = useT();
  const { currentUser, activeFamily, activeChild, children } = useApp();

  // ── Screen routing ──────────────────────────────────────────────────────────
  // "entry"        — Screen 1: parent state picker
  // "reset"        — Screen 2: parent somatic reset
  // "child_select" — Screen 2.5: pick child (multi-child only)
  // "read_child"   — Screen 3: read child's state
  // "game"         — Screen 4: co-reg game prompt
  // "reward"       — Screen 5: shared reward
  // "repair"       — Repair flow (already snapped)
  // "classic"      — Legacy intervention (I feel like I'm failing)

  const [screen, setScreen] = useState("entry");
  const [sosUseCount, setSosUseCount] = useState(0);

  // ── Session state ────────────────────────────────────────────────────────────
  const { createSession, updateSession, resetSession } = useSOSSession();
  const [parentState, setParentState] = useState(null);
  const [resetType, setResetType]     = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childState, setChildState]   = useState(null);

  // Resolve which child we're working with
  // If multi-child: set by ChildSelect screen
  // If single child or default: use activeChild
  const workingChild = selectedChild || activeChild;
  const ageBand = getAgeBand(workingChild?.dob);

  // ── Handle Screen 1 selection ────────────────────────────────────────────────
  const handleEntrySelect = useCallback(async (pState, pSubstate, rType) => {
    setParentState(pState);
    setResetType(rType);
    setSosUseCount(c => c + 1);

    // Create sos_sessions row immediately
    await createSession({
      userId:        currentUser?.id,
      familyId:      activeFamily?.id,
      childId:       workingChild?.id || null,
      parentState:   pState,
      parentSubstate: pSubstate,
    });

    // Route based on state
    if (pState === "already_snapped") {
      setScreen("repair");
    } else if (pState === "failing") {
      setScreen("classic");
    } else {
      setScreen("reset");
    }
  }, [createSession, currentUser, activeFamily, workingChild]);

  // ── Handle Screen 2 complete ─────────────────────────────────────────────────
  const handleResetComplete = useCallback(async () => {
    await updateSession({ resetType, resetCompleted: true });

    // Multi-child families get the child selector
    const multiChild = children && children.length > 1;
    if (multiChild && !selectedChild) {
      setScreen("child_select");
    } else {
      setScreen("read_child");
    }
  }, [updateSession, resetType, children, selectedChild]);

  // ── Handle child selection ────────────────────────────────────────────────────
  const handleChildSelect = useCallback((child) => {
    setSelectedChild(child);
    setScreen("read_child");
  }, []);

  // ── Handle Screen 3 selection ─────────────────────────────────────────────────
  const handleReadChild = useCallback(async (cState) => {
    setChildState(cState);
    const band = getAgeBand(workingChild?.dob);
    await updateSession({
      childState:   cState,
      childAgeBand: band,
    });
    setScreen("game");
  }, [updateSession, workingChild]);

  // ── Handle Screen 4 complete ──────────────────────────────────────────────────
  const handleGameComplete = useCallback(async (gameKey) => {
    await updateSession({ gameKey, gameCompleted: true });
    setScreen("reward");
  }, [updateSession]);

  // ── Handle close ─────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    resetSession();
    onClose();
  }, [resetSession, onClose]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Screen 1: Entry ── */}
      {screen === "entry" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: T.bg,
          display: "flex", flexDirection: "column",
          alignItems: "center", overflowY: "auto",
          padding: "env(safe-area-inset-top, 24px) 20px 0",
        }}>
          <div style={{ width: "100%", maxWidth: 480 }}>
            <SOSEntry
              onSelect={handleEntrySelect}
              onClose={handleClose}
            />
          </div>
        </div>
      )}

      {/* ── Screen 2: Parent Reset ── */}
      {screen === "reset" && (
        <ParentReset
          resetType={resetType}
          childName={children && children.length > 1 ? null : workingChild?.name}
          onComplete={handleResetComplete}
          onClose={handleClose}
        />
      )}

      {/* ── Screen 2.5: Child Select (multi-child only) ── */}
      {screen === "child_select" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: T.bg,
          display: "flex", flexDirection: "column",
          alignItems: "center", overflowY: "auto",
          padding: "env(safe-area-inset-top, 24px) 20px 0",
        }}>
          <div style={{ width: "100%", maxWidth: 480 }}>
            <ChildSelect
              children={children}
              onSelect={handleChildSelect}
              onClose={handleClose}
              T={T}
            />
          </div>
        </div>
      )}

      {/* ── Screen 3: Read Child ── */}
      {screen === "read_child" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: T.bg,
          display: "flex", flexDirection: "column",
          alignItems: "center", overflowY: "auto",
          padding: "env(safe-area-inset-top, 24px) 20px 0",
        }}>
          <div style={{ width: "100%", maxWidth: 480 }}>
            <ReadChild
              childName={workingChild?.name}
              onSelect={handleReadChild}
              onClose={handleClose}
            />
          </div>
        </div>
      )}

      {/* ── Screen 4: Co-Reg Game ── */}
      {screen === "game" && (
        <CoRegGame
          childState={childState}
          ageBand={ageBand}
          childName={workingChild?.name}
          onComplete={(gameKey) => handleGameComplete(gameKey)}
          onClose={handleClose}
        />
      )}

      {/* ── Screen 5: Shared Reward ── */}
      {screen === "reward" && (
        <SharedReward
          childName={workingChild?.name}
          userId={currentUser?.id}
          familyId={activeFamily?.id}
          onClose={async () => {
            await updateSession({ sessionCompleted: true });
            handleClose();
          }}
        />
      )}

      {/* ── Repair Flow ── */}
      {screen === "repair" && (
        <RepairFlow
          childName={workingChild?.name}
          userId={currentUser?.id}
          familyId={activeFamily?.id}
          onClose={async () => {
            await updateSession({ repairFlowUsed: true, sessionCompleted: true });
            handleClose();
          }}
        />
      )}

      {/* ── Classic: I feel like I'm failing (preserved) ── */}
      {screen === "classic" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: T.bg,
          display: "flex", flexDirection: "column",
          alignItems: "center", overflowY: "auto",
          padding: "env(safe-area-inset-top, 24px) 20px 0",
        }}>
          <div style={{ width: "100%", maxWidth: 480 }}>
            <StepIntervention
              onClose={handleClose}
              onBack={() => setScreen("entry")}
              T={T}
              sosUseCount={sosUseCount}
              setTab={setTab}
            />
          </div>
        </div>
      )}
    </>
  );
}
