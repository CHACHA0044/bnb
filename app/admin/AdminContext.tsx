"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
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
  suppressId: (id: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children, secret, authenticated }: { children: React.ReactNode, secret: string | null, authenticated: boolean }) {
  const { on } = useSocket();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  
  // Load from cache on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('clear') === 'true') {
      localStorage.removeItem("bnb_admin_sessions_cache");
      console.log("[CACHE] Admin cache cleared via URL");
    }

    const cached = localStorage.getItem("bnb_admin_sessions_cache");
    if (cached) {
      try {
        setSessions(JSON.parse(cached));
      } catch (e) {}
    }
  }, []);
  const [restaurantStatus, setRestaurantStatus] = useState<RestaurantStatusData>({ isOpen: true, closingAt: null });
  const [loading, setLoading] = useState(true);
  // Use a ref instead of state to avoid causing loadStats to change reference on every run
  const isInitialLoadRef = useRef(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Keep auth state in refs so loadStats doesn't need them as deps (avoids re-registration of listeners)
  const authenticatedRef = useRef(authenticated);
  const secretRef = useRef(secret);
  useEffect(() => { authenticatedRef.current = authenticated; }, [authenticated]);
  useEffect(() => { secretRef.current = secret; }, [secret]);

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

  const suppressedIds = useRef<Set<string>>(new Set());

  const loadStats = useCallback(async () => {
    if (!authenticatedRef.current || !secretRef.current) return;
    if (isInitialLoadRef.current) setLoading(true);
    try {
      const data = await adminFetchSessions(secretRef.current);
      
      // Filter out suppressed IDs to avoid flicker
      const filteredData = data.map(s => ({
        ...s,
        orders: s.orders.filter(o => !suppressedIds.current.has(o.id))
      }));

      setSessions(filteredData);
      await loadStatus();
      isInitialLoadRef.current = false;
    } catch (err) {
      console.error("Failed to load stats in context:", err);
    } finally {
      setLoading(false);
    }
  // Only depend on loadStatus (stable). Auth refs are read at call time, not bound.
  }, [loadStatus]);

  const suppressId = useCallback((id: string) => {
    suppressedIds.current.add(id);
    // Clear suppression after 10 seconds to keep memory clean
    setTimeout(() => {
      suppressedIds.current.delete(id);
    }, 10000);
  }, []);

  // Register socket listeners ONCE on mount (stable refs ensure no re-registration)
  useEffect(() => {
    const unsubs = [
      on("order_placed", (data: any) => {
        let sessionFound = false;
        setSessions(prev => {
          const index = prev.findIndex(s => s.id === data.sessionId);
          if (index === -1) {
            sessionFound = false;
            return prev;
          }
          sessionFound = true;
          const updatedSessions = [...prev];
          const session = updatedSessions[index];
          const exists = session.orders.some((o: any) => o.id === data.order.id);
          if (!exists) {
            updatedSessions[index] = { 
              ...session, 
              orders: [data.order, ...session.orders] 
            };
          }
          return updatedSessions;
        });
        // Use a small delay so sessionFound state is settled
        setTimeout(() => {
          if (!sessionFound) {
            console.log("[SOCKET] New session order detected, refreshing list...");
            loadStats();
          }
        }, 0);
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
      on("payment_created", (data: any) => {
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
      on("payment_rejected", (data: any) => {
        setSessions(prev => prev.map(s => {
          if (s.id === data.sessionId) {
            return { ...s, payments: s.payments.filter(p => p.id !== data.paymentId) };
          }
          return s;
        }));
      }),
      on("payment_deleted", (data: any) => {
        setSessions(prev => prev.map(s => {
          if (s.id === data.sessionId) {
            return { ...s, payments: s.payments.filter(p => p.id !== data.paymentId) };
          }
          return s;
        }));
      }),
      on("session_closed", (data: any) => {
        setSessions(prev => prev.filter(s => s.id !== data.sessionId));
      }),
      on("session_updated", (data: any) => {
        if (data.session) {
          setSessions(prev => prev.map(s => s.id === data.session.id ? data.session : s));
          return;
        }
        if (data.sessionId) {
          setSessions(prev => prev.map(s => {
            if (s.id === data.sessionId) {
              return { ...s, ...data };
            }
            return s;
          }));
        }
      }),
      // menu_updated: only refreshes session list (not status) with debounce
      on("menu_updated", () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(loadStats, 2000);
      }),
      // status_updated: only refreshes restaurant status (no full reload)
      on("status_updated", () => {
        loadStatus();
      }),
    ];
    return () => unsubs.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, loadStats, loadStatus]); // on, loadStats, loadStatus are all stable

  // Separate effect: initial data load when auth changes
  useEffect(() => {
    if (authenticated && secret) {
      loadStats();
    }
  }, [authenticated, secret, loadStats]);

  return (
    <AdminContext.Provider value={{ sessions, setSessions, restaurantStatus, loadStats, loading, secret, authenticated, suppressId }}>
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
