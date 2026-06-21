// ─── Family Guidance ──────────────────────────────────────────────────────────
// Replaces FamilyDeepDive in ConsultantHome.
// When a consultant taps a family card this is what opens.
//
// Props:
//   clientData  — from useClientData hook (same shape as before)
//   onBack      — () => void
//   onOpenTab   — (tab, sleepSubTab?) => void

import { useState, useEffect, useRef } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { callAI } from "../../lib/ai.js";
import { IntakeViewer } from "../../modules/intake/IntakeViewer.jsx";
import { ResponseDraftGenerator } from "../../modules/consultant/ResponseDraftGenerator.jsx";
import { ClientMemoryEngine } from "../../modules/consultant/ClientMemoryEngine.jsx";
import { getPlanDay } from "../../modules/sleep/sleepHelpers.js";

// ─── TIER COLORS ──────────────────────────────────────────────────────────────
const TIERS = {
  urgent:     { badge: "#C0392B", badgeBg: "#FDECEA", border: "#F5BCBC", dot: "#E57373" },
  watch:      { badge: "#D4820A", badgeBg: "#FEF6E4", border: "#F5DFA0", dot: "#FFB74D" },
  predictive: { badge: "#7B4FBF", badgeBg: "#F3EEF9", border: "#D4B8F0", dot: "#BA68C8" },
  intake:     { badge: "#1A5F8A", badgeBg: "#E8F2FA", border: "#BBDEFB", dot: "#64B5F6" },
  stable:     { badge: "#2D6A4F", badgeBg: "#EAF3EB", border: "#A8D5B5", dot: "#81C784" },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ageLabel(dob) {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44));
  return months < 24 ? `${months} months` : `${Math.floor(months / 12)}y ${months % 12}mo`;
}

