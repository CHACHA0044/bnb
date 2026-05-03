import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

interface CustomDatePickerProps {
  mode?: "single" | "range";
  date?: string; // YYYY-MM-DD
  fromDate?: string;
  toDate?: string;
  onChange?: (date: string) => void;
  onRangeChange?: (from: string, to: string) => void;
  label?: string;
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
        className="bg-[#F9F7F4] px-3 py-1.5 rounded-xl font-black text-[#3A241C] text-[10px] uppercase tracking-[0.2em] outline-none cursor-pointer hover:bg-[#E76F51]/10 hover:text-[#E76F51] transition-all flex items-center gap-2"
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
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setShowOptions(false);
                }}
                className={`w-full text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-[#F9F7F4] hover:text-[#E76F51] transition-colors ${value === opt.value ? "text-[#E76F51] bg-[#E76F51]/5" : "text-[#3A241C]/60"}`}
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

export default function CustomDatePicker({
  mode = "single",
  date,
  fromDate,
  toDate,
  onChange,
  onRangeChange,
  label = "Select Date"
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial dates
  const initialDate = date ? new Date(date) : new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  // Range Selection State
  const [rangeStart, setRangeStart] = useState<Date | null>(fromDate ? new Date(fromDate) : null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(toDate ? new Date(toDate) : null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Single Selection State
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  useEffect(() => {
    if (mode === "single" && date) setSelectedDate(new Date(date));
    if (mode === "range") {
      setRangeStart(fromDate ? new Date(fromDate) : null);
      setRangeEnd(toDate ? new Date(toDate) : null);
    }
  }, [date, fromDate, toDate, mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const toISODate = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split("T")[0];
  };

  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

    if (mode === "single") {
      setSelectedDate(clickedDate);
      if (onChange) onChange(toISODate(clickedDate));
      setIsOpen(false);
    } else {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(clickedDate);
        setRangeEnd(null);
      } else {
        if (clickedDate < rangeStart) {
          setRangeStart(clickedDate);
        } else {
          setRangeEnd(clickedDate);
          if (onRangeChange) onRangeChange(toISODate(rangeStart), toISODate(clickedDate));
          setIsOpen(false);
        }
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "single") {
      const today = new Date();
      setSelectedDate(today);
      if (onChange) onChange(toISODate(today));
    } else {
      setRangeStart(null);
      setRangeEnd(null);
      if (onRangeChange) onRangeChange("", "");
    }
    setIsOpen(false);
  };

  const renderDays = () => {
    const days = [];
    const today = new Date();

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
      
      let isSelected = false;
      let isBetween = false;
      let isStart = false;
      let isEnd = false;

      if (mode === "single") {
        isSelected = isSameDay(dateObj, selectedDate);
      } else {
        isStart = isSameDay(dateObj, rangeStart);
        isEnd = isSameDay(dateObj, rangeEnd);
        isSelected = isStart || isEnd;
        
        if (rangeStart && rangeEnd && dateObj > rangeStart && dateObj < rangeEnd) {
          isBetween = true;
        } else if (rangeStart && !rangeEnd && hoverDate && dateObj > rangeStart && dateObj <= hoverDate) {
          isBetween = true;
        }
      }

      const isToday = isSameDay(dateObj, today);
      
      const minDate = new Date(2025, 11, 1); // Dec 1, 2025
      const isPastMin = dateObj < minDate;
      const isFuture = dateObj > today && !isToday;
      const isDisabled = isPastMin || isFuture;

      days.push(
        <button
          key={d}
          onClick={() => !isDisabled && handleDayClick(d)}
          onMouseEnter={() => !isDisabled && setHoverDate(dateObj)}
          disabled={isDisabled}
          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative z-10
            ${isDisabled ? "opacity-20 cursor-not-allowed text-[#3A241C]" : ""}
            ${!isDisabled && isSelected ? "bg-[#E76F51] text-white shadow-md shadow-[#E76F51]/30" : ""}
            ${!isDisabled && !isSelected && isBetween ? "bg-[#E76F51]/10 text-[#E76F51]" : ""}
            ${!isDisabled && !isSelected && !isBetween ? "hover:bg-[#F9F7F4] text-[#3A241C]" : ""}
            ${isToday && !isSelected && !isDisabled ? "ring-1 ring-[#3A241C]/20" : ""}
          `}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  const getDisplayText = () => {
    if (mode === "single") {
      return selectedDate.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
    } else {
      if (rangeStart && rangeEnd) {
        return `${rangeStart.toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} - ${rangeEnd.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}`;
      } else if (rangeStart) {
        return `${rangeStart.toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} - Select End Date`;
      }
      return "Select Date Range";
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-[#3A241C]/5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="w-10 h-10 bg-[#E76F51]/10 rounded-xl flex items-center justify-center text-[#E76F51] group-hover:scale-105 transition-transform">
          <CalendarIcon size={20} />
        </div>
        <div>
          <p className="text-[9px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mb-0.5">{label}</p>
          <p className="font-black text-[#3A241C] text-sm whitespace-nowrap">{getDisplayText()}</p>
        </div>
      </div>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-4 right-0 md:left-0 md:right-auto z-50 bg-white p-5 rounded-[2rem] shadow-2xl border border-[#3A241C]/5 w-[320px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={handlePrevMonth} className="w-8 h-8 rounded-full hover:bg-[#F9F7F4] flex items-center justify-center text-[#3A241C]/50 transition-colors">
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex gap-2">
                <QuickSelector 
                  value={currentMonth.getMonth()}
                  options={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => ({ label: m, value: i }))}
                  onChange={(val) => setCurrentMonth(new Date(currentMonth.getFullYear(), val, 1))}
                />
                <QuickSelector 
                  value={currentMonth.getFullYear()}
                  options={Array.from({ length: new Date().getFullYear() - 2025 + 1 }, (_, i) => 2025 + i).map(y => ({ label: y.toString(), value: y }))}
                  onChange={(val) => setCurrentMonth(new Date(val, currentMonth.getMonth(), 1))}
                />
              </div>

              <button onClick={handleNextMonth} className="w-8 h-8 rounded-full hover:bg-[#F9F7F4] flex items-center justify-center text-[#3A241C]/50 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-[10px] font-black text-[#3A241C]/30 uppercase text-center py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1" onMouseLeave={() => setHoverDate(null)}>
              {renderDays()}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-[#3A241C]/5 flex justify-between items-center">
              <button 
                onClick={handleClear}
                className="text-[10px] font-black text-[#3A241C]/40 uppercase tracking-widest hover:text-[#E76F51] transition-colors"
              >
                Clear
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="bg-[#3A241C] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#E76F51] transition-colors shadow-md"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
