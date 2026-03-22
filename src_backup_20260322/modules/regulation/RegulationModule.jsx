import { useState, useEffect, useRef } from "react";
import { useT, font, serif, mono, useStorage, useApp, genId } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { callAI } from "../../lib/ai.js";



// ─── STATE COLORS ─────────────────────────────────────────────────────────────
const STATE_META = {
  Regulated:  { color:"#7BAA8A", icon:"🌿", label:"Regulated",   short:"Ventral",   bg:"rgba(123,170,138,0.14)" },
  Fight:      { color:"#C07070", icon:"🔥", label:"Fight",        short:"Activated", bg:"rgba(192,112,112,0.14)" },
  Flight:     { color:"#A89B5A", icon:"⚡", label:"Flight",       short:"Anxious",   bg:"rgba(168,155,90,0.14)"  },
  Freeze:     { color:"#7B8FAA", icon:"❄️", label:"Freeze",       short:"Low Energy",bg:"rgba(123,143,170,0.14)" },
  Shutdown:   { color:"#8A7BAA", icon:"🌑", label:"Shutdown",     short:"Dorsal",    bg:"rgba(138,123,170,0.14)" },
};

// ─── EXERCISE LIBRARY ─────────────────────────────────────────────────────────
const EXERCISES = {
  body_scan:          { id:"body_scan",          title:"Body Scan",          duration:"1 min 42 sec", durationSec:102, tag:"soothing",  desc:"A slow, gentle scan from head to toe to locate where you're holding tension — and let it soften.", audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770311704/bodyscan_cqugpk.m4a",           states:["Flight","Shutdown","Regulated"] },
  butterfly_hug:      { id:"butterfly_hug",      title:"Butterfly Hug",      duration:"1 min 25 sec", durationSec:85,  tag:"soothing",  desc:"Cross your arms over your chest and tap alternating sides gently. Bilateral movement helps your nervous system settle.", audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770320497/butterfly_hug_lkdcqo.m4a",      states:["Fight","Flight"] },
  drop_shoulders:     { id:"drop_shoulders",     title:"Drop the Shoulders", duration:"35 sec",       durationSec:35,  tag:"downshift", desc:"Exhale, roll your shoulders back and down. Unclench your jaw. Let your spine soften.", audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770320498/Drop_the_shoulders_khikvb.m4a", states:["Fight"] },
  gentle_wake_up:     { id:"gentle_wake_up",     title:"Gentle Wake Up",     duration:"1 min 18 sec", durationSec:78,  tag:"upshift",   desc:"Soft movement and breath to gently activate without overwhelming a frozen system.", audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770319380/gentlewakeup_emkew6.m4a",      states:["Freeze","Flight"] },
  gratitude:          { id:"gratitude",          title:"Gratitude Pause",    duration:"1 min 35 sec", durationSec:95,  tag:"orienting", desc:"Three slow breaths, then one small thing that felt okay today. Just one. That's enough.", audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770311704/gratitude_xoiksx.m4a",          states:["Regulated","Freeze"] },
  held_visualization: { id:"held_visualization", title:"Held Visualization", duration:"1 min 30 sec", durationSec:90,  tag:"soothing",  desc:"A gentle guided visualization to help you feel held and safe. Good for moments when you need to feel less alone.", audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770312081/heldvisualization_syjyp8.m4a",  states:["Shutdown","Freeze","Flight"] },
  humming:            { id:"humming",            title:"Humming",            duration:"1 min 20 sec", durationSec:80,  tag:"downshift", desc:"Humming activates the vagus nerve through vibration. Even a soft hum counts.", audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770319380/humming_tll9hs.m4a",            states:["Fight","Freeze"] },
  orient:             { id:"orient",             title:"Orient",             duration:"1 min 21 sec", durationSec:81,  tag:"orienting", desc:"Slowly look around your space. Name what you see. Let your eyes land somewhere that feels neutral or soft.", audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770319380/orient_lhnf0c.m4a",             states:["Flight","Freeze","Shutdown","Regulated"] },
  reset:              { id:"reset",              title:"Reset Breathing",    duration:"1 min",        durationSec:60,  tag:"downshift", desc:"Extended exhale breathing (4 in, 6 out). Longer exhales activate the parasympathetic brake.", audioUrl:"https://res.cloudinary.com/dosa5mjyg/video/upload/v1770320497/reset_l6bq1j.m4a",              states:["Fight","Flight","Shutdown"] },
};

const STATE_EXERCISES = {
  Regulated: ["gratitude","body_scan","orient"],
  Fight:     ["drop_shoulders","humming","butterfly_hug"],
  Flight:    ["orient","gentle_wake_up","reset"],
  Freeze:    ["gentle_wake_up","humming","held_visualization"],
  Shutdown:  ["orient","held_visualization","reset"],
};

// ─── VALIDATION MESSAGES (RCC voice) ──────────────────────────────────────────
const VALIDATION = {
  Regulated:  "You showed up. That matters more than you know.",
  Fight:      "Your body is working hard right now. That's not a flaw — it's protection.",
  Flight:     "The buzzy, overwhelmed feeling is real. Your nervous system is trying to stay safe.",
  Freeze:     "The heaviness you're carrying makes sense. You don't have to push through it.",
  Shutdown:   "When we feel flat or disconnected, it's often because we've been carrying a lot for a long time. You're not broken.",
};

const STATE_DESCRIPTION = {
  Regulated:  "A regulated nervous system doesn't mean life is easy — it means you have some capacity right now. That's worth honoring.",
  Fight:      "You may notice tension in your body, a shorter fuse, or the urge to push back. This can happen when we feel unsupported or overwhelmed by demands.",
  Flight:     "You may feel restless, scattered, or like your mind won't slow down. This is your system scanning for safety — it's working overtime.",
  Freeze:     "A freeze response can feel like exhaustion, heaviness, or difficulty starting things. Your nervous system is conserving energy because something has felt like too much.",
  Shutdown:   "Shutdown can look like numbness, flatness, or feeling disconnected from yourself or others. It's a deep protective response — not apathy.",
};

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function localDateStr(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtDate(iso) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

// ─── STATE CLASSIFICATION ENGINE ─────────────────────────────────────────────
function classifyState(answers, type) {
  const scores = { Regulated: 0, Fight: 0, Flight: 0, Freeze: 0, Shutdown: 0 };

  if (type === "am") {
    const { body, mood, reactivity, sleep } = answers;
    // Body state
    if (body === "calm") scores.Regulated += 3;
    if (body === "tense") { scores.Fight += 3; }
    if (body === "restless") { scores.Flight += 3; }
    if (body === "heavy") { scores.Freeze += 3; }
    if (body === "numb") { scores.Shutdown += 4; }
    // Mood
    if (mood === "capable") scores.Regulated += 2;
    if (mood === "edge") { scores.Fight += 2; scores.Flight += 1; }
    if (mood === "overwhelmed") { scores.Flight += 2; scores.Fight += 1; }
    if (mood === "exhausted") { scores.Freeze += 3; }
    if (mood === "detached") { scores.Shutdown += 3; }
    // Reactivity (1-10)
    const r = parseInt(reactivity) || 5;
    if (r >= 8) { scores.Fight += 3; scores.Flight += 2; }
    else if (r >= 6) { scores.Fight += 1; scores.Flight += 1; }
    else if (r <= 3) { scores.Regulated += 2; }
    // Sleep
    if (sleep === "yes") scores.Regulated += 1;
    if (sleep === "not_at_all") { scores.Freeze += 1; scores.Flight += 1; }
  } else {
    const { dayState, childResponse, repair, rightNow } = answers;
    // Day state
    if (dayState === "regulated") scores.Regulated += 3;
    if (dayState === "irritable") { scores.Fight += 3; }
    if (dayState === "anxious") { scores.Flight += 3; }
    if (dayState === "shutdown") { scores.Shutdown += 4; }
    if (dayState === "swung") { scores.Fight += 1; scores.Flight += 1; scores.Freeze += 1; }
    // Child response
    if (childResponse === "calm") scores.Regulated += 2;
    if (childResponse === "frustrated") scores.Fight += 2;
    if (childResponse === "overstimulated") scores.Flight += 2;
    if (childResponse === "withdrawn") scores.Shutdown += 2;
    if (childResponse === "guilty") { scores.Freeze += 1; scores.Shutdown += 1; }
    // Repair
    if (repair === "yes") scores.Regulated += 1;
    if (repair === "not_yet") scores.Freeze += 1;
    // Right now
    if (rightNow === "settled") scores.Regulated += 2;
    if (rightNow === "wired") { scores.Fight += 2; scores.Flight += 1; }
    if (rightNow === "drained") scores.Freeze += 2;
    if (rightNow === "flat") scores.Shutdown += 3;
  }

  // Find winner with tiebreak: Shutdown > Fight > Flight > Freeze > Regulated
  const priority = ["Shutdown","Fight","Flight","Freeze","Regulated"];
  const maxScore = Math.max(...Object.values(scores));
  const tied = priority.filter(s => scores[s] === maxScore);
  const primary = tied[0]; // priority order handles tiebreak

  // Detect "swung between states" for PM
  const isMixed = answers.dayState === "swung";
  return { primary, scores, isMixed, reactivity: parseInt(answers.reactivity) || null };
}

// ─── CRISIS DETECTION ─────────────────────────────────────────────────────────
function checkCrisis(logs) {
  const recent7 = logs.slice(-14).filter(l => {
    const d = new Date(l.timestamp);
    const age = (Date.now() - d) / 86400000;
    return age <= 7;
  });
  const shutdownDays = [...new Set(recent7.filter(l => l.state === "Shutdown").map(l => l.timestamp.split("T")[0]))].length;
  const highReactivity = recent7.filter(l => l.reactivity >= 9).length;
  return shutdownDays >= 7 || highReactivity >= 5;
}

// ─── REUSABLE COMPONENTS ──────────────────────────────────────────────────────
function Pill({ children, active, color, onClick, style = {} }) {
  const T = useT();
  return (
    <button onClick={onClick} style={{
      padding: "11px 16px", borderRadius: 12, border: `1.5px solid ${active ? color : T.border}`,
      background: active ? `${color}18` : T.card, color: active ? color : T.text,
      fontFamily: font, fontSize: 14, fontWeight: active ? 600 : 400,
      cursor: "pointer", transition: "all .18s", textAlign: "left", width: "100%", ...style,
    }}>{children}</button>
  );
}

function Section({ children, style = {} }) {
  const T = useT();
  return <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 12, ...style }}>{children}</div>;
}

function Label({ children, style = {} }) {
  const T = useT();
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 10, fontFamily: font, ...style }}>{children}</div>;
}

function BackBtn({ onBack }) {
  const T = useT();
  return (
    <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, padding: "0 0 4px 0" }}>
      ← Back
    </button>
  );
}

function ThemeToggle() {
  const { themeMode, themeToggle } = useApp();
  const L = themeMode === "light";
  const T = useT();
  return (
    <button onClick={themeToggle} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 18, background: L ? "rgba(196,168,130,0.15)" : "rgba(255,255,255,0.07)", border: `1px solid ${L ? "rgba(196,168,130,0.35)" : "rgba(255,255,255,0.12)"}`, color: L ? "#9A7A50" : "rgba(255,255,255,0.4)", fontFamily: font, fontSize: 11.5, cursor: "pointer" }}>
      <span>{L ? "☀️" : "🌙"}</span>
      <span style={{ fontWeight: 600 }}>{L ? "Light" : "Dark"}</span>
    </button>
  );
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────

// HOME SCREEN
function HomeScreen({ onCheckIn, onTrends, onInsights, onExercise, logs, isConsultant }) {
  const { themeMode, themeToggle } = useApp();
  const T = useT();
  const todayLogs = logs.filter(l => localDateStr(l.timestamp) === todayStr());
  const hasMorning = todayLogs.some(l => l.type === "am");
  const hasEvening = todayLogs.some(l => l.type === "pm");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const latestState = todayLogs.length > 0 ? todayLogs[todayLogs.length - 1].state : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isConsultant ? 12 : 24 }}>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: ".18em", textTransform: "uppercase", color: T.subText, fontWeight: 600, marginBottom: 6 }}>Rooted Connections Collective</div>
          <h1 style={{ fontFamily: serif, fontSize: 26, color: T.headingText, lineHeight: 1.1 }}>Regulation</h1>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{greeting}.</div>
        </div>
      </div>

      {/* Consultant framing banner */}
      {isConsultant && (
        <div style={{
          padding: "12px 16px", borderRadius: 12, marginBottom: 20,
          background: "rgba(123,170,138,0.10)", border: "1px solid rgba(123,170,138,0.3)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7BAA8A", marginBottom: 3, fontFamily: font }}>Your regulation supports theirs</div>
          <div style={{ fontSize: 12.5, color: T.muted, fontFamily: font, lineHeight: 1.6 }}>
            Parents feel your nervous system before they hear your words. Checking in on yourself isn't extra — it's part of how you show up for the families you work with.
          </div>
        </div>
      )}

      {/* Today's status */}
      <Section>
        <Label>Today's Check-Ins</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {["am", "pm"].map(type => {
            const done = type === "am" ? hasMorning : hasEvening;
            const log = todayLogs.find(l => l.type === type);
            const meta = log ? STATE_META[log.state] : null;
            return (
              <div key={type} onClick={() => !done && onCheckIn(type)} style={{
                padding: "14px 16px", borderRadius: 12,
                background: done ? (meta?.bg || T.faint) : T.faint,
                border: `1.5px solid ${done ? (meta?.color || T.border) : T.border}`,
                cursor: done ? "default" : "pointer", transition: "all .2s",
              }}>
                <div style={{ fontSize: 11, color: done ? meta?.color : T.muted, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 4 }}>
                  {type === "am" ? "🌅 Morning" : "🌙 Evening"}
                </div>
                {done ? (
                  <>
                    <div style={{ fontSize: 18 }}>{meta?.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: meta?.color, marginTop: 2 }}>{log.isMixed ? `Mixed` : log.state}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Tap to check in</div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Latest state reminder */}
      {latestState && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: STATE_META[latestState]?.bg, border: `1px solid ${STATE_META[latestState]?.color}30`, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: STATE_META[latestState]?.color, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 3 }}>Last check-in</div>
          <div style={{ fontSize: 13.5, color: T.text }}>{STATE_META[latestState]?.icon} {latestState} — {VALIDATION[latestState]}</div>
        </div>
      )}

      {/* Quick exercise access */}
      <Section>
        <Label>Exercises — Available Anytime</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {Object.values(EXERCISES).map(ex => (
            <button key={ex.id} onClick={() => onExercise(ex.id, null)} style={{
              padding: "11px 13px", borderRadius: 10, border: `1px solid ${T.border}`,
              background: T.faint, fontFamily: font, fontSize: 12.5, color: T.text,
              cursor: "pointer", textAlign: "left", transition: "all .18s",
            }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{ex.title}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{ex.duration}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Nav */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
        <button onClick={onTrends} style={{
          padding: "13px", borderRadius: 12, border: `1px solid ${T.border}`,
          background: T.card, fontFamily: font, fontSize: 13.5, fontWeight: 600,
          color: T.text, cursor: "pointer",
        }}>📈 Trends</button>

        {onInsights ? (
          <button onClick={onInsights} style={{
            padding: "13px", borderRadius: 12, border: `1px solid ${T.border}`,
            background: T.card, fontFamily: font, fontSize: 13.5, fontWeight: 600,
            color: T.text, cursor: "pointer",
          }}>✦ Insights</button>
        ) : (
          <button style={{
            padding: "13px", borderRadius: 12, border: `1px solid ${T.border}`,
            background: T.faint, fontFamily: font, fontSize: 13.5, fontWeight: 600,
            color: T.muted, cursor: "default", position: "relative",
          }} title="Upgrade to Plus to unlock AI Insights">
            🔒 Insights
            <span style={{ display: "block", fontSize: 10, fontWeight: 400, color: T.muted, marginTop: 2 }}>Plus feature</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── CHECK-IN SCREEN ─────────────────────────────────────────────────────────
function CheckInScreen({ type, onComplete, onBack }) {
  const T = useT();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const AM_QUESTIONS = [
    {
      key: "body",
      label: "Body state right now",
      options: [
        { value: "calm",     label: "Calm / steady" },
        { value: "tense",    label: "Tense / tight" },
        { value: "restless", label: "Restless / buzzy" },
        { value: "heavy",    label: "Heavy / sluggish" },
        { value: "numb",     label: "Numb / disconnected" },
      ],
    },
    {
      key: "mood",
      label: "Most true this morning",
      options: [
        { value: "capable",    label: "I feel capable." },
        { value: "edge",       label: "I feel on edge." },
        { value: "overwhelmed",label: "I feel overwhelmed." },
        { value: "exhausted",  label: "I feel exhausted." },
        { value: "detached",   label: "I feel detached." },
      ],
    },
    {
      key: "reactivity",
      label: "How reactive do you feel right now?",
      type: "slider",
      min: 1, max: 10,
      leftLabel: "Steady", rightLabel: "Right on edge",
    },
    {
      key: "sleep",
      label: "Did you sleep restoratively?",
      options: [
        { value: "yes",        label: "Yes" },
        { value: "somewhat",   label: "Somewhat" },
        { value: "not_at_all", label: "Not at all" },
      ],
    },
  ];

  const PM_QUESTIONS = [
    {
      key: "dayState",
      label: "How did your nervous system feel most of today?",
      options: [
        { value: "regulated",  label: "Regulated" },
        { value: "irritable",  label: "Irritable" },
        { value: "anxious",    label: "Anxious" },
        { value: "shutdown",   label: "Shut down" },
        { value: "swung",      label: "Swung between states" },
      ],
    },
    {
      key: "childResponse",
      label: "When your child struggled today, you felt mostly:",
      options: [
        { value: "calm",          label: "Calm" },
        { value: "frustrated",    label: "Frustrated" },
        { value: "overstimulated",label: "Overstimulated" },
        { value: "withdrawn",     label: "Withdrawn" },
        { value: "guilty",        label: "Guilty" },
      ],
    },
    {
      key: "repair",
      label: "Did you repair after any rupture today?",
      options: [
        { value: "yes",       label: "Yes" },
        { value: "not_yet",   label: "Not yet" },
        { value: "none",      label: "There wasn't one" },
      ],
    },
    {
      key: "rightNow",
      label: "Right now I feel:",
      options: [
        { value: "settled", label: "Settled" },
        { value: "wired",   label: "Wired" },
        { value: "drained", label: "Drained" },
        { value: "flat",    label: "Flat" },
      ],
    },
  ];

  const questions = type === "am" ? AM_QUESTIONS : PM_QUESTIONS;
  const q = questions[step];
  const total = questions.length;
  const pct = Math.round((step / total) * 100);

  function answer(key, value) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (step < total - 1) {
      setTimeout(() => setStep(s => s + 1), 200);
    } else {
      const result = classifyState(next, type);
      onComplete({ answers: next, ...result, type, timestamp: new Date().toISOString(), id: genId() });
    }
  }

  return (
    <div>
      <BackBtn onBack={onBack} />
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontFamily: serif, fontSize: 18, color: T.headingText }}>
            {type === "am" ? "🌅 Morning Check-In" : "🌙 Evening Reflection"}
          </div>
          <span style={{ fontFamily: mono, fontSize: 12, color: T.muted }}>{step + 1}/{total}</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: T.faint }}>
          <div style={{ height: "100%", width: `${((step + 1) / total) * 100}%`, background: T.teal, borderRadius: 2, transition: "width .3s" }} />
        </div>
      </div>

      <div style={{ fontFamily: font, fontSize: 15.5, fontWeight: 600, color: T.headingText, marginBottom: 16, lineHeight: 1.4 }}>
        {q.label}
      </div>

      {q.type === "slider" ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: T.muted }}>{q.leftLabel}</span>
            <span style={{ fontSize: 12, color: T.muted }}>{q.rightLabel}</span>
          </div>
          <input
            type="range" min={q.min} max={q.max}
            value={answers[q.key] || 5}
            onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
            style={{ width: "100%", accentColor: T.teal }}
          />
          <div style={{ textAlign: "center", fontFamily: mono, fontSize: 24, fontWeight: 700, color: T.teal, marginTop: 8 }}>
            {answers[q.key] || 5}
          </div>
          <button onClick={() => answer(q.key, answers[q.key] || 5)}
            style={{ marginTop: 16, width: "100%", padding: "14px", borderRadius: 12, background: T.teal, border: "none", color: "#fff", fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Continue →
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {q.options.map(o => (
            <Pill key={o.value} active={answers[q.key] === o.value} color={T.teal}
              onClick={() => answer(q.key, o.value)}>
              {o.label}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RESULT SCREEN ─────────────────────────────────────────────────────────────
function ResultScreen({ result, onExercise, onHome, onBack }) {
  const T = useT();
  const { primary, isMixed, scores } = result;
  const meta = STATE_META[primary];
  const exercises = (STATE_EXERCISES[primary] || STATE_EXERCISES["Regulated"]).map(id => EXERCISES[id]).filter(Boolean);
  const [altOpen, setAltOpen] = useState(false);

  return (
    <div>
      <BackBtn onBack={onBack} />

      {/* Validation */}
      <div style={{ margin: "16px 0 14px", padding: "14px 17px", borderRadius: 14, background: meta.bg, border: `1px solid ${meta.color}30` }}>
        <div style={{ fontSize: 14, color: meta.color, lineHeight: 1.6, fontStyle: "italic", fontFamily: font }}>
          "{VALIDATION[primary]}"
        </div>
      </div>

      {/* State result */}
      <Section>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 32 }}>{meta.icon}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: meta.color, marginBottom: 2 }}>
              {isMixed ? "Mixed — leaning toward" : "Looks like your nervous system is in"}
            </div>
            <div style={{ fontFamily: serif, fontSize: 22, color: meta.color }}>{primary}</div>
          </div>
        </div>
        <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.65 }}>{STATE_DESCRIPTION[primary]}</div>
      </Section>

      {/* Exercise recommendations */}
      <div style={{ fontFamily: font, fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>
        A few things that may help
      </div>
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        {exercises.map(ex => (
          <button key={ex.id} onClick={() => onExercise(ex.id, primary)}
            style={{ padding: "14px 16px", borderRadius: 13, border: `1.5px solid ${meta.color}40`, background: meta.bg, textAlign: "left", cursor: "pointer", fontFamily: font, width: "100%", transition: "all .2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: T.headingText }}>{ex.title}</div>
              <span style={{ fontSize: 11, color: meta.color, background: `${meta.color}18`, borderRadius: 20, padding: "3px 9px", fontWeight: 600 }}>{ex.duration}</span>
            </div>
            <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>{ex.desc}</div>
          </button>
        ))}
      </div>

      {/* Alt states */}
      <button onClick={() => setAltOpen(!altOpen)} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12.5, color: T.muted, cursor: "pointer", textDecoration: "underline", padding: 0, marginBottom: 14 }}>
        Not sure this fits? See other states →
      </button>
      {altOpen && (
        <div style={{ display: "grid", gap: 7, marginBottom: 14 }}>
          {Object.entries(STATE_META).filter(([k]) => k !== primary).map(([k, m]) => (
            <div key={k} style={{ padding: "10px 14px", borderRadius: 10, background: m.bg, border: `1px solid ${m.color}25` }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: m.color, marginBottom: 2 }}>{m.icon} {m.label}</div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{STATE_DESCRIPTION[k].slice(0, 80)}…</div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onHome} style={{ width: "100%", padding: "13px", borderRadius: 12, background: T.faint, border: `1px solid ${T.border}`, fontFamily: font, fontSize: 13.5, color: T.muted, cursor: "pointer" }}>
        ← Back to home
      </button>
    </div>
  );
}

// ─── EXERCISE SCREEN ──────────────────────────────────────────────────────────
function ExerciseScreen({ exerciseId, preState, onComplete, onBack, onLogSession }) {
  const T = useT();
  const ex = EXERCISES[exerciseId];
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(ex.durationSec);
  const [done, setDone] = useState(false);
  const [settled, setSettled] = useState(null);
  const [favorited, setFavorited] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const meta = preState ? STATE_META[preState] : null;
  const accentColor = meta?.color || T.teal;

  // Wire audio element events once mounted
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate    = () => setElapsed(Math.floor(audio.currentTime));
    const onDurationChange = () => { if (isFinite(audio.duration) && audio.duration > 0) setDuration(Math.floor(audio.duration)); };
    const onEnded         = () => { setPlaying(false); setDone(true); };
    const onCanPlay       = () => { setAudioReady(true); setAudioError(false); if (isFinite(audio.duration) && audio.duration > 0) setDuration(Math.floor(audio.duration)); };
    const onError         = () => setAudioError(true);
    audio.addEventListener("timeupdate",     onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended",          onEnded);
    audio.addEventListener("canplay",        onCanPlay);
    audio.addEventListener("error",          onError);
    return () => {
      audio.removeEventListener("timeupdate",     onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended",          onEnded);
      audio.removeEventListener("canplay",        onCanPlay);
      audio.removeEventListener("error",          onError);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().catch(() => setAudioError(true)); setPlaying(true); }
  }

  function handleReset() {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    setPlaying(false); setElapsed(0); setDone(false); setSettled(null);
  }

  function handleScrub(e) {
    const audio = audioRef.current;
    if (!audio) return;
    const val = parseFloat(e.target.value);
    audio.currentTime = val;
    setElapsed(Math.floor(val));
  }

  function handleComplete(settledResponse) {
    setSettled(settledResponse);
    onLogSession({
      id: genId(), timestamp: new Date().toISOString(),
      exercise_id: exerciseId, duration_played: elapsed,
      completion: duration > 0 ? elapsed >= duration * 0.8 : true,
      pre_state: preState, post_settled: settledResponse,
    });
  }

  function formatTime(s) {
    if (!s && s !== 0) return "—";
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const pct = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

  return (
    <div>
      {/* Audio — no crossOrigin attr so browser sends plain request; works on real domains */}
      <audio ref={audioRef} src={ex.audioUrl} preload="metadata" />

      <BackBtn onBack={() => { if (audioRef.current) audioRef.current.pause(); onBack(); }} />

      <div style={{ textAlign: "center", margin: "20px 0 20px" }}>
        <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 8 }}>{ex.title}</div>
        <span style={{ fontSize: 11, color: accentColor, background: `${accentColor}18`, borderRadius: 20, padding: "3px 10px", fontWeight: 600, fontFamily: font }}>
          {ex.tag} · {audioReady && duration !== ex.durationSec ? formatTime(duration) : ex.duration}
        </span>
      </div>

      {/* Description */}
      <div style={{ padding: "13px 16px", borderRadius: 13, background: T.card, border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.7, fontStyle: "italic" }}>{ex.desc}</div>
      </div>

      {/* Audio error — preview sandbox blocks cross-origin audio; works fine when deployed */}
      {audioError && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: T.faint, border: `1px solid ${T.border}`, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 4 }}>Audio unavailable in preview</div>
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>The Claude preview sandbox blocks cross-origin audio. When this app is deployed to your own domain, audio will play directly from Cloudinary. You can still use the timer and description above.</div>
        </div>
      )}

      {/* Progress ring */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "4px 0 20px" }}>
        <div style={{ position: "relative", width: 150, height: 150, marginBottom: 16 }}>
          <svg width="150" height="150" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="75" cy="75" r="65" fill="none" stroke={T.faint} strokeWidth="8" />
            <circle cx="75" cy="75" r="65" fill="none" stroke={accentColor} strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 65}`}
              strokeDashoffset={`${2 * Math.PI * 65 * (1 - pct / 100)}`}
              strokeLinecap="round" style={{ transition: "stroke-dashoffset .4s" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {playing && <div style={{ fontSize: 10, color: accentColor, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 2, animation: "pulse 2s infinite" }}>playing</div>}
            <div style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: accentColor }}>{formatTime(elapsed)}</div>
            <div style={{ fontSize: 10.5, color: T.muted }}>/ {formatTime(duration)}</div>
          </div>
        </div>

        {/* Scrub bar */}
        <div style={{ width: "100%", maxWidth: 300, marginBottom: 16 }}>
          <input type="range" min={0} max={duration} value={elapsed}
            onChange={handleScrub}
            style={{ width: "100%", accentColor }} />
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {/* Rewind 10s */}
          <button onClick={() => { if (audioRef.current) { audioRef.current.currentTime = Math.max(0, elapsed - 10); setElapsed(Math.max(0, elapsed - 10)); }}}
            style={{ width: 46, height: 46, borderRadius: "50%", border: `1.5px solid ${T.border}`, background: T.card, color: T.muted, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ⟪
          </button>

          {/* Play/pause */}
          <button onClick={togglePlay} style={{
            width: 60, height: 60, borderRadius: "50%", border: "none",
            background: accentColor, color: "#fff", fontSize: 22, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 16px ${accentColor}50`,
          }}>{playing ? "⏸" : "▶"}</button>

          {/* Reset */}
          <button onClick={handleReset}
            style={{ width: 46, height: 46, borderRadius: "50%", border: `1.5px solid ${T.border}`, background: T.card, color: T.muted, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ↺
          </button>

          {/* Favorite */}
          <button onClick={() => setFavorited(!favorited)}
            style={{ width: 46, height: 46, borderRadius: "50%", border: `1.5px solid ${favorited ? "#f0b858" : T.border}`, background: favorited ? "rgba(240,184,88,0.12)" : T.card, color: favorited ? "#f0b858" : T.muted, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ★
          </button>
        </div>
      </div>

      {/* Mark complete / 5% settled check */}
      {settled === null ? (
        <div>
          <button onClick={() => { setDone(true); if (audioRef.current) audioRef.current.pause(); handleComplete(null); }}
            style={{ width: "100%", padding: "13px", borderRadius: 12, background: accentColor, border: "none", color: "#fff", fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>
            ✓ Mark Complete
          </button>

          {(elapsed > 15 || done) && (
            <div style={{ padding: "16px", borderRadius: 13, background: T.card, border: `1px solid ${T.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: T.headingText, marginBottom: 14, fontFamily: font, lineHeight: 1.5 }}>
                Do you feel 5% more settled?
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                {[{ label: "Yes 🌿", val: true, color: T.sage }, { label: "Not yet 💙", val: false, color: T.muted }].map(opt => (
                  <button key={String(opt.val)} onClick={() => handleComplete(opt.val)}
                    style={{ padding: "11px 22px", borderRadius: 10, border: `1.5px solid ${opt.color}60`, background: `${opt.color}14`, color: opt.color, fontFamily: font, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>{settled ? "🌿" : "💙"}</div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.65, marginBottom: 20, maxWidth: 320, margin: "0 auto 20px" }}>
            {settled
              ? "Even 5% is real. That's your nervous system finding its footing."
              : "That's okay. Sometimes the shift is quieter than we expect. You still showed up."}
          </div>
          <button onClick={onBack} style={{ padding: "11px 24px", borderRadius: 10, background: T.faint, border: `1px solid ${T.border}`, fontFamily: font, fontSize: 13.5, color: T.muted, cursor: "pointer" }}>
            ← Done
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TRENDS SCREEN ────────────────────────────────────────────────────────────
function TrendsScreen({ logs, exerciseLogs, onBack }) {
  const T = useT();
  const [period, setPeriod] = useState("week");

  const cutoff = period === "week" ? 7 : 30;
  const since = new Date(); since.setDate(since.getDate() - cutoff);
  const filtered = logs.filter(l => new Date(l.timestamp) >= since);
  const exFiltered = exerciseLogs.filter(l => new Date(l.timestamp) >= since);

  // Stats
  const stateCounts = filtered.reduce((acc, l) => { acc[l.state] = (acc[l.state] || 0) + 1; return acc; }, {});
  const mostCommon = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0];
  const avgReactivity = filtered.filter(l => l.reactivity).reduce((a, l) => a + l.reactivity, 0) / (filtered.filter(l => l.reactivity).length || 1);
  const repairAttempts = filtered.filter(l => l.type === "pm" && l.answers?.repair === "yes").length;
  const totalPM = filtered.filter(l => l.type === "pm").length;
  const repairRate = totalPM > 0 ? Math.round((repairAttempts / totalPM) * 100) : null;

  // Most effective exercises
  const exEffective = Object.entries(
    exFiltered.filter(e => e.post_settled === true).reduce((acc, e) => { acc[e.exercise_id] = (acc[e.exercise_id] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);

  // Build 7/30 day grid
  const days = Array.from({ length: cutoff }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (cutoff - 1 - i));
    const str = d.toISOString().split("T")[0];
    const dayLogs = filtered.filter(l => localDateStr(l.timestamp) === str);
    const am = dayLogs.find(l => l.type === "am");
    const pm = dayLogs.find(l => l.type === "pm");
    return { str, label: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }), am, pm };
  });

  return (
    <div>
      <BackBtn onBack={onBack} />
      <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText, margin: "12px 0 16px" }}>Trends</div>

      {/* Period toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["week", "month"].map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${period === p ? T.teal : T.border}`,
            background: period === p ? `${T.teal}18` : T.card, color: period === p ? T.teal : T.muted,
            fontFamily: font, fontSize: 12.5, fontWeight: period === p ? 700 : 400, cursor: "pointer",
          }}>{p === "week" ? "This Week" : "This Month"}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Section><div style={{ fontSize: 14, color: T.muted, textAlign: "center", padding: "12px 0" }}>No check-ins yet for this period. Complete a morning or evening check-in to start seeing your trends.</div></Section>
      ) : (
        <>
          {/* State grid */}
          <Section>
            <Label>Daily States</Label>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(cutoff, 7)}, 1fr)`, gap: 4, overflowX: "auto" }}>
              {days.slice(-7).map(d => (
                <div key={d.str} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: T.subText, marginBottom: 4 }}>{d.label.split(" ")[0]}</div>
                  {["am", "pm"].map(t => {
                    const log = t === "am" ? d.am : d.pm;
                    const meta = log ? STATE_META[log.state] : null;
                    return (
                      <div key={t} style={{
                        width: "100%", height: 20, borderRadius: 4, marginBottom: 3,
                        background: meta ? meta.color : T.faint,
                        border: `1px solid ${meta ? meta.color : T.border}`,
                        opacity: log ? 1 : 0.3,
                        title: meta?.label,
                      }} />
                    );
                  })}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              {Object.entries(STATE_META).map(([k, m]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: m.color }} />
                  <span style={{ fontSize: 10, color: T.muted }}>{m.label}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              { label: "Most Common State", value: mostCommon && STATE_META[mostCommon[0]] ? `${STATE_META[mostCommon[0]].icon} ${mostCommon[0]}` : mostCommon ? mostCommon[0] : "—" },
              { label: "Avg Reactivity", value: avgReactivity ? `${avgReactivity.toFixed(1)} / 10` : "—" },
              { label: "Repair Rate", value: repairRate !== null ? `${repairRate}%` : "—" },
              { label: "Check-Ins Logged", value: filtered.length },
            ].map(s => (
              <div key={s.label} style={{ padding: "13px 14px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.headingText, fontFamily: serif }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Effective exercises */}
          {exEffective.length > 0 && (
            <Section>
              <Label>Most Helpful Exercises</Label>
              {exEffective.slice(0, 3).map(([id, count]) => (
                <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.faint}` }}>
                  <span style={{ fontSize: 13.5, color: T.text }}>{EXERCISES[id]?.title || id}</span>
                  <span style={{ fontSize: 12, color: T.sage, fontWeight: 600 }}>{count}× felt settled</span>
                </div>
              ))}
            </Section>
          )}

          {/* Correlations */}
          <Section>
            <Label>You May Notice…</Label>
            {(() => {
              const notes = [];
              const lowSleepDays = filtered.filter(l => l.type === "am" && l.answers?.sleep === "not_at_all");
              const highReactDays = filtered.filter(l => l.reactivity >= 7);
              if (lowSleepDays.length >= 2 && highReactDays.length >= 2)
                notes.push("On nights with less restorative sleep, your morning reactivity may be higher. This is a very normal nervous system pattern, not a reflection of your capacity as a parent.");
              if (repairRate !== null && repairRate < 50)
                notes.push("Repair after rupture is something you're still building. That's okay — even noticing the moment is the beginning of repair.");
              if (notes.length === 0)
                notes.push("Keep logging and patterns will start to show up here. Every check-in is data that helps you understand your own nervous system better.");
              return notes.map((n, i) => <div key={i} style={{ fontSize: 13, color: T.muted, lineHeight: 1.65, marginBottom: i < notes.length - 1 ? 10 : 0 }}>{n}</div>);
            })()}
          </Section>
        </>
      )}
    </div>
  );
}

