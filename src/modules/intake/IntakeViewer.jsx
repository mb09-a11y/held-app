import { useState, useEffect, useRef } from "react";
import { useT, font, serif, Card, Btn } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { callAI } from "../../lib/ai.js";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  teal:"#7B9EA8", mauve:"#A8907B", purple:"#8A7BAA", sage:"#7BAA8A",
  warm:"#AA9B7B", rose:"#A87B8A", sky:"#7B8FAA", amber:"#A89B5A",
};

const SECTIONS = [
  { id:"family",       title:"Family",         emoji:"🏡", color:C.teal   },
  { id:"child",        title:"Child",          emoji:"🌱", color:C.sage   },
  { id:"sleep",        title:"Sleep Picture",  emoji:"🌙", color:C.purple },
  { id:"environment",  title:"Environment",    emoji:"🛏️", color:C.sky    },
  { id:"daytime",      title:"Daytime",        emoji:"☀️", color:C.warm   },
  { id:"temperament",  title:"Temperament",    emoji:"✨", color:C.amber  },
  { id:"nervous_system",title:"Nervous System",emoji:"🌿", color:C.rose   },
  { id:"goals",        title:"Goals",          emoji:"💛", color:C.mauve  },
];

const TEMPERAMENT_SCALES = [
  { key:"activity",        label:"Activity level"        },
  { key:"routine",         label:"Routine consistency"   },
  { key:"sociability",     label:"Sociability"           },
  { key:"adaptability",    label:"Adaptability"          },
  { key:"intensity",       label:"Emotional intensity"   },
  { key:"sensitivity",     label:"Sensory sensitivity"   },
  { key:"mood",            label:"Overall mood"          },
  { key:"distractibility", label:"Distractibility"       },
  { key:"persistence",     label:"Persistence"           },
];

