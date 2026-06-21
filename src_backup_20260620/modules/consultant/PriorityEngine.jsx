// ─── RCC Priority Engine ──────────────────────────────────────────────────────
// Standalone module. Lives at the top of the consultant home screen.
// Tells the consultant: who needs attention today, why, and what to do.
//
// Props:
//   clientData  — array from useClientData hook
//   onOpenClient — fn(clientData) — navigates to a client's deep dive

import { useState, useCallback } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { callAI } from "../../lib/ai.js";

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const PRIORITY_ENGINE_PROMPT = `You are the RCC Priority Engine.
Your job is to review all active clients and determine:
1. Who needs attention today
2. Why they need attention
3. What the consultant should do next

Use RCC principles:
- clear, grounded, observational
- no over-explaining
- no generic advice
- focus on decision-making and action

PRIORITY RULES:
HIGH:
- no logs in 48+ hours AND no recent communication
- intake incomplete + no engagement
- parent distress signals escalating
- major sleep disruption pattern

MEDIUM:
- pattern forming across 1–3 days
- parent starting to struggle or second-guess
- inconsistent logs or partial engagement

LOW:
- stable patterns
- no action needed today

ACTION TYPES:
- "engagement" → re-engage client
- "coaching" → respond with guidance
- "monitor" → no immediate action

Return ONLY valid JSON:
{
  "priority_clients": [
    {
      "client_name": "",
      "priority_level": "high | medium | low",
      "reason": "",
      "context": "",
      "recommended_action": "",
      "action_type": "engagement | coaching | monitor"
    }
  ]
}

Keep language short and useful. No fluff. No teaching. No emotional overreach.
Return JSON only. No markdown.`;

// ─── BUILD CLIENT SUMMARIES ───────────────────────────────────────────────────
function buildClientSummaries(clientData) {
  return clientData.map(cd => {
    const child = cd.children?.[0];
    const name = cd.family?.display_name || cd.family?.invite_email?.split("@")[0] || "Unknown";
    const childAge = child?.dob
      ? (() => {
          const months = Math.floor((Date.now() - new Date(child.dob)) / (1000 * 60 * 60 * 24 * 30.44));
          return months < 24 ? `${months}mo` : `${Math.floor(months / 12)}y`;
        })()
      : "age unknown";

    const hoursLastLog = cd.lastLog
      ? Math.round((Date.now() - new Date(cd.lastLog)) / 3600000)
      : null;
    const hoursLastMessage = cd.lastMessage
      ? Math.round((Date.now() - new Date(cd.lastMessage)) / 3600000)
      : null;

    const recentMsg = cd.recentMessages?.[0]?.content?.slice(0, 100) || null;

    return [
      `CLIENT: ${name} (${childAge})`,
      `Intake: ${cd.family?.intake_complete ? "complete" : "NOT complete"}`,
      `Sleep sessions this week: ${cd.sleepData?.weekSessions ?? 0}`,
      `Avg night wakings: ${cd.sleepData?.nightWakesAvg ?? 0}`,
      `Naps today: ${cd.sleepData?.napCountToday ?? 0}`,
      `Last log: ${hoursLastLog !== null ? `${hoursLastLog}h ago` : "never"}`,
      `Last message: ${hoursLastMessage !== null ? `${hoursLastMessage}h ago` : "never"}`,
      `Parent overwhelm: ${cd.parentState?.overwhelmLevel ?? 0}/10`,
      `Last NS state: ${cd.parentState?.recentState || "none"}`,
      `Regulation check-ins this week: ${cd.regulationCheckIns ?? 0}`,
      `Priority signals: ${cd.priority?.signals?.join(", ") || "none"}`,
      recentMsg ? `Recent parent message: "${recentMsg}"` : null,
    ].filter(Boolean).join("\n");
  }).join("\n\n---\n\n");
}

// ─── ACTION TYPE CONFIG ───────────────────────────────────────────────────────
const ACTION_CONFIG = {
  engagement: { color: "#A87B8A", bg: "#A87B8A12", border: "#A87B8A30", label: "Re-engage" },
  coaching:   { color: "#7B9EA8", bg: "#7B9EA812", border: "#7B9EA830", label: "Send guidance" },
  monitor:    { color: "#7BAA8A", bg: "#7BAA8A12", border: "#7BAA8A30", label: "Monitor" },
};

const LEVEL_CONFIG = {
  high:   { dot: "#C07070", label: "High" },
  medium: { dot: "#A89B5A", label: "Medium" },
  low:    { dot: "#7BAA8A", label: "Low" },
};

