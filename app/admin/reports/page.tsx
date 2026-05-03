"use client";

import { useState, useEffect, useCallback, Fragment, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, Download, RefreshCcw, TrendingUp, 
  Users, ShoppingCart, Wallet, Calendar, Loader2,
  FileSpreadsheet, FileText, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { 
  adminFetchReportSummary, 
  adminRegenerateReport 
} from "@/lib/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import CustomDatePicker from "@/components/admin/CustomDatePicker";
import CustomMonthPicker from "@/components/admin/CustomMonthPicker";

export default function ReportsPage() {
  const { secret, authenticated } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const getStartOfBusinessWeek = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon, 2=Tue...
    // Business Week starts Tuesday. Monday is the reset day.
    if (day === 1) return now.toISOString().split("T")[0]; // On Monday, start is today (reset)
    
    // Calculate days since most recent Tuesday
    // Tue: (2+5)%7=0, Wed: (3+5)%7=1, ..., Sun: (0+5)%7=5, Sat: (6+5)%7=4
    let daysSinceTue = (day + 5) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - daysSinceTue);
    return start.toISOString().split("T")[0];
  };

  const [fromDate, setFromDate] = useState("2024-01-01");
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<{
    date: string;
    totalRevenue: number;
    totalOrders: number;
    totalItems: number;
    upiRevenue: number;
    cashRevenue: number;
    logs: Array<{
      id: string;
      tableId: string;
      type: string;
      itemSummary: string;
      foodTotal: number;
      packingTotal: number;
      amount: number;
      upiPaid: number | null;
      cashPaid: number | null;
      paymentStatus: string;
      createdAt: string;
      payTime?: string;
    }>;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const isInitialLoad = useRef(true);

  const loadSummary = useCallback(async () => {
    if (!secret) return;
    
    // Check if range is > 15 days (bypass on initial load)
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 15 && !isInitialLoad.current) {
      setToast({ message: "Range too large! Please download complete report for periods > 15 days.", type: "error" });
      setTimeout(() => setToast(null), 5000);
      return;
    }

    isInitialLoad.current = false;

    setLoading(true);
    try {
      const data = await adminFetchReportSummary(fromDate, secret, fromDate, toDate);
      
      // Filter out legacy/test items from logs
      if (data && data.logs) {
        data.logs = data.logs.map(log => ({
          ...log,
          itemSummary: log.itemSummary.split(', ').filter(i => !i.includes("Onion Podi Dosa")).join(', ')
        })).filter(log => log.itemSummary !== "");
      }
      
      setSummary(data);
      setCurrentPage(1); // Reset to first page on new filter
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, secret]);

  useEffect(() => {
    if (authenticated) loadSummary();
  }, [authenticated, loadSummary]);

  const handleRegenerate = async () => {
    if (!secret || regenerating) return;
    setRegenerating(true);
    try {
      await adminRegenerateReport(fromDate, secret);
      setToast({ message: "Report regenerated successfully", type: "success" });
      loadSummary();
    } catch (err) {
      setToast({ message: "Failed to regenerate report", type: "error" });
    } finally {
      setRegenerating(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownloadDaily = async () => {
    if (downloading) return;
    setDownloading(true);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const url = fromDate === toDate 
      ? `${backendUrl}/api/admin/reports/daily?date=${fromDate}&secret=${secret}`
      : `${backendUrl}/api/admin/reports/range?from=${fromDate}&to=${toDate}&secret=${secret}`;
    
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Download failed");
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fromDate === toDate ? `BnB_Daily_${fromDate}.xlsx` : `BnB_Report_${fromDate}_to_${toDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      setToast({ message: "Report downloaded successfully!", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to download report", type: "error" });
    } finally {
      setDownloading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDownloadMonthly = async () => {
    if (downloading) return;
    setDownloading(true);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const url = `${backendUrl}/api/admin/reports/monthly?month=${month}&secret=${secret}`;
    
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Download failed");
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `BnB_Monthly_${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      setToast({ message: "Monthly report downloaded!", type: "success" });
    } catch (err) {
      setToast({ message: "Failed to download monthly report", type: "error" });
    } finally {
      setDownloading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (!authenticated) return null;

  return (
    <div className="space-y-8">
      {/* Date Selector & Actions */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white p-6 rounded-[2rem] shadow-sm border border-[#3A241C]/5">
        <div className="flex items-center gap-4">
          <CustomDatePicker 
            mode="range"
            fromDate={fromDate}
            toDate={toDate}
            onRangeChange={(from, to) => {
              if (from) setFromDate(from);
              if (to) setToDate(to);
            }}
            label="Select Date Range"
          />
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
            disabled={downloading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-[#3A241C] text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-[#3A241C]/10 hover:bg-[#E76F51] transition-all disabled:opacity-50"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {fromDate === toDate ? "Daily Excel" : "Export Range"}
          </motion.button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Revenue" 
          value={loading ? "---" : `₹${summary?.totalRevenue || 0}`} 
          sub={`₹${summary?.upiRevenue || 0} UPI • ₹${summary?.cashRevenue || 0} Cash`}
          icon={TrendingUp}
          color="#E76F51"
          loading={loading}
        />
        <StatCard 
          label="Orders" 
          value={loading ? "---" : (summary?.totalOrders || 0)} 
          sub="Total completed orders"
          icon={ShoppingCart}
          color="#3A241C"
          loading={loading}
        />
        <StatCard 
          label="Items Sold" 
          value={loading ? "---" : (summary?.totalItems || 0)} 
          sub="Individual items prepared"
          icon={Users}
          color="#6A994E"
          loading={loading}
        />
        <StatCard 
          label="Avg Order Value" 
          value={loading ? "---" : `₹${summary && summary.totalOrders > 0 ? Math.round(summary.totalRevenue / summary.totalOrders) : 0}`} 
          sub="Revenue per order"
          icon={Wallet}
          color="#F4A261"
          loading={loading}
        />
      </div>

      {/* Transaction Breakdown Section */}
      <div className="bg-white rounded-[3rem] border border-[#3A241C]/5 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-[#3A241C]/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-[#3A241C] uppercase tracking-[0.2em]">Transaction Breakdown</h3>
            <p className="text-[10px] font-bold text-[#3A241C]/30 uppercase tracking-widest mt-1">
              {fromDate === getStartOfBusinessWeek() ? "Current Week" : "Selected Period"} • {summary?.logs.length || 0} Orders
            </p>
          </div>
          
          {/* Enhanced Pagination Controls */}
          {summary && summary.logs.length > itemsPerPage && (
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="w-10 h-10 rounded-xl bg-[#F9F7F4] flex items-center justify-center text-[#3A241C]/30 hover:text-[#E76F51] disabled:opacity-20 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(summary.logs.length / itemsPerPage) }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === Math.ceil(summary.logs.length / itemsPerPage) || Math.abs(p - currentPage) <= 1)
                  .map((p, i, arr) => (
                    <Fragment key={p}>
                      {i > 0 && p - arr[i-1] > 1 && <span className="text-[#3A241C]/20 px-1">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                          currentPage === p ? "bg-[#3A241C] text-white shadow-md shadow-[#3A241C]/10" : "text-[#3A241C]/30 hover:bg-[#F9F7F4]"
                        }`}
                      >
                        {p}
                      </button>
                    </Fragment>
                  ))}
              </div>

              <button
                disabled={currentPage >= Math.ceil(summary.logs.length / itemsPerPage)}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="w-10 h-10 rounded-xl bg-[#F9F7F4] flex items-center justify-center text-[#3A241C]/30 hover:text-[#E76F51] disabled:opacity-20 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9F7F4]/50">
                <th className="px-6 py-5 text-[10px] font-black text-[#3A241C]/30 uppercase tracking-widest">Time</th>
                <th className="px-6 py-5 text-[10px] font-black text-[#3A241C]/30 uppercase tracking-widest">Table</th>
                <th className="px-6 py-5 text-[10px] font-black text-[#3A241C]/30 uppercase tracking-widest">Order Summary</th>
                <th className="px-6 py-5 text-[10px] font-black text-[#3A241C]/30 uppercase tracking-widest text-right">Dish</th>
                <th className="px-6 py-5 text-[10px] font-black text-[#3A241C]/30 uppercase tracking-widest text-right">Pack</th>
                <th className="px-6 py-5 text-[10px] font-black text-[#3A241C]/30 uppercase tracking-widest text-right">UPI</th>
                <th className="px-6 py-5 text-[10px] font-black text-[#3A241C]/30 uppercase tracking-widest text-right">Cash</th>
                <th className="px-6 py-5 text-[10px] font-black text-[#3A241C]/30 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A241C]/5">
              {summary?.logs
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((log) => (
                  <tr key={`${log.id}_${log.type}`} className="hover:bg-[#F9F7F4]/30 transition-colors group">
                    <td className="px-8 py-6 text-xs font-bold text-[#3A241C]/60">
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-[#3A241C]">{log.tableId}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded w-fit ${
                          log.type === "TAKEAWAY" ? "bg-[#F4A261]/10 text-[#F4A261]" : "bg-[#3A241C]/5 text-[#3A241C]/40"
                        }`}>
                          {log.type === "TAKEAWAY" ? "Takeaway" : "Dine-in"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-black text-[#3A241C]">
                          {log.itemSummary}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-xs font-black text-[#3A241C] text-right">₹{log.foodTotal}</td>
                    <td className="px-6 py-6 text-xs font-black text-[#E76F51] text-right">{log.packingTotal > 0 ? `₹${log.packingTotal}` : "-"}</td>
                    <td className="px-6 py-6 text-xs font-black text-[#6A994E] text-right">{log.upiPaid ? `₹${log.upiPaid}` : "-"}</td>
                    <td className="px-6 py-6 text-xs font-black text-[#F4A261] text-right">{log.cashPaid ? `₹${log.cashPaid}` : "-"}</td>
                    <td className="px-6 py-6 text-xs font-black text-[#3A241C] text-right">₹{log.amount}</td>
                  </tr>
                ))}
              {!summary?.logs.length && !loading && (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center text-[#3A241C]/20 font-black uppercase tracking-widest text-xs">
                    No transactions found for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {summary && summary.logs.length > 0 && (
          <div className="flex items-center justify-between px-8 py-6 border-t border-[#3A241C]/5 bg-[#F9F7F4]/20">
            <p className="text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em]">
              Page {currentPage} of {Math.ceil(summary.logs.length / itemsPerPage)}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-[#3A241C]/5 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} className="text-[#3A241C]" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(summary.logs.length / itemsPerPage) }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === Math.ceil(summary.logs.length / itemsPerPage) || Math.abs(p - currentPage) <= 1)
                  .map((p, i, arr) => (
                    <Fragment key={p}>
                      {i > 0 && arr[i-1] !== p-1 && <span className="text-[#3A241C]/20 px-1">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                          currentPage === p ? "bg-[#3A241C] text-white" : "hover:bg-white text-[#3A241C]/40"
                        }`}
                      >
                        {p}
                      </button>
                    </Fragment>
                  ))
                }
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(summary.logs.length / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(summary.logs.length / itemsPerPage)}
                className="p-2 rounded-xl border border-[#3A241C]/5 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} className="text-[#3A241C]" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Monthly Report Section */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-[#3A241C]/5">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-[#6A994E]/10 rounded-3xl flex items-center justify-center text-[#6A994E]">
              <FileSpreadsheet size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-[var(--font-playfair)] font-black text-[#3A241C]">Monthly Archives</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-black text-[#3A241C]/30 uppercase tracking-widest">Select Year:</p>
                <select 
                  value={month.split("-")[0]}
                  onChange={(e) => setMonth(`${e.target.value}-${month.split("-")[1]}`)}
                  className="bg-transparent border-none text-[10px] font-black text-[#6A994E] uppercase tracking-widest outline-none cursor-pointer"
                >
                  {Array.from({ length: new Date().getFullYear() - 2025 + 1 }, (_, i) => 2025 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <p className="text-[#3A241C]/40 text-sm leading-relaxed mb-10 font-medium">
            Download complete transaction history for the selected month in CSV format. 
            Useful for accounting and long-term performance tracking.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <div className="w-full">
              <CustomMonthPicker 
                value={month}
                onChange={(val) => setMonth(val)}
                label="Select Month"
                onlyMonths={true}
                roundedClass="rounded-[1.5rem]"
              />
            </div>
            
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleDownloadMonthly}
              disabled={downloading}
              className="w-full bg-[#6A994E] text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-[#6A994E]/20 hover:bg-[#5a8342] border-2 border-white/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50 min-h-[80px]"
            >
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Monthly CSV
            </motion.button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-[#3A241C] p-10 rounded-[3rem] shadow-xl text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-[#E76F51]">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-3xl font-[var(--font-playfair)] font-black">Report Integrity</h2>
            </div>
            <p className="text-white/40 text-sm leading-relaxed mb-10 font-medium">
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
