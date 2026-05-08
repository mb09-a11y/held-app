// ─── QuickMessage ─────────────────────────────────────────────────────────────
// Consultant-only contextual message composer.
// Drops into any view where a consultant wants to send a quick note to a family
// without navigating away. Writes directly to the messages table.
//
// Props:
//   user          — current user object (must be consultant)
//   activeFamily  — family record (needs family.id)
//   context       — optional string describing what triggered the message
//                   (e.g. "4 night wakings logged last night")
//   defaultDraft  — optional pre-filled message text
//   onSent        — optional callback() after message sends successfully

import { useState, useEffect, useRef } from "react";
import { useT, font } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { callAI } from "../../lib/ai.js";

const QUICK_MESSAGE_PROMPT = `You are helping a pediatric sleep consultant write a short, contextual message to a parent.

The consultant has noticed something specific in the sleep data and wants to send a quick, grounded check-in — not a long coaching message.

VOICE:
- warm, direct, not clinical
- feels like a text from a trusted professional who's paying attention
- no generic filler ("hope you're doing great!")
- names what they noticed
- offers one clear direction or question
- 2–4 sentences max

Return ONLY the message text. No labels, no quotes, no explanation.`;

export function QuickMessage({ user, activeFamily, context, defaultDraft, onSent }) {
  const T = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(defaultDraft || "");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  // Auto-focus textarea when opened
  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(draft.length, draft.length);
    }
  }, [open]);

  // Auto-generate when opened if no default draft
  useEffect(() => {
    if (open && !draft && !generating && context) {
      generateDraft();
    }
  }, [open]);

  async function generateDraft() {
    if (!context) return;
    setGenerating(true);
    setError(null);
    try {
      const prompt = `The consultant is viewing a family's sleep log and noticed:\n${context}\n\nWrite a short, warm check-in message they can send to the parent right now.`;
      const text = await callAI({
        system: QUICK_MESSAGE_PROMPT,
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      });
      setDraft(text.trim());
    } catch {
      // Silent — consultant can write manually
    } finally {
      setGenerating(false);
    }
  }

  async function send() {
    if (!draft.trim() || !activeFamily?.id || !user?.id) return;
    setSending(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from("messages")
        .insert({
          family_id: activeFamily.id,
          sender_id: user.id,
          sender_role: "consultant",
          type: "text",
          content: draft.trim(),
        });
      if (dbError) throw dbError;
      setSent(true);
      setDraft("");
      setTimeout(() => {
        setSent(false);
        setOpen(false);
        onSent?.();
      }, 1800);
    } catch (e) {
      setError("Couldn't send — try again.");
    } finally {
      setSending(false);
    }
  }

  // Don't render for non-consultants
  const isConsultant = user?.role === "consultant" || user?.role === "consultant_internal" || user?.role === "admin";
  if (!isConsultant || !activeFamily?.id) return null;

  return (
    <div style={{ marginTop: 16 }}>
      {!open ? (
        // ── Collapsed trigger button ──
        <button
          onClick={() => setOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 14px", borderRadius: 10,
            background: T.card, border: `0.5px solid ${T.border}`,
            fontFamily: font, fontSize: 12.5, fontWeight: 600,
            color: T.sage, cursor: "pointer", width: "100%",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.faint}
          onMouseLeave={e => e.currentTarget.style.background = T.card}
        >
          <span style={{ fontSize: 14 }}>💬</span>
          Message family about this
        </button>
      ) : (
        // ── Expanded composer ──
        <div style={{
          borderRadius: 12, border: `0.5px solid ${T.border}`,
          background: T.card, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderBottom: `0.5px solid ${T.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13 }}>💬</span>
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: T.headingText }}>
                Message {activeFamily.display_name || activeFamily.invite_email?.split("@")[0] || "family"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {context && (
                <button
                  onClick={generateDraft}
                  disabled={generating}
                  style={{ background: "none", border: "none", fontFamily: font, fontSize: 11, color: generating ? T.subText : T.sage, cursor: generating ? "default" : "pointer", padding: 0 }}
                >
                  {generating ? "Drafting…" : draft ? "↻ Redraft" : "✦ Draft from log"}
                </button>
              )}
              <button
                onClick={() => { setOpen(false); setDraft(defaultDraft || ""); setError(null); }}
                style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.muted, cursor: "pointer", padding: 0 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Context chip — shows what triggered this */}
          {context && (
            <div style={{ padding: "8px 14px 0" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20,
                background: T.faint, border: `0.5px solid ${T.border}`,
                fontFamily: font, fontSize: 11, color: T.subText,
              }}>
                <span style={{ fontSize: 10 }}>📊</span>
                {context}
              </div>
            </div>
          )}

          {/* Textarea */}
          <div style={{ padding: "10px 14px 0" }}>
            {generating ? (
              <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted, padding: "8px 0", fontStyle: "italic" }}>
                Writing a draft based on what you're seeing…
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Write a quick note to this family…"
                rows={3}
                style={{
                  width: "100%", background: T.inputBg,
                  border: `0.5px solid ${T.border}`, borderRadius: 8,
                  padding: "9px 11px", color: T.text,
                  fontFamily: font, fontSize: 13, lineHeight: 1.6,
                  resize: "vertical", outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = T.sage}
                onBlur={e => e.target.style.borderColor = T.border}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
                }}
              />
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "8px 14px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontFamily: font, fontSize: 11, color: T.subText }}>
              {error
                ? <span style={{ color: "#C0392B" }}>{error}</span>
                : sent
                ? <span style={{ color: "#2D6A4F" }}>✓ Sent</span>
                : "⌘↵ to send"
              }
            </div>
            <button
              onClick={send}
              disabled={sending || !draft.trim() || sent}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: sent ? "#EAF3EB" : !draft.trim() || sending ? T.faint : T.sage,
                color: sent ? "#2D6A4F" : !draft.trim() || sending ? T.subText : "#fff",
                fontFamily: font, fontSize: 12.5, fontWeight: 600,
                cursor: sending || !draft.trim() || sent ? "default" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {sent ? "✓ Sent" : sending ? "Sending…" : "Send →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
