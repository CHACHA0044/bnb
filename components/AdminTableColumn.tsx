"use client";

import { motion } from "framer-motion";
import { 
  Clock, CheckCircle2, Coffee, 
  CreditCard, Banknote, RotateCcw,
  QrCode, Download, Plus, Bell, X
} from "lucide-react";
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
  onDeletePayment,
  onToggleReminder,
}: AdminTableColumnProps) {
  
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

  const { total, paid, balance, paymentMode } = getSessionStats();

  const groupedOrders = {
    PLACED: session?.orders.filter(o => o.status === "PLACED") || [],
    PREPARING: session?.orders.filter(o => o.status === "PREPARING") || [],
    SERVED: session?.orders.filter(o => o.status === "SERVED") || [],
  };

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
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black ${
              session ? "bg-[#3A241C] text-white" : "bg-gray-100 text-gray-400"
            }`}>
              {tableId}
            </div>
            <div>
              <h3 className="font-black text-[#3A241C] text-lg">Table {tableId}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {session ? `Active • #${session.id.slice(-4).toUpperCase()}` : "Available"}
              </p>
            </div>
          </div>
          
          <div className="relative group">
            <button className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all">
              <QrCode size={20} className="text-gray-400" />
            </button>
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
                  <button onClick={downloadQR} className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 rounded-xl text-[10px] font-bold hover:bg-gray-100">
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {session && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-2xl border border-gray-100">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Bill</p>
              <p className="text-sm font-black text-[#3A241C]">₹{total}</p>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-gray-100">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Balance</p>
              <p className={`text-sm font-black ${balance > 0 ? "text-[#E76F51]" : "text-[#6A994E]"}`}>₹{balance}</p>
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
            {/* Status Groups */}
            {(["PLACED", "PREPARING", "SERVED"] as const).map(status => {
              const orders = groupedOrders[status];
              if (orders.length === 0) return null;

              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      status === "PLACED" ? "bg-[#B71C1C]" : 
                      status === "PREPARING" ? "bg-[#F4A261]" : "bg-[#6A994E]"
                    }`} />
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {status} ({orders.length})
                    </h4>
                  </div>

                  {orders.map(order => (
                    <div key={order.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-gray-200 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-400">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {order.isTakeaway && (
                            <span className="text-[8px] font-black text-[#E76F51] uppercase tracking-tighter mt-0.5 bg-[#E76F51]/10 px-1.5 py-0.5 rounded-full self-start">
                              Takeaway
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          {status === "PLACED" && (
                            <button 
                              onClick={() => onUpdateStatus(order.id, "PREPARING")}
                              className="p-1.5 bg-[#F4A261] text-white rounded-lg hover:scale-110 transition-all shadow-sm"
                              title="Start Preparing"
                            >
                              <Clock size={14} />
                            </button>
                          )}
                          {status === "PREPARING" && (
                            <>
                              <button 
                                onClick={() => onUpdateStatus(order.id, "PLACED")}
                                className="p-1.5 bg-gray-200 text-gray-500 rounded-lg hover:scale-110 transition-all"
                                title="Revert to Placed"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button 
                                onClick={() => onUpdateStatus(order.id, "SERVED")}
                                className="p-1.5 bg-[#6A994E] text-white rounded-lg hover:scale-110 transition-all shadow-sm"
                                title="Mark as Served"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            </>
                          )}
                          {status === "SERVED" && (
                            <button 
                              onClick={() => onUpdateStatus(order.id, "PREPARING")}
                              className="p-1.5 bg-gray-200 text-gray-500 rounded-lg hover:scale-110 transition-all"
                              title="Revert to Preparing"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {order.items
                          .filter(i => i.name !== "Packing Charges")
                          .map((item) => (
                          <div key={item.id} className="flex justify-between items-center text-xs group/item">
                            <div className="flex items-center gap-2 flex-1">
                              <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={() => onToggleItemServed(item.id, !item.isServed)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                  item.isServed 
                                    ? "bg-[#6A994E] border-[#6A994E] text-white shadow-sm" 
                                    : "bg-white border-gray-200 text-transparent hover:border-[#6A994E]/30"
                                }`}
                              >
                                <CheckCircle2 size={12} className={item.isServed ? "opacity-100" : "opacity-0"} />
                              </motion.button>
                              <span className={`font-bold transition-all ${item.isServed ? "text-[#3A241C]/30 line-through" : "text-[#3A241C]"}`}>
                                {item.name} <span className={`font-medium ml-1 ${item.isServed ? "text-gray-200" : "text-gray-400"}`}>× {item.quantity}</span>
                              </span>
                            </div>
                            <span className={`font-bold transition-all ${item.isServed ? "text-gray-200" : "text-gray-400"}`}>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Payments Summary */}
            {session.payments.length > 0 && (
              <div className="pt-4 mt-4 border-t border-dashed border-gray-200 space-y-3">
                <div className="flex justify-between items-center px-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payments</h4>
                  <button 
                    onClick={() => onToggleReminder(session.id, !session.paymentReminder)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                      session.paymentReminder 
                        ? "bg-[#E76F51] text-white shadow-lg shadow-[#E76F51]/20" 
                        : "bg-[#F9F7F4] text-[#3A241C]/40 hover:bg-[#3A241C]/5"
                    }`}
                  >
                    <Bell size={10} className={session.paymentReminder ? "animate-bounce" : ""} />
                    {session.paymentReminder ? "Reminder On" : "Send Reminder"}
                  </button>
                </div>
                {session.payments.map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      {p.method === "UPI" ? <CreditCard size={14} className="text-purple-500" /> : <Banknote size={14} className="text-green-500" />}
                      <div>
                        <p className="text-[10px] font-bold text-[#3A241C]">{p.method}</p>
                        <p className={`text-[8px] font-black uppercase ${
                          p.status === "CONFIRMED" ? "text-[#6A994E]" : "text-[#F4A261]"
                        }`}>{p.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#3A241C]">₹{p.amount}</span>
                      {p.status !== "CONFIRMED" && (
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => onConfirmPayment(p.id)}
                            className="px-2.5 py-1 bg-[#6A994E] text-white rounded-lg text-[8px] font-bold uppercase hover:opacity-80 shadow-sm"
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => onDeletePayment(p.id)}
                            className="p-1 text-[#B71C1C] hover:bg-red-50 rounded-lg transition-colors"
                            title="Deny Payment"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      {session && (
        <div className="p-6 border-t border-gray-100 space-y-3 bg-white">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Payment Mode</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              paymentMode === "MIXED" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"
            }`}>
              {paymentMode}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => onAddOrder(session.id)}
              className="py-3 px-4 bg-gray-50 text-[#3A241C] rounded-2xl font-black text-xs hover:bg-gray-100 transition-all border border-gray-100 flex items-center justify-center gap-2"
            >
              <Plus size={14} /> Add Items
            </motion.button>
            <motion.button 
              whileHover={balance <= 0 ? { scale: 1.02 } : {}}
              whileTap={balance <= 0 ? { scale: 0.98 } : {}}
              onClick={() => onCloseSession(session.id)}
              disabled={balance > 0}
              className={`py-3 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                balance > 0 
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed" 
                  : "bg-[#3A241C] text-white hover:bg-[#E76F51] shadow-lg shadow-[#3A241C]/10"
              }`}
            >
              Close Session
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
