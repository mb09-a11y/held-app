import { useState, useEffect } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { FamilyGuidance } from "./FamilyGuidance.jsx";
import { ConsultantWellnessCard } from "./ConsultantWellnessCard.jsx";

// ─── TIER COLORS ──────────────────────────────────────────────────────────────
// Clinical signal colors only — hardcoded because they must mean the same thing
// in both light and dark mode. Everything else uses T (live theme tokens).
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
  return months < 24 ? `${months}mo` : `${Math.floor(months / 12)}y`;
}

function timeAgo(iso) {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function hoursSince(iso) {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso)) / 3600000);
}

function firstName(family) {
  return (family.display_name || family.invite_email || "this family").split(" ")[0].split("@")[0];
}

// ─── PRIORITY SCORING ─────────────────────────────────────────────────────────
const TIER_WEIGHT = { urgent: 5, predictive: 4, watch: 3, intake: 2, stable: 1 };

const DISTRESS_KEYWORDS = [
  "can't do this", "i can't", "frustrated", "so frustrated",
  "anxious", "anxiety", "i'm so anxious", "heartbroken", "my heart is breaking",
  "this kid won't", "nothing is working", "i give up", "giving up",
  "i don't know what to do",
];

function detectDistress(messages) {
  if (!messages?.length) return false;
  const recentText = messages.slice(0, 3).map(m => (m.content || "").toLowerCase()).join(" ");
  return DISTRESS_KEYWORDS.some(kw => recentText.includes(kw));
}

