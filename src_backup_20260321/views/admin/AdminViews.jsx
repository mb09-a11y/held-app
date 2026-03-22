import { useT, Card, font, serif } from "../../core/shared.jsx";

function AdminDashboard({ consultants, families }) {
  const T = useT();
  const stats = [
    { label: "Families", value: families.length, icon: "👨‍👩‍👧" },
    { label: "Consultants", value: consultants.length, icon: "👥" },
    { label: "Active plans", value: families.filter((f) => f.intake_complete).length, icon: "📋" },
    { label: "Pending intake", value: families.filter((f) => !f.intake_complete).length, icon: "⏳" },
  ];
  return (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {stats.map((s) => (
          <Card key={s.label}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: serif, fontSize: 28, color: T.headingText }}>{s.value}</div>
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}


function AdminConsultants({ consultants }) {
  const T = useT();
  return (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Consultants</h2>
      {consultants.map((c) => (
        <Card key={c.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.teal }}>
              {(c.name || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{c.name}</div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{c.user_email || c.email}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}


function AdminBilling() {
  const T = useT();
  return (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Billing</h2>
      <Card><p style={{ fontFamily: font, fontSize: 13, color: T.muted }}>Billing management coming soon.</p></Card>
    </div>
  );
}

// ─── INVITE PANELS ────────────────────────────────────────────────────────────

export { AdminDashboard, AdminConsultants, AdminBilling };
