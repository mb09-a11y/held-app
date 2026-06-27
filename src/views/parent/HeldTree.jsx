import { useEffect, useRef, useMemo } from "react";
import { useT, useApp } from "../../core/shared.jsx";

/**
 * HeldTree — Visual Regulation Tracker
 * ─────────────────────────────────────────────────────────────────────────────
 * Props:
 *   userWeekCount    {number}  weeks active (drives which base image shows)
 *   totalNsLogs      {number}  total checkin count (drives root/trunk growth)
 *   ventralPoints    {number}  ventral score (drives root spread width)
 *   latestNsState    {string}  'Regulated'|'Fight'|'Flight'|'Freeze'|'Shutdown'
 *
 * Supabase wiring (in your Insights screen):
 *   const { data: profile } = await supabase
 *     .from('profiles')
 *     .select('week_count, total_ns_logs, ventral_points, latest_ns_state')
 *     .eq('id', user.id)
 *     .single()
 *
 *   <HeldTree
 *     userWeekCount={profile.week_count}
 *     totalNsLogs={profile.total_ns_logs}
 *     ventralPoints={profile.ventral_points}
 *     latestNsState={profile.latest_ns_state}
 *   />
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Which base image shows by week ───────────────────────────────────────────
const FRAMES = [
  { minWeek: 0,  src: "/tree/frame-1-roots.png"    },
  { minWeek: 4,  src: "/tree/frame-2-trunk.png"    },
  { minWeek: 8,  src: "/tree/frame-3-branches.png" },
  { minWeek: 13, src: "/tree/frame-4-budding.png"  },
  { minWeek: 17, src: "/tree/frame-5-leaves.png"   },
  { minWeek: 22, src: "/tree/frame-6-full.png"     },
];

function getFrame(week) {
  let frame = FRAMES[0];
  for (const f of FRAMES) {
    if (week >= f.minWeek) frame = f;
  }
  return frame.src;
}

// ── CSS filter by NS state ────────────────────────────────────────────────────
const STATE_STYLES = {
  Regulated: { filter: "none",                                       glow: true  },
  Fight:     { filter: "sepia(0.55) hue-rotate(-30deg) saturate(1.4)", glow: false },
  Flight:    { filter: "sepia(0.45) hue-rotate(25deg) saturate(1.3)", glow: false },
  Freeze:    { filter: "saturate(0.25) brightness(0.88)",            glow: false },
  Shutdown:  { filter: "saturate(0.15) brightness(0.82)",            glow: false },
};

// ── Canvas root painter ───────────────────────────────────────────────────────
// Called on every re-render. totalNsLogs drives depth, ventralPoints drives spread.
function paintCanvas(canvas, totalNsLogs, ventralPoints, weekCount) {
  const ctx  = canvas.getContext("2d");
  const W    = canvas.width;
  const H    = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (totalNsLogs === 0) return;

  const depthT    = Math.min(totalNsLogs / 120, 1);
  const spreadT   = Math.min(ventralPoints / 200, 1);
  const extraStr  = Math.max(0, weekCount - 22) * 0.025;
  const groundY   = H * 0.63;
  const maxDepth  = H * (0.36 + depthT * 0.22 + extraStr);

  // Seeded rand — same roots every render for same data
  function makeRand(s) {
    let seed = s;
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  function drawRoot(rand, x0, y0, angle, length, width, depth, maxD) {
    if (depth > maxD || length < 3 || y0 > groundY + maxDepth) return;
    const a    = angle + (rand() - 0.5) * 0.36;
    const bend = (rand() - 0.5) * 0.16;
    const mx   = x0 + Math.cos(a + bend) * length * 0.44;
    const my   = y0 + Math.sin(a + bend) * length * 0.44;
    const ex   = x0 + Math.cos(a) * length;
    const ey   = y0 + Math.sin(a) * length;
    if (ey > groundY + maxDepth) return;

    const endW  = Math.max(0.28, width * 0.52);
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const m0 = 1 - t0, m1 = 1 - t1;
      const bx0 = m0*m0*x0 + 2*m0*t0*mx + t0*t0*ex;
      const by0 = m0*m0*y0 + 2*m0*t0*my + t0*t0*ey;
      const bx1 = m1*m1*x0 + 2*m1*t1*mx + t1*t1*ex;
      const by1 = m1*m1*y0 + 2*m1*t1*my + t1*t1*ey;
      const df  = depth / maxD;
      const al  = Math.max(0.07, 0.8 - df * 0.18);
      const sh  = Math.floor(38 + df * 52);
      ctx.beginPath();
      ctx.moveTo(bx0, by0);
      ctx.lineTo(bx1, by1);
      ctx.strokeStyle = `rgba(${sh},${Math.floor(sh*0.54)},${Math.floor(sh*0.2)},${al})`;
      ctx.lineWidth   = Math.max(0.28, lerp(width, endW, t0));
      ctx.lineCap     = "round";
      ctx.stroke();
    }

    const nk  = depth === 0 ? 3 : rand() > 0.3 ? 2 : 1;
    const sp  = 0.54 - depth * 0.05;
    for (let b = 0; b < nk; b++) {
      const off = nk === 1
        ? (rand() - 0.5) * 0.4
        : ((b / (nk - 1)) - 0.5) * sp * 2 + (rand() - 0.5) * 0.1;
      drawRoot(rand, ex, ey, a + off, length * (0.54 + rand() * 0.16), endW, depth + 1, maxD);
    }
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  const cx       = W / 2;
  const maxD     = totalNsLogs < 10 ? 1 : totalNsLogs < 25 ? 2 : totalNsLogs < 50 ? 3 : totalNsLogs < 90 ? 4 : 5;
  const rootLen  = 14 + depthT * 65;
  const rootW    = 2.2 + depthT * 9.5;

  const ROOT_DEFS = [
    { a: Math.PI/2,         start: 0,  ox: 0   },
    { a: Math.PI/2 + 0.38,  start: 3,  ox: 0   },
    { a: Math.PI/2 - 0.38,  start: 3,  ox: 0   },
    { a: Math.PI/2 + 0.70,  start: 8,  ox: 20  },
    { a: Math.PI/2 - 0.70,  start: 8,  ox: -20 },
    { a: Math.PI/2 + 1.00,  start: 18, ox: 38  },
    { a: Math.PI/2 - 1.00,  start: 18, ox: -38 },
    { a: Math.PI/2 + 1.25,  start: 35, ox: 55  },
    { a: Math.PI/2 - 1.25,  start: 35, ox: -55 },
    { a: Math.PI/2 + 1.48,  start: 60, ox: 70  },
    { a: Math.PI/2 - 1.48,  start: 60, ox: -70 },
    { a: Math.PI/2 + 1.62,  start: 90, ox: 84  },
    { a: Math.PI/2 - 1.62,  start: 90, ox: -84 },
  ];

  for (const { a, start, ox } of ROOT_DEFS) {
    if (totalNsLogs < start) continue;
    const ageT   = Math.min((totalNsLogs - start) / 30, 1);
    const originX = cx + ox * Math.min(spreadT * 1.2, 1);
    const rand   = makeRand(Math.round(a * 1000 + ox * 7 + 42));
    drawRoot(
      rand, originX, groundY + 8, a,
      rootLen * (0.34 + ageT * 0.66),
      rootW   * (0.34 + ageT * 0.66),
      0, maxD
    );
  }

  // Subtle warm deepening at trunk base
  const t = Math.min(totalNsLogs / 80, 1);
  if (t > 0.05) {
    const grad = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, W * 0.17 * t);
    grad.addColorStop(0, `rgba(38,18,4,${0.1 * t})`);
    grad.addColorStop(1, "rgba(38,18,4,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, groundY - 18, W, 36);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HeldTree({
  userWeekCount = 0,
  totalNsLogs   = 0,
  ventralPoints = 0,
  latestNsState = null,
}) {
  const T          = useT();
  const { themeMode } = useApp();
  const isDark     = themeMode === "dark";
  const canvasRef  = useRef(null);
  const frameSrc   = getFrame(userWeekCount);
  const stateStyle = STATE_STYLES[latestNsState] || STATE_STYLES.Regulated;
  const isFiltered = latestNsState && latestNsState !== "Regulated";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) paintCanvas(canvas, totalNsLogs, ventralPoints, userWeekCount);
  }, [totalNsLogs, ventralPoints, userWeekCount]);

  const phaseLabel = useMemo(() => {
    if (totalNsLogs === 0)   return "Log your first check-in to plant your first root";
    if (userWeekCount <= 3)  return "Roots spreading";
    if (userWeekCount <= 7)  return "Trunk rising";
    if (userWeekCount <= 12) return "Branches reaching";
    if (userWeekCount <= 16) return "Leaves opening";
    if (userWeekCount <= 21) return "Canopy filling";
    return "Deeply rooted";
  }, [userWeekCount, totalNsLogs]);

  const stateLabel = {
    Regulated: "Ventral state — your tree is glowing",
    Fight:     "Fight state — the leaves are turning",
    Flight:    "Flight state — yellow in the canopy",
    Freeze:    "Freeze state — the canopy is still",
    Shutdown:  "Shutdown state — the canopy is resting",
  }[latestNsState] || "";

  const stateLabelColor = {
    Regulated: "#2d6a2d",
    Fight:     "#8B2500",
    Flight:    "#a07000",
    Freeze:    "#4a5a5a",
    Shutdown:  "#5a5a6a",
  }[latestNsState] || "#8a9e8c";

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 480, margin: "0 auto", fontFamily: "Georgia, serif" }}>

      {/* ── Card container ── */}
      <div style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        background: isDark ? "linear-gradient(160deg, #1e1e1e 0%, #2a2520 100%)" : "linear-gradient(160deg, #f8f3e8 0%, #f0e8d5 100%)",
        boxShadow: stateStyle.glow
          ? "0 0 52px rgba(46,122,46,0.24), 0 4px 20px rgba(45,30,10,0.1)"
          : "0 4px 20px rgba(45,30,10,0.1)",
        transition: "box-shadow 1.4s ease",
      }}>

        {/* Glow pulse (Regulated only) */}
        {stateStyle.glow && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 20,
            background: "radial-gradient(ellipse 60% 48% at 50% 38%, rgba(46,122,46,0.22) 0%, transparent 62%)",
            animation: "heldglow 3s ease-in-out infinite",
            pointerEvents: "none", zIndex: 3,
          }} />
        )}

        {/* Base illustration */}
        <img
          key={frameSrc}
          src={frameSrc}
          alt="Your regulation tree"
          onLoad={() => {
            const c = canvasRef.current;
            if (c) paintCanvas(c, totalNsLogs, ventralPoints, userWeekCount);
          }}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            mixBlendMode: isDark ? "normal" : "multiply",
            filter: isFiltered ? stateStyle.filter : "none",
            transition: "filter 1.6s ease",
          }}
        />



        {/* Canvas growth layer */}
        <canvas
          ref={canvasRef}
          width={960}
          height={960}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            pointerEvents: "none",
            mixBlendMode: "multiply",
            zIndex: 2,
          }}
        />

        {/* Phase label */}
        <div style={{
          position: "absolute", bottom: 12, left: 0, right: 0,
          textAlign: "center", fontSize: 11,
          color: "rgba(80,55,25,0.48)",
          letterSpacing: "0.08em", textTransform: "uppercase",
          pointerEvents: "none", zIndex: 4,
        }}>
          {phaseLabel}
        </div>
      </div>

      {/* Stats */}
      <div className="tree-stats-row" style={{ display: "flex", gap: 10, marginTop: 12 }}>
        {[
          { label: "check-ins",  value: totalNsLogs   },
          { label: "leaves", value: ventralPoints },
          { label: "week",       value: userWeekCount },
        ].map(({ label, value }) => (
          <div key={label} style={{
            flex: 1, textAlign: "center",
            background: "rgba(92,122,94,0.06)",
            borderRadius: 12, padding: "10px 8px",
            border: "0.5px solid rgba(92,122,94,0.14)",
          }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#2D4A35" }}>{value}</div>
            <div style={{ fontSize: 11, color: "#8a9e8c", letterSpacing: "0.05em", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* NS state label */}
      {stateLabel && (
        <div style={{
          marginTop: 10, textAlign: "center",
          fontSize: 13, fontStyle: "italic",
          color: stateLabelColor,
          transition: "color 1s ease",
        }}>
          {stateLabel}
        </div>
      )}

      <style>{`
        @keyframes heldglow {
          0%, 100% { opacity: 0.55; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
