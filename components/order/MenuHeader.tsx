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
    <header className="flex-shrink-0 z-40 bg-[#3A241C] text-white px-3 lg:px-8 py-2.5 lg:py-4 flex items-center justify-between shadow-xl w-full border-b border-white/5">
      <div className="flex items-center gap-2 lg:gap-3 min-w-0">
        {session && session.orders.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCloseTable}
            className={`flex items-center justify-center gap-2 h-9 lg:h-11 px-4 lg:w-32 rounded-xl lg:rounded-2xl text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] transition-all flex-shrink-0 ${remaining <= 0 ? "bg-[#6A994E] text-white shadow-lg shadow-[#6A994E]/20" : "bg-white/5 text-white/30 border border-white/10"}`}
          >
            <X size={14} className="lg:w-4 lg:h-4" /> 
            <span className="hidden xs:inline">{isTakeawayMode ? "Done" : "Close Table"}</span>
            <span className="xs:hidden">{isTakeawayMode ? "Done" : "Close"}</span>
          </motion.button>
        )}
        
        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          <div className={`flex items-center justify-center h-9 lg:h-11 px-3 lg:w-32 rounded-xl lg:rounded-2xl text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm flex-shrink-0 whitespace-nowrap ${isTakeawayMode ? "bg-[#F4A261]" : "bg-[#E76F51]"}`}>
            {isTakeawayMode ? (
              <><Package size={12} className="mr-1.5 lg:w-4 lg:h-4" />Takeaway</>
            ) : (
              <>Table {tableId.replace(/^t/i, '')}</>
            )}
          </div>

          {timeLeft && (
            <div className="hidden xs:flex items-center gap-2 bg-[#B71C1C] h-9 lg:h-11 px-3 lg:px-4 rounded-xl lg:rounded-2xl animate-pulse shadow-lg flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-white">Ends in {timeLeft}</span>
            </div>
          )}

          {!connected && (
            <div className="flex items-center gap-1.5 lg:gap-2.5 flex-shrink-0">
              <span className="w-1.5 lg:w-2.5 h-1.5 lg:h-2.5 rounded-full animate-pulse bg-orange-400" />
              <span className="text-[7px] lg:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] whitespace-nowrap">Sync</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 ml-2">
        {!isTakeawayMode ? (
          <div className="flex items-center bg-black/20 rounded-xl lg:rounded-2xl p-1 gap-1 border border-white/5 shadow-inner h-9 lg:h-11">
            <button 
              onClick={() => onToggleGlobalTakeaway(false)}
              className={`flex items-center justify-center gap-1.5 h-full px-3 lg:px-5 rounded-lg lg:rounded-xl text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${!isTakeawayGlobal ? "bg-[#E76F51] text-white shadow-md" : "text-white/40 hover:text-white"}`}
            >
              <Utensils size={12} className="lg:w-4 lg:h-4" /> 
              <span className="hidden sm:inline">Dine-in</span>
            </button>
            <button 
              onClick={() => onToggleGlobalTakeaway(true)}
              className={`flex items-center justify-center gap-1.5 h-full px-3 lg:px-5 rounded-lg lg:rounded-xl text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all ${isTakeawayGlobal ? "bg-[#E76F51] text-white shadow-md" : "text-white/40 hover:text-white"}`}
            >
              <Package size={12} className="lg:w-4 lg:h-4" /> 
              <span className="hidden sm:inline">Takeaway</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center h-9 lg:h-11 bg-[#F4A261]/10 rounded-xl lg:rounded-2xl px-3 lg:px-5 border border-[#F4A261]/20">
            <Package size={14} className="text-[#F4A261] mr-2" />
            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-[#F4A261] whitespace-nowrap">Takeaway Only</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default memo(MenuHeader);
