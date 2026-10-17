import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Login from "../Login";
import Signup from "../Signup";
import "./PublicPages.css";
import SiteHeader from "./SiteHeader";
import InterviewPreview from "../common/InterviewPreview";

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
      <SiteHeader current="signin" />
      <div className="auth-split-layout">
        <aside className="auth-story">
          <span className="eyebrow">MOCK INTERVIEWS THAT LISTEN</span>
          <h1>
            Practise the interview
            <br />
            before it counts.
          </h1>
          <p>
            Questions drawn from your résumé, follow-ups drawn from your
            answers, and a debrief you can act on.
          </p>
          <InterviewPreview />
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
