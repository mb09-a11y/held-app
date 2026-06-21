// views/consultant/RedFlags.jsx
import { useT, font, serif } from "../../core/shared.jsx";
import { useFamilies } from "./data/consultantStore.js";

export default function RedFlags({ onNavigate, onInviteFamily }) {
  const T = useT();
  const { families } = useFamilies();

  const urgentFamilies = families.filter(f => f.urgency === "urgent");
  const watchFamilies  = families.filter(f => f.urgency === "watch");
  const goodFamilies   = families.filter(f => f.urgency === "good");

  return (
    <div style={{ background: T.gradientBg, flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "14px 18px 2px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, color: T.headingText, marginBottom: 4 }}>Families</div>
          <div style={{ fontSize: 12, color: T.muted, fontFamily: font }}>When to intervene, adjust, or refer</div>
        </div>
        {onInviteFamily && (
          <button
            onClick={onInviteFamily}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 20,
              background: "#5C7A5E", border: "none",
              color: "#fff", fontFamily: font, fontSize: 13,
              fontWeight: 600, cursor: "pointer", flexShrink: 0,
              marginTop: 6,
            }}
          >
            + Invite family
          </button>
        )}
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

      {/* Engagement drop — families with no recent messages */}
      {(() => {
        // Flag families that have no lastMessage and aren't brand new
        const disengaged = families.filter(f => {
          if (!f.lastMessage && !f.lastMessageTime) return false; // never messaged, skip
          if (!f.lastMessageTime) return true;
          // Check if last message was more than 3 days ago
          // lastMessageTime is a time string like "10:22 AM" so we use lastMsg timestamp
          return false; // will improve with real timestamp data
        });
        // For now surface any family that has children but no messages at all
        const noMessages = families.filter(f => f.children?.length > 0 && !f.lastMessage);
        if (!noMessages.length) return null;
        return (
          <>
            <div style={{ padding: "8px 18px 4px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
              📉 Engagement
            </div>
            {noMessages.map(fam => (
              <div key={fam.id} style={{ margin: "0 18px 10px", background: T.card, borderRadius: 16, padding: "13px 15px", boxShadow: T.shadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 18 }}>📉</div>
                  <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: T.muted, fontFamily: font }}>No messages yet</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4, fontFamily: font }}>{fam.name}</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 8, fontFamily: font }}>
                  No messages logged yet for this family. A quick check-in builds trust early.
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => onNavigate("responseBuilder", { familyId: fam.id })}
                    style={{ background: T.teal, color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}
                  >
                    Send check-in
                  </button>
                  <button
                    onClick={() => onNavigate("family", { familyId: fam.id })}
                    style={{ background: "transparent", color: T.muted, border: `1px solid ${T.border}`, padding: "7px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontFamily: font }}
                  >
                    View family
                  </button>
                </div>
              </div>
            ))}
          </>
        );
      })()}

      {/* All clear */}
      {goodFamilies.length > 0 && (
        <>
          <div style={{ padding: "8px 18px 4px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
            ✅ All clear
          </div>
          {goodFamilies.map(fam => (
            <div key={fam.id} onClick={() => onNavigate("family", { familyId: fam.id })} style={{
              margin: "0 18px 8px", background: "rgba(92,122,94,0.15)",
              border: "1.5px solid #C4D2C2", borderRadius: 14,
              padding: "11px 14px", display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer",
            }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ fontSize: 12, color: T.text, lineHeight: 1.45, flex: 1, fontFamily: font }}>
                <strong>{fam.name}</strong> — {fam.insight}
              </span>
              <span style={{ fontSize: 14, color: T.muted }}>›</span>
            </div>
          ))}
        </>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}
