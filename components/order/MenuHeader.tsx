"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { Package, Utensils, X, Clock } from "lucide-react";

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
  prepTimer?: string | null;
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
  onToggleGlobalTakeaway,
  prepTimer
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
      <div className="flex items-center gap-3">
        {/* Preparation Timer Display */}
        {prepTimer !== null && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2.5 bg-white/5 h-9 lg:h-11 px-4 lg:px-5 rounded-xl lg:rounded-2xl border border-white/10 shadow-lg"
          >
            <Clock size={14} className="text-[#E76F51] animate-pulse" />
            <div className="flex flex-col -gap-1">
              <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-white/40">Kitchen Estim.</span>
              <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-white">{prepTimer}</span>
            </div>
          </motion.div>
        )}

        <div className="flex-shrink-0 ml-2">
        <div className={`flex items-center justify-center h-9 lg:h-11 px-4 lg:px-6 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl flex-shrink-0 whitespace-nowrap bg-[#E76F51] border-2 border-[#3A241C] ring-1 ring-white/10`}>
          {isTakeawayMode ? (
            <><Package size={14} className="mr-2 lg:w-5 lg:h-5" />Takeaway</>
          ) : (
            <><Utensils size={14} className="mr-2 lg:w-5 lg:h-5" />Dine-in</>
          )}
        </div>
      </div>
    </div>
    </header>
  );
};

export default memo(MenuHeader);
