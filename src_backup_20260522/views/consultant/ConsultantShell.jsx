// views/consultant/ConsultantShell.jsx
import { useState } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { useFamilies, useMessages } from "./data/consultantStore.js";
import { NotificationSettings } from "../../views/shared/NotificationSettings.jsx";
import { InAppPDFViewer } from "../../modules/library/InAppPDFViewer.jsx";
import { supabase } from "../../lib/supabase.js";

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

// ── Consultant Sleep Library ───────────────────────────────────────────────────
const BASE_URL = "https://storage.googleapis.com/rcc-app-assets/";
const SLEEP_RESOURCES = [
  {
    label: "Understanding Sleep",
    items: [
      { title: "Attachment in Sleep",               desc: "How attachment science shapes sleep — connection and independence aren't opposites.", emoji: "🤝", color: "#7BAA8A", url: BASE_URL + "Attachment%20in%20Sleep.pdf" },
      { title: "Temperament in Sleep",              desc: "How a child's nervous system and temperament profile directly influence how they sleep.", emoji: "✨", color: "#A89B5A", url: BASE_URL + "Temperament%20in%20Sleep.pdf" },
      { title: "Boundaries & Consistency in Sleep", desc: "Why consistency isn't rigidity — holding boundaries with warmth is one of the most loving things.", emoji: "🌙", color: "#8A7BAA", url: BASE_URL + "Boundaries%20and%20Consistency%20in%20Sleep%20Training.pdf" },
      { title: "Nap Info",                          desc: "Wake windows, nap counts by age, nap transitions, and what to do when naps stop working.", emoji: "☀️", color: "#7B9EA8", url: BASE_URL + "Nap%20Info.pdf" },
      { title: "Sleep Regressions",                 desc: "What regressions actually are, why they happen, and how to ride them without undoing progress.", emoji: "🔄", color: "#A8907B", url: BASE_URL + "Sleep%20Regressions.pdf" },
      { title: "Travel Tips for Sleep",             desc: "How to protect sleep on the road — planning, environment hacks, and managing disruptions.", emoji: "✈️", color: "#7B8FAA", url: BASE_URL + "Travel%20Tips%20for%20Sleep.pdf" },
      { title: "When to Be Concerned",              desc: "Signs that sleep struggles may have a medical root cause — and when to loop in the pediatrician.", emoji: "🩺", color: "#A87B8A", url: BASE_URL + "When%20to%20be%20Concerned.pdf" },
    ],
  },
  {
    label: "Troubleshooting",
    sublabel: "Quick reference guides for the hard nights",
    items: [
      { title: "Night Wakings",  desc: "Why they happen, how to respond, and how to reduce them over time.", emoji: "🌛", color: "#8A7BAA", url: BASE_URL + "Troubleshooting%20Night%20Wakings.pdf" },
      { title: "Early Mornings", desc: "The 5am problem — why it happens and how to push wake time later.", emoji: "🌅", color: "#A89B5A", url: BASE_URL + "Troubleshooting%20Early%20Mornings.pdf" },
      { title: "False Starts",   desc: "Waking 30-60 min after bedtime. What is causing it and what to do tonight.", emoji: "⚡", color: "#AA9B7B", url: BASE_URL + "Troubleshooting%20False%20Starts.pdf" },
      { title: "Split Nights",   desc: "Long awake stretches in the middle of the night — causes and solutions.", emoji: "✂️", color: "#7B8FAA", url: BASE_URL + "Troubleshooting%20Split%20Nights.pdf" },
    ],
  },
];

