import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useT, font, serif, genId } from "../../core/shared.jsx";
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
                  type={f.type || "text"} value={vals[f.key]} placeholder={f.placeholder || ""}
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
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
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
  // Strip the local optimistic id — let Supabase generate a real UUID
  const { id: _localId, ...rest } = entry;
  // Ensure ts is a valid ISO string
  const safeEntry = { ...rest, family_id: familyId, ts: rest.ts || new Date().toISOString() };
  const { data, error } = await supabase
    .from("sleep_logs")
    .insert(safeEntry)
    .select()
    .single();
  if (error) {
    console.error("[SleepLog] insertLog error:", JSON.stringify(error));
    console.error("[SleepLog] entry attempted:", JSON.stringify(safeEntry));
    return null;
  }
  return data;
}

async function updateLog(id, changes) {
  const { error } = await supabase.from("sleep_logs").update(changes).eq("id", id);
  if (error) console.error("[SleepLog] updateLog:", error);
}

async function fetchConfig(familyId) {
  if (!familyId) return null;
  const { data } = await supabase.from("sleep_configs").select("*").eq("family_id", familyId).maybeSingle();
  if (!data) return null;
  // Map snake_case DB columns → camelCase app state
  return {
    ...data,
    recommendedWakeWindows: data.recommended_wake_windows || [1.5, 1.75, 2, 2.25],
    method: data.method || "Gradual Withdrawal",
  };
}

async function upsertConfig(familyId, config) {
  // Map camelCase app state → snake_case DB columns
  await supabase.from("sleep_configs").upsert({
    family_id: familyId,
    recommended_wake_windows: config.recommendedWakeWindows,
    method: config.method,
    updated_at: new Date().toISOString(),
  }, { onConflict: "family_id" });
}