function classifyFamily(cd) {
  const { family, sleepData, parentState, recentMessages, lastLog, lastMessage, planStartDate } = cd;
  const hasDistress         = detectDistress(recentMessages);
  const hoursNoLog          = lastLog ? hoursSince(lastLog) : 9999;
  const daysSincePlan       = planStartDate ? Math.floor((Date.now() - new Date(planStartDate)) / 86400000) : null;
  const sleepTrend          = cd.sleepTrend || "neutral";
  const consecutiveBadNights = cd.consecutiveBadNights || 0;
  const physiologicalFlag   = cd.physiologicalFlag || null;
  const medicationLogged    = cd.medicationLogged || false;

  if (hasDistress) return {
    tier: "urgent", trigger: "distress_language",
    reasonString: "This parent's recent messages suggest they may need reassurance and a close touchpoint.",
    liveSignal: `New message received ${timeAgo(lastMessage) || "recently"}`,
    timeUrgency: lastMessage ? `Unanswered ${timeAgo(lastMessage)}` : null,
    cta: { label: "Open family →", action: "open_messages" },
  };

  if (parentState.overwhelmLevel >= 8) return {
    tier: "urgent", trigger: "ns_pulse_elevated",
    reasonString: "Parent overwhelm is elevated — a check-in would go a long way right now.",
    liveSignal: `Overwhelm logged at ${parentState.overwhelmLevel}/10`,
    timeUrgency: null,
    cta: { label: "Draft message →", action: "draft_checkin" },
  };

  if (consecutiveBadNights >= 4) return {
    tier: "urgent", trigger: "worsening_4nights",
    reasonString: "Sleep has been trending worse for 4 or more days with no sign of improvement.",
    liveSignal: `Trend worsened overnight — ${consecutiveBadNights} rough nights, no outreach`,
    timeUrgency: hoursNoLog < 999 ? `Last log ${timeAgo(lastLog)}` : "No logs in 48h",
    cta: { label: "Draft message →", action: "draft_urgent" },
  };

  if (physiologicalFlag && parentState.overwhelmLevel >= 6) return {
    tier: "urgent", trigger: "physio_plus_distress",
    reasonString: `Baby has been logged as ${physiologicalFlag} and parent stress is elevated — a proactive note is recommended.`,
    liveSignal: `${physiologicalFlag.charAt(0).toUpperCase() + physiologicalFlag.slice(1)} logged — NS stress also elevated`,
    timeUrgency: null,
    cta: { label: "Send check-in →", action: "draft_physio" },
  };

  if (daysSincePlan !== null && (daysSincePlan === 3 || daysSincePlan === 4) && sleepTrend === "improving" && consecutiveBadNights === 0) return {
    tier: "predictive", trigger: "night4_approaching",
    reasonString: "Sleep is improving on track — a regression night is likely. Send the warning now.",
    liveSignal: `${firstName(family)} is entering a likely regression window tonight`,
    timeUrgency: `Plan day ${daysSincePlan}`,
    cta: { label: "Send warning →", action: "draft_regression" },
  };

  if (consecutiveBadNights >= 2 && consecutiveBadNights < 4 && !lastMessage) return {
    tier: "watch", trigger: "bad_nights_quiet",
    reasonString: "Sleep has been more fragmented the last few nights with no recent outreach.",
    liveSignal: `${consecutiveBadNights} rough nights — no parent message yet`,
    timeUrgency: hoursNoLog < 999 ? `Last log ${timeAgo(lastLog)}` : "No logs in 48h",
    cta: { label: "Draft message →", action: "draft_watch" },
  };

  if (daysSincePlan !== null && daysSincePlan <= 7 && hoursNoLog >= 48 && sleepTrend === "worsening") return {
    tier: "watch", trigger: "week1_silence_worsening",
    reasonString: "This family has gone quiet in an early, active phase — worth a gentle check-in.",
    liveSignal: `No logs in 48h — week ${Math.ceil(daysSincePlan / 7)} of plan`,
    timeUrgency: `No logs in ${Math.round(hoursNoLog / 24)}d`,
    cta: { label: "Draft message →", action: "draft_watch" },
  };

  if (physiologicalFlag) {
    const flagLabels = { sick: "sick", teething: "teething", leap: "in a developmental leap" };
    return {
      tier: "watch", trigger: "physiological_flag",
      reasonString: `Baby has been logged as ${flagLabels[physiologicalFlag] || physiologicalFlag} — a proactive note is recommended.`,
      liveSignal: `${physiologicalFlag.charAt(0).toUpperCase() + physiologicalFlag.slice(1)} logged yesterday — proactive note recommended`,
      timeUrgency: null,
      cta: { label: "Send check-in →", action: "draft_physio" },
    };
  }

  if (medicationLogged) return {
    tier: "watch", trigger: "medication_logged",
    reasonString: "Medication has been logged, which may indicate the baby isn't fully well.",
    liveSignal: "Medicine administered and logged",
    timeUrgency: null,
    cta: { label: "Send check-in →", action: "draft_physio" },
  };

  if (parentState.overwhelmLevel >= 5 && parentState.overwhelmLevel < 8) return {
    tier: "watch", trigger: "mild_stress",
    reasonString: "Parent overwhelm is elevated — a check-in would go a long way right now.",
    liveSignal: `Overwhelm at ${parentState.overwhelmLevel}/10 — worth a gentle check-in`,
    timeUrgency: null,
    cta: { label: "Draft message →", action: "draft_watch" },
  };

  if (daysSincePlan !== null && daysSincePlan > 7 && sleepTrend === "worsening" && !lastMessage) return {
    tier: "watch", trigger: "late_plan_worsening",
    reasonString: "Sleep has been trending worse with no parent outreach.",
    liveSignal: `Sleep worsening — plan day ${daysSincePlan}, no recent message`,
    timeUrgency: null,
    cta: { label: "View family →", action: "open_family" },
  };

  if (!family.intake_complete && family.require_intake) return {
    tier: "intake", trigger: "intake_incomplete",
    reasonString: "Key intake details are still missing, which limits plan accuracy.",
    liveSignal: "Missing fields — plan blocked",
    timeUrgency: null,
    cta: { label: "Complete intake →", action: "open_intake" },
  };

  return {
    tier: "stable", trigger: "stable",
    reasonString: daysSincePlan !== null && daysSincePlan > 7 && sleepTrend !== "worsening"
      ? "Sleep appears to be stabilizing — low engagement here is a good sign."
      : "Sleep is progressing well — no immediate action needed.",
    liveSignal: sleepData.weekSessions >= 5 ? "On track — consistent logging this week" : "Low activity (expected)",
    timeUrgency: null,
    cta: { label: "View family →", action: "open_family" },
  };
}

