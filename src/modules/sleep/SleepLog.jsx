import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useT, useApp, font, serif, genId } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  teal: "#7B9EA8", mauve: "#A8907B", purple: "#8A7BAA", sage: "#7BAA8A",
  warm: "#AA9B7B", rose: "#A87B8A", sky: "#7B8FAA", amber: "#A89B5A"
};

const MOODS = [
  { id: "great",  label: "Great",  emoji: "😄", color: C.sage   },
  { id: "good",   label: "Good",   emoji: "🙂", color: C.teal   },
  { id: "okay",   label: "Okay",   emoji: "😐", color: C.warm   },
  { id: "fussy",  label: "Fussy",  emoji: "😤", color: C.mauve  },
  { id: "rough",  label: "Rough",  emoji: "😢", color: C.rose   },
];

const POOP_TYPES = ["Normal/Mustardy", "Green", "Watery", "Hard/Pellets", "Mucousy", "Bloody"];

// ─── SHARED UI PRIMITIVES ─────────────────────────────────────────────────────
function Card({ children, style = {}, onClick }) {
  const T = useT();
  return (
    <div
      onClick={onClick}
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "16px 18px",
        backdropFilter: "blur(8px)",
        transition: "box-shadow 0.2s, transform 0.15s",
        ...(onClick ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "default", outline = false, size = "md", disabled = false, style = {} }) {
  const T = useT();
  const colorMap = {
    teal: C.teal, purple: C.purple, sage: C.sage,
    sky: C.sky, mauve: C.mauve, rose: C.rose, amber: C.amber,
    default: T.teal || C.teal,
  };
  const col = colorMap[variant] || colorMap.default;
  const [hovered, setHovered] = useState(false);

  const baseStyle = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    fontFamily: font, fontWeight: 600, border: "none", borderRadius: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.18s ease",
    fontSize: size === "sm" ? 12 : size === "lg" ? 15 : 13.5,
    padding: size === "sm" ? "7px 14px" : size === "lg" ? "14px 24px" : "10px 18px",
    letterSpacing: "0.01em",
    ...(outline
      ? { background: hovered ? `${col}18` : "transparent", border: `1.5px solid ${col}55`, color: col }
      : { background: hovered ? col : `${col}dd`, color: "#fff", boxShadow: hovered ? `0 4px 16px ${col}55` : `0 2px 8px ${col}30` }
    ),
    transform: hovered && !disabled ? "translateY(-1px)" : "none",
    ...style,
  };

  return (
    <button
      style={baseStyle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

function Pill({ label, active, color, onClick }) {
  const T = useT();
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: 20, fontSize: 12, fontFamily: font,
        fontWeight: active ? 700 : 400, cursor: "pointer", transition: "all 0.18s",
        border: `1.5px solid ${active ? color : T.border}`,
        background: active ? `${color}22` : "transparent",
        color: active ? color : T.muted,
      }}
    >
      {label}
    </button>
  );
}

function Divider() {
  const T = useT();
  return <div style={{ height: 1, background: T.border, margin: "8px 0" }} />;
}

function SectionLabel({ children }) {
  const T = useT();
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>
      {children}
    </p>
  );
}

// ─── INLINE INPUT MODAL ───────────────────────────────────────────────────────
// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ message, icon, visible }) {
  const T = useT();
  if (!visible) return null;
  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
      zIndex: 999, pointerEvents: "none",
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 18px", borderRadius: 24,
      background: T.bg === "#0f1218" ? "rgba(30,40,50,0.96)" : "rgba(44,36,32,0.92)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      backdropFilter: "blur(8px)",
      animation: "toastIn .2s ease",
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>
        {message}
      </span>
    </div>
  );
}

function InputSheet({ title, fields, onConfirm, onCancel }) {
  const T = useT();
  const [vals, setVals] = useState(() => fields.reduce((a, f) => ({ ...a, [f.key]: f.default ?? "" }), {}));

  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 10, fontFamily: font, fontSize: 14,
    background: T.inputBg, border: `1.5px solid ${T.border}`, color: T.text,
    outline: "none", transition: "border 0.18s",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: T.overlayBg, display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        background: T.modalBg, borderRadius: "20px 20px 0 0", padding: "24px 24px 36px",
        width: "100%", maxWidth: 480,
        animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 20px" }} />
        <h3 style={{ fontFamily: serif, fontSize: 18, marginBottom: 18, color: T.headingText }}>{title}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>{f.label}</label>
              {f.type === "select" ? (
                <select value={vals[f.key]} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))} style={inputStyle}>
                  <option value="">Choose…</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={f.type === "date" ? "date" : f.type === "time" ? "time" : f.type === "number" ? "number" : "text"}
                  value={vals[f.key]} placeholder={f.placeholder || ""}
                  onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <Btn onClick={onCancel} outline style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={() => onConfirm(vals)} variant="teal" style={{ flex: 2 }}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── SUPABASE DATA LAYER ──────────────────────────────────────────────────────
async function fetchLogs(familyId) {
  if (!familyId) return [];
  // 14 days — avoids timezone-edge misses and covers overnight sessions
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("family_id", familyId)
    .gte("ts", since)
    .order("ts", { ascending: false });
  if (error) { console.error("[SleepLog] fetchLogs:", error); return []; }
  return data || [];
}

async function insertLog(familyId, entry) {
  if (!familyId) { console.error("[SleepLog] insertLog: no familyId"); return null; }
  const { id: _localId, ...rest } = entry;
  const safeEntry = {
    ...rest,
    family_id: familyId,
    ts: rest.ts || new Date().toISOString(),
  };
  // Retry up to 3 times on network blip
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase
      .from("sleep_logs")
      .insert(safeEntry)
      .select()
      .single();
    if (!error) return data;
    console.error(`[SleepLog] insertLog attempt ${attempt}:`, JSON.stringify(error));
    if (attempt < 3) await new Promise(r => setTimeout(r, 800 * attempt));
  }
  return null;
}

async function updateLog(id, changes) {
  const { error } = await supabase.from("sleep_logs").update(changes).eq("id", id);
  if (error) console.error("[SleepLog] updateLog:", error);
}

async function deleteLog(id) {
  const { error } = await supabase.from("sleep_logs").delete().eq("id", id);
  if (error) console.error("[SleepLog] deleteLog:", error);
}

async function fetchConfig(familyId) {
  if (!familyId) return null;
  const { data } = await supabase.from("sleep_configs").select("*").eq("family_id", familyId).maybeSingle();
  if (!data) return null;
  return {
    ...data,
    recommendedWakeWindows: data.recommended_wake_windows || null, // null = use age-based defaults
    napDurations: data.nap_durations || null,                      // null = use age-based defaults
    targetMorningWake: data.target_morning_wake || null,
    method: data.method || "Gradual Withdrawal",
  };
}

async function upsertConfig(familyId, config) {
  await supabase.from("sleep_configs").upsert({
    family_id: familyId,
    recommended_wake_windows: config.recommendedWakeWindows,
    nap_durations: config.napDurations,
    target_morning_wake: config.targetMorningWake || null,
    method: config.method,
    updated_at: new Date().toISOString(),
  }, { onConflict: "family_id" });
}

