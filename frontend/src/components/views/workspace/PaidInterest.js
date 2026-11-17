import React, { useState } from "react";
import { trackEvent } from "../../../app/telemetry";
import { readUserValue, writeUserValue } from "../../../app/workspaceStorage";

// Measures interest before any price exists. Nothing is charged and no price is shown.
export default function PaidInterest({ userId }) {
  const [said, setSaid] = useState(() =>
    readUserValue(userId, "paid_interest", false),
  );
  const click = () => {
    trackEvent("paid_interest_clicked");
    writeUserValue(userId, "paid_interest", true);
    setSaid(true);
  };
  return (
    <div className="studio-share" aria-live="polite">
      {said ? (
        <p>
          Thanks, that helps.{" "}
          <a href="/app/settings#wac-feedback">Tell us what you would want</a>{" "}
          from paid plans.
        </p>
      ) : (
        <>
          <p>Paid plans are coming. Would you pay for more practice?</p>
          <button
            type="button"
            className="ws-btn ws-btn--ghost"
            onClick={click}
          >
            I'd pay for this
          </button>
        </>
      )}
    </div>
  );
}
