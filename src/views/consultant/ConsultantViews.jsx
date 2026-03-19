import { useState, useEffect } from "react";
import { useT, useApp, Card, font, serif, Btn, Input } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { IntakeViewer } from "../../modules/intake/IntakeViewer.jsx";
import { NotificationSettings } from "../shared/NotificationSettings.jsx";


// ─── AGE LABEL HELPER ─────────────────────────────────────────────────────────
function ageLabel(dob) {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44));
  return months < 24 ? `${months}mo` : `${Math.floor(months / 12)}y`;
}

// ─── CONSULTANT CHILD PICKER ──────────────────────────────────────────────────
// Lets the consultant choose which child of a family they are viewing
function ConsultantChildPicker({ family }) {
  const T = useT();
  const [familyChildren, setFamilyChildren] = useState([]);
  const [activeConsultantChildId, setActiveConsultantChildId] = useState(null);

  useEffect(() => {
    if (!family?.id || !family?.parent_id) return;
    supabase
      .from("children")
      .select("*")
      .eq("parent_id", family.parent_id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const kids = data || [];
        setFamilyChildren(kids);
        if (kids.length > 0 && !activeConsultantChildId) {
          setActiveConsultantChildId(kids[0].id);
        }
      });
  }, [family?.id, family?.parent_id]);

  if (!familyChildren || familyChildren.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", borderRadius: 12, background: T.faint, border: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 13, color: T.muted, fontFamily: font, flexShrink: 0 }}>Viewing child:</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
        {familyChildren.map(c => {
          const isActive = activeConsultantChildId === c.id;
          const age = ageLabel(c.dob);
          return (
            <button key={c.id} onClick={() => setActiveConsultantChildId(c.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20,
                border: `1.5px solid ${isActive ? T.teal : T.border}`,
                background: isActive ? `${T.teal}18` : "transparent",
                color: isActive ? T.teal : T.muted,
                fontFamily: font, fontSize: 12.5, fontWeight: isActive ? 700 : 400,
                cursor: "pointer", transition: "all .15s",
              }}>
              {c.photo_url ? (
                <>
                  <img src={c.photo_url} alt={c.name}
                    onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "inline"; }}
                    style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  <span style={{ display: "none" }}>🧒</span>
                </>
              ) : (
                <span>🧒</span>
              )}
              {c.name}{age ? ` (${age})` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NsPulseCard({ family }) {
  const T = useT();
  const [pulse, setPulse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastGenerated, setLastGenerated] = useState(null);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ data: logsData }, { data: famData }] = await Promise.all([
        supabase.from("sleep_logs").select("*").eq("family_id", family.id).gt("ts", sevenDaysAgo).order("ts", { ascending: false }),
        supabase.from("families").select("sleep_progress, sleep_progress_history, sleep_plan_profile").eq("id", family.id).maybeSingle(),
      ]);

      const logs = logsData || [];
      const sessions = logs.filter(l => l.type === "sleep_session" && l.end_ts);
      const wakings = logs.filter(l => l.type === "night_waking");
      const moods = logs.filter(l => l.type === "sleep_session" && l.mood);
      const history = famData?.sleep_progress_history || [];
      const plan = famData?.sleep_plan_profile || {};
      const allItems = Object.keys(famData?.sleep_progress || {});

      const recentHistory = history.slice(-7);
      const avgCompliance = recentHistory.length > 0
        ? Math.round(recentHistory.reduce((sum, snap) => {
            const checked = Object.values(snap.checks || {}).filter(Boolean).length;
            return sum + (allItems.length ? checked / allItems.length : 0);
          }, 0) / recentHistory.length * 100)
        : null;

      const avgFallAsleep = sessions.filter(s => s.fall_asleep_secs).length
        ? Math.round(sessions.filter(s => s.fall_asleep_secs).reduce((s, l) => s + l.fall_asleep_secs, 0) / sessions.filter(s => s.fall_asleep_secs).length / 60)
        : null;

      const moodSummary = moods.reduce((acc, l) => { acc[l.mood] = (acc[l.mood] || 0) + 1; return acc; }, {});
      const nightWakingAvg = sessions.length ? (wakings.length / sessions.length).toFixed(1) : null;

      const prompt = `You are a nervous-system-informed sleep consultant reading behavioral data from a family's sleep tracking app. Your job is to infer what this data suggests about the parent's nervous system state — not the child's sleep quality in isolation.

You understand that:
- Low plan compliance signals caregiver overwhelm or dysregulation more than laziness
- Increasing night wakings after improvement often reflects parental nervous system contagion
- Mood patterns at wake-up reflect the parent's capacity as much as the child's
- Long fall-asleep times can signal a dysregulated bedtime environment
- Compliance drop + worsening sleep together is a red flag for parental burnout

━━━ BEHAVIORAL DATA (last 7 days) ━━━

Sleep method: ${plan.method || "not set"}
Training day: ${plan.startDate ? Math.floor((new Date() - new Date(plan.startDate)) / 86400000) + 1 : "unknown"}
Avg plan compliance: ${avgCompliance !== null ? avgCompliance + "%" : "no data"}
Avg fall asleep time: ${avgFallAsleep !== null ? avgFallAsleep + " min" : "no data"}
Avg night wakings per session: ${nightWakingAvg || "no data"}
Wake-up mood distribution: ${Object.entries(moodSummary).map(([k,v]) => k + ": " + v).join(", ") || "no mood data"}
Sessions logged: ${sessions.length} | Night wakings: ${wakings.length}

Recent compliance:
${recentHistory.map((snap, i) => {
  const checked = Object.values(snap.checks || {}).filter(Boolean).length;
  const pct = allItems.length ? Math.round(checked / allItems.length * 100) : 0;
  return "  " + snap.date + ": " + pct + "%";
}).join("\n") || "  No history yet"}

━━━ YOUR RESPONSE FORMAT ━━━

## 🌿 NS Pulse
2–3 sentences on what this behavioral pattern suggests about where this parent is right now. Direct, compassionate, no diagnosing.

## 📉 Trend to Watch
The most important pattern. One or two sentences.

## 💬 Suggested Opener
One or two sentences the consultant could use to open their next message with this parent.

## ⚡ Recommended Action
One concrete thing to do in the next 24–48 hours.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 700,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "API error");
      const result = data.content?.[0]?.text || "";
      setPulse(result);
      setLastGenerated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError("Failed to generate. Check API key and try again.");
    } finally {
      setLoading(false);
    }
  }

  const sections = pulse ? pulse.split(/\n## /).map((s, i) => i === 0 ? s.replace(/^## /, "") : s).filter(Boolean) : [];

  return (
    <div style={{
      borderRadius: 14, border: `1px solid ${T.border}`,
      background: T.card, padding: "16px 18px", marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: pulse ? 14 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🌿</span>
          <div>
            <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: T.headingText }}>NS Pulse</div>
            {lastGenerated && <div style={{ fontSize: 11, color: T.muted, fontFamily: font }}>Generated at {lastGenerated}</div>}
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: "7px 12px", borderRadius: 9,
            border: `1px solid ${"#7BAA8A"}44`,
            background: loading ? T.faint : `${"#7BAA8A"}12`,
            color: "#7BAA8A", fontFamily: font, fontSize: 12,
            fontWeight: 600, cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Reading..." : pulse ? "🔄 Refresh" : "Generate"}
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: "#A87B8A", fontFamily: font, marginTop: 8 }}>{error}</div>}
      {loading && <div style={{ fontSize: 13, color: T.muted, fontFamily: font, marginTop: 10, textAlign: "center", padding: "8px 0" }}>Reading behavioral patterns...</div>}
      {!pulse && !loading && !error && (
        <div style={{ fontSize: 12.5, color: T.muted, fontFamily: font, marginTop: 8, lineHeight: 1.6 }}>
          Reads the last 7 days of sleep data and plan compliance to infer where this family is right now.
        </div>
      )}
      {sections.map((section, i) => {
        const lines = section.split("\n");
        const heading = lines[0];
        const body = lines.slice(1).join("\n").trim();
        if (!body) return null;
        return (
          <div key={i} style={{ marginTop: 10, borderRadius: 10, background: `${"#7BAA8A"}0e`, border: `1px solid ${"#7BAA8A"}20`, padding: "10px 14px" }}>
            {heading && <div style={{ fontFamily: serif, fontSize: 13, color: T.headingText, marginBottom: 4 }}>{heading}</div>}
            <div style={{ fontFamily: font, fontSize: 12.5, color: T.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{body}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CONSULTANT VIEWS ─────────────────────────────────────────────────────────

function ConsultantFamilies() {
  const T = useT();
  const { families, setActiveFamily, setTab, selectedConsultantFamily, setSelectedConsultantFamily } = useApp();
  const [viewingIntake, setViewingIntake] = useState(false);

  if (selectedConsultantFamily && viewingIntake) {
    return <IntakeViewer family={selectedConsultantFamily} onBack={() => setViewingIntake(false)} />;
  }

  if (selectedConsultantFamily) {
    return (
      <div>
        <button
          onClick={() => setSelectedConsultantFamily(null)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.muted, fontFamily: font, fontSize: 13, cursor: "pointer", marginBottom: 20, padding: 0 }}
        >
          ← Back to Families
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: T.teal }}>
            {(selectedConsultantFamily.display_name || selectedConsultantFamily.invite_email || "?")[0].toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontFamily: serif, fontSize: 20, color: T.headingText, margin: 0 }}>
              {selectedConsultantFamily.display_name || selectedConsultantFamily.invite_email || "Unnamed family"}
            </h2>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
              {selectedConsultantFamily.intake_complete ? "✓ Intake complete" : "⏳ Awaiting intake"}
            </div>
          </div>
        </div>
        <ConsultantChildPicker family={selectedConsultantFamily} />
        <NsPulseCard family={selectedConsultantFamily} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selectedConsultantFamily.intake_complete && (
            <Card onClick={() => setViewingIntake(true)} style={{ background: `${T.teal}10`, border: `1px solid ${T.teal}30` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 24 }}>📋</span>
                <div>
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.teal }}>Review Intake</div>
                  <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>View responses, notes & AI insights</div>
                </div>
                <span style={{ marginLeft: "auto", color: T.teal }}>→</span>
              </div>
            </Card>
          )}
          {[
            { icon: "💬", label: "Messages", sub: "View conversation", tab: "messages" },
            { icon: "🌙", label: "Sleep Log", sub: "View sleep data", tab: "sleep" },
            { icon: "🌿", label: "Regulation", sub: "Regulation tools", tab: "regulation" },
          ].map(item => (
            <Card key={item.tab} onClick={() => { setActiveFamily(selectedConsultantFamily); setTab(item.tab); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <div>
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{item.label}</div>
                  <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{item.sub}</div>
                </div>
                <span style={{ marginLeft: "auto", color: T.muted }}>→</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Families</h2>
      {families.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontFamily: font, fontSize: 13 }}>
          No families assigned yet.
        </div>
      )}
      {families.map((f) => (
        <Card key={f.id} style={{ marginBottom: 12, cursor: "pointer" }} onClick={() => { setActiveFamily(f); setSelectedConsultantFamily(f); }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: T.teal, flexShrink: 0 }}>
              {(f.display_name || f.invite_email || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text }}>{f.display_name || f.invite_email || "Unnamed family"}</div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 2 }}>{f.intake_complete ? "✓ Intake complete" : "⏳ Awaiting intake"}</div>
            </div>
            <span style={{ marginLeft: "auto", color: T.muted }}>→</span>
          </div>
        </Card>
      ))}
    </div>
  );
}


function ConsultantAccount({ user, onLogout }) {
  const T = useT();
  const [profile, setProfile] = useState(null);
  const [showPin, setShowPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("subscription_active, subscription_id, stripe_customer_id, grace_period_until, consultant_pin, role").eq("id", user.id).single().then(({ data }) => setProfile(data));
  }, [user?.id]);

  async function savePin() {
    if (!newPin || newPin.length < 4) { setPinError("PIN must be at least 4 digits."); return; }
    if (!/^\d+$/.test(newPin)) { setPinError("PIN must be numbers only."); return; }
    setPinSaving(true); setPinError("");
    const { error } = await supabase.from("profiles").update({ consultant_pin: parseInt(newPin) }).eq("id", user.id);
    if (error) setPinError("Failed to save PIN.");
    else { setPinSaved(true); setNewPin(""); setTimeout(() => setPinSaved(false), 2000); }
    setPinSaving(false);
  }

  const isInternal = user?.role === "consultant_internal";
  const isActive = profile?.subscription_active;
  const inGrace = profile?.grace_period_until && new Date(profile.grace_period_until) > new Date();
  const subLabel = isInternal ? "Internal · No subscription required" : isActive ? "Active" : inGrace ? "Grace period" : profile ? "Inactive" : "—";
  const subColor = isInternal ? "#7BAA8A" : isActive ? "#7BAA8A" : inGrace ? "#A89B5A" : "#A87B8A";

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Account</h2>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 12, fontFamily: font }}>Your Profile</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${T.teal}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: T.teal, flexShrink: 0 }}>
            {(user?.name || user?.email || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: font }}>{user?.name || "—"}</div>
            <div style={{ fontSize: 13, color: T.muted, fontFamily: font }}>{user?.email || user?.user_email}</div>
            <div style={{ fontSize: 11, color: T.subText, fontFamily: font, marginTop: 2, textTransform: "capitalize" }}>{user?.role?.replace("_", " ") || "Consultant"}</div>
          </div>
        </div>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 12, fontFamily: font }}>Subscription</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontFamily: font, fontSize: 14, color: T.text }}>RCC Consultant Plan</div>
          <div style={{ padding: "3px 10px", borderRadius: 20, background: `${subColor}18`, border: `1px solid ${subColor}40`, fontSize: 12, fontWeight: 700, color: subColor, fontFamily: font }}>{subLabel}</div>
        </div>
        <div style={{ fontSize: 13, color: T.muted, fontFamily: font, lineHeight: 1.6 }}>$20 / month · Billed monthly</div>
        {inGrace && <div style={{ marginTop: 8, fontSize: 12, color: "#A89B5A", fontFamily: font }}>⚠️ Grace period ends {new Date(profile.grace_period_until).toLocaleDateString()}</div>}
        {!isInternal && !isActive && !inGrace && profile && (
          <div style={{ marginTop: 8, fontSize: 12, color: T.muted, fontFamily: font, lineHeight: 1.6 }}>
            Your subscription is currently inactive. To reactivate or update billing, email <a href="mailto:hello@rootedconnectionscollective.com" style={{ color: T.teal }}>hello@rootedconnectionscollective.com</a>
          </div>
        )}
        {isInternal && <div style={{ marginTop: 8, fontSize: 12, color: "#7BAA8A", fontFamily: font, lineHeight: 1.6 }}>🌿 As part of the RCC team, your access is fully covered — no billing needed.</div>}
        {!isInternal && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.muted, fontFamily: font, lineHeight: 1.6 }}>
            To cancel or make changes, email <a href="mailto:hello@rootedconnectionscollective.com" style={{ color: T.teal }}>hello@rootedconnectionscollective.com</a>
          </div>
        )}
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 12, fontFamily: font }}>Consultant PIN</div>
        <div style={{ fontSize: 13, color: T.muted, fontFamily: font, lineHeight: 1.6, marginBottom: 12 }}>Your PIN is used to access the Sleep Log configure tab for families. Keep it somewhere safe.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: T.headingText, letterSpacing: ".2em", minWidth: 80 }}>
            {showPin ? (profile?.consultant_pin || "—") : "••••"}
          </div>
          <button onClick={() => setShowPin(s => !s)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 12px", fontFamily: font, fontSize: 12, color: T.muted, cursor: "pointer" }}>
            {showPin ? "Hide" : "Show"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New PIN (4+ digits)"
            style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontFamily: font, fontSize: 13, outline: "none" }}
            onFocus={e => e.target.style.borderColor = T.teal} onBlur={e => e.target.style.borderColor = T.border} />
          <button onClick={savePin} disabled={pinSaving || !newPin}
            style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: pinSaving || !newPin ? T.faint : T.teal, color: pinSaving || !newPin ? T.muted : "#fff", fontFamily: font, fontSize: 13, fontWeight: 600, cursor: pinSaving || !newPin ? "default" : "pointer" }}>
            {pinSaving ? "Saving..." : pinSaved ? "✓ Saved" : "Update PIN"}
          </button>
        </div>
        {pinError && <div style={{ fontSize: 12, color: "#A87B8A", fontFamily: font, marginTop: 6 }}>{pinError}</div>}
      </Card>
      {/* Notification Settings */}
      <NotificationSettings />

      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 10, fontFamily: font }}>Need Help?</div>
        <div style={{ fontSize: 13, color: T.muted, fontFamily: font, lineHeight: 1.6 }}>For platform support, billing questions, or anything else — reach out directly.</div>
        <a href="mailto:hello@rootedconnectionscollective.com" style={{ display: "inline-block", marginTop: 10, padding: "9px 16px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.faint, fontFamily: font, fontSize: 13, color: T.teal, textDecoration: "none", fontWeight: 600 }}>
          ✉️ hello@rootedconnectionscollective.com
        </a>
      </Card>
      <Btn onClick={onLogout} style={{ background: "none", border: `1px solid ${T.border}`, color: T.muted }}>Sign out</Btn>
    </div>
  );
}

// ─── ADMIN VIEWS ──────────────────────────────────────────────────────────────

export { NsPulseCard, ConsultantChildPicker, ConsultantFamilies, ConsultantAccount };
