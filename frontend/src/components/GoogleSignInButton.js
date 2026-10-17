import React, { useEffect, useRef, useState } from "react";
import {
  renderGoogleButton,
  resolveGoogleClientId,
  waitForGoogleIdentity,
} from "../app/googleIdentity";

// Google's button accepts a pixel width between 200 and 400.
const clampWidth = (width) => Math.max(200, Math.min(400, Math.round(width || 320)));
// Google's white "outline" button in both themes: on dark pages it reads better than
// filled_black, whose white G tile looks like a stray square.
const BUTTON_THEME = "outline";

function GoogleSignInButton({ onCredential, onError, disabled = false, text = "continue_with" }) {
  const slotRef = useRef(null);
  const containerRef = useRef(null);
  const handlerRef = useRef(onCredential);
  const errorRef = useRef(onError);
  const [status, setStatus] = useState("loading");
  handlerRef.current = onCredential;
  errorRef.current = onError;

  useEffect(() => {
    let active = true;
    (async () => {
      const clientId = await resolveGoogleClientId();
      if (!active) return;
      if (!clientId) {
        setStatus("unconfigured");
        return;
      }
      try {
        const googleIdentity = await waitForGoogleIdentity();
        if (!active || !containerRef.current) return;
        renderGoogleButton(googleIdentity, clientId, containerRef.current, {
          text,
          theme: BUTTON_THEME,
          width: clampWidth(slotRef.current?.offsetWidth),
          onCredential: (credential) => handlerRef.current(credential),
        });
        setStatus("ready");
      } catch (err) {
        if (!active) return;
        setStatus("failed");
        if (errorRef.current) errorRef.current(err);
      }
    })();
    return () => {
      active = false;
    };
  }, [text]);

  if (status === "unconfigured") return null;
  return (
    <div
      ref={slotRef}
      className={`auth-google-slot${disabled ? " is-disabled" : ""}`}
      data-testid="auth-google-button"
      aria-busy={status === "loading"}
    >
      <div ref={containerRef} className="auth-google-frame" />
      {status === "failed" && (
        <p className="auth-google-note">Google sign-in could not load. Refresh, or use email for now.</p>
      )}
    </div>
  );
}

export default GoogleSignInButton;