// ─── AI INSIGHTS SCREEN ───────────────────────────────────────────────────────
function InsightsScreen({ logs, exerciseLogs, onBack, onExercise }) {
  const T = useT();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function generateInsights() {
    setLoading(true); setError(null);
    const recent = logs.slice(-21);
    const recentEx = exerciseLogs.slice(-20);

    const summary = {
      checkIns: recent.length,
      states: recent.map(l => ({ date: l.timestamp.split("T")[0], type: l.type, state: l.state, reactivity: l.reactivity })),
      exercises: recentEx.map(e => ({ ex: e.exercise_id, settled: e.post_settled, date: e.timestamp.split("T")[0] })),
      repairs: recent.filter(l => l.type === "pm").map(l => ({ date: l.timestamp.split("T")[0], repair: l.answers?.repair })),
    };

    try {
      const text = await callAI({
        max_tokens: 1000,
        system: `You are the RCC Coach — a warm, grounded, nervous-system-informed support coach for parents at Rooted Connections Collective. You are generating weekly regulation insights for a parent.

Your tone is: warm, calm, validating, steady. Short sentences. No clinical jargon. No alarmism. No shame. No "you should." Speak like you're texting a parent you care about who is exhausted and trying their best.

Generate 2–4 insights from the data. Each insight must have:
1. "observation" — a gentle, non-judgmental observation (1–2 sentences)
2. "why" — why this might be happening through a nervous system lens (1–2 sentences)
3. "action" — one micro-action or exercise suggestion (1 sentence)
4. "exercise_id" — one of: body_scan, butterfly_hug, drop_shoulders, gentle_wake_up, gratitude, humming, orient, reset (or null)

Respond ONLY with valid JSON: { "insights": [...] }

Important:
- Never diagnose
- Use language like "you may notice," "it looks like," "your nervous system might be"
- End with something that reinforces competence, not fear
- Include a "disclaimer" field: "This is not medical advice. These insights are based on your logged data and are meant as supportive reflection only."`,
        messages: [{ role: "user", content: `Here is my regulation data from the last 3 weeks: ${JSON.stringify(summary)}` }],
      });
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setInsights(parsed);
    } catch (e) {
      setError("Couldn't load insights right now. Your data is safe — try again in a moment.");
    }
    setLoading(false);
  }

  useEffect(() => { if (logs.length >= 3) generateInsights(); }, []);

  return (
    <div>
      <BackBtn onBack={onBack} />
      <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText, margin: "12px 0 6px" }}>✦ AI Insights</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 20, lineHeight: 1.5 }}>Personalized reflection based on your logged data — in RCC's voice.</div>

      {logs.length < 3 ? (
        <Section>
          <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.65 }}>Complete at least 3 check-ins to unlock your first AI insight. The more you log, the more meaningful the reflection becomes.</div>
        </Section>
      ) : loading ? (
        <Section>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 22, marginBottom: 12, animation: "pulse 2s infinite" }}>✦</div>
            <div style={{ fontSize: 13.5, color: T.muted }}>Reading your data thoughtfully…</div>
          </div>
        </Section>
      ) : error ? (
        <Section>
          <div style={{ fontSize: 13.5, color: T.rose, marginBottom: 12 }}>{error}</div>
          <button onClick={generateInsights} style={{ padding: "10px 20px", borderRadius: 10, background: T.teal, border: "none", color: "#fff", fontFamily: font, fontSize: 13, cursor: "pointer" }}>Try again</button>
        </Section>
      ) : insights ? (
        <>
          {insights.insights?.map((ins, i) => (
            <div key={i} style={{ marginBottom: 14, padding: "16px 18px", borderRadius: 14, background: T.card, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 15, color: T.headingText, fontWeight: 600, lineHeight: 1.5, marginBottom: 8 }}>{ins.observation}</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 10, fontStyle: "italic" }}>{ins.why}</div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: ins.exercise_id ? 12 : 0 }}>→ {ins.action}</div>
              {ins.exercise_id && EXERCISES[ins.exercise_id] && (
                <button onClick={() => onExercise(ins.exercise_id, null)}
                  style={{ padding: "8px 16px", borderRadius: 10, background: `${T.teal}18`, border: `1px solid ${T.teal}40`, color: T.teal, fontFamily: font, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  Try: {EXERCISES[ins.exercise_id].title} ({EXERCISES[ins.exercise_id].duration}) →
                </button>
              )}
            </div>
          ))}
          {insights.disclaimer && (
            <div style={{ fontSize: 11.5, color: T.subText, lineHeight: 1.6, padding: "10px 14px", borderRadius: 10, background: T.faint, border: `1px solid ${T.border}`, marginBottom: 14 }}>
              ⓘ {insights.disclaimer}
            </div>
          )}
          <button onClick={generateInsights} style={{ width: "100%", padding: "11px", borderRadius: 12, background: T.faint, border: `1px solid ${T.border}`, fontFamily: font, fontSize: 13, color: T.muted, cursor: "pointer" }}>
            ↻ Refresh insights
          </button>
        </>
      ) : null}
    </div>
  );
}

