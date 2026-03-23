// src/modules/milestones/components/NervousSystemStory.jsx
// Optional birth context — parent can add their child's story.
// Completely optional. Warm invitation only, never required.

import { useState } from "react";
import { useT, font, serif } from "../../../core/shared.jsx";
import { supabase } from "../../../lib/supabase.js";
import {
  BIRTH_CONTEXT_OPTIONS,
  BIRTH_CONTEXT_FRAMING,
  FOUNDATIONAL_NS_CARD,
  getContextLabels,
} from "../data/birthContext.js";

export function NervousSystemStory({ child, familyId, onUpdate }) {
  const T = useT();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(child?.ns_birth_context || []);
  const [expandedContext, setExpandedContext] = useState(null);

  const hasContext = (child?.ns_birth_context || []).length > 0;
  const contextLabels = getContextLabels(child?.ns_birth_context || []);

  function toggleOption(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await supabase
        .from("children")
        .update({ ns_birth_context: selected })
        .eq("id", child.id);
      onUpdate?.({ ...child, ns_birth_context: selected });
      setEditing(false);
    } catch (e) {
      console.error("Failed to save NS context:", e);
    } finally {
      setSaving(false);
    }
  }

  // ── Idle state — no context added yet ──
  if (!hasContext && !editing) {
    return (
      <div style={{
        borderRadius: 14,
        border: `1px dashed ${T.border}`,
        background: "none",
        padding: "16px 18px",
        marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🌱</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: serif, fontSize: 15,
              color: T.headingText, marginBottom: 5,
            }}>
              Want to share your child's story?
            </div>
            <p style={{
              fontFamily: font, fontSize: 13, color: T.muted,
              lineHeight: 1.65, margin: "0 0 12px",
            }}>
              Sharing a bit about your child's early experience helps us offer
              more relevant context as you explore milestones. Completely optional
              — and you can add, change, or remove this anytime.
            </p>
            <button onClick={() => setEditing(true)} style={{
              padding: "7px 16px", borderRadius: 20,
              border: `1px solid ${T.teal}`,
              background: "none", color: T.teal,
              fontFamily: font, fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}>
              Add your child's story →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Edit / selection view ──
  if (editing) {
    return (
      <div style={{
        borderRadius: 14,
        border: `1.5px solid ${T.teal}30`,
        background: T.card,
        padding: "16px 18px",
        marginBottom: 14,
      }}>
        <div style={{
          fontFamily: serif, fontSize: 16,
          color: T.headingText, marginBottom: 4,
        }}>
          Your child's early story
        </div>
        <p style={{
          fontFamily: font, fontSize: 12.5, color: T.muted,
          lineHeight: 1.6, margin: "0 0 14px",
        }}>
          Select anything that applies. This is just for context — it helps us
          understand their nervous system story. Nothing here changes the
          milestones you see. Select none, some, or all that feel relevant.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {BIRTH_CONTEXT_OPTIONS.map(opt => {
            const isSelected = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleOption(opt.id)}
                style={{
                  padding: "10px 14px", borderRadius: 12, textAlign: "left",
                  border: `1.5px solid ${isSelected ? T.teal : T.border}`,
                  background: isSelected ? `${T.teal}10` : T.faint,
                  cursor: "pointer",
                  display: "flex", alignItems: "flex-start", gap: 10,
                  transition: "all .15s",
                }}
              >
                <span style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }}>{opt.emoji}</span>
                <div>
                  <div style={{
                    fontFamily: font, fontSize: 13.5, fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? T.teal : T.text,
                  }}>
                    {opt.label}
                  </div>
                  <div style={{
                    fontFamily: font, fontSize: 12, color: T.muted,
                    lineHeight: 1.5, marginTop: 2,
                  }}>
                    {opt.description}
                  </div>
                </div>
                {isSelected && (
                  <span style={{ marginLeft: "auto", color: T.teal, fontSize: 14, flexShrink: 0 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { setEditing(false); setSelected(child?.ns_birth_context || []); }} style={{
            flex: 1, padding: "10px", borderRadius: 10,
            border: `1px solid ${T.border}`,
            background: "none", color: T.muted,
            fontFamily: font, fontSize: 13, cursor: "pointer",
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: "10px", borderRadius: 10,
            border: "none",
            background: saving ? T.faint : T.teal,
            color: saving ? T.muted : "#fff",
            fontFamily: font, fontSize: 13, fontWeight: 700,
            cursor: saving ? "default" : "pointer",
          }}>
            {saving ? "Saving…" : "Save →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Context saved — display view ──
  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${T.border}`,
      background: T.card,
      padding: "16px 18px",
      marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🌱</span>
          <span style={{
            fontFamily: font, fontSize: 10, fontWeight: 700,
            letterSpacing: ".12em", textTransform: "uppercase", color: T.sage,
          }}>
            {child?.name}'s nervous system story
          </span>
        </div>
        <button onClick={() => setEditing(true)} style={{
          background: "none", border: "none",
          fontFamily: font, fontSize: 12, color: T.muted,
          cursor: "pointer",
        }}>
          Edit
        </button>
      </div>

      {/* Context chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {contextLabels.map(opt => (
          <div key={opt.id} style={{
            padding: "4px 10px", borderRadius: 20,
            background: T.faint, border: `1px solid ${T.border}`,
            fontFamily: font, fontSize: 12, color: T.text,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span>{opt.emoji}</span>
            {opt.label}
          </div>
        ))}
      </div>

      {/* Expandable framing per context */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {contextLabels.map(opt => {
          const framing = BIRTH_CONTEXT_FRAMING[opt.id];
          if (!framing) return null;
          const isOpen = expandedContext === opt.id;
          return (
            <div key={opt.id} style={{
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              overflow: "hidden",
            }}>
              <button onClick={() => setExpandedContext(isOpen ? null : opt.id)} style={{
                width: "100%", padding: "10px 13px",
                background: isOpen ? `${T.sage}0a` : T.faint,
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, textAlign: "left",
              }}>
                <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                <span style={{
                  fontFamily: font, fontSize: 13, fontWeight: 600,
                  color: T.text, flex: 1,
                }}>
                  {framing.title}
                </span>
                <span style={{ fontSize: 11, color: T.muted }}>{isOpen ? "↑" : "↓"}</span>
              </button>

              {isOpen && (
                <div style={{ padding: "12px 14px", background: "none" }}>
                  {[
                    { label: "What happened", content: framing.what_happened },
                    { label: "What this might look like", content: framing.what_it_means },
                    { label: "What this doesn't mean", content: framing.what_it_doesnt_mean },
                    { label: "What helps", content: framing.what_helps },
                    { label: "The research on resilience", content: framing.hope, color: T.sage },
                  ].map(({ label, content, color }) => (
                    <div key={label} style={{ marginBottom: 12 }}>
                      <div style={{
                        fontFamily: font, fontSize: 10, fontWeight: 700,
                        letterSpacing: ".1em", textTransform: "uppercase",
                        color: color || T.muted, marginBottom: 5,
                      }}>
                        {label}
                      </div>
                      <p style={{
                        fontFamily: font, fontSize: 13, color: T.text,
                        lineHeight: 1.7, margin: 0,
                      }}>
                        {content}
                      </p>
                    </div>
                  ))}

                  {framing.ped_note && (
                    <div style={{
                      padding: "9px 12px", borderRadius: 9,
                      background: `${T.amber}0d`, border: `1px solid ${T.amber}25`,
                      marginBottom: 8,
                    }}>
                      <p style={{
                        fontFamily: font, fontSize: 12.5, color: T.text,
                        lineHeight: 1.65, margin: 0,
                      }}>
                        👩‍⚕️ {framing.ped_note}
                      </p>
                    </div>
                  )}

                  <div style={{ fontFamily: font, fontSize: 11, color: T.subText }}>
                    Sources: {framing.source.join(" · ")}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
