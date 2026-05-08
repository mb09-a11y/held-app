// views/consultant/MethodMatching.jsx
import { useState } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { useFamilies, useIntake, usePlans } from "./data/consultantStore.js";
import { supabase } from "../../lib/supabase.js";
import InsightCard from "./shared/InsightCard.jsx";

const METHODS = [
  {
    id: "settled_support", label: "Settled Support", emoji: "🌊",
    sub: "Low distress · Gradual withdrawal · High contact",
    childFit: "Sensitive babies need presence before distance",
    parentFit: "Anxious parents need to stay in the room early on",
    timeline: "17+ nights. Set expectation clearly. Proactive check-in at Day 5 is critical.",
    notFor: ["ferber", "habit_stacking"],
  },
  {
    id: "chair_method", label: "Chair Method", emoji: "🪑",
    sub: "Moderate distress · Room presence · 7-day removal",
    childFit: "Works well for most temperaments with good routine",
    parentFit: "Parents who need a clear, structured process",
    timeline: "7–10 nights for initial independence. Consistent commitment required.",
    notFor: [],
  },
  {
    id: "fading", label: "Fading", emoji: "🌅",
    sub: "Low distress · Prop reduction · Gradual drowsy",
    childFit: "Babies with strong prop associations",
    parentFit: "Parents who can tolerate slow, steady progress",
    timeline: "10–14 nights. Nap fading mirrors bedtime schedule.",
    notFor: [],
  },
  {
    id: "habit_stacking", label: "Habit Stacking", emoji: "🧱",
    sub: "Very low distress · 40 nights · Minimal crying",
    childFit: "Any temperament — slowest but gentlest",
    parentFit: "Highly anxious parents, non-negotiable on no crying",
    timeline: "40 nights. Requires highest parent consistency. Not for low consistency scores.",
    notFor: ["ferber"],
  },
  {
    id: "ferber", label: "Ferber / Graduated Extinction", emoji: "⏱",
    sub: "Higher distress · Fast results · 7 nights",
    childFit: "Typically developing infants without gag/vomit history",
    parentFit: "Both caregivers fully aligned. High consistency capacity (4–5/5).",
    timeline: "7 nights. Fastest method. Not appropriate for anxious parent NS or gag history.",
    notFor: ["settled_support"],
  },
];

function generatePlanReadyMessage(family, child, method) {
  const whyMap = {
    settled_support: `Based on what you shared — especially ${child?.name}'s sensitivity and your values around closeness — we're starting with the Settled Support Method. This keeps you right beside them at first and gradually builds independence over 17+ nights. No rushing, no cry-it-out.`,
    chair_method: `Based on ${child?.name}'s temperament and your readiness to follow a structured process, we're starting with the Chair Method. You'll be in the room, then gradually move further away over 7 days. Clear, predictable, and manageable.`,
    fading: `Given ${child?.name}'s strong association with their current sleep prop, we're using the Fading Method — gradually reducing the prop while they're still drowsy, not fully asleep. Gentle and effective.`,
    habit_stacking: `Given your priority of minimizing distress, we're using Habit Stacking — the slowest and gentlest method. We layer in sleep associations and remove them one by one over 40 nights. Lots of patience, very little crying.`,
    ferber: `Based on ${child?.name}'s developmental stage and your family's readiness, we're starting with the Ferber Method. You'll check in at graduated intervals. Most families see significant results within 7 nights.`,
  };

  return `Hi ${family?.parents?.split(" ")[0] || "there"}! Your sleep plan is ready. 🌿\n\n${whyMap[method?.id] || "Your custom sleep plan has been prepared."}\n\nPlease have a read through the plan in the app and let me know if you have any questions before we begin tonight.`;
}

