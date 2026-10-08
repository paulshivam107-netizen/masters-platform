import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  getCurrentUserApi,
  loginApi,
  loginWithGoogleApi,
  logoutApi,
  refreshTokenApi,
  setAuthToken,
  signupApi,
  updateProfileApi,
  installSessionRecovery,
} from "../api";

const AuthContext = createContext(null);
const readSessionValue = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeSessionValue = (key, value) => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Restricted browser storage still permits a session in this open tab.
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => readSessionValue("token"));
  const [refreshToken, setRefreshToken] = useState(() =>
    readSessionValue("refresh_token"),
  );
  const [loading, setLoading] = useState(true);
  const refreshRef = useRef(refreshToken);
  const sessionVersion = useRef(0);

  const clearSession = useCallback(() => {
    sessionVersion.current += 1;
    refreshRef.current = null;
    writeSessionValue("token", null);
    writeSessionValue("refresh_token", null);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setAuthToken(null, { newSession: true });
  }, []);

  const refreshSession = useCallback(async () => {
    if (!refreshRef.current) {
      clearSession();
      return false;
    }
    const version = sessionVersion.current;
    try {
      const {
        access_token,
        refresh_token,
        user: userData,
      } = await refreshTokenApi(refreshRef.current);
      if (version !== sessionVersion.current) return false;
      refreshRef.current = refresh_token;
      writeSessionValue("token", access_token);
      writeSessionValue("refresh_token", refresh_token);
      setToken(access_token);
      setRefreshToken(refresh_token);
      setAuthToken(access_token);
      if (userData) setUser(userData);
      return true;
    } catch (error) {
      if (version === sessionVersion.current && error?.response?.status === 401)
        clearSession();
      return false;
    }
  }, [clearSession]);

  useEffect(() => installSessionRecovery(refreshSession), [refreshSession]);

  const fetchUserProfile = useCallback(async () => {
    const version = sessionVersion.current;
    try {
      const data = await getCurrentUserApi();
      if (version === sessionVersion.current) setUser(data);
    } catch (error) {
      if (version === sessionVersion.current) clearSession();
    } finally {
      if (version === sessionVersion.current || !refreshRef.current)
        setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token, fetchUserProfile]);

  const login = async (email, password) => {
    const {
      access_token,
      refresh_token,
      user: userData,
    } = await loginApi(email, password);
    sessionVersion.current += 1;
    refreshRef.current = refresh_token;
    writeSessionValue("token", access_token);
    writeSessionValue("refresh_token", refresh_token);
    setToken(access_token);
    setRefreshToken(refresh_token);
    setUser(userData);
    setAuthToken(access_token, { newSession: true });
    return userData;
  };

  const loginWithGoogle = async (idToken) => {
    const {
      access_token,
      refresh_token,
      user: userData,
    } = await loginWithGoogleApi(idToken);
    sessionVersion.current += 1;
    refreshRef.current = refresh_token;
    writeSessionValue("token", access_token);
    writeSessionValue("refresh_token", refresh_token);
    setToken(access_token);
    setRefreshToken(refresh_token);
    setUser(userData);
    setAuthToken(access_token, { newSession: true });
    return userData;
  };

  const signup = async (email, name, password) => {
    const {
      access_token,
      refresh_token,
      user: userData,
    } = await signupApi(email, name, password);
    sessionVersion.current += 1;
    refreshRef.current = refresh_token;
    writeSessionValue("token", access_token);
    writeSessionValue("refresh_token", refresh_token);
    setToken(access_token);
    setRefreshToken(refresh_token);
    setUser(userData);
    setAuthToken(access_token, { newSession: true });
    return userData;
  };

  const logout = async () => {
    try {
      if (token) {
        await logoutApi(refreshToken, false);
      }
    } catch (error) {
      // Ignore logout API failures, always clear local session.
      console.warn(
        "Sign-out could not reach the server; the local session was cleared.",
      );
    } finally {
      clearSession();
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
