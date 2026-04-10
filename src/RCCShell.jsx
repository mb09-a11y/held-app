// RCCShell — orchestration only. Auth state, routing, global context, data loading.
// V2: Held UI frontend connected to Supabase backend.
// All auth logic, invite flows, Stripe, and data loading are UNCHANGED.
// Only the parent-facing UI imports are updated to use held-style components.

import { useState, useEffect } from "react";
import {
  THEMES, ThemeCtx, AppCtx, useT, useApp,
  useStorage, font, serif
} from "./core/shared.jsx";
import { supabase } from "./lib/supabase.js";
import { warmAI } from "./lib/ai.js";

// ── Layout (held nav + SOS FAB)
import { SideNav, BottomNav, SOSFab } from "./layout/Layout.jsx";

// ── Auth (UNCHANGED)
import { LoadingScreen, LoginScreen, PaymentPendingScreen, RegisterScreen, ChildInfoStep } from "./auth/AuthScreens.jsx";

// ── Shared panels (UNCHANGED)
import { InviteFamilyPanel, InviteConsultantPanel, CoCaregiversModal } from "./views/shared/InvitePanels.jsx";

// ── Parent — held UI
import { HeldHome }         from "./views/parent/HeldHome.jsx";
import { MorningMoment }    from "./views/parent/MorningMoment.jsx";
import { EveningClose }     from "./views/parent/EveningClose.jsx";
import { HeldInsights }     from "./views/parent/HeldInsights.jsx";
import { AppDrawer }        from "./views/shared/AppDrawer.jsx";
import { NotificationSettings } from "./views/shared/NotificationSettings.jsx";
import { FindConsultant }   from "./views/shared/FindConsultant.jsx";

// ── Feature modules — held UI
import { SOSFlow }           from "./modules/sos/SOSFlow.jsx";
import { NSCheckinFlow }     from "./modules/nscheckin/NSCheckinFlow.jsx";
import { HeldSleepShell }   from "./modules/sleep/HeldSleepShell.jsx";
import { LibraryModule }    from "./modules/library/LibraryModule.jsx";
import { MilestonesModule } from "./modules/milestones/MilestonesModule.jsx";
import { Messaging }        from "./modules/messaging/Messaging.jsx";
import { IntakeForm }       from "./modules/intake/IntakeForm.jsx";

// ── Consultant (UNCHANGED)
import { ConsultantFamilies, ConsultantAccount } from "./views/consultant/ConsultantViews.jsx";
import { ConsultantHome } from "./views/consultant/ConsultantHome.jsx";

// ── Admin (UNCHANGED)
import { AdminDashboard, AdminConsultants, AdminBilling, AdminFamilies, AdminSettings } from "./views/admin/AdminViews.jsx";

// ── Regulation module (consultant view — UNCHANGED)
import { RegulationModule } from "./modules/regulation/RegulationModule.jsx";

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
  { id: "milestones", label: "Milestones", icon: "🌱" },
  { id: "messages",   label: "Messages",   icon: "💬" },
  { id: "insights",   label: "Insights",   icon: "✦"  },
];

const CONSULTANT_TABS = [
  { id: "families", label: "Home",       icon: "🏡" },
  { id: "messages", label: "Messages",   icon: "💬" },
  { id: "sleep",    label: "Sleep",      icon: "🌙" },
  { id: "regulation",label: "Regulation",icon: "🌿" },
  { id: "account",  label: "Account",    icon: "⚙️" },
];

const ADMIN_TABS = [
  { id: "dashboard",   label: "Dashboard",  icon: "📊" },
  { id: "consultants", label: "Consultants",icon: "👥" },
  { id: "families",    label: "Families",   icon: "👨‍👩‍👧" },
  { id: "billing",     label: "Billing",    icon: "💳" },
  { id: "settings",    label: "Settings",   icon: "⚙️" },
];

