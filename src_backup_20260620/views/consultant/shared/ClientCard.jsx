// shared/ClientCard.jsx
import { useT, font, serif } from "../../../core/shared.jsx";

const URGENCY = {
  urgent: { accent: "#C0543A", badgeBg: "rgba(192,84,58,0.15)", badgeText: "#C0543A", label: "Urgent" },
  watch:  { accent: "#C08A3A", badgeBg: "rgba(192,138,58,0.15)", badgeText: "#C08A3A", label: "Watch" },
  good:   { accent: "#5C7A5E", badgeBg: "rgba(92,122,94,0.15)",  badgeText: "#5C7A5E", label: "On track" },
};

const STATUS_DOT = { good: "#7FD98A", watch: "#C08A3A", urgent: "#C0543A" };

export default function ClientCard({ family, onPress, onCTA }) {
  const T = useT();
  const u = URGENCY[family.urgency] || URGENCY.good;

  // Clean and truncate the last message
  const rawMsg   = family.lastMessage || "";
  const cleanMsg = rawMsg.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  const previewMsg = cleanMsg.length > 60 ? cleanMsg.slice(0, 57) + "…" : cleanMsg;

  const ctaLabel = family.urgency === "urgent" ? "Respond"
                 : family.urgency === "watch"   ? "Prepare"
                 : "Check in";

  return (
    <div onClick={() => onPress(family)} style={{
      margin: "0 18px 9px",
      background: T.card,
      borderRadius: 18,
      padding: "14px 16px",
      boxShadow: T.shadow,
      cursor: "pointer",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Left accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: 4,
        borderRadius: "4px 0 0 4px",
        background: u.accent,
      }} />
      <div style={{ paddingLeft: 8 }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 9 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: u.badgeBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
          }}>
            {family.children?.length > 1 ? "👪" : family.children?.[0]?.emoji || "👶"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, fontFamily: font }}>
              {family.name}
            </div>
            {/* Single child: show age + day */}
            {family.children?.length === 1 && (
              <div style={{ fontSize: 11, color: T.muted, marginTop: 1, fontFamily: font }}>
                {family.children[0].name} · {family.children[0].age} · Day {family.children[0].planDay ?? 0} of plan
              </div>
            )}
          </div>
          <div style={{
            padding: "3px 9px", borderRadius: 20,
            background: u.badgeBg, color: u.badgeText,
            fontSize: 10, fontWeight: 600, fontFamily: font,
            flexShrink: 0,
          }}>{u.label}</div>
        </div>

        {/* Multi-child: each child on its own row */}
        {family.children?.length > 1 && (
          <div style={{ marginBottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {family.children.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 13 }}>{c.emoji || "🌙"}</span>
                <span style={{ fontSize: 12, fontFamily: font, color: T.text, fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: 11, color: T.muted, fontFamily: font }}>· {c.age}</span>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: STATUS_DOT[c.status] || STATUS_DOT.good,
                  marginLeft: "auto",
                }} />
              </div>
            ))}
          </div>
        )}

        {/* Insight */}
        {family.insight ? (
          <div style={{
            background: T.bg2, borderRadius: 10, padding: "9px 11px",
            fontSize: 12, color: T.text, lineHeight: 1.5, marginBottom: 9,
            fontFamily: font,
          }}>
            {family.insight}
          </div>
        ) : null}

        {/* Pills */}
        {(family.flags?.length > 0 || family.positives?.length > 0) && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 9 }}>
            {(family.flags || []).map((f, i) => (
              <span key={i} style={{
                background: "rgba(192,84,58,0.15)", color: "#E87A5E",
                borderRadius: 20, padding: "3px 9px", fontSize: 10, fontFamily: font,
              }}>{f}</span>
            ))}
            {(family.positives || []).map((p, i) => (
              <span key={i} style={{
                background: "rgba(92,122,94,0.15)", color: "#7BAA8A",
                borderRadius: 20, padding: "3px 9px", fontSize: 10, fontFamily: font,
              }}>{p}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center",
          paddingTop: 9, borderTop: `1px solid ${T.border}`,
          gap: 8,
        }}>
          <div style={{ fontSize: 11, color: T.subText, fontStyle: "italic", flex: 1, fontFamily: font, minWidth: 0 }}>
            {previewMsg ? `"${previewMsg}"` : "No messages yet"}
            {family.lastMessageTime ? ` · ${family.lastMessageTime}` : ""}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onCTA?.(family); }}
            style={{
              background: T.teal, color: "#fff",
              padding: "6px 14px", borderRadius: 20, border: "none",
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font,
              flexShrink: 0,
            }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
