import { useState, useEffect } from "react";
import {
  THEMES,
  ThemeCtx,
  AppCtx,
  useT,
  useApp,
  useStorage,
  font,
  serif,
  Card,
  Btn,
  Input,
  ThemeToggle
} from "./core/shared.jsx";
import { supabase } from "./lib/supabase.js";
import { LibraryModule } from "./modules/library/LibraryModule.jsx";

import { RegulationModule } from "./modules/regulation/RegulationModule.jsx";
import { Messaging } from "./modules/messaging/Messaging.jsx";
import { SleepLog } from "./modules/sleep/SleepLog.jsx";
import { SleepPlanTracker } from "./modules/sleep/SleepPlanTracker.jsx";
import { IntakeForm } from "./modules/intake/IntakeForm.jsx";
import { IntakeViewer } from "./modules/intake/IntakeViewer.jsx";

// ─── ROLES ────────────────────────────────────────────────────────────────────
const ROLES = {
  parent: "parent",
  consultant: "consultant",
  consultant_internal: "consultant_internal",
  admin: "admin",
};

function isConsultant(role) {
  return role === ROLES.consultant || role === ROLES.consultant_internal;
}
function isAdmin(role) {
  return role === ROLES.admin;
}

// ─── TAB DEFINITIONS ─────────────────────────────────────────────────────────
const PARENT_TABS = [
  { id: "home", label: "Home", icon: "🏡" },
  { id: "sleep", label: "Sleep", icon: "🌙" },
  { id: "regulation", label: "Regulation", icon: "🌿" },
  { id: "messages", label: "Messages", icon: "💬" },
  { id: "library", label: "Library", icon: "📚" },
];

const CONSULTANT_TABS = [
  { id: "families", label: "Families", icon: "👨‍👩‍👧" },
  { id: "messages", label: "Messages", icon: "💬" },
  { id: "sleep", label: "Sleep", icon: "🌙" },
  { id: "regulation", label: "Regulation", icon: "🌿" },
  { id: "account", label: "Account", icon: "⚙️" },
];

const ADMIN_TABS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "consultants", label: "Consultants", icon: "👥" },
  { id: "families", label: "Families", icon: "👨‍👩‍👧" },
  { id: "billing", label: "Billing", icon: "💳" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

const CONSULTANT_VIEW_TABS = [
  { id: "families", label: "Families", icon: "👨‍👩‍👧" },
  { id: "messages", label: "Messages", icon: "💬" },
  { id: "sleep", label: "Sleep", icon: "🌙" },
  { id: "regulation", label: "Regulation", icon: "🌿" },
];

// ─── GENERIC LOADING SCREEN ──────────────────────────────────────────────────
function LoadingScreen({ label = "Loading…" }) {
  const T = useT();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🌿</div>
        <div style={{ fontFamily: serif, fontSize: 18, color: T.muted }}>{label}</div>
      </div>
    </div>
  );
}

