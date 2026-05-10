"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Star, Calendar, Clock, CreditCard, Banknote,
  RefreshCw, X, Package, Search, ChevronDown, Check,
} from "lucide-react";
import { adminFetchHistory } from "@/lib/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import CustomDatePicker from "@/components/admin/CustomDatePicker";
import CustomMonthPicker from "@/components/admin/CustomMonthPicker";

/* ─── helpers ──────────────────────────────────── */
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

const StarRow = ({ rating }: { rating?: number }) => (
  <span className="flex gap-px">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} size={9} className={(rating || 0) >= s ? "fill-[#E76F51] text-[#E76F51]" : "text-[#3A241C]/10"} />
    ))}
  </span>
);

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
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-[#3A241C]/5 shadow-sm hover:shadow-md transition-all group"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
          value ? "bg-[#E76F51] text-white" : "bg-[#E76F51]/10 text-[#E76F51]"
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
              {/* Hour */}
              <div className="flex-1 bg-[#F9F7F4] rounded-xl overflow-hidden max-h-[110px] overflow-y-auto">
                {hours.map((h) => (
                  <button key={h} onClick={() => setHour(h)}
                    className={`w-full py-1.5 text-[11px] font-black text-center transition-colors ${hour === h ? "bg-[#E76F51] text-white" : "text-[#3A241C]/40 hover:text-[#3A241C]"}`}>
                    {h.padStart(2, "0")}
                  </button>
                ))}
              </div>
              <span className="text-[#3A241C]/20 font-black">:</span>
              {/* Minute */}
              <div className="flex-1 bg-[#F9F7F4] rounded-xl overflow-hidden max-h-[110px] overflow-y-auto">
                {mins.map((m) => (
                  <button key={m} onClick={() => setMinute(m)}
                    className={`w-full py-1.5 text-[11px] font-black text-center transition-colors ${minute === m ? "bg-[#E76F51] text-white" : "text-[#3A241C]/40 hover:text-[#3A241C]"}`}>
                    {m}
                  </button>
                ))}
              </div>
              {/* AM/PM */}
              <div className="flex flex-col gap-1">
                {(["AM", "PM"] as const).map((p) => (
                  <button key={p} onClick={() => setAmpm(p)}
                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black transition-colors ${ampm === p ? "bg-[#E76F51] text-white" : "bg-[#F9F7F4] text-[#3A241C]/40"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={apply}
              className="w-full py-2 bg-[#3A241C] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#E76F51] transition-colors flex items-center justify-center gap-1.5">
              <Check size={11} /> Apply
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────── */
export default function HistoryPage() {
  const { secret, authenticated } = useAdminAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"date" | "month">("date");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [timeSearch, setTimeSearch] = useState("");

  const loadData = useCallback(async () => {
    if (!authenticated || !secret) return;
    setLoading(true);
    try {
      let from = dateRange.from;
      let to = dateRange.to;
      if (viewMode === "month") {
        from = `${selectedMonth}-01`;
        const [y, m] = selectedMonth.split("-").map(Number);
        to = `${selectedMonth}-${new Date(y, m, 0).getDate()}`;
      }
      const data = await adminFetchHistory(secret, page, 50, from || undefined, to || undefined);
      setHistory(data.history || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  }, [authenticated, secret, page, dateRange.from, dateRange.to, viewMode, selectedMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Client-side ±30 min time filter
  useEffect(() => {
    if (!timeSearch) { setFiltered(history); return; }
    const [th, tm] = timeSearch.split(":").map(Number);
    const target = th * 60 + tm;
    setFiltered(history.filter((e) => {
      const d = new Date(e.createdAt);
      return Math.abs(d.getHours() * 60 + d.getMinutes() - target) <= 30;
    }));
  }, [timeSearch, history]);

  const reset = () => { setDateRange({ from: "", to: "" }); setViewMode("date"); setTimeSearch(""); setPage(1); };
  const hasFilter = dateRange.from || dateRange.to || viewMode === "month" || timeSearch;
  const display = timeSearch ? filtered : history;

  return (
    <div className="space-y-4 max-w-6xl mx-auto pt-8 px-4 pb-32">

      {/* ── Single-row control bar ─────────────── */}
      <div className="bg-white rounded-[2.5rem] px-4 py-3 border border-[#3A241C]/5 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">

          {/* View toggle */}
          <div className="flex bg-[#F9F7F4] p-1.5 rounded-xl border border-[#3A241C]/5 flex-shrink-0 items-center">
            {(["date", "month"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === m 
                    ? "bg-white text-[#E76F51] shadow-md shadow-[#3A241C]/5" 
                    : "text-[#3A241C]/30 hover:text-[#3A241C]/60"
                }`}
              >
                {m === "date" ? "Range" : "Month"}
              </button>
            ))}
          </div>

          {/* Date / Month picker */}
          <div className="w-fit">
            {viewMode === "date"
              ? <CustomDatePicker mode="compact" fromDate={dateRange.from} toDate={dateRange.to}
                  onRangeChange={(f, t) => { setPage(1); setDateRange({ from: f || "", to: t || "" }); }} />
              : <CustomMonthPicker value={selectedMonth} onChange={(m) => { setPage(1); setSelectedMonth(m); }} roundedClass="rounded-xl" />
            }
          </div>

          {/* Time search */}
          <TimePicker value={timeSearch} onChange={(v) => setTimeSearch(v)} onClear={() => setTimeSearch("")} />

          {/* Record count */}
          <span className="text-[8px] font-bold text-[#3A241C]/25 uppercase tracking-widest whitespace-nowrap hidden sm:block ml-1">
            {pagination?.total || 0} rec{timeSearch ? ` · ${filtered.length} match` : ""}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Pagination */}
          <div className="flex items-center bg-[#F9F7F4] p-0.5 rounded-xl border border-[#3A241C]/5 flex-shrink-0">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#3A241C] disabled:opacity-30">
              <ChevronRight className="rotate-180" size={13} />
            </button>
            <span className="px-2 text-[9px] font-black text-[#3A241C]/40 uppercase tracking-widest">{page}/{pagination?.pages || 1}</span>
            <button disabled={page >= (pagination?.pages || 1)} onClick={() => setPage((p) => p + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#3A241C] disabled:opacity-30">
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Refresh */}
          <button onClick={() => loadData()} disabled={loading}
            className="w-9 h-9 flex items-center justify-center bg-[#3A241C] text-white rounded-xl shadow-md disabled:opacity-50 flex-shrink-0">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Clear */}
          {hasFilter && (
            <button onClick={reset}
              className="w-9 h-9 flex items-center justify-center bg-[#E76F51]/10 text-[#E76F51] rounded-xl border border-[#E76F51]/10 hover:bg-[#E76F51] hover:text-white transition-all flex-shrink-0">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── List ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {loading && display.length === 0 ? (
          <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-40 gap-5">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-[4px] border-[#E76F51] border-t-transparent rounded-full" />
            <p className="text-[9px] font-black text-[#3A241C]/25 uppercase tracking-[0.4em]">Loading...</p>
          </motion.div>
        ) : display.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 bg-white rounded-[3rem] border border-[#3A241C]/5 shadow-sm">
            <Search size={32} className="text-[#3A241C]/10 mx-auto mb-4" />
            <h2 className="text-base font-black text-[#3A241C] uppercase mb-1">No Records</h2>
            <p className="text-[#3A241C]/25 font-bold uppercase tracking-widest text-[9px] mb-6">
              {timeSearch ? `No orders near ${timeSearch}` : "Adjust your filters"}
            </p>
            <button onClick={reset} className="px-6 py-3 bg-[#3A241C] text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-[#E76F51] transition-all">Reset</button>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 gap-2.5">
            {display.map((entry: any) => {
              const isExpanded = expandedId === entry.id;
              const tableId = entry.customerDetails?.tableId || "-";
              const sessionNum = entry.customerDetails?.sessionNumber || "";
              const isTakeaway = tableId === "TAKEAWAY";
              const subtotal = entry.totalAmount - (entry.taxesAndFees || 0);

              return (
                <motion.div layout key={entry.id}
                  className={`bg-white rounded-[1.8rem] border transition-all duration-300 overflow-hidden ${
                    isExpanded ? "border-[#E76F51]/20 shadow-xl ring-1 ring-[#E76F51]/8" : "border-[#3A241C]/5 shadow-sm hover:shadow-md"
                  }`}
                >
                  {/* Compact row */}
                  <div onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-[#F9F7F4]/40 transition-colors">

                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-[0.9rem] flex items-center justify-center font-black text-white text-[10px] flex-shrink-0 ${
                      isTakeaway ? "bg-gradient-to-br from-[#F4A261] to-[#E76F51]" : "bg-gradient-to-br from-[#3A241C] to-[#1A0F0B]"
                    }`}>
                      {isTakeaway ? "TW" : tableId}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-[#3A241C] text-[13px] tracking-tight">
                          {isTakeaway ? `Takeaway #${sessionNum}` : `Table ${tableId} · #${sessionNum}`}
                        </span>
                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border ${
                          isTakeaway ? "bg-[#F4A261]/10 text-[#F4A261] border-[#F4A261]/20" : "bg-[#6A994E]/10 text-[#6A994E] border-[#6A994E]/20"
                        }`}>
                          {isTakeaway ? "Pickup" : "Dine-in"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-[8px] font-bold text-[#3A241C]/30 uppercase tracking-wider">
                          <Calendar size={9} className="text-[#E76F51]" />{fmtDate(entry.createdAt)}
                        </span>
                        <span className="flex items-center gap-1 text-[8px] font-bold text-[#3A241C]/30 uppercase tracking-wider">
                          <Clock size={9} className="text-[#E76F51]" />{fmtTime(entry.createdAt)}
                        </span>
                        <span className="flex items-center gap-1 text-[8px] font-bold text-[#3A241C]/25">
                          {entry.paymentMethod === "UPI" ? <CreditCard size={9} /> : <Banknote size={9} />}
                          {entry.paymentMethod || "Cash"}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <span className="font-black text-[#3A241C] text-[17px] tracking-tighter flex-shrink-0">₹{entry.totalAmount}</span>

                    {/* Chevron */}
                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isExpanded ? "bg-[#E76F51] text-white" : "bg-[#F9F7F4] text-[#3A241C]/20"}`}>
                      <ChevronRight size={14} />
                    </motion.div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="overflow-hidden">
                        <div className="px-4 pb-4 pt-1 border-t border-[#3A241C]/5">

                          {/* Items */}
                          <div className="space-y-0.5 mb-3">
                            {entry.items?.map((item: any, i: number) => (
                              <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-[#3A241C]/4 last:border-0">
                                <span className="w-5 text-center text-[10px] font-black text-[#E76F51]">{item.quantity}×</span>
                                <span className="flex-1 text-[12px] font-black text-[#3A241C] tracking-tight">{item.name}</span>
                                <StarRow rating={item.rating} />
                                <span className="text-[11px] font-black text-[#3A241C]/55 w-12 text-right">₹{item.price * item.quantity}</span>
                              </div>
                            ))}
                            {(entry.taxesAndFees || 0) > 0 && (
                              <div className="flex items-center gap-2.5 py-1.5">
                                <span className="w-5" />
                                <span className="flex-1 flex items-center gap-1 text-[11px] font-bold text-[#3A241C]/35">
                                  <Package size={10} /> Packing
                                </span>
                                <span className="text-[11px] font-bold text-[#3A241C]/35 w-12 text-right">₹{entry.taxesAndFees}</span>
                              </div>
                            )}
                          </div>

                          {/* Footer row */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-[#3A241C]/8">
                            <div className="flex items-center gap-3 text-[8px] font-bold text-[#3A241C]/25 uppercase tracking-wider">
                              <span>Sub ₹{subtotal}</span>
                              <span className="w-px h-2.5 bg-[#3A241C]/10" />
                              <span className={`flex items-center gap-0.5 ${entry.paymentMethod === "UPI" ? "text-[#E76F51]" : "text-[#6A994E]"}`}>
                                {entry.paymentMethod === "UPI" ? <CreditCard size={9} /> : <Banknote size={9} />}
                                {entry.paymentMethod || "Cash"}
                              </span>
                              <span className="w-px h-2.5 bg-[#3A241C]/10" />
                              <span className="font-mono text-[7px]">{entry.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <span className="font-black text-[#3A241C] text-base tracking-tighter">₹{entry.totalAmount}</span>
                          </div>

                          {/* Notes / Feedback */}
                          {(entry.notes || entry.feedback) && (
                            <div className="mt-2.5 pt-2.5 border-t border-[#3A241C]/5 flex flex-col gap-1.5">
                              {entry.notes && (
                                <p className="text-[10px] text-[#3A241C]/35 italic border-l-2 border-[#E76F51]/25 pl-2.5">"{entry.notes}"</p>
                              )}
                              {entry.feedback && (
                                <p className="text-[10px] text-[#6A994E]/60 font-bold border-l-2 border-[#6A994E]/25 pl-2.5">{entry.feedback}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
