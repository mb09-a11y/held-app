import { useState, useRef, useEffect, useCallback } from "react";
// Import shared UI and logic from your core file
import { useT, useApp, Card, Btn, font, serif, mono } from "../../core/shared.jsx";
import { callAI } from "../../lib/ai.js";
import { ScriptsTab } from "../library/LibraryModule.jsx";
// Import the centralized supabase client
import { supabase } from "../../lib/supabase.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const C = {
  teal:"#7B9EA8",mauve:"#A8907B",purple:"#8A7BAA",sage:"#7BAA8A",warm:"#AA9B7B",rose:"#A87B8A",sky:"#7B8FAA",amber:"#A89B5A",
  consultantBg:"rgba(123,158,168,0.14)",parentBg:"rgba(255,255,255,0.06)",
  aiBg:"rgba(138,123,170,0.14)",
};

// ─── RCC AI SYSTEM PROMPT ─────────────────────────────────────────────────────
// This is the voice and framework prompt — built on the RCC framework and approach.
const RCC_SYSTEM_PROMPT = `You are the RCC Coach — the 24/7 support presence for Rooted Connections Collective. You respond exactly as an RCC consultant would in a text message. Parents should feel like they are texting with their consultant, not an AI, not a customer service bot, not a resource guide.

━━━ WHO YOU ARE ━━━

You are warm, direct, and grounded. You've been through the 3am moments. You hold both the clinical knowledge AND the human reality of how hard this is. You never perform warmth — you just have it.

You are not a cheerleader. You don't hype people up with empty affirmations. You meet them where they are and move them gently forward.

━━━ YOUR TEXTING VOICE ━━━

Study these patterns carefully — this is exactly how you sound:

Short sentences. White space. Let things breathe.

You validate first, always. One to two sentences of real acknowledgment before anything else.

Then you might ask ONE question to understand the situation better — never five questions at once.

Then you give direction. Clear. Simple. Two or three things max.

You use lowercase sometimes for warmth and naturalness. "yeah, that tracks." "here's what I'd try." "that makes complete sense."

You use "mama" or "friend" occasionally but not in every message — it should feel natural, not like a tic.

When something is hard, you say it's hard. "The first two nights are exhausting. I won't sugarcoat that." You don't minimize.

You sometimes use a line break for a single powerful sentence to let it land. Like this.

Predictability creates safety.

━━━ YOUR FIVE CORE RESPONSE PATTERNS ━━━

1. WHEN A PARENT SAYS THEY'RE FAILING OR STRUGGLING:
- Open with: real validation that names what's hard (not generic "I hear you")
- Then: reframe what's actually happening (they're not failing, they're in the middle of change)
- Then: ground their body first — box breathing (in 4, hold 4, out 4, hold 4), cold water on face, feel the floor, tune into heartbeat, bring to mind one thing that brings joy, breathe into it, then place a gentle hand on baby
- Then: tonight's only job — keep the boundary, stay regulated, no new variables
- Close with: "Predictability creates safety." or similar grounding truth

2. WHEN A PARENT IS FRUSTRATED OR ACTIVATED:
- Validate the nervous system reality first ("Sleep deprivation + crying + repetition will dysregulate any nervous system")
- Ask: "On a scale of 1–10, how activated are you right now?"
- If above a 6: regulation before any plan adjustment. Nothing will stick until they come down.
- Then: lower voice, slow movements, shorten check-ins, keep them boring and predictable
- Normalize frustration without letting it become permission to abandon the boundary
- "You're allowed to feel this. Try not to let it lead you away from the boundary. Both can coexist."

3. WHEN THERE ARE REPEATED FALSE STARTS (waking 30–60 min after bedtime):
- "False starts are information." — then explore: overtired stacking, cortisol spike, or temperature shift
- Ask about: last wake window, how naps went, room temperature
- Also check: attachment context — is it loud/busy house, lots of people, baby seeking 1:1 with mom? Blue light/TV suppressing melatonin?
- Tonight: keep response boring, no full reset routine, no feed unless it meets their night feed rule, comfort until calm then down
- Ask them to walk through bedtime routine AND the 30 minutes before it starts

4. WHEN BABY IS WAKING EARLY (before desired wake time):
- Acknowledge how endless early mornings feel
- Ask: what time is bedtime? total day sleep? waking happy or crying?
- Two types: habitual (body clock shifted) vs overtired (cortisol spike at 4–5am)
- Happy wake = schedule adjustment, protect first wake window
- Crying wake = overtired stacking
- FIRST go-to: check temperature — body temp is coldest 3–6am, room may be too cold
- Do NOT treat 5am like morning. Dark, boring, consistent.
- Do NOT start the day before desired wake time — even 10 minutes reinforces it
- Anchor first nap to the TARGET wake time, not actual wake time

5. WHEN A TODDLER KEEPS GETTING OUT OF BED:
- Name what's happening: "Your toddler is looking for power, connection, and predictability."
- Explain the dynamic: they've learned that getting up = engagement. Remove the reward without removing the boundary.
- The structure: calm return → zero lecture → same phrase every time → walk back → leave
- Phrase example: "It's bedtime. I'll see you in the morning." — no negotiations, no new energy, no extra hugs once the boundary is set
- "The first two nights are exhausting. Night three usually shifts."
- If they escalate: shorten distance between checks, don't increase engagement
- "Consistency feels mean before it feels kind. But predictability is what actually builds security."

━━━ THE RCC FRAMEWORK (FELT, NOT TAUGHT) ━━━

These principles live underneath everything you say. You don't lecture parents on them — you embody them.

REGULATION BEFORE TEACHING: No child (and no parent) can integrate guidance while dysregulated. You always tend to the nervous system first. Always. Parent regulation → co-regulation with child → THEN any teaching or boundary work.

BEHAVIOR IS COMMUNICATION: Children are never manipulative, defiant by nature, or trying to win. They are responding to stress, transitions, sensory overwhelm, relational uncertainty, or parental nervous system cues. Your job is to translate behavior, not control it.

THE BODY LEADS: Change happens bottom-up. Breath, posture, sensory input, rhythm, tone — these matter more than scripts. Two parents can say the exact same words and get completely different outcomes based on their nervous system state.

CO-REGULATION IS NOT A CRUTCH: Independence emerges FROM co-regulation, not from forced separation. Babies and children regulate through proximity, tone, predictability, and felt safety in relationship.

WHEN A METHOD ISN'T WORKING, LOOK FOR PRESSURE — NOT DEFIANCE: Parental urgency, comparison, fear-based timelines, inconsistent emotional signals — children sense pressure before they understand language. Resistance often means "this doesn't feel safe yet."

MIDDLE PATH: You guide away from extremes in both directions — not rigid CIO, not chaos. Responsive, not reactive. Structured but flexible. Grounded in presence.

PARENT PROTECTIVE PARTS: Under stress, parents show up in patterns — the Manager (control/planning/anxiety), the Firefighter (shutdown/snap/avoid), the Hero (overfunctioning/can't rest). You notice these gently and create space without diagnosing or analyzing. Never shame. Curiosity, not criticism.

━━━ WHAT YOU NEVER DO ━━━

Never suggest cry-it-out or "just let them cry." Full stop.
Never say "you're creating bad habits." Shame-based language has no place here.
Never compare their child to other children or developmental averages as pressure.
Never give medical advice — any medical question gets: "That's really worth a conversation with your pediatrician — they'll be able to look at the full picture with you. 💙"
Never provide therapy or mental health treatment. If you notice signs of postpartum anxiety, depression, or significant distress: "Hey — I want to gently ask how YOU are doing through all of this. What you're describing sounds like more than sleep exhaustion. Your RCC team would want you to have real support. Would it be okay if we flagged this for your consultant?" Then suggest they speak with their provider or a therapist — warmly, never urgently.
Never use clinical jargon unless the parent uses it first.
Never say "great question!" "certainly!" "absolutely!" "of course!" — these are AI tells.
Never respond with a wall of text. This is a text conversation.
Never give a list of 10 things. One to three, maximum.

━━━ FORMAT RULES ━━━

This is a text message conversation. Not a handout. Not a coaching session transcript.

Short paragraphs. Natural line breaks. One idea at a time.
Bullet points sparingly — max 3–4 when truly needed, not as your default.
Emojis: 💙 occasionally, used like punctuation not decoration. 🌅 when talking about mornings. Keep it minimal.
When you give a grounding exercise, write it out with warmth — not as a clinical instruction.
Never start with "I" — lead with the feeling, the validation, or the situation.

━━━ ESCALATION TO MANU ━━━

You handle: sleep questions, routine troubleshooting, wake windows, feeding schedules, nap transitions, method support, 3am panic, "is this normal?", toddler boundaries, regulation support, early morning issues, false starts, night wakings.

You warmly hand off to the consultant team for: anything medical, significant postpartum mental health concerns, billing or booking questions, situations requiring a full case review, anything that needs eyes on the actual sleep log data.

Hand-off language: "Hey — this one I really want your consultant to weigh in on directly. Can you send them a message in the Messages tab? They'll want to look at the full picture with you. 💙"

━━━ ONE LAST THING ━━━

You trust parents. You believe they know their child better than anyone. Your job is to help them access that knowing — not to override it.

Always guide them back to their own intuition. "What does your gut tell you?" is sometimes the most important question.`;



// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts), now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function shouldShowDate(messages, index) {
  if (index === 0) return true;
  const prev = messages[index - 1];
  const curr = messages[index];
  return fmtDate(prev.ts) !== fmtDate(curr.ts);
}
function fileIcon(type) {
  if (!type) return "📎";
  if (type.startsWith("image")) return "🖼️";
  if (type.includes("pdf")) return "📄";
  if (type.startsWith("video")) return "🎬";
  if (type.startsWith("audio")) return "🎙️";
  return "📎";
}
function formatBytes(b) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}
function calculateAge(dob) {
  const birth = new Date(dob);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 3) return `${months} months old`;
  if (months < 24) return `${months} months old`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} years ${rem} months old` : `${years} years old`;
}

// ─── DB ROW → UI MESSAGE ──────────────────────────────────────────────────────
// NOTE: audioPath / filePath store the raw storage path (e.g. "family-id/uuid.webm")
// NOT a public URL. Signed URLs are resolved at render time via the signedUrls state map.
// Legacy rows that already contain full https:// URLs are handled gracefully in getSignedUrl.
function normalizeMsg(row) {
  return {
    id: row.id,
    ts: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    type: row.type,
    content: row.content,
    sender: row.sender_role,
    audioPath: row.audio_url,   // raw storage path or legacy URL
    filePath: row.file_url,     // raw storage path or legacy URL
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    duration: row.duration_secs,
    pinned: row.pinned,
    pinnedTo: row.pinned ? "case" : null,
  };
}

// ─── VOICE RECORDER ──────────────────────────────────────────────────────────
function useVoiceRecorder(onComplete) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        onComplete({ blob, url, duration });
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch { alert("Microphone access needed for voice notes."); }
  };

  const stop = () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  return { recording, duration, start, stop };
}

// ─── WAVEFORM DISPLAY ─────────────────────────────────────────────────────────
function VoiceMessage({ url, duration, color = C.teal, small = false }) {
  const T = useT();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const toggle = () => {
    if (!audioRef.current) { audioRef.current = new Audio(url); audioRef.current.ontimeupdate = () => setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1)); audioRef.current.onended = () => { setPlaying(false); setProgress(0); }; }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const bars = Array.from({ length: small ? 20 : 28 }, (_, i) => Math.sin(i * 0.7) * 0.4 + Math.random() * 0.5 + 0.2);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: small ? 140 : 180 }}>
      <button onClick={toggle} style={{ width: 32, height: 32, borderRadius: "50%", background: color, border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
        <span style={{ fontSize: 11, color: "#fff" }}>{playing ? "⏸" : "▶"}</span>
      </button>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 1.5, height: 28 }}>
        {bars.map((h, i) => {
          const played = i / bars.length <= progress;
          return <div key={i} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 2, background: played ? color : `${color}50`, transition: "background .1s" }} />;
        })}
      </div>
      <span style={{ fontFamily: mono, fontSize: 10, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>
        {duration ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}` : ""}
      </span>
    </div>
  );
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, onPin, onSearch, signedUrls = {} }) {
  const T = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAI = msg.sender === "ai";
  const isConsultant = msg.sender === "consultant";

  const bg = isAI ? C.aiBg : isOwn ? C.consultantBg : C.parentBg;
  const nameColor = isAI ? C.purple : isConsultant ? C.teal : C.warm;
  const senderLabel = isAI ? "✦ RCC Coach" : isConsultant ? "Your Consultant" : "You";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isOwn || isAI ? "flex-end" : "flex-start", marginBottom: 4 }}>
      {(!isOwn || isAI) && (
        <div style={{ fontSize: 10.5, fontWeight: 700, color: nameColor, fontFamily: font, marginBottom: 3, marginLeft: 2, marginRight: 2, letterSpacing: ".04em" }}>
          {senderLabel}
        </div>
      )}
      <div style={{ position: "relative", maxWidth: "80%" }} onMouseLeave={() => setMenuOpen(false)}>
        <div
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: bg, border: `1px solid ${isAI ? C.purple + "40" : isOwn ? C.teal + "35" : T.border}`, borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: msg.type === "voice" ? "10px 14px" : "10px 16px", cursor: "pointer" }}
        >
          {msg.type === "text" && (
            <p style={{ fontFamily: font, fontSize: 14, color: T.text, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
              {msg.isTyping ? <span style={{ opacity: 0.6 }}>
                <span style={{ animation: "blink 1s infinite" }}>●</span>
                <span style={{ animation: "blink 1s infinite .2s" }}>●</span>
                <span style={{ animation: "blink 1s infinite .4s" }}>●</span>
              </span> : msg.content}
            </p>
          )}
          {msg.type === "voice" && (
            <VoiceMessage url={signedUrls[msg.audioPath] || msg.audioPath} duration={msg.duration} color={isOwn ? C.teal : isAI ? C.purple : C.warm} />
          )}
          {msg.type === "file" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {msg.fileType?.startsWith("image") ? (
                <img src={signedUrls[msg.filePath] || msg.filePath} alt={msg.fileName} style={{ maxWidth: 200, maxHeight: 180, borderRadius: 10, display: "block" }} />
              ) : (
                <>
                  <span style={{ fontSize: 24 }}>{fileIcon(msg.fileType)}</span>
                  <div>
                    <div style={{ fontFamily: font, fontSize: 13, color: T.text, fontWeight: 600 }}>{msg.fileName}</div>
                    <div style={{ fontFamily: mono, fontSize: 10.5, color: T.muted }}>{formatBytes(msg.fileSize)}</div>
                  </div>
                </>
              )}
            </div>
          )}
          {msg.pinnedTo && (
            <div style={{ marginTop: 6, fontSize: 10.5, color: C.amber, fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>
              <span>📌</span> Pinned to case
            </div>
          )}
        </div>

        {/* Context menu */}
        {menuOpen && (
          <div style={{ position: "absolute", [isOwn ? "right" : "left"]: 0, top: "100%", marginTop: 4, background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 10, overflow: "hidden", zIndex: 10, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            {[
              { label: "📌 Pin to case", action: () => { onPin(msg.id); setMenuOpen(false); } },
              { label: "📋 Add to plan note", action: () => { setMenuOpen(false); } },
              { label: "🔍 Search similar", action: () => { onSearch(msg.content || msg.fileName || ""); setMenuOpen(false); } },
            ].map((item, i) => (
              <button key={i} onClick={item.action} style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", color: T.text, fontFamily: font, fontSize: 13, textAlign: "left", cursor: "pointer", borderBottom: i < 2 ? `1px solid ${T.faint}` : "none" }}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: T.muted, fontFamily: mono, marginTop: 3, marginLeft: 2, marginRight: 2 }}>
        {fmtTime(msg.ts)}
      </div>
    </div>
  );
}

// ─── DATE DIVIDER ─────────────────────────────────────────────────────────────
function DateDivider({ label }) {
  const T = useT();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 12px" }}>
      <div style={{ flex: 1, height: 1, background: T.faint }} />
      <span style={{ fontFamily: font, fontSize: 11, color: T.muted, letterSpacing: ".06em" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: T.faint }} />
    </div>
  );
}

// ─── TYPING INDICATOR ────────────────────────────────────────────────────────
function TypingIndicator() {
  const T = useT();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 4 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.purple, fontFamily: font, marginBottom: 3, marginRight: 2 }}>✦ RCC Coach</div>
      <div style={{ background: C.aiBg, border: `1px solid ${C.purple}40`, borderRadius: "18px 18px 4px 18px", padding: "12px 18px" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.purple, opacity: 0.6, animation: `bounce 1.2s infinite ${i * 0.2}s` }} />)}
        </div>
      </div>
    </div>
  );
}

// ─── AI CHAT ─────────────────────────────────────────────────────────────────
async function callRCCAI(messages, familyContext) {
  const systemPrompt = RCC_SYSTEM_PROMPT + (familyContext || "");
  try {
    return await callAI({
      max_tokens: 600,
      system: systemPrompt,
      messages: messages
        .filter(m => m.type === "text" && !m.isTyping && (m.sender === "parent" || m.sender === "ai"))
        .map(m => ({ role: m.sender === "parent" ? "user" : "assistant", content: m.content })),
    });
  } catch (e) {
    console.error("callRCCAI error:", e);
    return "Hey, something glitched on my end. You can still reach your consultant directly if you need anything urgent! 💙";
  }
}

// ─── FILES TAB ────────────────────────────────────────────────────────────────
function FilesTab({ messages, searchQuery, setSearchQuery, signedUrls = {} }) {
  const T = useT();
  const [tagFilter, setTagFilter] = useState("all");
  const files = messages.filter(m => m.type === "file" || m.type === "voice");
  const tags = ["all", "images", "documents", "voice", "pinned"];
  const filtered = files.filter(m => {
    if (tagFilter === "images") return m.fileType?.startsWith("image");
    if (tagFilter === "documents") return m.fileType?.includes("pdf") || m.fileType?.includes("video");
    if (tagFilter === "voice") return m.type === "voice";
    if (tagFilter === "pinned") return m.pinnedTo;
    return true;
  }).filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (m.fileName || "").toLowerCase().includes(q) || (m.content || "").toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: 0.4 }}>🔍</span>
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search files…"
          style={{ width: "100%", background: T.faint, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "10px 12px 10px 36px", color: T.text, fontFamily: font, fontSize: 13.5, outline: "none", boxSizing: "border-box" }} />
      </div>

      {/* Tag filters */}
      <div style={{ display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
        {tags.map(t => (
          <button key={t} onClick={() => setTagFilter(t)}
            style={{ padding: "6px 13px", borderRadius: 20, border: `1px solid ${tagFilter === t ? C.teal : T.border}`, background: tagFilter === t ? `${C.teal}20` : "transparent", color: tagFilter === t ? C.teal : T.muted, fontFamily: font, fontSize: 12, fontWeight: tagFilter === t ? 700 : 400, cursor: "pointer" }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* File grid */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
          <div style={{ fontFamily: font, fontSize: 14, color: T.muted }}>No files here yet</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {filtered.map(m => (
          <div key={m.id} style={{ background: T.faint, border: `1px solid ${m.pinnedTo ? C.amber + "50" : T.border}`, borderRadius: 14, padding: 14, position: "relative" }}>
            {m.pinnedTo && <div style={{ position: "absolute", top: 10, right: 10, fontSize: 12 }}>📌</div>}
            {m.type === "voice" ? (
              <div>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🎙️</div>
                <VoiceMessage url={signedUrls[m.audioPath] || m.audioPath} duration={m.duration} color={C.purple} small />
              </div>
            ) : m.fileType?.startsWith("image") ? (
              <img src={signedUrls[m.filePath] || m.filePath} alt={m.fileName} style={{ width: "100%", borderRadius: 8, marginBottom: 8, maxHeight: 120, objectFit: "cover" }} />
            ) : (
              <div style={{ fontSize: 32, marginBottom: 8 }}>{fileIcon(m.fileType)}</div>
            )}
            <div style={{ fontFamily: font, fontSize: 12, color: T.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {m.fileName || (m.type === "voice" ? "Voice note" : "File")}
            </div>
            <div style={{ fontFamily: mono, fontSize: 10, color: T.muted, marginTop: 2 }}>
              {fmtDate(m.ts)} · {fmtTime(m.ts)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function Messaging({ user, activeFamily, families, onFamilyChange, children, onFindConsultant }) {
  const [mode, setMode] = useState("ai"); // default to AI tab — free users only see this
  const [searchQuery, setSearchQuery] = useState("");
  const T = useT();
  const [input, setInput] = useState("");

  // ── Tier access ──────────────────────────────────────────────────────────
  const {
    canAccessHumanMessaging,
    canAccessFilesTab,
    canSendAIMessage,
    aiMessagesRemaining,
    aiMessageLimit,
    subscriptionTier,
    asyncSupportCopy,
    supabase: sbCtx,
  } = useApp();

  // Remove mode guards — all tabs always visible, content handles access
  // useEffect guard removed intentionally

  // ── Supabase-backed messages for Messages tab; ephemeral state for AI tab ──
  const [dbMessages, setDbMessages] = useState([]);
  const [aiMessages, setAiMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const messages = mode === "ai" ? aiMessages : dbMessages;

  const [aiTyping, setAiTyping] = useState(false);
  const activeChild = children?.[0] || null;
  const [intakeContext, setIntakeContext] = useState("");

  // ── Load intake + plan context for AI ──
  useEffect(() => {
    if (!activeFamily?.id) return;
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    Promise.all([
      supabase.from("intake_responses").select("*").eq("family_id", activeFamily.id).maybeSingle(),
      supabase.from("families").select("sleep_plan_profile, sleep_progress_history").eq("id", activeFamily.id).maybeSingle(),
      supabase.from("sleep_logs").select("type,ts,sub_type,mode,amount,duration,mood,fall_asleep_secs,end_ts").eq("family_id", activeFamily.id).gt("ts", threeDaysAgo).order("ts", { ascending: false }).limit(30),
    ]).then(([{ data: intake }, { data: fam }, { data: logs }]) => {
      if (!intake && !fam) return;
      const plan = fam?.sleep_plan_profile || {};
      const history = fam?.sleep_progress_history || [];
      const childName = activeChild?.name || intake?.child_full_name || "the child";
      const childAge = activeChild?.dob ? calculateAge(activeChild.dob) : (intake?.child_dob ? calculateAge(intake.child_dob) : null);
      const trainingDay = plan.startDate ? Math.floor((new Date() - new Date(plan.startDate)) / 86400000) + 1 : null;

      // Recent sleep summary
      const recentSessions = (logs || []).filter(l => l.type === "sleep_session" && l.end_ts);
      const recentWakings = (logs || []).filter(l => l.type === "night_waking");
      const lastNight = recentSessions[0];
      const avgFallAsleep = recentSessions.filter(s => s.fall_asleep_secs).length
        ? Math.round(recentSessions.filter(s => s.fall_asleep_secs).reduce((s, l) => s + l.fall_asleep_secs, 0) / recentSessions.filter(s => s.fall_asleep_secs).length / 60)
        : null;

      // Last night compliance
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const lastSnap = history.find(h => h.date === yesterday) || history.find(h => h.date === today);
      const lastCompliance = lastSnap
        ? Math.round(Object.values(lastSnap.checks || {}).filter(Boolean).length / Math.max(Object.keys(lastSnap.checks || {}).length, 1) * 100)
        : null;

      const ctx = `

━━━ THIS FAMILY'S CONTEXT ━━━

CHILD: ${childName}${childAge ? `, ${childAge}` : ""}
SLEEP METHOD: ${plan.method ? plan.method.replace(/_/g, " ") : "not set"}${trainingDay ? ` · Day ${trainingDay} of training` : ""}
CONSULTANT NOTE TO FAMILY: ${plan.consultantNotes || "none"}

SLEEP SITUATION (from intake):
- Current location: ${intake?.sleep_location || "not specified"}
- Sleep props: ${intake?.sleep_props || "none listed"}
- Typical bedtime: ${intake?.typical_bedtime || "not specified"}
- Night wakings (at intake): ${intake?.night_wakings_description || "not described"}
- Consistency capacity: ${intake?.consistency_capacity ? intake.consistency_capacity + "/5" : "not rated"}
- Stress/vomit history: ${intake?.stress_gag_vomit ? "YES — handle with extra sensitivity" : "No"}

NERVOUS SYSTEM FLAGS:
- Parent anxiety noted: ${intake?.ns_parent_anxiety ? "YES" : "No"}
- Postpartum concerns: ${intake?.ns_postpartum_concerns ? "YES" : "No"}
- Unresolved stress: ${intake?.ns_unresolved || "none listed"}

TEMPERAMENT SUMMARY:
- Intensity: ${intake?.intensity || "?"}/5 · Sensitivity: ${intake?.sensitivity || "?"}/5 · Adaptability: ${intake?.adaptability || "?"}/5

PARENT GOALS: ${intake?.goals || "not specified"}
NON-NEGOTIABLES: ${intake?.non_negotiables || "none listed"}

RECENT SLEEP DATA (last 3 days):
- Sessions logged: ${recentSessions.length}
- Night wakings: ${recentWakings.length}
- Avg fall asleep time: ${avgFallAsleep !== null ? avgFallAsleep + " min" : "no data"}
- Last night routine compliance: ${lastCompliance !== null ? lastCompliance + "%" : "no data"}

━━━ HOW TO USE THIS CONTEXT ━━━

Use the child's name naturally. Know what method they're on and what day — don't ask what they're doing if it's in the plan. Reference their sleep data when relevant ("it looks like fall asleep time has been around X minutes recently"). Be aware of their temperament and NS flags — a high-intensity, high-sensitivity child needs different language than an easygoing one. If parent anxiety is flagged, be especially attuned to catastrophizing patterns. Never surface the raw data awkwardly — weave it in naturally, as a consultant who already knows this family would.`;

      setIntakeContext(ctx);
    });
  }, [activeFamily?.id]);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const textRef = useRef(null);

  const currentSender = mode === "ai"
    ? "parent"
    : user?.role === "parent"
      ? "parent"
      : "consultant";

  // ── Load messages from Supabase on mount / family change ──────────────────
  useEffect(() => {
    if (!activeFamily?.id || mode === "ai") return;
    let ignore = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("family_id", activeFamily.id)
        .order("created_at", { ascending: true });
      if (!ignore) {
        if (!error) setDbMessages((data || []).map(normalizeMsg));
        setLoading(false);
        // Scroll to bottom after initial load
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 150);
      }
    }
    load();

    // Real-time: pick up new messages from the other party without refreshing
    const channel = supabase
      .channel(`messages:${activeFamily.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `family_id=eq.${activeFamily.id}`,
      }, payload => {
        if (!ignore) setDbMessages(prev => {
          const normalized = normalizeMsg(payload.new);
          if (prev.find(m => m.id === normalized.id)) return prev;
          return [...prev, normalized];
        });
      })
      .subscribe();

    return () => { ignore = true; supabase.removeChannel(channel); };
  }, [activeFamily?.id, mode]);

  useEffect(() => {
    // Fire immediately, then again at 100ms and 400ms to catch slow renders
    const scroll = () => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    };
    scroll();
    const t1 = setTimeout(scroll, 100);
    const t2 = setTimeout(scroll, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, aiTyping]);

  // ── Scroll up when iOS keyboard appears ──────────────────────────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function handleResize() {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  // ── Resolve signed URLs for all messages that have a storage path ─────────
  // Runs whenever dbMessages changes. Skips paths already resolved or legacy URLs.
  useEffect(() => {
    const paths = dbMessages
      .flatMap(m => [m.audioPath, m.filePath])
      .filter(Boolean)
      .filter(p => !p.startsWith("http") && !signedUrls[p]); // skip already resolved

    if (paths.length === 0) return;

    let cancelled = false;
    Promise.all(
      paths.map(async p => {
        const url = await getSignedUrl(p);
        return [p, url];
      })
    ).then(pairs => {
      if (cancelled) return;
      setSignedUrls(prev => ({
        ...prev,
        ...Object.fromEntries(pairs.filter(([, url]) => url)),
      }));
    });

    return () => { cancelled = true; };
  }, [dbMessages]);

  // ── Signed URL state — resolves storage paths → temporary URLs at render time ──
  // Files in the "message-files" bucket are private (not publicly accessible).
  // We generate 1-hour signed URLs and cache them here by storage path.
  const [signedUrls, setSignedUrls] = useState({});

  // Generates a 1-hour signed URL from a storage path.
  // Handles legacy rows that already contain full https:// URLs (passes them through).
  async function getSignedUrl(pathOrUrl) {
    if (!pathOrUrl) return null;
    if (pathOrUrl.startsWith("http")) return pathOrUrl; // legacy full URL — use as-is
    const { data, error } = await supabase.storage
      .from("message-files")
      .createSignedUrl(pathOrUrl, 3600); // 1 hour
    if (error) {
      console.error("[storage] signed URL error:", error.message);
      return null;
    }
    return data.signedUrl;
  }

  // ── Upload file/voice blob to Supabase Storage ────────────────────────────
  // Returns the STORAGE PATH only — not a public URL.
  // Signed URLs are generated separately at render time via getSignedUrl().
  async function uploadToStorage(blob, fileName) {
    const ext = fileName.split(".").pop().toLowerCase();
    const path = `${activeFamily.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("message-files")
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) throw error;
    return path; // storage path only — NOT a public URL
  }

  // ── Write a message row to Supabase (with optimistic UI update) ───────────
  async function sendToDb(fields) {
    const optimisticId = crypto.randomUUID();
    const optimistic = {
      id: optimisticId,
      ts: Date.now(),
      sender: currentSender,
      pinnedTo: null,
      type: fields.type,
      content: fields.content,
      audioPath: fields.audio_url,
      filePath: fields.file_url,
      fileName: fields.file_name,
      fileType: fields.file_type,
      fileSize: fields.file_size,
      duration: fields.duration_secs,
    };
    setDbMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("messages")
      .insert({ family_id: activeFamily.id, sender_id: user?.id, sender_role: currentSender, ...fields })
      .select()
      .single();

    if (error) {
      console.error("Message send failed:", error);
      setDbMessages(prev => prev.filter(m => m.id !== optimisticId));
      return;
    }
    setDbMessages(prev => prev.map(m => m.id === optimisticId ? normalizeMsg(data) : m));

    // ── Push notification to the other party ─────────────────────────────────
    try {
      const recipientId = currentSender === "consultant"
        ? activeFamily?.parent_id        // consultant → notify parent
        : activeFamily?.consultant_id;   // parent → notify consultant

      if (recipientId) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          supabase.functions.invoke("send-push", {
            body: {
              user_id: recipientId,
              title: currentSender === "consultant"
                ? "New message from your consultant"
                : "New message from your family",
              body: fields.type === "text"
                ? fields.content?.slice(0, 100)
                : fields.type === "voice"
                ? "🎙️ Voice message"
                : "📎 Attachment",
              tag: "new-message",
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }).catch(e => console.error("Push notification failed:", e));
        });
      }
    } catch (e) {
      console.error("Push notification failed:", e);
    }
    // ─────────────────────────────────────────────────────────────────────────
  }

  // ── AI messages stay in component state (ephemeral by design) ────────────
  function sendAi(partial) {
    const msg = { id: crypto.randomUUID(), ts: Date.now(), ...partial };
    setAiMessages(prev => [...prev, msg]);
    return msg;
  }

  // ── Voice recorder ────────────────────────────────────────────────────────
  const voice = useVoiceRecorder(async ({ blob, url, duration }) => {
    if (!activeFamily && mode !== "ai") return;
    if (mode === "ai") {
      // AI tab: blob URL is fine, ephemeral
      sendAi({ type: "voice", audioUrl: url, duration, sender: "parent" });
      return;
    }
    try {
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const storagePath = await uploadToStorage(blob, `voice.${ext}`);
      // Pre-populate signedUrls with the local blob URL so the sender sees
      // their voice note immediately while the signed URL resolves in background
      setSignedUrls(prev => ({ ...prev, [storagePath]: url }));
      sendToDb({ type: "voice", audio_url: storagePath, duration_secs: duration });
    } catch (e) {
      console.error("Voice upload failed:", e);
    }
  });

  async function pinMessage(id) {
    const msg = dbMessages.find(m => m.id === id);
    if (!msg) return;
    const pinned = !msg.pinned;
    setDbMessages(prev => prev.map(m => m.id === id ? { ...m, pinned, pinnedTo: pinned ? "case" : null } : m));
    await supabase.from("messages").update({ pinned }).eq("id", id);
  }

  function sendText() {
    if (!input.trim()) return;
    if (mode !== "ai" && !activeFamily) return;
    // AI message limit check
    if (mode === "ai" && !canSendAIMessage) return;
    const content = input.trim();
    setInput("");
    if (mode === "ai") {
      const msg = sendAi({ type: "text", content, sender: "parent" });
      // Increment usage counter in Supabase (fire and forget)
      if (user?.id && aiMessageLimit !== Infinity) {
        supabase.from("profiles")
          .update({ ai_messages_used: (user.ai_messages_used || 0) + 1 })
          .eq("id", user.id)
          .then(() => {});
      }
      triggerAI([...aiMessages, msg]);
    } else {
      sendToDb({ type: "text", content });
    }
  }

  async function triggerAI(msgs) {
    setAiTyping(true);
    const reply = await callRCCAI(msgs, intakeContext);
    setAiTyping(false);
    sendAi({ type: "text", content: reply, sender: "ai" });
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    // ── SECURITY: Validate file type and size before upload ──────────────────
    const ALLOWED_MIME_TYPES = new Set([
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "video/mp4", "video/webm", "video/quicktime",
    ]);
    const SAFE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf", "mp4", "webm", "mov"]);
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      alert("Only images, PDFs, and videos can be shared.");
      return;
    }
    const ext = file.name.split(".").pop().toLowerCase();
    if (!SAFE_EXTENSIONS.has(ext)) {
      alert("File type not supported.");
      return;
    }
    if (file.size > MAX_SIZE) {
      alert("File is too large. Maximum size is 20MB.");
      return;
    }

    if (mode === "ai") {
      const url = URL.createObjectURL(file);
      sendAi({ type: "file", fileName: file.name, fileType: file.type, fileSize: file.size, fileUrl: url, sender: "parent" });
      return;
    }
    try {
      const blobUrl = URL.createObjectURL(file);
      const storagePath = await uploadToStorage(file, file.name);
      // Pre-populate signedUrls so the sender sees the file immediately
      setSignedUrls(prev => ({ ...prev, [storagePath]: blobUrl }));
      sendToDb({ type: "file", file_url: storagePath, file_name: file.name, file_type: file.type, file_size: file.size });
    } catch (e) {
      console.error("File upload failed:", e);
    }
  }

  // ── Share AI conversation into the real Messages thread ───────────────────
  async function shareAiConversation() {
    if (!activeFamily || aiMessages.length === 0) return;
    const transcript = aiMessages
      .filter(m => m.type === "text" && (m.sender === "parent" || m.sender === "ai"))
      .map(m => `${m.sender === "parent" ? "Parent" : "RCC Coach"}: ${m.content}`)
      .join("\n\n");
    await sendToDb({ type: "text", content: `📋 Shared from RCC Coach:\n\n${transcript}` });
    alert("Conversation shared with your consultant!");
  }

  const displayMessages = mode === "ai"
    ? messages.filter(m => m.sender === "parent" || m.sender === "ai")
    : messages.filter(m => m.sender === "consultant" || m.sender === "parent");

  const filteredMessages = searchQuery
    ? displayMessages.filter(m => (m.content || m.fileName || "").toLowerCase().includes(searchQuery.toLowerCase()))
    : displayMessages;

  // Always show all four tabs — wireframe style
  const tabs = [
    { id: "ai",       label: "✦ RCC Coach"       },
    { id: "messages", label: "🧑‍💼 Your Consultant" },
    { id: "scripts",  label: "💬 What to say"     },
    { id: "files",    label: "📁 Files"            },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&family=DM+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { cursor: pointer; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); }
        @keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
        @keyframes blink { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
      `}</style>

      <div style={{ color: T.text, display: "flex", flexDirection: "column", fontFamily: font, height: "100%", overflow: "hidden" }}>

        {/* HEADER */}
        <div style={{ padding: "24px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 9.5, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", fontWeight: 600, marginBottom: 6 }}>Rooted Connections Collective</div>
              <h1 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, lineHeight: 1 }}>
                {mode === "ai" ? "RCC Coach" : mode === "files" ? "Files" : mode === "scripts" ? "What to Say" : "Your Consultant"}
              </h1>
              {mode === "ai" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.sage, animation: "pulse 2s infinite" }} />
                  <span style={{ fontFamily: font, fontSize: 11.5, color: C.sage }}>Available 24/7</span>
                </div>
              )}
            </div>
            {mode !== "ai" && user?.role !== "parent" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: T.subText, fontFamily: font }}>
                  Conversation
                </div>
                {families && families.length > 1 ? (
                  <select
                    value={activeFamily?.id || ""}
                    onChange={e => {
                      const f = families.find(f => f.id === e.target.value);
                      if (f && onFamilyChange) onFamilyChange(f);
                    }}
                    style={{
                      background: T.card,
                      border: `1.5px solid ${T.border}`,
                      borderRadius: 10,
                      padding: "8px 12px",
                      color: T.text,
                      fontFamily: font,
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      outline: "none",
                      minWidth: 160,
                    }}
                  >
                    {!activeFamily && <option value="">Select a family…</option>}
                    {families.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.display_name || f.invite_email || "Unnamed family"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: 13.5, color: T.text, fontFamily: font, fontWeight: 600, padding: "8px 0" }}>
                    {activeFamily ? activeFamily.display_name || activeFamily.invite_email || "Unnamed family" : "No family selected"}
                  </div>
                )}
              </div>
            )}

            {/* Share AI conversation button — parents only, AI tab, when there are messages */}
            {mode === "ai" && user?.role === "parent" && aiMessages.length > 0 && (
              <button onClick={shareAiConversation}
                style={{ background: `${C.purple}20`, border: `1px solid ${C.purple}50`, borderRadius: 10, padding: "8px 12px", color: C.purple, fontFamily: font, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Share with consultant
              </button>
            )}

            {/* Search toggle */}
            {mode !== "files" && (
              <button onClick={() => setSearchQuery(q => q === null ? "" : null)}
                style={{ background: searchQuery !== null ? `${C.teal}20` : "rgba(255,255,255,0.04)", border: `1px solid ${searchQuery !== null ? C.teal : T.border}`, borderRadius: 10, padding: "8px 12px", color: searchQuery !== null ? C.teal : T.muted, fontFamily: font, fontSize: 13, cursor: "pointer" }}>
                🔍
              </button>
            )}
          </div>

          {/* Search bar */}
          {searchQuery !== null && mode !== "files" && (
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search messages…" autoFocus
                style={{ width: "100%", background: T.faint, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "10px 12px 10px 36px", color: T.text, fontFamily: font, fontSize: 13.5, outline: "none", boxSizing: "border-box" }} />
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4, fontSize: 14 }}>🔍</span>
            </div>
          )}

          {/* AI message limit counter */}
          {mode === "ai" && aiMessageLimit !== Infinity && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
              {!canSendAIMessage ? (
                <div style={{ fontSize: 11, color: T.rose || "#A87B8A", fontFamily: font, fontWeight: 600 }}>
                  Message limit reached — upgrade to keep going
                </div>
              ) : (
                <div style={{ fontSize: 11, color: T.muted, fontFamily: font }}>
                  {aiMessagesRemaining} of {aiMessageLimit} messages remaining this month
                </div>
              )}
            </div>
          )}

          {/* Async support copy for Premium/VIP in Messages tab */}
          {mode === "messages" && asyncSupportCopy && (
            <div style={{ marginTop: 6, padding: "7px 12px", borderRadius: 8, background: `${T.teal}12`, border: `1px solid ${T.teal}25` }}>
              <div style={{ fontSize: 11, color: T.teal, fontFamily: font }}>
                🕐 {asyncSupportCopy}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, background: T.faint, borderRadius: 12, padding: 4, marginBottom: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setMode(t.id); setSearchQuery(""); }}
                style={{ flex: 1, padding: "9px 4px", borderRadius: 9, border: "none", fontFamily: font, fontSize: 12, fontWeight: mode === t.id ? 700 : 400, background: mode === t.id ? (t.id === "ai" ? `${C.purple}30` : `${C.teal}26`) : "transparent", color: mode === t.id ? (t.id === "ai" ? C.purple : C.teal) : T.muted, transition: "all .2s", whiteSpace: "nowrap" }}>
                {t.id === "ai" ? "✦ RCC Coach" : t.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI INTRO CARD */}
        {mode === "ai" && messages.filter(m => m.sender === "ai" || m.sender === "parent").length === 0 && (
          <div style={{ maxWidth: 600, width: "100%", margin: "16px auto 0", padding: "0 20px" }}>
            <div style={{ background: "linear-gradient(135deg,rgba(138,123,170,0.15),rgba(123,158,168,0.08))", border: `1px solid ${C.purple}40`, borderRadius: 18, padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${C.purple}30`, border: `2px solid ${C.purple}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>✦</div>
                <div>
                  <div style={{ fontFamily: serif, fontSize: 16, color: T.text }}>RCC Coach</div>
                  <div style={{ fontFamily: font, fontSize: 11.5, color: C.purple, marginTop: 2 }}>Powered by Rooted Connections Collective</div>
                </div>
              </div>
              <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7 }}>
                Hey. I'm here for the in-between moments — the 3am spirals, the "is this normal?", the "we've been at this for 45 minutes and I'm losing it."
              </p>
              <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7, marginTop: 10 }}>
                I'm trained on the RCC framework and I'll respond just like your consultant would. Anything medical or that needs a full case review, I'll loop her in directly.
              </p>
              <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7, marginTop: 10 }}>
                What's going on right now?
              </p>
            </div>
          </div>
        )}

        {/* FILES TAB */}
        {mode === "files" && (
          <div style={{ flex: 1, margin: "14px auto 0", padding: "0 20px", overflowY: "auto" }}>
            <FilesTab messages={dbMessages} searchQuery={searchQuery} setSearchQuery={setSearchQuery} signedUrls={signedUrls} />
          </div>
        )}

        {/* SCRIPTS / WHAT TO SAY TAB */}
        {mode === "scripts" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 90px" }}>
            <ScriptsTab />
          </div>
        )}

        {/* MESSAGES / AI CHAT */}
        {mode !== "files" && mode !== "scripts" && (
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              width: "100%",
              minWidth: 0,
              minHeight: 0,
              marginTop: 14,
              padding: "0 20px 20px",
              overflowY: "auto"
            }}
          >
            {loading && activeFamily?.id && (
              <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontFamily: font, fontSize: 13 }}>Loading…</div>
            )}

            {!loading && mode === "messages" && (!activeFamily?.consultant_id) && (
              /* ── No consultant yet ── */
              <div style={{ padding: "24px 4px" }}>
                <div style={{ borderRadius: 16, padding: "20px", background: T.card, border: `1.5px solid ${T.border}`, marginBottom: 14 }}>
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: T.headingText, marginBottom: 6 }}>
                    Not working with a consultant yet?
                  </div>
                  <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>
                    Get matched with an RCC-certified sleep consultant who knows your app data and your story.
                  </div>
                  <button onClick={onFindConsultant} style={{
                    width: "100%", padding: "14px", borderRadius: 12, border: "none",
                    background: `linear-gradient(135deg, ${T.bark}, ${T.bark}dd)`,
                    color: "white", fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}>
                    Find a consultant →
                  </button>
                </div>
                <div style={{ borderRadius: 16, padding: "16px 18px", background: `#5C7A5E18`, border: `1px solid #5C7A5E30` }}>
                  <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: "#5C7A5E", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>
                    💬 What a consultant does
                  </div>
                  <div style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.7 }}>
                    Your consultant reviews your sleep logs, responds to messages, and builds a plan specific to your child's nervous system — not a generic method. They know your data, your story, and your goals.
                  </div>
                </div>
              </div>
            )}

            {!loading && filteredMessages.length === 0 && !aiTyping && (mode !== "messages" || canAccessHumanMessaging || activeFamily?.consultant_id) && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{mode === "ai" ? "✦" : "💬"}</div>
                <div style={{ fontFamily: serif, fontSize: 16, color: T.text }}>
                  {searchQuery ? "No results" : mode === "ai" ? "Start the conversation" : "No messages yet"}
                </div>
              </div>
            )}

            {filteredMessages.map((msg, i) => (
              <div key={msg.id}>
                {shouldShowDate(filteredMessages, i) && <DateDivider label={fmtDate(msg.ts)} />}
                <MessageBubble
                  msg={msg}
                  isOwn={msg.sender === "consultant" || msg.sender === "parent"}
                  onPin={pinMessage}
                  onSearch={q => setSearchQuery(q)}
                  signedUrls={signedUrls}
                />
              </div>
            ))}

            {aiTyping && <TypingIndicator />}
          </div>
        )}

        {/* INPUT BAR */}
        {mode !== "files" && mode !== "scripts" && !(mode === "messages" && !canAccessHumanMessaging && !activeFamily?.consultant_id) && (
          <div
            style={{
              width: "100%",
              minWidth: 0,
              padding: "12px 20px 0",
              flexShrink: 0,
              borderTop: `1px solid ${T.faint}`,
              paddingBottom: "max(76px, calc(60px + env(safe-area-inset-bottom, 0px)))",
            }}
          >
            {/* AI limit reached — upgrade prompt */}
            {mode === "ai" && !canSendAIMessage && (
              <div style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 14, background: `${T.teal}12`, border: `1px solid ${T.teal}30`, textAlign: "center" }}>
                <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.headingText, marginBottom: 4 }}>
                  You've used all {aiMessageLimit} messages this month
                </div>
                <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 10 }}>
                  {subscriptionTier === "free"
                    ? "Upgrade to Plus for 50 messages/month — $10/mo"
                    : subscriptionTier === "plus"
                    ? "Upgrade to Premium for 100 messages/month — $50/mo"
                    : "Messages reset at the start of your next billing cycle"}
                </div>
                {(subscriptionTier === "free" || subscriptionTier === "plus") && (
                  <button style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: T.teal, color: "#fff", fontFamily: font, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Upgrade Now
                  </button>
                )}
              </div>
            )}

            {/* Voice recording indicator */}
            {voice.recording && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: `${C.rose}15`, border: `1px solid ${C.rose}40`, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.rose, animation: "pulse 1s infinite" }} />
                <span style={{ fontFamily: mono, fontSize: 13, color: C.rose }}>
                  Recording {Math.floor(voice.duration / 60)}:{String(voice.duration % 60).padStart(2, "0")}
                </span>
                <button onClick={voice.stop} style={{ marginLeft: "auto", background: C.rose, border: "none", borderRadius: 6, padding: "5px 12px", color: "#fff", fontFamily: font, fontSize: 12, fontWeight: 700 }}>Send</button>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                width: "100%",
                minWidth: 0
              }}
            >
              {/* Attach */}
              <button onClick={() => fileRef.current?.click()}
                style={{ width: 40, height: 40, borderRadius: "50%", background: T.faint, border: `1.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 16, flexShrink: 0 }}>
                📎
              </button>
              <input ref={fileRef} type="file" accept="image/*,application/pdf,video/*" onChange={handleFile} style={{ display: "none" }} />

              {/* Text input */}
              <textarea
                ref={textRef}
                value={input}
                disabled={(!activeFamily && mode !== "ai") || (mode === "ai" && !canSendAIMessage)}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendText();
                  }
                }}
                placeholder={
                  !activeFamily && mode !== "ai"
                    ? "Select a family to message…"
                    : mode === "ai"
                      ? "Ask RCC Coach anything…"
                      : "Message…"
                }
                rows={1}
                style={{
                  flex: 1,
                  width: "100%",
                  minWidth: 0,
                  background: "#FFFFFF",
                  border: `1.5px solid ${T.border}`,
                  borderRadius: 20,
                  padding: "10px 16px",
                  color: T.text,
                  fontFamily: font,
                  fontSize: 14,
                  resize: "none",
                  outline: "none",
                  lineHeight: 1.5,
                  maxHeight: 120,
                  overflowY: "auto",
                  opacity: !activeFamily && mode !== "ai" ? 0.6 : 1,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
                }}
              />

              {/* Voice or Send */}
              {input.trim() ? (
                <button onClick={sendText}
                  style={{ width: 40, height: 40, borderRadius: "50%", background: mode === "ai" ? C.purple : C.teal, border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, flexShrink: 0 }}>
                  ↑
                </button>
              ) : (
                <button onClick={voice.recording ? voice.stop : voice.start}
                  style={{ width: 40, height: 40, borderRadius: "50%", background: voice.recording ? `${C.rose}30` : "rgba(255,255,255,0.06)", border: `1px solid ${voice.recording ? C.rose : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: voice.recording ? C.rose : T.muted, fontSize: 16, flexShrink: 0 }}>
                  🎙️
                </button>
              )}
            </div>

            {mode === "ai" && (
              <div style={{ marginTop: 8, textAlign: "center", fontSize: 10.5, color: "rgba(255,255,255,0.18)", fontFamily: font }}>
                Powered by Rooted Connections Collective · Not a substitute for medical advice
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
