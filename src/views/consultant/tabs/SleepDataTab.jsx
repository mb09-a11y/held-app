// views/consultant/tabs/SleepDataTab.jsx
import { useState } from "react";
import { useT, font, serif } from "../../../core/shared.jsx";
import { useSleepStats, usePlans } from "../data/consultantStore.js";
import InsightCard from "../shared/InsightCard.jsx";

const RANGES = ["7d", "14d", "30d"];

// Simple bar chart component
function BarChart({ data, title }) {
  const T = useT();
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ background: T.card, borderRadius: 18, padding: "14px 16px", margin: "0 18px 10px", boxShadow: T.shadow }}>
      <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, marginBottom: 12, fontFamily: font }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64, marginBottom: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
            <div style={{
              width: "100%",
              height: `${Math.round((d.value / max) * 100)}%`,
              minHeight: 4,
              borderRadius: "4px 4px 0 0",
              background: d.flag ? "#D4AE72" : T.teal,
              transition: "height 0.3s",
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
      </div>
    </div>
  );
}

// SVG line chart
function LineChart({ lines, height = 52 }) {
  const T = useT();
  const w = 300;
  const pts = n => lines[0]?.points?.length || n;
  const toX = i => (i / (pts(7) - 1)) * w;
  const toY = (v, max) => height - (v / max) * (height - 4) - 2;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", height, overflow: "visible" }}>
      {lines.map((line, li) => {
        const max = Math.max(...line.points, 1);
        const pts = line.points.map((v, i) => `${toX(i)},${toY(v, max)}`).join(" ");
        return (
          <g key={li}>
            <polyline
              points={pts}
              fill="none"
              stroke={line.color}
              strokeWidth={line.dashed ? 1.5 : 2}
              strokeDasharray={line.dashed ? "4,3" : undefined}
            />
            {!line.dashed && line.points.map((v, i) => (
              <circle key={i} cx={toX(i)} cy={toY(v, max)} r={3} fill={line.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default function SleepDataTab({ activeChild }) {
  const T = useT();
  const [range, setRange] = useState("7d");
  const [patternDismissed, setPatternDismissed] = useState(false);
  const stats = useSleepStats(activeChild?.id);
  const { plans, updatePlan } = usePlans();
  const plan = plans[activeChild?.planId];

  const barData = [
    { label: "Sat", value: 10.2, flag: false },
    { label: "Sun", value: 10.8, flag: false },
    { label: "Mon", value: 9.8,  flag: false },
    { label: "Tue", value: 9.5,  flag: false },
    { label: "Wed", value: 9.2,  flag: false },
    { label: "Thu", value: 9.0,  flag: false },
    { label: "Fri", value: 3.5,  flag: true  },
  ];

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
            { num: stats.avgSettlingStr || "28m",  lbl: "Avg Settling", trend: isAlert ? "↑ high" : "↓ 10m", pos: !isAlert },
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
            { num: isAlert ? "42m"  : "10m",  lbl: "Avg Settling", color: isAlert ? "#C08A3A" : T.teal },
            { num: isAlert ? "2.8"  : "0.4",  lbl: "Night Wakings", color: isAlert ? "#C0543A" : T.teal },
            { num: "1",                         lbl: "Naps/Day",     color: T.teal },
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

      {/* Per-nap breakdown */}
      <div style={{ padding: "4px 18px 8px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
        Per-Nap Breakdown
      </div>
      <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: font }}>Nap 1</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            {[
              { num: isAlert ? "1h 52m" : "1h 17m", lbl: "Avg" },
              { num: "4h 50m", lbl: "Wake Win." },
              { num: isAlert ? "28m" : "5m", lbl: "Settling" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "right" }}>
                <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: isAlert && i !== 1 ? "#C08A3A" : T.teal }}>{s.num}</div>
                <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
        <LineChart lines={[
          { points: [28, 26, 30, 24, 20, 18, 22], color: T.teal,   dashed: false },
          { points: [40, 38, 42, 44, 46, 48, 46], color: "#D4AE72", dashed: true },
          { points: [8,  9,  10, 8,  11, 9,  10], color: "#C4D2C2", dashed: true },
        ]} />
        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          {[
            { color: T.teal,    label: "Duration", dashed: false },
            { color: "#D4AE72", label: "Settling", dashed: true },
            { color: "#C4D2C2", label: "Wake Win.", dashed: true },
          ].map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.muted, fontFamily: font }}>
              <div style={{ width: 16, height: 2, background: l.color, borderTop: l.dashed ? `2px dashed ${l.color}` : "none" }} />
              {l.label}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "flex-start", paddingTop: 8, borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.muted, fontFamily: font, lineHeight: 1.5 }}>
          <span style={{ fontSize: 14 }}>{isAlert ? "⚠️" : "🌿"}</span>
          <span>{isAlert ? "Nap trending long. Correlates with night wakings. Cap at 90 min." : "Nap 1 looking good. A consistent first nap anchors the rest of the day."}</span>
        </div>
      </div>

      {/* Night card */}
      <div style={{ margin: "0 18px 10px", background: "#2D4A35", borderRadius: 18, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "white", fontFamily: font }}>Night</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            {[
              { num: isAlert ? "8h 12m" : "10h 18m", lbl: "Avg" },
              { num: isAlert ? "2.8" : "0.5", lbl: "Wakings" },
              { num: isAlert ? "42m" : "15m", lbl: "Settling" },
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
          <span>{isAlert ? "Night wakings are the main variable — watch for correlation with late or long naps." : "Night sleep is strong. Wakings are minimal — nervous system consolidating well."}</span>
        </div>
      </div>

      {/* Raw sessions log */}
      <div style={{ padding: "6px 18px 8px", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, fontWeight: 600, fontFamily: font }}>
        Recent Sessions
      </div>
      <div style={{ margin: "0 18px 10px", background: T.card, borderRadius: 18, padding: "14px 16px", boxShadow: T.shadow }}>
        {(stats.sessions || []).slice(0, 7).map((s, i) => (
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
        <div style={{ textAlign: "center", paddingTop: 10, fontSize: 12, color: T.teal, cursor: "pointer", fontWeight: 500, fontFamily: font }}>
          View all 30 days →
        </div>
      </div>
    </div>
  );
}
