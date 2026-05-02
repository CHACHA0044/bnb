"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

interface VariantModalProps {
  item: any;
  tempVariants: Record<string, number>;
  onClose: () => void;
  onUpdateTempVariant: (variant: string, delta: number) => void;
  onConfirm: () => void;
}

const VariantModal = ({
  item,
  tempVariants,
  onClose,
  onUpdateTempVariant,
  onConfirm
}: VariantModalProps) => {
  const totalSelected = Object.values(tempVariants).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#3A241C]/80 backdrop-blur-xl" />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white rounded-[2.5rem] lg:rounded-[3.5rem] w-full max-w-sm p-8 lg:p-10 shadow-2xl overflow-hidden"
      >
        <div className="mb-6 lg:mb-8">
          <h3 className="font-black text-[#3A241C] text-xl lg:text-2xl tracking-tighter mb-1">Select Flavors</h3>
          <p className="text-[9px] lg:text-[10px] font-bold text-[#3A241C]/30 uppercase tracking-widest">Multiple selections allowed</p>
        </div>
        
        <div className="space-y-3 lg:space-y-4 mb-8 lg:mb-10">
          {item.variants?.map((v: string) => (
            <div key={v} className="flex items-center justify-between p-4 lg:p-5 bg-[#F9F7F4] rounded-2xl border border-[#3A241C]/5">
              <span className="font-black text-[10px] lg:text-xs uppercase tracking-widest text-[#3A241C]">
                {v} <span className="text-[#E76F51] ml-1 opacity-80">₹{item.variantPrices?.[v] || item.price}</span>
              </span>
              <div className="flex items-center gap-3 lg:gap-4">
                <button 
                  onClick={() => onUpdateTempVariant(v, -1)}
                  className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white text-[#3A241C]/20 hover:text-[#E76F51] flex items-center justify-center transition-all shadow-sm"
                >
                  <Minus size={12} className="lg:w-[14px]" />
                </button>
                <span className="w-4 text-center font-black text-sm">{tempVariants[v] || 0}</span>
                <button 
                  onClick={() => onUpdateTempVariant(v, 1)}
                  className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white text-[#3A241C]/20 hover:text-[#E76F51] flex items-center justify-center transition-all shadow-sm"
                >
                  <Plus size={12} className="lg:w-[14px]" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:gap-4">
          <button 
            onClick={onConfirm}
            disabled={totalSelected === 0}
            className="w-full py-4 lg:py-5 bg-[#E76F51] text-white rounded-2xl font-black text-[9px] lg:text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-[#E76F51]/30 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
          >
            Add to Cart
          </button>
          <button onClick={onClose} className="py-2 text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-[#3A241C]/20 hover:text-[#3A241C] transition-all">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
};

export default memo(VariantModal);