// ─── ROOT MODULE ──────────────────────────────────────────────────────────────
export function SleepLog({ user, activeFamily }) {
  const T = useT();
  const [tab, setTab] = useState("dashboard");
  const [dbPin, setDbPin] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [config, setConfigState] = useState({
    recommendedWakeWindows: [1.5, 1.75, 2, 2.25],
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
  Promise.all([fetchLogs(familyId), fetchConfig(familyId)]).then(([logData, cfgData]) => {
    setLogs(logData);
    if (cfgData) setConfigState(cfgData);
    setLoadingLogs(false);
  });
}, [familyId]);

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

  const addEntry = useCallback(async (type, data) => {
    const localId = crypto.randomUUID(); // temp local id for optimistic UI
    const entry = { id: localId, ts: new Date().toISOString(), type, ...data };
    setLogs(prev => [entry, ...prev]); // optimistic
    if (familyId) {
      const saved = await insertLog(familyId, entry);
      if (saved) {
        setLogs(prev => prev.map(l => l.id === localId ? saved : l));
        return saved; // return saved record so callers can get the real DB id
      }
    }
    return entry;
  }, [familyId]);

  const patchEntry = useCallback(async (id, changes) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, ...changes } : l));
    await updateLog(id, changes);
  }, []);

  // ── ANALYTICS ──
  const analytics = useMemo(() => {
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const dayLogs = logs.filter(l => l.ts > dayAgo);

    const sessions = dayLogs.filter(l => l.type === "sleep_session");
    let totalCribMs = 0, wakingMs = 0;
    sessions.forEach(s => {
      if (s.end_ts) {
        totalCribMs += new Date(s.end_ts) - new Date(s.ts);
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
  }, [logs]);

  const isConsultantUser = user?.role === "consultant" || user?.role === "consultant_internal" || user?.role === "admin";
  const TABS = isConsultantUser
    ? ["Dashboard", "Today", "History", "Configure"]
    : ["Dashboard", "Today", "History"];

  return (
    <div style={{ fontFamily: font, color: T.text, paddingBottom: 80, minHeight: "100vh" }}>
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
            {tab === "dashboard"   && <DashboardView analytics={analytics} logs={logs} activeFamily={activeFamily} />}
            {tab === "today"       && <TodayView onLog={addEntry} onPatch={patchEntry} logs={logs} config={config} activeFamily={activeFamily} />}
            {tab === "history"     && <TrendsView logs={logs} />}
            {tab === "configure"  && <ConsultantView config={config} setConfig={setConfig} dbPin={dbPin} isConsultant={isConsultantUser} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardView({ analytics, logs, activeFamily }) {
  const T = useT();
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
            value={analytics.totalOz > 0 ? `${analytics.totalOz}oz bottle` : analytics.nursingCount > 0 ? `${analytics.nursingCount} session${analytics.nursingCount !== 1 ? "s" : ""}` : "None logged"}
            sub={
              analytics.totalOz > 0 && analytics.nursingCount > 0
                ? `+ ${analytics.nursingCount} nursing session${analytics.nursingCount !== 1 ? "s" : ""}`
                : analytics.nursing.totalMins > 0
                ? `${analytics.nursing.totalMins}m nursing · last: ${analytics.nursing.lastSide}`
                : undefined
            }
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
            {l.type === "sleep_session" && l.end_ts && (
              <span style={{ fontSize: 11, color: C.teal, fontWeight: 700 }}>
                {((new Date(l.end_ts) - new Date(l.ts)) / 3600000).toFixed(1)}h
              </span>
            )}
          </div>
        ))}
        {logs.filter(l => isWithin24h(l.ts)).length === 0 && (
          <p style={{ fontSize: 13, color: T.muted, textAlign: "center", padding: "12px 0" }}>No entries yet today</p>
        )}
      </Card>
    </div>
  );
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
function TodayView({ onLog, onPatch, logs, config, activeFamily }) {
  const T = useT();
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", icon: "✓" });
  const toastTimer = useRef(null);

  function showToast(message, icon = "✅") {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message, icon });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2000);
  }

  // ── Persistent sleep session state (survives tab switches via localStorage) ──
  const SESSION_KEY = `rcc_sleep_session_${activeFamily?.id || "default"}`;

  function loadSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
  }
  function saveSession(s) {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }

  const [session, setSession] = useState(() => loadSession());

  // session shape: { state: "put_down"|"asleep", putDownTime, asleepTime, sessionId }

  function updateSession(next) {
    setSession(next);
    saveSession(next);
  }

  const age = calculateAge(activeFamily?.birth_date || activeFamily?.birthDate);
  const totalMonths = age.years * 12 + age.months;
  const showFeeding = totalMonths < 12;
  const showDiapers = age.years < 3;
  const showSolids = totalMonths >= 4;

  // Next sleep suggestion
  const lastSession = logs.find(l => l.type === "sleep_session" && l.end_ts);
  const napCount = logs.filter(l => l.type === "sleep_session" && isToday(l.ts)).length;
  const window_ = config.recommendedWakeWindows[napCount] ?? config.recommendedWakeWindows[config.recommendedWakeWindows.length - 1];
  const suggestedTs = lastSession ? new Date(new Date(lastSession.end_ts).getTime() + window_ * 3600000) : null;
  const suggestedTime = suggestedTs ? fmtTime(suggestedTs.toISOString()) : "---";
  const minsUntil = suggestedTs ? Math.round((suggestedTs - Date.now()) / 60000) : null;

  // ── Handlers ──

  const handlePutDown = (vals) => {
    const putDownTime = vals?.time ? timeStrToISO(vals.time) : new Date().toISOString();
    updateSession({ state: "put_down", putDownTime, asleepTime: null, sessionId: null });
  };

  const handleAsleep = async (vals) => {
    const asleepTime = vals?.time ? timeStrToISO(vals.time) : new Date().toISOString();
    // Save to DB first, get back the real UUID
    showToast("Sleep session started", "💤");
    const saved = await onLog("sleep_session", {
      ts: session?.putDownTime || asleepTime,
      fell_asleep_ts: asleepTime,
      end_ts: null,
    });
    const sessionId = saved?.id || null;
    updateSession({ ...session, state: "asleep", asleepTime, sessionId });
  };

  const handleWakeUp = async (vals) => {
    const endTime = vals?.time ? timeStrToISO(vals.time) : new Date().toISOString();
    const { putDownTime, asleepTime, sessionId } = session || {};
    const fallAsleepSecs = asleepTime && putDownTime
      ? Math.round((new Date(asleepTime) - new Date(putDownTime)) / 1000)
      : null;
    const totalSleepMs = asleepTime
      ? new Date(endTime) - new Date(asleepTime)
      : null;
    if (sessionId) {
      await onPatch(sessionId, {
        end_ts: endTime,
        mood: vals?.mood || null,
        fall_asleep_secs: fallAsleepSecs,
        total_sleep_ms: totalSleepMs,
      });
    } else {
      // No active session (parent just woke, didn't log put down / asleep)
      await onLog("sleep_session", {
        ts: putDownTime || asleepTime || endTime,
        fell_asleep_ts: asleepTime || null,
        end_ts: endTime,
        fall_asleep_secs: fallAsleepSecs,
        total_sleep_ms: totalSleepMs,
        mood: vals?.mood || null,
      });
    }
    updateSession(null);
  };

  const handleNightWaking = (vals) => {
    logAndToast("night_waking", { duration: parseInt(vals?.duration) || 10 }, "Night waking logged", "🌛");
  };

  const openSheet = (cfg) => setSheet(cfg);
  const closeSheet = () => setSheet(null);

  async function logAndToast(type, data, message, icon = "✅") {
    await onLog(type, data);
    showToast(message, icon);
  }

  // Current time string for pre-filling inputs
  function nowTimeStr() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  }

  // Convert HH:MM to full ISO using today's date
  function timeStrToISO(timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  // Derived display values from persisted session
  const putDownDisplay = session?.putDownTime ? fmtTime(session.putDownTime) : null;
  const asleepDisplay = session?.asleepTime ? fmtTime(session.asleepTime) : null;
  const settlingMins = session?.putDownTime && session?.asleepTime
    ? Math.round((new Date(session.asleepTime) - new Date(session.putDownTime)) / 60000)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sheet && (
        <InputSheet title={sheet.title} fields={sheet.fields} onConfirm={(vals) => { sheet.onConfirm(vals); closeSheet(); }} onCancel={closeSheet} />
      )}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
      <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />

      {/* Next Sleep Suggestion */}
      <Card style={{ background: `${C.teal}12`, borderColor: `${C.teal}30` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <SectionLabel>Next Sleep Window</SectionLabel>
            <p style={{ fontSize: 22, fontFamily: serif, color: C.teal, fontWeight: 700 }}>{suggestedTime}</p>
          </div>
          {minsUntil !== null && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 12, color: T.muted }}>in</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: minsUntil < 0 ? C.rose : C.teal }}>
                {minsUntil < 0 ? `${Math.abs(minsUntil)}m ago` : `${minsUntil}m`}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* ── SLEEP TRACKER ── */}
      <Card>
        <SectionLabel>Sleep Tracker</SectionLabel>

        {/* Status summary when session is active */}
        {session && (
          <div style={{
            background: session.state === "asleep" ? `${C.sage}15` : `${C.amber}15`,
            border: `1px solid ${session.state === "asleep" ? C.sage : C.amber}40`,
            borderRadius: 12, padding: "12px 14px", marginBottom: 14,
          }}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
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
              {settlingMins !== null && (
                <div>
                  <p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>Settling</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.purple }}>{settlingMins}m</p>
                </div>
              )}
            </div>
            <p style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
              {session.state === "asleep" ? "💤 Baby is sleeping" : "⏳ Waiting for sleep…"}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Put Down */}
          <button
            onClick={() => openSheet({
              title: "🛏️ Put Down",
              fields: [{ key: "time", label: "Time put down", type: "time", default: nowTimeStr() }],
              onConfirm: handlePutDown,
            })}
            disabled={session?.state === "put_down" || session?.state === "asleep"}
            style={{
              padding: "14px 18px", borderRadius: 14, border: `2px solid ${C.amber}`,
              background: session?.state === "put_down" || session?.state === "asleep" ? `${C.amber}15` : `${C.amber}25`,
              color: C.amber, fontFamily: font, fontSize: 14, fontWeight: 700,
              cursor: session?.state === "put_down" || session?.state === "asleep" ? "default" : "pointer",
              opacity: session?.state === "put_down" || session?.state === "asleep" ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>🛏️</span>
            <div style={{ textAlign: "left" }}>
              <div>Put Down</div>
              {putDownDisplay && <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>{putDownDisplay}</div>}
            </div>
            {(!session?.state) && <span style={{ marginLeft: "auto", opacity: 0.5 }}>tap to log</span>}
          </button>

          {/* Fell Asleep */}
          <button
            onClick={() => openSheet({
              title: "💤 Fell Asleep",
              fields: [{ key: "time", label: "Time fell asleep", type: "time", default: nowTimeStr() }],
              onConfirm: handleAsleep,
            })}
            disabled={session?.state === "asleep" || !session?.state && false}
            style={{
              padding: "14px 18px", borderRadius: 14, border: `2px solid ${C.purple}`,
              background: session?.state === "asleep" ? `${C.purple}15` : `${C.purple}25`,
              color: C.purple, fontFamily: font, fontSize: 14, fontWeight: 700,
              cursor: session?.state === "asleep" ? "default" : "pointer",
              opacity: session?.state === "asleep" ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>💤</span>
            <div style={{ textAlign: "left" }}>
              <div>Fell Asleep</div>
              {asleepDisplay && <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>{asleepDisplay}</div>}
            </div>
            {(!session || session.state === "put_down") && !session?.state === "asleep" && <span style={{ marginLeft: "auto", opacity: 0.5 }}>tap to log</span>}
          </button>

          {/* Woke Up */}
          <button
            onClick={() => openSheet({
              title: "🌅 Woke Up",
              fields: [
                { key: "time", label: "Time woke up", type: "time", default: nowTimeStr() },
                { key: "mood", label: "Wake-up mood", type: "select", options: MOODS.map(m => m.id), default: "" },
              ],
              onConfirm: handleWakeUp,
            })}
            style={{
              padding: "14px 18px", borderRadius: 14, border: `2px solid ${C.sage}`,
              background: `${C.sage}25`,
              color: C.sage, fontFamily: font, fontSize: 14, fontWeight: 700,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>🌅</span>
            <div style={{ textAlign: "left" }}>
              <div>Woke Up</div>
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>ends session</div>
            </div>
          </button>

          {/* Night Waking */}
          <button
            onClick={() => openSheet({
              title: "🌛 Night Waking",
              fields: [
                { key: "time", label: "Time of waking", type: "time", default: nowTimeStr() },
                { key: "duration", label: "Duration awake (minutes)", type: "number", placeholder: "e.g. 20" },
              ],
              onConfirm: (vals) => { onLog("night_waking", {
                ts: vals.time ? timeStrToISO(vals.time) : new Date().toISOString(),
                duration: parseInt(vals.duration) || 10,
              }); showToast("Night waking logged", "🌛"); },
            })}
            style={{
              padding: "14px 18px", borderRadius: 14, border: `2px solid ${C.mauve}`,
              background: `${C.mauve}15`,
              color: C.mauve, fontFamily: font, fontSize: 14, fontWeight: 700,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>🌛</span>
            <div style={{ textAlign: "left" }}>
              <div>Night Waking</div>
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>mid-session</div>
            </div>
          </button>

          {/* Cancel session */}
          {session && (
            <button
              onClick={() => { if (window.confirm("Clear the current sleep session?")) updateSession(null); }}
              style={{
                padding: "8px", borderRadius: 10, border: `1px solid ${T.border}`,
                background: "transparent", color: T.muted, fontFamily: font, fontSize: 12,
                cursor: "pointer",
              }}
            >
              Clear session
            </button>
          )}
        </div>
      </Card>

      {/* ── FEEDING ── */}
      {showFeeding && (
        <Card>
          <SectionLabel>Feeding</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Btn outline onClick={() => openSheet({
              title: "Log Nursing",
              fields: [
                { key: "side", label: "Side", type: "select", options: ["Left", "Right", "Both"] },
                { key: "duration", label: "Duration (minutes)", type: "number", placeholder: "e.g. 15" },
              ],
              onConfirm: (v) => { onLog("feed", { mode: "nursing", side: v.side, duration: parseInt(v.duration) || 0 }); showToast("Nursing session logged", "🤱"); },
            })}>🤱 Nursing</Btn>
            <Btn outline onClick={() => openSheet({
              title: "Log Bottle",
              fields: [{ key: "amount", label: "Ounces", type: "number", placeholder: "e.g. 4" }],
              onConfirm: (v) => { onLog("feed", { mode: "bottle", amount: parseFloat(v.amount) || 0 }); showToast("Bottle logged", "🍼"); },
            })}>🍼 Bottle</Btn>
          </div>
        </Card>
      )}

      {/* ── DIAPERS ── */}
      {showDiapers && (
        <Card>
          <SectionLabel>Diaper</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Btn variant="sky" outline onClick={() => logAndToast("diaper", { sub_type: "wet" }, "Wet diaper logged", "💦")}>💦 Wet</Btn>
            <Btn variant="mauve" outline onClick={() => openSheet({
              title: "Dirty Diaper",
              fields: [{ key: "description", label: "Type", type: "select", options: POOP_TYPES }],
              onConfirm: (v) => { onLog("diaper", { sub_type: "dirty", description: v.description }); showToast("Dirty diaper logged", "💩"); },
            })}>💩 Dirty</Btn>
          </div>
        </Card>
      )}

      {/* ── SOLIDS ── */}
      {showSolids && (
        <Card>
          <SectionLabel>Solids</SectionLabel>
          <Btn outline style={{ width: "100%" }} onClick={() => openSheet({
            title: "Log Solids",
            fields: [
              { key: "food", label: "Food", type: "text", placeholder: "e.g. Sweet potato" },
              { key: "reaction", label: "Reaction (optional)", type: "text", placeholder: "e.g. Loved it!" },
            ],
            onConfirm: (v) => { onLog("solids", { food: v.food, reaction: v.reaction }); showToast("Solids logged", "🥣"); },
          })}>🍲 Log Food</Btn>
        </Card>
      )}

      {/* ── MOOD ── */}
      <Card>
        <SectionLabel>Overall Mood</SectionLabel>
        <p style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
          How is baby doing overall right now?
        </p>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {MOODS.map(m => (
            <button
              key={m.id}
              onClick={() => logAndToast("mood", { mood: m.id }, "Mood logged", m.emoji)}
              style={{
                background: "none",
                border: `2px solid ${T.border}`,
                borderRadius: 14,
                padding: "10px 6px",
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                flex: 1,
                margin: "0 3px",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.background = `${m.color}15`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = "none"; }}
              title={m.label}
            >
              <span style={{ fontSize: 26 }}>{m.emoji}</span>
              <span style={{ fontSize: 10, color: T.muted, fontFamily: font, fontWeight: 600 }}>{m.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TrendsView({ logs }) {
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
                  {s.end_ts ? ` · Slept ${((new Date(s.end_ts) - new Date(s.ts)) / 3600000).toFixed(1)}h` : " · In progress"}
                </p>
              )}
            </div>
            {s.mood && (
              <span style={{ fontSize: 20 }}>{MOODS.find(m => m.id === s.mood)?.emoji || "😴"}</span>
            )}
          </div>
        ))}
        {logs.filter(l => l.type === "sleep_session").length === 0 && (
          <p style={{ fontSize: 13, color: T.muted, textAlign: "center", padding: "12px 0" }}>No sessions logged yet</p>
        )}
      </Card>
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <SectionLabel>Wake Window Configuration</SectionLabel>
        <p style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Set recommended wake windows in sequence (hours between sleep periods).</p>
        {config.recommendedWakeWindows.map((ww, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Window {i + 1}</p>
              <p style={{ fontSize: 11, color: T.muted }}>{i === 0 ? "First nap" : i === config.recommendedWakeWindows.length - 1 ? "Before bedtime" : `Nap ${i + 1}`}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => {
                const n = [...config.recommendedWakeWindows]; n[i] = Math.max(0.5, parseFloat((n[i] - 0.25).toFixed(2)));
                setConfig({ ...config, recommendedWakeWindows: n });
              }} style={{ width: 30, height: 30, border: `1px solid ${T.border}`, borderRadius: 8, background: T.inputBg, color: T.text, fontSize: 16, cursor: "pointer" }}>−</button>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.teal, minWidth: 36, textAlign: "center" }}>{ww}h</span>
              <button onClick={() => {
                const n = [...config.recommendedWakeWindows]; n[i] = parseFloat((n[i] + 0.25).toFixed(2));
                setConfig({ ...config, recommendedWakeWindows: n });
              }} style={{ width: 30, height: 30, border: `1px solid ${T.border}`, borderRadius: 8, background: T.inputBg, color: T.text, fontSize: 16, cursor: "pointer" }}>+</button>
            </div>
          </div>
        ))}
        <Divider />
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Btn outline size="sm" onClick={() => setConfig({ ...config, recommendedWakeWindows: [...config.recommendedWakeWindows, 2.0] })}>
            + Add Window
          </Btn>
          {config.recommendedWakeWindows.length > 1 && (
            <Btn outline size="sm" onClick={() => setConfig({ ...config, recommendedWakeWindows: config.recommendedWakeWindows.slice(0, -1) })}>
              − Remove Last
            </Btn>
          )}
        </div>
      </Card>

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

function logIcon(l) {
  if (l.type === "sleep_session") return "💤";
  if (l.type === "night_waking") return "🌛";
  if (l.type === "feed") return l.mode === "nursing" ? "🤱" : "🍼";
  if (l.type === "diaper") return l.sub_type === "dirty" ? "💩" : "💦";
  if (l.type === "solids") return "🍲";
  return "📋";
}
function logLabel(l) {
  if (l.type === "sleep_session") return l.end_ts ? "Sleep session" : "Sleeping…";
  if (l.type === "night_waking") return "Night waking";
  if (l.type === "feed") return l.mode === "nursing" ? `Nursing ${l.side || ""}` : `Bottle ${l.amount || ""}oz`;
  if (l.type === "diaper") return l.sub_type === "dirty" ? `Dirty: ${l.description || ""}` : "Wet diaper";
  if (l.type === "solids") return `${l.food}`;
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
