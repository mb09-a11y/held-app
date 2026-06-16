// src/lib/ai.js
// All AI calls go through the Supabase Edge Function proxy — never directly to Anthropic.
// This keeps the API key server-side and avoids CORS errors in the browser.

import { supabase } from "./supabase.js";

/**
 * callAI({ system, messages, model, max_tokens })
 * Returns the text content of the first text block, or "" on failure.
 */
/**
 * warmAI()
 * Silently pings the AI edge function on app load so the first real call
 * hits a warm function instead of a cold start. Fire-and-forget.
 */
export async function warmAI() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await supabase.functions.invoke("ai-proxy", {
      body: { model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "ping" }] },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    // Warmup failure is silent — it's just a best-effort optimization
  }
}

export async function callAI({ system, messages, model = "claude-sonnet-4-6", max_tokens = 1000 }) {
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
