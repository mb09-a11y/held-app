import { useState, useEffect } from "react";
import { useT, useApp, useStorage, ThemeToggle, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

const SUBSTACK_URL = "https://substack.com/@manu142886/notes?utm_campaign=profile&utm_medium=profile-page";

// ─── AGE LABEL ────────────────────────────────────────────────────────────────
function ageLabel(dob) {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44));
  return months < 24 ? `${months}mo` : `${Math.floor(months / 12)}y`;
}

// ─── DRAWER SECTION HEADER ────────────────────────────────────────────────────
function SectionHeader({ label, T }) {
  return (
    <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, padding: "16px 20px 6px" }}>
      {label}
    </div>
  );
}

// ─── DRAWER ROW ───────────────────────────────────────────────────────────────
function DrawerRow({ icon, label, onClick, danger, T, badge }) {
  return (
    <button onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        width: "100%", padding: "13px 20px",
        background: "none", border: "none", borderBottom: `1px solid ${T.border}`,
        fontFamily: font, fontSize: 14, fontWeight: 500,
        color: danger ? T.rose : T.text,
        cursor: "pointer", textAlign: "left",
        transition: "background .15s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = T.faint}
      onMouseLeave={e => e.currentTarget.style.background = "none"}
    >
      <span style={{ fontSize: 20, width: 28, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{ fontSize: 11, background: T.teal, color: "#fff", borderRadius: 10, padding: "2px 8px", fontWeight: 700 }}>
          {badge}
        </span>
      )}
      {!badge && <span style={{ fontSize: 16, color: T.muted, opacity: 0.5 }}>›</span>}
    </button>
  );
}

