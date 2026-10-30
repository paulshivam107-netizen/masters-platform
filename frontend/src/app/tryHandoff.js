// A signed-out visitor's "try one question" result, kept on this device for 24 hours so the first
// interview after sign-up can continue it. Nothing reaches the server until they press Continue.
// Every storage access is guarded: with storage blocked the page still works, there is just nothing to pick up.
const KEY = "mockmba:try_handoff";
const DAY_MS = 24 * 60 * 60 * 1000;

export function saveTryHandoff(handoff) {
  try {
    if (typeof handoff !== "string" || !handoff) return false;
    localStorage.setItem(KEY, JSON.stringify({ handoff, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function clearTryHandoff() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear when storage is blocked.
  }
}

// The token is `<base64url JSON>.<signature>`. The server checks the signature when it is used; the
// browser only reads the text back so the visitor can see exactly what will carry over.
function claimsOf(handoff) {
  const body = handoff.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(body + "=".repeat((4 - (body.length % 4)) % 4));
  const utf8 = Array.from(
    binary,
    (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
  ).join("");
  return JSON.parse(decodeURIComponent(utf8));
}

// {handoff, answer, followUp} while the saved try is usable, otherwise null. An expired or
// unreadable entry is removed so it does not linger.
export function readTryHandoff() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return null;
    const { handoff, savedAt } = JSON.parse(raw);
    const { answer, follow_up: followUp, exp } = claimsOf(handoff);
    const now = Date.now();
    if (
      typeof answer === "string" &&
      answer &&
      typeof followUp === "string" &&
      followUp &&
      now - savedAt < DAY_MS &&
      savedAt <= now + 60000 &&
      exp * 1000 > now
    )
      return { handoff, answer, followUp };
  } catch {
    // Malformed: fall through and clear it.
  }
  clearTryHandoff();
  return null;
}
