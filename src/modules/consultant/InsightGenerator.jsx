// ─── RCC Insight Generator ────────────────────────────────────────────────────
// Standalone module. Drop into any consultant view.
// Props:
//   clientData  — from useClientData hook
//   family      — family record
//   onDraft     — optional callback(insight) when consultant wants to draft a response

import { useState, useCallback } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { callAI } from "../../lib/ai.js";

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const INSIGHT_SYSTEM_PROMPT = `You are the RCC Consultant Insight Generator.

Your job is to help a pediatric sleep consultant quickly understand what is happening, what matters most, and where to focus next.

Write in Rooted Connections Collective (RCC) voice:
- calm, grounded, and observational
- clear and direct, without being harsh
- emotionally aware but not overly validating
- never patronizing
- never overly explanatory or "teaching"
- never clinical or robotic
- never contrast-based ("not this, but that")
- never hedging ("this might be", "it seems like")

CORE APPROACH:
Focus on:
→ What is showing up
→ What it means
→ What deserves attention

Do not over-explain. Do not over-reassure. Do not compare or contrast explanations.

LANGUAGE RULES:
Avoid: "this sounds like", "this looks like", "this may be", "this isn't X, it's Y", long educational explanations
Use: "What I'm seeing is…", "This pattern lines up with…", "[child name]'s having a hard time…", "Her system is…", "This is showing up as…"

Return ONLY valid JSON using this exact schema:
{
  "priority_level": "low | medium | high",
  "headline": "short, clear summary of what matters most right now",
  "what_seems_to_be_happening": "2–3 sentences, grounded interpretation",
  "parent_state": "1–2 sentences, simple observation of parent experience if relevant",
  "child_signal": "1–2 sentences, what the child behavior is communicating",
  "what_needs_attention_now": ["bullet 1", "bullet 2", "bullet 3"],
  "recommended_next_step": "1–2 sentences, simple direction for consultant",
  "suggested_message_to_parent": "short RCC-style message, 2–4 sentences",
  "confidence_note": "1 sentence noting strength or limits of data"
}

priority_level rules:
- high: parent escalating, disengaging, or situation worsening
- medium: pattern forming, parent strain increasing
- low: stable, no urgent action

No markdown. No extra text. Return ONLY the JSON object.`;

// ─── BUILD CONTEXT STRING ─────────────────────────────────────────────────────
function buildContext(clientData, family) {
  const child = clientData.children?.[0];
  const childName = child?.name || "the child";
  const childAge = child?.dob
    ? (() => {
        const months = Math.floor((Date.now() - new Date(child.dob)) / (1000 * 60 * 60 * 24 * 30.44));
        return months < 24 ? `${months} months` : `${Math.floor(months / 12)} years`;
      })()
    : "age unknown";

  const recentMessages = (clientData.recentMessages || [])
    .map(m => `- ${m.sender_id ? "Parent" : "Consultant"}: "${m.content?.slice(0, 120)}"`)
    .join("\n") || "No recent messages";

  return `FAMILY: ${family.display_name || family.invite_email || "Unnamed family"}
CHILD: ${childName}, ${childAge}

SLEEP DATA (last 7 days):
- Sessions logged: ${clientData.sleepData?.weekSessions ?? 0}
- Avg night wakings: ${clientData.sleepData?.nightWakesAvg ?? 0}
- Today: ${clientData.sleepData?.napCountToday ?? 0} naps, ${clientData.sleepData?.totalSleepTodayH ?? 0}h total sleep

PARENT STATE:
- Overwhelm level: ${clientData.parentState?.overwhelmLevel ?? "unknown"}/10
- Last NS state: ${clientData.parentState?.recentState || "none recorded"}

ENGAGEMENT:
- Last sleep log: ${clientData.lastLog ? `${Math.round((Date.now() - new Date(clientData.lastLog)) / 3600000)}h ago` : "none"}
- Last message: ${clientData.lastMessage ? `${Math.round((Date.now() - new Date(clientData.lastMessage)) / 3600000)}h ago` : "none"}
- Regulation check-ins this week: ${clientData.regulationCheckIns ?? 0}
- Intake complete: ${family.intake_complete ? "yes" : "no"}

PRIORITY SIGNALS: ${clientData.priority?.signals?.join(", ") || "none"}

RECENT MESSAGES:
${recentMessages}`;
}

// ─── PRIORITY COLORS ──────────────────────────────────────────────────────────
const PRIORITY = {
  high:   { bg: "#C0707012", border: "#C0707035", text: "#C07070", label: "🚨 High Priority" },
  medium: { bg: "#A89B5A12", border: "#A89B5A35", text: "#A89B5A", label: "⚠️ Medium Priority" },
  low:    { bg: "#7BAA8A12", border: "#7BAA8A35", text: "#7BAA8A", label: "✅ Low Priority"    },
};

