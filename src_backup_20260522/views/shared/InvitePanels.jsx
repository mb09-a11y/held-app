import { useT, Card, Btn, Input, font, serif } from "../../core/shared.jsx";

function InviteFamilyPanel({ form, setForm, onSend, onClose, busy, error, success }) {
  const T = useT();
  return (
    <div style={{ marginBottom: 20, padding: 20, borderRadius: 14, border: `1px solid ${T.border}`, background: T.card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText }}>Invite Family</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      {/* VIP context — explains what the family gets */}
      <div style={{
        marginBottom: 16, padding: "12px 14px", borderRadius: 10,
        background: `${T.teal}10`, border: `1px solid ${T.teal}25`,
      }}>
        <div style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: T.teal, marginBottom: 4 }}>
          🌿 This family gets VIP access — free
        </div>
        <div style={{ fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
          Families you invite get full Held access for the duration of your work together — sleep plan, full library, messaging, and everything in between. It's included in your client relationship.
        </div>
      </div>

      <Input label="Parent email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" required />
      <Input label="Family display name (optional)" value={form.display_name} onChange={v => setForm(f => ({ ...f, display_name: v }))} placeholder="e.g. The Johnson Family" />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={() => setForm(f => ({ ...f, require_intake: !f.require_intake }))}
          style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: form.require_intake ? T.teal : T.faint, position: "relative", transition: "background .2s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 2, left: form.require_intake ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
        </button>
        <div>
          <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text }}>Require intake form</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>Family will complete intake before accessing the app</div>
        </div>
      </div>
      {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{error}</div>}
      {success && <div style={{ fontSize: 12.5, color: T.sage, marginBottom: 10 }}>✓ {success}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={onSend} disabled={busy}>{busy ? "Sending…" : "Send invitation →"}</Btn>
        <button onClick={onClose} style={{ padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}


function InviteConsultantPanel({ form, setForm, onSend, onClose, busy, error, success }) {
  const T = useT();
  return (
    <div style={{ marginBottom: 20, padding: 20, borderRadius: 14, border: `1px solid ${T.border}`, background: T.card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText }}>Invite Consultant</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>
      <Input label="Consultant email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" required />
      <Input label="Consultant name (optional)" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Sarah M." />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={() => setForm(f => ({ ...f, consultant_internal: !f.consultant_internal }))}
          style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: form.consultant_internal ? T.teal : T.faint, position: "relative", transition: "background .2s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 2, left: form.consultant_internal ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
        </button>
        <div>
          <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text }}>Internal consultant</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>Part of the RCC team (vs. external/affiliate)</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={() => setForm(f => ({ ...f, payment_required: !f.payment_required }))}
          style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: form.payment_required ? T.teal : T.faint, position: "relative", transition: "background .2s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 2, left: form.payment_required ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
        </button>
        <div>
          <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text }}>Requires payment</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>Consultant must complete payment before accessing the platform</div>
        </div>
      </div>
      {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{error}</div>}
      {success && <div style={{ fontSize: 12.5, color: T.sage, marginBottom: 10 }}>✓ {success}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={onSend} disabled={busy}>{busy ? "Sending…" : "Send invitation →"}</Btn>
        <button onClick={onClose} style={{ padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── SHELL ────────────────────────────────────────────────────────────────────

export { InviteFamilyPanel, InviteConsultantPanel };

// ─── CO-CAREGIVER MODAL ───────────────────────────────────────────────────────
export function CoCaregiversModal({ onClose, email, setEmail, onSend, busy, error, success, T }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 24, width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText }}>Invite Co-Caregiver</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>
          They'll get an email invite and can view the sleep plan and check off items — but won't be able to change plan settings.
        </p>
        <Input label="Their email" value={email} onChange={setEmail} type="email" required />
        {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{error}</div>}
        {success && <div style={{ fontSize: 12.5, color: "#7BAA8A", marginBottom: 10 }}>✓ {success}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Btn onClick={onSend} disabled={busy}>{busy ? "Sending…" : "Send invite →"}</Btn>
          <button onClick={onClose} style={{ padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
