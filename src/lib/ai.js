// src/lib/ai.js
// All AI calls go through the Supabase Edge Function proxy — never directly to Anthropic.
// This keeps the API key server-side and avoids CORS errors in the browser.
//
// Usage:
//   callAI({ promptType: "ns_checkin", messages })        — uses prompt router
//   callAI({ system: "custom prompt...", messages })       — pass your own system prompt
//   callAI({ promptType: "sleep_insight", messages, max_tokens: 600 })

import { supabase } from "./supabase.js";
import { getPrompt } from "./prompts.js";

/**
 * callAI({ promptType, system, messages, model, max_tokens })
 *
 * @param {object}   opts
 * @param {string}  [opts.promptType]  - Key from prompts.js router (preferred)
 * @param {string}  [opts.system]      - Raw system prompt (overrides promptType)
 * @param {Array}    opts.messages     - Anthropic messages array
 * @param {string}  [opts.model]       - Defaults to claude-sonnet-4-20250514
 * @param {number}  [opts.max_tokens]  - Defaults to 1000
 *
 * Returns the text content of the first text block, or "" on failure.
 */
export async function callAI({
  promptType,
  system,
  messages,
  model = "claude-sonnet-4-20250514",
  max_tokens = 1000,
}) {
  // Resolve system prompt: explicit system string takes precedence, then promptType router
  const resolvedSystem = system ?? (promptType ? getPrompt(promptType) : undefined);

  // Get the current session token so Supabase allows the edge function call
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    body: { model, max_tokens, system: resolvedSystem, messages },
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {},
  });

  if (error) throw new Error(error.message || "AI proxy error");
  return data?.content?.find(c => c.type === "text")?.text || "";
}
