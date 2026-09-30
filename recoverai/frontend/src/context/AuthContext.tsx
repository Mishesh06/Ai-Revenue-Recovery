"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Finance Ops" | "Risk Reviewer" | "Merchant Owner";
  avatar?: string;
  merchantId?: string;
}

export const PRESET_USERS: AuthUser[] = [
  {
    id: "af12e2f8-443e-4585-9e95-a8bdcfc885c5",
    name: "Alex Vance",
    email: "admin@payrecover.io",
    role: "Admin",
    merchantId: "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
  },
  {
    id: "bf22e2f8-443e-4585-9e95-a8bdcfc885c6",
    name: "Elena Rostova",
    email: "finance@payrecover.io",
    role: "Finance Ops",
    merchantId: "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
  },
  {
    id: "cf33e2f8-443e-4585-9e95-a8bdcfc885c7",
    name: "Marcus Sterling",
    email: "risk@payrecover.io",
    role: "Risk Reviewer",
    merchantId: "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
  },
];

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchPersona: (role: AuthUser["role"]) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_TOKEN = "payrecover_auth_token";
const STORAGE_KEY_USER = "payrecover_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(PRESET_USERS[0]); // Default to Admin for seamless exploration
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load persisted session on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEY_USER);

      if (storedUser) {
        setUser(JSON.parse(storedUser));
        if (storedToken) setToken(storedToken);
      } else {
        // Persist default demo user so new visitors have zero-friction onboarding
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(PRESET_USERS[0]));
        setUser(PRESET_USERS[0]);
      }
    } catch {
      // Storage unavailable fallback
      setUser(PRESET_USERS[0]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      // Try backend API first
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const authedUser: AuthUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: email.includes("admin") ? "Admin" : "Merchant Owner",
          merchantId: "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
        };

        localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authedUser));
        setToken(data.access_token);
        setUser(authedUser);
        return { success: true };
      }

      // Check preset demo users if offline or credentials match demo
      const preset = PRESET_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (preset && (password === "password123" || password.length >= 6)) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(preset));
        localStorage.setItem(STORAGE_KEY_TOKEN, "demo_jwt_token_" + preset.id);
        setUser(preset);
        setToken("demo_jwt_token_" + preset.id);
        return { success: true };
      }

      // Generic error response from server
      let errMsg = "Invalid email or password";
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          errMsg = errJson.error.message;
        } else if (errJson?.detail) {
          errMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
        } else if (errJson?.message) {
          errMsg = errJson.message;
        }
      } catch {
        // no json
      }
      return { success: false, error: errMsg };
    } catch {
      // Network/offline fallback for demo users
      const preset = PRESET_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (preset) {
        setUser(preset);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(preset));
        return { success: true };
      }
      return { success: false, error: "Connection error. Please try demo credentials." };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const newUser: AuthUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: "Merchant Owner",
          merchantId: "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
        };

        localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
        setToken(data.access_token);
        setUser(newUser);
        return { success: true };
      }

      let errMsg = "Registration failed";
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          errMsg = errJson.error.message;
        } else if (errJson?.detail) {
          errMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
        } else if (errJson?.message) {
          errMsg = errJson.message;
        }
      } catch {
        // ignore
      }
      return { success: false, error: errMsg };
    } catch {
      // Offline fallback
      const newUser: AuthUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        name,
        email,
        role: "Merchant Owner",
        merchantId: "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
      };
      setUser(newUser);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
      return { success: true };
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
    } catch {
      // ignore
    }
    setUser(null);
    setToken(null);
    router.push("/login");
  }, [router]);

  const switchPersona = useCallback((role: AuthUser["role"]) => {
    const found = PRESET_USERS.find((u) => u.role === role) || PRESET_USERS[0];
    setUser(found);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(found));
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchPersona,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
