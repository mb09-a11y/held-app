// src/modules/sleep/TodayView.jsx
// Today tab — wireframe-matched visual treatment.
// Next Sleep Window: compact card. Sleep steps: row style. WeatherCard: always visible.
// Feeding: Nurse/Bottle/Pump/Solids grid. Growth: separate tiles per metric.

import { useState, useEffect, useMemo, useRef } from "react";
import { useT, useApp } from "../../core/shared.jsx";
import { C, MOODS, font, serif,
  calcAgeMonths, calculateAge, defaultWakeWindowsForAge, defaultNapDurationsForAge,
  localDateStr, isToday, fmtTime, fmtDuration,
} from "./sleepHelpers.js";
import { Card, SectionLabel, LogTile, Toast, InputSheet, Divider } from "./sleepUI.jsx";

// ─── WEATHER CARD ─────────────────────────────────────────────────────────────
function WeatherCard({ childName, suggestedBedtime }) {
  const T = useT();
  const [wx, setWx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setGeoError(true); setLoading(false); return; }
    const timeout = setTimeout(() => { setGeoError(true); setLoading(false); }, 8000);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      clearTimeout(timeout);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weathercode,uv_index&temperature_unit=fahrenheit&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();
        const c = data.current;
        const temp = Math.round(c.temperature_2m);
        const uv = Math.round(c.uv_index ?? 0);
        const code = c.weathercode ?? 0;
        const wxLabel = (wc) => {
          if (wc === 0) return ["☀️", "Sunny"];
          if (wc <= 2)  return ["🌤", "Mostly Sunny"];
          if (wc <= 3)  return ["☁️", "Cloudy"];
          if (wc <= 49) return ["🌫", "Foggy"];
          if (wc <= 67) return ["🌧", "Rainy"];
          if (wc <= 77) return ["❄️", "Snowy"];
          if (wc <= 82) return ["🌦", "Showers"];
          return ["⛈️", "Stormy"];
        };
        const [condIcon, condLabel] = wxLabel(code);
        const uvLabel = uv <= 2 ? "Low" : uv <= 5 ? "Moderate" : uv <= 7 ? "High" : "Very High";
        const uvHigh = uv >= 6;
        const warm = temp >= 78;
        let interp = null, interpSub = null;
        if (warm && uv >= 6) {
          interp = `Big sun day. ${childName}'s body has been working harder than it looks — consider pulling bedtime 10–15 minutes earlier tonight.`;
          interpSub = "Sunlight + warmth accelerates adenosine buildup — she'll hit her limit earlier than usual.";
        } else if (warm) {
          interp = `Warm day. Heat increases metabolic load — watch for tired signs a little earlier than usual.`;
          interpSub = "Staying hydrated helps regulate the nervous system and supports easier settling.";
        } else if ([95,96,99].includes(code) || (code >= 80 && code <= 82)) {
          interp = `Stormy or rainy weather can disrupt sleep pressure for some babies. Keep the room dark and use white noise.`;
          interpSub = "Low barometric pressure can affect sleep onset — a slightly earlier bedtime may help.";
        } else if (code <= 1) {
          interp = `Good conditions today. Outdoor light exposure in the morning supports a healthy circadian rhythm.`;
          interpSub = "Morning sunlight within 30–60 min of waking anchors the sleep-wake cycle.";
        }
        setWx({ temp, condIcon, condLabel, uv, uvLabel, uvHigh, warm, interp, interpSub });
        setLoading(false);
      } catch {
        setGeoError(true); setLoading(false);
      }
    }, () => { clearTimeout(timeout); setGeoError(true); setLoading(false); });
  }, []);

  if (dismissed) return null;

  const cardBg = "linear-gradient(135deg, #EAF4F0, #E8EEE4)";
  const tileBg = "white";
  const borderCol = "#C4D2C2";

  return (
    <div style={{ borderRadius: 16, padding: "13px 15px", background: cardBg, border: `1px solid ${borderCol}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, color: C.sage, fontFamily: font }}>
          Today's Conditions
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, color: "#888", fontStyle: "italic", fontFamily: font }}>via weather data</span>
          <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888", padding: 0, lineHeight: 1 }}>✕</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "10px 0", fontFamily: font, fontSize: 12, color: "#888", textAlign: "center" }}>
          Fetching conditions…
        </div>
      ) : geoError ? (
        <div style={{ padding: "8px 0 4px", fontFamily: font, fontSize: 12, color: "#888", lineHeight: 1.55 }}>
          Enable location access to see today's conditions and get sleep nudges based on the weather.
        </div>
      ) : wx ? (
        <>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 10px" }}>
            {[
              { top: wx.condIcon, bottom: wx.condLabel, large: true },
              { top: `${wx.temp}°F`, bottom: wx.temp >= 85 ? "Hot" : wx.temp >= 78 ? "Warm" : wx.temp >= 65 ? "Mild" : "Cool" },
              { top: `UV ${wx.uv}`, bottom: wx.uvLabel, highlight: wx.uvHigh },
            ].map((tile, i) => (
              <div key={i} style={{ flex: 1, background: tileBg, borderRadius: 11, padding: "8px 10px", textAlign: "center", boxShadow: "0 1px 5px rgba(90,70,60,0.06)" }}>
                <div style={{ fontSize: tile.large ? 20 : 15, fontWeight: 700, color: tile.highlight ? C.mauve : "#333", marginBottom: 2 }}>{tile.top}</div>
                <div style={{ fontFamily: font, fontSize: 10, color: tile.highlight ? C.mauve : "#666" }}>{tile.bottom}</div>
              </div>
            ))}
          </div>
          {wx.interp && (
            <div style={{ background: tileBg, borderRadius: 10, padding: "9px 11px" }}>
              <p style={{ fontFamily: serif, fontSize: 14, fontStyle: "italic", color: "#333", lineHeight: 1.5, margin: "0 0 5px" }}>"{wx.interp}"</p>
              {wx.interpSub && <p style={{ fontFamily: font, fontSize: 10, color: "#888", lineHeight: 1.5, margin: "0 0 8px" }}>{wx.interpSub}</p>}
              {(wx.warm || wx.uvHigh) && suggestedBedtime && suggestedBedtime !== "---" && (
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <button style={{ background: C.sage, color: "white", fontFamily: font, fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 20, border: "none", cursor: "pointer" }}>
                    Move bedtime to {suggestedBedtime} →
                  </button>
                  <button style={{ border: `1.5px solid ${borderCol}`, color: "#888", background: tileBg, fontFamily: font, fontSize: 11, padding: "5px 11px", borderRadius: 20, cursor: "pointer" }}>
                    Remind me later
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ─── TODAY VIEW ───────────────────────────────────────────────────────────────
export function TodayView({ onLog, onPatch, logs, config, activeFamily, hasOpenDBSession }) {
  const T = useT();
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", icon: "✓" });
  const toastTimer = useRef(null);
  const { pendingSleepAction, setPendingSleepAction, activeChild: sleepActiveChild } = useApp();

  function showToast(message, icon = "✅") {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message, icon });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  }

  // ── Active session ──
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

  function updateSession(_next) {}

  const [sessionType, setSessionType] = useState("nap");

  const age = calculateAge(sleepActiveChild?.dob || activeFamily?.birth_date || activeFamily?.birthDate);
  const totalMonths = age.years * 12 + age.months;
  const showFeeding = true;
  const showSolids  = true;
  const showDiapers = age.years < 4;

  // ── Wake window / next sleep ──
  const childDob = sleepActiveChild?.dob || activeFamily?.birth_date || activeFamily?.birthDate;
  const ageMonthsForWindow = calcAgeMonths(childDob);
  const ageBasedWindows = ageMonthsForWindow !== null ? defaultWakeWindowsForAge(ageMonthsForWindow) : [1.5, 2.0, 2.5, 3.0];
  const effectiveWindows = config.recommendedWakeWindows || ageBasedWindows;

  const nowMs = Date.now();
  const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
  const completedSessions = [...logs]
    .filter(l => {
      if (l.type !== "sleep_session" || !l.end_ts) return false;
      const endMs = new Date(l.end_ts).getTime();
      return Number.isFinite(endMs) && endMs <= nowMs + FUTURE_TOLERANCE_MS;
    })
    .sort((a, b) => new Date(b.end_ts) - new Date(a.end_ts));

  const napCount = logs.filter(l => {
    if (l.type !== "sleep_session" || !isToday(l.ts)) return false;
    if (l.session_type === "night") return false;
    if (l.session_type === "nap") return true;
    return new Date(l.ts).getHours() >= 6;
  }).length;

  const lastWakeUp = completedSessions[0] || null; // most recent wake regardless of type
  const window_ = effectiveWindows[napCount] ?? effectiveWindows[effectiveWindows.length - 1];

  const ageBasedNapDuration = ageMonthsForWindow !== null ? defaultNapDurationsForAge(ageMonthsForWindow) : [60, 70, 90];
  const effectiveNapDuration = config.napDurations || ageBasedNapDuration;
  const napTargetMins = effectiveNapDuration[1] ?? 70;
  const napMinMins = effectiveNapDuration[0] ?? 60;

  const suggestedTs = lastWakeUp ? new Date(new Date(lastWakeUp.end_ts).getTime() + window_ * 3600000) : null;
  const suggestedTime = suggestedTs ? suggestedTs.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "---";
  const minsUntil = suggestedTs ? Math.round((suggestedTs.getTime() - Date.now()) / 60000) : null;

  // ── Suggested wake during session ──
  const suggestedWakeUpTime = (() => {
    if (!session?.putDownTime) return null;
    const putDownMs = new Date(session.putDownTime).getTime();
    const asleepMs = session.asleepTime ? new Date(session.asleepTime).getTime() : putDownMs;
    if (session.sessionType === "night") {
      const targetWakeStr = config.targetMorningWake;
      if (targetWakeStr) {
        const match = targetWakeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
        if (match) {
          let h = parseInt(match[1]); const m = parseInt(match[2]); const meridiem = match[3]?.toLowerCase();
          if (meridiem === "pm" && h < 12) h += 12;
          if (meridiem === "am" && h === 12) h = 0;
          const wakeDate = new Date(putDownMs); wakeDate.setHours(h, m, 0, 0);
          for (let attempt = 0; attempt < 3; attempt++) {
            const hoursAfter = (wakeDate.getTime() - putDownMs) / 3600000;
            if (hoursAfter >= 7 && hoursAfter <= 14) return wakeDate;
            if (hoursAfter > 14) break;
            wakeDate.setDate(wakeDate.getDate() + 1); wakeDate.setHours(h, m, 0, 0);
          }
        }
      }
      return new Date(putDownMs + 12 * 3600000);
    } else {
      return new Date(asleepMs + napTargetMins * 60000);
    }
  })();

  // ── Local time helpers ──
  function nowTimeStr() { const now = new Date(); return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`; }
  function nowDateStr() { return localDateStr(new Date()); }
  function dateTimeToISO(dateStr, timeStr, referenceISO) {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(dateStr + "T00:00:00"); d.setHours(h, m, 0, 0);
    if (referenceISO) { const ref = new Date(referenceISO); if (d < ref) d.setDate(d.getDate() + 1); }
    const pad = n => String(n).padStart(2, "0");
    const localISO = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    const off = -d.getTimezoneOffset(); const sign = off >= 0 ? "+" : "-";
    const offH = pad(Math.floor(Math.abs(off) / 60)); const offM = pad(Math.abs(off) % 60);
    return `${localISO}${sign}${offH}:${offM}`;
  }
  function timeStrToISO(timeStr, referenceISO) { return dateTimeToISO(nowDateStr(), timeStr, referenceISO); }

  const openSheet = (cfg) => setSheet(cfg);
  const closeSheet = () => setSheet(null);

  async function logAndToast(type, data, message, icon = "✅") {
    await onLog(type, data); showToast(message, icon);
  }

  // ── Sleep step handlers ──
  const handlePutDown = async (vals) => {
    const putDownTime = (vals?.date && vals?.time) ? dateTimeToISO(vals.date, vals.time) : new Date().toISOString();
    showToast("Put down logged", "🛏️");
    await onLog("sleep_session", { ts: putDownTime, fell_asleep_ts: null, end_ts: null, session_type: sessionType });
  };

  const handleAsleep = async (vals) => {
    const asleepTime = (vals?.date && vals?.time) ? dateTimeToISO(vals.date, vals.time, session?.putDownTime) : new Date().toISOString();
    showToast("Falling asleep logged", "💤");
    if (session?.sessionId) {
      await onPatch(session.sessionId, { fell_asleep_ts: asleepTime });
    } else {
      await onLog("sleep_session", { ts: session?.putDownTime || asleepTime, fell_asleep_ts: asleepTime, end_ts: null, session_type: session?.sessionType || sessionType });
    }
  };

  const handleWakeUp = async (vals) => {
    const reference = session?.asleepTime || session?.putDownTime || null;
    const endTime = (vals?.date && vals?.time) ? dateTimeToISO(vals.date, vals.time, reference) : new Date().toISOString();
    const { putDownTime, asleepTime } = session || {};
    let { sessionId } = session || {};
    if (!sessionId && activeFamily?.id) {
      const { data: openRows } = await import("../../lib/supabase.js").then(({ supabase }) =>
        supabase.from("sleep_logs").select("id, ts, fell_asleep_ts").eq("family_id", activeFamily.id)
          .eq("type", "sleep_session").is("end_ts", null).order("ts", { ascending: false }).limit(1)
      );
      if (openRows?.length > 0) {
        const openRow = openRows[0]; sessionId = openRow.id;
        const fallAsleepSecs = openRow.fell_asleep_ts && openRow.ts ? Math.round((new Date(openRow.fell_asleep_ts) - new Date(openRow.ts)) / 1000) : null;
        const totalSleepMs = openRow.fell_asleep_ts ? Math.max(0, new Date(endTime) - new Date(openRow.fell_asleep_ts)) : Math.max(0, new Date(endTime) - new Date(openRow.ts));
        await onPatch(sessionId, { end_ts: endTime, mood: vals?.mood || null, fall_asleep_secs: fallAsleepSecs, total_sleep_ms: totalSleepMs });
        showToast("Wake up logged ✓", "☀️"); return;
      }
    }
    const fallAsleepSecs = asleepTime && putDownTime ? Math.round((new Date(asleepTime) - new Date(putDownTime)) / 1000) : null;
    const totalSleepMs = asleepTime ? Math.max(0, new Date(endTime) - new Date(asleepTime)) : null;
    if (sessionId) {
      await onPatch(sessionId, { end_ts: endTime, mood: vals?.mood || null, fall_asleep_secs: fallAsleepSecs, total_sleep_ms: totalSleepMs });
    } else {
      await onLog("sleep_session", { ts: putDownTime || endTime, fell_asleep_ts: asleepTime || null, end_ts: endTime, session_type: sessionType, mood: vals?.mood || null, fall_asleep_secs: fallAsleepSecs, total_sleep_ms: totalSleepMs });
    }
    updateSession(null); showToast("Wake up logged ✓", "☀️");
  };

  const handleNightWaking = (vals) => {
    const ts = vals?.time ? timeStrToISO(vals.time) : new Date().toISOString();
    onLog("night_waking", { ts, duration: parseInt(vals?.duration) || 10, description: vals?.notes || null });
    showToast("Night waking logged", "🌛");
  };

  const putDownDisplay = session?.putDownTime ? fmtTime(session.putDownTime) : null;
  const asleepDisplay = session?.asleepTime ? fmtTime(session.asleepTime) : null;
  const inCribMins = session?.putDownTime ? Math.round((Date.now() - new Date(session.putDownTime)) / 60000) : null;
  const sleepingMins = session?.asleepTime ? Math.round((Date.now() - new Date(session.asleepTime)) / 60000) : null;

  // ── Auto-open sheet from quick-log ──
  const pendingActionRef = useRef(pendingSleepAction);
  useEffect(() => {
    const action = pendingActionRef.current;
    if (!action) return;
    if (setPendingSleepAction) setPendingSleepAction(null);
    const t = setTimeout(() => {
      const d = nowDateStr(), ti = nowTimeStr();
      if (action === "put_down") openSheet({ title: "🛏️ Put Down", fields: [{ key: "date", label: "Date", type: "date", default: d }, { key: "time", label: "Time put down", type: "time", default: ti }], onConfirm: handlePutDown });
      else if (action === "woke_up") openSheet({ title: "☀️ Woke Up", fields: [{ key: "date", label: "Date", type: "date", default: d }, { key: "time", label: "Wake up time", type: "time", default: ti }, { key: "mood", label: "Wake-up mood", type: "select", options: ["happy","neutral","fussy","sleepy","upset"], default: "" }], onConfirm: handleWakeUp });
      else if (action === "night_waking") openSheet({ title: "🌛 Night Waking", fields: [{ key: "date", label: "Date", type: "date", default: d }, { key: "time", label: "Time", type: "time", default: ti }, { key: "duration", label: "Duration (minutes)", type: "number", default: "10" }, { key: "notes", label: "Notes (optional)", type: "text", default: "" }], onConfirm: (vals) => handleNightWaking(vals) });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  // ── Yesterday Meaning Maker ──
  const yesterdayMM = useMemo(() => {
    const yStart = new Date(); yStart.setDate(yStart.getDate()-1); yStart.setHours(0,0,0,0);
    const yEnd = new Date(); yEnd.setDate(yEnd.getDate()-1); yEnd.setHours(23,59,59,999);
    const yLogs = logs.filter(l => { const t=new Date(l.ts).getTime(); return t>=yStart.getTime()&&t<=yEnd.getTime(); });
    const ySess = yLogs.filter(l=>l.type==="sleep_session"&&l.end_ts);
    const yNaps = ySess.filter(l=>l.session_type!=="night");
    const yNapH = yNaps.reduce((s,l)=>s+Math.max(0,new Date(l.end_ts)-new Date(l.ts)),0)/3600000;
    const yNightWakes = yLogs.filter(l=>l.type==="night_waking").length;
    const tgtNapH = ageMonthsForWindow!==null?(ageMonthsForWindow<6?3.5:ageMonthsForWindow<12?3:ageMonthsForWindow<18?2.5:2):3;
    const childN = sleepActiveChild?.name ?? "your little one";
    if (yNapH < tgtNapH-0.5 && yNaps.length>0 && yNightWakes>=1)
      return `Two short naps yesterday + a night waking → today's window of tolerance is probably smaller. For ${childN} and for you.`;
    if (yNapH < tgtNapH-0.5 && yNaps.length>0)
      return `${childN} ran short on nap sleep yesterday. She may show tired signs earlier today than usual.`;
    if (yNightWakes >= 3)
      return `${yNightWakes} night wakings last night. Her nervous system is still recovering — expect more sensitivity today.`;
    return null;
  }, [logs, ageMonthsForWindow, sleepActiveChild?.name]);

  // ── Timeline ──
  const todaySessions = useMemo(() => {
    const today = new Date().toDateString();
    return logs.filter(l=>l.type==="sleep_session"&&new Date(l.ts).toDateString()===today).sort((a,b)=>new Date(a.ts)-new Date(b.ts));
  }, [logs]);

  const todayDaytimeSleepH = useMemo(() =>
    todaySessions.filter(l=>l.session_type!=="night"&&l.end_ts).reduce((s,l)=>s+Math.max(0,new Date(l.end_ts)-new Date(l.ts)),0)/3600000
  , [todaySessions]);

  const napTgtH = ageMonthsForWindow!==null?(ageMonthsForWindow<6?3.5:ageMonthsForWindow<12?3:ageMonthsForWindow<18?2.5:2):3;
  const napProgress = Math.min(todayDaytimeSleepH/napTgtH, 1);

  function fmtHLocal(h) { const hrs=Math.floor(h),mins=Math.round((h-hrs)*60); return mins>0?`${hrs}h ${mins}m`:`${hrs}h`; }
  const TL_START=6, TL_END=20;
  function toPct(iso) { const h=new Date(iso).getHours()+new Date(iso).getMinutes()/60; return Math.max(0,Math.min(100,((h-TL_START)/(TL_END-TL_START))*100)); }

  // ── Step button row style ──
  function StepRow({ icon, label, sub, isLogged, color, onClick, divider }) {
    return (
      <>
        <button onClick={onClick} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 14,
          padding: "13px 16px", borderRadius: 14,
          border: `1px solid ${isLogged ? color : T.border}`,
          background: isLogged ? `${color}12` : T.faint,
          cursor: "pointer", textAlign: "left",
          borderLeft: `3px solid ${isLogged ? color : T.border}`,
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: isLogged ? color : T.text }}>{label}</div>
            <div style={{ fontFamily: font, fontSize: 11, color: T.muted, marginTop: 1 }}>{sub}</div>
          </div>
          {isLogged && <span style={{ fontFamily: font, fontSize: 12, color: color, fontWeight: 700, flexShrink: 0 }}>{isLogged}</span>}
        </button>
        {divider && <div style={{ height: 1, background: T.border, margin: "2px 0" }} />}
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
      <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />
      {sheet && <InputSheet title={sheet.title} fields={sheet.fields} onConfirm={(vals) => { sheet.onConfirm(vals); closeSheet(); }} onCancel={closeSheet} />}

      {/* ── Sleep Tracker ── */}
      <Card>
        <SectionLabel>Sleep</SectionLabel>

        {/* Nap / Night toggle */}
        {!session && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[{ id: "nap", label: "☀️ Nap" }, { id: "night", label: "🌙 Night Sleep" }].map(opt => (
              <button key={opt.id} onClick={() => setSessionType(opt.id)} style={{
                flex: 1, padding: "9px 0", borderRadius: 10,
                border: `1.5px solid ${sessionType === opt.id ? T.sage : T.border}`,
                background: sessionType === opt.id ? `${T.sage}18` : "transparent",
                color: sessionType === opt.id ? T.sage : T.muted,
                fontFamily: font, fontSize: 13, fontWeight: sessionType === opt.id ? 700 : 500,
                cursor: "pointer",
              }}>{opt.label}</button>
            ))}
          </div>
        )}

        {/* In-progress session status */}
        {session && (
          <div style={{ background: session.asleepTime ? `${C.sage}15` : `${C.amber}15`, border: `1px solid ${session.asleepTime ? C.sage : C.amber}40`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 8 }}>
              {putDownDisplay && <div><p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: font }}>Put down</p><p style={{ fontSize: 16, fontWeight: 700, color: C.amber, fontFamily: font }}>{putDownDisplay}</p></div>}
              {asleepDisplay && <div><p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: font }}>Fell asleep</p><p style={{ fontSize: 16, fontWeight: 700, color: C.sage, fontFamily: font }}>{asleepDisplay}</p></div>}
              {inCribMins !== null && !session.asleepTime && <div><p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: font }}>In crib</p><p style={{ fontSize: 16, fontWeight: 700, color: C.amber, fontFamily: font }}>{fmtDuration(inCribMins)}</p></div>}
              {sleepingMins !== null && <div><p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: font }}>Sleeping</p><p style={{ fontSize: 16, fontWeight: 700, color: C.sage, fontFamily: font }}>{fmtDuration(sleepingMins)}</p></div>}
            </div>
            <p style={{ fontSize: 11, color: T.muted, fontFamily: font }}>{session.asleepTime ? "💤 Baby is sleeping" : "⏳ Waiting for sleep…"}</p>
          </div>
        )}

        {/* Step rows — wireframe style */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <StepRow icon="🛏️" label="Put Down" sub={putDownDisplay ? `Logged · tap to update` : "Tap to log"} isLogged={putDownDisplay} color={C.amber}
            onClick={() => openSheet({ title: "🛏️ Put Down", fields: [{ key: "date", label: "Date", type: "date", default: nowDateStr() }, { key: "time", label: "Time put down", type: "time", default: nowTimeStr() }], onConfirm: handlePutDown })} />
          <StepRow icon="💤" label="Fell Asleep" sub={asleepDisplay ? `Logged · tap to update` : session?.putDownTime ? "Tap to log" : "Log put down first, or tap to log directly"} isLogged={asleepDisplay} color={C.purple}
            onClick={() => openSheet({ title: "💤 Fell Asleep", fields: [{ key: "date", label: "Date", type: "date", default: nowDateStr() }, { key: "time", label: "Time fell asleep", type: "time", default: nowTimeStr() }], onConfirm: handleAsleep })} />
          <StepRow icon="☀️" label="Woke Up" sub="Log even without prior steps" color={T.sage}
            onClick={() => openSheet({ title: "☀️ Woke Up", fields: [{ key: "date", label: "Date", type: "date", default: nowDateStr() }, { key: "time", label: "Wake up time", type: "time", default: nowTimeStr() }, { key: "mood", label: "Wake-up mood", type: "select", options: ["happy","neutral","fussy","sleepy","upset"], default: "" }], onConfirm: handleWakeUp })} />

          <div style={{ height: 1, background: T.border, margin: "2px 0" }} />

          <StepRow icon="🌛" label="Night Waking" sub="Log a wake between sleeps" color={T.muted}
            onClick={() => openSheet({ title: "🌛 Night Waking", fields: [{ key: "time", label: "Time", type: "time", default: nowTimeStr() }, { key: "duration", label: "Duration (minutes)", type: "number", default: "10" }, { key: "notes", label: "Notes (optional)", type: "text", default: "" }], onConfirm: (vals) => handleNightWaking(vals) })} />
        </div>
      </Card>


      {/* ── Feeding ── */}
      {(showFeeding || showSolids) && (
        <Card>
          <SectionLabel>Feeding</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {showFeeding && (<>
              <LogTile icon="🤱" label="Nurse" sub="Left · Right" onClick={() => openSheet({ title: "🤱 Nursing", fields: [{ key: "start_time", label: "Started at", type: "time", default: nowTimeStr() }, { key: "side", label: "Side", type: "select", options: ["left","right","both"], default: "left" }, { key: "duration", label: "Duration (mins)", type: "number", default: "10" }], onConfirm: (v) => { const startISO = v.start_time ? timeStrToISO(v.start_time) : new Date().toISOString(); logAndToast("feed", { mode: "nursing", ts: startISO, side: v.side, duration: parseInt(v.duration) || 10 }, "Nursing logged", "🤱"); } })} />
              <LogTile icon="🍼" label="Bottle" sub="oz / ml" onClick={() => openSheet({ title: "🍼 Bottle", fields: [{ key: "time", label: "Time", type: "time", default: nowTimeStr() }, { key: "amount", label: "Amount (oz)", type: "number", default: "4" }], onConfirm: (v) => { const ts = v.time ? timeStrToISO(v.time) : new Date().toISOString(); logAndToast("feed", { mode: "bottle", ts, amount: parseFloat(v.amount) || 0 }, "Bottle logged", "🍼"); } })} />
              <LogTile icon="🫙" label="Pump" onClick={() => openSheet({ title: "🫙 Pump Session", fields: [{ key: "start_time", label: "Started at", type: "time", default: nowTimeStr() }, { key: "duration", label: "Duration (mins)", type: "number", default: "15" }, { key: "amount", label: "Amount expressed (oz)", type: "number", default: "" }, { key: "side", label: "Side", type: "select", options: ["left","right","both"], default: "both" }], onConfirm: (v) => { const startISO = v.start_time ? timeStrToISO(v.start_time) : new Date().toISOString(); logAndToast("feed", { mode: "pump", ts: startISO, duration: parseInt(v.duration)||15, amount: v.amount?parseFloat(v.amount):null, side: v.side }, "Pump session logged", "🫙"); } })} />
            </>)}
            {showSolids && (
              <LogTile icon="🥣" label="Solids" onClick={() => openSheet({ title: "🍲 Solids", fields: [{ key: "food", label: "What did they eat?", type: "text", default: "" }, { key: "reaction", label: "Reaction", type: "select", options: ["loved","liked","ok","refused"], default: "liked" }], onConfirm: (v) => logAndToast("solids", { food: v.food, reaction: v.reaction }, "Solids logged", "🥣") })} />
            )}
          </div>
        </Card>
      )}

      {/* ── Diapers ── */}
      {showDiapers && (
        <Card>
          <SectionLabel>Diapers</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            <LogTile icon="💧" label="Wet" onClick={() => logAndToast("diaper", { sub_type: "wet" }, "Wet diaper logged", "💦")} />
            <LogTile icon="💩" label="Dirty" onClick={() => openSheet({ title: "💩 Dirty Diaper", fields: [{ key: "description", label: "Type", type: "select", options: ["Normal/Mustardy","Green","Watery","Hard/Pellets","Mucousy","Bloody"], default: "Normal/Mustardy" }], onConfirm: (v) => logAndToast("diaper", { sub_type: "dirty", description: v.description }, "Dirty diaper logged", "💩") })} />
            <LogTile icon="💦💩" label="Both" onClick={() => openSheet({ title: "💦💩 Wet + Dirty", fields: [{ key: "description", label: "Stool type", type: "select", options: ["Normal/Mustardy","Green","Watery","Hard/Pellets","Mucousy","Bloody"], default: "Normal/Mustardy" }], onConfirm: (v) => logAndToast("diaper", { sub_type: "both", description: v.description }, "Wet + dirty logged", "💦💩") })} />
          </div>
        </Card>
      )}

      {/* ── Wellness ── */}
      <Card>
        <SectionLabel>Wellness</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          <LogTile icon="🦷" label="Teething" onClick={() => openSheet({ title: "🦷 Teething", fields: [{ key: "notes", label: "Notes (optional)", type: "text", default: "" }], onConfirm: (v) => logAndToast("wellness", { sub_type: "teething", description: v.notes || "Teething" }, "Teething logged", "🦷") })} />
          <LogTile icon="🤒" label="Sick" onClick={() => openSheet({ title: "🤒 Sick", fields: [{ key: "sub_type", label: "Status", type: "select", options: ["sick","potentially_sick"], default: "sick" }, { key: "notes", label: "Symptoms / notes", type: "text", default: "" }], onConfirm: (v) => { const label = v.sub_type === "potentially_sick" ? "Potentially sick" : "Sick"; logAndToast("wellness", { sub_type: v.sub_type || "sick", description: v.notes || label }, `${label} logged`, "🤒"); } })} />
          <LogTile icon="🌡️" label="Temperature" onClick={() => openSheet({ title: "🌡️ Temperature", fields: [{ key: "temp", label: "Temperature (°F)", type: "number", default: "" }, { key: "notes", label: "Notes (optional)", type: "text", default: "" }], onConfirm: (v) => { const display = v.temp ? `${v.temp}°F` : "Temperature logged"; logAndToast("wellness", { sub_type: "temperature", description: v.notes || "", amount: v.temp?parseFloat(v.temp):null, food: display }, "Temp logged", "🌡️"); } })} />
          <LogTile icon="💊" label="Medicine" onClick={() => openSheet({ title: "💊 Medicine", fields: [{ key: "time", label: "Time given", type: "time", default: nowTimeStr() }, { key: "description", label: "Medicine name", type: "text", default: "" }, { key: "amount", label: "Dose (e.g. 5ml, 160mg)", type: "text", default: "" }], onConfirm: (v) => { const ts = v.time ? timeStrToISO(v.time) : new Date().toISOString(); const fullDescription = [v.description, v.amount].filter(Boolean).join(" · "); logAndToast("medicine", { ts, description: fullDescription, amount: null }, "Medicine logged", "💊"); } })} />
        </div>
      </Card>

      {/* ── Growth — separate tile per metric ── */}
      <Card>
        <SectionLabel>Growth</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          <LogTile icon="⚖️" label="Weight" sub="lbs · oz" onClick={() => openSheet({ title: "⚖️ Weight", fields: [{ key: "date", label: "Date", type: "date", default: localDateStr(new Date()) }, { key: "weight_lbs", label: "Weight (lbs)", type: "number", default: "" }, { key: "weight_oz", label: "Weight (oz)", type: "number", default: "" }, { key: "notes", label: "Notes (optional)", type: "text", default: "" }], onConfirm: (v) => { const weightLbs = parseFloat(v.weight_lbs)||0; const weightOz = parseFloat(v.weight_oz)||0; const totalOz = weightLbs*16+weightOz; const displayWeight = weightLbs?`${weightLbs}lb ${weightOz?weightOz+"oz":""}`.trim():null; logAndToast("growth", { ts: v.date?new Date(v.date+"T12:00:00").toISOString():new Date().toISOString(), amount: totalOz||null, food: displayWeight, sub_type: "weight", reaction: v.notes||null }, "Weight logged", "⚖️"); } })} />
          <LogTile icon="📏" label="Length" sub="inches" onClick={() => openSheet({ title: "📏 Length", fields: [{ key: "date", label: "Date", type: "date", default: localDateStr(new Date()) }, { key: "length", label: "Length (inches)", type: "number", default: "" }, { key: "notes", label: "Notes (optional)", type: "text", default: "" }], onConfirm: (v) => logAndToast("growth", { ts: v.date?new Date(v.date+"T12:00:00").toISOString():new Date().toISOString(), description: v.length?`${v.length}in`:null, sub_type: "length", reaction: v.notes||null }, "Length logged", "📏") })} />
          <LogTile icon="🔵" label="Head Circ." sub="inches" onClick={() => openSheet({ title: "🔵 Head Circumference", fields: [{ key: "date", label: "Date", type: "date", default: localDateStr(new Date()) }, { key: "head", label: "Head circumference (inches)", type: "number", default: "" }, { key: "notes", label: "Notes (optional)", type: "text", default: "" }], onConfirm: (v) => logAndToast("growth", { ts: v.date?new Date(v.date+"T12:00:00").toISOString():new Date().toISOString(), description: v.head?`head ${v.head}in`:null, sub_type: "head", reaction: v.notes||null }, "Head circumference logged", "🔵") })} />
        </div>
      </Card>

      {/* ── Mood ── */}
      <Card>
        <SectionLabel>Mood · How does she seem?</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {MOODS.map(m => (
            <button key={m.id} onClick={() => logAndToast("mood", { mood: m.id }, "Mood logged", m.emoji)} style={{
              padding: "10px 4px", borderRadius: 12,
              background: T.faint, border: `1px solid ${T.border}`,
              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 22 }}>{m.emoji}</span>
              <span style={{ fontFamily: font, fontSize: 10, color: T.muted }}>{m.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
