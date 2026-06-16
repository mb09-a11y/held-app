// views/consultant/ConsultantHome.jsx
import { useState, useEffect } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { useFamilies } from "./data/consultantStore.js";
import { supabase } from "../../lib/supabase.js";
import ProactiveCard from "./shared/ProactiveCard.jsx";

const URGENCY_ORDER = { urgent: 0, watch: 1, good: 2 };

function getGreeting() {
  const hour = new Date().getHours(); // uses device/browser local time
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

// ─── WELL JOURNEY HELPERS ─────────────────────────────────────────────────────
// Mirrors the parent forest journey: every 3 check-ins advances a stage,
// 10 stages × 3 = 30 total check-ins. Images already live in the public
// `well-stages` bucket — one image per stage, no landscape/portrait split.
const WELL_BASE = "https://fzokhiqiulflvgkbzqel.supabase.co/storage/v1/object/public/well-stages";
const WELL_STAGE_FILES = [
  "stage-one.png", "stage-two.png", "stage-three.png", "stage-four.png", "stage-five.png",
  "stage-six.png", "stage-seven.png", "stage-eight.png", "stage-nine.jpg", "stage-ten.png",
];

function getWellImageUrl(stage) {
  const idx = Math.min(Math.max(stage ?? 1, 1), 10) - 1;
  return `${WELL_BASE}/${WELL_STAGE_FILES[idx]}`;
}
function getWellProgress(total) {
  return ((total ?? 0) % 3) / 3; // 0.0–1.0 within current stage
}

// Draft "invitation" copy per stage — Manu, these are placeholders for the
// real well-journey lines; easy to swap once you've finalized them.
const WELL_INVITATIONS = [
  "The ground is dry, but you showed up. That's where it starts.",
  "A little water reaches a little further today.",
  "Something is taking root. Keep coming back.",
  "The grass remembers every time you return.",
  "What you're filling is starting to overflow into everything around it.",
  "The trees are listening. So is everyone you hold.",
  "This is what steady looks like from the outside.",
  "Even the quiet days are filling the well.",
  "Almost everything around here is alive because you kept showing up.",
  "Overflowing. This is what you've built — and it feeds everyone near it.",
];

// ─── TODAY'S STATE → HOME VARIANT ──────────────────────────────────────────────
// Rolls the 5 canonical NS states down to the 3 Home variants confirmed
// for the consultant redesign.
function getHomeVariant(inferredState) {
  if (inferredState === "Regulated") return "regulated";
  if (inferredState === "Stretched" || inferredState === "Fight" || inferredState === "Flight") return "stretched";
  if (inferredState === "Freeze" || inferredState === "Shutdown") return "shutdown";
  return "regulated"; // no check-in yet — neutral default
}

const STATE_PILL = {
  Regulated: { dot: "#7BAA8A", text: "Regulated" },
  Fight:     { dot: "#C07070", text: "Activated" },
  Flight:    { dot: "#A89B5A", text: "Anxious" },
  Freeze:    { dot: "#7B8FAA", text: "Running low" },
  Shutdown:  { dot: "#8A7BAA", text: "In shutdown" },
  Stretched: { dot: "#B8924A", text: "Stretched" },
};

const VARIANT_HEADER_BG = {
  regulated: "linear-gradient(160deg, #2D4A35 0%, #3A3018 100%)",
  stretched: "linear-gradient(160deg, #3A3820 0%, #46390F 100%)",
  shutdown:  "linear-gradient(160deg, #2A2535 0%, #332D40 100%)",
};

// ─── WELL JOURNEY BANNER ──────────────────────────────────────────────────────
function WellBanner({ stage, totalCheckins, onTap, T }) {
  const progress = getWellProgress(totalCheckins);
  const checkinIntoStage = (totalCheckins ?? 0) % 3;
  const invitation = WELL_INVITATIONS[Math.min(Math.max(stage ?? 1, 1), 10) - 1];

  return (
    <div onClick={onTap} style={{ position: "relative", width: "100%", overflow: "hidden", cursor: "pointer" }}>
      <img
        src={getWellImageUrl(stage)}
        alt={`Well journey stage ${stage}`}
        style={{ width: "100%", height: 190, objectFit: "cover", objectPosition: "center 35%", display: "block" }}
      />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(8,14,6,0.55) 0%, rgba(8,14,6,0.05) 40%, rgba(8,14,6,0.0) 55%, rgba(8,14,6,0.7) 80%, rgba(8,14,6,0.9) 100%)",
        pointerEvents: "none",
      }} />

      {/* Top badges */}
      <div style={{ position: "absolute", top: 12, left: 14, right: 14, display: "flex", justifyContent: "space-between" }}>
        <div style={{
          background: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 20, padding: "3px 10px",
          fontFamily: font, fontSize: 10.5, color: "rgba(255,255,255,0.85)",
        }}>
          Stage {stage} of 10
        </div>
        <div style={{
          background: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 20, padding: "3px 10px",
          fontFamily: font, fontSize: 10.5, color: "rgba(255,255,255,0.85)",
        }}>
          💧 {totalCheckins ?? 0} / 30
        </div>
      </div>

      {/* Bottom — invitation + progress */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 15px 13px" }}>
        <div style={{
          fontFamily: serif, fontStyle: "italic", fontSize: 14,
          color: "rgba(255,255,255,0.92)", lineHeight: 1.4, marginBottom: 8, textAlign: "center",
        }}>
          {invitation}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.14)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, background: "linear-gradient(to right, #3a6a8a, #6ab8c8)", borderRadius: 4 }} />
          </div>
          <span style={{ fontFamily: font, fontSize: 9.5, color: "rgba(255,255,255,0.55)" }}>{checkinIntoStage}/3</span>
        </div>
        <div style={{ fontFamily: font, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", textAlign: "center", marginTop: 6 }}>
          Tap to explore your well journey
        </div>
      </div>
    </div>
  );
}