// ─── NOTIFICATIONS SCREEN ─────────────────────────────────────────────────────
function NotificationsScreen({ prefs, onSave, onBack }) {
  const T = useT();
  const [p, setP] = useState({ amEnabled: false, pmEnabled: false, amTime: "08:00", pmTime: "20:30", ...prefs });

  function save() {
    if (p.amEnabled || p.pmEnabled) {
      Notification.requestPermission().then(perm => {
        if (perm !== "granted") alert("Enable browser notifications to receive reminders.");
      });
    }
    onSave(p);
  }

  return (
    <div>
      <BackBtn onBack={onBack} />
      <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText, margin: "12px 0 20px" }}>Reminders</div>

      {[
        { key: "am", label: "🌅 Morning Check-In", timeKey: "amTime", enabledKey: "amEnabled" },
        { key: "pm", label: "🌙 Evening Reflection", timeKey: "pmTime", enabledKey: "pmEnabled" },
      ].map(r => (
        <Section key={r.key}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: font, fontSize: 14.5, fontWeight: 600, color: T.headingText }}>{r.label}</div>
            <button onClick={() => setP(x => ({ ...x, [r.enabledKey]: !x[r.enabledKey] }))}
              style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: p[r.enabledKey] ? T.sage : T.border, cursor: "pointer", position: "relative", transition: "background .2s" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: p[r.enabledKey] ? 23 : 3, transition: "left .2s" }} />
            </button>
          </div>
          {p[r.enabledKey] && (
            <input type="time" value={p[r.timeKey]}
              onChange={e => setP(x => ({ ...x, [r.timeKey]: e.target.value }))}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.inputBg, color: T.text, fontFamily: font, fontSize: 14, colorScheme: "auto" }} />
          )}
        </Section>
      ))}

      <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>
        Reminders use your browser's notification system. You'll need to allow notifications when prompted. These are local to this device.
      </div>

      <button onClick={save} style={{ width: "100%", padding: "13px", borderRadius: 12, background: T.teal, border: "none", color: "#fff", fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        Save preferences
      </button>
    </div>
  );
}

