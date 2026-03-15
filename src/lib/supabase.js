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

export const supabase = createClient(url || "", anonKey || "");
