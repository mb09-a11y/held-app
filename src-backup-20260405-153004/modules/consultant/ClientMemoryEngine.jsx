// ─── RCC Client Memory Engine ─────────────────────────────────────────────────
// Standalone module. Lives inside each client's deep dive screen.
// Identifies meaningful patterns across time for a single client.
//
// Props:
//   family      — family record (needs family.id)
//   clientData  — current clientData from useClientData (for recent context)
//   childName   — string (child's first name for personalized language)

import { useState, useCallback, useEffect } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { callAI } from "../../lib/ai.js";
import { supabase } from "../../lib/supabase.js";

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const MEMORY_ENGINE_PROMPT = `You are the RCC Client Memory Engine.
Your job is to identify meaningful patterns across time for a single client.

Focus on:
- recurring sleep patterns
- parent behavior or emotional trends
- child regulation patterns
- what tends to help or make things harder

VOICE:
- grounded, observational
- clear and concise
- no over-explaining
- no teaching tone
- no contrast phrasing
- no assumptions beyond the data

TASK:
Identify patterns that:
- show up more than once
- impact sleep or behavior
- affect the parent experience

Return ONLY valid JSON:
{
  "patterns": [],
  "parent_patterns": [],
  "child_patterns": [],
  "summary": ""
}

RULES:
- Each pattern should be short and specific (1 sentence max)
- Avoid generic statements like "inconsistent sleep"
- Only include meaningful, repeated patterns
- If data is limited, return fewer patterns — do not force patterns that aren't there
- summary should be 1–2 sentences, observational

Return JSON only. No markdown.`;

