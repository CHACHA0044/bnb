"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, Download, RefreshCcw, TrendingUp, 
  Users, ShoppingCart, Wallet, Calendar, Loader2,
  FileSpreadsheet, FileText, CheckCircle2, AlertCircle
} from "lucide-react";
import { 
  adminFetchReportSummary, 
  adminRegenerateReport 
} from "@/lib/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function ReportsPage() {
  const { secret, authenticated } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<{
    date: string;
    totalRevenue: number;
    totalOrders: number;
    totalItems: number;
    upiRevenue: number;
    cashRevenue: number;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadSummary = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    try {
      const data = await adminFetchReportSummary(date, secret);
      setSummary(data);
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      setLoading(false);
    }
  }, [date, secret]);

  useEffect(() => {
    if (authenticated) loadSummary();
  }, [authenticated, loadSummary]);

  const handleRegenerate = async () => {
    if (!secret || regenerating) return;
    setRegenerating(true);
    try {
      await adminRegenerateReport(date, secret);
      setToast({ message: "Report regenerated successfully", type: "success" });
      loadSummary();
    } catch (err) {
      setToast({ message: "Failed to regenerate report", type: "error" });
    } finally {
      setRegenerating(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDownloadDaily = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    window.open(`${backendUrl}/api/admin/reports/daily?date=${date}&secret=${secret}`, "_blank");
  };

  const handleDownloadMonthly = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    window.open(`${backendUrl}/api/admin/reports/monthly?month=${month}&secret=${secret}`, "_blank");
  };

  if (!authenticated) return null;

  return (
    <div className="space-y-8">
      {/* Date Selector & Actions */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white p-6 rounded-[2rem] shadow-sm border border-[#3A241C]/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#E76F51]/10 rounded-2xl flex items-center justify-center text-[#E76F51]">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mb-1">Select Date</p>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent font-black text-[#3A241C] outline-none focus:text-[#E76F51] transition-colors cursor-pointer"
            />
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-[#F9F7F4] text-[#3A241C] rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            {regenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Regenerate
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadDaily}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-[#3A241C] text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-[#3A241C]/10 hover:bg-[#E76F51] transition-all"
          >
            <Download size={16} />
            Daily Excel
          </motion.button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Revenue" 
          value={`₹${summary?.totalRevenue || 0}`} 
          sub={`₹${summary?.upiRevenue || 0} UPI • ₹${summary?.cashRevenue || 0} Cash`}
          icon={TrendingUp}
          color="#E76F51"
          loading={loading}
        />
        <StatCard 
          label="Orders" 
          value={summary?.totalOrders || 0} 
          sub="Total completed orders"
          icon={ShoppingCart}
          color="#3A241C"
          loading={loading}
        />
        <StatCard 
          label="Items Sold" 
          value={summary?.totalItems || 0} 
          sub="Individual items prepared"
          icon={Users}
          color="#6A994E"
          loading={loading}
        />
        <StatCard 
          label="Avg Order Value" 
          value={`₹${summary && summary.totalOrders > 0 ? Math.round(summary.totalRevenue / summary.totalOrders) : 0}`} 
          sub="Revenue per order"
          icon={Wallet}
          color="#F4A261"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Monthly Report Section */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-[#3A241C]/5 flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 bg-[#6A994E]/10 rounded-3xl flex items-center justify-center text-[#6A994E] mb-8">
              <FileSpreadsheet size={32} />
            </div>
            <h2 className="text-3xl font-[var(--font-playfair)] font-black text-[#3A241C] mb-4">Monthly Archives</h2>
            <p className="text-[#3A241C]/40 text-sm leading-relaxed mb-10 font-medium">
              Download complete transaction history for the selected month in CSV format. 
              Useful for accounting and long-term performance tracking.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 p-2 bg-[#F9F7F4] rounded-[2rem]">
            <input 
              type="month" 
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full sm:w-auto flex-1 bg-white px-6 py-4 rounded-2xl font-black text-[#3A241C] outline-none shadow-sm"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadMonthly}
              className="w-full sm:w-auto px-8 py-4 bg-[#6A994E] text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#6A994E]/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Monthly CSV
            </motion.button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-[#3A241C] p-10 rounded-[3rem] shadow-xl text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-[#E76F51] mb-8">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-3xl font-[var(--font-playfair)] font-black mb-4">Report Integrity</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-8 font-medium">
              Daily reports are automatically updated every 30 minutes. 
              If you just confirmed a payment or added a manual order, 
              click <span className="text-[#E76F51] font-bold">Regenerate</span> to see immediate updates.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm font-bold text-white/60">
                <CheckCircle2 size={18} className="text-[#6A994E]" />
                Tax-ready summaries included
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-white/60">
                <CheckCircle2 size={18} className="text-[#6A994E]" />
                Table-wise performance breakdown
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-white/60">
                <CheckCircle2 size={18} className="text-[#6A994E]" />
                Automated monthly archiving
              </li>
            </ul>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-10 right-10 px-8 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 font-bold text-sm ${
              toast.type === "success" ? "bg-[#6A994E] text-white" : "bg-[#B71C1C] text-white"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, loading }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#3A241C]/5 flex flex-col justify-between group hover:shadow-xl transition-all">
      <div className="flex justify-between items-start mb-6">
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon size={24} />
        </div>
        {loading && <Loader2 className="animate-spin text-gray-200" size={16} />}
      </div>
      <div>
        <p className="text-[10px] font-black text-[#3A241C]/20 uppercase tracking-[0.2em] mb-1">{label}</p>
        <h3 className="text-3xl font-black text-[#3A241C] tracking-tight">{value}</h3>
        <p className="text-[10px] font-bold text-[#3A241C]/40 mt-2 tracking-wide">{sub}</p>
      </div>
    </div>
  );
}
