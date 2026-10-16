import React, { useEffect, useRef, useState } from "react";
import {
  renderGoogleButton,
  resolveGoogleClientId,
  waitForGoogleIdentity,
} from "../app/googleIdentity";

// Google's button accepts a pixel width between 200 and 400.
const clampWidth = (width) => Math.max(200, Math.min(400, Math.round(width || 320)));
const currentTheme = () =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "filled_black" : "outline";

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
    let observer = null;
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
        const render = () =>
          renderGoogleButton(googleIdentity, clientId, containerRef.current, {
            text,
            theme: currentTheme(),
            width: clampWidth(slotRef.current?.offsetWidth),
            onCredential: (credential) => handlerRef.current(credential),
          });
        render();
        // Follow the site's light/dark toggle.
        observer = new MutationObserver(render);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        setStatus("ready");
      } catch (err) {
        if (!active) return;
        setStatus("failed");
        if (errorRef.current) errorRef.current(err);
      }
    })();
    return () => {
      active = false;
      if (observer) observer.disconnect();
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
