import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
// RCC earth palette — moss, terracotta, sand, bark-dark
// Replaces the old teal/dark system. All accent references updated:
//   T.teal   → now maps to moss green (#5C7A5E light / #7BAA8A dark)
//   T.warm   → terracotta (#B8924A)
//   T.sand   → sand/cream tones
//   T.bark   → deep forest green (#2D4A35)

const THEMES = {
  dark: {
    bg:           "#141414",          // near-black, neutral
    bg2:          "#1C1C1E",          // iOS-style dark card bg
    card:         "#222222",
    card2:        "#2A2A2A",
    border:       "rgba(255,255,255,0.11)",
    faint:        "rgba(255,255,255,0.05)",
    text:         "rgba(255,255,255,0.88)",
    muted:        "rgba(255,255,255,0.4)",
    subText:      "rgba(255,255,255,0.22)",
    headingText:  "rgba(255,255,255,0.92)",
    inputBg:      "rgba(255,255,255,0.07)",
    // Brand accents
    teal:         "#7BAA8A",          // moss green (primary accent)
    sage:         "#8A9E8B",          // sage (secondary)
    warm:         "#a8896e",          // muted warm, darkened for dark mode
    bark:         "#364e48",          // muted slate-green, darkened for dark mode
    sand:         "#3A3328",          // sand (dark-mode adapted)
    rose:         "#A87B8A",
    purple:       "#8A7BAA",
    sky:          "#7B8FAA",
    amber:        "#B8924A",
    gold:         "#9a7a5e",
    // Gradients & shadows
    gradientBg:   "linear-gradient(155deg,#111714 0%,#181E1A 55%,#111714 100%)",
    shadow:       "0 4px 24px rgba(0,0,0,0.45)",
    overlayBg:    "rgba(0,0,0,0.88)",
    modalBg:      "#1A2220",
    panelBg:      "#151D17",
    panelOverlay: "rgba(0,0,0,0.7)",
    notesBg:      "rgba(255,255,255,0.04)",
    // Invite co-caregiver highlight
    inviteHighlight: "rgba(123,170,138,0.12)",
    inviteBorder:    "rgba(123,170,138,0.35)",
  },
  light: {
    bg:           "#FDFAF6",          // warm white
    bg2:          "#F4EFE6",          // cream
    card:         "rgba(255,255,255,0.85)",
    card2:        "rgba(255,255,255,0.97)",
    border:       "rgba(184,146,74,0.22)",
    faint:        "rgba(184,146,74,0.08)",
    text:         "#3A2E28",          // bark brown
    muted:        "rgba(58,46,40,0.45)",
    subText:      "rgba(58,46,40,0.32)",
    headingText:  "#2D4A35",          // forest green for headings
    inputBg:      "#FFFFFF",
    // Brand accents
    teal:         "#5C7A5E",          // moss green (primary accent)
    sage:         "#8A9E8B",          // sage
    warm:         "#cbb096",          // muted warm (SOS + help elements)
    bark:         "#4A6860",          // muted slate-green (hero cards)
    sand:         "#E8DDD0",          // sand
    rose:         "#9A6A74",
    purple:       "#7A6A9A",
    sky:          "#6A7A9A",
    amber:        "#B8924A",
    gold:         "#c4a882",
    // Gradients & shadows
    gradientBg:   "linear-gradient(155deg,#FDFAF6 0%,#F0E8DA 50%,#FDFAF6 100%)",
    shadow:       "0 4px 28px rgba(45,74,53,0.12)",
    overlayBg:    "rgba(253,250,246,0.94)",
    modalBg:      "#ffffff",
    panelBg:      "#F8F4EE",
    panelOverlay: "rgba(253,250,246,0.88)",
    notesBg:      "rgba(184,146,74,0.07)",
    // Invite co-caregiver highlight
    inviteHighlight: "rgba(92,122,94,0.08)",
    inviteBorder:    "rgba(92,122,94,0.3)",
  },
};

const ThemeCtx = createContext(THEMES.dark);
const useT = () => useContext(ThemeCtx);
const AppCtx = createContext({});
const useApp = () => useContext(AppCtx);

// RCC typography — Cormorant Garamond for display, DM Sans for UI
const font   = "'DM Sans', sans-serif";
const serif  = "'Cormorant Garamond', 'Cormorant', Georgia, serif";
const mono   = "'DM Mono', monospace";

// ─── STORAGE ──────────────────────────────────────────────────────────────────
function useStorage(key, def) {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : def;
    } catch { return def; }
  });
  const set = useCallback(v => setVal(prev => {
    const next = typeof v === "function" ? v(prev) : v;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
    return next;
  }), [key]);
  return [val, set];
}

function genId() { return Math.random().toString(36).slice(2, 10); }
function now()   { return new Date().toISOString(); }
function nowStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// ─── THEME HELPERS ────────────────────────────────────────────────────────────
function useThemeMode() {
  const [themeMode, setThemeMode] = useStorage("rcc_theme", "dark");
  const mode = themeMode === "light" ? "light" : "dark";
  const toggleTheme = () => setThemeMode(m => m === "dark" ? "light" : "dark");
  return { themeMode: mode, toggleTheme };
}

function ThemeProvider({ mode, children }) {
  const T = THEMES[mode] || THEMES.dark;
  return <ThemeCtx.Provider value={T}>{children}</ThemeCtx.Provider>;
}

// ─── SHARED UI PRIMITIVES ─────────────────────────────────────────────────────
function Card({ children, style, onClick }) {
  const T = useT();
  return (
    <div onClick={onClick} style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      padding: "16px 18px",
      boxShadow: T.shadow,
      ...(onClick ? { cursor: "pointer" } : {}),
      ...style,
    }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, color, style, disabled }) {
  const T = useT();
  const bg = color || T.teal;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? T.faint : bg,
      color: disabled ? T.muted : "#fff",
      border: "none", borderRadius: 12,
      padding: "11px 16px", width: "100%",
      fontFamily: font, fontSize: 13.5, fontWeight: 600,
      cursor: disabled ? "default" : "pointer",
      transition: "all .2s",
      ...style,
    }}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", required, placeholder }) {
  const T = useT();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{
          fontSize: 11.5, fontWeight: 700, color: T.muted,
          letterSpacing: ".07em", textTransform: "uppercase",
          marginBottom: 6, fontFamily: font,
        }}>
          {label}{required && <span style={{ color: T.rose, marginLeft: 4 }}>*</span>}
        </div>
      )}
      <input type={type} value={value} placeholder={placeholder || ""}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "11px 13px", borderRadius: 12,
          fontFamily: font, fontSize: 13.5,
          background: T.inputBg, color: T.text,
          outline: "none", boxSizing: "border-box",
          border: `1.5px solid ${focused ? T.teal : T.border}`,
          transition: "border .2s",
        }}
      />
    </div>
  );
}

function ThemeToggle() {
  const { themeToggle, themeMode } = useContext(AppCtx);
  return (
    <button onClick={themeToggle} style={{
      background: "none", border: "none",
      fontSize: 18, cursor: "pointer", opacity: 0.55,
    }}>
      {themeMode === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

export {
  THEMES,
  ThemeCtx,
  useT,
  AppCtx,
  useApp,
  font,
  serif,
  mono,
  useStorage,
  genId,
  now,
  nowStr,
  useThemeMode,
  ThemeProvider,
  Card,
  Btn,
  Input,
  ThemeToggle,
};