// ─── CLIENT DATA HOOK ─────────────────────────────────────────────────────────
function useClientData(families) {
  const [clientData, setClientData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!families || families.length === 0) { setLoading(false); return; }

    async function loadAll() {
      const since7  = new Date(Date.now() - 7 * 86400000).toISOString();
      const since24 = new Date(Date.now() - 86400000).toISOString();
      const since48 = new Date(Date.now() - 2 * 86400000).toISOString();

      const results = await Promise.all(families.map(async (f) => {
        const [{ data: sleepLogs }, { data: messages }, { data: children }, { data: checkins }] = await Promise.all([
          supabase.from("sleep_logs").select("ts, type, end_ts, total_sleep_ms, notes").eq("family_id", f.id).gte("ts", since7).order("ts", { ascending: false }),
          supabase.from("messages").select("created_at, content, sender_id").eq("family_id", f.id).order("created_at", { ascending: false }).limit(10),
          supabase.from("children").select("id, name, dob").eq("parent_id", f.parent_id || "").limit(3),
          supabase.from("regulation_checkins").select("checked_in_at, state, reactivity").eq("family_id", f.id).gte("checked_in_at", since7).order("checked_in_at", { ascending: false }),
        ]);

        const logs = sleepLogs || [], msgs = messages || [], kids = children || [], regs = checkins || [];
        const todayLogs     = logs.filter(l => new Date(l.ts) > new Date(since24));
        const sessions      = logs.filter(l => l.type === "sleep_session" && l.end_ts);
        const nightWakes    = logs.filter(l => l.type === "night_waking");
        const nightWakesAvg = sessions.length > 0
          ? Math.round((nightWakes.length / Math.max(sessions.length, 1)) * 10) / 10 : 0;
        const overwhelmLevel = regs.length > 0
          ? Math.round(regs.reduce((s, r) => s + (r.reactivity || 5), 0) / regs.length) : 0;

        const recentNotes = logs.slice(0, 5).map(l => (l.notes || "").toLowerCase()).join(" ");
        const physiologicalFlag =
          recentNotes.includes("sick") || recentNotes.includes("ill") ? "sick" :
          recentNotes.includes("teeth") ? "teething" :
          recentNotes.includes("leap")  ? "leap" : null;
        const medicationLogged = recentNotes.includes("medic") || recentNotes.includes("tylenol") || recentNotes.includes("motrin");

        const recentWakes = nightWakes.filter(l => new Date(l.ts) > new Date(since48)).length;
        const olderWakes  = nightWakes.filter(l => new Date(l.ts) <= new Date(since48)).length;
        const sleepTrend  = recentWakes < olderWakes ? "improving" : recentWakes > olderWakes + 1 ? "worsening" : "neutral";
        const consecutiveBadNights = nightWakesAvg > 3 ? Math.min(Math.floor(nightWakesAvg), 6) : 0;

        const cd = {
          family: f, children: kids,
          sleepData: {
            napCountToday: todayLogs.filter(l => l.type === "sleep_session" && l.end_ts).length,
            totalSleepTodayH: (todayLogs.filter(l => l.type === "sleep_session").reduce((s, l) => s + (l.total_sleep_ms || 0), 0) / 3600000).toFixed(1),
            nightWakesAvg, weekSessions: sessions.length,
          },
          parentState: { overwhelmLevel, recentState: regs[0]?.state || null },
          lastLog: logs[0]?.ts || null,
          lastMessage: msgs[0]?.created_at || null,
          recentMessages: msgs.slice(0, 5),
          regulationCheckIns: regs.length,
          planStartDate: f.plan_start_date || null,
          sleepTrend, consecutiveBadNights, physiologicalFlag, medicationLogged,
        };

        return { ...cd, ...classifyFamily(cd) };
      }));

      results.sort((a, b) => {
        const w = (TIER_WEIGHT[b.tier] || 0) - (TIER_WEIGHT[a.tier] || 0);
        if (w !== 0) return w;
        return new Date(b.lastMessage || b.lastLog || "0") - new Date(a.lastMessage || a.lastLog || "0");
      });

      setClientData(results);
      setLoading(false);
    }

    loadAll();
  }, [families?.length]);

  return { clientData, loading };
}

