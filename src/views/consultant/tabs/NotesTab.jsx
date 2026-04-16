// views/consultant/tabs/NotesTab.jsx
import { useState } from "react";
import { useT, font, serif } from "../../../core/shared.jsx";
import { useConsultantNotes } from "../data/consultantStore.js";

const TAGS = ["Progress", "Parent concern", "Plan adjustment", "Regression", "Win 🎉", "Flag"];

export default function NotesTab({ family, activeChild }) {
  const T = useT();
  const { notes, addNote } = useConsultantNotes();
  const [text, setText] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  const key = activeChild?.id || family?.id;
  const childNotes = notes[key] || [];

  const toggleTag = t => setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSave = () => {
    if (!text.trim()) return;
    addNote(family.id, activeChild?.id, text.trim(), selectedTags);
    setText("");
    setSelectedTags([]);
  };

  return (
    <div>
      {/* Note input */}
      <div style={{ margin: "10px 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
        <div style={{ fontFamily: serif, fontSize: 15, fontStyle: "italic", color: T.muted, marginBottom: 12, lineHeight: 1.4 }}>
          Add a session note for {activeChild?.name || family?.name}…
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What happened? What did you notice? What did you adjust?"
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 12,
            border: `1.5px solid ${text ? T.teal : T.border}`,
            background: T.inputBg, color: T.text,
            fontSize: 13, fontFamily: font,
            resize: "none", height: 80, outline: "none",
            boxSizing: "border-box", lineHeight: 1.55,
          }}
        />
        {/* Tag chips */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8, marginBottom: 10 }}>
          {TAGS.map(t => (
            <button key={t} onClick={() => toggleTag(t)} style={{
              background: selectedTags.includes(t) ? T.teal : T.bg2,
              border: `1.5px solid ${selectedTags.includes(t) ? T.teal : T.border}`,
              borderRadius: 20, padding: "3px 10px",
              fontSize: 10, color: selectedTags.includes(t) ? "#fff" : T.muted,
              cursor: "pointer", fontFamily: font,
            }}>{t}</button>
          ))}
        </div>
        <button onClick={handleSave} disabled={!text.trim()} style={{
          width: "100%", background: text.trim() ? T.teal : T.faint,
          color: text.trim() ? "#fff" : T.muted,
          border: "none", borderRadius: 12, padding: "10px",
          fontSize: 13, fontWeight: 600, cursor: text.trim() ? "pointer" : "default",
          fontFamily: font,
        }}>
          Save note
        </button>
      </div>

      {/* Existing notes */}
      {childNotes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 20px", color: T.muted, fontFamily: font, fontSize: 13 }}>
          No notes yet for {activeChild?.name || family?.name}.
        </div>
      ) : childNotes.map(note => (
        <div key={note.id} style={{
          margin: "0 18px 9px", background: T.card,
          borderRadius: 16, padding: "13px 15px", boxShadow: T.shadow,
        }}>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: 8, fontFamily: font }}>
            {note.text}
          </div>
          {note.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
              {note.tags.map(t => (
                <span key={t} style={{
                  background: T.bg2, borderRadius: 20, padding: "2px 8px",
                  fontSize: 10, color: T.muted, fontFamily: font,
                }}>{t}</span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, color: T.subText, fontFamily: font }}>
            {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      ))}
    </div>
  );
}
