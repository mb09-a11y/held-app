// views/consultant/tabs/SleepDataTab.jsx
import { useState } from "react";
import { useT, font, serif } from "../../../core/shared.jsx";
import { useSleepStats, usePlans } from "../data/consultantStore.js";
import InsightCard from "../shared/InsightCard.jsx";

const RANGES = ["7d", "14d", "30d"];

// Simple bar chart component with tap-to-reveal tooltip
function BarChart({ data, title }) {
  const T = useT();
  const [activeIdx, setActiveIdx] = useState(null);
  const max = Math.max(...data.map(d => d.value), 1);
  const fmtH = v => {
    const h = Math.floor(v), m = Math.round((v - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };
  return (
    <div style={{ background: T.card, borderRadius: 18, padding: "14px 16px", margin: "0 18px 10px", boxShadow: T.shadow }}>
      <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, marginBottom: 12, fontFamily: font }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64, marginBottom: 6 }}>
        {data.map((d, i) => (
          <div
            key={i}
            onClick={() => setActiveIdx(activeIdx === i ? null : i)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end", cursor: "pointer", position: "relative" }}
          >
            {activeIdx === i && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 2px)", left: "50%", transform: "translateX(-50%)",
                background: T.bark || "#2D4A35", color: "white", borderRadius: 8, padding: "4px 8px",
                fontSize: 11, fontFamily: font, whiteSpace: "nowrap", fontWeight: 600, zIndex: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              }}>
                {fmtH(d.value)}
                {d.napValue != null && <span style={{ fontWeight: 400, opacity: 0.75 }}> · {fmtH(d.napValue)} nap</span>}
              </div>
            )}
            <div style={{
              width: "100%",
              height: `${Math.round((d.value / max) * 100)}%`,
              minHeight: 4,
              borderRadius: "4px 4px 0 0",
              background: activeIdx === i ? (d.flag ? "#c8a050" : "#4a7a68") : (d.flag ? "#D4AE72" : T.teal),
              transition: "height 0.3s, background 0.15s",
            }} />
            <div style={{ fontSize: 9, color: T.muted, fontFamily: font }}>{d.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.muted, fontFamily: font }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.teal }} />On track
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.muted, fontFamily: font }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#D4AE72" }} />Below target
        </div>
        <div style={{ fontSize: 10, color: T.muted, fontFamily: font, marginLeft: "auto", fontStyle: "italic" }}>Tap bar for details</div>
      </div>
    </div>
  );
}

