"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const foodIcons = [
  { emoji: "🥞", color: "#E76F51" },
  { emoji: "☕", color: "#F4A261" },
  { emoji: "🧈", color: "#D35400" },
  { emoji: "🥥", color: "#6A994E" },
];

export default function ScrollIndicator() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handle = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const current = window.scrollY;
        setProgress(total > 0 ? current / total : 0);
        setVisible(current > 300);
      });
    };

    window.addEventListener("scroll", handle, { passive: true });
    return () => {
      window.removeEventListener("scroll", handle);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const iconIndex = Math.min(Math.floor(progress * foodIcons.length), foodIcons.length - 1);
  const icon = foodIcons[iconIndex];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="fixed right-6 top-1/2 -translate-y-1/2 z-[60] hidden lg:flex flex-col items-center gap-4"
        >
          {/* Progress Track */}
          <div className="relative w-[4px] h-64 bg-[var(--coffee)]/10 rounded-full overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 w-full bg-[var(--benne-primary)] origin-top rounded-full"
              style={{ height: `${progress * 100}%` }}
            />
          </div>

          {/* Floating Icon */}
          <motion.div
            key={iconIndex}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-2xl border border-[var(--cream)]"
          >
            {icon.emoji}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
