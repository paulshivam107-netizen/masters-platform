import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Login from "../Login";
import Signup from "../Signup";
import "./PublicPages.css";
import Brand from "../common/Brand";
import ThemeToggle from "../common/ThemeToggle";
import JourneyArtwork from "../common/JourneyArtwork";

function parseMode(value) {
  return value === "signup" ? "signup" : "login";
}

function normalizeNext(value) {
  if (!value || typeof value !== "string") return "/app";
  if (!value.startsWith("/")) return "/app";
  if (value.startsWith("//")) return "/app";
  return value;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const mode = parseMode(searchParams.get("mode"));
  const next = normalizeNext(searchParams.get("next"));
  const nextHint = "Continue to your workspace after signing in.";

  React.useEffect(() => {
    if (!loading && user) {
      navigate(next, { replace: true });
    }
  }, [loading, user, navigate, next]);

  const setMode = React.useCallback(
    (nextMode) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("mode", nextMode);
      if (!nextParams.get("next")) {
        nextParams.set("next", "/app");
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="public-auth-layout">
      <header className="public-auth-topbar">
        <Brand />
        <div className="public-nav">
          <Link className="public-nav-link" to="/">
            Back to home
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="auth-split-layout">
        <aside className="auth-story">
          <span className="eyebrow">MAKE SPACE FOR YOUR AMBITION</span>
          <h1>
            Your next chapter.
            <br />
            All in one place.
          </h1>
          <p>
            A calmer way to organise your applications, shape your story and
            prepare for what comes next.
          </p>
          <JourneyArtwork />
          <span className="auth-story-foot">
            Small steps. Meaningful progress.
          </span>
        </aside>
        <div className="public-auth-shell">
          {mode === "login" ? (
            <Login onSwitchToSignup={() => setMode("signup")} />
          ) : (
            <Signup onSwitchToLogin={() => setMode("login")} />
          )}
          <p className="auth-next-hint">{nextHint}</p>
        </div>
      </div>
    </div>
  );
}
