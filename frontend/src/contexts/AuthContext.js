import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import {
  getCurrentUserApi,
  loginApi,
  loginWithGoogleApi,
  logoutApi,
  refreshTokenApi,
  setAuthToken,
  signupApi,
  updateProfileApi
} from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'));
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setAuthToken(null);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!refreshToken) return false;
    try {
      const { access_token, refresh_token, user: userData } = await refreshTokenApi(refreshToken);
      localStorage.setItem('token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setToken(access_token);
      setRefreshToken(refresh_token);
      setAuthToken(access_token);
      if (userData) setUser(userData);
      return true;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      clearSession();
      return false;
    }
  }, [refreshToken, clearSession]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const data = await getCurrentUserApi();
      setUser(data);
    } catch (error) {
      if (error?.response?.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) {
          const data = await getCurrentUserApi();
          setUser(data);
        } else {
          clearSession();
        }
      } else {
        console.error('Failed to fetch user profile:', error);
        clearSession();
      }
    } finally {
      setLoading(false);
    }
  }, [refreshSession, clearSession]);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token, fetchUserProfile]);

  const login = async (email, password) => {
    const { access_token, refresh_token, user: userData } = await loginApi(email, password);
    localStorage.setItem('token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    setToken(access_token);
    setRefreshToken(refresh_token);
    setUser(userData);
    setAuthToken(access_token);
    return userData;
  };

  const loginWithGoogle = async (idToken) => {
    const { access_token, refresh_token, user: userData } = await loginWithGoogleApi(idToken);
    localStorage.setItem('token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    setToken(access_token);
    setRefreshToken(refresh_token);
    setUser(userData);
    setAuthToken(access_token);
    return userData;
  };

  const signup = async (email, name, password) => {
    const { access_token, refresh_token, user: userData } = await signupApi(email, name, password);
    localStorage.setItem('token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    setToken(access_token);
    setRefreshToken(refresh_token);
    setUser(userData);
    setAuthToken(access_token);
    return userData;
  };

  const logout = async () => {
    try {
      if (token) {
        await logoutApi(refreshToken, false);
      }
    } catch (error) {
      // Ignore logout API failures, always clear local session.
      console.warn('Logout API call failed:', error);
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
    <AuthContext.Provider value={{
      user,
      login,
      signup,
      loginWithGoogle,
      updateProfile,
      logout,
      loading,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
