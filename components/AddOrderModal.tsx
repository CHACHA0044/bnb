"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingCart, Loader2, CheckCircle2, ChevronDown } from "lucide-react";
import { adminFetchFullMenu, type OrderMenuItem } from "@/lib/api";

interface AddOrderModalProps {
  sessionId?: string | null;
  tableId?: string | null;
  onClose: () => void;
  onSubmit: (items: any[], isTakeaway: boolean, selectedTableId?: string) => Promise<void>;
  availableTables?: string[];
}

export default function AddOrderModal({ 
  sessionId, 
  tableId: initialTableId, 
  onClose, 
  onSubmit,
  availableTables = ["T1", "T2", "T3"]
}: AddOrderModalProps) {
  const [menu, setMenu] = useState<OrderMenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isTakeaway, setIsTakeaway] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingMenu, setFetchingMenu] = useState(true);
  const [success, setSuccess] = useState(false);
  const [selectedTable, setSelectedTable] = useState(initialTableId || availableTables[0]);

  useEffect(() => {
    async function loadMenu() {
      try {
        const secret = localStorage.getItem("bnb_admin_secret") || "";
        const data = await adminFetchFullMenu(secret);
        setMenu(data.categories.flatMap(c => c.items.map(i => ({ ...i, category: c.name }))));
        setCategories(data.categories.map(c => c.name));
      } catch (err) {
        console.error("Failed to fetch menu:", err);
      } finally {
        setFetchingMenu(false);
      }
    }
    loadMenu();
  }, []);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = menu.find((m) => m.id === id)!;
        return { ...item, quantity: qty };
      });
  }, [cart, menu]);

  const total = useMemo(() => {
    let sum = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    if (isTakeaway && cartItems.length > 0) {
      sum += 20; // Packing charge
    }
    return sum;
  }, [cartItems, isTakeaway]);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleConfirm = async () => {
    if (cartItems.length === 0 || loading) return;
    setLoading(true);
    try {
      const finalItems = cartItems.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        type: isTakeaway ? "TAKEAWAY" : "DINE_IN"
      }));

      // Add packing charge item if takeaway
      if (isTakeaway) {
        finalItems.push({
          name: "Packing Charges",
          price: 20,
          quantity: 1,
          type: "TAKEAWAY"
        });
      }

      await onSubmit(finalItems, isTakeaway, selectedTable);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row h-[85vh] lg:h-[70vh]"
      >
        {/* Left: Menu Selection */}
        <div className="flex-1 overflow-hidden flex flex-col border-r border-gray-100">
          <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="text-2xl lg:text-3xl font-black text-[#3A241C]">Add Items</h3>
              <div className="flex items-center gap-3 mt-1">
                {sessionId ? (
                  <p className="text-[10px] font-black text-[#E76F51] uppercase tracking-[0.2em]">Session #{sessionId.slice(-4).toUpperCase()}</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Table:</span>
                    <select 
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-black text-[#3A241C] outline-none"
                    >
                      {availableTables.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-10 custom-scrollbar">
            {fetchingMenu ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[#E76F51]" />
              </div>
            ) : (
              categories.map(cat => (
                <div key={cat}>
                  <div className="flex items-center gap-3 mb-6">
                    <h4 className="text-[10px] font-black text-[#E76F51] uppercase tracking-[0.2em] whitespace-nowrap">{cat}</h4>
                    <div className="h-[1px] w-full bg-[#E76F51]/10" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menu.filter(m => m.category === cat).map(item => {
                      const qty = cart[item.id] || 0;
                      return (
                        <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-[#E76F51]/20 transition-all group">
                          <div className="flex-1 mr-4">
                            <p className="font-bold text-[#3A241C] text-sm group-hover:text-[#E76F51] transition-colors">{item.name}</p>
                            <p className="text-xs text-[#3A241C]/40 font-black mt-0.5">₹{item.price}</p>
                          </div>
                          <div className={`flex items-center gap-4 bg-white p-2 rounded-xl border transition-all ${qty > 0 ? "border-[#E76F51] shadow-sm" : "border-gray-100"}`}>
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className={`w-8 h-8 flex items-center justify-center transition-colors ${qty > 0 ? "text-[#E76F51]" : "text-gray-200"}`}
                            >
                              <Minus size={16} />
                            </button>
                            <span className="font-black text-[#3A241C] text-sm min-w-[20px] text-center">{qty}</span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              className="w-8 h-8 flex items-center justify-center text-[#E76F51] hover:scale-110 transition-all"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Cart Summary */}
        <div className="w-full lg:w-[360px] bg-[#F9F7F4] flex flex-col">
          <div className="p-8 border-b border-gray-100 flex items-center justify-between">
            <h4 className="font-black text-[#3A241C] flex items-center gap-2 text-sm uppercase tracking-widest">
              <ShoppingCart size={18} className="text-[#E76F51]" />
              Cart Summary
            </h4>
            <span className="bg-[#E76F51] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {cartItems.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            <AnimatePresence mode="popLayout">
              {cartItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center py-10 opacity-30"
                >
                  <ShoppingCart size={48} className="mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Your cart is empty</p>
                </motion.div>
              ) : (
                cartItems.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-black text-[#3A241C] line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{item.quantity} × ₹{item.price}</p>
                    </div>
                    <p className="text-xs font-black text-[#3A241C] ml-4">₹{item.price * item.quantity}</p>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="p-8 bg-white border-t border-gray-100 space-y-6">
            {/* Takeaway Toggle */}
            <div 
              onClick={() => setIsTakeaway(!isTakeaway)}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
            >
              <div>
                <p className="text-[10px] font-black text-[#3A241C] uppercase tracking-[0.2em]">Takeaway / Packing</p>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Extra ₹20 charge</p>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all relative ${isTakeaway ? "bg-[#6A994E]" : "bg-gray-200"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${isTakeaway ? "left-7" : "left-1"}`} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-[#3A241C]">₹{total - (isTakeaway && cartItems.length > 0 ? 20 : 0)}</span>
              </div>
              {isTakeaway && cartItems.length > 0 && (
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-gray-400">Packing Charge</span>
                  <span className="text-[#3A241C]">₹20</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t border-[#3A241C]/5">
                <span className="text-sm font-black text-[#3A241C] uppercase tracking-widest">Grand Total</span>
                <span className="text-2xl font-black text-[#E76F51]">₹{total}</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={cartItems.length === 0 || loading || success}
              className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-xl ${
                cartItems.length === 0 || loading || success
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-[#3A241C] text-white hover:bg-[#E76F51] active:scale-95 shadow-[#3A241C]/10"
              }`}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : success ? (
                <>
                  <CheckCircle2 size={18} />
                  Order Placed!
                </>
              ) : (
                "Confirm & Place Order"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
