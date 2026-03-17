"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type AuthUser = {
  id: string | null;
  email: string | null;
  playback_speed: number;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => void;
  updatePlaybackSpeed: (speed: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  logout: () => {},
  updatePlaybackSpeed: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      setUser(data);
    } catch {
      setUser({ id: null, email: null, playback_speed: 1 });
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchUser().finally(() => setLoading(false));
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .then(() => {
        setUser({ id: null, email: null, playback_speed: 1 });
        window.location.reload();
      })
      .catch(console.error);
  }, []);

  const updatePlaybackSpeed = useCallback(async (speed: number) => {
    setUser((prev) => prev ? { ...prev, playback_speed: speed } : prev);
    try {
      await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ playback_speed: speed }),
      });
    } catch {
      // Revert on failure
      await fetchUser();
    }
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout, updatePlaybackSpeed }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
