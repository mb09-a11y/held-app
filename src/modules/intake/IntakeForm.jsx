import { useState, useEffect, useCallback, useRef } from "react";
import { useT, font, serif, mono } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const C = {
  teal:"#7B9EA8", mauve:"#A8907B", purple:"#8A7BAA", sage:"#7BAA8A",
  warm:"#AA9B7B", rose:"#A87B8A", sky:"#7B8FAA", amber:"#A89B5A",
};

const SLEEP_LOCATIONS = [
  "Crib in own room", "Crib in parents' room", "Co-sleeping (same bed)",
  "Floor bed", "Bassinet", "Swing or bouncer", "Other",
];

const SLEEP_PROPS = [
  "Nursing/feeding to sleep", "Pacifier", "Rocking or bouncing",
  "Being held", "Motion (car, stroller)", "Parent lying next to them",
  "White noise", "Specific toy or item", "Nothing — self-settles", "Other",
];

const TEMPERAMENT_SCALES = [
  { key:"activity", label:"My child is always on the move and enjoys physical activity.", left:"Never", right:"Always" },
  { key:"routine", label:"My child has consistent daily routines for eating and sleeping.", left:"Never", right:"Always" },
  { key:"sociability", label:"My child eagerly engages with new people, situations, or experiences.", left:"Rarely", right:"Always" },
  { key:"adaptability", label:"My child quickly adjusts to changes in routines or environments.", left:"Never", right:"Always" },
  { key:"intensity", label:"My child reacts strongly to situations, whether positively or negatively.", left:"Never", right:"Always" },
  { key:"sensitivity", label:"My child is highly sensitive to sensory input, such as loud noises or bright lights.", left:"Never", right:"Always" },
  { key:"mood", label:"My child generally has a cheerful and positive mood.", left:"Never", right:"Always" },
  { key:"distractibility", label:"My child is easily distracted by external stimuli.", left:"Never", right:"Always" },
  { key:"persistence", label:"My child focuses on tasks and sees them through to completion.", left:"Never", right:"Always" },
];

const SECTIONS = [
  { id:"family", title:"Your family", subtitle:"Let's start with the basics.", color:C.teal, emoji:"🏡" },
  { id:"child", title:"About your child", subtitle:"Tell us about who we're helping.", color:C.sage, emoji:"🌱" },
  { id:"sleep", title:"Sleep picture", subtitle:"What's actually happening at night and during the day.", color:C.purple, emoji:"🌙" },
  { id:"environment", title:"Sleep environment", subtitle:"The setup matters more than most people realize.", color:C.sky, emoji:"🛏️" },
  { id:"daytime", title:"Daytime & schedule", subtitle:"Sleep starts long before bedtime.", color:C.warm, emoji:"☀️" },
  { id:"temperament", title:"Temperament", subtitle:"Help us understand how your child experiences the world.", color:C.amber, emoji:"✨" },
  { id:"nervous_system", title:"Nervous system", subtitle:"This is the heart of our approach — and the most important section.", color:C.rose, emoji:"🌿" },
  { id:"goals", title:"Your goals", subtitle:"What does success look like for your family?", color:C.mauve, emoji:"💛" },
];

const BLANK = {
  parent1_first:"", parent1_last:"", email:"", phone:"",
  parent2_name:"",
  child_full_name:"", child_nickname:"", child_dob:"",
  child_photo_url: null,

  health_concerns:"",
  pediatrician_seen: null,
  pediatrician_name:"",
  milestones_on_track: null,
  milestones_notes:"",

  daily_intake_oz:"",
  feeding_type:"",
  foods_eating:"",
  feeding_constraints:"",

  child_personality:"",
  parent_quality_time: null,
  outside_time:"",

  sleep_location:"",
  sleep_location_other:"",
  sleep_props:[],
  sleep_props_other:"",
  nap_schedule:"",
  nap_count:"",
  typical_bedtime:"",
  wake_time:"",
  ideal_wake_time:"",
  bedtime_best:"",
  bedtime_worst:"",
  night_wakings_description:"",
  longest_stretch:"",
  most_disruptive:"",

  stress_gag_vomit: null,
  room_sharing: null,
  siblings_waking: null,
  consistency_capacity: 3,

  room_darkness: 5,
  screen_time: null,
  daily_schedule:"",
  final_wake_window:"",

  activity:3, routine:3, sociability:3, adaptability:3,
  intensity:3, sensitivity:3, mood:3, distractibility:3, persistence:3,

  ns_pregnancy_overwhelm:"",
  ns_attunement: null,
  ns_birth_body:"",
  ns_medical_events:"",
  ns_unresolved:"",
  ns_parent_anxiety: null,
  ns_family_mh_history:"",
  ns_postpartum_concerns: null,
  ns_postpartum_supported: null,

  goals:"",
  sleep_challenges:"",
  non_negotiables:"",
  magic_wand:"",
  anything_else:"",
};

