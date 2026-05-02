// src/modules/sleep/HeldSleepShell.jsx
// Held-style sleep screen shell — wireframe-matched visual treatment.
// Header: "{childName}'s day" large serif + age · day subtext.
// Child pill in top bar alongside refresh. Tabs below header.

import { useState, useEffect } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { SleepLog } from "./SleepLog.jsx";
import { SleepPlanTracker } from "./SleepPlanTracker.jsx";

function ageLabel(dob) {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44));
  return months < 24 ? `${months} months` : `${Math.floor(months / 12)}y`;
}

function dayLabel() {
  return new Date().toLocaleDateString([], { weekday: "long" });
}

function SegControl({ options, value, onChange, T }) {
  return (
    <div style={{ display: "flex", gap: 4, background: T.faint, borderRadius: 12, padding: 4 }}>
      {options.map(opt => (
        <button key={opt.id} onClick={() => onChange(opt.id)} style={{
          flex: 1, padding: "8px 4px", borderRadius: 9, border: "none", cursor: "pointer",
          fontFamily: font, fontSize: 13, fontWeight: value === opt.id ? 700 : 400,
          background: value === opt.id ? `${T.teal}22` : "transparent",
          color: value === opt.id ? T.teal : T.muted, transition: "all .18s",
        }}>
          {opt.icon && <span style={{ marginRight: 5 }}>{opt.icon}</span>}{opt.label}
        </button>
      ))}
    </div>
  );
}