// ─── WELL JOURNEY MODAL ───────────────────────────────────────────────────────
function WellJourneyModal({ stage, totalCheckins, onClose, onCheckin, T }) {
  const progress = getWellProgress(totalCheckins);
  const checkinIntoStage = (totalCheckins ?? 0) % 3;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "#0a1014", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ position: "relative", width: "100%", flex: 1 }}>
        <img src={getWellImageUrl(stage)} alt={`Well journey stage ${stage}`} style={{ width: "100%", display: "block", objectFit: "cover", minHeight: "60vh" }} />

        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 40%)",
          padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontFamily: font, fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>
            Your well journey
          </div>
          <button onClick={onClose} style={{
            background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "50%", width: 32, height: 32, color: "rgba(255,255,255,0.8)", fontSize: 16,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(10,16,20,0.95) 0%, rgba(10,16,20,0.6) 60%, transparent 100%)",
          padding: "32px 22px 24px",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 20, padding: "3px 10px", marginBottom: 10,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#6ab8c8" }} />
            <span style={{ fontFamily: font, fontSize: 9, color: "rgba(255,255,255,0.65)", letterSpacing: ".08em" }}>
              STAGE {stage} OF 10
            </span>
          </div>

          <div style={{ fontFamily: font, fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>
            {checkinIntoStage} of 3 check-ins to next stage
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, background: "linear-gradient(to right, #3a6a8a, #6ab8c8)", borderRadius: 4, transition: "width 0.6s ease" }} />
            </div>
            <span style={{ fontSize: 13 }}>💧</span>
            <span style={{ fontFamily: font, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{totalCheckins ?? 0} / 30</span>
          </div>

          <button onClick={() => { onClose(); onCheckin(); }} style={{
            width: "100%", padding: "15px", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg, #2e4a5a, #4a98a8)",
            color: "#fff", fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(74,148,168,0.35)",
          }}>
            Check in →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ALERT CARD ───────────────────────────────────────────────────────────────
// Used for the "needs attention" family cards. `tone` controls framing copy
// for shutdown's softer "Response needed" override vs. the normal flooded framing.
function AlertCard({ family, tone, onDraft, onView, T }) {
  const isFlooded = family.nsState === "overwhelmed";

  let dot, typeLabel, typeColor, selahText, primaryLabel;
  if (tone === "shutdown") {
    dot = "#D4A020"; typeColor = "#C4901A"; typeLabel = "Response needed";
    selahText = "You don't have to have all the answers — just let them know you're here.";
    primaryLabel = "Send a holding message →";
  } else if (isFlooded) {
    dot = "#C04040"; typeColor = "#C04040"; typeLabel = "Parent state · flooded";
    selahText = tone === "stretched"
      ? "This parent is overwhelmed. A short holding message goes a long way when you're stretched too."
      : "This parent is overwhelmed right now. A short message could prevent a harder night.";
    primaryLabel = "Draft a message";
  } else {
    dot = "#C08A3A"; typeColor = "#C08A3A"; typeLabel = "Check in proactively";
    selahText = family.insight;
    primaryLabel = "Proactive check-in";
  }

  const ago = timeAgo(family.nsCheckinTime);

  return (
    <div style={{
      margin: "0 18px 10px", background: T.card, borderRadius: 16, padding: "13px 15px",
      border: `1.5px solid ${typeColor}33`, boxShadow: T.shadow,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot }} />
        <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: typeColor, fontFamily: font, flex: 1 }}>
          {typeLabel}
        </div>
        {ago && <div style={{ fontSize: 10, color: T.muted, fontFamily: font }}>{ago}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 5, fontFamily: font }}>
        {family.name}
      </div>
      <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 10, fontFamily: font }}>
        © Selah — {selahText}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onDraft} style={{
          background: typeColor, color: "#fff", border: "none",
          padding: "7px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font,
        }}>{primaryLabel}</button>
        {tone !== "shutdown" && (
          <button onClick={onView} style={{
            color: typeColor, background: "transparent", border: `1.5px solid ${typeColor}55`,
            padding: "7px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontFamily: font,
          }}>View family</button>
        )}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function ConsultantHome({ onNavigate, onOpenDrawer, lastNSCheckin, onCheckin }) {
  const T = useT();
  const { currentUser } = useApp();
  const { families } = useFamilies();

  const [showJourney, setShowJourney] = useState(false);
  const [wellJourney, setWellJourney] = useState({ total: 0, stage: 1 });

  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from("profiles")
      .select("consultant_total_ns_checkins, consultant_well_stage")
      .eq("id", currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setWellJourney({ total: data.consultant_total_ns_checkins ?? 0, stage: data.consultant_well_stage ?? 1 });
      });
  }, [currentUser?.id, lastNSCheckin?.created_at]);

  const firstName = currentUser?.name?.split(" ")[0] || currentUser?.email?.split(" ")[0] || "there";
  const variant = getHomeVariant(lastNSCheckin?.inferred_state);

  const sorted = [...families].sort(
    (a, b) => (URGENCY_ORDER[a.urgency] ?? 3) - (URGENCY_ORDER[b.urgency] ?? 3)
  );
  const urgentFamilies = sorted.filter(f => f.urgency === "urgent");
  const watchFamilies  = sorted.filter(f => f.urgency === "watch");

  const urgent = urgentFamilies.length;
  const unread = families.filter(f => f.unread).length;

  // Which families surface on Home right now — pinned to "needs attention",
  // never hidden (everything else is always reachable via the Families tab).
  const attentionFamilies = variant === "regulated"
    ? [...urgentFamilies, ...watchFamilies]
    : urgentFamilies; // stretched + shutdown: only what truly needs you right now

  const restCount = families.length - attentionFamilies.length;

  // ── Variant-specific copy ──────────────────────────────────────────────────
  const greeting = variant === "shutdown"
    ? "Your families are okay right now."
    : `${getGreeting()}, ${firstName}.`;

  const hasCheckedIn = !!lastNSCheckin?.inferred_state;

  const selahCopy = variant === "shutdown"
    ? "Rest is the only right response here — not pushing through. Your caseload will still be here."
    : variant === "stretched"
    ? "You're carrying something today. Here's what actually needs you — the rest can wait."
    : !hasCheckedIn
      ? (urgent > 0
          ? `${urgent} ${urgent === 1 ? "family" : "families"} need your attention today.`
          : "All families are on track today.")
      : (urgent > 0
          ? `Your system is available. ${urgent} ${urgent === 1 ? "family" : "families"} need your attention today.`
          : "Your system is available. All families are on track today.");

  const sectionLabel = variant === "shutdown" ? null
    : variant === "stretched" ? "What needs you right now"
    : "Needs your attention";

  const emptyState = variant === "shutdown"
    ? null // shutdown closes with the quote instead
    : variant === "stretched"
      ? { text: "That's all that needs you right now.", sub: "See all families in the Families tab." }
      : { text: "Everything else is on track.", sub: "See all families in the Families tab." };

  const pill = lastNSCheckin?.inferred_state ? STATE_PILL[lastNSCheckin.inferred_state] : null;

  const handleDraft = (familyId) => onNavigate("responseBuilder", { familyId });
  const handleView  = (familyId) => onNavigate("family", { familyId });

  return (
    <div style={{ background: variant === "shutdown" ? "#F2EFF5" : T.gradientBg, flex: 1, overflowY: "auto" }}>

      {/* ── Hero header ── */}
      <div style={{ background: VARIANT_HEADER_BG[variant], padding: "20px 18px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>🌿</div>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: serif, fontSize: 22, fontStyle: "italic", color: "#fff", lineHeight: 1.3 }}>
              {greeting}
            </div>
          </div>

          <button onClick={onOpenDrawer} style={{
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 10, padding: "6px 10px", cursor: "pointer", color: "#fff", fontSize: 16, lineHeight: 1,
          }}>☰</button>
        </div>

        {/* NS state pill — today's check-in, or a nudge to do one */}
        {pill ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "rgba(255,255,255,0.85)",
            marginTop: 10, fontFamily: font,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: pill.dot }} />
            {pill.text}
          </div>
        ) : (
          <button onClick={onCheckin} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "rgba(255,255,255,0.85)",
            marginTop: 10, cursor: "pointer", fontFamily: font,
          }}>
            🌿 Check in with Selah →
          </button>
        )}
      </div>

      {/* ── Well journey banner ── */}
      <WellBanner stage={wellJourney.stage} totalCheckins={wellJourney.total} onTap={() => setShowJourney(true)} T={T} />
      {showJourney && (
        <WellJourneyModal
          stage={wellJourney.stage}
          totalCheckins={wellJourney.total}
          onClose={() => setShowJourney(false)}
          onCheckin={() => onCheckin?.()}
          T={T}
        />
      )}

      <div style={{ padding: "14px 0 0" }}>

        {/* ── Selah reflection card ── */}
        <div style={{
          margin: "0 18px 14px", borderRadius: 16, padding: "14px 16px",
          background: variant === "stretched" ? "rgba(196,144,26,0.10)" : variant === "shutdown" ? "rgba(136,117,160,0.12)" : T.faint,
          border: `1px solid ${variant === "stretched" ? "rgba(196,144,26,0.3)" : variant === "shutdown" ? "rgba(136,117,160,0.25)" : T.border}`,
        }}>
          <div style={{
            fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, marginBottom: 6, fontFamily: font,
            color: variant === "stretched" ? "#C4901A" : variant === "shutdown" ? "#8875A0" : T.teal,
          }}>
            © Selah
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, fontFamily: font, color: T.text }}>
            {selahCopy}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, margin: "0 18px 14px" }}>
          {[
            { num: urgent,          lbl: "Urgent",       color: urgent > 0 ? "#C0543A" : T.teal },
            { num: unread,          lbl: "Unread",       color: unread > 0 ? "#C08A3A" : T.teal },
            { num: families.length, lbl: "Active plans", color: T.teal },
          ].map(s => (
            <div key={s.lbl} style={{ background: T.card, borderRadius: 14, padding: "12px 10px", textAlign: "center", boxShadow: T.shadow }}>
              <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, fontWeight: 600, marginTop: 3, fontFamily: font }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* ── Needs-attention section ── */}
        {sectionLabel && (
          <div style={{ padding: "0 18px 8px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
            {sectionLabel}
          </div>
        )}

        {attentionFamilies.map(fam => (
          <AlertCard
            key={fam.id}
            family={fam}
            tone={variant}
            onDraft={() => handleDraft(fam.id)}
            onView={() => handleView(fam.id)}
            T={T}
          />
        ))}

        {/* Shutdown closing quote */}
        {variant === "shutdown" && (
          <div style={{ textAlign: "center", padding: "16px 24px 8px" }}>
            <div style={{ fontFamily: serif, fontSize: 15, fontStyle: "italic", color: "#9A8CB0", lineHeight: 1.6 }}>
              "Everything else can wait.<br />You cannot pour from empty."
            </div>
          </div>
        )}

        {/* Regulated / stretched empty state */}
        {emptyState && restCount > 0 && (
          <div style={{ textAlign: "center", padding: "20px 20px", color: T.muted, fontFamily: font }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>🌿</div>
            <div style={{ fontSize: 13, color: T.text, marginBottom: 3 }}>{emptyState.text}</div>
            <div style={{ fontSize: 11.5 }}>{emptyState.sub}</div>
          </div>
        )}

        {/* ── Flags shortcut ── */}
        <div
          onClick={() => onNavigate("flags")}
          style={{
            margin: "0 18px 10px", background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 18 }}>🚩</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: font }}>Flags &amp; Alerts</div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: font, marginTop: 1 }}>
              {urgent > 0 ? `${urgent} urgent · tap to review` : "No active flags right now"}
            </div>
          </div>
          <span style={{ fontSize: 14, color: T.muted }}>›</span>
        </div>

        {/* ── Proactive nudge — suppressed during shutdown ── */}
        {variant !== "shutdown" && (() => {
          const watchFam = sorted.find(f => f.urgency === "watch" || f.urgency === "urgent");
          if (!watchFam) return null;
          const text = watchFam.urgency === "urgent"
            ? `${watchFam.name} is in distress — ${watchFam.nsState === "overwhelmed" ? "parent overwhelmed" : "child needs attention"}. Prepare a regulated response before tonight.`
            : `${watchFam.name}'s parent may reach out tonight. ${watchFam.insight} Prepare your response now.`;
          return (
            <ProactiveCard
              icon="🔮"
              label="Tonight, expect"
              text={text}
              cta="Draft message →"
              onCta={() => onNavigate("responseBuilder", { familyId: watchFam.id })}
            />
          );
        })()}

      </div>
    </div>
  );
}
