import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchMe, logout as apiLogout } from "@/lib/api";

const AuthCtx = createContext(null);
const GATE_KEY = "sweatboard.gate";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gatePassed, setGatePassed] = useState(
    () => localStorage.getItem(GATE_KEY) === "true"
  );

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const { user } = await fetchMe();
      setUser(user);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    // Skip /me on OAuth callback — AuthCallback will exchange the session_id first.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const passGate = () => {
    localStorage.setItem(GATE_KEY, "true");
    setGatePassed(true);
  };

  const resetGate = () => {
    localStorage.removeItem(GATE_KEY);
    setGatePassed(false);
  };

  const signOut = async () => {
    try {
      await apiLogout();
    } catch (e) {
      // ignore
    }
    setUser(null);
    resetGate();
  };

  return (
    <AuthCtx.Provider
      value={{ user, setUser, loading, gatePassed, passGate, resetGate, signOut, checkAuth }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
