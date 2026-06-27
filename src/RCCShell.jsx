// RCCShell — orchestration only. Auth state, routing, global context, data loading.
// V2: Held UI frontend connected to Supabase backend.
// All auth logic, invite flows, Stripe, and data loading are UNCHANGED.
// Only the parent-facing UI imports are updated to use held-style components.

import { useState, useEffect, useRef } from "react";
import {
  THEMES, ThemeCtx, AppCtx, useT, useApp,
  useStorage, font, serif
} from "./core/shared.jsx";
import { supabase, getSupabase, clearStaleAuthTokens, clearStaleLocks, onPasswordRecovery } from "./lib/supabase.js";
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
  "child_name", "dob", "notification_prompt_seen",
];

function buildSafeCache(userObj) {
  return SAFE_CACHE_FIELDS.reduce((acc, key) => {
    if (userObj[key] !== undefined) acc[key] = userObj[key];
    return acc;
  }, {});
}

// ─── LOCAL CACHE HELPERS ──────────────────────────────────────────────────────
// Persist families/children/consultants to localStorage so the app can render
// immediately on resume without waiting for Supabase to respond.
// SECURITY: families/children contain no payment or auth data — safe to cache.
function cacheFamilies(data) {
  try { localStorage.setItem("rcc_families", JSON.stringify(data)); } catch {}
}
function cacheChildren(data) {
  try { localStorage.setItem("rcc_children", JSON.stringify(data)); } catch {}
}
function cacheConsultants(data) {
  try { localStorage.setItem("rcc_consultants", JSON.stringify(data)); } catch {}
}
function clearDataCache() {
  try {
    localStorage.removeItem("rcc_families");
    localStorage.removeItem("rcc_children");
    localStorage.removeItem("rcc_consultants");
  } catch {}
}

