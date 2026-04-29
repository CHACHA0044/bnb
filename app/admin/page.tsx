"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, LogOut, RefreshCw, X as XIcon, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Coffee, CreditCard, Banknote, Loader2, Plus, Lock,
  LayoutDashboard, ShoppingBag, DollarSign, Settings, Bell, Search, Filter
} from "lucide-react";
import {
  adminFetchSessions, adminCloseSession, adminConfirmPayment,
  adminUpdateOrder, adminAddOrder,
  type SessionData, type OrderData, type PaymentData,
} from "@/lib/api";
import { ORDER_MENU, ORDER_CATEGORIES } from "@/lib/menu";
import { useSocket } from "@/lib/socket-client";

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

const getStatusColor = (s: string) => {
  switch (s) {
    case "PLACED": return COLORS.danger;
    case "PREPARING": return COLORS.warning;
    case "SERVED": return COLORS.success;
    case "CONFIRMED": return COLORS.success;
    case "PENDING": return COLORS.warning;
    case "UNPAID": return COLORS.danger;
    case "OPEN": return COLORS.success;
    case "CLOSED": return "#999";
    default: return "#999";
  }
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"LIVE" | "HISTORY">("LIVE");

  // Manual order form
  const [addOrderSession, setAddOrderSession] = useState<string | null>(null);
  const [manualCart, setManualCart] = useState<Record<string, number>>({});

  const { joinAdmin, on, connected } = useSocket();

  /* ─── Auth ─────────────────────────────── */
  useEffect(() => {
    const saved = localStorage.getItem("bnb_admin_secret");
    if (saved) { setSecret(saved); setAuthenticated(true); }
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    try {
      await adminFetchSessions(secret);
      localStorage.setItem("bnb_admin_secret", secret);
      setAuthenticated(true);
    } catch {
      setLoginError("Invalid admin secret");
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
    try { await adminConfirmPayment(paymentId, secret); loadSessions(); } catch (err) { console.error(err); }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try { await adminUpdateOrder(orderId, status, secret); loadSessions(); } catch (err) { console.error(err); }
  };

  const closeSession = async (sessionId: string) => {
    if (!confirm("Close this session? This cannot be undone.")) return;
    try { await adminCloseSession(sessionId, secret); loadSessions(); } catch (err) { console.error(err); }
  };

  const submitManualOrder = async (sessionId: string) => {
    const items = Object.entries(manualCart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const mi = ORDER_MENU.find((m) => m.id === id)!;
        return { name: mi.name, price: mi.price, quantity: qty };
      });
    if (items.length === 0) return;
    try {
      await adminAddOrder(sessionId, items, secret);
      setManualCart({});
      setAddOrderSession(null);
      loadSessions();
    } catch (err) { console.error(err); }
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
      <div className="min-h-screen bg-[var(--cream)]/30 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-[var(--coffee)]/5 border border-[var(--coffee)]/5">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[var(--benne-primary)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[var(--benne-primary)]/20">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="font-[var(--font-playfair)] text-3xl font-bold text-[var(--coffee)]">Admin Portal</h1>
            <p className="text-[var(--coffee)]/40 text-sm mt-2 font-medium tracking-wide">Enter credentials to manage Benne n Beans</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--coffee)]/30" size={20} />
              <input
                type="password"
                placeholder="Admin Secret Key"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full bg-[var(--background)] border-none rounded-2xl py-4 pl-12 pr-6 text-[var(--coffee)] font-bold outline-none ring-2 ring-transparent focus:ring-[var(--benne-primary)] transition-all"
              />
            </div>
            {loginError && <p className="text-[var(--danger)] text-xs font-bold pl-2">{loginError}</p>}
            <button
              onClick={handleLogin}
              className="w-full bg-[var(--coffee)] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[var(--benne-primary)] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-[var(--coffee)]/10"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Dashboard ────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F9F7F4] flex">
      {/* Sidebar - Optimized for Desktop */}
      <aside className="hidden lg:flex w-72 bg-[var(--coffee)] flex-col p-8 fixed h-full z-50">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-[var(--benne-primary)] rounded-xl flex items-center justify-center">
            <Coffee size={20} className="text-white" />
          </div>
          <span className="font-[var(--font-playfair)] text-xl font-bold text-white tracking-tight">Admin Deck</span>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: "LIVE", label: "Live Dashboard", icon: LayoutDashboard },
            { id: "HISTORY", label: "Session History", icon: ShoppingBag },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${
                activeTab === item.id 
                  ? "bg-[var(--benne-primary)] text-white shadow-lg shadow-[var(--benne-primary)]/20" 
                  : "text-white/40 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-8 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[var(--danger)] font-bold text-sm hover:bg-[var(--danger)]/10 transition-all"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-6 lg:p-10 pb-32">
        {/* Header Stats */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-[var(--font-playfair)] font-bold text-[var(--coffee)]">
              {activeTab === "LIVE" ? "Current Live Status" : "Past Sessions"}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-[var(--success)]" : "bg-[var(--danger)]"}`} />
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--coffee)]/30">
                {connected ? "Connected to Engine" : "Polling for Updates"}
              </span>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-[var(--coffee)]/5 min-w-[160px]">
              <p className="text-[10px] font-bold text-[var(--coffee)]/30 uppercase tracking-widest mb-1">Total Outstanding</p>
              <p className="text-2xl font-bold text-[var(--danger)]">₹{totalDue}</p>
            </div>
            <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-[var(--coffee)]/5 min-w-[160px]">
              <p className="text-[10px] font-bold text-[var(--coffee)]/30 uppercase tracking-widest mb-1">Active Tables</p>
              <p className="text-2xl font-bold text-[var(--coffee)]">{liveSessions.length}</p>
            </div>
          </div>
        </header>

        {/* Live View */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {sessions
            .filter(s => activeTab === "LIVE" ? s.status === "OPEN" : s.status === "CLOSED")
            .map((session) => {
              const sessionTotal = session.orders.reduce((sum, o) => sum + o.items.reduce((a, i) => a + i.price * i.quantity, 0), 0);
              const sessionPaid = session.payments.filter(p => p.status === "CONFIRMED").reduce((a, p) => a + p.amount, 0);
              const isExpanded = expandedSession === session.id;

              return (
                <div key={session.id} className="bg-white rounded-[2.5rem] shadow-sm border border-[var(--coffee)]/5 overflow-hidden transition-all hover:shadow-xl hover:shadow-[var(--coffee)]/5">
                  {/* Table Card Header */}
                  <div className="p-8 flex justify-between items-center bg-[var(--background)]/50">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black ${
                        sessionTotal > sessionPaid ? "bg-[var(--danger)]/10 text-[var(--danger)]" : "bg-[var(--success)]/10 text-[var(--success)]"
                      }`}>
                        {session.tableId}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-[var(--coffee)]">Session #{session.id.slice(-4).toUpperCase()}</h3>
                        <p className="text-xs font-bold text-[var(--coffee)]/30">Started {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[var(--coffee)]/30 uppercase tracking-widest">Balance Due</p>
                        <p className={`text-xl font-black ${sessionTotal > sessionPaid ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                          ₹{sessionTotal - sessionPaid}
                        </p>
                      </div>
                      <button 
                        onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                        className="w-10 h-10 rounded-xl bg-white border border-[var(--coffee)]/10 flex items-center justify-center hover:bg-[var(--coffee)] hover:text-white transition-all"
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="p-8 pt-2 space-y-8">
                          {/* Orders List */}
                          <div>
                            <div className="flex justify-between items-center mb-6">
                              <h4 className="font-bold text-[var(--coffee)] flex items-center gap-2">
                                <ShoppingBag size={18} className="text-[var(--benne-primary)]" />
                                Orders ({session.orders.length})
                              </h4>
                              <button 
                                onClick={() => { setAddOrderSession(session.id); setManualCart({}); }}
                                className="text-[var(--benne-primary)] font-bold text-xs uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-all"
                              >
                                <Plus size={14} /> Add Items
                              </button>
                            </div>

                            <div className="space-y-4">
                              {session.orders.map((order) => {
                                // Tie payments to this order if applicable (backend improvement)
                                const orderPayments = session.payments.filter(p => p.orderId === order.id);
                                const orderTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
                                const orderPaid = orderPayments.filter(p => p.status === "CONFIRMED").reduce((s, p) => s + p.amount, 0);

                                return (
                                  <div key={order.id} className="bg-[var(--background)] rounded-3xl p-6 border border-[var(--coffee)]/5">
                                    <div className="flex justify-between items-start mb-4">
                                      <div className="flex gap-3">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                                          order.status === "SERVED" ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--warning)]/10 text-[var(--warning)]"
                                        }`}>
                                          {order.status}
                                        </span>
                                        <span className="text-xs font-bold text-[var(--coffee)]/30">
                                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      
                                      <div className="flex gap-2">
                                        {order.status === "PLACED" && (
                                          <button 
                                            onClick={() => updateOrderStatus(order.id, "PREPARING")}
                                            className="bg-[var(--warning)] text-white px-4 py-1.5 rounded-xl text-[10px] font-bold hover:opacity-90 transition-all"
                                          >
                                            Mark Preparing
                                          </button>
                                        )}
                                        {order.status === "PREPARING" && (
                                          <button 
                                            onClick={() => updateOrderStatus(order.id, "SERVED")}
                                            className="bg-[var(--success)] text-white px-4 py-1.5 rounded-xl text-[10px] font-bold hover:opacity-90 transition-all"
                                          >
                                            Mark Served
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                      {order.items.map((it) => (
                                        <div key={it.id} className="flex justify-between text-sm">
                                          <span className="text-[var(--coffee)]/70 font-medium">{it.name} <span className="text-[var(--coffee)]/30">× {it.quantity}</span></span>
                                          <span className="font-bold text-[var(--coffee)]">₹{it.price * it.quantity}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Per-Order Payment Tracking */}
                                    {orderPayments.length > 0 && (
                                      <div className="mt-4 pt-4 border-t border-[var(--coffee)]/5 space-y-2">
                                        {orderPayments.map(p => (
                                          <div key={p.id} className="flex justify-between items-center text-xs">
                                            <span className="flex items-center gap-2 text-[var(--coffee)]/50">
                                              {p.method === "UPI" ? <CreditCard size={12} /> : <Banknote size={12} />}
                                              {p.method} Payment
                                              <span className={`font-bold ${getStatusColor(p.status)}`}>({p.status})</span>
                                            </span>
                                            {p.status !== "CONFIRMED" && (
                                              <button 
                                                onClick={() => confirmPayment(p.id)}
                                                className="text-[var(--success)] font-bold hover:underline"
                                              >
                                                Confirm
                                              </button>
                                            )}
                                            <span className="font-bold text-[var(--coffee)]">₹{p.amount}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Session Total & Closing */}
                          <div className="pt-6 border-t border-[var(--coffee)]/5 flex flex-col md:flex-row justify-between items-end gap-6">
                            <div className="w-full md:w-auto">
                              <div className="flex justify-between md:gap-12 mb-2">
                                <span className="text-sm font-bold text-[var(--coffee)]/40">Grand Total</span>
                                <span className="text-lg font-black text-[var(--coffee)]">₹{sessionTotal}</span>
                              </div>
                              <div className="flex justify-between md:gap-12">
                                <span className="text-sm font-bold text-[var(--success)]/60">Total Paid</span>
                                <span className="text-lg font-black text-[var(--success)]">₹{sessionPaid}</span>
                              </div>
                            </div>

                            <button 
                              onClick={() => closeSession(session.id)}
                              disabled={sessionTotal > sessionPaid}
                              className={`px-10 py-4 rounded-2xl font-bold text-sm transition-all ${
                                sessionTotal > sessionPaid 
                                  ? "bg-[var(--background)] text-[var(--coffee)]/20 cursor-not-allowed" 
                                  : "bg-[var(--coffee)] text-white hover:bg-[var(--benne-primary)] shadow-xl shadow-[var(--coffee)]/10"
                              }`}
                            >
                              Finalize & Close Session
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
        </div>
      </main>

      {/* Manual Order Modal - Styled same as main theme */}
      <AnimatePresence>
        {addOrderSession && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAddOrderSession(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative w-full max-w-2xl bg-white rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-[var(--coffee)]/5 flex justify-between items-center">
                <h3 className="font-[var(--font-playfair)] text-3xl font-bold text-[var(--coffee)]">Add Order</h3>
                <button onClick={() => setAddOrderSession(null)} className="w-12 h-12 rounded-2xl bg-[var(--background)] flex items-center justify-center text-[var(--coffee)]/30 hover:text-[var(--coffee)] transition-all">
                  <XIcon size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {ORDER_CATEGORIES.map(cat => (
                  <div key={cat}>
                    <h5 className="text-[10px] font-bold text-[var(--benne-primary)] uppercase tracking-[0.2em] mb-4">{cat}</h5>
                    <div className="space-y-2">
                      {ORDER_MENU.filter(m => m.category === cat).map(item => {
                        const qty = manualCart[item.id] || 0;
                        return (
                          <div key={item.id} className="flex justify-between items-center p-4 bg-[var(--background)] rounded-2xl">
                            <div>
                              <p className="font-bold text-[var(--coffee)]">{item.name}</p>
                              <p className="text-xs text-[var(--benne-primary)] font-bold">₹{item.price}</p>
                            </div>
                            <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-[var(--coffee)]/5">
                              <button 
                                onClick={() => setManualCart(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))}
                                className="w-8 h-8 flex items-center justify-center text-[var(--coffee)] hover:text-[var(--benne-primary)]"
                              >
                                <XIcon size={16} />
                              </button>
                              <span className="font-black text-[var(--coffee)] min-w-[20px] text-center">{qty}</span>
                              <button 
                                onClick={() => setManualCart(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))}
                                className="w-8 h-8 flex items-center justify-center text-[var(--benne-primary)]"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-[var(--background)]">
                <button 
                  onClick={() => submitManualOrder(addOrderSession)}
                  className="w-full bg-[var(--coffee)] text-white py-5 rounded-2xl font-bold text-lg hover:bg-[var(--benne-primary)] shadow-2xl transition-all"
                >
                  Confirm & Place Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