// ─── PULSING DOT ──────────────────────────────────────────────────────────────
function PulseDot({ color, size = 6 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size + 4, height: size + 4, flexShrink: 0 }}>
      <span style={{ position: "absolute", width: size + 6, height: size + 6, borderRadius: "50%", background: color, opacity: 0, animation: "held-pulse 2s ease-in-out infinite" }} />
      <span style={{ width: size, height: size, borderRadius: "50%", background: color, display: "block", position: "relative", zIndex: 1 }} />
    </span>
  );
}

// ─── TIER BADGE ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const label = { urgent: "Urgent", watch: "Watch", predictive: "Milestone", intake: "Intake", stable: "Stable" }[tier] || "Stable";
  const t = TIERS[tier] || TIERS.stable;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 20, background: t.badgeBg, border: `0.5px solid ${t.border}`, fontSize: 10, fontWeight: 500, color: t.badge, fontFamily: font }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────
function SectionLabel({ children, action }) {
  const T = useT();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontFamily: font, fontSize: 10, fontWeight: 500, color: T.subText, textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {children}
      </span>
      {action && (
        <button onClick={action.onClick} style={{ background: "none", border: "none", fontFamily: font, fontSize: 11, fontWeight: 500, color: T.sage, cursor: "pointer", padding: 0 }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

// ─── CHIP ─────────────────────────────────────────────────────────────────────
function Chip({ tier, count, active, onClick }) {
  const t = TIERS[tier] || TIERS.stable;
  const label = { urgent: "Urgent", watch: "Watch", intake: "Intake", stable: "Stable", predictive: "Milestone" }[tier] || tier;
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20,
      background: t.badgeBg, border: `${active ? "1.5px" : "0.5px"} solid ${active ? t.dot : t.border}`,
      fontSize: 11, fontWeight: active ? 600 : 400, color: t.badge, fontFamily: font, cursor: "pointer", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot }} />
      {label} {count}
    </button>
  );
}

// ─── PRIORITY CARD ────────────────────────────────────────────────────────────
function PriorityCard({ cd, onAction }) {
  const T = useT();
  const [hovered, setHovered] = useState(false);
  const child  = cd.children?.[0];
  const t      = TIERS[cd.tier] || TIERS.stable;
  const planDay = cd.planStartDate
    ? `Plan day ${Math.max(1, Math.floor((Date.now() - new Date(cd.planStartDate)) / 86400000))}` : null;

  return (
    <div
      onClick={() => onAction(cd, cd.cta?.action)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? T.faint : T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", transition: "background 0.15s" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <TierBadge tier={cd.tier} />
        {planDay && <span style={{ fontFamily: font, fontSize: 11, color: T.subText }}>{planDay}</span>}
      </div>

      <div style={{ fontFamily: font, fontSize: 13, fontWeight: 500, color: T.headingText, marginBottom: 4 }}>
        {cd.family.display_name || cd.family.invite_email?.split("@")[0] || "Family"}
        {child?.dob && <span style={{ fontWeight: 400, color: T.muted }}> · {ageLabel(child.dob)}</span>}
      </div>

      {cd.liveSignal && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <PulseDot color={t.dot} size={5} />
          <span style={{ fontFamily: font, fontSize: 11, fontStyle: "italic", color: T.muted, lineHeight: 1.4 }}>{cd.liveSignal}</span>
        </div>
      )}

      <div style={{ fontFamily: font, fontSize: 12, color: T.text, lineHeight: 1.5, marginBottom: 7 }}>{cd.reasonString}</div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: font, fontSize: 11, color: T.subText }}>{cd.timeUrgency || ""}</span>
        <button
          onClick={e => { e.stopPropagation(); onAction(cd, cd.cta?.action); }}
          style={{ background: t.badgeBg, border: `0.5px solid ${t.border}`, borderRadius: 20, padding: "3px 10px", fontFamily: font, fontSize: 11, fontWeight: 500, color: t.badge, cursor: "pointer" }}
        >
          {cd.cta?.label || "View family →"}
        </button>
      </div>
    </div>
  );
}

