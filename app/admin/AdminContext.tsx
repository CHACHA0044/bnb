"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type SessionData, type RestaurantStatusData, adminFetchSessions, fetchRestaurantStatus } from "@/lib/api";
import { useSocket } from "@/lib/socket-client";

interface AdminContextType {
  sessions: SessionData[];
  setSessions: React.Dispatch<React.SetStateAction<SessionData[]>>;
  restaurantStatus: RestaurantStatusData;
  loadStats: () => Promise<void>;
  loading: boolean;
  secret: string | null;
  authenticated: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children, secret, authenticated }: { children: React.ReactNode, secret: string | null, authenticated: boolean }) {
  const { on } = useSocket();
  const [sessions, setSessions] = useState<SessionData[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("bnb_admin_sessions_cache");
      if (cached) {
        try { return JSON.parse(cached); } catch (e) {}
      }
    }
    return [];
  });
  const [restaurantStatus, setRestaurantStatus] = useState<RestaurantStatusData>({ isOpen: true, closingAt: null });
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Update cache whenever sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("bnb_admin_sessions_cache", JSON.stringify(sessions));
    }
  }, [sessions]);

  const loadStatus = useCallback(async () => {
    try {
      const status = await fetchRestaurantStatus();
      setRestaurantStatus(status);
    } catch (err) {
      console.error("Failed to load restaurant status:", err);
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!authenticated || !secret) return;
    if (isInitialLoad && sessions.length === 0) setLoading(true);
    try {
      const data = await adminFetchSessions(secret);
      setSessions(data);
      await loadStatus();
      setIsInitialLoad(false);
    } catch (err) {
      console.error("Failed to load stats in context:", err);
    } finally {
      setLoading(false);
    }
  }, [authenticated, secret, loadStatus, isInitialLoad]);

  useEffect(() => {
    if (authenticated && secret) {
      loadStats();
      const unsubs = [
        on("order_placed", (data: any) => {
          if (!data.order) return;
          setSessions(prev => prev.map(s => {
            if (s.id === data.sessionId) {
              const exists = s.orders.some(o => o.id === data.order.id);
              if (exists) return s;
              return { ...s, orders: [data.order, ...s.orders] };
            }
            return s;
          }));
        }),
        on("order_updated", (data: any) => {
          if (!data.order) return;
          setSessions(prev => prev.map(s => {
            if (s.id === data.sessionId) {
              return {
                ...s,
                orders: s.orders.map(o => o.id === data.order.id ? data.order : o)
              };
            }
            return s;
          }));
        }),
        on("order_deleted", (data: any) => {
          setSessions(prev => prev.map(s => {
            if (s.id === data.sessionId) {
              return { ...s, orders: s.orders.filter(o => o.id !== data.orderId) };
            }
            return s;
          }));
        }),
        on("payment_confirmed", (data: any) => {
          if (!data.payment) return;
          setSessions(prev => prev.map(s => {
            if (s.id === data.sessionId) {
              const exists = s.payments.some(p => p.id === data.payment.id);
              if (exists) {
                return {
                  ...s,
                  payments: s.payments.map(p => p.id === data.payment.id ? data.payment : p)
                };
              }
              return { ...s, payments: [data.payment, ...s.payments] };
            }
            return s;
          }));
        }),
        on("session_updated", (data: any) => {
          // If full session provided, use it
          if (data.session) {
            setSessions(prev => prev.map(s => s.id === data.session.id ? data.session : s));
            return;
          }
          // Otherwise update partial fields
          if (data.sessionId) {
            setSessions(prev => prev.map(s => {
              if (s.id === data.sessionId) {
                return { ...s, ...data };
              }
              return s;
            }));
          }
        }),
        on("menu_updated", loadStats),
      ];
      return () => unsubs.forEach(u => u());
    }
  }, [authenticated, secret, loadStats, on]);

  return (
    <AdminContext.Provider value={{ sessions, setSessions, restaurantStatus, loadStats, loading, secret, authenticated }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
