"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingCart, Loader2, CheckCircle2, ChevronDown, Package, Trash2 } from "lucide-react";
import { adminFetchFullMenu, type OrderMenuItem } from "@/lib/api";
import { useSocket } from "@/lib/socket-client";

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
  const [itemPacking, setItemPacking] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<"QR" | "CASH">("QR");
  const [loading, setLoading] = useState(false);
  const [fetchingMenu, setFetchingMenu] = useState(true);
  const [success, setSuccess] = useState(false);
  const [selectedTable, setSelectedTable] = useState(initialTableId || availableTables[0]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const { on } = useSocket();

  const loadMenu = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadMenu();
    const unsubs = [
      on("menu_updated", () => loadMenu())
    ];
    return () => unsubs.forEach(u => u());
  }, [loadMenu, on]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, val]) => val.quantity > 0)
      .map(([key, val]) => {
        const item = menu.find((m) => m.id === val.id)!;
        let price = item.price;
        if (val.variant && item.variantPrices && item.variantPrices[val.variant]) {
          price = item.variantPrices[val.variant];
        }
        return { 
          ...item, 
          quantity: val.quantity, 
          variant: val.variant, 
          price, 
          cartKey: key,
          forPacking: itemPacking[key] || false
        };
      });
  }, [cart, menu, itemPacking]);

  const packingCharges = useMemo(() => {
    let dosaCount = 0;
    let idliUttapamCount = 0;

    cartItems.filter(c => c.forPacking).forEach(c => {
      const cat = c.category;
      if (cat === "Benne Bliss" || cat === "Classic Dosas") dosaCount += c.quantity;
      if (cat === "Idli" || cat === "Uttapam") idliUttapamCount += c.quantity;
    });

    const dosaCharge = Math.ceil(dosaCount / 2) * 20;
    const idliUttapamCharge = Math.ceil(idliUttapamCount / 2) * 10;
    
    return dosaCharge + idliUttapamCharge;
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cartItems]);

  const total = subtotal + packingCharges;

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
        name: `${item.name}${item.variant ? ` (${item.variant})` : ""}${item.forPacking ? " (To-Go)" : ""}`,
        price: item.price,
        quantity: item.quantity,
        type: item.forPacking ? "TAKEAWAY" : "DINE_IN"
      }));

      if (packingCharges > 0) {
        finalItems.push({
          name: "Packing Charges",
          price: packingCharges,
          quantity: 1,
          type: "TAKEAWAY"
        });
      }

      await (onSubmit as any)(finalItems, cartItems.some(i => i.forPacking), selectedTable, paymentMethod, total);
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
                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Assign to Table</p>
                    <div className="flex gap-2">
                      {availableTables.map(t => (
                        <button
                          key={t}
                          onClick={() => setSelectedTable(t)}
                          className={`px-4 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                            selectedTable === t 
                              ? "bg-[#3A241C] text-white shadow-lg shadow-[#3A241C]/20 ring-2 ring-[#3A241C]/10" 
                              : "bg-white text-gray-400 border border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
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
              <motion.div 
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                  }
                }}
                className="space-y-12"
              >
                {categories.map(cat => {
                  const catItems = menu.filter(m => m.category === cat);
                  if (catItems.length === 0) return null;

                  return (
                    <motion.div 
                      key={cat}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        show: { opacity: 1, y: 0 }
                      }}
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <h4 className="text-[10px] font-black text-[#E76F51] uppercase tracking-[0.2em] whitespace-nowrap">{cat}</h4>
                        <div className="h-[1px] w-full bg-[#E76F51]/10" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {catItems.map(item => {
                          const hasVariants = item.variants && item.variants.length > 0;
                          const isExpanded = expandedItems[item.id];
                          
                          return (
                            <motion.div 
                              key={item.id} 
                              whileHover={{ y: -2 }}
                              className="flex flex-col bg-white rounded-3xl border border-gray-100 overflow-hidden transition-all shadow-sm hover:shadow-md hover:border-[#3A241C]/10"
                            >
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
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
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
                <>
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</span>
                    <button 
                      onClick={() => {
                        const allPacked = cartItems.every(i => i.forPacking);
                        const next = !allPacked;
                        const newPacking = { ...itemPacking };
                        cartItems.forEach(i => newPacking[i.cartKey] = next);
                        setItemPacking(newPacking);
                      }}
                      className="text-[10px] font-black text-[#E76F51] uppercase tracking-widest hover:underline"
                    >
                      {cartItems.every(i => i.forPacking) ? "Unpack All" : "Pack All"}
                    </button>
                  </div>
                  {cartItems.map(item => (
                    <motion.div
                      key={item.cartKey}
                      layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-[#3A241C] truncate leading-tight">{item.name}</p>
                        {item.variant && <p className="text-[8px] font-bold text-[#E76F51] uppercase tracking-tighter mt-0.5">{item.variant}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-[#3A241C]/30">₹{item.price} × {item.quantity} =</span>
                          <span className="text-[10px] font-black text-[#E76F51]">₹{item.price * item.quantity}</span>
                          {item.forPacking && <span className="text-[7px] font-black uppercase tracking-widest text-[#6A994E] bg-[#6A994E]/10 px-1.5 py-0.5 rounded-md">To-Go</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button 
                          onClick={() => setItemPacking(prev => ({ ...prev, [item.cartKey]: !prev[item.cartKey] }))}
                          className={`p-1.5 rounded-lg transition-all active:scale-75 shadow-sm border ${item.forPacking ? 'bg-[#3A241C] text-white border-[#3A241C]' : 'bg-white text-[#3A241C]/40 hover:text-[#3A241C] border-[#3A241C]/10'}`}
                          title="Toggle Packing"
                        >
                          <Package size={12} />
                        </button>
                        
                        <div className="flex items-center bg-gray-50 rounded-lg overflow-hidden p-0.5 shadow-sm border border-gray-100">
                          <button onClick={() => updateQty(item.id, -1, item.variant)} className="w-5 h-5 flex items-center justify-center text-[#3A241C]/60 hover:text-[#E76F51] active:scale-75 transition-all"><Minus size={10} /></button>
                          <span className="w-4 text-center text-[9px] font-black">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1, item.variant)} className="w-5 h-5 flex items-center justify-center text-[#3A241C]/60 hover:text-[#E76F51] active:scale-75 transition-all"><Plus size={10} /></button>
                        </div>

                        <button 
                          onClick={() => {
                            const key = item.cartKey;
                            setCart(prev => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                          }}
                          className="p-1.5 rounded-lg text-[#B71C1C]/60 hover:text-[#B71C1C] hover:bg-[#FDECEA] active:scale-75 transition-all"
                          title="Remove Item"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 lg:p-8 bg-white border-t border-gray-100 space-y-6">
            {/* Payment Selection */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setPaymentMethod("QR")}
                  className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${paymentMethod === "QR" ? "border-[#3A241C] bg-[#3A241C] text-white" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}
                >
                  QR Payment
                </button>
                <button 
                  onClick={() => setPaymentMethod("CASH")}
                  className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${paymentMethod === "CASH" ? "border-[#6A994E] bg-[#6A994E] text-white" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}
                >
                  Collect Cash
                </button>
              </div>
              {paymentMethod === "QR" && <p className="text-[9px] text-gray-400 font-bold text-center italic">Order will be sent to table as Unpaid</p>}
              {paymentMethod === "CASH" && <p className="text-[9px] text-[#6A994E] font-bold text-center italic">Payment will be recorded and settled now</p>}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                <span className="text-[#3A241C]/30">Subtotal</span>
                <span className="text-[#3A241C]">₹{subtotal}</span>
              </div>
              {packingCharges > 0 && (
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                  <span className="text-[#3A241C]/30">Packing Charges</span>
                  <span className="text-[#E76F51]">₹{packingCharges}</span>
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
                  : paymentMethod === "CASH" 
                    ? "bg-[#6A994E] text-white hover:bg-[#5a8342] active:scale-95 shadow-[#6A994E]/20"
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
                paymentMethod === "CASH" ? "Collect & Place Order" : "Confirm & Send to Table"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
