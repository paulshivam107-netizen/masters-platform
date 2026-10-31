import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  loginApi,
  loginWithGoogleApi,
  logoutApi,
  refreshTokenApi,
  setAuthToken,
  signupApi,
  updateProfileApi,
  installSessionRecovery,
} from "../api";
import { clearTryHandoff } from "../app/tryHandoff";

/*
 * Session model (see backend/services/sessions.py):
 * - The 15-minute access token is held in memory only (api/client.js).
 * - The refresh token is an HttpOnly cookie the page cannot read; POST /auth/refresh
 *   rotates it and returns a fresh access token. A page load restores the session that way.
 * - Tabs share the cookie. Refreshes are serialised across tabs with the Web Locks API
 *   (where available); a "refresh_superseded" reply means another tab rotated first, so we
 *   retry once with the cookie that tab received.
 * - Login/logout in one tab is broadcast so other tabs follow instead of acting as a
 *   different user than the one in the cookie.
 */

const AuthContext = createContext(null);
const LEGACY_KEYS = ["token", "refresh_token"];
const CHANNEL = "masters-auth";
const LOCK = "masters-auth-refresh";

const takeLegacyRefreshToken = () => {
  try {
    const value = localStorage.getItem("refresh_token");
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    return value;
  } catch {
    return null;
  }
};

const withRefreshLock = (fn) =>
  typeof navigator !== "undefined" && navigator.locks?.request
    ? navigator.locks.request(LOCK, fn)
    : fn();

const openChannel = () => {
  try {
    return typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(CHANNEL);
  } catch {
    return null;
  }
};

const isSuperseded = (error) =>
  error?.response?.status === 409 &&
  error?.response?.data?.detail?.code === "refresh_superseded";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(null);
  const sessionVersion = useRef(0);
  const channelRef = useRef(null);

  const announce = useCallback((type, userId = null) => {
    try {
      channelRef.current?.postMessage({ type, userId });
    } catch {
      // Cross-tab sync is best effort.
    }
  }, []);

  const clearSession = useCallback(() => {
    sessionVersion.current += 1;
    userIdRef.current = null;
    setUser(null);
    setAuthToken(null, { newSession: true });
  }, []);

  const acceptSession = useCallback(({ access_token, user: userData }) => {
    // A different account than this tab knew about: start a new client session so no queued
    // request from the previous account is replayed under the new identity.
    const switched = userIdRef.current !== (userData?.id ?? null);
    if (switched) sessionVersion.current += 1;
    userIdRef.current = userData?.id ?? null;
    setAuthToken(access_token, { newSession: switched });
    setUser(userData);
  }, []);

  const refreshSession = useCallback(
    async ({ legacyToken = null } = {}) => {
      const version = sessionVersion.current;
      const attempt = () => refreshTokenApi(legacyToken);
      try {
        let data;
        try {
          data = await withRefreshLock(attempt);
        } catch (error) {
          if (!isSuperseded(error)) throw error;
          await new Promise((resolve) => setTimeout(resolve, 150));
          data = await withRefreshLock(attempt);
        }
        if (version !== sessionVersion.current) return false;
        acceptSession(data);
        return true;
      } catch (error) {
        const status = error?.response?.status;
        if (
          version === sessionVersion.current &&
          (status === 401 || status === 403)
        )
          clearSession();
        return false;
      }
    },
    [acceptSession, clearSession],
  );

  useEffect(
    () => installSessionRecovery(() => refreshSession()),
    [refreshSession],
  );

  // Restore the session on page load from the cookie (or migrate an old stored token once).
  useEffect(() => {
    let active = true;
    const legacyToken = takeLegacyRefreshToken();
    refreshSession({ legacyToken }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refreshSession]);

  // Follow sign-in/sign-out performed in other tabs.
  useEffect(() => {
    const channel = openChannel();
    channelRef.current = channel;
    if (!channel) return undefined;
    channel.onmessage = ({ data }) => {
      if (data?.type === "logout") clearSession();
      else if (data?.type === "login" && data.userId !== userIdRef.current)
        refreshSession();
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [clearSession, refreshSession]);

  const startSession = (data) => {
    sessionVersion.current += 1;
    userIdRef.current = null;
    acceptSession(data);
    announce("login", data?.user?.id ?? null);
    return data.user;
  };

  const login = async (email, password) =>
    startSession(await loginApi(email, password));

  const loginWithGoogle = async (idToken) =>
    startSession(await loginWithGoogleApi(idToken));

  const signup = async (email, name, password) =>
    startSession(await signupApi(email, name, password));

  const logout = async ({ allSessions = false } = {}) => {
    try {
      await logoutApi(allSessions);
    } catch (error) {
      // The server also clears the cookie; if it is unreachable the access token still
      // expires within minutes.
      console.warn(
        "Sign-out could not reach the server; the local session was cleared.",
      );
    } finally {
      clearSession();
      clearTryHandoff(); // a saved try belongs to the person who made it, not the next one on this device
      announce("logout");
    }
  };

  const updateProfile = async (payload) => {
    const data = await updateProfileApi(payload);
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        loginWithGoogle,
        updateProfile,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
