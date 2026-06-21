// src/modules/held/NSCheckin.jsx
// The Held NS Check-In card.
// Lives on the parent home screen directly below the sleep check-in card.
// Parent (or child, age-dependent) types or speaks freely — no dropdowns, no forms.
// Held responds in its warm, grounded voice and the response stays sticky for the session.
// Writes to regulation_checkins so total_ns_logs, ventral_points, and leaves stay accurate.

import { useState, useEffect, useRef } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { callAI } from "../../lib/ai.js";
import { getPrompt, getChildDevContext } from "../../lib/prompts.js";
import { supabase } from "../../lib/supabase.js";

// ─── SESSION STORAGE KEY ─────────────────────────────────────────────────────
function sessionKey(familyId) {
  return `held_ns_checkin_${familyId}_${new Date().toDateString()}`;
}

// ─── VALID NS STATES ─────────────────────────────────────────────────────────
const VALID_STATES = ["Regulated", "Stretched", "Fight", "Flight", "Freeze", "Shutdown"];

function sanitizeState(raw) {
  if (!raw) return "Stretched";
  const match = VALID_STATES.find(s => s.toLowerCase() === String(raw).trim().toLowerCase());
  return match || "Stretched"; // default to Stretched if AI returns something unexpected
}

// ─── NS CHECKIN CARD ─────────────────────────────────────────────────────────
export function NSCheckin() {
  const T = useT();
  const { currentUser, activeChild, activeFamily } = useApp();

  const [step, setStep] = useState("idle"); // idle | input | loading | response
  const [inputText, setInputText] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  const speechSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  function startListening() {
    if (!speechSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      setInputText(transcript);
    };
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.start();
    setIsListening(true);
  }

  function stopListening() {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setIsListening(false);
  }

  // Restore sticky response
  useEffect(() => {
    if (!activeFamily?.id) return;
    const cached = sessionStorage.getItem(sessionKey(activeFamily.id));
    if (cached) {
      try {
        setResponse(JSON.parse(cached));
        setStep("response");
      } catch {
        sessionStorage.removeItem(sessionKey(activeFamily.id));
      }
    }
  }, [activeFamily?.id]);

  useEffect(() => {
    if (step === "input" && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [step]);

  function handleOpen() { setStep("input"); setInputText(""); setError(null); }
  function handleCancel() { setStep(response ? "response" : "idle"); setInputText(""); setError(null); }
  function handleClear() {
    sessionStorage.removeItem(sessionKey(activeFamily?.id));
    setStep("idle"); setResponse(null); setInputText(""); setError(null);
  }

  async function handleSubmit() {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    setStep("loading");
    setError(null);

    const childName = activeChild?.name || "my child";
    const totalMonths = (() => {
      if (!activeChild?.dob) return null;
      const birth = new Date(activeChild.dob);
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      let mos = now.getMonth() - birth.getMonth();
      if (now.getDate() < birth.getDate()) mos--;
      if (mos < 0) { years--; mos += 12; }
      return years * 12 + mos;
    })();
    const childAge = totalMonths !== null
      ? (totalMonths < 24 ? `${totalMonths} month old` : `${Math.floor(totalMonths / 12)} year old`)
      : null;
    const devContext = getChildDevContext(totalMonths);

    const userMessage = [
      childAge ? `I'm parenting a ${childAge}, ${childName}.` : `I'm parenting ${childName}.`,
      trimmed,
    ].join(" ");

    try {
      const raw = await callAI({
        system: getPrompt("ns_checkin") + (devContext ? `\n\n${devContext}` : ""),
        max_tokens: 700,
        messages: [{ role: "user", content: userMessage }],
      });

      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setResponse(parsed);
      setStep("response");

      if (activeFamily?.id) {
        sessionStorage.setItem(sessionKey(activeFamily.id), JSON.stringify(parsed));
      }

      // ── Write to regulation_checkins so triggers fire correctly ──
      if (currentUser?.id && activeFamily?.id) {
        const state = sanitizeState(parsed.state);
        supabase.from("regulation_checkins").insert({
          user_id: currentUser.id,
          family_id: activeFamily.id,
          type: new Date().getHours() < 12 ? "am" : "pm",
          state,
          source: "ns_checkin_home",
          notes: trimmed,
          metadata: {
            ai_response: parsed,
            child_id: activeChild?.id || null,
            hour_of_day: new Date().getHours(),
          },
          checked_in_at: new Date().toISOString(),
          is_mixed: false,
        }).catch((err) => {
          console.error("[NSCheckin] Failed to save to regulation_checkins:", err);
        });
      }
    } catch (err) {
      console.error("[NSCheckin] AI call failed:", err);
      setResponse({
        validation: "Something got in the way of that response — but the fact that you reached out matters.",
        what_might_be_happening: "Whatever is going on right now is real and valid. You don't need an AI to tell you that.",
        for_you: "Take one slow breath. You're doing the work just by paying attention.",
        try_this: [
          "Give yourself permission to not have it figured out right now",
          "One small thing: a glass of water, a moment outside, a text to someone who gets it",
        ],
        state: "Stretched",
        want_to_chat_more: true,
      });
      setStep("response");
    }
  }

  // ── IDLE STATE ──
  if (step === "idle") {
    return (
      <div
        onClick={handleOpen}
        style={{
          borderRadius: 16, padding: "18px 20px",
          background: T.card, border: `1.5px solid ${T.border}`,
          cursor: "pointer", marginBottom: 10, transition: "border-color .2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = `${T.teal}60`}
        onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🌿</span>
            <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: T.teal }}>
              Nervous System Check-In
            </span>
          </div>
          <span style={{ fontFamily: font, fontSize: 12, color: T.muted }}>Just checking in →</span>
        </div>
        <p style={{ fontFamily: serif, fontSize: 16, color: T.headingText, lineHeight: 1.4, margin: 0 }}>
          How is everybody doing?
        </p>
        <p style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.5, margin: "6px 0 0" }}>
          Tell me what's on your mind — no structure needed
        </p>
      </div>
    );
  }

  // ── INPUT STATE ──
  if (step === "input") {
    const canSubmit = inputText.trim().length > 3;
    return (
      <div style={{
        borderRadius: 16, padding: "18px 20px",
        background: T.card, border: `1.5px solid ${T.teal}40`, marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }}>🌿</span>
          <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: T.teal }}>
            Nervous System Check-In
          </span>
        </div>
        <p style={{ fontFamily: serif, fontSize: 15, color: T.headingText, lineHeight: 1.4, marginBottom: 12 }}>
          Just checking in — how is everybody doing?
        </p>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) handleSubmit(); }}
          placeholder="I'm so frustrated… or We had a really good morning… or tap the mic and just talk to me"
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box", borderRadius: 10,
            border: `1.5px solid ${T.border}`, background: T.faint, color: T.text,
            fontFamily: font, fontSize: 13.5, lineHeight: 1.6,
            padding: "12px 14px", resize: "vertical", outline: "none", transition: "border-color .2s",
          }}
          onFocus={e => e.target.style.borderColor = `${T.teal}80`}
          onBlur={e => e.target.style.borderColor = T.border}
        />
        {speechSupported && (
          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
            <button
              onClick={isListening ? stopListening : startListening}
              style={{
                padding: "8px 18px", borderRadius: 20,
                border: `1.5px solid ${isListening ? T.rose : T.border}`,
                background: isListening ? `${T.rose}15` : T.faint,
                color: isListening ? T.rose : T.muted,
                fontFamily: font, fontSize: 12.5, fontWeight: isListening ? 700 : 400,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all .2s",
              }}
            >
              <span style={{ fontSize: 15 }}>{isListening ? "⏹" : "🎤"}</span>
              {isListening ? "Tap to stop" : "Or speak instead"}
            </button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <button onClick={handleCancel} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.muted, cursor: "pointer", padding: 0 }}>
            ← Cancel
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: font, fontSize: 11, color: T.muted }}>
              {inputText.trim().length > 0 && !isListening && "⌘↵ to send"}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                padding: "9px 20px", borderRadius: 20, border: "none",
                background: canSubmit ? T.teal : T.faint,
                color: canSubmit ? "#fff" : T.muted,
                fontFamily: font, fontSize: 13, fontWeight: 700,
                cursor: canSubmit ? "pointer" : "default", transition: "all .2s",
              }}
            >
              Share with Held →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING STATE ──
  if (step === "loading") {
    return (
      <div style={{
        borderRadius: 16, padding: "20px", background: T.card,
        border: `1.5px solid ${T.teal}40`, marginBottom: 10,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>🌿</span>
        <span style={{ fontFamily: font, fontSize: 13.5, color: T.muted, fontStyle: "italic" }}>
          Held is with you…
        </span>
      </div>
    );
  }

  // ── RESPONSE STATE ──
  if (step === "response" && response) {
    return (
      <div style={{
        borderRadius: 16, padding: "18px 20px",
        background: T.card, border: `1.5px solid ${T.teal}30`, marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }}>🌿</span>
          <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: T.teal }}>
            Held
          </span>
        </div>
        <p style={{ fontFamily: serif, fontSize: 15.5, color: T.headingText, lineHeight: 1.55, marginBottom: 14 }}>
          {response.validation}
        </p>
        {response.what_might_be_happening && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: `${T.teal}0d`, border: `1px solid ${T.teal}20`, marginBottom: 10 }}>
            <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7, margin: 0 }}>
              {response.what_might_be_happening}
            </p>
          </div>
        )}
        {response.for_you && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "#A87B8A0d", border: "1px solid #A87B8A20", marginBottom: 10 }}>
            <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#A87B8A", marginBottom: 6 }}>
              ❤️ For you
            </div>
            <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7, margin: 0 }}>
              {response.for_you}
            </p>
          </div>
        )}
        {response.try_this?.length > 0 && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "#7BAA8A0d", border: "1px solid #7BAA8A20", marginBottom: 14 }}>
            <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#7BAA8A", marginBottom: 8 }}>
              🌿 If it feels right…
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {response.try_this.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#7BAA8A22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#7BAA8A", flexShrink: 0, marginTop: 3 }}>
                    {i + 1}
                  </div>
                  <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65, margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <p style={{ fontFamily: font, fontSize: 12.5, color: T.muted, fontStyle: "italic", margin: 0, flex: 1 }}>
            Want to chat more?
          </p>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={handleClear} style={{ padding: "7px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 11.5, cursor: "pointer" }}>
              Clear
            </button>
            <button onClick={handleOpen} style={{ padding: "7px 14px", borderRadius: 10, border: `1px solid ${T.teal}50`, background: `${T.teal}10`, color: T.teal, fontFamily: font, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
              Keep going →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
