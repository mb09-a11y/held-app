import { useState, useEffect, useCallback } from "react";
import { useT, useApp, Card, font, serif, Btn } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { IntakeViewer } from "../../modules/intake/IntakeViewer.jsx";
import { NotificationSettings } from "../shared/NotificationSettings.jsx";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ageLabel(dob) {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44));
  return months < 24 ? `${months}mo` : `${Math.floor(months / 12)}y`;
}

function timeAgo(iso) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── PRIORITY SCORING ─────────────────────────────────────────────────────────
function getPriority(clientData) {
  let score = 0;
  const signals = [];

  // No logs in 24h
  if (!clientData.lastLog || Date.now() - new Date(clientData.lastLog) > 86400000) {
    score += 2; signals.push("No logs in 24h");
  }
  // High night wakes
  if (clientData.nightWakesAvg > 3) {
    score += 3; signals.push(`Avg ${clientData.nightWakesAvg} night wakings`);
  }
  // High parent overwhelm
  if (clientData.overwhelmLevel >= 7) {
    score += 3; signals.push("High parent overwhelm");
  }
  // No message in 48h (if has messages)
  if (clientData.lastMessage && Date.now() - new Date(clientData.lastMessage) > 172800000) {
    score += 1; signals.push("No message in 2 days");
  }
  // Intake not complete
  if (!clientData.intakeComplete) {
    score += 1; signals.push("Intake not completed");
  }
  // No regulation check-ins
  if (clientData.regulationCheckIns === 0) {
    score += 1; signals.push("No regulation check-ins");
  }

  const level = score >= 5 ? "urgent" : score >= 2 ? "watch" : "stable";
  const icon = level === "urgent" ? "🚨" : level === "watch" ? "⚠️" : "✅";
  return { score, level, icon, signals: signals.slice(0, 3) };
}

// ─── CLIENT DATA HOOK ─────────────────────────────────────────────────────────
function useClientData(families) {
  const [clientData, setClientData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!families || families.length === 0) { setLoading(false); return; }

    async function loadAll() {
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const since24 = new Date(Date.now() - 86400000).toISOString();

      const results = await Promise.all(families.map(async (f) => {
        const [
          { data: sleepLogs },
          { data: messages },
          { data: children },
          { data: checkins },
        ] = await Promise.all([
          supabase.from("sleep_logs").select("ts, type, end_ts, total_sleep_ms").eq("family_id", f.id).gte("ts", since7).order("ts", { ascending: false }),
          supabase.from("messages").select("created_at, content, sender_id").eq("family_id", f.id).order("created_at", { ascending: false }).limit(5),
          supabase.from("children").select("id, name, dob").eq("parent_id", f.parent_id || "").limit(3),
          supabase.from("regulation_checkins").select("checked_in_at, state, reactivity").eq("family_id", f.id).gte("checked_in_at", since7).order("checked_in_at", { ascending: false }),
        ]);

        const logs = sleepLogs || [];
        const msgs = messages || [];
        const kids = children || [];
        const regs = checkins || [];

        const todayLogs = logs.filter(l => new Date(l.ts) > new Date(since24));
        const sessions = logs.filter(l => l.type === "sleep_session" && l.end_ts);
        const nightWakes = logs.filter(l => l.type === "night_waking");
        const nightWakesAvg = sessions.length > 0 ? Math.round((nightWakes.length / Math.max(sessions.length, 1)) * 10) / 10 : 0;
        const overwhelmLevel = regs.length > 0
          ? Math.round(regs.reduce((s, r) => s + (r.reactivity || 5), 0) / regs.length)
          : 0;

        const priority = getPriority({
          lastLog: logs[0]?.ts || null,
          lastMessage: msgs[0]?.created_at || null,
          nightWakesAvg,
          overwhelmLevel,
          intakeComplete: f.intake_complete,
          regulationCheckIns: regs.length,
        });

        return {
          family: f,
          children: kids,
          priority,
          sleepData: {
            napCountToday: todayLogs.filter(l => l.type === "sleep_session" && l.end_ts).length,
            totalSleepTodayH: (todayLogs.filter(l => l.type === "sleep_session").reduce((s, l) => s + (l.total_sleep_ms || 0), 0) / 3600000).toFixed(1),
            nightWakesAvg,
            weekSessions: sessions.length,
          },
          parentState: { overwhelmLevel, recentState: regs[0]?.state || null },
          lastLog: logs[0]?.ts || null,
          lastMessage: msgs[0]?.created_at || null,
          recentMessages: msgs.slice(0, 3),
          regulationCheckIns: regs.length,
        };
      }));

      setClientData(results.sort((a, b) => b.priority.score - a.priority.score));
      setLoading(false);
    }

    loadAll();
  }, [families?.length]);

  return { clientData, loading };
}

