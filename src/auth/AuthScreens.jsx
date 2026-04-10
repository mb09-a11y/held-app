import { useState } from "react";
import { useT, Card, Btn, Input, font, serif } from "../core/shared.jsx";
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
      redirectTo: window.location.origin,
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
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 12, fontFamily: "inherit", fontSize: 13.5, background: "#FAF6F0", color: "#3A2E28", border: "1.5px solid #E8DDD0", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "#5C7A5E"}
              onBlur={e => e.target.style.borderColor = "#E8DDD0"}
            />
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

          {error && <div style={{ fontSize: 12.5, color: "#C07070", marginBottom: 10 }}>{error}</div>}

          <Btn onClick={submitAccount} disabled={loading}>
            {loading ? "Creating account…" : "Continue →"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}


function ChildInfoStep({ onSave, loading }) {
  const T = useT();
  const [child, setChild] = useState({
    name: "",
    dob: "",
    weight_lbs: "",
    weight_oz: "",
  });
  const [error, setError] = useState("");

  async function submit() {
    if (!child.name || !child.dob) {
      setError("Child name and date of birth are required.");
      return;
    }

    setError("");

    try {
      await onSave(child);
    } catch (e) {
      setError(e.message || "Unable to save child info.");
    }
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

        <Card>
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
      </div>
    </div>
  );
}

// ─── PARENT HOME ─────────────────────────────────────────────────────────────

export { LoadingScreen, LoginScreen, PaymentPendingScreen, RegisterScreen, ChildInfoStep };
