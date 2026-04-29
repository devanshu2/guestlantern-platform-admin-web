"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiRequest, isUnauthorized } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { PlatformAdminPrincipal, PlatformBootstrapResponse } from "@/lib/api/types";

type AuthState = {
  admin: PlatformAdminPrincipal | null;
  bootstrap: PlatformBootstrapResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [bootstrap, setBootstrap] = useState<PlatformBootstrapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<PlatformBootstrapResponse>("/api/auth/session");
      setBootstrap(data);
    } catch (err) {
      setBootstrap(null);
      if (isUnauthorized(err)) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthState = {
    admin: bootstrap?.current_admin ?? null,
    bootstrap,
    loading,
    error,
    reload: load
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
