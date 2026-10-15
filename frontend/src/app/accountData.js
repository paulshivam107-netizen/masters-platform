// Browser-side half of "Download my data" / "Delete my account" (R06).
// Notes, drafts and preferences for an account live under masters:user:<id>:* in localStorage.

const prefixFor = (userId) =>
  userId == null ? null : `masters:user:${userId}:`;

function userKeys(userId) {
  const prefix = prefixFor(userId);
  if (!prefix) return [];
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

export function collectUserBrowserData(userId) {
  const prefix = prefixFor(userId);
  const out = {};
  userKeys(userId).forEach((key) => {
    let value;
    try {
      const raw = localStorage.getItem(key);
      try {
        value = JSON.parse(raw);
      } catch {
        value = raw;
      }
    } catch {
      return;
    }
    out[key.slice(prefix.length)] = value;
  });
  return out;
}

export function clearUserBrowserData(userId) {
  const keys = userKeys(userId);
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage unavailable: nothing more we can do from here.
    }
  });
  return keys.length;
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
