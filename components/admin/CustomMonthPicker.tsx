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
}

function QuickSelector({ 
  value, 
  options, 
  onChange 
}: { 
  value: any; 
  options: { label: string; value: any }[]; 
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
        className="bg-[#F9F7F4] px-4 py-2 rounded-xl font-black text-[#3A241C] text-[10px] uppercase tracking-[0.2em] outline-none cursor-pointer hover:bg-[#E76F51]/10 hover:text-[#E76F51] transition-all flex items-center gap-2"
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
            className="absolute top-full mt-2 left-0 z-[100] bg-white rounded-2xl shadow-2xl border border-[#3A241C]/5 py-3 min-w-[140px] max-h-[240px] overflow-y-auto scrollbar-hide"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setShowOptions(false);
                }}
                className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#F9F7F4] hover:text-[#E76F51] transition-colors ${value === opt.value ? "text-[#E76F51] bg-[#E76F51]/5" : "text-[#3A241C]/60"}`}
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

export default function CustomMonthPicker({ value, onChange, label = "Select Month", onlyMonths = false, roundedClass = "rounded-[3rem]" }: CustomMonthPickerProps) {
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

  const displayText = onlyMonths ? months[month - 1] : `${months[month - 1]}, ${year}`;

  return (
    <div className={`flex items-center gap-6 bg-white p-5 ${roundedClass} border border-[#3A241C]/5 shadow-sm h-full`}>
      <div className="flex items-center gap-4 px-4 py-2 border-r border-[#3A241C]/5 overflow-hidden">
        <div className="w-12 h-12 bg-[#6A994E]/10 rounded-2xl flex-shrink-0 flex items-center justify-center text-[#6A994E]">
          <CalendarIcon size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mb-1 truncate">{label}</p>
          <p className="font-black text-[#3A241C] text-sm truncate">{displayText}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 pr-2">
        <QuickSelector 
          value={month - 1}
          options={months.map((m, i) => ({ label: m.slice(0, 3), value: i }))}
          onChange={handleMonthChange}
        />
        {!onlyMonths && (
          <QuickSelector 
            value={year}
            options={Array.from({ length: 4 }, (_, i) => 2024 + i).map(y => ({ label: y.toString(), value: y }))}
            onChange={handleYearChange}
          />
        )}
      </div>
    </div>
  );
}
