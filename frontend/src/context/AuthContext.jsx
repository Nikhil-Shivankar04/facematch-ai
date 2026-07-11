import { createContext, useContext, useState, useCallback } from "react";
import apiClient from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("nikk_token"));
  const [checkingAuth, setCheckingAuth] = useState(true);

  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.post("/auth/login", { email, password });
    localStorage.setItem("nikk_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("nikk_token");
    setToken(null);
    setUser(null);
  }, []);

  // On app load, if a token exists in storage, verify it's still valid
  // by fetching the current user - this covers the case where someone
  // reopens the app days later with an expired token sitting around.
  const verifySession = useCallback(async () => {
    const storedToken = localStorage.getItem("nikk_token");
    if (!storedToken) {
      setCheckingAuth(false);
      return;
    }
    try {
      const { data } = await apiClient.get("/auth/me");
      setUser(data.user);
      setToken(storedToken);
    } catch {
      localStorage.removeItem("nikk_token");
      setToken(null);
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, verifySession, checkingAuth, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
