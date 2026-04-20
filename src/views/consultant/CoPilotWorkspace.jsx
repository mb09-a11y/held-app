// views/consultant/CoPilotWorkspace.jsx
import { useState, useRef, useEffect } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { useFamilies, useMessages } from "./data/consultantStore.js";
import { callAI } from "../../lib/ai.js";

// SUGGESTED prompts are now generated dynamically from real families in the component

function buildSystemPrompt(families) {
  const summary = families.map(f => {
    const children = f.children?.map(c =>
      `${c.name} (${c.age}, method: ${c.method || "none"}, day ${c.planDay || "?"}, status: ${c.status})`
    ).join("; ");
    return `- ${f.name}: NS=${f.nsState}, urgency=${f.urgency}. Children: ${children}. Last message: "${f.lastMessage}"`;
  }).join("\n");

  return `You are Co-Pilot, an intelligent assistant for sleep consultants at Rooted Connections Collective. You have deep expertise in infant and child sleep, nervous-system-informed parenting, polyvagal theory, and the specific sleep training methods used in the Held app.

You know about these active families:
${summary}

Guidelines:
- Be concise and consultant-facing (not parent-facing)
- Lead with the most actionable insight
- Reference specific family/child data when relevant
- Use nervous system language naturally (NS activated, window of tolerance, co-regulation)
- Keep responses to 3-5 sentences unless drafting a message
- When drafting messages to families, write in a warm, grounded, professional tone
- Never say "I cannot" — always give your best clinical assessment`;
}