function TabPills({ options, value, onChange, T }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
      {options.map(opt => (
        <button key={opt.id} onClick={() => onChange(opt.id)} style={{
          flexShrink: 0, padding: "6px 18px", borderRadius: 20,
          border: `1.5px solid ${value === opt.id ? T.teal : T.border}`,
          background: value === opt.id ? `${T.teal}18` : "transparent",
          fontFamily: font, fontSize: 13, fontWeight: value === opt.id ? 700 : 400,
          color: value === opt.id ? T.teal : T.muted,
          cursor: "pointer", transition: "all .18s", whiteSpace: "nowrap",
        }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MMBanner({ text, T }) {
  if (!text) return null;
  return (
    <div style={{
      borderRadius: 16, padding: "14px 16px", marginBottom: 14,
      background: `linear-gradient(135deg, ${T.bark}, ${T.bark}dd)`,
    }}>
      <div style={{ fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: font, fontWeight: 700, marginBottom: 6 }}>
        Meaning Maker
      </div>
      <div style={{ fontFamily: serif, fontSize: 15, fontStyle: "italic", color: "rgba(245,237,214,0.9)", lineHeight: 1.55 }}>
        "{text}"
      </div>
    </div>
  );
}

const MM_BANNERS = {
  today: "Every feed, every nap, every wake-up you log is a data point. Over time, these become a map of your child's rhythm.",
  patterns: "Patterns in sleep aren't random. They're your child's nervous system telling you what it needs.",
  wellness: "Health and sleep are the same story, told from two different angles.",
};

// ── Waiting card shown when consultant is assigned but hasn't built the plan yet ──
function WaitingForPlan({ T, consultantName }) {
  const moss = "#5C7A5E";
  const sand = "#E8DDD0";
  return (
    <div style={{
      margin: "8px 0", padding: "28px 20px 32px", borderRadius: 20,
      background: `linear-gradient(150deg, ${moss}12, ${sand}55)`,
      border: `1px solid ${moss}28`, textAlign: "center",
    }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>🌱</div>
      <div style={{
        fontFamily: serif, fontSize: 20, color: "#2D4A35",
        lineHeight: 1.25, marginBottom: 10,
      }}>
        Your sleep plan is on its way
      </div>
      <p style={{
        fontFamily: font, fontSize: 13.5, color: "#5C7A5E",
        lineHeight: 1.65, marginBottom: 20, maxWidth: 280, margin: "0 auto 20px",
      }}>
        {consultantName
          ? `${consultantName} is reviewing your intake and building a personalized plan for your family.`
          : "Your consultant is reviewing your intake and building a personalized plan for your family."
        }
      </p>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 18px", borderRadius: 30,
        background: `${moss}18`, border: `1px solid ${moss}30`,
      }}>
        <span style={{ fontSize: 14 }}>📬</span>
        <span style={{ fontFamily: font, fontSize: 12.5, color: moss, fontWeight: 600 }}>
          You'll be notified when it's ready
        </span>
      </div>
      <p style={{
        fontFamily: font, fontSize: 12, color: "#5C7A5E99",
        marginTop: 18, lineHeight: 1.5,
      }}>
        In the meantime, use the Sleep Log to start tracking — your data will be here when your plan arrives.
      </p>
    </div>
  );
}

export function HeldSleepShell({ canAccessSleepPlan, onOpenDrawer }) {
  const T = useT();
  const { currentUser, activeFamily, activeChild, consultants } = useApp();
  const [view, setView] = useState("log");
  const [sleepTab, setSleepTab] = useState("today");

  // ── Check whether a real plan has been built yet ──
  const [planExists, setPlanExists] = useState(null); // null = loading
  useEffect(() => {
    if (!activeFamily?.id || !canAccessSleepPlan) { setPlanExists(false); return; }
    let cancelled = false;
    supabase
      .from("families")
      .select("sleep_plan_profile")
      .eq("id", activeFamily.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const profile = data?.sleep_plan_profile;
        setPlanExists(!!(profile && profile.method && profile.childName));
      })
      .catch(() => { if (!cancelled) setPlanExists(false); });
    return () => { cancelled = true; };
  }, [activeFamily?.id, canAccessSleepPlan]);

  const hasConsultant = !!(activeFamily?.consultant_id || (consultants && consultants.length > 0));
  const waitingForPlan = canAccessSleepPlan && hasConsultant && planExists === false;
  const consultantName = consultants?.[0]?.name || null;

  const childName = activeChild?.name || "your little one";
  const age = activeChild?.dob ? ageLabel(activeChild.dob) : null;
  const day = dayLabel();

  if (!activeFamily) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: T.muted, fontFamily: font }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🌙</div>
        <p style={{ fontFamily: serif, fontSize: 15, color: T.headingText, marginBottom: 8 }}>Loading sleep data…</p>
        <p style={{ fontSize: 13 }}>If this persists, try signing out and back in.</p>
      </div>
    );
  }

  const planTabs = [
    { id: "log",  label: "Sleep Log",  icon: "🌙" },
    ...(canAccessSleepPlan ? [{ id: "plan", label: "Sleep Plan", icon: "📋" }] : []),
  ];

  const logTabs = [
    { id: "today",    label: "Today"    },
    { id: "patterns", label: "Patterns" },
    { id: "wellness", label: "Wellness" },
  ];

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* ── TOP BAR — child pill + day label ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 18px 0",
      }}>
        {/* Child pill */}
        <button onClick={onOpenDrawer} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: T.faint, border: `1px solid ${T.border}`,
          borderRadius: 20, padding: "5px 12px 5px 8px",
          fontFamily: font, fontSize: 12.5, color: T.text, fontWeight: 500,
          cursor: onOpenDrawer ? "pointer" : "default",
        }}>
          <span style={{ fontSize: 15 }}>
            {activeChild?.gender === "girl" ? "👧" : activeChild?.gender === "boy" ? "👦" : "🧒"}
          </span>
          <span>{childName}</span>
          {age && <span style={{ color: T.muted, fontSize: 11 }}>{age}</span>}
          {onOpenDrawer && <span style={{ color: T.muted, fontSize: 10, marginLeft: 2 }}>▾</span>}
        </button>

        {/* Right: day label */}
        <span style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{day}</span>
      </div>

      <div style={{ padding: "0 18px" }}>
        {/* ── HEADER ── */}
        <div style={{ marginTop: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: T.muted, fontFamily: font, marginBottom: 4 }}>
            {sleepTab === "wellness" && view === "log" ? "Sleep · Wellness" : "Sleep"}
          </div>
          <div style={{ fontFamily: serif, fontSize: 32, color: T.headingText, lineHeight: 1.1, marginBottom: 2 }}>
            {sleepTab === "wellness" && view === "log"
              ? `${childName}'s wellness`
              : sleepTab === "patterns" && view === "log"
              ? `${childName}'s patterns`
              : `${childName}'s day`}
          </div>
          {age && <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>{age}</div>}
        </div>

        {/* ── LOG / PLAN SEG ── */}
        {planTabs.length > 1 && (
          <div style={{ marginBottom: 14 }}>
            <SegControl options={planTabs} value={view} onChange={setView} T={T} />
          </div>
        )}

        {/* Upgrade nudge — only shown to non-consultant-linked free users */}
        {!canAccessSleepPlan && !hasConsultant && (
          <div style={{ marginBottom: 14, padding: "12px 16px", borderRadius: 12, background: `${T.teal}0c`, border: `1px solid ${T.teal}25`, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <div>
              <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.headingText, marginBottom: 2 }}>Want a personalized sleep plan?</div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>Plus members get an AI-generated plan — starting at $10/mo.</div>
            </div>
          </div>
        )}

        {view === "log" && (
          <>
            {/* ── TODAY / PATTERNS / WELLNESS TABS ── */}
            <div style={{ marginBottom: 14 }}>
              <TabPills options={logTabs} value={sleepTab} onChange={setSleepTab} T={T} />
            </div>

            {/* ── MM BANNER — Today only; Patterns/Wellness have their own ── */}
            {sleepTab === "today" && <MMBanner text={MM_BANNERS[sleepTab]} T={T} />}

            {/* ── SLEEP LOG ── */}
            <SleepLog
              key={sleepTab}
              user={currentUser}
              activeFamily={activeFamily}
              initialTab={sleepTab}
            />
          </>
        )}

        {view === "plan" && canAccessSleepPlan && waitingForPlan && (
          <WaitingForPlan T={T} consultantName={consultantName} />
        )}

        {view === "plan" && canAccessSleepPlan && !waitingForPlan && planExists !== null && (
          <SleepPlanTracker user={currentUser} activeFamily={activeFamily} />
        )}
      </div>
    </div>
  );
}
