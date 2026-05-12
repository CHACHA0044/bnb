"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import {
  adminCloseSession, 
  adminConfirmPayment,
  adminDeleteOrder,
  adminDeletePayment, 
  adminToggleReminder, 
  adminRecordPayment,
  adminToggleItemServed,
  adminToggleOrderItemsServed,
  adminCreateSession,
  adminAddManualOrder,
  adminUpdateOrder,
  adminUpdateOrderTimer,
  adminToggleReviewRequest,
  type SessionData,
} from "@/lib/api";
import { useSocket } from "@/lib/socket-client";
import AdminTableColumn from "@/components/AdminTableColumn";
import AdminPaymentSummary from "@/components/AdminPaymentSummary";
import AddOrderModal from "@/components/AddOrderModal";
import { useAdmin } from "./AdminContext";

const TABLES = ["T1", "T2", "T3"];
const TAKEAWAY_ID = "TAKEAWAY";
const TABLE_COLUMNS = [...TABLES];

export default function DashboardPage() {
  const { sessions, setSessions, loadStats, loading, authenticated, secret } = useAdmin();
  const [addOrderData, setAddOrderData] = useState<{ sessionId?: string | null, tableId?: string | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
    loading?: boolean;
  }>({ show: false, title: "", message: "", onConfirm: () => {} });

  const { joinAdmin, connected } = useSocket();

  useEffect(() => {
    if (!authenticated || !secret) return;
    joinAdmin();
  }, [authenticated, secret, joinAdmin]);

  // Periodic refresh as a fallback
  useEffect(() => {
    if (!connected || !authenticated || !secret) return;
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, [connected, authenticated, secret, loadStats]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    if (!secret) return;
    
    // Optimistic Update
    const previousSessions = [...sessions];
    setSessions(prev => prev.map(s => ({
      ...s,
      orders: s.orders.map(o => {
        if (o.id === orderId) {
          const updatedItems = status === "SERVED" 
            ? (o.items || []).map(item => ({ ...item, isServed: true })) 
            : status === "PLACED"
              ? (o.items || []).map(item => ({ ...item, isServed: false }))
              : o.items;
          return { ...o, status, items: updatedItems };
        }
        return o;
      })
    })));

    try {
      await adminUpdateOrder(orderId, status, secret);
      // loadStats() removed to prevent jumpy UI; socket.io 'order_updated' will handle real sync
    } catch (err) {
      console.error(err);
      setSessions(previousSessions);
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    if (!secret) return;
    try { 
      await adminConfirmPayment(paymentId, secret); 
    } catch (err) { 
      console.error(err);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    setConfirmModal({
      show: true,
      title: "Reject Payment?",
      message: "Are you sure you want to deny this payment request?",
      danger: true,
      onConfirm: async () => {
        if (!secret) return;
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try { 
          await adminDeletePayment(paymentId, secret); 
        } catch (err) { console.error(err); }
        setConfirmModal(prev => ({ ...prev, show: false, loading: false }));
      }
    });
  };

  const handleToggleReminder = async (sessionId: string, reminder: boolean) => {
    if (!secret) return;
    try { 
      await adminToggleReminder(sessionId, reminder, secret); 
    } catch (err) { 
      console.error(err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!secret) return;
    try {
      await adminDeleteOrder(orderId, secret);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    if (!secret) return;
    // Optimistic Update: Remove session locally immediately
    const previousSessions = [...sessions];
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    try {
      await adminCloseSession(sessionId, secret);
    } catch (err) {
      console.error(err);
      // Rollback on error
      setSessions(previousSessions);
    }
  };

  const handleToggleItemServed = async (itemId: string, isServed: boolean) => {
    if (!secret) return;
    
    // Optimistic Update
    const previousSessions = [...sessions];
    setSessions(prev => prev.map(s => ({
      ...s,
      orders: s.orders.map(o => ({
        ...o,
        items: (o.items || []).map(i => i.id === itemId ? { ...i, isServed } : i)
      }))
    })));

    try {
      await adminToggleItemServed(secret, itemId, isServed);
    } catch (err) {
      console.error(err);
      setSessions(previousSessions);
    }
  };

  const handleToggleOrderItems = async (orderId: string, isServed: boolean) => {
    if (!secret) return;
    
    // Optimistic Update
    const previousSessions = [...sessions];
    setSessions(prev => prev.map(s => ({
      ...s,
      orders: s.orders.map(o => o.id === orderId ? {
        ...o,
        items: (o.items || []).map(i => ({ ...i, isServed }))
      } : o)
    })));

    try {
      await adminToggleOrderItemsServed(secret, orderId, isServed);
    } catch (err) {
      console.error(err);
      setSessions(previousSessions);
    }
  };

  const handleRecordPayment = async (sessionId: string, method: "CASH" | "UPI", amount: number) => {
    if (!secret) return;
    try {
      await adminRecordPayment(secret, sessionId, method, amount);
      loadStats();
      showToast("Payment recorded");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReviewRequest = async (sessionId: string, requested: boolean) => {
    if (!secret) return;
    try {
      await adminToggleReviewRequest(sessionId, requested, secret);
      loadStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTimer = async (orderId: string, minutes: number | null) => {
    if (!secret) return;

    // Optimistic Update
    const previousSessions = [...sessions];
    const estimatedReadyTime = minutes !== null 
      ? new Date(Date.now() + minutes * 60 * 1000).toISOString() 
      : null;
    
    setSessions(prev => prev.map(s => ({
      ...s,
      orders: s.orders.map(o => o.id === orderId ? { ...o, estimatedReadyTime } : o)
    })));

    try {
      await adminUpdateOrderTimer(orderId, minutes, secret);
      // We don't call loadStats() here to avoid jumping; 
      // Socket.io 'order_updated' will eventually sync the real state
    } catch (err) {
      console.error(err);
      setSessions(previousSessions);
    }
  };

  const takeawaySessions = sessions.filter(s => s.tableId === TAKEAWAY_ID && s.status === "OPEN");
  const tableSessions = sessions.filter(s => s.tableId !== TAKEAWAY_ID && s.status === "OPEN");

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[600px] w-full">
        <div className="flex flex-col items-center gap-6">
          <Loader2 size={48} className="text-[#E76F51] animate-spin" />
          <p className="text-[10px] font-black text-[#3A241C]/20 uppercase tracking-[0.2em]">Initializing Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-[#3A241C] text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="w-6 h-6 bg-[#6A994E] rounded-full flex items-center justify-center">
              <Check size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !confirmModal.loading && setConfirmModal(prev => ({ ...prev, show: false }))} className="absolute inset-0 bg-[#3A241C]/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-[#3A241C]/5">
              <h3 className={`text-2xl font-black tracking-tight mb-4 ${confirmModal.danger ? 'text-[#B71C1C]' : 'text-[#3A241C]'}`}>{confirmModal.title}</h3>
              <p className="text-[#3A241C]/60 font-medium leading-relaxed mb-10">{confirmModal.message}</p>
              <div className="flex gap-4">
                <button disabled={confirmModal.loading} onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="flex-1 py-4 rounded-2xl bg-[#F9F7F4] text-[#3A241C] font-bold hover:bg-[#F3E8DA] transition-colors disabled:opacity-50">Cancel</button>
                <button disabled={confirmModal.loading} onClick={confirmModal.onConfirm} className={`flex-1 py-4 rounded-2xl text-white font-bold transition-all shadow-xl flex items-center justify-center gap-2 ${confirmModal.danger ? 'bg-[#B71C1C] hover:bg-[#D32F2F] shadow-[#B71C1C]/20' : 'bg-[#3A241C] hover:bg-[#E76F51] shadow-[#3A241C]/20'}`}>
                  {confirmModal.loading ? <Loader2 size={20} className="animate-spin" /> : "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-12">
        {/* Top Row: Payment Activity */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black text-[#3A241C]/40 uppercase tracking-[0.2em]">Payment Activity</h4>
            <span className="text-[9px] font-bold text-[#E76F51] bg-[#E76F51]/10 px-2 py-0.5 rounded-full">{sessions.filter(s => s.status === "OPEN" && s.payments.length > 0).length} Active</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TABLE_COLUMNS.map(tableId => {
              const session = sessions.find(s => s.tableId === tableId && s.status === "OPEN");
              return (
                <AdminPaymentSummary
                  key={`pay-${tableId}`}
                  tableId={tableId}
                  session={session || null}
                  onConfirmPayment={handleConfirmPayment}
                  onDeletePayment={handleDeletePayment}
                  onToggleReminder={handleToggleReminder}
                  onRecordPayment={handleRecordPayment}
                  onUpdateTimer={handleUpdateTimer}
                  onSendReviewRequest={handleSendReviewRequest}
                />
              );
            })}
            
            <AdminPaymentSummary
              tableId="Takeaway"
              session={takeawaySessions[0] || null}
              onConfirmPayment={handleConfirmPayment}
              onDeletePayment={handleDeletePayment}
              onToggleReminder={handleToggleReminder}
              onRecordPayment={handleRecordPayment}
              onUpdateTimer={handleUpdateTimer}
              onSendReviewRequest={handleSendReviewRequest}
              isTakeaway
            />
          </div>
        </div>

        {/* Bottom Row: Tables and Takeaway */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black text-[#3A241C]/40 uppercase tracking-[0.2em]">Tables & Takeaway</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TABLE_COLUMNS.map(tableId => {
              const session = tableSessions.find(s => s.tableId === tableId);
              return (
                <AdminTableColumn
                  key={tableId}
                  tableId={tableId}
                  session={session || null}
                  onUpdateStatus={handleUpdateStatus}
                  onConfirmPayment={handleConfirmPayment}
                  onAddOrder={(sid) => setAddOrderData({ sessionId: sid, tableId })}
                  onCloseSession={handleCloseSession}
                  onToggleItemServed={handleToggleItemServed}
                  onToggleOrderItems={handleToggleOrderItems}
                  onDeleteOrder={handleDeleteOrder}
                  onDeletePayment={handleDeletePayment}
                  onToggleReminder={handleToggleReminder}
                  onUpdateTimer={handleUpdateTimer}
                />
              );
            })}
            
            <AdminTableColumn
              tableId="Takeaway"
              session={takeawaySessions[0] || null}
              onUpdateStatus={handleUpdateStatus}
              onConfirmPayment={handleConfirmPayment}
              onAddOrder={(sid) => setAddOrderData({ sessionId: sid, tableId: TAKEAWAY_ID })}
              onCloseSession={handleCloseSession}
              onToggleItemServed={handleToggleItemServed}
              onToggleOrderItems={handleToggleOrderItems}
              onDeleteOrder={handleDeleteOrder}
              onDeletePayment={handleDeletePayment}
              onToggleReminder={handleToggleReminder}
              onUpdateTimer={handleUpdateTimer}
              isTakeaway
              allTakeawaySessions={takeawaySessions}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {addOrderData && (
          <AddOrderModal
            sessionId={addOrderData?.sessionId}
            tableId={addOrderData?.tableId}
            onClose={() => setAddOrderData(null)}
            onSubmit={async (items, isTakeaway) => {
              if (!secret) return;
              if (addOrderData?.sessionId) {
                await adminAddManualOrder(secret, addOrderData.sessionId, { items, isTakeaway });
              } else if (addOrderData?.tableId) {
                await adminCreateSession(secret, { tableId: addOrderData.tableId, items, isTakeaway });
              }
              setAddOrderData(null);
              loadStats();
              showToast("Order added");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
