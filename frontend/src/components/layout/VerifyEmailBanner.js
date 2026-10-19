import React, { useState } from "react";
import { requestEmailVerificationApi } from "../../api";

// Reminder only: nothing in the app is gated on a verified email.
export default function VerifyEmailBanner({ user }) {
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);
  if (!user || user.email_verified !== false || dismissed) return null;

  const resend = async () => {
    try {
      await requestEmailVerificationApi(user.email);
      setSent(true);
    } catch {
      setSent(false);
    }
  };

  return (
    <div
      className="verify-banner"
      role="status"
      data-testid="verify-email-banner"
    >
      <span>
        {sent
          ? "Verification email sent. Check your inbox."
          : "Check your inbox to verify your email."}
      </span>
      {!sent && (
        <button type="button" onClick={resend}>
          Resend
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        ×
      </button>
    </div>
  );
}
