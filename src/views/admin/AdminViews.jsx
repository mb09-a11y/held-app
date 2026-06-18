import { useState, useEffect } from "react";
import { useT, useApp, Card, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

function timeAgo(iso) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function TierBadge({ tier, T }) {
  const config = {
    free:    { color: T.muted,   label: "Free" },
    plus:    { color: T.teal,    label: "Plus" },
    premium: { color: "#7BAA8A", label: "Premium" },
    vip:     { color: "#AA9B7B", label: "VIP" },
  };
  const c = config[tier] || config.free;
  return (
    <span style={{ fontSize: 11, fontFamily: font, fontWeight: 700, color: c.color, padding: "2px 8px", borderRadius: 20, background: `${c.color}18`, border: `1px solid ${c.color}30` }}>
      {c.label}
    </span>
  );
}

function StatusDot({ active }) {
  return <div style={{ width: 8, height: 8, borderRadius: "50%", background: active ? "#7BAA8A" : "#A87B8A", flexShrink: 0 }} />;
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
export function AdminDashboard({ consultants, families }) {
  const T = useT();
  const { currentUser } = useApp();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { title, items, type }

  useEffect(() => {
    supabase.from("profiles")
      .select("id, role, subscription_tier, subscription_active, payment_failed, ai_messages_used, name, user_email")
      .then(({ data }) => { setProfiles(data || []); setLoading(false); });
  }, []);

  const parents = profiles.filter(p => p.role === "parent" || p.role === "co_caregiver");
  const byTier = {
    vip:     parents.filter(p => p.subscription_tier === "vip").length,
    premium: parents.filter(p => p.subscription_tier === "premium").length,
    plus:    parents.filter(p => p.subscription_tier === "plus").length,
    free:    parents.filter(p => !p.subscription_tier || p.subscription_tier === "free").length,
  };
  const paymentFailed = parents.filter(p => p.payment_failed);
  const intakePending = families.filter(f => !f.intake_complete && f.require_intake);

  const validConsultantIds = new Set([
    ...consultants.map(c => c.id),
    currentUser?.id,
  ].filter(Boolean));
  const noConsultant = families.filter(f => !f.consultant_id || !validConsultantIds.has(f.consultant_id));

  // Lookup helper
  function consultantName(id) {
    if (id === currentUser?.id) return currentUser?.name || "You (Admin)";
    const c = consultants.find(c => c.id === id);
    return c?.name || c?.user_email || "Unknown";
  }

  const stats = [
    {
      label: "Total families", value: families.length, icon: "👨‍👩‍👧",
      onClick: () => setModal({
        title: "All Families",
        items: families.map(f => ({
          primary: f.display_name || f.invite_email || "Unnamed family",
          secondary: f.consultant_id ? `Consultant: ${consultantName(f.consultant_id)}` : "No consultant",
          tag: f.intake_complete ? "✓ Intake" : "⏳ Pending",
          tagColor: f.intake_complete ? "#7BAA8A" : "#A89B5A",
        })),
      }),
    },
    {
      label: "Consultants", value: consultants.length, icon: "👥",
      onClick: () => setModal({
        title: "All Consultants",
        items: consultants.map(c => ({
          primary: c.name || "Unnamed",
          secondary: c.user_email || c.email,
          tag: c.role === "consultant_internal" ? "Internal" : "External",
          tagColor: c.role === "consultant_internal" ? "#7BAA8A" : T.teal,
        })),
      }),
    },
    {
      label: "Intake pending", value: intakePending.length, icon: "⏳",
      alert: intakePending.length > 0,
      onClick: intakePending.length > 0 ? () => setModal({
        title: "Awaiting Intake",
        items: intakePending.map(f => ({
          primary: f.display_name || f.invite_email || "Unnamed family",
          secondary: f.invite_email,
          tag: "⏳ No intake",
          tagColor: "#A89B5A",
        })),
      }) : null,
    },
    {
      label: "No consultant", value: noConsultant.length, icon: "🔗",
      alert: noConsultant.length > 0,
      onClick: noConsultant.length > 0 ? () => setModal({
        title: "No Consultant Assigned",
        items: noConsultant.map(f => ({
          primary: f.display_name || f.invite_email || "Unnamed family",
          secondary: f.invite_email,
          tag: f.intake_complete ? "✓ Intake" : "⏳ Pending",
          tagColor: f.intake_complete ? "#7BAA8A" : "#A89B5A",
        })),
      }) : null,
    },
  ];

  return (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Dashboard</h2>

      {/* Drill-down modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end" }}
          onClick={() => setModal(null)}>
          <div style={{ background: T.bg2, borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText }}>{modal.title}</div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ overflowY: "auto", padding: "12px 20px 40px" }}>
              {modal.items.length === 0 && (
                <div style={{ fontFamily: font, fontSize: 13, color: T.muted, textAlign: "center", padding: "20px 0" }}>Nothing here.</div>
              )}
              {modal.items.map((item, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 2 }}>{item.primary}</div>
                    {item.secondary && <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{item.secondary}</div>}
                  </div>
                  {item.tag && (
                    <span style={{ fontSize: 11, fontFamily: font, fontWeight: 700, color: item.tagColor, padding: "2px 8px", borderRadius: 20, background: `${item.tagColor}18`, border: `1px solid ${item.tagColor}30`, flexShrink: 0 }}>
                      {item.tag}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <Card key={s.label}
            onClick={s.onClick || undefined}
            style={{
              border: s.alert ? `1px solid #A89B5A40` : undefined,
              cursor: s.onClick ? "pointer" : "default",
              transition: "opacity .15s",
            }}
            onMouseEnter={s.onClick ? e => e.currentTarget.style.opacity = ".8" : undefined}
            onMouseLeave={s.onClick ? e => e.currentTarget.style.opacity = "1" : undefined}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: serif, fontSize: 28, color: s.alert ? "#A89B5A" : T.headingText }}>{s.value}</div>
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 2 }}>{s.label}</div>
            {s.onClick && <div style={{ fontFamily: font, fontSize: 11, color: T.teal, marginTop: 6 }}>Tap to see list →</div>}
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, fontFamily: font, marginBottom: 14 }}>
          Subscription Breakdown
        </div>
        {loading ? (
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "VIP", color: "#AA9B7B", count: byTier.vip },
              { label: "Premium · $30/mo", color: "#7BAA8A", count: byTier.premium },
              { label: "Plus · $15/mo", color: T.teal, count: byTier.plus },
              { label: "Free", color: T.muted, count: byTier.free },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 90, fontFamily: font, fontSize: 12, fontWeight: 700, color: row.color }}>{row.label}</div>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: T.faint, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: row.color, width: parents.length ? `${(row.count / parents.length) * 100}%` : "0%", transition: "width .5s" }} />
                </div>
                <div style={{ fontFamily: font, fontSize: 12, color: T.muted, width: 24, textAlign: "right" }}>{row.count}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {paymentFailed.length > 0 && (
        <Card style={{ marginBottom: 16, border: `1px solid #A87B8A40`, background: "#A87B8A08" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#A87B8A", fontFamily: font, marginBottom: 10 }}>
            ⚠️ Payment Failed ({paymentFailed.length})
          </div>
          {paymentFailed.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ fontFamily: font, fontSize: 13, color: T.text, flex: 1 }}>{p.name || p.user_email}</div>
              <TierBadge tier={p.subscription_tier} T={T} />
            </div>
          ))}
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 8, lineHeight: 1.6 }}>
            Stripe will retry automatically. Go to Billing to manually override if needed.
          </div>
        </Card>
      )}

      {noConsultant.length > 0 && (
        <Card style={{ border: `1px solid #A89B5A40`, background: "#A89B5A08" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#A89B5A", fontFamily: font, marginBottom: 10 }}>
            🔗 No Consultant Assigned ({noConsultant.length})
          </div>
          {noConsultant.slice(0, 5).map(f => (
            <div key={f.id} style={{ fontFamily: font, fontSize: 13, color: T.muted, marginBottom: 4 }}>
              · {f.display_name || f.invite_email || "Unnamed family"}
            </div>
          ))}
          {noConsultant.length > 5 && (
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 4 }}>+ {noConsultant.length - 5} more — see Families tab</div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── ADMIN BILLING ────────────────────────────────────────────────────────────
export function AdminBilling() {
  const T = useT();
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("profiles")
      .select("id, name, user_email, subscription_tier, subscription_active, payment_failed, ai_messages_used, ai_messages_reset_at")
      .in("role", ["parent", "co_caregiver"])
      .order("subscription_tier")
      .then(({ data }) => { setParents(data || []); setLoading(false); });
  }, []);

  async function setTier(userId, tier) {
    setSaving(userId);
    await supabase.from("profiles").update({
      subscription_tier: tier,
      subscription_active: tier !== "free",
      payment_failed: false,
    }).eq("id", userId);
    setParents(prev => prev.map(p => p.id === userId
      ? { ...p, subscription_tier: tier, subscription_active: tier !== "free", payment_failed: false }
      : p
    ));
    setSaving(null);
  }

  async function resetAI(userId) {
    setSaving(userId + "_ai");
    await supabase.from("profiles").update({ ai_messages_used: 0, ai_messages_reset_at: new Date().toISOString() }).eq("id", userId);
    setParents(prev => prev.map(p => p.id === userId ? { ...p, ai_messages_used: 0 } : p));
    setSaving(null);
  }

  const filtered = parents.filter(p =>
    !search || (p.name || p.user_email || "").toLowerCase().includes(search.toLowerCase())
  );

  const TIERS = ["free", "plus", "premium", "vip"];

  return (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 6 }}>Billing</h2>
      <div style={{ fontFamily: font, fontSize: 13, color: T.muted, marginBottom: 20, lineHeight: 1.6 }}>
        Override subscription tiers, fix billing errors, and manage AI message usage.
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.inputBg, color: T.text, fontFamily: font, fontSize: 13, outline: "none", marginBottom: 16, boxSizing: "border-box" }}
      />
      {loading ? (
        <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(p => (
            <Card key={p.id} style={{ border: p.payment_failed ? `1px solid #A87B8A40` : undefined }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                    <StatusDot active={p.subscription_active} />
                    <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{p.name || "Unnamed"}</div>
                    <TierBadge tier={p.subscription_tier || "free"} T={T} />
                    {p.payment_failed && <span style={{ fontSize: 11, color: "#A87B8A", fontFamily: font, fontWeight: 700 }}>⚠️ Payment failed</span>}
                  </div>
                  <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 6 }}>{p.user_email}</div>
                  <div style={{ fontFamily: font, fontSize: 11, color: T.subText }}>
                    AI messages: {p.ai_messages_used || 0}
                    {(p.ai_messages_used || 0) > 0 && (
                      <button onClick={() => resetAI(p.id)} disabled={saving === p.id + "_ai"}
                        style={{ marginLeft: 8, background: "none", border: "none", color: T.teal, fontFamily: font, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                        {saving === p.id + "_ai" ? "Resetting…" : "Reset →"}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {TIERS.map(tier => (
                    <button key={tier} onClick={() => setTier(p.id, tier)}
                      disabled={saving === p.id || (p.subscription_tier || "free") === tier}
                      style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: (p.subscription_tier || "free") === tier ? `${T.teal}20` : T.faint, color: (p.subscription_tier || "free") === tier ? T.teal : T.muted, fontFamily: font, fontSize: 11, fontWeight: (p.subscription_tier || "free") === tier ? 700 : 400, cursor: (p.subscription_tier || "free") === tier ? "default" : "pointer", textTransform: "capitalize" }}>
                      {saving === p.id ? "…" : tier}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div style={{ fontFamily: font, fontSize: 13, color: T.muted, textAlign: "center", padding: "20px 0" }}>No parents found.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN CONSULTANTS ────────────────────────────────────────────────────────
export function AdminConsultants({ consultants, onInviteConsultant }) {
  const T = useT();
  const [caseloads, setCaseloads] = useState({});
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    if (!consultants.length) return;
    supabase.from("families").select("consultant_id, id, intake_complete")
      .in("consultant_id", consultants.map(c => c.id))
      .then(({ data }) => {
        const by = {};
        (data || []).forEach(f => { if (!by[f.consultant_id]) by[f.consultant_id] = []; by[f.consultant_id].push(f); });
        setCaseloads(by);
      });
  }, [consultants.length]);

  async function toggleInternal(c) {
    setSaving(c.id);
    const newRole = c.role === "consultant_internal" ? "consultant" : "consultant_internal";
    await supabase.from("profiles").update({ role: newRole }).eq("id", c.id);
    setSaved(c.id);
    setTimeout(() => setSaved(null), 2000);
    setSaving(null);
    window.location.reload();
  }

  async function resendInvite(email) {
    await supabase.functions.invoke("send-invite", { body: { email, isConsultantInvite: true, role: "consultant" } });
    alert(`Invite resent to ${email}`);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText }}>Consultants</h2>
        {onInviteConsultant && (
          <button onClick={onInviteConsultant}
            style={{ padding: "9px 16px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Invite Consultant
          </button>
        )}
      </div>
      {consultants.length === 0 && <Card><div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>No consultants yet.</div></Card>}
      {consultants.map(c => {
        const fams = caseloads[c.id] || [];
        const isInternal = c.role === "consultant_internal";
        return (
          <Card key={c.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: T.teal, flexShrink: 0 }}>
                {(c.name || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{c.name || "Unnamed"}</div>
                  <span style={{ fontSize: 11, fontFamily: font, fontWeight: 700, color: isInternal ? "#7BAA8A" : T.teal, padding: "2px 8px", borderRadius: 20, background: isInternal ? "#7BAA8A18" : `${T.teal}18`, border: `1px solid ${isInternal ? "#7BAA8A30" : T.teal + "30"}` }}>
                    {isInternal ? "Internal · Free" : "External · $20/mo"}
                  </span>
                </div>
                <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 8 }}>{c.user_email || c.email}</div>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>
                    <span style={{ fontWeight: 700, color: T.text }}>{fams.length}</span> {fams.length === 1 ? "family" : "families"}
                  </div>
                  <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>
                    <span style={{ fontWeight: 700, color: T.text }}>{fams.filter(f => f.intake_complete).length}</span> intake complete
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => toggleInternal(c)} disabled={saving === c.id}
                    style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.faint, color: T.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>
                    {saving === c.id ? "Saving…" : saved === c.id ? "✓ Saved" : isInternal ? "Switch to External" : "Switch to Internal"}
                  </button>
                  <button onClick={() => resendInvite(c.user_email || c.email)}
                    style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.faint, color: T.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>
                    Resend invite
                  </button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── ADMIN FAMILIES ───────────────────────────────────────────────────────────
export function AdminFamilies({ families, consultants, onInviteFamily }) {
  const T = useT();
  const { currentUser } = useApp();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(null);
  const [resent, setResent] = useState(null);

  // Build consultant list — admin is now included in the consultants query,
  // but add a fallback in case they aren't, and label them clearly
  const allConsultants = consultants.map(c =>
    c.id === currentUser?.id ? { ...c, name: `${c.name || "Admin"} (you)` } : c
  );
  if (currentUser?.role === "admin" && !allConsultants.find(c => c.id === currentUser.id)) {
    allConsultants.unshift({ id: currentUser.id, name: `${currentUser.name || "Admin"} (you)`, user_email: currentUser.email });
  }

  const filtered = families.filter(f =>
    !search || (f.display_name || f.invite_email || "").toLowerCase().includes(search.toLowerCase())
  );

  async function assignConsultant(familyId, consultantId) {
    setSaving(familyId);
    await supabase.from("families").update({ consultant_id: consultantId || null }).eq("id", familyId);
    if (consultantId) {
      const { data: fam } = await supabase.from("families").select("parent_id").eq("id", familyId).maybeSingle();
      if (fam?.parent_id) await supabase.from("profiles").update({ subscription_tier: "vip" }).eq("id", fam.parent_id);
    } else {
      await supabase.rpc("remove_family_from_consultant", { p_family_id: familyId }).catch(() => {});
    }
    setSaving(null);
    window.location.reload();
  }

  async function resendInvite(f) {
    setResent(f.id);
    await supabase.functions.invoke("send-invite", {
      body: { email: f.invite_email, inviteToken: f.invite_token, requireIntake: f.require_intake },
    });
    setTimeout(() => setResent(null), 2000);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText }}>Families</h2>
        {onInviteFamily && (
          <button onClick={onInviteFamily}
            style={{ padding: "9px 16px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Invite Family
          </button>
        )}
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search families…"
        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.inputBg, color: T.text, fontFamily: font, fontSize: 13, outline: "none", marginBottom: 16, boxSizing: "border-box" }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(f => {
          return (
            <Card key={f.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                    <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{f.display_name || f.invite_email || "Unnamed family"}</div>
                    {f.intake_complete
                      ? <span style={{ fontSize: 11, color: "#7BAA8A", fontFamily: font }}>✓ Intake</span>
                      : <span style={{ fontSize: 11, color: "#A89B5A", fontFamily: font }}>⏳ Awaiting intake</span>
                    }
                  </div>
                  <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 10 }}>{f.invite_email}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ fontFamily: font, fontSize: 12, color: T.muted, flexShrink: 0 }}>Consultant:</div>
                    <select value={f.consultant_id || ""} onChange={e => assignConsultant(f.id, e.target.value || null)} disabled={saving === f.id}
                      style={{ flex: 1, padding: "5px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg, color: T.text, fontFamily: font, fontSize: 12, outline: "none", cursor: "pointer" }}>
                      <option value="">— Unassigned —</option>
                      {allConsultants.map(c => <option key={c.id} value={c.id}>{c.name || c.user_email}</option>)}
                    </select>
                    {saving === f.id && <span style={{ fontFamily: font, fontSize: 11, color: T.muted }}>Saving…</span>}
                  </div>
                  {f.invite_email && (
                    <button onClick={() => resendInvite(f)}
                      style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.teal, cursor: "pointer", padding: 0, fontWeight: 600 }}>
                      {resent === f.id ? "✓ Sent!" : "Resend invite →"}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, textAlign: "center", padding: "20px 0" }}>No families found.</div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN SETTINGS ───────────────────────────────────────────────────────────
export function AdminSettings() {
  const T = useT();
  const { currentUser } = useApp();
  const [form, setForm] = useState({ name: currentUser?.name || "" });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      await supabase.from("profiles").update({ name: form.name }).eq("id", currentUser.id);
      if (newPassword && newPassword.length >= 8) {
        const { error: ae } = await supabase.auth.updateUser({ password: newPassword });
        if (ae) throw ae;
      }
      setSaved(true); setNewPassword("");
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message || "Failed to save."); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Settings</h2>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, fontFamily: font, marginBottom: 14 }}>Admin Profile</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6, fontFamily: font }}>Name</div>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{ width: "100%", padding: "10px 13px", borderRadius: 10, fontFamily: font, fontSize: 13.5, background: T.inputBg, color: T.text, border: `1.5px solid ${T.border}`, outline: "none", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = T.teal} onBlur={e => e.target.style.borderColor = T.border} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6, fontFamily: font }}>Email</div>
          <input value={currentUser?.email || ""} disabled
            style={{ width: "100%", padding: "10px 13px", borderRadius: 10, fontFamily: font, fontSize: 13.5, background: T.faint, color: T.muted, border: `1.5px solid ${T.border}`, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6, fontFamily: font }}>New password</div>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current"
            style={{ width: "100%", padding: "10px 13px", borderRadius: 10, fontFamily: font, fontSize: 13.5, background: T.inputBg, color: T.text, border: `1.5px solid ${T.border}`, outline: "none", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = T.teal} onBlur={e => e.target.style.borderColor = T.border} />
        </div>
        {error && <div style={{ fontSize: 12.5, color: T.rose, marginBottom: 10, fontFamily: font }}>{error}</div>}
        <button onClick={save} disabled={saving}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: saving ? T.faint : T.teal, color: saving ? T.muted : "#fff", fontFamily: font, fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
        </button>
      </Card>
      <Card>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, fontFamily: font, marginBottom: 10 }}>Platform Info</div>
        {[
          { label: "App", value: "Held · Rooted Connections Collective" },
          { label: "Support", value: "hello@rootedconnectionscollective.com" },
        ].map(row => (
          <div key={row.label} style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, width: 70, flexShrink: 0 }}>{row.label}</div>
            <div style={{ fontFamily: font, fontSize: 12, color: T.text }}>{row.value}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
