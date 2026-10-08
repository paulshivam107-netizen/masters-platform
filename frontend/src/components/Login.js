import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { forgotPasswordApi, resetPasswordApi } from "../api";
import {
  requestGoogleIdToken,
  resolveGoogleClientId,
} from "../app/googleIdentity";
import { trackEvent } from "../app/telemetry";
import "./Auth.css";
import { authError } from "../api/authErrors";

function Login({ onSwitchToSignup }) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [devToken, setDevToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await login(email, password);
      trackEvent("auth_login_success", { method: "password" });
    } catch (err) {
      setError(authError(err, "Login failed. Please try again."));
      trackEvent("auth_login_failure", { method: "password" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const clientId = await resolveGoogleClientId();
      if (!clientId) {
        setError(
          "Google sign-in is not configured yet. Please try email login for now.",
        );
        return;
      }
      const idToken = await requestGoogleIdToken(clientId);
      await loginWithGoogle(idToken);
      trackEvent("auth_login_success", { method: "google" });
    } catch (err) {
      setError(
        authError(
          err,
          typeof err.message === "string"
            ? err.message
            : "Google login failed.",
        ),
      );
      trackEvent("auth_login_failure", { method: "google" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");
    setDevToken("");
    if (!resetEmail) {
      setError("Enter your email to request password reset.");
      return;
    }
    setLoading(true);
    try {
      const response = await forgotPasswordApi(resetEmail);
      setMessage(
        response.message ||
          "If your email exists, reset instructions were sent.",
      );
      if (response.dev_token) {
        setDevToken(response.dev_token);
        setResetToken(response.dev_token);
      }
    } catch (err) {
      setError(authError(err, "Failed to start password reset."));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setMessage("");
    if (!resetToken || !newPassword) {
      setError("Provide reset token and new password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await resetPasswordApi(resetToken, newPassword);
      setMessage(response.message || "Password reset complete. Please log in.");
      setShowResetPanel(false);
      setResetToken("");
      setNewPassword("");
      setConfirmNewPassword("");
      setDevToken("");
    } catch (err) {
      setError(authError(err, "Failed to reset password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 data-testid="auth-login-heading">Welcome back.</h2>
        <p className="auth-subtitle">
          Your applications and your next step are right here.
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
            <label htmlFor="login-field-1">Email</label>
            <input
              id="login-field-1"
              data-testid="auth-login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-field-2">Password</label>
            <input
              id="login-field-2"
              data-testid="auth-login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            data-testid="auth-login-submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <button
            type="button"
            className="auth-button auth-button-google"
            disabled={loading}
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </button>
        </form>

        <div className="auth-inline-actions">
          <button
            type="button"
            data-testid="auth-toggle-reset-panel"
            className="link-button"
            onClick={() => setShowResetPanel((prev) => !prev)}
          >
            {showResetPanel ? "Hide password reset" : "Forgot password?"}
          </button>
        </div>

        {showResetPanel && (
          <div className="auth-reset-panel">
            <div className="form-group">
              <label htmlFor="login-field-3">Reset Email</label>
              <input
                id="login-field-3"
                type="email"
                autoComplete="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <button
              type="button"
              className="auth-button auth-button-secondary"
              disabled={loading}
              onClick={handleForgotPassword}
            >
              Send Reset Link
            </button>

            <div className="form-group">
              <label htmlFor="login-field-4">Reset Token</label>
              <input
                id="login-field-4"
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Paste token from email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-field-5">New Password</label>
              <input
                id="login-field-5"
                type="password"
                autoComplete="current-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-field-6">Confirm New Password</label>
              <input
                id="login-field-6"
                type="password"
                autoComplete="current-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button
              type="button"
              className="auth-button"
              disabled={loading}
              onClick={handleResetPassword}
            >
              Update Password
            </button>
          </div>
        )}

        <p className="auth-switch">
          Don't have an account?{" "}
          <button
            type="button"
            data-testid="auth-go-signup"
            onClick={onSwitchToSignup}
            className="link-button"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
