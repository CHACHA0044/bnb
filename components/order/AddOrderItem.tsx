"use client";

import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, ChevronDown } from "lucide-react";

interface AddOrderItemProps {
  item: any;
  cart: Record<string, any>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateQty: (id: string, delta: number, variant?: string) => void;
}

const AddOrderItem = ({
  item,
  cart,
  isExpanded,
  onToggleExpand,
  onUpdateQty
}: AddOrderItemProps) => {
  const hasVariants = item.variants && item.variants.length > 0;
  
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="flex flex-col bg-white rounded-3xl border border-gray-100 overflow-hidden transition-all shadow-sm hover:shadow-md hover:border-[#3A241C]/10"
    >
      <div 
        onClick={() => hasVariants && onToggleExpand()}
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
            <button onClick={(e) => { e.stopPropagation(); onUpdateQty(item.id, -1); }} className={`w-7 h-7 flex items-center justify-center transition-colors ${cart[item.id]?.quantity > 0 ? "text-[#E76F51]" : "text-gray-200"}`}><Minus size={14} /></button>
            <span className="font-black text-[#3A241C] text-xs min-w-[15px] text-center">{cart[item.id]?.quantity || 0}</span>
            <button onClick={(e) => { e.stopPropagation(); onUpdateQty(item.id, 1); }} className="w-7 h-7 flex items-center justify-center text-[#E76F51]"><Plus size={14} /></button>
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
              {item.variants?.map((v: string) => {
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
                      <button onClick={() => onUpdateQty(item.id, -1, v)} className={`w-6 h-6 flex items-center justify-center transition-colors ${qty > 0 ? "text-[#E76F51]" : "text-gray-300"}`}><Minus size={12} /></button>
                      <span className="font-black text-[#3A241C] text-[11px] min-w-[15px] text-center">{qty}</span>
                      <button onClick={() => onUpdateQty(item.id, 1, v)} className="w-6 h-6 flex items-center justify-center text-[#E76F51]"><Plus size={12} /></button>
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
};

export default memo(AddOrderItem);
