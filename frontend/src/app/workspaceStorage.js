// Workspace notes belong to an account. Never infer ownership of legacy shared keys.
export const workspaceKey = (userId, key) =>
  userId == null ? null : `masters:user:${userId}:${key}`;

export function readStoredValue(key, fallback) {
  try {
    const raw = key && localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function readUserValue(userId, key, fallback) {
  const value = readStoredValue(workspaceKey(userId, key), fallback);
  if (
    fallback &&
    typeof fallback === "object" &&
    (value == null || typeof value !== "object" || Array.isArray(value))
  )
    return fallback;
  return value;
}

export function writeUserValue(userId, key, value) {
  const scopedKey = workspaceKey(userId, key);
  if (!scopedKey) return false;
  try {
    if (value == null) localStorage.removeItem(scopedKey);
    else localStorage.setItem(scopedKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
