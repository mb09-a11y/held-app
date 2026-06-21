// src/modules/sleep/sleepUI.jsx
// Shared UI primitives used across all sleep sub-views.

import { useState } from "react";
import { useT } from "../../core/shared.jsx";
import { font, serif, C } from "./sleepHelpers.js";

export function Card({ children, style = {}, onClick }) {
  const T = useT();
  return (
    <div onClick={onClick} style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "16px 18px",
      ...(onClick ? { cursor: "pointer" } : {}), ...style,
    }}>
      {children}
    </div>
  );
}

export function Btn({ children, onClick, variant = "default", outline = false, size = "md", disabled = false, style = {} }) {
  const T = useT();
  const colorMap = {
    teal: C.teal, purple: C.purple, sage: C.sage,
    sky: C.sky, mauve: C.mauve, rose: C.rose, amber: C.amber,
    default: T.teal || C.teal,
  };
  const col = colorMap[variant] || colorMap.default;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        fontFamily: font, fontWeight: 600, border: "none", borderRadius: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.18s ease",
        fontSize: size === "sm" ? 12 : size === "lg" ? 15 : 13.5,
        padding: size === "sm" ? "7px 14px" : size === "lg" ? "14px 24px" : "10px 18px",
        ...(outline
          ? { background: hovered ? `${col}18` : "transparent", border: `1.5px solid ${col}55`, color: col }
          : { background: hovered ? col : `${col}dd`, color: "#fff", boxShadow: hovered ? `0 4px 16px ${col}55` : `0 2px 8px ${col}30` }),
        transform: hovered && !disabled ? "translateY(-1px)" : "none",
        ...style,
      }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

export function Pill({ label, active, color, onClick }) {
  const T = useT();
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20, fontSize: 12, fontFamily: font,
      fontWeight: active ? 700 : 400, cursor: "pointer", transition: "all 0.18s",
      border: `1.5px solid ${active ? color : T.border}`,
      background: active ? `${color}22` : "transparent",
      color: active ? color : T.muted,
    }}>
      {label}
    </button>
  );
}

export function Divider() {
  const T = useT();
  return <div style={{ height: 1, background: T.border, margin: "12px 0" }} />;
}

export function SectionLabel({ children }) {
  const T = useT();
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
      textTransform: "uppercase", color: T.muted, marginBottom: 10, fontFamily: font,
    }}>
      {children}
    </p>
  );
}

export function LogTile({ icon, label, sub, onClick, active, activeColor }) {
  const T = useT();
  const col = activeColor || C.teal;
  return (
    <button onClick={onClick} style={{
      padding: "12px 10px", borderRadius: 13, cursor: "pointer", textAlign: "center",
      border: `1.5px solid ${active ? col : T.border}`,
      background: active ? `${col}15` : T.faint,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      transition: "all 0.15s",
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? col : T.text, fontFamily: font }}>{label}</span>
      {sub && <span style={{ fontSize: 10, color: T.muted, fontFamily: font }}>{sub}</span>}
    </button>
  );
}

export function Toast({ message, icon, visible }) {
  const T = useT();
  return (
    <div style={{
      position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
      background: T.bark, color: "white", borderRadius: 24,
      padding: "10px 20px", display: "flex", alignItems: "center", gap: 8,
      fontSize: 13, fontFamily: font, fontWeight: 600, zIndex: 999,
      opacity: visible ? 1 : 0, pointerEvents: "none",
      transition: "opacity 0.3s",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    }}>
      <span>{icon}</span><span>{message}</span>
    </div>
  );
}

export function InputSheet({ title, fields, onConfirm, onCancel }) {
  const T = useT();
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map(f => [f.key, f.default ?? ""])));

  // A sheet can be a pure yes/no confirmation by passing a single field of
  // type "confirm" instead of normal input fields. Existing sheets (date,
  // time, select, text, number fields) are unaffected — this only changes
  // rendering when a field explicitly opts into type "confirm".
  const isConfirmOnly = fields.length === 1 && fields[0].type === "confirm";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      zIndex: 500, display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        background: T.bg2 || T.bg, borderRadius: "20px 20px 0 0",
        width: "100%", padding: "24px 20px 48px",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ fontFamily: serif, fontSize: 18, color: T.headingText, margin: 0 }}>{title}</h3>
          <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.muted }}>✕</button>
        </div>

        {isConfirmOnly ? (
          <>
            <p style={{ fontFamily: font, fontSize: 14.5, color: T.text, lineHeight: 1.55, margin: "0 0 22px" }}>
              {fields[0].message}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onCancel}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${T.border}`, background: "transparent", color: T.text, fontFamily: font, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={() => onConfirm(vals)}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: T.teal, color: "#fff", fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                Yes, update it
              </button>
            </div>
          </>
        ) : (
          <>
            {fields.map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5, fontFamily: font }}>
                  {f.label}
                </label>
                {f.type === "select" ? (
                  <select value={vals[f.key]} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.inputBg || T.faint, color: T.text, fontFamily: font, fontSize: 14, outline: "none" }}>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={vals[f.key]}
                    onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.inputBg || T.faint, color: T.text, fontFamily: font, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                )}
              </div>
            ))}
            <button onClick={() => onConfirm(vals)}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: T.teal, color: "#fff", fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
              Save →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub, icon, color }) {
  const T = useT();
  return (
    <Card style={{ borderLeft: `3px solid ${color}`, padding: "14px 16px" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: font }}>{label}</p>
          <p style={{ fontSize: 20, fontWeight: 800, margin: "3px 0 2px", color: T.headingText, fontFamily: font }}>{value}</p>
          {sub && <p style={{ fontSize: 10, color: T.muted, fontFamily: font }}>{sub}</p>}
        </div>
      </div>
    </Card>
  );
}
