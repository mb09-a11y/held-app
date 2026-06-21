// src/hooks/useSOSSession.js
// ─────────────────────────────────────────────────────────────────────────────
// Manages all Supabase reads/writes for a single SOS co-regulation session.
//
// PATTERN:
//   - Session row is CREATED the moment the parent selects a parent state.
//     This means partial sessions are always captured for insights.
//   - Subsequent screens UPDATE the same row via the session ID.
//   - One row per session — never multiple inserts.
//
// USAGE:
//   const { sessionId, createSession, updateSession } = useSOSSession();
//
//   // Screen 1 — parent taps a feeling:
//   await createSession({ parentState: "twitchy_wired", userId, familyId, childId });
//
//   // Screen 2 — parent completes reset:
//   await updateSession({ resetType: "A", resetCompleted: true });
//
//   // Screen 3 — parent reads child state:
//   await updateSession({ childState: "flooded", childAgeBand: "3_5y" });
//
//   // Screen 4 — game served + completed:
//   await updateSession({ gameKey: "the_secret_flooded", gameCompleted: true });
//
//   // Screen 5 — full session complete:
//   await updateSession({ sessionCompleted: true });
//
//   // Repair flow used:
//   await updateSession({ repairFlowUsed: true });
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

export function useSOSSession() {
  const [sessionId, setSessionId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  // ── createSession ───────────────────────────────────────────────────────────
  // Called on Screen 1 when the parent selects their state.
  // Creates the initial row and stores the session ID for all future updates.
  //
  // Required: userId, familyId, parentState
  // Optional: childId, parentSubstate

  const createSession = useCallback(async ({
    userId,
    familyId,
    childId = null,
    parentState,
    parentSubstate = null,
  }) => {
    if (!userId || !familyId || !parentState) {
      console.warn("[useSOSSession] createSession missing required fields");
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      const now = new Date();
      const { data, error: insertError } = await supabase
        .from("sos_sessions")
        .insert({
          user_id:         userId,
          family_id:       familyId,
          child_id:        childId,
          parent_state:    parentState,
          parent_substate: parentSubstate,
          hour_of_day:     now.getHours(),
          created_at:      now.toISOString(),
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      setSessionId(data.id);
      return data.id;
    } catch (err) {
      // Silent failure — never block the parent from the SOS flow
      console.error("[useSOSSession] createSession error:", err);
      setError(err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // ── updateSession ───────────────────────────────────────────────────────────
  // Called at each subsequent screen to update the existing session row.
  // Silently no-ops if no sessionId exists (e.g. if createSession failed).
  //
  // Accepts any subset of updatable fields:
  //   resetType, resetCompleted,
  //   childState, childAgeBand,
  //   gameKey, gameCompleted,
  //   repairFlowUsed, sessionCompleted

  const updateSession = useCallback(async (fields = {}) => {
    if (!sessionId) {
      // createSession may have failed silently — don't block the flow
      return;
    }

    // Map camelCase fields to snake_case column names
    const mapped = {};
    if (fields.resetType       !== undefined) mapped.reset_type       = fields.resetType;
    if (fields.resetCompleted  !== undefined) mapped.reset_completed  = fields.resetCompleted;
    if (fields.childState      !== undefined) mapped.child_state      = fields.childState;
    if (fields.childAgeBand    !== undefined) mapped.child_age_band   = fields.childAgeBand;
    if (fields.gameKey         !== undefined) mapped.game_key         = fields.gameKey;
    if (fields.gameCompleted   !== undefined) mapped.game_completed   = fields.gameCompleted;
    if (fields.repairFlowUsed  !== undefined) mapped.repair_flow_used = fields.repairFlowUsed;
    if (fields.sessionCompleted !== undefined) mapped.session_completed = fields.sessionCompleted;

    if (Object.keys(mapped).length === 0) return;

    setIsUpdating(true);

    try {
      const { error: updateError } = await supabase
        .from("sos_sessions")
        .update(mapped)
        .eq("id", sessionId);

      if (updateError) throw updateError;
    } catch (err) {
      // Silent failure — never block the parent from the SOS flow
      console.error("[useSOSSession] updateSession error:", err);
      setError(err);
    } finally {
      setIsUpdating(false);
    }
  }, [sessionId]);

  // ── resetSession ────────────────────────────────────────────────────────────
  // Clears local session state when the SOS modal is closed.
  // Does NOT delete the Supabase row — partial sessions are valuable for insights.

  const resetSession = useCallback(() => {
    setSessionId(null);
    setError(null);
  }, []);

  return {
    sessionId,
    isCreating,
    isUpdating,
    error,
    createSession,
    updateSession,
    resetSession,
  };
}