// ─── AI INSIGHTS PROMPT ───────────────────────────────────────────────────────
function buildInsightsPrompt(intake, family) {
  return `You are an expert pediatric sleep consultant trained in Polyvagal Theory, attachment science, and nervous-system-informed sleep coaching. You are reviewing an intake form for a family using the Rooted Connections Collective platform.

Your job is to generate a structured clinical summary for the consultant — NOT for the parent. This is a working document to help the consultant choose the right sleep method and approach.

Be direct, specific, and clinically grounded. No fluff. No generic advice. Speak consultant-to-consultant.

━━━ INTAKE DATA ━━━

FAMILY: ${intake.parent1_first || ""} ${intake.parent1_last || ""} ${intake.parent2_name ? `& ${intake.parent2_name}` : ""}
CHILD: ${intake.child_full_name || "Unknown"} (${intake.child_dob ? `DOB: ${intake.child_dob}` : "age unknown"})

SLEEP SITUATION:
- Location: ${intake.sleep_location || "not specified"}
- Sleep props: ${intake.sleep_props || "none listed"}
- Typical bedtime: ${intake.typical_bedtime || "not specified"}
- Wake time: ${intake.wake_time || "not specified"} | Ideal wake: ${intake.ideal_wake_time || "not specified"}
- Naps: ${intake.nap_count || "?"} naps | Schedule: ${intake.nap_schedule || "not specified"}
- Night wakings: ${intake.night_wakings_description || "not described"}
- Longest stretch: ${intake.longest_stretch || "unknown"}
- Most disruptive: ${intake.most_disruptive || "not specified"}
- Bedtime best: ${intake.bedtime_best || "not specified"}
- Bedtime worst: ${intake.bedtime_worst || "not specified"}
- Consistency capacity (1–5): ${intake.consistency_capacity || "not rated"}
- Stress/gag/vomit history: ${intake.stress_gag_vomit ? "YES" : "No"}

ENVIRONMENT:
- Room darkness (1–10): ${intake.room_darkness || "?"}
- Screen time before bed: ${intake.screen_time ? "Yes" : "No"}
- Room sharing: ${intake.room_sharing ? "Yes" : "No"}
- Siblings waking: ${intake.siblings_waking ? "Yes" : "No"}
- Daily schedule: ${intake.daily_schedule || "not provided"}
- Final wake window: ${intake.final_wake_window || "not provided"}

TEMPERAMENT (1–5 scale):
${TEMPERAMENT_SCALES.map(s => `- ${s.label}: ${intake[s.key] || "?"}/5`).join("\n")}

NERVOUS SYSTEM & HISTORY:
- Pregnancy/birth: ${intake.ns_birth_body || "not described"}
- Pregnancy overwhelm: ${intake.ns_pregnancy_overwhelm || "not described"}
- Early attunement: ${intake.ns_attunement ? "Good" : "Challenges noted"}
- Medical events: ${intake.ns_medical_events || "none listed"}
- Unresolved stress: ${intake.ns_unresolved || "none listed"}
- Parent anxiety: ${intake.ns_parent_anxiety ? "Yes — noted" : "No"}
- Family MH history: ${intake.ns_family_mh_history || "not provided"}
- Postpartum concerns: ${intake.ns_postpartum_concerns ? "Yes" : "No"}
- Postpartum supported: ${intake.ns_postpartum_supported ? "Yes" : "No"}

CHILD HEALTH:
- Health concerns: ${intake.health_concerns || "none"}
- Milestones on track: ${intake.milestones_on_track ? "Yes" : "Concerns noted"}
- Milestones notes: ${intake.milestones_notes || "none"}
- Feeding type: ${intake.feeding_type || "not specified"}
- Daily intake: ${intake.daily_intake_oz || "?"}oz
- Foods: ${intake.foods_eating || "not specified"}
- Feeding constraints: ${intake.feeding_constraints || "none"}

PARENT GOALS:
- Main challenges: ${intake.sleep_challenges || "not specified"}
- Non-negotiables: ${intake.non_negotiables || "none listed"}
- Magic wand wish: ${intake.magic_wand || "not specified"}
- Goals: ${intake.goals || "not specified"}
- Anything else: ${intake.anything_else || "nothing additional"}

━━━ YOUR RESPONSE FORMAT ━━━

Respond in exactly this structure:

## 🔍 Clinical Summary
2–3 sentences: what's the core picture here? What's driving the sleep challenges?

## 🧠 Nervous System Read
What does the NS data tell you? Flag anything that needs extra sensitivity or could complicate the process.

## 📊 Temperament Profile
Synthesize the temperament scores into 2–3 sentences. What type of child is this? What does that mean for method selection?

## 🌙 Recommended Sleep Method
State your recommendation clearly. Pick from: Ferber/Graduated Extinction, Chair Method, Fading Method, Pick Up Put Down, Gentle Removal, Extinction (full CIO), or a hybrid approach.
Then explain WHY in 3–5 sentences using the specific intake data.

## ⚠️ Flags & Considerations
Bullet list of anything the consultant should watch for, address first, or handle with extra care.

## 📋 Suggested First Session Focus
What should the consultant prioritize in the first consultation call with this family?`;
}

// ─── AI CALL ─────────────────────────────────────────────────────────────────
async function generateInsights(intake, family) {
  const prompt = buildInsightsPrompt(intake, family);
  return await callAI({ max_tokens: 1200, messages: [{ role: "user", content: prompt }] });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function yesNo(val) {
  if (val === true || val === "true") return "Yes";
  if (val === false || val === "false") return "No";
  return val || "—";
}

function Field({ label, value, fullWidth }) {
  const T = useT();
  if (!value && value !== 0) return null;
  return (
    <div style={{
      gridColumn: fullWidth ? "1 / -1" : undefined,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: T.muted, marginBottom: 3, fontFamily: font }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: T.text, fontFamily: font, lineHeight: 1.6 }}>
        {String(value)}
      </div>
    </div>
  );
}

function SectionBlock({ emoji, title, color, children }) {
  const T = useT();
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 16, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", background: `${color}18`,
          border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <span style={{ fontFamily: serif, fontSize: 16, color: T.headingText, flex: 1 }}>{title}</span>
        <span style={{ color: T.muted, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function TemperamentBar({ label, value }) {
  const T = useT();
  const pct = ((value - 1) / 4) * 100;
  return (
    <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: T.muted, fontFamily: font }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: font }}>{value}/5</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: T.faint, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: C.amber, transition: "width .3s" }} />
      </div>
    </div>
  );
}

