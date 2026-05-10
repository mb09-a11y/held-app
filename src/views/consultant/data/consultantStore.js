// ─── consultantStore.js ───────────────────────────────────────────────────────
// All data hooks for the consultant side — backed by Supabase.
// Each hook returns the same shape as before so UI components need no changes.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase.js";

// Inlined so consultantStore has zero imports from the app module tree,
// which prevents Vite's circular dependency warning.
const genId = () => Math.random().toString(36).slice(2, 10);

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Reads the authenticated user directly from Supabase auth — no AppCtx dependency.
// This avoids the circular import that happens when consultantStore → shared → RCCShell → consultant views → consultantStore.
function useCurrentUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    // Try immediately. If the Supabase client was just reinitialized (tab restore),
    // the session may not be hydrated yet — retry once after 800ms if null.
    let retryTimer = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        retryTimer = setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s2 } }) => {
            setUser(s2?.user ?? null);
          });
        }, 800);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      clearTimeout(retryTimer);
      subscription.unsubscribe();
    };
  }, []);
  return user;
}

function calcAgeLabel(dob) {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44));
  if (months < 24) return `${months} months`;
  const years = Math.floor(months / 12);
  const rem   = months % 12;
  return rem > 0 ? `${years}y ${rem}mo` : `${years} years`;
}

function deriveUrgency(nsState) {
  if (nsState === "overwhelmed") return "urgent";
  if (nsState === "activated")   return "watch";
  return "good";
}

// Map a Supabase family row + its children + latest message into the
// shape the consultant UI expects.
function normalizeFamilyRow(fam, children = [], lastMsg = null, nsCheckins = []) {
  // Latest NS state comes from the most recent regulation_checkin for this family
  const latestNS = nsCheckins[0];
  const nsState = latestNS?.state
    ? (latestNS.state.includes("overwhelmed") || latestNS.state.includes("activated")
        ? latestNS.state.split("_")[0]
        : "regulated")
    : "regulated";

  // NS trend: last 5 check-ins mapped to 1–5 scale
  const nsTrend = nsCheckins.slice(0, 5).reverse().map(c => {
    if (c.state?.includes("overwhelmed")) return 4;
    if (c.state?.includes("activated"))   return 3;
    return 2;
  });

  const normalizedChildren = children.map(child => ({
    id: child.id,
    name: child.name || "Child",
    age: calcAgeLabel(child.dob) || child.age_label || "—",
    dob: child.dob,
    emoji: child.emoji || "🌙",
    status: child.sleep_status || "good",
    planId: child.id, // plan is keyed by child ID in the Supabase model
    method: child.sleep_method || null,
    planDay: child.plan_day || null,
  }));

  // Generate a simple insight from real data
  const urgency = deriveUrgency(nsState);
  const childSummary = normalizedChildren.length
    ? normalizedChildren.map(c => {
        if (c.status === "urgent") return `${c.name} — needs attention`;
        if (c.status === "watch")  return `${c.name} — monitor tonight`;
        return `${c.name} — on track`;
      }).join(". ")
    : null;

  const insight = childSummary
    || (nsState === "overwhelmed" ? "Parent in overwhelm — reach out today."
      : nsState === "activated"   ? "Parent NS activated — check in proactively."
      : "All on track — no action needed.");

  return {
    id: fam.id,
    name: fam.display_name || fam.invite_email || "Family",
    parents: fam.parent_name || fam.invite_email || "—",
    nsState,
    nsTrend: nsTrend.length > 0 ? nsTrend : [2, 2, 2, 2, 2],
    nsNote: latestNS?.notes || "",
    nsCheckinTime: latestNS?.checked_in_at || null,
    children: normalizedChildren,
    lastMessage: lastMsg?.content || fam.last_message || "",
    lastMessageTime: lastMsg?.created_at
      ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : "",
    unread: fam.has_unread || false,
    urgency,
    intake_complete: fam.intake_complete || false,
    insight,
    flags: normalizedChildren.filter(c => c.status === "urgent").map(c => `${c.name}: needs attention`),
    positives: normalizedChildren.filter(c => c.status === "good").map(c => `${c.name}: on track`),
    consultant_id: fam.consultant_id,
    parent_id: fam.parent_id,
    sleep_plan_profile: fam.sleep_plan_profile,
    sleep_progress: fam.sleep_progress,
  };
}

