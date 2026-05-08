import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Auth/data calls will fail until set.");
}

function createSupabaseClient() {
  return createClient(url || "", anonKey || "", {
    auth: {
      persistSession: true,
      storageKey: "rcc-auth",
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: {
      headers: { "x-application-name": "rcc-app" },
    },
    db: {
      retryAttempts: 3,
      retryInterval: 1000,
    },
  });
}

// ── SAFARI NETWORK RECOVERY ───────────────────────────────────────────────────
//
// Safari throttles ALL network connections when a tab goes to the background.
// When the tab returns to the foreground, existing fetch connections are in a
// broken state and never recover — every pending Promise hangs indefinitely.
//
// The fix: keep a mutable reference to the Supabase client and replace it with
// a fresh instance when the tab becomes visible again. All app code accesses
// the client via getSupabase() so they always get the current live instance.
//
// We also export a stable `supabase` proxy object so existing import statements
// (import { supabase } from '...') work without any changes in other files.

let _client = createSupabaseClient();
let _lastVisible = Date.now();

// Proxy that always delegates to the current client instance.
// This means existing code using `supabase.from(...)` etc. works unchanged.
export const supabase = new Proxy({}, {
  get(_, prop) {
    return typeof _client[prop] === "function"
      ? _client[prop].bind(_client)
      : _client[prop];
  },
  set(_, prop, value) {
    _client[prop] = value;
    return true;
  },
});

export function getSupabase() { return _client; }

// Reinitialize the client when the tab becomes visible after being hidden.
// Only reinitialize if the tab was hidden for more than 2 seconds — avoids
// unnecessary reinits on brief focus changes.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const hiddenFor = Date.now() - _lastVisible;
      if (hiddenFor > 2000) {
        console.log("[supabase] Tab restored after", Math.round(hiddenFor / 1000), "s — reinitializing client");
        _client = createSupabaseClient();
      }
      _lastVisible = Date.now();
    } else {
      _lastVisible = Date.now();
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
