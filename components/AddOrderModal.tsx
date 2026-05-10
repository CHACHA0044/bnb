"use client";

import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Loader2, CheckCircle2, Package, Trash2, Minus, Plus } from "lucide-react";
import { adminFetchFullMenu, type OrderMenuItem } from "@/lib/api";
import { useSocket } from "@/lib/socket-client";
import AddOrderItem from "./order/AddOrderItem";

interface AddOrderModalProps {
  sessionId?: string | null;
  tableId?: string | null;
  onClose: () => void;
  onSubmit: (items: any[], isTakeaway: boolean, selectedTableId?: string, paymentMethod?: "CASH" | "QR", total?: number) => Promise<void>;
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
  const [cart, setCart] = useState<Record<string, { id: string; quantity: number; variant?: string }>>({});
  const [itemPacking, setItemPacking] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<"QR" | "CASH">("QR");
  const [loading, setLoading] = useState(false);
  const [fetchingMenu, setFetchingMenu] = useState(true);
  const [success, setSuccess] = useState(false);
  const [selectedTable, setSelectedTable] = useState(initialTableId || availableTables[0]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());

  const { on } = useSocket();

  const loadMenu = useCallback(async () => {
    try {
      const secret = localStorage.getItem("bnb_admin_secret") || "";
      const data = await adminFetchFullMenu(secret);
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
    const unsubs = [on("menu_updated", () => loadMenu())];
    return () => unsubs.forEach(u => u());
  }, [loadMenu, on]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, val]) => val.quantity > 0)
      .map(([key, val]) => {
        const item = menu.find((m) => m.id === val.id)!;
        if (!item) return null;
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
      }).filter(Boolean) as any[];
  }, [cart, menu, itemPacking]);

  const packingCharges = useMemo(() => {
    let dosaCount = 0;
    let idliUttapamCount = 0;
    cartItems.filter(c => c.forPacking).forEach(c => {
      if (c.category === "Benne Bliss" || c.category === "Classic Dosas") dosaCount += c.quantity;
      if (c.category === "Idli" || c.category === "Uttapam") idliUttapamCount += c.quantity;
    });
    return (Math.ceil(dosaCount / 2) * 20) + (Math.ceil(idliUttapamCount / 2) * 10);
  }, [cartItems]);

  const subtotal = useMemo(() => cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [cartItems]);
  const total = subtotal + packingCharges;

  const updateQty = useCallback((id: string, delta: number, variant?: string) => {
    const key = variant ? `${id}:${variant}` : id;
    setCart((prev) => {
      const current = prev[key] || { id, quantity: 0, variant };
      const nextQty = Math.max(0, current.quantity + delta);
      return { ...prev, [key]: { ...current, quantity: nextQty } };
    });
  }, []);

  const handleConfirm = async () => {
    if (cartItems.length === 0 || loading) return;
    setLoading(true);
    try {
      const finalItems = cartItems.map(item => ({
        name: `${item.name}${item.variant ? ` (${item.variant})` : ""}${item.forPacking ? " (Packing)" : ""}`,
        price: item.price,
        quantity: item.quantity,
        type: item.forPacking ? "TAKEAWAY" : "DINE_IN"
      }));

      if (packingCharges > 0) {
        finalItems.push({ name: "Packing Charges", price: packingCharges, quantity: 1, type: "TAKEAWAY" });
      }

      await onSubmit(finalItems, cartItems.some(i => i.forPacking), selectedTable, paymentMethod, total);
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 overflow-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-6xl bg-white rounded-none sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row h-full sm:h-[90vh] lg:h-[80vh]"
      >
        <div className="flex-1 overflow-hidden flex flex-col border-r border-gray-100">
          <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-md sticky top-0 z-10">
            <div>
              <h3 className="text-2xl lg:text-3xl font-black text-[#3A241C]">Add Items</h3>
              <div className="flex items-center gap-3 mt-1">
                {sessionId ? (
                  <p className="text-[10px] font-black text-[#E76F51] uppercase tracking-[0.2em]">Session #{sessionId.slice(-4).toUpperCase()}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Assign to Table</p>
                    <div className="flex gap-2">
                      {availableTables.map(t => (
                        <button key={t} onClick={() => setSelectedTable(t)} className={`px-4 py-1.5 rounded-xl text-[11px] font-black transition-all ${selectedTable === t ? "bg-[#3A241C] text-white shadow-lg shadow-[#3A241C]/20 ring-2 ring-[#3A241C]/10" : "bg-white text-gray-400 border border-gray-100 hover:border-gray-200"}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={24} className="text-gray-400" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-10 custom-scrollbar">
            {fetchingMenu ? (
              <div className="h-full flex items-center justify-center"><Loader2 size={32} className="animate-spin text-[#E76F51]" /></div>
            ) : (
              <div className="space-y-12">
                {categories.map(cat => {
                  const catItems = menu.filter(m => m.category === cat);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-3 mb-6">
                        <h4 className="text-[10px] font-black text-[#E76F51] uppercase tracking-[0.2em] whitespace-nowrap">{cat}</h4>
                        <div className="h-[1px] w-full bg-[#E76F51]/10" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {catItems.map(item => (
                          <AddOrderItem 
                            key={item.id}
                            item={item}
                            cart={cart}
                            isExpanded={!!expandedItems[item.id]}
                            onToggleExpand={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            onUpdateQty={updateQty}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[400px] bg-[#F9F7F4] flex flex-col h-[40vh] sm:h-auto overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white lg:bg-transparent">
            <h4 className="font-black text-[#3A241C] flex items-center gap-2 text-sm uppercase tracking-widest"><ShoppingCart size={18} className="text-[#E76F51]" /> Cart Summary</h4>
            <span className="bg-[#E76F51] text-white text-[10px] font-black px-3 py-1 rounded-full">{cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-20"><ShoppingCart size={40} className="mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Empty Cart</p></div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</span>
                    <button onClick={() => {
                        const allPacked = cartItems.every(i => i.forPacking);
                        const next = !allPacked;
                        const newPacking = { ...itemPacking };
                        cartItems.forEach(i => newPacking[i.cartKey] = next);
                        setItemPacking(newPacking);
                      }} className="text-[10px] font-black text-[#E76F51] uppercase tracking-widest hover:underline">{cartItems.every(i => i.forPacking) ? "Unpack All" : "Pack All"}</button>
                  </div>
                  {cartItems.map(item => {
                    const isDeleting = deletingItems.has(item.cartKey);
                    
                    let fullFormatted = item.name;
                    let currentShort = fullFormatted.replace(/Benne Dosa/gi, 'B.D.');
                    const targetLen = 22; // max chars for small screens
                    if (currentShort.length > targetLen) {
                      let words = currentShort.split(' ');
                      for (let i = words.length - 1; i >= 1; i--) {
                        const word = words[i];
                        if (word.length > 2 && !word.includes('.')) {
                          words[i] = word[0].toUpperCase() + '.';
                          currentShort = words.join(' ');
                          if (currentShort.length <= targetLen) break;
                        }
                      }
                    }
                    
                    const fullText = item.name === "Soft Drinks" && item.variant ? item.variant : fullFormatted;
                    const shortText = item.name === "Soft Drinks" && item.variant ? item.variant : currentShort;

                    return (
                    <motion.div 
                      key={item.cartKey} 
                      layout 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ 
                        opacity: isDeleting ? 0 : 1, 
                        scale: isDeleting ? 0.95 : 1,
                        filter: isDeleting ? "blur(4px)" : "blur(0px)",
                        backgroundColor: isDeleting ? "#FDECEA" : "#ffffff",
                        borderColor: isDeleting ? "#B71C1C" : "rgba(58, 36, 28, 0.12)"
                      }} 
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} 
                      className="flex items-center justify-between p-3 rounded-2xl border shadow-sm gap-3 group"
                    >
                      <AnimatePresence>
                        {item.forPacking && (
                          <motion.div 
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="absolute left-0 top-0 bottom-0 w-6 bg-[#3A241C] flex items-center justify-center z-10 shadow-[2px_0_10px_rgba(0,0,0,0.1)] border-r border-[#3A241C]"
                          >
                            <span className="text-[#F9F7F4] text-[6px] font-black uppercase tracking-[0.3em] -rotate-90 whitespace-nowrap">Packing</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.div layout="position" className={`flex-1 min-w-0 transition-all duration-300 ${item.forPacking ? 'ml-4' : 'ml-0'}`}>
                        <p className="text-[11px] font-black text-[#3A241C] truncate leading-tight">
                          <span className="hidden min-[400px]:inline">{fullText}</span>
                          <span className="inline min-[400px]:hidden">{shortText}</span>
                        </p>
                        {item.variant && <p className="text-[8px] font-bold text-[#E76F51] uppercase tracking-tighter mt-0.5">{item.variant}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-[#3A241C]/30">₹{item.price} × {item.quantity} =</span>
                          <span className="text-[10px] font-black text-[#E76F51]">₹{item.price * item.quantity}</span>
                        </div>
                      </motion.div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => setItemPacking(prev => ({ ...prev, [item.cartKey]: !prev[item.cartKey] }))} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-75 shadow-sm border ${item.forPacking ? 'bg-[#3A241C] text-white border-[#3A241C]' : 'bg-white text-[#3A241C]/40 hover:text-[#3A241C] border-[#3A241C]/10'}`}><Package size={14} /></button>
                        <div className="h-8 flex items-center bg-gray-50 rounded-lg overflow-hidden shadow-sm border border-gray-100">
                          <button onClick={() => updateQty(item.id, -1, item.variant)} className="w-7 h-full flex items-center justify-center text-[#3A241C]/60 hover:text-[#E76F51] active:scale-75 transition-all"><Minus size={12} /></button>
                          <span className="w-5 text-center text-[10px] font-black">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1, item.variant)} className="w-7 h-full flex items-center justify-center text-[#3A241C]/60 hover:text-[#E76F51] active:scale-75 transition-all"><Plus size={12} /></button>
                        </div>
                        <button onClick={() => {
                          if (isDeleting) return;
                          setDeletingItems(prev => new Set(prev).add(item.cartKey));
                          setTimeout(() => {
                            setCart(prev => { const next = { ...prev }; delete next[item.cartKey]; return next; });
                            setDeletingItems(prev => { const next = new Set(prev); next.delete(item.cartKey); return next; });
                          }, 350);
                        }} className={`w-8 h-8 flex items-center justify-center rounded-lg text-[#B71C1C]/60 hover:text-[#B71C1C] hover:bg-[#FDECEA] active:scale-75 transition-all border shadow-sm ${isDeleting ? 'bg-[#FDECEA] border-[#B71C1C]' : 'bg-white border-[#3A241C]/10'}`}><Trash2 size={14} /></button>
                      </div>
                    </motion.div>
                    );
                  })}
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 lg:p-8 bg-white border-t border-gray-100 space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setPaymentMethod("QR")} className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${paymentMethod === "QR" ? "border-[#3A241C] bg-[#3A241C] text-white" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}>QR Payment</button>
                <button onClick={() => setPaymentMethod("CASH")} className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${paymentMethod === "CASH" ? "border-[#6A994E] bg-[#6A994E] text-white" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}>Collect Cash</button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest"><span className="text-[#3A241C]/30">Subtotal</span><span className="text-[#3A241C]">₹{subtotal}</span></div>
              {packingCharges > 0 && (<div className="flex justify-between text-[11px] font-bold uppercase tracking-widest"><span className="text-[#3A241C]/30">Packing Charges</span><span className="text-[#E76F51]">₹{packingCharges}</span></div>)}
              <div className="flex justify-between items-center pt-4 border-t border-[#3A241C]/5"><span className="text-sm font-black text-[#3A241C] uppercase tracking-widest">Grand Total</span><span className="text-3xl font-black text-[#3A241C]">₹{total}</span></div>
            </div>

            <button onClick={handleConfirm} disabled={cartItems.length === 0 || loading || success} className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-xl ${cartItems.length === 0 || loading || success ? "bg-gray-100 text-gray-400 cursor-not-allowed" : paymentMethod === "CASH" ? "bg-[#6A994E] text-white shadow-[#6A994E]/20" : "bg-[#3A241C] text-white shadow-[#3A241C]/20"}`}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : success ? <><CheckCircle2 size={18} /> Order Placed!</> : paymentMethod === "CASH" ? "Collect & Place Order" : "Confirm & Send to Table"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
