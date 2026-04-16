// views/consultant/ConsultantShell.jsx
import { useState } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { useFamilies, useMessages } from "./data/consultantStore.js";

import ConsultantHome   from "./ConsultantHome.jsx";
import FamiliesView     from "./FamiliesView.jsx";
import FamilyDetail     from "./FamilyDetail.jsx";
import MethodMatching   from "./MethodMatching.jsx";
import RegulationLayer  from "./RegulationLayer.jsx";
import ResponseBuilder  from "./ResponseBuilder.jsx";
import CoPilotWorkspace from "./CoPilotWorkspace.jsx";
import RedFlags         from "./RedFlags.jsx";

// ── Bottom nav ────────────────────────────────────────────────────────────────
const NAV_TABS = [
  { id: "home",     icon: "🏠", label: "Home"     },
  { id: "families", icon: "👪", label: "Families" },
  { id: "plans",    icon: "📋", label: "Plans"    },
  { id: "messages", icon: "💬", label: "Messages" },
  { id: "copilot",  icon: "🧠", label: "Co-Pilot" },
];

// ── Account / hamburger drawer ─────────────────────────────────────────────────
function AccountDrawer({ isOpen, onClose, onNavigateFlag, currentUser, logout, T }) {
  if (!isOpen) return null;
  const rows = [
    { icon: "🏠", label: "Dashboard",      action: onClose },
    { icon: "👪", label: "My Families",    action: onClose },
    { icon: "📋", label: "All Plans",       action: onClose },
    { icon: "🚩", label: "Flags & Alerts",  action: () => { onClose(); onNavigateFlag(); } },
    { icon: "⚙️", label: "Account",         action: onClose },
  ];
  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 400,
      background: "rgba(0,0,0,0.55)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: 280,
        background: T.card,
        borderLeft: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column",
        paddingBottom: 32,
      }}>
        {/* Hero */}
        <div style={{
          background: "linear-gradient(160deg, #2D4A35, #3A3018)",
          padding: "52px 20px 20px",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "1.5px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, marginBottom: 10,
          }}>🌿</div>
          <div style={{ fontFamily: serif, fontSize: 20, color: "#fff", fontStyle: "italic" }}>
            {currentUser?.name || "Consultant"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2, fontFamily: font }}>
            {currentUser?.email || ""}
          </div>
        </div>

        {/* Rows */}
        {rows.map(row => (
          <div key={row.label} onClick={row.action} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 20px",
            borderBottom: `1px solid ${T.border}`,
            cursor: "pointer",
          }}>
            <span style={{ fontSize: 20, width: 24, textAlign: "center" }}>{row.icon}</span>
            <span style={{ fontSize: 14, color: T.text, fontFamily: font }}>{row.label}</span>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <div onClick={logout} style={{
          margin: "0 20px",
          border: `1.5px solid ${T.border}`,
          borderRadius: 14, padding: 14,
          textAlign: "center", fontSize: 13,
          color: T.muted, cursor: "pointer", fontFamily: font,
        }}>
          Sign out
        </div>
      </div>
    </div>
  );
}

