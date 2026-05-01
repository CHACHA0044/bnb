"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";
import {
  adminFetchSessions, adminCloseSession, adminConfirmPayment,
  adminUpdateOrder, adminAddOrder, adminToggleItemServed,
  adminToggleOrderItems,
  adminDeletePayment, adminToggleReminder, adminRecordPayment,
  type SessionData,
} from "@/lib/api";
import { useSocket } from "@/lib/socket-client";
import AdminTableColumn from "@/components/AdminTableColumn";
import AdminPaymentSummary from "@/components/AdminPaymentSummary";
import AddOrderModal from "@/components/AddOrderModal";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const TABLES = ["T1", "T2", "T3"];

export default function DashboardPage() {
  const { secret, authenticated } = useAdminAuth();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOrderData, setAddOrderData] = useState<{ sessionId?: string | null, tableId?: string | null } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({ show: false, title: "", message: "", onConfirm: () => {} });

  const { joinAdmin, on, connected } = useSocket();
  const pendingUpdates = useRef<Set<string>>(new Set());

  const loadSessions = useCallback(async () => {
    if (!authenticated || !secret) return;
    setLoading(true);
    try {
      const data = await adminFetchSessions(secret);
      
      // Merge with pending updates to prevent flicker
      setSessions(prev => {
        return data.map(newS => {
          return {
            ...newS,
            orders: newS.orders.map(newO => {
              const isOrderPending = pendingUpdates.current.has(newO.id);
              return {
                ...newO,
                items: newO.items.map(newI => {
                  if (pendingUpdates.current.has(newI.id) || isOrderPending) {
                    // Find old state for this item
                    const oldS = prev.find(ps => ps.id === newS.id);
                    const oldO = oldS?.orders.find(po => po.id === newO.id);
                    const oldI = oldO?.items.find(pi => pi.id === newI.id);
                    // Use old state if available (optimistic)
                    if (oldI) return oldI;
                    // If no old state but order is pending served, return served version
                    if (isOrderPending) {
                      const shouldBeServed = prev.find(ps => ps.id === newS.id)?.orders.find(po => po.id === newO.id)?.items[0]?.isServed;
                      // Actually simpler: just check if the order in prev was being served
                      return { ...newI, isServed: oldO?.items.every(xi => xi.isServed) ?? newI.isServed };
                    }
                    return newI;
                  }
                  return newI;
                })
              };
            })
          };
        });
      });
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [authenticated, secret]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (!authenticated || !secret) return;
    joinAdmin();
    const unsubs = [
      on("order_placed", () => loadSessions()),
      on("order_updated", () => loadSessions()),
      on("payment_created", () => loadSessions()),
      on("payment_confirmed", () => loadSessions()),
      on("session_updated", () => loadSessions()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [authenticated, secret, joinAdmin, on, loadSessions]);

  useEffect(() => {
    if (connected || !authenticated || !secret) return;
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, [connected, authenticated, secret, loadSessions]);

  const confirmPayment = async (paymentId: string) => {
    setSessions(prev => prev.map(s => ({
      ...s,
      payments: s.payments.map(p => p.id === paymentId ? { ...p, status: "CONFIRMED" } : p)
    })));
    try { 
      await adminConfirmPayment(paymentId, secret!); 
      loadSessions(); 
    } catch (err) { 
      loadSessions();
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    // Optimistic UI update for status
    setSessions(prev => prev.map(s => ({
      ...s,
      orders: s.orders.map(o => {
        if (o.id === orderId) {
          // Auto-toggle items based on status
          const shouldBeServed = status === "SERVED";
          return {
            ...o,
            status,
            items: o.items.map(i => ({ ...i, isServed: shouldBeServed }))
          };
        }
        return o;
      })
    })));

    try { 
      // Bulk update items if needed
      const shouldBeServed = status === "SERVED";
      await adminToggleOrderItems(orderId, shouldBeServed, secret!);
      await adminUpdateOrder(orderId, status, secret!); 
      loadSessions(); 
    } catch (err) { 
      console.error(err); 
      loadSessions();
    }
  };

  const closeSession = async (sessionId: string) => {
    setConfirmModal({
      show: true,
      title: "Close Session?",
      message: "This will finalize all orders and payments for this table. This action cannot be undone.",
      danger: true,
      onConfirm: async () => {
        try { await adminCloseSession(sessionId, secret!); loadSessions(); } catch (err) { console.error(err); }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const deletePayment = async (paymentId: string) => {
    setConfirmModal({
      show: true,
      title: "Reject Payment?",
      message: "Are you sure you want to deny this payment request? The user will be notified to try again.",
      danger: true,
      onConfirm: async () => {
        try { await adminDeletePayment(paymentId, secret!); loadSessions(); } catch (err) { console.error(err); }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const toggleReminder = async (sessionId: string, reminder: boolean) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, paymentReminder: reminder } : s));
    try { 
      await adminToggleReminder(sessionId, reminder, secret!); 
      loadSessions(); 
    } catch (err) { 
      loadSessions();
    }
  };

  const recordPayment = async (sessionId: string, method: "CASH" | "UPI", amount: number) => {
    try {
      await adminRecordPayment(sessionId, amount, method, secret!);
      loadSessions();
    } catch (err) {
      console.error("Failed to record payment:", err);
    }
  };

  const toggleItemServed = async (itemId: string, isServed: boolean) => {
    pendingUpdates.current.add(itemId);
    setSessions(prev => prev.map(s => ({
      ...s,
      orders: s.orders.map(o => ({
        ...o,
        items: o.items.map(i => i.id === itemId ? { ...i, isServed } : i)
      }))
    })));
    
    try { 
      await adminToggleItemServed(itemId, isServed, secret!); 
    } catch (err) { 
      loadSessions();
    } finally {
      setTimeout(() => {
        pendingUpdates.current.delete(itemId);
      }, 2000);
    }
  };

  const toggleOrderItems = async (orderId: string, isServed: boolean) => {
    pendingUpdates.current.add(orderId);
    setSessions(prev => prev.map(s => ({
      ...s,
      orders: s.orders.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            items: o.items.map(i => ({ ...i, isServed }))
          };
        }
        return o;
      })
    })));

    try {
      await adminToggleOrderItems(orderId, isServed, secret!);
    } catch (err) {
      loadSessions();
    } finally {
      setTimeout(() => {
        pendingUpdates.current.delete(orderId);
      }, 2000);
    }
  };

  const handleAddManualOrder = async (
    items: any[], 
    isTakeaway: boolean, 
    tableId?: string, 
    paymentMethod?: "CASH" | "QR",
    totalAmount?: number
  ) => {
    try {
      const order = await adminAddOrder(addOrderData?.sessionId || null, items, secret!, isTakeaway, tableId);
      
      // If cash is collected now, record a confirmed payment
      if (paymentMethod === "CASH" && totalAmount) {
        // We need the sessionId. If it was a new session, the order response should have it.
        const sid = addOrderData?.sessionId || (order as any).sessionId;
        if (sid) {
          await adminRecordPayment(sid, totalAmount, "CASH", secret!);
        }
      }

      loadSessions();
    } catch (err) {
      throw err;
    }
  };

  const liveSessions = sessions.filter(s => s.status === "OPEN");
  const totalDue = liveSessions.reduce((acc, s) => {
    const total = s.orders.reduce((sum, o) => sum + o.items.reduce((a, i) => a + i.price * i.quantity, 0), 0);
    const paid = s.payments.filter(p => p.status === "CONFIRMED").reduce((a, p) => a + p.amount, 0);
    return acc + (total - paid);
  }, 0);

  if (!authenticated || !secret) return null;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Engine Status (Compact) */}
      <div className="flex items-center gap-2 px-2 -mt-4 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-[#6A994E]" : "bg-[#B71C1C]"} ${connected ? "animate-pulse" : ""}`} />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#3A241C]/20">
          {connected ? "Engine Connected" : "Polling Updates"}
        </span>
      </div>

      {/* NEW PAYMENTS ROW - Tightened Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {TABLES.map((tableId) => {
          const session = liveSessions.find(s => s.tableId === tableId) || null;
          return (
            <AdminPaymentSummary
              key={`pay-${tableId}`}
              tableId={tableId}
              session={session}
              onConfirmPayment={confirmPayment}
              onDeletePayment={deletePayment}
              onToggleReminder={toggleReminder}
              onRecordPayment={recordPayment}
            />
          );
        })}
      </div>

      {/* TABLES GRID - Tightened Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 pt-2">
        {TABLES.map((tableId) => {
          const session = liveSessions.find(s => s.tableId === tableId) || null;
          return (
            <AdminTableColumn
              key={tableId}
              tableId={tableId}
              session={session}
              onUpdateStatus={updateOrderStatus}
              onConfirmPayment={confirmPayment}
              onAddOrder={(sid) => setAddOrderData({ sessionId: sid, tableId })}
              onCloseSession={closeSession}
              onToggleItemServed={toggleItemServed}
              onToggleOrderItems={toggleOrderItems}
              onDeletePayment={deletePayment}
              onToggleReminder={toggleReminder}
            />
          );
        })}
      </div>

      {/* CUSTOM CONFIRM MODAL */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
              className="absolute inset-0 bg-[#3A241C]/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-hidden border border-white/20"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${confirmModal.danger ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"}`}>
                <Shield size={32} />
              </div>
              <h3 className="text-2xl font-black text-[#3A241C] tracking-tight mb-2">{confirmModal.title}</h3>
              <p className="text-[#3A241C]/60 text-sm leading-relaxed mb-10 font-medium">{confirmModal.message}</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmModal.onConfirm}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 ${
                    confirmModal.danger ? "bg-[#B71C1C] text-white shadow-red-900/20" : "bg-[#3A241C] text-white shadow-black/20"
                  }`}
                >
                  Confirm Action
                </button>
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="w-full py-4 text-[#3A241C]/30 font-black text-[10px] uppercase tracking-[0.2em] hover:text-[#3A241C] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {addOrderData && (
          <AddOrderModal
            sessionId={addOrderData.sessionId}
            tableId={addOrderData.tableId}
            availableTables={TABLES}
            onClose={() => setAddOrderData(null)}
            onSubmit={handleAddManualOrder}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
