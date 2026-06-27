import { useState, useEffect } from "react";
import { useT, Card, Btn, Input, EyeIcon, font, serif } from "../core/shared.jsx";
import { supabase } from "../lib/supabase.js";

function LoadingScreen({ label = "Loading…" }) {
  const T = useT();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🌿</div>
        <div style={{ fontFamily: serif, fontSize: 18, color: T.muted }}>{label}</div>
      </div>
    </div>
  );
}


function LoginScreen({ onLogin, onGoRegister }) {
  const T = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onLogin({ email, password });
    } catch (e) {
      setError(e.message || "Sign in failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email address above first.");
      return;
    }
    setResetLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?type=recovery`,
    });
    setResetLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 24px",
        background: "#FDFAF6",
      }}
    >
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🌿</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, color: "#2D4A35", lineHeight: 1.1, marginBottom: 4 }}>
            Held
          </h1>
          <div
            style={{
              fontSize: 10,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "#A09080",
              marginBottom: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            by Rooted Connections Collective
          </div>
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: 20, padding: "20px 18px", boxShadow: "0 4px 28px rgba(45,74,53,0.10)", border: "1px solid #E8DDD0" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9A8878", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>Email *</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 12, fontFamily: "inherit", fontSize: 13.5, background: "#FAF6F0", color: "#3A2E28", border: "1.5px solid #E8DDD0", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "#5C7A5E"}
              onBlur={e => e.target.style.borderColor = "#E8DDD0"}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9A8878", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>Password *</div>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", padding: "11px 40px 11px 13px", borderRadius: 12, fontFamily: "inherit", fontSize: 13.5, background: "#FAF6F0", color: "#3A2E28", border: "1.5px solid #E8DDD0", outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "#5C7A5E"}
                onBlur={e => e.target.style.borderColor = "#E8DDD0"}
              />
              <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? "Hide password" : "Show password"}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, margin: 0, cursor: "pointer", display: "flex", alignItems: "center", color: "#9A8878", lineHeight: 0 }}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
          {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 12 }}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} style={{ background: loading ? "#C4D2C2" : "#5C7A5E", color: "#fff", border: "none", borderRadius: 12, padding: "11px 16px", width: "100%", fontSize: 13.5, fontWeight: 600, cursor: loading ? "default" : "pointer" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {resetSent && (
            <div style={{ fontSize: 13, color: "#5C7A5E", textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
              ✓ Password reset email sent! Check your inbox.
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button
              onClick={handleForgotPassword}
              disabled={resetLoading}
              style={{
                background: "none", border: "none",
                fontSize: 12.5,
                color: "#9A8878", cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {resetLoading ? "Sending…" : "Forgot password?"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button
              onClick={onGoRegister}
              style={{
                background: "none",
                border: "none",
                fontFamily: "inherit",
                fontSize: 13,
                color: "#5C7A5E",
                cursor: "pointer"
              }}
            >
              New parent? Create an account →
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "#B8924A", letterSpacing: "0.05em", fontStyle: "italic" }}>
            Rooted Connections Collective
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT PENDING SCREEN ───────────────────────────────────────────────────

function PaymentPendingScreen({ email }) {
  const T = useT();
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", padding: "0 24px"
    }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🌿</div>
        <h1 style={{ fontFamily: serif, fontSize: 28, color: T.headingText, marginBottom: 12 }}>
          Complete your payment
        </h1>
        <p style={{ fontFamily: font, fontSize: 14, color: T.muted, lineHeight: 1.7, marginBottom: 24 }}>
          This invite requires a subscription to access the platform.
          Check your email{email ? ` at ${email}` : ""} for the payment link, or contact your admin if you need help.
        </p>
        <div style={{
          padding: "14px 20px", borderRadius: 12,
          border: `1px solid ${T.border}`, background: T.card,
          fontFamily: font, fontSize: 13, color: T.muted
        }}>
          Once payment is confirmed, you'll receive a new email with your account setup link.
        </div>
      </div>
    </div>
  );
}


function RegisterScreen({
  onBack,
  onRegistered,
  inviteToken,
  consultantInviteToken,
  coInviteEmail: lockedCoEmail,
  inviteRecord
}) {
  const T = useT();
  const [form, setForm] = useState({
    name: "",
    // Pre-fill email from whichever invite type we have
    email: lockedCoEmail || inviteRecord?.invite_email || inviteRecord?.email || "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitAccount() {
    if (!form.name || !form.email || !form.password) {
      setError("All fields are required.");
      return;
    }

    // Password requirements: 8–16 chars, at least 1 special character
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password.length > 16) {
      setError("Password must be 16 characters or fewer.");
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(form.password)) {
      setError("Password must include at least one special character (e.g. !, @, #, $).");
      return;
    }

    // Lock email for all invite types
    const lockedEmail = lockedCoEmail || inviteRecord?.invite_email || inviteRecord?.email;
    if (lockedEmail && form.email.toLowerCase() !== lockedEmail.toLowerCase()) {
      setError("Please register using the same email address that received the invitation.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await onRegistered({
        email: form.email,
        password: form.password,
        name: form.name,
        role:
          inviteRecord?.invite_kind === "consultant"
            ? (inviteRecord?.role || "consultant")
            : "parent",
        inviteToken,
        consultantInviteToken,
        isCoCaregiver: !!lockedCoEmail,
      });
    } catch (e) {
      setError(e.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isCo = !!lockedCoEmail;
  const isConsultantInvite = inviteRecord?.invite_kind === "consultant";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 24px",
        background: "#FDFAF6",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: T.muted,
            fontFamily: font,
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 20
          }}
        >
          ← Back to sign in
        </button>

        <div style={{ fontFamily: serif, fontSize: 26, color: T.headingText, marginBottom: 6 }}>
          Create your account.
        </div>

        {/* Contextual invite message */}
        {isCo && (
          <div style={{ fontSize: 12.5, color: T.sage, marginBottom: 16, lineHeight: 1.6 }}>
            🌿 You've been invited as a co-caregiver. Create your account to view the sleep plan and support your family.
          </div>
        )}
        {!isCo && inviteRecord && (
          <div style={{ fontSize: 12.5, color: T.sage, marginBottom: 16 }}>
            {isConsultantInvite
              ? "An account invitation has been created for you."
              : "Your consultant has created a family space for you."}
          </div>
        )}

        <Card>
          <Input
            label="Your name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            required
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            type="email"
            required
          />
          <Input
            label="Password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            type="password"
            required
          />
          <div style={{ fontSize: 11, color: "#9A8878", marginTop: -8, marginBottom: 6, lineHeight: 1.5 }}>
            8–16 characters, at least one special character (e.g. !, @, #, $)
          </div>

          {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{error}</div>}

          <Btn onClick={submitAccount} disabled={loading}>
            {loading ? "Creating account…" : "Continue →"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}


function ChildInfoStep({ onSave, onFinish, loading }) {
  const T = useT();
  const [child, setChild] = useState({
    name: "",
    dob: "",
    weight_lbs: "",
    weight_oz: "",
  });
  const [error, setError] = useState("");
  const [addedChildren, setAddedChildren] = useState([]);
  const [justAdded, setJustAdded] = useState(false);

  async function submit() {
    if (!child.name || !child.dob) {
      setError("Child name and date of birth are required.");
      return;
    }

    setError("");

    try {
      await onSave(child);
      setAddedChildren((prev) => [...prev, child.name]);
      setChild({ name: "", dob: "", weight_lbs: "", weight_oz: "" });
      setJustAdded(true);
    } catch (e) {
      setError(e.message || "Unable to save child info.");
    }
  }

  function addAnother() {
    setJustAdded(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 24px",
        background: "#FDFAF6",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ fontFamily: serif, fontSize: 26, color: T.headingText, marginBottom: 8 }}>
          Tell us about your child.
        </div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
          We'll use this to personalize your experience and calculate age-appropriate guidance.
        </div>

        {addedChildren.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {addedChildren.map((name) => (
              <div
                key={name}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 13.5, color: T.headingText, fontFamily: font,
                  marginBottom: 6,
                }}
              >
                <span style={{ color: T.teal }}>✓</span>
                <span>{name} added</span>
              </div>
            ))}
          </div>
        )}

        {justAdded ? (
          <Card>
            <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6, marginBottom: 16, fontFamily: font }}>
              Got it! Have another child you'd like to add?
            </div>
            <Btn onClick={addAnother} style={{ marginBottom: 10 }}>
              + Add another child
            </Btn>
            <Btn
              onClick={onFinish}
              color="transparent"
              style={{ border: `1.5px solid ${T.border}`, color: T.text }}
            >
              Continue →
            </Btn>
          </Card>
        ) : (
          <Card>
            {addedChildren.length > 0 && (
              <button
                onClick={onFinish}
                style={{
                  background: "none", border: "none", padding: 0,
                  fontFamily: font, fontSize: 13, color: T.muted,
                  cursor: "pointer", marginBottom: 16, display: "block",
                  textDecoration: "underline",
                }}
              >
                ← Actually, I'm done adding children
              </button>
            )}
            <Input
              label="Child's name"
              value={child.name}
              onChange={(v) => setChild((c) => ({ ...c, name: v }))}
              required
            />
            <Input
              label="Date of birth"
              value={child.dob}
              onChange={(v) => setChild((c) => ({ ...c, dob: v }))}
              type="date"
              required
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input
                label="Weight (lbs)"
                value={child.weight_lbs}
                onChange={(v) => setChild((c) => ({ ...c, weight_lbs: v }))}
                type="number"
              />
              <Input
                label="Weight (oz)"
                value={child.weight_oz}
                onChange={(v) => setChild((c) => ({ ...c, weight_oz: v }))}
                type="number"
              />
            </div>

            {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{error}</div>}

            <Btn onClick={submit} disabled={loading}>
              {loading ? "Saving…" : "Continue →"}
            </Btn>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── RESET PASSWORD SCREEN ───────────────────────────────────────────────────
// Shown when user lands on the app with type=recovery in the URL.
// Also handles the common case where an email security scanner (Gmail, etc.)
// has already "clicked" the one-time link before the person did — Supabase
// redirects back with an error param instead of a valid code/session.
function ResetPasswordScreen({ onDone, onPasswordSet }) {
  const T = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Check the URL for an error param (hash or query string) — this means
  // the recovery link was already used/expired before the person clicked it.
  const [linkError] = useState(() => {
    try {
      const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
      const search = new URLSearchParams(window.location.search || "");
      const desc = hash.get("error_description") || search.get("error_description");
      const code = hash.get("error_code") || search.get("error_code");
      if (desc || code) {
        return (desc || "").replace(/\+/g, " ") || code;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Wait for the recovery session to be fully established before showing the
  // form. The PKCE code exchange is async — if we let the user submit before
  // it completes, updateUser() finds no session and returns "Auth session missing!"
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  useEffect(() => {
    // Poll briefly — the exchange usually completes within a few hundred ms.
    let attempts = 0;
    const maxAttempts = 10; // 10 × 300ms = 3 seconds max wait
    const interval = setInterval(async () => {
      attempts++;
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        setSessionReady(true);
        setSessionChecked(true);
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        // Gave up — no session arrived. Show the "link expired" resend UI.
        setSessionReady(false);
        setSessionChecked(true);
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const [resendEmail, setResendEmail] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState("");

  async function handleResend() {
    if (!resendEmail) {
      setResendError("Enter your email address.");
      return;
    }
    setResendLoading(true);
    setResendError("");
    const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
      redirectTo: `${window.location.origin}/?type=recovery`,
    });
    setResendLoading(false);
    if (error) {
      setResendError(error.message);
    } else {
      setResendSent(true);
    }
  }

  async function handleReset() {
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password.length > 16) {
      setError("Password must be 16 characters or fewer.");
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      setError("Password must include at least one special character (e.g. !, @, #, $).");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      // Fire immediately so RCCShell clears isRecoveryRef before the SIGNED_IN
      // event arrives — letting onAuthStateChange load the profile and route the app.
      onPasswordSet?.();
      setTimeout(() => onDone?.(), 2000);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      padding: "0 24px", background: "#FDFAF6",
    }}>
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🌿</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, color: "#2D4A35", lineHeight: 1.1, marginBottom: 4 }}>
            {(linkError || (sessionChecked && !sessionReady)) ? "Link expired" : "Set new password"}
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#9A8878", margin: 0 }}>
            {(linkError || (sessionChecked && !sessionReady))
              ? "This reset link is no longer valid — it may have already been used, or your email app opened it before you clicked."
              : "Choose a new password for your account."}
          </p>
        </div>
        <div style={{ background: "#FFFFFF", borderRadius: 20, padding: "20px 18px", boxShadow: "0 4px 28px rgba(45,74,53,0.10)", border: "1px solid #E8DDD0" }}>
          {!sessionChecked ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#9A8878", margin: 0 }}>
                Verifying your reset link…
              </p>
            </div>
          ) : (linkError || !sessionReady) ? (
            resendSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#5C7A5E", margin: 0, lineHeight: 1.6 }}>
                  New reset email sent! Open it directly from your inbox — if your email app shows a "verify this link" preview, that's expected, but try to click the link itself only once.
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9A8878", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>Email *</div>
                  <input type="email" value={resendEmail} onChange={e => setResendEmail(e.target.value)}
                    style={{ width: "100%", padding: "11px 13px", borderRadius: 12, fontFamily: "inherit", fontSize: 13.5, background: "#FAF6F0", color: "#3A2E28", border: "1.5px solid #E8DDD0", outline: "none", boxSizing: "border-box" }}
                    onKeyDown={e => e.key === "Enter" && handleResend()}
                  />
                </div>
                {resendError && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{resendError}</div>}
                <button onClick={handleResend} disabled={resendLoading} style={{
                  width: "100%", padding: "13px", borderRadius: 12, border: "none",
                  background: "#5C7A5E", color: "white", fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, fontWeight: 600, cursor: resendLoading ? "not-allowed" : "pointer",
                  opacity: resendLoading ? 0.7 : 1,
                }}>
                  {resendLoading ? "Sending…" : "Send new reset link →"}
                </button>
              </>
            )
          ) : done ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#5C7A5E", margin: 0 }}>
                Password updated! Signing you in…
              </p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9A8878", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>New Password *</div>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    style={{ width: "100%", padding: "11px 40px 11px 13px", borderRadius: 12, fontFamily: "inherit", fontSize: 13.5, background: "#FAF6F0", color: "#3A2E28", border: "1.5px solid #E8DDD0", outline: "none", boxSizing: "border-box" }}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, margin: 0, cursor: "pointer", display: "flex", alignItems: "center", color: "#9A8878", lineHeight: 0 }}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9A8878", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>Confirm Password *</div>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
                    style={{ width: "100%", padding: "11px 40px 11px 13px", borderRadius: 12, fontFamily: "inherit", fontSize: 13.5, background: "#FAF6F0", color: "#3A2E28", border: "1.5px solid #E8DDD0", outline: "none", boxSizing: "border-box" }}
                    onKeyDown={e => e.key === "Enter" && handleReset()}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, margin: 0, cursor: "pointer", display: "flex", alignItems: "center", color: "#9A8878", lineHeight: 0 }}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>
              {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{error}</div>}
              <button onClick={handleReset} disabled={loading} style={{
                width: "100%", padding: "13px", borderRadius: 12, border: "none",
                background: "#5C7A5E", color: "white", fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? "Updating…" : "Set new password →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PARENT HOME ─────────────────────────────────────────────────────────────

export { LoadingScreen, LoginScreen, PaymentPendingScreen, RegisterScreen, ChildInfoStep, ResetPasswordScreen };
