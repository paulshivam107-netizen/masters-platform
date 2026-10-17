import React from "react";
import { Link } from "react-router-dom";
import {
  forgotPasswordApi,
  requestEmailVerificationApi,
  resetPasswordApi,
  verifyEmailApi,
} from "../../api";
import { authError } from "../../api/authErrors";
import { trackEvent } from "../../app/telemetry";
import SiteHeader from "./SiteHeader";
import AuthPanel from "./AuthPanel";
import "../Auth.css";
import "./PublicPages.css";
import "./AuthPages.css";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Read the one-time token from an emailed link and remove it from the address bar.
 *
 * Links carry the token in the fragment (#token=...) so it never reaches servers,
 * logs or analytics. Older links used ?token=...; accept those too, then strip both
 * so the token is not left in history, bookmarks or later Referer headers.
 */
export function takeTokenFromLocation(win = window) {
  const { hash, search, pathname } = win.location;
  const fromHash = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  const query = new URLSearchParams(search);
  const fromQuery = query.get("token");
  const token = (fromHash || fromQuery || "").trim();
  if (fromHash || fromQuery) {
    query.delete("token");
    const rest = query.toString();
    win.history.replaceState(
      win.history.state,
      "",
      pathname + (rest ? `?${rest}` : ""),
    );
  }
  return token;
}

function AuthLinkLayout({ children }) {
  return (
    <div className="ap-page">
      <SiteHeader current="signin" />
      <main className="ap-layout">
        <div className="ap-formcol">
          <div className="auth-container">
            <div className="auth-box">{children}</div>
          </div>
        </div>
        <AuthPanel />
      </main>
    </div>
  );
}

function RequestNewLink({ kind }) {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response =
        kind === "verify"
          ? await requestEmailVerificationApi(email)
          : await forgotPasswordApi(email);
      setNotice(response.message || "Check your inbox for a new link.");
    } catch (err) {
      setError(
        authError(err, "We couldn't send a new link. Try again shortly."),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} data-testid="auth-link-request-new">
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="success-message" role="status">
          {notice}
        </div>
      )}
      <div className="form-group">
        <label htmlFor="auth-link-email">Email</label>
        <input
          id="auth-link-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
        />
      </div>
      <button type="submit" className="auth-button" disabled={busy}>
        {busy ? "Sending..." : "Send a new link"}
      </button>
    </form>
  );
}

export function VerifyEmailPage() {
  const [status, setStatus] = React.useState("checking");
  const [error, setError] = React.useState("");
  const started = React.useRef(false);

  React.useEffect(() => {
    // Guard against React StrictMode's double effect: the token is single-use.
    if (started.current) return;
    started.current = true;
    const token = takeTokenFromLocation();
    if (!token) {
      setStatus("invalid");
      return;
    }
    verifyEmailApi(token)
      .then(() => {
        setStatus("verified");
        trackEvent("auth_email_verified", {});
      })
      .catch((err) => {
        // 400 means the link itself is bad; anything else is a network/server problem.
        if (err?.response?.status !== 400) {
          setError(
            authError(err, "We couldn't check your link. Try again shortly."),
          );
        }
        setStatus("invalid");
      });
  }, []);

  return (
    <AuthLinkLayout>
      <p className="ap-eyebrow">
        <span aria-hidden="true" />
        Email verification
      </p>
      <h1 data-testid="auth-link-heading">Verify your email</h1>
      {status === "checking" && (
        <p className="auth-subtitle ap-checking" role="status">
          <span className="ap-spinner" aria-hidden="true" />
          Checking your link...
        </p>
      )}
      {status === "verified" && (
        <>
          <div className="success-message" role="status">
            Your email is verified.
          </div>
          <Link className="auth-button auth-link-button" to="/app">
            Continue to your workspace
          </Link>
        </>
      )}
      {status === "invalid" && (
        <>
          <div className="error-message" role="alert">
            {error ||
              "This verification link is invalid, already used or has expired."}
          </div>
          <p className="auth-subtitle">
            Enter your email and we'll send a fresh link.
          </p>
          <RequestNewLink kind="verify" />
        </>
      )}
    </AuthLinkLayout>
  );
}

export function ResetPasswordPage() {
  const [token] = React.useState(() => takeTokenFromLocation());
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [status, setStatus] = React.useState(token ? "ready" : "invalid");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await resetPasswordApi(token, password);
      setStatus("done");
      trackEvent("auth_password_reset", {});
    } catch (err) {
      if (err?.response?.status === 400) {
        setStatus("invalid");
      } else {
        setError(authError(err, "We couldn't reset your password. Try again."));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLinkLayout>
      <p className="ap-eyebrow">
        <span aria-hidden="true" />
        Password reset
      </p>
      <h1 data-testid="auth-link-heading">Choose a new password</h1>
      {status === "ready" && (
        <p className="auth-subtitle">
          Use at least {MIN_PASSWORD_LENGTH} characters. You will be signed out
          on your other devices.
        </p>
      )}
      {status === "ready" && (
        <form onSubmit={submit} data-testid="auth-reset-form">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="auth-reset-password">New password</label>
            <input
              id="auth-reset-password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="auth-reset-confirm">Confirm new password</label>
            <input
              id="auth-reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="auth-button" disabled={busy}>
            {busy ? "Saving..." : "Save new password"}
          </button>
        </form>
      )}
      {status === "done" && (
        <>
          <div className="success-message" role="status">
            Password updated. You've been signed out on other devices.
          </div>
          <Link className="auth-button auth-link-button" to="/auth?mode=login">
            Sign in
          </Link>
        </>
      )}
      {status === "invalid" && (
        <>
          <div className="error-message" role="alert">
            This reset link is invalid, already used or has expired.
          </div>
          <p className="auth-subtitle">
            Reset links work once and expire after 60 minutes. Request a new one
            below.
          </p>
          <RequestNewLink kind="reset" />
        </>
      )}
    </AuthLinkLayout>
  );
}
