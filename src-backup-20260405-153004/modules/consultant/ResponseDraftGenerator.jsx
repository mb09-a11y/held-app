// ─── RCC Response Draft Generator ────────────────────────────────────────────
// Standalone module. Drop into any consultant messaging view.
// Props:
//   insight       — from InsightGenerator (optional, enriches the draft)
//   clientData    — from useClientData hook
//   family        — family record
//   seedMessage   — optional string to pre-fill (e.g. from "Use as draft →")
//   onInsert      — callback(draftText) — inserts into messaging input

import { useState, useEffect } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { callAI } from "../../lib/ai.js";

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const RESPONSE_SYSTEM_PROMPT = `You are the RCC Response Draft Generator.
Your job is to generate a short, grounded message that a pediatric sleep consultant can send to a parent.
This message should reflect Rooted Connections Collective (RCC) voice:
- calm, steady, and observant
- emotionally aware but not overly validating
- direct without being harsh
- grounded, not fluffy
- never patronizing
- never overly reassuring unless explicitly invited
- never contrast-based ("not this, but that")
- never overly clinical or robotic

GOAL:
Write a message that:
1. Briefly acknowledges the situation (without over-validating)
2. Clearly interprets what is happening
3. Offers one simple, grounded direction

TONE RULES:
- Do NOT include reassurance like "you're not doing anything wrong" unless the parent explicitly asked that
- Do NOT use contrast phrasing like "this isn't X, it's Y"
- Do NOT hedge with "this might be" or "it sounds like"
- Do NOT over-explain or teach
- Do NOT include multiple strategies
Instead:
- Speak in grounded observations
- Use clean, confident language
- Keep it human and natural

STRUCTURE:
1. Light acknowledgment (optional, 1 short sentence max)
2. Clear interpretation (this is the core)
3. Simple direction

LENGTH: 2–4 sentences max

PERSONALIZATION:
- Use child's name if available
- Reflect tone of parent message if provided
- If parent is overwhelmed → keep it simpler and shorter
- If parent is analytical → slightly more explanatory, but still concise

EDGE CASES:
If data is limited → keep interpretation simple, avoid strong conclusions
If parent is disengaged → focus on re-engagement, not coaching
If things are stable → keep guidance minimal

Return ONLY the message text.
No labels. No quotes. No extra explanation.`;

// ─── BUILD CONTEXT ────────────────────────────────────────────────────────────
function buildContext(insight, clientData, family, recentParentMessage) {
  const child = clientData?.children?.[0];
  const childName = child?.name || "the child";
  const overwhelm = clientData?.parentState?.overwhelmLevel ?? 0;

  const lines = [`CHILD: ${childName}`];

  if (insight) {
    lines.push(`INSIGHT SUMMARY: ${insight.headline}`);
    lines.push(`WHAT'S HAPPENING: ${insight.what_seems_to_be_happening}`);
    if (insight.parent_state) lines.push(`PARENT STATE: ${insight.parent_state}`);
    if (insight.child_signal) lines.push(`CHILD SIGNAL: ${insight.child_signal}`);
    if (insight.recommended_next_step) lines.push(`SUGGESTED NEXT STEP: ${insight.recommended_next_step}`);
  } else {
    lines.push(`SLEEP THIS WEEK: ${clientData?.sleepData?.weekSessions ?? 0} sessions, avg ${clientData?.sleepData?.nightWakesAvg ?? 0} night wakings`);
    lines.push(`PARENT OVERWHELM: ${overwhelm}/10`);
    lines.push(`LAST NS STATE: ${clientData?.parentState?.recentState || "none recorded"}`);
  }

  if (recentParentMessage) {
    lines.push(`RECENT PARENT MESSAGE: "${recentParentMessage}"`);
  }

  lines.push(`PARENT OVERWHELM LEVEL: ${overwhelm}/10 — ${overwhelm >= 7 ? "keep it short and simple" : overwhelm >= 4 ? "moderate tone" : "parent is steady"}`);

  return lines.join("\n");
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function ResponseDraftGenerator({ insight, clientData, family, seedMessage, onInsert }) {
  const T = useT();
  const [draft, setDraft] = useState(seedMessage || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // If a seed message comes in (from "Use as draft →"), pre-fill
  useEffect(() => {
    if (seedMessage) setDraft(seedMessage);
  }, [seedMessage]);

  // Auto-generate if we have an insight and no draft yet
  useEffect(() => {
    if (insight && !draft && !loading) generate();
  }, [insight]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const recentParentMsg = clientData?.recentMessages?.find(m => m.sender_id)?.content || null;
      const context = buildContext(insight, clientData, family, recentParentMsg);
      const text = await callAI({
        system: RESPONSE_SYSTEM_PROMPT,
        max_tokens: 300,
        messages: [{ role: "user", content: context }],
      });
      setDraft(text.trim());
    } catch (e) {
      setError("Couldn't generate a draft right now.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const teal = "#7B9EA8";

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.subText }}>
          ✍️ Response Draft
        </div>
        <button
          onClick={generate}
          disabled={loading}
          style={{ background: "none", border: "none", fontFamily: font, fontSize: 11.5, color: loading ? T.subText : teal, cursor: loading ? "default" : "pointer", fontWeight: 600 }}
        >
          {loading ? "Drafting…" : draft ? "↻ Regenerate" : "Generate →"}
        </button>
      </div>

      {/* Draft textarea */}
      <div style={{ padding: "12px 14px" }}>
        {loading && (
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, padding: "8px 0" }}>
            Drafting a response…
          </div>
        )}

        {error && (
          <div style={{ fontFamily: font, fontSize: 12.5, color: "#C07070", marginBottom: 8 }}>
            {error}
            <button onClick={generate} style={{ marginLeft: 8, background: "none", border: "none", color: teal, fontFamily: font, fontSize: 12, cursor: "pointer" }}>
              Try again →
            </button>
          </div>
        )}

        {!loading && (
          <>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Draft will appear here — edit before sending…"
              rows={4}
              style={{
                width: "100%",
                background: T.inputBg,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                color: T.text,
                fontFamily: font,
                fontSize: 13.5,
                lineHeight: 1.65,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 10,
              }}
              onFocus={e => e.target.style.borderColor = teal}
              onBlur={e => e.target.style.borderColor = T.border}
            />

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              {onInsert && draft && (
                <button
                  onClick={() => onInsert(draft)}
                  style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: "none", background: teal, color: "#fff", fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Insert into message →
                </button>
              )}
              {draft && (
                <button
                  onClick={handleCopy}
                  style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: copied ? `${teal}20` : T.faint, color: copied ? teal : T.muted, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              )}
            </div>

            {/* Reminder */}
            {draft && (
              <div style={{ marginTop: 8, fontFamily: font, fontSize: 11, color: T.subText, fontStyle: "italic" }}>
                Review before sending — this is a draft, not a final message.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