// ── Main shell ─────────────────────────────────────────────────────────────────
// ── Messages Tab ──────────────────────────────────────────────────────────────
function MessagesTab({ onNavigate }) {
  const T = useT();
  const { families } = useFamilies();
  const { messages, sendMessage } = useMessages();
  const [openFamilyId, setOpenFamilyId] = useState(null);
  const [compose, setCompose] = useState("");
  const [sending, setSending] = useState(false);

  const openFamily = families.find(f => f.id === openFamilyId);
  const thread = openFamilyId ? (messages[openFamilyId] || []) : [];

  const handleSend = () => {
    if (!compose.trim() || !openFamilyId) return;
    setSending(true);
    sendMessage(openFamilyId, compose.trim());
    setCompose("");
    setTimeout(() => setSending(false), 300);
  };

  // Family list view
  if (!openFamilyId) return (
    <div style={{ background: T.gradientBg, flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "14px 18px 10px" }}>
        <div style={{ fontFamily: serif, fontSize: 26, color: T.headingText, marginBottom: 2 }}>Messages</div>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: font }}>Tap a family to view or send a message</div>
      </div>

      {families.map(fam => {
        const thread = messages[fam.id] || [];
        const last = thread[thread.length - 1];
        const unread = fam.unread;
        return (
          <div key={fam.id} onClick={() => setOpenFamilyId(fam.id)} style={{
            margin: "0 18px 8px", background: T.card, borderRadius: 16,
            padding: "12px 14px", boxShadow: T.shadow, cursor: "pointer",
            border: `1.5px solid ${unread ? "#C08A3A44" : T.border}`,
            transition: "all .15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: unread ? "#C08A3A22" : T.faint,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
              }}>
                {fam.nsState === "overwhelmed" ? "😢" : fam.nsState === "activated" ? "😰" : "😊"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{fam.name}</div>
                  {unread && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C08A3A", flexShrink: 0 }} />
                  )}
                </div>
                <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {last ? (last.from === "consultant" ? "You: " : "") + last.text : "No messages yet"}
                </div>
                <div style={{ fontFamily: font, fontSize: 10, color: T.muted, marginTop: 2 }}>
                  {last?.time || ""} · {fam.parents}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Thread view
  return (
    <div style={{ background: T.gradientBg, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        background: "#2D4A35", padding: "12px 18px 10px",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <button onClick={() => setOpenFamilyId(null)} style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.7)",
          fontFamily: font, fontSize: 13, cursor: "pointer", padding: 0,
        }}>‹ Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: "white" }}>{openFamily?.name}</div>
          <div style={{ fontFamily: font, fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>{openFamily?.parents}</div>
        </div>
        <button onClick={() => onNavigate("responseBuilder", { familyId: openFamilyId })} style={{
          background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 12,
          padding: "5px 10px", color: "white", fontFamily: font, fontSize: 11,
          cursor: "pointer",
        }}>✨ Co-Pilot</button>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        {thread.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontFamily: font, fontSize: 13 }}>
            No messages yet. Start the conversation below.
          </div>
        )}
        {thread.map((msg, i) => {
          const isConsultant = msg.from === "consultant";
          return (
            <div key={msg.id || i} style={{
              display: "flex", justifyContent: isConsultant ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "78%", padding: "9px 12px", borderRadius: isConsultant ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: isConsultant ? "#2D4A35" : T.card,
                boxShadow: T.shadow,
                border: isConsultant ? "none" : `1px solid ${T.border}`,
              }}>
                <div style={{ fontFamily: font, fontSize: 13, color: isConsultant ? "white" : T.text, lineHeight: 1.55 }}>
                  {msg.text}
                </div>
                <div style={{ fontFamily: font, fontSize: 9, color: isConsultant ? "rgba(255,255,255,0.45)" : T.muted, marginTop: 4, textAlign: isConsultant ? "right" : "left" }}>
                  {msg.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compose */}
      <div style={{
        padding: "10px 18px 20px", background: T.card,
        borderTop: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={compose}
            onChange={e => setCompose(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message… (Enter to send)"
            rows={2}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 14,
              border: `1.5px solid ${T.border}`, background: T.inputBg,
              color: T.text, fontFamily: font, fontSize: 13,
              resize: "none", outline: "none", lineHeight: 1.5,
            }}
          />
          <button onClick={handleSend} disabled={!compose.trim() || sending} style={{
            width: 40, height: 40, borderRadius: "50%", border: "none",
            background: compose.trim() ? "#2D4A35" : T.faint,
            color: compose.trim() ? "white" : T.muted,
            fontSize: 16, cursor: compose.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all .2s",
          }}>↑</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {["Checking in on you 🌿", "Great progress last night!", "Quick question for you"].map(q => (
            <button key={q} onClick={() => setCompose(q)} style={{
              padding: "4px 10px", borderRadius: 12, border: `1px solid ${T.border}`,
              background: "none", color: T.muted, fontFamily: font, fontSize: 11,
              cursor: "pointer",
            }}>{q}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ConsultantShell({ currentUser, logout }) {
  const T = useT();
  const { families } = useFamilies();

  const [activeTab,  setActiveTab]  = useState("home");
  const [navStack,   setNavStack]   = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Show "before you reply" regulation screen for distressed families
  // once per family, resets every 2 hours (sessionStorage)
  const shouldShowRegulation = (familyId) => {
    const family = families?.find(f => f.id === familyId);
    const isDistressed = family?.nsState === "overwhelmed" || family?.nsState === "activated" || family?.urgency === "urgent";
    if (!isDistressed) return false;
    const key = `reg_shown_${familyId}`;
    const last = sessionStorage.getItem(key);
    if (!last) return true;
    return Date.now() - parseInt(last) > 2 * 60 * 60 * 1000;
  };

  const navigate = (view, params = {}) => {
    if (view === "responseBuilder" && params.familyId && shouldShowRegulation(params.familyId)) {
      sessionStorage.setItem(`reg_shown_${params.familyId}`, String(Date.now()));
      const fam = families?.find(f => f.id === params.familyId);
      setNavStack(prev => [...prev, { view: "regulation", params: { familyId: params.familyId, familyName: fam?.name } }]);
      return;
    }
    setNavStack(prev => [...prev, { view, params }]);
  };
  const goBack      = () => setNavStack(prev => prev.slice(0, -1));
  const goHome      = () => setNavStack([]);

  const handleTabChange = (tabId) => { setNavStack([]); setActiveTab(tabId); };

  const currentNav    = navStack[navStack.length - 1];
  const isDrilledDown = navStack.length > 0;

  // ── Drill-down views ──────────────────────────────────────────────────────
  const renderDrillDown = () => {
    if (!currentNav) return null;
    const { view, params } = currentNav;

    if (view === "family") return (
      <FamilyDetail familyId={params.familyId} onNavigate={navigate} onBack={goBack} />
    );
    if (view === "methodMatching") return (
      <MethodMatching familyId={params.familyId} childId={params.childId} onNavigate={navigate} onBack={goBack} />
    );
    if (view === "regulation") return (
      <RegulationLayer
        familyName={params.familyName}
        onRegulated={() => setNavStack(prev => [...prev.slice(0, -1), { view: "responseBuilder", params: { familyId: params.familyId } }])}
        onSkip={()      => setNavStack(prev => [...prev.slice(0, -1), { view: "responseBuilder", params: { familyId: params.familyId } }])}
      />
    );
    if (view === "responseBuilder") return (
      <ResponseBuilder familyId={params.familyId} onBack={goBack} onSent={goBack} />
    );
    if (view === "flags") return <RedFlags onNavigate={navigate} />;
    return null;
  };

  // ── Base tab views ────────────────────────────────────────────────────────
  const renderBaseTab = () => {
    if (activeTab === "home")     return <ConsultantHome   onNavigate={navigate} onOpenDrawer={() => setDrawerOpen(true)} />;
    if (activeTab === "families") return <FamiliesView     onNavigate={navigate} />;
    if (activeTab === "plans")    return <FamiliesView     onNavigate={navigate} />;
    if (activeTab === "copilot")  return <CoPilotWorkspace onNavigate={navigate} />;
    if (activeTab === "messages") return <MessagesTab onNavigate={navigate} />;
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg, position: "relative" }}>

      {/* ── Back bar ── */}
      {isDrilledDown && (
        <div style={{
          display: "flex", alignItems: "center",
          padding: "12px 18px 8px",
          background: T.bg2,
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <button onClick={goBack} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: T.teal, fontFamily: font, fontWeight: 500,
          }}>
            ‹ Back
          </button>
          {navStack.length > 1 && (
            <button onClick={goHome} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: T.muted, fontFamily: font, marginLeft: "auto",
            }}>
              Home
            </button>
          )}
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {isDrilledDown ? renderDrillDown() : renderBaseTab()}
      </div>

      {/* ── Bottom nav ── */}
      <div style={{
        display: "flex", justifyContent: "space-around",
        padding: "10px 0 18px",
        borderTop: `1px solid ${T.border}`,
        background: T.bg2,
        flexShrink: 0,
      }}>
        {NAV_TABS.map(tab => {
          const isOn = !isDrilledDown && activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              opacity: isOn ? 1 : 0.38, transition: "opacity 0.18s",
            }}>
              <span style={{ fontSize: 19 }}>{tab.icon}</span>
              <span style={{
                fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase",
                color: isOn ? T.teal : T.muted, fontWeight: 500, fontFamily: font,
              }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Drawer ── */}
      <AccountDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigateFlag={() => navigate("flags")}
        currentUser={currentUser}
        logout={logout}
        T={T}
      />
    </div>
  );
}
