import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Login from '../Login';
import Signup from '../Signup';
import './PublicPages.css';

function parseMode(value) {
  return value === 'signup' ? 'signup' : 'login';
}

function normalizeNext(value) {
  if (!value || typeof value !== 'string') return '/app';
  if (!value.startsWith('/')) return '/app';
  if (value.startsWith('//')) return '/app';
  return value;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const mode = parseMode(searchParams.get('mode'));
  const next = normalizeNext(searchParams.get('next'));
  const nextHint = next === '/app'
    ? 'After login, you will go to your workspace.'
    : `After login, you will continue to ${next}.`;

  React.useEffect(() => {
    document.body.classList.add('dark-body', 'public-body');
    return () => {
      document.body.classList.remove('public-body');
    };
  }, []);

  React.useEffect(() => {
    if (!loading && user) {
      navigate(next, { replace: true });
    }
  }, [loading, user, navigate, next]);

  const setMode = React.useCallback(
    (nextMode) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('mode', nextMode);
      if (!nextParams.get('next')) {
        nextParams.set('next', '/app');
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="public-auth-layout">
      <div className="public-auth-topbar">
        <Link className="public-link-btn" to="/">Back to Home</Link>
        <span className="public-auth-next">{nextHint}</span>
      </div>
      <div className="public-auth-shell">
        {mode === 'login' ? (
          <Login
            onSwitchToSignup={() => setMode('signup')}
          />
        ) : (
          <Signup
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
}
