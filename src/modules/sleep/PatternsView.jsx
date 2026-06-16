// src/modules/sleep/PatternsView.jsx
import { useState, useMemo, useRef } from "react";
import { useT, useApp } from "../../core/shared.jsx";
import { C, MOODS, font, serif, calcAgeMonths, fmtDuration, fmtDateTime } from "./sleepHelpers.js";
import { Card, SectionLabel, StatCard } from "./sleepUI.jsx";
import { EditLogModal } from "./SleepLog.jsx";
import { supabase } from "../../lib/supabase.js";

export function PatternsView({ logs, onPatch, onDelete }) {
  const T = useT();
  const { activeChild, setTab } = useApp();
  const [range, setRange] = useState(7);
  const [editingLog, setEditingLog] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const chartRef = useRef(null);
  const { activeFamily, currentUser } = useApp();

  async function handleShareWithConsultant() {
    if (!activeFamily?.id || !currentUser?.id) return;
    setSharing(true);
    try {
      // Build text summary
      const since = new Date(Date.now() - range * 86400000).toISOString();
      const periodLogs = logs.filter(l => l.ts > since);
      const sessions = periodLogs.filter(l => l.type === "sleep_session" && l.end_ts);
      const nightWakings = periodLogs.filter(l => l.type === "night_waking");
      const childAge = activeChild?.dob
        ? (() => { const m = Math.floor((Date.now() - new Date(activeChild.dob)) / (1000*60*60*24*30.44)); return m < 24 ? `${m}mo` : `${Math.floor(m/12)}y`; })()
        : null;

      const avgTotal = sessions.length
        ? (sessions.reduce((s, l) => s + (l.total_sleep_ms || 0), 0) / sessions.length / 3600000).toFixed(1)
        : null;
      const nightSessions = sessions.filter(l => l.session_type === "night");
      const napSessions = sessions.filter(l => l.session_type !== "night");
      const avgNight = nightSessions.length
        ? (nightSessions.reduce((s, l) => s + (l.total_sleep_ms || 0), 0) / nightSessions.length / 3600000).toFixed(1)
        : null;
      const avgSettle = sessions.filter(l => l.fall_asleep_secs != null).length
        ? Math.round(sessions.filter(l => l.fall_asleep_secs != null).reduce((s, l) => s + l.fall_asleep_secs, 0) / sessions.filter(l => l.fall_asleep_secs != null).length / 60)
        : null;

      const lines = [
        `📊 Sleep Patterns Report — ${childName}${childAge ? ` (${childAge})` : ""}`,
        `Period: Last ${range} days`,
        `Generated: ${new Date().toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}`,
        ``,
        `SUMMARY`,
        avgTotal ? `• Avg sleep per session: ${avgTotal}h` : `• No completed sessions`,
        avgNight ? `• Avg night sleep: ${avgNight}h` : null,
        `• Total sessions: ${sessions.length} (${nightSessions.length} night, ${napSessions.length} nap)`,
        `• Night wakings: ${nightWakings.length}`,
        avgSettle ? `• Avg settle time: ${avgSettle} min` : null,
        ``,
        `TARGET for age: ${target.total}h total / ${target.nap}h nap`,
        ``,
        `RECENT SESSIONS`,
        ...sessions.slice(0, 8).map(s => {
          const d = new Date(s.ts).toLocaleDateString([], { month: "short", day: "numeric" });
          const dur = s.total_sleep_ms ? (s.total_sleep_ms / 3600000).toFixed(1) + "h" : "—";
          const icon = s.session_type === "night" ? "🌙" : "☀️";
          const mood = s.mood ? ` · mood: ${s.mood}` : "";
          return `• ${d} ${icon} ${dur}${mood}`;
        }),
        ``,
        `Shared from Held app`,
      ].filter(l => l !== null);

      const reportText = lines.join("\n");

      await supabase.from("messages").insert({
        family_id: activeFamily.id,
        sender_id: currentUser.id,
        sender_role: "parent",
        content: reportText,
        type: "text",
        created_at: new Date().toISOString(),
      });

      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch (e) {
      console.error("[PatternsView share]", e);
      alert("Something went wrong. Please try again.");
    } finally {
      setSharing(false);
    }
  }

  function handlePrintWithCharts() {
    // Open print dialog — browser renders SVGs natively in PDF
    window.print();
  }
  const childName = activeChild?.name ?? "your child";
  const ageMonths = useMemo(() => activeChild?.dob ? calcAgeMonths(activeChild.dob) : null, [activeChild?.dob]);

  function sleepTarget(mo) {
    if (mo === null) return { total: 14, nap: 3.5 };
    if (mo < 3)  return { total: 16, nap: 6 };
    if (mo < 6)  return { total: 15, nap: 4.5 };
    if (mo < 9)  return { total: 14, nap: 3.5 };
    if (mo < 12) return { total: 14, nap: 3 };
    if (mo < 18) return { total: 13.5, nap: 2.5 };
    if (mo < 24) return { total: 13, nap: 2 };
    if (mo < 36) return { total: 12, nap: 1.5 };
    return { total: 11, nap: 0 };
  }
  const target = sleepTarget(ageMonths);

  function fmtHm(h) {
    if (!h || h <= 0) return "—";
    const hrs = Math.floor(h), mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }

  const dayData = useMemo(() => Array.from({ length: range }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (range - 1 - i));
    const dayStr = d.toDateString();
    const dl = logs.filter(l => new Date(l.ts).toDateString() === dayStr);
    const sessions = dl.filter(l => l.type === "sleep_session" && l.end_ts);
    const naps  = sessions.filter(l => {
      if (l.session_type === "night") return false;
      if (l.session_type === "nap") return true;
      // Legacy sessions without session_type — only count as nap if started between 6am–8pm
      const hour = new Date(l.ts).getHours();
      return hour >= 6 && hour < 20;
    });
    const night = sessions.filter(l => l.session_type === "night");
    const totalH = sessions.reduce((s,l) => s + Math.max(0, new Date(l.end_ts)-new Date(l.ts)),0)/3600000;
    const napH   = naps.reduce((s,l) => s + Math.max(0, new Date(l.end_ts)-new Date(l.ts)),0)/3600000;
    const nightH = night.reduce((s,l) => s + Math.max(0, new Date(l.end_ts)-new Date(l.ts)),0)/3600000;
    return {
      label: d.toLocaleDateString([],{weekday:"short"}),
      totalH: parseFloat(totalH.toFixed(1)), nightH: parseFloat(nightH.toFixed(1)),
      napH: parseFloat(napH.toFixed(1)), napCount: naps.length,
      nightWakes: dl.filter(l => l.type === "night_waking").length,
      avgSettleMins: (() => { const w = sessions.filter(l => l.fall_asleep_secs != null); return w.length ? Math.round(w.reduce((s,l)=>s+l.fall_asleep_secs,0)/w.length/60) : null; })(),
      onTrack: totalH > 0 && totalH >= target.total - 1,
      hasData: sessions.length > 0,
      hasWakingData: dl.filter(l => l.type === "night_waking").length > 0,
    };
  }), [logs, range, target.total]);

  const stats = useMemo(() => {
    const days = dayData.filter(d => d.hasData);
    if (!days.length) return null;
    const avg = k => days.reduce((s,d)=>s+d[k],0)/days.length;
    const avgTotal = avg("totalH"), avgNap = avg("napH"), avgNight = avg("nightH");
    // Night wakes — only average across days that actually had a waking logged
    const daysWithWakings = dayData.filter(d => d.nightWakes > 0);
    const avgNightWakes = daysWithWakings.length
      ? parseFloat((daysWithWakings.reduce((s,d)=>s+d.nightWakes,0)/daysWithWakings.length).toFixed(1))
      : 0;
    const settleArr = days.filter(d=>d.avgSettleMins!==null);
    const avgSettle = settleArr.length ? Math.round(settleArr.reduce((s,d)=>s+d.avgSettleMins,0)/settleArr.length) : null;
    // Naps/day — only average across days that actually had naps
    const daysWithNaps = days.filter(d => d.napCount > 0);
    const avgNapCount = daysWithNaps.length
      ? parseFloat((daysWithNaps.reduce((s,d)=>s+d.napCount,0)/daysWithNaps.length).toFixed(1))
      : 0;
    return {
      avgTotal: parseFloat(avgTotal.toFixed(1)), avgNap: parseFloat(avgNap.toFixed(1)),
      avgNight: parseFloat(avgNight.toFixed(1)), avgNightWakes,
      avgSettle, avgNapCount,
      totalGap: parseFloat((avgTotal - target.total).toFixed(1)),
      napGap: parseFloat((avgNap - target.nap).toFixed(1)),
    };
  }, [dayData, target]);

  const meaningMaker = useMemo(() => {
    if (!stats) return null;
    if (stats.napGap < -0.75) return `Naps running ~${Math.abs(stats.napGap).toFixed(1)}h short this week. That's likely where the late-afternoon fussiness is coming from.`;
    if (stats.avgNightWakes >= 3) return `${stats.avgNightWakes} average night wakings — her system is still processing a lot at night. Watch for overtiredness earlier in the day.`;
    if (stats.avgNightWakes <= 1 && stats.avgNight > 0) return `Night sleep is strong with ${stats.avgNightWakes} average wakings. Her nervous system is consolidating sleep well.`;
    if (stats.totalGap < -1.5) return `Total sleep running ${Math.abs(stats.totalGap).toFixed(1)}h under target. Sleep debt accumulates — you may notice more dysregulation during the day.`;
    if (stats.totalGap >= 0) return "Total sleep is meeting the target for this age. Keep doing what you're doing.";
    return null;
  }, [stats]);

  function trendLabel(gap) {
    if (Math.abs(gap) < 0.15) return { text: "on track", color: C.sage };
    return gap > 0 ? { text: `+${Math.abs(gap).toFixed(1)}h over`, color: C.sage } : { text: `↓ ${Math.abs(gap).toFixed(1)}h short`, color: C.mauve };
  }

  const maxH = Math.max(...dayData.map(d => d.totalH), target.total, 1);

  // Per-nap breakdown helpers
  const NS_NOTES = [
    (s) => s.avgDurH < 0.9 ? `Nap 1 averaging under an hour. If this is consistent, the wake window before may be too short — her system isn't building enough sleep pressure yet.` : `Nap 1 looking good. A consistent first nap anchors the rest of the day.`,
    (s) => s.avgDurH < 0.75 ? `Short second nap is common — it's often the bridge nap. Watch whether it's affecting bedtime mood.` : `Solid second nap duration. This usually means the morning wake window is well-calibrated.`,
    (s) => `Third nap averaging ${fmtHm(s.avgDurH)}. At this age, the third nap is mostly a buffer — focus on keeping it early enough not to push bedtime.`,
  ];

  function napStats(napIdx) {
    const napSessions = dayData.map((day, dayIdx) => {
      const d = new Date(); d.setDate(d.getDate()-(range-1-dayIdx));
      const dayStr = d.toDateString();
      const dayLogs = logs.filter(l => new Date(l.ts).toDateString() === dayStr);
      const naps = dayLogs.filter(l => {
        if (l.type !== "sleep_session" || !l.end_ts) return false;
        if (l.session_type === "night") return false;
        if (l.session_type === "nap") return true;
        const hour = new Date(l.ts).getHours();
        return hour >= 6 && hour < 20;
      }).sort((a,b)=>new Date(a.ts)-new Date(b.ts));
      const nap = naps[napIdx] || null;
      if (!nap) return null;

      // Wake window = time awake before this nap
      // For Nap 1: measured from end of night sleep (morning wake-up)
      // For Nap 2+: measured from end of previous nap
      // Cap at 8h to avoid stale references if no sleep was logged
      const napStartMs = new Date(nap.ts).getTime();
      const CAP_MS = 8 * 3600000;

      const prevSession = napIdx === 0
        // Nap 1 — look for the most recent night sleep end
        ? logs
            .filter(l =>
              l.type === "sleep_session" && l.end_ts &&
              l.session_type === "night" &&
              new Date(l.end_ts).getTime() < napStartMs &&
              napStartMs - new Date(l.end_ts).getTime() <= CAP_MS
            )
            .sort((a, b) => new Date(b.end_ts) - new Date(a.end_ts))[0] || null
        // Nap 2+ — look for the most recent nap end
        : logs
            .filter(l =>
              l.type === "sleep_session" && l.end_ts &&
              l.session_type === "nap" &&
              new Date(l.end_ts).getTime() < napStartMs &&
              napStartMs - new Date(l.end_ts).getTime() <= CAP_MS
            )
            .sort((a, b) => new Date(b.end_ts) - new Date(a.end_ts))[0] || null;

      const ww = prevSession
        ? (napStartMs - new Date(prevSession.end_ts).getTime()) / 3600000
        : null;

      return {
        durH: Math.max(0, new Date(nap.end_ts) - new Date(nap.ts)) / 3600000,
        settleMins: nap.fall_asleep_secs != null ? nap.fall_asleep_secs / 60 : null,
        wwH: ww != null ? Math.max(0, ww) : null,
      };
    }).filter(Boolean);

    if (!napSessions.length) return null;
    const avgDurH = napSessions.reduce((s,l)=>s+l.durH,0)/napSessions.length;
    const settleArr = napSessions.filter(l=>l.settleMins!=null);
    const avgSettle = settleArr.length ? Math.round(settleArr.reduce((s,l)=>s+l.settleMins,0)/settleArr.length) : null;
    const wwArr = napSessions.filter(l=>l.wwH!=null);
    const avgWW = wwArr.length ? parseFloat((wwArr.reduce((s,l)=>s+l.wwH,0)/wwArr.length).toFixed(2)) : null;

    // Per-session series for multi-line chart (last N sessions)
    const recent = napSessions.slice(-Math.min(napSessions.length, range));
    return {
      avgDurH: parseFloat(avgDurH.toFixed(2)),
      avgSettle,
      avgWW,
      durSeries:    recent.map(s => s.durH),
      settleSeries: recent.map(s => s.settleMins),
      wwSeries:     recent.map(s => s.wwH),
    };
  }

  function nightStats() {
    const nights = dayData.map((day, i) => {
      const d = new Date(); d.setDate(d.getDate()-(range-1-i));
      const dayLogs = logs.filter(l=>new Date(l.ts).toDateString()===d.toDateString());
      const ns = dayLogs.filter(l=>l.type==="sleep_session"&&l.end_ts&&l.session_type==="night");
      const wakes = dayLogs.filter(l=>l.type==="night_waking").length;
      const dur = ns.reduce((s,l)=>s+Math.max(0,new Date(l.end_ts)-new Date(l.ts)),0)/3600000;
      const settle = ns.filter(l=>l.fall_asleep_secs!=null);
      return (ns.length > 0 || wakes > 0) ? { durH:dur, wakes, avgSettle: settle.length?Math.round(settle.reduce((s,l)=>s+l.fall_asleep_secs,0)/settle.length/60):null } : null;
    }).filter(Boolean);
    if (!nights.length) return null;
    return { avgDurH: parseFloat((nights.reduce((s,n)=>s+n.durH,0)/nights.length).toFixed(1)), avgWakes: parseFloat((nights.reduce((s,n)=>s+n.wakes,0)/nights.length).toFixed(1)), avgSettle: nights.some(n=>n.avgSettle!==null)?Math.round(nights.filter(n=>n.avgSettle!==null).reduce((s,n)=>s+n.avgSettle,0)/nights.filter(n=>n.avgSettle!==null).length):null };
  }

  // Only show a nap slot if it occurred on enough days to be a real pattern
  // (at least 2 days AND at least 25% of logged days)
  const daysWithData = dayData.filter(d => d.hasData).length;
  const minDaysForNap = Math.max(2, Math.ceil(daysWithData * 0.25));
  const maxNaps = (() => {
    let max = 0;
    for (let idx = 0; idx < 6; idx++) {
      const daysWithThisNap = dayData.filter((day, i) => {
        const d = new Date(); d.setDate(d.getDate()-(range-1-i));
        const naps = logs.filter(l => {
          if (l.type !== "sleep_session" || !l.end_ts) return false;
          if (new Date(l.ts).toDateString() !== d.toDateString()) return false;
          if (l.session_type === "night") return false;
          if (l.session_type === "nap") return true;
          const hour = new Date(l.ts).getHours();
          return hour >= 6 && hour < 20;
        });
        return naps.length > idx;
      }).length;
      if (daysWithThisNap >= minDaysForNap) max = idx + 1;
      else break;
    }
    return max;
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Range toggle */}
      <div style={{ display: "flex", background: T.faint, borderRadius: 12, padding: 3 }}>
        {[7,14,30].map(r => (
          <button key={r} onClick={() => setRange(r)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 9, border: "none",
            background: range === r ? T.card : "transparent",
            color: range === r ? T.teal : T.muted,
            fontFamily: font, fontSize: 13, fontWeight: range === r ? 700 : 400,
            cursor: "pointer",
          }}>{r}d</button>
        ))}
      </div>

      {!stats ? (
        <Card><p style={{ fontFamily: font, fontSize: 13, color: T.muted, textAlign: "center", padding: "12px 0", lineHeight: 1.6 }}>Log a few sleep sessions and patterns will start appearing here.</p></Card>
      ) : (<>

        {/* Unified stat card — wireframe style, all 6 together */}
        <Card>
          <SectionLabel>Sleep Patterns · {range}-day avg</SectionLabel>
          {/* Top row: Total / Naps / Night — large serif */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Avg Total", value: fmtHm(stats.avgTotal), trend: trendLabel(stats.totalGap), color: C.sage },
              { label: "Avg Naps",  value: fmtHm(stats.avgNap),   trend: trendLabel(stats.napGap),   color: C.teal },
              { label: "Avg Night", value: fmtHm(stats.avgNight), trend: { text: stats.avgNight > 8 ? "solid" : stats.avgNight > 6 ? "ok" : "short", color: stats.avgNight > 8 ? C.sage : stats.avgNight > 6 ? C.warm : C.mauve }, color: C.sky },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: font, fontSize: 9, color: T.muted, margin: "4px 0 2px", textTransform: "uppercase", letterSpacing: ".07em" }}>{s.label}</div>
                {s.trend && <div style={{ fontFamily: font, fontSize: 9, fontWeight: 700, color: s.trend.color }}>↑ {s.trend.text}</div>}
              </div>
            ))}
          </div>
          {/* Divider */}
          <div style={{ height: 1, background: T.border, margin: "0 0 14px" }} />
          {/* Bottom row: Settling / Wakings / Naps/day */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Avg Settling", value: stats.avgSettle != null ? `${stats.avgSettle}m` : "—", color: C.amber },
              { label: "Night Wakings", value: String(stats.avgNightWakes), color: C.mauve },
              { label: "Naps/day",      value: String(stats.avgNapCount),   color: C.purple },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: font, fontSize: 9, color: T.muted, margin: "4px 0", textTransform: "uppercase", letterSpacing: ".07em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Feeding & Diapers row — under-2 only ── */}
          {ageMonths !== null && ageMonths < 24 && (() => {
            const since = new Date(Date.now() - range * 86400000).toISOString();
            const periodLogs = logs.filter(l => l.ts > since);

            // Helper: count distinct calendar days that have at least one matching log
            function daysWithLogs(subset) {
              const days = new Set(subset.map(l => new Date(l.ts).toDateString()));
              return days.size || 1; // avoid divide-by-zero; falls back to 1 if no logs
            }

            const diaperLogs = periodLogs.filter(l => l.type === "diaper");
            const diaperDays = daysWithLogs(diaperLogs);
            // "both" counts as both a wet and a dirty — match the same logic as SleepLog wellness view
            const wetCount   = diaperLogs.filter(l => l.sub_type === "wet"   || l.sub_type === "both").length;
            const dirtyCount = diaperLogs.filter(l => l.sub_type === "dirty" || l.sub_type === "both").length;
            const wetPerDay   = diaperLogs.length ? parseFloat((wetCount   / diaperDays).toFixed(1)) : 0;
            const dirtyPerDay = diaperLogs.length ? parseFloat((dirtyCount / diaperDays).toFixed(1)) : 0;

            const feedLogs    = periodLogs.filter(l => l.type === "feed");
            const feedDays    = daysWithLogs(feedLogs);
            const feedsPerDay = feedLogs.length ? parseFloat((feedLogs.length / feedDays).toFixed(1)) : 0;
            const totalOz     = feedLogs.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
            const ozLogs      = feedLogs.filter(l => parseFloat(l.amount) > 0);
            const ozDays      = daysWithLogs(ozLogs);
            const ozPerDay    = ozLogs.length ? parseFloat((totalOz / ozDays).toFixed(1)) : 0;
            const hasBottle  = feedLogs.some(l => l.mode !== "nursing");
            const hasNursing = feedLogs.some(l => l.mode === "nursing");

            // AAP-based ranges by age
            const wetRange   = ageMonths < 1.5 ? [6,8] : ageMonths < 6 ? [5,6] : [4,6];
            const dirtyRange = [1, 2]; // 3+ days = flag; >5/day = flag; 0–2 normal for all types
            const feedRange  = ageMonths < 3 ? [8,12] : ageMonths < 6 ? [6,8] : ageMonths < 12 ? [4,6] : [3,4];
            const ozRange    = ageMonths < 3 ? [18,24] : ageMonths < 12 ? [24,32] : [16,24];

            function dot(val, [lo, hi]) {
              const color = val >= lo && val <= hi ? "#5C7A5E" : val < lo ? "#A85040" : "#B8924A";
              return <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, margin: "0 auto 3px" }} />;
            }

            return (
              <>
                <div style={{ height: 1, background: T.border, margin: "14px 0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div style={{ textAlign: "center" }}>
                    {dot(wetPerDay, wetRange)}
                    <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: T.text, lineHeight: 1 }}>
                      {wetPerDay} <span style={{ color: T.muted, fontWeight: 400, fontSize: 14 }}>/</span> {dirtyPerDay}
                    </div>
                    <div style={{ fontFamily: font, fontSize: 9, color: T.muted, margin: "4px 0 2px", textTransform: "uppercase", letterSpacing: ".07em" }}>Diapers/day</div>
                    <div style={{ fontFamily: font, fontSize: 9, color: T.muted }}>Wet / Dirty</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    {dot(feedsPerDay, feedRange)}
                    <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1 }}>{feedsPerDay}</div>
                    <div style={{ fontFamily: font, fontSize: 9, color: T.muted, margin: "4px 0", textTransform: "uppercase", letterSpacing: ".07em" }}>Feeds/day</div>
                  </div>
                  {hasBottle && (
                    <div style={{ textAlign: "center" }}>
                      {dot(ozPerDay, ozRange)}
                      <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1 }}>{ozPerDay}</div>
                      <div style={{ fontFamily: font, fontSize: 9, color: T.muted, margin: "4px 0", textTransform: "uppercase", letterSpacing: ".07em" }}>Oz/day</div>
                    </div>
                  )}
                  {!hasBottle && hasNursing && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.border, margin: "0 auto 3px" }} />
                      <div style={{ fontFamily: serif, fontSize: 14, fontWeight: 700, color: T.muted, lineHeight: 1 }}>—</div>
                      <div style={{ fontFamily: font, fontSize: 9, color: T.muted, margin: "4px 0", textTransform: "uppercase", letterSpacing: ".07em" }}>Oz/day</div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </Card>

        {/* ── Today's Sleep Timeline (moved from Today tab) ── */}
        {(() => {
          const nowMs = Date.now();
          const toPct = ts => {
            const d = new Date(ts);
            const dayStart = new Date(d); dayStart.setHours(7, 0, 0, 0);
            const dayEnd = new Date(d); dayEnd.setHours(19, 0, 0, 0);
            return Math.min(100, Math.max(0, (d - dayStart) / (dayEnd - dayStart) * 100));
          };
          const todaySessions = (logs || []).filter(l => {
            if (l.type !== "sleep_session") return false;
            const d = new Date(l.ts);
            const today = new Date();
            return d.toDateString() === today.toDateString();
          });
          return (
            <Card>
              <SectionLabel>Today's Sleep Timeline</SectionLabel>
              <div style={{ position: "relative", height: 26, borderRadius: 6, background: T.faint, overflow: "hidden", marginBottom: 10 }}>
                {todaySessions.length === 0 && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: font, fontSize: 10, color: T.muted }}>No sessions logged yet today</span>
                  </div>
                )}
                {todaySessions.map(s => {
                  const sp = toPct(s.ts), ep = s.end_ts ? toPct(s.end_ts) : toPct(new Date().toISOString());
                  return <div key={s.id} style={{ position: "absolute", top: 3, height: 20, left: `${sp}%`, width: `${Math.max(ep-sp,1.5)}%`, background: s.session_type==="night"?T.bark:C.sage, opacity: s.end_ts?0.85:0.5, borderRadius: 4 }} />;
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {["7am","10am","1pm","4pm","7pm"].map(t=><span key={t} style={{ fontFamily: font, fontSize: 10, color: T.muted }}>{t}</span>)}
              </div>
            </Card>
          );
        })()}

        {/* Bar / Line chart */}
        <Card>
          <SectionLabel>Daily Sleep · Hours</SectionLabel>

          {range <= 14 ? (
            /* ── Bar chart for 7d / 14d ── */
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: range === 7 ? 10 : 6, height: 80, marginBottom: 8 }}>
                {dayData.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ width: "100%", borderRadius: "4px 4px 0 0", background: d.hasData ? (d.onTrack ? C.sage : C.mauve) : T.border, height: `${(d.totalH / maxH) * 72}px`, minHeight: d.hasData ? 3 : 0, transition: "height .3s" }} />
                    <span style={{ fontFamily: font, fontSize: range === 7 ? 10 : 8.5, color: T.muted }}>{d.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: C.sage }} /><span style={{ fontFamily: font, fontSize: 10, color: T.muted }}>On track</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: C.mauve }} /><span style={{ fontFamily: font, fontSize: 10, color: T.muted }}>Below target</span></div>
              </div>
            </>
          ) : (
            /* ── Line chart for 30d — Total daily sleep + target only ── */
            (() => {
              const firstDataIdx = dayData.findIndex(d => d.hasData);
              const trimmed = firstDataIdx > 0 ? dayData.slice(firstDataIdx) : dayData;
              if (trimmed.length < 2) return <p style={{ fontFamily: font, fontSize: 13, color: T.muted, padding: "12px 0" }}>Not enough data yet for a trend.</p>;

              const W = 320, H = 100, padL = 30, padR = 10, padT = 10, padB = 22;
              const cW = W - padL - padR, cH = H - padT - padB;

              // Total = night + naps combined
              const totalPts = trimmed.map(d => (d.nightH > 0 || d.napH > 0) ? d.nightH + d.napH : null);
              const maxHours = Math.max(...totalPts.filter(v => v != null), target.total) * 1.15 || 16;
              const targetY  = (padT + cH - (target.total / maxHours) * cH).toFixed(1);

              const sx = i => padL + (i / (trimmed.length - 1)) * cW;
              const syL = v => padT + cH - (v / maxHours) * cH;

              function buildPath(pts) {
                let d = "";
                pts.forEach((v, i) => {
                  if (v == null) return;
                  const x = sx(i).toFixed(1), y = syL(v).toFixed(1);
                  d += pts.slice(0, i).every(p => p == null) ? `M${x},${y}` : `L${x},${y}`;
                });
                return d;
              }

              const yTicksL = [0, Math.round(maxHours / 2), Math.round(maxHours)];
              const xLabels = trimmed.map((d, i) => ({
                label: d.label, x: sx(i),
                show: i === 0 || i % 5 === 0 || i === trimmed.length - 1,
              }));

              return (
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", marginBottom: 8 }}>
                  {/* Gridlines */}
                  {yTicksL.map(v => (
                    <line key={v} x1={padL} y1={syL(v)} x2={W - padR} y2={syL(v)} stroke="#e8e4dc" strokeWidth={0.5} />
                  ))}

                  {/* Left Y axis labels */}
                  {yTicksL.map(v => (
                    <text key={v} x={padL - 4} y={syL(v) + 3} textAnchor="end" fill="#bbb" fontSize={7} fontFamily={font}>{v}h</text>
                  ))}

                  {/* Target line */}
                  <line x1={padL} y1={targetY} x2={W - padR} y2={targetY}
                    stroke={C.sage} strokeWidth={1} strokeDasharray="5,3" opacity={0.5} />

                  {/* Total sleep line */}
                  <path d={buildPath(totalPts)} fill="none" stroke="#4A7A5C"
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  {totalPts.map((v, i) => v != null && (
                    <circle key={i} cx={sx(i)} cy={syL(v)} r={2.5}
                      fill={v >= target.total ? "#4A7A5C" : C.mauve} />
                  ))}

                  {/* X labels */}
                  {xLabels.filter(l => l.show).map((l, i) => (
                    <text key={i} x={l.x} y={H - 4} textAnchor="middle" fill="#bbb" fontSize={7} fontFamily={font}>{l.label}</text>
                  ))}
                </svg>
              );
            })()
          )}

          {/* Legend — only for 30d line chart */}
          {range > 14 && (
            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
              {[
                { color: "#4A7A5C", label: "Total daily sleep", dashed: false, width: 2 },
                { color: C.sage,   label: "Target",            dashed: true,  width: 1 },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width={20} height={8}>
                    <line x1={0} y1={4} x2={20} y2={4} stroke={l.color} strokeWidth={l.width}
                      strokeDasharray={l.dashed ? "4,3" : "none"} strokeLinecap="round" />
                  </svg>
                  <span style={{ fontFamily: font, fontSize: 10, color: T.muted }}>{l.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Per-nap breakdown */}
        {(() => {
          if (maxNaps === 0) return null;
          return (
            <div>
              <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>Per-Nap Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({length: maxNaps},(_,i)=>i).map(idx => {
                  const s = napStats(idx);
                  if (!s) return null;

                  // ── Multi-line SVG chart ──────────────────────────────────
                  const CHART_W = 300, CHART_H = 70, PAD = 6;
                  const chartW = CHART_W - PAD * 2;

                  // Shared Y scale across all series so relative values are meaningful
                  const settleInH = s.settleSeries.map(v => v != null ? v / 60 : null);
                  const hasSettle = settleInH.some(v => v != null);
                  const hasWW = s.wwSeries.some(v => v != null);

                  const allVals = [
                    ...s.durSeries,
                    ...(hasSettle ? settleInH : []),
                    ...(hasWW ? s.wwSeries : []),
                  ].filter(v => v != null);
                  const sharedMin = 0;
                  const sharedMax = Math.max(...allVals) * 1.15 || 1;

                  const n = s.durSeries.length;
                  const sx = i => PAD + (i / (n - 1)) * chartW;
                  const sy = v => v == null ? null : (CHART_H - PAD) - ((v - sharedMin) / (sharedMax - sharedMin)) * (CHART_H - PAD * 2);

                  function renderLine(pts, color, dashed) {
                    const valid = pts.filter(p => p != null);
                    if (!valid.length || pts.length < 2) return null;
                    let d = "";
                    pts.forEach((v, i) => {
                      if (v == null) return;
                      const x = sx(i).toFixed(1), y = sy(v).toFixed(1);
                      d += d === "" || pts.slice(0, i).every(p => p == null) ? `M${x},${y}` : `L${x},${y}`;
                    });
                    return (
                      <g key={color}>
                        <path d={d} fill="none" stroke={color} strokeWidth={2}
                          strokeDasharray={dashed ? "5,4" : "none"}
                          strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map((v, i) => v != null && (
                          <circle key={i} cx={sx(i)} cy={sy(v)} r={3}
                            fill={color} stroke="white" strokeWidth={1.5}
                            opacity={i === pts.length - 1 ? 1 : 0.6} />
                        ))}
                      </g>
                    );
                  }

                  const COLORS = {
                    dur:    "#4A7A5C",  // dark green solid — Duration
                    settle: "#B8924A",  // gold dashed — Settling
                    ww:     "#7BAA8A",  // light green dashed — Wake Win.
                  };

                  return (
                    <Card key={idx}>
                      {/* Header: label + stats */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                        <div style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: T.text }}>Nap {idx+1}</div>
                        <div style={{ display: "flex", gap: 16 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: COLORS.dur, lineHeight: 1 }}>{fmtHm(s.avgDurH)}</div>
                            <div style={{ fontFamily: font, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>Avg</div>
                          </div>
                          {s.avgWW != null && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: COLORS.ww, lineHeight: 1 }}>{fmtHm(s.avgWW)}</div>
                              <div style={{ fontFamily: font, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>Wake Win.</div>
                            </div>
                          )}
                          {s.avgSettle != null && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: COLORS.settle, lineHeight: 1 }}>{s.avgSettle}m</div>
                              <div style={{ fontFamily: font, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>Settling</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Multi-line chart */}
                      {s.durSeries.length >= 2 && (
                        <div style={{ marginBottom: 10 }}>
                          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: "100%", height: "auto", display: "block" }}>
                            {renderLine(s.durSeries,    COLORS.dur,    false)}
                            {hasSettle && renderLine(settleInH,    COLORS.settle, true)}
                            {hasWW     && renderLine(s.wwSeries,   COLORS.ww,    true)}
                          </svg>
                          {/* Legend */}
                          <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke={COLORS.dur} strokeWidth={2} strokeLinecap="round" /></svg>
                              <span style={{ fontFamily: font, fontSize: 10, color: T.muted }}>Duration</span>
                            </div>
                            {hasSettle && (
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke={COLORS.settle} strokeWidth={2} strokeDasharray="4,3" strokeLinecap="round" /></svg>
                                <span style={{ fontFamily: font, fontSize: 10, color: T.muted }}>Settling</span>
                              </div>
                            )}
                            {hasWW && (
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke={COLORS.ww} strokeWidth={2} strokeDasharray="4,3" strokeLinecap="round" /></svg>
                                <span style={{ fontFamily: font, fontSize: 10, color: T.muted }}>Wake Win.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={{ height: 1, background: T.border, margin: "4px 0 10px" }} />
                      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 13 }}>🌿</span>
                        <span style={{ fontFamily: font, fontSize: 12, color: T.muted, fontStyle: "italic", lineHeight: 1.55 }}>{NS_NOTES[idx]?.(s) ?? ""}</span>
                      </div>
                    </Card>
                  );
                })}
                {(() => {
                  const ns = nightStats();
                  if (!ns) return null;
                  return (
                    <div style={{ borderRadius: 16, padding: "16px 18px", background: `linear-gradient(135deg, ${T.bark}, ${T.bark}dd)` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Night</div>
                        <div style={{ display: "flex", gap: 14 }}>
                          {[{v:fmtHm(ns.avgDurH),l:"Avg"},{v:String(ns.avgWakes),l:"Wakings"},{v:ns.avgSettle!=null?`${ns.avgSettle}m`:"—",l:"Settling"}].map(x=>(
                            <div key={x.l} style={{ textAlign: "right" }}><div style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{x.v}</div><div style={{ fontFamily: font, fontSize: 9.5, color: "rgba(255,255,255,0.4)" }}>{x.l}</div></div>
                          ))}
                        </div>
                      </div>
                      <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 8 }} />
                      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 13 }}>🌿</span>
                        <span style={{ fontFamily: font, fontSize: 12, color: "rgba(255,255,255,0.5)", fontStyle: "italic", lineHeight: 1.55 }}>
                          {ns.avgWakes <= 1 ? "Night sleep is strong. Wakings are the main variable — watch for correlation with late naps." : `${ns.avgWakes} average wakings. Often tied to daytime sleep debt — more nap consistency tends to reduce night disruption.`}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}

        {/* Share — two buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Send text report to consultant messages */}
          <div
            onClick={!sharing && !shared ? handleShareWithConsultant : undefined}
            style={{ borderRadius:14, padding:"16px 18px", background:`linear-gradient(135deg, ${T.bark}, ${T.bark}dd)`, display:"flex", alignItems:"center", justifyContent:"space-between", cursor: sharing ? "default" : "pointer", opacity: sharing ? 0.7 : 1 }}>
            <div>
              <div style={{ fontFamily:font, fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.9)", marginBottom:2 }}>
                {shared ? "Sent to consultant!" : sharing ? "Sending…" : "Share with consultant"}
              </div>
              <div style={{ fontFamily:font, fontSize:12, color:"rgba(255,255,255,0.45)" }}>
                {shared ? "Check your consultant messages" : `${range}-day summary · sends as message`}
              </div>
            </div>
            <span style={{ fontSize:22 }}>{shared ? "✅" : "📤"}</span>
          </div>

          {/* Print/save as PDF with charts */}
          <div
            onClick={handlePrintWithCharts}
            style={{ borderRadius:14, padding:"16px 18px", background:T.card, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
            <div>
              <div style={{ fontFamily:font, fontSize:14, fontWeight:700, color:T.text, marginBottom:2 }}>Save as PDF with charts</div>
              <div style={{ fontFamily:font, fontSize:12, color:T.muted }}>Opens print dialog · includes all graphs</div>
            </div>
            <span style={{ fontSize:22 }}>📄</span>
          </div>
        </div>

        {/* Recent sessions — sleep + diapers interleaved */}
        {(() => {
          const fmtHm2 = h => { if (!h||h<=0) return "—"; const hrs=Math.floor(h),mins=Math.round((h-hrs)*60); return mins>0?`${hrs}h ${mins}m`:`${hrs}h`; };
          const recentEntries = logs
            .filter(l => l.type === "sleep_session" || l.type === "diaper" || l.type === "night_waking" || l.type === "feed" || l.type === "solids")
            .sort((a, b) => new Date(b.ts) - new Date(a.ts))
            .slice(0, 20);
          return (
            <Card>
              <SectionLabel>Recent Sessions</SectionLabel>
              {recentEntries.length === 0 && (
                <p style={{ fontSize:13, color:T.muted, textAlign:"center", padding:"12px 0", fontFamily:font }}>No sessions logged yet</p>
              )}
              {recentEntries.map((s, i, arr) => {
                const isSleep  = s.type === "sleep_session";
                const isDiaper = s.type === "diaper";
                const isWaking = s.type === "night_waking";
                const isFeed   = s.type === "feed";
                const isSolids = s.type === "solids";
                const durH = isSleep && s.end_ts ? Math.max(0,(new Date(s.end_ts)-new Date(s.ts))/3600000) : null;
                const settle = isSleep && s.fall_asleep_secs != null ? Math.round(s.fall_asleep_secs/60) : null;
                const wakeTimeStr = isSleep && s.end_ts
                  ? new Date(s.end_ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                  : null;
                const icon = isSleep
                  ? (s.session_type === "night" ? "🌙" : "☀️")
                  : isDiaper ? (s.sub_type === "dirty" ? "💩" : "💦")
                  : isWaking ? "🌛"
                  : isFeed   ? (s.mode === "nursing" ? "🤱" : s.mode === "pump" ? "🫙" : "🍼")
                  : "🥣";
                const label = isSleep  ? (s.session_type === "night" ? "Night sleep" : "Nap")
                            : isDiaper ? (s.sub_type === "dirty" ? "Dirty diaper" : s.sub_type === "both" ? "Wet + Dirty" : "Wet diaper")
                            : isWaking ? "Night waking"
                            : isFeed   ? (s.mode === "nursing" ? `Nursing${s.side ? ` · ${s.side}` : ""}` : s.mode === "pump" ? `Pump${s.amount ? ` · ${s.amount}oz` : ""}` : `Bottle · ${s.amount || "—"}oz`)
                            : `Solids${s.food ? ` · ${s.food}` : ""}`;
                const sub = isSleep
                  ? [durH != null ? fmtHm2(durH) : (s.end_ts ? null : "in progress"), settle != null ? `settled in ${settle}m` : null, s.mood ? MOODS.find(m=>m.id===s.mood)?.emoji ?? "" : null].filter(Boolean).join(" · ")
                  : isWaking ? [s.duration ? `${s.duration}m awake` : null, s.description || null].filter(Boolean).join(" · ")
                  : isSolids && s.reaction ? s.reaction
                  : "";
                const canEdit = isSleep || isDiaper || isWaking;
                return (
                  <div key={s.id} style={{ padding:"12px 0", borderBottom: i<arr.length-1?`1px solid ${T.border}`:"none", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:13 }}>{icon}</span>
                        <span style={{ fontFamily:font, fontSize:13, fontWeight:600, color:T.text }}>{label}</span>
                        <span style={{ fontFamily:font, fontSize:11.5, color:T.muted }}>
                          {fmtDateTime(s.ts)}{isSleep && wakeTimeStr ? ` – ${wakeTimeStr}` : ""}
                        </span>
                      </div>
                      {sub ? <div style={{ fontFamily:font, fontSize:11.5, color:T.muted }}>{sub}</div> : null}
                    </div>
                    {onPatch && canEdit && <button onClick={() => setEditingLog(s)} style={{ background:T.faint, border:`1px solid ${T.border}`, color:T.muted, fontSize:11.5, cursor:"pointer", padding:"5px 10px", borderRadius:8, fontFamily:font, flexShrink:0, marginLeft:8 }}>Edit</button>}
                  </div>
                );
              })}
            </Card>
          );
        })()}

      </>)}
      {editingLog && <EditLogModal log={editingLog} onSave={onPatch} onDelete={onDelete} onClose={() => setEditingLog(null)} />}
    </div>
  );
}
