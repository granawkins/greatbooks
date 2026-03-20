"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Tier } from "./tiers";

type AuthUser = {
  id: string | null;
  email: string | null;
  playback_speed: number;
  tier: Tier;
  audioUsedMs: number;
  audioLimitMs: number;
  creditsUsed: number;
  creditsLimit: number;
  tierExpiresAt: string | null;
  isAdmin: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  logout: () => void;
  updatePlaybackSpeed: (speed: number) => Promise<void>;
};

const ANONYMOUS_USER: AuthUser = {
  id: null, email: null, playback_speed: 1,
  tier: "anonymous", audioUsedMs: 0, audioLimitMs: 0,
  creditsUsed: 0, creditsLimit: 0, tierExpiresAt: null,
  isAdmin: false,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  refreshUsage: async () => {},
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
      // Convert -1 sentinel back to Infinity (JSON doesn't support Infinity)
      if (data.audioLimitMs === -1) data.audioLimitMs = Infinity;
      if (data.creditsLimit === -1) data.creditsLimit = Infinity;
      setUser(data);
    } catch {
      setUser(ANONYMOUS_USER);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchUser().finally(() => setLoading(false));
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const refreshUsage = useCallback(async () => {
    // Lightweight re-fetch to update usage numbers
    await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .then(() => {
        setUser(ANONYMOUS_USER);
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
    <AuthContext.Provider value={{ user, loading, refreshUser, refreshUsage, logout, updatePlaybackSpeed }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
