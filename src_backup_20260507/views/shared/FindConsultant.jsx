import { useState } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";

// ─── CONSULTANT DATA ──────────────────────────────────────────────────────────
// Update filterTags to control which filters each consultant appears under.
// Only Manu does Parenting coaching.
const CONSULTANTS = [
  {
    id: "manu",
    name: "Manu Brune",
    title: "Founder & Lead Coach",
    location: "Serving Families Everywhere",
    photo: "https://beyondbirthbasics.com/wp-content/uploads/2024/04/Headshot-Updated.jpg",
    specialties: ["Sleep Coaching Ages 0-17", "Special Needs", "Newborn", "Parenting Coaching", "Potty Training", "Postpartum", "Family Nervous Systems Coaching"],
    filterTags: ["Newborn", "Infant & Toddler", "Sleep", "Parenting", "Postpartum"],
    bio: "Manu is the founder of Beyond Birth Basics and author of Overcorrecting. She holds certifications in pediatric sleep consulting, postpartum doula work, potty training, and transformational parenting coaching. A mama of 3, she is passionate about helping parents sleep better, break generational patterns, and live with curiosity and empowerment.",
  },
  {
    id: "lindie",
    name: "Lindie Gibbs",
    title: "Partner & Newborn Care Specialist",
    location: "Serving Families Everywhere",
    photo: "https://beyondbirthbasics.com/wp-content/uploads/2024/12/PHOTO-2024-12-10-11-01-18.jpg",
    specialties: ["Newborn Care", "Fourth Trimester", "Infant & Toddler Sleep", "Sleep Coaching"],
    filterTags: ["Newborn", "Infant & Toddler", "Sleep"],
    bio: "Lindie is a certified Newborn Care Specialist & Pediatric Sleep Consultant with a Master's in Education and a passion for the fourth trimester. As a mother of five, she understands sleepless nights firsthand and takes the guesswork out of early parenting with customized, holistic support.",
  },
  {
    id: "lori",
    name: "Lori Sanders",
    title: "Infant & Toddler Sleep Consultant",
    location: "Atlanta, GA",
    photo: "https://beyondbirthbasics.com/wp-content/uploads/2025/03/color-headshot-website.jpg",
    specialties: ["Infant Sleep", "Toddler Sleep", "Sleep Regressions", "Independent Sleep"],
    filterTags: ["Infant & Toddler", "Sleep"],
    bio: "Lori has a background in early childhood education and a patient, supportive approach tailored to each family's unique needs. Whether you're navigating newborn sleep, toddler regressions, or transitioning to independent sleep, she'll provide evidence-based strategies so your whole family gets the rest they need.",
  },
  {
    id: "carla",
    name: "Carla Jenkins",
    title: "Infant & Toddler Sleep Consultant",
    location: "Dallas, TX",
    photo: "https://beyondbirthbasics.com/wp-content/uploads/2025/05/IMG_7712.PNG.jpg",
    specialties: ["Attachment-Based Sleep", "Gentle Methods", "Infant & Toddler", "Sensitive Children"],
    filterTags: ["Infant & Toddler", "Sleep"],
    bio: "Carla is a certified pediatric sleep consultant and Registered Nurse, specializing in families with sensitive, connection-oriented children under 4. Her approach is holistic, gentle, and rooted in attachment science — because healthy sleep doesn't have to come at the cost of connection.",
  },
];

function SpecialtyPill({ label, T }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, background: `${T.teal}15`, border: `1px solid ${T.teal}30`, fontFamily: font, fontSize: 11, color: T.teal, fontWeight: 600, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function ConsultantCard({ consultant, onRequest, T }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.card, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "18px 18px 14px", display: "flex", gap: 14, alignItems: "flex-start" }}>
        <img src={consultant.photo} alt={consultant.name}
          onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${T.teal}20`, display: "none", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>🌿</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: serif, fontSize: 17, color: T.headingText, marginBottom: 2 }}>{consultant.name}</div>
          <div style={{ fontFamily: font, fontSize: 12.5, color: T.teal, fontWeight: 600, marginBottom: 3 }}>{consultant.title}</div>
          <div style={{ fontFamily: font, fontSize: 11.5, color: T.muted }}>📍 {consultant.location}</div>
        </div>
      </div>
      <div style={{ padding: "0 18px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {consultant.specialties.map(s => <SpecialtyPill key={s} label={s} T={T} />)}
      </div>
      <div style={{ padding: "0 18px 14px" }}>
        <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.65, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: expanded ? "none" : 3, WebkitBoxOrient: "vertical" }}>
          {consultant.bio}
        </p>
        <button onClick={() => setExpanded(e => !e)}
          style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.teal, cursor: "pointer", padding: "4px 0", fontWeight: 600 }}>
          {expanded ? "Show less ↑" : "Read more ↓"}
        </button>
      </div>
      <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.border}`, background: T.faint }}>
        <button onClick={() => onRequest(consultant)}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: T.teal, color: "#fff", fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Request {consultant.name.split(" ")[0]} →
        </button>
      </div>
    </div>
  );
}

