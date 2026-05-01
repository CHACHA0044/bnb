"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, LogOut, Coffee, Loader2, Lock,
  LayoutDashboard, ShoppingBag, Bell, X, ChevronRight
} from "lucide-react";
import {
  adminVerifySecret, adminFetchSessions, adminCloseSession, adminConfirmPayment,
  adminUpdateOrder, adminAddOrder, adminToggleItemServed,
  adminDeletePayment, adminToggleReminder,
  type SessionData,
} from "@/lib/api";
import { useSocket } from "@/lib/socket-client";
import AdminTableColumn from "@/components/AdminTableColumn";
import AddOrderModal from "@/components/AddOrderModal";
import AdminMenuManager from "@/components/AdminMenuManager";

const TABLES = ["T1", "T2", "T3"];

/* ─── Color Palette ────────────────────────── */
const COLORS = {
  primary: "#E76F51",
  secondary: "#D35400",
  success: "#6A994E",
  warning: "#F4A261",
  danger: "#B71C1C",
  coffee: "#3A241C",
  cream: "#F3E8DA",
  background: "#F9F7F4",
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"LIVE" | "HISTORY" | "MENU">("LIVE");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Modals
  const [addOrderSession, setAddOrderSession] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({ show: false, title: "", message: "", onConfirm: () => {} });

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { joinAdmin, on, connected } = useSocket();

  /* ─── Auth ─────────────────────────────── */
  useEffect(() => {
    const saved = localStorage.getItem("bnb_admin_secret");
    if (saved) { setSecret(saved); setAuthenticated(true); }
  }, []);

  const handleLogin = async () => {
    if (loggingIn) return;
    setLoginError("");
    setLoggingIn(true);
    try {
      await adminVerifySecret(secret);
      localStorage.setItem("bnb_admin_secret", secret);
      setAuthenticated(true);
    } catch (err: any) {
      console.error("Login failed:", err);
      setLoginError(err.message === "API Unauthorized" ? "Invalid admin secret" : "Connection error or invalid secret");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bnb_admin_secret");
    setAuthenticated(false);
    setSecret("");
    setSessions([]);
  };

  /* ─── Data ─────────────────────────────── */
  const loadSessions = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const data = await adminFetchSessions(secret);
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [authenticated, secret]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  /* ─── Socket ───────────────────────────── */
  useEffect(() => {
    if (!authenticated) return;
    joinAdmin();
    const unsubs = [
      on("order_placed", () => loadSessions()),
      on("order_updated", () => loadSessions()),
      on("payment_created", () => loadSessions()),
      on("payment_confirmed", () => loadSessions()),
      on("session_updated", () => loadSessions()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [authenticated, joinAdmin, on, loadSessions]);

  /* ─── Polling fallback ─────────────────── */
  useEffect(() => {
    if (connected || !authenticated) return;
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, [connected, authenticated, loadSessions]);

  /* ─── Actions ──────────────────────────── */
  const confirmPayment = async (paymentId: string) => {
    // Optimistic Update
    setSessions(prev => prev.map(s => ({
      ...s,
      payments: s.payments.map(p => p.id === paymentId ? { ...p, status: "CONFIRMED" } : p)
    })));
    try { 
      await adminConfirmPayment(paymentId, secret); 
      loadSessions(); 
    } catch (err) { 
      console.error(err); 
      loadSessions(); // Rollback
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try { await adminUpdateOrder(orderId, status, secret); loadSessions(); } catch (err) { console.error(err); }
  };

  const closeSession = async (sessionId: string) => {
    setConfirmModal({
      show: true,
      title: "Close Session?",
      message: "This will finalize all orders and payments for this table. This action cannot be undone.",
      danger: true,
      onConfirm: async () => {
        try { await adminCloseSession(sessionId, secret); loadSessions(); } catch (err) { console.error(err); }
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
        try { await adminDeletePayment(paymentId, secret); loadSessions(); } catch (err) { console.error(err); }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const toggleReminder = async (sessionId: string, reminder: boolean) => {
    // Optimistic Update
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, paymentReminder: reminder } : s));
    try { 
      await adminToggleReminder(sessionId, reminder, secret); 
      loadSessions(); 
    } catch (err) { 
      console.error(err); 
      loadSessions(); // Rollback
    }
  };

  const toggleItemServed = async (itemId: string, isServed: boolean) => {
    // Optimistic Update
    setSessions(prev => prev.map(s => ({
      ...s,
      orders: s.orders.map(o => ({
        ...o,
        items: o.items.map(i => i.id === itemId ? { ...i, isServed } : i)
      }))
    })));

    try { 
      await adminToggleItemServed(itemId, isServed, secret); 
    } catch (err) { 
      console.error(err); 
      loadSessions(); // Rollback on error
    }
  };

  const handleAddManualOrder = async (sessionId: string, items: any[], isTakeaway: boolean) => {
    try {
      await adminAddOrder(sessionId, items, secret, isTakeaway);
      loadSessions();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  /* ─── Stats ────────────────────────────── */
  const liveSessions = sessions.filter(s => s.status === "OPEN");
  const totalDue = liveSessions.reduce((acc, s) => {
    const total = s.orders.reduce((sum, o) => sum + o.items.reduce((a, i) => a + i.price * i.quantity, 0), 0);
    const paid = s.payments.filter(p => p.status === "CONFIRMED").reduce((a, p) => a + p.amount, 0);
    return acc + (total - paid);
  }, 0);

  /* ─── Login Screen ─────────────────────── */
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#F3E8DA]/30 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-[#3A241C]/5 border border-[#3A241C]/5">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[#E76F51] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#E76F51]/20">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="font-[var(--font-playfair)] text-3xl font-bold text-[#3A241C]">Admin Portal</h1>
            <p className="text-[#3A241C]/40 text-sm mt-2 font-medium tracking-wide">Enter credentials to manage Benne n Beans</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A241C]/30" size={20} />
              <input
                type="password"
                placeholder="Admin Secret Key"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full bg-[#F9F7F4] border-none rounded-2xl py-4 pl-12 pr-6 text-[#3A241C] font-bold outline-none ring-2 ring-transparent focus:ring-[#E76F51] transition-all"
              />
            </div>
            {loginError && <p className="text-[#B71C1C] text-xs font-bold pl-2">{loginError}</p>}
            <button
              onClick={handleLogin}
              disabled={loggingIn}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                loggingIn 
                  ? "bg-[#3A241C]/60 cursor-not-allowed scale-[0.98]" 
                  : "bg-[#3A241C] text-white hover:bg-[#E76F51] hover:scale-[1.02] active:scale-[0.98] shadow-[#3A241C]/10"
              }`}
            >
              {loggingIn ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Verifying...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Dashboard ────────────────────────── */
  return (
    <div className="flex min-h-screen bg-[#F9F7F4] overflow-x-hidden relative">
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-[#3A241C]/60 backdrop-blur-sm z-[55]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : -320,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#3A241C] text-white z-[60] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter leading-none text-[#E76F51]">BnB</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mt-1">Admin Portal</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {[
            { id: "LIVE", label: "Live Dashboard", icon: LayoutDashboard },
            { id: "HISTORY", label: "Order History", icon: ShoppingBag },
            { id: "MENU", label: "Menu Manager", icon: Lock },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { 
                setActiveTab(item.id as any); 
                setIsSidebarOpen(false); 
              }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${activeTab === item.id ? "bg-[#E76F51] text-white shadow-lg shadow-[#E76F51]/20" : "text-white/40 hover:bg-white/5 hover:text-white"}`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 text-white/60 font-bold text-xs uppercase tracking-widest hover:bg-[#B71C1C] hover:text-white transition-all group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <motion.main 
        layout
        animate={{ 
          paddingLeft: isSidebarOpen && !isMobile ? "320px" : isMobile ? "20px" : "40px",
        }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        className="flex-1 pr-5 lg:pr-16 pb-32 min-h-screen w-full bg-[#F9F7F4]"
      >
        {/* Header Stats */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8 sticky top-0 bg-[#F9F7F4]/90 backdrop-blur-md z-40 py-6 lg:py-8">
          <div className="flex items-center gap-4 lg:gap-6">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-12 h-12 lg:w-16 lg:h-16 bg-[#3A241C] text-white rounded-2xl lg:rounded-[1.5rem] flex items-center justify-center shadow-xl hover:bg-[#E76F51] transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            >
              <Coffee size={isMobile ? 22 : 28} />
            </button>
            <div>
              <h2 className="text-2xl lg:text-5xl font-[var(--font-playfair)] font-black text-[#3A241C] tracking-tight leading-tight">
                {activeTab === "LIVE" ? "Live Dashboard" : activeTab === "MENU" ? "Menu Manager" : "Session History"}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${connected ? "bg-[#6A994E]" : "bg-[#B71C1C]"} ${connected ? "animate-pulse" : ""}`} />
                <span className="text-[9px] lg:text-[11px] font-black uppercase tracking-[0.2em] text-[#3A241C]/30">
                  {connected ? "Engine Connected" : "Polling Updates"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 lg:gap-4 w-full xl:w-auto overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex-1 xl:flex-none bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-lg shadow-[#3A241C]/5 border border-[#3A241C]/5 min-w-[140px] lg:min-w-[200px]">
              <p className="text-[8px] lg:text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mb-1">Revenue</p>
              <p className="text-xl lg:text-4xl font-black text-[#B71C1C]">₹{totalDue}</p>
            </div>
            <div className="flex-1 xl:flex-none bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-lg shadow-[#3A241C]/5 border border-[#3A241C]/5 min-w-[140px] lg:min-w-[200px]">
              <p className="text-[8px] lg:text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mb-1">Active</p>
              <p className="text-xl lg:text-4xl font-black text-[#3A241C]">{liveSessions.length}</p>
            </div>
          </div>
        </header>

        {activeTab === "LIVE" ? (
          /* Live 3-Column Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {TABLES.map((tableId) => {
              const session = liveSessions.find(s => s.tableId === tableId) || null;
              return (
                <AdminTableColumn
                  key={tableId}
                  tableId={tableId}
                  session={session}
                  onUpdateStatus={updateOrderStatus}
                  onConfirmPayment={confirmPayment}
                  onAddOrder={(sid) => setAddOrderSession(sid)}
                  onCloseSession={closeSession}
                  onToggleItemServed={toggleItemServed}
                  onDeletePayment={deletePayment}
                  onToggleReminder={toggleReminder}
                />
              );
            })}
          </div>
        ) : activeTab === "MENU" ? (
          <AdminMenuManager secret={secret} />
        ) : (
          /* History View (Expandable List) */
          <div className="space-y-4 max-w-5xl mx-auto">
            {sessions
              .filter(s => s.status === "CLOSED")
              .map(session => {
                const isExpanded = expandedSession === session.id;
                const total = session.orders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0);
                
                return (
                  <div key={session.id} className="bg-white rounded-[2.5rem] border border-[#3A241C]/5 shadow-sm overflow-hidden transition-all duration-300">
                    <div 
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className="p-6 flex justify-between items-center cursor-pointer hover:bg-[#F9F7F4]/50"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-[#3A241C] rounded-2xl flex items-center justify-center font-black text-white shadow-lg">
                          {session.tableId}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-[#3A241C] text-lg">Session #{session.id.slice(-4).toUpperCase()}</p>
                            <span className="text-[10px] font-black bg-[#6A994E]/10 text-[#6A994E] px-2 py-0.5 rounded-full uppercase">Settled</span>
                          </div>
                          <p className="text-xs text-[#3A241C]/40 font-bold uppercase tracking-widest mt-0.5">
                            {new Date(session.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })} • {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-xl font-black text-[#3A241C]">₹{total}</p>
                          <p className="text-[10px] font-black text-[#3A241C]/20 uppercase tracking-widest">Total Bill</p>
                        </div>
                        <ChevronRight size={20} className={`text-[#3A241C]/20 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-[#3A241C]/5 bg-[#F9F7F4]/20"
                        >
                          <div className="p-8 space-y-6">
                            {session.orders.map((order, oIdx) => (
                              <div key={order.id} className="bg-white rounded-2xl p-6 border border-[#3A241C]/5 shadow-sm">
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#3A241C]/5">
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E76F51]">Order #{oIdx + 1}</p>
                                  <p className="text-[10px] font-bold text-[#3A241C]/30">{new Date(order.createdAt).toLocaleTimeString()}</p>
                                </div>
                                <div className="space-y-3">
                                  {order.items.map((item, iIdx) => (
                                    <div key={iIdx} className="flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                        <span className="w-5 h-5 bg-[#3A241C]/5 rounded flex items-center justify-center text-[10px] font-bold text-[#3A241C]/40">{item.quantity}x</span>
                                        <p className="text-sm font-bold text-[#3A241C]">{item.name}</p>
                                      </div>
                                      <p className="text-sm font-black text-[#3A241C]">₹{item.price * item.quantity}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
          </div>
        )}
      </motion.main>

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

      {/* Manual Order Modal */}
      <AnimatePresence>
        {addOrderSession && (
          <AddOrderModal
            sessionId={addOrderSession}
            onClose={() => setAddOrderSession(null)}
            onSubmit={(items, isTakeaway) => handleAddManualOrder(addOrderSession, items, isTakeaway)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
