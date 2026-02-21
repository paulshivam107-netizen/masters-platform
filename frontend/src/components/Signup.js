import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { requestEmailVerificationApi } from '../api';
import { requestGoogleIdToken, resolveGoogleClientId } from '../app/googleIdentity';
import { MoonIcon, SunIcon } from '../app/icons';
import { trackEvent } from '../app/telemetry';
import './Auth.css';

function Signup({ onSwitchToLogin }) {
  const { signup, loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setDevToken('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(email, name, password);
      const verifyResponse = await requestEmailVerificationApi(email);
      setMessage(verifyResponse.message || 'Verification email sent.');
      if (verifyResponse.dev_token) setDevToken(verifyResponse.dev_token);
      trackEvent('auth_signup_success', { method: 'password' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
      trackEvent('auth_signup_failure', { method: 'password' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setMessage('');
    setDevToken('');
    setLoading(true);
    try {
      const clientId = await resolveGoogleClientId();
      if (!clientId) {
        setError('Google sign-in is not configured yet. Please use email signup for now.');
        return;
      }
      const idToken = await requestGoogleIdToken(clientId);
      await loginWithGoogle(idToken);
      trackEvent('auth_signup_success', { method: 'google' });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Google signup failed.');
      trackEvent('auth_signup_failure', { method: 'google' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 data-testid="auth-signup-heading">Create Account</h2>
        <p className="auth-subtitle">Start getting AI-powered essay reviews</p>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}
        {devToken && <div className="success-message">Dev token: {devToken}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              data-testid="auth-signup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              data-testid="auth-signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              data-testid="auth-signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              data-testid="auth-signup-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" data-testid="auth-signup-submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
          <button type="button" className="auth-button auth-button-google" disabled={loading} onClick={handleGoogleSignup}>
            Continue with Google
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" data-testid="auth-go-login" onClick={onSwitchToLogin} className="link-button">
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

export default Signup;
