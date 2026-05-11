"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, LogOut, Coffee, Loader2, Lock,
  LayoutDashboard, ShoppingBag, X, BarChart3, PieChart 
} from "lucide-react";
import { useAdmin } from "./AdminContext";
import Link from "next/link";

interface AdminContentProps {
  children: React.ReactNode;
  pathname: string;
  logout: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
}

export default function AdminContent({ 
  children, pathname, logout, isSidebarOpen, setIsSidebarOpen, isMobile 
}: AdminContentProps) {
  const { sessions, restaurantStatus, loadStats } = useAdmin();
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantStatus.isOpen || !restaurantStatus.closingAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const closingDate = new Date(restaurantStatus.closingAt!);
      const now = new Date();
      const diff = closingDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("00:00");
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [restaurantStatus.closingAt, restaurantStatus.isOpen]);

  const handleToggleStatus = async () => {
    const { adminOpenRestaurant, adminCloseRestaurant, adminForceCloseRestaurant } = await import("@/lib/api");
    const secret = localStorage.getItem("bnb_admin_secret");
    if (!secret) return;
    
    try {
      if (!restaurantStatus.isOpen) {
        await adminOpenRestaurant(secret);
      } else if (restaurantStatus.closingAt) {
        await adminForceCloseRestaurant(secret);
      } else {
        await adminCloseRestaurant(secret);
      }
      loadStats();
    } catch (err) {
      console.error("Failed to toggle restaurant status:", err);
    }
  };

  const liveSessions = sessions.filter(s => s.status === "OPEN");
  const totalDue = liveSessions.reduce((acc: number, s: any) => {
    const total = (s.orders || [])
      .filter((o: any) => o.status !== "CANCELLED")
      .reduce((sum: number, o: any) => 
        sum + (o.items || []).reduce((a: number, i: any) => a + i.price * i.quantity, 0) + (o.packingCharges || 0), 0
      );
    const paid = (s.payments || [])
      .filter((p: any) => p.status === "CONFIRMED")
      .reduce((a: number, p: any) => a + p.amount, 0);
    return acc + Math.max(0, total - paid);
  }, 0);

  const navItems = [
    { id: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { id: "/admin/menu", label: "Menu", icon: Lock },
    { id: "/admin/history", label: "History", icon: ShoppingBag },
    { id: "/admin/reports", label: "Reports", icon: BarChart3 },
    { id: "/admin/analytics", label: "Analytics", icon: PieChart },
  ];

  return (
    <div className="flex min-h-screen bg-[#F9F7F4] overflow-x-hidden relative">
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

      <motion.aside 
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : -320 }}
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

        <div className="p-8 border-t border-white/5 space-y-3">
          <button
            onClick={handleToggleStatus}
            className={`w-full flex items-center justify-center px-6 py-4 rounded-2xl transition-all group relative overflow-hidden ${
              !restaurantStatus.isOpen 
                ? "bg-[#6A994E] text-white shadow-lg shadow-[#6A994E]/20" 
                : restaurantStatus.closingAt
                  ? "bg-[#B71C1C] text-white animate-pulse"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              {!restaurantStatus.isOpen ? <Shield size={18} /> : restaurantStatus.closingAt ? <X size={18} /> : <Lock size={18} />}
              <span className="font-bold text-xs uppercase tracking-widest">
                {!restaurantStatus.isOpen ? "Open Shop" : restaurantStatus.closingAt ? "Close" : "Close Shop"}
              </span>
              {timeLeft && <span className="font-mono text-[10px] font-black opacity-80 ml-2">({timeLeft})</span>}
            </div>
            {restaurantStatus.closingAt && (
              <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full overflow-hidden">
                <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 600, ease: "linear" }} className="h-full bg-white" />
              </div>
            )}
          </button>

          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 text-white/60 font-bold text-xs uppercase tracking-widest hover:bg-[#B71C1C] hover:text-white transition-all group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </motion.aside>

      <motion.main 
        animate={{ paddingLeft: isSidebarOpen && !isMobile ? "300px" : isMobile ? "16px" : "32px" }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        className="flex-1 pr-4 lg:pr-8 pb-8 lg:pb-12 min-h-screen w-full bg-[#F9F7F4] scroll-smooth relative overflow-x-hidden"
      >
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

        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
