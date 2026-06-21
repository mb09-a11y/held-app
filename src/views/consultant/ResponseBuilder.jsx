// views/consultant/ResponseBuilder.jsx
import { useState } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { useFamilies, useMessages } from "./data/consultantStore.js";

const TONES = ["Warm + Validating", "Direct", "Educational", "Boundary"];

const ADJUST_CHIPS = ["More warmth", "Shorter", "Add data", "My voice"];

function buildDraft(family, tone, child) {
  const name = family?.parents?.split(" ")[0] || "there";
  const childName = child?.name || "your little one";

  const drafts = {
    "Warm + Validating": `Three wakings is exhausting, and I hear you. You are not failing — you're doing something genuinely hard, night after night.\n\nHere's what I can see in ${childName}'s data: the last three rough nights all followed a longer nap. That's actually useful — it's something we can adjust.\n\nCap the nap at 90 minutes today, and I'll check in with you at 8pm tonight.`,
    "Direct": `${childName}'s data shows a clear pattern: long nap → more night wakings. Cap the nap at 90 min today.\n\nThis isn't a method failure — it's a schedule adjustment. Try it for 3 nights and let's see.`,
    "Educational": `What you're seeing is actually a really common overtiredness cycle. When the nap runs long, ${childName} arrives at bedtime undertired — their sleep pressure isn't built up enough, so they cycle through lighter sleep stages more often at night.\n\nThe fix is counterintuitive: a shorter nap actually leads to better night sleep. Let's cap it at 90 minutes.`,
    "Boundary": `I know tonight felt hard. I want to make sure we're connecting during our scheduled check-ins so I can support you well.\n\nAction for today: cap nap at 90 min. We'll talk at 8pm.`,
  };

  return drafts[tone] || drafts["Warm + Validating"];
}

