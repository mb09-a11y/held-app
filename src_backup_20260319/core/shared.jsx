import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark:  { bg:"#0f1218", bg2:"#131922", card:"rgba(255,255,255,0.035)", card2:"rgba(255,255,255,0.07)", border:"rgba(255,255,255,0.09)", faint:"rgba(255,255,255,0.05)", text:"rgba(255,255,255,0.85)", muted:"rgba(255,255,255,0.4)", subText:"rgba(255,255,255,0.22)", headingText:"rgba(255,255,255,0.92)", inputBg:"rgba(255,255,255,0.06)", teal:"#7B9EA8", sage:"#7BAA8A", warm:"#AA9B7B", rose:"#A87B8A", purple:"#8A7BAA", mauve:"#A8907B", sky:"#7B8FAA", amber:"#A89B5A", gradientBg:"linear-gradient(155deg,#0f1218 0%,#131922 55%,#0f1218 100%)", shadow:"0 4px 24px rgba(0,0,0,0.4)", overlayBg:"rgba(0,0,0,0.88)", modalBg:"#1a2030", panelBg:"#151c28", panelOverlay:"rgba(0,0,0,0.7)", notesBg:"rgba(255,255,255,0.04)" },
  light: { bg:"#FAF7F2", bg2:"#F4EFE6", card:"rgba(255,255,255,0.8)", card2:"rgba(255,255,255,0.95)", border:"rgba(196,168,130,0.32)", faint:"rgba(196,168,130,0.14)", text:"#2C2420", muted:"rgba(44,36,32,0.45)", subText:"rgba(44,36,32,0.35)", headingText:"#2C2420", inputBg:"rgba(255,255,255,0.95)", teal:"#5A8A96", sage:"#6A9A74", warm:"#9A8A6A", rose:"#9A6A74", purple:"#7A6A9A", mauve:"#9A7A6A", sky:"#6A7A9A", amber:"#9A8A3A", gradientBg:"linear-gradient(155deg,#FAF7F2 0%,#F0E8DA 50%,#FAF7F2 100%)", shadow:"0 4px 28px rgba(180,150,110,0.18)", overlayBg:"rgba(250,247,242,0.94)", modalBg:"#ffffff", panelBg:"#f8f4ee", panelOverlay:"rgba(250,247,242,0.85)", notesBg:"rgba(196,168,130,0.08)" },
};

const ThemeCtx = createContext(THEMES.dark);
const useT = () => useContext(ThemeCtx);
const AppCtx = createContext({});
const useApp = () => useContext(AppCtx);

const font = "'DM Sans',sans-serif", serif = "'DM Serif Display',serif", mono = "'DM Mono',monospace";

// ─── STORAGE ──────────────────────────────────────────────────────────────────
function useStorage(key, def) {
  const [val, setVal] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; } });
  const set = useCallback(v => setVal(prev => { const next = typeof v === "function" ? v(prev) : v; try { localStorage.setItem(key, JSON.stringify(next)); } catch (_err) {} return next; }), [key]);
  return [val, set];
}

function genId() { return Math.random().toString(36).slice(2, 10); }
function now() { return new Date().toISOString(); }
function nowStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── THEME HELPERS ────────────────────────────────────────────────────────────
function useThemeMode() {
  const [themeMode, setThemeMode] = useStorage("rcc_theme", "dark");
  const mode = themeMode === "light" ? "light" : "dark";
  const toggleTheme = () => setThemeMode(m => (m === "dark" ? "light" : "dark"));
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
    <div
      onClick={onClick}
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "16px 18px",
        boxShadow: T.shadow,
        ...(onClick ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, color, style, disabled }) {
  const T = useT();
  const bg = color || T.teal;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        background: disabled ? T.faint : bg,
        color: disabled ? T.muted : "#fff",
        border: "none", borderRadius: 10,
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
        <div style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, letterSpacing: ".07em",
          textTransform: "uppercase", marginBottom: 6, fontFamily: font }}>
          {label}{required && <span style={{ color: T.rose, marginLeft: 4 }}>*</span>}
        </div>
      )}
      <input type={type} value={value} placeholder={placeholder || ""}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: "100%", padding: "11px 13px", borderRadius: 10, fontFamily: font,
          fontSize: 13.5, background: T.inputBg, color: T.text, outline: "none",
          boxSizing: "border-box",
          border: `1.5px solid ${focused ? T.teal : T.border}`, transition: "border .2s" }} />
    </div>
  );
}

function ThemeToggle() {
  const { themeToggle, themeMode } = useContext(AppCtx);
  return (
    <button onClick={themeToggle}
      style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", opacity: 0.5 }}>
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
