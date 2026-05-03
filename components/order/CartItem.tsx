"use client";

import React, { memo, useState } from "react";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const isOwner = item.addedBy === clientId;
  const disabled = cartLocked || !isOwner;

  const handleDelete = () => {
    if (disabled || isDeleting) return;
    setIsDeleting(true);
    
    setTimeout(() => {
      onDelete(item.id, !!item.forPacking, item.variant);
    }, 350);
  };

  const tactileTransition: any = { type: "spring", stiffness: 500, damping: 30 };
  const smoothTransition: any = { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

  return (
    <motion.div 
      layout="position"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: isDeleting ? 0 : 1,
        borderColor: isDeleting ? "#B71C1C" : (item.forPacking ? "rgba(58, 36, 28, 0.15)" : "rgba(58, 36, 28, 0.05)"),
        borderWidth: isDeleting ? "2px" : "1px",
        backgroundColor: isDeleting ? "#FDECEA" : (item.forPacking ? "#F4EFEB" : "rgba(255, 255, 255, 1)"),
        scale: isDeleting ? 0.95 : 1,
        filter: isDeleting ? "blur(4px)" : "blur(0px)"
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.8,
        transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } 
      }}
      transition={smoothTransition}
      style={{ willChange: "transform, opacity, border-color, background-color, filter" }}
      className="flex items-center justify-between group p-3 lg:p-4 rounded-[1.25rem] lg:rounded-2xl border gap-2 lg:gap-4 overflow-hidden transform-gpu"
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-[#3A241C] text-[11px] lg:text-sm leading-snug mb-0.5 truncate tracking-tight flex items-center gap-1.5 lg:gap-2">
          <span className="truncate">
            {item.name === "Soft Drinks" && item.variant ? item.variant : `${item.name.replace(/Benne Dosa/gi, 'B.D.')}${item.variant ? ` (${item.variant})` : ""}`}
          </span>
        </h4>
        <div className="flex items-center gap-1.5 lg:gap-2">
          <span className="text-[9px] lg:text-[10px] font-black text-[#3A241C]/40">₹{item.price} × {item.quantity} = </span>
          <span className="text-[10px] lg:text-[11px] font-black text-[#E76F51]">₹{item.price * item.quantity}</span>
          {!isTakeaway && item.forPacking && <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-[#6A994E] bg-[#6A994E]/10 px-1.5 py-0.5 rounded-md flex-shrink-0 ml-1">To-Go</span>}
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 lg:gap-2.5 flex-shrink-0">
        {!isTakeaway && (
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => onTogglePacking(item.id, !!item.forPacking, item.variant)} 
            disabled={disabled}
            className={`p-1.5 lg:p-2 rounded-lg transition-all shadow-sm border disabled:opacity-30 disabled:grayscale ${item.forPacking ? 'bg-[#3A241C] text-white border-[#3A241C]' : 'bg-white text-[#3A241C]/40 hover:text-[#3A241C] border-[#3A241C]/10'}`}
            title="Toggle Packing"
          >
            <Package size={14} className="lg:w-4 lg:h-4" />
          </motion.button>
        )}
        
        <div className={`flex items-center bg-white rounded-lg overflow-hidden p-0.5 shadow-sm border border-[#3A241C]/5 ${disabled ? 'opacity-30 grayscale' : ''}`}>
          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={() => onRemove(item.id, !!item.forPacking, item.variant)} 
            disabled={disabled} 
            className="w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center text-[#3A241C]/60 hover:text-[#E76F51] transition-all relative overflow-hidden"
          >
            <Minus size={10} className="lg:w-3 z-10" />
          </motion.button>
          
          {/* Tactile Quantity Number */}
          <div className="w-5 lg:w-6 h-5 lg:h-6 relative flex items-center justify-center overflow-hidden">
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
            className="w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center text-[#3A241C]/60 hover:text-[#E76F51] transition-all relative overflow-hidden"
          >
            <Plus size={10} className="lg:w-3 z-10" />
          </motion.button>
        </div>

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={handleDelete} 
          disabled={disabled || isDeleting}
          className={`p-1.5 lg:p-2 rounded-lg bg-white border border-[#3A241C]/10 text-[#B71C1C]/60 hover:text-[#B71C1C] hover:bg-[#FDECEA] transition-all disabled:opacity-30 disabled:grayscale shadow-sm ${isDeleting ? 'bg-[#FDECEA] border-[#B71C1C]' : ''}`}
          title="Remove Item"
        >
          <Trash2 size={14} className="lg:w-4 lg:h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default memo(CartItem);