// ─── ROOT MODULE ──────────────────────────────────────────────────────────────
export function SleepLog({ user, activeFamily, initialTab }) {
  const T = useT();
  const { activeChild } = useApp();
  const [tab, setTab] = useState(initialTab || "dashboard");
  const [dbPin, setDbPin] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [config, setConfigState] = useState({
    recommendedWakeWindows: null,  // null = use age-based defaults
    napDurations: null,            // null = use age-based defaults
    targetMorningWake: null,
    method: "Gradual Withdrawal",
  });

  const familyId = activeFamily?.id;

  // ── LOAD DATA ──
 useEffect(() => {
  if (!familyId) {
    setLoadingLogs(false);
    return;
  }
  setLoadingLogs(true);
  Promise.all([
    fetchLogs(familyId),
    fetchConfig(familyId),
    supabase.from("intake_responses").select("ideal_wake_time, wake_time").eq("family_id", familyId).maybeSingle()
      .then(({ data }) => data).catch(() => null), // never let intake failure break the whole load
  ]).then(([logData, cfgData, intakeData]) => {
    setLogs(logData);
    const mergedConfig = cfgData || {};
    // Populate targetMorningWake from intake if consultant hasn't set one
    if (!mergedConfig.targetMorningWake && intakeData) {
      mergedConfig.targetMorningWake = intakeData.ideal_wake_time || intakeData.wake_time || null;
    }
    setConfigState(prev => ({ ...prev, ...mergedConfig }));
    setLoadingLogs(false);

  }).catch(err => {
    console.error("[SleepLog] load error:", err);
    setLoadingLogs(false);
  });
}, [familyId]);

  // Filter logs to active child — show untagged logs (child_id = null) as fallback for legacy data
  const childLogs = activeChild
    ? logs.filter(l => !l.child_id || l.child_id === activeChild.id)
    : logs;

  // ── LOAD PIN ──
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("consultant_pin").eq("id", user.id).single()
      .then(({ data }) => { if (data) setDbPin(data.consultant_pin); });
  }, [user?.id]);

  const setConfig = useCallback(async (next) => {
    const updated = typeof next === "function" ? next(config) : next;
    setConfigState(updated);
    if (familyId) await upsertConfig(familyId, updated);
  }, [config, familyId]);

  const [saveError, setSaveError] = useState(null);

  const refreshLogs = useCallback(async () => {
    if (!familyId) return;
    setLoadingLogs(true);
    const logData = await fetchLogs(familyId);
    setLogs(logData);
    setLoadingLogs(false);
  }, [familyId]);

  const addEntry = useCallback(async (type, data) => {
    const localId = crypto.randomUUID();
    const entry = { id: localId, ts: new Date().toISOString(), type, ...data,
      ...(activeChild?.id ? { child_id: activeChild.id } : {}) };
    setLogs(prev => [entry, ...prev]); // optimistic
    setSaveError(null);
    if (familyId) {
      const saved = await insertLog(familyId, entry);
      if (saved) {
        setLogs(prev => prev.map(l => l.id === localId ? saved : l));
        return saved;
      } else {
        // Save failed — remove the optimistic entry and show error
        setLogs(prev => prev.filter(l => l.id !== localId));
        setSaveError("⚠️ Log didn't save — check your connection and try again.");
        return null;
      }
    }
    return entry;
  }, [familyId, activeChild?.id]);

  const patchEntry = useCallback(async (id, changes) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, ...changes } : l));
    await updateLog(id, changes);
  }, []);

  const deleteEntry = useCallback(async (id) => {
    setLogs(prev => prev.filter(l => l.id !== id));
    await deleteLog(id);
  }, []);

  // ── ANALYTICS ──
  const analytics = useMemo(() => {
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const dayLogs = childLogs.filter(l => l.ts > dayAgo);

    const sessions = dayLogs.filter(l => l.type === "sleep_session");
    let totalCribMs = 0, wakingMs = 0;
    sessions.forEach(s => {
      if (s.end_ts) {
        const cribMs = new Date(s.end_ts) - new Date(s.ts);
        if (cribMs <= 0) return; // skip bad legacy logs with negative duration
        totalCribMs += cribMs;
        const internalWakes = dayLogs.filter(l => l.type === "night_waking" && l.ts > s.ts && l.ts < s.end_ts);
        internalWakes.forEach(w => (wakingMs += (w.duration || 10) * 60000));
      }
    });

    return {
      inCrib: (totalCribMs / 3600000).toFixed(1),
      actualSleep: ((totalCribMs - wakingMs) / 3600000).toFixed(1),
      totalOz: dayLogs.filter(l => l.mode === "bottle").reduce((s, l) => s + (l.amount || 0), 0),
      nursing: dayLogs.filter(l => l.mode === "nursing").reduce((acc, l) => {
        acc.totalMins += l.duration || 0;
        acc.lastSide = l.side;
        return acc;
      }, { totalMins: 0, lastSide: "N/A" }),
      pumpSessions: dayLogs.filter(l => l.mode === "pump").length,
      pumpOz: dayLogs.filter(l => l.mode === "pump").reduce((s, l) => s + (l.amount || 0), 0),
      medicineCount: dayLogs.filter(l => l.type === "medicine").length,
      nightWakes: dayLogs.filter(l => l.type === "night_waking").length,
      poops: dayLogs.filter(l => l.type === "diaper" && l.sub_type === "dirty").length,
      wets: dayLogs.filter(l => l.type === "diaper" && l.sub_type === "wet").length,
      lastPoop: dayLogs.find(l => l.sub_type === "dirty")?.description || "None today",
      nursingCount: dayLogs.filter(l => l.type === "feed" && l.mode === "nursing").length,
      avgFallAsleep: (() => {
        const withData = dayLogs.filter(l => l.type === "sleep_session" && l.fall_asleep_secs != null);
        if (!withData.length) return null;
        return Math.round(withData.reduce((s, l) => s + l.fall_asleep_secs, 0) / withData.length / 60);
      })(),
    };
  }, [childLogs]);

  const isConsultantUser = user?.role === "consultant" || user?.role === "consultant_internal" || user?.role === "admin";
  const TABS = isConsultantUser
    ? ["Dashboard", "Today", "History", "Growth", "Configure"]
    : ["Dashboard", "Today", "History", "Growth"];

  return (
    <div style={{ fontFamily: font, color: T.text, paddingBottom: 80, minHeight: "100vh" }}>

      {/* ── ACTIVE CHILD INDICATOR ── */}
      {activeChild && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px 0", marginBottom: 4 }}>
          {activeChild.photo_url ? (
            <img src={activeChild.photo_url} alt={activeChild.name}
              onError={e => e.target.style.display = "none"}
              style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 16 }}>🧒</span>
          )}
          <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 600, color: T.teal }}>
            {activeChild.name}
          </span>
          <span style={{ fontFamily: font, fontSize: 11, color: T.muted }}>
            · sleep data
          </span>
          <button onClick={refreshLogs} disabled={loadingLogs}
            title="Refresh logs"
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
              fontSize: 14, opacity: loadingLogs ? 0.4 : 0.6, transition: "opacity .2s" }}>
            🔄
          </button>
        </div>
      )}

      {/* ── SAVE ERROR BANNER ── */}
      {saveError && (
        <div style={{
          margin: "0 20px 12px", padding: "11px 14px", borderRadius: 12,
          background: `${C.rose}18`, border: `1px solid ${C.rose}40`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}>
          <span style={{ fontFamily: font, fontSize: 13, color: C.rose, flex: 1 }}>{saveError}</span>
          <button onClick={() => { setSaveError(null); refreshLogs(); }}
            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.rose}50`,
              background: "none", color: C.rose, fontFamily: font, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            Retry
          </button>
        </div>
      )}

      {/* ── TAB BAR ── */}
      <div style={{
        display: "flex", gap: 8, background: T.faint, borderRadius: 14, padding: 5,
        margin: "0 20px 24px", boxShadow: `inset 0 1px 3px rgba(0,0,0,0.08)`,
      }}>
        {TABS.map(t => {
          const active = tab === t.toLowerCase();
          return (
            <button key={t} onClick={() => setTab(t.toLowerCase())} style={{
              flex: 1, padding: "10px 0", border: "none", borderRadius: 10,
              background: active ? `${C.teal}25` : "transparent",
              color: active ? C.teal : T.muted,
              fontSize: 12.5, fontFamily: font, fontWeight: active ? 700 : 400,
              cursor: "pointer", transition: "all 0.18s",
              boxShadow: active ? `0 1px 6px ${C.teal}20` : "none",
            }}>{t}</button>
          );
        })}
      </div>

      <div style={{ padding: "0 20px" }}>
        {loadingLogs ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: T.muted }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌙</div>
            <p style={{ fontFamily: serif, fontSize: 15 }}>Loading sleep data…</p>
          </div>
        ) : (
          <>
            {tab === "dashboard"   && <DashboardView analytics={analytics} logs={childLogs} activeFamily={activeFamily} onPatch={patchEntry} onDelete={deleteEntry} />}
            {tab === "today"       && <TodayView onLog={addEntry} onPatch={patchEntry} logs={childLogs} config={config} activeFamily={activeFamily} hasOpenDBSession={childLogs.some(l => l.type === "sleep_session" && !l.end_ts)} />}
            {tab === "history"     && <TrendsView logs={childLogs} onPatch={patchEntry} onDelete={deleteEntry} />}
            {tab === "growth"      && <GrowthView logs={childLogs} activeFamily={activeFamily} />}
            {tab === "configure"  && <ConsultantView config={config} setConfig={setConfig} dbPin={dbPin} isConsultant={isConsultantUser} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

// ─── EDIT LOG MODAL ───────────────────────────────────────────────────────────
function EditLogModal({ log, onSave, onDelete, onClose }) {
  const T = useT();

  // Convert ISO to local time string HH:MM for inputs
  function isoToTimeStr(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  // Convert local time string back to ISO. Uses originalIso as the base date.
  // If the resulting time would be before originalIso, advances one day to
  // handle overnight / midnight-crossing sessions correctly.
  function timeStrToISO(timeStr, originalIso) {
    if (!timeStr) return null;
    const base = originalIso ? new Date(originalIso) : new Date();
    const [h, m] = timeStr.split(":").map(Number);
    const result = new Date(base);
    result.setHours(h, m, 0, 0);
    // If the result is before the reference, it crossed midnight — advance one day
    if (originalIso && result < new Date(originalIso)) {
      result.setDate(result.getDate() + 1);
    }
    return result.toISOString();
  }

  const isSleep = log.type === "sleep_session";
  const isWaking = log.type === "night_waking";

  function isoToDateStr(iso) {
    return localDateStr(iso ? new Date(iso) : new Date());
  }

  const [putDown, setPutDown] = useState(isoToTimeStr(log.ts));
  const [putDownDate, setPutDownDate] = useState(isoToDateStr(log.ts));
  const [fellAsleep, setFellAsleep] = useState(isoToTimeStr(log.fell_asleep_ts));
  const [fellAsleepDate, setFellAsleepDate] = useState(isoToDateStr(log.fell_asleep_ts || log.ts));
  const [wakeUp, setWakeUp] = useState(isoToTimeStr(log.end_ts));
  const [wakeUpDate, setWakeUpDate] = useState(isoToDateStr(log.end_ts || log.ts));
  const [mood, setMood] = useState(log.mood || "");
  const [wakingTime, setWakingTime] = useState(isoToTimeStr(log.ts));
  const [wakingDate, setWakingDate] = useState(isoToDateStr(log.ts));
  const [duration, setDuration] = useState(log.duration || 10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true); setError("");
    try {
      let changes = {};
      if (isSleep) {
        // Build ISO from date + time fields
        function dtISO(dateStr, timeStr, refISO) {
          const [h, m] = timeStr.split(":").map(Number);
          const d = new Date(dateStr + "T00:00:00");
          d.setHours(h, m, 0, 0);
          if (refISO && d < new Date(refISO)) d.setDate(d.getDate() + 1);
          return d.toISOString();
        }
        const putDownISO = dtISO(putDownDate, putDown);
        const fellAsleepISO = fellAsleep ? dtISO(fellAsleepDate, fellAsleep, putDownISO) : null;
        const wakeReference = fellAsleepISO || putDownISO;
        const wakeUpISO = wakeUp ? dtISO(wakeUpDate, wakeUp, wakeReference) : null;
        const fallAsleepSecs = fellAsleepISO && putDownISO
          ? Math.round((new Date(fellAsleepISO) - new Date(putDownISO)) / 1000)
          : log.fall_asleep_secs;
        const totalSleepMs = wakeUpISO && (fellAsleepISO || putDownISO)
          ? Math.max(0, new Date(wakeUpISO) - new Date(fellAsleepISO || putDownISO))
          : log.total_sleep_ms;
        changes = {
          ts: putDownISO,
          fell_asleep_ts: fellAsleepISO,
          end_ts: wakeUpISO,
          mood: mood || null,
          fall_asleep_secs: fallAsleepSecs,
          total_sleep_ms: totalSleepMs,
        };
      } else if (isWaking) {
        const [wh, wm] = wakingTime.split(":").map(Number);
        const wd = new Date(wakingDate + "T00:00:00");
        wd.setHours(wh, wm, 0, 0);
        changes = {
          ts: wd.toISOString(),
          duration: parseInt(duration) || 10,
        };
      } else {
        const [wh, wm] = wakingTime.split(":").map(Number);
        const wd = new Date(wakingDate + "T00:00:00");
        wd.setHours(wh, wm, 0, 0);
        changes = { ts: wd.toISOString() };
      }
      await onSave(log.id, changes);
      onClose();
    } catch (e) {
      setError(e.message || "Failed to save.");
    } finally { setSaving(false); }
  }

  const MOODS = ["😊", "😐", "😢", "😴", "😤"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: T.bg2, borderRadius: "20px 20px 0 0", width: "100%", padding: "24px 20px 40px", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.headingText }}>
            {logIcon(log)} Edit {logLabel(log)}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Sleep session fields */}
        {isSleep && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>Put down</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="date" value={putDownDate} onChange={e => setPutDownDate(e.target.value)}
                  style={{ flex: 1, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: 14, boxSizing: "border-box" }} />
                <input type="time" value={putDown} onChange={e => setPutDown(e.target.value)}
                  style={{ flex: 1, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: 16, boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>Fell asleep</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="date" value={fellAsleepDate} onChange={e => setFellAsleepDate(e.target.value)}
                  style={{ flex: 1, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: 14, boxSizing: "border-box" }} />
                <input type="time" value={fellAsleep} onChange={e => setFellAsleep(e.target.value)}
                  style={{ flex: 1, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: 16, boxSizing: "border-box" }} />
              </div>
            </div>
            {log.end_ts && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>Wake up</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" value={wakeUpDate} onChange={e => setWakeUpDate(e.target.value)}
                    style={{ flex: 1, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: 14, boxSizing: "border-box" }} />
                  <input type="time" value={wakeUp} onChange={e => setWakeUp(e.target.value)}
                    style={{ flex: 1, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: 16, boxSizing: "border-box" }} />
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 8 }}>Wake-up mood</div>
              <div style={{ display: "flex", gap: 10 }}>
                {MOODS.map(m => (
                  <button key={m} onClick={() => setMood(m === mood ? "" : m)}
                    style={{ fontSize: 24, background: mood === m ? `${T.teal}20` : "none", border: `2px solid ${mood === m ? T.teal : T.border}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Night waking fields */}
        {isWaking && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>Date &amp; Time</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="date" value={wakingDate} onChange={e => setWakingDate(e.target.value)}
                  style={{ flex: 1, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: 14, boxSizing: "border-box" }} />
                <input type="time" value={wakingTime} onChange={e => setWakingTime(e.target.value)}
                  style={{ flex: 1, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: 16, boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>Duration (minutes)</div>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="1" max="120"
                style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: 16, boxSizing: "border-box" }} />
            </div>
          </div>
        )}

        {/* Generic time edit */}
        {!isSleep && !isWaking && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>Time</div>
            <input type="time" value={wakingTime} onChange={e => setWakingTime(e.target.value)}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: 16, boxSizing: "border-box" }} />
          </div>
        )}

        {error && <div style={{ fontSize: 12.5, color: "#C07070", marginTop: 12 }}>{error}</div>}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: "13px", borderRadius: 10, border: "none", background: saving ? T.faint : T.teal, color: saving ? T.muted : "#fff", fontSize: 15, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button onClick={() => { if (window.confirm("Delete this entry?")) { onDelete(log.id); onClose(); } }}
            style={{ padding: "13px 16px", borderRadius: 10, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontSize: 15, cursor: "pointer" }}>
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ analytics, logs, activeFamily, onPatch, onDelete }) {
  const T = useT();
  const [editingLog, setEditingLog] = useState(null);
  const age = calculateAge(activeFamily?.birth_date || activeFamily?.birthDate);
  const totalMonths = age.years * 12 + age.months;
  const showFeeding = totalMonths < 15;
  const showDiapers = age.years < 3;

  const recentSolids = logs.filter(l => l.type === "solids" && isWithin24h(l.ts));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Summary Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <StatCard label="In Crib" value={`${analytics.inCrib}h`} icon="🛏️" color={C.sky} />
        <StatCard label="Actual Sleep" value={`${analytics.actualSleep}h`} icon="💤" color={C.sage} />
        {showFeeding && (
          <StatCard
            label="Feeding"
            value={analytics.totalOz > 0 ? `${analytics.totalOz}oz bottle` : analytics.nursingCount > 0 ? `${analytics.nursingCount} nursing` : analytics.pumpSessions > 0 ? `${analytics.pumpSessions} pump` : "None logged"}
            sub={[
              analytics.nursing.totalMins > 0 ? `${analytics.nursing.totalMins}m nursing` : null,
              analytics.pumpOz > 0 ? `${analytics.pumpOz}oz pumped` : analytics.pumpSessions > 0 ? `${analytics.pumpSessions} pump session${analytics.pumpSessions !== 1 ? "s" : ""}` : null,
              analytics.medicineCount > 0 ? `💊 ${analytics.medicineCount} med${analytics.medicineCount !== 1 ? "s" : ""}` : null,
            ].filter(Boolean).join(" · ") || undefined}
            icon="🍼" color={C.teal}
          />
        )}
        {showDiapers && (
          <StatCard label="Night Wakes" value={analytics.nightWakes} icon="🌛" color={C.purple} />
        )}
        <StatCard
          label="Avg Fall Asleep"
          value={analytics.avgFallAsleep != null ? `${analytics.avgFallAsleep}m` : "No data"}
          sub={analytics.avgFallAsleep != null ? "avg across today's sessions" : "Log a sleep session to track"}
          icon="⏱️" color={C.warm}
        />
        {showDiapers && (
          <StatCard label="Diapers" value={`${analytics.wets} wet · ${analytics.poops} dirty`} sub={analytics.lastPoop} icon="💩" color={C.mauve} />
        )}
      </div>

      {/* Solids Log */}
      {recentSolids.length > 0 && (
        <Card>
          <SectionLabel>Solids Today</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentSolids.map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{s.food}</span>
                <span style={{ fontSize: 12, color: T.muted }}>{s.reaction || "✅ No reaction"}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card>
        <SectionLabel>Last 24h Timeline</SectionLabel>
        {logs.filter(l => isWithin24h(l.ts)).slice(0, 8).map(l => (
          <div key={l.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{logIcon(l)}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{logLabel(l)}</p>
              <p style={{ fontSize: 11, color: T.muted }}>{fmtTime(l.ts)}</p>
            </div>
            {l.type === "sleep_session" && l.end_ts && (new Date(l.end_ts) - new Date(l.ts)) > 0 && (
              <span style={{ fontSize: 11, color: C.teal, fontWeight: 700 }}>
                {((new Date(l.end_ts) - new Date(l.ts)) / 3600000).toFixed(1)}h
              </span>
            )}
            <button onClick={() => setEditingLog(l)}
              style={{ background: T.faint, border: `1px solid ${T.border}`, color: T.muted, fontSize: 12, cursor: "pointer", padding: "5px 10px", borderRadius: 8, marginLeft: 4, fontFamily: "system-ui", whiteSpace: "nowrap" }}>
              Edit
            </button>
          </div>
        ))}
        {logs.filter(l => isWithin24h(l.ts)).length === 0 && (
          <p style={{ fontSize: 13, color: T.muted, textAlign: "center", padding: "12px 0" }}>No entries yet today</p>
        )}
      </Card>

      {/* Edit modal */}
      {editingLog && (
        <EditLogModal
          log={editingLog}
          onSave={onPatch}
          onDelete={onDelete}
          onClose={() => setEditingLog(null)}
        />
      )}
    </div>
  );
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
function TodayView({ onLog, onPatch, logs, config, activeFamily, hasOpenDBSession }) {
  const T = useT();
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", icon: "✓" });
  const toastTimer = useRef(null);
  const { pendingSleepAction, setPendingSleepAction } = useApp();

  function showToast(message, icon = "✅") {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message, icon });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  }

  // ── Active session — derived entirely from Supabase logs (no localStorage) ──
  // Find any open sleep_session (no end_ts) for the active child.
  // This means session state survives page reloads, tab switches, and multi-device use.
  const openLog = logs.find(l =>
    l.type === "sleep_session" && !l.end_ts &&
    (!activeFamily?.activeChild?.id || !l.child_id || l.child_id === activeFamily?.activeChild?.id)
  );
  const session = openLog ? {
    sessionId: openLog.id,
    sessionType: openLog.session_type || "nap",
    putDownTime: openLog.ts,
    asleepTime: openLog.fell_asleep_ts || null,
  } : null;

  // updateSession is now a no-op for state (session is derived from logs),
  // but we keep the signature so all call sites stay clean.
  // Callers that pass null trigger a log refresh to pick up the closed session.
  function updateSession(_next) {
    // session is derived from logs — nothing to write here
  }


  // ── Nap vs Night toggle ──
  const [sessionType, setSessionType] = useState("nap");

  const age = calculateAge(activeFamily?.birth_date || activeFamily?.birthDate);
  const totalMonths = age.years * 12 + age.months;
  const showFeeding = totalMonths < 12;
  const showDiapers = age.years < 3;
  const showSolids = totalMonths >= 4;

  // ── Next sleep suggestion — based on last woke-up event + wake window ──
  // Prefer the most recent completed NAP for the window reference, so that
  // a night sleep ending at 7am doesn't push the "next nap" window too far.
  // Fall back to any session if no nap exists yet today.
  const nowMs = Date.now();
  const FUTURE_TOLERANCE_MS = 5 * 60 * 1000; // 5 min grace for clock skew
  const completedSessions = [...logs]
    .filter(l => {
      if (l.type !== "sleep_session" || !l.end_ts) return false;
      const endMs = new Date(l.end_ts).getTime();
      return Number.isFinite(endMs) && endMs <= nowMs + FUTURE_TOLERANCE_MS;
    })
    .sort((a, b) => new Date(b.end_ts) - new Date(a.end_ts));

  const lastNapWakeUp = completedSessions.find(l => l.session_type === "nap");
  const lastNightWakeUp = completedSessions.find(l => l.session_type === "night");

  // Only count nap sessions today (not night sleep) so we pick the right wake window index.
  // A session is a nap if session_type === "nap", OR if session_type is unset and it started
  // after 6am (legacy logs without session_type).
  const napCount = logs.filter(l => {
    if (l.type !== "sleep_session") return false;
    if (!isToday(l.ts)) return false;
    if (l.session_type === "night") return false;
    if (l.session_type === "nap") return true;
    // Legacy log with no session_type — treat as nap if it started after 6am
    const hour = new Date(l.ts).getHours();
    return hour >= 6;
  }).length;

  // If naps happened today, base off the most recent nap wake-up.
  // Otherwise (morning, first nap pending) base off night wake-up.
  const lastWakeUp = napCount > 0 ? (lastNapWakeUp || completedSessions[0]) : (lastNightWakeUp || completedSessions[0]);

  // ── Wake window resolution ──
  // Priority: 1) consultant-configured  2) RCC age-based defaults
  const { activeChild: sleepActiveChild } = useApp();
  const childDob = sleepActiveChild?.dob || activeFamily?.birth_date || activeFamily?.birthDate;
  const ageMonthsForWindow = calcAgeMonths(childDob);
  const ageBasedWindows = ageMonthsForWindow !== null
    ? defaultWakeWindowsForAge(ageMonthsForWindow)
    : [1.5, 2.0, 2.5, 3.0]; // generic fallback if no DOB
  // config.recommendedWakeWindows is null when consultant hasn't configured — use age-based
  const effectiveWindows = config.recommendedWakeWindows || ageBasedWindows;
  const window_ = effectiveWindows[napCount] ?? effectiveWindows[effectiveWindows.length - 1];

  // ── Nap duration resolution ──
  // Priority: 1) consultant-configured  2) RCC age-based defaults
  const ageBasedNapDuration = ageMonthsForWindow !== null
    ? defaultNapDurationsForAge(ageMonthsForWindow)
    : [60, 70, 90];
  // config.napDurations is [minMins, targetMins, maxMins] or null
  const effectiveNapDuration = config.napDurations || ageBasedNapDuration;
  const napTargetMins = effectiveNapDuration[1] ?? 70;
  const napMinMins = effectiveNapDuration[0] ?? 60;
  const suggestedTs = lastWakeUp ? new Date(new Date(lastWakeUp.end_ts).getTime() + window_ * 3600000) : null;
  const suggestedTime = suggestedTs ? suggestedTs.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "---";
  const minsUntil = suggestedTs ? Math.round((suggestedTs.getTime() - Date.now()) / 60000) : null;

  // ── Suggested wake-up time during an active session ──
  // Night sleep: intake desired wake time → consultant target → 11.5h from bedtime
  // Nap: consultant nap duration → age-based nap duration (target mins)
  const suggestedWakeUpTime = (() => {
    if (!session?.putDownTime) return null;
    const putDownMs = new Date(session.putDownTime).getTime();
    const asleepMs = session.asleepTime ? new Date(session.asleepTime).getTime() : putDownMs;
    const isNight = session.sessionType === "night";

    if (isNight) {
      // Priority 1: parent's ideal_wake_time from intake (stored in config.targetMorningWake
      // which we'll populate from intake on load)
      const targetWakeStr = config.targetMorningWake;
      if (targetWakeStr) {
        // Parse "7:00am" / "7:00 AM" / "07:00" style strings
        const match = targetWakeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
        if (match) {
          let h = parseInt(match[1]);
          const m = parseInt(match[2]);
          const meridiem = match[3]?.toLowerCase();
          if (meridiem === "pm" && h < 12) h += 12;
          if (meridiem === "am" && h === 12) h = 0;
          // Find the correct wake date: first occurrence >= 7h and <= 14h after put-down
          const wakeDate = new Date(putDownMs);
          wakeDate.setHours(h, m, 0, 0);
          for (let attempt = 0; attempt < 3; attempt++) {
            const hoursAfter = (wakeDate.getTime() - putDownMs) / 3600000;
            if (hoursAfter >= 7 && hoursAfter <= 14) return wakeDate;
            if (hoursAfter > 14) break;
            wakeDate.setDate(wakeDate.getDate() + 1);
            wakeDate.setHours(h, m, 0, 0);
          }
        }
      }
      // Priority 2: 12 hours from bedtime
      return new Date(putDownMs + 12 * 3600000);
    } else {
      // Nap: use target duration from effective config
      return new Date(asleepMs + napTargetMins * 60000);
    }
  })();

  // ── Local time helpers ──
  function nowTimeStr() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  }
  function nowDateStr() {
    return localDateStr(new Date());
  }
  // Convert date (YYYY-MM-DD) + time (HH:MM) to ISO.
  // If referenceISO provided and result would be before it, advances one day (midnight crossing).
  function dateTimeToISO(dateStr, timeStr, referenceISO) {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(dateStr + "T00:00:00");
    d.setHours(h, m, 0, 0);
    if (referenceISO) {
      const ref = new Date(referenceISO);
      if (d < ref) d.setDate(d.getDate() + 1);
    }
    // Build ISO string in local time to avoid UTC date rollover after 8 PM EST.
    // toISOString() always returns UTC which shifts the date for evening logs.
    const pad = n => String(n).padStart(2, "0");
    const localISO = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    // Append timezone offset so Supabase stores the correct local time
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? "+" : "-";
    const offH = pad(Math.floor(Math.abs(off) / 60));
    const offM = pad(Math.abs(off) % 60);
    return `${localISO}${sign}${offH}:${offM}`;
  }
  // Backwards-compat wrapper for non-sleep buttons that only have a time field.
  function timeStrToISO(timeStr, referenceISO) {
    return dateTimeToISO(nowDateStr(), timeStr, referenceISO);
  }

  const openSheet = (cfg) => setSheet(cfg);
  const closeSheet = () => setSheet(null);

  async function logAndToast(type, data, message, icon = "✅") {
    await onLog(type, data);
    showToast(message, icon);
  }

  // ── Step 1: Put Down — write to Supabase immediately so it's durable ──
  // We create the sleep_session row now with no fell_asleep_ts and no end_ts.
  // The open record is what drives session state on next render.
  const handlePutDown = async (vals) => {
    const putDownTime = (vals?.date && vals?.time)
      ? dateTimeToISO(vals.date, vals.time)
      : new Date().toISOString();
    showToast("Put down logged", "🛏️");
    await onLog("sleep_session", {
      ts: putDownTime,
      fell_asleep_ts: null,
      end_ts: null,
      session_type: sessionType,
    });
    // session state will auto-update on next logs refresh (optimistic update via onLog)
  };

  // ── Step 2: Fell Asleep — patch the open DB record with fell_asleep_ts ──
  const handleAsleep = async (vals) => {
    const asleepTime = (vals?.date && vals?.time)
      ? dateTimeToISO(vals.date, vals.time, session?.putDownTime)
      : new Date().toISOString();
    showToast("Falling asleep logged", "💤");
    if (session?.sessionId) {
      // Patch existing put-down record
      await onPatch(session.sessionId, { fell_asleep_ts: asleepTime });
    } else {
      // No put-down logged yet — create the full record now
      const putDownTime = session?.putDownTime || asleepTime;
      await onLog("sleep_session", {
        ts: putDownTime,
        fell_asleep_ts: asleepTime,
        end_ts: null,
        session_type: session?.sessionType || sessionType,
      });
    }
    // session state auto-updates from logs
  };

  // ── Step 3: Woke Up — completes the session with all calculations ──
  // Co-caregiver safe: if no local sessionId, query DB for any open session
  // for this child started by any family member and close that instead.
  const handleWakeUp = async (vals) => {
    const reference = session?.asleepTime || session?.putDownTime || null;
    const endTime = (vals?.date && vals?.time)
      ? dateTimeToISO(vals.date, vals.time, reference)
      : new Date().toISOString();
    const { putDownTime, asleepTime } = session || {};
    let { sessionId } = session || {};

    // ── Family-aware open session lookup ──
    // If this device has no sessionId (e.g. co-caregiver logging wake after
    // primary parent logged put-down), find any open session in the DB for
    // this child and close it rather than creating a duplicate.
    if (!sessionId && activeFamily?.id) {
      const { data: openRows } = await supabase
        .from("sleep_logs")
        .select("id, ts, fell_asleep_ts")
        .eq("family_id", activeFamily.id)
        .eq("type", "sleep_session")
        .is("end_ts", null)
        .order("ts", { ascending: false })
        .limit(1);

      if (openRows?.length > 0) {
        const openRow = openRows[0];
        sessionId = openRow.id;
        const dbPutDown = openRow.ts;
        const dbAsleep = openRow.fell_asleep_ts;
        const fallAsleepSecs = dbAsleep && dbPutDown
          ? Math.round((new Date(dbAsleep) - new Date(dbPutDown)) / 1000)
          : null;
        const totalSleepMs = dbAsleep
          ? Math.max(0, new Date(endTime) - new Date(dbAsleep))
          : Math.max(0, new Date(endTime) - new Date(dbPutDown));
        await onPatch(sessionId, {
          end_ts: endTime,
          mood: vals?.mood || null,
          fall_asleep_secs: fallAsleepSecs,
          total_sleep_ms: totalSleepMs,
        });
        updateSession(null);
        showToast("Wake up logged ✓", "☀️");
        return;
      }
    }

    const fallAsleepSecs = asleepTime && putDownTime
      ? Math.round((new Date(asleepTime) - new Date(putDownTime)) / 1000)
      : null;
    const totalSleepMs = asleepTime
      ? Math.max(0, new Date(endTime) - new Date(asleepTime))
      : null;

    if (sessionId) {
      await onPatch(sessionId, {
        end_ts: endTime,
        mood: vals?.mood || null,
        fall_asleep_secs: fallAsleepSecs,
        total_sleep_ms: totalSleepMs,
        session_type: session?.sessionType || sessionType,
      });
    } else {
      await onLog("sleep_session", {
        ts: putDownTime || asleepTime || endTime,
        fell_asleep_ts: asleepTime || null,
        end_ts: endTime,
        fall_asleep_secs: fallAsleepSecs,
        total_sleep_ms: totalSleepMs,
        mood: vals?.mood || null,
        session_type: session?.sessionType || sessionType,
      });
    }
    updateSession(null);
    showToast("Wake up logged ✓", "☀️");
  };

  const handleNightWaking = (vals) => {
    const ts = vals?.time ? timeStrToISO(vals.time) : new Date().toISOString();
    onLog("night_waking", { ts, duration: parseInt(vals?.duration) || 10, description: vals?.notes || null });
    showToast("Night waking logged", "🌛");
  };

  // ── Derived display from in-progress session ──
  const putDownDisplay = session?.putDownTime ? fmtTime(session.putDownTime) : null;
  const asleepDisplay = session?.asleepTime ? fmtTime(session.asleepTime) : null;
  const inCribMins = session?.putDownTime
    ? Math.round((Date.now() - new Date(session.putDownTime)) / 60000)
    : null;
  const sleepingMins = session?.asleepTime
    ? Math.round((Date.now() - new Date(session.asleepTime)) / 60000)
    : null;

  // ── Auto-open sheet if navigated here from a quick-log button ──
  // Capture the action in a ref immediately on mount before any re-render can clear it.
  const pendingActionRef = useRef(pendingSleepAction);
  useEffect(() => {
    const action = pendingActionRef.current;
    if (!action) return;
    if (setPendingSleepAction) setPendingSleepAction(null);
    const t = setTimeout(() => {
      const d = nowDateStr();
      const ti = nowTimeStr();
      if (action === "put_down") {
        openSheet({
          title: "🛏️ Put Down",
          fields: [
            { key: "date", label: "Date", type: "date", default: d },
            { key: "time", label: "Time put down", type: "time", default: ti },
          ],
          onConfirm: handlePutDown,
        });
      } else if (action === "woke_up") {
        openSheet({
          title: "☀️ Woke Up",
          fields: [
            { key: "date", label: "Date", type: "date", default: d },
            { key: "time", label: "Wake up time", type: "time", default: ti },
            { key: "mood", label: "Wake-up mood", type: "select", options: ["happy","neutral","fussy","sleepy","upset"], default: "" },
          ],
          onConfirm: handleWakeUp,
        });
      } else if (action === "night_waking") {
        openSheet({
          title: "🌛 Night Waking",
          fields: [
            { key: "date", label: "Date", type: "date", default: d },
            { key: "time", label: "Time", type: "time", default: ti },
            { key: "duration", label: "Duration (minutes)", type: "number", default: "10" },
            { key: "notes", label: "Notes (optional)", type: "text", default: "" },
          ],
          onConfirm: (vals) => handleNightWaking(vals),
        });
      }
    }, 80);
    return () => clearTimeout(t);
  }, []); // runs once on mount — action is captured in ref above

  const MOODS = [
    { id: "happy",   emoji: "😊" },
    { id: "neutral", emoji: "😐" },
    { id: "fussy",   emoji: "😢" },
    { id: "sleepy",  emoji: "😴" },
    { id: "upset",   emoji: "😤" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sheet && (
        <InputSheet title={sheet.title} fields={sheet.fields}
          onConfirm={(vals) => { sheet.onConfirm(vals); closeSheet(); }}
          onCancel={closeSheet} />
      )}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
      <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />

      {/* Next Sleep Window OR Suggested Wake-Up — context-aware */}
      {!session ? (
        /* No active session — show next sleep suggestion */
        <Card style={{ background: `${C.teal}12`, borderColor: `${C.teal}30` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <SectionLabel>Next Sleep Window</SectionLabel>
              <p style={{ fontSize: 22, fontFamily: serif, color: C.teal, fontWeight: 700 }}>{suggestedTime}</p>
              <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>based on last wake-up + {window_}h window</p>
            </div>
            {minsUntil !== null && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 12, color: T.muted }}>in</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: minsUntil < 0 ? C.rose : C.teal }}>
                  {minsUntil < 0 ? `${fmtDuration(Math.abs(minsUntil))} ago` : fmtDuration(minsUntil)}
                </p>
              </div>
            )}
          </div>
        </Card>
      ) : (
        /* Active session — show suggested wake-up time */
        <Card style={{ background: `${C.sage}12`, borderColor: `${C.sage}30` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <SectionLabel>{session.sessionType === "night" ? "Target Morning Wake" : "Suggested Wake-Up"}</SectionLabel>
              <p style={{ fontSize: 22, fontFamily: serif, color: C.sage, fontWeight: 700 }}>
                {suggestedWakeUpTime ? suggestedWakeUpTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "---"}
              </p>
              <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                {session.sessionType === "night"
                  ? config.targetMorningWake
                    ? `target: ${config.targetMorningWake}`
                    : "11–12 hours night sleep"
                  : `target: ${napTargetMins}min${napMinMins !== napTargetMins ? ` (min ${napMinMins}min)` : ""}`}
              </p>
            </div>
            {suggestedWakeUpTime && (() => {
              const minsToWake = Math.round((suggestedWakeUpTime.getTime() - Date.now()) / 60000);
              return (
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 12, color: T.muted }}>{minsToWake < 0 ? "past" : "in"}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: minsToWake < 0 ? C.rose : C.sage }}>
                    {minsToWake < 0 ? `${fmtDuration(Math.abs(minsToWake))}` : fmtDuration(minsToWake)}
                  </p>
                </div>
              );
            })()}
          </div>
        </Card>
      )}

      {/* Sleep Tracker */}
      <Card>
        <SectionLabel>Sleep Tracker</SectionLabel>

        {/* Nap vs Night toggle — only show when no session is in progress */}
        {!session && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { id: "nap", label: "☀️ Nap" },
              { id: "night", label: "🌙 Night Sleep" },
            ].map(opt => (
              <button key={opt.id} onClick={() => setSessionType(opt.id)} style={{
                flex: 1, padding: "9px 0", borderRadius: 10,
                border: `1.5px solid ${sessionType === opt.id ? C.teal : T.border}`,
                background: sessionType === opt.id ? `${C.teal}18` : "transparent",
                color: sessionType === opt.id ? C.teal : T.muted,
                fontFamily: font, fontSize: 13, fontWeight: sessionType === opt.id ? 700 : 500,
                cursor: "pointer", transition: "all .18s",
              }}>{opt.label}</button>
            ))}
          </div>
        )}
        {session && (
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>
            {session.sessionType === "night" ? "🌙 Night sleep in progress" : "☀️ Nap in progress"}
          </div>
        )}

        {/* In-progress session status */}
        {session && (
          <div style={{
            background: session.asleepTime ? `${C.sage}15` : `${C.amber}15`,
            border: `1px solid ${session.asleepTime ? C.sage : C.amber}40`,
            borderRadius: 12, padding: "12px 14px", marginBottom: 14,
          }}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 8 }}>
              {putDownDisplay && (
                <div>
                  <p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>Put down</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.amber }}>{putDownDisplay}</p>
                </div>
              )}
              {asleepDisplay && (
                <div>
                  <p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>Fell asleep</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.sage }}>{asleepDisplay}</p>
                </div>
              )}
              {inCribMins !== null && !session.asleepTime && (
                <div>
                  <p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>In crib</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.amber }}>{fmtDuration(inCribMins)}</p>
                </div>
              )}
              {sleepingMins !== null && (
                <div>
                  <p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>Sleeping</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.sage }}>{fmtDuration(sleepingMins)}</p>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 11, color: T.muted }}>
                {session.asleepTime ? "💤 Baby is sleeping" : "⏳ Waiting for sleep…"}
              </p>
              <button onClick={async () => {
                if (window.confirm("Clear current session? This will delete the open sleep record.")) {
                  if (session?.sessionId) {
                    await supabase.from("sleep_logs").delete().eq("id", session.sessionId);
                    // Trigger a logs refresh so session derived state clears
                    const logData = await fetchLogs(activeFamily?.id);
                    // onLog optimistic path won't help here — signal parent to refresh
                    // For now, force a page reload as the nuclear option
                    window.location.reload();
                  }
                }
              }}
                style={{ background: "none", border: "none", color: T.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Three independent action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* 1 — Put Down */}
          <button
            onClick={() => openSheet({
              title: "🛏️ Put Down",
              fields: [
                { key: "date", label: "Date", type: "date", default: nowDateStr() },
                { key: "time", label: "Time put down", type: "time", default: nowTimeStr() },
              ],
              onConfirm: handlePutDown,
            })}
            style={{
              padding: "14px 18px", borderRadius: 14,
              border: `2px solid ${session?.putDownTime ? C.amber : T.border}`,
              background: session?.putDownTime ? `${C.amber}20` : T.faint,
              color: session?.putDownTime ? C.amber : T.text,
              fontFamily: font, fontSize: 14, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
            }}>
            <span style={{ fontSize: 20 }}>🛏️</span>
            <div style={{ textAlign: "left", flex: 1 }}>
              <div>Put Down</div>
              {putDownDisplay
                ? <div style={{ fontSize: 11, fontWeight: 400 }}>logged at {putDownDisplay} — tap to update</div>
                : <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.6 }}>tap to log</div>}
            </div>
            {session?.putDownTime && <span style={{ fontSize: 16 }}>✓</span>}
          </button>

          {/* 2 — Fell Asleep */}
          <button
            onClick={() => openSheet({
              title: "💤 Fell Asleep",
              fields: [
                { key: "date", label: "Date", type: "date", default: nowDateStr() },
                { key: "time", label: "Time fell asleep", type: "time", default: nowTimeStr() },
              ],
              onConfirm: handleAsleep,
            })}
            style={{
              padding: "14px 18px", borderRadius: 14,
              border: `2px solid ${session?.asleepTime ? C.purple : T.border}`,
              background: session?.asleepTime ? `${C.purple}20` : T.faint,
              color: session?.asleepTime ? C.purple : T.text,
              fontFamily: font, fontSize: 14, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
            }}>
            <span style={{ fontSize: 20 }}>💤</span>
            <div style={{ textAlign: "left", flex: 1 }}>
              <div>Fell Asleep</div>
              {asleepDisplay
                ? <div style={{ fontSize: 11, fontWeight: 400 }}>logged at {asleepDisplay} — tap to update</div>
                : <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.6 }}>
                    {session?.putDownTime ? "tap to log" : "log put down first, or tap to log directly"}
                  </div>}
            </div>
            {session?.asleepTime && <span style={{ fontSize: 16 }}>✓</span>}
          </button>

          {/* 3 — Woke Up */}
          <button
            onClick={() => openSheet({
              title: "☀️ Woke Up",
              fields: [
                { key: "date", label: "Date", type: "date", default: nowDateStr() },
                { key: "time", label: "Wake up time", type: "time", default: nowTimeStr() },
                { key: "mood", label: "Wake-up mood", type: "select", options: MOODS.map(m => m.id), default: "" },
              ],
              onConfirm: handleWakeUp,
            })}
            style={{
              padding: "14px 18px", borderRadius: 14,
              border: `2px solid ${C.teal}`,
              background: `${C.teal}20`,
              color: C.teal,
              fontFamily: font, fontSize: 14, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
            }}>
            <span style={{ fontSize: 20 }}>☀️</span>
            <div style={{ textAlign: "left", flex: 1 }}>
              <div>Woke Up</div>
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>
                {session?.asleepTime ? "completes the sleep session" : "log even without prior steps"}
              </div>
            </div>
          </button>

          <Divider />

          {/* Night Waking */}
          <button
            onClick={() => openSheet({
              title: "🌛 Night Waking",
              fields: [
                { key: "time", label: "Time", type: "time", default: nowTimeStr() },
                { key: "duration", label: "Duration (minutes)", type: "number", default: "10" },
                { key: "notes", label: "Notes (optional)", type: "text", default: "" },
              ],
              onConfirm: (vals) => handleNightWaking(vals),
            })}
            style={{ padding: "12px 18px", borderRadius: 14, border: `1px solid ${T.border}`, background: T.faint, color: T.text, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🌛</span>
            <div style={{ textAlign: "left" }}>
              <div>Night Waking</div>
              <div style={{ fontSize: 11, fontWeight: 400, color: T.muted }}>log a wake between sleeps</div>
            </div>
          </button>
        </div>
      </Card>

      {/* Feeding */}
      {showFeeding && (
        <Card>
          <SectionLabel>Feeding</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Nursing — logs start time, side, duration */}
            <button onClick={() => openSheet({
              title: "🤱 Nursing",
              fields: [
                { key: "start_time", label: "Started at", type: "time", default: nowTimeStr() },
                { key: "side", label: "Side", type: "select", options: ["left","right","both"], default: "left" },
                { key: "duration", label: "Duration (mins)", type: "number", default: "10" },
              ],
              onConfirm: (v) => {
                const startISO = v.start_time ? timeStrToISO(v.start_time) : new Date().toISOString();
                logAndToast("feed", { mode: "nursing", ts: startISO, side: v.side, duration: parseInt(v.duration) || 10 }, "Nursing logged", "🤱");
              },
            })}
              style={{ padding: "12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
              🤱 Nursing
            </button>

            {/* Bottle */}
            <button onClick={() => openSheet({
              title: "🍼 Bottle",
              fields: [
                { key: "time", label: "Time", type: "time", default: nowTimeStr() },
                { key: "amount", label: "Amount (oz)", type: "number", default: "4" },
              ],
              onConfirm: (v) => {
                const ts = v.time ? timeStrToISO(v.time) : new Date().toISOString();
                logAndToast("feed", { mode: "bottle", ts, amount: parseFloat(v.amount) || 0 }, "Bottle logged", "🍼");
              },
            })}
              style={{ padding: "12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
              🍼 Bottle
            </button>

            {/* Pump */}
            <button onClick={() => openSheet({
              title: "🫙 Pump Session",
              fields: [
                { key: "start_time", label: "Started at", type: "time", default: nowTimeStr() },
                { key: "duration", label: "Duration (mins)", type: "number", default: "15" },
                { key: "amount", label: "Amount expressed (oz)", type: "number", default: "" },
                { key: "side", label: "Side", type: "select", options: ["left","right","both"], default: "both" },
              ],
              onConfirm: (v) => {
                const startISO = v.start_time ? timeStrToISO(v.start_time) : new Date().toISOString();
                logAndToast("feed", {
                  mode: "pump", ts: startISO,
                  duration: parseInt(v.duration) || 15,
                  amount: v.amount ? parseFloat(v.amount) : null,
                  side: v.side,
                }, "Pump session logged", "🫙");
              },
            })}
              style={{ padding: "12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
              🫙 Pump
            </button>
          </div>
        </Card>
      )}

      {/* Diapers */}
      {showDiapers && (
        <Card>
          <SectionLabel>Diapers</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={() => logAndToast("diaper", { sub_type: "wet" }, "Wet diaper logged", "💦")}
              style={{ padding: "12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
              💦 Wet
            </button>
            <button onClick={() => openSheet({ title: "💩 Dirty Diaper", fields: [{ key: "poop_type", label: "Type", type: "select", options: POOP_TYPES, default: "" }, { key: "description", label: "Notes (optional)", type: "text", default: "" }], onConfirm: (v) => logAndToast("diaper", { sub_type: "dirty", description: [v.poop_type, v.description].filter(Boolean).join(" · ") || null }, "Dirty diaper logged", "💩") })}
              style={{ padding: "12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
              💩 Dirty
            </button>
          </div>
        </Card>
      )}

      {/* Solids */}
      {showSolids && (
        <Card>
          <SectionLabel>Solids</SectionLabel>
          <button onClick={() => openSheet({ title: "🍲 Solids", fields: [{ key: "food", label: "What did they eat?", type: "text", default: "" }, { key: "reaction", label: "Reaction", type: "select", options: ["loved","liked","ok","refused"], default: "liked" }], onConfirm: (v) => logAndToast("solids", { food: v.food, reaction: v.reaction }, "Solids logged", "🍲") })}
            style={{ width: "100%", padding: "12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
            🍲 Log Solids
          </button>
        </Card>
      )}

      {/* Medicine */}
      <Card>
        <SectionLabel>Medicine</SectionLabel>
        <button onClick={() => openSheet({
          title: "💊 Medicine",
          fields: [
            { key: "time", label: "Time given", type: "time", default: nowTimeStr() },
            { key: "description", label: "Medicine name", type: "text", default: "" },
            { key: "amount", label: "Dose (e.g. 5ml, 160mg)", type: "text", default: "" },
          ],
          onConfirm: (v) => {
            const ts = v.time ? timeStrToISO(v.time) : new Date().toISOString();
            // amount is a free-text dose string (e.g. "5ml", "160mg") — the sleep_logs
            // amount column is numeric, so we store the dose in description and leave
            // amount null to avoid a type-mismatch insert failure.
            const fullDescription = [v.description, v.amount].filter(Boolean).join(" · ");
            logAndToast("medicine", { ts, description: fullDescription, amount: null }, "Medicine logged", "💊");
          },
        })}
          style={{ width: "100%", padding: "12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
          💊 Log Medicine
        </button>
      </Card>

      {/* Growth */}
      <Card>
        <SectionLabel>Growth</SectionLabel>
        <button onClick={() => openSheet({
          title: "📏 Growth Measurement",
          fields: [
            { key: "date", label: "Date", type: "date", default: localDateStr(new Date()) },
            { key: "weight_lbs", label: "Weight (lbs)", type: "number", default: "" },
            { key: "weight_oz", label: "Weight (oz)", type: "number", default: "" },
            { key: "length", label: "Length (inches)", type: "number", default: "" },
            { key: "head", label: "Head circumference (inches, optional)", type: "number", default: "" },
            { key: "notes", label: "Notes (e.g. pediatrician visit)", type: "text", default: "" },
          ],
          onConfirm: (v) => {
            const weightLbs = parseFloat(v.weight_lbs) || 0;
            const weightOz = parseFloat(v.weight_oz) || 0;
            const totalOz = weightLbs * 16 + weightOz;
            const displayWeight = weightLbs ? `${weightLbs}lb ${weightOz ? weightOz + "oz" : ""}`.trim() : null;
            logAndToast("growth", {
              ts: v.date ? new Date(v.date + "T12:00:00").toISOString() : new Date().toISOString(),
              amount: totalOz || null,
              description: v.length ? `${v.length}in${v.head ? " · head " + v.head + "in" : ""}` : null,
              food: displayWeight,
              reaction: v.notes || null,
            }, "Growth logged", "📏");
          },
        })}
          style={{ width: "100%", padding: "12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
          📏 Log Measurement
        </button>
      </Card>

      {/* Wellness */}
      <Card>
        <SectionLabel>Wellness</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={() => openSheet({
            title: "🦷 Teething",
            fields: [{ key: "notes", label: "Notes (optional)", type: "text", default: "" }],
            onConfirm: (v) => {
              logAndToast("wellness", { sub_type: "teething", description: v.notes || "Teething" }, "Teething logged", "🦷");
            },
          })} style={{ padding: "12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
            🦷 Teething
          </button>
          <button onClick={() => openSheet({
            title: "🤒 Sick",
            fields: [
              { key: "sub_type", label: "Status", type: "select", options: ["sick", "potentially_sick"], default: "sick" },
              { key: "notes", label: "Symptoms / notes", type: "text", default: "" },
            ],
            onConfirm: (v) => {
              const label = v.sub_type === "potentially_sick" ? "Potentially sick" : "Sick";
              logAndToast("wellness", { sub_type: v.sub_type || "sick", description: v.notes || label }, `${label} logged`, "🤒");
            },
          })} style={{ padding: "12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
            🤒 Sick
          </button>
          <button onClick={() => openSheet({
            title: "🌡️ Temperature",
            fields: [
              { key: "temp", label: "Temperature (°F)", type: "number", default: "" },
              { key: "notes", label: "Notes (optional)", type: "text", default: "" },
            ],
            onConfirm: (v) => {
              const display = v.temp ? `${v.temp}°F` : "Temperature logged";
              logAndToast("wellness", { sub_type: "temperature", description: v.notes || "", amount: v.temp ? parseFloat(v.temp) : null, food: display }, "Temp logged", "🌡️");
            },
          })} style={{ gridColumn: "1 / -1", padding: "12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer" }}>
            🌡️ Log Temperature
          </button>
        </div>
      </Card>

      {/* Mood */}
      <Card>
        <SectionLabel>Mood</SectionLabel>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {MOODS.map(m => (
            <button key={m.id} onClick={() => logAndToast("mood", { mood: m.id }, "Mood logged", m.emoji)}
              style={{ fontSize: 26, background: "none", border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}>
              {m.emoji}
            </button>
          ))}
        </div>
      </Card>

      {/* Clear session button */}
      {session && (
        <button onClick={() => { if (window.confirm("Clear the current sleep session?")) updateSession(null); }}
          style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px", fontFamily: font, fontSize: 12.5, color: T.muted, cursor: "pointer" }}>
          Clear current session
        </button>
      )}
    </div>
  );
}


function TrendsView({ logs, onPatch, onDelete }) {
  const [editingLog, setEditingLog] = useState(null);
  const T = useT();

  // 7-day data: avg fall-asleep time per day
  const last7 = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayLogs = logs.filter(l => isSameDay(l.ts, d.toISOString()));
      const sessions = dayLogs.filter(l => l.type === "sleep_session" && l.fall_asleep_secs != null);
      const avgFallAsleep = sessions.length > 0
        ? Math.round(sessions.reduce((s, l) => s + l.fall_asleep_secs, 0) / sessions.length / 60)
        : 0;
      const totalSleepH = dayLogs
        .filter(l => l.type === "sleep_session" && l.end_ts)
        .reduce((s, l) => s + (new Date(l.end_ts) - new Date(l.ts)), 0) / 3600000;
      return {
        label: d.toLocaleDateString([], { weekday: "short" }),
        avgFallAsleep,
        totalSleepH: parseFloat(totalSleepH.toFixed(1)),
        sessions: sessions.length,
      };
    });
  }, [logs]);

  const maxFall = Math.max(...last7.map(d => d.avgFallAsleep), 1);
  const maxSleep = Math.max(...last7.map(d => d.totalSleepH), 1);

  // Mood breakdown last 7 days
  const moodData = useMemo(() => {
    const recent = logs.filter(l => l.type === "sleep_session" && l.mood && isWithin7Days(l.ts));
    return MOODS.map(m => ({
      ...m,
      count: recent.filter(l => l.mood === m.id).length,
    })).filter(m => m.count > 0);
  }, [logs]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Fall Asleep Trend */}
      <Card>
        <SectionLabel>Avg Time to Fall Asleep (min)</SectionLabel>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginBottom: 8 }}>
          {last7.map((day, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%", borderRadius: "4px 4px 0 0",
                  background: day.avgFallAsleep > 0 ? `${C.amber}cc` : `${C.amber}22`,
                  height: `${day.avgFallAsleep > 0 ? Math.max((day.avgFallAsleep / maxFall) * 100, 6) : 4}%`,
                  transition: "height 0.4s ease",
                }} />
              </div>
              {day.avgFallAsleep > 0 && (
                <p style={{ fontSize: 9, color: C.amber, fontWeight: 700, marginTop: 2 }}>{day.avgFallAsleep}m</p>
              )}
              <p style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>{day.label}</p>
            </div>
          ))}
        </div>
        {last7.every(d => d.avgFallAsleep === 0) && (
          <p style={{ fontSize: 12, color: T.muted, textAlign: "center" }}>No sleep sessions with fall-asleep data yet</p>
        )}
      </Card>

      {/* Total Sleep Trend */}
      <Card>
        <SectionLabel>Total Sleep Hours (24h)</SectionLabel>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginBottom: 8 }}>
          {last7.map((day, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%", borderRadius: "4px 4px 0 0",
                  background: day.totalSleepH > 0 ? `${C.sage}cc` : `${C.sage}22`,
                  height: `${day.totalSleepH > 0 ? Math.max((day.totalSleepH / maxSleep) * 100, 6) : 4}%`,
                  transition: "height 0.4s ease",
                }} />
              </div>
              {day.totalSleepH > 0 && (
                <p style={{ fontSize: 9, color: C.sage, fontWeight: 700, marginTop: 2 }}>{day.totalSleepH}h</p>
              )}
              <p style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>{day.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Mood Breakdown */}
      {moodData.length > 0 && (
        <Card>
          <SectionLabel>Wake-Up Mood (7 days)</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {moodData.map(m => {
              const total = moodData.reduce((s, x) => s + x.count, 0);
              const pct = Math.round((m.count / total) * 100);
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, width: 24 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 8, borderRadius: 4, background: T.faint, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: m.color, borderRadius: 4, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: T.muted, width: 42, textAlign: "right" }}>{pct}% ({m.count})</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Session Log */}
      <Card>
        <SectionLabel>Recent Sessions</SectionLabel>
        {logs.filter(l => l.type === "sleep_session").slice(0, 10).map(s => (
          <div key={s.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{fmtDateTime(s.ts)}</p>
              {s.fall_asleep_secs != null && (
                <p style={{ fontSize: 11, color: T.muted }}>
                  Settled in {Math.round(s.fall_asleep_secs / 60)}m
                  {s.end_ts && (new Date(s.end_ts) - new Date(s.ts)) > 0
                    ? ` · Slept ${((new Date(s.end_ts) - new Date(s.ts)) / 3600000).toFixed(1)}h`
                    : s.end_ts ? "" : " · In progress"}
                </p>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {s.mood && (
                <span style={{ fontSize: 20 }}>{MOODS.find(m => m.id === s.mood)?.emoji || "😴"}</span>
              )}
              {onPatch && (
                <button onClick={() => setEditingLog(s)}
                  style={{ background: T.faint, border: `1px solid ${T.border}`, color: T.muted, fontSize: 12, cursor: "pointer", padding: "5px 10px", borderRadius: 8, fontFamily: "system-ui" }}>
                  Edit
                </button>
              )}
            </div>
          </div>
        ))}
        {logs.filter(l => l.type === "sleep_session").length === 0 && (
          <p style={{ fontSize: 13, color: T.muted, textAlign: "center", padding: "12px 0" }}>No sessions logged yet</p>
        )}
      </Card>

      {/* Edit modal */}
      {editingLog && (
        <EditLogModal
          log={editingLog}
          onSave={onPatch}
          onDelete={onDelete}
          onClose={() => setEditingLog(null)}
        />
      )}
    </div>
  );
}

// ─── GROWTH CHART ─────────────────────────────────────────────────────────────
// WHO weight-for-age percentile reference data (0–24 months, sex-averaged kg)
// Source: WHO Child Growth Standards, converted to lbs for display
const WHO_WEIGHT = {
  // [months]: [3rd, 10th, 25th, 50th, 75th, 90th, 97th] in lbs
  0:  [5.3,  5.8,  6.4,  7.3,  8.2,  9.0,  9.9],
  1:  [6.7,  7.4,  8.2,  9.2, 10.3, 11.2, 12.3],
  2:  [8.2,  9.0,  9.9, 11.1, 12.4, 13.5, 14.8],
  3:  [9.5, 10.4, 11.5, 12.8, 14.3, 15.6, 17.1],
  4:  [10.6, 11.6, 12.8, 14.3, 15.9, 17.3, 18.9],
  5:  [11.5, 12.6, 13.9, 15.4, 17.2, 18.7, 20.5],
  6:  [12.3, 13.4, 14.8, 16.5, 18.3, 19.9, 21.8],
  7:  [12.9, 14.1, 15.6, 17.4, 19.3, 21.0, 23.0],
  8:  [13.5, 14.8, 16.3, 18.2, 20.2, 22.0, 24.0],
  9:  [14.1, 15.4, 17.0, 18.9, 21.0, 22.9, 25.0],
  10: [14.6, 15.9, 17.6, 19.6, 21.8, 23.7, 25.9],
  11: [15.0, 16.4, 18.1, 20.2, 22.4, 24.4, 26.7],
  12: [15.5, 16.9, 18.7, 20.8, 23.1, 25.2, 27.6],
  14: [16.3, 17.8, 19.7, 21.9, 24.4, 26.5, 29.0],
  16: [17.1, 18.6, 20.6, 22.9, 25.5, 27.8, 30.5],
  18: [17.8, 19.4, 21.5, 23.9, 26.6, 29.0, 31.9],
  20: [18.5, 20.2, 22.4, 24.9, 27.7, 30.2, 33.2],
  22: [19.2, 21.0, 23.2, 25.8, 28.8, 31.4, 34.5],
  24: [19.8, 21.7, 24.0, 26.7, 29.8, 32.6, 35.8],
};

// WHO length-for-age percentile reference (0–24 months, sex-averaged cm → inches)
const WHO_LENGTH = {
  0:  [17.6, 18.1, 18.6, 19.4, 20.1, 20.7, 21.3],
  1:  [19.3, 19.8, 20.4, 21.1, 21.9, 22.5, 23.2],
  2:  [20.8, 21.3, 21.9, 22.8, 23.5, 24.2, 24.9],
  3:  [22.0, 22.5, 23.2, 24.0, 24.9, 25.6, 26.4],
  4:  [23.0, 23.6, 24.3, 25.2, 26.0, 26.8, 27.6],
  6:  [24.8, 25.4, 26.1, 27.1, 28.0, 28.8, 29.7],
  9:  [26.6, 27.3, 28.0, 29.1, 30.0, 30.9, 31.9],
  12: [28.1, 28.8, 29.6, 30.7, 31.7, 32.6, 33.6],
  15: [29.4, 30.1, 30.9, 32.1, 33.1, 34.1, 35.1],
  18: [30.6, 31.3, 32.2, 33.4, 34.5, 35.5, 36.6],
  21: [31.6, 32.4, 33.3, 34.6, 35.7, 36.8, 37.9],
  24: [32.6, 33.4, 34.3, 35.7, 36.8, 37.9, 39.1],
};

function interpolateWHO(table, ageMonths) {
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (ageMonths <= keys[0]) return table[keys[0]];
  if (ageMonths >= keys[keys.length - 1]) return table[keys[keys.length - 1]];
  const lo = keys.filter(k => k <= ageMonths).pop();
  const hi = keys.filter(k => k > ageMonths)[0];
  const t = (ageMonths - lo) / (hi - lo);
  return table[lo].map((v, i) => v + t * (table[hi][i] - v));
}

function GrowthChart({ data, dob, metric, T }) {
  // data: array of { ageMonths, value, date, label }
  // metric: "weight" | "length"
  const label = metric === "weight" ? "Weight (lbs)" : "Length (in)";
  const whoTable = metric === "weight" ? WHO_WEIGHT : WHO_LENGTH;
  const color = metric === "weight" ? C.teal : C.sage;

  if (!dob) {
    return (
      <div style={{ textAlign: "center", padding: "30px 0", color: T.muted, fontFamily: font, fontSize: 13 }}>
        No date of birth on file — add it in child settings to see percentile curves.
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "30px 0", color: T.muted, fontFamily: font, fontSize: 13 }}>
        No {metric} measurements logged yet. Use "Log Measurement" in the Today tab to start tracking.
      </div>
    );
  }

  // Chart dimensions
  const W = 320, H = 200, PAD = { top: 12, right: 16, bottom: 32, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // X axis: 0 to max(24, child's current age + 1) months
  const dobDate = new Date(dob);
  const currentAgeMonths = calcAgeMonths(dob) ?? 0;
  const xMax = Math.max(24, currentAgeMonths + 1);
  const xMin = 0;

  // Y axis range from WHO data
  const allWho = Array.from({ length: xMax + 1 }, (_, m) => interpolateWHO(whoTable, m)).flat();
  const dataVals = data.map(d => d.value);
  const yMin = Math.floor(Math.min(...allWho, ...dataVals) * 0.95);
  const yMax = Math.ceil(Math.max(...allWho, ...dataVals) * 1.03);

  const xScale = v => PAD.left + ((v - xMin) / (xMax - xMin)) * chartW;
  const yScale = v => PAD.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  // Build WHO percentile paths
  const PERCENTILE_LABELS = ["3rd", "10th", "25th", "50th", "75th", "90th", "97th"];
  const PERCENTILE_OPACITIES = [0.25, 0.3, 0.4, 0.7, 0.4, 0.3, 0.25];
  const monthPoints = Array.from({ length: xMax + 1 }, (_, m) => m);

  function buildPath(idx) {
    return monthPoints.map((m, i) => {
      const vals = interpolateWHO(whoTable, m);
      const x = xScale(m);
      const y = yScale(vals[idx]);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  // X axis ticks
  const xTicks = xMax <= 12
    ? [0, 2, 4, 6, 8, 10, 12]
    : [0, 3, 6, 9, 12, 15, 18, 21, 24].filter(t => t <= xMax);

  // Y axis ticks
  const yRange = yMax - yMin;
  const yStep = yRange <= 10 ? 2 : yRange <= 20 ? 4 : yRange <= 40 ? 5 : 10;
  const yTicks = [];
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) yTicks.push(y);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto" }}>
        {/* Grid lines */}
        {yTicks.map(y => (
          <line key={y} x1={PAD.left} x2={W - PAD.right} y1={yScale(y)} y2={yScale(y)}
            stroke={T.border} strokeWidth={0.5} />
        ))}

        {/* WHO percentile bands */}
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
          <path key={idx} d={buildPath(idx)}
            fill="none" stroke={color}
            strokeWidth={idx === 3 ? 1.5 : 0.75}
            strokeDasharray={idx === 3 ? "none" : "3,3"}
            opacity={PERCENTILE_OPACITIES[idx]} />
        ))}

        {/* 50th label */}
        {(() => {
          const midVals = interpolateWHO(whoTable, Math.floor(xMax * 0.6));
          return (
            <text
              x={xScale(Math.floor(xMax * 0.6)) + 3}
              y={yScale(midVals[3]) - 3}
              fontSize={8} fill={color} opacity={0.7} fontFamily={font}
            >50th</text>
          );
        })()}

        {/* Axes */}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom}
          stroke={T.border} strokeWidth={1} />
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom}
          stroke={T.border} strokeWidth={1} />

        {/* X ticks + labels */}
        {xTicks.map(m => (
          <g key={m}>
            <line x1={xScale(m)} x2={xScale(m)} y1={H - PAD.bottom} y2={H - PAD.bottom + 4}
              stroke={T.border} strokeWidth={1} />
            <text x={xScale(m)} y={H - PAD.bottom + 12}
              fontSize={8} textAnchor="middle" fill={T.muted} fontFamily={font}>{m}m</text>
          </g>
        ))}

        {/* Y ticks + labels */}
        {yTicks.map(y => (
          <g key={y}>
            <text x={PAD.left - 4} y={yScale(y) + 3}
              fontSize={8} textAnchor="end" fill={T.muted} fontFamily={font}>{y}</text>
          </g>
        ))}

        {/* Data line */}
        {data.length > 1 && (
          <path
            d={data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.ageMonths).toFixed(1)},${yScale(d.value).toFixed(1)}`).join(" ")}
            fill="none" stroke={color} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(d.ageMonths)} cy={yScale(d.value)} r={5}
              fill={color} stroke={T.bg} strokeWidth={2} />
          </g>
        ))}
      </svg>

      {/* Y axis label */}
      <div style={{ textAlign: "center", fontSize: 10, color: T.muted, fontFamily: font, marginTop: 2 }}>{label}</div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke={color} strokeWidth={2.5} strokeLinecap="round" /></svg>
          <span style={{ fontFamily: font, fontSize: 10, color: T.muted }}>Measured</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke={color} strokeWidth={1} strokeDasharray="3,3" opacity={0.6} /></svg>
          <span style={{ fontFamily: font, fontSize: 10, color: T.muted }}>WHO percentiles</span>
        </div>
      </div>
    </div>
  );
}

function GrowthView({ logs, activeFamily }) {
  const T = useT();
  const { activeChild } = useApp();
  const [metric, setMetric] = useState("weight");

  const dob = activeChild?.dob || activeFamily?.birth_date || activeFamily?.birthDate;
  const dobDate = dob ? new Date(dob) : null;

  const growthLogs = logs
    .filter(l => l.type === "growth")
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));

  // Parse weight data — stored as total oz in `amount`
  const weightData = growthLogs
    .filter(l => l.amount && l.amount > 0)
    .map(l => {
      const ageMs = dobDate ? new Date(l.ts) - dobDate : 0;
      const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44);
      const lbs = parseFloat((l.amount / 16).toFixed(2));
      return {
        ageMonths: Math.max(0, ageMonths),
        value: lbs,
        date: new Date(l.ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        label: l.food || `${Math.floor(lbs)}lb ${Math.round((lbs % 1) * 16)}oz`,
      };
    });

  // Parse length data — stored as "Xin" in `description`
  const lengthData = growthLogs
    .filter(l => l.description && l.description.match(/[\d.]+in/))
    .map(l => {
      const match = l.description.match(/([\d.]+)in/);
      const inches = match ? parseFloat(match[1]) : null;
      if (!inches) return null;
      const ageMs = dobDate ? new Date(l.ts) - dobDate : 0;
      const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44);
      return {
        ageMonths: Math.max(0, ageMonths),
        value: inches,
        date: new Date(l.ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        label: `${inches}"`,
      };
    }).filter(Boolean);

  const activeData = metric === "weight" ? weightData : lengthData;

  // Latest measurement summary
  const latest = activeData[activeData.length - 1];
  const prev = activeData[activeData.length - 2];
  const diff = latest && prev ? (latest.value - prev.value).toFixed(1) : null;

  return (
    <div>
      {/* Metric toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "weight", label: "⚖️ Weight", color: C.teal },
          { id: "length", label: "📏 Length", color: C.sage },
        ].map(m => (
          <button key={m.id} onClick={() => setMetric(m.id)} style={{
            flex: 1, padding: "10px 0", borderRadius: 12,
            border: `1.5px solid ${metric === m.id ? m.color : T.border}`,
            background: metric === m.id ? `${m.color}18` : T.card,
            color: metric === m.id ? m.color : T.muted,
            fontFamily: font, fontSize: 13, fontWeight: metric === m.id ? 700 : 500,
            cursor: "pointer", transition: "all .18s",
          }}>{m.label}</button>
        ))}
      </div>

      {/* Latest measurement card */}
      {latest && (
        <div style={{
          display: "flex", gap: 12, marginBottom: 20,
          padding: "14px 16px", borderRadius: 14,
          background: T.faint, border: `1px solid ${T.border}`,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
              Latest {metric === "weight" ? "weight" : "length"}
            </div>
            <div style={{ fontFamily: serif, fontSize: 24, color: T.headingText, fontWeight: 700 }}>
              {latest.label}
            </div>
            <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 2 }}>{latest.date}</div>
          </div>
          {diff !== null && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginBottom: 4 }}>Since last visit</div>
              <div style={{ fontFamily: font, fontSize: 16, fontWeight: 700, color: parseFloat(diff) >= 0 ? C.sage : C.rose }}>
                {parseFloat(diff) >= 0 ? "+" : ""}{diff} {metric === "weight" ? "lbs" : "in"}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <Card style={{ marginBottom: 20, padding: "16px 12px" }}>
        <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.muted, marginBottom: 12 }}>
          {metric === "weight" ? "Weight" : "Length"} over time · WHO percentile reference
        </div>
        <GrowthChart data={activeData} dob={dob} metric={metric} T={T} />
      </Card>

      {/* Data table */}
      {activeData.length > 0 && (
        <Card>
          <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.muted, marginBottom: 12 }}>
            Measurement history
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[...activeData].reverse().map((d, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0",
                borderBottom: i < activeData.length - 1 ? `1px solid ${T.border}` : "none",
              }}>
                <div>
                  <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: T.text }}>{d.label}</div>
                  <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 1 }}>
                    {d.date} · {d.ageMonths < 1 ? "newborn" : d.ageMonths < 24 ? `${Math.round(d.ageMonths)}m` : `${(d.ageMonths / 12).toFixed(1)}y`}
                  </div>
                </div>
                {(() => {
                  const whoVals = interpolateWHO(metric === "weight" ? WHO_WEIGHT : WHO_LENGTH, d.ageMonths);
                  const p50 = whoVals[3];
                  const pct = d.value < whoVals[0] ? "<3rd"
                    : d.value < whoVals[1] ? "3–10th"
                    : d.value < whoVals[2] ? "10–25th"
                    : d.value < whoVals[4] ? "25–75th"
                    : d.value < whoVals[5] ? "75–90th"
                    : d.value < whoVals[6] ? "90–97th"
                    : ">97th";
                  const isMiddle = pct === "25–75th";
                  return (
                    <div style={{
                      padding: "4px 10px", borderRadius: 10,
                      background: isMiddle ? `${C.sage}18` : `${T.faint}`,
                      border: `1px solid ${isMiddle ? C.sage + "40" : T.border}`,
                      fontFamily: font, fontSize: 11, fontWeight: 600,
                      color: isMiddle ? C.sage : T.muted,
                    }}>
                      {pct}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Gentle context note */}
      <div style={{
        marginTop: 16, padding: "12px 14px", borderRadius: 12,
        background: T.faint, border: `1px solid ${T.border}`,
        fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.7,
      }}>
        📖 Percentile curves show the range of healthy growth patterns — not a target. A baby consistently tracking their own curve is growing well, whatever that percentile is. Always discuss growth with your pediatrician.
      </div>
    </div>
  );
}

// ─── CONSULTANT VIEW ──────────────────────────────────────────────────────────
function ConsultantView({ config, setConfig, dbPin, isConsultant }) {
  const T = useT();
  const [authed, setAuthed] = useState(isConsultant);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!authed) {
    return (
      <Card style={{ textAlign: "center", maxWidth: 360, margin: "0 auto" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
        <h3 style={{ fontFamily: serif, marginBottom: 6 }}>Consultant Access</h3>
        <p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>Enter your PIN to configure this family's sleep plan.</p>
        <input
          type="password" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Enter PIN"
          onKeyDown={e => e.key === "Enter" && (input === dbPin?.toString() ? setAuthed(true) : alert("Invalid PIN"))}
          style={{ width: "100%", padding: "12px 16px", marginBottom: 12, background: T.inputBg, border: `1.5px solid ${T.border}`, color: T.text, borderRadius: 10, fontFamily: font, fontSize: 14, outline: "none" }}
        />
        <Btn onClick={() => input === dbPin?.toString() ? setAuthed(true) : alert("Invalid PIN")} variant="teal" style={{ width: "100%" }}>
          Verify PIN
        </Btn>
      </Card>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    await setConfig(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Work from age-based defaults when config values are null
  const { activeChild: cvChild } = useApp();
  const cvDob = cvChild?.dob;
  const cvAgeMonths = calcAgeMonths(cvDob);
  const ageWindows = cvAgeMonths !== null ? defaultWakeWindowsForAge(cvAgeMonths) : [1.5, 2.0, 2.5, 3.0];
  const ageNapDur = cvAgeMonths !== null ? defaultNapDurationsForAge(cvAgeMonths) : [60, 70, 90];

  const wakeWindows = config.recommendedWakeWindows || ageWindows;
  const napDurs = config.napDurations || ageNapDur;

  const inputStyle = {
    padding: "8px 12px", borderRadius: 9, border: `1px solid ${T.border}`,
    background: T.inputBg, color: T.text, fontFamily: font, fontSize: 14,
    width: "100%", outline: "none",
  };
  const stepBtn = {
    width: 30, height: 30, border: `1px solid ${T.border}`, borderRadius: 8,
    background: T.inputBg, color: T.text, fontSize: 16, cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── WAKE WINDOWS ── */}
      <Card>
        <SectionLabel>Wake Windows</SectionLabel>
        <p style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>
          Hours awake between sleeps. Windows grow through the day — last slot is always pre-bedtime.
        </p>
        {cvAgeMonths !== null && (
          <p style={{ fontSize: 11, color: T.teal, marginBottom: 14 }}>
            Age-based defaults loaded for {cvAgeMonths}mo · tap +/− to override
          </p>
        )}
        {wakeWindows.map((ww, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>
                {i === 0 ? "Before 1st nap" : i === wakeWindows.length - 1 ? "Before bedtime" : `Before nap ${i + 1}`}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => {
                const n = [...wakeWindows]; n[i] = Math.max(0.5, parseFloat((n[i] - 0.25).toFixed(2)));
                setConfig({ ...config, recommendedWakeWindows: n });
              }} style={stepBtn}>−</button>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.teal, minWidth: 40, textAlign: "center" }}>{ww}h</span>
              <button onClick={() => {
                const n = [...wakeWindows]; n[i] = parseFloat((n[i] + 0.25).toFixed(2));
                setConfig({ ...config, recommendedWakeWindows: n });
              }} style={stepBtn}>+</button>
            </div>
          </div>
        ))}
        <Divider />
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Btn outline size="sm" onClick={() => setConfig({ ...config, recommendedWakeWindows: [...wakeWindows, parseFloat((wakeWindows[wakeWindows.length-1] + 0.5).toFixed(2))] })}>
            + Add Window
          </Btn>
          {wakeWindows.length > 1 && (
            <Btn outline size="sm" onClick={() => setConfig({ ...config, recommendedWakeWindows: wakeWindows.slice(0, -1) })}>
              − Remove Last
            </Btn>
          )}
          <Btn outline size="sm" onClick={() => setConfig({ ...config, recommendedWakeWindows: null })}>
            Reset to age defaults
          </Btn>
        </div>
      </Card>

      {/* ── NAP DURATIONS ── */}
      <Card>
        <SectionLabel>Nap Durations</SectionLabel>
        <p style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>
          Target nap length. 60 min minimum to teach the crib hour.
        </p>
        {cvAgeMonths !== null && (
          <p style={{ fontSize: 11, color: T.teal, marginBottom: 14 }}>
            Age-based defaults: {ageNapDur[0]}min min · {ageNapDur[1]}min target
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[
            { label: "Minimum", key: 0, color: C.warm },
            { label: "Target",  key: 1, color: C.teal },
            { label: "Maximum", key: 2, color: C.sage },
          ].map(({ label, key, color }) => (
            <div key={key} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{label}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <button onClick={() => {
                  const n = [...napDurs]; n[key] = Math.max(key === 0 ? 60 : napDurs[0], n[key] - 5);
                  setConfig({ ...config, napDurations: n });
                }} style={{ ...stepBtn, width: 24, height: 24, fontSize: 14 }}>−</button>
                <span style={{ fontSize: 15, fontWeight: 700, color, minWidth: 44, textAlign: "center" }}>{napDurs[key]}m</span>
                <button onClick={() => {
                  const n = [...napDurs]; n[key] = Math.min(key === 2 ? 180 : napDurs[2], n[key] + 5);
                  setConfig({ ...config, napDurations: n });
                }} style={{ ...stepBtn, width: 24, height: 24, fontSize: 14 }}>+</button>
              </div>
            </div>
          ))}
        </div>
        <Btn outline size="sm" onClick={() => setConfig({ ...config, napDurations: null })}>
          Reset to age defaults
        </Btn>
      </Card>

      {/* ── MORNING WAKE TARGET ── */}
      <Card>
        <SectionLabel>Target Morning Wake Time</SectionLabel>
        <p style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
          Overrides parent's intake preference. Used to calculate suggested wake-up during night sleep.
          Leave blank to calculate from bedtime (11–12h).
        </p>
        <input
          type="time"
          value={(() => {
            const t = config.targetMorningWake;
            if (!t) return "";
            const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
            if (!m) return "";
            let h = parseInt(m[1]);
            const min = m[2];
            const mer = m[3]?.toLowerCase();
            if (mer === "pm" && h < 12) h += 12;
            if (mer === "am" && h === 12) h = 0;
            return `${String(h).padStart(2,"0")}:${min}`;
          })()}
          onChange={e => setConfig({ ...config, targetMorningWake: e.target.value || null })}
          style={{ ...inputStyle, marginBottom: 8 }}
        />
        {config.targetMorningWake && (
          <Btn outline size="sm" onClick={() => setConfig({ ...config, targetMorningWake: null })}>
            Clear (use calculated)
          </Btn>
        )}
      </Card>

      {/* ── SLEEP METHOD ── */}
      <Card>
        <SectionLabel>Sleep Method</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {["Gradual Withdrawal", "Fading", "Chair Method", "Extinction", "Modified Extinction"].map(m => (
            <Pill key={m} label={m} active={config.method === m} color={C.teal} onClick={() => setConfig({ ...config, method: m })} />
          ))}
        </div>
      </Card>

      <Btn onClick={handleSave} variant="sage" size="lg" style={{ width: "100%" }} disabled={saving}>
        {saved ? "✅ Saved!" : saving ? "Saving…" : "Save Configuration"}
      </Btn>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function calculateAge(birthDate) {
  if (!birthDate) return { years: 0, months: 0 };
  const today = new Date();
  const birth = new Date(birthDate);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (today.getDate() < birth.getDate()) { months--; if (months < 0) { years--; months += 12; } }
  return { years: Math.max(0, years), months: Math.max(0, months) };
}

// ─── AGE-APPROPRIATE WAKE WINDOWS ────────────────────────────────────────────
// Based on RCC methodology (Beyond Birth Basics)
// Each array = wake windows per nap slot for that age range
// Last value is always the pre-bedtime wake window
// ─── RCC WAKE WINDOWS (Beyond Birth Basics methodology) ─────────────────────
// Windows grow through the day — last slot is always the longest (pre-bedtime).
// Source: beyondbirthbasics.com Wake Windows chart © 2023
function defaultWakeWindowsForAge(ageMonths) {
  const weeks = ageMonths * 4.33;
  // 0-4 weeks: 45-60min, 5-6 naps. Slight grow toward end of day.
  if (weeks < 4)      return [0.75, 0.75, 0.75, 0.75, 0.75, 1.0];
  // 4-12 weeks: 60-90min, 5-6 naps. Last window notably longer.
  if (weeks < 12)     return [1.0, 1.0, 1.25, 1.25, 1.5, 1.75];
  // 3-4 months: 75-120min, 4-5 naps. Grow from 1.25 → 2.0h.
  if (ageMonths < 5)  return [1.25, 1.5, 1.75, 2.0, 2.25];
  // 5-7 months: 2-3h, 3-4 naps. Grow from 2.0 → 3.0h.
  if (ageMonths < 7)  return [2.0, 2.25, 2.75, 3.0];
  // 7-10 months: 2.5-3.5h, 2-3 naps. Grow from 2.5 → 3.5h.
  if (ageMonths < 11) return [2.5, 3.0, 3.5];
  // 11-13 months: 3-4h, 1-2 naps. Grow from 3.0 → 4.0h.
  if (ageMonths < 14) return [3.0, 4.0];
  // 14-36 months: 4-6h, 1 nap. Pre-nap window 4-5h, pre-bed 5.5-6h.
  if (ageMonths < 37) return [4.5, 5.75];
  // 3y+: no nap. One long window before bedtime.
  return [11.0];
}

// ─── RCC NAP DURATIONS (Beyond Birth Basics methodology) ─────────────────────
// Returns [minMins, targetMins, maxMins] per nap slot for the age.
// Floor: 60 min (crib hour). Cap: 120 min for newborns, 90 for most others.
// Derived from Total Sleep Needs chart: daytime hours ÷ number of naps.
// Source: beyondbirthbasics.com Total Sleep Needs chart © 2023
function defaultNapDurationsForAge(ageMonths) {
  const weeks = ageMonths * 4.33;
  // 0-4wk: 4-6h daytime / 5-6 naps → ~45-75min each, cap 120min
  if (weeks < 4)      return [60, 60, 120]; // [min, target, max]
  // 4-12wk: 4-6h daytime / 5-6 naps → ~45-75min each, cap 120min
  if (weeks < 12)     return [60, 70, 120];
  // 3-5mo: 4-5h daytime / 4-5 naps → ~55-75min each
  if (ageMonths < 5)  return [60, 70, 90];
  // 5-7mo: 2-3.5h daytime / 3-4 naps → ~45-70min each
  if (ageMonths < 7)  return [60, 65, 90];
  // 7-10mo: 2-3.5h daytime / 2-3 naps → ~60-75min each
  if (ageMonths < 11) return [60, 70, 90];
  // 11-13mo: 2-3.5h daytime / 1-2 naps → 75-90min each
  if (ageMonths < 14) return [60, 80, 90];
  // 14-36mo: 2-3h daytime / 1 nap → 90min target
  if (ageMonths < 37) return [60, 90, 90];
  // 3y+: no nap
  return [0, 0, 0];
}

// Accurate age-in-months using calendar math (avoids 30.44-day float drift)
function calcAgeMonths(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let mos = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) mos--;
  if (mos < 0) { years--; mos += 12; }
  return years * 12 + mos;
}

function localDateStr(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isWithin24h(ts) { return new Date(ts) > new Date(Date.now() - 86400000); }
function isWithin7Days(ts) { return new Date(ts) > new Date(Date.now() - 7 * 86400000); }
function isToday(ts) { return new Date(ts).toDateString() === new Date().toDateString(); }
function isSameDay(t1, t2) { return new Date(t1).toDateString() === new Date(t2).toDateString(); }

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(iso) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
    + " · " + fmtTime(iso);
}
function fmtDuration(mins) {
  const m = Math.abs(Math.round(mins));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function logIcon(l) {
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
function logLabel(l) {
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

function StatCard({ label, value, sub, icon, color }) {
  const T = useT();
  return (
    <Card style={{ borderLeft: `3px solid ${color}`, padding: "14px 16px" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{label}</p>
          <p style={{ fontSize: 20, fontWeight: 800, margin: "3px 0 2px", color: T.headingText }}>{value}</p>
          {sub && <p style={{ fontSize: 10, color: T.muted }}>{sub}</p>}
        </div>
      </div>
    </Card>
  );
}