// ─── useFamilies ──────────────────────────────────────────────────────────────
// Returns the consultant's assigned families with children, NS state, and
// last message — the same shape SEED_FAMILIES used to provide.

export function useFamilies() {
  const user = useCurrentUser();
  const [families, setFamilies] = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    // Get user directly from session to avoid stale closure race condition
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    try {
      // 1. Families assigned to this consultant
      const { data: fams = [] } = await supabase
        .from("families")
        .select("*")
        .eq("consultant_id", userId)
        .order("created_at", { ascending: false });

      if (!fams.length) { setFamilies([]); setLoading(false); return; }

      const famIds = fams.map(f => f.id);

      // 2. All children for these families
      const { data: allChildren = [] } = await supabase
        .from("children")
        .select("*")
        .in("family_id", famIds);

      // 3. Latest message per family (last 1 per family)
      const { data: allMessages = [] } = await supabase
        .from("messages")
        .select("family_id, content, created_at, sender_role")
        .in("family_id", famIds)
        .order("created_at", { ascending: false });

      // 4. NS check-ins (regulation_checkins) for these families — last 10 each
      const { data: allCheckins = [] } = await supabase
        .from("regulation_checkins")
        .select("family_id, state, notes, checked_in_at")
        .in("family_id", famIds)
        .order("checked_in_at", { ascending: false })
        .limit(50);

      // 5. Parent profiles for display names
      const parentIds = fams.map(f => f.parent_id).filter(Boolean);
      const { data: parentProfiles = [] } = parentIds.length
        ? await supabase.from("profiles").select("id, name").in("id", parentIds)
        : { data: [] };

      const profileMap = Object.fromEntries(parentProfiles.map(p => [p.id, p]));

      // Group by family ID
      const childrenByFamily  = {};
      const messagesByFamily  = {};
      const checkinsByFamily  = {};

      for (const c of allChildren) {
        (childrenByFamily[c.family_id] ||= []).push(c);
      }
      for (const m of allMessages) {
        // Only keep the first (most recent) per family
        if (!messagesByFamily[m.family_id]) messagesByFamily[m.family_id] = m;
      }
      for (const c of allCheckins) {
        (checkinsByFamily[c.family_id] ||= []).push(c);
      }

      const normalized = fams.map(fam => {
        const enriched = {
          ...fam,
          parent_name: profileMap[fam.parent_id]?.name || fam.display_name,
        };
        return normalizeFamilyRow(
          enriched,
          childrenByFamily[fam.id] || [],
          messagesByFamily[fam.id] || null,
          checkinsByFamily[fam.id] || []
        );
      });

      // Sort: urgent first, then watch, then good
      const urgencyOrder = { urgent: 0, watch: 1, good: 2 };
      normalized.sort((a, b) => (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3));

      setFamilies(normalized);
    } catch (err) {
      console.error("[useFamilies]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { families, setFamilies, loading, reload: load };
}

// ─── usePlans ─────────────────────────────────────────────────────────────────
// Plans are stored on families.sleep_plan_profile (JSON) and
// families.sleep_progress (JSON checkbox state).
// planId === childId in the real model.

export function usePlans() {
  // Plans are loaded per-child in the PlanTab — this hook provides
  // the mutation helpers that PlanTab and SleepDataTab call.
  // The plan object is: { id, method, methodLabel, phases, napCapMinutes, ... }
  // keyed by childId (which doubles as planId).

  const [localPlans, setLocalPlans] = useState({});

  const updatePlan = useCallback(async (planId, updater) => {
    // planId is the child's ID; family ID is on the plan object itself
    setLocalPlans(prev => {
      const current = prev[planId] || {};
      const updated = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      // Fire-and-forget Supabase write using the familyId on the plan
      if (updated.familyId) {
        supabase.from("families")
          .update({ sleep_plan_profile: updated })
          .eq("id", updated.familyId)
          .then(({ error }) => { if (error) console.error("[usePlans] updatePlan:", error); });
      }
      return { ...prev, [planId]: updated };
    });
  }, []);

  const toggleItem = useCallback(async (planId, phaseId, itemId) => {
    setLocalPlans(prev => {
      const plan = prev[planId];
      if (!plan) return prev;
      const updated = {
        ...plan,
        phases: plan.phases.map(ph =>
          ph.id !== phaseId ? ph : {
            ...ph,
            items: ph.items.map(it =>
              it.id !== itemId ? it : { ...it, done: !it.done }
            ),
          }
        ),
      };
      // Persist progress
      if (updated.familyId) {
        const progress = {};
        for (const ph of updated.phases) {
          for (const it of ph.items) {
            if (it.done) progress[it.id] = true;
          }
        }
        supabase.from("families")
          .update({ sleep_progress: progress, sleep_plan_profile: updated })
          .eq("id", updated.familyId)
          .catch(err => console.error("[usePlans] toggleItem:", err));
      }
      return { ...prev, [planId]: updated };
    });
  }, []);

  const addConsultantNote = useCallback(async (planId, nightKey, note) => {
    setLocalPlans(prev => {
      const plan = prev[planId];
      if (!plan) return prev;
      const updated = {
        ...plan,
        consultantNotes: { ...plan.consultantNotes, [nightKey]: note },
      };
      if (updated.familyId) {
        supabase.from("families")
          .update({ sleep_plan_profile: updated })
          .eq("id", updated.familyId)
          .catch(err => console.error("[usePlans] addConsultantNote:", err));
      }
      return { ...prev, [planId]: updated };
    });
  }, []);

  const changeMethod = useCallback(async (planId, method, methodLabel) => {
    setLocalPlans(prev => {
      const plan = prev[planId];
      if (!plan) return prev;
      const updated = { ...plan, method, methodLabel };
      if (updated.familyId) {
        supabase.from("families")
          .update({ sleep_plan_profile: updated })
          .eq("id", updated.familyId)
          .catch(err => console.error("[usePlans] changeMethod:", err));
      }
      return { ...prev, [planId]: updated };
    });
  }, []);

  // Seed a plan object into local state (called by PlanTab after loading from Supabase)
  const seedPlan = useCallback((planId, planData) => {
    setLocalPlans(prev => ({ ...prev, [planId]: planData }));
  }, []);

  return { plans: localPlans, updatePlan, toggleItem, addConsultantNote, changeMethod, seedPlan };
}

// ─── useIntake ────────────────────────────────────────────────────────────────
// Returns intake responses keyed by childId, loaded from intake_responses table.

export function useIntake(familyId) {
  const [intake, setIntake] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    supabase
      .from("intake_responses")
      .select("*")
      .eq("family_id", familyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          // Map to the child-keyed shape the UI expects
          // intake_responses has a child_id column; fall back to familyId key
          const key = data.child_id || familyId;
          setIntake({ [key]: data });
        }
        setLoading(false);
      })
      .catch(err => { console.error("[useIntake]", err); setLoading(false); });
  }, [familyId]);

  return { intake, loading };
}