// ─── AUTH SCREENS ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onGoRegister }) {
  const T = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onLogin({ email, password });
    } catch (e) {
      setError(e.message || "Sign in failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email address above first.");
      return;
    }
    setResetLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setResetLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 24px"
      }}
    >
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: T.subText,
              marginBottom: 8
            }}
          >
            Rooted Connections Collective
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 32, color: T.headingText, lineHeight: 1.1 }}>
            Welcome back.
          </h1>
        </div>

        <Card>
          <Input label="Email" value={email} onChange={setEmail} type="email" required />
          <Input label="Password" value={password} onChange={setPassword} type="password" required />
          {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 12 }}>{error}</div>}
          <Btn onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Btn>

          {resetSent && (
            <div style={{ fontSize: 13, color: "#7BAA8A", textAlign: "center", marginTop: 10, lineHeight: 1.6, fontFamily: font }}>
              ✓ Password reset email sent! Check your inbox.
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button
              onClick={handleForgotPassword}
              disabled={resetLoading}
              style={{
                background: "none", border: "none",
                fontFamily: font, fontSize: 12.5,
                color: T.muted, cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {resetLoading ? "Sending…" : "Forgot password?"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button
              onClick={onGoRegister}
              style={{
                background: "none",
                border: "none",
                fontFamily: font,
                fontSize: 13,
                color: T.teal,
                cursor: "pointer"
              }}
            >
              New parent? Create an account →
            </button>
          </div>
        </Card>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT PENDING SCREEN ───────────────────────────────────────────────────
function PaymentPendingScreen({ email }) {
  const T = useT();
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", padding: "0 24px"
    }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🌿</div>
        <h1 style={{ fontFamily: serif, fontSize: 28, color: T.headingText, marginBottom: 12 }}>
          Complete your payment
        </h1>
        <p style={{ fontFamily: font, fontSize: 14, color: T.muted, lineHeight: 1.7, marginBottom: 24 }}>
          This invite requires a subscription to access the platform.
          Check your email{email ? ` at ${email}` : ""} for the payment link, or contact your admin if you need help.
        </p>
        <div style={{
          padding: "14px 20px", borderRadius: 12,
          border: `1px solid ${T.border}`, background: T.card,
          fontFamily: font, fontSize: 13, color: T.muted
        }}>
          Once payment is confirmed, you'll receive a new email with your account setup link.
        </div>
      </div>
    </div>
  );
}

function RegisterScreen({
  onBack,
  onRegistered,
  inviteToken,
  consultantInviteToken,
  inviteRecord
}) {
  const T = useT();
      const [form, setForm] = useState({
    name: "",
    email: inviteRecord?.invite_email || inviteRecord?.email || "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitAccount() {
    if (!form.name || !form.email || !form.password) {
      setError("All fields are required.");
      return;
    }

        const lockedEmail = inviteRecord?.invite_email || inviteRecord?.email;

    if (lockedEmail && form.email.toLowerCase() !== lockedEmail.toLowerCase()) {
      setError("Please register using the same email address that received the invitation.");
      return;
    }

    setError("");
    setLoading(true);

    try {
            await onRegistered({
        email: form.email,
        password: form.password,
        name: form.name,
        role:
          inviteRecord?.invite_kind === "consultant"
            ? (inviteRecord?.role || "consultant")
            : "parent",
        inviteToken,
        consultantInviteToken,
      });
    } catch (e) {
      setError(e.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 24px"
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: T.muted,
            fontFamily: font,
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 20
          }}
        >
          ← Back to sign in
        </button>

        <div style={{ fontFamily: serif, fontSize: 26, color: T.headingText, marginBottom: 6 }}>
          Create your account.
        </div>

                {inviteRecord && (
          <div style={{ fontSize: 12.5, color: T.sage, marginBottom: 16 }}>
            {inviteRecord?.invite_kind === "consultant"
              ? "An account invitation has been created for you."
              : "Your consultant has created a family space for you."}
          </div>
        )}

        <Card>
          <Input
            label="Your name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            required
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            type="email"
            required
          />
          <Input
            label="Password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            type="password"
            required
          />

          {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{error}</div>}

          <Btn onClick={submitAccount} disabled={loading}>
            {loading ? "Creating account…" : "Continue →"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

function ChildInfoStep({ onSave, loading }) {
  const T = useT();
  const [child, setChild] = useState({
    name: "",
    dob: "",
    weight_lbs: "",
    weight_oz: "",
  });
  const [error, setError] = useState("");

  async function submit() {
    if (!child.name || !child.dob) {
      setError("Child name and date of birth are required.");
      return;
    }

    setError("");

    try {
      await onSave(child);
    } catch (e) {
      setError(e.message || "Unable to save child info.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 24px"
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ fontFamily: serif, fontSize: 26, color: T.headingText, marginBottom: 8 }}>
          Tell us about your child.
        </div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
          We’ll use this to personalize your experience and calculate age-appropriate guidance.
        </div>

        <Card>
          <Input
            label="Child's name"
            value={child.name}
            onChange={(v) => setChild((c) => ({ ...c, name: v }))}
            required
          />
          <Input
            label="Date of birth"
            value={child.dob}
            onChange={(v) => setChild((c) => ({ ...c, dob: v }))}
            type="date"
            required
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input
              label="Weight (lbs)"
              value={child.weight_lbs}
              onChange={(v) => setChild((c) => ({ ...c, weight_lbs: v }))}
              type="number"
            />
            <Input
              label="Weight (oz)"
              value={child.weight_oz}
              onChange={(v) => setChild((c) => ({ ...c, weight_oz: v }))}
              type="number"
            />
          </div>

          {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{error}</div>}

          <Btn onClick={submit} disabled={loading}>
            {loading ? "Saving…" : "Continue →"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ─── PARENT HOME ─────────────────────────────────────────────────────────────
function ParentHome({ user, onLogout, onInviteCo }) {
  const T = useT();
  const { setTab, consultants } = useApp();
  const consultant = consultants?.[0];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const cards = [
    { label: "Sleep Log", icon: "🌙", tab: "sleep" },
    { label: "Regulate", icon: "🌿", tab: "regulation" },
    { label: "Messages", icon: "💬", tab: "messages" },
    { label: "Library", icon: "📚", tab: "library" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: T.subText,
              marginBottom: 6,
              fontFamily: font
            }}
          >
            Rooted Connections Collective
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 30, color: T.headingText, lineHeight: 1.15 }}>
            {greeting()},<br />
            {user?.name || user?.email?.split("@")[0] || "there"}.
          </h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <ThemeToggle />
          <button
            onClick={onLogout}
            style={{
              background: "none",
              border: "none",
              fontFamily: font,
              fontSize: 12,
              color: T.muted,
              cursor: "pointer"
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {cards.map((c) => (
          <button
            key={c.tab}
            onClick={() => setTab(c.tab)}
            style={{
              background: T.card2,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: "20px 18px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all .2s",
              fontFamily: font
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.headingText }}>{c.label}</div>
          </button>
        ))}
      </div>

      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, padding: "16px 18px", background: T.card }}>
        <div
          style={{
            fontSize: 9.5,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: T.subText,
            fontFamily: font,
            marginBottom: 8
          }}
        >
          Your Consultant
        </div>

        {consultant ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: `${T.teal}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: T.teal,
                flexShrink: 0
              }}
            >
              {(consultant.name || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: T.text }}>
                {consultant.name}
              </div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>
                {consultant.email}
              </div>
            </div>
            <button
              onClick={() => setTab("messages")}
              style={{
                marginLeft: "auto",
                background: T.faint,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "6px 12px",
                fontFamily: font,
                fontSize: 12,
                color: T.teal,
                cursor: "pointer"
              }}
            >
              Message
            </button>
          </div>
        ) : (
          <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
            No consultant assigned yet. You'll be notified when one is connected.
          </p>
        )}
      </div>
      {/* Co-caregiver invite */}
<div style={{ borderRadius: 14, border: `1px solid ${T.border}`, padding: "16px 18px", background: T.card, marginTop: 12 }}>
  <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>
    Co-Caregiver
  </div>
  <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 12 }}>
    Invite a partner or co-caregiver to view the sleep plan and check off items.
  </p>
  <button
    onClick={onInviteCo}
    style={{ background: T.faint, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontFamily: font, fontSize: 13, color: T.teal, cursor: "pointer" }}
  >
    + Invite co-caregiver
  </button>
</div>
    </div>
  );
}

// ─── SLEEP TAB VIEW ───────────────────────────────────────────────────────────
function SleepTabView() {
  const [view, setView] = useState("log");
  const T = useT();
  const { activeFamily, currentUser } = useApp();

  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: T.faint, borderRadius: 12, padding: 4, marginBottom: 20 }}>
        {[{ id: "log", label: "Sleep Log", icon: "🌙" }, { id: "plan", label: "Sleep Plan", icon: "📋" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            style={{
              flex: 1,
              padding: "9px 4px",
              borderRadius: 9,
              border: "none",
              fontFamily: font,
              fontSize: 13,
              fontWeight: view === t.id ? 700 : 400,
              background: view === t.id ? `${T.teal}26` : "transparent",
              color: view === t.id ? T.teal : T.muted,
              cursor: "pointer",
              transition: "all .2s"
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {view === "log" && <SleepLog user={currentUser} activeFamily={activeFamily} />}
      {view === "plan" && <SleepPlanTracker user={currentUser} activeFamily={activeFamily} />}
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({ tabs, active, setActive, unread }) {
  const T = useT();

  return (
    <div
      className="rcc-bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderTop: `1px solid ${T.border}`,
        background: T.bg,
        padding: "8px 0 env(safe-area-inset-bottom, 16px)"
      }}
    >
      {tabs.map((t) => {
        const badge = unread?.[t.id];
        return (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "6px 0",
              cursor: "pointer",
              position: "relative",
              color: active === t.id ? T.teal : T.muted,
              fontFamily: font,
              fontSize: 10,
              fontWeight: active === t.id ? 700 : 400,
              transition: "color .2s"
            }}
          >
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
            {badge > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  right: "50%",
                  transform: "translateX(10px)",
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: T.rose,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#fff"
                }}
              >
                {badge}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── NS PULSE CARD ────────────────────────────────────────────────────────────
function NsPulseCard({ family }) {
  const T = useT();
  const [pulse, setPulse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastGenerated, setLastGenerated] = useState(null);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ data: logsData }, { data: famData }] = await Promise.all([
        supabase.from("sleep_logs").select("*").eq("family_id", family.id).gt("ts", sevenDaysAgo).order("ts", { ascending: false }),
        supabase.from("families").select("sleep_progress, sleep_progress_history, sleep_plan_profile").eq("id", family.id).maybeSingle(),
      ]);

      const logs = logsData || [];
      const sessions = logs.filter(l => l.type === "sleep_session" && l.end_ts);
      const wakings = logs.filter(l => l.type === "night_waking");
      const moods = logs.filter(l => l.type === "sleep_session" && l.mood);
      const history = famData?.sleep_progress_history || [];
      const plan = famData?.sleep_plan_profile || {};
      const allItems = Object.keys(famData?.sleep_progress || {});

      const recentHistory = history.slice(-7);
      const avgCompliance = recentHistory.length > 0
        ? Math.round(recentHistory.reduce((sum, snap) => {
            const checked = Object.values(snap.checks || {}).filter(Boolean).length;
            return sum + (allItems.length ? checked / allItems.length : 0);
          }, 0) / recentHistory.length * 100)
        : null;

      const avgFallAsleep = sessions.filter(s => s.fall_asleep_secs).length
        ? Math.round(sessions.filter(s => s.fall_asleep_secs).reduce((s, l) => s + l.fall_asleep_secs, 0) / sessions.filter(s => s.fall_asleep_secs).length / 60)
        : null;

      const moodSummary = moods.reduce((acc, l) => { acc[l.mood] = (acc[l.mood] || 0) + 1; return acc; }, {});
      const nightWakingAvg = sessions.length ? (wakings.length / sessions.length).toFixed(1) : null;

      const prompt = `You are a nervous-system-informed sleep consultant reading behavioral data from a family's sleep tracking app. Your job is to infer what this data suggests about the parent's nervous system state — not the child's sleep quality in isolation.

You understand that:
- Low plan compliance signals caregiver overwhelm or dysregulation more than laziness
- Increasing night wakings after improvement often reflects parental nervous system contagion
- Mood patterns at wake-up reflect the parent's capacity as much as the child's
- Long fall-asleep times can signal a dysregulated bedtime environment
- Compliance drop + worsening sleep together is a red flag for parental burnout

━━━ BEHAVIORAL DATA (last 7 days) ━━━

Sleep method: ${plan.method || "not set"}
Training day: ${plan.startDate ? Math.floor((new Date() - new Date(plan.startDate)) / 86400000) + 1 : "unknown"}
Avg plan compliance: ${avgCompliance !== null ? avgCompliance + "%" : "no data"}
Avg fall asleep time: ${avgFallAsleep !== null ? avgFallAsleep + " min" : "no data"}
Avg night wakings per session: ${nightWakingAvg || "no data"}
Wake-up mood distribution: ${Object.entries(moodSummary).map(([k,v]) => k + ": " + v).join(", ") || "no mood data"}
Sessions logged: ${sessions.length} | Night wakings: ${wakings.length}

Recent compliance:
${recentHistory.map((snap, i) => {
  const checked = Object.values(snap.checks || {}).filter(Boolean).length;
  const pct = allItems.length ? Math.round(checked / allItems.length * 100) : 0;
  return "  " + snap.date + ": " + pct + "%";
}).join("\n") || "  No history yet"}

━━━ YOUR RESPONSE FORMAT ━━━

## 🌿 NS Pulse
2–3 sentences on what this behavioral pattern suggests about where this parent is right now. Direct, compassionate, no diagnosing.

## 📉 Trend to Watch
The most important pattern. One or two sentences.

## 💬 Suggested Opener
One or two sentences the consultant could use to open their next message with this parent.

## ⚡ Recommended Action
One concrete thing to do in the next 24–48 hours.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 700,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "API error");
      const result = data.content?.[0]?.text || "";
      setPulse(result);
      setLastGenerated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError("Failed to generate. Check API key and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Parse pulse sections for display
  const sections = pulse ? pulse.split(/\n## /).map((s, i) => i === 0 ? s.replace(/^## /, "") : s).filter(Boolean) : [];

  return (
    <div style={{
      borderRadius: 14, border: `1px solid ${T.border}`,
      background: T.card, padding: "16px 18px", marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: pulse ? 14 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🌿</span>
          <div>
            <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: T.headingText }}>NS Pulse</div>
            {lastGenerated && <div style={{ fontSize: 11, color: T.muted, fontFamily: font }}>Generated at {lastGenerated}</div>}
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: "7px 12px", borderRadius: 9,
            border: `1px solid ${"#7BAA8A"}44`,
            background: loading ? T.faint : `${"#7BAA8A"}12`,
            color: "#7BAA8A", fontFamily: font, fontSize: 12,
            fontWeight: 600, cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Reading..." : pulse ? "🔄 Refresh" : "Generate"}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#A87B8A", fontFamily: font, marginTop: 8 }}>{error}</div>
      )}

      {loading && (
        <div style={{ fontSize: 13, color: T.muted, fontFamily: font, marginTop: 10, textAlign: "center", padding: "8px 0" }}>
          Reading behavioral patterns...
        </div>
      )}

      {!pulse && !loading && !error && (
        <div style={{ fontSize: 12.5, color: T.muted, fontFamily: font, marginTop: 8, lineHeight: 1.6 }}>
          Reads the last 7 days of sleep data and plan compliance to infer where this family is right now.
        </div>
      )}

      {sections.map((section, i) => {
        const lines = section.split("\n");
        const heading = lines[0];
        const body = lines.slice(1).join("\n").trim();
        if (!body) return null;
        return (
          <div key={i} style={{
            marginTop: 10, borderRadius: 10,
            background: `${"#7BAA8A"}0e`,
            border: `1px solid ${"#7BAA8A"}20`,
            padding: "10px 14px",
          }}>
            {heading && <div style={{ fontFamily: serif, fontSize: 13, color: T.headingText, marginBottom: 4 }}>{heading}</div>}
            <div style={{ fontFamily: font, fontSize: 12.5, color: T.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{body}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CONSULTANT VIEWS ─────────────────────────────────────────────────────────
function ConsultantFamilies() {
  const T = useT();
  const { families, setActiveFamily, setTab, selectedConsultantFamily, setSelectedConsultantFamily } = useApp();
  const [viewingIntake, setViewingIntake] = useState(false);

  // If viewing intake, show the full IntakeViewer
  if (selectedConsultantFamily && viewingIntake) {
    return (
      <IntakeViewer
        family={selectedConsultantFamily}
        onBack={() => setViewingIntake(false)}
      />
    );
  }

  // If we have a selected family, show their dashboard
  if (selectedConsultantFamily) {
    return (
      <div>
        {/* Back button */}
        <button
          onClick={() => setSelectedConsultantFamily(null)}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none",
            border: "none", color: T.muted, fontFamily: font, fontSize: 13,
            cursor: "pointer", marginBottom: 20, padding: 0,
          }}
        >
          ← Back to Families
        </button>

        {/* Family header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: `${T.teal}20`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 20, fontWeight: 700, color: T.teal,
          }}>
            {(selectedConsultantFamily.display_name || selectedConsultantFamily.invite_email || "?")[0].toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontFamily: serif, fontSize: 20, color: T.headingText, margin: 0 }}>
              {selectedConsultantFamily.display_name || selectedConsultantFamily.invite_email || "Unnamed family"}
            </h2>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
              {selectedConsultantFamily.intake_complete ? "✓ Intake complete" : "⏳ Awaiting intake"}
            </div>
          </div>
        </div>

        {/* NS Pulse */}
        <NsPulseCard family={selectedConsultantFamily} />

        {/* Quick action cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selectedConsultantFamily.intake_complete && (
            <Card
              onClick={() => setViewingIntake(true)}
              style={{ background: `${T.teal}10`, border: `1px solid ${T.teal}30` }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 24 }}>📋</span>
                <div>
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.teal }}>Review Intake</div>
                  <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>View responses, notes & AI insights</div>
                </div>
                <span style={{ marginLeft: "auto", color: T.teal }}>→</span>
              </div>
            </Card>
          )}
          {[
            { icon: "💬", label: "Messages", sub: "View conversation", tab: "messages" },
            { icon: "🌙", label: "Sleep Log", sub: "View sleep data", tab: "sleep" },
            { icon: "🌿", label: "Regulation", sub: "Regulation tools", tab: "regulation" },
          ].map(item => (
            <Card
              key={item.tab}
              onClick={() => { setActiveFamily(selectedConsultantFamily); setTab(item.tab); }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <div>
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{item.label}</div>
                  <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{item.sub}</div>
                </div>
                <span style={{ marginLeft: "auto", color: T.muted }}>→</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Family list view
  return (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Families</h2>

      {families.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontFamily: font, fontSize: 13 }}>
          No families assigned yet.
        </div>
      )}

      {families.map((f) => (
        <Card key={f.id} style={{ marginBottom: 12, cursor: "pointer" }} onClick={() => { setActiveFamily(f); setSelectedConsultantFamily(f); }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: `${T.teal}20`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 16, fontWeight: 700, color: T.teal, flexShrink: 0,
              }}
            >
              {(f.display_name || f.invite_email || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>
                {f.display_name || f.invite_email || "Unnamed family"}
              </div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 2 }}>
                {f.intake_complete ? "✓ Intake complete" : "⏳ Awaiting intake"}
              </div>
            </div>
            <span style={{ marginLeft: "auto", color: T.muted }}>→</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ConsultantAccount({ user, onLogout }) {
  const T = useT();
  const [profile, setProfile] = useState(null);
  const [showPin, setShowPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("subscription_active, subscription_id, stripe_customer_id, grace_period_until, consultant_pin, role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [user?.id]);

  async function savePin() {
    if (!newPin || newPin.length < 4) { setPinError("PIN must be at least 4 digits."); return; }
    if (!/^\d+$/.test(newPin)) { setPinError("PIN must be numbers only."); return; }
    setPinSaving(true); setPinError("");
    const { error } = await supabase.from("profiles").update({ consultant_pin: parseInt(newPin) }).eq("id", user.id);
    if (error) { setPinError("Failed to save PIN."); }
    else { setPinSaved(true); setNewPin(""); setTimeout(() => setPinSaved(false), 2000); }
    setPinSaving(false);
  }

  const isInternal = user?.role === "consultant_internal";
  const isActive = profile?.subscription_active;
  const inGrace = profile?.grace_period_until && new Date(profile.grace_period_until) > new Date();
  const subLabel = isInternal ? "Internal · No subscription required" : isActive ? "Active" : inGrace ? "Grace period" : profile ? "Inactive" : "—";
  const subColor = isInternal ? "#7BAA8A" : isActive ? "#7BAA8A" : inGrace ? "#A89B5A" : "#A87B8A";

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Account</h2>

      {/* Profile */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 12, fontFamily: font }}>Your Profile</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: `${T.teal}22`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18, fontWeight: 700, color: T.teal, flexShrink: 0,
          }}>
            {(user?.name || user?.email || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: font }}>{user?.name || "—"}</div>
            <div style={{ fontSize: 13, color: T.muted, fontFamily: font }}>{user?.email || user?.user_email}</div>
            <div style={{ fontSize: 11, color: T.subText, fontFamily: font, marginTop: 2, textTransform: "capitalize" }}>
              {user?.role?.replace("_", " ") || "Consultant"}
            </div>
          </div>
        </div>
      </Card>

      {/* Subscription */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 12, fontFamily: font }}>Subscription</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontFamily: font, fontSize: 14, color: T.text }}>RCC Consultant Plan</div>
          <div style={{
            padding: "3px 10px", borderRadius: 20,
            background: `${subColor}18`, border: `1px solid ${subColor}40`,
            fontSize: 12, fontWeight: 700, color: subColor, fontFamily: font,
          }}>
            {subLabel}
          </div>
        </div>
        <div style={{ fontSize: 13, color: T.muted, fontFamily: font, lineHeight: 1.6 }}>
          $20 / month · Billed monthly
        </div>
        {inGrace && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#A89B5A", fontFamily: font }}>
            ⚠️ Grace period ends {new Date(profile.grace_period_until).toLocaleDateString()}
          </div>
        )}
        {!isInternal && !isActive && !inGrace && profile && (
          <div style={{ marginTop: 8, fontSize: 12, color: T.muted, fontFamily: font, lineHeight: 1.6 }}>
            Your subscription is currently inactive. To reactivate or update billing,<br />
            email us at <a href="mailto:hello@rootedconnectionscollective.com" style={{ color: T.teal }}>hello@rootedconnectionscollective.com</a>
          </div>
        )}
        {isInternal && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#7BAA8A", fontFamily: font, lineHeight: 1.6 }}>
            🌿 As part of the RCC team, your access is fully covered — no billing needed.
          </div>
        )}
        {!isInternal && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.muted, fontFamily: font, lineHeight: 1.6 }}>
            To cancel or make changes to your subscription, email us at{" "}
            <a href="mailto:hello@rootedconnectionscollective.com" style={{ color: T.teal }}>
              hello@rootedconnectionscollective.com
            </a>
          </div>
        )}
      </Card>

      {/* Consultant PIN */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 12, fontFamily: font }}>Consultant PIN</div>
        <div style={{ fontSize: 13, color: T.muted, fontFamily: font, lineHeight: 1.6, marginBottom: 12 }}>
          Your PIN is used to access the Sleep Log configure tab for families. Keep it somewhere safe.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: T.headingText,
            letterSpacing: ".2em", minWidth: 80,
          }}>
            {showPin ? (profile?.consultant_pin || "—") : "••••"}
          </div>
          <button
            onClick={() => setShowPin(s => !s)}
            style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 12px", fontFamily: font, fontSize: 12, color: T.muted, cursor: "pointer" }}
          >
            {showPin ? "Hide" : "Show"}
          </button>
        </div>

        {/* Change PIN */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            value={newPin}
            onChange={e => setNewPin(e.target.value)}
            placeholder="New PIN (4+ digits)"
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`,
              background: T.inputBg, color: T.text, fontFamily: font, fontSize: 13,
              outline: "none",
            }}
            onFocus={e => e.target.style.borderColor = T.teal}
            onBlur={e => e.target.style.borderColor = T.border}
          />
          <button
            onClick={savePin}
            disabled={pinSaving || !newPin}
            style={{
              padding: "9px 16px", borderRadius: 9, border: "none",
              background: pinSaving || !newPin ? T.faint : T.teal,
              color: pinSaving || !newPin ? T.muted : "#fff",
              fontFamily: font, fontSize: 13, fontWeight: 600,
              cursor: pinSaving || !newPin ? "default" : "pointer",
            }}
          >
            {pinSaving ? "Saving..." : pinSaved ? "✓ Saved" : "Update PIN"}
          </button>
        </div>
        {pinError && <div style={{ fontSize: 12, color: "#A87B8A", fontFamily: font, marginTop: 6 }}>{pinError}</div>}
      </Card>

      {/* Support */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 10, fontFamily: font }}>Need Help?</div>
        <div style={{ fontSize: 13, color: T.muted, fontFamily: font, lineHeight: 1.6 }}>
          For platform support, billing questions, or anything else — reach out directly.
        </div>
        <a
          href="mailto:hello@rootedconnectionscollective.com"
          style={{
            display: "inline-block", marginTop: 10,
            padding: "9px 16px", borderRadius: 9,
            border: `1px solid ${T.border}`, background: T.faint,
            fontFamily: font, fontSize: 13, color: T.teal,
            textDecoration: "none", fontWeight: 600,
          }}
        >
          ✉️ hello@rootedconnectionscollective.com
        </a>
      </Card>

      <Btn onClick={onLogout} style={{ background: "none", border: `1px solid ${T.border}`, color: T.muted }}>
        Sign out
      </Btn>
    </div>
  );
}

// ─── ADMIN VIEWS ──────────────────────────────────────────────────────────────
function AdminDashboard({ consultants, families }) {
  const T = useT();

  const stats = [
    { label: "Families", value: families.length, icon: "👨‍👩‍👧" },
    { label: "Consultants", value: consultants.length, icon: "👥" },
    { label: "Active plans", value: families.filter((f) => f.intake_complete).length, icon: "📋" },
    { label: "Pending intake", value: families.filter((f) => !f.intake_complete).length, icon: "⏳" },
  ];

  return (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {stats.map((s) => (
          <Card key={s.label}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: serif, fontSize: 28, color: T.headingText }}>{s.value}</div>
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminConsultants({ consultants }) {
  const T = useT();

  return (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Consultants</h2>
      {consultants.map((c) => (
        <Card key={c.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: `${T.teal}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: T.teal
              }}
            >
              {(c.name || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{c.name}</div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{c.user_email || c.email}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AdminBilling() {
  const T = useT();
  return (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Billing</h2>
      <Card>
        <p style={{ fontFamily: font, fontSize: 13, color: T.muted }}>Billing management coming soon.</p>
      </Card>
    </div>
  );
}

function LibraryPlaceholder() {
  const T = useT();
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
      <div style={{ fontFamily: serif, fontSize: 18, color: T.muted }}>Library coming soon.</div>
    </div>
  );
}

// ─── INVITE PANELS ────────────────────────────────────────────────────────────
function InviteFamilyPanel({ form, setForm, onSend, onClose, busy, error, success }) {
  const T = useT();
  return (
    <div style={{ marginBottom: 20, padding: 20, borderRadius: 14, border: `1px solid ${T.border}`, background: T.card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText }}>Invite Family</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      <Input
        label="Parent email"
        value={form.email}
        onChange={v => setForm(f => ({ ...f, email: v }))}
        type="email"
        required
      />
      <Input
        label="Family display name (optional)"
        value={form.display_name}
        onChange={v => setForm(f => ({ ...f, display_name: v }))}
        placeholder="e.g. The Johnson Family"
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setForm(f => ({ ...f, require_intake: !f.require_intake }))}
          style={{
            width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
            background: form.require_intake ? T.teal : T.faint,
            position: "relative", transition: "background .2s", flexShrink: 0
          }}
        >
          <span style={{
            position: "absolute", top: 2,
            left: form.require_intake ? 18 : 2,
            width: 16, height: 16, borderRadius: "50%",
            background: "#fff", transition: "left .2s"
          }} />
        </button>
        <div>
          <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text }}>Require intake form</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>Family will complete intake before accessing the app</div>
        </div>
      </div>

      {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{error}</div>}
      {success && <div style={{ fontSize: 12.5, color: T.sage, marginBottom: 10 }}>✓ {success}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={onSend} disabled={busy}>
          {busy ? "Sending…" : "Send invitation →"}
        </Btn>
        <button onClick={onClose} style={{
          padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.border}`,
          background: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer"
        }}>
          Cancel
        </button>
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

      <Input
        label="Consultant email"
        value={form.email}
        onChange={v => setForm(f => ({ ...f, email: v }))}
        type="email"
        required
      />
      <Input
        label="Consultant name (optional)"
        value={form.name}
        onChange={v => setForm(f => ({ ...f, name: v }))}
        placeholder="e.g. Sarah M."
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setForm(f => ({ ...f, consultant_internal: !f.consultant_internal }))}
          style={{
            width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
            background: form.consultant_internal ? T.teal : T.faint,
            position: "relative", transition: "background .2s", flexShrink: 0
          }}
        >
          <span style={{
            position: "absolute", top: 2,
            left: form.consultant_internal ? 18 : 2,
            width: 16, height: 16, borderRadius: "50%",
            background: "#fff", transition: "left .2s"
          }} />
        </button>
        <div>
          <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text }}>Internal consultant</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>Part of the RCC team (vs. external/affiliate)</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setForm(f => ({ ...f, payment_required: !f.payment_required }))}
          style={{
            width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
            background: form.payment_required ? T.teal : T.faint,
            position: "relative", transition: "background .2s", flexShrink: 0
          }}
        >
          <span style={{
            position: "absolute", top: 2,
            left: form.payment_required ? 18 : 2,
            width: 16, height: 16, borderRadius: "50%",
            background: "#fff", transition: "left .2s"
          }} />
        </button>
        <div>
          <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text }}>Requires payment</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>Consultant must complete payment before accessing the platform</div>
        </div>
      </div>

      {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{error}</div>}
      {success && <div style={{ fontSize: 12.5, color: T.sage, marginBottom: 10 }}>✓ {success}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={onSend} disabled={busy}>
          {busy ? "Sending…" : "Send invitation →"}
        </Btn>
        <button onClick={onClose} style={{
          padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.border}`,
          background: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer"
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
export default function RCCShell() {
  // Theme
  const [themeMode, setThemeMode] = useStorage("rcc_theme", "dark");
  const T = THEMES[themeMode] || THEMES.dark;
  function toggleTheme() {
    setThemeMode((m) => (m === "dark" ? "light" : "dark"));
  }

  // Auth state
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
  try {
    const cached = localStorage.getItem("rcc_user");
    return cached ? JSON.parse(cached) : null;
  } catch { return null; }
});
const [authLoading, setAuthLoading] = useState(() => {
  // If we have a cached user, don't show loading screen on startup
  try {
    return !localStorage.getItem("rcc_user");
  } catch { return true; }
});
  const [authScreen, setAuthScreen] = useState("login");

  // App data state
  const [families, setFamilies] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [children, setChildren] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useStorage("rcc_active_family", null);
  const activeFamily = families.find((f) => f.id === activeFamilyId) || families[0] || null;


  // Invite / onboarding state
  const [tab, setTab] = useState("home");
  const [adminConsultantView, setAdminConsultantView] = useState(false);
  const [selectedConsultantFamily, setSelectedConsultantFamily] = useState(null);

  const [showInviteConsultant, setShowInviteConsultant] = useState(false);
  const [showInviteFamily, setShowInviteFamily] = useState(false);
  const [showInviteCo, setShowInviteCo] = useState(false);
  const [coInviteEmail, setCoInviteEmail] = useState("");
  const [coInviteBusy, setCoInviteBusy] = useState(false);
  const [coInviteError, setCoInviteError] = useState("");
  const [coInviteSuccess, setCoInviteSuccess] = useState("");

    const [familyInviteForm, setFamilyInviteForm] = useState({
    email: "",
    display_name: "",
    require_intake: true,
  });

  const [consultantInviteForm, setConsultantInviteForm] = useState({
    email: "",
    name: "",
    consultant_internal: false,
    payment_required: false,
  });

  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const [inviteToken] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("invite");
    } catch {
      return null;
    }
  });

    const [consultantInviteToken] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("consultant_invite");
    } catch {
      return null;
    }
  });

  const [inviteRecord, setInviteRecord] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken || !!consultantInviteToken);
  const [onboardingStep, setOnboardingStep] = useState(null); // null | register | child | intake
  const [childSaving, setChildSaving] = useState(false);

  // ── INITIAL SESSION BOOT ─────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function boot() {
      // Safety net — never stay stuck loading more than 8 seconds
      const timeout = setTimeout(() => {
        if (mounted) setAuthLoading(false);
      }, 8000);

      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        const activeSession = data?.session || null;
        setSession(activeSession);

        if (activeSession?.user) {
          await loadProfile(activeSession.user.id, activeSession.user.email);
        } else {
          setAuthLoading(false);
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    boot();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // INITIAL_SESSION is already handled by boot() above — skip it to prevent double loadProfile
      if (event === "INITIAL_SESSION") return;

      setSession(newSession);

    if (newSession?.user) {
  // If we already have a user loaded, always refresh silently in the background
  if (currentUser) return;
  await loadProfile(newSession.user.id, newSession.user.email);
} else {
        setCurrentUser(null);
        setFamilies([]);
        setConsultants([]);
        setChildren([]);
        setOnboardingStep(inviteToken || consultantInviteToken ? "register" : null);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    }, [inviteToken, consultantInviteToken]);

  // ── INVITE LOADER (family invites come from families table) ────────────────
    useEffect(() => {
    if (!inviteToken && !consultantInviteToken) {
      setInviteLoading(false);
      return;
    }

    let ignore = false;

    async function loadInvite() {
      setInviteLoading(true);

      try {
        if (inviteToken) {
          const { data, error } = await supabase
            .from("families")
            .select("*")
            .eq("invite_token", inviteToken)
            .maybeSingle();

          if (error) throw error;

          if (!ignore) {
            setInviteRecord(data ? { ...data, invite_kind: "family" } : null);
            if (!session?.user) setOnboardingStep(data ? "register" : null);
          }
          return;
        }

        if (consultantInviteToken) {
          const { data, error } = await supabase
            .from("consultant_invites")
            .select("*")
            .eq("token", consultantInviteToken)
            .maybeSingle();

          if (error) throw error;

          if (!ignore) {
            setInviteRecord(data ? { ...data, invite_kind: "consultant" } : null);
            if (!session?.user) setOnboardingStep(data ? "register" : null);
          }
        }
      } catch (err) {
        console.error("loadInvite error:", err);
        if (!ignore) {
          setInviteRecord(null);
          if (!session?.user) setOnboardingStep(null);
        }
      } finally {
        if (!ignore) setInviteLoading(false);
      }
    }

    loadInvite();

    return () => {
      ignore = true;
    };
  }, [inviteToken, consultantInviteToken, session]);

  // ── LOAD PROFILE + DATA ──────────────────────────────────
  async function loadProfile(userId, authEmail = null, silent = false) {
  try {
    if (!silent) setAuthLoading(true);

      // ── Step 1: Fetch profile + auth user in parallel ──
      const [{ data: { user: authUser } }, { data: profile, error: profileError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      ]);

      if (profileError) throw profileError;

      const resolvedEmail = authEmail || authUser?.email || null;

      const merged = {
        ...(profile || {}),
        id: userId,
        name: profile?.name || authUser?.user_metadata?.name || resolvedEmail?.split("@")[0] || "there",
        role: profile?.role || authUser?.user_metadata?.role || "parent",
        consultant_pin: profile?.consultant_pin || authUser?.user_metadata?.consultant_pin || null,
        email: resolvedEmail,
      };

      // ── Show the user immediately — don't wait for data ──
      setCurrentUser(merged);
      try { localStorage.setItem("rcc_user", JSON.stringify(merged)); } catch {}
      setAuthLoading(false);

      // ── Step 2: Load role-specific data in parallel ──
      if (isAdmin(merged.role)) {
        setTab("dashboard");
        const [{ data: fams }, { data: cons }] = await Promise.all([
          supabase.from("families").select("*"),
          supabase.from("profiles").select("*").in("role", ["consultant", "consultant_internal"]),
        ]);
        setFamilies(fams || []);
        setConsultants(cons || []);
        setChildren([]);
        setOnboardingStep(null);

      } else if (isConsultant(merged.role)) {
        setTab("families");
        const { data: fams } = await supabase.from("families").select("*").eq("consultant_id", userId);
        setFamilies(fams || []);
        setConsultants([]);
        setChildren([]);
        setOnboardingStep(null);

      } else {
        setTab("home");

        // Fetch family by parent_id and children in parallel
        const [{ data: byId }, { data: kids }] = await Promise.all([
          supabase.from("families").select("*").eq("parent_id", userId).maybeSingle(),
          supabase.from("children").select("*").eq("parent_id", userId).order("created_at", { ascending: true }),
        ]);

        setChildren(kids || []);

        let familyData = byId || null;

        // Fallback: look up by email if not found by parent_id
        if (!familyData && resolvedEmail) {
          const { data: byEmail } = await supabase
            .from("families").select("*").eq("invite_email", resolvedEmail).maybeSingle();
          if (byEmail) {
            familyData = byEmail;
            await supabase.from("families").update({ parent_id: userId }).eq("id", byEmail.id);
          }
        }

        // Check if they're a co-caregiver
        if (!familyData && resolvedEmail) {
          const { data: coRecord } = await supabase
            .from("co_caregivers")
            .select("family_id")
            .eq("email", resolvedEmail)
            .eq("status", "active")
            .maybeSingle();

          if (coRecord) {
            const { data: coFamily } = await supabase
              .from("families")
              .select("*")
              .eq("id", coRecord.family_id)
              .maybeSingle();
            if (coFamily) {
              familyData = coFamily;
              merged.role = "co_caregiver";
            }
          }
        }

        if (familyData) {
          setFamilies([familyData]);
          if (!activeFamilyId) setActiveFamilyId(familyData.id);

          // Load consultant in background — don't block render
          if (familyData.consultant_id) {
            supabase.from("profiles").select("id, name, user_email")
              .eq("id", familyData.consultant_id).maybeSingle()
              .then(({ data: cons }) => {
                setConsultants(cons ? [{ ...cons, email: cons.user_email }] : []);
              });
          } else {
            setConsultants([]);
          }

          const hasChild = (kids || []).length > 0;
          if (inviteToken && !hasChild) {
            setOnboardingStep("child");
          } else if (familyData.require_intake && !familyData.intake_complete) {
            setOnboardingStep("intake");
          } else {
            setOnboardingStep(null);
          }
        } else {
          setFamilies([]);
          setConsultants([]);
          setOnboardingStep(null);
        }
      }
    } catch (err) {
      console.error("loadProfile error:", err);
      setAuthLoading(false);
    }
  }

  // ── AUTH ACTIONS ──────────────────────────────────────────
  async function login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

    async function register({
    email,
    password,
    name,
    role = "parent",
    inviteToken,
    consultantInviteToken
  }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } }
    });

    if (error) throw error;

    if (data.user) {
      // Profile is created automatically via the on_auth_user_created trigger
      // (name, role, user_email are passed through signUp options.data)

              if (inviteToken && role === "parent") {
        const { error: familyError } = await supabase
          .from("families")
          .update({
            parent_id: data.user.id,
            invite_email: email,
          })
          .eq("invite_token", inviteToken);

        if (familyError) throw familyError;
      }

      if (consultantInviteToken && role !== "parent") {
        const { error: consultantInviteError } = await supabase
          .from("consultant_invites")
          .update({
            accepted_at: new Date().toISOString(),
            status: "accepted",
          })
          .eq("token", consultantInviteToken);

        if (consultantInviteError) throw consultantInviteError;
      }
    }

    return data;
  }

    async function handleRegistered({
    email,
    password,
    name,
    role = "parent",
    inviteToken,
    consultantInviteToken
  }) {
    const data = await register({
      email,
      password,
      name,
      role,
      inviteToken,
      consultantInviteToken
    });

    if (!data?.session) {
      // In case email confirmations are enabled
      setAuthScreen("login");
      setOnboardingStep(null);
      throw new Error("Account created. Please verify your email, then sign in to continue.");
    }

        if (role === "parent") {
      setOnboardingStep("child");
    } else {
      setOnboardingStep(null);
      clearInviteFromUrl();
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    closeInvitePanels();
    setCurrentUser(null);
    setSession(null);
    setFamilies([]);
    setConsultants([]);
    setChildren([]);
    setTab("home");
    setAdminConsultantView(false);
    try { localStorage.removeItem("rcc_user"); } catch {}
  }

  async function saveChildInfo(child) {
    if (!currentUser?.id) throw new Error("No signed-in parent found.");

    const payload = {
      parent_id: currentUser.id,
      name: child.name,
      dob: child.dob || null,
      weight_lbs: child.weight_lbs ? Number(child.weight_lbs) : null,
      weight_oz: child.weight_oz ? Number(child.weight_oz) : null,
    };

    const { error: childError } = await supabase.from("children").insert(payload);
    if (childError) throw childError;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        child_name: child.name,
        dob: child.dob || null,
        weight_lbs: child.weight_lbs ? Number(child.weight_lbs) : null,
        weight_oz: child.weight_oz ? Number(child.weight_oz) : null,
      })
      .eq("id", currentUser.id);

    if (profileError) throw profileError;

    const { data: kids } = await supabase
      .from("children")
      .select("*")
      .eq("parent_id", currentUser.id)
      .order("created_at", { ascending: true });

    setChildren(kids || []);

    const family = families[0];
    if (family?.require_intake && !family?.intake_complete) {
      setOnboardingStep("intake");
    } else {
      setOnboardingStep(null);
      setTab("home");
      clearInviteFromUrl();
    }
  }

  async function completeIntake(intakeData) {
    const family = families[0];
    if (!family) return;

    const { error: intakeError } = await supabase.from("intake_responses").upsert(
      { family_id: family.id, ...intakeData },
      { onConflict: "family_id" }
    );

    if (intakeError) throw intakeError;

    const { error: familyError } = await supabase
      .from("families")
      .update({ intake_complete: true })
      .eq("id", family.id);

    if (familyError) throw familyError;

    setFamilies((prev) =>
      prev.map((f) => (f.id === family.id ? { ...f, intake_complete: true } : f))
    );

    setOnboardingStep(null);
    setTab("home");
    clearInviteFromUrl();
  }

  async function updateConsultant(id, changes) {
    const newRole = changes.consultant_internal ? "consultant_internal" : "consultant";
    await supabase
      .from("profiles")
      .update({ role: newRole, consultant_internal: changes.consultant_internal })
      .eq("id", id);

    setConsultants((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, role: newRole, consultant_internal: changes.consultant_internal } : c
      )
    );
  }

  function setActiveFamily(f) {
    setActiveFamilyId(f.id);
  }

  function closeInvitePanels() {
    setShowInviteConsultant(false);
    setShowInviteFamily(false);
    setInviteError("");
    setInviteSuccess("");
    setFamilyInviteForm({ email: "", display_name: "", require_intake: true });
    setConsultantInviteForm({ email: "", name: "", consultant_internal: false, payment_required: false });
  }

  async function sendCoCaregiver() {
  if (!coInviteEmail.trim()) { setCoInviteError("Email is required."); return; }
  setCoInviteBusy(true); setCoInviteError(""); setCoInviteSuccess("");
  try {
    const token = crypto.randomUUID();
    const familyId = activeFamily?.id;
    if (!familyId) throw new Error("No active family found.");

    // Insert co-caregiver record
    const { error: insertError } = await supabase.from("co_caregivers").insert({
      family_id: familyId,
      invited_by: currentUser.id,
      email: coInviteEmail.trim().toLowerCase(),
      status: "pending",
    });
    if (insertError) throw insertError;

    // Send invite email using same edge function pattern
    const { error: fnError } = await supabase.functions.invoke("send-invite", {
      body: {
        email: coInviteEmail.trim().toLowerCase(),
        inviteToken: token,
        isCo: true,
        familyId,
      },
    });
    if (fnError) console.warn("Email send failed but record created:", fnError);

    setCoInviteSuccess(`Invitation sent to ${coInviteEmail}!`);
    setCoInviteEmail("");
  } catch (e) {
    setCoInviteError(e.message || "Failed to send invitation.");
  } finally {
    setCoInviteBusy(false);
  }
}

  async function sendFamilyInvite() {
    if (!familyInviteForm.email.trim()) {
      setInviteError("Email is required.");
      return;
    }
    setInviteBusy(true);
    setInviteError("");
    setInviteSuccess("");

    try {
      // Generate a unique token
      const token = crypto.randomUUID();

      // Insert the family row in Supabase
      const { error: insertError } = await supabase.from("families").insert({
        consultant_id: currentUser.id,
        invite_email: familyInviteForm.email.trim().toLowerCase(),
        display_name: familyInviteForm.display_name.trim() || null,
        invite_token: token,
        require_intake: familyInviteForm.require_intake,
      });

      if (insertError) throw insertError;

      // Call the edge function to send the email
      const { error: fnError } = await supabase.functions.invoke("send-invite", {
        body: {
          email: familyInviteForm.email.trim().toLowerCase(),
          inviteToken: token,
          requireIntake: familyInviteForm.require_intake,
        },
      });

      if (fnError) throw fnError;

      // Refresh families list
      const { data: fams } = await supabase
        .from("families")
        .select("*")
        .eq("consultant_id", currentUser.id);
      setFamilies(fams || []);

      setInviteSuccess(`Invitation sent to ${familyInviteForm.email}!`);
      setFamilyInviteForm({ email: "", display_name: "", require_intake: true });
    } catch (e) {
      setInviteError(e.message || "Failed to send invitation. Please try again.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function sendConsultantInvite() {
    if (!consultantInviteForm.email.trim()) {
      setInviteError("Email is required.");
      return;
    }
    setInviteBusy(true);
    setInviteError("");
    setInviteSuccess("");

    try {
      const token = crypto.randomUUID();
      const role = consultantInviteForm.consultant_internal ? "consultant_internal" : "consultant";

      // Insert into consultant_invites
      const { error: insertError } = await supabase.from("consultant_invites").insert({
        email: consultantInviteForm.email.trim().toLowerCase(),
        name: consultantInviteForm.name.trim() || null,
        token,
        role,
        invited_by: currentUser.id,
        status: "pending",
        payment_required: consultantInviteForm.payment_required,
      });

      if (insertError) throw insertError;

      // Call edge function — passes consultant_invite token so URL becomes ?consultant_invite=
      const { error: fnError } = await supabase.functions.invoke("send-invite", {
        body: {
          email: consultantInviteForm.email.trim().toLowerCase(),
          inviteToken: token,
          role,
          consultantId: currentUser.id,
          isConsultantInvite: true,
        },
      });

      if (fnError) throw fnError;

      // Refresh consultants list
      const { data: cons } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["consultant", "consultant_internal"]);
      setConsultants(cons || []);

      setInviteSuccess(`Invitation sent to ${consultantInviteForm.email}!`);
      setConsultantInviteForm({ email: "", name: "", consultant_internal: false, payment_required: false });
    } catch (e) {
      setInviteError(e.message || "Failed to send invitation. Please try again.");
    } finally {
      setInviteBusy(false);
    }
  }

    function clearInviteFromUrl() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      url.searchParams.delete("consultant_invite");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // noop
    }
  }

  // ── DERIVED STATE ─────────────────────────────────────────
  const needsIntake =
    currentUser?.role === ROLES.parent &&
    families[0]?.require_intake &&
    !families[0]?.intake_complete;

  const appContext = {
    themeMode,
    themeToggle: toggleTheme,
    supabase,
    currentUser,
    session,
    families,
    setFamilies,
    consultants,
    children,
    activeFamily,
    setActiveFamily,
    tab,
    setTab,
    logout,
    selectedConsultantFamily,
    setSelectedConsultantFamily,
  };

  // ── GLOBAL STYLES ─────────────────────────────────────────
  const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; }
  button { cursor: pointer; }
  input, select, textarea { color-scheme: auto; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: rgba(128,100,80,0.15); }

  .rcc-shell { display: flex; min-height: 100vh; width: 100%; overflow-x: hidden; }
  .rcc-sidebar {
    display: none;
    width: 220px; min-width: 220px;
    border-right: 1px solid ${T.border};
    padding: 0;
    position: sticky; top: 0; height: 100vh; overflow: hidden;
    flex-direction: column;
    background: ${T.bg2};
  }
  .rcc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; width: 100%; overflow-x: hidden; }
  .rcc-content { width: 100%; max-width: 1200px; margin: 0 auto; padding: 28px 24px 90px; box-sizing: border-box; overflow-x: hidden; }
  .rcc-content-wide { width: 100%; max-width: 100%; margin: 0; padding: 28px 24px 90px; box-sizing: border-box; overflow-x: hidden; }
  .rcc-bottom-nav { display: flex; }

  .rcc-mobile-theme {
    display: flex;
    justify-content: flex-end;
    padding: 14px 16px 0;
  }

  @media (min-width: 768px) {
    .rcc-content { padding: 32px 32px 40px; }
    .rcc-content-wide { padding: 32px 32px 40px; }
    .rcc-mobile-theme { padding: 18px 24px 0; }
  }

  @media (min-width: 1024px) {
    .rcc-sidebar { display: flex; }
    .rcc-bottom-nav { display: none; }
    .rcc-content { padding: 36px 40px 40px; }
    .rcc-content-wide { padding: 36px 40px 40px; }
    .rcc-mobile-theme { display: none; }
  }
  `;

  // ── SIDEBAR NAV ───────────────────────────────────────────
  function SideNav({ tabs, active, setActive, onLogout }) {
    return (
      <div className="rcc-sidebar">
        <div style={{ padding: "0 20px 20px", borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
          <div style={{ fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase", color: T.subText, marginBottom: 4 }}>
            Rooted Connections
          </div>
          <div style={{ fontFamily: serif, fontSize: 17, color: T.headingText }}>Collective</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "11px 20px",
                background: active === t.id ? `${T.teal}14` : "none",
                border: "none",
                borderLeft: active === t.id ? `3px solid ${T.teal}` : "3px solid transparent",
                fontFamily: font,
                fontSize: 13.5,
                color: active === t.id ? T.teal : T.text,
                cursor: "pointer",
                textAlign: "left",
                fontWeight: active === t.id ? 600 : 400
              }}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `${T.teal}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: T.teal,
                flexShrink: 0
              }}
            >
              {(currentUser?.name || currentUser?.email || currentUser?.user_email || "?")[0].toUpperCase()}
            </div>

            <div style={{ overflow: "hidden", minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: T.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {currentUser?.name || "Account"}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: T.muted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {currentUser?.email || currentUser?.user_email}
              </div>
            </div>
          </div>

          <div style={{ marginLeft: 42, marginBottom: 12 }}>
            <ThemeToggle />
          </div>

          <button
            onClick={onLogout}
            style={{
              background: "none",
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "7px 14px",
              fontFamily: font,
              fontSize: 12,
              color: T.muted,
              cursor: "pointer",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }}
          >
            <span style={{ fontSize: 13 }}>→</span> Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER ────────────────────────────────────────────────
  return (
    <AppCtx.Provider value={appContext}>
      <ThemeCtx.Provider value={T}>
        <style>{globalStyles}</style>

        <div
          style={{
            minHeight: "100vh",
            width: "100%",
            background: T.gradientBg,
            color: T.text,
            fontFamily: font,
            transition: "background .4s, color .3s"
          }}
        >
          {authLoading && <LoadingScreen label="Loading…" />}

          {!authLoading && inviteLoading && !currentUser && <LoadingScreen label="Preparing your invitation…" />}

          {!authLoading && !inviteLoading && !currentUser && onboardingStep === "register" && (() => {
            // Consultant invite exists but payment not yet complete — show gate screen
            const needsPayment =
              inviteRecord?.invite_kind === "consultant" &&
              inviteRecord?.payment_required === true &&
              inviteRecord?.payment_completed !== true;

            if (needsPayment) {
              return <PaymentPendingScreen email={inviteRecord?.email} />;
            }

            return (
              <RegisterScreen
                onBack={() => setAuthScreen("login")}
                onRegistered={handleRegistered}
                inviteToken={inviteToken}
                consultantInviteToken={consultantInviteToken}
                inviteRecord={inviteRecord}
              />
            );
          })()}

          {!authLoading && !inviteLoading && !currentUser && !onboardingStep && (
            authScreen === "login" ? (
              <LoginScreen onLogin={login} onGoRegister={() => setAuthScreen("register")} />
            ) : (
                <RegisterScreen
                onBack={() => setAuthScreen("login")}
                onRegistered={handleRegistered}
                inviteToken={null}
                consultantInviteToken={null}
                inviteRecord={null}
              />
            )
          )}

          {!authLoading && currentUser && onboardingStep === "child" && (
            <ChildInfoStep
              loading={childSaving}
              onSave={async (child) => {
                setChildSaving(true);
                try {
                  await saveChildInfo(child);
                } finally {
                  setChildSaving(false);
                }
              }}
            />
          )}

          {!authLoading && currentUser && onboardingStep !== "child" && (onboardingStep === "intake" || needsIntake) && (
            <IntakeForm
              user={currentUser}
              family={families[0]}
              onComplete={completeIntake}
            />
          )}

          {!authLoading && currentUser && onboardingStep === null && !needsIntake && (() => {
            const role = currentUser.role;
            const unread = {};

            if (role === ROLES.parent) {
              return (
                <div className="rcc-shell">
                  <SideNav tabs={PARENT_TABS} active={tab} setActive={setTab} onLogout={logout} />
                  <div className="rcc-main">
                    <div className="rcc-mobile-theme">
                      <ThemeToggle />
                    </div>

                    <div className="rcc-content">
                      {tab === "home" && (
                      <ParentHome
                        user={currentUser}
                        onLogout={logout}
                        onInviteCo={() => setShowInviteCo(true)}
                      />
)}
                      {tab === "sleep" && <SleepTabView />}
                      {tab === "regulation" && <RegulationModule />}
                      {tab === "messages" && <Messaging user={currentUser} activeFamily={activeFamily} />}
                      {tab === "library" && <LibraryModule />}
                    </div>

                    <BottomNav tabs={PARENT_TABS} active={tab} setActive={setTab} unread={unread} />
                  </div>
                </div>
              );
            }

            if (isConsultant(role)) {
              const handleConsultantTabChange = (newTab) => {
                // Clear selected family when explicitly navigating back to families list
                if (newTab === "families") setSelectedConsultantFamily(null);
                setTab(newTab);
              };
              return (
                <div className="rcc-shell">
                  <SideNav tabs={CONSULTANT_TABS} active={tab} setActive={handleConsultantTabChange} onLogout={logout} />
                  <div className="rcc-main">
                    <div className="rcc-mobile-theme">
                      <ThemeToggle />
                    </div>

                    <div className="rcc-content-wide">
                      {showInviteFamily && (
                        <InviteFamilyPanel
                          form={familyInviteForm}
                          setForm={setFamilyInviteForm}
                          onSend={sendFamilyInvite}
                          onClose={closeInvitePanels}
                          busy={inviteBusy}
                          error={inviteError}
                          success={inviteSuccess}
                        />
                      )}
                      { tab === "families" && (
                        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginBottom:20 }}>
                          <button
                            onClick={() => setShowInviteFamily(true)}
                            style={{
                              padding:"10px 14px",
                              borderRadius:10,
                              border:`1px solid ${T.border}`,
                              background:T.card,
                              color:T.text,
                              fontFamily:font,
                              fontSize:13,
                              fontWeight:600,
                              cursor:"pointer"
                             }}
                            >
                              + Invite Family
                            </button>
                          </div>
                        )}

                      {tab === "families" && <ConsultantFamilies />}
                      {tab === "messages" && <Messaging user={currentUser} activeFamily={activeFamily} />}
                      {tab === "sleep" && <SleepTabView />}
                      {tab === "regulation" && <RegulationModule />}
                      {tab === "account" && <ConsultantAccount user={currentUser} onLogout={logout} />}
                    </div>

                    <BottomNav tabs={CONSULTANT_TABS} active={tab} setActive={handleConsultantTabChange} unread={unread} />
                  </div>
                </div>
              );
            }

            if (isAdmin(role)) {
              const adminTabs = adminConsultantView ? CONSULTANT_VIEW_TABS : ADMIN_TABS;

              return (
                <div className="rcc-shell">
                  <SideNav tabs={adminTabs} active={tab} setActive={setTab} onLogout={logout} />
                  <div className="rcc-main">
                    <div className="rcc-mobile-theme">
                      <ThemeToggle />
                    </div>

                    <div className="rcc-content-wide">
                                {showInviteConsultant && (
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: T.card
              }}
            >
              <InviteConsultantPanel
                form={consultantInviteForm}
                setForm={setConsultantInviteForm}
                onSend={sendConsultantInvite}
                onClose={closeInvitePanels}
                busy={inviteBusy}
                error={inviteError}
                success={inviteSuccess}
              />
            </div>
          )}

          {showInviteFamily && (
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: T.card
              }}
            >
              <InviteFamilyPanel
                form={familyInviteForm}
                setForm={setFamilyInviteForm}
                onSend={sendFamilyInvite}
                onClose={closeInvitePanels}
                busy={inviteBusy}
                error={inviteError}
                success={inviteSuccess}
              />
            </div>
          )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 16px",
                          borderRadius: 12,
                          marginBottom: 20,
                          background: adminConsultantView ? `${T.teal}12` : T.faint,
                          border: `1px solid ${adminConsultantView ? T.teal + "40" : T.border}`
                        }}
                      >
                        <div style={{ fontSize: 12.5, color: adminConsultantView ? T.teal : T.muted, fontFamily: font }}>
                          {adminConsultantView ? "👁 Consultant view" : "⚙️ Admin mode"}
                        </div>
                        <button
                        onClick={() => {
                          closeInvitePanels();
                          setAdminConsultantView((v) => !v);
                          setTab(adminConsultantView ? "dashboard" : "families");
                        }}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 8,
                            border: `1px solid ${T.border}`,
                            background: adminConsultantView ? T.teal : "none",
                            color: adminConsultantView ? "#fff" : T.muted,
                            fontFamily: font,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          {adminConsultantView ? "← Back to Admin" : "👁 Consultant View"}
                        </button>
                      </div>

                      {/* ADMIN ACTION BAR */}
{!adminConsultantView && (
  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      marginBottom: 20
    }}
  >
    {tab === "consultants" && (
      <button
      onClick={() => {
  closeInvitePanels();
  setShowInviteConsultant(true);
}}
  
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          border: `1px solid ${T.border}`,
          background: T.card,
          color: T.text,
          fontFamily: font,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        + Invite Consultant
      </button>
    )}

    {tab === "families" && (
      <button
        onClick={() => {
  closeInvitePanels();
  setShowInviteFamily(true);
}}
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          border: `1px solid ${T.border}`,
          background: T.card,
          color: T.text,
          fontFamily: font,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        + Invite Family
      </button>
    )}
  </div>
)}

                      {!adminConsultantView && (
                        <>
                          {tab === "dashboard" && <AdminDashboard consultants={consultants} families={families} />}
                          {tab === "consultants" && <AdminConsultants consultants={consultants} />}
                          {tab === "families" && <ConsultantFamilies />}
                          {tab === "billing" && <AdminBilling />}
                          {tab === "settings" && (
                            <div style={{ padding: "40px 0", textAlign: "center", color: T.muted, fontFamily: font, fontSize: 13 }}>
                              Settings coming soon.
                            </div>
                          )}
                        </>
                      )}

                      {adminConsultantView && (
                        <>
                          {tab === "families" && <ConsultantFamilies />}
                          {tab === "messages" && <Messaging user={currentUser} activeFamily={activeFamily} />}
                          {tab === "sleep" && <SleepTabView />}
                          {tab === "regulation" && <RegulationModule />}
                        </>
                      )}
                    </div>

                    <BottomNav tabs={adminTabs} active={tab} setActive={setTab} unread={{}} />
                  </div>
                </div>
              );
            }

            return null;
          })()}
          {showInviteCo && (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 24, width: "100%", maxWidth: 400 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText }}>Invite Co-Caregiver</div>
        <button onClick={() => { setShowInviteCo(false); setCoInviteEmail(""); setCoInviteError(""); setCoInviteSuccess(""); }}
          style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>×</button>
      </div>
      <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>
        They'll get an email invite and can view the sleep plan and check off items — but won't be able to change plan settings.
      </p>
      <Input label="Their email" value={coInviteEmail} onChange={setCoInviteEmail} type="email" required />
      {coInviteError && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{coInviteError}</div>}
      {coInviteSuccess && <div style={{ fontSize: 12.5, color: "#7BAA8A", marginBottom: 10 }}>✓ {coInviteSuccess}</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <Btn onClick={sendCoCaregiver} disabled={coInviteBusy}>
          {coInviteBusy ? "Sending…" : "Send invite →"}
        </Btn>
        <button onClick={() => setShowInviteCo(false)}
          style={{ padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
        </div>
      </ThemeCtx.Provider>
    </AppCtx.Provider>
  );
}