function mapFormToIntakeResponse(data, familyId) {
  const sleepLocation =
    data.sleep_location === "Other"
      ? data.sleep_location_other || "Other"
      : data.sleep_location || null;

  const propsString = data.sleep_props?.length
    ? data.sleep_props
        .map((p) => (p === "Other" ? `Other: ${data.sleep_props_other || ""}` : p))
        .join(", ")
    : null;

  const parentAnxietyMap = { often: 5, sometimes: 3, rarely: 1 };

  return {
    family_id: familyId,

    // Parent & family info
    parent1_first: data.parent1_first || null,
    parent1_last: data.parent1_last || null,
    parent2_name: data.parent2_name || null,
    phone: data.phone || null,
    child_full_name: data.child_full_name || null,
    child_nickname: data.child_nickname || null,
    child_dob: data.child_dob || null,
    child_photo_url: data.child_photo_url || null,

    // Health & development
    health_concerns: data.health_concerns && data.health_concerns !== false ? data.health_concerns : null,
    milestones_on_track: data.milestones_on_track ?? null,
    milestones_notes: data.milestones_notes || null,
    pediatrician_seen: data.pediatrician_seen ?? null,
    pediatrician_name: data.pediatrician_name || null,

    // Feeding
    daily_intake_oz: data.daily_intake_oz || null,
    feeding_type: data.feeding_type || null,
    foods_eating: data.foods_eating || null,
    feeding_constraints: data.feeding_constraints || null,

    // Child personality & routine
    child_personality: data.child_personality || null,
    parent_quality_time: data.parent_quality_time ?? null,
    outside_time: data.outside_time || null,

    // Sleep details
    current_sleep_location: sleepLocation,
    sleep_props: propsString,
    nap_schedule: data.nap_schedule || null,
    nap_count: data.nap_count || null,
    typical_bedtime: data.typical_bedtime || null,
    wake_time: data.wake_time || null,
    ideal_wake_time: data.ideal_wake_time || null,
    bedtime_best: data.bedtime_best || null,
    bedtime_worst: data.bedtime_worst || null,
    night_wakings_description: data.night_wakings_description || null,
    night_wakings: data.night_wakings_description || null,
    longest_stretch: data.longest_stretch || null,
    most_disruptive: data.most_disruptive || null,

    // Sleep environment
    room_darkness: data.room_darkness ? Number(data.room_darkness) : null,
    screen_time: data.screen_time === false ? "none" : data.screen_time || null,
    daily_schedule: data.daily_schedule || null,
    final_wake_window: data.final_wake_window || null,

    // Temperament
    temperament_activity: data.activity ? Number(data.activity) : null,
    temperament_routine: data.routine ? Number(data.routine) : null,
    temperament_sociability: data.sociability ? Number(data.sociability) : null,
    temperament_adaptability: data.adaptability ? Number(data.adaptability) : null,
    temperament_intensity: data.intensity ? Number(data.intensity) : null,
    temperament_sensitivity: data.sensitivity ? Number(data.sensitivity) : null,
    temperament_mood: data.mood ? Number(data.mood) : null,
    temperament_distractibility: data.distractibility ? Number(data.distractibility) : null,

    // Derived temperament scores (existing columns)
    sensitivity_to_change: data.adaptability ? 6 - Number(data.adaptability) : null,
    escalation_speed: data.intensity ? Number(data.intensity) : null,
    stimulation_needs: data.activity ? Number(data.activity) : null,
    persistence: data.persistence ? Number(data.persistence) : null,

    // Sleep environment booleans
    stress_gag_vomit: data.stress_gag_vomit ?? null,
    room_sharing: data.room_sharing ?? null,
    siblings_waking: data.siblings_waking ?? null,
    consistency_capacity: data.consistency_capacity ? Number(data.consistency_capacity) : null,

    // Nervous system
    ns_pregnancy_overwhelm: data.ns_pregnancy_overwhelm || null,
    ns_attunement: data.ns_attunement || null,
    ns_birth_body: data.ns_birth_body || null,
    ns_medical_events: data.ns_medical_events || null,
    ns_unresolved: data.ns_unresolved || null,
    ns_family_mh_history: data.ns_family_mh_history || null,
    closeness_to_settle: data.ns_attunement === "yes" ? 5 : data.ns_attunement === "sometimes" ? 3 : data.ns_attunement === "no" ? 1 : null,

    // Parent mental health
    parent_anxiety: data.ns_parent_anxiety ? parentAnxietyMap[data.ns_parent_anxiety] ?? null : null,
    postpartum_concerns: data.ns_postpartum_concerns ?? null,
    postpartum_supported: data.ns_postpartum_supported || null,

    // Goals
    goals: data.goals || null,
    sleep_challenges: data.sleep_challenges || null,
    non_negotiables: data.non_negotiables || null,
    magic_wand: data.magic_wand || null,
    anything_else: data.anything_else || null,

    submitted_at: new Date().toISOString(),
  };
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function FieldLabel({ children, required, muted }) {
  const T = useT();
  return (
    <div style={{ fontSize:11.5, fontWeight:700, color:T.muted, letterSpacing:".07em",
      textTransform:"uppercase", marginBottom:8, fontFamily:font, lineHeight:1.4 }}>
      {children}{required && <span style={{ color:C.rose, marginLeft:4 }}>*</span>}
      {muted && <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, marginLeft:6, fontSize:11, opacity:.7 }}>{muted}</span>}
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, required, type="text", muted }) {
  const T = useT();
  const [focused, setFocused] = useState(false);
  const base = {
    width:"100%", padding:"11px 13px", borderRadius:10, fontFamily:font, fontSize:13.5,
    background:T.inputBg, color:T.text, outline:"none", boxSizing:"border-box",
    border:`1.5px solid ${focused ? C.teal : T.border}`, transition:"border .2s",
  };
  return (
    <div style={{ marginBottom:16 }}>
      {label && <FieldLabel required={required} muted={muted}>{label}</FieldLabel>}
      <input type={type} value={value ?? ""} placeholder={placeholder || ""}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={base} />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows=3, required, muted }) {
  const T = useT();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:16 }}>
      {label && <FieldLabel required={required} muted={muted}>{label}</FieldLabel>}
      <textarea value={value ?? ""} placeholder={placeholder || ""} rows={rows}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width:"100%", padding:"11px 13px", borderRadius:10, fontFamily:font, fontSize:13.5,
          background:T.inputBg, color:T.text, outline:"none", boxSizing:"border-box", resize:"vertical",
          lineHeight:1.6, border:`1.5px solid ${focused ? C.teal : T.border}`, transition:"border .2s" }} />
    </div>
  );
}

