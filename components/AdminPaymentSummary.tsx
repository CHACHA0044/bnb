"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Banknote, Bell, X, Check, Plus, Loader2 } from "lucide-react";
import { SessionData } from "@/lib/api";

interface AdminPaymentSummaryProps {
  tableId: string;
  session: SessionData | null;
  onConfirmPayment: (paymentId: string) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
  onToggleReminder: (sessionId: string, reminder: boolean) => Promise<void>;
  onRecordPayment: (sessionId: string, method: "CASH" | "UPI", amount: number) => Promise<void>;
}

export default function AdminPaymentSummary({
  tableId,
  session,
  onConfirmPayment,
  onDeletePayment,
  onToggleReminder,
  onRecordPayment,
}: AdminPaymentSummaryProps) {
  const [recordAmount, setRecordAmount] = useState<string>("");
  const [recordMethod, setRecordMethod] = useState<"CASH" | "UPI">("CASH");
  const [isRecording, setIsRecording] = useState(false);

  if (!session) {
    return (
      <div className="bg-white/40 rounded-3xl p-6 border border-[#3A241C]/5 flex flex-col items-center justify-center text-center">
        <p className="text-[10px] font-black text-[#3A241C]/20 uppercase tracking-[0.2em] mb-1">Table {tableId}</p>
        <p className="text-[8px] font-bold text-[#3A241C]/10 uppercase tracking-widest">No Active Session</p>
      </div>
    );
  }

  const total = session.orders.reduce((acc, o) => 
    acc + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0
  );
  const paid = session.payments
    .filter(p => p.status === "CONFIRMED")
    .reduce((acc, p) => acc + p.amount, 0);
  const balance = total - paid;

  const methods = new Set(session.payments.map(p => p.method));
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
    <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-[#3A241C]/5 border border-[#3A241C]/5 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6 px-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-black text-[#3A241C] uppercase tracking-[0.2em]">Table {tableId}</p>
            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${
              paymentMode === "MIXED" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"
            }`}>
              {paymentMode}
            </span>
          </div>
          <p className="text-[8px] font-bold text-[#3A241C]/30 uppercase tracking-widest">Payment Queue</p>
        </div>
        <button 
          onClick={() => onToggleReminder(session.id, !session.paymentReminder)}
          className={`p-2 rounded-xl transition-all ${
            session.paymentReminder 
              ? "bg-[#E76F51] text-white shadow-lg shadow-[#E76F51]/20" 
              : "bg-[#F9F7F4] text-[#3A241C]/20 hover:bg-[#3A241C]/5"
          }`}
          title={session.paymentReminder ? "Reminder Sent" : "Send Payment Reminder"}
        >
          <Bell size={16} className={session.paymentReminder ? "animate-bounce" : ""} />
        </button>
      </div>

      {/* Bill Summary in Payment Box */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-[#F9F7F4] rounded-2xl border border-[#3A241C]/5">
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Bill</p>
          <p className="text-sm font-black text-[#3A241C]">₹{total}</p>
        </div>
        <div className="p-3 bg-[#F9F7F4] rounded-2xl border border-[#3A241C]/5">
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Balance</p>
          <p className={`text-sm font-black ${balance > 0 ? "text-[#E76F51]" : "text-[#6A994E]"}`}>₹{balance}</p>
        </div>
      </div>

      {/* Manual Recording */}
      {balance > 0 && (
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex gap-2 p-1.5 bg-[#F9F7F4] rounded-2xl border border-[#3A241C]/5">
            <div className="flex bg-white rounded-xl p-1 gap-1 border border-gray-100 shadow-sm">
              <button 
                onClick={() => setRecordMethod("CASH")}
                className={`p-1.5 rounded-lg transition-all ${recordMethod === "CASH" ? "bg-[#3A241C] text-white shadow-md" : "text-gray-400 hover:text-[#3A241C]"}`}
              >
                <Banknote size={14} />
              </button>
              <button 
                onClick={() => setRecordMethod("UPI")}
                className={`p-1.5 rounded-lg transition-all ${recordMethod === "UPI" ? "bg-[#3A241C] text-white shadow-md" : "text-gray-400 hover:text-[#3A241C]"}`}
              >
                <CreditCard size={14} />
              </button>
            </div>
            <input 
              type="number" 
              placeholder={recordMethod === "CASH" ? "Cash" : "UPI Amt"}
              value={recordAmount}
              onChange={(e) => setRecordAmount(e.target.value)}
              className="flex-1 bg-white border border-gray-100 rounded-xl px-2.5 py-2 text-[10px] font-black outline-none focus:border-[#E76F51] transition-all min-w-0"
            />
            <button 
              onClick={handleRecord}
              disabled={isRecording}
              className={`flex-shrink-0 px-3 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                recordMethod === "UPI" ? "bg-purple-600 hover:bg-purple-700" : "bg-[#3A241C] hover:bg-[#6A994E]"
              }`}
            >
              {isRecording ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Record
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 overflow-y-auto max-h-[160px] pr-2 scrollbar-hide">
        {session.payments.map(p => (
          <div key={p.id} className="flex justify-between items-center bg-[#F9F7F4]/50 p-3 rounded-2xl border border-[#3A241C]/5 group">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.method === 'UPI' ? 'bg-purple-50 text-purple-500' : 'bg-green-50 text-green-500'}`}>
                {p.method === "UPI" ? <CreditCard size={18} /> : <Banknote size={18} />}
              </div>
              <div>
                <p className="text-[10px] font-black text-[#3A241C] uppercase">{p.method}</p>
                <p className={`text-[8px] font-bold uppercase tracking-widest ${
                  p.status === "CONFIRMED" ? "text-[#6A994E]" : "text-[#F4A261]"
                }`}>{p.status}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[#3A241C]">₹{p.amount}</span>
              {p.status !== "CONFIRMED" && (
                <div className="flex items-center gap-1.5 ml-2">
                  <button 
                    onClick={() => onConfirmPayment(p.id)}
                    className="w-8 h-8 bg-[#6A994E] text-white rounded-lg flex items-center justify-center hover:scale-110 transition-all shadow-sm shadow-[#6A994E]/20"
                  >
                    <Check size={16} />
                  </button>
                  <button 
                    onClick={() => onDeletePayment(p.id)}
                    className="w-8 h-8 bg-white text-[#B71C1C] border border-red-100 rounded-lg flex items-center justify-center hover:bg-red-50 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
