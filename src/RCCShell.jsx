// RCCShell — orchestration only. Auth state, routing, global context, data loading.
// V2: Held UI frontend connected to Supabase backend.
// All auth logic, invite flows, Stripe, and data loading are UNCHANGED.
// Only the parent-facing UI imports are updated to use held-style components.

import { useState, useEffect, useRef } from "react";
import {
  THEMES, ThemeCtx, AppCtx, useT, useApp,
  useStorage, font, serif
} from "./core/shared.jsx";
import { supabase, clearStaleAuthTokens } from "./lib/supabase.js";
import { warmAI } from "./lib/ai.js";

// ── Layout (held nav + SOS FAB)
import { SideNav, BottomNav, SOSFab } from "./layout/Layout.jsx";

// ── Auth (UNCHANGED)
import { LoadingScreen, LoginScreen, PaymentPendingScreen, RegisterScreen, ChildInfoStep, ResetPasswordScreen } from "./auth/AuthScreens.jsx";

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

// ── Consultant — new co-pilot shell (full rewrite)
// ConsultantShell owns its own nav, routing, and data via consultantStore.js
import ConsultantShell from "./views/consultant/ConsultantShell.jsx";

// ── Admin (UNCHANGED)
import { AdminDashboard, AdminConsultants, AdminBilling, AdminFamilies, AdminSettings } from "./views/admin/AdminViews.jsx";

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

// ─── SAFE CACHE FIELDS ───────────────────────────────────────────────────────
// Only cache fields needed to render the shell before the real profile loads.
// NEVER cache: consultant_pin, stripe_customer_id, payment_failed, or any
// financial/payment data. These stay server-side only.
const SAFE_CACHE_FIELDS = [
  "id", "name", "email", "role", "subscription_tier",
  "ai_messages_used", "ai_messages_reset_at",
  "child_name", "dob",
];

function buildSafeCache(userObj) {
  return SAFE_CACHE_FIELDS.reduce((acc, key) => {
    if (userObj[key] !== undefined) acc[key] = userObj[key];
    return acc;
  }, {});
}

// ─── TAB DEFINITIONS ─────────────────────────────────────────────────────────
const PARENT_TABS = [
  { id: "home",       label: "Home",       icon: "🏡" },
  { id: "sleep",      label: "Sleep",      icon: "🌙" },
  { id: "milestones", label: "Milestones", icon: "🌱" },
  { id: "messages",   label: "Messages",   icon: "💬" },
  { id: "insights",   label: "Insights",   icon: "✦"  },
];

