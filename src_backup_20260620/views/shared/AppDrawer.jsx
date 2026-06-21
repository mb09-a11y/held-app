// src/views/shared/AppDrawer.jsx
// The slide-out sidebar drawer.
//
// V2 changes:
//   - "Switch Child" section always visible for parents (not just multi-child)
//   - "+ Add a child" row at bottom of child section
//   - "Invite co-caregiver" row in Account section (highlighted)
//   - ChildSwitcher component REMOVED — child context now lives in top bar pill
//   - RCC earth palette via T tokens
//   - Cormorant Garamond for headings via serif font token

import { useState, useEffect } from "react";
import { useT, useApp, font, serif, EyeIcon } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

const SUBSTACK_URL = "https://substack.com/@manu142886/notes?utm_campaign=profile&utm_medium=profile-page";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ageLabel(dob) {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44));
  return months < 24 ? `${months}mo` : `${Math.floor(months / 12)}y`;
}

function childEmoji(child) {
  return child?.gender === "girl" ? "👧" : child?.gender === "boy" ? "👦" : "🧒";
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ label, T }) {
  return (
    <div style={{
      fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase",
      color: T.subText, fontFamily: font, padding: "16px 20px 6px",
    }}>
      {label}
    </div>
  );
}

// ─── DRAWER ROW ───────────────────────────────────────────────────────────────
function DrawerRow({ icon, label, sublabel, onClick, danger, highlight, T, badge }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 14,
      width: "100%", padding: "12px 20px",
      background: highlight ? T.inviteHighlight : "none",
      border: "none",
      borderBottom: `1px solid ${T.border}`,
      borderLeft: highlight ? `3px solid ${T.teal}` : "3px solid transparent",
      fontFamily: font, fontSize: 14, fontWeight: 500,
      color: danger ? T.rose : T.text,
      cursor: "pointer", textAlign: "left",
      transition: "background .15s",
    }}
      onMouseEnter={e => { if (!highlight) e.currentTarget.style.background = T.faint; }}
      onMouseLeave={e => { if (!highlight) e.currentTarget.style.background = "none"; }}
    >
      <span style={{ fontSize: 20, width: 28, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block" }}>{label}</span>
        {sublabel && (
          <span style={{ display: "block", fontSize: 11, color: T.muted, marginTop: 1 }}>{sublabel}</span>
        )}
      </span>
      {badge && (
        <span style={{
          fontSize: 11, background: T.teal, color: "#fff",
          borderRadius: 10, padding: "2px 8px", fontWeight: 700,
        }}>
          {badge}
        </span>
      )}
      {!badge && <span style={{ fontSize: 16, color: T.muted, opacity: 0.4 }}>›</span>}
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
      .then(({ data }) => { setConsultants(data || []); setLoading(false); });
  }, []);

  async function requestConsultant(consultantId) {
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
        <div style={{ padding: "20px", textAlign: "center", color: T.muted, fontFamily: font, fontSize: 13 }}>
          Loading consultants…
        </div>
      )}

      {!loading && consultants.length === 0 && (
        <div style={{ padding: "20px", textAlign: "center", color: T.muted, fontFamily: font, fontSize: 13, lineHeight: 1.6 }}>
          No consultants available right now.{" "}
          <a href="mailto:hello@rootedconnectionscollective.com" style={{ color: T.teal }}>
            Reach out directly →
          </a>
        </div>
      )}

      {consultants.map(c => (
        <div key={c.id} style={{ margin: "0 20px 12px", borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: T.teal, flexShrink: 0 }}>
              {(c.name || "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{c.name}</div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>RCC Certified Consultant</div>
            </div>
            <button onClick={() => requestConsultant(c.id)} style={{
              padding: "7px 14px", borderRadius: 10, border: "none",
              background: T.teal, color: "#fff",
              fontFamily: font, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            }}>
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
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function saveAccount() {
    setSaving(true); setError(""); setSaved(false);
    try {
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

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6, fontFamily: font }}>Your name</div>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{ width: "100%", padding: "11px 13px", borderRadius: 12, fontFamily: font, fontSize: 13.5, background: T.inputBg, color: T.text, border: `1.5px solid ${T.border}`, outline: "none", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = T.teal}
            onBlur={e => e.target.style.borderColor = T.border}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6, fontFamily: font }}>New password</div>
          <div style={{ position: "relative" }}>
            <input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current"
              style={{ width: "100%", padding: "11px 40px 11px 13px", borderRadius: 12, fontFamily: font, fontSize: 13.5, background: T.inputBg, color: T.text, border: `1.5px solid ${T.border}`, outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = T.teal}
              onBlur={e => e.target.style.borderColor = T.border}
            />
            <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? "Hide password" : "Show password"}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, margin: 0, cursor: "pointer", display: "flex", alignItems: "center", color: T.muted, lineHeight: 0 }}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        {error && <div style={{ fontSize: 12.5, color: T.rose, marginBottom: 10, fontFamily: font }}>{error}</div>}

        <button onClick={saveAccount} disabled={saving} style={{
          width: "100%", padding: "12px", borderRadius: 12, border: "none",
          background: saving ? T.faint : T.teal, color: saving ? T.muted : "#fff",
          fontFamily: font, fontSize: 14, fontWeight: 600,
          cursor: saving ? "default" : "pointer", marginBottom: 12,
        }}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
        </button>

        <button onClick={onLogout} style={{
          width: "100%", padding: "12px", borderRadius: 12,
          border: `1px solid ${T.border}`, background: "none",
          color: T.muted, fontFamily: font, fontSize: 14, cursor: "pointer",
        }}>
          → Sign out
        </button>
      </div>
    </div>
  );
}

