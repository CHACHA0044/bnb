"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Banknote, Bell, X, Check, Plus, Loader2, Star, Clock } from "lucide-react";
import { SessionData } from "@/lib/api";

interface AdminPaymentSummaryProps {
  tableId: string;
  session: SessionData | null;
  onConfirmPayment: (paymentId: string) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
  onToggleReminder: (sessionId: string, reminder: boolean) => Promise<void>;
  onRecordPayment: (sessionId: string, method: "CASH" | "UPI", amount: number) => Promise<void>;
  onUpdateTimer?: (orderId: string, minutes: number | null) => Promise<void>;
  onSendReviewRequest?: (sessionId: string, requested: boolean) => void;
  isTakeaway?: boolean;
}

export default function AdminPaymentSummary({
  tableId,
  session,
  onConfirmPayment,
  onDeletePayment,
  onToggleReminder,
  onRecordPayment,
  onUpdateTimer,
  onSendReviewRequest,
  isTakeaway = false,
}: AdminPaymentSummaryProps) {
  const [recordAmount, setRecordAmount] = useState<string>("");
  const [recordMethod, setRecordMethod] = useState<"CASH" | "UPI">("CASH");
  const [isRecording, setIsRecording] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [customTimerValue, setCustomTimerValue] = useState("");
  const [countdown, setCountdown] = useState<string | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<Set<number>>(new Set());
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Initialize selectedPresets only when a NEW active order is found
  useEffect(() => {
    const currentActiveOrder = session?.orders.find(o => 
      o.status !== "CANCELLED" && o.status !== "SERVED" && o.estimatedReadyTime
    );
    
    // If the active order ID changed, or we have no active order, reset/re-sync
    if (currentActiveOrder?.id !== activeOrderId) {
      setActiveOrderId(currentActiveOrder?.id || null);
      
      if (!currentActiveOrder?.estimatedReadyTime) {
        setSelectedPresets(new Set());
      } else {
        const diffMins = Math.round((new Date(currentActiveOrder.estimatedReadyTime).getTime() - Date.now()) / 60000);
        let remaining = diffMins;
        const newPresets = new Set<number>();
        // Greedy fit for presets
        if (remaining >= 15) { newPresets.add(15); remaining -= 15; }
        if (remaining >= 10) { newPresets.add(10); remaining -= 10; }
        if (remaining >= 5) { newPresets.add(5); remaining -= 5; }
        setSelectedPresets(newPresets);
      }
    }
  }, [session?.id, session?.orders.length]); // Only re-sync on session change or order count change


  useEffect(() => {
    const updateCountdown = () => {
      const orders = session?.orders || [];
      const activeTimers = orders
        .filter(o => o.status !== "CANCELLED" && o.status !== "SERVED" && o.estimatedReadyTime)
        .map(o => new Date(o.estimatedReadyTime!).getTime());
      
      if (activeTimers.length === 0) {
        setCountdown(null);
        return;
      }
      
      const maxReadyTime = Math.max(...activeTimers);
      const now = Date.now();
      const diff = maxReadyTime - now;
      
      if (diff <= 0) {
        setCountdown("READY");
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session?.orders]);

  if (!session) {
    return (
      <div className="bg-[#3A241C]/5 rounded-[2.5rem] p-5 border-2 border-dashed border-[#3A241C]/5 flex flex-col items-center justify-center text-center h-full min-h-[180px] group transition-all hover:bg-[#3A241C]/10">
        <div className="w-10 h-10 rounded-2xl bg-[#3A241C]/5 flex items-center justify-center text-[#3A241C]/20 mb-3 group-hover:scale-110 transition-transform">
          {isTakeaway ? <Plus size={20} /> : <Loader2 size={20} />}
        </div>
        <p className="text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mb-1">{isTakeaway ? "TW" : `T${tableId}`}</p>
        <p className="text-[8px] font-bold text-[#3A241C]/10 uppercase tracking-widest">Awaiting Session</p>
      </div>
    );
  }

  const orders = (session?.orders || []).filter(o => o.status !== "CANCELLED");
  const total = orders.reduce((acc, o) => 
    acc + (o.items || []).reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0) + (o.packingCharges || 0), 0
  );
  
  const payments = session?.payments || [];
  const paid = payments
    .filter(p => p.status === "CONFIRMED")
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const balance = total - paid;

  const methods = new Set(payments.map(p => p.method));
  let paymentMode = "NONE";
  if (methods.size > 1) paymentMode = "MIXED";
  else if (methods.has("UPI")) paymentMode = "UPI";
  else if (methods.has("CASH")) paymentMode = "CASH";

  const handleRecord = async () => {
    const amount = parseInt(recordAmount);
    if (isNaN(amount) || amount <= 0 || isRecording) return;
    
    setIsRecording(true);
    try {
      await onRecordPayment(session.id, recordMethod, amount);
      setRecordAmount("");
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-5 shadow-xl shadow-[#3A241C]/5 border border-[#3A241C]/5 flex flex-col h-full min-h-[280px]">

      <div className="flex justify-between items-start mb-6 px-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-black text-[#3A241C] uppercase tracking-[0.2em]">
              {session ? (isTakeaway ? `TW#${session.sessionNumber}` : `${tableId}#${session.sessionNumber}`) : `${tableId} (Idle)`}
            </p>
            {session && (
              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${
                paymentMode === "MIXED" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"
              }`}>
                {paymentMode}
              </span>
            )}
          </div>
          <p className="text-[8px] font-bold text-[#3A241C]/30 uppercase tracking-widest">Payment History</p>
        </div>
        <div className="flex items-center gap-2">
          {countdown && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] font-black text-[#E76F51] bg-[#E76F51]/5 px-2 py-1 rounded-lg border border-[#E76F51]/10 flex items-center gap-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#E76F51] animate-pulse" />
              {countdown}
            </motion.span>
          )}

          <motion.button 
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => onToggleReminder(session.id, !session.paymentReminder)}
            className={`p-2 rounded-xl transition-all border cursor-pointer relative z-10 ${
              session.paymentReminder 
                ? "bg-[#E76F51] text-white border-[#E76F51] shadow-lg shadow-[#E76F51]/20" 
                : "bg-[#E76F51]/5 text-[#E76F51] border-[#E76F51]/10 hover:bg-[#E76F51]/10"
            }`}
            title={session.paymentReminder ? "Reminder Sent" : "Send Payment Reminder"}
          >
            <Bell size={16} className={session.paymentReminder ? "animate-bounce" : ""} />
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (session) {
                onSendReviewRequest?.(session.id, !session.reviewRequested);
              }
            }}
            className={`p-2 rounded-xl transition-all border cursor-pointer relative z-10 ${
              session.reviewRequested 
                ? "bg-[#E76F51] text-white border-[#E76F51] shadow-lg shadow-[#E76F51]/20" 
                : "bg-[#E76F51]/5 text-[#E76F51] border-[#E76F51]/10 hover:bg-[#E76F51]/10"
            }`}
            title={session.reviewRequested ? "Review Requested" : "Request Review"}
          >
            <Star size={16} className={session.reviewRequested ? "animate-bounce" : ""} />
          </motion.button>

          {/* Preparation Timer Button */}
          <div className="relative flex items-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowTimer(!showTimer)}
              className={`p-2 rounded-xl transition-all border cursor-pointer relative z-10 ${
                orders.some(o => o.estimatedReadyTime) 
                  ? "bg-[#E76F51] text-white border-[#E76F51] shadow-lg shadow-[#E76F51]/20" 
                  : "bg-[#E76F51]/5 text-[#E76F51] border-[#E76F51]/10 hover:bg-[#E76F51]/10"
              }`}
              title="Set Preparation Time"
            >
              <Clock size={16} className={orders.some(o => o.estimatedReadyTime) ? "animate-bounce" : ""} />
            </motion.button>

            <AnimatePresence>
              {showTimer && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-3 p-4 bg-white rounded-[1.5rem] shadow-2xl border border-gray-100 z-[100] min-w-[200px]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-[#3A241C]/40">Active Orders Timer</h4>
                    {orders.some(o => o.estimatedReadyTime) && (
                      <button 
                        onClick={() => {
                          orders.forEach(o => onUpdateTimer?.(o.id, null));
                          setShowTimer(false);
                        }}
                        className="text-[8px] font-black text-[#B71C1C] uppercase tracking-widest hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[5, 10, 15].map(m => {
                      const isActive = selectedPresets.has(m);
                      return (
                        <button
                          key={m}
                          onClick={() => {
                            const newPresets = new Set(selectedPresets);
                            if (newPresets.has(m)) newPresets.delete(m);
                            else newPresets.add(m);
                            setSelectedPresets(newPresets);
                            
                            const totalMins = Array.from(newPresets).reduce((s, v) => s + v, 0);
                            const activeOrder = orders.find(o => o.status === "PLACED" || o.status === "PREPARING");
                            if (activeOrder) onUpdateTimer?.(activeOrder.id, totalMins === 0 ? null : totalMins);
                          }}
                          className={`py-2 rounded-xl text-[10px] font-black transition-all ${
                            isActive 
                              ? "bg-[#E76F51] text-white shadow-md shadow-[#E76F51]/20" 
                              : "bg-gray-50 hover:bg-[#E76F51]/10 hover:text-[#E76F51]"
                          }`}
                        >
                          {m}m
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      value={customTimerValue}
                      onChange={(e) => setCustomTimerValue(e.target.value)}
                      placeholder="Custom"
                      className="flex-1 min-w-0 bg-gray-50 border-none rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:ring-1 focus:ring-[#E76F51]/20"
                    />
                    <button
                      onClick={() => {
                        const mins = parseInt(customTimerValue);
                        if (mins > 0) {
                          const activeOrder = orders.find(o => o.status === "PLACED" || o.status === "PREPARING");
                          if (activeOrder) onUpdateTimer?.(activeOrder.id, mins);
                          setCustomTimerValue("");
                          setShowTimer(false);
                        }
                      }}
                      className="p-2 bg-[#3A241C] text-white rounded-xl hover:bg-[#E76F51] transition-all"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bill Summary in Payment Box */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-[#F9F7F4] rounded-2xl border border-[#3A241C]/5">
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Bill</p>
          <p className="text-sm font-black text-[#3A241C]">₹{total}</p>
        </div>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => balance > 0 && setRecordAmount(balance.toString())}
          className={`p-3 rounded-2xl border border-[#3A241C]/5 transition-all text-left ${balance > 0 ? "bg-orange-50/50 hover:bg-orange-100/50 cursor-pointer" : "bg-[#F9F7F4]"}`}
        >
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Balance</p>
          <p className={`text-sm font-black ${balance > 0 ? "text-[#E76F51]" : "text-[#6A994E]"}`}>₹{balance}</p>
        </motion.button>
      </div>

      {/* Manual Recording */}
      {balance > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[8px] font-bold text-[#3A241C]/30 uppercase tracking-widest">Record Payment</p>
            <div className="flex bg-[#F9F7F4] rounded-xl p-1 gap-1 border border-[#3A241C]/5">
              <motion.button 
                whileTap={{ scale: 0.85 }}
                onClick={() => setRecordMethod("CASH")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${recordMethod === "CASH" ? "bg-[#3A241C] text-white shadow-md" : "text-gray-400 hover:text-[#3A241C]"}`}
              >
                <Banknote size={14} />
                <span className="text-[9px] font-black uppercase">Cash</span>
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.85 }}
                onClick={() => setRecordMethod("UPI")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${recordMethod === "UPI" ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:text-[#3A241C]"}`}
              >
                <CreditCard size={14} />
                <span className="text-[9px] font-black uppercase">UPI</span>
              </motion.button>
            </div>
          </div>
          
          <div className="flex gap-2 p-1 bg-[#F9F7F4] rounded-2xl border border-[#3A241C]/5">
            <input 
              type="number" 
              placeholder={recordMethod === "CASH" ? "Enter Cash Amount" : "Enter UPI Amount"}
              value={recordAmount}
              onChange={(e) => setRecordAmount(e.target.value)}
              className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-3 text-[12px] font-black outline-none focus:border-[#E76F51] transition-all min-w-0"
            />
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleRecord}
              disabled={isRecording || !recordAmount}
              className={`flex-shrink-0 w-14 text-white rounded-xl font-black text-[14px] transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                recordMethod === "UPI" ? "bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/20" : "bg-[#3A241C] hover:bg-[#6A994E] shadow-lg shadow-black/20"
              }`}
            >
              {isRecording ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
            </motion.button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3 min-h-0">
        {(session?.payments || []).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-8">
            <CreditCard size={24} className="mb-2" />
            <p className="text-[8px] font-bold uppercase tracking-widest">No Payments Yet</p>
          </div>
        ) : (
          (session?.payments || []).map(p => (
            <div key={p.id} className={`flex justify-between items-center p-3 rounded-2xl border transition-all ${
              p.status === 'CONFIRMED' ? 'bg-[#F9F7F4]/30 border-[#3A241C]/5 opacity-60' : 'bg-[#F9F7F4] border-[#3A241C]/10 shadow-sm'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${p.method === 'UPI' ? 'bg-purple-50 text-purple-500' : 'bg-green-50 text-green-500'}`}>
                  {p.method === "UPI" ? <CreditCard size={14} /> : <Banknote size={14} />}
                </div>
                <div>
                  <p className="text-[9px] font-black text-[#3A241C] uppercase">{p.method}</p>
                  <p className={`text-[7px] font-bold uppercase tracking-widest ${
                    p.status === "CONFIRMED" ? "text-[#6A994E]" : "text-[#F4A261]"
                  }`}>{p.status}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#3A241C]">₹{p.amount}</span>
                {p.status !== "CONFIRMED" && (
                  <div className="flex items-center gap-1 ml-1">
                    <motion.button 
                      whileTap={{ scale: 0.8 }}
                      onClick={() => onConfirmPayment(p.id)}
                      className="w-7 h-7 bg-[#6A994E] text-white rounded-lg flex items-center justify-center shadow-sm shadow-[#6A994E]/20"
                    >
                      <Check size={14} />
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.8 }}
                      onClick={() => onDeletePayment(p.id)}
                      className="w-7 h-7 bg-white text-[#B71C1C] border border-red-100 rounded-lg flex items-center justify-center"
                    >
                      <X size={14} />
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
