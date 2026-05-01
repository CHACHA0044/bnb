"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, LogOut, Coffee, Loader2, Lock,
  LayoutDashboard, ShoppingBag, X, ChevronRight 
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { adminVerifySecret, adminFetchSessions, type SessionData } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSocket } from "@/lib/socket-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { secret, authenticated, loading, logout, setSecret, setAuthenticated } = useAdminAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [tempSecret, setTempSecret] = useState("");
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const pathname = usePathname();
  const { on } = useSocket();

  const loadStats = useCallback(async () => {
    if (!authenticated || !secret) return;
    try {
      const data = await adminFetchSessions(secret);
      setSessions(data);
    } catch (err) {
      console.error("Failed to load stats in layout:", err);
    }
  }, [authenticated, secret]);

  useEffect(() => {
    if (authenticated && secret) {
      loadStats();
      const unsubs = [
        on("order_placed", loadStats),
        on("order_updated", loadStats),
        on("payment_confirmed", loadStats),
        on("session_updated", loadStats),
      ];
      return () => unsubs.forEach(u => u());
    }
  }, [authenticated, secret, loadStats, on]);

  const liveSessions = sessions.filter(s => s.status === "OPEN");
  const totalDue = liveSessions.reduce((acc, s) => {
    const total = s.orders.reduce((sum, o) => sum + o.items.reduce((a, i) => a + i.price * i.quantity, 0), 0);
    const paid = s.payments.filter(p => p.status === "CONFIRMED").reduce((a, p) => a + p.amount, 0);
    return acc + (total - paid);
  }, 0);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogin = async () => {
    if (loggingIn) return;
    setLoginError("");
    setLoggingIn(true);
    try {
      await adminVerifySecret(tempSecret);
      localStorage.setItem("bnb_admin_secret", tempSecret);
      setSecret(tempSecret);
      setAuthenticated(true);
    } catch (err: any) {
      setLoginError("Invalid admin secret");
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F4] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E76F51]" size={48} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#F3E8DA]/30 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-[#3A241C]/5">
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
                value={tempSecret}
                onChange={(e) => setTempSecret(e.target.value)}
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

  const navItems = [
    { id: "/admin", label: "Live Dashboard", icon: LayoutDashboard },
    { id: "/admin/history", label: "Order History", icon: ShoppingBag },
    { id: "/admin/menu", label: "Menu Manager", icon: Lock },
  ];

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
            className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.id}
              onClick={() => isMobile && setIsSidebarOpen(false)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${pathname === item.id ? "bg-[#E76F51] text-white shadow-lg shadow-[#E76F51]/20" : "text-white/40 hover:bg-white/5 hover:text-white"}`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5">
          <button 
            onClick={logout}
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
          paddingLeft: isSidebarOpen && !isMobile ? "300px" : isMobile ? "16px" : "32px",
        }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        className="flex-1 pr-4 lg:pr-8 pb-20 lg:pb-32 min-h-screen w-full bg-[#F9F7F4] scroll-smooth relative overflow-x-hidden"
      >
        {/* Toggle Sidebar Button (Sticky Header) */}
        <div className="sticky top-0 z-50 pt-6 lg:pt-10 bg-[#F9F7F4]/95 backdrop-blur-md pb-6 flex items-center gap-6 justify-between pr-4 lg:pr-0">
          <div className="flex items-center gap-6 flex-1">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-12 h-12 lg:w-16 lg:h-16 bg-[#3A241C] text-white rounded-2xl lg:rounded-[1.5rem] flex items-center justify-center shadow-xl hover:bg-[#E76F51] transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            >
              <Coffee size={isMobile ? 22 : 28} />
            </button>
            <div className="flex-1">
              <h2 className="text-2xl lg:text-4xl font-[var(--font-playfair)] font-black text-[#3A241C] tracking-tight">
                {navItems.find(n => n.id === pathname)?.label || "Admin Portal"}
              </h2>
            </div>
          </div>

          {/* Stats in Header - Only for Dashboard */}
          {pathname === "/admin" && (
            <div className="flex gap-3 lg:gap-4 flex-shrink-0">
              <div className="bg-white px-4 py-2 lg:px-6 lg:py-3 rounded-xl lg:rounded-2xl shadow-lg shadow-[#3A241C]/5 border border-[#3A241C]/5 min-w-[100px] lg:min-w-[140px]">
                <p className="text-[7px] lg:text-[8px] font-black text-[#3A241C]/30 uppercase tracking-[0.1em] mb-0.5">Due Amount</p>
                <p className="text-sm lg:text-xl font-black text-[#B71C1C]">₹{totalDue}</p>
              </div>
              <div className="bg-white px-4 py-2 lg:px-6 lg:py-3 rounded-xl lg:rounded-2xl shadow-lg shadow-[#3A241C]/5 border border-[#3A241C]/5 min-w-[100px] lg:min-w-[140px]">
                <p className="text-[7px] lg:text-[8px] font-black text-[#3A241C]/30 uppercase tracking-[0.1em] mb-0.5">Active Tables</p>
                <p className="text-sm lg:text-xl font-black text-[#3A241C]">{liveSessions.length}</p>
              </div>
            </div>
          )}
        </div>

        {children}
      </motion.main>
    </div>
  );
}