// ─── INSIGHT CARD ─────────────────────────────────────────────────────────────
function InsightCard({ insight, onDraft, T }) {
  const p = PRIORITY[insight.priority_level] || PRIORITY.low;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Priority + headline */}
      <div style={{ padding: "12px 14px", borderRadius: 12, background: p.bg, border: `1px solid ${p.border}` }}>
        <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: p.text, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5 }}>
          {p.label}
        </div>
        <div style={{ fontFamily: serif, fontSize: 17, color: T.headingText, lineHeight: 1.3 }}>
          {insight.headline}
        </div>
      </div>

      {/* What's happening */}
      <div style={{ padding: "12px 14px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}>
        <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.subText, marginBottom: 7 }}>
          What's Happening
        </div>
        <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7, margin: 0 }}>
          {insight.what_seems_to_be_happening}
        </p>
      </div>

      {/* Parent state + child signal — side by side if both present */}
      {(insight.parent_state || insight.child_signal) && (
        <div style={{ display: "grid", gridTemplateColumns: insight.parent_state && insight.child_signal ? "1fr 1fr" : "1fr", gap: 10 }}>
          {insight.parent_state && (
            <div style={{ padding: "11px 13px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}>
              <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.subText, marginBottom: 5 }}>Parent</div>
              <p style={{ fontFamily: font, fontSize: 12.5, color: T.text, lineHeight: 1.65, margin: 0 }}>{insight.parent_state}</p>
            </div>
          )}
          {insight.child_signal && (
            <div style={{ padding: "11px 13px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}>
              <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.subText, marginBottom: 5 }}>Child Signal</div>
              <p style={{ fontFamily: font, fontSize: 12.5, color: T.text, lineHeight: 1.65, margin: 0 }}>{insight.child_signal}</p>
            </div>
          )}
        </div>
      )}

      {/* What needs attention */}
      {insight.what_needs_attention_now?.length > 0 && (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}>
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.subText, marginBottom: 8 }}>
            Needs Attention
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {insight.what_needs_attention_now.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${p.text}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: p.text, flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </div>
                <span style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next step */}
      {insight.recommended_next_step && (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: `${T.teal}10`, border: `1px solid ${T.teal}25` }}>
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.teal, marginBottom: 5 }}>
            Recommended Next Step
          </div>
          <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65, margin: 0 }}>
            {insight.recommended_next_step}
          </p>
        </div>
      )}

      {/* Suggested message + Draft button */}
      {insight.suggested_message_to_parent && (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.subText }}>
              Suggested Message
            </div>
            {onDraft && (
              <button
                onClick={() => onDraft(insight)}
                style={{ padding: "4px 12px", borderRadius: 8, border: `1px solid ${T.teal}40`, background: `${T.teal}15`, color: T.teal, fontFamily: font, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
              >
                Use as draft →
              </button>
            )}
          </div>
          <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.7, fontStyle: "italic", margin: 0 }}>
            "{insight.suggested_message_to_parent}"
          </p>
        </div>
      )}

      {/* Confidence note */}
      {insight.confidence_note && (
        <div style={{ fontFamily: font, fontSize: 11, color: T.subText, textAlign: "right", fontStyle: "italic" }}>
          ⓘ {insight.confidence_note}
        </div>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function InsightGenerator({ clientData, family, onDraft }) {
  const T = useT();
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(async () => {
    if (!clientData || !family) return;
    setLoading(true);
    setError(null);
    try {
      const context = buildContext(clientData, family);
      const text = await callAI({
        system: INSIGHT_SYSTEM_PROMPT,
        max_tokens: 800,
        messages: [{ role: "user", content: context }],
      });
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setInsight(parsed);
    } catch (e) {
      setError("Couldn't generate insight right now. Data is safe — try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [clientData, family]);

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font }}>
          ✦ AI Insight
        </div>
        <button
          onClick={generate}
          disabled={loading}
          style={{ background: "none", border: "none", fontFamily: font, fontSize: 11.5, color: loading ? T.subText : T.teal, cursor: loading ? "default" : "pointer", fontWeight: 600 }}
        >
          {loading ? "Reading data…" : insight ? "↻ Refresh" : "Generate →"}
        </button>
      </div>

      {/* States */}
      {!insight && !loading && !error && (
        <div style={{ padding: "20px 0", textAlign: "center" }}>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
            Generate an AI insight to see what's showing up for this family right now.
          </div>
        </div>
      )}

      {loading && (
        <div style={{ padding: "20px 0", textAlign: "center" }}>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>Reading family data…</div>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: `rgba(192,112,112,0.08)`, border: "1px solid rgba(192,112,112,0.2)" }}>
          <div style={{ fontFamily: font, fontSize: 13, color: "#C07070" }}>{error}</div>
          <button onClick={generate} style={{ marginTop: 8, background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.teal, cursor: "pointer" }}>Try again →</button>
        </div>
      )}

      {insight && !loading && (
        <InsightCard insight={insight} onDraft={onDraft} T={T} />
      )}
    </div>
  );
}
