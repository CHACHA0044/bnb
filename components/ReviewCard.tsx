"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface ReviewCardProps {
  name: string;
  rating: number;
  text: string;
  date: string;
  isLocalGuide?: boolean;
  index: number;
}

export default function ReviewCard({ name, rating, text, date, isLocalGuide, index }: ReviewCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="bg-white p-8 rounded-[2.5rem] shadow-[0_10px_40px_-15px_rgba(58,36,28,0.08)] border border-[var(--coffee)]/5 hover:shadow-[0_40px_80px_-20px_rgba(58,36,28,0.12)] transition-all duration-500 h-full flex flex-col reveal-on-scroll"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-[var(--cream)] flex items-center justify-center font-bold text-[var(--coffee)] text-lg border border-[var(--benne-primary)]/10 uppercase shrink-0">
          {name.charAt(0)}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-[var(--coffee)] text-lg leading-tight truncate">{name}</h3>
          <div className="flex items-center gap-2">
            {isLocalGuide && (
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--benne-primary)] bg-[var(--benne-primary)]/5 px-2 py-0.5 rounded-full shrink-0">
                Local Guide
              </span>
            )}
            <span className="text-xs text-[var(--coffee)]/40 font-medium truncate">{date}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-0.5 mb-4 shrink-0">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={`${i < rating ? "fill-[var(--benne-primary)] text-[var(--benne-primary)]" : "text-gray-200"}`}
          />
        ))}
      </div>

      <p className="text-[var(--coffee)]/70 text-base leading-relaxed font-light italic flex-grow line-clamp-4">
        "{text}"
      </p>
    </motion.div>
  );
}
