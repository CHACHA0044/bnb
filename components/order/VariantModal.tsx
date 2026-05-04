"use client";

import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [animatingVariants, setAnimatingVariants] = useState<Record<string, "add" | "reduce" | null>>({});

  const handleUpdate = (v: string, delta: number) => {
    onUpdateTempVariant(v, delta);
    setAnimatingVariants(prev => ({ ...prev, [v]: delta > 0 ? "add" : "reduce" }));
    setTimeout(() => {
      setAnimatingVariants(prev => {
        if (prev[v] === (delta > 0 ? "add" : "reduce")) {
          return { ...prev, [v]: null };
        }
        return prev;
      });
    }, 500);
  };

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
          {item.variants?.map((v: string) => {
            const variantData = item.variantPrices?.[v];
            const price = typeof variantData === 'object' ? variantData.price : (variantData || item.price);
            const volume = typeof variantData === 'object' ? variantData.volume : "";
            const isOOS = item.outOfStockVariants?.includes(v);
            const animState = animatingVariants[v];
            const borderClass = isOOS
              ? "border-red-100 opacity-50 grayscale"
              : animState === "add"
              ? "border-[#6A994E] shadow-[0_10px_20px_-10px_rgba(106,153,78,0.25)] ring-2 ring-[#6A994E]"
              : animState === "reduce"
              ? "border-[#B71C1C] shadow-[0_10px_20px_-10px_rgba(183,28,28,0.25)] ring-2 ring-[#B71C1C]"
              : "border-[#3A241C]/5";

            return (
              <div 
                key={v} 
                className={`relative flex items-center justify-between p-4 lg:p-5 bg-[#F9F7F4] rounded-2xl border transition-all duration-300 ${borderClass} overflow-hidden ${isOOS ? "pointer-events-none" : ""}`}
              >
                <AnimatePresence>
                  {animState === "add" && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-[#6A994E]/5 pointer-events-none z-0"
                    />
                  )}
                  {animState === "reduce" && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-[#B71C1C]/5 pointer-events-none z-0"
                    />
                  )}
                </AnimatePresence>
                <div className="flex flex-col z-10 relative">
                  <span className="font-black text-[10px] lg:text-xs uppercase tracking-widest text-[#3A241C]">
                    {v} {volume && <span className="text-[#3A241C]/40 text-[9px] normal-case tracking-normal">({volume})</span>}
                  </span>
                  <span className="text-[#E76F51] font-black text-[10px]">₹{price}</span>
                </div>
                {isOOS && (
                  <div className="absolute inset-0 z-20 bg-[#3A241C]/20 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="bg-[#3A241C] text-white px-4 py-2 rounded-full font-black text-[10px] lg:text-[12px] uppercase tracking-[0.2em] shadow-2xl">OUT OF STOCK</span>
                  </div>
                )}
                <div className="flex items-center gap-3 lg:gap-4 z-10 relative">
                  <button 
                    onClick={() => handleUpdate(v, -1)}
                    className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white text-[#3A241C]/20 hover:text-[#E76F51] flex items-center justify-center transition-all shadow-sm"
                  >
                    <Minus size={12} className="lg:w-[14px]" />
                  </button>
                  <span className="w-4 text-center font-black text-sm">{tempVariants[v] || 0}</span>
                  <button 
                    onClick={() => handleUpdate(v, 1)}
                    className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white text-[#3A241C]/20 hover:text-[#E76F51] flex items-center justify-center transition-all shadow-sm"
                  >
                    <Plus size={12} className="lg:w-[14px]" />
                  </button>
                </div>
              </div>
            );
          })}
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