function RequestModal({ consultant, onClose, T }) {
  const { currentUser } = useApp();
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  function handleSend() {
    const subject = encodeURIComponent(`Consultant Request: ${consultant.name} — via Held App`);
    const body = encodeURIComponent(
      `Hi Manu,\n\nI'd love to work with ${consultant.name}!\n\nMy name: ${currentUser?.name || ""}\nMy email: ${currentUser?.email || ""}\n\n${note ? "Additional notes:\n" + note + "\n\n" : ""}I'm reaching out from the Held app.\n\nThank you!`
    );
    window.open(`mailto:hello@beyondbirthbasics.com?subject=${subject}&body=${body}`, "_blank");
    setSent(true);
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.55)", zIndex: 9999,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}>
      <div style={{
        background: T.bg, borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 480,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
      }}>
        {/* Handle + close */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px 12px", borderBottom: `1px solid ${T.border}`,
          position: "sticky", top: 0, background: T.bg, borderRadius: "20px 20px 0 0",
        }}>
          <div style={{ fontSize: 14, fontFamily: font, fontWeight: 600, color: T.headingText }}>
            Request {consultant.name.split(" ")[0]}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: T.muted,
            fontSize: 20, cursor: "pointer", padding: "4px", lineHeight: 1,
          }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px 40px" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🌿</div>
              <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 10 }}>Request sent!</div>
              <p style={{ fontFamily: font, fontSize: 14, color: T.muted, lineHeight: 1.65, marginBottom: 24 }}>
                Your email to hello@beyondbirthbasics.com has been opened. We'll be in touch soon to confirm your match with {consultant.name}.
              </p>
              <button onClick={onClose}
                style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: T.teal, color: "#fff", fontFamily: font, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Done
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 12, background: T.faint, border: `1px solid ${T.border}`, marginBottom: 20 }}>
                <img src={consultant.photo} alt={consultant.name} onError={e => e.target.style.display = "none"}
                  style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{consultant.name}</div>
                  <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{consultant.title}</div>
                </div>
              </div>
              <p style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.65, marginBottom: 16 }}>
                This will open an email to our team at Beyond Birth Basics. We'll review your request and reach out to confirm your match — usually within 24 hours.
              </p>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6, fontFamily: font }}>
                  Anything you'd like us to know? (optional)
                </div>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="e.g. my baby is 6 months and we're struggling with night wakings…"
                  rows={3}
                  style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontFamily: font, fontSize: 13.5, lineHeight: 1.5, resize: "none", outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = T.teal}
                  onBlur={e => e.target.style.borderColor = T.border} />
              </div>
              <button onClick={handleSend}
                style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: T.teal, color: "#fff", fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
                Send Request →
              </button>
              <button onClick={onClose}
                style={{ width: "100%", padding: "11px", borderRadius: 10, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 13.5, cursor: "pointer" }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function FindConsultant({ onClose }) {
  const T = useT();
  const [requesting, setRequesting] = useState(null);
  const [filter, setFilter] = useState("All");

  const specialtyFilters = ["All", "Newborn", "Infant & Toddler", "Sleep", "Parenting", "Postpartum"];
  const filtered = CONSULTANTS.filter(c => filter === "All" || c.filterTags.includes(filter));

  return (
    /* ── Full-screen backdrop ── */
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.55)", zIndex: 9000,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}>

      {/* ── Sheet ── */}
      <div style={{
        background: T.bg,
        borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 480,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
      }}>
        {/* Sticky header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 1,
          background: T.bg, borderRadius: "20px 20px 0 0",
          padding: "12px 20px 12px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center",
        }}>
          <div style={{
            position: "absolute", left: "50%", top: 8,
            transform: "translateX(-50%)",
            width: 36, height: 4, borderRadius: 2, background: T.border,
          }} />
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            background: "none", border: "none", color: T.muted,
            fontSize: 20, cursor: "pointer", padding: "4px 8px", lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px 48px", fontFamily: font, color: T.text }}>
          {requesting && <RequestModal consultant={requesting} onClose={() => setRequesting(null)} T={T} />}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 6 }}>
              Rooted Connections Collective
            </div>
            <h1 style={{ fontFamily: serif, fontSize: 26, color: T.headingText, lineHeight: 1.2, marginBottom: 8 }}>Find Your Consultant</h1>
            <p style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.65 }}>
              Browse our team and request the consultant that feels right for your family. We'll confirm your match within 24 hours.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20, scrollbarWidth: "none" }}>
            {specialtyFilters.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "7px 14px", borderRadius: 20, flexShrink: 0, border: `1.5px solid ${filter === f ? T.teal : T.border}`, background: filter === f ? `${T.teal}18` : T.faint, color: filter === f ? T.teal : T.muted, fontFamily: font, fontSize: 12.5, fontWeight: filter === f ? 700 : 400, cursor: "pointer", transition: "all .15s" }}>
                {f}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontFamily: font, fontSize: 13 }}>
              No consultants match that filter.
            </div>
          ) : (
            filtered.map(c => <ConsultantCard key={c.id} consultant={c} onRequest={setRequesting} T={T} />)
          )}

          <div style={{ padding: "16px", borderRadius: 12, background: T.faint, border: `1px solid ${T.border}`, marginTop: 4 }}>
            <p style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.65, textAlign: "center" }}>
              Not sure who to choose? Email us at{" "}
              <a href="mailto:hello@beyondbirthbasics.com" style={{ color: T.teal, textDecoration: "none" }}>hello@beyondbirthbasics.com</a>
              {" "}and we'll match you with the right fit. 🌿
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
