// views/consultant/tabs/IntakeTab.jsx
import { useT, font, serif } from "../../../core/shared.jsx";
import { useIntake } from "../data/consultantStore.js";
import InsightCard from "../shared/InsightCard.jsx";

const TEMPERAMENT_KEYS = [
  { key: "intensity",     label: "Intensity" },
  { key: "adaptability",  label: "Adaptability" },
  { key: "sensitivity",   label: "Sensitivity" },
  { key: "routine",       label: "Routine" },
  { key: "mood",          label: "Mood" },
  { key: "persistence",   label: "Persistence" },
];

function IntakeRow({ label, value }) {
  const T = useT();
  if (!value) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "7px 0", borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{
        fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
        color: T.muted, fontWeight: 600, width: 90, flexShrink: 0,
        paddingTop: 1, fontFamily: font,
      }}>{label}</div>
      <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5, flex: 1, fontFamily: font }}>{value}</div>
    </div>
  );
}

function TempBar({ label, value }) {
  const T = useT();
  const pct = ((value - 1) / 4) * 100;
  const color = value >= 4 ? "#C08A3A" : value <= 2 ? "#C0543A" : T.teal;
  return (
    <div style={{ padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontSize: 11, color: T.text, fontFamily: font }}>{label}</div>
        <div style={{ fontSize: 11, color, fontWeight: 600, fontFamily: font }}>{value}/5</div>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: T.bg2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: color, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

export default function IntakeTab({ activeChild, family, onNavigate }) {
  const T = useT();
  const { intake } = useIntake(family?.id || activeChild?.familyId);
  const data = intake[activeChild?.id] || intake[family?.id];

  if (!data) return (
    <div style={{ padding: 40, textAlign: "center", color: T.muted, fontFamily: font }}>
      No intake data found for {activeChild?.name}.
    </div>
  );

  // Build AI summary dynamically from intake data
  const highIntensity = data.intensity >= 4;
  const lowAdapt     = data.adaptability <= 2;
  const anxiousNS    = data.ns_parent_anxiety;
  const gagHistory   = data.stress_gag_vomit;

  const summaryTitle = highIntensity && lowAdapt
    ? "High intensity, low adaptability. Needs predictable pacing."
    : "Sensitive child with anxious parent NS. Gradual approach essential.";

  const summaryBody = [
    highIntensity && `${activeChild?.name} scores high on intensity`,
    lowAdapt && "low on adaptability — a combination that responds poorly to abrupt changes.",
    anxiousNS && "Parent anxiety is elevated; plan proactive check-ins at Day 5 and Day 9.",
    gagHistory && "Stress/gag history noted — monitor for escalation.",
  ].filter(Boolean).join(" ");

  return (
    <div>
      {/* AI intake summary */}
      <div style={{ marginTop: 10 }}>
        <InsightCard
          label="◎ Co-Pilot · Intake summary"
          title={summaryTitle}
          body={summaryBody}
        />
      </div>

      {/* Sleep section */}
      <div style={{ padding: "4px 18px 8px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
        Sleep picture
      </div>
      <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
        <IntakeRow label="Location"    value={data.sleep_location} />
        <IntakeRow label="Props"       value={data.sleep_props} />
        <IntakeRow label="Bedtime"     value={data.typical_bedtime ? `${data.typical_bedtime} (best) · ${data.bedtime_worst || "—"} (worst)` : null} />
        <IntakeRow label="Wakings"     value={data.night_wakings_description} />
        <IntakeRow label="Consistency" value={data.consistency_capacity ? `${data.consistency_capacity}/5 — ${data.consistency_capacity >= 4 ? "High" : data.consistency_capacity <= 2 ? "Low — watch plan adherence" : "Moderate"}` : null} />
        {data.stress_gag_vomit && (
          <div style={{ marginTop: 6, background: "#FBF0EC", borderRadius: 10, padding: "7px 10px", fontSize: 11, color: "#C0543A", fontFamily: font }}>
            ⚠️ Stress/gag/vomit history noted — monitor for escalation during method
          </div>
        )}
      </div>

      {/* Temperament */}
      <div style={{ padding: "4px 18px 8px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
        Temperament
      </div>
      <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
        {TEMPERAMENT_KEYS.map(t => (
          <TempBar key={t.key} label={t.label} value={data[t.key] || 3} />
        ))}
      </div>

      {/* Nervous system */}
      <div style={{ padding: "4px 18px 8px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
        Nervous system
      </div>
      <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
        <IntakeRow label="Birth"          value={data.ns_birth_body} />
        <IntakeRow label="Parent anxiety" value={data.ns_parent_anxiety ? "Yes — noted" : "Not flagged"} />
        <IntakeRow label="Postpartum"     value={data.ns_postpartum_concerns ? "Some concerns noted" : null} />
        <IntakeRow label="Unresolved"     value={data.ns_unresolved} />
        {data.ns_parent_anxiety && (
          <div style={{ marginTop: 6, background: "#FAF3E6", borderRadius: 10, padding: "7px 10px", fontSize: 11, color: "#B8924A", fontFamily: font }}>
            ⚠️ Plan proactive check-ins at Day 5 and Day 9 — this parent needs anticipatory support
          </div>
        )}
      </div>

      {/* Goals */}
      <div style={{ padding: "4px 18px 8px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
        Goals &amp; non-negotiables
      </div>
      <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
        <IntakeRow label="Goal"      value={data.goals} />
        <IntakeRow label="Non-neg."  value={data.non_negotiables} />
        <IntakeRow label="Magic wand" value={data.magic_wand} />
      </div>

      <div onClick={() => onNavigate?.("intakeViewer")} style={{
        margin: "0 18px 16px", textAlign: "center",
        fontSize: 12, color: T.teal, cursor: "pointer", fontWeight: 500, fontFamily: font,
      }}>
        View full raw intake →
      </div>
    </div>
  );
}
