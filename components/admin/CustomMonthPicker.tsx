"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, ChevronRight } from "lucide-react";

interface CustomMonthPickerProps {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
  label?: string;
  onlyMonths?: boolean;
  roundedClass?: string;
  compact?: boolean;
}

function QuickSelector({ 
  value, 
  options, 
  onChange 
}: { 
  value: any; 
  options: { label: string; value: any; disabled?: boolean }[]; 
  onChange: (v: any) => void;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div className="relative" ref={selectorRef}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowOptions(!showOptions);
        }}
        className="bg-[#F9F7F4] px-3 py-1.5 rounded-xl font-black text-[#3A241C] text-[10px] uppercase tracking-[0.2em] outline-none cursor-pointer hover:bg-[#E76F51]/10 hover:text-[#E76F51] transition-all flex items-center gap-1.5"
      >
        {selectedLabel}
        <motion.div animate={{ rotate: showOptions ? 180 : 0 }}>
          <ChevronRight size={10} className="rotate-90 text-[#3A241C]/30" />
        </motion.div>
      </button>

      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full mt-2 left-0 z-[100] bg-white rounded-2xl shadow-2xl border border-[#3A241C]/5 py-3 min-w-[120px] max-h-[240px] overflow-y-auto scrollbar-hide"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                disabled={opt.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setShowOptions(false);
                }}
                className={`w-full text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  opt.disabled 
                    ? "opacity-20 cursor-not-allowed grayscale" 
                    : value === opt.value 
                      ? "text-[#E76F51] bg-[#E76F51]/5" 
                      : "text-[#3A241C]/60 hover:bg-[#F9F7F4] hover:text-[#E76F51]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CustomMonthPicker({ 
  value, 
  onChange, 
  label = "Select Month", 
  onlyMonths = false, 
  roundedClass = "rounded-xl",
  compact = false
}: CustomMonthPickerProps) {
  const [year, month] = value.split("-").map(Number);
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleMonthChange = (m: number) => {
    const newMonth = (m + 1).toString().padStart(2, '0');
    onChange(`${year}-${newMonth}`);
  };

  const handleYearChange = (y: number) => {
    const newMonth = month.toString().padStart(2, '0');
    onChange(`${y}-${newMonth}`);
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  return (
    <div className={`flex items-center bg-white border border-[#3A241C]/5 shadow-sm hover:shadow-md transition-all group ${compact ? "gap-3 px-3 py-2 rounded-xl" : "gap-4 px-5 py-3 rounded-2xl"}`}>
      <div className={`${compact ? "w-8 h-8 rounded-lg" : "w-10 h-10 rounded-xl"} bg-[#6A994E]/10 flex items-center justify-center text-[#6A994E] group-hover:scale-105 transition-transform`}>
        <CalendarIcon size={compact ? 16 : 20} />
      </div>
      
      <div className="flex items-center gap-2">
        {!compact && (
          <div>
            <p className="text-[9px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mb-0.5">{label}</p>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <QuickSelector
            value={month - 1}
            options={months.map((m, i) => ({ 
              label: m.slice(0, 3), 
              value: i,
              disabled: year > currentYear || (year === currentYear && i > currentMonth)
            }))}
            onChange={handleMonthChange}
          />
          {!onlyMonths && (
            <QuickSelector
              value={year}
              options={Array.from(
                { length: Math.max(0, currentYear - 2025 + 1) }, 
                (_, i) => 2025 + i
              ).map(y => ({ label: y.toString(), value: y }))}
              onChange={handleYearChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