// ─── PRIORITY CLIENT ROW ──────────────────────────────────────────────────────
function PriorityRow({ client, onOpen, T }) {
  const action = ACTION_CONFIG[client.action_type] || ACTION_CONFIG.monitor;
  const level = LEVEL_CONFIG[client.priority_level] || LEVEL_CONFIG.low;

  return (
    <div
      onClick={onOpen}
      style={{
        borderRadius: 12,
        border: `1px solid ${T.border}`,
        background: T.card,
        padding: "13px 15px",
        marginBottom: 8,
        cursor: onOpen ? "pointer" : "default",
        transition: "all .15s",
      }}
      onMouseEnter={e => { if (onOpen) e.currentTarget.style.background = T.faint; }}
      onMouseLeave={e => { if (onOpen) e.currentTarget.style.background = T.card; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + priority dot */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: level.dot, flexShrink: 0 }} />
            <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: T.headingText }}>
              {client.client_name}
            </div>
            <div style={{ fontFamily: font, fontSize: 11, color: T.muted }}>· {level.label}</div>
          </div>

          {/* Reason */}
          <div style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.5, marginBottom: 4 }}>
            {client.reason}
          </div>

          {/* Context */}
          {client.context && (
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.5, fontStyle: "italic" }}>
              {client.context}
            </div>
          )}
        </div>

        {/* Action badge */}
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div style={{
            display: "inline-block",
            padding: "4px 10px", borderRadius: 20,
            background: action.bg, border: `1px solid ${action.border}`,
            fontFamily: font, fontSize: 11, fontWeight: 700, color: action.color,
            whiteSpace: "nowrap",
          }}>
            {action.label}
          </div>
          {client.recommended_action && (
            <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 4, maxWidth: 130, textAlign: "right", lineHeight: 1.4 }}>
              {client.recommended_action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function PriorityEngine({ clientData, onOpenClient }) {
  const T = useT();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRun, setLastRun] = useState(null);

  const run = useCallback(async () => {
    if (!clientData?.length) return;
    setLoading(true);
    setError(null);
    try {
      const summaries = buildClientSummaries(clientData);
      const text = await callAI({
        system: PRIORITY_ENGINE_PROMPT,
        max_tokens: 1000,
        messages: [{ role: "user", content: `Review these ${clientData.length} clients and prioritize them:\n\n${summaries}` }],
      });
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResult(parsed);
      setLastRun(new Date());
    } catch (e) {
      setError("Couldn't run priority scan right now.");
    } finally {
      setLoading(false);
    }
  }, [clientData]);

  // Find matching clientData record by name for navigation
  function findClient(name) {
    if (!onOpenClient) return null;
    return clientData.find(cd => {
      const clientName = cd.family?.display_name || cd.family?.invite_email?.split("@")[0] || "";
      return clientName.toLowerCase().includes(name.toLowerCase()) ||
             name.toLowerCase().includes(clientName.toLowerCase());
    });
  }

  const highClients = result?.priority_clients?.filter(c => c.priority_level === "high") || [];
  const mediumClients = result?.priority_clients?.filter(c => c.priority_level === "medium") || [];
  const lowCount = result?.priority_clients?.filter(c => c.priority_level === "low").length || 0;

  return (
    <div style={{ marginBottom: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 3 }}>
            ✦ Priority Engine
          </div>
          {lastRun && (
            <div style={{ fontFamily: font, fontSize: 11, color: T.subText }}>
              Last run: {lastRun.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
        <button
          onClick={run}
          disabled={loading || !clientData?.length}
          style={{
            padding: "7px 14px", borderRadius: 10,
            border: `1px solid ${T.teal}40`,
            background: loading ? T.faint : `${T.teal}15`,
            color: loading ? T.muted : T.teal,
            fontFamily: font, fontSize: 12, fontWeight: 700,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Scanning…" : result ? "↻ Re-scan" : "Scan clients →"}
        </button>
      </div>

      {/* Empty state */}
      {!result && !loading && !error && (
        <div style={{ padding: "16px 0", textAlign: "center" }}>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
            Run a priority scan to see who needs your attention today.
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: "16px 0", textAlign: "center" }}>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>Reviewing {clientData?.length} clients…</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: "11px 14px", borderRadius: 10, background: "rgba(192,112,112,0.08)", border: "1px solid rgba(192,112,112,0.2)", marginBottom: 8 }}>
          <div style={{ fontFamily: font, fontSize: 13, color: "#C07070" }}>{error}</div>
          <button onClick={run} style={{ marginTop: 6, background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.teal, cursor: "pointer" }}>Try again →</button>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div>
          {/* High */}
          {highClients.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: "#C07070", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
                🚨 Needs attention today ({highClients.length})
              </div>
              {highClients.map((c, i) => (
                <PriorityRow
                  key={i}
                  client={c}
                  T={T}
                  onOpen={() => { const cd = findClient(c.client_name); if (cd) onOpenClient(cd); }}
                />
              ))}
            </div>
          )}

          {/* Medium */}
          {mediumClients.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: "#A89B5A", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
                ⚠️ Worth checking in ({mediumClients.length})
              </div>
              {mediumClients.map((c, i) => (
                <PriorityRow
                  key={i}
                  client={c}
                  T={T}
                  onOpen={() => { const cd = findClient(c.client_name); if (cd) onOpenClient(cd); }}
                />
              ))}
            </div>
          )}

          {/* Low — just a count, no need to list */}
          {lowCount > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#7BAA8A10", border: "1px solid #7BAA8A25" }}>
              <div style={{ fontFamily: font, fontSize: 12.5, color: "#7BAA8A", fontWeight: 600 }}>
                ✅ {lowCount} {lowCount === 1 ? "client is" : "clients are"} stable — no action needed today
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