// ─── useSessions ──────────────────────────────────────────────────────────────
// Returns sleep sessions keyed by childId from sleep_logs table.
// rangeDays controls how far back to fetch (7 | 14 | 30)

export function useSessions(familyId, rangeDays = 30, timezone = null) {
  const [sessions, setSessions] = useState({});
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!familyId) { console.warn("[useSessions] no familyId — skipping fetch"); return; }
    console.log("[useSessions] fetching sleep_logs for familyId:", familyId, "rangeDays:", rangeDays);
    setLoading(true);

    const since = new Date(Date.now() - rangeDays * 86400000).toISOString();
    supabase
      .from("sleep_logs")
      .select("*")
      .eq("family_id", familyId)
      .in("type", ["sleep_session", "night_waking"])
      .gte("ts", since)
      .order("ts", { ascending: false })
      .then(({ data = [] }) => {
        const byChild = {};
        for (const row of data) {
          const key = row.child_id || familyId;
          (byChild[key] ||= []).push(
            row.type === "night_waking" ? normalizeWakingLog(row, timezone) : normalizeSleepLog(row, timezone)
          );
        }
        setSessions(byChild);
        setLoading(false);
      })
      .catch(err => { console.error("[useSessions]", err); setLoading(false); });
  }, [familyId, rangeDays, timezone]);

  return { sessions, loading };
}

function normalizeWakingLog(row, tz) {
  return {
    id:          row.id,
    type:        "night_waking",
    emoji:       "🌛",
    date:        tz
      ? new Date(row.ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz })
      : new Date(row.ts).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
    time:        tz
      ? new Date(row.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })
      : new Date(row.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    duration:    row.duration ? `${row.duration}m awake` : "Night waking",
    durationMin: row.duration || 0,
    settling:    "0m",
    settlingMin: 0,
    flag:        null,
    raw:         row,
    tz,
  };
}

