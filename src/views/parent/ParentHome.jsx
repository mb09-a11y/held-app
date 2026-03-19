import { useState, useEffect, useMemo } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import { HamburgerButton } from "../shared/AppDrawer.jsx";

// ─── AGE LABEL ────────────────────────────────────────────────────────────────
function ageLabel(dob) {
  if (!dob) return null;
  const months = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.44));
  return months < 24 ? `${months}mo` : `${Math.floor(months / 12)}y`;
}

// ─── LOCKED CONTENT WRAPPER ───────────────────────────────────────────────────
function Locked({ teaser, cta = "Unlock with Premium", onUpgrade, T, children, isPremium }) {
  if (isPremium) return children;
  return (
    <div style={{ position: "relative" }}>
      {/* Blurred teaser */}
      <div style={{ filter: "blur(3px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}>
        {teaser}
      </div>
      {/* Overlay */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: `${T.bg}CC`, borderRadius: 12, gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>🔒</span>
        <button onClick={onUpgrade}
          style={{ padding: "9px 20px", borderRadius: 20, border: "none", background: T.teal, color: "#fff", fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {cta}
        </button>
      </div>
    </div>
  );
}

// ─── UPGRADE MODAL ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose, T, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleUpgrade() {
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-parent-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: currentUser?.email,
          name: currentUser?.name,
          user_id: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
        onClose();
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: T.bg2, borderRadius: "20px 20px 0 0", width: "100%", padding: "28px 24px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
          <div style={{ fontFamily: serif, fontSize: 24, color: T.headingText, marginBottom: 8 }}>Held Premium</div>
          <p style={{ fontFamily: font, fontSize: 14, color: T.muted, lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>
            Get AI-powered sleep insights, a personalized daily focus, and a context-aware coach that knows your baby.
          </p>
        </div>
        {[
          { icon: "✦", label: "AI sleep insights & pattern recognition" },
          { icon: "🎯", label: "Personalized Focus for Today" },
          { icon: "💬", label: "Context-aware sleep coach" },
          { icon: "📚", label: "Full resource library" },
          { icon: "🌿", label: "Nervous system insights" },
        ].map(f => (
          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{f.icon}</span>
            <span style={{ fontFamily: font, fontSize: 13.5, color: T.text }}>{f.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontSize: 22, color: T.teal, marginBottom: 4 }}>$10/month</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 20 }}>Cancel anytime</div>
          {error && <div style={{ fontFamily: font, fontSize: 12.5, color: T.rose, marginBottom: 12 }}>{error}</div>}
          <button onClick={handleUpgrade} disabled={loading}
            style={{ display: "block", width: "100%", padding: "14px", borderRadius: 12, border: "none", background: loading ? T.faint : T.teal, color: loading ? T.muted : "#fff", fontFamily: font, fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer", marginBottom: 12 }}>
            {loading ? "Opening Stripe…" : "Get Premium →"}
          </button>
          <button onClick={onClose}
            style={{ background: "none", border: "none", fontFamily: font, fontSize: 13, color: T.muted, cursor: "pointer" }}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EMOTIONAL HEADER ─────────────────────────────────────────────────────────
const EMOTIONAL_HEADERS = [
  "Today is a reset, not a continuation of yesterday.",
  "You don't have to be perfect. You just have to show up.",
  "Your presence matters more than your performance.",
  "Small, consistent steps build something real.",
  "Rest is not a reward. It's part of the work.",
  "You're doing better than you think.",
  "Even regulated-enough is good enough.",
  "Progress isn't always visible. It's still happening.",
  "One moment at a time is enough.",
  "Tired parents can still be loving parents.",
];

function getEmotionalHeader(currentUser) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = currentUser?.name?.split(" ")[0] || "there";
  const msg = EMOTIONAL_HEADERS[new Date().getDate() % EMOTIONAL_HEADERS.length];
  return { greeting: `${greeting}, ${name}.`, message: msg };
}

// ─── FAMILY STATE HOOK ────────────────────────────────────────────────────────
function useFamilyState(familyId, childId, userId) {
  const [familyState, setFamilyState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) { setLoading(false); return; }

    async function load() {
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const since24 = new Date(Date.now() - 86400000).toISOString();

      const [
        { data: sleepLogs },
        { data: checkins },
        { data: child },
        { data: intakeData },
      ] = await Promise.all([
        supabase.from("sleep_logs").select("*").eq("family_id", familyId)
          .gte("ts", since7).order("ts", { ascending: false }),
        supabase.from("regulation_checkins").select("*").eq("user_id", userId)
          .gte("checked_in_at", since7).order("checked_in_at", { ascending: false }),
        childId ? supabase.from("children").select("*").eq("id", childId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("intake_responses").select("*").eq("family_id", familyId).maybeSingle(),
      ]);

      const logs = sleepLogs || [];
      const todayLogs = logs.filter(l => new Date(l.ts) > new Date(since24));
      const sessions = logs.filter(l => l.type === "sleep_session" && l.end_ts);
      const todaySessions = todayLogs.filter(l => l.type === "sleep_session" && l.end_ts);

      // Sleep metrics
      const totalSleepToday = todaySessions.reduce((s, l) => s + (l.total_sleep_ms || 0), 0);
      const avgNightWakes = sessions.length
        ? Math.round(logs.filter(l => l.type === "night_waking").length / Math.max(sessions.length, 1) * 10) / 10
        : null;
      const recentMoods = sessions.slice(0, 5).map(l => l.mood).filter(Boolean);
      const lastWakeUp = sessions[0]?.end_ts || null;

      // Regulation
      const recentCheckins = (checkins || []).slice(0, 7);
      const overwhelmScore = recentCheckins.reduce((s, c) => s + (c.reactivity || 5), 0) / Math.max(recentCheckins.length, 1);
      const stateFrequency = recentCheckins.reduce((acc, c) => { acc[c.state] = (acc[c.state] || 0) + 1; return acc; }, {});
      const dominantState = Object.entries(stateFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Child profile from intake
      const intake = intakeData || {};

      setFamilyState({
        childProfile: {
          name: child?.data?.name || child?.name || null,
          age: child?.data ? ageLabel(child.data.dob) : child ? ageLabel(child.dob) : null,
          dob: child?.data?.dob || child?.dob || null,
          temperament: intake.temperament || null,
          sensoryPreferences: intake.sensory_preferences || null,
        },
        parentState: {
          overwhelmLevel: Math.round(overwhelmScore),
          nervousSystemTrend: dominantState,
          recentCheckIns: recentCheckins.slice(0, 3),
          lastCheckinState: recentCheckins[0]?.state || null,
        },
        sleepData: {
          totalSleepTodayHours: (totalSleepToday / 3600000).toFixed(1),
          napCountToday: todaySessions.length,
          feedCountToday: todayLogs.filter(l => l.type === "feed").length,
          nightWakesAvg: avgNightWakes,
          lastWakeUp,
          recentMoods,
          weekSessions: sessions.slice(0, 14),
          consistency: sessions.length >= 5 ? "building" : sessions.length >= 2 ? "starting" : "new",
        },
        planData: {
          hasIntake: !!intakeData,
          currentPhase: intake.sleep_phase || null,
        },
      });
      setLoading(false);
    }

    load();
  }, [familyId, childId, userId]);

  return { familyState, loading };
}

// ─── AI INSIGHT HOOK ──────────────────────────────────────────────────────────
function useAIInsight(familyState, isPremium) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPremium || !familyState) return;
    if (familyState.sleepData.weekSessions.length < 2) return;

    const cacheKey = `rcc_insight_${new Date().toDateString()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setInsight(JSON.parse(cached)); return; }

    setLoading(true);
    const { sleepData, parentState, childProfile } = familyState;

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: `You are the RCC Sleep Coach — warm, nervous-system-informed, non-judgmental. Generate a brief daily insight for a parent. Respond ONLY with valid JSON: { "pattern": "one sentence describing what you notice", "likely_cause": "one sentence on why", "reassurance": "one warm sentence", "focus_items": ["specific action 1", "specific action 2"] }. No markdown, no preamble.`,
        messages: [{
          role: "user",
          content: `Child: ${childProfile.name || "baby"}, ${childProfile.age || "young"}.
Sleep today: ${sleepData.totalSleepTodayHours}h across ${sleepData.napCountToday} nap(s).
Recent night wakes average: ${sleepData.nightWakesAvg ?? "unknown"}.
Parent nervous system trend: ${parentState.nervousSystemTrend || "unknown"}, overwhelm level: ${parentState.overwhelmLevel}/10.
Consistency: ${sleepData.consistency}.
Recent wake-up moods: ${sleepData.recentMoods.join(", ") || "none logged"}.`
        }],
      }),
    })
      .then(r => r.json())
      .then(data => {
        const text = data.content?.find(c => c.type === "text")?.text || "{}";
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        setInsight(parsed);
        localStorage.setItem(cacheKey, JSON.stringify(parsed));
      })
      .catch(() => setInsight(null))
      .finally(() => setLoading(false));
  }, [isPremium, familyState?.sleepData?.napCountToday]);

  return { insight, loading };
}

// ─── PARENT HOME ──────────────────────────────────────────────────────────────
export function ParentHome({ user, onLogout, onInviteCo, onAddChild, onOpenDrawer, onFindConsultant }) {
  const T = useT();
  const { setTab, consultants, currentUser, activeChild, activeFamily, isPremium, hasConsultantAssigned } = useApp();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [whatHappening, setWhatHappening] = useState(false);
  const [whatResponse, setWhatResponse] = useState(null);
  const [whatLoading, setWhatLoading] = useState(false);
  const consultant = consultants?.[0];
  const isCo = currentUser?.role === "co_caregiver";

  const { familyState, loading: fsLoading } = useFamilyState(
    activeFamily?.id,
    activeChild?.id,
    currentUser?.id
  );
  const { insight, loading: insightLoading } = useAIInsight(familyState, isPremium);
  const { greeting, message } = getEmotionalHeader(currentUser);

  // ── "What's happening right now?" AI response ──
  async function askWhatHappening() {
    setWhatHappening(true);
    setWhatLoading(true);
    setWhatResponse(null);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          system: `You are the RCC Sleep Coach. Answer a parent's "what's happening right now?" question. Be warm, brief (2-3 sentences), and grounding. ${isPremium && familyState ? "Use their specific data to give a personalized, context-aware response." : "Give general, supportive guidance only — do not reference specific data."}`,
          messages: [{
            role: "user",
            content: isPremium && familyState
              ? `My baby is ${familyState.childProfile.age || "young"}. Today: ${familyState.sleepData.napCountToday} nap(s), ${familyState.sleepData.totalSleepTodayHours}h sleep. Last wake-up: ${familyState.sleepData.lastWakeUp ? new Date(familyState.sleepData.lastWakeUp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "unknown"}. What's happening right now with sleep?`
              : "I have a baby and I'm trying to understand what's happening with sleep right now. Can you help ground me?",
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find(c => c.type === "text")?.text || "";
      setWhatResponse(text);
    } catch {
      setWhatResponse("It's okay to not know exactly what's happening. Trust your instincts — you know your baby better than any algorithm.");
    } finally {
      setWhatLoading(false);
    }
  }



  return (
    <div>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} T={T} currentUser={currentUser} />}

      {/* ── 1. EMOTIONAL HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ paddingTop: 6 }}>
            <HamburgerButton onOpen={onOpenDrawer} T={T} />
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: T.subText, marginBottom: 4, fontFamily: font }}>
              Rooted Connections Collective
            </div>
            <h1 style={{ fontFamily: serif, fontSize: 26, color: T.headingText, lineHeight: 1.15, marginBottom: 6 }}>
              {greeting}
            </h1>
            <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, fontStyle: "italic", maxWidth: 300 }}>
              "{message}"
            </p>
            {isCo && <div style={{ fontSize: 11.5, color: T.muted, fontFamily: font, marginTop: 4 }}>Co-caregiver view</div>}
          </div>
        </div>
      </div>

      {/* Child switcher pills */}
      <ChildSwitcher onAddChild={onAddChild} />

      {/* ── 1. WHAT'S HAPPENING RIGHT NOW ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        {!whatHappening ? (
          <button onClick={askWhatHappening}
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 3 }}>
                  💭 What's happening right now?
                </div>
                <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted }}>
                  {isPremium ? "Get context-aware guidance based on your data" : "Get general sleep support"}
                </div>
              </div>
              <span style={{ color: T.teal, fontSize: 18 }}>→</span>
            </div>
          </button>
        ) : (
          <div>
            <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
              💭 Right now
            </div>
            {whatLoading ? (
              <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>Thinking…</div>
            ) : (
              <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.7, margin: 0 }}>{whatResponse}</p>
            )}
            <button onClick={() => { setWhatHappening(false); setWhatResponse(null); }}
              style={{ background: "none", border: "none", fontFamily: font, fontSize: 12, color: T.muted, cursor: "pointer", marginTop: 10, padding: 0 }}>
              ← Close
            </button>
          </div>
        )}
      </div>

      {/* ── 2. REGULATION SUPPORT ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>
          🌿 You Matter Too
        </div>
        {isPremium && familyState?.parentState?.lastCheckinState ? (
          <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65, marginBottom: 12 }}>
            {familyState.parentState.overwhelmLevel >= 7
              ? `Your nervous system has been working hard lately. Before you jump into the next task, take 60 seconds for yourself.`
              : familyState.parentState.lastCheckinState === "Regulated"
              ? `You checked in as regulated. That energy transfers — your baby feels it.`
              : `A ${familyState.parentState.lastCheckinState?.toLowerCase()} state is honest and valid. A short reset might help before the next sleep window.`}
          </p>
        ) : (
          <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65, marginBottom: 12 }}>
            Take a moment for yourself today. Your regulation is the foundation everything else rests on.
          </p>
        )}
        <button onClick={() => setTab("regulation")}
          style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${T.teal}`, background: `${T.teal}12`, color: T.teal, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Open Regulation →
        </button>
      </div>

      {/* ── 3. TODAY AT A GLANCE ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 12 }}>
          📊 Today at a Glance
        </div>
        {familyState ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Naps", value: familyState.sleepData.napCountToday, icon: "🌙" },
              { label: "Sleep", value: `${familyState.sleepData.totalSleepTodayHours}h`, icon: "💤" },
              { label: "Feeds", value: familyState.sleepData.feedCountToday, icon: "🍼" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 10, background: T.faint }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: T.headingText }}>{s.value}</div>
                <div style={{ fontFamily: font, fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {["🌙", "💤", "🍼"].map((icon, i) => (
              <div key={i} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 10, background: T.faint }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: T.muted }}>—</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setTab("sleep")}
          style={{ marginTop: 12, width: "100%", padding: "9px", borderRadius: 9, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 12.5, cursor: "pointer" }}>
          Log today →
        </button>
      </div>

      {/* ── 4. PROGRESS ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
          📈 Progress
        </div>
        {isPremium && familyState ? (
          <div>
            {familyState.sleepData.weekSessions.length >= 3 ? (
              <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65 }}>
                {familyState.sleepData.nightWakesAvg !== null && familyState.sleepData.nightWakesAvg < 2
                  ? `Night wakings are averaging ${familyState.sleepData.nightWakesAvg} — that's meaningful progress.`
                  : `You've logged ${familyState.sleepData.weekSessions.length} sleep sessions this week. The data is building a picture.`}
                {familyState.sleepData.recentMoods.length > 0 && ` Wake-up moods have been mostly ${familyState.sleepData.recentMoods[0]}.`}
              </p>
            ) : (
              <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65 }}>
                You're building your baseline. Log a few more sessions and we'll start tracking real trends.
              </p>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.65, marginBottom: 12 }}>
              {familyState?.sleepData?.weekSessions?.length >= 3
                ? `You've been logging consistently this week. That habit is building something real.`
                : `Every log you add helps build a clearer picture of your baby's patterns.`}
            </p>
            {!isPremium && (
              <button onClick={() => setShowUpgrade(true)}
                style={{ background: "none", border: "none", fontFamily: font, fontSize: 12.5, color: T.teal, cursor: "pointer", padding: 0, fontWeight: 600 }}>
                See what the patterns mean →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 5. INSIGHT CARD ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
          ✦ Today's Insight
        </div>
        {isPremium ? (
          insightLoading ? (
            <div style={{ fontFamily: font, fontSize: 13, color: T.muted }}>Reading your data thoughtfully…</div>
          ) : insight ? (
            <>
              <p style={{ fontFamily: font, fontSize: 14, color: T.text, lineHeight: 1.65, marginBottom: 8, fontWeight: 600 }}>{insight.pattern}</p>
              <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 8, fontStyle: "italic" }}>{insight.likely_cause}</p>
              <p style={{ fontFamily: font, fontSize: 13, color: T.teal, lineHeight: 1.6 }}>🌿 {insight.reassurance}</p>
            </>
          ) : (
            <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              Log a few sleep sessions and we'll start generating personalized insights for you.
            </p>
          )
        ) : (
          <Locked isPremium={false} T={T} onUpgrade={() => setShowUpgrade(true)}
            cta="Unlock insights →"
            teaser={
              <div>
                <p style={{ fontFamily: font, fontSize: 14, color: T.text, lineHeight: 1.65, marginBottom: 6, fontWeight: 600 }}>
                  Sleep patterns are starting to form.
                </p>
                <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                  Things are shifting in an interesting direction. Understanding why could help you get ahead of it.
                </p>
              </div>
            }
          />
        )}
      </div>

      {/* ── 6. FOCUS FOR TODAY ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 10 }}>
          🎯 Focus for Today
        </div>
        {isPremium && insight?.focus_items ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insight.focus_items.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.teal, flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </div>
                <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.6, margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
        ) : (
          <Locked isPremium={isPremium} T={T} onUpgrade={() => setShowUpgrade(true)}
            cta="Get personalized plan →"
            teaser={
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Keep bedtime routine consistent", "Watch for sleepy cues around wake window", "Try a short outdoor reset before nap"].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.teal, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <p style={{ fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.6, margin: 0 }}>{item}</p>
                  </div>
                ))}
              </div>
            }
          />
        )}
      </div>

      {/* ── CONSULTANT CARD ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, padding: "16px 18px", background: T.card, marginBottom: 12 }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>Your Consultant</div>
        {consultant ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${T.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.teal, flexShrink: 0 }}>
              {(consultant.name || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: T.text }}>{consultant.name}</div>
              <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>{consultant.email}</div>
            </div>
            <button onClick={() => setTab("messages")}
              style={{ marginLeft: "auto", background: T.faint, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", fontFamily: font, fontSize: 12, color: T.teal, cursor: "pointer" }}>
              Message
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 12 }}>
              No consultant assigned yet.
            </p>
            <button onClick={onFindConsultant}
              style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${T.teal}`, background: `${T.teal}12`, color: T.teal, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              🌿 Find a Consultant →
            </button>
          </div>
        )}
      </div>

      {/* ── CO-CAREGIVER INVITE ── */}
      {!isCo && (
        <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, padding: "16px 18px", background: T.card, marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>Co-Caregiver</div>
          <p style={{ fontFamily: font, fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 12 }}>
            Invite a partner or co-caregiver to view the sleep plan and check off items.
          </p>
          <button onClick={onInviteCo}
            style={{ background: T.faint, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontFamily: font, fontSize: 13, color: T.teal, cursor: "pointer" }}>
            + Invite co-caregiver
          </button>
        </div>
      )}
    </div>
  );
}

// ─── CHILD SWITCHER ───────────────────────────────────────────────────────────
function ChildSwitcher({ onAddChild }) {
  const T = useT();
  const { children, activeChild, setActiveChildId } = useApp();
  if (!children || children.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: T.subText, fontFamily: font, marginBottom: 8 }}>
        Viewing child
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {children.map(c => {
          const isActive = activeChild?.id === c.id;
          const age = ageLabel(c.dob);
          return (
            <button key={c.id} onClick={() => setActiveChildId(c.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 24, border: `1.5px solid ${isActive ? T.teal : T.border}`, background: isActive ? `${T.teal}18` : T.faint, color: isActive ? T.teal : T.text, fontFamily: font, fontSize: 13, fontWeight: isActive ? 700 : 400, cursor: "pointer", transition: "all .2s" }}>
              {c.photo_url ? (
                <>
                  <img src={c.photo_url} alt={c.name}
                    onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "inline"; }}
                    style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  <span style={{ fontSize: 16, display: "none" }}>{c.gender === "girl" ? "👧" : c.gender === "boy" ? "👦" : "🧒"}</span>
                </>
              ) : (
                <span style={{ fontSize: 16 }}>{c.gender === "girl" ? "👧" : c.gender === "boy" ? "👦" : "🧒"}</span>
              )}
              {c.name}
              {age && <span style={{ fontSize: 10.5, color: isActive ? T.teal : T.muted, fontWeight: 400 }}>{age}</span>}
            </button>
          );
        })}
        <button onClick={onAddChild}
          style={{ padding: "8px 12px", borderRadius: 24, border: `1.5px dashed ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 12.5, cursor: "pointer" }}>
          + Add child
        </button>
      </div>
    </div>
  );
}

export { ChildSwitcher };