// Note: consultant nav is now fully owned by ConsultantShell — no CONSULTANT_TABS needed here

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
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try { const c = localStorage.getItem("rcc_user"); return c ? JSON.parse(c) : null; } catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(() => {
    try { return !localStorage.getItem("rcc_user"); } catch { return true; }
  });
  const [authScreen, setAuthScreen] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return (p.get("invite") || p.get("co_invite")) ? "register" : "login";
    } catch { return "login"; }
  });
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
    // Use setTimeout to ensure defaultTab is set before tab switch renders LibraryModule
    setTimeout(() => setTab("library"), 0);
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

  // ── BOOT
  const bootInFlightRef = useRef(false);
  useEffect(() => {
    let mounted = true;
    async function boot() {
      if (bootInFlightRef.current) return;
      bootInFlightRef.current = true;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        // If Supabase returns an auth error on boot (stale/invalid token)
        if (error) {
          clearStaleAuthTokens();
          setSession(null);
          setCurrentUser(null);
          setSessionExpired(true);
          setAuthLoading(false);
          return;
        }

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
          // Had a cached user but session is gone — token expired
          const hadCachedUser = !!localStorage.getItem("rcc_user");
          clearStaleAuthTokens();
          if (hadCachedUser) setSessionExpired(true);
          setAuthLoading(false);
        }
      } finally {
        bootInFlightRef.current = false;
      }
    }
    boot();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "INITIAL_SESSION") return;

      // ── Password reset flow ──
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setSession(newSession);
        setAuthLoading(false);
        return;
      }

      // ── Token refresh failed — stale session, need clean re-login ──
      if (event === "TOKEN_REFRESHED" && !newSession) {
        clearStaleAuthTokens();
        setSession(null);
        setCurrentUser(null); setFamilies([]); setConsultants([]); setChildren([]);
        setSessionExpired(true);
        setAuthLoading(false);
        return;
      }

      // ── Signed out (manual or forced by Supabase) ──
      if (event === "SIGNED_OUT") {
        clearStaleAuthTokens();
        setSession(null);
        setCurrentUser(null); setFamilies([]); setConsultants([]); setChildren([]);
        setSessionExpired(false);
        setOnboardingStep(inviteToken || consultantInviteToken || coInviteToken ? "register" : null);
        setAuthLoading(false);
        return;
      }

      setSession(newSession);
      if (newSession?.user) {
        // Always load profile on SIGNED_IN so authLoading clears and the app renders.
        // On other events (TOKEN_REFRESHED etc.) skip if we already have the user loaded.
        if (event === "SIGNED_IN" || !currentUser) {
          setSessionExpired(false);
          await loadProfile(newSession.user.id, newSession.user.email);
        } else {
          setAuthLoading(false);
        }
      } else {
        setCurrentUser(null); setFamilies([]); setConsultants([]); setChildren([]);
        setOnboardingStep(inviteToken || consultantInviteToken || coInviteToken ? "register" : null);
        setAuthLoading(false);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [inviteToken, consultantInviteToken, coInviteToken]);

  // ── INVITE LOADER
  useEffect(() => {
    if (!inviteToken && !consultantInviteToken && !coInviteToken) { setInviteLoading(false); return; }
    let ignore = false;
    async function loadInvite() {
      setInviteLoading(true);
      try {
        if (inviteToken) {
          const { data, error } = await supabase.from("family_invites").select("*").eq("token", inviteToken).maybeSingle();
          if (error) throw error;
          if (!ignore) {
            setInviteRecord(data ? { ...data, invite_kind: "family" } : null);
            if (!session?.user) setOnboardingStep(data ? "register" : null);
          }
          return;
        }
        if (consultantInviteToken) {
          const { data, error } = await supabase.from("invites").select("*").eq("token", consultantInviteToken).eq("invite_kind", "consultant").maybeSingle();
          if (error) throw error;
          if (!ignore) {
            setInviteRecord(data ? { ...data, invite_kind: "consultant" } : null);
            if (!session?.user) setOnboardingStep(data ? "register" : null);
          }
          return;
        }
        if (coInviteToken) {
          const email = decodeURIComponent(coInviteToken).toLowerCase();
          const { data, error } = await supabase
            .from("co_caregivers")
            .select("*, families(*)")
            .eq("email", email)
            .eq("status", "pending")
            .maybeSingle();
          if (error) throw error;
          if (!ignore) {
            setInviteRecord(data ? { ...data, invite_kind: "co_caregiver", invite_email: email } : null);
            if (!session?.user) setOnboardingStep(data ? "register" : null);
          }
          return;
        }
      } catch (err) {
        console.error("[RCCShell] loadInvite error:", err);
        if (!ignore) {
          setInviteRecord(null);
          if (!session?.user) setOnboardingStep(null);
        }
      } finally {
        if (!ignore) setInviteLoading(false);
      }
    }
    loadInvite();
    return () => { ignore = true; };
  }, [inviteToken, consultantInviteToken, coInviteToken, session]);

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

  // ── DATA REFRESH ON APP RESUME ────────────────────────────────────────────
  // When user returns to the app, check session is valid then tell all hooks
  // to re-fetch. We do NOT call refreshSession() manually — that fights with
  // Supabase's own autoRefreshToken and causes lock contention.
  // Guard: never fire during active auth flows (boot, recovery, login).
  useEffect(() => {
    let timer = null;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Don't interfere during auth flows
      if (authLoading || isRecovery || !session) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        // Re-check guards after debounce delay
        if (authLoading || isRecovery || !session) return;
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data?.session) {
            clearStaleAuthTokens();
            setSession(null);
            setCurrentUser(null);
            setFamilies([]); setConsultants([]); setChildren([]);
            setSessionExpired(true);
            setAuthLoading(false);
          } else {
            setCheckinRefreshKey(k => k + 1);
          }
        } catch {
          // Network offline — don't clear session
        }
      }, 500);
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(timer);
    };
  }, [authLoading, isRecovery, session]);

  // ── LOAD PROFILE (UNCHANGED logic)
  async function loadProfile(userId, authEmail = null, fromCache = false) {
    if (!fromCache) setAuthLoading(true);
    try {
      const [{ data: { user: authUser } }, { data: profile, error: profileError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("id, name, user_email, role, subscription_tier, ai_messages_used, ai_messages_reset_at, child_name, dob, weight_lbs, weight_oz, consultant_pin").eq("id", userId).maybeSingle(),
      ]);
      if (profileError) throw profileError;

      const resolvedEmail = (authEmail || authUser?.email || profile?.user_email || null)?.toLowerCase?.() || authEmail || authUser?.email || profile?.user_email || null;
      const merged = {
        ...(profile || {}),
        id: userId,
        name: profile?.name || authUser?.user_metadata?.name || (resolvedEmail ? resolvedEmail.split("@")[0] : "there"),
        role: profile?.role || authUser?.user_metadata?.role || "parent",
        consultant_pin: profile?.consultant_pin || authUser?.user_metadata?.consultant_pin || null,
        email: resolvedEmail,
      };

      setCurrentUser(merged);
      // ── SECURITY: Only cache safe, non-sensitive fields ───────────────────
      try { localStorage.setItem("rcc_user", JSON.stringify(buildSafeCache(merged))); } catch {}
      setProfileReady(true);

      if (isAdmin(merged.role)) {
        setTab("dashboard");
        const [{ data: fams }, { data: cons }] = await Promise.all([
          supabase.from("families").select("*"),
          supabase.from("profiles").select("*").in("role", ["consultant", "consultant_internal", "admin"]),
        ]);
        setFamilies(fams || []);
        setConsultants(cons || []);
        setChildren([]);
        setOnboardingStep(null);
        return;
      }

      if (isConsultant(merged.role)) {
        setTab("families");
        const { data: fams } = await supabase.from("families").select("*").eq("consultant_id", userId);
        setFamilies(fams || []);
        setConsultants([]);
        setChildren([]);
        setOnboardingStep(null);
        return;
      }

      setTab("home");

      const [{ data: byId }, { data: byEmail }] = await Promise.all([
        supabase.from("families").select("*").eq("parent_id", userId).maybeSingle(),
        resolvedEmail
          ? supabase.from("families").select("*").eq("invite_email", resolvedEmail).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      let familyData = byId || byEmail || null;

      if (!byId && byEmail) {
        supabase.from("families").update({ parent_id: userId }).eq("id", byEmail.id);
      }

      if (!familyData && resolvedEmail) {
        const { data: coRecord } = await supabase
          .from("co_caregivers")
          .select("family_id")
          .eq("email", resolvedEmail)
          .in("status", ["pending", "active"])
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
            setCurrentUser(prev => ({ ...(prev || merged), role: "co_caregiver" }));
            try {
              const cached = JSON.parse(localStorage.getItem("rcc_user") || "{}");
              // ── SECURITY: Only cache safe, non-sensitive fields ─────────────
              localStorage.setItem("rcc_user", JSON.stringify(buildSafeCache({ ...cached, ...merged, role: "co_caregiver" })));
            } catch {}
            supabase
              .from("co_caregivers")
              .update({ status: "active" })
              .eq("family_id", coRecord.family_id)
              .eq("email", resolvedEmail);
          }
        }
      }

      if (familyData) {
        setFamilies([familyData]);
        setActiveFamilyId(familyData.id);

        const parentIdForKids = (familyData.parent_id && familyData.parent_id !== userId)
          ? familyData.parent_id
          : userId;

        const [{ data: resolvedKids }, { data: cons }, { data: intake }] = await Promise.all([
          supabase.from("children").select("*").eq("parent_id", parentIdForKids).order("created_at", { ascending: true }),
          familyData.consultant_id
            ? supabase.from("profiles").select("*").eq("id", familyData.consultant_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from("intake_responses").select("*").eq("family_id", familyData.id).maybeSingle(),
        ]);

        const kidList = resolvedKids || [];
        setChildren(kidList);
        if (kidList.length && !activeChildId) setActiveChildId(kidList[0].id);
        setConsultants(cons ? [cons] : []);

        const alreadyHasChildren = kidList.length > 0;
        if (merged.role === "co_caregiver") {
          setOnboardingStep(null);
        } else if (!alreadyHasChildren) {
          setOnboardingStep("child");
        } else if (!intake && familyData.require_intake) {
          setOnboardingStep("intake");
        } else {
          setOnboardingStep(null);
        }
      } else {
        setFamilies([]);
        setChildren([]);
        setConsultants([]);
        setOnboardingStep(coInviteToken ? null : (inviteToken ? "register" : "child"));
      }
    } catch (err) {
      console.error("[RCCShell] loadProfile error:", err);
      setProfileReady(true);
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

  async function handleRegister({ email, password, name, role = "parent", inviteToken: tok, consultantInviteToken: ctok, isCoCaregiver }) {
    const normalizedEmail = email.trim().toLowerCase();
    // ── SECURITY: Don't pass role in signUp options — role is determined
    // server-side by the DB trigger based on a validated invite token.
    // Passing role here would allow client-side role escalation.
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name,
          // Pass consultant invite token so DB trigger can validate and assign role
          consultantInviteToken: ctok || null,
          // Do NOT pass role — the DB trigger defaults to 'parent' and only
          // elevates to consultant if a valid consultantInviteToken is found
        }
      }
    });
    if (error) throw error;
    if (data.user) {
      if (tok && role === "parent") {
        const { error: familyError } = await supabase
          .from("families")
          .update({ parent_id: data.user.id })
          .eq("invite_token", tok);
        if (familyError) throw familyError;
        // Mark the invite as accepted
        await supabase.from("family_invites")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("token", tok);
      } else if (role === "parent" && !tok && !isCoCaregiver) {
        const { error: familyError } = await supabase.from("families").insert({
          parent_id: data.user.id,
          invite_email: normalizedEmail,
          require_intake: false,
          intake_complete: false,
        });
        if (familyError) console.error("Family creation error:", familyError);
      }
      if (ctok && role !== "parent") {
        await supabase.from("consultant_invites").update({ accepted_at: new Date().toISOString(), status: "accepted" }).eq("token", ctok);
      }
      if (isCoCaregiver) {
        await supabase.from("co_caregivers").update({ status: "active", user_id: data.user.id }).eq("email", normalizedEmail);
      }
      clearInviteFromUrl();
      await loadProfile(data.user.id, normalizedEmail);
    }
  }

  async function saveChildInfo(child) {
    if (!currentUser?.id) throw new Error("No signed-in parent found.");
    setChildSaving(true);
    try {
      const payload = {
        parent_id: currentUser.id,
        name: child.name,
        dob: child.dob || null,
        weight_lbs: child.weight_lbs ? Number(child.weight_lbs) : null,
        weight_oz: child.weight_oz ? Number(child.weight_oz) : null,
      };
      const { error: childError } = await supabase.from("children").insert(payload);
      if (childError) throw childError;
      const { error: profileError } = await supabase.from("profiles").update({
        child_name: child.name,
        dob: child.dob || null,
        weight_lbs: child.weight_lbs ? Number(child.weight_lbs) : null,
        weight_oz: child.weight_oz ? Number(child.weight_oz) : null,
      }).eq("id", currentUser.id);
      if (profileError) throw profileError;
      const { data: kids } = await supabase.from("children").select("*").eq("parent_id", currentUser.id).order("created_at", { ascending: true });
      setChildren(kids || []);
      if (kids?.length > 0 && !activeChildId) setActiveChildId(kids[0].id);
      const family = families[0];
      if (family?.require_intake && !family?.intake_complete) setOnboardingStep("intake");
      else {
        setOnboardingStep(null);
        setTab("home");
        clearInviteFromUrl();
      }
    } finally {
      setChildSaving(false);
    }
  }

  async function completeIntake(intakeData) {
    const family = activeFamily || families[0];
    try {
      if (family?.id) {
        await supabase.from("families").update({ intake_complete: true }).eq("id", family.id);
        await supabase.from("intake_responses").upsert({ family_id: family.id, ...intakeData }, { onConflict: "family_id" });
      }
    } catch (e) {
      console.error("[completeIntake]", e);
    } finally {
      setOnboardingStep(null);
    }
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
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Generate ID client-side so we don't need to read it back (avoids RLS SELECT issue)
      const familyId = crypto.randomUUID();
      const { error: familyError } = await supabase.from("families").insert({
        id: familyId,
        invite_email: familyInviteForm.email.trim().toLowerCase(),
        invite_token: token,
        display_name: familyInviteForm.display_name || null,
        consultant_id: currentUser?.id,
        require_intake: familyInviteForm.require_intake,
        intake_complete: false,
      });
      if (familyError) throw familyError;

      // Also record in family_invites for tracking
      await supabase.from("family_invites").insert({
        family_id: familyId,
        token,
        email: familyInviteForm.email.trim().toLowerCase(),
        parent_name: familyInviteForm.display_name || null,
        consultant_id: currentUser?.id,
        require_intake: familyInviteForm.require_intake,
        status: "pending",
        expires_at: expiresAt,
      });

      // Get session token explicitly to ensure it's attached to the edge function call
      supabase.functions.invoke("send-invite", {
        body: {
          email: familyInviteForm.email.trim().toLowerCase(),
          inviteToken: token,
          requireIntake: familyInviteForm.require_intake,
          consultantId: currentUser?.id,
        },
      }).catch(err => console.warn("[send-invite] email error:", err));

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
    if (!coInviteEmail.trim()) { setCoInviteError("Please enter an email address."); return; }
    setCoInviteBusy(true); setCoInviteError(""); setCoInviteSuccess("");
    try {
      const familyId = activeFamily?.id;
      if (!familyId) throw new Error("No active family found.");
      const normalizedEmail = coInviteEmail.trim().toLowerCase();

      const { error: insertError } = await supabase.from("co_caregivers").upsert({
        family_id: familyId,
        invited_by: currentUser?.id,
        email: normalizedEmail,
        status: "pending",
      }, { onConflict: "family_id,email" });
      if (insertError) throw insertError;

      const { error } = await supabase.functions.invoke("send-invite", {
        body: {
          email: normalizedEmail,
          familyId,
          family_id: familyId,
          invited_by: currentUser?.id,
          invited_by_name: currentUser?.name,
          isCo: true,
        },
      });
      if (error) console.warn("[RCCShell] co-caregiver email send failed but DB record was created:", error);
      setCoInviteSuccess(`Invite sent to ${normalizedEmail}!`);
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

  // ── Password reset flow ──
  if (isRecovery) {
    return (
      <ThemeCtx.Provider value={T}>
        <ResetPasswordScreen onDone={() => {
          setIsRecovery(false);
          // onAuthStateChange will fire SIGNED_IN after password update
        }} />
      </ThemeCtx.Provider>
    );
  }

  // Auth screens
  if (!session || !currentUser) {
    const coEmail = coInviteToken ? decodeURIComponent(coInviteToken) : null;
    return (
      <ThemeCtx.Provider value={T}>
        {/* Session-expired banner — shown when token expired, not first-time login */}
        {sessionExpired && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
            background: "#B8924A", color: "white",
            padding: "12px 20px", textAlign: "center",
            fontFamily: "system-ui, sans-serif", fontSize: 13.5, lineHeight: 1.5,
          }}>
            Your session expired — please sign in again to continue. Your data is safe. 🌿
          </div>
        )}
        <div style={sessionExpired ? { paddingTop: 48 } : {}}>
          {authScreen === "login" ? (
            <LoginScreen onLogin={handleLogin} onGoRegister={() => setAuthScreen("register")} />
          ) : (
            <RegisterScreen
              onBack={() => setAuthScreen("login")}
              onRegistered={handleRegister}
              inviteToken={inviteToken}
              consultantInviteToken={consultantInviteToken}
              coInviteEmail={inviteRecord?.invite_email || coEmail}
              inviteRecord={inviteRecord}
            />
          )}
        </div>
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
            <div style={{ position: "fixed", inset: 0, zIndex: 500, background: T.overlayBg, padding: 20, overflowY: "auto" }}>
              <InviteFamilyPanel
                form={familyInviteForm} setForm={setFamilyInviteForm}
                onSend={sendFamilyInvite} onClose={closeInvitePanels}
                busy={inviteBusy} error={inviteError} success={inviteSuccess}
              />
            </div>
          )}
          {showInviteConsultant && (
            <div style={{ position: "fixed", inset: 0, zIndex: 500, background: T.overlayBg, padding: 20, overflowY: "auto" }}>
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

            {/* ─── PARENT VIEW ─────────────────────────────────────────────── */}
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

            {/* ─── CONSULTANT VIEW ──────────────────────────────────────────── */}
            {/* ConsultantShell owns its own nav, routing, and bottom tabs.     */}
            {/* It receives currentUser and logout so it can show the consultant */}
            {/* name and handle sign-out from within the shell.                  */}
            {isConsultant(role) && !isAdmin(role) && (
              <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
                <ConsultantShell
                  currentUser={currentUser}
                  logout={logout}
                  onInviteFamily={() => { closeInvitePanels(); setShowInviteFamily(true); }}
                />
              </div>
            )}

            {/* ─── ADMIN VIEW ───────────────────────────────────────────────── */}
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