// ─── LOAD HISTORICAL DATA ─────────────────────────────────────────────────────
async function loadHistoricalData(familyId, parentId) {
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    { data: sleepLogs },
    { data: checkins },
    { data: messages },
    { data: regulation },
  ] = await Promise.all([
    supabase.from("sleep_logs")
      .select("ts, type, end_ts, total_sleep_ms, mood, fall_asleep_secs, sub_type")
      .eq("family_id", familyId)
      .gte("ts", since30)
      .order("ts", { ascending: false })
      .limit(150),
    supabase.from("intake_responses")
      .select("goals, sleep_challenges, non_negotiables, parent_anxiety, consistency_capacity")
      .eq("family_id", familyId)
      .maybeSingle(),
    supabase.from("messages")
      .select("created_at, content, sender_id")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(20),
    parentId
      ? supabase.from("regulation_checkins")
          .select("checked_in_at, state, reactivity, day_state, child_response")
          .eq("user_id", parentId)
          .gte("checked_in_at", since30)
          .order("checked_in_at", { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    sleepLogs: sleepLogs || [],
    intake: checkins || null,
    messages: messages || [],
    regulation: regulation || [],
  };
}

// ─── BUILD CONTEXT STRING ─────────────────────────────────────────────────────
function buildMemoryContext(data, childName) {
  const { sleepLogs, intake, messages, regulation } = data;

  // Summarize sleep by day
  const byDay = {};
  sleepLogs.forEach(l => {
    const day = l.ts?.slice(0, 10);
    if (!day) return;
    if (!byDay[day]) byDay[day] = { sessions: 0, wakings: 0, totalMs: 0, moods: [] };
    if (l.type === "sleep_session" && l.end_ts) {
      byDay[day].sessions++;
      byDay[day].totalMs += l.total_sleep_ms || 0;
      if (l.mood) byDay[day].moods.push(l.mood);
    }
    if (l.type === "night_waking") byDay[day].wakings++;
  });

  const sleepSummary = Object.entries(byDay)
    .slice(0, 14)
    .map(([day, d]) => `${day}: ${d.sessions} sessions, ${d.wakings} wakings, ${(d.totalMs / 3600000).toFixed(1)}h${d.moods.length ? `, moods: ${d.moods.join("/")}` : ""}`)
    .join("\n");

  // Regulation summary
  const regSummary = regulation.slice(0, 20)
    .map(r => `${r.checked_in_at?.slice(0, 10)}: state=${r.state}, reactivity=${r.reactivity}${r.day_state ? `, day=${r.day_state}` : ""}`)
    .join("\n");

  // Message summary (parent messages only)
  const parentMessages = messages
    .filter(m => m.sender_id)
    .slice(0, 8)
    .map(m => `- "${m.content?.slice(0, 100)}"`)
    .join("\n");

  // Intake context
  const intakeContext = intake ? [
    intake.sleep_challenges && `Sleep challenges: ${intake.sleep_challenges}`,
    intake.goals && `Goals: ${intake.goals}`,
    intake.non_negotiables && `Non-negotiables: ${intake.non_negotiables}`,
    intake.parent_anxiety != null && `Parent anxiety level (at intake): ${intake.parent_anxiety}/5`,
    intake.consistency_capacity != null && `Consistency capacity: ${intake.consistency_capacity}/5`,
  ].filter(Boolean).join("\n") : "No intake data";

  return `CHILD: ${childName}
DATA PERIOD: Last 30 days

SLEEP LOG SUMMARY (by day):
${sleepSummary || "No sleep logs"}

REGULATION CHECK-INS:
${regSummary || "No regulation data"}

RECENT PARENT MESSAGES:
${parentMessages || "No messages"}

INTAKE CONTEXT:
${intakeContext}`;
}

// ─── PATTERN DISPLAY ─────────────────────────────────────────────────────────
function PatternSection({ title, items, color, T }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.subText, marginBottom: 7 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color, fontSize: 12, flexShrink: 0, marginTop: 2 }}>→</span>
            <span style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.6 }}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function ClientMemoryEngine({ family, clientData, childName }) {
  const T = useT();
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const generate = useCallback(async () => {
    if (!family?.id) return;
    setLoading(true);
    setError(null);
    try {
      const parentId = clientData?.children?.[0]
        ? (await supabase.from("children").select("parent_id").eq("id", clientData.children[0].id).maybeSingle())?.data?.parent_id
        : family?.parent_id;

      const data = await loadHistoricalData(family.id, parentId || family.parent_id);
      const context = buildMemoryContext(data, childName || "the child");

      const text = await callAI({
        system: MEMORY_ENGINE_PROMPT,
        max_tokens: 600,
        messages: [{ role: "user", content: context }],
      });

      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setMemory(parsed);
      setExpanded(true);
    } catch (e) {
      setError("Couldn't load memory patterns right now.");
    } finally {
      setLoading(false);
    }
  }, [family, clientData, childName]);

  const totalPatterns = (memory?.patterns?.length || 0) +
    (memory?.parent_patterns?.length || 0) +
    (memory?.child_patterns?.length || 0);

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, overflow: "hidden", marginBottom: 14 }}>

      {/* Header — always visible, acts as toggle */}
      <div
        onClick={() => { if (memory) setExpanded(e => !e); }}
        style={{
          padding: "13px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: memory ? "pointer" : "default",
          borderBottom: expanded && memory ? `1px solid ${T.border}` : "none",
        }}
      >
        <div>
          <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.subText, marginBottom: 3 }}>
            🧠 Client Memory
          </div>
          {memory?.summary && !expanded && (
            <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.5, maxWidth: 280 }}>
              {memory.summary}
            </div>
          )}
          {!memory && !loading && (
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>
              Patterns across the last 30 days
            </div>
          )}
          {loading && (
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>
              Reading history…
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {memory && (
            <span style={{ fontFamily: font, fontSize: 11, color: T.muted }}>
              {totalPatterns} pattern{totalPatterns !== 1 ? "s" : ""}  {expanded ? "▲" : "▼"}
            </span>
          )}
          {!memory && !loading && (
            <button
              onClick={e => { e.stopPropagation(); generate(); }}
              style={{
                padding: "6px 13px", borderRadius: 9,
                border: `1px solid ${T.teal}40`,
                background: `${T.teal}12`,
                color: T.teal, fontFamily: font,
                fontSize: 11.5, fontWeight: 700, cursor: "pointer",
              }}
            >
              Load patterns →
            </button>
          )}
          {memory && !loading && (
            <button
              onClick={e => { e.stopPropagation(); generate(); }}
              style={{ background: "none", border: "none", fontFamily: font, fontSize: 11, color: T.muted, cursor: "pointer" }}
            >
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && memory && (
        <div style={{ padding: "14px 16px" }}>

          {/* Summary */}
          {memory.summary && (
            <div style={{ padding: "10px 13px", borderRadius: 10, background: `${T.teal}10`, border: `1px solid ${T.teal}25`, marginBottom: 14 }}>
              <div style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65 }}>
                {memory.summary}
              </div>
            </div>
          )}

          <PatternSection
            title="Overall Patterns"
            items={memory.patterns}
            color={T.teal}
            T={T}
          />
          <PatternSection
            title="Parent Patterns"
            items={memory.parent_patterns}
            color="#A8907B"
            T={T}
          />
          <PatternSection
            title={`${childName || "Child"}'s Patterns`}
            items={memory.child_patterns}
            color="#7BAA8A"
            T={T}
          />

          {totalPatterns === 0 && (
            <div style={{ fontFamily: font, fontSize: 13, color: T.muted, fontStyle: "italic" }}>
              Not enough repeated patterns yet — check back after a few more days of logging.
            </div>
          )}

          <div style={{ marginTop: 10, fontFamily: font, fontSize: 11, color: T.subText, fontStyle: "italic" }}>
            ⓘ Based on the last 30 days of data.
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: "11px 16px" }}>
          <div style={{ fontFamily: font, fontSize: 12.5, color: "#C07070" }}>{error}</div>
          <button onClick={generate} style={{ marginTop: 6, background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.teal, cursor: "pointer" }}>
            Try again →
          </button>
        </div>
      )}
    </div>
  );
}
