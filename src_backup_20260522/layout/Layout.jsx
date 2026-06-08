// src/layout/Layout.jsx
// Held-style bottom nav with 5 tabs + SOS FAB.
// Replaces the previous RCC bottom nav.
// Still uses T tokens and useApp() — zero breaking changes to RCCShell.

import { useT, useApp, font, serif } from "../core/shared.jsx";
import { ThemeToggle } from "../core/shared.jsx";

const SUBSTACK_URL = "https://substack.com/@manu142886/notes?utm_campaign=profile&utm_medium=profile-page";

// ─── NAV TABS (parent view) ───────────────────────────────────────────────────
// Matches held wireframe: Home / Sleep / Milestones / Messages / Insights
const PARENT_NAV = [
  { id: "home",       emoji: "🏡", label: "Home"       },
  { id: "sleep",      emoji: "🌙", label: "Sleep"      },
  { id: "milestones", emoji: "🌱", label: "Milestones" },
  { id: "messages",   emoji: "💬", label: "Messages"   },
  { id: "insights",   emoji: "✦",  label: "Insights"   },
];

// ─── SOS FAB ─────────────────────────────────────────────────────────────────
export function SOSFab({ onPress }) {
  const T = useT();
  return (
    <button
      onClick={onPress}
      style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)",
        right: "max(18px, calc(50vw - 215px + 18px))",
        zIndex: 90,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${T.gold} 0%, ${T.warm} 55%, ${T.warm}cc 100%)`,
        border: "none",
        boxShadow: `0 4px 20px ${T.warm}88, 0 2px 8px rgba(0,0,0,0.2)`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "scale(1.1)";
        e.currentTarget.style.boxShadow = `0 6px 28px ${T.warm}bb, 0 3px 12px rgba(0,0,0,0.25)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = `0 4px 20px ${T.warm}88, 0 2px 8px rgba(0,0,0,0.2)`;
      }}
      aria-label="SOS — I need help right now"
    >
      <span style={{ fontSize: 22, lineHeight: 1, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}>⚡</span>
    </button>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
export function BottomNav({ tabs = PARENT_NAV, active, setActive, unread }) {
  const T = useT();

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 430,
      zIndex: 80,
      background: T.bg,
      borderTop: `1px solid ${T.border}`,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      borderRadius: "0 0 0 0",
    }}>
      <div style={{ display: "flex" }}>
        {tabs.map(t => {
          const isActive = active === t.id;
          const badge = unread?.[t.id];
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              style={{
                flex: 1,
                minWidth: 0,
                background: "none",
                border: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "9px 4px 8px",
                cursor: "pointer",
                position: "relative",
                color: isActive ? T.teal : T.muted,
                fontFamily: font,
                fontSize: 9.5,
                fontWeight: isActive ? 700 : 400,
                letterSpacing: isActive ? "0.04em" : "0.02em",
                transition: "color .18s",
              }}
            >
              {/* Icon */}
              <span style={{
                fontSize: (t.emoji || t.icon) === "✦" ? 17 : 22,
                lineHeight: 1,
                transition: "transform .18s, filter .18s",
                transform: isActive ? "translateY(-2px) scale(1.1)" : "none",
                filter: isActive ? "none" : "grayscale(0.2) opacity(0.55)",
                display: "block",
              }}>
                {t.emoji || t.icon}
              </span>

              {/* Label */}
              <span style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                width: "100%",
                textAlign: "center",
                fontSize: 9,
                letterSpacing: "0.03em",
                color: isActive ? T.teal : T.muted,
              }}>
                {t.label}
              </span>

              {/* Active dot */}
              {isActive && (
                <span style={{
                  position: "absolute",
                  bottom: 3,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: T.teal,
                }} />
              )}

              {/* Unread badge */}
              {badge > 0 && (
                <div style={{
                  position: "absolute",
                  top: 6, right: "calc(50% - 18px)",
                  width: 16, height: 16,
                  borderRadius: "50%",
                  background: T.warm,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#fff",
                }}>
                  {badge}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SIDE NAV (desktop only — consultant / admin) ─────────────────────────────
export function SideNav({ tabs, active, setActive, currentUser, onLogout, unread }) {
  const T = useT();
  return (
    <div style={{
      width: 220, flexShrink: 0,
      borderRight: `1px solid ${T.border}`,
      background: T.bg,
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
      padding: "24px 0",
    }}>
      {/* Brand */}
      <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontFamily: serif, fontSize: 24, color: T.headingText, letterSpacing: "-0.01em" }}>held</div>
        <div style={{ fontFamily: font, fontSize: 10.5, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {currentUser?.role?.replace("_", " ")}
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: "12px 0" }}>
        {tabs.map(t => {
          const isActive = active === t.id;
          const badge = unread?.[t.id];
          return (
            <button key={t.id} onClick={() => setActive(t.id)} style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", padding: "11px 20px",
              background: isActive ? `${T.teal}14` : "none",
              borderLeft: `3px solid ${isActive ? T.teal : "transparent"}`,
              border: "none",
              fontFamily: font, fontSize: 13.5,
              fontWeight: isActive ? 700 : 400,
              color: isActive ? T.teal : T.muted,
              cursor: "pointer",
              transition: "all .15s",
              textAlign: "left",
            }}>
              <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{t.icon}</span>
              <span style={{ flex: 1 }}>{t.label}</span>
              {badge > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, background: T.warm,
                  color: "#fff", borderRadius: 8, padding: "2px 7px",
                }}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
        <ThemeToggle />
        <a href={SUBSTACK_URL} target="_blank" rel="noreferrer" style={{
          fontFamily: font, fontSize: 12, color: T.muted, textDecoration: "none",
        }}>
          RCC Journal ↗
        </a>
        <button onClick={onLogout} style={{
          background: "none", border: "none", fontFamily: font, fontSize: 12,
          color: T.muted, cursor: "pointer", textAlign: "left", padding: 0,
        }}>
          Sign out
        </button>
      </div>
    </div>
  );
}
