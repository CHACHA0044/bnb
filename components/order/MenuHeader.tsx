"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { Package, Utensils, X } from "lucide-react";

interface MenuHeaderProps {
  tableId: string;
  isTakeawayMode: boolean;
  isTakeawayGlobal: boolean;
  session: any;
  remaining: number;
  timeLeft: string | null;
  connected: boolean;
  onCloseTable: () => void;
  onToggleGlobalTakeaway: (val: boolean) => void;
}

const MenuHeader = ({
  tableId,
  isTakeawayMode,
  isTakeawayGlobal,
  session,
  remaining,
  timeLeft,
  connected,
  onCloseTable,
  onToggleGlobalTakeaway
}: MenuHeaderProps) => {
  return (
    <header className="flex-shrink-0 z-40 bg-[#3A241C] text-white px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between shadow-xl w-full">
      <div className="flex items-center gap-4 lg:gap-8">
        {session && session.orders.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            onClick={onCloseTable}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] transition-all ${remaining <= 0 ? "bg-[#6A994E] text-white shadow-lg shadow-[#6A994E]/20" : "bg-white/5 text-white/30 border border-white/10"}`}
          >
            <X size={14} /> {isTakeawayMode ? "Done" : "Close Table"}
          </motion.button>
        )}
        <div className="flex items-center gap-3 lg:gap-6">
          <span className={`px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${isTakeawayMode ? "bg-[#F4A261]" : "bg-[#E76F51]"}`}>
            {isTakeawayMode ? (
              <><Package size={10} className="inline mr-1 -mt-0.5" />TW{session?.sessionNumber || ""}</>
            ) : (
              <>Table {tableId.replace(/^t/i, '')} {session?.sessionNumber ? `• #${session.sessionNumber}` : ""}</>
            )}
          </span>
          {timeLeft && (
            <div className="flex items-center gap-2 bg-[#B71C1C] px-3 py-1 rounded-lg animate-pulse shadow-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white">Closes in {timeLeft}</span>
            </div>
          )}
          {!connected && (
            <div className="flex items-center gap-2 lg:gap-2.5">
              <span className="w-2 lg:w-2.5 h-2 lg:h-2.5 rounded-full animate-pulse bg-orange-400" />
              <span className="text-[8px] lg:text-[10px] font-black text-white/50 uppercase tracking-[0.2em] whitespace-nowrap">Reconnecting</span>
            </div>
          )}
        </div>
      </div>

      {!isTakeawayMode ? (
        <div className="flex items-center bg-[#2A1A14] rounded-full p-0.5 gap-0.5 border border-white/10 shadow-inner">
          <button 
            onClick={() => onToggleGlobalTakeaway(false)}
            className={`flex items-center gap-1.5 px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${!isTakeawayGlobal ? "bg-[#E76F51] text-white shadow-md" : "text-white/40 hover:text-white"}`}
          >
            <Utensils size={10} className="lg:w-[12px] lg:h-[12px]" /> Dine-in
          </button>
          <button 
            onClick={() => onToggleGlobalTakeaway(true)}
            className={`flex items-center gap-1.5 px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${isTakeawayGlobal ? "bg-[#E76F51] text-white shadow-md" : "text-white/40 hover:text-white"}`}
          >
            <Package size={10} className="lg:w-[12px] lg:h-[12px]" /> Takeaway
          </button>
        </div>
      ) : (
        <div className="flex items-center bg-[#F4A261]/20 rounded-full px-4 py-2 border border-[#F4A261]/30">
          <Package size={14} className="text-[#F4A261] mr-2" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#F4A261]">Takeaway Only</span>
        </div>
      )}
    </header>
  );
};

export default memo(MenuHeader);