// ─── AI INSIGHT FOR CLIENT ────────────────────────────────────────────────────
function useClientInsight(clientData, family) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!clientData || window.location.hostname === "localhost") return;
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          system: `You are an RCC sleep consultant assistant. Generate a brief clinical insight for a consultant reviewing a family. Respond ONLY with valid JSON: { "summary": "2 sentences max", "likely_cause": "1 sentence", "adjustments": ["specific action 1", "specific action 2", "specific action 3"] }. No markdown.`,
          messages: [{
            role: "user",
            content: `Family: ${family.display_name || family.invite_email}
Child age: ${clientData.children[0] ? ageLabel(clientData.children[0].dob) : "unknown"}
Sleep this week: ${clientData.sleepData.weekSessions} sessions, avg ${clientData.sleepData.nightWakesAvg} night wakings
Today: ${clientData.sleepData.napCountToday} naps, ${clientData.sleepData.totalSleepTodayH}h sleep
Parent overwhelm: ${clientData.parentState.overwhelmLevel}/10
Last NS state: ${clientData.parentState.recentState || "unknown"}
Priority level: ${clientData.priority.level}
Signals: ${clientData.priority.signals.join(", ")}
Intake complete: ${family.intake_complete}`
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find(c => c.type === "text")?.text || "{}";
      setInsight(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch { setInsight(null); }
    finally { setLoading(false); }
  }, [clientData, family]);

  return { insight, loading, generate };
}

// ─── PRIORITY BADGE ───────────────────────────────────────────────────────────
function PriorityBadge({ level, T }) {
  const colors = {
    urgent: { bg: "#C0707015", border: "#C0707040", text: "#C07070" },
    watch: { bg: "#A89B5A15", border: "#A89B5A40", text: "#A89B5A" },
    stable: { bg: "#7BAA8A15", border: "#7BAA8A40", text: "#7BAA8A" },
  };
  const c = colors[level] || colors.stable;
  const label = level === "urgent" ? "🚨 Urgent" : level === "watch" ? "⚠️ Watch" : "✅ Stable";
  return (
    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: font, padding: "3px 9px", borderRadius: 20, background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label}
    </span>
  );
}

