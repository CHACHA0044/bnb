"use client";

import { useState, useEffect, useCallback, Fragment, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, RefreshCcw, TrendingUp, 
  Users, ShoppingCart, Wallet, Loader2,
  FileSpreadsheet, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, Calendar, Clock, X, ChevronDown
} from "lucide-react";
import { 
  adminFetchReportSummary, 
  adminRegenerateReport 
} from "@/lib/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import CustomDatePicker from "@/components/admin/CustomDatePicker";
import CustomMonthPicker from "@/components/admin/CustomMonthPicker";

/* ─── Time Search Picker ───────────────────────── */
function TimePicker({ value, onChange, onClear }: { value: string; onChange: (v: string) => void; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const el = document.getElementById("time-picker-popup");
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const apply = () => {
    const h24 = ampm === "AM"
      ? (hour === "12" ? "00" : hour.padStart(2, "0"))
      : (hour === "12" ? "12" : String(parseInt(hour) + 12).padStart(2, "0"));
    onChange(`${h24}:${minute}`);
    setOpen(false);
  };

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const mins = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  return (
    <div className="relative" id="time-picker-popup">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-[#3A241C]/5 shadow-sm hover:shadow-md transition-all group"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
          value ? "bg-[#E76F51] text-white shadow-md shadow-[#E76F51]/20" : "bg-[#E76F51]/10 text-[#E76F51]"
        }`}>
          <Clock size={16} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-black uppercase tracking-widest ${value ? "text-[#E76F51]" : "text-[#3A241C]"}`}>
            {value ? `~${value}` : "Time"}
          </span>
          {value ? (
            <span
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="w-4 h-4 rounded-full bg-[#E76F51]/10 text-[#E76F51] flex items-center justify-center hover:bg-[#E76F51] hover:text-white transition-colors"
            >
              <X size={10} />
            </span>
          ) : (
            <ChevronDown size={12} className={`text-[#3A241C]/30 transition-transform ${open ? "rotate-180" : ""}`} />
          )}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute top-[calc(100%+6px)] left-0 z-50 bg-white rounded-[1.5rem] border border-[#3A241C]/8 shadow-2xl shadow-[#3A241C]/10 p-4 w-[210px]"
          >
            <p className="text-[8px] font-black text-[#3A241C]/30 uppercase tracking-[0.3em] mb-3">Orders around this time</p>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 bg-[#F9F7F4] rounded-xl overflow-hidden max-h-[110px] overflow-y-auto scrollbar-hide">
                {hours.map((h) => (
                  <button key={h} onClick={() => setHour(h)}
                    className={`w-full py-1.5 text-[11px] font-black text-center transition-colors ${hour === h ? "bg-[#E76F51] text-white shadow-sm" : "text-[#3A241C]/40 hover:text-[#3A241C]"}`}>
                    {h.padStart(2, "0")}
                  </button>
                ))}
              </div>
              <div className="flex-1 bg-[#F9F7F4] rounded-xl overflow-hidden max-h-[110px] overflow-y-auto scrollbar-hide">
                {mins.map((m) => (
                  <button key={m} onClick={() => setMinute(m)}
                    className={`w-full py-1.5 text-[11px] font-black text-center transition-colors ${minute === m ? "bg-[#E76F51] text-white shadow-sm" : "text-[#3A241C]/40 hover:text-[#3A241C]"}`}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1 bg-[#F9F7F4] p-1 rounded-xl">
                {(["AM", "PM"] as const).map((a) => (
                  <button key={a} onClick={() => setAmpm(a)}
                    className={`px-2 py-2 rounded-lg text-[10px] font-black transition-all ${ampm === a ? "bg-white text-[#E76F51] shadow-sm" : "text-[#3A241C]/25 hover:text-[#3A241C]"}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={apply}
              className="w-full py-3 bg-[#3A241C] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#E76F51] transition-all shadow-md shadow-[#3A241C]/10">
              Apply Filter
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReportsPage() {
  const { secret, authenticated } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Start with empty dates to show "Date Range" placeholder, 
  // but loadSummary will use 7-day default if these are empty.
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [timeSearch, setTimeSearch] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const isInitialLoad = useRef(true);

  const loadSummary = useCallback(async () => {
    if (!secret) return;
    
    // Default logic: if no range is applied, use the last 7 days.
    let finalFrom = fromDate;
    let finalTo = toDate;
    
    if (!finalFrom || !finalTo) {
      const d = new Date();
      finalTo = d.toISOString().split("T")[0];
      d.setDate(d.getDate() - 7);
      finalFrom = d.toISOString().split("T")[0];
    }
    
    // Check if range is > 15 days
    const start = new Date(finalFrom);
    const end = new Date(finalTo);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 15 && !isInitialLoad.current) {
      setToast({ message: "Range too large for preview! (>15 days)", type: "error" });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    isInitialLoad.current = false;
    setLoading(true);
    try {
      const data = await adminFetchReportSummary(finalFrom, secret, finalFrom, finalTo);
      setSummary(data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, secret]);

  useEffect(() => {
    if (authenticated) loadSummary();
  }, [authenticated, loadSummary]);

  const filteredLogs = useMemo(() => {
    if (!summary || !summary.logs) return [];
    if (!timeSearch) return summary.logs;

    const [th, tm] = timeSearch.split(":").map(Number);
    const target = th * 60 + tm;

    return summary.logs.filter((log: any) => {
      const d = new Date(log.createdAt);
      const logTime = d.getHours() * 60 + d.getMinutes();
      return Math.abs(logTime - target) <= 30;
    });
  }, [summary, timeSearch]);

  const handleGenerate = async () => {
    if (!secret || generating) return;
    
    // Use current date for manual generation if no range picked
    const targetDate = fromDate || new Date().toISOString().split("T")[0];
    
    setGenerating(true);
    try {
      await adminRegenerateReport(targetDate, secret);
      setToast({ message: "Report generated successfully", type: "success" });
      loadSummary();
    } catch (err) {
      setToast({ message: "Failed to generate report", type: "error" });
    } finally {
      setGenerating(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownloadDaily = async () => {
    if (downloading) return;
    setDownloading(true);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    
    let finalFrom = fromDate;
    let finalTo = toDate;
    if (!finalFrom || !finalTo) {
      const d = new Date();
      finalTo = d.toISOString().split("T")[0];
      d.setDate(d.getDate() - 7);
      finalFrom = d.toISOString().split("T")[0];
    }

    const url = finalFrom === finalTo 
      ? `${backendUrl}/api/admin/reports/daily?date=${finalFrom}&secret=${secret}`
      : `${backendUrl}/api/admin/reports/range?from=${finalFrom}&to=${finalTo}&secret=${secret}`;
    
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Download failed");
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = finalFrom === finalTo ? `BnB_Daily_${finalFrom}.xlsx` : `BnB_Report_${finalFrom}_to_${finalTo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      setToast({ message: "Report downloaded!", type: "success" });
    } catch (err) {
      setToast({ message: "Download failed", type: "error" });
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
      setToast({ message: "Download failed", type: "error" });
    } finally {
      setDownloading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const [viewMode, setViewMode] = useState<"range" | "month">("range");

  if (!authenticated) return null;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      
      {/* ── Unified Control Bar ────────────────────── */}
      <div className="bg-white rounded-[2.5rem] px-4 py-3 border border-[#3A241C]/5 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* View toggle */}
          <div className="flex bg-[#F9F7F4] p-1.5 rounded-xl border border-[#3A241C]/5 flex-shrink-0 items-center h-[52px]">
            {(["range", "month"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === m 
                    ? "bg-white text-[#E76F51] shadow-md shadow-[#3A241C]/5" 
                    : "text-[#3A241C]/30 hover:text-[#3A241C]/60"
                }`}
              >
                {m === "range" ? "Range" : "Month"}
              </button>
            ))}
          </div>

          {/* Dynamic Pickers */}
          <div className="flex items-center gap-2">
            {viewMode === "range" ? (
              <div className="flex items-center gap-2">
                <CustomDatePicker 
                  mode="compact"
                  fromDate={fromDate}
                  toDate={toDate}
                  onRangeChange={(from, to) => {
                    setFromDate(from || "");
                    setToDate(to || "");
                  }}
                  label="Date Range"
                />

                {/* Time Picker */}
                <TimePicker 
                  value={timeSearch} 
                  onChange={setTimeSearch} 
                  onClear={() => setTimeSearch("")} 
                />

                {/* Record Count */}
                <div className="flex items-center gap-1.5 px-1 min-w-[50px]">
                  <span className="text-[9px] font-black text-[#3A241C]/25 uppercase tracking-widest">
                    {filteredLogs.length} REC
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CustomMonthPicker 
                  value={month} 
                  onChange={setMonth} 
                  onlyMonths={false} 
                  roundedClass="rounded-xl"
                  compact={true} 
                />
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {viewMode === "range" ? (
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-[#3A241C]/5 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
                    generating ? "bg-[#E76F51] text-white" : "bg-[#E76F51]/10 text-[#E76F51]"
                  }`}>
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]">Generate</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDownloadDaily}
                  disabled={downloading}
                  className="flex items-center gap-2 px-6 h-[52px] bg-[#3A241C] text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-[#E76F51] transition-all disabled:opacity-50"
                >
                  {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {fromDate === toDate && fromDate ? "Daily Excel" : "Export Range"}
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDownloadMonthly}
                disabled={downloading}
                className="flex items-center gap-2 px-6 h-[52px] bg-[#6A994E] text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-[#5a8342] transition-all disabled:opacity-50"
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download CSV
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Total Revenue" 
          value={loading ? "---" : `₹${summary?.totalRevenue || 0}`} 
          sub={`₹${summary?.upiRevenue || 0} UPI • ₹${summary?.cashRevenue || 0} Cash`}
          icon={TrendingUp} color="#E76F51" loading={loading}
        />
        <StatCard 
          label="Orders" 
          value={loading ? "---" : (summary?.totalOrders || 0)} 
          sub="Completed checkouts"
          icon={ShoppingCart} color="#3A241C" loading={loading}
        />
        <StatCard 
          label="Items Sold" 
          value={loading ? "---" : (summary?.totalItems || 0)} 
          sub="Prepared dishes"
          icon={Calendar} color="#6A994E" loading={loading}
        />
        <StatCard 
          label="Avg Ticket" 
          value={loading ? "---" : `₹${summary && summary.totalOrders > 0 ? Math.round(summary.totalRevenue / summary.totalOrders) : 0}`} 
          sub="Revenue per session"
          icon={Wallet} color="#F4A261" loading={loading}
        />
      </div>

      {/* ── Transaction Table ────────────────────────── */}
      <div className="bg-white rounded-[2.5rem] border border-[#3A241C]/5 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-[#3A241C]/5 flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <h3 className="text-[11px] font-black text-[#3A241C] uppercase tracking-[0.3em]">Transaction Feed</h3>
            {timeSearch && (
              <span className="text-[8px] font-bold text-[#E76F51] uppercase tracking-widest flex items-center gap-1">
                <Clock size={8} /> Filtering around {timeSearch} (±30m) • {filteredLogs.length} found
              </span>
            )}
          </div>
          
          {filteredLogs.length > itemsPerPage && (
            <div className="flex items-center gap-1.5">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                className="w-8 h-8 rounded-lg bg-[#F9F7F4] flex items-center justify-center text-[#3A241C]/30 hover:text-[#E76F51] disabled:opacity-20">
                <ChevronLeft size={14} />
              </button>
              <span className="text-[9px] font-black text-[#3A241C]/30 px-2">{currentPage} / {Math.ceil(filteredLogs.length / itemsPerPage)}</span>
              <button disabled={currentPage >= Math.ceil(filteredLogs.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}
                className="w-8 h-8 rounded-lg bg-[#F9F7F4] flex items-center justify-center text-[#3A241C]/30 hover:text-[#E76F51] disabled:opacity-20">
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F9F7F4]/30">
                <th className="px-8 py-4 text-[9px] font-black text-[#3A241C]/25 uppercase tracking-widest">Time</th>
                <th className="px-8 py-4 text-[9px] font-black text-[#3A241C]/25 uppercase tracking-widest">Table</th>
                <th className="px-8 py-4 text-[9px] font-black text-[#3A241C]/25 uppercase tracking-widest">Summary</th>
                <th className="px-8 py-4 text-[9px] font-black text-[#3A241C]/25 uppercase tracking-widest text-right">Dish</th>
                <th className="px-8 py-4 text-[9px] font-black text-[#3A241C]/25 uppercase tracking-widest text-right">Pack</th>
                <th className="px-8 py-4 text-[9px] font-black text-[#3A241C]/25 uppercase tracking-widest text-right">UPI</th>
                <th className="px-8 py-4 text-[9px] font-black text-[#3A241C]/25 uppercase tracking-widest text-right">Cash</th>
                <th className="px-8 py-4 text-[9px] font-black text-[#3A241C]/25 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A241C]/5">
              {filteredLogs
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((log: any) => (
                  <tr key={log.id} className="hover:bg-[#F9F7F4]/20 transition-colors">
                    <td className="px-8 py-5 text-[11px] font-bold text-[#3A241C]/40">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[11px] font-black text-[#3A241C]">{log.tableId}</span>
                    </td>
                    <td className="px-8 py-5 max-w-[300px]">
                      <p className="text-[11px] font-black text-[#3A241C]/70 truncate">{log.itemSummary}</p>
                    </td>
                    <td className="px-8 py-5 text-[11px] font-black text-[#3A241C] text-right">₹{log.foodTotal}</td>
                    <td className="px-8 py-5 text-[11px] font-black text-[#E76F51] text-right">{log.packingTotal || "-"}</td>
                    <td className="px-8 py-5 text-[11px] font-black text-[#6A994E] text-right">{log.upiPaid || "-"}</td>
                    <td className="px-8 py-5 text-[11px] font-black text-[#F4A261] text-right">{log.cashPaid || "-"}</td>
                    <td className="px-8 py-5 text-[12px] font-black text-[#3A241C] text-right">₹{log.amount}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!filteredLogs.length && !loading && (
            <div className="py-20 text-center text-[10px] font-black text-[#3A241C]/20 uppercase tracking-[0.4em]">No data found</div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-10 right-10 px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 font-black text-[10px] uppercase tracking-widest ${
              toast.type === "success" ? "bg-[#6A994E] text-white" : "bg-[#B71C1C] text-white"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, loading }: any) {
  return (
    <div className="bg-white p-6 rounded-[2.2rem] shadow-sm border border-[#3A241C]/5 flex flex-col justify-between group hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: `${color}15`, color }}>
          <Icon size={20} />
        </div>
        {loading && <Loader2 className="animate-spin text-gray-200" size={14} />}
      </div>
      <div>
        <p className="text-[9px] font-black text-[#3A241C]/20 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-black text-[#3A241C] tracking-tight">{value}</h3>
        <p className="text-[9px] font-bold text-[#3A241C]/40 mt-1 tracking-wide">{sub}</p>
      </div>
    </div>
  );
}