function timeAgo(iso) {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

// Wraps the shared, timezone-correct getPlanDay helper. Kept as a local
// function (rather than inlining the import at each call site) so the two
// call sites below don't need to change their call shape.
//
// NOTE: this used to read family.plan_start_date, which is not a real
// column on the families table — that lookup was always undefined, so this
// always returned NaN. The real field is family.sleep_plan_profile.startDate.
function planDay(family) {
  return getPlanDay(family?.sleep_plan_profile?.startDate, family?.timezone);
}

// ─── AI SYSTEM PROMPT ─────────────────────────────────────────────────────────
const GUIDANCE_PROMPT = `You are the Held Family Guidance Engine — a clinical decision-support layer for pediatric sleep consultants trained in nervous-system-informed, attachment-based sleep coaching.

Your job is NOT to teach. Your job is to help a consultant think faster and act more clearly.

VOICE:
- calm, perceptive, emotionally intelligent
- clinically grounded without being robotic
- direct without being harsh
- never patronizing, never fluffy
- sounds like a trusted colleague, not a chatbot

Return ONLY valid JSON using this exact schema:

{
  "pattern_trigger_label": "short category label for what type of pattern this is",
  "pattern_title": "synthesized headline — 1 clear sentence",
  "pattern_interpretation": "2–3 sentences. What is happening, what it means, why it matters. Human and grounded.",
  "trend_direction": "improving | worsening | stable | mixed | insufficient_data",
  "primary_cta_label": "label for the main action button",
  "primary_cta_type": "draft_message | open_sleep | open_messages | review_intake | open_regulation",

  "likely_drivers": [
    { "label": "driver name", "note": "1 sentence why this is a hypothesis" }
  ],

  "diagnostic_questions": [
    "specific question the consultant should ask this family"
  ],

  "next_steps": [
    {
      "action": "concrete step description",
      "cta_label": "button label",
      "cta_type": "draft_message | open_sleep | open_messages | review_intake | open_regulation | hold_steady"
    }
  ],

  "forecast": [
    {
      "prediction": "1 sentence — what is likely to happen next",
      "confidence": "high | moderate | early_signal"
    }
  ],

  "draft_seed": "2–4 sentence message draft the consultant could send right now. Match RCC tone — grounded, warm, direct. No generic reassurance.",

  "family_context_notes": [
    "key remembered context item from intake or history — short, specific"
  ],

  "confidence_note": "1 sentence on data strength or gaps"
}

RULES:
- pattern_interpretation must be human and emotionally intelligent. Not robotic.
- likely_drivers are hypotheses, not claims. Max 4.
- diagnostic_questions must be specific to this case — not generic. 3–5 questions.
- next_steps max 3, each concrete with a real destination.
- forecast max 3 items. Do not overstate certainty.
- draft_seed should name the pattern, support the parent, and guide — no "you're doing great" filler.
- If data is sparse, say so clearly in confidence_note and keep pattern_interpretation humble.

Return JSON only. No markdown.`;

// ─── BUILD CONTEXT FOR AI ─────────────────────────────────────────────────────
async function buildGuidanceContext(clientData, family, intake) {
  const child = clientData.children?.[0];
  const childName = child?.name || "the child";
  const age = child?.dob ? ageLabel(child.dob) : "age unknown";
  const day = planDay(family);

  const recentMsgs = (clientData.recentMessages || [])
    .map(m => `- ${m.sender_id ? "Parent" : "Consultant"}: "${m.content?.slice(0, 120)}"`)
    .join("\n") || "No recent messages";

  const intakeContext = intake ? [
    intake.sleep_challenges && `Sleep challenges: ${intake.sleep_challenges}`,
    intake.goals && `Goals: ${intake.goals}`,
    intake.non_negotiables && `Non-negotiables: ${intake.non_negotiables}`,
    intake.parent_anxiety != null && `Parent anxiety at intake: ${intake.parent_anxiety}/5`,
    intake.consistency_capacity != null && `Consistency capacity: ${intake.consistency_capacity}/5`,
    intake.sleep_props && `Sleep props: ${intake.sleep_props}`,
    intake.temperament_intensity != null && `Child temperament intensity: ${intake.temperament_intensity}/5`,
    intake.temperament_sensitivity != null && `Sensory sensitivity: ${intake.temperament_sensitivity}/5`,
  ].filter(Boolean).join("\n") : "No intake data available";

  return `FAMILY: ${family.display_name || family.invite_email || "Unnamed"}
CHILD: ${childName}, ${age}
PLAN DAY: ${day ?? "not started"}
TIER: ${clientData.tier || "unknown"}

SLEEP DATA (last 7 days):
- Sessions logged: ${clientData.sleepData?.weekSessions ?? 0}
- Avg night wakings: ${clientData.sleepData?.nightWakesAvg ?? 0}
- Naps today: ${clientData.sleepData?.napCountToday ?? 0}
- Total sleep today: ${clientData.sleepData?.totalSleepTodayH ?? 0}h
- Sleep trend: ${clientData.sleepTrend || "unknown"}
- Consecutive bad nights: ${clientData.consecutiveBadNights || 0}
- Physiological flag: ${clientData.physiologicalFlag || "none"}
- Medication logged: ${clientData.medicationLogged ? "yes" : "no"}

PARENT STATE:
- Overwhelm level: ${clientData.parentState?.overwhelmLevel ?? "unknown"}/10
- Last NS state: ${clientData.parentState?.recentState || "none recorded"}
- Regulation check-ins this week: ${clientData.regulationCheckIns ?? 0}
- Distress signals detected: ${clientData.trigger === "distress_language" ? "yes" : "no"}

ENGAGEMENT:
- Last sleep log: ${clientData.lastLog ? timeAgo(clientData.lastLog) : "none"}
- Last message: ${clientData.lastMessage ? timeAgo(clientData.lastMessage) : "none"}
- Intake complete: ${family.intake_complete ? "yes" : "no"}

ACTIVE SIGNAL: ${clientData.reasonString || "none"}

RECENT MESSAGES:
${recentMsgs}

INTAKE CONTEXT:
${intakeContext}`;
}

// ─── SUPABASE CACHE ───────────────────────────────────────────────────────────
async function loadCachedGuidance(familyId) {
  try {
    const { data } = await supabase
      .from("family_guidance_cache")
      .select("guidance, generated_at")
      .eq("family_id", familyId)
      .maybeSingle();
    if (!data) return null;
    // Stale after 4 hours
    const age = Date.now() - new Date(data.generated_at).getTime();
    if (age > 4 * 3600000) return null;
    return data.guidance;
  } catch {
    return null;
  }
}

async function saveGuidanceCache(familyId, consultantId, guidance) {
  try {
    await supabase.from("family_guidance_cache").upsert({
      family_id: familyId,
      consultant_id: consultantId,
      guidance,
      generated_at: new Date().toISOString(),
    }, { onConflict: "family_id,consultant_id" });
  } catch {
    // Cache save failure is silent — guidance still shows
  }
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  const T = useT();
  return (
    <div style={{ fontFamily: font, fontSize: 10, fontWeight: 500, color: T.subText, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function PulseDot({ color, size = 6 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size + 4, height: size + 4, flexShrink: 0 }}>
      <span style={{ position: "absolute", width: size + 6, height: size + 6, borderRadius: "50%", background: color, opacity: 0, animation: "fg-pulse 2s ease-in-out infinite" }} />
      <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "block", position: "relative", zIndex: 1 }} />
    </span>
  );
}

function TierBadge({ tier }) {
  const label = { urgent: "Needs attention", watch: "Watch", predictive: "Milestone", intake: "Intake incomplete", stable: "Stable" }[tier] || "Stable";
  const t = TIERS[tier] || TIERS.stable;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: t.badgeBg, border: `0.5px solid ${t.border}`, fontSize: 10, fontWeight: 600, color: t.badge, fontFamily: font }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

function ConfidencePill({ confidence }) {
  const map = {
    high:           { label: "High confidence",  color: "#2D6A4F", bg: "#EAF3EB" },
    moderate:       { label: "Moderate",         color: "#D4820A", bg: "#FEF6E4" },
    early_signal:   { label: "Early signal",     color: "#7B4FBF", bg: "#F3EEF9" },
  };
  const cfg = map[confidence] || map.moderate;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, background: cfg.bg, fontSize: 10, fontWeight: 500, color: cfg.color, fontFamily: font }}>
      {cfg.label}
    </span>
  );
}