function YesNo({ label, value, onChange, options, sublabel }) {
  const T = useT();
  const opts = options || [{ label:"Yes", value:true }, { label:"No", value:false }];
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:14, fontWeight:600, color:T.headingText, marginBottom:6, lineHeight:1.5, fontFamily:font }}>{label}</div>
      {sublabel && <div style={{ fontSize:12, color:T.muted, marginBottom:10, lineHeight:1.5, fontStyle:"italic" }}>{sublabel}</div>}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {opts.map(o => {
          const active = value === o.value;
          return (
            <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}
              style={{ padding:"9px 18px", borderRadius:20, border:`1.5px solid ${active ? C.teal : T.border}`,
                background:active ? `${C.teal}20` : "transparent", color:active ? C.teal : T.muted,
                fontFamily:font, fontSize:13, fontWeight:active?700:400, cursor:"pointer", transition:"all .18s" }}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiSelect({ label, options, selected, onChange, allowOther, otherValue, onOtherChange }) {
  const T = useT();
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(x=>x!==v) : [...selected, v]);
  return (
    <div style={{ marginBottom:18 }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {options.map(o => {
          const active = selected.includes(o);
          return (
            <button key={o} type="button" onClick={() => toggle(o)}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 13px", borderRadius:10,
                border:`1.5px solid ${active ? C.teal : T.border}`, background:active?`${C.teal}14`:"transparent",
                textAlign:"left", cursor:"pointer", transition:"all .18s" }}>
              <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${active?C.teal:T.border}`,
                background:active?C.teal:"transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .18s" }}>
                {active && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize:13.5, color:active?T.text:T.muted, fontFamily:font, fontWeight:active?600:400 }}>{o}</span>
            </button>
          );
        })}
        {allowOther && selected.includes("Other") && (
          <input value={otherValue ?? ""} onChange={e => onOtherChange(e.target.value)}
            placeholder="Please describe…" style={{ width:"100%", padding:"10px 13px", borderRadius:10, fontFamily:font,
              fontSize:13.5, background:T.inputBg, color:T.text, border:`1.5px solid ${C.teal}`, outline:"none", boxSizing:"border-box", marginTop:4 }}/>
        )}
      </div>
    </div>
  );
}

function SingleSelect({ label, options, value, onChange }) {
  const T = useT();
  return (
    <div style={{ marginBottom:18 }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {options.map(o => {
          const active = value === o;
          return (
            <button key={o} type="button" onClick={() => onChange(o)}
              style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 13px", borderRadius:10,
                border:`1.5px solid ${active?C.teal:T.border}`, background:active?`${C.teal}14`:"transparent",
                textAlign:"left", cursor:"pointer", transition:"all .18s" }}>
              <div style={{ width:10, height:10, borderRadius:"50%", border:`2px solid ${active?C.teal:T.border}`,
                background:active?C.teal:"transparent", flexShrink:0, transition:"all .18s" }}/>
              <span style={{ fontSize:13.5, color:active?T.text:T.muted, fontFamily:font, fontWeight:active?600:400 }}>{o}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SliderScale({ label, value, onChange, leftLabel, rightLabel }) {
  const T = useT();
  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ fontSize:13.5, fontWeight:600, color:T.headingText, marginBottom:10, lineHeight:1.5, fontFamily:font }}>{label}</div>
      <div style={{ position:"relative", marginBottom:8 }}>
        <input type="range" min={1} max={5} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width:"100%", accentColor:C.teal }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, color:T.muted, fontFamily:font, maxWidth:"40%", lineHeight:1.3 }}>{leftLabel}</span>
        <span style={{ fontSize:13, fontWeight:700, color:C.teal, fontFamily:mono }}>{value}</span>
        <span style={{ fontSize:11, color:T.muted, fontFamily:font, maxWidth:"40%", textAlign:"right", lineHeight:1.3 }}>{rightLabel}</span>
      </div>
    </div>
  );
}

function DarknessScale({ value, onChange }) {
  const T = useT();
  const levels = Array.from({ length: 10 }, (_, i) => ({ v: i + 1 }));
  return (
    <div style={{ marginBottom:20 }}>
      <FieldLabel>How dark is your child's room on a scale of 1–10? <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(10 = can't see anything)</span></FieldLabel>
      <div style={{ display:"flex", gap:5, alignItems:"flex-end", marginBottom:6 }}>
        {levels.map(l => (
          <div key={l.v} onClick={() => onChange(l.v)} style={{ flex:1, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <div style={{ width:"100%", height: l.v === value ? 28 : 20, borderRadius:4,
              background: l.v <= value ? C.purple : T.faint,
              opacity: l.v <= value ? (0.3 + l.v * 0.07) : 0.4,
              transition:"all .18s", border: l.v === value ? `2px solid ${C.purple}` : "2px solid transparent" }}/>
            <span style={{ fontSize:9, color:T.muted, fontFamily:mono }}>{l.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NervousSystemCard({ children }) {
  return (
    <div style={{ background:`${C.rose}0a`, border:`1px solid ${C.rose}28`, borderRadius:14, padding:"16px 18px", marginBottom:20 }}>
      {children}
    </div>
  );
}

function SectionDots({ sections, current, onJump, completedSections }) {
  const T = useT();
  return (
    <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:28, flexWrap:"wrap" }}>
      {sections.map((s, i) => {
        const done = completedSections.has(s.id);
        const active = current === i;
        return (
          <button key={s.id} type="button" onClick={() => onJump(i)}
            title={s.title}
            style={{ width: active ? 28 : 10, height:10, borderRadius:5, border:"none",
              background: active ? s.color : done ? `${s.color}88` : T.faint,
              cursor:"pointer", transition:"all .25s", padding:0 }} />
        );
      })}
    </div>
  );
}

// ─── SAVE DRAFT HOOK ──────────────────────────────────────────────────────────
function useDraft(familyId, setData) {
  const [lastSaved, setLastSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  const saveDraft = useCallback(async (draftData) => {
    if (!familyId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("intake_drafts").upsert(
        {
          family_id: familyId,
          data: draftData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "family_id" }
      );
      if (error) throw error;
      setLastSaved(new Date());
    } catch (e) {
      console.error("Draft save failed", e);
    } finally {
      setSaving(false);
    }
  }, [familyId]);

  const scheduleAutosave = useCallback((draftData) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveDraft(draftData), 3000);
  }, [saveDraft]);

  useEffect(() => {
    if (!familyId) return;

    let ignore = false;

    supabase
      .from("intake_drafts")
      .select("data")
      .eq("family_id", familyId)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (ignore || error) return;
        if (row?.data) {
          setData(prev => ({ ...prev, ...row.data }));
          setLastSaved(new Date());
        }
      });

    return () => {
      ignore = true;
      clearTimeout(timerRef.current);
    };
  }, [familyId, setData]);

  return { saveDraft, scheduleAutosave, saving, lastSaved };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function IntakeForm({ user, family, onComplete }) {
  const T = useT();
  const familyId = family?.id;

  const [sectionIdx, setSectionIdx] = useState(0);
  const [data, setData] = useState({ ...BLANK });
  const [completedSections, setCompletedSections] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [manualSaveFlash, setManualSaveFlash] = useState(false);
  const topRef = useRef(null);

  const { saveDraft, scheduleAutosave, saving, lastSaved } = useDraft(familyId, setData);

  useEffect(() => {
    if (user?.email && !data.email) {
      setData(prev => ({ ...prev, email: user.email }));
    }
    if (user?.name && !data.parent1_first) {
      const first = String(user.name).split(" ")[0] || "";
      setData(prev => ({ ...prev, parent1_first: prev.parent1_first || first }));
    }
  }, [user]);

  const update = useCallback((key, value) => {
    setData(prev => {
      const next = { ...prev, [key]: value };
      scheduleAutosave(next);
      return next;
    });
  }, [scheduleAutosave]);

  const handleManualSave = async () => {
    await saveDraft(data);
    setManualSaveFlash(true);
    setTimeout(() => setManualSaveFlash(false), 2200);
  };

  const goNext = () => {
    setCompletedSections(s => new Set([...s, SECTIONS[sectionIdx].id]));
    setSectionIdx(i => Math.min(i + 1, SECTIONS.length - 1));
    topRef.current?.scrollIntoView({ behavior:"smooth" });
  };

  const goBack = () => {
    setSectionIdx(i => Math.max(i - 1, 0));
    topRef.current?.scrollIntoView({ behavior:"smooth" });
  };

  const jumpTo = (i) => {
    setCompletedSections(s => new Set([...s, SECTIONS[sectionIdx].id]));
    setSectionIdx(i);
    topRef.current?.scrollIntoView({ behavior:"smooth" });
  };

  const handleSubmit = async () => {
    if (!familyId) {
      setSubmitError("Missing family connection. Please refresh and try again.");
      return;
    }

    if (!data.parent1_first || !data.email || !data.child_full_name) {
      setSubmitError("Please fill in your name, email, and your child's name before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = mapFormToIntakeResponse(data, familyId);

      const { error } = await supabase
        .from("intake_responses")
        .upsert(payload, { onConflict: "family_id" });

      if (error) throw error;

      await supabase.from("intake_drafts").delete().eq("family_id", familyId);

      await onComplete(payload);
    } catch (e) {
      console.error(e);
      setSubmitError("Something went wrong saving your form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const section = SECTIONS[sectionIdx];
  const isLast = sectionIdx === SECTIONS.length - 1;
  const progress = Math.round(((sectionIdx + 1) / SECTIONS.length) * 100);

  return (
    <div ref={topRef} style={{ minHeight:"100vh", background:T.gradientBg, color:T.text, fontFamily:font }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&family=DM+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { -webkit-appearance:none; width:100%; height:4px; border-radius:2px; background:${T.faint}; outline:none; cursor:pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:50%; background:${C.teal}; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.2); }
        textarea { resize: vertical; }
        @keyframes fadeFlash { 0%,100%{opacity:0} 20%,80%{opacity:1} }
      `}</style>

      <div style={{ maxWidth:600, margin:"0 auto", padding:"32px 20px 80px" }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:9.5, letterSpacing:".18em", textTransform:"uppercase", color:T.subText, marginBottom:8 }}>
            Rooted Connections Collective
          </div>
          <h1 style={{ fontFamily:serif, fontSize:28, color:T.headingText, lineHeight:1.1, marginBottom:6 }}>
            Sleep Intake Questionnaire
          </h1>
          <p style={{ fontSize:13, color:T.muted, lineHeight:1.6 }}>
            Take your time — there are no wrong answers. Your honesty helps us build the most supportive plan for your family.
          </p>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:11, color:T.muted, fontFamily:mono }}>Section {sectionIdx+1} of {SECTIONS.length}</span>
            <span style={{ fontSize:11, color:section.color, fontFamily:mono, fontWeight:700 }}>{progress}%</span>
          </div>
          <div style={{ height:4, borderRadius:2, background:T.faint }}>
            <div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg,${section.color},${C.purple})`, borderRadius:2, transition:"width .4s ease" }}/>
          </div>
        </div>

        <SectionDots sections={SECTIONS} current={sectionIdx} onJump={jumpTo} completedSections={completedSections} />

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22,
          padding:"10px 14px", borderRadius:10, background:T.faint, border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11.5, color:T.muted, fontFamily:font }}>
            {saving ? "Saving…" : lastSaved ? `Draft saved ${lastSaved.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}` : "Your progress saves automatically"}
          </div>
          <button type="button" onClick={handleManualSave}
            style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${manualSaveFlash ? C.sage : T.border}`,
              background: manualSaveFlash ? `${C.sage}20` : "transparent",
              color: manualSaveFlash ? C.sage : T.muted, fontFamily:font, fontSize:12, fontWeight:600,
              cursor:"pointer", transition:"all .2s", animation: manualSaveFlash ? "fadeFlash 2.2s ease" : "none" }}>
            {manualSaveFlash ? "✓ Saved!" : "Save draft"}
          </button>
        </div>

        <div style={{ marginBottom:24, padding:"18px 20px", borderRadius:14,
          background:`${section.color}0d`, border:`1px solid ${section.color}28` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <span style={{ fontSize:22 }}>{section.emoji}</span>
            <h2 style={{ fontFamily:serif, fontSize:21, color:T.headingText, lineHeight:1.1 }}>{section.title}</h2>
          </div>
          <p style={{ fontSize:13, color:T.muted, lineHeight:1.6, fontFamily:font }}>{section.subtitle}</p>
        </div>

        {section.id === "family" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <TextInput label="Your first name" value={data.parent1_first} onChange={v=>update("parent1_first",v)} required />
              <TextInput label="Your last name" value={data.parent1_last} onChange={v=>update("parent1_last",v)} required />
            </div>
            <TextInput label="Email address" value={data.email} onChange={v=>update("email",v)} type="email" required />
            <TextInput label="Phone number" value={data.phone} onChange={v=>update("phone",v)} type="tel" />
            <TextInput label="Other parent or caregiver's name" value={data.parent2_name} onChange={v=>update("parent2_name",v)} muted="(if applicable)" />
            <TextArea label="What is the family's daily schedule?" value={data.daily_schedule} onChange={v=>update("daily_schedule",v)}
              placeholder="Do you have activities outside the home? Do both parents work? Are you gone every day or only some days?" rows={3} />
          </div>
        )}

        {section.id === "child" && (
          <div>
            <TextInput label="Child's full name" value={data.child_full_name} onChange={v=>update("child_full_name",v)} required />
            <TextInput label="Nickname" value={data.child_nickname} onChange={v=>update("child_nickname",v)} muted="(optional)" />
            <TextInput label="Date of birth" value={data.child_dob} onChange={v=>update("child_dob",v)} type="date" required />

            <div style={{ marginBottom:20, padding:"14px 16px", borderRadius:12, background:T.faint, border:`1px dashed ${T.border}` }}>
              <div style={{ fontSize:11.5, fontWeight:700, color:T.muted, letterSpacing:".07em", textTransform:"uppercase", marginBottom:6, fontFamily:font }}>
                Child's photo <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, fontSize:11 }}>— completely optional 🌿</span>
              </div>
              <p style={{ fontSize:12, color:T.muted, lineHeight:1.6, marginBottom:10 }}>
                A photo helps your consultant connect with your child's energy before your first session. Totally optional and never shared.
              </p>
              {data.child_photo_url ? (
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <img src={data.child_photo_url} alt="child" style={{ width:60, height:60, borderRadius:10, objectFit:"cover" }}/>
                  <button type="button" onClick={() => update("child_photo_url", null)}
                    style={{ fontSize:12, color:T.muted, background:"none", border:"none", cursor:"pointer", fontFamily:font }}>Remove</button>
                </div>
              ) : (
                <label style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:9,
                  border:`1px solid ${T.border}`, cursor:"pointer", fontSize:13, color:T.muted, fontFamily:font }}>
                  <span>📷</span> Upload photo
                  <input type="file" accept="image/*" style={{ display:"none" }}
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file || !familyId) return;
                      const path = `family-photos/${familyId}/${file.name}`;
                      const { error } = await supabase.storage.from("rcc-uploads").upload(path, file, { upsert:true });
                      if (!error) {
                        const { data: urlData } = supabase.storage.from("rcc-uploads").getPublicUrl(path);
                        update("child_photo_url", urlData.publicUrl);
                      }
                    }} />
                </label>
              )}
            </div>

            <TextArea label="Tell me about your child's personality — likes, dislikes, what lights them up"
              value={data.child_personality} onChange={v=>update("child_personality",v)} rows={3} />
            <YesNo label="Has your child hit all of their milestones on time?"
              value={data.milestones_on_track}
              onChange={v => update("milestones_on_track", v)}
              options={[{label:"Yes",value:true},{label:"No / some concerns",value:false},{label:"Not sure",value:"unsure"}]} />
            {data.milestones_on_track === false && (
              <TextArea label="Tell us more about your concerns" value={data.milestones_notes} onChange={v=>update("milestones_notes",v)} rows={2} />
            )}

            <YesNo
              label="Do you have any health issues or concerns for your child?"
              value={data.health_concerns === null ? null : data.health_concerns === false ? false : true}
              onChange={v => {
                if (v === false) update("health_concerns", false);
                if (v === true) update("health_concerns", data.health_concerns && data.health_concerns !== false ? data.health_concerns : "");
              }}
              options={[{label:"Yes",value:true},{label:"No",value:false}]}
            />
            {data.health_concerns !== null && data.health_concerns !== false && (
              <TextArea label="Please describe any health issues or concerns" value={data.health_concerns}
                onChange={v=>update("health_concerns",v)} placeholder="Reflux, tongue tie, ear infections, allergies, GERD, any diagnoses…" rows={2} />
            )}

            <YesNo label="Have you spoken to your child's pediatrician about their sleep issues?"
              value={data.pediatrician_seen}
              onChange={v => update("pediatrician_seen", v)}
              options={[{label:"Yes",value:true},{label:"Not yet",value:false},{label:"In progress",value:"in_progress"}]} />
            <TextInput label="Who is your child's pediatrician?" value={data.pediatrician_name}
              onChange={v=>update("pediatrician_name",v)} placeholder="Dr. Name, Practice name" />
          </div>
        )}

        {section.id === "sleep" && (
          <div>
            <SingleSelect label="Where does your child currently sleep?" options={SLEEP_LOCATIONS}
              value={data.sleep_location} onChange={v=>update("sleep_location",v)} />
            {data.sleep_location === "Other" && (
              <TextInput label="Please describe" value={data.sleep_location_other} onChange={v=>update("sleep_location_other",v)} />
            )}
            <MultiSelect label="Does your child use any of the following to fall asleep or go back to sleep?"
              options={SLEEP_PROPS} selected={data.sleep_props} onChange={v=>update("sleep_props",v)}
              allowOther otherValue={data.sleep_props_other} onOtherChange={v=>update("sleep_props_other",v)} />
            <TextInput label="Typical bedtime?" value={data.typical_bedtime} onChange={v=>update("typical_bedtime",v)} placeholder="e.g. 7:30pm" />
            <TextArea label="What happens at bedtime — best case scenario?"
              value={data.bedtime_best} onChange={v=>update("bedtime_best",v)} rows={2} />
            <TextArea label="What happens at bedtime — worst case scenario?"
              value={data.bedtime_worst} onChange={v=>update("bedtime_worst",v)} rows={2} />
            <TextArea label="What happens with your child's sleep during the night?"
              value={data.night_wakings_description} onChange={v=>update("night_wakings_description",v)}
              placeholder="How many wakings? How long are they awake? What helps them go back?" rows={3} />
            <TextInput label="Longest stretch of sleep in the past week?" value={data.longest_stretch}
              onChange={v=>update("longest_stretch",v)} placeholder="e.g. 4 hours" />
            <TextInput label="What part of the night is most disruptive?" value={data.most_disruptive}
              onChange={v=>update("most_disruptive",v)} placeholder="e.g. 2–4am, bedtime itself, early morning…" />
          </div>
        )}

        {section.id === "environment" && (
          <div>
            <DarknessScale value={data.room_darkness} onChange={v=>update("room_darkness",v)} />
            <YesNo
              label="Does your child have any screen time throughout the day?"
              value={data.screen_time === null ? null : data.screen_time === false ? false : true}
              onChange={v => {
                if (v === false) update("screen_time", false);
                if (v === true) update("screen_time", typeof data.screen_time === "string" && data.screen_time ? data.screen_time : "");
              }}
            />
            {data.screen_time !== null && data.screen_time !== false && (
              <TextArea label="Describe when and how much" value={data.screen_time}
                onChange={v=>update("screen_time",v)} placeholder="e.g. 30 min of TV in the morning, tablet before nap…" rows={2} />
            )}
            <YesNo label="Does your child have a stress gag or vomit response to crying?"
              value={data.stress_gag_vomit} onChange={v=>update("stress_gag_vomit",v)} />
            <YesNo label="Do you share a room with your child?"
              value={data.room_sharing} onChange={v=>update("room_sharing",v)} />
            <YesNo label="Are there siblings whose sleep could be affected?"
              value={data.siblings_waking} onChange={v=>update("siblings_waking",v)} />
            <YesNo label="Do both parents (or caregivers) spend at least 10 minutes of one-on-one time with your child each day?"
              value={data.parent_quality_time} onChange={v=>update("parent_quality_time",v)} />
            <TextArea label="Does your child spend time outside regularly? When?"
              value={data.outside_time} onChange={v=>update("outside_time",v)}
              placeholder="Morning, afternoon? Daily or a few times a week?" rows={2} />
            <SliderScale label="How consistent can your household be right now?"
              value={data.consistency_capacity} onChange={v=>update("consistency_capacity",v)}
              leftLabel="1 — Very hard, lots of variables" rightLabel="5 — Very consistent" />
          </div>
        )}

        {section.id === "daytime" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <TextInput label="Nap count per day" value={data.nap_count} onChange={v=>update("nap_count",v)} placeholder="e.g. 2" />
              <TextInput label="What time does your child start the day?" value={data.wake_time} onChange={v=>update("wake_time",v)} placeholder="e.g. 6:30am" />
            </div>
            <TextArea label="What time and how long is your child napping?"
              value={data.nap_schedule} onChange={v=>update("nap_schedule",v)}
              placeholder="e.g. 9:30am for 45 min, 2pm for 1.5 hours" rows={2} />
            <TextInput label="What is your ideal wake-up time?" value={data.ideal_wake_time}
              onChange={v=>update("ideal_wake_time",v)} placeholder="e.g. 7:00am" />
            <TextArea label="Feeding — how much does your child drink per day and how?"
              value={data.daily_intake_oz} onChange={v=>update("daily_intake_oz",v)}
              placeholder="e.g. 4 bottles of 5oz, nurses 4 times a day…" rows={2} />
            <YesNo label="Is your child breastfed, bottle-fed, or both?"
              value={data.feeding_type}
              onChange={v=>update("feeding_type",v)}
              options={[{label:"Breastfed",value:"breast"},{label:"Bottle-fed",value:"bottle"},{label:"Both",value:"both"},{label:"Solids only",value:"solids"}]} />
            <TextArea label="What kinds of foods does your child eat?"
              value={data.foods_eating} onChange={v=>update("foods_eating",v)}
              placeholder="Any allergies, restrictions, or things they love or refuse?" rows={2} />
            <TextArea label="Any feeding constraints we should know about?"
              value={data.feeding_constraints} onChange={v=>update("feeding_constraints",v)}
              placeholder="e.g. feed to sleep, won't take bottle from other parent, allergies…" rows={2} />
            <TextArea label="Pretend your child has just woken from their last nap. What do you do together in that final awake window?"
              value={data.final_wake_window} onChange={v=>update("final_wake_window",v)} rows={3} />
          </div>
        )}

        {section.id === "temperament" && (
          <div>
            <div style={{ padding:"12px 15px", borderRadius:11, background:`${C.amber}0d`, border:`1px solid ${C.amber}28`, marginBottom:22 }}>
              <p style={{ fontSize:12.5, color:T.muted, lineHeight:1.65, fontStyle:"italic" }}>
                Rate each on a scale of 1–5. There's no right or wrong here — just honest.
              </p>
            </div>
            {TEMPERAMENT_SCALES.map(s => (
              <SliderScale key={s.key} label={s.label} value={data[s.key]} onChange={v=>update(s.key,v)} leftLabel={`1 — ${s.left}`} rightLabel={`5 — ${s.right}`} />
            ))}
          </div>
        )}

        {section.id === "nervous_system" && (
          <div>
            <div style={{ padding:"14px 16px", borderRadius:13, background:`${C.rose}0d`, border:`1px solid ${C.rose}28`, marginBottom:24 }}>
              <p style={{ fontSize:13, color:T.muted, lineHeight:1.75 }}>
                This section is the foundation of our nervous system-informed approach. Your answers help us understand the deeper patterns underneath sleep — for both you and your child. There are no wrong answers, and nothing you share here will be judged.
              </p>
            </div>

            <div style={{ fontSize:11, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:C.rose, marginBottom:14, fontFamily:font }}>🌱 Your child's story</div>

            <NervousSystemCard>
              <TextArea label="During your pregnancy, were there any moments you felt especially overwhelmed, unsupported, or unsafe — emotionally or physically? (This includes work stress or outside factors.)"
                value={data.ns_pregnancy_overwhelm} onChange={v=>update("ns_pregnancy_overwhelm",v)} rows={3} />
            </NervousSystemCard>

            <NervousSystemCard>
              <TextArea label="How did your body feel during pregnancy and birth — were there times you felt tense, on alert, or disconnected from yourself?"
                value={data.ns_birth_body} onChange={v=>update("ns_birth_body",v)} rows={3} />
            </NervousSystemCard>

            <NervousSystemCard>
              <TextArea label="Were there any unexpected medical events, interventions, or separations from your baby that felt stressful or upsetting at the time?"
                value={data.ns_medical_events} onChange={v=>update("ns_medical_events",v)}
                placeholder="NICU time, c-section when planned vaginal, tongue tie, reflux diagnosis, anything that felt hard…" rows={3} />
            </NervousSystemCard>

            <NervousSystemCard>
              <TextArea label="Looking back, is there anything about pregnancy or birth that still feels unresolved or heavy in your body or mind?"
                value={data.ns_unresolved} onChange={v=>update("ns_unresolved",v)} rows={3} />
            </NervousSystemCard>

            <div style={{ height:1, background:T.border, margin:"20px 0" }}/>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:C.rose, marginBottom:14, fontFamily:font }}>🌿 Your nervous system</div>

            <NervousSystemCard>
              <YesNo label="Do you feel like you're pretty good at knowing what your child wants — even when they're not verbally telling you?"
                sublabel="This is attunement — it's a skill, not a personality trait. No judgement either way."
                value={data.ns_attunement} onChange={v=>update("ns_attunement",v)}
                options={[{label:"Yes, usually",value:"yes"},{label:"Sometimes",value:"sometimes"},{label:"Honestly, not really",value:"no"}]} />
            </NervousSystemCard>

            <NervousSystemCard>
              <YesNo label="Do you feel overwhelmed or anxious when your child cries?"
                sublabel="This is so common, especially in the early months and when sleep-deprived."
                value={data.ns_parent_anxiety}
                onChange={v=>update("ns_parent_anxiety",v)}
                options={[{label:"Yes, often",value:"often"},{label:"Sometimes",value:"sometimes"},{label:"Rarely",value:"rarely"}]} />
            </NervousSystemCard>

            <NervousSystemCard>
              <YesNo label="Are you navigating any postpartum mood concerns?"
                sublabel="Depression, anxiety, rage, disconnection — all of these are real and treatable."
                value={data.ns_postpartum_concerns} onChange={v=>update("ns_postpartum_concerns",v)} />
              {data.ns_postpartum_concerns === true && (
                <div style={{ marginTop:14 }}>
                  <YesNo label="Are you currently supported for that?"
                    sublabel="No judgement at all — this just helps us understand where you are."
                    value={data.ns_postpartum_supported} onChange={v=>update("ns_postpartum_supported",v)}
                    options={[{label:"Yes",value:"yes"},{label:"Not yet",value:"not_yet"},{label:"Prefer not to say",value:"private"}]} />
                </div>
              )}
            </NervousSystemCard>

            <TextArea label="Any personal or family history of depression, anxiety, or other mental health concerns?"
              value={data.ns_family_mh_history} onChange={v=>update("ns_family_mh_history",v)}
              placeholder="You can be as brief or detailed as you'd like." rows={3} />
          </div>
        )}

        {section.id === "goals" && (
          <div>
            <TextArea label="What do you most want to change about sleep right now?" required
              value={data.goals} onChange={v=>update("goals",v)}
              placeholder="Be as honest as you want — the more specific, the better." rows={3} />
            <TextArea label="What has been the biggest challenge so far?"
              value={data.sleep_challenges} onChange={v=>update("sleep_challenges",v)} rows={3} />
            <TextArea label="Any non-negotiables?"
              value={data.non_negotiables} onChange={v=>update("non_negotiables",v)}
              placeholder="e.g. no cry-it-out, must be able to feed to sleep for one feed, bedsharing is important to us…" rows={2} />
            <TextArea label="If I could wave a magic wand and fix anything for you right now — what would it be and why?"
              value={data.magic_wand} onChange={v=>update("magic_wand",v)} rows={3} />
            <TextArea label="Is there anything else you'd like me to know?"
              value={data.anything_else} onChange={v=>update("anything_else",v)} rows={3} />

            {submitError && (
              <div style={{ padding:"12px 14px", borderRadius:10, background:`${C.rose}15`, border:`1px solid ${C.rose}40`, marginBottom:16 }}>
                <p style={{ fontSize:13, color:C.rose, fontFamily:font }}>{submitError}</p>
              </div>
            )}
          </div>
        )}

        <div style={{ display:"flex", gap:10, marginTop:28 }}>
          {sectionIdx > 0 && (
            <button type="button" onClick={goBack}
              style={{ flex:1, padding:"13px 0", borderRadius:12, border:`1px solid ${T.border}`, background:"none",
                color:T.muted, fontFamily:font, fontSize:14, cursor:"pointer", transition:"all .2s" }}>
              ← Back
            </button>
          )}
          {!isLast ? (
            <button type="button" onClick={goNext}
              style={{ flex:2, padding:"13px 0", borderRadius:12, border:"none",
                background:`linear-gradient(135deg,${section.color},${C.purple})`,
                color:"#fff", fontFamily:font, fontSize:14, fontWeight:700, cursor:"pointer",
                boxShadow:`0 4px 16px ${section.color}40`, transition:"all .2s" }}>
              Continue →
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitting}
              style={{ flex:2, padding:"14px 0", borderRadius:12, border:"none",
                background: submitting ? T.faint : `linear-gradient(135deg,${C.teal},${C.sage})`,
                color: submitting ? T.muted : "#fff", fontFamily:font, fontSize:14, fontWeight:700,
                cursor: submitting ? "default" : "pointer", boxShadow: submitting ? "none" : `0 4px 20px ${C.teal}45`,
                transition:"all .2s" }}>
              {submitting ? "Submitting…" : "Submit questionnaire ✓"}
            </button>
          )}
        </div>

        <div style={{ marginTop:28, display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
          {SECTIONS.map((s,i) => {
            const done = completedSections.has(s.id);
            const active = i === sectionIdx;
            return (
              <button key={s.id} type="button" onClick={() => jumpTo(i)}
                style={{ padding:"7px 4px", borderRadius:9, border:`1px solid ${active?s.color:T.border}`,
                  background:active?`${s.color}18`:done?`${s.color}08`:"transparent",
                  color:active?s.color:done?`${s.color}99`:T.muted, fontFamily:font, fontSize:10.5,
                  fontWeight:active?700:400, cursor:"pointer", textAlign:"center", lineHeight:1.3, transition:"all .2s" }}>
                <div style={{ fontSize:14, marginBottom:2 }}>{s.emoji}</div>
                <div>{s.title}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}