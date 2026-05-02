"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Plus, Bell, Package, CreditCard, Banknote, Star } from "lucide-react";
import Image from "next/image";

interface OrderSuccessProps {
  session: any;
  remaining: number;
  onAddMore: () => void;
  onPaymentModeChange: (mode: "UPI" | "CASH" | null) => void;
  paymentMode: "UPI" | "CASH" | null;
  onUPIPayment: () => void;
  onCashPayment: () => void;
  payingUPI: boolean;
  payingCash: boolean;
  onRateItem: (name: string, rating: number) => void;
  ratings: Record<string, number>;
  ratedItems: Set<string>;
  isTakeaway: boolean;
}

const OrderSuccess = ({
  session,
  remaining,
  onAddMore,
  onPaymentModeChange,
  paymentMode,
  onUPIPayment,
  onCashPayment,
  payingUPI,
  payingCash,
  onRateItem,
  ratings,
  ratedItems,
  isTakeaway
}: OrderSuccessProps) => {
  const allOrderedItems = (session?.orders ?? []).flatMap((o: any) => o.items)
    .filter((i: any) => {
      const name = i.name.toLowerCase();
      return !name.includes("packing charges") && !name.includes("pseudo-packing-placeholder");
    });
  
  const preparingItems = allOrderedItems.filter((i: any) => !i.isServed);
  const servedItems = allOrderedItems.filter((i: any) => i.isServed);
  
  const ratingEligibleItems = allOrderedItems.filter((i: any) => !i.name.toLowerCase().includes("soft drink"));
  const hasPendingPayment = (session?.payments ?? []).some((p: any) => p.status === "PENDING" || p.status === "UNPAID");
  const hasUnconfirmed = (session?.orders ?? []).some((o: any) => o.status === "UNCONFIRMED");

  return (
    <div className="p-8 lg:p-10 flex flex-col items-center text-center h-full overflow-y-auto scrollbar-hide">
      <div className="w-full space-y-3 mb-6">
        {session?.paymentReminder && remaining > 0 && (
          <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full bg-[#B71C1C] text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg border border-white/10">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
              <Bell size={20} className="animate-bounce" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-left flex-1">Please settle your bill at the counter or via UPI!</p>
          </motion.div>
        )}

        {(() => {
          const hasReadyTakeaway = (session?.orders ?? []).some((o: any) => 
            o.items.some((i: any) => i.name.toLowerCase().includes("(to-go)") && i.isServed)
          );
          if (!hasReadyTakeaway) return null;
          return (
            <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full bg-[#6A994E] text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg border border-white/10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
                <Package size={20} className="animate-bounce" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">Takeaway Ready!</p>
                <p className="text-[9px] font-bold text-white/60 leading-tight">Your packed items are ready at the counter.</p>
              </div>
            </motion.div>
          );
        })()}
      </div>

      <div className={`w-16 lg:w-20 h-16 lg:h-20 rounded-full ${hasUnconfirmed ? 'bg-[#F4A261]/10 text-[#F4A261] border-[#F4A261]/10' : 'bg-[#6A994E]/10 text-[#6A994E] border-[#6A994E]/10'} flex items-center justify-center mb-4 border`}>
        {hasUnconfirmed ? <Loader2 size={32} className="animate-spin lg:w-10 lg:h-10" /> : <CheckCircle2 size={32} className="lg:w-10 lg:h-10" />}
      </div>
      <h2 className="font-black text-[#3A241C] text-2xl lg:text-3xl mb-1 tracking-tighter uppercase">
        {hasUnconfirmed ? "Processing..." : "Ordered!"}
      </h2>
      {hasUnconfirmed && (
        <p className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 mb-4 animate-pulse">Waiting for Admin Confirmation</p>
      )}
      
      <button onClick={onAddMore} className="mt-4 px-8 py-3 bg-[#3A241C] text-white rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] flex items-center gap-2 group transition-all hover:bg-[#E76F51] shadow-xl shadow-[#3A241C]/10">
        <Plus size={14} className="group-hover:rotate-180 transition-transform duration-500" />
        Add More Items
      </button>

      {!hasUnconfirmed && remaining > 0 ? (
        <div className="w-full space-y-4 lg:space-y-6 mt-6 mb-10">
          <div className="bg-[#F9F7F4] rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-8 shadow-inner border-2 border-[#E76F51]/20">
            <span className="text-[9px] lg:text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.4em]">Pending Bill</span>
            <p className="text-3xl lg:text-4xl font-black text-[#3A241C] mt-2 tracking-tighter">₹ {remaining}</p>
          </div>
          
          {hasPendingPayment ? (
            <div className="bg-[#F9F7F4] rounded-[2rem] p-8 border-2 border-dashed border-[#3A241C]/10 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-[#3A241C]/20" size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40">Waiting for admin confirmation...</p>
            </div>
          ) : !paymentMode ? (
            <div className="grid grid-cols-2 gap-3">
              <button disabled={payingUPI || payingCash} onClick={() => onPaymentModeChange("UPI")} className="py-4 bg-[#3A241C] text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-[#3A241C]/20 active:scale-95 transition-all">
                <CreditCard size={14} /> Pay UPI
              </button>
              <button disabled={payingUPI || payingCash} onClick={onCashPayment} className="py-4 border-2 border-[#3A241C] text-[#3A241C] rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                {payingCash ? <Loader2 className="animate-spin" size={14} /> : <Banknote size={14} />} Pay Cash
              </button>
            </div>
          ) : paymentMode === "UPI" ? (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] p-6 border-2 border-[#E76F51] shadow-2xl">
              <div className="relative w-40 h-40 mx-auto mb-4 border-2 border-[#F9F7F4] p-2 rounded-2xl overflow-hidden bg-[#F9F7F4]"><Image src="/images/qr/payment_qr.jpeg" alt="QR" fill className="object-contain" /></div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#3A241C]/30 mb-6">Scan to pay directly</p>
              <button onClick={onUPIPayment} disabled={payingUPI} className="w-full py-4 bg-[#6A994E] text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#6A994E]/20">
                {payingUPI ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} I Have Paid
              </button>
            </motion.div>
          ) : null}
        </div>
      ) : !hasUnconfirmed ? (
        <div className="p-6 bg-[#6A994E]/10 rounded-2xl w-full text-[#6A994E] font-black text-[10px] uppercase tracking-[0.4em] border border-[#6A994E]/10 mt-6 mb-10">
          Transaction Settled
        </div>
      ) : null}

      <div className="w-full space-y-6 mb-10">
        {(preparingItems.length > 0 || servedItems.length > 0) && (
          <div className="bg-[#F9F7F4] rounded-[2rem] p-6 border border-[#3A241C]/5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#3A241C]/40 mb-4 text-left">Live Status</p>
            {preparingItems.length > 0 && (
              <div className="space-y-3 mb-6">
                 <p className="text-[8px] font-black text-[#F4A261] uppercase tracking-[0.1em] text-left ml-1">Preparing</p>
                 {preparingItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#3A241C]/5 shadow-sm">
                    <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#F4A261] animate-pulse" /><span className="text-xs font-bold text-[#3A241C]">{isTakeaway ? item.name.split('(')[0].trim() : item.name}</span></div>
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#F4A261]/10 text-[#F4A261]">Preparing</span>
                  </div>
                ))}
              </div>
            )}
            {servedItems.length > 0 && (
              <div className="space-y-3">
                 <p className="text-[8px] font-black text-[#6A994E] uppercase tracking-[0.1em] text-left ml-1">Served / Ready</p>
                 {servedItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#3A241C]/5 shadow-sm opacity-60">
                    <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#6A994E]" /><span className="text-xs font-bold text-[#3A241C]">{isTakeaway ? item.name.split('(')[0].trim() : item.name}</span></div>
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#6A994E]/10 text-[#6A994E]">{item.name.toLowerCase().includes("(to-go)") ? "Ready" : "Served"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {ratingEligibleItems.length > 0 && (
        <div className="w-full mb-10 text-left">
          <h3 className="font-black text-[#3A241C] text-lg tracking-tight mb-1">Rate Your Experience</h3>
          <div className="space-y-4 mt-6">
            {ratingEligibleItems.map((item: any, idx: number) => {
              const isRated = ratedItems.has(item.name);
              const currentRating = ratings[item.name] || 0;
              return (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-[#3A241C]/5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-[#3A241C] text-sm">{isTakeaway ? item.name.split('(')[0].trim() : item.name}</span>
                    {isRated && <span className="text-[9px] font-black text-[#6A994E] uppercase tracking-widest bg-[#6A994E]/10 px-2 py-0.5 rounded-md">Thanks!</span>}
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <div key={star} className="relative flex">
                        <button disabled={isRated} onClick={() => onRateItem(item.name, star - 0.5)} className="w-5 h-10 flex items-center justify-end overflow-hidden">
                          <Star size={22} className={`flex-shrink-0 -mr-[11px] ${currentRating >= star - 0.5 ? "fill-[#E76F51] text-[#E76F51]" : "text-[#3A241C]/10"}`} style={{ clipPath: 'inset(0 50% 0 0)' }} />
                        </button>
                        <button disabled={isRated} onClick={() => onRateItem(item.name, star)} className="w-5 h-10 flex items-center justify-start overflow-hidden">
                          <Star size={22} className={`flex-shrink-0 -ml-[11px] ${currentRating >= star ? "fill-[#E76F51] text-[#E76F51]" : "text-[#3A241C]/10"}`} style={{ clipPath: 'inset(0 0 0 50%)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="h-20 flex-shrink-0" />
    </div>
  );
};

export default memo(OrderSuccess);