function MiniTrend({ direction }) {
  const T = useT();
  const map = {
    improving:          { icon: "↗", color: "#2D6A4F", label: "Improving" },
    worsening:          { icon: "↘", color: "#C0392B", label: "Worsening" },
    stable:             { icon: "→", color: "#D4820A", label: "Stable" },
    mixed:              { icon: "↕", color: "#7B4FBF", label: "Mixed" },
    insufficient_data:  { icon: "?", color: T.subText,  label: "Insufficient data" },
  };
  const cfg = map[direction] || map.stable;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: font, fontSize: 11, color: cfg.color }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

// ─── SLEEP SNAPSHOT ───────────────────────────────────────────────────────────
function SleepSnapshot({ clientData, T }) {
  const { sleepData, parentState, sleepTrend, consecutiveBadNights, physiologicalFlag, lastLog, regulationCheckIns } = clientData;

  const stats = [
    { label: "Sessions / week", value: sleepData.weekSessions, icon: "🌙" },
    { label: "Avg night wakes", value: `${sleepData.nightWakesAvg}`, icon: "🌛" },
    { label: "Naps today",      value: sleepData.napCountToday, icon: "💤" },
    { label: "Sleep today",     value: `${sleepData.totalSleepTodayH}h`, icon: "⏱" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: T.faint, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontFamily: font, fontSize: 16, fontWeight: 700, color: T.headingText }}>{s.value}</div>
            <div style={{ fontFamily: font, fontSize: 10, color: T.subText, textTransform: "uppercase", letterSpacing: ".05em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trend + signals row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {sleepTrend && <MiniTrend direction={sleepTrend} />}
        {consecutiveBadNights >= 2 && (
          <span style={{ fontFamily: font, fontSize: 11, color: TIERS.urgent.badge, background: TIERS.urgent.badgeBg, padding: "2px 8px", borderRadius: 20 }}>
            {consecutiveBadNights} rough nights
          </span>
        )}
        {physiologicalFlag && (
          <span style={{ fontFamily: font, fontSize: 11, color: TIERS.watch.badge, background: TIERS.watch.badgeBg, padding: "2px 8px", borderRadius: 20 }}>
            {physiologicalFlag.charAt(0).toUpperCase() + physiologicalFlag.slice(1)} flagged
          </span>
        )}
        {lastLog && (
          <span style={{ fontFamily: font, fontSize: 11, color: T.subText }}>
            Last log {timeAgo(lastLog)}
          </span>
        )}
      </div>

      {/* Overwhelm row */}
      {parentState.overwhelmLevel > 0 && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: parentState.overwhelmLevel >= 7 ? TIERS.urgent.badgeBg : T.faint }}>
          <span>🌊</span>
          <div>
            <div style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: parentState.overwhelmLevel >= 7 ? TIERS.urgent.badge : T.text }}>
              Parent overwhelm {parentState.overwhelmLevel}/10
            </div>
            {parentState.recentState && (
              <div style={{ fontFamily: font, fontSize: 11, color: T.muted }}>NS state: {parentState.recentState}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────
function GuidanceSkeleton({ T }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[120, 80, 60].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 12, background: T.faint, animation: "fg-shimmer 1.5s ease-in-out infinite" }} />
      ))}
      <style>{`@keyframes fg-shimmer { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
    </div>
  );
}

// ─── ACTIVE PATTERN CARD ──────────────────────────────────────────────────────
function ActivePatternCard({ guidance, tier, onCTA, T }) {
  const t = TIERS[tier] || TIERS.watch;

  return (
    <div style={{ borderRadius: 14, border: `0.5px solid ${t.border}`, background: T.card, overflow: "hidden" }}>
      {/* Accent strip */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${t.dot}, ${t.badge})` }} />

      <div style={{ padding: "16px 18px" }}>
        {/* Trigger label */}
        <div style={{ fontFamily: font, fontSize: 10, fontWeight: 600, color: t.badge, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
          {guidance.pattern_trigger_label}
        </div>

        {/* Title */}
        <div style={{ fontFamily: serif, fontSize: 19, color: T.headingText, lineHeight: 1.3, marginBottom: 12 }}>
          {guidance.pattern_title}
        </div>

        {/* Trend */}
        {guidance.trend_direction && (
          <div style={{ marginBottom: 10 }}>
            <MiniTrend direction={guidance.trend_direction} />
          </div>
        )}

        {/* Interpretation */}
        <div style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7, marginBottom: 16 }}>
          {guidance.pattern_interpretation}
        </div>

        {/* Primary CTA */}
        <button
          onClick={onCTA}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", background: t.badge, color: "#fff", fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {guidance.primary_cta_label || "Take action"} →
        </button>
      </div>
    </div>
  );
}