export default function MethodMatching({ familyId, childId, onNavigate }) {
  const T = useT();
  const { families } = useFamilies();
  const { intake } = useIntake(familyId);
  const { changeMethod } = usePlans();

  const family = families.find(f => f.id === familyId);
  const child  = family?.children?.find(c => c.id === childId) || family?.children?.[0];
  const data   = intake[child?.id] || {};

  const [selected, setSelected] = useState(null);
  const [assigned, setAssigned] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendDone, setSendDone] = useState(false);
  const [editingMsg, setEditingMsg] = useState(false);
  const [msgText, setMsgText] = useState("");

  // Derive recommendation from intake
  const isHighSensitivity  = data.sensitivity >= 4;
  const isAnxiousParent    = data.ns_parent_anxiety;
  const isLowConsistency   = data.consistency_capacity <= 2;
  const isHighIntensity    = data.intensity >= 4;
  const hasGagHistory      = data.stress_gag_vomit;
  const isNoCryNonNeg      = data.non_negotiables?.toLowerCase().includes("cry");

  const recommended = isNoCryNonNeg || (isHighSensitivity && isAnxiousParent)
    ? "settled_support"
    : isLowConsistency
    ? "fading"
    : isHighIntensity
    ? "chair_method"
    : "chair_method";

  const handleAssign = async () => {
    const method = METHODS.find(m => m.id === (selected || recommended));
    if (!family?.id || !method) return;

    // Build a fresh plan profile and write it to Supabase
    const planProfile = {
      method: method.id,
      methodLabel: method.label,
      familyId: family.id,
      id: child?.id || family.id,
      phases: [], // consultant sets up phases in PlanTab
      napCapMinutes: 90,
      startDate: new Date().toISOString().slice(0, 10),
    };

    try {
      // Write plan profile to families table
      await supabase
        .from("families")
        .update({ sleep_plan_profile: planProfile })
        .eq("id", family.id);

      // Write sleep_method to children table so UI reflects it immediately
      if (child?.id) {
        await supabase
          .from("children")
          .update({ sleep_method: method.id })
          .eq("id", child.id);
      }
    } catch (err) {
      console.error("[MethodMatching] assign:", err);
    }

    // Also seed local state so PlanTab picks it up immediately
    if (child?.planId) changeMethod(child.planId, method.id, method.label);

    setMsgText(generatePlanReadyMessage(family, child, method));
    setAssigned(true);
  };

  const activeMethod = METHODS.find(m => m.id === (selected || recommended));

  return (
    <div style={{ background: T.gradientBg, flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "16px 18px 4px" }}>
        <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, color: T.headingText, marginBottom: 4 }}>Method Match</div>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: font }}>
          {child?.name} · {child?.age} · {family?.name}
        </div>
      </div>

      {/* Intake signals */}
      <div style={{ margin: "8px 18px 10px", background: T.bg2, borderRadius: 14, padding: "12px 14px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, fontWeight: 600, marginBottom: 7, fontFamily: font }}>
          From intake
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {isHighSensitivity && <span style={{ background: "#FBF4E6", color: "#C08A3A", borderRadius: 20, padding: "3px 9px", fontSize: 10, fontFamily: font }}>Highly sensitive</span>}
          {isAnxiousParent   && <span style={{ background: "#FBF4E6", color: "#C08A3A", borderRadius: 20, padding: "3px 9px", fontSize: 10, fontFamily: font }}>Anxious parent NS</span>}
          {isNoCryNonNeg     && <span style={{ background: "#FBF0EC", color: "#C0543A", borderRadius: 20, padding: "3px 9px", fontSize: 10, fontFamily: font }}>No cry-it-out</span>}
          {hasGagHistory     && <span style={{ background: "#FBF0EC", color: "#C0543A", borderRadius: 20, padding: "3px 9px", fontSize: 10, fontFamily: font }}>Gag history</span>}
          {isLowConsistency  && <span style={{ background: "#FBF4E6", color: "#C08A3A", borderRadius: 20, padding: "3px 9px", fontSize: 10, fontFamily: font }}>Low consistency</span>}
          {!isHighSensitivity && !isAnxiousParent && <span style={{ background: "#EAF0E8", color: "#5C7A5E", borderRadius: 20, padding: "3px 9px", fontSize: 10, fontFamily: font }}>Typical NS profile</span>}
        </div>
      </div>

      {/* Recommended */}
      <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
        <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: T.teal, fontWeight: 600, marginBottom: 8, fontFamily: font }}>
          ◎ Co-Pilot recommends
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 26 }}>{activeMethod?.emoji}</div>
          <div>
            <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: T.headingText }}>{activeMethod?.label}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1, fontFamily: font }}>{activeMethod?.sub}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
          {[
            { lbl: "Child fit",   val: activeMethod?.childFit },
            { lbl: "Parent NS",   val: activeMethod?.parentFit },
          ].map(t => (
            <div key={t.lbl} style={{ flex: 1, background: T.bg2, borderRadius: 11, padding: "9px 10px" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, fontWeight: 600, marginBottom: 3, fontFamily: font }}>{t.lbl}</div>
              <div style={{ fontSize: 12, color: T.text, lineHeight: 1.4, fontFamily: font }}>{t.val}</div>
            </div>
          ))}
        </div>
        <div style={{ background: T.bg2, borderRadius: 11, padding: "9px 10px", marginBottom: 8 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, fontWeight: 600, marginBottom: 3, fontFamily: font }}>Timeline</div>
          <div style={{ fontSize: 12, color: T.text, lineHeight: 1.4, fontFamily: font }}>{activeMethod?.timeline}</div>
        </div>
        {hasGagHistory && activeMethod?.id !== "settled_support" && (
          <div style={{ background: "#FBF4E6", borderRadius: 10, padding: "9px 11px", fontSize: 11, color: "#C08A3A", fontFamily: font }}>
            ⚠️ Gag history noted — monitor for escalation and have a switch plan ready
          </div>
        )}
      </div>

      {/* Method switcher */}
      <div style={{ padding: "4px 18px 8px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
        All methods
      </div>
      {METHODS.filter(m => m.id !== (selected || recommended)).map(m => (
        <div key={m.id} onClick={() => setSelected(m.id)} style={{
          margin: "0 18px 8px", background: T.card, borderRadius: 16,
          padding: "12px 15px", boxShadow: T.shadow, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
          border: `1.5px solid ${T.border}`,
        }}>
          <div style={{ fontSize: 20 }}>{m.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: font }}>{m.label}</div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: font }}>{m.sub}</div>
          </div>
          <div style={{ fontSize: 14, color: T.muted }}>›</div>
        </div>
      ))}

      {/* Assign + plan ready */}
      {!assigned ? (
        <div style={{ margin: "10px 18px 16px", display: "flex", gap: 7 }}>
          <button onClick={handleAssign} style={{
            flex: 1, background: T.teal, color: "#fff",
            border: "none", borderRadius: 16, padding: 13,
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font,
          }}>Assign {activeMethod?.label}</button>
          <button onClick={() => onNavigate("family", { familyId })} style={{
            background: T.card, border: `1.5px solid ${T.border}`,
            borderRadius: 16, padding: "13px 14px",
            fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: font,
          }}>Cancel</button>
        </div>
      ) : (
        <div style={{ margin: "10px 18px 16px", background: `linear-gradient(135deg, ${T.bg2}, ${T.card})`, border: `1px solid ${T.teal}44`, borderRadius: 18, padding: "14px 16px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: T.teal, marginBottom: 6, fontFamily: font }}>
            ✉️ Plan ready message — review before sending
          </div>
          {editingMsg ? (
            <textarea value={msgText} onChange={e => setMsgText(e.target.value)} style={{
              width: "100%", padding: "11px 13px", borderRadius: 12,
              border: `1.5px solid ${T.teal}`,
              background: T.inputBg, color: T.text,
              fontSize: 13, fontFamily: font,
              resize: "none", height: 160, outline: "none",
              boxSizing: "border-box", lineHeight: 1.65, marginBottom: 10,
            }} />
          ) : (
            <div style={{
              background: T.card, borderRadius: 12, padding: "11px 13px",
              fontSize: 13, color: T.text, lineHeight: 1.65,
              border: `1px solid ${T.border}`, marginBottom: 10,
              fontFamily: font, whiteSpace: "pre-wrap",
            }}>{msgText}</div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setEditingMsg(e => !e)} style={{
              background: T.card, border: `1.5px solid ${T.border}`,
              borderRadius: 20, padding: "8px 14px",
              fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: font,
            }}>✏️ {editingMsg ? "Preview" : "Edit"}</button>
            <button onClick={async () => {
              setSending(true);
              try {
                // Get session first — ensures the client is hydrated before any DB call
                const { data: { session } } = await supabase.auth.getSession();
                const senderId = session?.user?.id;
                // Read role from profile cache, not user_metadata (more reliable)
                const cachedUser = (() => { try { return JSON.parse(localStorage.getItem("rcc_user") || "{}"); } catch { return {}; } })();
                const senderRole = cachedUser?.role || session?.user?.user_metadata?.role || "consultant";

                if (family?.id && senderId) {
                  const { error } = await supabase.from("messages").insert({
                    family_id: family.id,
                    sender_id: senderId,
                    sender_role: senderRole,
                    content: msgText,
                    type: "text",
                  });
                  if (error) console.error("[MethodMatching] message insert error:", error);
                } else {
                  console.warn("[MethodMatching] missing family.id or senderId — skipping message insert", { familyId: family?.id, senderId });
                }
                setSendDone(true);
                setTimeout(() => onNavigate("family", { familyId }), 1800);
              } catch (err) {
                console.error("[MethodMatching] send:", err);
                setSendDone(true);
                setTimeout(() => onNavigate("family", { familyId }), 1800);
              } finally {
                setSending(false);
              }
            }} style={{
              flex: 1, background: sendDone ? "#5C7A5E" : T.teal, color: "#fff",
              border: "none", borderRadius: 20, padding: 8,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font,
              opacity: sending ? 0.7 : 1,
            }}>{sendDone ? "✓ Sent!" : sending ? "Sending…" : "Send to family →"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
