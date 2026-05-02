"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { Loader2, ChevronRight } from "lucide-react";

interface OrderSummaryProps {
  cartSubtotal: number;
  packingCharges: number;
  cartTotal: number;
  ordering: boolean;
  cartLocked: boolean;
  lockedBy: string | null;
  clientId: string;
  onPlaceOrder: () => void;
}

const OrderSummary = ({
  cartSubtotal,
  packingCharges,
  cartTotal,
  ordering,
  cartLocked,
  lockedBy,
  clientId,
  onPlaceOrder
}: OrderSummaryProps) => {
  const isSomeoneElsePlacing = cartLocked && lockedBy !== clientId;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="bg-gradient-to-br from-[#3A241C] to-[#2A1A14] rounded-[2.5rem] lg:rounded-[3rem] p-6 lg:p-10 text-white shadow-[0_10px_30px_-10px_rgba(58,36,28,0.2)] relative overflow-hidden flex-shrink-0 border border-white/10 mt-2 lg:mt-4 isolate"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#E76F51] to-orange-400" />
      <div className="absolute -right-20 -top-20 w-48 h-48 bg-[#E76F51]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="space-y-3 lg:space-y-4 mb-6 lg:mb-8 relative z-10">
        <div className="flex justify-between text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-white/40">
          <span>Bill Amount</span>
          <span>₹ {cartSubtotal}</span>
        </div>
        {packingCharges > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-[#E76F51]">
              <span>Packing Add-on</span>
              <span>₹ {packingCharges}</span>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/30 text-left">
              ₹20 for 2 Dosas • ₹10 for 2 Idli
            </p>
          </div>
        )}
        <div className="pt-4 lg:pt-6 border-t border-white/10 flex justify-between items-end">
          <span className="font-black text-base lg:text-xl uppercase tracking-tighter">Payable</span>
          <span className="text-3xl lg:text-4xl font-black text-[#E76F51] tracking-tighter">₹ {cartTotal}</span>
        </div>
      </div>
      <button 
        onClick={onPlaceOrder} 
        disabled={ordering || isSomeoneElsePlacing} 
        className="w-full py-4 lg:py-5 bg-gradient-to-r from-[#E76F51] to-orange-500 text-white rounded-xl lg:rounded-[1.75rem] font-black text-[10px] lg:text-[11px] uppercase tracking-[0.4em] shadow-[0_10px_30px_-10px_rgba(231,111,81,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 lg:gap-3 group relative z-10 disabled:opacity-50 disabled:grayscale"
      >
        {ordering ? (
          <Loader2 className="animate-spin lg:w-[18px]" size={16} />
        ) : isSomeoneElsePlacing ? (
          <Loader2 className="animate-spin lg:w-[18px]" size={16} />
        ) : (
          <ChevronRight className="lg:w-[18px] group-hover:translate-x-1 transition-transform" size={16} />
        )}
        {ordering ? "Processing..." : isSomeoneElsePlacing ? "Someone Placing..." : "Place Order"}
      </button>
    </motion.div>
  );
};

export default memo(OrderSummary);