// ─── CRISIS BANNER ────────────────────────────────────────────────────────────
function CrisisBanner() {
  const T = useT();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(192,112,112,0.12)", border: "1px solid rgba(192,112,112,0.35)", marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#C07070", marginBottom: 6 }}>You've been carrying a lot lately.</div>
      <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.6, marginBottom: 10 }}>
        When we're in shutdown or high reactivity for many days in a row, it's a signal that we need more support than self-regulation alone can offer. That's not failure — that's being human.
      </div>
      <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.6, marginBottom: 10 }}>
        Consider reaching out to your RCC consultant, a therapist, or a trusted person in your life.
        If you're in crisis: <strong style={{ color: "#C07070" }}>call or text 988</strong> (Suicide & Crisis Lifeline) or <strong style={{ color: "#C07070" }}>911</strong> for emergencies.
      </div>
      <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.muted, cursor: "pointer", textDecoration: "underline" }}>Dismiss</button>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export function RegulationModule() {
  const T = useT();
  const { currentUser, canAccessRegulationInsights } = useApp();
  const isConsultant = currentUser?.role === "consultant" || currentUser?.role === "consultant_internal" || currentUser?.role === "admin";
  const [logs, setLogs] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [notifPrefs, setNotifPrefs] = useStorage("rcc_notif_prefs", {});
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState("home");
  const [checkInType, setCheckInType] = useState("am");
  const [currentResult, setCurrentResult] = useState(null);
  const [currentExercise, setCurrentExercise] = useState({ id: null, preState: null });
  const showCrisis = checkCrisis(logs);

  // ── LOAD FROM SUPABASE ──
  useEffect(() => {
    if (!currentUser?.id) return;
    Promise.all([
      supabase.from("regulation_checkins")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("id", { ascending: true })
        .limit(200),
      supabase.from("regulation_exercise_sessions")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("id", { ascending: true })
        .limit(200),
    ]).then(([{ data: checkins, error: e1 }, { data: sessions, error: e2 }]) => {
      if (e1) console.error("checkins load error:", e1);
      if (e2) console.error("exercise sessions load error:", e2);
      // Normalize DB rows to match the shape the rest of the module expects
      setLogs((checkins || []).map(r => ({
        id: r.id,
        timestamp: r.checked_in_at || r.created_at || new Date().toISOString(),
        type: r.type,
        state: r.state,
        primary: r.state, // keep primary in sync for ResultScreen
        isMixed: r.is_mixed,
        reactivity: r.reactivity,
        answers: r.answers,
      })));
      setExerciseLogs((sessions || []).map(r => ({
        id: r.id,
        timestamp: r.checked_in_at || r.created_at || new Date().toISOString(),
        exercise_id: r.exercise_id,
        duration_played: r.duration_played,
        completion: r.completion,
        pre_state: r.pre_state,
        post_settled: r.post_settled,
      })));
      setLoading(false);
    });
  }, [currentUser?.id]);

  function startCheckIn(type) { setCheckInType(type); setScreen("checkin"); }

  async function completeCheckIn(result) {
    // result has: { primary, state, scores, isMixed, reactivity, answers, type, timestamp, id }
    const state = result.primary || result.state;
    const { error, data } = await supabase.from("regulation_checkins").insert({
      user_id: currentUser.id,
      type: result.type,
      state,
      is_mixed: result.isMixed || false,
      reactivity: result.reactivity || null,
      answers: result.answers || {},
    }).select().single();

    if (error) console.error("regulation_checkins insert error:", error);

    // Normalize — keep primary so ResultScreen works
    const normalized = {
      id: data?.id || result.id,
      timestamp: data?.created_at || result.timestamp,
      type: result.type,
      state,
      primary: state, // ResultScreen needs this
      isMixed: result.isMixed || false,
      reactivity: result.reactivity,
      answers: result.answers,
      scores: result.scores,
    };
    setLogs(prev => [...prev, normalized]);
    setCurrentResult(normalized);
    setScreen("result");
  }

  function openExercise(id, preState) { setCurrentExercise({ id, preState }); setScreen("exercise"); }

  async function logExerciseSession(session) {
    await supabase.from("regulation_exercise_sessions").insert({
      user_id: currentUser.id,
      exercise_id: session.exercise_id,
      duration_played: session.duration_played,
      completion: session.completion,
      pre_state: session.pre_state || null,
      post_settled: session.post_settled,
    });
    setExerciseLogs(prev => [...prev, session]);
  }

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: T.muted, fontFamily: font }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
      <div style={{ fontFamily: serif, fontSize: 15 }}>Loading...</div>
    </div>
  );

  return (
    
      <div style={{ color: T.text, fontFamily: font, paddingBottom: 40, transition: "background .4s, color .3s" }}>
        <div style={{ padding: "0" }}>

          {showCrisis && screen === "home" && <CrisisBanner />}

          {screen === "home" && (
            <>
              <HomeScreen
                onCheckIn={startCheckIn}
                onTrends={() => setScreen("trends")}
                onInsights={canAccessRegulationInsights ? () => setScreen("insights") : null}
                onExercise={openExercise}
                logs={logs}
                isConsultant={isConsultant}
              />
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <button onClick={() => setScreen("notifications")} style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.subText, cursor: "pointer" }}>
                  🔔 Manage reminders
                </button>
              </div>
            </>
          )}

          {screen === "checkin" && (
            <CheckInScreen
              type={checkInType}
              onComplete={completeCheckIn}
              onBack={() => setScreen("home")}
            />
          )}

          {screen === "result" && currentResult && (
            <ResultScreen
              result={currentResult}
              onExercise={openExercise}
              onHome={() => setScreen("home")}
              onBack={() => setScreen("home")}
            />
          )}

          {screen === "exercise" && currentExercise.id && (
            <ExerciseScreen
              exerciseId={currentExercise.id}
              preState={currentExercise.preState}
              onBack={() => setScreen(currentResult ? "result" : "home")}
              onLogSession={logExerciseSession}
              onComplete={() => setScreen("home")}
            />
          )}

          {screen === "trends" && (
            <TrendsScreen logs={logs} exerciseLogs={exerciseLogs} onBack={() => setScreen("home")} />
          )}

          {screen === "insights" && canAccessRegulationInsights && (
            <InsightsScreen logs={logs} exerciseLogs={exerciseLogs} onBack={() => setScreen("home")} onExercise={openExercise} />
          )}

          {screen === "insights" && !canAccessRegulationInsights && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
              <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText, marginBottom: 8 }}>AI Insights</div>
              <div style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.7, marginBottom: 20 }}>
                Upgrade to Plus to unlock AI-powered insights that help you make sense of your regulation patterns — not just the trends, but what to do with them.
              </div>
              <button onClick={() => setScreen("home")} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontFamily: font, fontSize: 13, cursor: "pointer" }}>
                ← Back
              </button>
            </div>
          )}

          {screen === "notifications" && (
            <NotificationsScreen
              prefs={notifPrefs}
              onSave={p => { setNotifPrefs(p); setScreen("home"); }}
              onBack={() => setScreen("home")}
            />
          )}
        </div>
      </div>
  );
}