function normalizeSleepLog(row, tz) {
  // Use total_sleep_ms if available (most accurate), fall back to ts/end_ts diff
  const durationMs = row.total_sleep_ms
    ? row.total_sleep_ms
    : (row.end_ts && row.ts ? new Date(row.end_ts) - new Date(row.ts) : 0);

  const durationMin = Math.round(durationMs / 60000);
  const durationH   = Math.floor(durationMin / 60);
  const durationM   = durationMin % 60;
  const durationStr = durationH > 0 ? `${durationH}h ${durationM}m` : `${durationM}m`;

  // session_type: "night" = night sleep, anything else (or null) = nap
  const isNight = row.session_type === "night";

  // settling = time from session start to fell_asleep_ts
  const settlingMs  = row.fell_asleep_ts && row.ts
    ? new Date(row.fell_asleep_ts) - new Date(row.ts)
    : 0;
  const settlingMin = Math.max(0, Math.round(settlingMs / 60000));

  return {
    id:          row.id,
    type:        isNight ? "night" : "nap",
    emoji:       isNight ? "🌙" : "☀️",
    date:        tz
      ? new Date(row.ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz })
      : new Date(row.ts).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
    time:        tz
      ? new Date(row.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })
      : new Date(row.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    duration:    durationStr,
    durationMin,
    settling:    settlingMin > 0 ? `${settlingMin}m` : "0m",
    settlingMin,
    flag:        !isNight && durationMin > 120 ? "Long"
               : isNight  && durationH < 8     ? "Short"
               : settlingMin > 30              ? "Long settle"
               : null,
    raw: row,
  };
}

// ─── useNSLog ─────────────────────────────────────────────────────────────────
// Returns regulation check-ins keyed by familyId from regulation_checkins table.

export function useNSLog(familyId) {
  const [nsLog, setNsLog] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    supabase
      .from("regulation_checkins")
      .select("id, state, notes, checked_in_at, family_id")
      .eq("family_id", familyId)
      .order("checked_in_at", { ascending: false })
      .limit(20)
      .then(({ data = [] }) => {
        const normalized = data.map(row => ({
          id: row.id,
          date: new Date(row.checked_in_at).toLocaleDateString([], { month: "short", day: "numeric" }),
          state: normalizeNSState(row.state),
          note: row.notes || "",
        }));
        setNsLog({ [familyId]: normalized });
        setLoading(false);
      })
      .catch(err => { console.error("[useNSLog]", err); setLoading(false); });
  }, [familyId]);

  return { nsLog, loading };
}

function normalizeNSState(state) {
  if (!state) return "regulated";
  if (state.includes("overwhelmed")) return "overwhelmed";
  if (state.includes("activated"))   return "activated";
  return "regulated";
}

// ─── useConsultantNotes ───────────────────────────────────────────────────────
// Reads/writes consultant session notes from consultant_notes table.
// The table stores: { family_id, notes (text), ai_insights (jsonb) }

export function useConsultantNotes(familyId) {
  const user = useCurrentUser();
  const [notes, setNotes]   = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    supabase
      .from("consultant_notes")
      .select("*")
      .eq("family_id", familyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          // Normalize: store as array of note objects keyed by familyId
          // to match the shape addNote produces
          const existing = Array.isArray(data.notes_array)
            ? data.notes_array
            : data.notes
              ? [{ id: data.id, text: data.notes, tags: [], createdAt: data.updated_at }]
              : [];
          setNotes({ [familyId]: existing });
        }
        setLoading(false);
      })
      .catch(err => { console.error("[useConsultantNotes]", err); setLoading(false); });
  }, [familyId]);

  const addNote = useCallback(async (famId, childId, text, tags = []) => {
    const key = childId || famId;
    const newNote = { id: genId(), text, tags, createdAt: new Date().toISOString(), childId };

    // Optimistic update
    setNotes(prev => ({
      ...prev,
      [key]: [newNote, ...(prev[key] || [])],
    }));

    // Persist — upsert keyed on family_id
    try {
      const { data: existing } = await supabase
        .from("consultant_notes")
        .select("notes_array")
        .eq("family_id", famId)
        .maybeSingle();

      const updated = [newNote, ...(existing?.notes_array || [])];
      await supabase
        .from("consultant_notes")
        .upsert({
          family_id: famId,
          consultant_id: (await supabase.auth.getSession()).data.session?.user?.id,
          notes_array: updated,
          updated_at: new Date().toISOString(),
        }, { onConflict: "family_id" });
    } catch (err) {
      console.error("[useConsultantNotes] addNote:", err);
    }
  }, []);

  return { notes, addNote, loading };
}

