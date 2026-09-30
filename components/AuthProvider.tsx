"use client";

import { apiRequest, type AccountUser, type AuthResponse } from "@/lib/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AuthContextValue {
  user: AccountUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AccountUser>;
  register: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    dateOfBirth: string;
    guardianEmail?: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    schoolId?: string;
    schoolName?: string;
    schoolCity?: string;
    schoolState?: string;
    schoolKind?: "k12" | "college";
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const payload = await apiRequest<{ user: AccountUser }>("/auth/me");
      setUser(payload.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const payload = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!payload.user) {
      throw { error: "Log in to continue." };
    }
    setUser(payload.user);
    return payload.user;
  }, []);

  const register = useCallback(
    async (input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      confirmPassword: string;
      dateOfBirth: string;
      guardianEmail?: string;
      phone: string;
      streetAddress: string;
      city: string;
      state: string;
      postalCode: string;
      schoolId?: string;
      schoolName?: string;
      schoolCity?: string;
      schoolState?: string;
      schoolKind?: "k12" | "college";
    }) => {
      const payload = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setUser(payload.user);
      return payload;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {
      // Clear the local session even if the network call fails.
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
