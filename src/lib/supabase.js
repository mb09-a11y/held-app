import { createClient } from "@supabase/supabase-js";

/**
 * Supabase is configured via Vite env vars.
 * Create a .env file in the project root (NOT committed) based on .env.example.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Auth/data calls will fail until set.");
}

export const supabase = createClient(url || "", anonKey || "", {
  auth: {
    persistSession: true,
    storageKey: "rcc-auth",
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

/**
 * Clears all stale Supabase auth tokens and locks from localStorage.
 * Call this when you get an Invalid Refresh Token error so the user
 * gets a clean sign-in prompt instead of a broken/hanging app.
 */
export function clearStaleAuthTokens() {
  try {
    // Remove the main session token
    localStorage.removeItem("rcc-auth");
    // Remove any gotrue lock keys that may be orphaned
    Object.keys(localStorage)
      .filter(k => k.startsWith("lock:") || k.startsWith("supabase.auth") || k === "rcc_user")
      .forEach(k => localStorage.removeItem(k));
  } catch {
    // localStorage not available — ignore
  }
}
