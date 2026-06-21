// shared/ChildSelector.jsx
import { useT, font } from "../../../core/shared.jsx";

const STATUS_DOT = { good: "#7FD98A", watch: "#C08A3A", urgent: "#C0543A" };

export default function ChildSelector({ children, activeChildId, onSelect }) {
  const T = useT();
  if (!children || children.length <= 1) return null;

  return (
    <div style={{ display: "flex", gap: 8, padding: "10px 18px 4px", overflowX: "auto" }}>
      {children.map(child => {
        const isOn = child.id === activeChildId;
        return (
          <button key={child.id} onClick={() => onSelect(child.id)} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "7px 13px", borderRadius: 20,
            border: `1.5px solid ${isOn ? "transparent" : T.border}`,
            background: isOn ? T.teal : T.card,
            cursor: "pointer", flexShrink: 0,
            transition: "all 0.18s",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: isOn ? "rgba(255,255,255,0.2)" : T.bg2,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12,
            }}>{child.emoji}</div>
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: isOn ? "#fff" : T.text,
              fontFamily: font,
            }}>{child.name}</span>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: STATUS_DOT[child.status] || "#999",
              marginLeft: 2,
            }} />
          </button>
        );
      })}
    </div>
  );
}