// ─── ACTION ITEM ──────────────────────────────────────────────────────────────
function ActionItem({ icon, tileBg, text, meta, onClick, last }) {
  const T = useT();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: hovered ? T.faint : T.card, border: `0.5px solid ${T.border}`, marginBottom: last ? 0 : 8, cursor: "pointer", transition: "background 0.15s" }}
    >
      <div style={{ width: 28, height: 28, borderRadius: 7, background: tileBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: font, fontSize: 13, color: T.headingText, lineHeight: 1.4 }}>{text}</div>
        {meta && <div style={{ fontFamily: font, fontSize: 11, color: T.subText, marginTop: 1 }}>{meta}</div>}
      </div>
      <span style={{ fontSize: 14, color: T.muted, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ─── PATTERN CARD ─────────────────────────────────────────────────────────────
function PatternCard({ dot, count, text }) {
  const T = useT();
  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, display: "inline-block" }} />
        <span style={{ fontFamily: font, fontSize: 10, color: T.subText }}>{count} {count === 1 ? "family" : "families"}</span>
      </div>
      <div style={{ fontFamily: font, fontSize: 12, color: T.text, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

// ─── CASELOAD ROW ─────────────────────────────────────────────────────────────
function CaseloadRow({ cd, onClick, last }) {
  const T = useT();
  const [hovered, setHovered] = useState(false);
  const child    = cd.children?.[0];
  const initials = (cd.family.display_name || cd.family.invite_email || "?")[0].toUpperCase();
  const t        = TIERS[cd.tier] || TIERS.stable;
  const planDay  = cd.planStartDate
    ? `Plan day ${Math.max(1, Math.floor((Date.now() - new Date(cd.planStartDate)) / 86400000))}` : null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: hovered ? T.faint : T.card, border: `0.5px solid ${T.border}`, marginBottom: last ? 0 : 6, cursor: "pointer", transition: "background 0.15s" }}
    >
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: t.badgeBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: t.badge, flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: font, fontSize: 13, fontWeight: 500, color: T.headingText }}>
          {cd.family.display_name || cd.family.invite_email?.split("@")[0] || "Family"}
        </div>
        <div style={{ fontFamily: font, fontSize: 11, color: T.subText }}>
          {[child?.dob ? ageLabel(child.dob) : null, planDay].filter(Boolean).join(" · ") || "No plan yet"}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: font, fontSize: 11, color: T.muted }}>{cd.liveSignal?.split("—")[0]?.trim() || ""}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginTop: 2 }}>
          <span style={{ fontFamily: font, fontSize: 10, fontWeight: 500, color: t.badge }}>{cd.tier.charAt(0).toUpperCase() + cd.tier.slice(1)}</span>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.dot }} />
        </div>
      </div>
    </div>
  );
}

// ─── ACTIVITY ITEM ────────────────────────────────────────────────────────────
function ActivityItem({ dot, text, time, onClick, last }) {
  const T = useT();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: hovered ? T.faint : T.card, border: `0.5px solid ${T.border}`, marginBottom: last ? 0 : 6, cursor: onClick ? "pointer" : "default", transition: "background 0.15s" }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, marginTop: 4, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: font, fontSize: 12, color: T.text, lineHeight: 1.4 }}>{text}</div>
      </div>
      {time && <div style={{ fontFamily: font, fontSize: 11, color: T.subText, flexShrink: 0, whiteSpace: "nowrap" }}>{timeAgo(time)}</div>}
    </div>
  );
}

