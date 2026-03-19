import { useState, useEffect } from "react";
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
export function NotificationSettings() {
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
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Load existing prefs
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPrefs(p => ({ ...p, ...data }));
      });
  }, [currentUser?.id]);

  function updatePref(key, value) {
    setPrefs(p => ({ ...p, [key]: value }));
  }

  async function savePrefs() {
    setSaving(true); setSaved(false); setLoadError(null);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ ...prefs, user_id: currentUser.id }, { onConflict: "user_id" });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setLoadError(e.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  // iOS PWA detection
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
  const showIOSPrompt = isIOS && !isInStandaloneMode;

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 20 }}>Notifications</h2>

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

      {/* Check-in reminder times — parents only */}
      {isParent && (
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
      )}

      {loadError && <div style={{ fontSize: 12.5, color: T.rose, fontFamily: font, marginBottom: 10 }}>{loadError}</div>}

      <Btn onClick={savePrefs} disabled={saving}>
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save preferences"}
      </Btn>
    </div>
  );
}