// ─── INSIGHTS RENDERER (parses markdown-ish sections) ────────────────────────
function InsightsDisplay({ text }) {
  const T = useT();
  if (!text) return null;

  const sections = text.split(/\n## /).map((s, i) => i === 0 ? s.replace(/^## /, "") : s);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sections.map((section, i) => {
        const lines = section.split("\n");
        const heading = lines[0];
        const body = lines.slice(1).join("\n").trim();
        if (!heading && !body) return null;
        return (
          <div key={i} style={{ borderRadius: 12, background: `${C.purple}10`, border: `1px solid ${C.purple}25`, padding: "14px 16px" }}>
            {heading && (
              <div style={{ fontFamily: serif, fontSize: 15, color: T.headingText, marginBottom: 8 }}>
                {heading}
              </div>
            )}
            <div style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {body}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function IntakeViewer({ family, onBack }) {
  const T = useT();
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("intake");

  // Notes state
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);

  // AI insights state
  const [insights, setInsights] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");

  // PDF export
  const [exporting, setExporting] = useState(false);



  const notesTimer = useRef(null);

  // ── LOAD INTAKE + NOTES ──
  useEffect(() => {
    if (!family?.id) return;
    setLoading(true);

    Promise.all([
      supabase.from("intake_responses").select("*").eq("family_id", family.id).maybeSingle(),
      supabase.from("consultant_notes").select("*").eq("family_id", family.id).maybeSingle(),
    ]).then(([{ data: intakeData }, { data: notesData }]) => {
      setIntake(intakeData || {});
      setNotes(notesData?.notes || "");
      if (notesData?.ai_insights) setInsights(notesData.ai_insights);
      setLoading(false);
    });
  }, [family?.id]);

  // ── AUTO-SAVE NOTES ──
  function handleNotesChange(val) {
    setNotes(val);
    setNotesSaved(false);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setNotesSaving(true);
      await supabase.from("consultant_notes").upsert(
        { family_id: family.id, notes: val, updated_at: new Date().toISOString() },
        { onConflict: "family_id" }
      );
      setNotesSaving(false);
      setNotesSaved(true);
    }, 1000);
  }

  // ── GENERATE AI INSIGHTS ──
  async function handleGenerateInsights() {
    if (!intake) return;
    setInsightsLoading(true);
    setInsightsError("");
    try {
      const result = await generateInsights(intake, family);
      setInsights(result);
      // Save insights to Supabase so they persist
      await supabase.from("consultant_notes").upsert(
        { family_id: family.id, notes, ai_insights: result, updated_at: new Date().toISOString() },
        { onConflict: "family_id" }
      );
    } catch (e) {
      setInsightsError("Failed to generate insights. Check your API key and try again.");
    } finally {
      setInsightsLoading(false);
    }
  }

  // ── PRINT / PDF EXPORT ──
  function handleExport() {
    window.print();
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: T.muted, fontFamily: font }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🌿</div>
        Loading intake...
      </div>
    );
  }

  if (!intake || Object.keys(intake).length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: T.muted, fontFamily: font }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
        <div style={{ fontFamily: serif, fontSize: 18, marginBottom: 8, color: T.headingText }}>No intake yet</div>
        <div style={{ fontSize: 13 }}>This family hasn't completed their intake form.</div>
        {onBack && (
          <button onClick={onBack} style={{ marginTop: 20, background: "none", border: "none", color: T.teal, fontFamily: font, fontSize: 13, cursor: "pointer" }}>
            ← Back
          </button>
        )}
      </div>
    );
  }

  const TABS = [
    { id: "intake", label: "Intake", icon: "📋" },
    { id: "notes", label: "My Notes", icon: "✏️" },
    { id: "insights", label: "AI Insights", icon: "🧠" },
  ];

  return (
    <div style={{
      fontFamily: font, color: T.text,
      flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch",
      padding: "0 0 80px", boxSizing: "border-box",
    }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer", padding: 0 }}>
              ← Back
            </button>
          )}
          <div>
            <h1 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, margin: 0 }}>
              {family?.display_name || family?.invite_email || "Family"} — Intake
            </h1>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
              {intake.child_full_name || "Child name not provided"}
              {intake.child_dob ? ` · DOB: ${intake.child_dob}` : ""}
            </div>
          </div>
        </div>
        <button
          onClick={handleExport}
          style={{
            padding: "8px 14px", borderRadius: 10, border: `1px solid ${T.border}`,
            background: T.card, color: T.muted, fontFamily: font, fontSize: 12,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          🖨️ Print / Export PDF
        </button>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display: "flex", gap: 4, background: T.faint, borderRadius: 12, padding: 4, marginBottom: 24 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: "9px 4px", borderRadius: 9, border: "none",
              fontFamily: font, fontSize: 13,
              fontWeight: activeTab === t.id ? 700 : 400,
              background: activeTab === t.id ? `${C.teal}26` : "transparent",
              color: activeTab === t.id ? C.teal : T.muted,
              cursor: "pointer", transition: "all .2s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── INTAKE TAB ── */}
      {activeTab === "intake" && (
        <div>
          {/* Family */}
          <SectionBlock emoji="🏡" title="Family" color={C.teal}>
            <Field label="Parent 1" value={[intake.parent1_first, intake.parent1_last].filter(Boolean).join(" ")} />
            <Field label="Parent 2" value={intake.parent2_name} />
            <Field label="Email" value={intake.email} />
            <Field label="Phone" value={intake.phone} />
          </SectionBlock>

          {/* Child */}
          <SectionBlock emoji="🌱" title="Child" color={C.sage}>
            <Field label="Full name" value={intake.child_full_name} />
            <Field label="Nickname" value={intake.child_nickname} />
            <Field label="Date of birth" value={intake.child_dob} />
            <Field label="Feeding type" value={intake.feeding_type} />
            <Field label="Daily intake" value={intake.daily_intake_oz ? `${intake.daily_intake_oz}oz` : null} />
            <Field label="Foods eating" value={intake.foods_eating} />
            <Field label="Feeding constraints" value={intake.feeding_constraints} fullWidth />
            <Field label="Health concerns" value={intake.health_concerns} fullWidth />
            <Field label="Pediatrician seen" value={yesNo(intake.pediatrician_seen)} />
            <Field label="Pediatrician" value={intake.pediatrician_name} />
            <Field label="Milestones on track" value={yesNo(intake.milestones_on_track)} />
            <Field label="Milestones notes" value={intake.milestones_notes} fullWidth />
            <Field label="Child personality" value={intake.child_personality} fullWidth />
            <Field label="Quality time with parent" value={yesNo(intake.parent_quality_time)} />
            <Field label="Outside time" value={intake.outside_time} />
          </SectionBlock>

          {/* Sleep */}
          <SectionBlock emoji="🌙" title="Sleep Picture" color={C.purple}>
            <Field label="Sleep location" value={intake.sleep_location} />
            <Field label="Sleep props" value={intake.sleep_props} fullWidth />
            <Field label="Nap count" value={intake.nap_count} />
            <Field label="Nap schedule" value={intake.nap_schedule} fullWidth />
            <Field label="Typical bedtime" value={intake.typical_bedtime} />
            <Field label="Current wake time" value={intake.wake_time} />
            <Field label="Ideal wake time" value={intake.ideal_wake_time} />
            <Field label="Longest stretch" value={intake.longest_stretch} />
            <Field label="Night wakings" value={intake.night_wakings_description} fullWidth />
            <Field label="Most disruptive" value={intake.most_disruptive} fullWidth />
            <Field label="Bedtime best" value={intake.bedtime_best} fullWidth />
            <Field label="Bedtime worst" value={intake.bedtime_worst} fullWidth />
            <Field label="Stress/gag/vomit" value={yesNo(intake.stress_gag_vomit)} />
            <Field label="Room sharing" value={yesNo(intake.room_sharing)} />
            <Field label="Siblings waking" value={yesNo(intake.siblings_waking)} />
            <Field label="Consistency capacity (1–5)" value={intake.consistency_capacity} />
          </SectionBlock>

          {/* Environment */}
          <SectionBlock emoji="🛏️" title="Sleep Environment" color={C.sky}>
            <Field label="Room darkness (1–10)" value={intake.room_darkness} />
            <Field label="Screen time before bed" value={yesNo(intake.screen_time)} />
            <Field label="Daily schedule" value={intake.daily_schedule} fullWidth />
            <Field label="Final wake window" value={intake.final_wake_window} />
          </SectionBlock>

          {/* Temperament */}
          <SectionBlock emoji="✨" title="Temperament" color={C.amber}>
            {TEMPERAMENT_SCALES.map(s => (
              <TemperamentBar key={s.key} label={s.label} value={intake[s.key] || 3} />
            ))}
          </SectionBlock>

          {/* Nervous System */}
          <SectionBlock emoji="🌿" title="Nervous System" color={C.rose}>
            <Field label="Pregnancy/birth" value={intake.ns_birth_body} fullWidth />
            <Field label="Pregnancy overwhelm" value={intake.ns_pregnancy_overwhelm} fullWidth />
            <Field label="Early attunement" value={yesNo(intake.ns_attunement)} />
            <Field label="Parent anxiety" value={yesNo(intake.ns_parent_anxiety)} />
            <Field label="Postpartum concerns" value={yesNo(intake.ns_postpartum_concerns)} />
            <Field label="Postpartum supported" value={yesNo(intake.ns_postpartum_supported)} />
            <Field label="Medical events" value={intake.ns_medical_events} fullWidth />
            <Field label="Unresolved stress" value={intake.ns_unresolved} fullWidth />
            <Field label="Family MH history" value={intake.ns_family_mh_history} fullWidth />
          </SectionBlock>

          {/* Goals */}
          <SectionBlock emoji="💛" title="Goals" color={C.mauve}>
            <Field label="Sleep challenges" value={intake.sleep_challenges} fullWidth />
            <Field label="Non-negotiables" value={intake.non_negotiables} fullWidth />
            <Field label="Magic wand wish" value={intake.magic_wand} fullWidth />
            <Field label="Goals" value={intake.goals} fullWidth />
            <Field label="Anything else" value={intake.anything_else} fullWidth />
          </SectionBlock>
        </div>
      )}

      {/* ── NOTES TAB ── */}
      {activeTab === "notes" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontFamily: serif, fontSize: 18, color: T.headingText }}>Consultant Notes</div>
            <div style={{ fontSize: 12, color: T.muted, fontFamily: font }}>
              {notesSaving ? "Saving..." : notesSaved ? "✓ Saved" : ""}
            </div>
          </div>
          <div style={{ fontSize: 13, color: T.muted, fontFamily: font, marginBottom: 16, lineHeight: 1.6 }}>
            Use this space to jot down your working notes — method considerations, red flags, observations, anything you need to reference during your consultation call. Auto-saves as you type.
          </div>
          <textarea
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            placeholder="e.g. Leaning toward Fading Method given low consistency capacity (3/5) and high sensitivity scores. Need to address the nursing-to-sleep prop first. Mom mentioned anxiety — pace this carefully..."
            style={{
              width: "100%", minHeight: 320, padding: "14px 16px",
              borderRadius: 12, border: `1.5px solid ${T.border}`,
              background: T.inputBg, color: T.text, fontFamily: font,
              fontSize: 13.5, lineHeight: 1.7, resize: "vertical",
              outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = C.teal}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>
      )}

      {/* ── AI INSIGHTS TAB ── */}
      {activeTab === "insights" && (
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: serif, fontSize: 18, color: T.headingText, marginBottom: 6 }}>AI Clinical Insights</div>
              <div style={{ fontSize: 13, color: T.muted, fontFamily: font, lineHeight: 1.6, maxWidth: 480 }}>
                Generates a structured clinical summary based on this family's intake — including a recommended sleep method, nervous system read, temperament profile, and flags for your consultation.
              </div>
            </div>
            <Btn
              onClick={handleGenerateInsights}
              disabled={insightsLoading}
              style={{ background: insightsLoading ? undefined : C.purple, minWidth: 160, flexShrink: 0 }}
            >
              {insightsLoading ? "Analyzing..." : insights ? "🔄 Regenerate" : "🧠 Generate Insights"}
            </Btn>
          </div>

          {insightsError && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.rose}15`, border: `1px solid ${C.rose}30`, color: C.rose, fontFamily: font, fontSize: 13, marginBottom: 16 }}>
              {insightsError}
            </div>
          )}

          {insightsLoading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontFamily: font }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🧠</div>
              <div>Analyzing intake data...</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>This takes about 10–15 seconds</div>
            </div>
          )}

          {insights && !insightsLoading && (
            <InsightsDisplay text={insights} />
          )}

          {!insights && !insightsLoading && !insightsError && (
            <div style={{
              textAlign: "center", padding: "48px 24px",
              borderRadius: 14, border: `2px dashed ${T.border}`,
              color: T.muted, fontFamily: font,
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
              <div style={{ fontFamily: serif, fontSize: 16, color: T.headingText, marginBottom: 8 }}>No insights yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                Click "Generate Insights" to get an AI-powered clinical summary,<br />
                method recommendation, and flags for this family.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