// ─── TAB DEFINITIONS ─────────────────────────────────────────────────────────
const PARENT_TABS = [
  { id: "home",     label: "Home",     icon: "🏡" },
  { id: "sleep",    label: "Track",    icon: "📝" },
  { id: "sos",      sos: true                     }, // center SOS slot
  { id: "messages", label: "Messages", icon: "💬" },
  { id: "insights", label: "Roots", icon: "✦"  },
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
  const [isRecovery, setIsRecovery] = useState(() => {
    try {
      const hash = window.location.hash || "";
      const search = window.location.search || "";

      // A PKCE `code` param in the URL means Supabase's automatic
      // exchangeCodeForSession will (or already did) create a session in
      // the background. Right now the only flow that produces ?code=... is
      // password recovery, so treat its presence as "show reset screen" —
      // this avoids depending on catching the PASSWORD_RECOVERY event at
      // the right moment. (If magic-link or OAuth login is added later,
      // this will need to get smarter.)
      const params = new URLSearchParams(search);
      if (params.has("code")) return true;

      if (hash.includes("type=recovery") || search.includes("type=recovery")) return true;
      // On error (e.g. expired/already-used reset link), Supabase redirects to
      // the default Site URL with error params and drops our ?type=recovery —
      // so also catch that signature directly. This pattern (error + error_code)
      // is specific to Supabase auth redirects.
      const hasAuthError = (str) => str.includes("error_code=") && str.includes("error=");
      return hasAuthError(hash) || hasAuthError(search);
    } catch {
      return false;
    }
  });
  // Mirrors isRecovery, but readable synchronously inside boot() before the
  // PASSWORD_RECOVERY-triggered re-render happens.
  const isRecoveryRef = useRef(isRecovery);
  const [currentUser, setCurrentUser] = useState(() => {
    try { const c = localStorage.getItem("rcc_user"); return c ? JSON.parse(c) : null; } catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(() => {
    try { return !localStorage.getItem("rcc_user"); } catch { return true; }
  });
  // Prevents the main app from flashing before onboardingStep is resolved.
  // Starts true for returning users (profileReady from cache) so they aren't blocked.
  // Starts false for new users and flips in the loadProfile finally block.
  const [onboardingReady, setOnboardingReady] = useState(() => {
    try { return !!localStorage.getItem("rcc_user"); } catch { return false; }
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

  const [families, setFamilies] = useState(() => {
    try {
      const c = localStorage.getItem("rcc_families");
      return c ? JSON.parse(c) : [];
    } catch { return []; }
  });
  const [consultants, setConsultants] = useState(() => {
    try {
      const c = localStorage.getItem("rcc_consultants");
      return c ? JSON.parse(c) : [];
    } catch { return []; }
  });
  const [children, setChildren] = useState(() => {
    try {
      const c = localStorage.getItem("rcc_children");
      return c ? JSON.parse(c) : [];
    } catch { return []; }
  });
  const [activeFamilyId, setActiveFamilyId] = useStorage("rcc_active_family", null);
  const activeFamily = families.find(f => f.id === activeFamilyId) || families[0] || null;
  const [activeChildId, setActiveChildId] = useStorage("rcc_active_child", null);
  const activeChild = children.find(c => c.id === activeChildId) || children[0] || null;

  const [tab, setTab] = useState("home");

  // ── Overlays
  const [showSOS, setShowSOS] = useState(false);
  const [showNSCheckin, setShowNSCheckin] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
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
    canAccessFoundationTab, canAccessRootCellar,
    canAccessFullPattern,
    canAccessMilestoneList, canAccessMilestoneNSContext,
    canSaveCoachHistory,
    asyncSupportCopy, zoomPhoneCopy,
  } = useTier({ currentUser, families, consultants });

  // ── BOOT
  const bootInFlightRef = useRef(false);
  const promptCheckedRef = useRef(false); // ensures notification prompt evaluated once per session
  const initialDataBumpRef = useRef(false); // ensures checkinRefreshKey only bumps once on first load
  useEffect(() => {
    let mounted = true;

    // Catch a PASSWORD_RECOVERY event that may have already fired (during
    // client creation, before this effect ran) or that fires shortly after.
    // Runs first so isRecoveryRef is set before boot()'s getSession() resolves.
    onPasswordRecovery((recoverySession) => {
      if (!mounted) return;
      isRecoveryRef.current = true;
      setIsRecovery(true);
      setSession(recoverySession);
      setAuthLoading(false);
    });

    // ── FAST BOOT: read session directly from localStorage ────────────────
    //
    // getSession() acquires the GoTrue lock internally. If the resume handler
    // is already holding that lock (fired on tab-back 600ms debounce), boot
    // queues behind it and hangs — triggering the 8s timeout and the
    // "Loading sleep data..." stuck state.
    //
    // Fix: read the raw session token directly from localStorage first.
    // Synchronous, zero-lock. Lets us render immediately from cache while
    // we validate in the background via getSession().
    function readCachedSession() {
      try {
        const raw = localStorage.getItem("rcc-auth");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // GoTrue wraps the session in a { currentSession, expiresAt } envelope
        const s = parsed?.currentSession || parsed;
        if (!s?.access_token) return null;
        // Check not expired (expires_at is unix seconds)
        const expiresAt = s.expires_at || s.expiresAt;
        if (expiresAt && expiresAt < Math.floor(Date.now() / 1000)) return null;
        return s;
      } catch { return null; }
    }

    const cachedSession = readCachedSession();
    const hasCachedUser = !!localStorage.getItem("rcc_user");

    if (cachedSession && hasCachedUser) {
      // Valid-looking session + cached profile — render immediately, no lock wait.
      setSession(cachedSession);
      setAuthLoading(false);
    }

    // Safety net: only relevant now for first-ever load (no cached session).
    const bootTimeout = setTimeout(() => {
      if (!mounted) return;
      console.warn("[RCCShell] boot timeout — unblocking loading screen");
      setAuthLoading(false);
    }, 8000);

    async function boot() {
      if (bootInFlightRef.current) return;
      bootInFlightRef.current = true;
      try {
        // If isRecovery was already true on initial render (e.g. from the
        // ?code= check) or set by the early onPasswordRecovery subscription
        // above, don't bother with getSession()/loadProfile() at all — the
        // recovery screen is taking over regardless, and those calls would
        // just compete for the same auth lock that exchangeCodeForSession
        // is using, slowing everything down.
        if (isRecoveryRef.current) {
          setAuthLoading(false);
          return;
        }

        // getSession() may queue behind the resume handler lock — that's fine
        // now because the app is already rendered from cache above.
        // This just background-validates the session is still good.
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        // If a PASSWORD_RECOVERY event arrived (just now, or while we were
        // awaiting getSession), let the recovery screen take over — don't
        // load the profile and render the normal app underneath it.
        if (isRecoveryRef.current) {
          setAuthLoading(false);
          return;
        }

        if (error) {
          const msg = error.message || "";
          const isConfirmedBadToken =
            msg.includes("Invalid Refresh Token") ||
            msg.includes("Refresh Token Not Found") ||
            msg.includes("refresh_token_not_found");

          if (isConfirmedBadToken) {
            clearStaleAuthTokens();
            setSession(null);
            setCurrentUser(null);
            setSessionExpired(true);
          } else {
            clearStaleLocks();
            console.warn("[RCCShell] boot getSession transient error (not clearing session):", msg);
          }
          setAuthLoading(false);
          return;
        }

        const activeSession = data?.session || null;
        setSession(activeSession);

        if (activeSession?.user) {
          try {
            await loadProfile(activeSession.user.id, activeSession.user.email, hasCachedUser);
          } catch (err) {
            console.error("[RCCShell] boot loadProfile error:", err);
            setAuthLoading(false);
          }
        } else {
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
        isRecoveryRef.current = true;
        setIsRecovery(true);
        setSession(newSession);
        setAuthLoading(false);
        return;
      }

      // ── Token refresh failed — stale session, need clean re-login ──
      if (event === "TOKEN_REFRESHED" && !newSession) {
        clearStaleAuthTokens(); clearDataCache();
        setSession(null);
        setCurrentUser(null); setFamilies([]); setConsultants([]); setChildren([]);
        setSessionExpired(true);
        setAuthLoading(false);
        return;
      }

      // ── Signed out (manual or forced by Supabase) ──
      if (event === "SIGNED_OUT") {
        clearStaleAuthTokens(); clearDataCache();
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
        // IMPORTANT: Skip loadProfile entirely during password recovery — the PKCE
        // exchangeCodeForSession fires SIGNED_IN after the code exchange, but we must
        // not compete for the GoTrue lock or render the normal app under the reset screen.
        if (isRecoveryRef.current) {
          setAuthLoading(false);
          return;
        }
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
    return () => { mounted = false; clearTimeout(bootTimeout); subscription.unsubscribe(); };
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
          const { data, error } = await supabase.rpc("get_consultant_invite", { p_token: consultantInviteToken }).maybeSingle();
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
            .rpc("get_co_caregiver_invite", { p_email: email })
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

  // ── CENTRALIZED APP RESUME HANDLER ──────────────────────────────────────────
  //
  // WHY THIS EXISTS:
  //   The March 21 backup had NO resume handler. Navigation worked because modules
  //   loaded once on mount and stayed stable. Subsequent changes added visibilitychange
  //   listeners in HeldHome (×4), ParentHome (×1), and SleepLog (×1) — all firing
  //   simultaneously on resume before activeFamily/activeChild re-hydrated, leaving
  //   screens stuck in empty loading state. Those listeners are now removed.
  //   This is the single resume entry point.
  //
  // LOCK FIX:
  //   resumeInFlightRef is a useRef (not a closure variable). It survives React Strict
  //   Mode double-invoke and rapid visibility+focus pairs. The previous `refreshing`
  //   local variable reset to false on each closure re-run, allowing concurrent GoTrue
  //   calls that triggered "lock:rcc-auth was not released within 5000ms".
  //
  // ACTIVE_FAMILY STABILITY FIX:
  //   activeFamily derives as: families.find(f => f.id === activeFamilyId) || families[0]
  //   The old handler called setFamilies([familyById]) which collapsed the array.
  //   If activeFamilyId didn't match families[0] for even one render, activeFamily
  //   became null and tripped child loading guards that never self-corrected.
  //   This handler MERGES the refreshed family into the existing array instead.

  const resumeInFlightRef = useRef(false);

  useEffect(() => {
    let timer = null;

    async function handleResume() {
      // Guard: drop concurrent resume calls entirely.
      if (resumeInFlightRef.current) return;
      resumeInFlightRef.current = true;

      try {
        // ── Step 1: Read GoTrue in-memory state. No network, no lock. ──────
        const { data: current } = await supabase.auth.getSession();
        const activeSession = current?.session;

        if (!activeSession) {
          if (currentUser) {
            clearStaleAuthTokens();
            setSession(null);
            setCurrentUser(null);
            setFamilies([]); setConsultants([]); setChildren([]);
            setSessionExpired(true);
            setAuthLoading(false);
          }
          return;
        }

        // ── Step 2: Conditionally refresh — only if token expires < 10 mins ──
        // refreshSession() acquires the GoTrue lock — gate it to avoid contention.
        // ALSO: wrap in a hard 5s timeout. If iOS suspended the app mid-lock,
        // refreshSession() will hang forever waiting for a lock that's never released.
        // On timeout, we skip the refresh (session is still valid for now) and
        // clear orphaned locks so the next resume attempt isn't also stuck.
        const expiresAt = activeSession.expires_at;
        const tenMinsFromNow = Math.floor(Date.now() / 1000) + 600;

        if (expiresAt && expiresAt < tenMinsFromNow) {
          const refreshResult = await Promise.race([
            supabase.auth.refreshSession(),
            new Promise(resolve =>
              setTimeout(() => resolve({ data: null, error: new Error("refresh_timeout") }), 5000)
            ),
          ]);

          const { data: refreshed, error: refreshError } = refreshResult;

          if (refreshError?.message === "refresh_timeout") {
            // Lock was likely orphaned by iOS suspension — clear it and bail.
            // Session is still usable (just slightly stale), so don't log out.
            clearStaleLocks();
            console.warn("[RCCShell] refreshSession timed out — skipping refresh, clearing locks");
            setSession(activeSession);
          } else if (refreshError || !refreshed?.session) {
            // Confirmed bad token — sign out cleanly
            try { await supabase.auth.signOut({ scope: "local" }); } catch {}
            clearStaleAuthTokens();
            setSession(null);
            setCurrentUser(null);
            setFamilies([]); setConsultants([]); setChildren([]);
            setSessionExpired(true);
            setAuthLoading(false);
            return;
          } else {
            setSession(refreshed.session);
          }
        } else {
          setSession(activeSession);
        }

        // ── Step 3: Re-fetch profile + data, MERGE into existing state ──────
        const userId = activeSession.user?.id;
        const authEmail = activeSession.user?.email;
        if (!userId) return;

        try {
          const [
            { data: profile },
            { data: familyById },
            { data: kids },
          ] = await Promise.all([
            supabase.from("profiles")
              .select("id, name, user_email, role, subscription_tier, ai_messages_used, ai_messages_reset_at, child_name, dob, weight_lbs, weight_oz, consultant_pin")
              .eq("id", userId).maybeSingle(),
            supabase.from("families")
              .select("*").eq("parent_id", userId).maybeSingle(),
            supabase.from("children")
              .select("*").eq("parent_id", userId).order("created_at", { ascending: true }),
          ]);

          if (profile) {
            const merged = { ...(profile || {}), id: userId, email: authEmail || profile.user_email };
            setCurrentUser(prev => ({ ...(prev || {}), ...merged }));
            try { localStorage.setItem("rcc_user", JSON.stringify(buildSafeCache(merged))); } catch {}
          }

          if (familyById) {
            // MERGE: update matching entry rather than replacing the whole array.
            // Prevents activeFamily flickering to null mid-render.
            setFamilies(prev => {
              const exists = prev.some(f => f.id === familyById.id);
              const next = exists
                ? prev.map(f => f.id === familyById.id ? { ...f, ...familyById } : f)
                : [familyById, ...prev];
              cacheFamilies(next);
              return next;
            });
            setActiveFamilyId(familyById.id);

            if (familyById.consultant_id) {
              const { data: consultant } = await supabase
                .from("profiles").select("*").eq("id", familyById.consultant_id).maybeSingle();
              const cons = consultant ? [consultant] : [];
              setConsultants(cons); cacheConsultants(cons);
            }
          }

          // Only overwrite children if we found a family by parent_id.
          // Co-caregivers have no family row with their parent_id — their family
          // was resolved by loadProfile via the co_caregivers table. Overwriting
          // with an empty array here would wipe their correctly-loaded child state
          // every time the app resumes from background.
          if (kids && familyById) { setChildren(kids); cacheChildren(kids); }

        } catch (dataErr) {
          // Data re-fetch failed (network blip). Session is still valid — don't sign out.
          console.warn("[RCCShell] resume data re-fetch failed:", dataErr.message);
        }

        // ── Step 4: Signal child modules AFTER shell state is settled ───────
        // checkinRefreshKey increments here so all child hooks re-fetch with a
        // valid activeFamily already in context — not racing shell re-hydration.
        setCheckinRefreshKey(k => k + 1);

      } catch (err) {
        // GoTrue timeout, offline, or unexpected — never clear valid local state.
        console.warn("[RCCShell] resume handler caught:", err.message);
      } finally {
        resumeInFlightRef.current = false;
      }
    }

    // 600ms debounce: collapses the visibility+focus pair on iOS PWA resume
    // into a single handleResume() call.
    function scheduleResume() {
      clearTimeout(timer);
      timer = setTimeout(handleResume, 600);
    }

    document.addEventListener("visibilitychange", e => {
      if (document.visibilityState === "visible") scheduleResume();
    });
    window.addEventListener("focus", scheduleResume);

    return () => {
      document.removeEventListener("visibilitychange", scheduleResume);
      window.removeEventListener("focus", scheduleResume);
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ── LOAD PROFILE (UNCHANGED logic)
  async function loadProfile(userId, authEmail = null, fromCache = false) {
    if (!fromCache) setAuthLoading(true);
    // Pin to a single client instance for this entire function. loadProfile
    // makes many sequential and parallel Supabase calls (profile, families,
    // children, consultants, co-caregiver lookups, etc). The global `supabase`
    // export is a Proxy that the visibility-resume handler in lib/supabase.js
    // can swap out mid-flight (e.g. if the app is backgrounded and restored
    // while this function is still running — a common case when someone
    // opens the app after it's been idle). Without pinning, a call partway
    // through this function could silently run against a fresh, not-yet-
    // authenticated client and never resolve, which is what produced the
    // "Loading sleep data..." hang that never recovers even on refresh.
    const client = getSupabase();

    // Hard timeout on the whole load sequence, mirroring the existing
    // pattern already used in ParentHome.jsx (useFamilyState's fetch
    // bundle). loadProfile can stall for reasons beyond the client-swap
    // race above — slow/dropping wifi, a cold Supabase function, etc — and
    // until now there was no ceiling on how long it would wait, so any
    // stall surfaced as a permanent "Loading sleep data..." hang with no
    // way to recover short of a full sign-out/sign-in. On timeout we stop
    // waiting and clear the loading flags so the UI is no longer stuck.
    // families/children are left as whatever they already were (e.g.
    // cached values from a prior successful load) rather than being
    // wiped — visibility-change and other normal re-triggers of
    // loadProfile get another chance to complete successfully. Note: the
    // inner load may still be running in the background after a timeout
    // "wins" the race (JS can't cancel an in-flight fetch this way) — if
    // it eventually completes, its own setState calls still apply safely,
    // they just arrive late rather than blocking the UI in the meantime.
    async function loadProfileInner() {
    try {
      const [{ data: { user: authUser } }, { data: profile, error: profileError }] = await Promise.all([
        client.auth.getUser(),
        client.from("profiles").select("id, name, user_email, role, subscription_tier, ai_messages_used, ai_messages_reset_at, child_name, dob, weight_lbs, weight_oz, consultant_pin, notification_prompt_seen").eq("id", userId).maybeSingle(),
      ]);
      if (profileError) throw profileError;

      const resolvedEmail = (authEmail || authUser?.email || profile?.user_email || null)?.toLowerCase?.() || authEmail || authUser?.email || profile?.user_email || null;
      const merged = {
        ...(profile || {}),
        id: userId,
        name: profile?.name || authUser?.user_metadata?.name || (resolvedEmail ? resolvedEmail.split("@")[0] : "there"),
        // IMPORTANT: profile.role is the authoritative source — it is set server-side
        // by the DB trigger and validated via RLS. user_metadata.role is client-writable
        // and should only be used as a last resort when there is no profile row yet.
        // Never fall back to "parent" if we have a profile row — that would route
        // consultants into the parent view when getUser() returns null transiently.
        role: profile?.role || (profile ? undefined : authUser?.user_metadata?.role) || "parent",
        consultant_pin: profile?.consultant_pin || authUser?.user_metadata?.consultant_pin || null,
        email: resolvedEmail,
      };

      setCurrentUser(merged);
      // ── SECURITY: Only cache safe, non-sensitive fields ───────────────────
      try { localStorage.setItem("rcc_user", JSON.stringify(buildSafeCache(merged))); } catch {}
      setProfileReady(true);

      // Bump checkinRefreshKey once on first load so HeldHome's hooks re-fetch
      // with confirmed-fresh context. Gated behind a ref so subsequent loadProfile
      // calls (tab resume, visibility change) don't trigger a full re-fetch cascade
      // of 6-7 parallel Supabase queries — which was causing the slow loading.
      if (!initialDataBumpRef.current) {
        initialDataBumpRef.current = true;
        setCheckinRefreshKey(k => k + 1);
      }

      // ── NOTIFICATION PROMPT — show once, parents/co-caregivers only ───────
      // Guard: skip if already seen, already subscribed, or already checked this session.
      const isParentRole = merged.role === "parent" || merged.role === "co_caregiver";
      if (isParentRole && merged.notification_prompt_seen === false && !promptCheckedRef.current) {
        promptCheckedRef.current = true;

        // sessionStorage guard — survives hot reloads within the same browser
        // session, preventing the prompt from flashing on every dev reload even
        // before the DB write completes.
        if (sessionStorage.getItem("held_notif_prompt_seen")) {
          // Already seen this session — mark in DB so it never shows again on next login
          await client.from("profiles").update({ notification_prompt_seen: true }).eq("id", userId);
          setCurrentUser(prev => ({ ...prev, notification_prompt_seen: true }));
          try { localStorage.setItem("rcc_user", JSON.stringify(buildSafeCache({ ...merged, notification_prompt_seen: true }))); } catch {}
        } else {
          const { data: existingSub } = await client
            .from("push_subscriptions")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingSub) {
            // Already subscribed — just mark seen so we never check again
            await client.from("profiles").update({ notification_prompt_seen: true }).eq("id", userId);
            setCurrentUser(prev => ({ ...prev, notification_prompt_seen: true }));
            try { localStorage.setItem("rcc_user", JSON.stringify(buildSafeCache({ ...merged, notification_prompt_seen: true }))); } catch {}
          } else {
            setShowNotificationPrompt(true);
          }
        }
      } else if (merged.notification_prompt_seen === true) {
        promptCheckedRef.current = true; // already done, no need to ever check again
      }

      if (isAdmin(merged.role)) {
        setTab("dashboard");
        const [{ data: fams }, { data: cons }] = await Promise.all([
          client.from("families").select("*"),
          client.from("profiles").select("*").in("role", ["consultant", "consultant_internal", "admin"]),
        ]);
        setFamilies(fams || []); cacheFamilies(fams || []);
        setConsultants(cons || []); cacheConsultants(cons || []);
        setChildren([]); cacheChildren([]);
        setOnboardingStep(null);
        return;
      }

      if (isConsultant(merged.role)) {
        setTab("families");
        const { data: fams } = await client.from("families").select("*").eq("consultant_id", userId);
        setFamilies(fams || []); cacheFamilies(fams || []);
        setConsultants([]); cacheConsultants([]);
        setChildren([]); cacheChildren([]);
        setOnboardingStep(null);
        return;
      }

      setTab("home");

      const [{ data: byId }, { data: byEmail }] = await Promise.all([
        client.from("families").select("*").eq("parent_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        resolvedEmail
          ? client.from("families").select("*").eq("invite_email", resolvedEmail).order("consultant_id", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      let familyData = byId || byEmail || null;

      if (!byId && byEmail) {
        client.from("families").update({ parent_id: userId }).eq("id", byEmail.id);
      }

      // Backfill timezone for families created before timezone capture was added.
      // Fires silently on every login but only writes when the field is actually null.
      if (familyData?.id && !familyData.timezone) {
        const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        client.from("families").update({ timezone: detectedTz }).eq("id", familyData.id);
        familyData = { ...familyData, timezone: detectedTz };
      }

      if (!familyData) {
        // Check co_caregivers — try user_id first (reliable after password reset),
        // then fall back to email. Two separate queries avoids .or() syntax issues.
        let coRecord = null;

        const { data: byUserId } = await client
          .from("co_caregivers")
          .select("family_id")
          .eq("user_id", userId)
          .in("status", ["pending", "active"])
          .maybeSingle();

        if (byUserId) {
          coRecord = byUserId;
        } else if (resolvedEmail) {
          const { data: byCoEmail } = await client
            .from("co_caregivers")
            .select("family_id")
            .eq("email", resolvedEmail)
            .in("status", ["pending", "active"])
            .maybeSingle();
          if (byCoEmail) coRecord = byCoEmail;
        }

        if (coRecord) {
          const { data: coFamily } = await client
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
              localStorage.setItem("rcc_user", JSON.stringify(buildSafeCache({ ...cached, ...merged, role: "co_caregiver" })));
            } catch {}
            client
              .from("co_caregivers")
              .update({ status: "active", user_id: userId })
              .eq("family_id", coRecord.family_id)
              .eq("user_id", userId);
          }
        }
      }

      if (familyData) {
        setFamilies([familyData]); cacheFamilies([familyData]);
        setActiveFamilyId(familyData.id);

        const parentIdForKids = (familyData.parent_id && familyData.parent_id !== userId)
          ? familyData.parent_id
          : userId;

        const [{ data: resolvedKids }, { data: cons }, { data: intake }] = await Promise.all([
          client.from("children").select("*").eq("parent_id", parentIdForKids).order("created_at", { ascending: true }),
          familyData.consultant_id
            ? client.from("profiles").select("*").eq("id", familyData.consultant_id).maybeSingle()
            : Promise.resolve({ data: null }),
          client.from("intake_responses").select("*").eq("family_id", familyData.id).maybeSingle(),
        ]);

        const kidList = resolvedKids || [];
        setChildren(kidList); cacheChildren(kidList);
        if (kidList.length && !activeChildId) setActiveChildId(kidList[0].id);
        const consArr = cons ? [cons] : [];
        setConsultants(consArr); cacheConsultants(consArr);

        const alreadyHasChildren = kidList.length > 0;
        if (merged.role === "co_caregiver") {
          // Co-caregivers never go through child onboarding — they join an
          // existing family. Even if children fail to load, don't show onboarding.
          setOnboardingStep(null);
        } else if (!alreadyHasChildren) {
          // Never re-trigger onboarding if this is a post-upgrade redirect.
          // The upgrade_success param means the user just came back from Stripe
          // and loadProfile is re-running to refresh their tier — they already
          // completed onboarding, so don't send them back through child info.
          const isUpgradeRedirect = (() => { try { return new URLSearchParams(window.location.search).get("upgrade_success") === "true"; } catch { return false; } })();
          if (!isUpgradeRedirect) setOnboardingStep("child");
        } else if (!intake && familyData.require_intake) {
          setOnboardingStep("intake");
        } else {
          setOnboardingStep(null);
        }
      } else {
        setFamilies([]); cacheFamilies([]);
        setChildren([]); cacheChildren([]);
        setConsultants([]); cacheConsultants([]);
        const isUpgradeRedirect = (() => { try { return new URLSearchParams(window.location.search).get("upgrade_success") === "true"; } catch { return false; } })();
        const isCoCaregiverRole = merged.role === "co_caregiver";
        // Co-caregivers and upgrade redirects should never trigger child onboarding —
        // co-caregivers join an existing family, they don't create one.
        if (!isUpgradeRedirect && !isCoCaregiverRole) {
          setOnboardingStep(coInviteToken ? null : (inviteToken ? "register" : "child"));
        }
      }
    } catch (err) {
      console.error("[RCCShell] loadProfile error:", err);
      setProfileReady(true);
    } finally {
      setAuthLoading(false);
      setOnboardingReady(true);
    }
    } // end loadProfileInner

    const LOAD_TIMEOUT_MS = 15000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("load_profile_timeout")), LOAD_TIMEOUT_MS)
    );
    try {
      await Promise.race([loadProfileInner(), timeoutPromise]);
    } catch (err) {
      if (err.message === "load_profile_timeout") {
        console.warn("[RCCShell] loadProfile timed out after", LOAD_TIMEOUT_MS, "ms — unblocking UI so the app doesn't hang indefinitely");
        setProfileReady(true);
        setAuthLoading(false);
        setOnboardingReady(true);
      }
      // Any other error here is unexpected, since loadProfileInner already
      // has its own try/catch — but don't let it crash the app either way.
    }
  }

  function logout() {
    supabase.auth.signOut();
    setCurrentUser(null); setFamilies([]); setConsultants([]); setChildren([]);
    clearDataCache();
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
        // If the family already has a consultant assigned, auto-elevate the
        // parent to VIP tier — same logic as assignConsultant() in AdminViews.
        // Without this, parents invited by a consultant land on free tier
        // because assignConsultant() only fires on manual admin reassignment.
        const { data: invitedFamily } = await supabase
          .from("families")
          .select("consultant_id")
          .eq("invite_token", tok)
          .maybeSingle();
        if (invitedFamily?.consultant_id) {
          await supabase.from("profiles")
            .update({ subscription_tier: "vip" })
            .eq("id", data.user.id);
        }
      } else if (role === "parent" && !tok && !isCoCaregiver) {
        const { error: familyError } = await supabase.from("families").insert({
          parent_id: data.user.id,
          invite_email: normalizedEmail,
          require_intake: false,
          intake_complete: false,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
      const family = activeFamily || families[0];
      const payload = {
        parent_id: currentUser.id,
        family_id: family?.id ?? null,
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
      const kidList = kids || [];
      setChildren(kidList);
      if (kidList.length > 0 && !activeChildId) setActiveChildId(kidList[0].id);
    } finally {
      setChildSaving(false);
    }
  }

  // Called once the parent is done adding children during onboarding —
  // advances to the intake step if required, otherwise lands on home.
  function finishChildOnboarding() {
    const family = activeFamily || families[0];
    if (family?.require_intake && !family?.intake_complete) {
      setOnboardingStep("intake");
    } else {
      setOnboardingStep(null);
      setTab("home");
      clearInviteFromUrl();
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

  // ── NOTIFICATION PROMPT HANDLERS ─────────────────────────────────────────
  async function dismissNotificationPrompt(didAllow) {
    setShowNotificationPrompt(false);

    // Capture userId immediately — currentUser state may be stale in closure
    const userId = currentUser?.id;
    if (!userId) return;

    // Write sessionStorage guard immediately so reloads don't re-show the prompt
    // while the DB write is in flight
    sessionStorage.setItem("held_notif_prompt_seen", "1");

    if (didAllow) {
      // Inline subscribe — avoids mounting usePushNotifications at the shell
      // level (which calls serviceWorker.ready on every load and causes slowness).
      try {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          function urlBase64ToUint8Array(base64String) {
            const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
            const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
            return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          }
          const reg = await navigator.serviceWorker.register("/sw.js");
          await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
          const subJson = sub.toJSON();
          const ua = navigator.userAgent;
          const deviceLabel = /iPhone|iPad|iPod/.test(ua) ? "iPhone"
            : /Android/.test(ua) ? "Android"
            : /Mac/.test(ua) ? "Mac"
            : /Windows/.test(ua) ? "Windows" : "Browser";
          await supabase.from("push_subscriptions").upsert({
            user_id: userId,
            subscription: subJson,
            device_label: deviceLabel,
          }, { onConflict: "user_id,endpoint" });
        }
      } catch (e) {
        console.warn("Push subscribe failed:", e);
        // Non-fatal — continue to mark prompt as seen
      }

      // Upsert sensible defaults into notification_preferences so the cron
      // function doesn't skip this user on its very first pass.
      await supabase.from("notification_preferences").upsert({
        user_id: userId,
        regulation_checkin: true,
        messages: true,
        intake_completed: true,
        am_enabled: false,
        pm_enabled: false,
        am_time: "08:00",
        pm_time: "20:00",
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
        nap_lead_mins: 10,
        bedtime_lead_mins: 10,
      }, { onConflict: "user_id" });
    }

    // Mark seen regardless of choice — never show again
    const { error } = await supabase.from("profiles")
      .update({ notification_prompt_seen: true })
      .eq("id", userId);
    if (error) {
      console.error("[held] Failed to mark notification_prompt_seen:", error);
    }
    setCurrentUser(prev => ({ ...prev, notification_prompt_seen: true }));
    try {
      const cached = JSON.parse(localStorage.getItem("rcc_user") || "{}");
      localStorage.setItem("rcc_user", JSON.stringify(buildSafeCache({ ...cached, notification_prompt_seen: true })));
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
      const { error: insertError } = await supabase.from("consultant_invites").insert({
        token,
        email: consultantInviteForm.email.trim().toLowerCase(),
        name: consultantInviteForm.name?.trim() || null,
        role,
        source: "admin",
        invited_by: currentUser?.id,
        payment_required: false,
        payment_completed: false,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
      // Pin to a single client instance for the whole invite flow. The global
      // `supabase` export is a Proxy that can be swapped out mid-flight by the
      // visibility-resume handler in lib/supabase.js (e.g. if the tab/app is
      // backgrounded and restored between these two calls). Grabbing the
      // client once here means both calls below always run against the same
      // (already-authenticated) instance, instead of the second call possibly
      // landing on a brand-new client whose session hasn't rehydrated yet.
      const client = getSupabase();

      const familyId = activeFamily?.id;
      if (!familyId) throw new Error("No active family found.");
      const normalizedEmail = coInviteEmail.trim().toLowerCase();

      const { error: insertError } = await client.from("co_caregivers").upsert({
        family_id: familyId,
        invited_by: currentUser?.id,
        email: normalizedEmail,
        status: "pending",
      }, { onConflict: "family_id,email" });
      if (insertError) throw insertError;

      const { error } = await client.functions.invoke("send-invite", {
        body: {
          email: normalizedEmail,
          familyId,
          family_id: familyId,
          invited_by: currentUser?.id,
          invited_by_name: currentUser?.name,
          isCo: true,
        },
      });
      if (error) {
        console.warn("[RCCShell] co-caregiver email send failed but DB record was created:", error);
        setCoInviteError(
          <>
            Something went wrong sending this invite. Please{" "}
            <a href="mailto:hello@rootedconnectionscollective.com" style={{ color: "inherit", textDecoration: "underline" }}>
              contact support
            </a>{" "}
            and we'll get it sorted.
          </>
        );
        setCoInviteEmail("");
        return;
      }
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
    canAccessFoundationTab, canAccessRootCellar,
    canAccessFullPattern,
    canAccessMilestoneList, canAccessMilestoneNSContext,
    canSaveCoachHistory,
    asyncSupportCopy, zoomPhoneCopy,
    logout,
    checkinRefreshKey,
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

  // ── Password reset flow — checked FIRST so cached sessions don’t render
  // the normal app underneath the reset screen for returning users.
  if (isRecovery) {
    return (
      <ThemeCtx.Provider value={T}>
        <ResetPasswordScreen onDone={() => {
          setIsRecovery(false);
          // Clear the recovery token from the URL so a refresh doesn't
          // re-trigger the reset screen with a stale token.
          try {
            const url = new URL(window.location.href);
            url.hash = "";
            window.history.replaceState({}, "", url.toString());
          } catch {}
          // onAuthStateChange will fire SIGNED_IN after password update
        }} />
      </ThemeCtx.Provider>
    );
  }

  // Loading states
  if (inviteLoading) return <ThemeCtx.Provider value={T}><LoadingScreen label="Loading your invitation…" /></ThemeCtx.Provider>;
  if (authLoading && !profileReady) return <ThemeCtx.Provider value={T}><LoadingScreen label="Loading…" /></ThemeCtx.Provider>;
  if (!onboardingReady) return <ThemeCtx.Provider value={T}><LoadingScreen label="Loading…" /></ThemeCtx.Provider>;

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
          <ChildInfoStep onSave={saveChildInfo} onFinish={finishChildOnboarding} loading={childSaving} />
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

          {/* ── NOTIFICATION PROMPT (one-time, first login) ── */}
          {showNotificationPrompt && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 600,
              background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 24px",
            }}>
              <div style={{
                background: T.card || T.bg,
                borderRadius: 20,
                padding: "32px 28px 28px",
                maxWidth: 360,
                width: "100%",
                boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>🌿</div>
                <div style={{
                  fontFamily: serif, fontSize: 19, fontWeight: 700,
                  color: T.text, marginBottom: 12, lineHeight: 1.35,
                }}>
                  Allow Held to send you notifications?
                </div>
                <div style={{
                  fontFamily: font, fontSize: 14, color: T.muted,
                  lineHeight: 1.65, marginBottom: 28,
                }}>
                  Get gentle reminders for sleep routines, bedtime wind-downs, and check-ins when you need them most.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={() => dismissNotificationPrompt(true)}
                    style={{
                      width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                      background: T.teal, color: "#fff",
                      fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Allow
                  </button>
                  <button
                    onClick={() => dismissNotificationPrompt(false)}
                    style={{
                      width: "100%", padding: "11px 0", borderRadius: 12,
                      border: `1px solid ${T.border}`, background: "transparent",
                      color: T.muted, fontFamily: font, fontSize: 14,
                      fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SOS OVERLAY ── */}
          {showSOS && <SOSFlow onClose={() => setShowSOS(false)} setTab={setTab} />}

          {/* ── NS CHECK-IN OVERLAY ── */}
          {showNSCheckin && <NSCheckinFlow onClose={() => { setShowNSCheckin(false); setCheckinRefreshKey(k => k + 1); }} onCheckinSaved={() => setCheckinRefreshKey(k => k + 1)} />}

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
                    onScripts={goToScripts}
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
                {tab === "messages" && (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "calc(100vh - env(safe-area-inset-top, 0px))",
                    overflow: "hidden",
                  }}>
                    <Messaging user={currentUser} activeFamily={activeFamily} onFindConsultant={() => setShowFindConsultant(true)} />
                  </div>
                )}
                {tab === "insights"   && <HeldInsights setTab={setTab} onOpenDrawer={() => setDrawerOpen(true)} onScripts={goToScripts} />}
                {tab === "library"    && <LibraryModule defaultTab={libraryDefaultTab} key={libraryKey} onOpenDrawer={() => setDrawerOpen(true)} />}

                {/* SOS FAB — visible on all parent tabs */}
                {/* Bottom nav */}
                <BottomNav
                  tabs={PARENT_TABS}
                  active={tab === "library" ? "insights" : tab}
                  setActive={setTab}
                  unread={unread}
                  onSOS={() => setShowSOS(true)}
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
