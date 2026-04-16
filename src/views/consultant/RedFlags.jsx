// views/consultant/RedFlags.jsx
import { useState } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { useFamilies, useMessages } from "./data/consultantStore.js";

export default function RedFlags({ onNavigate }) {
  const T = useT();
  const { families } = useFamilies();
  const { sendMessage } = useMessages();
  const [nudgeSent, setNudgeSent] = useState(false);

  const urgentFamilies = families.filter(f => f.urgency === "urgent");
  const watchFamilies  = families.filter(f => f.urgency === "watch");
  const goodFamilies   = families.filter(f => f.urgency === "good");

  return (
    <div style={{ background: T.gradientBg, flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "14px 18px 2px" }}>
        <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, color: T.headingText, marginBottom: 4 }}>Flags</div>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: font }}>When to intervene, adjust, or refer</div>
      </div>

      {/* Red flags */}
      {urgentFamilies.map(fam => (
        <div key={fam.id}>
          <div style={{ padding: "8px 18px 4px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
            🚨 Urgent
          </div>
          <div style={{ margin: "0 18px 10px", background: "rgba(192,84,58,0.12)", border: "1.5px solid rgba(192,84,58,0.2)", borderRadius: 16, padding: "13px 15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 18 }}>🚨</div>
              <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: "#C0543A", fontFamily: font }}>
                No improvement · Day {fam.children.find(c => c.status === "urgent")?.planDay}+
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 5, fontFamily: font }}>
              {fam.name} — {fam.children.filter(c => c.status === "urgent").map(c => c.name).join(" & ")}
            </div>
            <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 9, fontFamily: font }}>
              {fam.insight} Parent NS: {fam.nsState}.
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onNavigate("family", { familyId: fam.id })} style={{
                background: "#C0543A", color: "#fff", border: "none",
                padding: "7px 14px", borderRadius: 20,
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font,
              }}>View family</button>
              <button onClick={() => onNavigate("responseBuilder", { familyId: fam.id })} style={{
                color: "#C0543A",
                background: "transparent", border: "1.5px solid rgba(255,255,255,0.2)", padding: "7px 14px", borderRadius: 20,
                fontSize: 11, cursor: "pointer", fontFamily: font,
              }}>Draft message</button>
            </div>
          </div>
        </div>
      ))}

      {/* Amber flags */}
      {watchFamilies.map(fam => (
        <div key={fam.id}>
          <div style={{ padding: "8px 18px 4px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
            ⚠️ Watch
          </div>
          <div style={{ margin: "0 18px 10px", background: "rgba(192,138,58,0.12)", border: "1.5px solid rgba(192,138,58,0.2)", borderRadius: 16, padding: "13px 15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 18 }}>⚠️</div>
              <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: "#C08A3A", fontFamily: font }}>
                {fam.nsState !== "regulated" ? "Parent distress increasing" : "Regression window"}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4, fontFamily: font }}>{fam.name}</div>
            <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 9, fontFamily: font }}>{fam.insight}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onNavigate("responseBuilder", { familyId: fam.id })} style={{
                background: "#C08A3A", color: "#fff", border: "none",
                padding: "7px 14px", borderRadius: 20,
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font,
              }}>Proactive check-in</button>
              <button onClick={() => onNavigate("family", { familyId: fam.id })} style={{
                color: "#C08A3A",
                background: "transparent", border: "1.5px solid rgba(255,255,255,0.2)", padding: "7px 14px", borderRadius: 20,
                fontSize: 11, cursor: "pointer", fontFamily: font,
              }}>View data</button>
            </div>
          </div>
        </div>
      ))}

      {/* Engagement drop (simulated) */}
      <div style={{ padding: "8px 18px 4px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
        📉 Engagement
      </div>
      <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 16, padding: "13px 15px", boxShadow: T.shadow }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 18 }}>📉</div>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: T.muted, fontFamily: font }}>No log in 3 days</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4, fontFamily: font }}>Torres family</div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 8, fontFamily: font }}>
          Inconsistent tracking often precedes plan abandonment. A gentle nudge now can prevent it.
        </div>
        <button
          onClick={() => {
            sendMessage("fam_torres", "Hey! Just checking in — we haven't seen a log in a few days. How are things going? Even a quick update helps us keep your plan on track. 🌿");
            setNudgeSent(true);
          }}
          disabled={nudgeSent}
          style={{
            background: nudgeSent ? T.faint : T.teal,
            color: nudgeSent ? T.muted : "#fff",
            border: "none", padding: "7px 16px", borderRadius: 20,
            fontSize: 11, fontWeight: 600, cursor: nudgeSent ? "default" : "pointer",
            fontFamily: font, transition: "all .2s",
          }}>
          {nudgeSent ? "✓ Nudge sent" : "Send gentle nudge"}
        </button>
      </div>

      {/* All clear */}
      {goodFamilies.length > 0 && (
        <>
          <div style={{ padding: "8px 18px 4px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
            ✅ All clear
          </div>
          {goodFamilies.map(fam => (
            <div key={fam.id} style={{
              margin: "0 18px 8px", background: "rgba(92,122,94,0.15)",
              border: "1.5px solid #C4D2C2", borderRadius: 14,
              padding: "11px 14px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ fontSize: 12, color: T.text, lineHeight: 1.45, flex: 1, fontFamily: font }}>
                <strong>{fam.name}</strong> — {fam.insight}
              </span>
            </div>
          ))}
        </>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}
