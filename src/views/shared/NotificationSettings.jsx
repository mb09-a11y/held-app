import { useState, useEffect, useRef } from "react";
import { useT, useApp, font, serif, Card, Btn } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { usePushNotifications } from "../../hooks/usePushNotifications.js";

// ─── TIME PICKER ──────────────────────────────────────────────────────────────
function TimePicker({ label, value, onChange, T }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, color: T.muted, fontFamily: font, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <input
        type="time"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg, color: T.text, fontFamily: font, fontSize: 13, outline: "none" }}
        onFocus={e => e.target.style.borderColor = T.teal}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  );
}

// ─── TOGGLE ROW ───────────────────────────────────────────────────────────────
function ToggleRow({ label, sub, value, onChange, T }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 10, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: T.text }}>{label}</div>
        {sub && <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 2, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
          background: value ? T.teal : T.faint,
          position: "relative", transition: "background .2s", flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 3,
          left: value ? 22 : 3,
          width: 18, height: 18, borderRadius: "50%",
          background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

// ─── NOTIFICATION SETTINGS ────────────────────────────────────────────────────
export function NotificationSettings({ onClose, scrollToReminders }) {
  const T = useT();
  const { currentUser } = useApp();
  const { isSupported, isSubscribed, permission, loading: pushLoading, error: pushError, subscribe, unsubscribe } = usePushNotifications(currentUser?.id);

  const isConsultant = currentUser?.role === "consultant" || currentUser?.role === "consultant_internal";
  const isParent = currentUser?.role === "parent" || currentUser?.role === "co_caregiver";

  const [prefs, setPrefs] = useState({
    messages: true,
    intake_completed: true,
    regulation_checkin: true,
    am_enabled: false,
    pm_enabled: false,
    am_time: "08:00",
    pm_time: "20:00",
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
    nap_lead_mins: 10,
    bedtime_lead_mins: 10,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const reminderRef = useRef(null);

  // Load existing prefs
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs(p => ({ ...p, ...data }));
        }
        // If arriving from "Set a reminder for 5pm", pre-enable evening at 17:00
        if (scrollToReminders) {
          setPrefs(p => ({ ...p, pm_enabled: true, pm_time: p.pm_time === "20:00" && !data?.pm_time ? "17:00" : (data?.pm_time || p.pm_time) }));
          setTimeout(() => reminderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
        }
      });
  }, [currentUser?.id]);

  function updatePref(key, value) {
    setPrefs(p => ({ ...p, [key]: value }));
  }

  async function savePrefs() {
    setSaving(true); setSaved(false); setLoadError(null);
    // Safety timeout — never spin forever
    const timeout = setTimeout(() => {
      setSaving(false);
      setLoadError("Taking too long — preferences may not have saved. Try again.");
    }, 8000);
    try {
      const safePrefs = {
        user_id: currentUser.id,
        messages: prefs.messages,
        intake_completed: prefs.intake_completed,
        regulation_checkin: prefs.regulation_checkin,
        am_enabled: prefs.am_enabled,
        pm_enabled: prefs.pm_enabled,
        am_time: prefs.am_time,
        pm_time: prefs.pm_time,
        quiet_hours_start: prefs.quiet_hours_start,
        quiet_hours_end: prefs.quiet_hours_end,
        nap_lead_mins: prefs.nap_lead_mins,
        bedtime_lead_mins: prefs.bedtime_lead_mins,
      };
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(safePrefs, { onConflict: "user_id" });
      clearTimeout(timeout);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose?.(); }, 1200);
    } catch (e) {
      clearTimeout(timeout);
      setLoadError(e.message || "Failed to save. You can close and try again.");
    } finally {
      setSaving(false);
    }
  }

  // iOS PWA detection
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
  const showIOSPrompt = isIOS && !isInStandaloneMode;

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => { setSaving(false); onClose?.(); }} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)", zIndex: 300,
      }} />

      {/* Modal sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 301,
        maxHeight: "90vh", overflowY: "auto",
        background: T.bg, borderRadius: "20px 20px 0 0",
        padding: "24px 24px 48px",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
      }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, margin: 0 }}>Notifications</h2>
          <button onClick={() => { setSaving(false); onClose?.(); }} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 22, color: T.muted, lineHeight: 1, padding: "4px 8px",
          }}>✕</button>
        </div>

        <div style={{ maxWidth: 560 }}>

      {/* Push toggle card */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 12, fontFamily: font }}>
          Push Notifications
        </div>

        {showIOSPrompt && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: `${T.amber}18`, border: `1px solid ${T.amber}40`, marginBottom: 14 }}>
            <div style={{ fontFamily: font, fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 4 }}>📱 iPhone setup required</div>
            <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>
              To receive push notifications on iPhone, you need to add this app to your Home Screen first. Tap the Share button in Safari, then "Add to Home Screen", then open the app from there.
            </div>
          </div>
        )}

        {!isSupported && (
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 12 }}>
            Push notifications aren't supported in this browser. Try opening the app from your Home Screen on iPhone, or use Chrome/Firefox on Android or desktop.
          </div>
        )}

        {isSupported && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: T.text }}>
                {isSubscribed ? "Notifications enabled on this device" : "Enable notifications on this device"}
              </div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginTop: 2 }}>
                {isSubscribed
                  ? `Receiving on this ${/iPhone/.test(navigator.userAgent) ? "iPhone" : /Android/.test(navigator.userAgent) ? "Android" : "device"}`
                  : "Get notified for messages, intake, and check-ins"}
              </div>
              {permission === "denied" && (
                <div style={{ fontFamily: font, fontSize: 12, color: T.rose, marginTop: 4 }}>
                  Notifications are blocked. Go to your browser/phone settings to allow them for this app.
                </div>
              )}
            </div>
            <Btn
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={pushLoading || permission === "denied"}
              style={{
                width: "auto", padding: "9px 16px", flexShrink: 0,
                background: isSubscribed ? "none" : T.teal,
                border: isSubscribed ? `1px solid ${T.border}` : "none",
                color: isSubscribed ? T.muted : "#fff",
              }}
            >
              {pushLoading ? "…" : isSubscribed ? "Turn off" : "Turn on"}
            </Btn>
          </div>
        )}

        {pushError && <div style={{ fontFamily: font, fontSize: 12, color: T.rose, marginTop: 10 }}>{pushError}</div>}
      </Card>

      {/* What to notify for */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 4, fontFamily: font }}>
          Notify me for
        </div>

        <ToggleRow T={T} label="New messages" sub="When you receive a message from your consultant or family" value={prefs.messages} onChange={v => updatePref("messages", v)} />

        {isConsultant && (
          <ToggleRow T={T} label="Intake completed" sub="When a family finishes their intake questionnaire" value={prefs.intake_completed} onChange={v => updatePref("intake_completed", v)} />
        )}

        <ToggleRow T={T}
          label="Regulation check-ins"
          sub={isConsultant ? "When a family completes a regulation check-in" : "Reminders to complete your regulation check-in"}
          value={prefs.regulation_checkin}
          onChange={v => updatePref("regulation_checkin", v)}
        />
      </Card>

      {/* Nap & bedtime lead time — parents only */}
      {isParent && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 12, fontFamily: font }}>
            Sleep Window Reminders
          </div>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>
            Get a heads-up before nap and bedtime so you can start winding down. Default is 10 minutes.
          </div>
          {[
            { key: "nap_lead_mins", label: "Before nap", emoji: "🌤️" },
            { key: "bedtime_lead_mins", label: "Before bedtime", emoji: "🌙" },
          ].map(({ key, label, emoji }) => (
            <div key={key} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: T.text }}>{emoji} {label}</div>
                <div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: T.teal, minWidth: 60, textAlign: "right" }}>
                  {prefs[key] === 0 ? "Off" : `${prefs[key]} min`}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={5}
                value={prefs[key]}
                onChange={e => updatePref(key, Number(e.target.value))}
                style={{ width: "100%", accentColor: T.teal }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 11, color: T.muted, marginTop: 4 }}>
                <span>Off</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30 min</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Check-in reminder times — parents only */}
      {isParent && (
        <div ref={reminderRef}>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 12, fontFamily: font }}>
            Check-in Reminder Times
          </div>
          <div style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>
            Set times for daily regulation check-in reminders. You can set a morning and/or evening reminder.
          </div>

          <ToggleRow T={T} label="Morning reminder" value={prefs.am_enabled} onChange={v => updatePref("am_enabled", v)} />
          {prefs.am_enabled && (
            <div style={{ paddingTop: 12, paddingBottom: 4 }}>
              <TimePicker label="Morning time" value={prefs.am_time} onChange={v => updatePref("am_time", v)} T={T} />
            </div>
          )}

          <ToggleRow T={T} label="Evening reminder" value={prefs.pm_enabled} onChange={v => updatePref("pm_enabled", v)} />
          {prefs.pm_enabled && (
            <div style={{ paddingTop: 12, paddingBottom: 4 }}>
              <TimePicker label="Evening time" value={prefs.pm_time} onChange={v => updatePref("pm_time", v)} T={T} />
            </div>
          )}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Quiet hours</div>
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
              No notifications will be sent during these hours.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <TimePicker label="Quiet from" value={prefs.quiet_hours_start} onChange={v => updatePref("quiet_hours_start", v)} T={T} />
              <TimePicker label="Quiet until" value={prefs.quiet_hours_end} onChange={v => updatePref("quiet_hours_end", v)} T={T} />
            </div>
          </div>
        </Card>
        </div>
      )}

      {loadError && <div style={{ fontSize: 12.5, color: T.rose, fontFamily: font, marginBottom: 10 }}>{loadError}</div>}

      <Btn onClick={savePrefs} disabled={saving}>
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save preferences"}
      </Btn>

        </div>
      </div>
    </>
  );
}
