// src/lib/ai.js
// All AI calls go through the Supabase Edge Function proxy — never directly to Anthropic.
// This keeps the API key server-side and avoids CORS errors in the browser.

import { supabase } from "./supabase.js";

/**
 * callAI({ system, messages, model, max_tokens })
 * Returns the text content of the first text block, or "" on failure.
 */
export async function callAI({ system, messages, model = "claude-sonnet-4-20250514", max_tokens = 1000 }) {
  // Get the current session token so Supabase allows the edge function call
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    body: { model, max_tokens, system, messages },
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {},
  });
  if (error) throw new Error(error.message || "AI proxy error");
  return data?.content?.find(c => c.type === "text")?.text || "";
}
