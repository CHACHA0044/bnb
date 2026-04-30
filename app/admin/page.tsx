"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, LogOut, Coffee, Loader2, Lock,
  LayoutDashboard, ShoppingBag, Bell, X
} from "lucide-react";
import {
  adminFetchSessions, adminCloseSession, adminConfirmPayment,
  adminUpdateOrder, adminAddOrder,
  type SessionData,
} from "@/lib/api";
import { useSocket } from "@/lib/socket-client";
import AdminTableColumn from "@/components/AdminTableColumn";
import AddOrderModal from "@/components/AddOrderModal";

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
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"LIVE" | "HISTORY">("LIVE");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Modals
  const [addOrderSession, setAddOrderSession] = useState<string | null>(null);

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
              className="w-full bg-[#3A241C] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#E76F51] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-[#3A241C]/10"
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
    <div className="min-h-screen bg-[#F9F7F4] flex overflow-x-hidden">
      {/* Sidebar - Collapsible Detailed Desktop */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (isMobile ? "100%" : "280px") : "0px",
          x: isSidebarOpen ? 0 : (isMobile ? "-100%" : "-280px"),
        }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className={`fixed h-full z-[60] bg-[#3A241C] flex flex-col shadow-2xl overflow-hidden`}
      >
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="w-10 h-10 bg-[#E76F51] rounded-xl flex items-center justify-center shadow-lg shadow-[#E76F51]/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Coffee size={20} className="text-white" />
              </button>
              <span className="font-[var(--font-playfair)] text-xl font-bold text-white tracking-tight">Admin Deck</span>
            </div>
            {isMobile && (
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <nav className="space-y-2 flex-1">
            {[
              { id: "LIVE", label: "Live Dashboard", icon: LayoutDashboard },
              { id: "HISTORY", label: "Session History", icon: ShoppingBag },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${
                  activeTab === item.id 
                    ? "bg-[#E76F51] text-white shadow-lg shadow-[#E76F51]/20" 
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-8 border-t border-white/5">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[#B71C1C] font-bold text-sm hover:bg-[#B71C1C]/10 transition-all"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Toggle Button */}
      {!isSidebarOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-6 top-8 z-[70] w-12 h-12 bg-[#3A241C] text-white rounded-2xl flex items-center justify-center shadow-2xl hover:bg-[#E76F51] transition-all"
        >
          <Coffee size={24} />
        </motion.button>
      )}

      {/* Main Content */}
      <motion.main 
        layout
        animate={{ 
          marginLeft: isSidebarOpen && !isMobile ? "280px" : "0px",
          width: isSidebarOpen && !isMobile ? "calc(100% - 280px)" : "100%"
        }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="flex-1 p-6 lg:p-10 pb-32 min-h-screen"
      >
        {/* Header Stats */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 sticky top-0 bg-[#F9F7F4]/80 backdrop-blur-md z-40 py-4 -mx-4 px-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl lg:text-3xl font-[var(--font-playfair)] font-black text-[#3A241C]">
                {activeTab === "LIVE" ? "Live Dashboard" : "Session History"}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className={`w-2 h-2 rounded-full animate-pulse ${connected ? "bg-[#6A994E]" : "bg-[#B71C1C]"}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/30">
                  {connected ? "Engine Connected" : "Polling Updates"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 bg-white p-4 lg:p-5 rounded-[1.5rem] lg:rounded-[2rem] shadow-sm border border-[#3A241C]/5 min-w-[140px]">
              <p className="text-[8px] lg:text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mb-1">Outstanding</p>
              <p className="text-xl lg:text-2xl font-black text-[#B71C1C]">₹{totalDue}</p>
            </div>
            <div className="flex-1 bg-white p-4 lg:p-5 rounded-[1.5rem] lg:rounded-[2rem] shadow-sm border border-[#3A241C]/5 min-w-[140px]">
              <p className="text-[8px] lg:text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mb-1">Active Tables</p>
              <p className="text-xl lg:text-2xl font-black text-[#3A241C]">{liveSessions.length}</p>
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
                />
              );
            })}
          </div>
        ) : (
          /* History View (Minimal List) */
          <div className="space-y-4">
            {sessions
              .filter(s => s.status === "CLOSED")
              .map(session => (
                <div key={session.id} className="bg-white p-6 rounded-[2rem] border border-[#3A241C]/5 flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center font-black text-[#3A241C]">
                      {session.tableId}
                    </div>
                    <div>
                      <p className="font-bold text-[#3A241C]">Session #{session.id.slice(-4).toUpperCase()}</p>
                      <p className="text-xs text-gray-400 font-medium">
                        {new Date(session.createdAt).toLocaleDateString()} • {new Date(session.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-[#3A241C]">₹{session.orders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0)}</p>
                    <p className="text-[10px] font-black text-[#6A994E] uppercase">Paid Full</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </motion.main>

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
