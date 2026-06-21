// src/modules/sleep/sleepHelpers.js
// Shared constants, helpers, Supabase data layer, and wake window tables.
// Imported by SleepLog.jsx and all sub-view files.

import { supabase } from "../../lib/supabase.js";
import { SleepLogsCache, FamilyStateCache, NextSleepCache } from "../../lib/heldCache.js";
import { font, serif } from "../../core/shared.jsx";

export { font, serif };

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
export const C = {
  teal: "#7B9EA8", mauve: "#A8907B", purple: "#8A7BAA", sage: "#7BAA8A",
  warm: "#AA9B7B", rose: "#A87B8A", sky: "#7B8FAA", amber: "#A89B5A",
};

export const MOODS = [
  { id: "great",  label: "Great",  emoji: "😄", color: C.sage   },
  { id: "good",   label: "Good",   emoji: "🙂", color: C.teal   },
  { id: "okay",   label: "Okay",   emoji: "😐", color: C.warm   },
  { id: "fussy",  label: "Fussy",  emoji: "😤", color: C.mauve  },
  { id: "rough",  label: "Rough",  emoji: "😢", color: C.rose   },
];

export const POOP_TYPES = ["Normal/Mustardy", "Green", "Watery", "Hard/Pellets", "Mucousy", "Bloody"];

// ─── SUPABASE DATA LAYER ──────────────────────────────────────────────────────
export async function fetchLogs(familyId) {
  if (!familyId) return [];
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("sleep_logs").select("*").eq("family_id", familyId)
    .gte("ts", since).order("ts", { ascending: false });
  if (error) { console.error("[SleepLog] fetchLogs:", error); return []; }
  return data || [];
}

export async function insertLog(familyId, entry) {
  if (!familyId) { console.error("[SleepLog] insertLog: no familyId"); return null; }
  const { id: _localId, ...rest } = entry;
  const safeEntry = { ...rest, family_id: familyId, ts: rest.ts || new Date().toISOString() };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase.from("sleep_logs").insert(safeEntry).select().single();
    if (!error) {
      // Invalidate sleep caches so next render fetches fresh data
      SleepLogsCache.invalidateFamily(familyId);
      FamilyStateCache.invalidateCachePrefix?.(`familyState:${familyId}`) ||
        (() => { try { Object.keys(localStorage).filter(k => k.startsWith(`held:familyState:${familyId}`)).forEach(k => localStorage.removeItem(k)); } catch {} })();
      NextSleepCache.invalidate(familyId, safeEntry.child_id || null);
      return data;
    }
    console.error(`[SleepLog] insertLog attempt ${attempt}:`, JSON.stringify(error));
    if (attempt < 3) await new Promise(r => setTimeout(r, 800 * attempt));
  }
  return null;
}

export async function updateLog(id, changes) {
  const { error } = await supabase.from("sleep_logs").update(changes).eq("id", id);
  if (error) console.error("[SleepLog] updateLog:", error);
}

export async function deleteLog(id) {
  const { error } = await supabase.from("sleep_logs").delete().eq("id", id);
  if (error) console.error("[SleepLog] deleteLog:", error);
}

export async function fetchConfig(familyId) {
  if (!familyId) return null;
  const { data } = await supabase.from("sleep_configs").select("*").eq("family_id", familyId).maybeSingle();
  if (!data) return null;
  return {
    ...data,
    recommendedWakeWindows: data.recommended_wake_windows || null,
    napDurations: data.nap_durations || null,
    targetMorningWake: data.target_morning_wake || null,
    method: data.method || "Gradual Withdrawal",
  };
}

export async function upsertConfig(familyId, config) {
  await supabase.from("sleep_configs").upsert({
    family_id: familyId,
    recommended_wake_windows: config.recommendedWakeWindows,
    nap_durations: config.napDurations,
    target_morning_wake: config.targetMorningWake || null,
    method: config.method,
    updated_at: new Date().toISOString(),
  }, { onConflict: "family_id" });
}

// ─── WAKE WINDOWS ─────────────────────────────────────────────────────────────
export function defaultWakeWindowsForAge(ageMonths) {
  const weeks = ageMonths * 4.33;
  if (weeks < 4)      return [0.75, 0.75, 0.75, 0.75, 0.75, 1.0];
  if (weeks < 12)     return [1.0, 1.0, 1.25, 1.25, 1.5, 1.75];
  if (ageMonths < 5)  return [1.25, 1.5, 1.75, 2.0, 2.25];
  if (ageMonths < 7)  return [2.0, 2.25, 2.75, 3.0];
  if (ageMonths < 11) return [2.5, 3.0, 3.5];
  if (ageMonths < 14) return [3.0, 4.0];
  if (ageMonths < 37) return [4.5, 5.75];
  return [11.0];
}