// ─── FAMILY DEEP DIVE ─────────────────────────────────────────────────────────
function FamilyDeepDive({ clientData, onBack, onOpenTab, onOpenSleepTab }) {
  const T = useT();
  const { family, children, priority, sleepData, parentState, recentMessages, lastLog, lastMessage } = clientData;
  const [viewingIntake, setViewingIntake] = useState(false);
  const { insight, loading: insightLoading, generate } = useClientInsight(clientData, family);

  useEffect(() => { generate(); }, []);

  if (viewingIntake) {
    return <IntakeViewer family={family} onBack={() => setViewingIntake(false)} />;
  }

  const child = children[0];

  return (
    <div>
      {/* Back */}
      <button onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer", marginBottom: 20, padding: 0 }}>
        ← Back to Dashboard
      </button>

      {/* ── 1. FAMILY SUMMARY ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: T.teal, flexShrink: 0 }}>
          {(family.display_name || family.invite_email || "?")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: serif, fontSize: 20, color: T.headingText, margin: "0 0 4px" }}>
            {family.display_name || family.invite_email || "Unnamed family"}
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <PriorityBadge level={priority.level} T={T} />
            {child && <span style={{ fontFamily: font, fontSize: 11.5, color: T.muted }}>🧒 {child.name}{child.dob ? ` · ${ageLabel(child.dob)}` : ""}</span>}
            {lastLog && <span style={{ fontFamily: font, fontSize: 11.5, color: T.muted }}>Last log: {timeAgo(lastLog)}</span>}
          </div>
        </div>
      </div>

      {/* Priority signals */}
      {priority.signals.length > 0 && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: priority.level === "urgent" ? "#C0707010" : priority.level === "watch" ? "#A89B5A10" : "#7BAA8A10", border: `1px solid ${priority.level === "urgent" ? "#C0707030" : priority.level === "watch" ? "#A89B5A30" : "#7BAA8A30"}`, marginBottom: 16 }}>
          {priority.signals.map((s, i) => (
            <div key={i} style={{ fontFamily: font, fontSize: 12.5, color: T.text, marginBottom: i < priority.signals.length - 1 ? 4 : 0 }}>• {s}</div>
          ))}
        </div>
      )}

      {/* ── 2. AI INSIGHT ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font }}>✦ AI Insight</div>
          <button onClick={generate} disabled={insightLoading}
            style={{ background: "none", border: "none", fontFamily: font, fontSize: 11.5, color: T.teal, cursor: "pointer" }}>
            {insightLoading ? "Reading…" : "↻ Refresh"}
          </button>
        </div>
        {insightLoading ? (
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>Analyzing family data…</div>
        ) : insight ? (
          <>
            <p style={{ fontFamily: font, fontSize: 14, color: T.text, lineHeight: 1.65, marginBottom: 8, fontWeight: 600 }}>{insight.summary}</p>
            <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, fontStyle: "italic", marginBottom: 12 }}>{insight.likely_cause}</p>
            {insight.adjustments?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>Suggested Adjustments</div>
                {insight.adjustments.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.teal, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <p style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.6, margin: 0 }}>{a}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ fontFamily: font, fontSize: 13, color: T.muted }}>
            {window.location.hostname === "localhost" ? "AI insights available in production." : "Not enough data yet to generate insight."}
          </p>
        )}
      </div>

      {/* ── 3. COMBINED DATA VIEW ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 12 }}>📊 This Week at a Glance</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Sessions", value: sleepData.weekSessions, icon: "🌙" },
            { label: "Naps today", value: sleepData.napCountToday, icon: "💤" },
            { label: "Night wakes", value: `${sleepData.nightWakesAvg} avg`, icon: "🌛" },
            { label: "NS state", value: parentState.recentState || "—", icon: "🌿" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 10, background: T.faint }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: T.headingText }}>{s.value}</div>
              <div style={{ fontFamily: font, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>{s.label}</div>
            </div>
          ))}
        </div>
        {parentState.overwhelmLevel > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: parentState.overwhelmLevel >= 7 ? "#C0707010" : "#A89B5A10" }}>
            <span style={{ fontSize: 16 }}>🌊</span>
            <div>
              <div style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: T.text }}>Parent overwhelm: {parentState.overwhelmLevel}/10</div>
              <div style={{ fontFamily: font, fontSize: 11, color: T.muted }}>
                {parentState.overwhelmLevel >= 7 ? "High — consider reaching out today" : parentState.overwhelmLevel >= 4 ? "Moderate — check in this week" : "Low — steady"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. QUICK ACTIONS ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {family.intake_complete && (
          <Card onClick={() => setViewingIntake(true)} style={{ background: `${T.teal}10`, border: `1px solid ${T.teal}30`, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 22 }}>📋</span>
              <div>
                <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.teal }}>Review Intake</div>
                <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>View responses, notes & AI insights</div>
              </div>
              <span style={{ marginLeft: "auto", color: T.teal }}>→</span>
            </div>
          </Card>
        )}
        {[
          { icon: "💬", label: "Messages", sub: lastMessage ? `Last message ${timeAgo(lastMessage)}` : "Start a conversation", onClick: () => onOpenTab("messages") },
          { icon: "🌙", label: "Sleep Log", sub: lastLog ? `Last log ${timeAgo(lastLog)}` : "No logs yet", onClick: () => onOpenTab("sleep", "dashboard") },
          { icon: "🌿", label: "Regulation", sub: `${clientData.regulationCheckIns} check-ins this week`, onClick: () => onOpenTab("regulation") },
        ].map(item => (
          <Card key={item.icon} onClick={item.onClick} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{item.label}</div>
                <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{item.sub}</div>
              </div>
              <span style={{ marginLeft: "auto", color: T.muted }}>→</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── CONSULTANT HOME (MAIN DASHBOARD) ─────────────────────────────────────────
export function ConsultantHome({ user }) {
  const T = useT();
  const { families, setActiveFamily, setTab, currentUser, setPendingSleepTab } = useApp();
  const { clientData, loading } = useClientData(families);
  const [selectedClient, setSelectedClient] = useState(null);

  function openClient(cd) {
    setActiveFamily(cd.family);
    setSelectedClient(cd);
  }

  function openTab(tab, sleepSubTab = null) {
    if (sleepSubTab) setPendingSleepTab(sleepSubTab);
    setTab(tab);
    setSelectedClient(null);
  }

  // ── DEEP DIVE VIEW ──
  if (selectedClient) {
    return (
      <FamilyDeepDive
        clientData={selectedClient}
        onBack={() => setSelectedClient(null)}
        onOpenTab={openTab}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: T.muted, fontFamily: font }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
        <div style={{ fontFamily: serif, fontSize: 15 }}>Loading your clients…</div>
      </div>
    );
  }

  const urgent = clientData.filter(c => c.priority.level === "urgent");
  const watch = clientData.filter(c => c.priority.level === "watch");
  const stable = clientData.filter(c => c.priority.level === "stable");
  const needsAttention = [...urgent, ...watch].slice(0, 5);

  // Pattern highlights across all clients
  const patterns = [];
  const napTransition = clientData.filter(c => {
    const child = c.children[0];
    if (!child?.dob) return false;
    const months = Math.floor((Date.now() - new Date(child.dob)) / (1000 * 60 * 60 * 24 * 30.44));
    return (months >= 12 && months <= 18) || (months >= 36 && months <= 42);
  });
  if (napTransition.length > 0) patterns.push(`${napTransition.length} client${napTransition.length > 1 ? "s" : ""} in a typical nap transition window`);

  const highOverwhelm = clientData.filter(c => c.parentState.overwhelmLevel >= 7);
  if (highOverwhelm.length > 0) patterns.push(`${highOverwhelm.length} ${highOverwhelm.length > 1 ? "families" : "family"} showing high parent overwhelm`);

  const goodProgress = clientData.filter(c => c.priority.level === "stable" && c.sleepData.weekSessions >= 5);
  if (goodProgress.length > 0) patterns.push(`${goodProgress.length} ${goodProgress.length > 1 ? "families" : "family"} making strong consistent progress`);

  const noLogs = clientData.filter(c => !c.lastLog || Date.now() - new Date(c.lastLog) > 172800000);
  if (noLogs.length > 0) patterns.push(`${noLogs.length} ${noLogs.length > 1 ? "families" : "family"} haven't logged in 48+ hours`);

  // Recent activity feed
  const activityFeed = clientData
    .flatMap(c => [
      c.lastMessage && { time: c.lastMessage, text: `${c.family.display_name || c.family.invite_email?.split("@")[0]} sent a message`, icon: "💬", action: () => { setActiveFamily(c.family); setTab("messages"); setSelectedClient(null); } },
      c.lastLog && { time: c.lastLog, text: `${c.family.display_name || c.family.invite_email?.split("@")[0]} logged sleep data`, icon: "🌙", action: () => { setActiveFamily(c.family); setPendingSleepTab("dashboard"); setTab("sleep"); setSelectedClient(null); } },
    ].filter(Boolean))
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5);

  // Suggested actions
  const suggestedActions = [
    ...urgent.map(c => ({ text: `Check in with ${c.family.display_name || c.family.invite_email?.split("@")[0]} today`, icon: "🚨", client: c })),
    ...watch.map(c => ({ text: `Review ${c.family.display_name || c.family.invite_email?.split("@")[0]}'s recent patterns`, icon: "⚠️", client: c, sleepTab: "history" })),
    ...clientData.filter(c => !c.family.intake_complete).map(c => ({ text: `Follow up on ${c.family.display_name || c.family.invite_email?.split("@")[0]}'s intake`, icon: "📋", client: c })),
  ].slice(0, 5);

  // Consultant state / cognitive load
  const cognitiveLoad = urgent.length >= 2 ? "high" : urgent.length >= 1 || watch.length >= 3 ? "moderate" : "low";
  const loadMessage = cognitiveLoad === "high"
    ? `You have ${urgent.length} urgent client${urgent.length > 1 ? "s" : ""} today. Before diving in, take a breath.`
    : cognitiveLoad === "moderate"
    ? `A few families need your attention. You've got this.`
    : `Things look relatively steady across your caseload today.`;
  const groundingTip = cognitiveLoad === "high"
    ? "Try the 4-6 breathing exercise before your first client response."
    : "A quick body scan before you start can help you show up regulated.";

  return (
    <div>
      {/* ── 1. CONSULTANT STATE ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: T.subText, marginBottom: 4, fontFamily: font }}>
          Rooted Connections Collective
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 26, color: T.headingText, lineHeight: 1.2, marginBottom: 12 }}>
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
          {currentUser?.name?.split(" ")[0] || "there"}.
        </h1>
      </div>

      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: cognitiveLoad === "high" ? "#C0707008" : T.card, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65, marginBottom: 8 }}>
          {loadMessage}
        </div>
        <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.6, fontStyle: "italic" }}>
          🌿 {groundingTip}
        </div>
      </div>

      {/* ── 2. NEEDS ATTENTION ── */}
      {needsAttention.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
            Needs Attention
          </div>
          {needsAttention.map((cd, i) => {
            const child = cd.children[0];
            return (
              <div key={cd.family.id}
                onClick={() => openClient(cd)}
                style={{ borderRadius: 12, border: `1px solid ${cd.priority.level === "urgent" ? "#C0707040" : "#A89B5A40"}`, background: cd.priority.level === "urgent" ? "#C0707008" : "#A89B5A08", padding: "14px 16px", marginBottom: 10, cursor: "pointer", transition: "opacity .2s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: T.headingText, marginBottom: 2 }}>
                      {cd.priority.icon} {cd.family.display_name || cd.family.invite_email?.split("@")[0]}
                      {child ? <span style={{ fontWeight: 400, color: T.muted }}> · {ageLabel(child.dob)}</span> : null}
                    </div>
                    {cd.priority.signals.map((s, j) => (
                      <div key={j} style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 2 }}>• {s}</div>
                    ))}
                  </div>
                  <span style={{ fontFamily: font, fontSize: 12, color: T.teal, fontWeight: 600, whiteSpace: "nowrap", marginLeft: 10 }}>View →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. PATTERN HIGHLIGHTS ── */}
      {patterns.length > 0 && (
        <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
            ✦ Patterns Across Families
          </div>
          {patterns.slice(0, 4).map((p, i) => (
            <div key={i} style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: i < patterns.length - 1 ? 8 : 0, display: "flex", gap: 8 }}>
              <span style={{ color: T.teal, flexShrink: 0 }}>→</span>
              {p}
            </div>
          ))}
        </div>
      )}

      {/* ── 4. CLIENT SNAPSHOT STRIP ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font }}>
            All Clients ({clientData.length})
          </div>
          <button onClick={() => setTab("families")}
            style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.teal, cursor: "pointer" }}>
            View all →
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {clientData.map(cd => (
            <button key={cd.family.id} onClick={() => openClient(cd)}
              style={{ flexShrink: 0, padding: "10px 14px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.card, cursor: "pointer", textAlign: "center", minWidth: 80 }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{cd.priority.icon}</div>
              <div style={{ fontFamily: font, fontSize: 11.5, fontWeight: 600, color: T.text, whiteSpace: "nowrap" }}>
                {(cd.family.display_name || cd.family.invite_email || "?").split(" ")[0].split("@")[0]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 5. SUGGESTED ACTIONS ── */}
      {suggestedActions.length > 0 && (
        <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
            🎯 Suggested Actions
          </div>
          {suggestedActions.map((action, i) => (
            <button key={i} onClick={() => action.client && (action.sleepTab ? (setActiveFamily(action.client.family), setPendingSleepTab(action.sleepTab), setTab("sleep"), setSelectedClient(null)) : openClient(action.client))}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 0", background: "none", border: "none", borderBottom: i < suggestedActions.length - 1 ? `1px solid ${T.border}` : "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{action.icon}</span>
              <span style={{ fontFamily: font, fontSize: 13, color: T.text, flex: 1 }}>{action.text}</span>
              <span style={{ color: T.muted, fontSize: 14 }}>→</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 6. RECENT ACTIVITY ── */}
      {activityFeed.length > 0 && (
        <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
            Recent Activity
          </div>
          {activityFeed.map((item, i) => (
            <button key={i} onClick={() => item.action ? item.action() : item.client && openClient(item.client)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 0", background: "none", border: "none", borderBottom: i < activityFeed.length - 1 ? `1px solid ${T.border}` : "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontFamily: font, fontSize: 13, color: T.text, flex: 1 }}>{item.text}</span>
              <span style={{ fontFamily: font, fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>{timeAgo(item.time)}</span>
            </button>
          ))}
        </div>
      )}

      {families.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontFamily: font, fontSize: 13 }}>
          No families assigned yet. Invite your first family to get started.
        </div>
      )}
    </div>
  );
}
