import { useT, useApp, font, serif } from "../core/shared.jsx";
import { ThemeToggle } from "../core/shared.jsx";

const SUBSTACK_URL = "https://substack.com/@manu142886/notes?utm_campaign=profile&utm_medium=profile-page";

function BottomNav({ tabs, active, setActive, unread }) {
  const T = useT();
  return (
    <div className="rcc-bottom-nav"
      style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, borderTop: `1px solid ${T.border}`, background: T.bg, padding: "8px 0 env(safe-area-inset-bottom, 16px)" }}>
      {tabs.map((t) => {
        const badge = unread?.[t.id];
        return (
          <button key={t.id} onClick={() => setActive(t.id)}
            style={{ flex: 1, minWidth: 0, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", cursor: "pointer", position: "relative", color: active === t.id ? T.teal : T.muted, fontFamily: font, fontSize: 10, fontWeight: active === t.id ? 700 : 400, transition: "color .2s", overflow: "hidden" }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", textAlign: "center" }}>{t.label}</span>
            {badge > 0 && (
              <div style={{ position: "absolute", top: 4, right: "50%", transform: "translateX(10px)", width: 16, height: 16, borderRadius: "50%", background: T.rose, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>
                {badge}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── SIDE NAV ─────────────────────────────────────────────────────────────────
export function SideNav({ tabs, active, setActive, onLogout, onOpenNotifications, onOpenAccount, onOpenFindConsultant, currentUser, T }) {
  const { children, activeChild, setActiveChildId, families } = useApp();

  const isParent = currentUser?.role === "parent" || currentUser?.role === "co_caregiver";
  const hasConsultant = families?.[0]?.consultant_id;

  function SideRow({ icon, label, onClick }) {
    return (
      <button onClick={onClick}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 20px", background: "none", border: "none", borderLeft: "3px solid transparent", fontFamily: font, fontSize: 13, color: T.muted, cursor: "pointer", textAlign: "left", transition: "color .15s" }}
        onMouseEnter={e => e.currentTarget.style.color = T.text}
        onMouseLeave={e => e.currentTarget.style.color = T.muted}>
        <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{icon}</span>
        {label}
      </button>
    );
  }

  return (
    <div className="rcc-sidebar">
      {/* Brand */}
      <div style={{ padding: "0 20px 20px", borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
        <div style={{ fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase", color: T.subText, marginBottom: 4 }}>Rooted Connections</div>
        <div style={{ fontFamily: serif, fontSize: 17, color: T.headingText }}>Collective</div>
      </div>

      {/* Main tabs */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 20px", background: active === t.id ? `${T.teal}14` : "none", border: "none", borderLeft: active === t.id ? `3px solid ${T.teal}` : "3px solid transparent", fontFamily: font, fontSize: 13.5, color: active === t.id ? T.teal : T.text, cursor: "pointer", textAlign: "left", fontWeight: active === t.id ? 600 : 400 }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}

        {/* Child switcher for parents with multiple children */}
        {isParent && children && children.length > 1 && (
          <>
            <div style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: T.subText, fontFamily: font, padding: "16px 20px 6px" }}>
              Switch child
            </div>
            {children.map(c => (
              <button key={c.id} onClick={() => setActiveChildId(c.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 20px", background: activeChild?.id === c.id ? `${T.teal}10` : "none", border: "none", borderLeft: activeChild?.id === c.id ? `3px solid ${T.teal}` : "3px solid transparent", fontFamily: font, fontSize: 13, color: activeChild?.id === c.id ? T.teal : T.text, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 15 }}>🧒</span>
                {c.name}
              </button>
            ))}
          </>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: T.border, margin: "12px 0" }} />

        {/* Find a consultant */}
        {isParent && !hasConsultant && (
          <SideRow icon="🌿" label="Find a Consultant" onClick={() => onOpenFindConsultant && onOpenFindConsultant()} />
        )}

        {/* Account links */}
        <SideRow icon="👤" label="My Account" onClick={onOpenAccount} />
        <SideRow icon="🔔" label="Notifications" onClick={onOpenNotifications} />
        <SideRow icon="✍️" label="The Space Between" onClick={() => window.open(SUBSTACK_URL, "_blank")} />
        <SideRow icon="💬" label="Get Support" onClick={() => window.open("mailto:hello@rootedconnectionscollective.com", "_blank")} />

        {/* Appearance */}
        <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: font, fontSize: 13, color: T.muted }}>Appearance</span>
          <ThemeToggle />
        </div>
      </div>

      {/* User info + sign out */}
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${T.teal}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.teal, flexShrink: 0 }}>
            {(currentUser?.name || currentUser?.email || currentUser?.user_email || "?")[0].toUpperCase()}
          </div>
          <div style={{ overflow: "hidden", minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser?.name || "Account"}</div>
            <div style={{ fontSize: 10.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser?.email || currentUser?.user_email}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", fontFamily: font, fontSize: 12, color: T.muted, cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>→</span> Sign out
        </button>
      </div>
    </div>
  );
}

export { BottomNav };
