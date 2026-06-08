// src/modules/library/InAppPDFViewer.jsx
// In-app PDF viewer. Renders PDFs inside the app rather than opening a new tab.
// - allowDownload=true  → parent-facing: shows a download/print button
// - allowDownload=false → consultant-facing: no download affordance, no toolbar
import { useState } from "react";
import { useT, font, serif } from "../../core/shared.jsx";

export function InAppPDFViewer({ url, title, emoji, color, onClose, allowDownload = false }) {
  const T = useT();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Append #toolbar=0&navpanes=0 to suppress Chrome's built-in PDF toolbar.
  // Works in Chrome/Edge. Firefox and Safari ignore these params but still
  // render in-frame — the download button in our header still works there.
  const viewerUrl = url.includes("#") ? url : `${url}#toolbar=0&navpanes=0&scrollbar=0`;

  const accentColor = color || "#5C7A5E";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", flexDirection: "column",
      background: "#1a1a1a",
    }}>
      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(160deg, #2D4A35, #3A3018)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 10,
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.12)", border: "none",
          borderRadius: 8, padding: "6px 12px",
          color: "rgba(255,255,255,0.85)", fontFamily: font, fontSize: 13,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          flexShrink: 0,
        }}>
          ‹ Back
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {emoji && <span style={{ fontSize: 15 }}>{emoji}</span>}
            <div style={{
              fontFamily: font, fontSize: 14, fontWeight: 600,
              color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{title}</div>
          </div>
        </div>

        {/* Download / print — parents only */}
        {allowDownload && (
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: `${accentColor}cc`,
              border: "none", borderRadius: 8, padding: "6px 12px",
              color: "#fff", fontFamily: font, fontSize: 12, fontWeight: 600,
              cursor: "pointer", textDecoration: "none",
              display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            }}
          >
            ↓ Save
          </a>
        )}
      </div>

      {/* ── PDF Frame ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {/* Loading state */}
        {loading && !error && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "#f5f0eb", gap: 12,
          }}>
            <div style={{ fontSize: 32 }}>{emoji || "📄"}</div>
            <div style={{ fontFamily: font, fontSize: 14, color: "#5C7A5E", fontWeight: 600 }}>
              Loading…
            </div>
            <div style={{ fontFamily: font, fontSize: 12, color: "#999" }}>
              {title}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "#f5f0eb", gap: 12, padding: 24, textAlign: "center",
          }}>
            <div style={{ fontSize: 32 }}>⚠️</div>
            <div style={{ fontFamily: serif, fontSize: 16, color: "#2D4A35" }}>
              Couldn't load this PDF
            </div>
            <div style={{ fontFamily: font, fontSize: 12, color: "#999", lineHeight: 1.6 }}>
              This can happen on some browsers or in low-connectivity situations.
            </div>
            {allowDownload && (
              <a href={url} target="_blank" rel="noopener noreferrer" style={{
                display: "inline-block", marginTop: 8,
                background: "#2D4A35", color: "#fff",
                padding: "10px 20px", borderRadius: 10,
                fontFamily: font, fontSize: 13, fontWeight: 600,
                textDecoration: "none",
              }}>
                Open in browser →
              </a>
            )}
          </div>
        )}

        {/* The actual PDF iframe */}
        <iframe
          key={url}
          src={viewerUrl}
          title={title}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          style={{
            width: "100%", height: "100%",
            border: "none",
            display: error ? "none" : "block",
            // Prevent the iframe content from being user-selectable outside itself
            userSelect: "none",
          }}
          // sandbox allows scripts (needed for PDF.js in some browsers) but
          // disables top-level navigation so links can't break out of the app
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
}
