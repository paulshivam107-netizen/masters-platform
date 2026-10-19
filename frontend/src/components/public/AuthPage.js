import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Login from "../Login";
import Signup from "../Signup";
import "./PublicPages.css";
import "./AuthPages.css";
import SiteHeader from "./SiteHeader";
import AuthPanel from "./AuthPanel";

function parseMode(value) {
  return value === "signup" ? "signup" : "login";
}

function normalizeNext(value) {
  if (!value || typeof value !== "string") return "/app/interviews";
  if (!value.startsWith("/")) return "/app/interviews";
  if (value.startsWith("//")) return "/app/interviews";
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
        nextParams.set("next", "/app/interviews");
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="ap-page">
      <SiteHeader current="signin" />
      <main className="ap-layout">
        <div className="ap-formcol">
          {mode === "login" ? (
            <Login onSwitchToSignup={() => setMode("signup")} />
          ) : (
            <Signup onSwitchToLogin={() => setMode("login")} />
          )}
          <p className="ap-next-hint">{nextHint}</p>
        </div>
        <AuthPanel />
      </main>
    </div>
  );
}