export function defaultNapDurationsForAge(ageMonths) {
  const weeks = ageMonths * 4.33;
  if (weeks < 4)      return [60, 60, 120];
  if (weeks < 12)     return [60, 70, 120];
  if (ageMonths < 5)  return [60, 70, 90];
  if (ageMonths < 7)  return [60, 65, 90];
  if (ageMonths < 11) return [60, 70, 90];
  if (ageMonths < 14) return [60, 80, 90];
  if (ageMonths < 37) return [60, 90, 90];
  return [0, 0, 0];
}

// ─── DATE / TIME HELPERS ──────────────────────────────────────────────────────
export function calculateAge(birthDate) {
  if (!birthDate) return { years: 0, months: 0 };
  const today = new Date(), birth = new Date(birthDate);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (today.getDate() < birth.getDate()) { months--; if (months < 0) { years--; months += 12; } }
  return { years: Math.max(0, years), months: Math.max(0, months) };
}

export function calcAgeMonths(dob) {
  if (!dob) return null;
  const birth = new Date(dob), now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let mos = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) mos--;
  if (mos < 0) { years--; mos += 12; }
  return years * 12 + mos;
}

export function localDateStr(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function isWithin24h(ts) { return new Date(ts) > new Date(Date.now() - 86400000); }
export function isWithin7Days(ts) { return new Date(ts) > new Date(Date.now() - 7 * 86400000); }
export function isToday(ts) { return new Date(ts).toDateString() === new Date().toDateString(); }
export function isSameDay(t1, t2) { return new Date(t1).toDateString() === new Date(t2).toDateString(); }

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
export function fmtDateTime(iso) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
    + " · " + fmtTime(iso);
}

