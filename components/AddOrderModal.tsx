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
  // cart: key is id (+ variant if applicable)
  const [cart, setCart] = useState<Record<string, { id: string; quantity: number; variant?: string }>>({});
  const [isTakeaway, setIsTakeaway] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingMenu, setFetchingMenu] = useState(true);
  const [success, setSuccess] = useState(false);
  const [selectedTable, setSelectedTable] = useState(initialTableId || availableTables[0]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
// ... existing loadMenu logic ...
    async function loadMenu() {
      try {
        const secret = localStorage.getItem("bnb_admin_secret") || "";
        const data = await adminFetchFullMenu(secret);
        // Filter out automatic items
        const filteredCategories = data.categories.filter(c => c.name !== "Others" && c.name !== "Hidden");
        const allItems = data.categories.flatMap(c => 
          c.items
            .filter(i => i.name !== "Packing Charges")
            .map(i => ({ ...i, category: c.name }))
        );
        setMenu(allItems);
        setCategories(filteredCategories.map(c => c.name));
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
      .filter(([, val]) => val.quantity > 0)
      .map(([key, val]) => {
        const item = menu.find((m) => m.id === val.id)!;
        let price = item.price;
        if (val.variant && item.variantPrices && item.variantPrices[val.variant]) {
          price = item.variantPrices[val.variant];
        }
        return { ...item, quantity: val.quantity, variant: val.variant, price, cartKey: key };
      });
  }, [cart, menu]);

  const total = useMemo(() => {
    let sum = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    if (isTakeaway && cartItems.length > 0) {
      sum += 20; // Packing charge
    }
    return sum;
  }, [cartItems, isTakeaway]);

  const updateQty = (id: string, delta: number, variant?: string) => {
    const key = variant ? `${id}:${variant}` : id;
    setCart((prev) => {
      const current = prev[key] || { id, quantity: 0, variant };
      const nextQty = Math.max(0, current.quantity + delta);
      return { ...prev, [key]: { ...current, quantity: nextQty } };
    });
  };

  const handleConfirm = async () => {
    if (cartItems.length === 0 || loading) return;
    setLoading(true);
    try {
      const finalItems = cartItems.map(item => ({
        name: item.variant ? `${item.name} (${item.variant})` : item.name,
        price: item.price,
        quantity: item.quantity,
        type: isTakeaway ? "TAKEAWAY" : "DINE_IN"
      }));

      // Packing charge handled by backend? User said "we add those based on original logic"
      // If we need to be explicit:
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-6xl bg-white rounded-none sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row h-full sm:h-[90vh] lg:h-[80vh]"
      >
        {/* Left: Menu Selection */}
        <div className="flex-1 overflow-hidden flex flex-col border-r border-gray-100">
          <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-md sticky top-0 z-10">
            <div>
              <h3 className="text-2xl lg:text-3xl font-black text-[#3A241C]">Add Items</h3>
              <div className="flex items-center gap-3 mt-1">
                {sessionId ? (
                  <p className="text-[10px] font-black text-[#E76F51] uppercase tracking-[0.2em]">Session #{sessionId.slice(-4).toUpperCase()}</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Table:</span>
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
            <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-colors lg:hidden">
              <X size={24} className="text-[#3A241C]" />
            </button>
            <button onClick={onClose} className="hidden lg:flex p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-10 custom-scrollbar">
            {fetchingMenu ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[#E76F51]" />
              </div>
            ) : (
              categories.map(cat => {
                const catItems = menu.filter(m => m.category === cat);
                if (catItems.length === 0) return null;

                return (
                  <div key={cat}>
                    <div className="flex items-center gap-3 mb-6">
                      <h4 className="text-[10px] font-black text-[#E76F51] uppercase tracking-[0.2em] whitespace-nowrap">{cat}</h4>
                      <div className="h-[1px] w-full bg-[#E76F51]/10" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {catItems.map(item => {
                        const hasVariants = item.variants && item.variants.length > 0;
                        const isExpanded = expandedItems[item.id];
                        
                        return (
                          <div key={item.id} className="flex flex-col bg-gray-50 rounded-2xl border border-[#3A241C]/5 overflow-hidden transition-all">
                            <div 
                              onClick={() => hasVariants && setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className={`flex justify-between items-center p-3 sm:p-4 ${hasVariants ? "cursor-pointer hover:bg-gray-100/50" : ""}`}
                            >
                              <div className="flex-1">
                                <p className="font-bold text-[#3A241C] text-sm leading-tight">{item.name}</p>
                                <p className="text-[10px] text-[#3A241C]/40 font-black mt-0.5">
                                  {hasVariants ? "Customizable" : `₹${item.price}`}
                                </p>
                              </div>
                              
                              {hasVariants ? (
                                <motion.div 
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#E76F51] shadow-sm border border-gray-100"
                                >
                                  <ChevronDown size={16} />
                                </motion.div>
                              ) : (
                                <div className={`flex items-center gap-3 bg-white p-1 rounded-xl border transition-all ${cart[item.id]?.quantity > 0 ? "border-[#E76F51] shadow-sm" : "border-gray-100"}`}>
                                  <button onClick={(e) => { e.stopPropagation(); updateQty(item.id, -1); }} className={`w-7 h-7 flex items-center justify-center transition-colors ${cart[item.id]?.quantity > 0 ? "text-[#E76F51]" : "text-gray-200"}`}><Minus size={14} /></button>
                                  <span className="font-black text-[#3A241C] text-xs min-w-[15px] text-center">{cart[item.id]?.quantity || 0}</span>
                                  <button onClick={(e) => { e.stopPropagation(); updateQty(item.id, 1); }} className="w-7 h-7 flex items-center justify-center text-[#E76F51]"><Plus size={14} /></button>
                                </div>
                              )}
                            </div>

                            <AnimatePresence>
                              {hasVariants && isExpanded && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="bg-white/50 border-t border-gray-100"
                                >
                                  <div className="p-3 space-y-2">
                                    {item.variants?.map(v => {
                                      const isOOS = item.outOfStockVariants?.includes(v);
                                      const vPrice = item.variantPrices?.[v] || item.price;
                                      const qty = cart[`${item.id}:${v}`]?.quantity || 0;
                                      
                                      if (isOOS && qty === 0) return (
                                        <div key={v} className="flex justify-between items-center p-2 rounded-lg opacity-40 grayscale bg-gray-50 border border-dashed border-gray-200">
                                          <span className="text-[10px] font-bold text-[#3A241C] ml-2">{v} (Sold Out)</span>
                                        </div>
                                      );

                                      return (
                                        <div key={v} className={`flex justify-between items-center p-2 rounded-xl border transition-all ${qty > 0 ? "bg-[#E76F51]/5 border-[#E76F51]/20" : "bg-white border-gray-100 shadow-sm"}`}>
                                          <span className="text-[10px] font-bold text-[#3A241C]/80 ml-2">{v} (₹{vPrice})</span>
                                          <div className={`flex items-center gap-3 p-1 rounded-lg transition-all`}>
                                            <button onClick={() => updateQty(item.id, -1, v)} className={`w-6 h-6 flex items-center justify-center transition-colors ${qty > 0 ? "text-[#E76F51]" : "text-gray-300"}`}><Minus size={12} /></button>
                                            <span className="font-black text-[#3A241C] text-[11px] min-w-[15px] text-center">{qty}</span>
                                            <button onClick={() => updateQty(item.id, 1, v)} className="w-6 h-6 flex items-center justify-center text-[#E76F51]"><Plus size={12} /></button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Cart Summary */}
        <div className="w-full lg:w-[400px] bg-[#F9F7F4] flex flex-col h-[40vh] sm:h-auto overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white lg:bg-transparent">
            <h4 className="font-black text-[#3A241C] flex items-center gap-2 text-sm uppercase tracking-widest">
              <ShoppingCart size={18} className="text-[#E76F51]" />
              Cart Summary
            </h4>
            <span className="bg-[#E76F51] text-white text-[10px] font-black px-3 py-1 rounded-full">
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {cartItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center py-10 opacity-20"
                >
                  <ShoppingCart size={40} className="mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Empty Cart</p>
                </motion.div>
              ) : (
                cartItems.map(item => (
                  <motion.div
                    key={item.cartKey}
                    layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-xs font-black text-[#3A241C] truncate">{item.name}</p>
                      {item.variant && <p className="text-[9px] font-bold text-[#E76F51] uppercase tracking-tighter mt-0.5">{item.variant}</p>}
                      <p className="text-[10px] text-gray-400 font-bold mt-1">{item.quantity} × ₹{item.price}</p>
                    </div>
                    <p className="text-sm font-black text-[#3A241C]">₹{item.price * item.quantity}</p>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 lg:p-8 bg-white border-t border-gray-100 space-y-6">
            <div 
              onClick={() => setIsTakeaway(!isTakeaway)}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-[#3A241C]/5"
            >
              <div>
                <p className="text-[10px] font-black text-[#3A241C] uppercase tracking-[0.2em]">Takeaway / Packing</p>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Extra ₹20 charge</p>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all relative ${isTakeaway ? "bg-[#6A994E]" : "bg-gray-200"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${isTakeaway ? "left-7" : "left-1"}`} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                <span className="text-[#3A241C]/30">Subtotal</span>
                <span className="text-[#3A241C]">₹{total - (isTakeaway && cartItems.length > 0 ? 20 : 0)}</span>
              </div>
              {isTakeaway && cartItems.length > 0 && (
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                  <span className="text-[#3A241C]/30">Packing</span>
                  <span className="text-[#E76F51]">₹20</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t border-[#3A241C]/5">
                <span className="text-sm font-black text-[#3A241C] uppercase tracking-widest">Grand Total</span>
                <span className="text-3xl font-black text-[#3A241C]">₹{total}</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={cartItems.length === 0 || loading || success}
              className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-xl ${
                cartItems.length === 0 || loading || success
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#3A241C] text-white hover:bg-[#E76F51] active:scale-95 shadow-[#3A241C]/20"
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
