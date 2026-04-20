// views/consultant/FamilyDetail.jsx
import { useState, useEffect } from "react";
import { useT, font, serif } from "../../core/shared.jsx";
import { useFamilies, useNSLog, useMessages } from "./data/consultantStore.js";
import NSBanner from "./shared/NSBanner.jsx";
import ChildSelector from "./shared/ChildSelector.jsx";
import InsightsTab  from "./tabs/InsightsTab.jsx";
import SleepDataTab from "./tabs/SleepDataTab.jsx";
import PlanTab      from "./tabs/PlanTab.jsx";
import IntakeTab    from "./tabs/IntakeTab.jsx";
import NotesTab     from "./tabs/NotesTab.jsx";
import { IntakeViewer } from "../../modules/intake/IntakeViewer.jsx";

const TABS = ["Insights", "Sleep Data", "Plan", "Intake", "Notes", "Messages"];

// ── Inline messages tab for within FamilyDetail ──────────────────────────────
function FamilyMessagesTab({ family, triggerCoPilot, onNavigate }) {
  const T = useT();
  const { messages, sendMessage, loadMessages } = useMessages();
  const [compose, setCompose] = useState("");
  const [sending, setSending] = useState(false);

  const thread = messages[family?.id] || [];

  useEffect(() => {
    if (family?.id) loadMessages(family.id);
  }, [family?.id]);

  const handleSend = () => {
    if (!compose.trim()) return;
    setSending(true);
    sendMessage(family.id, compose.trim());
    setCompose("");
    setTimeout(() => setSending(false), 300);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 400 }}>
      {/* Co-Pilot draft button */}
      <div style={{ padding: "10px 18px 0" }}>
        <button
          onClick={() => onNavigate("responseBuilder", { familyId: family.id })}
          style={{
            width: "100%", background: "#2D4A35", color: "#fff", border: "none",
            borderRadius: 12, padding: "10px 0", fontFamily: font, fontSize: 13,
            fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
          }}
        >
          ✨ Draft with Co-Pilot
        </button>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 18px" }}>
        {thread.length === 0 ? (
          <div style={{ textAlign: "center", color: T.muted, fontFamily: font, fontSize: 13, marginTop: 24 }}>
            No messages yet with {family?.name}.
          </div>
        ) : thread.map(msg => (
          <div key={msg.id} style={{
            display: "flex",
            justifyContent: msg.from === "consultant" ? "flex-end" : "flex-start",
            marginBottom: 10,
          }}>
            <div style={{
              maxWidth: "78%", padding: "9px 13px", borderRadius: 14,
              background: msg.from === "consultant" ? "#2D4A35" : T.card,
              color: msg.from === "consultant" ? "#fff" : T.text,
              fontFamily: font, fontSize: 13, lineHeight: 1.5,
              boxShadow: T.shadow,
            }}>
              {msg.text}
              <div style={{ fontSize: 9, marginTop: 4, opacity: 0.55 }}>{msg.time}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Compose */}
      <div style={{ padding: "10px 18px 16px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
        <input
          value={compose}
          onChange={e => setCompose(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Message…"
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 20, border: `1px solid ${T.border}`,
            background: T.inputBg, color: T.text, fontFamily: font, fontSize: 13, outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!compose.trim() || sending}
          style={{
            background: compose.trim() ? "#2D4A35" : T.faint,
            color: compose.trim() ? "#fff" : T.muted,
            border: "none", borderRadius: 20, padding: "10px 16px",
            fontFamily: font, fontSize: 13, fontWeight: 600, cursor: compose.trim() ? "pointer" : "default",
          }}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

export default function FamilyDetail({ familyId, family: familyProp, params, onNavigate, onBack }) {
  const T = useT();
  const { families, loading } = useFamilies();
  const { nsLog } = useNSLog(familyId);

  const family = familyProp || families.find(f => f.id === familyId);
  const [activeChildId, setActiveChildId] = useState(
    family?.children?.find(c => c.status === "urgent")?.id || family?.children?.[0]?.id
  );
  const [activeTab, setActiveTab] = useState(params?.defaultTab || "Insights");
  const [viewingIntake, setViewingIntake] = useState(false);

  if (!family && loading) return (
    <div style={{ padding: 40, textAlign: "center", color: T.muted, fontFamily: font }}>Loading…</div>
  );

  if (!family) return (
    <div style={{ padding: 40, textAlign: "center", color: T.muted, fontFamily: font }}>Family not found.</div>
  );

  const activeChild = family.children.find(c => c.id === activeChildId) || family.children[0];

  // Show full raw intake viewer
  if (viewingIntake) {
    return <IntakeViewer family={family} onBack={() => setViewingIntake(false)} />;
  }

  // Navigate within tabs
  const NAV_MAP = { plan: "Plan", sleepData: "Sleep Data", insights: "Insights", intake: "Intake", notes: "Notes" };
  const handleTabNav = (destination) => {
    if (destination === "intakeViewer") { setViewingIntake(true); return; }
    const mapped = NAV_MAP[destination] || destination;
    if (TABS.includes(mapped)) { setActiveTab(mapped); return; }
    onNavigate(destination, { familyId, activeChildId });
  };

  return (
    <div style={{ background: T.gradientBg, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Family hero */}
      <div style={{
        background: "linear-gradient(160deg, #2D4A35 0%, #3A3018 100%)",
        padding: "14px 18px 10px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "2px solid rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>
            {family.children.length > 1 ? "👨‍👩‍👧" : family.children[0]?.emoji}
          </div>
          <div>
            <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: "white" }}>{family.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: font }}>
              {family.parents} · {family.children.length} {family.children.length === 1 ? "child" : "children"}
            </div>
          </div>
        </div>
      </div>

      {/* NS Banner — family level, always visible */}
      <div style={{ flexShrink: 0 }}>
        <NSBanner family={family} nsLog={nsLog[family.id]} />
      </div>

      {/* Child selector — only if >1 child */}
      {family.children.length > 1 && (
        <div style={{ flexShrink: 0 }}>
          <ChildSelector
            children={family.children}
            activeChildId={activeChildId}
            onSelect={setActiveChildId}
          />
        </div>
      )}

      {/* Tab bar */}
      <div style={{
        display: "flex", background: T.bg2,
        borderRadius: 12, padding: 3, margin: "8px 18px",
        flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, padding: "8px 2px", borderRadius: 9, border: "none",
            background: activeTab === t ? T.card : "transparent",
            color: activeTab === t ? T.text : T.muted,
            fontSize: 10, fontWeight: 500, cursor: "pointer",
            boxShadow: activeTab === t ? T.shadow : "none",
            fontFamily: font, transition: "all 0.18s",
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "Insights"   && <InsightsTab  family={family} activeChild={activeChild} onNavigate={handleTabNav} />}
        {activeTab === "Sleep Data" && <SleepDataTab family={family} activeChild={activeChild} onNavigate={handleTabNav} />}
        {activeTab === "Plan"       && <PlanTab      family={family} activeChild={activeChild} onNavigate={handleTabNav} />}
        {activeTab === "Intake"     && <IntakeTab    family={family} activeChild={activeChild} onNavigate={handleTabNav} />}
        {activeTab === "Notes"      && <NotesTab     family={family} activeChild={activeChild} onNavigate={handleTabNav} />}
        {activeTab === "Messages"   && <FamilyMessagesTab family={family} triggerCoPilot={params?.triggerCoPilot} onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
