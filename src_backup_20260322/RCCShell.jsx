// RCCShell — orchestration only.
// Auth state, routing, global context, data loading.
// All UI lives in src/views/, src/auth/, src/layout/
import { useState, useEffect } from "react";
import {
  THEMES, ThemeCtx, AppCtx, useT, useApp,
  useStorage, font, serif
} from "./core/shared.jsx";
import { supabase } from "./lib/supabase.js";

// ── Layout
import { SideNav, BottomNav } from "./layout/Layout.jsx";

// ── Auth
import { LoadingScreen, LoginScreen, PaymentPendingScreen, RegisterScreen, ChildInfoStep } from "./auth/AuthScreens.jsx";

// ── Shared panels
import { InviteFamilyPanel, InviteConsultantPanel, CoCaregiversModal } from "./views/shared/InvitePanels.jsx";

// ── Parent
import { ParentHome, ParentDashboard } from "./views/parent/ParentHome.jsx";
import { AppDrawer, HamburgerButton } from "./views/shared/AppDrawer.jsx";
import { NotificationSettings } from "./views/shared/NotificationSettings.jsx";
import { FindConsultant } from "./views/shared/FindConsultant.jsx";

// ── Consultant
import { ConsultantFamilies, ConsultantAccount } from "./views/consultant/ConsultantViews.jsx";
import { ConsultantHome } from "./views/consultant/ConsultantHome.jsx";

// ── Admin
import { AdminDashboard, AdminConsultants, AdminBilling, AdminFamilies, AdminSettings } from "./views/admin/AdminViews.jsx";

// ── Feature modules (unchanged)
import { LibraryModule } from "./modules/library/LibraryModule.jsx";
import { RegulationModule } from "./modules/regulation/RegulationModule.jsx";
import { Messaging } from "./modules/messaging/Messaging.jsx";
import { SleepLog } from "./modules/sleep/SleepLog.jsx";
import { SleepPlanTracker } from "./modules/sleep/SleepPlanTracker.jsx";
import { IntakeForm } from "./modules/intake/IntakeForm.jsx";

import { useTier } from "./hooks/useTier.js";

// ─── ROLES ────────────────────────────────────────────────────────────────────
const ROLES = {
  parent: "parent",
  consultant: "consultant",
  consultant_internal: "consultant_internal",
  admin: "admin",
};
const isConsultant = role => role === ROLES.consultant || role === ROLES.consultant_internal;
const isAdmin = role => role === ROLES.admin;

// ─── TAB DEFINITIONS ─────────────────────────────────────────────────────────
const PARENT_TABS = [
  { id: "home",       label: "Home",       icon: "🏡" },
  { id: "sleep",      label: "Sleep",      icon: "🌙" },
  { id: "regulation", label: "Regulation", icon: "🌿" },
  { id: "library",    label: "Library",    icon: "📚" },
  { id: "messages",   label: "Messages",   icon: "💬" },
  { id: "dashboard",  label: "Dashboard",  icon: "📊" },
];

