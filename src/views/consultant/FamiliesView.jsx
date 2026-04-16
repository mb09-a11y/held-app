// views/consultant/FamiliesView.jsx
import { useState } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { useFamilies } from "./data/consultantStore.js";
import ClientCard from "./shared/ClientCard.jsx";

const FILTERS = ["All", "🔴 Urgent", "🟡 Watch", "🟢 On track"];
const URGENCY_ORDER = { urgent: 0, watch: 1, good: 2 };

export default function FamiliesView({ onNavigate }) {
  const T = useT();
  const { families } = useFamilies();
  const [filter, setFilter] = useState("All");

  const filtered = [...families]
    .sort((a, b) => (URGENCY_ORDER[a.urgency] ?? 3) - (URGENCY_ORDER[b.urgency] ?? 3))
    .filter(f => {
      if (filter === "All") return true;
      if (filter === "🔴 Urgent") return f.urgency === "urgent";
      if (filter === "🟡 Watch")  return f.urgency === "watch";
      if (filter === "🟢 On track") return f.urgency === "good";
      return true;
    });

  return (
    <div style={{ background: T.gradientBg, flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "14px 18px 2px" }}>
        <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 500, color: T.headingText, marginBottom: 4 }}>
          Your Families
        </div>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: font }}>
          Sorted by who needs you most
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, padding: "10px 18px", overflowX: "auto" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? T.teal : T.card,
            border: `1.5px solid ${filter === f ? "transparent" : T.border}`,
            borderRadius: 20, padding: "5px 13px",
            fontSize: 11, fontWeight: 500,
            color: filter === f ? "#fff" : T.muted,
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            fontFamily: font,
          }}>{f}</button>
        ))}
      </div>

      {filtered.map(fam => (
        <ClientCard key={fam.id} family={fam} onPress={() => onNavigate("family", { familyId: fam.id })} />
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: T.muted, fontFamily: font, fontSize: 14 }}>
          No families match this filter.
        </div>
      )}
    </div>
  );
}