// ─── DIAGNOSTIC LAYER ─────────────────────────────────────────────────────────
function DiagnosticLayer({ guidance, T }) {
  const [showAll, setShowAll] = useState(false);
  const questions = guidance.diagnostic_questions || [];
  const visibleQ = showAll ? questions : questions.slice(0, 3);

  return (
    <div>
      {/* Likely drivers */}
      {guidance.likely_drivers?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: T.subText, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
            Most Likely Drivers
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {guidance.likely_drivers.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10, background: T.faint, border: `0.5px solid ${T.border}` }}>
                <span style={{ color: T.sage, fontFamily: font, fontSize: 13, flexShrink: 0, marginTop: 1 }}>→</span>
                <div>
                  <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.headingText, marginBottom: 2 }}>{d.label}</div>
                  <div style={{ fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{d.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic questions */}
      {questions.length > 0 && (
        <div>
          <div style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: T.subText, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
            To Understand What's Driving This
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {visibleQ.map((q, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "9px 12px", borderRadius: 10, background: T.card, border: `0.5px solid ${T.border}` }}>
                <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: T.subText, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <span style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.5 }}>{q}</span>
              </div>
            ))}
          </div>
          {questions.length > 3 && (
            <button onClick={() => setShowAll(s => !s)} style={{ marginTop: 8, background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.sage, cursor: "pointer", padding: 0 }}>
              {showAll ? "Show fewer ↑" : `Show ${questions.length - 3} more questions ↓`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── NEXT STEPS ───────────────────────────────────────────────────────────────
function NextSteps({ guidance, onAction, T }) {
  const steps = guidance.next_steps || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: T.card, border: `0.5px solid ${T.border}` }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: T.faint, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, fontSize: 11, fontWeight: 700, color: T.subText, flexShrink: 0 }}>
            {i + 1}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.5 }}>{step.action}</div>
          </div>
          <button
            onClick={() => onAction(step.cta_type, step)}
            style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 20, background: T.faint, border: `0.5px solid ${T.border}`, fontFamily: font, fontSize: 11, fontWeight: 600, color: T.sage, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {step.cta_label} →
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── FORECAST ─────────────────────────────────────────────────────────────────
function Forecast({ guidance, T }) {
  const items = guidance.forecast || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "10px 14px", borderRadius: 10, background: T.card, border: `0.5px solid ${T.border}` }}>
          <div style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.5, flex: 1 }}>
            {item.prediction}
          </div>
          <ConfidencePill confidence={item.confidence} />
        </div>
      ))}
    </div>
  );
}

// ─── FAMILY CONTEXT ───────────────────────────────────────────────────────────
function FamilyContext({ guidance, intake, T }) {
  const notes = guidance.family_context_notes || [];
  const hasIntakeContext = intake && (intake.goals || intake.sleep_challenges || intake.non_negotiables);

  return (
    <div>
      {notes.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {notes.map((note, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ color: T.sage, flexShrink: 0, fontFamily: font, fontSize: 13 }}>·</span>
              <span style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.5 }}>{note}</span>
            </div>
          ))}
        </div>
      )}

      {hasIntakeContext && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: T.faint, border: `0.5px solid ${T.border}` }}>
          {intake.goals && <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 4 }}><strong style={{ color: T.text }}>Goals:</strong> {intake.goals}</div>}
          {intake.sleep_challenges && <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 4 }}><strong style={{ color: T.text }}>Challenges:</strong> {intake.sleep_challenges}</div>}
          {intake.non_negotiables && <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}><strong style={{ color: T.text }}>Non-negotiables:</strong> {intake.non_negotiables}</div>}
        </div>
      )}
    </div>
  );
}

