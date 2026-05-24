"use client";

import React, { memo, useState, useRef, useEffect, useMemo } from "react";
import { Minus, Plus, Trash2, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CartItemProps {
  item: any;
  isTakeaway: boolean;
  cartLocked: boolean;
  clientId: string;
  onRemove: (id: string, packing: boolean, variant?: string) => void;
  onAdd: (item: any, variant?: string) => void;
  onDelete: (id: string, packing: boolean, variant?: string) => void;
  onTogglePacking: (id: string, current: boolean, variant?: string) => void;
}

const CartItem = ({
  item,
  isTakeaway,
  cartLocked,
  clientId,
  onRemove,
  onAdd,
  onDelete,
  onTogglePacking
}: CartItemProps) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = textContainerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const isOwner = item.addedBy === clientId;
  const disabled = cartLocked || !isOwner;

  const handleDelete = () => {
    if (disabled) return;
    onDelete(item.id, !!item.forPacking, item.variant);
  };

  const displayName = useMemo(() => {
    const fullName = `${item.name}${item.variant ? ` (${item.variant})` : ""}`;
    if (containerWidth === 0) return fullName;
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const charWidth = isMobile ? 5.8 : 7.6; 
    
    const availableWidth = item.forPacking ? containerWidth - 28 : containerWidth;
    const maxChars = Math.floor(availableWidth / charWidth);
    
    if (fullName.length <= maxChars) return fullName;
    
    let current = item.name.replace(/Benne Dosa/gi, 'B.D.');
    let words = current.split(' ');
    if (words.length > 1) {
      for (let i = words.length - 1; i >= 1; i--) {
        const word = words[i];
        if (word.length > 2 && !word.includes('.')) {
          words[i] = word[0] + '.';
          current = words.join(' ');
          if (current.length + (item.variant ? item.variant.length + 3 : 0) <= maxChars) break;
        }
      }
    }
    
    return `${current}${item.variant ? ` (${item.variant})` : ""}`;
  }, [item.name, item.variant, containerWidth, item.forPacking]);

  const tactileTransition: any = { type: "spring", stiffness: 500, damping: 30 };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ 
        opacity: 1,
        y: 0,
        scale: 1,
        borderColor: item.forPacking ? "rgba(58, 36, 28, 0.25)" : "rgba(58, 36, 28, 0.12)",
        backgroundColor: item.forPacking ? "#F4EFEB" : "rgba(255, 255, 255, 1)",
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.9,
        transition: { duration: 0.2 } 
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{ willChange: "transform, opacity" }}
      className="relative flex items-center justify-between group p-3 lg:p-4 rounded-2xl border gap-2 lg:gap-4 transform-gpu overflow-hidden"
    >
      <AnimatePresence>
        {!isTakeaway && item.forPacking && (
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="absolute left-0 top-0 bottom-0 w-6 lg:w-7 bg-[#3A241C] flex items-center justify-center z-10 shadow-[2px_0_15px_rgba(0,0,0,0.15)]"
          >
            <span className="text-[#F9F7F4] text-[6px] lg:text-[7px] font-black uppercase tracking-[0.3em] -rotate-90 whitespace-nowrap">Packing</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div ref={textContainerRef} layout="position" className={`flex-1 min-w-0 transition-all duration-300 ${!isTakeaway && item.forPacking ? 'ml-6 lg:ml-7' : 'ml-0'}`}>
        <div className="flex flex-col min-w-0">
          <h4 className="font-black text-[#3A241C] text-[11px] lg:text-sm leading-snug mb-0.5 truncate tracking-tight">
            {displayName}
          </h4>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <span className="text-[9px] lg:text-[10px] font-black text-[#3A241C]/40">₹{item.price} × {item.quantity} = </span>
            <span className="text-[10px] lg:text-[11px] font-black text-[#E76F51]">₹{item.price * item.quantity}</span>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
        {!isTakeaway && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onTogglePacking(item.id, !!item.forPacking, item.variant)}
            disabled={disabled}
            className={`w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-lg transition-all shadow-sm border disabled:opacity-30 disabled:grayscale ${item.forPacking ? 'bg-[#3A241C] text-white border-[#3A241C]' : 'bg-white text-[#3A241C]/40 hover:text-[#3A241C] border-[#3A241C]/10'}`}
            title="Toggle Packing"
          >
            <Package size={14} className="lg:w-4 lg:h-4" />
          </motion.button>
        )}

        <div className={`h-8 lg:h-9 flex items-center bg-white rounded-lg overflow-hidden shadow-sm border border-[#3A241C]/5 ${disabled ? 'opacity-30 grayscale' : ''}`}>
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => onRemove(item.id, !!item.forPacking, item.variant)}
            disabled={disabled}
            className="w-7 lg:w-8 h-full flex items-center justify-center text-[#3A241C]/60 hover:text-[#E76F51] transition-all relative overflow-hidden"
          >
            <Minus size={12} className="lg:w-3.5 z-10" />
          </motion.button>

          {/* Tactile Quantity Number */}
          <div className="w-5 lg:w-6 h-full relative flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={item.quantity}
                initial={{ y: 10, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -10, opacity: 0, scale: 0.8 }}
                transition={tactileTransition}
                className="absolute text-[9px] lg:text-[10px] font-black text-[#3A241C]"
              >
                {item.quantity}
              </motion.span>
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => onAdd(item, item.variant)}
            disabled={disabled}
            className="w-7 lg:w-8 h-full flex items-center justify-center text-[#3A241C]/60 hover:text-[#E76F51] transition-all relative overflow-hidden"
          >
            <Plus size={12} className="lg:w-3.5 z-10" />
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleDelete}
          disabled={disabled}
          className={`w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-lg bg-white border border-[#3A241C]/10 text-[#B71C1C]/60 hover:text-[#B71C1C] hover:bg-[#FDECEA] transition-all disabled:opacity-30 disabled:grayscale shadow-sm`}
          title="Remove Item"
        >
          <Trash2 size={14} className="lg:w-4 lg:h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default memo(CartItem);
