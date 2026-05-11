"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminProvider } from "./AdminContext";
import AdminContent from "./AdminContent";
import { usePathname } from "next/navigation";
import { Shield, Lock } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { secret, authenticated, loading, logout, setSecret, setAuthenticated } = useAdminAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  // Sidebar preference logic
  useEffect(() => {
    const saved = localStorage.getItem("bnb_admin_sidebar_open");
    if (saved !== null) {
      setIsSidebarOpen(saved === "true");
    } else if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("bnb_admin_sidebar_open", isSidebarOpen.toString());
    }
  }, [isSidebarOpen, isMobile]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F4] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E76F51]" size={48} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <AdminLogin 
        setSecret={setSecret} 
        setAuthenticated={setAuthenticated} 
      />
    );
  }

  return (
    <AdminProvider secret={secret} authenticated={authenticated}>
      <AdminContent 
        pathname={pathname} 
        logout={logout} 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isMobile={isMobile}
      >
        {children}
      </AdminContent>
    </AdminProvider>
  );
}

function AdminLogin({ setSecret, setAuthenticated }: any) {
  const [tempSecret, setTempSecret] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async () => {
    const { adminVerifySecret } = await import("@/lib/api");
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
              loggingIn ? "bg-[#3A241C]/60 cursor-not-allowed scale-[0.98]" : "bg-[#3A241C] text-white hover:bg-[#E76F51] hover:scale-[1.02] active:scale-[0.98] shadow-[#3A241C]/10"
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