// ─── useMessages ──────────────────────────────────────────────────────────────
// Reads/writes messages from the real messages table.
// Keyed by familyId to match the shape the UI expects.

export function useMessages() {
  const user = useCurrentUser();
  const [messages, setMessages] = useState({});

  // Load messages for a specific family (called lazily by MessagesTab)
  const loadMessages = useCallback(async (familyId) => {
    if (!familyId) return;
    const { data = [], error } = await supabase
      .from("messages")
      .select("id, content, sender_role, created_at, type")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) { console.error("[useMessages] load:", error); return; }

    const normalized = data.map(row => ({
      id: row.id,
      from: row.sender_role === "consultant" || row.sender_role === "consultant_internal"
        ? "consultant"
        : "parent",
      text: row.content || "",
      time: new Date(row.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    }));

    setMessages(prev => ({ ...prev, [familyId]: normalized }));
  }, []);

  const sendMessage = useCallback(async (familyId, text) => {
    if (!familyId || !text?.trim()) return;

    const optimisticId = `opt_${Date.now()}`;
    const optimistic = { id: optimisticId, from: "consultant", text, time: "Just now" };

    // Optimistic update
    setMessages(prev => ({
      ...prev,
      [familyId]: [...(prev[familyId] || []), optimistic],
    }));

    try {
      const { data: { session: senderSession } } = await supabase.auth.getSession();
      const senderId = senderSession?.user?.id;
      const cachedUser = (() => { try { return JSON.parse(localStorage.getItem("rcc_user") || "{}"); } catch { return {}; } })();
      const rawRole = cachedUser?.role || senderSession?.user?.user_metadata?.role || "consultant";
      // Normalize consultant_internal → consultant for messages constraint
      const senderRole = rawRole === "consultant_internal" ? "consultant" : rawRole;
      const { data, error } = await supabase
        .from("messages")
        .insert({
          family_id: familyId,
          sender_id: senderId,
          sender_role: senderRole,
          content: text,
          type: "text",
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic with real row
      setMessages(prev => ({
        ...prev,
        [familyId]: (prev[familyId] || []).map(m =>
          m.id === optimisticId
            ? { id: data.id, from: "consultant", text: data.content, time: new Date(data.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }
            : m
        ),
      }));
    } catch (err) {
      console.error("[useMessages] sendMessage:", err);
      // Roll back optimistic on failure
      setMessages(prev => ({
        ...prev,
        [familyId]: (prev[familyId] || []).filter(m => m.id !== optimisticId),
      }));
    }
  }, []);

  return { messages, sendMessage, loadMessages };
}

// ─── useSleepStats ────────────────────────────────────────────────────────────
// Derives sleep stats for a child from the sessions hook.
// Signature unchanged — SleepDataTab calls useSleepStats(childId).

export function useSleepStats(childId, familyId, rangeDays = 30, timezone = null) {
  const { sessions } = useSessions(familyId, rangeDays, timezone);
  const childSessions = sessions[childId] || [];
  const nights  = childSessions.filter(s => s.type === "night");
  const naps    = childSessions.filter(s => s.type === "nap");
  // Only count wakings that occurred during nighttime hours (7pm–6am) — excludes nap wakings
  const allWakings = childSessions.filter(s => s.type === "night_waking");
  const wakings = allWakings.filter(s => {
    const h = new Date(s.raw?.ts).getHours();
    return h >= 19 || h < 6;
  });

  // Group wakings by night — a waking between 7PM-6AM belongs to the night that started the previous evening
  // Use the "night date" = date of the evening the night started (roll back if hour < 6)
  const toNightDate = ts => {
    const d = new Date(ts);
    if (d.getHours() < 6) d.setDate(d.getDate() - 1); // early AM → previous night
    return d.toDateString();
  };
  const nightDays = new Set(nights.map(s => toNightDate(s.raw?.ts || s.ts)));
  const wakingDays = [...nightDays].map(d =>
    wakings.filter(w => toNightDate(w.raw?.ts || w.ts) === d).length
  );
  const avgNightWakes = nightDays.size
    ? parseFloat((wakingDays.reduce((a,b)=>a+b,0) / nightDays.size).toFixed(1))
    : wakings.length > 0 ? wakings.length : 0;

  // Avg naps per day
  const napDays = new Set(naps.map(s => new Date(s.date || s.ts).toDateString()));
  const avgNapCount = napDays.size
    ? parseFloat((naps.length / napDays.size).toFixed(1))
    : 0;

  const parseMin = str => {
    if (!str || str === "—") return 0;
    const h = (str.match(/(\d+)h/) || [0, 0])[1];
    const m = (str.match(/(\d+)m/) || [0, 0])[1];
    return Number(h) * 60 + Number(m);
  };

  const avg = arr => arr.length
    ? Math.round(arr.reduce((a, s) => a + parseMin(s), 0) / arr.length)
    : 0;

  const fmtMin = m => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  // Actual sleep time per night = session duration minus total waking time during that night
  const nightActualMins = nights.map(s => {
    const nightDate = toNightDate(s.raw?.ts || s.ts);
    const wakingMinsThisNight = wakings
      .filter(w => toNightDate(w.raw?.ts || w.ts) === nightDate)
      .reduce((sum, w) => sum + (w.raw?.duration || 0), 0);
    return Math.max(0, s.durationMin - wakingMinsThisNight);
  });

  const avgNight    = nightActualMins.length ? nightActualMins.reduce((a,b)=>a+b,0) / nightActualMins.length : 0;
  const avgNap      = naps.length ? Math.round(naps.reduce((a,s)=>a+s.durationMin,0) / naps.length) : 0;
  const avgSettling = nights.filter(s=>s.settlingMin>0).length
    ? Math.round(nights.filter(s=>s.settlingMin>0).reduce((a,s)=>a+s.settlingMin,0) / nights.filter(s=>s.settlingMin>0).length)
    : 0;
  const flaggedNaps = naps.filter(s => s.flag === "Long").length;

  // Group naps by position within each calendar day to build per-slot stats
  const napsByDay = {};
  [...naps].sort((a, b) => new Date(a.raw?.ts || 0) - new Date(b.raw?.ts || 0)).forEach(s => {
    const day = new Date(s.raw?.ts).toDateString();
    (napsByDay[day] ||= []).push(s);
  });
  const daysWithNapData = Object.values(napsByDay);
  const maxNapSlot = (() => {
    let max = 0;
    for (let i = 0; i < 4; i++) {
      const daysWithSlot = daysWithNapData.filter(d => d[i]).length;
      if (daysWithSlot >= 2) max = i + 1;
      else break;
    }
    return Math.max(max, naps.length > 0 ? 1 : 0);
  })();
  const napSlots = Array.from({ length: maxNapSlot }, (_, idx) => {
    const slotSessions = daysWithNapData.map(d => d[idx]).filter(Boolean);
    const avgDurMin = slotSessions.length
      ? Math.round(slotSessions.reduce((a, s) => a + s.durationMin, 0) / slotSessions.length) : 0;
    const withSettle = slotSessions.filter(s => s.settlingMin > 0);
    const avgSettleMin = withSettle.length
      ? Math.round(withSettle.reduce((a, s) => a + s.settlingMin, 0) / withSettle.length) : 0;
    const recent = slotSessions.slice(-7);
    // x-axis labels: short weekday from each session date
    const xLabels = recent.map(s => {
      const raw = s.raw?.ts;
      if (!raw) return "";
      return new Date(raw).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
    });
    return {
      label: "Nap " + (idx + 1),
      avgDurStr: fmtMin(avgDurMin),
      avgSettleStr: avgSettleMin > 0 ? fmtMin(avgSettleMin) : "—",
      avgDurMin,
      avgSettleMin,
      durSeries:    recent.map(s => s.durationMin),
      settleSeries: recent.map(s => s.settlingMin),
      xLabels,
      flaggedCount: slotSessions.filter(s => s.flag === "Long").length,
      sessionCount: slotSessions.length,
    };
  });

  return {
    avgNightStr:    fmtMin(avgNight),
    avgNapStr:      fmtMin(avgNap),
    avgSettlingStr: fmtMin(avgSettling),
    avgNightWakes,
    avgNapCount,
    flaggedNaps,
    napSlots,
    sessions: childSessions,
    nights,
    naps,
  };
}