// Timezone-aware versions for consultant views — always renders in the FAMILY's timezone.
// Pass the family's `timezone` string (e.g. "America/Chicago"). Falls back to local if absent.
export function fmtTimeTz(iso, tz) {
  if (!tz) return fmtTime(iso);
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: tz });
}
export function fmtDateTimeTz(iso, tz) {
  if (!tz) return fmtDateTime(iso);
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz });
  const timePart = fmtTimeTz(iso, tz);
  return `${datePart} · ${timePart}`;
}
// Same as isToday() but evaluated in the family's timezone
export function isTodayTz(ts, tz) {
  if (!tz) return isToday(ts);
  const opts = { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" };
  const fmt = d => new Date(d).toLocaleDateString("en-CA", opts); // YYYY-MM-DD
  return fmt(ts) === fmt(new Date());
}
export function fmtDuration(mins) {
  const m = Math.abs(Math.round(mins));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export function logIcon(l) {
  if (l.type === "sleep_session") return "💤";
  if (l.type === "night_waking") return "🌛";
  if (l.type === "feed" && l.mode === "nursing") return "🤱";
  if (l.type === "feed" && l.mode === "pump") return "🫙";
  if (l.type === "feed") return "🍼";
  if (l.type === "diaper") return l.sub_type === "dirty" ? "💩" : "💦";
  if (l.type === "solids") return "🍲";
  if (l.type === "medicine") return "💊";
  if (l.type === "growth") return "📏";
  if (l.type === "wellness" && l.sub_type === "teething") return "🦷";
  if (l.type === "wellness" && l.sub_type === "temperature") return "🌡️";
  if (l.type === "wellness") return "🤒";
  return "📋";
}

export function logLabel(l) {
  if (l.type === "sleep_session") return l.end_ts ? "Sleep session" : "Sleeping…";
  if (l.type === "night_waking") return `Night waking${l.description ? " · " + l.description : ""}`;
  if (l.type === "feed" && l.mode === "nursing") return `Nursing ${l.side || ""}`.trim();
  if (l.type === "feed" && l.mode === "pump") return `Pump ${l.amount ? l.amount + "oz" : ""}`.trim();
  if (l.type === "feed") return `Bottle ${l.amount || ""}oz`;
  if (l.type === "diaper") return l.sub_type === "dirty" ? `Dirty: ${l.description || ""}` : "Wet diaper";
  if (l.type === "solids") return `${l.food}`;
  if (l.type === "medicine") return `${l.description || "Medicine"}${l.amount ? " · " + l.amount : ""}`;
  if (l.type === "growth") return `Weight: ${l.amount ? l.amount + " lbs" : "—"}${l.description ? " · " + l.description + '"' : ""}`;
  if (l.type === "wellness" && l.sub_type === "teething") return `Teething${l.description ? " · " + l.description : ""}`;
  if (l.type === "wellness" && l.sub_type === "temperature") return `Temp: ${l.food || ""}${l.description ? " · " + l.description : ""}`;
  if (l.type === "wellness") return `${l.sub_type === "potentially_sick" ? "Potentially sick" : "Sick"}${l.description ? " · " + l.description : ""}`;
  return l.type;
}

// ─── SHARED NEXT SLEEP HOOK ───────────────────────────────────────────────────
// Used by both HeldHome and TodayView so they always show the same value.
import { useState, useEffect } from "react";

export function useNextSleep(familyId, childId, childDob, timezone = null) {
  const [result, setResult] = useState({
    nextSleepStr: null,
    minsUntil: null,
    window_: null,
    isSleeping: false,
    openSession: null,
  });

  useEffect(() => {
    if (!familyId) return;
    const since = new Date(Date.now() - 14 * 86400000).toISOString();

    // Timezone-aware helpers
    const tzOpts = timezone ? { timeZone: timezone } : {};
    const tzDateKey = ts => new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", ...tzOpts });
    const tzHour    = ts => parseInt(new Date(ts).toLocaleString("en-US", { hour: "numeric", hour12: false, ...tzOpts }), 10);

    Promise.all([
      (() => {
        let q = supabase.from("sleep_logs").select("id, ts, end_ts, type, session_type, fell_asleep_ts")
          .eq("family_id", familyId).gte("ts", since).order("ts", { ascending: false });
        if (childId) q = q.eq("child_id", childId);
        return q;
      })(),
      supabase.from("sleep_configs").select("recommended_wake_windows").eq("family_id", familyId).maybeSingle(),
    ]).then(([{ data: logs }, { data: cfg }]) => {
      const allLogs = logs || [];
      const nowMs = Date.now();
      const FUTURE_TOL = 5 * 60 * 1000;
      const todayKey = tzDateKey(nowMs);

      // Open session = currently sleeping
      const openSession = allLogs.find(l => l.type === "sleep_session" && !l.end_ts) || null;

      // Completed sessions
      const completed = allLogs.filter(l =>
        l.type === "sleep_session" && l.end_ts &&
        Number.isFinite(new Date(l.end_ts).getTime()) &&
        new Date(l.end_ts).getTime() <= nowMs + FUTURE_TOL
      ).sort((a, b) => new Date(b.end_ts) - new Date(a.end_ts));

      // Nap count today — evaluated in family timezone
      const napCount = allLogs.filter(l => {
        if (l.type !== "sleep_session") return false;
        if (tzDateKey(l.ts) !== todayKey) return false;
        if (l.session_type === "night") return false;
        if (l.session_type === "nap") return true;
        return tzHour(l.ts) >= 6;
      }).length;

      // Last wake reference — always use the most recently completed session
      // regardless of type. The previous logic (lastNight when napCount===0)
      // caused wildly incorrect windows when night sleep wasn't logged recently
      // but a nap was (e.g. showed 103h overdue because it anchored to a
      // Wednesday night instead of Sunday's nap).
      const lastWakeUp = completed[0] || null;

      // Wake windows — consultant config first, then age-based
      const ageMonths = childDob
        ? (() => { const b = new Date(childDob), n = new Date(); let y = n.getFullYear()-b.getFullYear(), m = n.getMonth()-b.getMonth(); if(n.getDate()<b.getDate())m--; if(m<0){y--;m+=12;} return y*12+m; })()
        : null;
      const ageWindows = ageMonths !== null ? defaultWakeWindowsForAge(ageMonths) : [1.5, 2.0, 2.5, 3.0];
      const effectiveWindows = cfg?.recommended_wake_windows || ageWindows;
      const window_ = effectiveWindows[napCount] ?? effectiveWindows[effectiveWindows.length - 1];

      // Suggested next sleep — formatted in family timezone
      const suggestedTs = lastWakeUp
        ? new Date(new Date(lastWakeUp.end_ts).getTime() + window_ * 3600000)
        : null;
      const nextSleepStr = suggestedTs
        ? suggestedTs.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", ...tzOpts })
        : null;
      const minsUntil = suggestedTs
        ? Math.round((suggestedTs.getTime() - Date.now()) / 60000)
        : null;

      setResult({ nextSleepStr, minsUntil, window_, isSleeping: !!openSession, openSession });
    });
  }, [familyId, childId, childDob, timezone]);

  return result;
}
