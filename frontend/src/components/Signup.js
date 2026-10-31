import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { requestEmailVerificationApi } from "../api";
import GoogleSignInButton from "./GoogleSignInButton";
import { trackEvent } from "../app/telemetry";
import "./Auth.css";
import "./public/AuthPages.css";
import { authError } from "../api/authErrors";

function Signup({ onSwitchToLogin }) {
  const { signup, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");


    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await signup(email, name, password);
      // Best effort: the workspace banner offers a resend, nothing waits on it.
      requestEmailVerificationApi(email).catch(() => {});
      trackEvent("auth_signup_success", { method: "password" });
    } catch (err) {
      setError(authError(err, "Signup failed. Please try again."));
      trackEvent("auth_signup_failure", { method: "password" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async (idToken) => {
    setError("");
    if (!idToken) {
      setError("Google did not return a sign-in token. Please try again.");
      trackEvent("auth_signup_failure", { method: "google" });
      return;
    }
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
      trackEvent("auth_signup_success", { method: "google" });
    } catch (err) {
      setError(
        authError(
          err,
          typeof err.message === "string"
            ? err.message
            : "Google signup failed.",
        ),
      );
      trackEvent("auth_signup_failure", { method: "google" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <p className="ap-eyebrow">
          <span aria-hidden="true" />
          Create your account
        </p>
        <h1 data-testid="auth-signup-heading">Start your next chapter.</h1>
        <p className="auth-subtitle">
          Free to use right now. Add your résumé and run your first mock
          interview in a few minutes.
        </p>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <GoogleSignInButton
          onCredential={handleGoogleSignup}
          onError={(err) => setError(err.message)}
          disabled={loading}
          text="signup_with"
        />
        <div className="ap-divider" aria-hidden="true">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="signup-field-1">Full Name</label>
            <input
              id="signup-field-1"
              data-testid="auth-signup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-field-2">Email</label>
            <input
              id="signup-field-2"
              data-testid="auth-signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-field-3">Password</label>
            <div className="password-field">
              <input
                id="signup-field-3"
                data-testid="auth-signup-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="signup-password-hint"
                required
              />
              <button
                type="button"
                className="password-toggle"
                data-testid="auth-signup-toggle-password"
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <small id="signup-password-hint">At least 8 characters.</small>
          </div>

          <button
            type="submit"
            data-testid="auth-signup-submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>
        <p className="ap-help ap-legal">
          By creating an account you agree to how we handle your data in the{" "}
          <a href="/privacy">privacy notice</a>.
        </p>

        <p className="auth-switch">
          Already have an account?{" "}
          <button
            type="button"
            data-testid="auth-go-login"
            onClick={onSwitchToLogin}
            className="link-button"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

export default Signup;
