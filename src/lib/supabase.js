import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Auth/data calls will fail until set.");
}

// Clear any orphaned GoTrue locks before creating the client.
try {
  Object.keys(localStorage)
    .filter(k => k.startsWith("lock:"))
    .forEach(k => localStorage.removeItem(k));
} catch {}

const _client = createClient(url || "", anonKey || "", {
  auth: {
    persistSession: true,
    storageKey: "rcc-auth",
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
  db: {
    retryAttempts: 3,
    retryInterval: 1000,
  },
});

// ── PASSWORD RECOVERY CAPTURE ─────────────────────────────────────────────────
//
// When a user clicks a "reset password" link, Supabase's PKCE code exchange
// (triggered automatically by detectSessionInUrl) happens as soon as this
// client is created — which is at module-load time, before React mounts and
// before RCCShell's useEffect can call onAuthStateChange. If we wait until
// then to listen for the PASSWORD_RECOVERY event, it has already fired and
// is lost, and the recovery session just looks like a normal sign-in.
//
// Registering this listener synchronously, right here, wins that race —
// JS won't yield to the async exchange until after this line runs.
let _recoverySession = null;
let _recoveryCallbacks = [];

_client.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    _recoverySession = session;
    const callbacks = _recoveryCallbacks;
    _recoveryCallbacks = [];
    callbacks.forEach((cb) => cb(session));
  }
});

/**
 * Subscribe to the password-recovery event. If it already fired before this
 * was called, the callback runs immediately (synchronously) with the cached
 * session. Otherwise it runs whenever the event eventually fires.
 */
export function onPasswordRecovery(cb) {
  if (_recoverySession) {
    cb(_recoverySession);
  } else {
    _recoveryCallbacks.push(cb);
  }
}

// Single stable client — no recreation on visibility change.
// Client recreation was causing "Multiple GoTrueClient instances" warnings
// and GoTrue lock deadlocks that prevented getSession() from ever resolving.
// Session resume on tab-back is handled entirely by RCCShell's centralized
// visibilitychange handler, which calls refreshSession() directly on this
// stable client instance. That is sufficient for Safari network recovery.
export const supabase = _client;
export function getSupabase() { return _client; }

// On tab restore, just clear any orphaned locks so the next auth call
// isn't blocked. RCCShell handles the actual session refresh.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith("lock:"))
          .forEach(k => localStorage.removeItem(k));
      } catch {}
    }
  });
}

/**
 * Clears all stale Supabase auth tokens and locks from localStorage.
 * Call this ONLY when you have a confirmed invalid/expired token.
 */
export function clearStaleAuthTokens() {
  try {
    localStorage.removeItem("rcc-auth");
    localStorage.removeItem("rcc_user");
    Object.keys(localStorage)
      .filter(k => k.startsWith("lock:"))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}

/**
 * Clears ONLY orphaned GoTrue lock keys, without touching the session.
 */
export function clearStaleLocks() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith("lock:"))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}
