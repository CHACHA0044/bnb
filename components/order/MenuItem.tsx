"use client";

import React, { memo, useCallback, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Star, Check } from "lucide-react";
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
  lang: "EN" | "HI";
  onAdd: (item: OrderMenuItem) => void;
  onToggleLang: () => void;
  isRestaurantOpen: boolean;
  priority?: boolean;
}

const MenuItem = ({
  item,
  lang,
  onAdd,
  onToggleLang,
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
      className={`bg-white rounded-[2rem] p-3 lg:p-4 border-2 flex items-center gap-3 lg:gap-4 group relative overflow-hidden h-[140px] lg:h-[164px] transition-all duration-500 ease-[var(--cubic-bezier)] ${isAnimating
        ? "border-[#6A994E] shadow-[0_25px_60px_-15px_rgba(106,153,78,0.25)] ring-2 ring-[#6A994E]/10"
        : "border-[#3A241C]/10 shadow-[0_8px_30px_-10px_rgba(58,36,28,0.08)]"
        } ${isDisabled ? "grayscale opacity-60 pointer-events-none" : "hover:shadow-[0_30px_70px_-15px_rgba(58,36,28,0.15)] hover:border-[#E76F51]/30 cursor-pointer"}`}
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

      {item.outOfStock && (
        <div className="absolute inset-0 z-20 bg-[#3A241C]/20 backdrop-blur-[2px] flex items-center justify-center">
          <span className="bg-[#3A241C] text-white px-4 py-2 rounded-full font-black text-[10px] lg:text-[12px] uppercase tracking-[0.2em] shadow-2xl">OUT OF STOCK</span>
        </div>
      )}

      {/* Image Box */}
      <div className="w-[104px] h-[104px] lg:w-[124px] lg:h-[124px] rounded-2xl bg-[#F9F7F4] flex-shrink-0 overflow-hidden relative border border-[#3A241C]/5 shadow-sm">
        {hasDiscount && !item.outOfStock && (
          <div className="absolute top-2 left-2 z-10 bg-[#6A994E] text-white px-2 py-0.5 rounded-lg font-black text-[8px] lg:text-[10px] uppercase tracking-widest shadow-lg">
            {item.discountPct ? `${item.discountPct}% OFF` : `₹${item.discountFlat} OFF`}
          </div>
        )}
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLang();
              }}
              className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-[#E76F51] bg-[#E76F51]/10 px-2 lg:px-3 py-1 rounded-md lg:rounded-lg hover:bg-[#E76F51]/20 transition-all active:scale-95 flex-shrink-0"
            >
              {lang === "EN" ? "अ" : "A"}
            </button>
          </div>
          {(item.descriptionEn || item.descriptionHi) && (
            <p className="text-[10px] lg:text-[11px] text-[#3A241C]/50 leading-[1.5] mb-1 font-medium tracking-[0.02em] antialiased line-clamp-2">
              {lang === "EN" ? item.descriptionEn : item.descriptionHi}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-2">
            {hasDiscount && (
              <span className="text-[10px] lg:text-xs text-[#3A241C]/30 line-through font-bold">₹{item.price}</span>
            )}
            <span className="font-black text-lg text-[#E76F51] tracking-tighter">
              {item.priceLabel ? item.priceLabel : `₹${discountedPrice}`}
            </span>
            {item.rating && item.ratingCount && !["Soft Drinks", "Mineral Water"].includes(item.name) && (
              <div className="flex items-center gap-1 bg-[#F9F7F4] px-1.5 py-0.5 rounded-md border border-[#3A241C]/5 ml-2">
                <Star className="w-[10px] h-[10px] lg:w-3 lg:h-3 fill-[#E76F51] text-[#E76F51]" />
                <span className="text-[9px] lg:text-[10px] font-black text-[#3A241C]/80">
                  {item.rating}({item.ratingCount})
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
