// src/modules/sleep/SleepLog.jsx
// Root module — data layer, tab routing, EditLogModal.
// Views split into: TodayView.jsx, PatternsView.jsx
// Helpers in: sleepHelpers.js, sleepUI.jsx

import { useState, useEffect, useMemo, useCallback } from "react";
import { useT, useApp, genId } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { C, MOODS, font, serif,
  fetchLogs, insertLog, updateLog, deleteLog, fetchConfig, upsertConfig,
  calcAgeMonths, calculateAge, localDateStr, fmtTime, fmtDateTime, fmtDuration,
  defaultWakeWindowsForAge, defaultNapDurationsForAge,
} from "./sleepHelpers.js";
import { Card, Btn, Pill, Divider, SectionLabel, StatCard } from "./sleepUI.jsx";
import { TodayView } from "./TodayView.jsx";
import { PatternsView } from "./PatternsView.jsx";

// ─── WHO GROWTH REFERENCE DATA ────────────────────────────────────────────────
const WHO_WEIGHT = {
  0:  [5.3,5.8,6.4,7.3,8.2,9.0,9.9], 1: [6.7,7.4,8.2,9.2,10.3,11.2,12.3],
  2:  [8.2,9.0,9.9,11.1,12.4,13.5,14.8], 3: [9.5,10.4,11.5,12.8,14.3,15.6,17.1],
  4:  [10.6,11.6,12.8,14.3,15.9,17.3,18.9], 5: [11.5,12.6,13.9,15.4,17.2,18.7,20.5],
  6:  [12.3,13.4,14.8,16.5,18.3,19.9,21.8], 7: [12.9,14.1,15.6,17.4,19.3,21.0,23.0],
  8:  [13.5,14.8,16.3,18.2,20.2,22.0,24.0], 9: [14.1,15.4,17.0,18.9,21.0,22.9,25.0],
  10: [14.6,15.9,17.6,19.6,21.8,23.7,25.9], 11: [15.0,16.4,18.1,20.2,22.4,24.4,26.7],
  12: [15.5,16.9,18.7,20.8,23.1,25.2,27.6], 14: [16.3,17.8,19.7,21.9,24.4,26.5,29.0],
  16: [17.1,18.6,20.6,22.9,25.5,27.8,30.5], 18: [17.8,19.4,21.5,23.9,26.6,29.0,31.9],
  20: [18.5,20.2,22.4,24.9,27.7,30.2,33.2], 22: [19.2,21.0,23.2,25.8,28.8,31.4,34.5],
  24: [19.8,21.7,24.0,26.7,29.8,32.6,35.8],
};
const WHO_LENGTH = {
  0:  [17.6,18.1,18.6,19.4,20.1,20.7,21.3], 1: [19.3,19.8,20.4,21.1,21.9,22.5,23.2],
  2:  [20.8,21.3,21.9,22.8,23.5,24.2,24.9], 3: [22.0,22.5,23.2,24.0,24.9,25.6,26.4],
  4:  [23.0,23.6,24.3,25.2,26.0,26.8,27.6], 6: [24.8,25.4,26.1,27.1,28.0,28.8,29.7],
  9:  [26.6,27.3,28.0,29.1,30.0,30.9,31.9], 12: [28.1,28.8,29.6,30.7,31.7,32.6,33.6],
  15: [29.4,30.1,30.9,32.1,33.1,34.1,35.1], 18: [30.6,31.3,32.2,33.4,34.5,35.5,36.6],
  21: [31.6,32.4,33.3,34.6,35.7,36.8,37.9], 24: [32.6,33.4,34.3,35.7,36.8,37.9,39.1],
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

// ─── GROWTH CHART ─────────────────────────────────────────────────────────────
function GrowthChart({ data, dob, metric, T }) {
  if (!data || data.length === 0) {
    return <div style={{ textAlign:"center", padding:"30px 0", fontFamily:font, fontSize:13, color:T.muted }}>No {metric} data logged yet.</div>;
  }

  const W = 300, H = 160, padL = 36, padR = 12, padT = 10, padB = 28;
  const chartW = W - padL - padR, chartH = H - padT - padB;

  const maxAge = Math.max(...data.map(d => d.ageMonths), 24);
  const refTable = metric === "weight" ? WHO_WEIGHT : WHO_LENGTH;
  const whoKeys = Object.keys(refTable).map(Number).sort((a,b)=>a-b).filter(k => k <= maxAge + 2);
  const whoPercentiles = whoKeys.map(k => ({ age: k, vals: refTable[k] || interpolateWHO(refTable, k) }));
  const allWhoVals = whoPercentiles.flatMap(p => p.vals);
  const allValues = data.map(d => d.value);
  const minV = Math.min(...allValues, ...allWhoVals) * 0.92;
  const maxV = Math.max(...allValues, ...allWhoVals) * 1.05;

  const sx = age => padL + (age / (maxAge || 1)) * chartW;
  const sy = val => padT + chartH - ((val - minV) / (maxV - minV || 1)) * chartH;

  // Shaded band between 10th and 90th percentile
  const bandTopPts    = whoPercentiles.map(p => `${sx(p.age).toFixed(1)},${sy(p.vals[5]).toFixed(1)}`).join(" ");
  const bandBottomPts = [...whoPercentiles].reverse().map(p => `${sx(p.age).toFixed(1)},${sy(p.vals[1]).toFixed(1)}`).join(" ");
  const bandPolygon   = `${bandTopPts} ${bandBottomPts}`;

  // 50th percentile line
  const p50pts = whoPercentiles.map(p => `${sx(p.age).toFixed(1)},${sy(p.vals[3]).toFixed(1)}`).join(" ");

  // Label for 50th at the right edge
  const lastP50 = whoPercentiles[whoPercentiles.length - 1];
  const p50LabelX = sx(lastP50.age) + 3;
  const p50LabelY = sy(lastP50.vals[3]) + 3;

  // Y axis labels
  const yTicks = [minV, (minV + maxV) / 2, maxV].map(v => Math.round(v));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto" }}>
      {/* WHO shaded band (10th–90th) */}
      <polygon points={bandPolygon} fill={C.sage} opacity={0.1} />

      {/* 10th and 90th dashed outlines */}
      {[1, 5].map(idx => {
        const pts = whoPercentiles.map(p => `${sx(p.age).toFixed(1)},${sy(p.vals[idx]).toFixed(1)}`).join(" ");
        return <polyline key={idx} points={pts} fill="none" stroke={C.sage} strokeWidth={0.8} strokeDasharray="3,3" opacity={0.5} />;
      })}

      {/* 50th percentile line — slightly more visible */}
      <polyline points={p50pts} fill="none" stroke={C.sage} strokeWidth={1} opacity={0.6} />
      <text x={p50LabelX} y={p50LabelY} fill={C.sage} fontSize={7} fontFamily={font} opacity={0.8}>50th</text>

      {/* Y axis labels */}
      {yTicks.map((v, i) => (
        <text key={i} x={padL - 4} y={sy(v) + 3} textAnchor="end" fill="#bbb" fontSize={8} fontFamily={font}>
          {metric === "weight" ? `${v}lb` : `${v}"`}
        </text>
      ))}

      {/* X axis labels */}
      {[0, 6, 12, 18, 24].filter(m => m <= maxAge).map(m => (
        <text key={m} x={sx(m)} y={H - 4} textAnchor="middle" fill="#bbb" fontSize={8} fontFamily={font}>{m}mo</text>
      ))}

      {/* Actual data line */}
      {data.length >= 2 && (
        <polyline
          points={data.map(d => `${sx(d.ageMonths).toFixed(1)},${sy(d.value).toFixed(1)}`).join(" ")}
          fill="none" stroke="#4A7A5C" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        />
      )}

      {/* Data points */}
      {data.map((d, i) => (
        <circle key={i} cx={sx(d.ageMonths)} cy={sy(d.value)} r={i === data.length - 1 ? 5 : 3.5}
          fill={i === data.length - 1 ? "#4A7A5C" : C.teal} stroke="white" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

// ─── GROWTH VIEW ──────────────────────────────────────────────────────────────
function GrowthView({ logs, activeFamily }) {
  const T = useT();
  const { activeChild } = useApp();

  const dob = activeChild?.dob || activeFamily?.birth_date || activeFamily?.birthDate;
  const dobDate = dob ? new Date(dob) : null;
  const growthLogs = logs.filter(l => l.type === "growth").sort((a, b) => new Date(a.ts) - new Date(b.ts));

  const weightData = growthLogs.filter(l => l.amount && l.amount > 0).map(l => {
    const ageMs = dobDate ? new Date(l.ts) - dobDate : 0;
    const lbs = parseFloat((l.amount / 16).toFixed(2));
    return { ageMonths: Math.max(0, ageMs/(1000*60*60*24*30.44)), value: lbs, date: new Date(l.ts).toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"}), label: l.food || `${Math.floor(lbs)}lb ${Math.round((lbs%1)*16)}oz`, metric: "weight" };
  });

  const lengthData = growthLogs.filter(l => l.description && l.description.match(/[\d.]+in/) && !l.description.startsWith("head")).map(l => {
    const match = l.description.match(/([\d.]+)in/);
    const inches = match ? parseFloat(match[1]) : null;
    if (!inches) return null;
    const ageMs = dobDate ? new Date(l.ts) - dobDate : 0;
    return { ageMonths: Math.max(0, ageMs/(1000*60*60*24*30.44)), value: inches, date: new Date(l.ts).toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"}), label: `${inches}"`, metric: "length" };
  }).filter(Boolean);

  // Combined history sorted newest first
  const allHistory = [...weightData, ...lengthData].sort((a, b) => b.ageMonths - a.ageMonths);

  function MetricSection({ data, metric, color }) {
    const latest = data[data.length - 1];
    const prev = data[data.length - 2];
    const diff = latest && prev ? parseFloat((latest.value - prev.value).toFixed(1)) : null;
    const refTable = metric === "weight" ? WHO_WEIGHT : WHO_LENGTH;

    if (data.length === 0) {
      return (
        <div style={{ padding:"14px 16px", borderRadius:14, background:T.faint, border:`1px solid ${T.border}`, marginBottom:16 }}>
          <div style={{ fontFamily:font, fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".1em", marginBottom:6 }}>
            {metric === "weight" ? "⚖️ Weight" : "📏 Length"}
          </div>
          <p style={{ fontFamily:font, fontSize:13, color:T.muted, margin:0 }}>
            No {metric} logged yet. Use the {metric === "weight" ? "Weight" : "Length"} tile in the Today tab.
          </p>
        </div>
      );
    }

    const getPct = (value, ageMonths) => {
      const w = interpolateWHO(refTable, ageMonths);
      return value<w[0]?"<3rd":value<w[1]?"3–10th":value<w[2]?"10–25th":value<w[4]?"25–75th":value<w[5]?"75–90th":value<w[6]?"90–97th":">97th";
    };

    return (
      <div style={{ marginBottom: 20 }}>
        {/* Latest card */}
        <div style={{ display:"flex", gap:12, marginBottom:12, padding:"16px 18px", borderRadius:14, background:`${color}08`, border:`1px solid ${color}20` }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:font, fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".1em", marginBottom:6 }}>
              {metric === "weight" ? "⚖️ Latest weight" : "📏 Latest length"}
            </div>
            <div style={{ fontFamily:serif, fontSize:28, color:T.headingText, fontWeight:700, lineHeight:1 }}>{latest.label}</div>
            <div style={{ fontFamily:font, fontSize:11, color:T.muted, marginTop:4 }}>
              {latest.date} · {latest.ageMonths < 24 ? `${Math.round(latest.ageMonths)} months` : `${(latest.ageMonths/12).toFixed(1)}y`}
            </div>
          </div>
          <div style={{ textAlign:"right", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
            {diff !== null && (
              <div>
                <div style={{ fontFamily:font, fontSize:10, color:T.muted, marginBottom:2 }}>Since last visit</div>
                <div style={{ fontFamily:serif, fontSize:20, fontWeight:700, color:diff>=0?C.sage:C.rose }}>
                  {diff>=0?"+":""}{diff} {metric==="weight"?"lb":"in"}
                </div>
              </div>
            )}
            <div style={{ padding:"3px 10px", borderRadius:20, background:`${color}18`, border:`1px solid ${color}30`, fontFamily:font, fontSize:11, fontWeight:600, color }}>
              {getPct(latest.value, latest.ageMonths)} percentile
            </div>
          </div>
        </div>

        {/* Chart */}
        <Card style={{ padding:"16px 12px", marginBottom:0 }}>
          <div style={{ fontFamily:font, fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:T.muted, marginBottom:12 }}>
            {metric === "weight" ? "Weight" : "Length"} over time · WHO reference
          </div>
          <GrowthChart data={data} dob={dob} metric={metric} T={T} />
          <div style={{ display:"flex", gap:14, marginTop:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="#4A7A5C" strokeWidth={2.5} strokeLinecap="round" /></svg>
              <span style={{ fontFamily:font, fontSize:10, color:T.muted }}>Measured</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <svg width={20} height={8}>
                <rect x={0} y={1} width={20} height={6} fill={C.sage} opacity={0.15} rx={1} />
              </svg>
              <span style={{ fontFamily:font, fontSize:10, color:T.muted }}>WHO percentiles</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <MetricSection data={weightData} metric="weight" color={C.teal} />
      <MetricSection data={lengthData} metric="length" color={C.sage} />

      {/* Disclaimer — before history */}
      <div style={{ padding:"12px 14px", borderRadius:12, background:T.faint, border:`1px solid ${T.border}`, fontFamily:font, fontSize:12, color:T.muted, lineHeight:1.7, marginBottom:16 }}>
        📖 Percentile curves show the range of healthy growth patterns — not a target. A baby consistently tracking their own curve is growing well, whatever that percentile is. Always discuss growth with your pediatrician.
      </div>

      {/* Combined measurement history */}
      {allHistory.length > 0 && (
        <Card>
          <div style={{ fontFamily:font, fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:T.muted, marginBottom:12 }}>Measurement History</div>
          {allHistory.map((d, i) => {
            const refTable = d.metric === "weight" ? WHO_WEIGHT : WHO_LENGTH;
            const whoVals = interpolateWHO(refTable, d.ageMonths);
            const pct = d.value<whoVals[0]?"<3rd":d.value<whoVals[1]?"3–10th":d.value<whoVals[2]?"10–25th":d.value<whoVals[4]?"25–75th":d.value<whoVals[5]?"75–90th":d.value<whoVals[6]?"90–97th":">97th";
            const mid = pct==="25–75th";
            const metricColor = d.metric === "weight" ? C.teal : C.sage;
            return (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<allHistory.length-1?`1px solid ${T.border}`:"none" }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:1 }}>
                    <span style={{ fontFamily:font, fontSize:9, fontWeight:700, color:metricColor, textTransform:"uppercase", letterSpacing:".08em" }}>
                      {d.metric === "weight" ? "⚖️ W" : "📏 L"}
                    </span>
                    <span style={{ fontFamily:font, fontSize:14, fontWeight:600, color:T.text }}>{d.label}</span>
                  </div>
                  <div style={{ fontFamily:font, fontSize:11, color:T.muted }}>
                    {d.date} · {d.ageMonths<1?"newborn":d.ageMonths<24?`${Math.round(d.ageMonths)}mo`:`${(d.ageMonths/12).toFixed(1)}y`}
                  </div>
                </div>
                <div style={{ padding:"4px 10px", borderRadius:10, background:mid?`${C.sage}18`:T.faint, border:`1px solid ${mid?C.sage+"40":T.border}`, fontFamily:font, fontSize:11, fontWeight:600, color:mid?C.sage:T.muted }}>{pct}</div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// ─── SHARE WITH CONSULTANT ──────────────────────────────────────────────────
function ShareWithConsultant({ logs, activeFamily, T }) {
  const { currentUser, activeChild } = useApp();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleShare() {
    if (!activeFamily?.id || !currentUser?.id) return;
    setSending(true);
    try {
      const since14 = new Date(Date.now() - 14 * 86400000).toISOString();
      const recent = logs.filter(l => l.ts > since14);

      const sleepSessions = recent.filter(l => l.type === "sleep_session" && l.end_ts);
      const avgSleep = sleepSessions.length
        ? (sleepSessions.reduce((s, l) => s + (l.total_sleep_ms || 0), 0) / sleepSessions.length / 3600000).toFixed(1)
        : null;

      const wellnessEvents = recent.filter(l => l.type === "wellness" || l.type === "medicine");
      const growthLogs = recent.filter(l => l.type === "growth");
      const nightWakings = recent.filter(l => l.type === "night_waking");

      const childName = activeChild?.name || "Child";
      const childAge = activeChild?.dob
        ? (() => { const m = Math.floor((Date.now() - new Date(activeChild.dob)) / (1000*60*60*24*30.44)); return m < 24 ? `${m}mo` : `${Math.floor(m/12)}y`; })()
        : null;

      const lines = [
        `📊 Wellness Report — ${childName}${childAge ? ` (${childAge})` : ""}`,
        `Generated: ${new Date().toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}`,
        `Period: Last 14 days`,
        ``,
        `SLEEP`,
        avgSleep ? `• Average sleep per session: ${avgSleep}h` : `• No completed sleep sessions logged`,
        `• Total sessions logged: ${sleepSessions.length}`,
        `• Night wakings: ${nightWakings.length}`,
        ``,
      ];

      if (wellnessEvents.length > 0) {
        lines.push(`WELLNESS EVENTS`);
        wellnessEvents.slice(0, 8).forEach(e => {
          const d = new Date(e.ts).toLocaleDateString([], { month: "short", day: "numeric" });
          const label = e.type === "medicine"
            ? `💊 Medicine: ${e.description || "logged"}`
            : `${e.sub_type === "teething" ? "🦷 Teething" : e.sub_type === "sick" ? "🤒 Sick" : e.sub_type === "temperature" ? `🌡️ Temp ${e.food || ""}` : "📝 " + (e.description || e.sub_type || "wellness")}`;
          lines.push(`• ${d}: ${label}`);
        });
        lines.push(``);
      }

      if (growthLogs.length > 0) {
        lines.push(`GROWTH`);
        growthLogs.slice(-3).forEach(g => {
          const d = new Date(g.ts).toLocaleDateString([], { month: "short", day: "numeric" });
          const label = g.sub_type === "weight" ? `⚖️ Weight: ${g.food || "logged"}` : g.sub_type === "length" ? `📏 Length: ${g.description || "logged"}` : `🔵 ${g.description || "logged"}`;
          lines.push(`• ${d}: ${label}`);
        });
        lines.push(``);
      }

      lines.push(`Shared from Held app`);
      const reportText = lines.join("\n");

      // Send as a message to the consultant thread
      await supabase.from("messages").insert({
        family_id: activeFamily.id,
        sender_id: currentUser.id,
        sender_role: "parent",
        content: reportText,
        type: "text",
        created_at: new Date().toISOString(),
      });

      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      console.error("[ShareWithConsultant]", e);
      alert("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div onClick={!sending && !sent ? handleShare : undefined}
      style={{ borderRadius:14, padding:"16px 18px", background:`linear-gradient(135deg, ${T.bark}, ${T.bark}dd)`, display:"flex", alignItems:"center", gap:14, cursor: sending ? "default" : "pointer", opacity: sending ? 0.7 : 1 }}>
      <span style={{ fontSize:22 }}>{sent ? "✅" : "📤"}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily:font, fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.9)" }}>
          {sent ? "Sent to consultant!" : sending ? "Sending…" : "Share with consultant"}
        </div>
        <div style={{ fontFamily:font, fontSize:11, color:"rgba(255,255,255,0.45)" }}>
          {sent ? "Check your consultant messages" : "14-day wellness report · sends as message"}
        </div>
      </div>
    </div>
  );
}

// ─── SHARE WITH PEDIATRICIAN ─────────────────────────────────────────────────
function ShareWithPediatrician({ logs, activeChild, T }) {
  function handleShare() {
    const childName = activeChild?.name || "Child";
    const childAge = activeChild?.dob
      ? (() => { const m = Math.floor((Date.now() - new Date(activeChild.dob)) / (1000*60*60*24*30.44)); return m < 24 ? `${m}mo` : `${Math.floor(m/12)}y`; })()
      : null;

    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const recent = logs.filter(l => l.ts > since30);

    const growthLogs = recent.filter(l => l.type === "growth").sort((a,b) => new Date(a.ts) - new Date(b.ts));
    const wellnessEvents = recent.filter(l => l.type === "wellness" || l.type === "medicine");
    const sleepSessions = recent.filter(l => l.type === "sleep_session" && l.end_ts);
    const avgSleep = sleepSessions.length
      ? (sleepSessions.reduce((s,l) => s + (l.total_sleep_ms || 0), 0) / sleepSessions.length / 3600000).toFixed(1)
      : null;

    const lines = [
      `Growth & Wellness Summary`,
      `Child: ${childName}${childAge ? ` (${childAge})` : ""}`,
      `Date: ${new Date().toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}`,
      ``,
    ];

    if (growthLogs.length > 0) {
      lines.push(`GROWTH MEASUREMENTS (last 30 days)`);
      growthLogs.slice(-5).forEach(g => {
        const d = new Date(g.ts).toLocaleDateString([], { month: "short", day: "numeric" });
        if (g.sub_type === "weight") lines.push(`  Weight (${d}): ${g.food || "logged"}`);
        else if (g.sub_type === "length") lines.push(`  Length (${d}): ${g.description || "logged"}`);
        else if (g.sub_type === "head") lines.push(`  Head circ (${d}): ${g.description?.replace("head ","") || "logged"}`);
      });
      lines.push(``);
    }

    if (avgSleep) {
      lines.push(`SLEEP (last 30 days)`);
      lines.push(`  Average sleep per session: ${avgSleep}h`);
      lines.push(`  Total sessions: ${sleepSessions.length}`);
      lines.push(``);
    }

    if (wellnessEvents.length > 0) {
      lines.push(`WELLNESS EVENTS (last 30 days)`);
      wellnessEvents.slice(0, 10).forEach(e => {
        const d = new Date(e.ts).toLocaleDateString([], { month: "short", day: "numeric" });
        if (e.type === "medicine") lines.push(`  ${d}: Medicine — ${e.description || "logged"}`);
        else if (e.sub_type === "sick") lines.push(`  ${d}: Illness — ${e.description || "sick"}`);
        else if (e.sub_type === "temperature") lines.push(`  ${d}: Temperature — ${e.food || e.description || "logged"}`);
        else if (e.sub_type === "teething") lines.push(`  ${d}: Teething`);
      });
      lines.push(``);
    }

    lines.push(`Generated by Held app (Rooted Connections Collective)`);

    const body = encodeURIComponent(lines.join("\n"));
    const subject = encodeURIComponent(`${childName} — Growth & Wellness Summary`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <div onClick={handleShare}
      style={{ borderRadius:14, padding:"16px 18px", background:T.card, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:14, cursor:"pointer", marginTop: 8 }}>
      <span style={{ fontSize:22 }}>🏥</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily:font, fontSize:14, fontWeight:700, color:T.text }}>Share with pediatrician</div>
        <div style={{ fontFamily:font, fontSize:11, color:T.muted }}>Growth + wellness summary · opens email</div>
      </div>
    </div>
  );
}

// ─── WELLNESS VIEW ────────────────────────────────────────────────────────────
function WellnessView({ logs, activeFamily }) {
  const T = useT();
  const { activeChild, setTab } = useApp();
  const childName = activeChild?.name ?? "your child";
  const childNamePossessive = childName.endsWith("s") ? `${childName}'` : `${childName}'s`;

  // ── Mood summary ──
  const moodSummary = useMemo(() => {
    const since = new Date(Date.now() - 14*86400000).toISOString();
    const recent = logs.filter(l => l.type==="sleep_session"&&l.mood&&l.ts>since);
    const counts = {};
    recent.forEach(s => { counts[s.mood] = (counts[s.mood]||0)+1; });
    return MOODS.map(m=>({...m, count:counts[m.id]||0})).filter(m=>m.count>0).sort((a,b)=>b.count-a.count);
  }, [logs]);

  // ── Temperature logs ──
  const tempLogs = useMemo(() => {
    const since = new Date(Date.now() - 30*86400000).toISOString();
    return logs.filter(l=>l.type==="wellness"&&l.sub_type==="temperature"&&l.ts>since)
      .sort((a,b)=>new Date(b.ts)-new Date(a.ts)).slice(0,8);
  }, [logs]);

  // ── Grouped illness/wellness events with sleep impact ──
  const illnessGroups = useMemo(() => {
    const since = new Date(Date.now() - 30*86400000).toISOString();
    const events = logs.filter(l =>
      (l.type==="wellness"||l.type==="medicine") && l.ts>since && l.sub_type!=="temperature"
    ).sort((a,b)=>new Date(a.ts)-new Date(b.ts));

    // Group consecutive same-type events within 3 days of each other
    const groups = [];
    events.forEach(e => {
      const last = groups[groups.length - 1];
      const sameType = last && (
        (e.sub_type && e.sub_type === last.sub_type) ||
        (e.type === "medicine" && last.type === "medicine" && e.description === last.description)
      );
      const within3Days = last && (new Date(e.ts) - new Date(last.lastTs)) < 3*86400000;
      if (last && sameType && within3Days) {
        last.lastTs = e.ts;
        last.count++;
        last.logs.push(e);
      } else {
        groups.push({
          type: e.type, sub_type: e.sub_type,
          firstTs: e.ts, lastTs: e.ts,
          description: e.description || e.food || null,
          count: 1, logs: [e],
        });
      }
    });

    // Calculate sleep impact for each group
    return groups.reverse().map(g => {
      const startMs = new Date(g.firstTs).getTime();
      const endMs = new Date(g.lastTs).getTime() + 86400000;
      // Sleep sessions during this period
      const duringSessions = logs.filter(l =>
        l.type==="sleep_session" && l.end_ts &&
        new Date(l.ts).getTime() >= startMs - 86400000 &&
        new Date(l.ts).getTime() <= endMs
      );
      // Compare to baseline (7 days before)
      const baselineSessions = logs.filter(l =>
        l.type==="sleep_session" && l.end_ts &&
        new Date(l.ts).getTime() >= startMs - 8*86400000 &&
        new Date(l.ts).getTime() < startMs - 86400000
      );
      const avgDuring = duringSessions.length
        ? duringSessions.reduce((s,l)=>s+Math.max(0,new Date(l.end_ts)-new Date(l.ts)),0)/(duringSessions.length*3600000)
        : null;
      const avgBaseline = baselineSessions.length
        ? baselineSessions.reduce((s,l)=>s+Math.max(0,new Date(l.end_ts)-new Date(l.ts)),0)/(baselineSessions.length*3600000)
        : null;
      const sleepImpact = avgDuring !== null && avgBaseline !== null
        ? parseFloat((avgDuring - avgBaseline).toFixed(1))
        : null;
      // Night wakings during vs baseline
      const wakingsDuring = logs.filter(l=>l.type==="night_waking"&&new Date(l.ts).getTime()>=startMs-86400000&&new Date(l.ts).getTime()<=endMs).length;
      const wakingsBaseline = logs.filter(l=>l.type==="night_waking"&&new Date(l.ts).getTime()>=startMs-8*86400000&&new Date(l.ts).getTime()<startMs-86400000).length;
      const wakingDelta = duringSessions.length && baselineSessions.length
        ? parseFloat(((wakingsDuring/duringSessions.length)-(wakingsBaseline/baselineSessions.length)).toFixed(1))
        : null;
      return { ...g, sleepImpact, wakingDelta };
    });
  }, [logs]);

  // ── Wellness Meaning Maker ──
  const wellnessMM = useMemo(() => {
    const recentSick = illnessGroups.filter(g => g.sub_type==="sick"||g.sub_type==="potentially_sick");
    const recentTeething = illnessGroups.filter(g => g.sub_type==="teething");
    if (recentSick.length > 0) {
      const days = Math.max(1, Math.round((new Date(recentSick[0].lastTs)-new Date(recentSick[0].firstTs))/86400000)+1);
      return {
        text: `${days} sick day${days>1?"s":""} this week → ${childNamePossessive} nervous system is still in recovery. The sleep disruption makes complete sense.`,
        sub: "Sick days affect NS regulation for 3–5 days after recovery",
      };
    }
    if (recentTeething.length > 0) {
      return {
        text: `Teething is active — this explains the night waking and settling difficulty. The nervous system is working overtime.`,
        sub: "Teething pain peaks at night and disrupts sleep architecture",
      };
    }
    return null;
  }, [illnessGroups, childNamePossessive]);

  function fmtShortDate(ts) {
    return new Date(ts).toLocaleDateString([],{month:"short",day:"numeric"});
  }

  function groupLabel(g) {
    if (g.type==="medicine") return `💊 ${g.description || "Medicine"}`;
    if (g.sub_type==="teething") return `🦷 Teething`;
    if (g.sub_type==="sick") return `🤒 Sick${g.description ? ` · ${g.description}` : ""}`;
    if (g.sub_type==="potentially_sick") return `😟 Possibly sick${g.description ? ` · ${g.description}` : ""}`;
    return g.description || g.sub_type || "Wellness";
  }

  function groupDotColor(g) {
    if (g.type==="medicine") return C.teal;
    if (g.sub_type==="teething") return C.amber;
    if (g.sub_type==="sick"||g.sub_type==="potentially_sick") return C.rose;
    return T.muted;
  }

  function tempBadge(temp) {
    if (temp >= 104) return { label: "High fever", color: C.rose };
    if (temp >= 100.4) return { label: "Fever", color: C.rose };
    if (temp >= 99.5) return { label: "Low fever", color: C.amber };
    if (temp < 97.5) return { label: "Low", color: C.sky };
    return { label: "Normal", color: C.sage };
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ── GROWTH ── */}
      <GrowthView logs={logs} activeFamily={activeFamily} />

      {/* ── WELLNESS MEANING MAKER ── */}
      {wellnessMM && (
        <div style={{ borderRadius:16, padding:"16px 18px", background:`linear-gradient(135deg, ${T.bark}, ${T.bark}dd)` }}>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:18, flexShrink:0 }}>🧠</span>
            <div>
              <p style={{ fontFamily:serif, fontSize:14, fontStyle:"italic", color:"rgba(255,255,255,0.9)", lineHeight:1.55, margin:"0 0 6px" }}>"{wellnessMM.text}"</p>
              <p style={{ fontFamily:font, fontSize:11, color:"rgba(255,255,255,0.45)", margin:0 }}>{wellnessMM.sub}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── MOOD ── */}
      <Card>
        <SectionLabel>Mood · Last 14 Days</SectionLabel>
        {moodSummary.length > 0 ? (
          <>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
              {moodSummary.map(m => (
                <div key={m.id} style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"8px 16px", borderRadius:24,
                  background:`${m.color}15`, border:`1.5px solid ${m.color}30`,
                }}>
                  <span style={{ fontSize:20 }}>{m.emoji}</span>
                  <span style={{ fontFamily:serif, fontSize:18, fontWeight:700, color:m.color }}>{m.count}</span>
                  <span style={{ fontFamily:font, fontSize:13, color:T.muted }}>{m.label.toLowerCase()}</span>
                </div>
              ))}
            </div>
            {(() => {
              const fussy = moodSummary.find(m=>m.id==="fussy"||m.id==="rough");
              const good  = moodSummary.find(m=>m.id==="great"||m.id==="good");
              const hasIllness = illnessGroups.length > 0;
              if (fussy && fussy.count > (good?.count ?? 0)) {
                const reason = hasIllness
                  ? "Fussy days cluster around the sick stretch and teething events."
                  : "Fussy wake-ups often signal overtiredness or a nervous system still processing. Watch for early tired cues.";
                return <div style={{ display:"flex", gap:6, alignItems:"flex-start" }}><span style={{ fontSize:14 }}>🌿</span><span style={{ fontFamily:font, fontSize:12.5, color:T.muted, fontStyle:"italic", lineHeight:1.55 }}>{reason}</span></div>;
              }
              if (good && good.count >= 3) return <div style={{ display:"flex", gap:6, alignItems:"flex-start" }}><span style={{ fontSize:14 }}>🌿</span><span style={{ fontFamily:font, fontSize:12.5, color:T.muted, fontStyle:"italic", lineHeight:1.55 }}>Happy wake-ups mean {childName} is completing sleep cycles well. Her nervous system is consolidating sleep the way it should.</span></div>;
              return null;
            })()}
          </>
        ) : (
          <p style={{ fontFamily:font, fontSize:13, color:T.muted, margin:0, lineHeight:1.6 }}>Mood data appears after you log wake-up moods in the Today tab.</p>
        )}
      </Card>

      {/* ── ILLNESS & WELLNESS HISTORY ── */}
      {illnessGroups.length > 0 && (
        <Card>
          <SectionLabel>Illness & Wellness History</SectionLabel>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {illnessGroups.map((g, i) => {
              const isSameDay = g.firstTs === g.lastTs || fmtShortDate(g.firstTs) === fmtShortDate(g.lastTs);
              const days = Math.max(1, Math.round((new Date(g.lastTs)-new Date(g.firstTs))/86400000)+1);
              const dateRange = isSameDay
                ? fmtShortDate(g.firstTs)
                : `${fmtShortDate(g.firstTs)}–${fmtShortDate(g.lastTs)} · ${days} days`;
              const dot = groupDotColor(g);
              const lastTemp = g.logs.find(l=>l.amount)?.food;
              const medicine = g.type==="medicine"
                ? g.logs.map(l=>l.description||l.food).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,2).join(", ")
                : null;

              return (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 0", borderBottom:i<illnessGroups.length-1?`1px solid ${T.border}`:"none" }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:dot, flexShrink:0, marginTop:4 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:font, fontSize:14, fontWeight:700, color:T.text, marginBottom:2 }}>{groupLabel(g)}</div>
                    <div style={{ fontFamily:font, fontSize:11, color:T.muted, marginBottom:g.sleepImpact!==null||g.wakingDelta!==null?6:0 }}>
                      {dateRange}
                      {lastTemp ? ` · Temp: ${lastTemp}` : ""}
                      {medicine ? ` · ${medicine}` : ""}
                      {g.count > 1 && g.type==="medicine" ? ` ×${g.count}` : ""}
                    </div>
                    {/* Sleep impact correlation */}
                    {g.sleepImpact !== null && Math.abs(g.sleepImpact) >= 0.25 && (
                      <div style={{ fontFamily:font, fontSize:11, fontStyle:"italic", color:C.amber, lineHeight:1.5 }}>
                        Sleep {g.sleepImpact > 0 ? "+" : ""}{g.sleepImpact > 0
                          ? `+${Math.abs(g.sleepImpact).toFixed(1)}h avg during ${g.sub_type||"event"}`
                          : `–${Math.abs(g.sleepImpact).toFixed(1)}h avg during ${g.sub_type||"event"}`
                        }
                      </div>
                    )}
                    {g.wakingDelta !== null && Math.abs(g.wakingDelta) >= 0.3 && (
                      <div style={{ fontFamily:font, fontSize:11, fontStyle:"italic", color:C.amber, lineHeight:1.5 }}>
                        Night wakings {g.wakingDelta > 0 ? "+" : ""}{g.wakingDelta.toFixed(1)} during {g.sub_type||"event"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── TEMPERATURE LOG ── */}
      {tempLogs.length > 0 && (
        <Card>
          <SectionLabel>Temperature Log · Last 30 Days</SectionLabel>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {tempLogs.map((log, i) => {
              const temp = log.amount;
              const badge = temp ? tempBadge(temp) : null;
              return (
                <div key={log.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i<tempLogs.length-1?`1px solid ${T.border}`:"none" }}>
                  {/* Circle with temp value */}
                  <div style={{
                    width:48, height:48, borderRadius:"50%", flexShrink:0,
                    background: badge ? `${badge.color}15` : T.faint,
                    border: badge ? `1.5px solid ${badge.color}40` : `1px solid ${T.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:font, fontSize:11, fontWeight:700,
                    color: badge ? badge.color : T.muted,
                    lineHeight:1.1, textAlign:"center",
                  }}>
                    {temp ? `${temp}°` : "🌡️"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:font, fontSize:14, fontWeight:600, color:T.text }}>
                      {temp ? `${temp}°F` : "Temperature logged"}
                    </div>
                    <div style={{ fontFamily:font, fontSize:11, color:T.muted, marginTop:1 }}>
                      {fmtShortDate(log.ts)} · {(() => {
                        const d = new Date(log.ts);
                        const diff = Math.floor((Date.now()-d)/86400000);
                        return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff} days ago`;
                      })()}
                    </div>
                  </div>
                  {badge && (
                    <div style={{
                      padding:"4px 12px", borderRadius:20, flexShrink:0,
                      background:`${badge.color}15`, border:`1px solid ${badge.color}30`,
                      fontFamily:font, fontSize:11, fontWeight:600, color:badge.color,
                    }}>{badge.label}</div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── SHARE BUTTONS ── */}
      <ShareWithConsultant logs={logs} activeFamily={activeFamily} T={T} />
      <ShareWithPediatrician logs={logs} activeChild={activeChild} T={T} />

    </div>
  );
}

// ─── CONSULTANT VIEW ──────────────────────────────────────────────────────────
function ConsultantView({ config, setConfig, dbPin, isConsultant }) {
  const T = useT();
  const { activeChild: cvChild } = useApp();
  const [authed, setAuthed] = useState(isConsultant);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!authed) {
    return (
      <Card style={{ textAlign:"center", maxWidth:360, margin:"0 auto" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>🔐</div>
        <h3 style={{ fontFamily:serif, marginBottom:6 }}>Consultant Access</h3>
        <p style={{ fontSize:12, color:T.muted, marginBottom:20 }}>Enter your PIN to configure this family's sleep plan.</p>
        <input type="password" value={input} onChange={e=>setInput(e.target.value)} placeholder="Enter PIN"
          onKeyDown={e=>e.key==="Enter"&&(input===dbPin?.toString()?setAuthed(true):alert("Invalid PIN"))}
          style={{ width:"100%", padding:"12px 16px", marginBottom:12, background:T.inputBg, border:`1.5px solid ${T.border}`, color:T.text, borderRadius:10, fontFamily:font, fontSize:14, outline:"none" }} />
        <Btn onClick={()=>input===dbPin?.toString()?setAuthed(true):alert("Invalid PIN")} variant="teal" style={{ width:"100%" }}>Verify PIN</Btn>
      </Card>
    );
  }

  const cvAgeMonths = calcAgeMonths(cvChild?.dob);
  const ageWindows = cvAgeMonths !== null ? defaultWakeWindowsForAge(cvAgeMonths) : [1.5,2.0,2.5,3.0];
  const ageNapDur = cvAgeMonths !== null ? defaultNapDurationsForAge(cvAgeMonths) : [60,70,90];
  const wakeWindows = config.recommendedWakeWindows || ageWindows;
  const napDurs = config.napDurations || ageNapDur;

  const inputStyle = { padding:"8px 12px", borderRadius:9, border:`1px solid ${T.border}`, background:T.inputBg, color:T.text, fontFamily:font, fontSize:14, width:"100%", outline:"none" };
  const stepBtn = { width:30, height:30, border:`1px solid ${T.border}`, borderRadius:8, background:T.inputBg, color:T.text, fontSize:16, cursor:"pointer" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <Card>
        <SectionLabel>Wake Windows</SectionLabel>
        <p style={{ fontSize:12, color:T.muted, marginBottom:4 }}>Hours awake between sleeps. Windows grow through the day — last slot is always pre-bedtime.</p>
        {cvAgeMonths !== null && <p style={{ fontSize:11, color:T.teal, marginBottom:14 }}>Age-based defaults loaded for {cvAgeMonths}mo · tap +/− to override</p>}
        {wakeWindows.map((ww, i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <p style={{ fontSize:13, fontWeight:600, fontFamily:font }}>{i===0?"Before 1st nap":i===wakeWindows.length-1?"Before bedtime":`Before nap ${i+1}`}</p>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={()=>{const n=[...wakeWindows];n[i]=Math.max(0.5,parseFloat((n[i]-0.25).toFixed(2)));setConfig({...config,recommendedWakeWindows:n});}} style={stepBtn}>−</button>
              <span style={{ fontSize:16, fontWeight:700, color:C.teal, minWidth:40, textAlign:"center", fontFamily:font }}>{ww}h</span>
              <button onClick={()=>{const n=[...wakeWindows];n[i]=parseFloat((n[i]+0.25).toFixed(2));setConfig({...config,recommendedWakeWindows:n});}} style={stepBtn}>+</button>
            </div>
          </div>
        ))}
        <Divider />
        <div style={{ display:"flex", gap:10, marginTop:8, flexWrap:"wrap" }}>
          <Btn outline size="sm" onClick={()=>setConfig({...config,recommendedWakeWindows:[...wakeWindows,parseFloat((wakeWindows[wakeWindows.length-1]+0.5).toFixed(2))]})}>+ Add Window</Btn>
          {wakeWindows.length>1&&<Btn outline size="sm" onClick={()=>setConfig({...config,recommendedWakeWindows:wakeWindows.slice(0,-1)})}>− Remove Last</Btn>}
          <Btn outline size="sm" onClick={()=>setConfig({...config,recommendedWakeWindows:null})}>Reset to age defaults</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel>Nap Durations</SectionLabel>
        {cvAgeMonths!==null&&<p style={{ fontSize:11, color:T.teal, marginBottom:14 }}>Age-based defaults: {ageNapDur[0]}min min · {ageNapDur[1]}min target</p>}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
          {[{label:"Minimum",key:0,color:C.warm},{label:"Target",key:1,color:C.teal},{label:"Maximum",key:2,color:C.sage}].map(({label,key,color})=>(
            <div key={key} style={{ textAlign:"center" }}>
              <p style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:".07em", marginBottom:6, fontFamily:font }}>{label}</p>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                <button onClick={()=>{const n=[...napDurs];n[key]=Math.max(key===0?60:napDurs[0],n[key]-5);setConfig({...config,napDurations:n});}} style={{...stepBtn,width:24,height:24,fontSize:14}}>−</button>
                <span style={{ fontSize:15, fontWeight:700, color, minWidth:44, textAlign:"center", fontFamily:font }}>{napDurs[key]}m</span>
                <button onClick={()=>{const n=[...napDurs];n[key]=Math.min(key===2?180:napDurs[2],n[key]+5);setConfig({...config,napDurations:n});}} style={{...stepBtn,width:24,height:24,fontSize:14}}>+</button>
              </div>
            </div>
          ))}
        </div>
        <Btn outline size="sm" onClick={()=>setConfig({...config,napDurations:null})}>Reset to age defaults</Btn>
      </Card>
      <Card>
        <SectionLabel>Target Morning Wake Time</SectionLabel>
        <input type="time" value={(() => { const t=config.targetMorningWake; if(!t)return""; const m=t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i); if(!m)return""; let h=parseInt(m[1]);const min=m[2];const mer=m[3]?.toLowerCase(); if(mer==="pm"&&h<12)h+=12; if(mer==="am"&&h===12)h=0; return`${String(h).padStart(2,"0")}:${min}`; })()} onChange={e=>setConfig({...config,targetMorningWake:e.target.value||null})} style={{...inputStyle,marginBottom:8}} />
        {config.targetMorningWake&&<Btn outline size="sm" onClick={()=>setConfig({...config,targetMorningWake:null})}>Clear (use calculated)</Btn>}
      </Card>
      <Card>
        <SectionLabel>Sleep Method</SectionLabel>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {["Gradual Withdrawal","Fading","Chair Method","Extinction","Modified Extinction"].map(m=>(
            <Pill key={m} label={m} active={config.method===m} color={C.teal} onClick={()=>setConfig({...config,method:m})} />
          ))}
        </div>
      </Card>
      <Btn onClick={async()=>{setSaving(true);await setConfig(config);setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2000);}} variant="sage" size="lg" style={{ width:"100%" }} disabled={saving}>
        {saved?"✅ Saved!":saving?"Saving…":"Save Configuration"}
      </Btn>
    </div>
  );
}

// ─── EDIT LOG MODAL ───────────────────────────────────────────────────────────
export function EditLogModal({ log, onSave, onDelete, onClose }) {
  const T = useT();
  const [date, setDate] = useState(localDateStr(new Date(log.ts)));
  const [time, setTime] = useState(fmtTime(log.ts).replace(" AM","").replace(" PM","").replace(/(\d):(\d\d)/, (_,h,m)=>`${h.padStart(2,"0")}:${m}`));
  const [endTime, setEndTime] = useState(log.end_ts ? fmtTime(log.end_ts).replace(" AM","").replace(" PM","").replace(/(\d):(\d\d)/,(_,h,m)=>`${h.padStart(2,"0")}:${m}`) : "");
  const [mood, setMood] = useState(log.mood || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const pad = n => String(n).padStart(2, "0");
    function toISO(dateStr, timeStr, ref) {
      const [h,m]=timeStr.split(":").map(Number); const d=new Date(dateStr+"T00:00:00"); d.setHours(h,m,0,0);
      if(ref){const r=new Date(ref);if(d<r)d.setDate(d.getDate()+1);}
      const off=-d.getTimezoneOffset();const sign=off>=0?"+":"-";const offH=pad(Math.floor(Math.abs(off)/60));const offM=pad(Math.abs(off)%60);
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${offH}:${offM}`;
    }
    const newTs = toISO(date, time);
    const changes = { ts: newTs };
    if (log.type === "sleep_session") {
      if (endTime) { const newEnd = toISO(date, endTime, newTs); changes.end_ts = newEnd; changes.total_sleep_ms = Math.max(0, new Date(newEnd)-new Date(log.fell_asleep_ts||newTs)); }
      if (mood) changes.mood = mood;
    }
    await onSave(log.id, changes);
    setSaving(false); onClose();
  }

  const inputStyle = { width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${T.border}`, background:T.inputBg||T.faint, color:T.text, fontFamily:font, fontSize:14, outline:"none", boxSizing:"border-box" };
  const labelStyle = { fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:5, fontFamily:font };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:500, display:"flex", alignItems:"flex-end" }}>
      <div style={{ background:T.bg2||T.bg, borderRadius:"20px 20px 0 0", width:"100%", padding:"24px 20px 48px", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h3 style={{ fontFamily:serif, fontSize:18, color:T.headingText, margin:0 }}>Edit Log</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:T.muted }}>✕</button>
        </div>
        <div style={{ marginBottom:14 }}><label style={labelStyle}>Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle} /></div>
        <div style={{ marginBottom:14 }}><label style={labelStyle}>Start time</label><input type="time" value={time} onChange={e=>setTime(e.target.value)} style={inputStyle} /></div>
        {log.type==="sleep_session"&&log.end_ts&&<div style={{ marginBottom:14 }}><label style={labelStyle}>End time</label><input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} style={inputStyle} /></div>}
        {log.type==="sleep_session"&&(
          <div style={{ marginBottom:20 }}>
            <label style={labelStyle}>Wake-up mood</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[{id:"",label:"None"},{id:"happy",label:"😊"},{id:"neutral",label:"😐"},{id:"fussy",label:"😢"},{id:"sleepy",label:"😴"},{id:"upset",label:"😤"}].map(m=>(
                <button key={m.id} onClick={()=>setMood(m.id)} style={{ padding:"8px 14px", borderRadius:10, border:`1.5px solid ${mood===m.id?C.teal:T.border}`, background:mood===m.id?`${C.teal}18`:"transparent", cursor:"pointer", fontFamily:font, fontSize:13, color:mood===m.id?C.teal:T.text }}>{m.label}</button>
              ))}
            </div>
          </div>
        )}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:14, borderRadius:12, border:"none", background:T.teal, color:"#fff", fontFamily:font, fontSize:15, fontWeight:700, cursor:"pointer" }}>{saving?"Saving…":"Save changes"}</button>
          <button onClick={()=>{if(window.confirm("Delete this log entry?"))onDelete(log.id).then(onClose);}} style={{ padding:"14px 20px", borderRadius:12, border:`1px solid ${C.rose}40`, background:"none", color:C.rose, fontFamily:font, fontSize:14, cursor:"pointer" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT MODULE ──────────────────────────────────────────────────────────────
export function SleepLog({ user, activeFamily, initialTab, checkinRefreshKey = 0 }) {
  const T = useT();
  const { activeChild } = useApp();

  function resolveInitialTab(t) {
    if (!t) return "today";
    if (t === "dashboard") return "today";
    if (t === "history")   return "patterns";
    if (t === "growth")    return "wellness";
    return t;
  }

  const [tab, setTab] = useState(resolveInitialTab(initialTab));
  const [dbPin, setDbPin] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [config, setConfigState] = useState({
    recommendedWakeWindows: null, napDurations: null,
    targetMorningWake: null, method: "Gradual Withdrawal",
  });

  const familyId = activeFamily?.id;

  useEffect(() => {
    if (!familyId) { setLoadingLogs(false); return; }
    let cancelled = false;
    setLoadingLogs(true);
    Promise.all([
      fetchLogs(familyId),
      fetchConfig(familyId),
      supabase.from("intake_responses").select("ideal_wake_time, wake_time").eq("family_id", familyId).maybeSingle().then(({data})=>data).catch(()=>null),
    ]).then(([logData, cfgData, intakeData]) => {
      if (cancelled) return;
      setLogs(logData);
      const merged = cfgData || {};
      if (!merged.targetMorningWake && intakeData) merged.targetMorningWake = intakeData.ideal_wake_time || intakeData.wake_time || null;
      setConfigState(prev => ({ ...prev, ...merged }));
      setLoadingLogs(false);
    }).catch(err => {
      if (cancelled) return;
      console.error("[SleepLog] load error:", err);
      setLoadingLogs(false);
    });
    return () => { cancelled = true; };
  }, [familyId, checkinRefreshKey]);

  // Re-fetch logs only (not full reload) when user returns to the app.
  // Uses refreshLogs instead of re-running the main effect so the
  // cancelled flag never traps the loading state.
  // visibilitychange listener removed — SleepLog re-fetches via checkinRefreshKey
  // (see useEffect at line ~943). RCCShell increments the key only after activeFamily
  // and auth are fully settled, eliminating the race that caused empty log state.

  const childLogs = activeChild ? logs.filter(l => !l.child_id || l.child_id === activeChild.id) : logs;

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("consultant_pin").eq("id", user.id).single().then(({data})=>{if(data)setDbPin(data.consultant_pin);});
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
    try {
      setLogs(await fetchLogs(familyId));
    } catch (err) {
      console.error("[SleepLog] refresh error:", err);
    } finally {
      setLoadingLogs(false);
    }
  }, [familyId]);

  const addEntry = useCallback(async (type, data) => {
    const localId = crypto.randomUUID();
    const entry = { id: localId, ts: new Date().toISOString(), type, ...data, ...(activeChild?.id ? { child_id: activeChild.id } : {}) };
    setLogs(prev => [entry, ...prev]);
    setSaveError(null);
    if (familyId) {
      const saved = await insertLog(familyId, entry);
      if (saved) { setLogs(prev => prev.map(l => l.id === localId ? saved : l)); return saved; }
      setLogs(prev => prev.filter(l => l.id !== localId));
      setSaveError("⚠️ Log didn't save — check your connection and try again.");
      return null;
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

  const isConsultantUser = ["consultant","consultant_internal","admin"].includes(user?.role);
  const TABS = [
    { id: "today",     label: "Today",     icon: "🌙" },
    { id: "patterns",  label: "Patterns",  icon: "📈" },
    { id: "wellness",  label: "Wellness",  icon: "🌿" },
    ...(isConsultantUser ? [{ id: "configure", label: "Configure", icon: "⚙️" }] : []),
  ];

  return (
    <div style={{ fontFamily: font, color: T.text, paddingBottom: 80 }}>
      {saveError && (
        <div style={{ margin:"0 0 12px", padding:"11px 14px", borderRadius:12, background:`${C.rose}18`, border:`1px solid ${C.rose}40`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
          <span style={{ fontFamily:font, fontSize:13, color:C.rose, flex:1 }}>{saveError}</span>
          <button onClick={()=>{setSaveError(null);refreshLogs();}} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${C.rose}50`, background:"none", color:C.rose, fontFamily:font, fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>Retry</button>
        </div>
      )}

      {loadingLogs ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:T.muted }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🌙</div>
          <p style={{ fontFamily:serif, fontSize:15 }}>Loading sleep data…</p>
        </div>
      ) : (
        <>
          {tab === "today"     && <TodayView onLog={addEntry} onPatch={patchEntry} logs={childLogs} config={config} activeFamily={activeFamily} hasOpenDBSession={childLogs.some(l=>l.type==="sleep_session"&&!l.end_ts)} />}
          {tab === "patterns"  && <PatternsView logs={childLogs} onPatch={patchEntry} onDelete={deleteEntry} />}
          {tab === "wellness"  && <WellnessView logs={childLogs} activeFamily={activeFamily} />}
          {tab === "configure" && isConsultantUser && <ConsultantView config={config} setConfig={setConfig} dbPin={dbPin} isConsultant={isConsultantUser} />}
        </>
      )}
    </div>
  );
}
