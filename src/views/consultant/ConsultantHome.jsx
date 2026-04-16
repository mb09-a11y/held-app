// views/consultant/ConsultantHome.jsx
import { useT, font, serif } from "../../core/shared.jsx";
import { useFamilies } from "./data/consultantStore.js";
import ProactiveCard from "./shared/ProactiveCard.jsx";

const URGENCY_ORDER = { urgent: 0, watch: 1, good: 2 };

export default function ConsultantHome({ onNavigate, onOpenDrawer }) {
  const T = useT();
  const { families } = useFamilies();

  const sorted = [...families].sort(
    (a, b) => (URGENCY_ORDER[a.urgency] ?? 3) - (URGENCY_ORDER[b.urgency] ?? 3)
  );

  const urgent = families.filter(f => f.urgency === "urgent").length;
  const unread = families.filter(f => f.unread).length;

  // Theme-aware urgency strip colours — work in both light and dark
  const URGENCY_STRIP = {
    urgent: { dot: "🔴", bg: T.faint, border: "rgba(192,84,58,0.35)",  textColor: T.text },
    watch:  { dot: "🟡", bg: T.faint, border: "rgba(192,138,58,0.35)", textColor: T.text },
    good:   { dot: "🟢", bg: T.faint, border: T.border,                textColor: T.text },
  };

  return (
    <div style={{ background: T.gradientBg, flex: 1, overflowY: "auto" }}>

      {/* ── Hero ── */}
      <div style={{
        background: "linear-gradient(160deg, #2D4A35 0%, #3A3018 100%)",
        padding: "20px 18px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "1.5px solid rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>🌿</div>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: serif, fontSize: 22, fontStyle: "italic", color: "#fff", lineHeight: 1.3 }}>
              Good morning, Sarah.
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: font }}>
              {urgent > 0
                ? `${urgent} ${urgent === 1 ? "family needs" : "families need"} your attention today.`
                : "All families are on track today."}
            </div>
          </div>

          {/* Hamburger / account button */}
          <button
            onClick={onOpenDrawer}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 10, padding: "6px 10px",
              cursor: "pointer", color: "#fff",
              fontSize: 16, lineHeight: 1,
            }}
          >
            ☰
          </button>
        </div>

        {/* NS state pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 20, padding: "4px 12px",
          fontSize: 11, color: "rgba(255,255,255,0.85)",
          marginTop: 10, cursor: "pointer", fontFamily: font,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7FD98A" }} />
          I'm regulated — ready to reply
        </div>
      </div>

      {/* ── Priority strips ── */}
      <div style={{ padding: "12px 0 2px" }}>
        <div style={{
          padding: "4px 18px 8px", fontSize: 10, letterSpacing: "0.12em",
          textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font,
        }}>
          Needs attention first
        </div>

        {sorted.map(fam => {
          const st = URGENCY_STRIP[fam.urgency] || URGENCY_STRIP.good;
          return (
            <div
              key={fam.id}
              onClick={() => onNavigate("family", { familyId: fam.id })}
              style={{
                margin: "0 18px 8px", borderRadius: 14, padding: "11px 14px",
                background: st.bg, border: `1.5px solid ${st.border}`,
                display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 16 }}>{st.dot}</span>
              <div style={{ flex: 1, fontFamily: font }}>
  <div style={{ fontSize: 12, color: st.textColor, lineHeight: 1.35 }}>
    <strong>{fam.name}</strong>
  </div>

  {fam.children.length > 0 && (
    <div style={{ marginTop: 3, fontSize: 11, color: T.muted, lineHeight: 1.45 }}>
      {fam.children.map((c) => (
        <div key={c.id}>
          {c.name} {c.status === "urgent" ? "🔴" : c.status === "watch" ? "🟡" : "🟢"}
        </div>
      ))}
    </div>
  )}

  <div style={{ marginTop: 4, fontSize: 12, color: st.textColor, lineHeight: 1.45 }}>
    {fam.insight}
  </div>
</div>
              <span style={{ fontSize: 14, color: T.muted }}>›</span>
            </div>
          );
        })}
      </div>

      {/* ── Stats row ── */}
      <div style={{
        padding: "4px 18px 8px", fontSize: 10, letterSpacing: "0.12em",
        textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font,
      }}>
        This week
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, margin: "0 18px 10px" }}>
        {[
          { num: urgent,          lbl: "Urgent",       color: urgent > 0 ? "#C0543A" : T.teal },
          { num: unread,          lbl: "Unread",        color: unread > 0 ? "#C08A3A" : T.teal },
          { num: families.length, lbl: "Active plans",  color: T.teal },
        ].map(s => (
          <div key={s.lbl} style={{
            background: T.card, borderRadius: 14, padding: "12px 10px",
            textAlign: "center", boxShadow: T.shadow,
          }}>
            <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, color: s.color, lineHeight: 1 }}>
              {s.num}
            </div>
            <div style={{
              fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
              color: T.muted, fontWeight: 600, marginTop: 3, fontFamily: font,
            }}>
              {s.lbl}
            </div>
          </div>
        ))}
      </div>

      {/* ── Flags shortcut ── */}
      <div
        onClick={() => onNavigate("flags")}
        style={{
          margin: "0 18px 10px",
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14, padding: "11px 14px",
          display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 18 }}>🚩</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: font }}>
            Flags &amp; Alerts
          </div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: font, marginTop: 1 }}>
            {urgent > 0 ? `${urgent} urgent · tap to review` : "No active flags right now"}
          </div>
        </div>
        <span style={{ fontSize: 14, color: T.muted }}>›</span>
      </div>

      {/* ── Proactive nudge ── */}
      <ProactiveCard
        icon="🔮"
        label="Tonight, expect"
        text="Leo Sharma's parent is statistically likely to reach out between 10pm–1am. Day 5 regression window. Prepare your response now."
        cta="Draft message →"
        onCta={() => onNavigate("responseBuilder", { familyId: "fam_sharma" })}
      />

    </div>
  );
}
