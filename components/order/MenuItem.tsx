"use client";

import React, { memo, useCallback, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Star, Check, Tag } from "lucide-react";
import { type OrderMenuItem } from "@/lib/menu";

// Per-phase transitions: exit is fast (on click), enter is a spring (returning after tick)
const plusVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 500, damping: 22 },
  },
  exit: {
    opacity: 0,
    scale: 2,
    transition: { duration: 0.07 },
  },
};

interface MenuItemProps {
  item: OrderMenuItem;
  onAdd: (item: OrderMenuItem) => void;
  isRestaurantOpen: boolean;
  priority?: boolean;
}

const MenuItem = ({
  item,
  onAdd,
  isRestaurantOpen,
  priority = false
}: MenuItemProps) => {
  const discountedPrice = item.discountPct
    ? Math.round(item.price * (1 - item.discountPct / 100))
    : item.discountFlat
      ? item.price - item.discountFlat
      : item.price;

  const hasDiscount = item.discountPct || item.discountFlat;
  const isDisabled = item.outOfStock || !isRestaurantOpen;

  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDisabled || isAnimating) return;

    setIsAnimating(true);
    onAdd({ ...item, price: discountedPrice });

    // Increased duration for a more premium, visible confirmation (800ms)
    setTimeout(() => {
      setIsAnimating(false);
    }, 800);
  }, [isDisabled, isAnimating, onAdd, item, discountedPrice]);

  return (
    <motion.div
      onClick={handleAdd as any}
      className={`bg-white rounded-[2rem] p-3 lg:p-4 border-2 flex items-center gap-3 lg:gap-4 group relative overflow-hidden h-[140px] lg:h-[164px] transition-all duration-300 ease-out ${isAnimating
        ? "border-[#6A994E] shadow-[0_25px_60px_-15px_rgba(106,153,78,0.25)] ring-4 ring-[#6A994E]/20"
        : "border-[#3A241C]/10 shadow-[0_8px_30px_-10px_rgba(58,36,28,0.08)]"
        } ${isDisabled ? "grayscale opacity-60 pointer-events-none" : isAnimating ? "cursor-default" : "hover:shadow-[0_30px_70px_-15px_rgba(58,36,28,0.15)] hover:border-[#E76F51]/30 cursor-pointer"}`}
    >
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#6A994E]/5 pointer-events-none z-10"
          />
        )}
      </AnimatePresence>

      {/* Premium Slanted Corner Ribbon */}
      {hasDiscount && !item.outOfStock && (
        <div className="absolute top-0 left-0 w-20 h-20 overflow-hidden pointer-events-none z-30 rounded-tl-[2rem]">
          <motion.div
            initial={{ opacity: 0, x: -10, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            className="absolute top-0 left-0 w-full h-full"
          >
            <div
              className="absolute top-[18%] left-[-35%] w-[150%] py-1.5 bg-gradient-to-r from-[#6A994E] via-[#85B868] to-[#4F772D] shadow-[0_4px_10px_rgba(0,0,0,0.15)] flex items-center justify-center -rotate-45 border-y border-white/20"
            >
              <span className="text-[10px] lg:text-[11px] font-black text-white uppercase tracking-tighter drop-shadow-md flex items-center gap-1">
                {item.discountPct ? `${item.discountPct}% OFF` : `₹${item.discountFlat} OFF`}
              </span>
              {/* Shine effect */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
              />
            </div>
          </motion.div>
        </div>
      )}

      {item.outOfStock && (
        <div className="absolute inset-0 z-40 bg-[#3A241C]/20 backdrop-blur-[2px] flex items-center justify-center">
          <span className="bg-[#3A241C] text-white px-4 py-2 rounded-full font-black text-[10px] lg:text-[12px] uppercase tracking-[0.2em] shadow-2xl">OUT OF STOCK</span>
        </div>
      )}

      {/* Image Box */}
      <div className="w-[104px] h-[104px] lg:w-[124px] lg:h-[124px] rounded-2xl bg-[#F9F7F4] flex-shrink-0 overflow-hidden relative border border-[#3A241C]/5 shadow-sm">
        {item.image && (
          <Image
            src={item.image}
            alt={item.name}
            fill
            priority={priority}
            sizes="(max-width: 768px) 110px, 130px"
            className="object-cover opacity-0 transition-opacity duration-300"
            onLoad={(e) => (e.target as HTMLImageElement).classList.remove('opacity-0')}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between h-full py-1 min-w-0 z-20">
        <div className="min-w-0">
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className="font-black text-[#3A241C] text-sm lg:text-base group-hover:text-[#E76F51] transition-colors tracking-tight line-clamp-2 leading-tight flex-1">
              {item.name}
              {(item as any).volume && <span className="text-[#3A241C]/40 text-[10px] lg:text-xs normal-case tracking-normal ml-1.5 font-bold">({(item as any).volume})</span>}
            </h3>
          </div>
          {item.descriptionEn && (
            <p className="text-[10px] lg:text-[11px] text-[#3A241C]/50 leading-relaxed mt-1.5 font-medium tracking-tight line-clamp-2">
              {item.descriptionEn}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-6">
          <div className="flex items-center gap-2 transform translate-y-1">
            {hasDiscount && (
              <span className="text-[10px] lg:text-xs text-[#3A241C]/30 line-through font-bold">₹{item.price}</span>
            )}
            <span className="font-black text-xl text-[#E76F51] tracking-tighter">
              {item.priceLabel ? item.priceLabel : `₹${discountedPrice}`}
            </span>
            {item.rating && item.ratingCount && !["Soft Drinks", "Mineral Water"].includes(item.name) && (
              <div className="flex items-center gap-1.5 bg-[#F9F7F4] px-2 py-1 rounded-lg border border-[#3A241C]/5 ml-2">
                <Star className="w-[10px] h-[10px] lg:w-3 lg:h-3 fill-[#E76F51] text-[#E76F51]" />
                <span className="text-[10px] lg:text-[11px] font-bold text-[#3A241C]">
                  {item.rating} ({item.ratingCount})
                </span>
              </div>
            )}
          </div>

          {/* Add Button — Enhanced with AnimatePresence and Spring transitions */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleAdd}
            disabled={isDisabled}
            className={`w-9 h-9 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 relative overflow-hidden ${isAnimating
              ? "bg-[#6A994E] text-white"
              : isDisabled
                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                : "bg-[#E76F51] text-white lg:bg-[#F9F7F4] lg:text-[#3A241C] lg:hover:bg-[#E76F51] lg:hover:text-white"
              }`}
          >
            <AnimatePresence mode="wait">
              {isAnimating ? (
                <motion.div
                  key="check"
                  initial={{ opacity: 0, scale: 0, rotate: -45 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Check size={18} strokeWidth={4} className="lg:w-5 lg:h-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="plus"
                  variants={plusVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Plus size={18} strokeWidth={4} className="lg:w-5 lg:h-5" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rippling circle effect on add */}
            <AnimatePresence>
              {isAnimating && (
                <motion.div
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 4, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 bg-white/30 rounded-full pointer-events-none"
                />
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(MenuItem);