// ─── CONSULTANT HOME ──────────────────────────────────────────────────────────
export function ConsultantHome({ user }) {
  const T = useT();
  const { families, setActiveFamily, setTab, currentUser, setPendingSleepTab } = useApp();
  const { clientData, loading } = useClientData(families);
  const [selectedClient, setSelectedClient] = useState(null);
  const [caseloadFilter, setCaseloadFilter] = useState(null);

  function openClient(cd) { setActiveFamily(cd.family); setSelectedClient(cd); }

  function openTab(tab, sleepSubTab = null) {
    if (sleepSubTab) setPendingSleepTab(sleepSubTab);
    setTab(tab); setSelectedClient(null);
  }

  function handleAction(cd, action) {
    setActiveFamily(cd.family);
    if (action === "open_messages") { setTab("messages"); setSelectedClient(null); }
    else if (action === "open_intake") setSelectedClient({ ...cd, _openIntake: true });
    else setSelectedClient(cd);
  }

  if (selectedClient) return <FamilyGuidance clientData={selectedClient} onBack={() => setSelectedClient(null)} onOpenTab={openTab} />;

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px 0", fontFamily: font }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
      <div style={{ fontFamily: serif, fontSize: 15, color: T.muted }}>Loading your clients…</div>
    </div>
  );

  // ── Data slices ──
  const urgentClients     = clientData.filter(c => c.tier === "urgent");
  const watchClients      = clientData.filter(c => c.tier === "watch");
  const predictiveClients = clientData.filter(c => c.tier === "predictive");
  const intakeClients     = clientData.filter(c => c.tier === "intake");
  const stableClients     = clientData.filter(c => c.tier === "stable");
  const top3              = clientData.filter(c => c.tier !== "stable").slice(0, 3);
  const stabilizingCount  = stableClients.filter(c => c.sleepData.weekSessions >= 4).length;

  // Grounding line — direct, never patronizing
  const groundingLine =
    urgentClients.length >= 2                                  ? `${urgentClients.length} families need your attention today. Start with the clearest next step.` :
    urgentClients.length === 1 && watchClients.length >= 2    ? "A few families need closer attention today. Begin with the highest-friction case." :
    urgentClients.length === 1                                 ? "One family needs your attention today. The rest of your caseload looks steady." :
    watchClients.length >= 3                                   ? "Your caseload has a few active pressure points today. Start small and move clearly." :
    watchClients.length >= 1                                   ? `${watchClients.length} ${watchClients.length === 1 ? "family" : "families"} could use a gentle check-in. Things are otherwise steady.` :
                                                                 "Your caseload looks steady today.";

  // Suggested actions — verb-first, family-named, max 3
  const suggestedActions = [];
  urgentClients.forEach(c => {
    const n = firstName(c.family);
    if (c.trigger === "distress_language")
      suggestedActions.push({ icon: "💬", tileBg: TIERS.urgent.badgeBg,    text: `Respond to ${n}'s message`,    meta: `Received ${timeAgo(c.lastMessage) || "recently"} · distress language detected`, cd: c, action: "open_messages" });
    else if (c.trigger === "worsening_4nights")
      suggestedActions.push({ icon: "🌙", tileBg: TIERS.urgent.badgeBg,    text: `Draft message to ${n}'s family`, meta: `${c.consecutiveBadNights} rough nights — no recent outreach`, cd: c, action: "draft_urgent" });
    else
      suggestedActions.push({ icon: "🚨", tileBg: TIERS.urgent.badgeBg,    text: `Check in with ${n} today`,      meta: c.reasonString, cd: c, action: "open_family" });
  });
  predictiveClients.forEach(c =>
    suggestedActions.push({ icon: "🔔", tileBg: TIERS.predictive.badgeBg, text: `Send regression warning to ${firstName(c.family)}'s family`, meta: `Night 4 approaching · plan day ${c.planStartDate ? Math.floor((Date.now() - new Date(c.planStartDate)) / 86400000) : "?"}`, cd: c, action: "draft_regression" })
  );
  watchClients.forEach(c => {
    const n = firstName(c.family);
    if (c.trigger === "physiological_flag" || c.trigger === "medication_logged")
      suggestedActions.push({ icon: "🌿", tileBg: TIERS.stable.badgeBg,   text: `Send ${c.physiologicalFlag || "check-in"} message to ${n}'s family`, meta: `${c.physiologicalFlag || "Medicine"} logged recently`, cd: c, action: "draft_physio" });
    else
      suggestedActions.push({ icon: "⚠️", tileBg: TIERS.watch.badgeBg,    text: `Review ${n}'s recent patterns`, meta: c.reasonString, cd: c, action: "open_family" });
  });
  intakeClients.forEach(c =>
    suggestedActions.push({ icon: "📋", tileBg: TIERS.intake.badgeBg,     text: `Complete intake for ${firstName(c.family)}'s family`, meta: "Key fields missing — plan accuracy limited", cd: c, action: "open_intake" })
  );
  const actionsToShow = suggestedActions.slice(0, 3);

  // Pattern cards
  const patterns = [];
  const highOverwhelm = clientData.filter(c => c.parentState?.overwhelmLevel >= 7);
  if (highOverwhelm.length >= 2) patterns.push({ dot: TIERS.urgent.dot,  count: highOverwhelm.length, text: "Parent nervous systems are running high across these families today." });
  if (stabilizingCount >= 2)    patterns.push({ dot: TIERS.stable.dot,   count: stabilizingCount,     text: "Sleep is stabilizing for these families after recent routine changes." });
  const napTransition = clientData.filter(c => {
    const child = c.children?.[0];
    if (!child?.dob) return false;
    const mo = Math.floor((Date.now() - new Date(child.dob)) / (1000 * 60 * 60 * 24 * 30.44));
    return (mo >= 12 && mo <= 18) || (mo >= 36 && mo <= 42);
  });
  if (napTransition.length >= 1) patterns.push({ dot: TIERS.watch.dot,  count: napTransition.length, text: `${napTransition.length === 1 ? "One child may be" : "A couple of children may be"} entering a nap-transition season.` });
  const lowLogging = clientData.filter(c => !c.lastLog || hoursSince(c.lastLog) > 48);
  if (lowLogging.length >= 2)    patterns.push({ dot: TIERS.intake.dot,  count: lowLogging.length,    text: "A couple of families are showing lower logging consistency this week." });

  const filteredCaseload = caseloadFilter ? clientData.filter(c => c.tier === caseloadFilter) : clientData;

  const activityFeed = clientData
    .flatMap(c => [
      c.lastMessage && { time: c.lastMessage, dot: TIERS.urgent.dot,  text: `${firstName(c.family)} sent a message`,    action: () => { setActiveFamily(c.family); setTab("messages"); } },
      c.lastLog     && { time: c.lastLog,     dot: c.sleepTrend === "improving" ? TIERS.stable.dot : TIERS.intake.dot, text: `${firstName(c.family)} logged sleep data`, action: () => { setActiveFamily(c.family); setPendingSleepTab("dashboard"); setTab("sleep"); } },
    ].filter(Boolean))
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <div style={{ fontFamily: font }}>
      <style>{`@keyframes held-pulse { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(2.2);opacity:0} }`}</style>

      {/* ── TOP BAR ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: font, fontSize: 11, fontWeight: 500, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
            Rooted Connections Collective
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, color: T.headingText, lineHeight: 1.2, margin: 0 }}>
            Good {greeting}, {currentUser?.name?.split(" ")[0] || "there"}.
          </h1>
        </div>
        <button onClick={() => setTab("families")} style={{ padding: "7px 14px", borderRadius: 20, background: T.card, border: `0.5px solid ${T.border}`, fontFamily: font, fontSize: 13, color: T.sage, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
          + Invite Family
        </button>
      </div>

      {/* ── CONSULTANT WELLNESS — appears only when caseload is heavy or stress detected ── */}
      <ConsultantWellnessCard
        currentUser={currentUser}
        urgentCount={urgentClients.length}
        watchCount={watchClients.length}
        totalClients={clientData.length}
      />

      {/* ── 1. START HERE ── */}
      <SectionLabel>Start Here</SectionLabel>
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: "18px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.5, flex: 1 }}>{groundingLine}</div>
          {stabilizingCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: TIERS.stable.badgeBg, border: `0.5px solid ${TIERS.stable.border}`, flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: TIERS.stable.dot }} />
              <span style={{ fontFamily: font, fontSize: 11, fontWeight: 500, color: TIERS.stable.badge }}>{stabilizingCount} stabilizing</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
          {urgentClients.length > 0     && <Chip tier="urgent"     count={urgentClients.length}     active={caseloadFilter === "urgent"}     onClick={() => setCaseloadFilter(f => f === "urgent"     ? null : "urgent")} />}
          {watchClients.length > 0      && <Chip tier="watch"      count={watchClients.length}      active={caseloadFilter === "watch"}      onClick={() => setCaseloadFilter(f => f === "watch"      ? null : "watch")} />}
          {predictiveClients.length > 0 && <Chip tier="predictive" count={predictiveClients.length} active={caseloadFilter === "predictive"} onClick={() => setCaseloadFilter(f => f === "predictive" ? null : "predictive")} />}
          {intakeClients.length > 0     && <Chip tier="intake"     count={intakeClients.length}     active={caseloadFilter === "intake"}     onClick={() => setCaseloadFilter(f => f === "intake"     ? null : "intake")} />}
          {stableClients.length > 0     && <Chip tier="stable"     count={stableClients.length}     active={caseloadFilter === "stable"}     onClick={() => setCaseloadFilter(f => f === "stable"     ? null : "stable")} />}
        </div>

        {top3.length > 0
          ? top3.map(cd => <PriorityCard key={cd.family.id} cd={cd} onAction={handleAction} />)
          : <div style={{ textAlign: "center", padding: "20px 0", color: T.muted, fontSize: 13 }}>{clientData.length === 0 ? "No families assigned yet. Invite your first family to get started." : "Your full caseload is stable — no immediate action needed."}</div>
        }
      </div>

      {/* ── 2. SUGGESTED NEXT ACTIONS ── */}
      {actionsToShow.length > 0 && (<>
        <SectionLabel>Suggested Next Actions</SectionLabel>
        <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
          {actionsToShow.map((a, i) => <ActionItem key={i} icon={a.icon} tileBg={a.tileBg} text={a.text} meta={a.meta} last={i === actionsToShow.length - 1} onClick={() => handleAction(a.cd, a.action)} />)}
        </div>
      </>)}

      {/* ── 3. PATTERNS ACROSS FAMILIES ── */}
      {patterns.length > 0 && (<>
        <SectionLabel action={{ label: "View all ›", onClick: () => setTab("families") }}>Patterns Across Families</SectionLabel>
        <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
            {patterns.slice(0, 4).map((p, i) => <PatternCard key={i} dot={p.dot} count={p.count} text={p.text} />)}
          </div>
        </div>
      </>)}

      {/* ── 4. CASELOAD SNAPSHOT ── */}
      {clientData.length > 0 && (<>
        <SectionLabel action={{ label: "All families ›", onClick: () => setTab("families") }}>
          Caseload Snapshot ({filteredCaseload.length}{caseloadFilter ? ` · ${caseloadFilter}` : ""})
        </SectionLabel>
        <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
            {[urgentClients.length > 0 && { tier: "urgent", count: urgentClients.length }, watchClients.length > 0 && { tier: "watch", count: watchClients.length }, stableClients.length > 0 && { tier: "stable", count: stableClients.length }]
              .filter(Boolean).map(chip => <Chip key={chip.tier} tier={chip.tier} count={chip.count} active={caseloadFilter === chip.tier} onClick={() => setCaseloadFilter(f => f === chip.tier ? null : chip.tier)} />)}
          </div>
          {filteredCaseload.map((cd, i) => <CaseloadRow key={cd.family.id} cd={cd} last={i === filteredCaseload.length - 1} onClick={() => openClient(cd)} />)}
        </div>
      </>)}

      {/* ── 5. RECENT ACTIVITY ── */}
      {activityFeed.length > 0 && (<>
        <SectionLabel action={{ label: "View all ›", onClick: () => setTab("families") }}>Recent Activity</SectionLabel>
        <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
          {activityFeed.map((item, i) => <ActivityItem key={i} dot={item.dot} text={item.text} time={item.time} last={i === activityFeed.length - 1} onClick={item.action} />)}
        </div>
      </>)}
    </div>
  );
}