function ConsultantLibrary({ onClose }) {
  const T = useT();
  const [openPDF, setOpenPDF] = useState(null);

  if (openPDF) {
    return (
      <InAppPDFViewer
        url={openPDF.url}
        title={openPDF.title}
        emoji={openPDF.emoji}
        color={openPDF.color}
        allowDownload={false}
        onClose={() => setOpenPDF(null)}
      />
    );
  }

  return (
    <div style={{ background: T.gradientBg, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(160deg, #2D4A35, #3A3018)", padding: "14px 18px 14px", flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, cursor: "pointer", fontFamily: font, padding: 0 }}>Back</button>
        <div style={{ fontFamily: serif, fontSize: 20, color: "#fff", fontStyle: "italic" }}>Sleep Library</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 40px" }}>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: font, lineHeight: 1.6, marginBottom: 20 }}>
          Your reference library — all sleep resources, no paywall. The same PDFs your families can access.
        </div>
        {SLEEP_RESOURCES.map((section, si) => (
          <div key={si} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: section.sublabel ? 4 : 12 }}>
              <div style={{ height: 1, width: 16, background: T.border }} />
              <div style={{ fontFamily: font, fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: T.muted }}>{section.label}</div>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>
            {section.sublabel && <div style={{ fontFamily: font, fontSize: 11, color: T.muted, textAlign: "center", marginBottom: 12, fontStyle: "italic" }}>{section.sublabel}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item, i) => (
                <div key={i} onClick={() => setOpenPDF(item)}
                  style={{ background: T.card, borderRadius: 14, padding: "12px 14px", border: `1.5px solid ${item.color}30`, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{item.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontFamily: font, fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                  <div style={{ fontSize: 11, color: item.color, fontFamily: font, fontWeight: 600, flexShrink: 0, paddingTop: 2 }}>PDF</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Consultant Account View ────────────────────────────────────────────────────
function ConsultantAccount({ currentUser, logout, onClose }) {
  const T = useT();
  const isRCC = currentUser?.role === "consultant_internal";
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwEmail, setPwEmail] = useState(currentUser?.email || "");
  const [pwSent, setPwSent] = useState(false);
  const [pwError, setPwError] = useState(null);

  const sendPasswordReset = async () => {
    setPwError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(pwEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setPwSent(true);
    } catch (e) {
      setPwError(e.message || "Failed to send reset email.");
    }
  };

  const sections = [
    {
      heading: "Profile",
      rows: [
        { label: "Name", value: currentUser?.name || "—" },
        { label: "Email", value: currentUser?.email || "—" },
        { label: "Account type", value: isRCC ? "RCC Consultant" : "External Consultant", badge: isRCC ? { text: "RCC Team", color: "#5C7A5E" } : null },
      ],
    },
    {
      heading: "Billing",
      rows: isRCC
        ? [{ label: "Plan", value: "Free — included with RCC team access" }]
        : [
            { label: "Plan", value: "External Consultant — $20/month" },
            {
              label: "Manage billing",
              action: () => window.open("https://billing.stripe.com/p/login/rccapp", "_blank", "noopener noreferrer"),
              actionLabel: "Open portal →",
            },
            {
              label: "Cancel subscription",
              value: "Email us to cancel",
              action: () => window.open("mailto:hello@rootedconnectionscollective.com?subject=Cancel%20Held%20Subscription", "_blank"),
              actionLabel: "Email us →",
            },
          ],
    },
    {
      heading: "Security",
      custom: (
        <div style={{ padding: "4px 0 8px" }}>
          {!changingPassword && !pwSent && (
            <button onClick={() => setChangingPassword(true)} style={{
              background: "none", border: `1px solid ${T.border}`, borderRadius: 10,
              padding: "9px 16px", fontFamily: font, fontSize: 13, color: T.text,
              cursor: "pointer", width: "100%", textAlign: "left",
            }}>
              🔑 Change password…
            </button>
          )}
          {changingPassword && !pwSent && (
            <div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 8, lineHeight: 1.6 }}>
                We'll send a password reset link to your email address.
              </div>
              <input
                value={pwEmail}
                onChange={e => setPwEmail(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontFamily: font, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              />
              {pwError && <div style={{ fontSize: 11, color: "#C05A5A", fontFamily: font, marginBottom: 6 }}>{pwError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={sendPasswordReset} style={{ flex: 1, background: "#2D4A35", color: "#fff", border: "none", borderRadius: 10, padding: "9px 0", fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Send reset link
                </button>
                <button onClick={() => { setChangingPassword(false); setPwError(null); }} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 14px", fontFamily: font, fontSize: 13, color: T.muted, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {pwSent && (
            <div style={{ padding: "10px 14px", background: "#5C7A5E18", borderRadius: 10, border: "1px solid #5C7A5E30", fontFamily: font, fontSize: 13, color: "#5C7A5E" }}>
              ✓ Reset link sent to {pwEmail}
            </div>
          )}
        </div>
      ),
    },
    {
      heading: "App",
      rows: [
        { label: "Version", value: "Held 1.0 · Rooted Connections Collective" },
        { label: "Privacy Policy", action: () => window.open("https://rootedconnectionscollective.com/privacy", "_blank", "noopener noreferrer"), actionLabel: "View →" },
        { label: "Terms of Use", action: () => window.open("https://rootedconnectionscollective.com/terms", "_blank", "noopener noreferrer"), actionLabel: "View →" },
      ],
    },
  ];

  return (
    <div style={{ background: T.gradientBg, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(160deg, #2D4A35, #3A3018)", padding: "14px 18px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, cursor: "pointer", fontFamily: font, padding: 0 }}>‹ Back</button>
        </div>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 10 }}>🌿</div>
        <div style={{ fontFamily: serif, fontSize: 22, color: "#fff", fontStyle: "italic" }}>{currentUser?.name || "Consultant"}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2, fontFamily: font }}>{currentUser?.email}</div>
        {isRCC && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "3px 10px" }}>
            <span style={{ fontSize: 10, fontFamily: font, color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>RCC Team</span>
          </div>
        )}
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 40px" }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, fontFamily: font, marginBottom: 8 }}>
              {section.heading}
            </div>
            <div style={{ background: T.card, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {section.custom && <div style={{ padding: "12px 16px" }}>{section.custom}</div>}
              {section.rows?.map((row, ri) => (
                <div key={ri} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: ri < section.rows.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>{row.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {row.value && <div style={{ fontFamily: font, fontSize: 13, color: T.text, textAlign: "right", maxWidth: 180 }}>{row.value}</div>}
                    {row.badge && <div style={{ fontSize: 10, fontFamily: font, fontWeight: 700, color: "#fff", background: row.badge.color, borderRadius: 10, padding: "2px 8px" }}>{row.badge.text}</div>}
                    {row.action && <button onClick={row.action} style={{ background: "none", border: "none", color: "#5C7A5E", fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>{row.actionLabel}</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Sign out */}
        <button onClick={logout} style={{ width: "100%", padding: "13px 0", borderRadius: 14, border: `1.5px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer" }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Account / hamburger drawer ─────────────────────────────────────────────────
function AccountDrawer({ isOpen, onClose, onNavigateFlag, onOpenLibrary, onOpenNotifications, onOpenAccount, currentUser, logout, T }) {
  if (!isOpen) return null;
  const rows = [
    { icon: "🏠", label: "Dashboard", action: () => { onClose(); } },
    { icon: "🚩", label: "Flags & Alerts", action: () => { onClose(); onNavigateFlag(); } },
    { icon: "📚", label: "Sleep Library", action: () => { onClose(); onOpenLibrary(); } },
    { icon: "🔔", label: "Notifications", action: () => { onClose(); onOpenNotifications(); } },
    { icon: "📖", label: "The Space Between", sublabel: "Substack", action: () => window.open("https://manubrune.substack.com", "_blank", "noopener noreferrer"), external: true },
    { icon: "💬", label: "Get Support", sublabel: "hello@rootedconnectionscollective.com", action: () => window.open("mailto:hello@rootedconnectionscollective.com?subject=Held%20App%20Support", "_blank"), external: true },
    { icon: "⚙️", label: "Account", action: () => { onClose(); onOpenAccount(); } },
  ];
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.55)" }}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 290, background: T.card, borderLeft: `1px solid ${T.border}`, display: "flex", flexDirection: "column", paddingBottom: 32, overflowY: "auto" }}>
        <div style={{ background: "linear-gradient(160deg, #2D4A35, #3A3018)", padding: "52px 20px 20px", flexShrink: 0 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 10 }}>🌿</div>
          <div style={{ fontFamily: serif, fontSize: 20, color: "#fff", fontStyle: "italic" }}>{currentUser?.name || "Consultant"}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2, fontFamily: font }}>{currentUser?.email || ""}</div>
        </div>
        {rows.map(row => (
          <div key={row.label} onClick={row.action} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
            <span style={{ fontSize: 20, width: 26, textAlign: "center", flexShrink: 0 }}>{row.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: T.text, fontFamily: font }}>{row.label}</div>
              {row.sublabel && <div style={{ fontSize: 10, color: T.muted, fontFamily: font, marginTop: 1 }}>{row.sublabel}</div>}
            </div>
            {row.external && <span style={{ fontSize: 11, color: T.muted }}>↗</span>}
            {row.note && <span style={{ fontSize: 9, color: T.muted, fontFamily: font, background: T.faint, borderRadius: 8, padding: "2px 7px" }}>{row.note}</span>}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div onClick={logout} style={{ margin: "16px 20px 0", border: `1.5px solid ${T.border}`, borderRadius: 14, padding: 14, textAlign: "center", fontSize: 13, color: T.muted, cursor: "pointer", fontFamily: font }}>Sign out</div>
      </div>
    </div>
  );
}

// ── Main shell ─────────────────────────────────────────────────────────────────
// ── Messages Tab ──────────────────────────────────────────────────────────────
function MessagesTab({ onNavigate }) {
  const T = useT();
  const { families } = useFamilies();
  const { messages, sendMessage, loadMessages } = useMessages();
  const [openFamilyId, setOpenFamilyId] = useState(null);
  const [compose, setCompose] = useState("");
  const [sending, setSending] = useState(false);

  const openFamily = families.find(f => f.id === openFamilyId);
  const thread = openFamilyId ? (messages[openFamilyId] || []) : [];

  const openThread = (familyId) => {
    setOpenFamilyId(familyId);
    loadMessages(familyId);
  };

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
          <div key={fam.id} onClick={() => openThread(fam.id)} style={{
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

export default function ConsultantShell({ currentUser: currentUserProp, logout, onInviteFamily }) {
  const T = useT();
  const { families } = useFamilies();
  const { currentUser: appUser } = useApp();
  const currentUser = currentUserProp || appUser;

  // ── Log regulation check-in to Supabase ──────────────────────────────────
  const logRegulationCheckin = async ({ familyId, state, skipped }) => {
    if (!currentUser?.id) return;
    try {
      await supabase.from("consultant_checkins").insert({
        consultant_id: currentUser.id,
        arrival_state: skipped ? "skipped" : (state?.label?.toLowerCase() || "unknown"),
        is_regulated: !skipped && state?.label === "Grounded",
        source: "pre_reply",
        family_id: familyId,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Silent — UI continues regardless
    }
  };

  const [activeTab,  setActiveTab]  = useState("home");
  const [navStack,   setNavStack]   = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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
      setNavStack(prev => [...prev, {
        view: "regulation",
        params: { familyId: params.familyId, familyName: fam?.name },
      }]);
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
      <FamilyDetail
        familyId={params.familyId}
        family={families?.find(f => f.id === params.familyId)}
        params={params}
        onNavigate={navigate}
        onBack={goBack}
      />
    );
    if (view === "methodMatching") return (
      <MethodMatching familyId={params.familyId} childId={params.childId} onNavigate={navigate} onBack={goBack} />
    );
    if (view === "regulation") return (
      <RegulationLayer
        familyName={params.familyName}
        onRegulated={({ state, skipped }) => {
          logRegulationCheckin({ familyId: params.familyId, state, skipped });
          setNavStack(prev => [...prev.slice(0, -1), { view: "responseBuilder", params: { familyId: params.familyId } }]);
        }}
        onSkip={({ state, skipped }) => {
          logRegulationCheckin({ familyId: params.familyId, state, skipped });
          setNavStack(prev => [...prev.slice(0, -1), { view: "responseBuilder", params: { familyId: params.familyId } }]);
        }}
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
    if (activeTab === "families") return <FamiliesView     onNavigate={navigate} onInviteFamily={onInviteFamily} />;
    if (activeTab === "plans")    return <FamiliesView     onNavigate={navigate} onInviteFamily={onInviteFamily} />;
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
        onOpenLibrary={() => setShowLibrary(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenAccount={() => setShowAccount(true)}
        currentUser={currentUser}
        logout={logout}
        T={T}
      />

      {/* ── Consultant Library overlay ── */}
      {showLibrary && (
        <div style={{ position: "absolute", inset: 0, zIndex: 350, display: "flex", flexDirection: "column" }}>
          <ConsultantLibrary onClose={() => setShowLibrary(false)} />
        </div>
      )}

      {/* ── Account overlay ── */}
      {showAccount && (
        <div style={{ position: "absolute", inset: 0, zIndex: 350, display: "flex", flexDirection: "column" }}>
          <ConsultantAccount currentUser={currentUser} logout={logout} onClose={() => setShowAccount(false)} />
        </div>
      )}

      {/* ── Notifications overlay ── */}
      {showNotifications && (
        <NotificationSettings onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
}