// SVG line chart with x-axis labels and tap-to-reveal tooltip
function LineChart({ lines, height = 52, xLabels = null }) {
  const T = useT();
  const [activeIdx, setActiveIdx] = useState(null);
  const w = 300;
  const n = lines[0]?.points?.length || 1;
  const toX = i => n <= 1 ? w / 2 : (i / (n - 1)) * w;
  const allVals = lines.flatMap(l => l.points);
  const globalMax = Math.max(...allVals, 1);
  const toY = v => height - (v / globalMax) * (height - 4) - 2;

  const fmtMin = v => {
    const h = Math.floor(v / 60), m = v % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const xAxisHeight = xLabels ? 14 : 0;
  const totalHeight = height + xAxisHeight;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${w} ${totalHeight}`} style={{ width: "100%", height: totalHeight, overflow: "visible" }}>
        {lines.map((line, li) => {
          const pts = line.points.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
          return (
            <g key={li}>
              <polyline points={pts} fill="none" stroke={line.color} strokeWidth={line.dashed ? 1.5 : 2} strokeDasharray={line.dashed ? "4,3" : undefined} />
              {!line.dashed && line.points.map((v, i) => (
                <circle
                  key={i}
                  cx={toX(i)} cy={toY(v)} r={activeIdx === i ? 5 : 3}
                  fill={activeIdx === i ? line.color : line.color}
                  stroke={activeIdx === i ? "white" : "none"}
                  strokeWidth={activeIdx === i ? 1.5 : 0}
                  style={{ cursor: "pointer", transition: "r 0.15s" }}
                  onClick={() => setActiveIdx(activeIdx === i ? null : i)}
                />
              ))}
            </g>
          );
        })}
        {/* x-axis labels */}
        {xLabels && xLabels.map((lbl, i) => (
          <text
            key={i}
            x={toX(i)} y={height + 11}
            textAnchor="middle"
            style={{ fontSize: 8, fill: T.muted, fontFamily: "system-ui, sans-serif" }}
          >{lbl}</text>
        ))}
        {/* tap targets — invisible wide hit areas over each x position */}
        {Array.from({ length: n }).map((_, i) => (
          <rect
            key={i}
            x={toX(i) - 18} y={0} width={36} height={height}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onClick={() => setActiveIdx(activeIdx === i ? null : i)}
          />
        ))}
      </svg>
      {/* Tooltip */}
      {activeIdx != null && (
        <div style={{
          position: "absolute",
          top: Math.max(0, toY(lines[0]?.points?.[activeIdx] ?? 0) - 36),
          left: `calc(${(toX(activeIdx) / w) * 100}% - 44px)`,
          background: T.bark || "#2D4A35", color: "white",
          borderRadius: 8, padding: "5px 9px", fontSize: 11, fontFamily: "system-ui",
          whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          {lines.map((line, li) => (
            <div key={li} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: line.color, flexShrink: 0 }} />
              <span style={{ fontWeight: li === 0 ? 600 : 400, opacity: li === 0 ? 1 : 0.75 }}>
                {line.label ? `${line.label}: ` : ""}{fmtMin(line.points[activeIdx] ?? 0)}
              </span>
            </div>
          ))}
          {xLabels?.[activeIdx] && <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>{xLabels[activeIdx]}</div>}
        </div>
      )}
    </div>
  );
}

export default function SleepDataTab({ family, activeChild }) {
  const T = useT();
  const [range, setRange] = useState("7d");
  const [patternDismissed, setPatternDismissed] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const rangeDays = range === "7d" ? 7 : range === "14d" ? 14 : 30;
  const familyTz = family?.timezone || null;
  const stats = useSleepStats(activeChild?.id, family?.id, rangeDays, familyTz);
  const { plans, updatePlan } = usePlans();
  const plan = plans[activeChild?.planId] || plans[activeChild?.id];

  // Build bar chart from real night sleep data
  const rangeCount = rangeDays;
  const barData = (() => {
    const nights = stats.nights || [];
    const allNaps = stats.naps || [];
    if (!nights.length) return [];
    // Build night hours per date
    const nightMap = {};
    for (const s of nights) {
      nightMap[s.date] = (nightMap[s.date] || 0) + (s.durationMin || 0) / 60;
    }
    // Build nap hours per date (match by formatted date string)
    const napMap = {};
    for (const s of allNaps) {
      napMap[s.date] = (napMap[s.date] || 0) + (s.durationMin || 0) / 60;
    }
    return Object.entries(nightMap)
      .slice(0, rangeCount)
      .reverse()
      .map(([date, value]) => ({
        label: date.split(",")[0],
        value: Math.round(value * 10) / 10,
        napValue: napMap[date] != null ? Math.round(napMap[date] * 10) / 10 : null,
        flag: value < 9,
      }));
  })();


  const isAlert = activeChild?.status === "urgent";

  return (
    <div>
      {/* Date range */}
      <div style={{ margin: "10px 18px 10px", display: "flex", background: T.bg2, borderRadius: 12, padding: 3 }}>
        {RANGES.map(r => (
          <button key={r} onClick={() => setRange(r)} style={{
            flex: 1, padding: "7px 0", borderRadius: 9, border: "none",
            background: range === r ? T.card : "transparent",
            color: range === r ? T.text : T.muted,
            fontSize: 12, fontWeight: 500, cursor: "pointer",
            boxShadow: range === r ? T.shadow : "none",
            fontFamily: font,
          }}>{r}</button>
        ))}
      </div>

      {/* Summary stats — mirrors parent Patterns exactly */}
      <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 18px", boxShadow: T.shadow }}>
        <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, marginBottom: 10, fontFamily: font }}>
          Sleep Patterns · {range} Avg
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
          {[
            { num: stats.avgNightStr || "10h 4m", lbl: "Avg Night",  trend: isAlert ? "↓ short" : "↑ solid", pos: !isAlert },
            { num: stats.avgNapStr   || "1h 52m", lbl: "Avg Naps",   trend: isAlert ? "↓ 0.4h long" : "✓ good", pos: !isAlert },
            { num: stats.avgSettlingStr || "—",  lbl: "Avg Settling", trend: isAlert ? "↑ high" : "✓ good", pos: !isAlert },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "6px 0", textAlign: "center",
              borderRight: i < 2 ? `1px solid ${T.border}` : "none",
            }}>
              <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: isAlert && i > 0 ? "#C08A3A" : T.teal, lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: T.muted, fontWeight: 600, marginTop: 2, fontFamily: font }}>{s.lbl}</div>
              <div style={{ fontSize: 9, color: s.pos ? T.teal : "#C08A3A", marginTop: 1, fontFamily: font }}>{s.trend}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: T.border, margin: "10px 0" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
          {[
            { num: stats.avgFeedsStr ?? "—",              lbl: "Feeds",         color: T.teal },
            { num: String(stats.avgNightWakes ?? "—"),   lbl: "Avg Wakings/Night", color: isAlert ? "#C0543A" : T.teal },
            { num: String(stats.avgNapCount   ?? "—"),   lbl: "Naps/Day",      color: T.teal },
          ].map((s, i) => (
            <div key={i} style={{ padding: "6px 0", textAlign: "center", borderRight: i < 2 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: T.muted, fontWeight: 600, marginTop: 2, fontFamily: font }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Co-Pilot insight between stats and charts */}
      {isAlert && !patternDismissed && (
        <InsightCard
          label="◎ Co-Pilot · Pattern detected"
          title="Long nap → more wakings. 4 of 4 times."
          body="On every day nap exceeded 2h, night wakings were ≥3. Shorter nap days averaged 1.2 wakings. Strong enough correlation to act on."
          actions={[
            { label: "Cap nap at 90 min", onClick: () => {
              if (plan) updatePlan(plan.id, { napCapMinutes: 90 });
              setPatternDismissed(true);
            }},
            { label: "Dismiss", onClick: () => setPatternDismissed(true) },
          ]}
        />
      )}

      {/* Daily sleep bar chart */}
      <BarChart data={barData} title="Daily Sleep · Hours" />

      {/* Per-nap breakdown — one card per slot */}
      <div style={{ padding: "4px 18px 8px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
        Per-Nap Breakdown
      </div>
      {(stats.napSlots || []).length === 0 && (
        <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow, fontSize: 12, color: T.muted, fontFamily: font }}>
          No nap data logged yet.
        </div>
      )}
      {(stats.napSlots || []).map((slot, idx) => (
        <div key={slot.label} style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: font }}>{slot.label}</div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              {[
                { num: slot.avgDurStr || "—", lbl: "Avg" },
                { num: "—", lbl: "Wake Win." },
                { num: slot.avgSettleStr || "—", lbl: "Settling" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: isAlert && slot.flaggedCount > 0 && i !== 1 ? "#C08A3A" : T.teal }}>{s.num}</div>
                  <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
          {slot.durSeries.length > 1 && (
            <>
              <LineChart
                lines={[
                  { points: slot.durSeries,    color: T.teal,    dashed: false, label: "Dur" },
                  { points: slot.settleSeries, color: "#D4AE72", dashed: true,  label: "Settle" },
                ]}
                xLabels={slot.xLabels || null}
              />
              <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                {[
                  { color: T.teal,    label: "Duration", dashed: false },
                  { color: "#D4AE72", label: "Settling",  dashed: true },
                ].map((l, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.muted, fontFamily: font }}>
                    <div style={{ width: 16, height: 2, background: l.color, borderTop: l.dashed ? `2px dashed ${l.color}` : "none" }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 7, alignItems: "flex-start", paddingTop: 8, borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.muted, fontFamily: font, lineHeight: 1.5 }}>
            <span style={{ fontSize: 14 }}>{isAlert && slot.flaggedCount > 0 ? "⚠️" : "🌿"}</span>
            <span>{
              isAlert && slot.flaggedCount > 0
                ? `${slot.label} trending long on ${slot.flaggedCount} day${slot.flaggedCount > 1 ? "s" : ""}. Correlates with night wakings.`
                : idx === 0
                  ? "A consistent first nap anchors the rest of the day."
                  : idx === 1
                    ? "Second nap is often the bridge — watch whether it affects bedtime mood."
                    : `${slot.label} is typically a buffer nap — keep it early enough not to push bedtime.`
            }</span>
          </div>
        </div>
      ))}

      {/* Night card */}
      <div style={{ margin: "0 18px 10px", background: "#2D4A35", borderRadius: 18, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "white", fontFamily: font }}>Night</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            {[
              { num: stats.avgNightStr || "—",    lbl: "Avg" },
              { num: String(stats.nights.filter(n => n.flag).length || 0), lbl: "Wakings" },
              { num: stats.avgSettlingStr || "—", lbl: "Settling" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "right" }}>
                <div style={{ fontFamily: serif, fontSize: 18, color: i === 1 && isAlert ? "#E8A87C" : "rgba(255,255,255,0.85)" }}>{s.num}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "10px 0" }} />
        <div style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, fontFamily: font }}>
          <span style={{ fontSize: 14 }}>🌿</span>
          <span>{isAlert ? "Night wakings are the main variable — watch for correlation with late or long naps." : stats.nights.length ? "Night sleep is strong. Wakings are minimal — nervous system consolidating well." : "No night sleep data logged yet."}</span>
        </div>
      </div>

      {/* Raw sessions log */}
      <div style={{ padding: "6px 18px 8px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font, display: "flex", alignItems: "center", gap: 6 }}>
        Recent Sessions
        {familyTz && (
          <span style={{ fontSize: 9, letterSpacing: "0.05em", color: T.muted, fontWeight: 400, textTransform: "none", background: T.faint || T.bg2, borderRadius: 6, padding: "1px 6px" }}>
            {familyTz.replace("America/", "").replace(/_/g, " ")} time
          </span>
        )}
      </div>
      <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
        {(stats.sessions || []).slice(0, showAllSessions ? undefined : 7).map((s, i) => (
          <div key={s.id} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "11px 0",
            borderBottom: i < stats.sessions.length - 1 ? `1px solid ${T.border}` : "none",
          }}>
            <div style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text, fontFamily: font }}>{s.date} · {s.time}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontFamily: font }}>
                {s.duration}{s.settling && s.settling !== "0m" ? ` · settled in ${s.settling}` : ""}
              </div>
            </div>
            {s.flag && (
              <div style={{
                fontSize: 10, color: "#C08A3A", background: "#FBF4E6",
                padding: "2px 7px", borderRadius: 20, flexShrink: 0, fontFamily: font,
              }}>⚠️ {s.flag}</div>
            )}
          </div>
        ))}
        <div onClick={() => setShowAllSessions(v => !v)} style={{ textAlign: "center", paddingTop: 10, fontSize: 12, color: T.teal, cursor: "pointer", fontWeight: 500, fontFamily: font }}>
          {showAllSessions ? "Show less ↑" : "View all 30 days →"}
        </div>
      </div>
    </div>
  );
}
