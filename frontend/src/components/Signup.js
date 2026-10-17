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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devToken, setDevToken] = useState("");
  const [loading, setLoading] = useState(false);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevToken("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await signup(email, name, password);
      const verifyResponse = await requestEmailVerificationApi(email);
      setMessage(verifyResponse.message || "Verification email sent.");
      if (verifyResponse.dev_token) setDevToken(verifyResponse.dev_token);
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
    setMessage("");
    setDevToken("");
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
          Free during the pilot. Add your résumé and run your first mock
          interview in a few minutes.
        </p>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="success-message" role="status">
            {message}
          </div>
        )}
        {devToken && (
          <div className="success-message" role="status">
            Dev token: {devToken}
          </div>
        )}

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
            <input
              id="signup-field-3"
              data-testid="auth-signup-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-describedby="signup-password-hint"
              required
            />
            <small id="signup-password-hint">At least 8 characters.</small>
          </div>

          <div className="form-group">
            <label htmlFor="signup-field-4">Confirm Password</label>
            <input
              id="signup-field-4"
              data-testid="auth-signup-confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              aria-invalid={mismatch ? "true" : undefined}
              aria-describedby={mismatch ? "signup-confirm-hint" : undefined}
              required
            />
            {mismatch && (
              <small id="signup-confirm-hint" className="ap-field-error">
                The two passwords don't match yet.
              </small>
            )}
          </div>

          <button
            type="submit"
            data-testid="auth-signup-submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
          <div className="ap-divider" aria-hidden="true">
            <span>or</span>
          </div>
          <GoogleSignInButton
            onCredential={handleGoogleSignup}
            onError={(err) => setError(err.message)}
            disabled={loading}
            text="signup_with"
          />
        </form>

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
