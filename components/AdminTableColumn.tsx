"use client";

import { motion } from "framer-motion";
import { 
  Clock, CheckCircle2, Coffee, 
  CreditCard, Banknote, RotateCcw,
  QrCode, Download, Plus, Bell, X,
  Square, CheckSquare, PackageCheck, Check
} from "lucide-react";
import { useState, useEffect } from "react";
import { SessionData } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";

interface AdminTableColumnProps {
  tableId: string;
  session: SessionData | null;
  onUpdateStatus: (orderId: string, status: string) => Promise<void>;
  onConfirmPayment: (paymentId: string) => Promise<void>;
  onAddOrder: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => Promise<void>;
  onToggleItemServed: (itemId: string, isServed: boolean) => Promise<void>;
  onToggleOrderItems: (orderId: string, isServed: boolean) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
  onToggleReminder: (sessionId: string, reminder: boolean) => Promise<void>;
}

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

export default function AdminTableColumn({
  tableId,
  session,
  onUpdateStatus,
  onConfirmPayment,
  onAddOrder,
  onCloseSession,
  onToggleItemServed,
  onToggleOrderItems,
  onDeletePayment,
  onToggleReminder,
}: AdminTableColumnProps) {
  const [showPackedNote, setShowPackedNote] = useState(false);

  useEffect(() => {
    if (showPackedNote) {
      const timer = setTimeout(() => setShowPackedNote(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showPackedNote]);

  const handleToggleItem = async (item: any, isServed: boolean) => {
    await onToggleItemServed(item.id, isServed);
    if (isServed && item.name.toLowerCase().includes("(to-go)")) {
      setShowPackedNote(true);
    }
  };
  
  const getSessionStats = () => {
    if (!session) return { total: 0, paid: 0, balance: 0, paymentMode: "NONE" };
    
    const total = session.orders.reduce((acc, o) => 
      acc + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0
    );
    const paid = session.payments
      .filter(p => p.status === "CONFIRMED")
      .reduce((acc, p) => acc + p.amount, 0);
    
    const methods = new Set(session.payments.map(p => p.method));
    let paymentMode = "NONE";
    if (methods.size > 1) paymentMode = "MIXED";
    else if (methods.has("UPI")) paymentMode = "UPI";
    else if (methods.has("CASH")) paymentMode = "CASH";

    return { total, paid, balance: total - paid, paymentMode };
  };

  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!session) return;
    const updateTimer = () => {
      const start = new Date(session.createdAt).getTime();
      const end = start + 90 * 60 * 1000;
      const now = new Date().getTime();
      const diff = end - now;
      
      if (diff <= 0) {
        setTimeLeft("00:00");
        // Auto-reminder if balance exists and not already sent
        const { balance } = getSessionStats();
        if (balance > 0 && !session.paymentReminder) {
          onToggleReminder(session.id, true);
        }
        return;
      }
      const mins = Math.floor(diff / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session, onToggleReminder]);

  const { total, paid, balance, paymentMode } = getSessionStats();

  const allOrders = [...(session?.orders || [])].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const downloadQR = () => {
    const svg = document.getElementById(`qr-${tableId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${tableId}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gray-50/50 border-b border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner ${
              session ? "bg-[#3A241C] text-white shadow-[#3A241C]/20" : "bg-gray-100 text-gray-400"
            }`}>
              {tableId}
            </motion.div>
            <div>
              <h3 className="font-black text-[#3A241C] text-lg">Table {tableId}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {session ? `Active • #${session.sessionNumber || session.id.slice(-4).toUpperCase()}` : "Available"}
              </p>
            </div>
          </div>
          
          <div className="relative group">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              whileHover={{ backgroundColor: "rgba(255,255,255,1)", borderColor: "rgba(229,231,235,1)" }}
              className="p-2 hover:bg-white rounded-xl border border-transparent transition-all"
            >
              <QrCode size={20} className="text-gray-400" />
            </motion.button>
            <div className="absolute right-0 top-full mt-2 p-4 bg-white rounded-2xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[200px]">
              <div className="flex flex-col items-center gap-3">
                <QRCodeSVG 
                  id={`qr-${tableId}`}
                  value={`${typeof window !== "undefined" ? window.location.origin : "https://bnb-ten-omega.vercel.app"}/table/${tableId}`} 
                  size={150}
                  level="H"
                />
                <p className="text-[10px] font-black text-[#3A241C] uppercase tracking-tighter">
                  {typeof window !== "undefined" ? window.location.host : "bnb-ten-omega.vercel.app"}/table/{tableId}
                </p>
                <div className="flex gap-2 w-full">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={downloadQR} 
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 rounded-xl text-[10px] font-bold hover:bg-gray-100 transition-all"
                  >
                    <Download size={14} /> Download
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {session && (
          <div className="mt-4 space-y-4">
            <div className={`flex justify-between items-center bg-white p-3 rounded-2xl border shadow-sm transition-all ${
              timeLeft === "00:00" && balance > 0 
                ? "border-red-200 bg-red-50/30 animate-pulse" 
                : "border-gray-100"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  timeLeft === "00:00" && balance > 0 ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-[#E76F51]/10 text-[#E76F51]"
                }`}>
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#3A241C] uppercase">
                    {timeLeft === "00:00" && balance > 0 ? "Time Expired" : "Session Timer"}
                  </p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                    {timeLeft === "00:00" && balance > 0 ? "Pending Payment" : `Started @ ${new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-black tracking-tighter ${timeLeft === "00:00" ? "text-red-600" : "text-[#3A241C]"}`}>{timeLeft}</p>
                <p className="text-[7px] font-black text-gray-300 uppercase">Remaining</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => onAddOrder(session.id)}
                className="py-2.5 bg-[#3A241C] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#E76F51] transition-all shadow-lg shadow-[#3A241C]/10 flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add Items
              </motion.button>
              <motion.button 
                whileTap={balance > 0 ? {} : { scale: 0.95 }}
                whileHover={balance > 0 ? {} : { scale: 1.02 }}
                onClick={() => {
                  if (balance > 0) {
                    const el = document.getElementById(`payment-${session.id}`);
                    el?.scrollIntoView({ behavior: "smooth" });
                  } else {
                    onCloseSession(session.id);
                  }
                }}
                className={`py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  balance > 0 
                    ? "bg-orange-50 text-orange-600 border border-orange-200 cursor-not-allowed opacity-50" 
                    : "bg-[#6A994E] text-white hover:opacity-90 shadow-lg shadow-[#6A994E]/10"
                }`}
              >
                {balance > 0 ? (
                  <>
                    <Banknote size={14} /> Settle ₹{balance}
                  </>
                ) : (
                  <>
                    <Check size={14} /> Close Session
                  </>
                )}
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {!session ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 opacity-40">
              <Coffee size={40} className="text-[#3A241C]" />
            </div>
            <p className="font-black text-[#3A241C]/40 text-sm uppercase tracking-widest mb-6">Available</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAddOrder("")}
              className="px-6 py-3 bg-[#3A241C] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#3A241C]/10 flex items-center gap-2"
            >
              <Plus size={14} /> Start Order
            </motion.button>
          </div>
        ) : (
          <>
            {/* Continuous Orders List */}
            <div className="space-y-4">
              {allOrders.length === 0 ? (
                <div className="py-10 text-center opacity-20">
                  <p className="text-[10px] font-black uppercase tracking-widest">No Orders Yet</p>
                </div>
              ) : (
                allOrders.map(order => {
                  const status = order.status as "PLACED" | "PREPARING" | "SERVED";
                  const statusConfig = {
                    PLACED: { color: "bg-[#B71C1C]", label: "Placed", icon: <Clock size={12} /> },
                    PREPARING: { color: "bg-[#F4A261]", label: "Preparing", icon: <Clock size={12} className="animate-spin-slow" /> },
                    SERVED: { color: "bg-[#6A994E]", label: "Served", icon: <CheckCircle2 size={12} /> },
                  };
                  const config = statusConfig[status] || statusConfig.PLACED;
                  const allServed = order.items.every(i => i.isServed);

                  return (
                    <div 
                      key={order.id} 
                      className={`rounded-2xl p-4 border transition-all group relative ${
                        allServed 
                          ? "bg-[#6A994E]/5 border-[#6A994E]/20" 
                          : "bg-gray-50 border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      {/* Status Indicator Bar */}
                      <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full ${allServed ? "bg-[#6A994E]" : config.color}`} />
                      
                      <div className="flex justify-between items-start mb-3 ml-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <motion.button 
                              whileTap={{ scale: 0.8 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleOrderItems(order.id, !allServed);
                              }}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shadow-sm ${
                                allServed 
                                  ? "bg-[#6A994E] border-[#6A994E] text-white" 
                                  : "bg-white border-gray-200 text-transparent hover:border-[#3A241C]/20"
                              }`}
                              title={allServed ? "Deselect All" : "Select All"}
                            >
                              <CheckSquare size={14} className={allServed ? "opacity-100" : "opacity-0"} />
                            </motion.button>
                            <div className="relative">
                              <select
                                value={status}
                                onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                                className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full text-white cursor-pointer outline-none appearance-none border-none transition-colors ${
                                  allServed ? "bg-[#6A994E]" : config.color
                                }`}
                              >
                                <option value="PLACED">Placed</option>
                                <option value="PREPARING">Preparing</option>
                                <option value="SERVED">Served</option>
                              </select>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {order.isTakeaway && (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-[#E76F51]/10 text-[#E76F51] px-2 py-0.5 rounded-full w-fit mt-1">
                              Takeaway
                            </span>
                          )}
                        </div>
                          {/* Quick Action Button Set */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {status !== "SERVED" ? (
                              <>
                                <motion.button
                                  whileTap={{ scale: 0.8 }}
                                  onClick={() => onUpdateStatus(order.id, status === "PREPARING" ? "PLACED" : "PREPARING")}
                                  className={`p-2 rounded-xl transition-all ${
                                    status === "PREPARING" 
                                      ? "bg-[#F4A261] text-white shadow-lg shadow-[#F4A261]/20" 
                                      : "bg-white text-[#F4A261] border border-[#F4A261]/20 hover:bg-[#F4A261]/5"
                                  }`}
                                  title={status === "PREPARING" ? "Revert to Placed" : "Start Preparing"}
                                >
                                  <Clock size={16} className={status === "PREPARING" ? "animate-spin-slow" : ""} />
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: 0.8 }}
                                  onClick={() => onUpdateStatus(order.id, "SERVED")}
                                  className={`p-2 rounded-xl transition-all ${
                                    allServed 
                                      ? "bg-[#6A994E] text-white shadow-lg shadow-[#6A994E]/20" 
                                      : "bg-white text-[#6A994E] border border-[#6A994E]/20 hover:bg-[#6A994E]/5"
                                  }`}
                                  title="Mark Served"
                                >
                                  <Check size={16} />
                                </motion.button>
                              </>
                            ) : (
                              <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={() => onUpdateStatus(order.id, "PLACED")}
                                className="p-2 bg-[#6A994E]/10 text-[#6A994E] rounded-xl hover:bg-[#B71C1C]/10 hover:text-[#B71C1C] transition-all group"
                                title="Revert to Placed"
                              >
                                <CheckCircle2 size={16} className="group-hover:hidden" />
                                <X size={16} className="hidden group-hover:block" />
                              </motion.button>
                            )}
                          </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-2 mt-4 ml-2">
                        {order.items
                          .filter(i => i.name !== "Packing Charges")
                          .map((item) => (
                          <div 
                            key={item.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleItem(item, !item.isServed);
                            }}
                            className={`flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all ${
                              item.isServed 
                                ? "bg-white/50 opacity-60" 
                                : "bg-white shadow-sm hover:shadow-md"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <motion.div 
                                whileTap={{ scale: 0.8 }}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                                item.isServed 
                                  ? "bg-[#6A994E] border-[#6A994E] text-white shadow-sm" 
                                  : "bg-white border-gray-200 text-transparent"
                              }`}>
                                {item.isServed ? <CheckSquare size={14} /> : <Square size={14} className="text-gray-200" />}
                              </motion.div>
                              <div className="flex flex-col">
                                <span className={`text-xs font-bold leading-tight ${item.isServed ? "text-gray-400 line-through" : "text-[#3A241C]"}`}>
                                  {item.name}
                                </span>
                                <span className={`text-[10px] font-bold ${item.isServed ? "text-[#6A994E]/40" : "text-[#6A994E]"}`}>
                                  × {item.quantity}
                                </span>
                              </div>
                            </div>
                            <span className={`text-sm font-black ${item.isServed ? "text-gray-300" : "text-gray-400"}`}>
                              ₹{item.price * item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Notification Portal for this table */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200]">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: showPackedNote ? 0 : 50, opacity: showPackedNote ? 1 : 0 }}
                className="bg-[#3A241C] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
              >
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <PackageCheck size={18} className="text-[#6A994E]" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">Notification sent to table {tableId} about their takeaway!</p>
              </motion.div>
            </div>

          </>
        )}
      </div>

    </div>
  );
}