// ─── FIND A CONSULTANT PANEL ──────────────────────────────────────────────────
function FindConsultantPanel({ onClose, T }) {
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useApp();

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, name, user_email, role")
      .in("role", ["consultant", "consultant_internal"])
      .eq("subscription_active", true)
      .then(({ data }) => {
        setConsultants(data || []);
        setLoading(false);
      });
  }, []);

  async function requestConsultant(consultantId) {
    // Creates a family record linking this parent to the chosen consultant
    const { error } = await supabase.from("families").upsert({
      parent_id: currentUser.id,
      invite_email: currentUser.email,
      consultant_id: consultantId,
      require_intake: true,
      intake_complete: false,
    }, { onConflict: "parent_id" });

    if (!error) onClose();
  }

  return (
    <div style={{ padding: "0 0 20px" }}>
      <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ fontFamily: serif, fontSize: 18, color: T.headingText }}>Find a Consultant</div>
      </div>
      <div style={{ padding: "0 20px 16px", fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
        Connect with an RCC consultant for personalized sleep and nervous system support.
      </div>

      {loading && (
        <div style={{ padding: "20px", textAlign: "center", color: T.muted, fontFamily: font, fontSize: 13 }}>Loading consultants…</div>
      )}

      {!loading && consultants.length === 0 && (
        <div style={{ padding: "20px", textAlign: "center", color: T.muted, fontFamily: font, fontSize: 13, lineHeight: 1.6 }}>
          No consultants available right now. Check back soon or reach out directly at{" "}
          <a href="mailto:hello@rootedconnectionscollective.com" style={{ color: T.teal }}>hello@rootedconnectionscollective.com</a>
        </div>
      )}

      {consultants.map(c => (
        <div key={c.id} style={{ margin: "0 20px 12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.card, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: T.teal, flexShrink: 0 }}>
              {(c.name || "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{c.name}</div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>RCC Certified Consultant</div>
            </div>
            <button onClick={() => requestConsultant(c.id)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: T.teal, color: "#fff", fontFamily: font, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              Connect
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ACCOUNT PANEL ────────────────────────────────────────────────────────────
function AccountPanel({ onClose, onLogout, T }) {
  const { currentUser } = useApp();
  const [form, setForm] = useState({ name: currentUser?.name || "", email: currentUser?.email || "" });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function saveAccount() {
    setSaving(true); setError(""); setSaved(false);
    try {
      const updates = {};
      if (form.name !== currentUser?.name) {
        const { error: pe } = await supabase.from("profiles").update({ name: form.name }).eq("id", currentUser.id);
        if (pe) throw pe;
      }
      if (newPassword && newPassword.length >= 8) {
        const { error: ae } = await supabase.auth.updateUser({ password: newPassword });
        if (ae) throw ae;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message || "Failed to save.");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ padding: "0 0 20px" }}>
      <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ fontFamily: serif, fontSize: 18, color: T.headingText }}>My Account</div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: "14px 0", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${T.teal}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: T.teal }}>
            {(currentUser?.name || currentUser?.email || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: T.text }}>{currentUser?.name}</div>
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{currentUser?.email}</div>
            <div style={{ fontFamily: font, fontSize: 11, color: T.subText, marginTop: 2, textTransform: "capitalize" }}>
              {currentUser?.role?.replace("_", " ")}
            </div>
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6, fontFamily: font }}>Your name</div>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{ width: "100%", padding: "11px 13px", borderRadius: 10, fontFamily: font, fontSize: 13.5, background: T.inputBg, color: T.text, border: `1.5px solid ${T.border}`, outline: "none", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = T.teal}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>

        {/* New password */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6, fontFamily: font }}>New password</div>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current"
            style={{ width: "100%", padding: "11px 13px", borderRadius: 10, fontFamily: font, fontSize: 13.5, background: T.inputBg, color: T.text, border: `1.5px solid ${T.border}`, outline: "none", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = T.teal}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>

        {error && <div style={{ fontSize: 12.5, color: T.rose, marginBottom: 10, fontFamily: font }}>{error}</div>}

        <button onClick={saveAccount} disabled={saving}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: saving ? T.faint : T.teal, color: saving ? T.muted : "#fff", fontFamily: font, fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer", marginBottom: 12 }}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
        </button>

        <button onClick={onLogout}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 14, cursor: "pointer" }}>
          → Sign out
        </button>
      </div>
    </div>
  );
}

// ─── MAIN DRAWER ──────────────────────────────────────────────────────────────
export function AppDrawer({ isOpen, onClose, onLogout, onOpenNotifications, onOpenFindConsultant }) {
  const T = useT();
  const { currentUser, children, activeChild, setActiveChildId, families, themeMode } = useApp();
  const [panel, setPanel] = useState(null); // null | "account" | "find_consultant"

  const isParent = currentUser?.role === "parent" || currentUser?.role === "co_caregiver";
  const isConsultant = currentUser?.role === "consultant" || currentUser?.role === "consultant_internal";
  const isAdmin = currentUser?.role === "admin";
  const hasConsultant = families?.[0]?.consultant_id;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) { setPanel(null); return; }
    const handleKey = e => { if (e.key === "Escape") { setPanel(null); onClose(); } };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  if (!isOpen && !panel) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => { setPanel(null); onClose(); }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, transition: "opacity .2s", opacity: isOpen ? 1 : 0 }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 201,
        width: Math.min(320, window.innerWidth * 0.85),
        background: T.bg2, borderRight: `1px solid ${T.border}`,
        overflowY: "auto", overflowX: "hidden",
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .25s ease",
        display: "flex", flexDirection: "column",
      }}>

        {/* Sub-panels */}
        {panel === "account" && <AccountPanel onClose={() => setPanel(null)} onLogout={onLogout} T={T} />}
        {panel === "find_consultant" && <FindConsultantPanel onClose={() => setPanel(null)} T={T} />}

        {/* Main drawer content */}
        {!panel && (
          <>
            {/* Header — child info for parents, user info for others */}
            <div style={{ padding: "48px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
              {isParent && activeChild ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                    {activeChild.photo_url ? (
                      <img src={activeChild.photo_url} alt={activeChild.name}
                        style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }}
                        onError={e => { e.target.style.display = "none"; }} />
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🧒</div>
                    )}
                    <div>
                      <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText }}>{activeChild.name}</div>
                      <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>Currently viewing</div>
                      {ageLabel(activeChild.dob) && (
                        <div style={{ fontFamily: font, fontSize: 11, color: T.teal, marginTop: 2 }}>{ageLabel(activeChild.dob)} old</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${T.teal}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: T.teal }}>
                    {(currentUser?.name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: T.text }}>{currentUser?.name}</div>
                    <div style={{ fontFamily: font, fontSize: 12, color: T.muted, textTransform: "capitalize" }}>{currentUser?.role?.replace("_", " ")}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Child switcher for parents with multiple children */}
            {isParent && children && children.length > 1 && (
              <>
                <SectionHeader label="Switch child" T={T} />
                {children.filter(c => c.id !== activeChild?.id).map(c => (
                  <button key={c.id} onClick={() => { setActiveChildId(c.id); onClose(); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 20px", background: "none", border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.faint}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    {c.photo_url ? (
                      <img src={c.photo_url} alt={c.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${T.teal}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧒</div>
                    )}
                    <div>
                      <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 500, color: T.text }}>{c.name}</div>
                      {ageLabel(c.dob) && <div style={{ fontFamily: font, fontSize: 11.5, color: T.muted }}>{ageLabel(c.dob)}</div>}
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Find a consultant — for parents without one */}
            {isParent && !hasConsultant && (
              <>
                <SectionHeader label="Support" T={T} />
                <DrawerRow T={T} icon="🌿" label="Find a Consultant" onClick={() => { if (onOpenFindConsultant) { onClose(); onOpenFindConsultant(); } }} badge="New" />
              </>
            )}

            {/* Main links */}
            <SectionHeader label="Account" T={T} />
            <DrawerRow T={T} icon="👤" label="My Account" onClick={() => setPanel("account")} />
            <DrawerRow T={T} icon="🔔" label="Notifications" onClick={() => { onClose(); onOpenNotifications(); }} />

            {/* Resources */}
            <SectionHeader label="Resources" T={T} />
            <DrawerRow T={T} icon="✍️" label="The Space Between" onClick={() => window.open(SUBSTACK_URL, "_blank")} />
            <DrawerRow T={T} icon="💬" label="Get Support" onClick={() => window.open("mailto:hello@rootedconnectionscollective.com", "_blank")} />

            {/* Admin extras */}
            {isAdmin && (
              <>
                <SectionHeader label="Admin" T={T} />
                <DrawerRow T={T} icon="🔔" label="Notifications" onClick={() => { onClose(); onOpenNotifications(); }} />
              </>
            )}

            {/* Appearance */}
            <SectionHeader label="Appearance" T={T} />
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>
                  {themeMode === "light" ? "☀️" : "🌙"}
                </span>
                <span style={{ fontFamily: font, fontSize: 14, fontWeight: 500, color: T.text }}>
                  {themeMode === "light" ? "Light mode" : "Dark mode"}
                </span>
              </div>
              <ThemeToggle />
            </div>

            {/* Sign out at bottom */}
            <div style={{ flex: 1 }} />
            <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.border}`, marginTop: 20 }}>
              <button onClick={onLogout}
                style={{ width: "100%", padding: "11px", borderRadius: 10, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span>→</span> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── HAMBURGER BUTTON ─────────────────────────────────────────────────────────
export function HamburgerButton({ onOpen, T }) {
  return (
    // Hide on desktop — sidebar handles navigation there
    <button onClick={onOpen} className="rcc-hamburger"
      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 8, color: T.text, fontSize: 20, lineHeight: 1, flexDirection: "column", gap: 4, alignItems: "center", justifyContent: "center" }}>
      <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />
      <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />
      <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />
    </button>
  );
}
