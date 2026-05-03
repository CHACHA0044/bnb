"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Star, Calendar, Clock, CreditCard, Banknote } from "lucide-react";
import { adminFetchSessions, adminFetchFullMenu, type SessionData, type OrderMenuItem } from "@/lib/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import CustomDatePicker from "@/components/admin/CustomDatePicker";

export default function HistoryPage() {
  const { secret, authenticated } = useAdminAuth();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [menuItems, setMenuItems] = useState<OrderMenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({from: "", to: ""});

  const loadData = useCallback(async () => {
    if (!authenticated || !secret) return;
    setLoading(true);
    try {
      const [sessionData, menuData] = await Promise.all([
        adminFetchSessions(secret, dateRange.from, dateRange.to),
        adminFetchFullMenu(secret)
      ]);
      setSessions(sessionData.filter(s => s.status === "CLOSED").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      
      const flatMenu = menuData.categories.flatMap(c => c.items);
      setMenuItems(flatMenu);
    } catch (err) {
      console.error("Failed to load history data:", err);
    } finally {
      setLoading(false);
    }
  }, [authenticated, secret, dateRange.from, dateRange.to]);

  useEffect(() => { loadData(); }, [loadData]);

  const getItemRating = (name: string) => {
    // Extract base name if it has (variant) or (Pack)
    const baseName = name.split(" (")[0];
    const item = menuItems.find(m => m.name === baseName);
    return item?.rating || null;
  };

  const historyEntries = useMemo(() => {
    const entries: any[] = [];
    
    sessions.forEach(session => {
      const dineInItems: any[] = [];
      const takeawayItems: any[] = [];
      
      session.orders.forEach(order => {
        order.items.forEach(item => {
          if (item.type === "TAKEAWAY") takeawayItems.push({...item, orderCreatedAt: order.createdAt});
          else dineInItems.push({...item, orderCreatedAt: order.createdAt});
        });
      });

      // Dine-In Entry
      if (dineInItems.length > 0) {
        entries.push({
          id: `${session.id}_DINE`,
          sessionId: session.id,
          sessionNumber: session.sessionNumber,
          tableId: session.tableId,
          type: "DINE_IN",
          items: dineInItems,
          createdAt: session.createdAt,
          payment: session.payments.find(p => p.status === "CONFIRMED"),
          total: dineInItems.reduce((acc, i) => acc + i.price * i.quantity, 0)
        });
      }

      // Takeaway Entry
      if (takeawayItems.length > 0) {
        entries.push({
          id: `${session.id}_TA`,
          sessionId: session.id,
          sessionNumber: session.sessionNumber,
          tableId: session.tableId,
          type: "TAKEAWAY",
          items: takeawayItems,
          createdAt: session.createdAt,
          payment: session.payments.find(p => p.status === "CONFIRMED"),
          total: takeawayItems.reduce((acc, i) => acc + i.price * i.quantity, 0)
        });
      }
    });

    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pt-8 px-4 pb-20">
      {loading && sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }} 
            className="w-12 h-12 border-4 border-[#E76F51] border-t-transparent rounded-full shadow-lg shadow-[#E76F51]/20" 
          />
          <p className="text-[10px] font-black text-[#3A241C]/20 uppercase tracking-[0.3em]">Gathering History...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[3rem] border border-[#3A241C]/5 shadow-sm">
          <Calendar size={48} className="mx-auto text-[#3A241C]/5 mb-6" />
          <p className="text-[#3A241C]/30 font-black uppercase tracking-widest text-sm">No closed sessions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-2 mb-8 gap-4">
             <div>
               <h3 className="text-sm font-black text-[#3A241C] uppercase tracking-[0.2em]">All Settled Orders</h3>
               <p className="text-[10px] font-bold text-[#3A241C]/30 uppercase tracking-widest mt-1">Showing {sessions.length} sessions</p>
             </div>
             <CustomDatePicker 
               mode="range" 
               fromDate={dateRange.from} 
               toDate={dateRange.to} 
               onRangeChange={(from, to) => setDateRange({from, to})} 
             />
          </div>

          {historyEntries.map(entry => {
            const isExpanded = expandedSession === entry.id;
            const paymentMethod = entry.payment?.method || "PAID";
            const paymentTime = entry.payment ? new Date(entry.payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";
            
            return (
              <motion.div 
                layout
                key={entry.id} 
                className={`bg-white rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${isExpanded ? "border-[#E76F51]/30 shadow-xl shadow-[#3A241C]/5 ring-1 ring-[#E76F51]/5" : "border-[#3A241C]/5 shadow-sm hover:shadow-md"}`}
              >
                <div 
                  onClick={() => setExpandedSession(isExpanded ? null : entry.id)}
                  className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-[#F9F7F4]/50 transition-colors gap-6"
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-white text-xl shadow-lg flex-shrink-0 ${
                      entry.type === "TAKEAWAY" ? "bg-[#F4A261] shadow-[#F4A261]/20" : "bg-[#3A241C] shadow-[#3A241C]/10"
                    }`}>
                      {entry.type === "TAKEAWAY" ? "TW" : entry.tableId}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-black text-[#3A241C] text-xl">
                          {entry.type === "TAKEAWAY" ? "TW" : entry.tableId}#{entry.sessionNumber}
                        </p>
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${
                          entry.type === "TAKEAWAY" ? "bg-[#F4A261]/10 text-[#F4A261] border-[#F4A261]/10" : "bg-[#6A994E]/10 text-[#6A994E] border-[#6A994E]/10"
                        }`}>
                          {entry.type === "TAKEAWAY" ? "Takeaway" : "Dine-in"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#3A241C]/40 uppercase tracking-wider">
                          <Calendar size={12} className="text-[#E76F51]" />
                          {new Date(entry.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#3A241C]/40 uppercase tracking-wider">
                          <Clock size={12} className="text-[#E76F51]" />
                          Pay: {paymentTime}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-8 pl-0 md:pl-8">
                    <div className="flex items-center gap-3 bg-[#F9F7F4] px-5 py-3 rounded-2xl border border-[#3A241C]/5">
                      {paymentMethod === "UPI" ? <CreditCard size={16} className="text-[#E76F51]" /> : <Banknote size={16} className="text-[#6A994E]" />}
                      <span className="text-[10px] font-black text-[#3A241C]/40 uppercase tracking-widest">{paymentMethod}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#3A241C]">₹{entry.total}</p>
                      <p className="text-[9px] font-black text-[#3A241C]/20 uppercase tracking-widest">Received</p>
                    </div>
                    <motion.div 
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[#3A241C]/10 group-hover:text-[#3A241C]/30 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </motion.div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[#3A241C]/5 bg-[#F9F7F4]/20"
                    >
                      <div className="p-6 md:p-10">
                        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#3A241C]/5 shadow-sm space-y-5">
                          {entry.items.map((item: any, iIdx: number) => {
                            const rating = getItemRating(item.name);
                            return (
                              <div key={iIdx} className="flex justify-between items-center group/item">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-[#3A241C]/5 rounded-xl flex items-center justify-center text-xs font-black text-[#3A241C]/40 group-hover/item:bg-[#E76F51]/10 group-hover/item:text-[#E76F51] transition-all">
                                    {item.quantity}x
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-[#3A241C]">{item.name}</p>
                                    <p className="text-[8px] font-bold text-[#3A241C]/20 uppercase tracking-widest mt-0.5">
                                      {new Date(item.orderCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-sm font-black text-[#3A241C]">₹{item.price * item.quantity}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