// ─── HISTORY STRIP ────────────────────────────────────────────────────────────
function HistoryStrip({ clientData, onOpenTab, T }) {
  const messages = clientData.recentMessages || [];
  if (!messages.length && !clientData.lastLog) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {messages.slice(0, 4).map((msg, i) => (
        <div key={i} onClick={() => onOpenTab("messages")} style={{ display: "flex", gap: 10, padding: "9px 12px", borderRadius: 10, background: T.card, border: `0.5px solid ${T.border}`, cursor: "pointer" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: msg.sender_id ? TIERS.urgent.dot : T.sage, marginTop: 4, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: font, fontSize: 12, color: T.text, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {msg.content || "—"}
            </div>
            <div style={{ fontFamily: font, fontSize: 10, color: T.subText, marginTop: 2 }}>
              {msg.sender_id ? "Parent" : "Consultant"} · {timeAgo(msg.created_at)}
            </div>
          </div>
        </div>
      ))}

      <button onClick={() => onOpenTab("messages")} style={{ alignSelf: "flex-start", background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.sage, cursor: "pointer", padding: 0, marginTop: 2 }}>
        View all messages →
      </button>
    </div>
  );
}

// ─── INLINE DRAFT PANEL ───────────────────────────────────────────────────────
function InlineDraft({ guidance, clientData, family, onClose, onOpenTab, T }) {
  const [copyDone, setCopyDone] = useState(false);
  return (
    <div style={{ borderRadius: 14, border: `0.5px solid ${T.border}`, background: T.card, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `0.5px solid ${T.border}` }}>
        <div style={{ fontFamily: font, fontSize: 10, fontWeight: 600, color: T.subText, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          ✍️ Message Draft
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.muted, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <ResponseDraftGenerator
          insight={null}
          clientData={clientData}
          family={family}
          seedMessage={guidance?.draft_seed || ""}
          onInsert={text => {
            navigator.clipboard.writeText(text)
              .then(() => { setCopyDone(true); setTimeout(() => setCopyDone(false), 2500); })
              .catch(() => { setCopyDone(true); setTimeout(() => setCopyDone(false), 2500); });
          }}
        />
        {copyDone && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: "#EAF0E8", borderRadius: 10, fontFamily: font, fontSize: 12, color: "#5C7A5E" }}>
            ✓ Draft copied — paste into Messages to send.
          </div>
        )}
        <button
          onClick={() => onOpenTab("messages")}
          style={{ marginTop: 10, background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.sage, cursor: "pointer", padding: 0 }}
        >
          Open Messages tab →
        </button>
      </div>
    </div>
  );
}

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────
function Section({ label, children, T }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: "16px 18px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function FamilyGuidance({ clientData, onBack, onOpenTab }) {
  const T = useT();
  const { currentUser } = useApp();

  const { family, children, tier } = clientData;
  const child = children?.[0];
  const t = TIERS[tier] || TIERS.stable;

  const [guidance, setGuidance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDraft, setShowDraft] = useState(false);
  const [viewingIntake, setViewingIntake] = useState(false);
  const [intake, setIntake] = useState(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [endingRel, setEndingRel] = useState(false);

  // Auto-clear toast after 3s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const generatingRef = useRef(false);

  // Load intake data
  useEffect(() => {
    if (!family?.id) return;
    supabase
      .from("intake_responses")
      .select("goals, sleep_challenges, non_negotiables, parent_anxiety, consistency_capacity, sleep_props, temperament_intensity, temperament_sensitivity")
      .eq("family_id", family.id)
      .maybeSingle()
      .then(({ data }) => setIntake(data || null));
  }, [family?.id]);

  // Generate guidance on load — check cache first
  useEffect(() => {
    if (!family?.id || generatingRef.current) return;
    generateGuidance(false);
  }, [family?.id]);

  async function generateGuidance(forceRefresh = false) {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setLoading(true);
    setError(null);
    setShowDraft(false);

    try {
      // Check cache unless forced refresh
      if (!forceRefresh) {
        const cached = await loadCachedGuidance(family.id);
        if (cached) {
          setGuidance(cached);
          setLoading(false);
          generatingRef.current = false;
          return;
        }
      }

      const context = await buildGuidanceContext(clientData, family, intake);
      const raw = await callAI({
        system: GUIDANCE_PROMPT,
        max_tokens: 1200,
        messages: [{ role: "user", content: context }],
      });
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setGuidance(parsed);
      await saveGuidanceCache(family.id, currentUser?.id, parsed);
    } catch (e) {
      setError("Couldn't generate guidance right now. Data is safe — try again.");
    } finally {
      setLoading(false);
      generatingRef.current = false;
    }
  }

  function handleCTA(ctaType) {
    switch (ctaType) {
      case "draft_message":
        setShowDraft(true);
        break;
      case "open_messages":
        onOpenTab("messages");
        break;
      case "open_sleep":
        onOpenTab("sleep", "dashboard");
        break;
      case "review_intake":
        // If intake is complete, open the viewer. If not, resend it.
        if (family.intake_complete) {
          setViewingIntake(true);
        } else {
          // Resend without confirm dialog — PWA safe
          supabase.from("families").update({ intake_complete: false }).eq("id", family.id)
            .then(() => setToast("Intake re-sent — they'll see it on their next login."))
            .catch(() => setToast("Something went wrong. Please try again."));
        }
        break;
      case "open_regulation":
        onOpenTab("regulation");
        break;
      default:
        setShowDraft(true);
    }
  }

  // ── Active child state (for multi-child families) ──
  const [activeChildId, setActiveChildIdLocal] = useState(children?.[0]?.id || null);
  const activeChild = children?.find(c => c.id === activeChildId) || children?.[0];
  const [activeTab, setActiveTab] = useState("insights");
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  // Load saved notes
  useEffect(() => {
    if (!family?.id) return;
    supabase.from("families").select("consultant_notes").eq("id", family.id).maybeSingle()
      .then(({ data }) => { if (data?.consultant_notes) setNotes(data.consultant_notes); });
  }, [family?.id]);

  async function saveNotes() {
    await supabase.from("families").update({ consultant_notes: notes }).eq("id", family.id);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  // Intake viewer — rendered after all hooks
  if (viewingIntake) {
    return <IntakeViewer family={family} onBack={() => setViewingIntake(false)} />;
  }

  const day = planDay(family);

  // Child status tier — first child gets family tier, rest default stable
  function childTier(idx) {
    return idx === 0 ? tier : "stable";
  }
  const childStatusColor = t2 =>
    t2 === "urgent" ? "#E57373" : t2 === "watch" ? "#FFB74D" : "#7FD98A";

  const TABS = [
    { id: "insights",  label: "Insights"   },
    { id: "sleep",     label: "Sleep Data" },
    { id: "plan",      label: "Plan"       },
    { id: "intake",    label: "Intake"     },
    { id: "notes",     label: "Notes"      },
  ];

  return (
    <div style={{ fontFamily: font }}>
      <style>{`
        @keyframes fg-pulse { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(2.2);opacity:0} }
        @keyframes fg-shimmer { 0%,100%{opacity:.35} 50%{opacity:.7} }
      `}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: "#2D4A35", color: "#fff", padding: "10px 20px",
          borderRadius: 20, fontFamily: font, fontSize: 13, zIndex: 999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      {/* ── TOP NAV BAR ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0, paddingBottom: 12 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer", padding: 0 }}>
          ‹ Families
        </button>
        <button
          onClick={() => generateGuidance(true)}
          disabled={loading}
          style={{ background: "none", border: "none", fontFamily: font, fontSize: 13, fontWeight: 600, color: loading ? T.subText : T.teal, cursor: loading ? "default" : "pointer", padding: 0 }}
        >
          {loading ? "Updating…" : "↻ Refresh"}
        </button>
      </div>

      {/* ── FAMILY HERO — gradient, matches wireframe ── */}
      <div style={{
        background: "linear-gradient(160deg, #FAF0EA, #EAF0E8)",
        padding: "14px 18px 10px", marginBottom: 0,
        borderRadius: "16px 16px 0 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%",
            background: "rgba(184,146,74,0.15)", border: "2px solid rgba(184,146,74,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
          }}>
            👨‍👩‍👧
          </div>
          <div>
            <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, color: "#2D4A35", lineHeight: 1.2 }}>
              {family.display_name || family.invite_email?.split("@")[0] || "Family"}
            </div>
            <div style={{ fontFamily: font, fontSize: 11, color: "rgba(58,46,40,0.5)" }}>
              {children?.length > 0
                ? `${children.length} ${children.length === 1 ? "child" : "children"}${day ? ` · ${children.length === 1 ? `Day ${day} of plan` : `${children.length} active plans`}` : ""}`
                : day ? `Day ${day} of plan` : "No active plan"
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── NS BANNER ── */}
      {clientData.parentState?.overwhelmLevel >= 5 && (
        <div style={{
          margin: "0 0 0", background: "rgba(184,146,74,0.08)",
          border: "1px solid rgba(184,146,74,0.25)",
          padding: "10px 18px", display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: font, fontSize: 9, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8924A", marginBottom: 2 }}>
              Parent nervous system · Family
            </div>
            <div style={{ fontFamily: font, fontSize: 12, color: "#3A2E28" }}>
              {clientData.parentState.overwhelmLevel >= 8
                ? "Overwhelm elevated — likely needs validation before data."
                : "NS trend elevated. A grounded message will land better right now."}
            </div>
          </div>
          {/* Mini trend bars */}
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", flexShrink: 0 }}>
            {[14, 20, 26, 30, 34].map((h, i) => (
              <div key={i} style={{ width: 5, height: h, borderRadius: 2, background: i < 2 ? "#D4AE72" : i < 4 ? "#B8924A" : "#C0543A" }} />
            ))}
          </div>
        </div>
      )}

      {/* ── CHILD SELECTOR CHIPS ── */}
      {children?.length > 1 && (
        <div style={{ display: "flex", gap: 8, padding: "10px 18px 4px", background: T.bg }}>
          {children.map((c, idx) => {
            const isActive = c.id === activeChildId;
            const dot = childStatusColor(childTier(idx));
            return (
              <button
                key={c.id}
                onClick={() => setActiveChildIdLocal(c.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "7px 13px", borderRadius: 20, cursor: "pointer",
                  border: `1.5px solid ${isActive ? "#2D4A35" : T.border}`,
                  background: isActive ? "#2D4A35" : T.card,
                  transition: "all 0.18s",
                }}
              >
                <span style={{ fontSize: 14 }}>{idx === 0 ? "👶" : "🧒"}</span>
                <span style={{ fontFamily: font, fontSize: 12, fontWeight: 500, color: isActive ? "white" : T.text }}>
                  {c.name}
                </span>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, display: "inline-block" }} />
              </button>
            );
          })}
        </div>
      )}

      {/* ── TAB STRIP ── */}
      <div style={{
        display: "flex", background: T.faint, borderRadius: 12, padding: 3,
        margin: "10px 0 16px",
        overflowX: "auto", scrollbarWidth: "none",
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "intake") { setViewingIntake(true); return; }
              if (tab.id === "sleep") { onOpenTab("sleep", "dashboard"); return; }
              setActiveTab(tab.id);
            }}
            style={{
              flex: "0 0 auto", padding: "8px 12px", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: font, fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400,
              background: activeTab === tab.id ? T.card : "transparent",
              color: activeTab === tab.id ? T.headingText : T.muted,
              boxShadow: activeTab === tab.id ? "0 1px 6px rgba(90,70,60,0.12)" : "none",
              transition: "all .18s", whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── NOTES TAB ── */}
      {activeTab === "notes" && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: T.subText, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>
            Consultant Notes
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add private notes about this family — context, observations, things to remember…"
            style={{
              width: "100%", minHeight: 200, padding: "14px 16px",
              borderRadius: 14, border: `1px solid ${T.border}`,
              background: T.card, color: T.text,
              fontFamily: font, fontSize: 13, lineHeight: 1.65,
              resize: "vertical", outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = T.teal}
            onBlur={e => e.target.style.borderColor = T.border}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              onClick={saveNotes}
              style={{
                padding: "8px 18px", borderRadius: 10, border: "none",
                background: T.teal, color: "white",
                fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              {notesSaved ? "✓ Saved" : "Save notes"}
            </button>
          </div>
        </div>
      )}

      {/* ── CHILD CONTEXT STRIP (Insights tab only) ── */}
      {activeTab === "insights" && activeChild && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: T.faint, borderRadius: 12, padding: "10px 13px",
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 18 }}>{children?.indexOf(activeChild) === 0 ? "👶" : "🧒"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.headingText }}>
              {activeChild.name}
              {activeChild.dob && <span style={{ fontWeight: 400, color: T.muted }}> · {ageLabel(activeChild.dob)}</span>}
              {day && <span style={{ fontWeight: 400, color: T.muted }}> · Day {day} of plan</span>}
            </div>
            {activeChild.dob && (() => {
              const mo = Math.floor((Date.now() - new Date(activeChild.dob)) / (1000 * 60 * 60 * 24 * 30.44));
              const stage = mo < 3 ? "Newborn" : mo < 12 ? "Infant" : mo < 36 ? "Toddler" : "Preschooler";
              return <div style={{ fontFamily: font, fontSize: 11, color: T.muted }}>{stage}</div>;
            })()}
          </div>
          <TierBadge tier={tier} />
        </div>
      )}

      {/* ── INLINE DRAFT (shown when CTA triggers it) ── */}
      {showDraft && guidance && activeTab === "insights" && (
        <InlineDraft
          guidance={guidance}
          clientData={clientData}
          family={family}
          onClose={() => setShowDraft(false)}
          onOpenTab={onOpenTab}
          T={T}
        />
      )}

      {/* ── LOADING STATE ── */}
      {loading && activeTab === "insights" && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: font, fontSize: 12, color: T.subText, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <PulseDot color={T.sage} size={5} />
            Analyzing family data…
          </div>
          <GuidanceSkeleton T={T} />
        </div>
      )}

      {/* ── ERROR STATE ── */}
      {error && !loading && activeTab === "insights" && (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: TIERS.urgent.badgeBg, border: `0.5px solid ${TIERS.urgent.border}`, marginBottom: 20 }}>
          <div style={{ fontFamily: font, fontSize: 13, color: TIERS.urgent.badge, marginBottom: 6 }}>{error}</div>
          <button onClick={() => generateGuidance(true)} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.sage, cursor: "pointer", padding: 0 }}>
            Try again →
          </button>
        </div>
      )}

      {/* ── GUIDANCE CONTENT ── */}
      {activeTab === "insights" && guidance && !loading && (
        <>
          {/* ── 2. ACTIVE PATTERN CARD ── */}
          <div style={{ marginBottom: 24 }}>
            <SectionLabel>Active Pattern</SectionLabel>
            <ActivePatternCard
              guidance={guidance}
              tier={tier}
              onCTA={() => handleCTA(guidance.primary_cta_type)}
              T={T}
            />
          </div>

          {/* ── 3. GUIDED THINKING ── */}
          <Section label="Guided Thinking" T={T}>
            <DiagnosticLayer guidance={guidance} T={T} />
          </Section>

          {/* ── 4. RECOMMENDED NEXT STEPS ── */}
          {guidance.next_steps?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Recommended Next Steps</SectionLabel>
              <NextSteps guidance={guidance} onAction={handleCTA} T={T} />
            </div>
          )}

          {/* ── 5. WHAT'S LIKELY COMING ── */}
          {guidance.forecast?.length > 0 && (
            <Section label="What's Likely Coming" T={T}>
              <Forecast guidance={guidance} T={T} />
            </Section>
          )}

          {/* ── 6–9. DIVE DEEPER ── collapsed by default ── */}
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={() => setShowDeepDive(s => !s)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 18px", borderRadius: 14,
                background: T.card, border: `0.5px solid ${T.border}`,
                fontFamily: font, cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>🔍</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.headingText }}>Dive Deeper</div>
                  <div style={{ fontSize: 11, color: T.subText, marginTop: 1 }}>
                    Sleep data · Family context · History · Navigation
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 13, color: T.muted, transition: "transform 0.2s", display: "inline-block", transform: showDeepDive ? "rotate(180deg)" : "rotate(0deg)" }}>
                ↓
              </span>
            </button>

            {showDeepDive && (
              <div style={{ marginTop: 12 }}>

                {/* Sleep Snapshot */}
                <Section label="Sleep Snapshot" T={T}>
                  <SleepSnapshot clientData={clientData} T={T} />
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${T.border}` }}>
                    <button onClick={() => onOpenTab("sleep", "dashboard")} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.sage, cursor: "pointer", padding: 0 }}>
                      View full sleep log →
                    </button>
                  </div>
                </Section>

                {/* Family Context */}
                <Section label="Family Context" T={T}>
                  <FamilyContext guidance={guidance} intake={intake} T={T} />
                  {family.intake_complete && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${T.border}` }}>
                      <button onClick={() => setViewingIntake(true)} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.sage, cursor: "pointer", padding: 0 }}>
                        View full intake →
                      </button>
                    </div>
                  )}
                  {!family.intake_complete && (
                    <div style={{ marginTop: 12, fontFamily: font, fontSize: 12, color: T.muted }}>
                      Intake not yet complete — some context may be limited.
                    </div>
                  )}
                </Section>

                {/* Patterns Across Time */}
                <div style={{ marginBottom: 24 }}>
                  <SectionLabel>Patterns Across Time</SectionLabel>
                  <ClientMemoryEngine
                    family={family}
                    clientData={clientData}
                    childName={child?.name}
                  />
                </div>

                {/* Recent Activity */}
                <Section label="Recent Activity" T={T}>
                  <HistoryStrip clientData={clientData} onOpenTab={onOpenTab} T={T} />
                </Section>

                {/* Quick Navigation */}
                <div style={{ marginBottom: 24 }}>
                  <SectionLabel>Quick Navigation</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { icon: "💬", label: "Messages",   sub: clientData.lastMessage ? `Last message ${timeAgo(clientData.lastMessage)}` : "No messages yet", tab: "messages" },
                      { icon: "🌙", label: "Sleep Log",  sub: clientData.lastLog ? `Last log ${timeAgo(clientData.lastLog)}` : "No logs yet",          tab: "sleep" },
                      { icon: "🌿", label: "Regulation", sub: `${clientData.regulationCheckIns} check-ins this week`,                                   tab: "regulation" },
                    ].map(item => (
                      <div key={item.tab} onClick={() => onOpenTab(item.tab)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: `0.5px solid ${T.border}`, background: T.card, cursor: "pointer" }}>
                        <span style={{ fontSize: 18 }}>{item.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.headingText }}>{item.label}</div>
                          <div style={{ fontFamily: font, fontSize: 11, color: T.muted }}>{item.sub}</div>
                        </div>
                        <span style={{ color: T.muted }}>→</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Confidence note */}
          {guidance.confidence_note && (
            <div style={{ fontFamily: font, fontSize: 11, color: T.subText, fontStyle: "italic", textAlign: "center", marginBottom: 16 }}>
              ⓘ {guidance.confidence_note}
            </div>
          )}
        </>
      )}

      {/* ── END RELATIONSHIP ── */}
      <div style={{ paddingTop: 16, borderTop: `0.5px solid ${T.border}`, marginBottom: 20 }}>
        <div style={{ fontFamily: font, fontSize: 11, color: T.subText, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>End Client Relationship</div>
        <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.6, marginBottom: 12 }}>
          This will remove your connection to this family. Their access steps down to Free. Their data is preserved.
        </div>
        {!confirmEnd ? (
          <button
            onClick={() => setConfirmEnd(true)}
            style={{ padding: "10px 16px", borderRadius: 10, border: `0.5px solid ${TIERS.urgent.border}`, background: TIERS.urgent.badgeBg, color: TIERS.urgent.badge, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" }}
          >
            End relationship →
          </button>
        ) : (
          <div style={{ background: "#FBF0EC", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(192,84,58,0.2)" }}>
            <div style={{ fontFamily: font, fontSize: 13, color: "#8B2E2E", marginBottom: 12, lineHeight: 1.5 }}>
              End relationship with {family.display_name || family.invite_email || "this family"}? They'll lose VIP access — their data is preserved.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={async () => {
                  setEndingRel(true);
                  try {
                    const { error } = await supabase.rpc("remove_family_from_consultant", { p_family_id: family.id });
                    if (error) throw error;
                    setToast("Relationship ended.");
                    setTimeout(() => onBack(), 1500);
                  } catch (e) {
                    setToast(`Something went wrong: ${e.message}`);
                    setConfirmEnd(false);
                    setEndingRel(false);
                  }
                }}
                disabled={endingRel}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#8B2E2E", color: "#fff", fontFamily: font, fontSize: 13, fontWeight: 600, cursor: endingRel ? "default" : "pointer", opacity: endingRel ? 0.7 : 1 }}
              >
                {endingRel ? "Ending…" : "Yes, end it"}
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(192,84,58,0.3)", background: "none", color: "#8B2E2E", fontFamily: font, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