export default function ResponseBuilder({ familyId, onBack, onSent }) {
  const T = useT();
  const { families } = useFamilies();
  const { messages, sendMessage } = useMessages();

  const family = families.find(f => f.id === familyId);
  const urgentChild = family?.children?.find(c => c.status === "urgent") || family?.children?.[0];
  const thread = messages[familyId] || [];
  const lastParentMsg = [...thread].reverse().find(m => m.from === "parent");

  const [tone, setTone] = useState("Warm + Validating");
  const [draft, setDraft] = useState(() => buildDraft(family, "Warm + Validating", urgentChild));
  const [editing, setEditing] = useState(false);
  const [activeChip, setActiveChip] = useState(null);

  const handleTone = (t) => {
    setTone(t);
    setDraft(buildDraft(family, t, urgentChild));
    setActiveChip(null);
  };

  const handleAdjust = (chip) => {
    setActiveChip(chip);
    const name = family?.parents?.split(" ")[0] || "there";
    const childName = urgentChild?.name || "your little one";
    if (chip === "More warmth") {
      setDraft(d => `I want you to know you're doing an incredible job, even when it doesn't feel that way. ${d}`);
    } else if (chip === "Shorter") {
      const lines = draft.split("\n\n").filter(Boolean);
      setDraft(lines[0] + (lines[1] ? "\n\n" + lines[1] : ""));
    } else if (chip === "Add data") {
      setDraft(d => d + `\n\nFor context: over the last 7 nights, settling time has averaged ${urgentChild?.status === "urgent" ? "42 min" : "12 min"} and night wakings are at ${urgentChild?.status === "urgent" ? "2.8" : "0.4"}/night.`);
    } else if (chip === "My voice") {
      setDraft(buildDraft(family, tone, urgentChild).replace("I hear you", "I see you").replace("I want to make sure", "Let's make sure"));
    }
    setEditing(false);
  };

  const handleSend = () => {
    sendMessage(familyId, draft);
    if (onSent) onSent();
    else if (onBack) onBack();
  };

  return (
    <div style={{ background: T.gradientBg, flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "12px 18px 4px" }}>
        <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: T.teal, fontWeight: 600, marginBottom: 4, fontFamily: font }}>
          ◎ Co-Pilot · Response Builder
        </div>
        <div style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: T.headingText, marginBottom: 8, lineHeight: 1.4 }}>
          Replying to {family?.name || "family"} · {urgentChild?.status === "urgent" ? "high distress" : "check-in"}
        </div>
      </div>

      {/* Parent context */}
      {lastParentMsg && (
        <div style={{
          margin: "0 18px 10px",
          background: T.bg2, borderRadius: 10, padding: "9px 11px",
          fontSize: 12, color: T.muted, fontStyle: "italic", lineHeight: 1.5,
          borderLeft: `3px solid ${T.border}`, fontFamily: font,
        }}>
          "{lastParentMsg.text}"
        </div>
      )}

      {/* NS context */}
      {family?.nsState && family.nsState !== "Regulated" && family.nsState !== "no_data" && (
        <div style={{
          margin: "0 18px 10px", background: "#FAF3E6",
          border: "1px solid #D4AE72", borderRadius: 12, padding: "8px 12px",
          fontSize: 11, color: "#B8924A", fontFamily: font,
        }}>
          🧠 Parent NS: {family.nsState} — validate emotion before data
        </div>
      )}

      {/* Tone selector */}
      <div style={{ padding: "0 18px 6px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
        Reply tone
      </div>
      <div style={{ display: "flex", gap: 5, padding: "0 18px 10px", flexWrap: "wrap" }}>
        {TONES.map(t => (
          <button key={t} onClick={() => handleTone(t)} style={{
            border: `1.5px solid ${tone === t ? "transparent" : T.border}`,
            borderRadius: 20, padding: "4px 10px",
            fontSize: 11, fontWeight: 500,
            background: tone === t ? T.teal : "transparent",
            color: tone === t ? "#fff" : T.muted,
            cursor: "pointer", fontFamily: font,
          }}>{t}</button>
        ))}
      </div>

      {/* Draft */}
      <div style={{ padding: "0 18px 6px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
        Suggested response
      </div>
      <div style={{ margin: "0 18px 10px" }}>
        {editing ? (
          <textarea value={draft} onChange={e => setDraft(e.target.value)} style={{
            width: "100%", padding: "11px 13px", borderRadius: 12,
            border: `1.5px solid ${T.teal}`,
            background: T.inputBg, color: T.text,
            fontSize: 13, fontFamily: font,
            resize: "none", height: 160, outline: "none",
            boxSizing: "border-box", lineHeight: 1.65,
          }} />
        ) : (
          <div style={{
            background: `linear-gradient(135deg, ${T.bg2}, ${T.card})`,
            border: `1.5px solid ${T.teal}44`,
            borderRadius: 12, padding: "11px 13px",
            fontSize: 13, color: T.text, lineHeight: 1.65,
            fontFamily: font, whiteSpace: "pre-wrap",
          }}>{draft}</div>
        )}
      </div>

      {/* Adjust chips */}
      <div style={{ padding: "0 18px 10px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, fontWeight: 600, marginBottom: 4, fontFamily: font }}>
        Adjust this message
      </div>
      <div style={{ display: "flex", gap: 5, padding: "0 18px 14px", flexWrap: "wrap" }}>
        {ADJUST_CHIPS.map(c => (
          <button key={c} onClick={() => handleAdjust(c)} style={{
            border: `1.5px solid ${activeChip === c ? T.teal : T.border}`,
            borderRadius: 20, padding: "4px 10px",
            fontSize: 11, fontWeight: activeChip === c ? 700 : 500,
            background: activeChip === c ? `${T.teal}18` : "transparent",
            color: activeChip === c ? T.teal : T.muted,
            cursor: "pointer", fontFamily: font,
            transition: "all .15s",
          }}>{c}</button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ margin: "0 18px 24px", display: "flex", gap: 6 }}>
        <button onClick={() => setEditing(e => !e)} style={{
          background: T.card, border: `1.5px solid ${T.border}`,
          borderRadius: 20, padding: "8px 14px",
          fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: font,
        }}>✏️ {editing ? "Preview" : "Edit"}</button>
        <button onClick={handleSend} style={{
          flex: 1, background: T.teal, color: "#fff",
          border: "none", borderRadius: 20, padding: 8,
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font,
        }}>Send to {family?.name?.split(" ")[0] || "family"} →</button>
      </div>
    </div>
  );
}
