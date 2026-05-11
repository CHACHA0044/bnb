"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { adminVerifySecret } from "@/lib/api";

export function useAdminAuth() {
  const [secret, setSecret] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("bnb_admin_secret");
    }
    return true;
  });
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    localStorage.removeItem("bnb_admin_secret");
    setAuthenticated(false);
    setSecret(null);
    router.push("/admin"); // Redirect to dashboard/login
  }, [router]);

  const verify = useCallback(async (token: string) => {
    try {
      await adminVerifySecret(token);
      setSecret(token);
      setAuthenticated(true);
      return true;
    } catch (err) {
      localStorage.removeItem("bnb_admin_secret");
      setAuthenticated(false);
      setSecret(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("bnb_admin_secret");
    if (saved) {
      verify(saved);
    } else {
      setLoading(false);
    }
  }, [verify]);

  return { secret, authenticated, loading, logout, setSecret, setAuthenticated };
}
