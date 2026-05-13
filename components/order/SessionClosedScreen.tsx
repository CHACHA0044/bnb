"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageSquare, CheckCircle2, Package, ArrowRight, Heart } from "lucide-react";
import Image from "next/image";

interface SessionClosedScreenProps {
  session: any;
  isTakeaway: boolean;
  closedAt: string;
  ratings: Record<string, number>;
  ratedItems: Set<string>;
  onRateItem: (name: string, rating: number) => void;
  onFeedbackSubmit: (feedback: string) => void;
}

export default function SessionClosedScreen({
  session,
  isTakeaway,
  closedAt,
  ratings,
  ratedItems,
  onRateItem,
  onFeedbackSubmit
}: SessionClosedScreenProps) {
  const [localFeedback, setLocalFeedback] = useState(session?.feedback || "");
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Calculate rating window
  const windowExpired = useMemo(() => {
    const closedTime = new Date(closedAt).getTime();
    const now = Date.now();
    const windowMs = isTakeaway ? 24 * 60 * 60 * 1000 : 10 * 60 * 1000;
    return now > closedTime + windowMs;
  }, [closedAt, isTakeaway]);

  useEffect(() => {
    if (windowExpired) return;

    const timer = setInterval(() => {
      const closedTime = new Date(closedAt).getTime();
      const now = Date.now();
      const windowMs = isTakeaway ? 24 * 60 * 60 * 1000 : 10 * 60 * 1000;
      const diff = (closedTime + windowMs) - now;

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        if (isTakeaway) {
          const hrs = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          setTimeLeft(`${hrs}h ${mins}m`);
        } else {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [closedAt, isTakeaway, windowExpired]);

  const ratingEligibleItems = useMemo(() => {
    const items = (session?.orders ?? []).flatMap((o: any) => o.items || []);
    return items.filter((i: any) => {
        const name = i.name.toLowerCase();
        return !name.includes("packing charges") && !name.includes("soft drink");
    });
  }, [session]);

  const handleSubmit = () => {
    onFeedbackSubmit(localFeedback);
    setSubmitted(true);
  };

  if (windowExpired || submitted) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#F9F7F4] flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-sm w-full space-y-8"
        >
          <div className="relative w-32 h-32 mx-auto">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-[#E76F51]/20"
            />
            <div className="absolute inset-2 bg-white rounded-full shadow-2xl flex items-center justify-center">
              <Heart size={48} className="text-[#E76F51] fill-[#E76F51]" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-black text-[#3A241C] tracking-tighter uppercase">Thank You!</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#3A241C]/40 leading-loose">
              Your session has ended.<br/>We hope you enjoyed our food.
            </p>
          </div>

          <div className="w-full h-px bg-[#3A241C]/5" />

          <div className="space-y-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#E76F51]">Visit us again soon</p>
            <p className="text-[8px] font-bold text-[#3A241C]/30 uppercase tracking-[0.1em]">
              {isTakeaway ? "Order history saved for 24 hours" : "Scan QR to start a new session"}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#F9F7F4] flex flex-col p-6 lg:p-12 overflow-y-auto">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-2xl mx-auto w-full space-y-10"
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#3A241C] tracking-tighter uppercase">Rate Your Meal</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3A241C]/40">Your feedback helps us improve</p>
          </div>
          {timeLeft && (
            <div className="bg-[#E76F51]/10 px-4 py-2 rounded-full border border-[#E76F51]/20">
              <span className="text-[10px] font-black text-[#E76F51] uppercase tracking-widest">{timeLeft} left</span>
            </div>
          )}
        </div>

        {/* Items to Rate */}
        <div className="space-y-4">
          {ratingEligibleItems.map((item: any, idx: number) => {
            const isRated = ratedItems.has(item.name);
            const currentRating = ratings[item.name] || 0;
            return (
              <motion.div 
                key={idx}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-3xl border border-[#3A241C]/5 shadow-sm group hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black text-[#3A241C] text-sm uppercase tracking-tight">
                    {isTakeaway ? item.name.split('(')[0].trim() : item.name}
                  </span>
                  {isRated && (
                    <motion.span 
                      initial={{ scale: 0.5 }} 
                      animate={{ scale: 1 }}
                      className="text-[9px] font-black text-[#6A994E] uppercase tracking-widest bg-[#6A994E]/10 px-3 py-1 rounded-full"
                    >
                      Awesome!
                    </motion.span>
                  )}
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <div key={star} className="relative w-12 h-12 flex items-center justify-center cursor-pointer">
                      <Star size={28} className={`transition-all ${currentRating >= star - 0.5 ? 'scale-110' : 'text-[#3A241C]/5'}`} />
                      {currentRating >= star - 0.5 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ clipPath: currentRating >= star ? 'none' : 'inset(0 50% 0 0)' }}>
                          <Star size={28} className="fill-[#E76F51] text-[#E76F51]" />
                        </div>
                      )}
                      <button 
                        disabled={isRated} 
                        onClick={() => onRateItem(item.name, star - 0.5)} 
                        className="absolute left-0 top-0 w-1/2 h-full z-10 opacity-0" 
                      />
                      <button 
                        disabled={isRated} 
                        onClick={() => onRateItem(item.name, star)} 
                        className="absolute right-0 top-0 w-1/2 h-full z-10 opacity-0" 
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* General Feedback */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#3A241C]/20" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3A241C]/40">Any other comments?</span>
          </div>
          <div className="bg-white rounded-[2.5rem] p-6 border border-[#3A241C]/5 shadow-sm">
            <textarea 
              value={localFeedback}
              onChange={(e) => setLocalFeedback(e.target.value.slice(0, 150))}
              placeholder="Tell us what you liked..."
              className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-bold text-[#3A241C] placeholder:text-[#3A241C]/10 min-h-[100px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 pb-12">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            className="w-full h-16 bg-[#3A241C] text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl shadow-[#3A241C]/20 hover:bg-[#E76F51] transition-all"
          >
            Submit Feedback <ArrowRight size={16} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