export default function CoPilotWorkspace({ onNavigate }) {
  const T = useT();
  const { families } = useFamilies();
  const { sendMessage } = useMessages();

  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sharedIds, setSharedIds] = useState(new Set());
  const scrollRef = useRef(null);

  // Generate suggested prompts from real families
  const SUGGESTED = (() => {
    const prompts = [];
    // Most urgent child first
    const urgentFam = families.find(f => f.urgency === "urgent");
    const urgentChild = urgentFam?.children?.find(c => c.status === "urgent") || urgentFam?.children?.[0];
    if (urgentChild && urgentFam) {
      prompts.push({ q: `What's driving ${urgentChild.name}'s sleep issues?`, familyId: urgentFam.id });
    }
    // Watch family — prep for tonight
    const watchFam = families.find(f => f.urgency === "watch");
    const watchChild = watchFam?.children?.[0];
    if (watchChild && watchFam) {
      prompts.push({ q: `How should I prep for ${watchChild.name} tonight?`, familyId: watchFam.id });
    }
    // Always include a general prompt
    prompts.push({ q: "Which families need attention this week?", familyId: null });
    // Draft check-in for a "good" family
    const goodFam = families.find(f => f.urgency === "good");
    const goodChild = goodFam?.children?.[0];
    if (goodChild && goodFam) {
      prompts.push({ q: `Draft a check-in for ${goodChild.name}'s family`, familyId: goodFam.id });
    }
    return prompts.slice(0, 4);
  })();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, loading]);

  const callAIForQuestion = async (question) => {
    setLoading(true);
    const suggestedItem = SUGGESTED.find(s => s.q === question);
    try {
      const ans = await callAI({
        system: buildSystemPrompt(families),
        messages: [{ role: "user", content: question }],
      });
      setHistory(prev => [...prev, { q: question, ans, familyId: suggestedItem?.familyId || null }]);
    } catch (e) {
      setHistory(prev => [...prev, { q: question, ans: "Connection error. Check your network and try again.", familyId: null }]);
    }
    setLoading(false);
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    callAIForQuestion(q);
  };

  // "Open in Response Builder" — navigate to the relevant family's response builder
  const handleApply = (item) => {
    const fam = item.familyId
      ? families.find(f => f.id === item.familyId)
      : families.find(f => f.urgency === "urgent") || families[0];
    if (fam) onNavigate("responseBuilder", { familyId: fam.id });
  };

  // "Send to family" — put the AI answer directly into the message thread
  const handleShare = (item, idx) => {
    const fam = item.familyId
      ? families.find(f => f.id === item.familyId)
      : families.find(f => f.urgency === "urgent") || families[0];
    if (!fam) return;
    const text = item.ans.trimStart().startsWith("Hi") ? item.ans : item.ans;
    sendMessage(fam.id, text);
    setSharedIds(prev => new Set([...prev, idx]));
  };

  return (
    <div style={{ background: T.gradientBg, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "18px 18px 6px", flexShrink: 0 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: T.teal, fontWeight: 600, marginBottom: 4, fontFamily: font }}>◎ Co-Pilot</div>
        <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, color: T.headingText, marginBottom: 4 }}>Your assistant</div>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: font }}>Ask anything about your families.</div>
      </div>

      {/* Suggested prompts — only when no history yet */}
      {history.length === 0 && !loading && (
        <>
          <div style={{ padding: "8px 18px 4px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font, flexShrink: 0 }}>
            Suggested
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 18px 10px", flexShrink: 0 }}>
            {SUGGESTED.map((s, i) => (
              <button key={i} onClick={() => callAIForQuestion(s.q)} style={{
                background: T.card, border: `1.5px solid ${T.border}`,
                borderRadius: 14, padding: "11px 14px",
                fontSize: 13, color: T.text, cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontFamily: font, textAlign: "left",
              }}>
                {s.q}
                <span style={{ color: T.muted, marginLeft: 8 }}>›</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* History */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "0 0 4px" }}>
        {history.map((item, i) => (
          <div key={i} style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: T.teal, fontWeight: 600, marginBottom: 6, fontFamily: font }}>◎ Co-Pilot</div>
            <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic", marginBottom: 8, fontFamily: font }}>"{item.q}"</div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.65, fontFamily: font, whiteSpace: "pre-wrap" }}>{item.ans}</div>
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => handleApply(item)} style={{
                background: T.teal, color: "#fff", border: "none",
                padding: "6px 13px", borderRadius: 20,
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font,
              }}>Open in Response Builder →</button>
              <button onClick={() => handleShare(item, i)} disabled={sharedIds.has(i)} style={{
                border: `1.5px solid ${sharedIds.has(i) ? T.border : T.teal}`,
                color: sharedIds.has(i) ? T.muted : T.teal,
                background: "transparent", padding: "6px 13px", borderRadius: 20,
                fontSize: 11, cursor: sharedIds.has(i) ? "default" : "pointer",
                fontFamily: font, transition: "all .2s",
              }}>{sharedIds.has(i) ? "✓ Sent" : "Send to family"}</button>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
            <div style={{ fontSize: 12, color: T.muted, fontFamily: font, marginBottom: 8 }}>◎ Thinking…</div>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: T.teal,
                  animation: `copilot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Quick-access chips after history starts */}
        {history.length > 0 && !loading && (
          <div style={{ padding: "0 18px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUGGESTED.map((s, i) => (
              <button key={i} onClick={() => callAIForQuestion(s.q)} style={{
                background: T.faint, border: `1px solid ${T.border}`,
                borderRadius: 20, padding: "5px 11px",
                fontSize: 11, color: T.muted, cursor: "pointer", fontFamily: font,
              }}>{s.q}</button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        margin: "0 18px 8px", background: T.card,
        border: `1.5px solid ${loading ? T.border : `${T.teal}44`}`,
        borderRadius: 18, padding: "10px 12px",
        display: "flex", gap: 8, alignItems: "flex-end",
        flexShrink: 0, transition: "border .2s",
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask about any family…"
          rows={1}
          disabled={loading}
          style={{
            flex: 1, fontSize: 13, color: T.text, fontFamily: font,
            background: "transparent", border: "none", outline: "none",
            resize: "none", lineHeight: 1.5,
          }}
        />
        <button onClick={handleSend} disabled={!input.trim() || loading} style={{
          width: 32, height: 32, borderRadius: "50%",
          background: input.trim() && !loading ? T.teal : T.faint,
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: input.trim() && !loading ? "#fff" : T.muted,
          cursor: input.trim() && !loading ? "pointer" : "default",
          flexShrink: 0, transition: "all .2s",
        }}>↑</button>
      </div>

      <style>{`
        @keyframes copilot-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
