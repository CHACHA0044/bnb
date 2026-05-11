"use client";

import React, { memo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, Plus, Bell, Package, CreditCard, Banknote, Star, ShieldAlert, XCircle, X, MessageSquare } from "lucide-react";
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
  isProcessingOrder?: boolean;
  deletedOrders?: any[];
  paymentSuccess?: boolean;
  sessionClosed?: boolean;
  showReviewPrompt?: boolean;
  setShowReviewPrompt?: (val: boolean) => void;
  onFeedbackSubmit?: (feedback: string) => void;
  orderConfig?: { upiId: string } | null;
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
  isTakeaway,
  isProcessingOrder,
  deletedOrders = [],
  paymentSuccess = false,
  sessionClosed = false,
  showReviewPrompt = false,
  setShowReviewPrompt,
  onFeedbackSubmit,
  orderConfig
}: OrderSuccessProps) => {
  const [showCancellation, setShowCancellation] = useState(false);
  const [localFeedback, setLocalFeedback] = useState(session?.feedback || "");
  const [isMobile, setIsMobile] = useState(false);
  const [upiView, setUpiView] = useState<'CHOICE' | 'QR'>('CHOICE');
  const [hasPaid, setHasPaid] = useState(payingUPI);
  const [payDelay, setPayDelay] = useState(10);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  const upiId = orderConfig?.upiId || process.env.NEXT_PUBLIC_UPI_ID || "hemadembla505@okicici";
  const upiLink = `upi://pay?pa=${upiId}&pn=Benne%20n%20Beans&am=${remaining}&cu=INR`;

  useEffect(() => {
    setMounted(true);
    setIsMobile(/Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 1024);
  }, []);

  useEffect(() => {
    if (mounted) {
      setUpiView(isMobile ? 'CHOICE' : 'QR');
    }
  }, [isMobile, mounted]);

  useEffect(() => {
    if (paymentMode === 'UPI' && !hasPaid) {
      const timer = setInterval(() => {
        setPayDelay(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [paymentMode, hasPaid]);

  useEffect(() => {
    if (session?.feedback !== undefined && session.feedback !== localFeedback) {
      setLocalFeedback(session.feedback || "");
    }
  }, [session?.feedback]);
  const notifiedCancelledIds = React.useRef<Set<string>>(new Set());

  const cancelledOrders = [
    ...(session?.orders ?? []).filter((o: any) => o.status === "CANCELLED"),
    ...deletedOrders
  ];

  useEffect(() => {
    const currentIds = cancelledOrders.map((o: any) => o.id);
    const newIds = currentIds.filter(id => !notifiedCancelledIds.current.has(id));

    if (newIds.length > 0) {
      setShowCancellation(true);
      newIds.forEach(id => notifiedCancelledIds.current.add(id));
      const timer = setTimeout(() => setShowCancellation(false), 60000); // Hide after 1 min
      return () => clearTimeout(timer);
    }
  }, [cancelledOrders.length]);

  const allOrderedItems = (session?.orders ?? []).flatMap((o: any) => o.items)
    .filter((i: any) => {
      const name = i.name.toLowerCase();
      return !name.includes("packing charges") && !name.includes("pseudo-packing-placeholder");
    });
  
  const preparingItems = allOrderedItems.filter((i: any) => {
    const order = (session?.orders ?? []).find((o: any) => o.items.some((oi: any) => oi.id === i.id));
    return !i.isServed && order?.status !== "CANCELLED";
  });
  
  const servedItems = allOrderedItems.filter((i: any) => {
    const order = (session?.orders ?? []).find((o: any) => o.items.some((oi: any) => oi.id === i.id));
    return i.isServed && order?.status !== "CANCELLED";
  });

  
  const ratingEligibleItems = allOrderedItems.filter((i: any) => !i.name.toLowerCase().includes("soft drink"));
  const hasPendingPayment = (session?.payments ?? []).some((p: any) => p.status === "PENDING" || p.status === "UNPAID");
  const hasUnconfirmed = isProcessingOrder || (session?.orders ?? []).some((o: any) => o.status === "UNCONFIRMED");
  const hasConfirmed = (session?.orders ?? []).some((o: any) => o.status !== "UNCONFIRMED" && o.status !== "CANCELLED");

  const hasActiveOrders = preparingItems.length > 0 || servedItems.length > 0;
  
  // SESSION CLOSED SCREEN
  if (sessionClosed) {
    return (
      <div className="p-8 lg:p-12 flex flex-col items-center text-center h-full justify-center bg-[#F9F7F4]">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-full bg-[#3A241C] flex items-center justify-center mb-8 shadow-2xl"
        >
          <Package size={40} className="text-[#E76F51]" />
        </motion.div>
        <h2 className="text-3xl font-black text-[#3A241C] mb-4 uppercase tracking-tighter">Thank You!</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3A241C]/40 mb-10 leading-loose">
          Your session has been closed.<br/>We hope you enjoyed your meal!
        </p>
        <div className="w-full h-px bg-[#3A241C]/5 mb-10" />
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[#E76F51] animate-pulse">Visit Again Soon</p>
      </div>
    );
  }

  // PAYMENT SUCCESS SCREEN
  if (paymentSuccess && !hasUnconfirmed) {
    return (
      <div className="p-8 lg:p-12 flex flex-col items-center text-center h-full justify-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-full bg-[#6A994E]/10 flex items-center justify-center mb-8 border-2 border-[#6A994E]/20"
        >
          <CheckCircle2 size={48} className="text-[#6A994E]" />
        </motion.div>
        <h2 className="text-2xl font-black text-[#3A241C] mb-4 uppercase tracking-tighter">Payment confirmed</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3A241C]/40 mb-8">
          Order placed successfully • Thank you!
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAddMore}
          className="px-8 py-4 bg-[#3A241C] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl"
        >
          View Order History
        </motion.button>
      </div>
    );
  }

  // If no orders at all and not processing, show a minimal loading state instead of null to prevent blank screens
  if (!allOrderedItems.length && !isProcessingOrder && !cancelledOrders.length) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="animate-spin text-[#E76F51] mb-4" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40">Initializing Order View...</p>
      </div>
    );
  }

  // If processing a new order (even if it's the first one), we SHOULD show the main UI
  const isFullyCancelled = cancelledOrders.length > 0 && !hasActiveOrders && !hasUnconfirmed;
  const showProcessing = hasUnconfirmed || isProcessingOrder;
  const showOrdered = hasConfirmed && !hasUnconfirmed && !isProcessingOrder;

  return (
    <div className="px-8 pb-8 pt-12 lg:p-10 flex flex-col items-center text-center h-full overflow-y-auto scrollbar-hide">
      <div className="w-full space-y-3 mb-6 hidden lg:block">

        {(() => {
          const hasReadyTakeaway = (session?.orders ?? []).some((o: any) => 
            o.items.some((i: any) => i.name.toLowerCase().includes("(packing)") && i.isServed)
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

      <div className={`w-16 lg:w-20 h-16 lg:h-20 rounded-full ${isFullyCancelled ? 'bg-[#B71C1C]/10 text-[#B71C1C] border-[#B71C1C]/10' : showProcessing ? 'bg-[#F4A261]/10 text-[#F4A261] border-[#F4A261]/10' : 'bg-[#6A994E]/10 text-[#6A994E] border-[#6A994E]/10'} flex items-center justify-center mb-4 border`}>
        {isFullyCancelled ? <XCircle size={32} className="lg:w-10 lg:h-10" /> : showProcessing ? <Loader2 size={32} className="animate-spin lg:w-10 lg:h-10" /> : <CheckCircle2 size={32} className="lg:w-10 lg:h-10" />}
      </div>
      <h2 className="font-black text-[#3A241C] text-2xl lg:text-3xl mb-1 tracking-tighter uppercase">
        {isFullyCancelled ? "Cancelled" : showProcessing ? "Confirming Order..." : "Ordered!"}
      </h2>
      {isFullyCancelled ? (
        <p className="text-[10px] font-black uppercase tracking-widest text-[#B71C1C]/40 mb-4">Staff has rejected your request</p>
      ) : showProcessing && (
          <div className="flex flex-col items-center gap-8 w-full max-w-[400px] mx-auto px-2">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#3A241C]/40 animate-pulse">Waiting for Admin Confirmation</p>
            
            {paymentMode === "UPI" && (
              <div className="w-full space-y-8">
                {hasPaid ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="bg-white rounded-[2.5rem] p-8 border-2 border-[#E76F51] shadow-2xl w-full"
                  >
                    <div className="py-8 space-y-6">
                      <div className="w-24 h-24 bg-[#6A994E]/10 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-[#6A994E]/30">
                        <Loader2 className="animate-spin text-[#6A994E]" size={40} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-black text-[#3A241C] text-xl uppercase tracking-tight">Verifying Payment</h4>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#3A241C]/40 leading-relaxed">
                          Waiting for payment confirmation<br/>from admin
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="w-full space-y-10">
                    {mounted && isMobile && upiView === 'CHOICE' ? (
                      <div className="space-y-4">
                        <a 
                          href={upiLink}
                          className="w-full h-20 bg-[#3A241C] text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-[#3A241C]/30 active:scale-[0.98] transition-all"
                        >
                          <CreditCard size={20} /> Pay with UPI App
                        </a>
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => setUpiView('QR')}
                            className="w-full py-5 border-2 border-[#3A241C]/10 text-[#3A241C]/60 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#3A241C]/5 transition-all"
                          >
                            Show QR Instead
                          </button>
                          <button 
                            onClick={onCashPayment}
                            className="w-full py-5 border-2 border-[#3A241C]/10 text-[#3A241C]/60 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#3A241C]/5 transition-all"
                          >
                            Cash Payment
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="relative w-full aspect-square mx-auto rounded-[3rem] overflow-hidden bg-white border-2 border-[#E76F51] shadow-[0_30px_80px_-15px_rgba(231,111,81,0.25)] p-4"
                        >
                          <div className="relative w-full h-full rounded-[2rem] overflow-hidden">
                            <Image src="/images/qr/payment_qr.jpeg" alt="QR" fill className="object-cover" priority />
                          </div>
                        </motion.div>
                        
                        <p className="text-[12px] font-black uppercase tracking-[0.4em] text-[#3A241C] opacity-80">Scan to pay now</p>
                      </div>
                    )}

                    <div className="space-y-6">
                      <AnimatePresence>
                        {payDelay === 0 ? (
                          <motion.button 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => {
                              setHasPaid(true);
                              onUPIPayment();
                            }}
                            className="w-full py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all bg-[#6A994E] text-white shadow-[0_20px_50px_rgba(106,153,78,0.3)] active:scale-95 border-2 border-[#6A994E]"
                          >
                            I Have Paid
                          </motion.button>
                        ) : (
                          <div className="py-4 text-[9px] font-black uppercase tracking-[0.2em] text-[#3A241C]/20 animate-pulse">
                            Processing UPI Session... {payDelay}s
                          </div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center justify-center gap-3 text-[#6A994E] font-black text-[11px] uppercase tracking-[0.2em] opacity-80">
                        <CheckCircle2 size={16} /> Real-time confirmation
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
      )}
      
      {!showProcessing && (
        <button onClick={onAddMore} className="mt-6 mb-6 px-8 py-3 bg-[#3A241C] text-white rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] flex items-center gap-2 group transition-all hover:bg-[#E76F51] shadow-xl shadow-[#3A241C]/10">
          <Plus size={14} className="group-hover:rotate-180 transition-transform duration-500" />
          Add More Items
        </button>
      )}

      {!isFullyCancelled && !hasUnconfirmed && remaining > 0 ? (
        <div className="w-full space-y-4 lg:space-y-6 mt-6 mb-10">
          <div className="bg-[#F9F7F4] rounded-[1.5rem] p-4 shadow-inner border-2 border-[#E76F51]/10">
            <span className="text-[8px] font-black text-[#3A241C]/30 uppercase tracking-[0.4em]">Pending Bill</span>
            <p className="text-2xl font-black text-[#3A241C] mt-1 tracking-tighter">₹ {remaining}</p>
          </div>
          
          {hasPendingPayment || payingUPI || hasPaid ? (
            <div className="bg-[#F9F7F4] rounded-[2rem] p-8 border-2 border-dashed border-[#3A241C]/10 flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center border-2 border-dashed border-[#3A241C]/10">
                <Loader2 className="animate-spin text-[#3A241C]/20" size={24} />
              </div>
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
              <div className="relative w-44 h-44 mx-auto mb-4 border-2 border-[#F9F7F4] p-2 rounded-2xl overflow-hidden bg-[#F9F7F4]"><Image src="/images/qr/payment_qr.jpeg" alt="QR" fill className="object-contain" /></div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#3A241C]/30 mb-6">Scan to pay directly</p>
              
              <AnimatePresence>
                {payDelay === 0 ? (
                  <motion.button 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setHasPaid(true);
                      onUPIPayment();
                    }} 
                    disabled={payingUPI} 
                    className="w-full py-5 bg-[#6A994E] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#6A994E]/20 active:scale-95 transition-all"
                  >
                    {payingUPI ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} I Have Paid
                  </motion.button>
                ) : (
                  <div className="py-4 text-[9px] font-black uppercase tracking-[0.2em] text-[#3A241C]/20 animate-pulse">
                    Waiting for UPI session... {payDelay}s
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </div>
      ) : (!isFullyCancelled && !hasUnconfirmed) ? (
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
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#6A994E]/10 text-[#6A994E]">{item.name.toLowerCase().includes("(packing)") ? "Ready" : "Served"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {cancelledOrders.length > 0 && (
          <div className="bg-[#B71C1C]/5 rounded-[2rem] p-6 border border-[#B71C1C]/10">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#B71C1C]/40 mb-4 text-left">Cancelled Items</p>
            <div className="space-y-3">
              {cancelledOrders.flatMap((o: any) => o.items || []).filter(Boolean).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#B71C1C]/5 shadow-sm opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#B71C1C]" />
                    <span className="text-xs font-bold text-[#3A241C] line-through">{isTakeaway ? item.name.split('(')[0].trim() : item.name}</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#B71C1C]/10 text-[#B71C1C]">Rejected</span>
                </div>
              ))}
            </div>
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
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <div key={star} className="relative w-10 h-10 flex items-center justify-center">
                        <Star size={22} className="text-[#3A241C]/10" />
                        {currentRating >= star - 0.5 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ clipPath: currentRating >= star ? 'none' : 'inset(0 50% 0 0)' }}>
                            <Star size={22} className="fill-[#E76F51] text-[#E76F51]" />
                          </div>
                        )}
                        <button disabled={isRated} onClick={() => onRateItem(item.name, star - 0.5)} className="absolute left-0 top-0 w-1/2 h-full z-10 opacity-0 cursor-pointer" />
                        <button disabled={isRated} onClick={() => onRateItem(item.name, star)} className="absolute right-0 top-0 w-1/2 h-full z-10 opacity-0 cursor-pointer" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GENERAL FEEDBACK SECTION */}
      <div className="w-full mb-6 text-left">
        <h3 className="font-black text-[#3A241C] text-lg tracking-tight mb-1">General Feedback</h3>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3A241C]/50 mb-4">Tell us about your experience</p>
        
        <div className="relative group">
          <div className={`flex items-start gap-4 bg-white p-4 lg:p-5 rounded-[2.2rem] border border-[#3A241C]/5 shadow-sm transition-all duration-300 ${localFeedback ? 'rounded-[1.5rem] bg-[#F9F7F4]/20' : ''}`}>
            <div className="w-10 h-10 rounded-2xl bg-[#3A241C]/5 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare size={16} className={`transition-colors ${localFeedback ? 'text-[#E76F51]' : 'text-[#3A241C]/20'}`} />
            </div>
            
            <div className="flex-1 relative pt-2">
              {!localFeedback && (
                <div className="absolute inset-0 flex flex-col justify-center pointer-events-none select-none">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3A241C]/50 leading-none">
                    Your Comments
                  </span>
                  <span className="text-[7px] font-bold text-[#3A241C]/40 uppercase tracking-widest leading-none mt-1.5">
                    Help us improve your next visit
                  </span>
                </div>
              )}
              <textarea 
                value={localFeedback}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 100);
                  setLocalFeedback(val);
                }}
                onBlur={() => onFeedbackSubmit?.(localFeedback)}
                maxLength={100}
                rows={1}
                spellCheck={false}
                onInput={(e: any) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:ring-transparent text-[14px] font-bold text-[#3A241C] resize-none overflow-hidden min-h-[28px] p-0 placeholder:text-transparent appearance-none shadow-none"
              />
            </div>
          </div>
          
          {localFeedback.length >= 100 && (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-[8px] font-black text-[#E76F51] uppercase tracking-widest mt-2 ml-4"
            >
              Maximum limit reached
            </motion.p>
          )}
        </div>
      </div>
      <div className="h-6 flex-shrink-0" />
    </div>
  );
};

export default memo(OrderSuccess);
