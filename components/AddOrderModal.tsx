"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingCart, Loader2, CheckCircle2 } from "lucide-react";
import { ORDER_MENU, ORDER_CATEGORIES } from "@/lib/menu";

interface AddOrderModalProps {
  sessionId: string;
  onClose: () => void;
  onSubmit: (items: any[], isTakeaway: boolean) => Promise<void>;
}

export default function AddOrderModal({ sessionId, onClose, onSubmit }: AddOrderModalProps) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isTakeaway, setIsTakeaway] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = ORDER_MENU.find((m) => m.id === id)!;
        return { ...item, quantity: qty };
      });
  }, [cart]);

  const total = useMemo(() => {
    let sum = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    if (isTakeaway && cartItems.length > 0) {
      const packingCharge = ORDER_MENU.find(m => m.id === "pkg")?.price || 20;
      sum += packingCharge;
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
        const pkg = ORDER_MENU.find(m => m.id === "pkg")!;
        finalItems.push({
          name: pkg.name,
          price: pkg.price,
          quantity: 1,
          type: "TAKEAWAY"
        });
      }

      await onSubmit(finalItems, isTakeaway);
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
        className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Left: Menu Selection */}
        <div className="flex-1 overflow-hidden flex flex-col border-r border-gray-100">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="text-2xl font-black text-[#3A241C]">Add Items</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Session #{sessionId.slice(-4).toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {ORDER_CATEGORIES.filter(c => c !== "Others").map(cat => (
              <div key={cat}>
                <h4 className="text-[10px] font-black text-[#E76F51] uppercase tracking-[0.2em] mb-4">{cat}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ORDER_MENU.filter(m => m.category === cat).map(item => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-[#E76F51]/20 transition-all">
                        <div className="flex-1">
                          <p className="font-bold text-[#3A241C] text-sm">{item.name}</p>
                          <p className="text-xs text-[#E76F51] font-black mt-0.5">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-200">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#E76F51] transition-colors"
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
            ))}
          </div>
        </div>

        {/* Right: Cart Summary */}
        <div className="w-full md:w-[320px] bg-gray-50 flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h4 className="font-black text-[#3A241C] flex items-center gap-2">
              <ShoppingCart size={18} />
              Order Summary
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence mode="popLayout">
              {cartItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center py-10"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <ShoppingCart size={24} className="text-gray-200" />
                  </div>
                  <p className="text-sm font-bold text-gray-400">Your cart is empty</p>
                </motion.div>
              ) : (
                cartItems.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[#3A241C] line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{item.quantity} × ₹{item.price}</p>
                    </div>
                    <p className="text-xs font-black text-[#3A241C] ml-4">₹{item.price * item.quantity}</p>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 bg-white border-t border-gray-100 space-y-4">
            {/* Takeaway Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
              <div>
                <p className="text-[10px] font-black text-[#3A241C] uppercase tracking-wider">Takeaway / Packing</p>
                <p className="text-[10px] text-gray-400 font-medium">Extra ₹20 charge</p>
              </div>
              <button
                onClick={() => setIsTakeaway(!isTakeaway)}
                className={`w-12 h-6 rounded-full transition-colors relative ${isTakeaway ? "bg-[#E76F51]" : "bg-gray-200"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isTakeaway ? "left-7" : "left-1"}`} />
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold">Subtotal</span>
                <span className="text-[#3A241C] font-bold">₹{total - (isTakeaway && cartItems.length > 0 ? 20 : 0)}</span>
              </div>
              {isTakeaway && cartItems.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold">Packing Charge</span>
                  <span className="text-[#3A241C] font-bold">₹20</span>
                </div>
              )}
              <div className="flex justify-between text-lg pt-2 border-t border-gray-100">
                <span className="text-[#3A241C] font-black">Grand Total</span>
                <span className="text-[#E76F51] font-black">₹{total}</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={cartItems.length === 0 || loading || success}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                cartItems.length === 0 || loading || success
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-[#3A241C] text-white hover:bg-[#E76F51] active:scale-95 shadow-[#3A241C]/10"
              }`}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : success ? (
                <>
                  <CheckCircle2 size={20} />
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