// ─── SLEEP TAB VIEW (wraps HeldSleepShell) ───────────────────────────────────
function SleepTabView({ onOpenDrawer }) {
  const { activeFamily, canAccessSleepPlan } = useApp();
  return <HeldSleepShell canAccessSleepPlan={canAccessSleepPlan} onOpenDrawer={onOpenDrawer} />;
}

// ─── MAIN SHELL ───────────────────────────────────────────────────────────────
export default function RCCShell() {
  const [themeMode, setThemeMode] = useStorage("rcc_theme", "light");
  const T = THEMES[themeMode] || THEMES.dark;
  function toggleTheme() { setThemeMode(m => m === "dark" ? "light" : "dark"); }

  // Sync body background to theme so the area outside max-width matches
  useEffect(() => {
    document.body.style.background = T.bg;
    document.documentElement.style.background = T.bg;
  }, [T.bg]);

  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try { const c = localStorage.getItem("rcc_user"); return c ? JSON.parse(c) : null; } catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(() => {
    try { return !localStorage.getItem("rcc_user"); } catch { return true; }
  });
  const [authScreen, setAuthScreen] = useState("login");
  const [profileReady, setProfileReady] = useState(() => {
    try { return !!localStorage.getItem("rcc_user"); } catch { return false; }
  });

  const [families, setFamilies] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [children, setChildren] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useStorage("rcc_active_family", null);
  const activeFamily = families.find(f => f.id === activeFamilyId) || families[0] || null;
  const [activeChildId, setActiveChildId] = useStorage("rcc_active_child", null);
  const activeChild = children.find(c => c.id === activeChildId) || children[0] || null;

  const [tab, setTab] = useState("home");

  // ── Overlays
  const [showSOS, setShowSOS] = useState(false);
  const [showNSCheckin, setShowNSCheckin] = useState(false);
  const [checkinRefreshKey, setCheckinRefreshKey] = useState(0);
  const [showMorningMoment, setShowMorningMoment] = useState(false);
  const [showEveningClose, setShowEveningClose] = useState(false);

  // ── Drawers / panels
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

  const [adminConsultantView, setAdminConsultantView] = useState(false);
  const [selectedConsultantFamily, setSelectedConsultantFamily] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showFindConsultant, setShowFindConsultant] = useState(false);
  const [childSaving, setChildSaving] = useState(false);
  const [libraryDefaultTab, setLibraryDefaultTab] = useState(null);
  const [libraryKey, setLibraryKey] = useState(0);

  // Navigate to Library grounding tab
  function goToGrounding() {
    setLibraryDefaultTab("grounding");
    setLibraryKey(k => k + 1);
    setTab("library");
  }

  function goToScripts() {
    setLibraryDefaultTab("scripts");
    setLibraryKey(k => k + 1);
    setTab("library");
  }

  // ── URL invite tokens (UNCHANGED logic)
  const [inviteToken] = useState(() => { try { return new URLSearchParams(window.location.search).get("invite"); } catch { return null; } });
  const [consultantInviteToken] = useState(() => { try { return new URLSearchParams(window.location.search).get("consultant_invite"); } catch { return null; } });
  const [coInviteToken] = useState(() => { try { return new URLSearchParams(window.location.search).get("co_invite"); } catch { return null; } });
  const [upgradeSuccess] = useState(() => { try { return new URLSearchParams(window.location.search).get("upgrade_success") === "true"; } catch { return null; } });
  const [upgradeTier] = useState(() => { try { return new URLSearchParams(window.location.search).get("tier"); } catch { return null; } });

  const [inviteRecord, setInviteRecord] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken || !!consultantInviteToken || !!coInviteToken);
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [showUpgradeToast, setShowUpgradeToast] = useState(upgradeSuccess);

  useEffect(() => {
    if (!showUpgradeToast) return;
    const t = setTimeout(() => setShowUpgradeToast(false), 5000);
    return () => clearTimeout(t);
  }, [showUpgradeToast]);

  // ── Tier hook
  const {
    subscriptionTier, isPremium, isVIP, hasConsultantAssigned,
    canAccessSleepPlan,
    canSendAIMessage, aiMessagesRemaining, aiMessageLimit,
    canAccessHumanMessaging, canAccessFilesTab,
    canAccessFullLibrary, canAccessTroubleshootingPDFs,
    canAccessDashboardInsights, canAccessRegulationInsights,
    canAccessConsultantReviewedPlan, canAccessCustomHumanPlan,
    canAccessZoomPhone, canAccessNSPulse, canAccessRegulationTrends,
    asyncSupportCopy, zoomPhoneCopy,
  } = useTier({ currentUser, families, consultants });

  // ── BOOT (UNCHANGED from original)
  useEffect(() => {
    let mounted = true;
    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const activeSession = data?.session || null;
      setSession(activeSession);
      if (activeSession?.user) {
        const hasCachedUser = !!localStorage.getItem("rcc_user");
        try {
          await loadProfile(activeSession.user.id, activeSession.user.email, hasCachedUser);
        } catch (err) {
          console.error("[RCCShell] boot loadProfile error:", err);
          setAuthLoading(false);
        }
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
        if (currentUser) return;
        await loadProfile(newSession.user.id, newSession.user.email);
      } else {
        setCurrentUser(null); setFamilies([]); setConsultants([]); setChildren([]);
        setOnboardingStep(inviteToken || consultantInviteToken || coInviteToken ? "register" : null);
        setAuthLoading(false);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [inviteToken, consultantInviteToken, coInviteToken]);

  // ── INVITE LOADER (UNCHANGED)
  useEffect(() => {
    if (!inviteToken && !consultantInviteToken && !coInviteToken) { setInviteLoading(false); return; }
    async function loadInvite() {
      try {
        if (inviteToken) {
          const { data } = await supabase.from("invites").select("*").eq("token", inviteToken).maybeSingle();
          setInviteRecord(data || null);
        } else if (consultantInviteToken) {
          const { data } = await supabase.from("invites").select("*").eq("token", consultantInviteToken).eq("invite_kind", "consultant").maybeSingle();
          setInviteRecord(data || null);
        }
      } catch {}
      setInviteLoading(false);
      if (!session?.user) setOnboardingStep("register");
    }
    loadInvite();
  }, [inviteToken, consultantInviteToken, coInviteToken]);

  // ── Stripe upgrade refresh (UNCHANGED)
  useEffect(() => {
    if (!upgradeSuccess || !session?.user) return;
    const timer = setTimeout(async () => {
      await loadProfile(session.user.id, session.user.email, true);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("upgrade_success");
        url.searchParams.delete("tier");
        window.history.replaceState({}, "", url.toString());
      } catch {}
    }, 2000);
    return () => clearTimeout(timer);
  }, [upgradeSuccess, session]);

  // ── LOAD PROFILE (UNCHANGED logic)
  async function loadProfile(userId, email, fromCache = false) {
    if (!fromCache) setAuthLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      const resolvedEmail = email || profile?.email;
      const merged = profile
        ? { ...profile, id: userId, email: resolvedEmail }
        : { id: userId, email: resolvedEmail, role: "parent", name: resolvedEmail };

      setCurrentUser(merged);
      try { localStorage.setItem("rcc_user", JSON.stringify(merged)); } catch {}
      setProfileReady(true);

      if (isAdmin(merged.role)) {
        setTab("dashboard");
        const [{ data: fams }, { data: cons }] = await Promise.all([
          supabase.from("families").select("*"),
          supabase.from("profiles").select("*").in("role", ["consultant", "consultant_internal", "admin"]),
        ]);
        setFamilies(fams || []); setConsultants(cons || []); setChildren([]); setOnboardingStep(null);

      } else if (isConsultant(merged.role)) {
        setTab("families");
        const { data: fams } = await supabase.from("families").select("*").eq("consultant_id", userId);
        setFamilies(fams || []); setConsultants([]); setChildren([]); setOnboardingStep(null);

      } else {
        setTab("home");
        const [{ data: byId }, { data: byEmail }] = await Promise.all([
          supabase.from("families").select("*").eq("parent_id", userId).maybeSingle(),
          resolvedEmail
            ? supabase.from("families").select("*").eq("invite_email", resolvedEmail).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        let family = byId || byEmail;
        if (!family && coInviteToken) {
          const { data: cof } = await supabase.from("families").select("*").contains("co_caregiver_ids", [userId]).maybeSingle();
          family = cof;
        }

        if (family) {
          setFamilies([family]);
          setActiveFamilyId(family.id);

          const [{ data: kids }, { data: cons }, { data: intake }] = await Promise.all([
            supabase.from("children").select("*").eq("parent_id", userId),
            family.consultant_id
              ? supabase.from("profiles").select("*").eq("id", family.consultant_id).maybeSingle()
              : Promise.resolve({ data: null }),
            supabase.from("intake_responses").select("*").eq("family_id", family.id).maybeSingle(),
          ]);

          const kidList = kids || [];
          setChildren(kidList);
          if (kidList.length) setActiveChildId(kidList[0].id);
          setConsultants(cons ? [cons] : []);
          // Only trigger child onboarding if they genuinely have no children.
          // Guards against race conditions re-showing ChildInfoStep to existing users.
          const alreadyHasChildren = kidList.length > 0;
          setOnboardingStep(
            merged.role === "co_caregiver" ? null :
            alreadyHasChildren ? (intake ? null : "intake") :
            "child"
          );
        } else {
          setFamilies([]); setChildren([]); setConsultants([]);
          setOnboardingStep(inviteToken ? "register" : "child");
        }
      }
    } catch (err) {
      console.error("[RCCShell] loadProfile error:", err);
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    supabase.auth.signOut();
    setCurrentUser(null); setFamilies([]); setConsultants([]); setChildren([]);
    setTab("home"); setAdminConsultantView(false); setProfileReady(false);
    try { localStorage.removeItem("rcc_user"); } catch {}
  }

  async function handleLogin({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function handleRegister({ email, password, name, role, inviteToken: tok, consultantInviteToken: ctok, isCoCaregiver }) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role } } });
    if (error) throw error;
    const userId = data.user?.id;
    if (!userId) throw new Error("No user ID returned.");

    await supabase.from("profiles").upsert({ id: userId, email, name, role: isCoCaregiver ? "co_caregiver" : role || "parent" }, { onConflict: "id" });

    if (tok) {
      await supabase.from("invites").update({ accepted_at: new Date().toISOString(), accepted_by: userId }).eq("token", tok);
    }
    if (ctok) {
      await supabase.from("invites").update({ accepted_at: new Date().toISOString(), accepted_by: userId }).eq("token", ctok);
    }
    if (isCoCaregiver && coInviteToken) {
      await supabase.rpc("add_co_caregiver", { p_token: coInviteToken, p_user_id: userId });
    }
    clearInviteFromUrl();
    await loadProfile(userId, email);
  }

  async function saveChildInfo(child) {
    if (!currentUser?.id) throw new Error("No signed-in parent found.");
    const { error: childError } = await supabase.from("children").insert({
      parent_id: currentUser.id,
      name: child.name,
      dob: child.dob || null,
      weight_lbs: child.weight_lbs ? Number(child.weight_lbs) : null,
      weight_oz: child.weight_oz ? Number(child.weight_oz) : null,
    });
    if (childError) throw childError;

    let family = families[0];
    if (!family) {
      const { data: newFam, error: famError } = await supabase.from("families").insert({
        parent_id: currentUser.id,
        invite_email: currentUser.email,
      }).select().single();
      if (famError) throw famError;
      family = newFam;
      setFamilies([family]);
      setActiveFamilyId(family.id);
    }

    const { data: kids } = await supabase.from("children").select("*").eq("family_id", family.id);
    const allKids = kids || [];
    if (!allKids.length) {
      const { data: freshKids } = await supabase.from("children").select("*").eq("parent_id", currentUser.id);
      setChildren(freshKids || []);
      if (freshKids?.length) setActiveChildId(freshKids[0].id);
    } else {
      setChildren(allKids);
      if (allKids.length) setActiveChildId(allKids[0].id);
    }

    const { data: intake } = await supabase.from("intake_responses").select("*").eq("family_id", family.id).maybeSingle();
    setOnboardingStep(intake ? null : "intake");
  }

  async function completeIntake(intakeData) {
    const family = families[0]; if (!family) return;
    await supabase.from("intake_responses").upsert({ family_id: family.id, ...intakeData }, { onConflict: "family_id" });
    setOnboardingStep(null);
  }

  function clearInviteFromUrl() {
    try {
      const url = new URL(window.location.href);
      ["invite", "consultant_invite", "co_invite"].forEach(k => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }

  function closeInvitePanels() {
    setShowInviteConsultant(false);
    setShowInviteFamily(false);
    setInviteError(""); setInviteSuccess("");
  }

  async function sendFamilyInvite() {
    setInviteBusy(true); setInviteError(""); setInviteSuccess("");
    try {
      // Generate token and insert invite record first
      const token = crypto.randomUUID();
      const { error: insertError } = await supabase.from("invites").insert({
        token,
        invite_email: familyInviteForm.email,
        invite_kind: "family",
        invited_by: currentUser?.id,
        require_intake: familyInviteForm.require_intake,
      });
      if (insertError) throw insertError;

      const { error } = await supabase.functions.invoke("send-invite", {
        body: {
          email: familyInviteForm.email,
          inviteToken: token,
          requireIntake: familyInviteForm.require_intake,
          consultantId: currentUser?.id,
        },
      });
      if (error) throw error;
      setInviteSuccess(`Invitation sent to ${familyInviteForm.email}!`);
      setFamilyInviteForm({ email: "", display_name: "", require_intake: true });
    } catch (e) {
      setInviteError(e.message || "Failed to send invite. Please try again.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function sendConsultantInvite() {
    setInviteBusy(true); setInviteError(""); setInviteSuccess("");
    try {
      const token = crypto.randomUUID();
      const role = consultantInviteForm.consultant_internal ? "consultant_internal" : "consultant";
      const { error: insertError } = await supabase.from("invites").insert({
        token,
        invite_email: consultantInviteForm.email,
        invite_kind: "consultant",
        role,
        invited_by: currentUser?.id,
      });
      if (insertError) throw insertError;

      const { error } = await supabase.functions.invoke("send-invite", {
        body: {
          email: consultantInviteForm.email,
          inviteToken: token,
          role,
          isConsultantInvite: true,
          paymentRequired: consultantInviteForm.payment_required,
          invited_by: currentUser?.id,
        },
      });
      if (error) throw error;
      setInviteSuccess(`Invitation sent to ${consultantInviteForm.email}!`);
      setConsultantInviteForm({ email: "", name: "", consultant_internal: false, payment_required: false });
    } catch (e) {
      setInviteError(e.message || "Failed to send invite.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function sendCoInvite() {
    if (!coInviteEmail) { setCoInviteError("Please enter an email address."); return; }
    setCoInviteBusy(true); setCoInviteError(""); setCoInviteSuccess("");
    try {
      const { error } = await supabase.functions.invoke("send-invite", {
        body: {
          email: coInviteEmail,
          family_id: activeFamily?.id,
          invited_by: currentUser?.id,
          invited_by_name: currentUser?.name,
          isCo: true,
        },
      });
      if (error) throw error;
      setCoInviteSuccess(`Invite sent to ${coInviteEmail}!`);
      setCoInviteEmail("");
    } catch (e) {
      setCoInviteError(e.message || "Failed to send invite.");
    } finally {
      setCoInviteBusy(false);
    }
  }

  // ─── APP CONTEXT ─────────────────────────────────────────────────────────
  const appCtx = {
    currentUser, families, activeFamily, consultants, children,
    activeChild, activeChildId, setActiveChildId,
    activeFamilyId, setActiveFamilyId,
    tab, setTab,
    // All tier flags — complete set so every module can gate correctly
    subscriptionTier, isPremium, isVIP, hasConsultantAssigned,
    canAccessSleepPlan,
    canSendAIMessage, aiMessagesRemaining, aiMessageLimit,
    canAccessHumanMessaging, canAccessFilesTab,
    canAccessFullLibrary, canAccessTroubleshootingPDFs,
    canAccessDashboardInsights, canAccessRegulationInsights,
    canAccessConsultantReviewedPlan, canAccessCustomHumanPlan,
    canAccessZoomPhone, canAccessNSPulse, canAccessRegulationTrends,
    asyncSupportCopy, zoomPhoneCopy,
    logout,
    pendingSleepTab: null, setPendingSleepTab: () => {},
    pendingSleepAction: null,
    // Theme
    themeMode,
    themeToggle: toggleTheme,
  };

  // ─── RENDER LOGIC ─────────────────────────────────────────────────────────
  const role = currentUser?.role;
  const isParent = role === "parent" || role === "co_caregiver";
  const isMobile = window.innerWidth < 768;

  // Loading states
  if (inviteLoading) return <ThemeCtx.Provider value={T}><LoadingScreen label="Loading your invitation…" /></ThemeCtx.Provider>;
  if (authLoading && !profileReady) return <ThemeCtx.Provider value={T}><LoadingScreen label="Loading…" /></ThemeCtx.Provider>;

  // Auth screens
  if (!session || !currentUser) {
    const coEmail = coInviteToken ? new URLSearchParams(window.location.search).get("email") : null;
    return (
      <ThemeCtx.Provider value={T}>
        {authScreen === "login" ? (
          <LoginScreen onLogin={handleLogin} onGoRegister={() => setAuthScreen("register")} />
        ) : (
          <RegisterScreen
            onBack={() => setAuthScreen("login")}
            onRegistered={handleRegister}
            inviteToken={inviteToken}
            consultantInviteToken={consultantInviteToken}
            coInviteEmail={coEmail}
            inviteRecord={inviteRecord}
          />
        )}
      </ThemeCtx.Provider>
    );
  }

  // Onboarding
  if (onboardingStep === "child") {
    return (
      <ThemeCtx.Provider value={T}>
        <AppCtx.Provider value={appCtx}>
          <ChildInfoStep onSave={saveChildInfo} loading={childSaving} />
        </AppCtx.Provider>
      </ThemeCtx.Provider>
    );
  }

  if (onboardingStep === "intake") {
    return (
      <ThemeCtx.Provider value={T}>
        <AppCtx.Provider value={appCtx}>
          <IntakeForm onComplete={completeIntake} family={activeFamily} />
        </AppCtx.Provider>
      </ThemeCtx.Provider>
    );
  }

  if (onboardingStep === "payment_pending") {
    return <ThemeCtx.Provider value={T}><PaymentPendingScreen email={currentUser?.email} /></ThemeCtx.Provider>;
  }

  // ─── MAIN APP ─────────────────────────────────────────────────────────────
  const tabs = isParent ? PARENT_TABS : isAdmin(role) ? ADMIN_TABS : CONSULTANT_TABS;
  const unread = {}; // TODO: wire real unread counts

  return (
    <ThemeCtx.Provider value={T}>
      <AppCtx.Provider value={appCtx}>
        <div style={{
          maxWidth: 430,
          margin: "0 auto",
          position: "relative",
          minHeight: "100vh",
          background: T.bg,
        }}>

          {/* ── UPGRADE TOAST ── */}
          {showUpgradeToast && (
            <div style={{
              position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
              zIndex: 500, background: T.teal, color: "#fff",
              padding: "10px 20px", borderRadius: 24, fontFamily: font, fontSize: 13, fontWeight: 600,
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            }}>
              ✓ Welcome to {upgradeTier || "Premium"}!
            </div>
          )}

          {/* ── INVITE PANELS (consultant / admin) ── */}
          {showInviteFamily && (
            <div style={{ position: "fixed", inset: 0, zIndex: 200, background: T.overlayBg, padding: 20, overflowY: "auto" }}>
              <InviteFamilyPanel
                form={familyInviteForm} setForm={setFamilyInviteForm}
                onSend={sendFamilyInvite} onClose={closeInvitePanels}
                busy={inviteBusy} error={inviteError} success={inviteSuccess}
              />
            </div>
          )}
          {showInviteConsultant && (
            <div style={{ position: "fixed", inset: 0, zIndex: 200, background: T.overlayBg, padding: 20, overflowY: "auto" }}>
              <InviteConsultantPanel
                form={consultantInviteForm} setForm={setConsultantInviteForm}
                onSend={sendConsultantInvite} onClose={closeInvitePanels}
                busy={inviteBusy} error={inviteError} success={inviteSuccess}
              />
            </div>
          )}

          {/* ── CO-CAREGIVER MODAL ── */}
          {showInviteCo && (
            <CoCaregiversModal
              onClose={() => { setShowInviteCo(false); setCoInviteError(""); setCoInviteSuccess(""); }}
              email={coInviteEmail} setEmail={setCoInviteEmail}
              onSend={sendCoInvite}
              busy={coInviteBusy} error={coInviteError} success={coInviteSuccess}
              T={T}
            />
          )}

          {/* ── SOS OVERLAY ── */}
          {showSOS && <SOSFlow onClose={() => setShowSOS(false)} setTab={setTab} />}

          {/* ── NS CHECK-IN OVERLAY ── */}
          {showNSCheckin && <NSCheckinFlow onClose={() => { setShowNSCheckin(false); setCheckinRefreshKey(k => k + 1); }} />}

          {/* ── MORNING MOMENT OVERLAY ── */}
          {showMorningMoment && <MorningMoment onClose={() => { setShowMorningMoment(false); setCheckinRefreshKey(k => k + 1); }} />}

          {/* ── EVENING CLOSE OVERLAY ── */}
          {showEveningClose && <EveningClose onClose={() => { setShowEveningClose(false); setCheckinRefreshKey(k => k + 1); }} />}

          {/* ── FIND CONSULTANT OVERLAY ── */}
          {showFindConsultant && (
            <FindConsultant onClose={() => setShowFindConsultant(false)} />
          )}

          {/* ── APP DRAWER (parent) ── */}
          {isParent && (
            <AppDrawer
              isOpen={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              onLogout={logout}
              onInviteCo={() => { setDrawerOpen(false); setShowInviteCo(true); }}
              onOpenNotifications={() => { setDrawerOpen(false); setShowNotificationSettings(true); }}
              onOpenFindConsultant={() => { setDrawerOpen(false); setShowFindConsultant(true); }}
              onAddChild={() => setOnboardingStep("child")}
              onLibrary={() => { setDrawerOpen(false); setLibraryDefaultTab(null); setLibraryKey(k => k + 1); setTab("library"); }}
            />
          )}

          {/* ── NOTIFICATION SETTINGS ── */}
          {showNotificationSettings && (
            <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
          )}

          {/* ── MAIN CONTENT ── */}
          <div style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            minHeight: "100vh",
            overflowY: "auto",
          }}>
            {/* PARENT VIEW */}
            {isParent && (
              <>
                {tab === "home" && (
                  <HeldHome
                    onSOS={() => setShowSOS(true)}
                    onNSCheckin={() => setShowNSCheckin(true)}
                    onMorningMoment={() => setShowMorningMoment(true)}
                    onEveningClose={() => setShowEveningClose(true)}
                    setTab={setTab}
                    onOpenDrawer={() => setDrawerOpen(true)}
                    onInviteCo={() => setShowInviteCo(true)}
                    onFindConsultant={() => setShowFindConsultant(true)}
                    onGrounding={goToGrounding}
                    onNotifications={() => setShowNotificationSettings(true)}
                    checkinRefreshKey={checkinRefreshKey}
                  />
                )}
                {tab === "sleep"      && <SleepTabView onOpenDrawer={() => setDrawerOpen(true)} />}
                {tab === "milestones" && <MilestonesModule onOpenDrawer={() => setDrawerOpen(true)} />}
                {tab === "messages"   && <Messaging user={currentUser} activeFamily={activeFamily} onFindConsultant={() => setShowFindConsultant(true)} />}
                {tab === "insights"   && <HeldInsights setTab={setTab} onOpenDrawer={() => setDrawerOpen(true)} onScripts={goToScripts} />}
                {tab === "library"    && <LibraryModule defaultTab={libraryDefaultTab} key={libraryKey} onOpenDrawer={() => setDrawerOpen(true)} />}

                {/* SOS FAB — visible on all parent tabs */}
                <SOSFab onPress={() => setShowSOS(true)} />

                {/* Bottom nav */}
                <BottomNav
                  tabs={PARENT_TABS}
                  active={tab === "library" ? "insights" : tab}
                  setActive={setTab}
                  unread={unread}
                />
              </>
            )}

            {/* CONSULTANT VIEW */}
            {isConsultant(role) && !isAdmin(role) && (
              <div style={{ display: "flex", height: "100vh" }}>
                {!isMobile && (
                  <SideNav
                    tabs={CONSULTANT_TABS.map(t => ({ ...t, icon: t.icon }))}
                    active={tab}
                    setActive={setTab}
                    currentUser={currentUser}
                    onLogout={logout}
                    unread={unread}
                  />
                )}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                  {tab === "families"   && <ConsultantHome user={currentUser} />}
                  {tab === "messages"   && <Messaging user={currentUser} activeFamily={activeFamily} onFindConsultant={() => setShowFindConsultant(true)} />}
                  {tab === "sleep"      && <SleepTabView onOpenDrawer={() => setDrawerOpen(true)} />}
                  {tab === "regulation" && <RegulationModule />}
                  {tab === "account"    && <ConsultantAccount user={currentUser} onLogout={logout} />}
                </div>
                {isMobile && <BottomNav tabs={CONSULTANT_TABS} active={tab} setActive={setTab} />}
              </div>
            )}

            {/* ADMIN VIEW */}
            {isAdmin(role) && (
              <div style={{ display: "flex", height: "100vh" }}>
                {!isMobile && (
                  <SideNav
                    tabs={ADMIN_TABS.map(t => ({ ...t, icon: t.icon }))}
                    active={tab}
                    setActive={setTab}
                    currentUser={currentUser}
                    onLogout={logout}
                    unread={unread}
                  />
                )}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                  {tab === "dashboard"   && <AdminDashboard consultants={consultants} families={families} />}
                  {tab === "consultants" && <AdminConsultants consultants={consultants} onInviteConsultant={() => { closeInvitePanels(); setShowInviteConsultant(true); }} />}
                  {tab === "families"    && <AdminFamilies families={families} consultants={consultants} onInviteFamily={() => { closeInvitePanels(); setShowInviteFamily(true); }} />}
                  {tab === "billing"     && <AdminBilling />}
                  {tab === "settings"    && <AdminSettings />}
                </div>
                {isMobile && <BottomNav tabs={ADMIN_TABS} active={tab} setActive={setTab} />}
              </div>
            )}
          </div>
        </div>
      </AppCtx.Provider>
    </ThemeCtx.Provider>
  );
}