// ─── MAIN DRAWER ──────────────────────────────────────────────────────────────
export function AppDrawer({
  isOpen, onClose, onLogout,
  onOpenNotifications, onOpenFindConsultant,
  onAddChild,        // () => void — triggers ChildInfoStep in RCCShell
  onInviteCo,        // () => void — triggers CoCaregiversModal in RCCShell
  onLibrary,         // () => void — navigates to library tab
}) {
  const T = useT();
  const { currentUser, children, activeChild, setActiveChildId, families, themeMode, themeToggle } = useApp();
  function toggleTheme() { if (themeToggle) themeToggle(); }
  const [panel, setPanel] = useState(null); // null | "account" | "find_consultant"
  const [deletingChildId, setDeletingChildId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function deleteChild(childId) {
    setDeletingChildId(childId);
    try {
      await supabase.from("children").delete().eq("id", childId);
      // Refresh page so children list updates
      window.location.reload();
    } catch (e) {
      console.error("Failed to delete child:", e);
    } finally {
      setDeletingChildId(null);
      setConfirmDeleteId(null);
    }
  }

  const isParent = currentUser?.role === "parent" || currentUser?.role === "co_caregiver";
  const isConsultant = currentUser?.role === "consultant" || currentUser?.role === "consultant_internal";
  const isAdmin = currentUser?.role === "admin";
  const hasConsultant = families?.[0]?.consultant_id;
  const isCo = currentUser?.role === "co_caregiver";

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
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 200,
          transition: "opacity .2s", opacity: isOpen ? 1 : 0,
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 201,
        width: Math.min(320, typeof window !== "undefined" ? window.innerWidth * 0.85 : 300),
        background: T.bg2,
        borderRight: `1px solid ${T.border}`,
        overflowY: "auto", overflowX: "hidden",
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .25s ease",
        display: "flex", flexDirection: "column",
      }}>
        {/* Sub-panels */}
        {panel === "account" && <AccountPanel onClose={() => setPanel(null)} onLogout={onLogout} T={T} />}
        {panel === "find_consultant" && <FindConsultantPanel onClose={() => setPanel(null)} T={T} />}

        {/* Main content */}
        {!panel && (
          <>
            {/* ── Header ── */}
            <div style={{ padding: "48px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
              {isParent && activeChild ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {activeChild.photo_url ? (
                    <img src={activeChild.photo_url} alt={activeChild.name}
                      style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }}
                      onError={e => e.target.style.display = "none"}
                    />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                      {childEmoji(activeChild)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText, lineHeight: 1.1 }}>
                      {activeChild.name}
                    </div>
                    <div style={{ fontFamily: font, fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                      Currently viewing
                    </div>
                    {ageLabel(activeChild.dob) && (
                      <div style={{ fontFamily: font, fontSize: 11.5, color: T.teal, marginTop: 2, fontWeight: 600 }}>
                        {ageLabel(activeChild.dob)} old
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${T.teal}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: T.teal }}>
                    {(currentUser?.name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: T.text }}>{currentUser?.name}</div>
                    <div style={{ fontFamily: font, fontSize: 12, color: T.muted, textTransform: "capitalize" }}>
                      {currentUser?.role?.replace("_", " ")}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Switch Child (always visible for parents) ── */}
            {isParent && (
              <>
                <SectionHeader label="Switch Child" T={T} />

                {/* Active child — shown first so user knows where they are */}
                {activeChild && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 20px",
                    background: `${T.teal}10`,
                    borderLeft: `3px solid ${T.teal}`,
                    borderBottom: `1px solid ${T.border}`,
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      {childEmoji(activeChild)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: T.teal }}>{activeChild.name}</div>
                      {ageLabel(activeChild.dob) && (
                        <div style={{ fontFamily: font, fontSize: 11.5, color: T.muted }}>{ageLabel(activeChild.dob)}</div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: T.teal, fontFamily: font, fontWeight: 600, marginRight: 8 }}>Active</span>
                    {confirmDeleteId === activeChild.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={(e) => { e.stopPropagation(); deleteChild(activeChild.id); }}
                          style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, border: "none", background: "#C07070", color: "#fff", cursor: "pointer" }}>
                          {deletingChildId === activeChild.id ? "…" : "Delete"}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                          style={{ fontSize: 10, padding: "3px 8px", borderRadius: 8, border: `1px solid ${T.border}`, background: "none", color: T.muted, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(activeChild.id); }}
                        style={{ fontSize: 14, background: "none", border: "none", cursor: "pointer", color: T.muted, opacity: 0.5, padding: "2px 4px", lineHeight: 1 }}
                        title="Delete child">
                        🗑
                      </button>
                    )}
                  </div>
                )}

                {/* Other children */}
                {children && children.filter(c => c.id !== activeChild?.id).map(c => (
                  <div key={c.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      width: "100%", padding: "12px 20px",
                      borderLeft: "3px solid transparent",
                      borderBottom: `1px solid ${T.border}`,
                      cursor: "pointer", textAlign: "left",
                      background: "none",
                    }}
                    onClick={() => { setActiveChildId(c.id); onClose(); }}
                    onMouseEnter={e => e.currentTarget.style.background = T.faint}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    {c.photo_url ? (
                      <img src={c.photo_url} alt={c.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.faint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                        {childEmoji(c)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 500, color: T.text }}>{c.name}</div>
                      {ageLabel(c.dob) && <div style={{ fontFamily: font, fontSize: 11.5, color: T.muted }}>{ageLabel(c.dob)}</div>}
                    </div>
                    {confirmDeleteId === c.id ? (
                      <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => deleteChild(c.id)}
                          style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, border: "none", background: "#C07070", color: "#fff", cursor: "pointer" }}>
                          {deletingChildId === c.id ? "…" : "Delete"}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          style={{ fontSize: 10, padding: "3px 8px", borderRadius: 8, border: `1px solid ${T.border}`, background: "none", color: T.muted, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(c.id); }}
                        style={{ fontSize: 14, background: "none", border: "none", cursor: "pointer", color: T.muted, opacity: 0.5, padding: "2px 4px", lineHeight: 1 }}
                        title="Delete child">
                        🗑
                      </button>
                    )}
                  </div>
                ))}

                {/* Add a child — always available for primary parents (not co-caregivers) */}
                {!isCo && (
                  <button onClick={() => { if (onAddChild) { onAddChild(); onClose(); } }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      width: "100%", padding: "12px 20px",
                      background: "none", border: "none",
                      borderLeft: "3px solid transparent",
                      borderBottom: `1px solid ${T.border}`,
                      cursor: "pointer", textAlign: "left",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = T.faint}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: T.muted }}>
                      ＋
                    </div>
                    <div>
                      <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 500, color: T.teal }}>Add a child</div>
                      <div style={{ fontFamily: font, fontSize: 11.5, color: T.muted }}>Set up a new profile</div>
                    </div>
                  </button>
                )}
              </>
            )}

            {/* ── Find a consultant (parents without one) ── */}
            {isParent && !hasConsultant && (
              <>
                <SectionHeader label="Support" T={T} />
                <DrawerRow T={T} icon="🌿" label="Find a Consultant" onClick={() => {
                  if (onOpenFindConsultant) { onClose(); onOpenFindConsultant(); }
                }} badge="New" />
              </>
            )}

            {/* ── Account ── */}
            <SectionHeader label="Account" T={T} />
            <DrawerRow T={T} icon="👤" label="My Account" onClick={() => setPanel("account")} />
            <DrawerRow T={T} icon="🔔" label="Notifications" onClick={() => { onClose(); onOpenNotifications(); }} />

            {/* Co-caregiver invite — highlighted, parents only, not co-caregivers themselves */}
            {isParent && !isCo && (
              <DrawerRow
                T={T}
                icon="🤝"
                label="Invite co-caregiver"
                sublabel="Share access with a partner"
                highlight
                onClick={() => { if (onInviteCo) { onInviteCo(); onClose(); } }}
              />
            )}

            {/* ── Resources ── */}
            <SectionHeader label="Resources" T={T} />
            {isParent && onLibrary && (
              <DrawerRow T={T} icon="📚" label="Library" sublabel="Courses, guides & scripts" onClick={() => { onLibrary(); onClose(); }} />
            )}
            <DrawerRow T={T} icon="✍️" label="The Space Between" onClick={() => window.open(SUBSTACK_URL, "_blank")} />
            <DrawerRow T={T} icon="💬" label="Get Support" onClick={() => window.open("mailto:hello@rootedconnectionscollective.com", "_blank")} />

            {isAdmin && (
              <>
                <SectionHeader label="Admin" T={T} />
                <DrawerRow T={T} icon="🔔" label="Notifications" onClick={() => { onClose(); onOpenNotifications(); }} />
              </>
            )}

            {/* ── Appearance ── */}
            <SectionHeader label="Appearance" T={T} />
            <div style={{
              padding: "12px 20px", borderBottom: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>
                  {themeMode === "light" ? "☀️" : "🌙"}
                </span>
                <span style={{ fontFamily: font, fontSize: 14, fontWeight: 500, color: T.text }}>
                  {themeMode === "light" ? "Light mode" : "Dark mode"}
                </span>
              </div>
              <button
                onClick={toggleTheme}
                style={{
                  background: themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(92,122,94,0.12)',
                  border: '1.5px solid ' + (themeMode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(92,122,94,0.25)'),
                  borderRadius: 20,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: themeMode === 'dark' ? 'rgba(255,255,255,0.7)' : '#5C7A5E',
                  transition: 'all .2s',
                }}
              >
                {themeMode === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>

            {/* ── Sign out ── */}
            <div style={{ flex: 1 }} />
            <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.border}`, marginTop: 20 }}>
              <button onClick={onLogout} style={{
                width: "100%", padding: "11px", borderRadius: 12,
                border: `1px solid ${T.border}`, background: "none",
                color: T.muted, fontFamily: font, fontSize: 13.5,
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8,
              }}>
                <span>→</span> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── CHILD PILL ───────────────────────────────────────────────────────────────
// Persistent active-child indicator for the top bar.
// Tapping opens the AppDrawer for switching / adding children.
// Replaces the old ChildSwitcher component that lived inline on screens.
export function ChildPill({ onOpen }) {
  const T = useT();
  const { activeChild } = useApp();
  if (!activeChild) return null;

  const age = ageLabel(activeChild.dob);

  return (
    <button onClick={onOpen} style={{
      display: "flex", alignItems: "center", gap: 5,
      background: `${T.teal}15`,
      border: `1px solid ${T.teal}30`,
      borderRadius: 20, padding: "4px 10px 4px 6px",
      cursor: "pointer",
      transition: "background .15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = `${T.teal}25`}
      onMouseLeave={e => e.currentTarget.style.background = `${T.teal}15`}
    >
      <span style={{ fontSize: 14 }}>{childEmoji(activeChild)}</span>
      <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: T.teal, lineHeight: 1 }}>
        {activeChild.name}
      </span>
      {age && (
        <span style={{ fontFamily: font, fontSize: 10.5, color: T.muted, lineHeight: 1 }}>
          · {age}
        </span>
      )}
    </button>
  );
}

// ─── HAMBURGER BUTTON ─────────────────────────────────────────────────────────
export function HamburgerButton({ onOpen, T }) {
  return (
    <button onClick={onOpen} className="rcc-hamburger"
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: "4px 6px", borderRadius: 8, color: T.text, fontSize: 20, lineHeight: 1,
        flexDirection: "column", gap: 4, alignItems: "center", justifyContent: "center",
      }}>
      <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />
      <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 2, margin: "4px 0" }} />
      <span style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 2 }} />
    </button>
  );
}