const CONSULTANT_TABS = [
  { id: "families", label: "Home", icon: "🏡" },
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

function SleepTabView() {
  const T = useT();
  const { activeFamily, currentUser, pendingSleepTab, setPendingSleepTab, pendingSleepAction, canAccessSleepPlan, subscriptionTier } = useApp();
  const [view, setView] = useState("log");
  // If a quick-log action is pending, always open on Today tab
  const [sleepInitialTab] = useState(() => pendingSleepAction ? "today" : (pendingSleepTab || "today"));

  useEffect(() => {
    if (pendingSleepTab) setPendingSleepTab(null);
  }, []);

  // Guard: if activeFamily is null, logs can't save — surface this clearly
  if (!activeFamily) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: T.muted, fontFamily: font }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🌙</div>
        <p style={{ fontFamily: serif, fontSize: 15, marginBottom: 8, color: T.headingText }}>Loading sleep data…</p>
        <p style={{ fontSize: 13 }}>If this persists, try signing out and back in.</p>
      </div>
    );
  }

  // Tabs: Sleep Log always visible; Sleep Plan only for Plus+
  const sleepTabs = [
    { id: "log", label: "Sleep Log", icon: "🌙" },
    ...(canAccessSleepPlan ? [{ id: "plan", label: "Sleep Plan", icon: "📋" }] : []),
  ];

  return (
    <div>
      {/* Tab bar — only show toggle if there's more than one tab */}
      {sleepTabs.length > 1 && (
        <div style={{ display: "flex", gap: 4, background: T.faint, borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {sleepTabs.map((t) => (
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
      )}

      {/* Upgrade nudge for free users — shown below the log, not blocking it */}
      {!canAccessSleepPlan && (
        <div style={{
          margin: "0 0 20px",
          padding: "12px 16px",
          borderRadius: 12,
          background: `${T.teal}12`,
          border: `1px solid ${T.teal}30`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{ fontSize: 20 }}>📋</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.headingText, marginBottom: 2 }}>
              Want a personalized sleep plan?
            </div>
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>
              Plus members get an AI-generated plan tailored to your child's rhythm — starting at $10/mo.
            </div>
          </div>
        </div>
      )}

      {view === "log" && <SleepLog key={sleepInitialTab} user={currentUser} activeFamily={activeFamily} initialTab={sleepInitialTab} />}
      {view === "plan" && canAccessSleepPlan && <SleepPlanTracker user={currentUser} activeFamily={activeFamily} />}
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────

export default function RCCShell() {
  const [themeMode, setThemeMode] = useStorage("rcc_theme", "dark");
  const T = THEMES[themeMode] || THEMES.dark;
  function toggleTheme() { setThemeMode((m) => (m === "dark" ? "light" : "dark")); }

  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try { const cached = localStorage.getItem("rcc_user"); return cached ? JSON.parse(cached) : null; } catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(() => {
    try { return !localStorage.getItem("rcc_user"); } catch { return true; }
  });
  const [authScreen, setAuthScreen] = useState("login");
  // If we have a cached user, mark profileReady immediately so the shell renders from cache
  // while fresh data loads in the background — eliminates the long loading screen on repeat visits
  const [profileReady, setProfileReady] = useState(() => {
    try { return !!localStorage.getItem("rcc_user"); } catch { return false; }
  });

  const [families, setFamilies] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [children, setChildren] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useStorage("rcc_active_family", null);
  const activeFamily = families.find((f) => f.id === activeFamilyId) || families[0] || null;
  const [activeChildId, setActiveChildId] = useStorage("rcc_active_child", null);
  const activeChild = children.find((c) => c.id === activeChildId) || children[0] || null;

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

  const [familyInviteForm, setFamilyInviteForm] = useState({ email: "", display_name: "", require_intake: true });
  const [consultantInviteForm, setConsultantInviteForm] = useState({ email: "", name: "", consultant_internal: false, payment_required: false });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // ── URL invite tokens ──────────────────────────────────────
  const [inviteToken] = useState(() => { try { return new URLSearchParams(window.location.search).get("invite"); } catch { return null; } });
  const [consultantInviteToken] = useState(() => { try { return new URLSearchParams(window.location.search).get("consultant_invite"); } catch { return null; } });
  // NEW: co-caregiver invite — carries the invited email directly
  const [coInviteToken] = useState(() => { try { return new URLSearchParams(window.location.search).get("co_invite"); } catch { return null; } });
  // Stripe upgrade success — refresh profile to pick up new tier
  const [upgradeSuccess] = useState(() => { try { return new URLSearchParams(window.location.search).get("upgrade_success") === "true"; } catch { return null; } });
  const [upgradeTier] = useState(() => { try { return new URLSearchParams(window.location.search).get("tier"); } catch { return null; } });

  // On Stripe redirect back, refresh the user's profile to pick up the new tier
  useEffect(() => {
    if (!upgradeSuccess || !session?.user) return;
    // Small delay to give the webhook time to update the DB
    const timer = setTimeout(async () => {
      await loadProfile(session.user.id, session.user.email, true);
      // Clean URL
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("upgrade_success");
        url.searchParams.delete("tier");
        window.history.replaceState({}, "", url.toString());
      } catch {}
    }, 2000);
    return () => clearTimeout(timer);
  }, [upgradeSuccess, session]);

  const [inviteRecord, setInviteRecord] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken || !!consultantInviteToken || !!coInviteToken);
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showFindConsultant, setShowFindConsultant] = useState(false);
  const [showUpgradeToast, setShowUpgradeToast] = useState(upgradeSuccess);

  // Auto-dismiss upgrade toast after 5 seconds
  useEffect(() => {
    if (!showUpgradeToast) return;
    const t = setTimeout(() => setShowUpgradeToast(false), 5000);
    return () => clearTimeout(t);
  }, [showUpgradeToast]);
  const [childSaving, setChildSaving] = useState(false);

  // ── BOOT ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const activeSession = data?.session || null;
      setSession(activeSession);
      if (activeSession?.user) {
        const hasCachedUser = !!localStorage.getItem("rcc_user");
        await loadProfile(activeSession.user.id, activeSession.user.email, hasCachedUser);
      } else {
        try { localStorage.removeItem("rcc_user"); } catch {}
        setAuthLoading(false);
      }
    }
    boot();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "INITIAL_SESSION") return;
      setSession(newSession);
      if (newSession?.user) {
        const hasCachedUser = !!localStorage.getItem("rcc_user");
        await loadProfile(newSession.user.id, newSession.user.email, hasCachedUser);
      } else {
        setCurrentUser(null); setFamilies([]); setConsultants([]); setChildren([]);
        setOnboardingStep(inviteToken || consultantInviteToken || coInviteToken ? "register" : null);
        setAuthLoading(false);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [inviteToken, consultantInviteToken, coInviteToken]);

  // ── INVITE LOADER ─────────────────────────────────────────
  useEffect(() => {
    if (!inviteToken && !consultantInviteToken && !coInviteToken) { setInviteLoading(false); return; }
    let ignore = false;
    async function loadInvite() {
      setInviteLoading(true);
      try {
        // Family invite
        if (inviteToken) {
          const { data, error } = await supabase.from("families").select("*").eq("invite_token", inviteToken).maybeSingle();
          if (error) throw error;
          if (!ignore) {
            setInviteRecord(data ? { ...data, invite_kind: "family" } : null);
            if (!session?.user) setOnboardingStep(data ? "register" : null);
          }
          return;
        }
        // Consultant invite
        if (consultantInviteToken) {
          const { data, error } = await supabase.from("consultant_invites").select("*").eq("token", consultantInviteToken).maybeSingle();
          if (error) throw error;
          if (!ignore) {
            setInviteRecord(data ? { ...data, invite_kind: "consultant" } : null);
            if (!session?.user) setOnboardingStep(data ? "register" : null);
          }
          return;
        }
        // Co-caregiver invite — token IS the email (URL-encoded)
        if (coInviteToken) {
          const email = decodeURIComponent(coInviteToken).toLowerCase();
          const { data, error } = await supabase.from("co_caregivers").select("*, families(*)").eq("email", email).eq("status", "pending").maybeSingle();
          if (error) throw error;
          if (!ignore) {
            setInviteRecord(data ? { ...data, invite_kind: "co_caregiver", invite_email: email } : null);
            if (!session?.user) setOnboardingStep(data ? "register" : null);
          }
        }
      } catch (err) {
        console.error("loadInvite error:", err);
        if (!ignore) { setInviteRecord(null); if (!session?.user) setOnboardingStep(null); }
      } finally {
        if (!ignore) setInviteLoading(false);
      }
    }
    loadInvite();
    return () => { ignore = true; };
  }, [inviteToken, consultantInviteToken, coInviteToken, session]);

  // ── LOAD PROFILE ──────────────────────────────────────────
  async function loadProfile(userId, authEmail = null, silent = false) {
    try {
      if (!silent) setAuthLoading(true);
      const [{ data: { user: authUser } }, { data: profile, error: profileError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      ]);
      if (profileError) throw profileError;
      const resolvedEmail = authEmail || authUser?.email || null;
      const merged = {
        ...(profile || {}), id: userId,
        name: profile?.name || authUser?.user_metadata?.name || resolvedEmail?.split("@")[0] || "there",
        role: profile?.role || authUser?.user_metadata?.role || "parent",
        consultant_pin: profile?.consultant_pin || authUser?.user_metadata?.consultant_pin || null,
        email: resolvedEmail,
      };
      setCurrentUser(merged);
      try { localStorage.setItem("rcc_user", JSON.stringify(merged)); } catch {}
      setAuthLoading(false);
      // Mark profile ready immediately so the app shell renders — data loads below in background
      setProfileReady(true);

      if (isAdmin(merged.role)) {
        setTab("dashboard");
        const [{ data: fams }, { data: cons }] = await Promise.all([
          supabase.from("families").select("*"),
          supabase.from("profiles").select("*").in("role", ["consultant", "consultant_internal"]),
        ]);
        setFamilies(fams || []); setConsultants(cons || []); setChildren([]); setOnboardingStep(null);

      } else if (isConsultant(merged.role)) {
        setTab("families");
        const { data: fams } = await supabase.from("families").select("*").eq("consultant_id", userId);
        setFamilies(fams || []); setConsultants([]); setChildren([]); setOnboardingStep(null);

      } else {
        setTab("home");

        // Run family lookup, children, and co-caregiver check in parallel where possible
        const [{ data: byId }, { data: byEmail }] = await Promise.all([
          supabase.from("families").select("*").eq("parent_id", userId).maybeSingle(),
          resolvedEmail
            ? supabase.from("families").select("*").eq("invite_email", resolvedEmail).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        let familyData = byId || byEmail || null;

        // If found by email, link parent_id in background — don't await
        if (!byId && byEmail) {
          supabase.from("families").update({ parent_id: userId }).eq("id", byEmail.id);
        }

        // Step 3: fallback — check co-caregiver only if still no family
        if (!familyData && resolvedEmail) {
          const { data: coRecord } = await supabase.from("co_caregivers").select("family_id").eq("email", resolvedEmail).in("status", ["pending", "active"]).maybeSingle();
          if (coRecord) {
            const { data: coFamily } = await supabase.from("families").select("*").eq("id", coRecord.family_id).maybeSingle();
            if (coFamily) {
              familyData = coFamily;
              merged.role = "co_caregiver";
              supabase.from("co_caregivers").update({ status: "active" }).eq("family_id", coRecord.family_id).eq("email", resolvedEmail);
            }
          }
        }

        if (familyData) {
          setFamilies([familyData]);
          setActiveFamilyId(familyData.id);

          // Load children and consultant in parallel
          const parentIdForKids = (familyData.parent_id && familyData.parent_id !== userId)
            ? familyData.parent_id : userId;

          const [{ data: resolvedKids }] = await Promise.all([
            supabase.from("children").select("*").eq("parent_id", parentIdForKids).order("created_at", { ascending: true }),
            // Consultant loads in background — don't block on it
            familyData.consultant_id
              ? supabase.from("profiles").select("id, name, user_email").eq("id", familyData.consultant_id).maybeSingle()
                  .then(({ data: cons }) => setConsultants(cons ? [{ ...cons, email: cons.user_email }] : []))
              : Promise.resolve(setConsultants([])),
          ]);

          setChildren(resolvedKids || []);
          if (resolvedKids?.length > 0 && !activeChildId) setActiveChildId(resolvedKids[0].id);

          // ── Auto-grant VIP tier if consultant is assigned and parent is on free tier ──
          // This runs silently in the background — doesn't block the UI
          if (familyData.consultant_id && merged.subscription_tier === "free") {
            supabase.from("profiles")
              .update({ subscription_tier: "vip" })
              .eq("id", userId)
              .then(() => {
                // Update local user object so tier reflects immediately
                const updated = { ...merged, subscription_tier: "vip" };
                setCurrentUser(updated);
                try { localStorage.setItem("rcc_user", JSON.stringify(updated)); } catch {}
              });
          }

          const hasChild = (resolvedKids || []).length > 0;
          if (merged.role === "co_caregiver") {
            setOnboardingStep(null);
          } else if (!hasChild) {
            setOnboardingStep("child");
          } else if (familyData.require_intake && !familyData.intake_complete) {
            setOnboardingStep("intake");
          } else {
            setOnboardingStep(null);
          }
        } else {
          setFamilies([]); setConsultants([]); setChildren([]); setOnboardingStep(null);
        }
      }
    } catch (err) { console.error("loadProfile error:", err); setAuthLoading(false); setProfileReady(true); }
  }

  // ── AUTH ACTIONS ──────────────────────────────────────────
  async function login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Call loadProfile directly — don't rely on onAuthStateChange timing
    if (data.user) {
      await loadProfile(data.user.id, data.user.email);
    }
    return data;
  }

  async function register({ email, password, name, role = "parent", inviteToken, consultantInviteToken, isCoCaregiver }) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role } } });
    if (error) throw error;
    if (data.user) {
      if (inviteToken && role === "parent") {
        // Invited parent — link to existing family
        const { error: familyError } = await supabase.from("families").update({ parent_id: data.user.id, invite_email: email }).eq("invite_token", inviteToken);
        if (familyError) throw familyError;
      } else if (role === "parent" && !inviteToken && !isCoCaregiver) {
        // Self-registered parent — create their own family record
        const { error: familyError } = await supabase.from("families").insert({
          parent_id: data.user.id,
          invite_email: email,
          require_intake: false,
          intake_complete: false,
        });
        if (familyError) console.error("Family creation error:", familyError);
      }
      if (consultantInviteToken && role !== "parent") {
        await supabase.from("consultant_invites").update({ accepted_at: new Date().toISOString(), status: "accepted" }).eq("token", consultantInviteToken);
      }
      // Co-caregiver: mark their record as active, linking their new user id
      if (isCoCaregiver) {
        await supabase.from("co_caregivers").update({ status: "active", user_id: data.user.id }).eq("email", email.toLowerCase());
      }
    }
    return data;
  }

  async function handleRegistered({ email, password, name, role = "parent", inviteToken, consultantInviteToken, isCoCaregiver }) {
    const data = await register({ email, password, name, role, inviteToken, consultantInviteToken, isCoCaregiver });
    if (!data?.session) {
      setAuthScreen("login"); setOnboardingStep(null);
      throw new Error("Account created. Please verify your email, then sign in to continue.");
    }
    // Co-caregivers go straight to home — no child step, no intake
    if (isCoCaregiver) {
      setOnboardingStep(null);
      clearInviteFromUrl();
    } else if (role === "parent") {
      setOnboardingStep("child");
    } else {
      setOnboardingStep(null);
      clearInviteFromUrl();
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    closeInvitePanels();
    setCurrentUser(null); setSession(null); setFamilies([]); setConsultants([]); setChildren([]);
    setTab("home"); setAdminConsultantView(false); setProfileReady(false);
    try { localStorage.removeItem("rcc_user"); } catch {}
  }

  async function saveChildInfo(child) {
    if (!currentUser?.id) throw new Error("No signed-in parent found.");
    const payload = { parent_id: currentUser.id, name: child.name, dob: child.dob || null, weight_lbs: child.weight_lbs ? Number(child.weight_lbs) : null, weight_oz: child.weight_oz ? Number(child.weight_oz) : null };
    const { error: childError } = await supabase.from("children").insert(payload);
    if (childError) throw childError;
    const { error: profileError } = await supabase.from("profiles").update({ child_name: child.name, dob: child.dob || null, weight_lbs: child.weight_lbs ? Number(child.weight_lbs) : null, weight_oz: child.weight_oz ? Number(child.weight_oz) : null }).eq("id", currentUser.id);
    if (profileError) throw profileError;
    const { data: kids } = await supabase.from("children").select("*").eq("parent_id", currentUser.id).order("created_at", { ascending: true });
    setChildren(kids || []);
    // Auto-select first child if none selected yet
    if (kids?.length > 0 && !activeChildId) setActiveChildId(kids[0].id);
    const family = families[0];
    if (family?.require_intake && !family?.intake_complete) setOnboardingStep("intake");
    else { setOnboardingStep(null); setTab("home"); clearInviteFromUrl(); }
  }

  async function completeIntake(intakeData) {
    const family = families[0]; if (!family) return;
    const { error: intakeError } = await supabase.from("intake_responses").upsert({ family_id: family.id, ...intakeData }, { onConflict: "family_id" });
    if (intakeError) throw intakeError;
    const { error: familyError } = await supabase.from("families").update({ intake_complete: true }).eq("id", family.id);
    if (familyError) throw familyError;
    setFamilies((prev) => prev.map((f) => (f.id === family.id ? { ...f, intake_complete: true } : f)));
    setOnboardingStep(null); setTab("home"); clearInviteFromUrl();
  }

  async function updateConsultant(id, changes) {
    const newRole = changes.consultant_internal ? "consultant_internal" : "consultant";
    await supabase.from("profiles").update({ role: newRole, consultant_internal: changes.consultant_internal }).eq("id", id);
    setConsultants((prev) => prev.map((c) => c.id === id ? { ...c, role: newRole, consultant_internal: changes.consultant_internal } : c));
  }

  function setActiveFamily(f) { setActiveFamilyId(f.id); }

  function closeInvitePanels() {
    setShowInviteConsultant(false); setShowInviteFamily(false);
    setInviteError(""); setInviteSuccess("");
    setFamilyInviteForm({ email: "", display_name: "", require_intake: true });
    setConsultantInviteForm({ email: "", name: "", consultant_internal: false, payment_required: false });
  }

  async function sendCoCaregiver() {
    if (!coInviteEmail.trim()) { setCoInviteError("Email is required."); return; }
    setCoInviteBusy(true); setCoInviteError(""); setCoInviteSuccess("");
    try {
      const familyId = activeFamily?.id;
      if (!familyId) throw new Error("No active family found.");
      const normalizedEmail = coInviteEmail.trim().toLowerCase();

      // Upsert so re-inviting the same person works cleanly
      const { error: insertError } = await supabase.from("co_caregivers").upsert({
        family_id: familyId,
        invited_by: currentUser.id,
        email: normalizedEmail,
        status: "pending",
      }, { onConflict: "family_id,email" });
      if (insertError) throw insertError;

      // Send invite — edge function will build ?co_invite=EMAIL link
      const { error: fnError } = await supabase.functions.invoke("send-invite", {
        body: { email: normalizedEmail, isCo: true, familyId },
      });
      if (fnError) console.warn("Email send failed but record created:", fnError);

      setCoInviteSuccess(`Invitation sent to ${coInviteEmail}!`);
      setCoInviteEmail("");
    } catch (e) {
      setCoInviteError(e.message || "Failed to send invitation.");
    } finally { setCoInviteBusy(false); }
  }

  async function sendFamilyInvite() {
    if (!familyInviteForm.email.trim()) { setInviteError("Email is required."); return; }
    setInviteBusy(true); setInviteError(""); setInviteSuccess("");
    try {
      const token = crypto.randomUUID();
      const { error: insertError } = await supabase.from("families").insert({ consultant_id: currentUser.id, invite_email: familyInviteForm.email.trim().toLowerCase(), display_name: familyInviteForm.display_name.trim() || null, invite_token: token, require_intake: familyInviteForm.require_intake });
      if (insertError) throw insertError;
      const { error: fnError } = await supabase.functions.invoke("send-invite", { body: { email: familyInviteForm.email.trim().toLowerCase(), inviteToken: token, requireIntake: familyInviteForm.require_intake } });
      if (fnError) throw fnError;
      const { data: fams } = await supabase.from("families").select("*").eq("consultant_id", currentUser.id);
      setFamilies(fams || []);
      setInviteSuccess(`Invitation sent to ${familyInviteForm.email}!`);
      setFamilyInviteForm({ email: "", display_name: "", require_intake: true });
    } catch (e) { setInviteError(e.message || "Failed to send invitation. Please try again."); }
    finally { setInviteBusy(false); }
  }

  async function sendConsultantInvite() {
    if (!consultantInviteForm.email.trim()) { setInviteError("Email is required."); return; }
    setInviteBusy(true); setInviteError(""); setInviteSuccess("");
    try {
      const token = crypto.randomUUID();
      const role = consultantInviteForm.consultant_internal ? "consultant_internal" : "consultant";
      const { error: insertError } = await supabase.from("consultant_invites").insert({ email: consultantInviteForm.email.trim().toLowerCase(), name: consultantInviteForm.name.trim() || null, token, role, invited_by: currentUser.id, status: "pending", payment_required: consultantInviteForm.payment_required });
      if (insertError) throw insertError;
      const { error: fnError } = await supabase.functions.invoke("send-invite", { body: { email: consultantInviteForm.email.trim().toLowerCase(), inviteToken: token, role, consultantId: currentUser.id, isConsultantInvite: true } });
      if (fnError) throw fnError;
      const { data: cons } = await supabase.from("profiles").select("*").in("role", ["consultant", "consultant_internal"]);
      setConsultants(cons || []);
      setInviteSuccess(`Invitation sent to ${consultantInviteForm.email}!`);
      setConsultantInviteForm({ email: "", name: "", consultant_internal: false, payment_required: false });
    } catch (e) { setInviteError(e.message || "Failed to send invitation. Please try again."); }
    finally { setInviteBusy(false); }
  }

  function clearInviteFromUrl() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      url.searchParams.delete("consultant_invite");
      url.searchParams.delete("co_invite");
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }

  // ── DERIVED STATE ─────────────────────────────────────────
  const needsIntake = currentUser?.role === ROLES.parent && families[0]?.require_intake && !families[0]?.intake_complete;

  // ── TIER DETECTION ─────────────────────────────────────────
  const tierAccess = useTier({ currentUser, families });
  const {
    tier: subscriptionTier,
    isPremium,
    isPlus,
    isVIP,
    isFree,
    hasConsultantAssigned,
    isConsultantRole,
    canSendAIMessage,
    aiMessagesRemaining,
    aiMessageLimit,
    canAccessSleepPlan,
    canAccessHumanMessaging,
    canAccessFilesTab,
    canAccessFullLibrary,
    canAccessDashboardInsights,
    canAccessRegulationInsights,
    canAccessTroubleshootingPDFs,
    canAccessConsultantReviewedPlan,
  } = tierAccess;

  const [pendingSleepTab, setPendingSleepTab] = useState(null);
  const [pendingSleepAction, setPendingSleepAction] = useState(null); // "put_down" | "woke_up" | "night_waking"

  const appContext = {
    themeMode, themeToggle: toggleTheme, supabase, currentUser, session,
    families, setFamilies, consultants, children, activeFamily, setActiveFamily,
    activeChild, setActiveChildId,
    tab, setTab, logout, selectedConsultantFamily, setSelectedConsultantFamily,
    // ── Tier access — use these throughout the app ──────────────────────────
    tierAccess,
    subscriptionTier,
    isPremium,
    isPlus,
    isVIP,
    isFree,
    hasConsultantAssigned,
    isConsultantRole,
    canSendAIMessage,
    aiMessagesRemaining,
    aiMessageLimit,
    canAccessSleepPlan,
    canAccessHumanMessaging,
    canAccessFilesTab,
    canAccessFullLibrary,
    canAccessDashboardInsights,
    canAccessRegulationInsights,
    canAccessTroubleshootingPDFs,
    canAccessConsultantReviewedPlan,
    pendingSleepTab, setPendingSleepTab,
    pendingSleepAction, setPendingSleepAction,
  };

  // ── GLOBAL STYLES ─────────────────────────────────────────
  const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; }
  button { cursor: pointer; }
  input, select, textarea { color-scheme: auto; }
  @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  ::-webkit-scrollbar-thumb { background: rgba(128,100,80,0.15); }
  .rcc-shell { display: flex; min-height: 100vh; width: 100%; overflow-x: hidden; }
  .rcc-hamburger { display: flex; }
  .rcc-sidebar { display: none; width: 220px; min-width: 220px; border-right: 1px solid ${T.border}; padding: 0; position: sticky; top: 0; height: 100vh; overflow: hidden; flex-direction: column; background: ${T.bg2}; }
  .rcc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; width: 100%; overflow-x: hidden; }
  .rcc-content { width: 100%; max-width: 1200px; margin: 0 auto; padding: 28px 24px 90px; box-sizing: border-box; overflow-x: hidden; }
  .rcc-content-wide { width: 100%; max-width: 100%; margin: 0; padding: 28px 24px 90px; box-sizing: border-box; overflow-x: hidden; }
  .rcc-bottom-nav { display: flex; }
  .rcc-mobile-theme { display: flex; justify-content: flex-end; padding: 14px 16px 0; }
  @media (min-width: 768px) { .rcc-content { padding: 32px 32px 40px; } .rcc-content-wide { padding: 32px 32px 40px; } .rcc-mobile-theme { padding: 18px 24px 0; } }
  @media (min-width: 1024px) { .rcc-sidebar { display: flex; } .rcc-bottom-nav { display: none; } .rcc-content { padding: 36px 40px 40px; } .rcc-content-wide { padding: 36px 40px 40px; } .rcc-mobile-theme { display: none; } .rcc-hamburger { display: none; } }
  `;

  // ── SIDEBAR NAV ───────────────────────────────────────────
  // ── RENDER ────────────────────────────────────────────────
  return (
    <AppCtx.Provider value={appContext}>
      <ThemeCtx.Provider value={T}>
        <style>{globalStyles}</style>
        <div style={{ minHeight: "100vh", width: "100%", background: T.gradientBg, color: T.text, fontFamily: font, transition: "background .4s, color .3s" }}>

          {authLoading && <LoadingScreen label="Loading…" />}
          {/* Hold the loading screen until profile + families are fully resolved — prevents intake bypass on refresh */}
          {!authLoading && currentUser && !profileReady && <LoadingScreen label="Loading your profile…" />}
          {!authLoading && inviteLoading && !currentUser && <LoadingScreen label="Preparing your invitation…" />}

          {/* Auth */}
          {!authLoading && !inviteLoading && !currentUser && onboardingStep === "register" && (() => {
            const needsPayment = inviteRecord?.invite_kind === "consultant" && inviteRecord?.payment_required === true && inviteRecord?.payment_completed !== true;
            if (needsPayment) return <PaymentPendingScreen email={inviteRecord?.email} />;
            return (
              <RegisterScreen
                onBack={() => setAuthScreen("login")}
                onRegistered={handleRegistered}
                inviteToken={inviteToken}
                consultantInviteToken={consultantInviteToken}
                coInviteEmail={inviteRecord?.invite_kind === "co_caregiver" ? inviteRecord?.invite_email : null}
                inviteRecord={inviteRecord}
              />
            );
          })()}

          {!authLoading && !inviteLoading && !currentUser && !onboardingStep && (
            authScreen === "login"
              ? <LoginScreen onLogin={login} onGoRegister={() => setAuthScreen("register")} />
              : <RegisterScreen onBack={() => setAuthScreen("login")} onRegistered={handleRegistered} inviteToken={null} consultantInviteToken={null} coInviteEmail={null} inviteRecord={null} />
          )}

          {/* Onboarding — only render once profileReady so families[] is populated */}
          {!authLoading && profileReady && currentUser && onboardingStep === "child" && (
            <ChildInfoStep loading={childSaving} onSave={async (child) => { setChildSaving(true); try { await saveChildInfo(child); } finally { setChildSaving(false); } }} />
          )}
          {!authLoading && profileReady && currentUser && onboardingStep !== "child" && (onboardingStep === "intake" || needsIntake) && (
            <IntakeForm user={currentUser} family={families[0]} onComplete={completeIntake} />
          )}

          {/* Main app */}
          {!authLoading && profileReady && currentUser && onboardingStep === null && !needsIntake && (() => {
            const role = currentUser.role;
            const unread = {};

            if (role === ROLES.parent || role === "co_caregiver") {
              // Messages tab always visible — free/plus users see AI coach only,
              // Premium/VIP users see human messaging thread too
              const visibleParentTabs = PARENT_TABS.filter(t => t.id !== "messages" ? true : true);
              return (
                <div className="rcc-shell">
                  <SideNav tabs={visibleParentTabs} active={tab} setActive={setTab} onLogout={logout} onOpenNotifications={() => setShowNotificationSettings(true)} onOpenAccount={() => setDrawerOpen(true)} onOpenFindConsultant={() => setShowFindConsultant(true)} currentUser={currentUser} T={T} />
                  <div className="rcc-main">
                    <div className="rcc-content">
                      {tab === "home"       && <ParentHome user={currentUser} onLogout={logout} onInviteCo={() => setShowInviteCo(true)} onAddChild={() => setOnboardingStep("child")} onOpenDrawer={() => setDrawerOpen(true)} onFindConsultant={() => setShowFindConsultant(true)} />}
                      {tab === "sleep"      && <SleepTabView />}
                      {tab === "regulation" && <RegulationModule />}
                      {tab === "messages"   && <Messaging user={currentUser} activeFamily={activeFamily} />}
                      {tab === "dashboard"  && <ParentDashboard user={currentUser} onFindConsultant={() => setShowFindConsultant(true)} onInviteCo={() => setShowInviteCo(true)} />}
                      {tab === "library"    && <LibraryModule />}
                    </div>
                    <BottomNav tabs={visibleParentTabs} active={tab} setActive={setTab} unread={unread} />
                  </div>
                </div>
              );
            }

            if (isConsultant(role)) {
              const handleConsultantTabChange = (newTab) => { if (newTab === "families") setSelectedConsultantFamily(null); setTab(newTab); };
              return (
                <div className="rcc-shell">
                  <SideNav tabs={CONSULTANT_TABS} active={tab} setActive={handleConsultantTabChange} onLogout={logout} onOpenNotifications={() => setShowNotificationSettings(true)} onOpenAccount={() => setDrawerOpen(true)} onOpenFindConsultant={() => setShowFindConsultant(true)} currentUser={currentUser} T={T} />
                  <div className="rcc-main">
                    <AppDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={logout} onOpenNotifications={() => { setDrawerOpen(false); setShowNotificationSettings(true); }} onOpenFindConsultant={() => { setDrawerOpen(false); setShowFindConsultant(true); }} />
                    <div className="rcc-content-wide">
                      <div className="rcc-hamburger" style={{ marginBottom: 8 }}><HamburgerButton onOpen={() => setDrawerOpen(true)} T={T} /></div>
                      {showInviteFamily && <InviteFamilyPanel form={familyInviteForm} setForm={setFamilyInviteForm} onSend={sendFamilyInvite} onClose={closeInvitePanels} busy={inviteBusy} error={inviteError} success={inviteSuccess} />}
                      {tab === "families" && (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 20 }}>
                          <button onClick={() => setShowInviteFamily(true)} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Invite Family</button>
                        </div>
                      )}
                      {tab === "families" && <ConsultantHome user={currentUser} />}
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
                  <SideNav tabs={adminTabs} active={tab} setActive={setTab} onLogout={logout} onOpenNotifications={() => setShowNotificationSettings(true)} onOpenAccount={() => setDrawerOpen(true)} onOpenFindConsultant={() => setShowFindConsultant(true)} currentUser={currentUser} T={T} />
                  <div className="rcc-main">
                    <AppDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={logout} onOpenNotifications={() => { setDrawerOpen(false); setShowNotificationSettings(true); }} onOpenFindConsultant={() => { setDrawerOpen(false); setShowFindConsultant(true); }} />
                    <div className="rcc-content-wide">
                      <div className="rcc-hamburger" style={{ marginBottom: 8 }}><HamburgerButton onOpen={() => setDrawerOpen(true)} T={T} /></div>
                      {showInviteConsultant && <InviteConsultantPanel form={consultantInviteForm} setForm={setConsultantInviteForm} onSend={sendConsultantInvite} onClose={closeInvitePanels} busy={inviteBusy} error={inviteError} success={inviteSuccess} />}
                      {showInviteFamily && <InviteFamilyPanel form={familyInviteForm} setForm={setFamilyInviteForm} onSend={sendFamilyInvite} onClose={closeInvitePanels} busy={inviteBusy} error={inviteError} success={inviteSuccess} />}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: 12, marginBottom: 20, background: adminConsultantView ? `${T.teal}12` : T.faint, border: `1px solid ${adminConsultantView ? T.teal + "40" : T.border}` }}>
                        <div style={{ fontSize: 12.5, color: adminConsultantView ? T.teal : T.muted, fontFamily: font }}>{adminConsultantView ? "👁 Consultant view" : "⚙️ Admin mode"}</div>
                        <button onClick={() => { closeInvitePanels(); setAdminConsultantView((v) => !v); setTab(adminConsultantView ? "dashboard" : "families"); }}
                          style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: adminConsultantView ? T.teal : "none", color: adminConsultantView ? "#fff" : T.muted, fontFamily: font, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          {adminConsultantView ? "← Back to Admin" : "👁 Consultant View"}
                        </button>
                      </div>
                      {!adminConsultantView && (
                        <>
                          {tab === "dashboard" && <AdminDashboard consultants={consultants} families={families} />}
                          {tab === "consultants" && <AdminConsultants consultants={consultants} onInviteConsultant={() => { closeInvitePanels(); setShowInviteConsultant(true); }} />}
                          {tab === "families" && <AdminFamilies families={families} consultants={consultants} onInviteFamily={() => { closeInvitePanels(); setShowInviteFamily(true); }} />}
                          {tab === "billing" && <AdminBilling />}
                          {tab === "settings" && <AdminSettings />}
                        </>
                      )}
                      {adminConsultantView && (
                        <>
                          {tab === "families" && <ConsultantHome user={currentUser} />}
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

          {/* Upgrade success toast */}
          {showUpgradeToast && (
            <div style={{
              position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
              zIndex: 400, background: T.teal, color: "#fff",
              padding: "12px 20px", borderRadius: 14,
              fontFamily: font, fontSize: 13.5, fontWeight: 600,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", gap: 10,
              animation: "slideDown .3s ease",
              whiteSpace: "nowrap",
            }}>
              <span>🌿</span>
              <span>Welcome to {upgradeTier ? upgradeTier.charAt(0).toUpperCase() + upgradeTier.slice(1) : "your new plan"}! Your access is now active.</span>
              <button onClick={() => setShowUpgradeToast(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 16, cursor: "pointer", padding: 0, marginLeft: 4 }}>×</button>
            </div>
          )}

          {/* App Drawer */}
          <AppDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onLogout={logout}
            onOpenNotifications={() => { setDrawerOpen(false); setShowNotificationSettings(true); }} onOpenFindConsultant={() => { setDrawerOpen(false); setShowFindConsultant(true); }}
          />

          {/* Find a Consultant modal */}
          {showFindConsultant && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, overflowY: "auto" }}>
              <div style={{ background: T.bg2, minHeight: "100vh", padding: "20px 20px 60px", maxWidth: 600, margin: "0 auto" }}>
                <FindConsultant onBack={() => setShowFindConsultant(false)} />
              </div>
            </div>
          )}

          {/* Notification settings modal */}
          {showNotificationSettings && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", padding: 0 }}>
              <div style={{ background: T.bg2, borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "20px 20px 40px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText }}>Notifications</div>
                  <button onClick={() => setShowNotificationSettings(false)} style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <NotificationSettings />
              </div>
            </div>
          )}

          {/* Co-caregiver invite modal */}
          {showInviteCo && (
            <CoCaregiversModal
              onClose={() => { setShowInviteCo(false); setCoInviteEmail(""); setCoInviteError(""); setCoInviteSuccess(""); }}
              email={coInviteEmail}
              setEmail={setCoInviteEmail}
              onSend={sendCoCaregiver}
              busy={coInviteBusy}
              error={coInviteError}
              success={coInviteSuccess}
              T={T}
            />
          )}
        </div>
      </ThemeCtx.Provider>
    </AppCtx.Provider>
  );
}
