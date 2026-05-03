"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * Premium Scroll Indicator — Global component for tracking reading progress.
 * Features a minimalist vertical track and animated emoji transitions.
 * Hidden on mobile for peak performance.
 */
const foodEmojis = ["🥞", "☕", "🧈", "🥥", "🍯", "🥐"];

export default function ScrollIndicator() {
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [currentEmojiIdx, setCurrentEmojiIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Transform scroll progress into emoji index
  const emojiIndex = useTransform(scrollYProgress, [0, 1], [0, foodEmojis.length - 1]);

  useEffect(() => {
    const unsubscribe = emojiIndex.on("change", (latest) => {
      const idx = Math.min(Math.floor(latest + 0.5), foodEmojis.length - 1);
      if (idx !== currentEmojiIdx) {
        setCurrentEmojiIdx(idx);
      }
    });

    const handleScroll = () => {
      // Show earlier if page is long, or always if user wants it global
      setIsVisible(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [currentEmojiIdx, emojiIndex]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="fixed right-8 top-1/2 -translate-y-1/2 z-[60] hidden lg:flex flex-col items-center gap-6"
        >
          {/* Progress Track */}
          <div className="relative w-[4px] h-56 bg-[var(--coffee)]/10 rounded-full overflow-hidden">
            <motion.div
              style={{ scaleY }}
              className="absolute top-0 left-0 w-full h-full bg-[#A0522D] rounded-full origin-top"
            />
          </div>

          {/* Floating Icon — Closer to bar and centered */}
          <div className="relative w-10 h-10 flex items-center justify-center text-4xl select-none mt-[-10px]">
            <AnimatePresence>
              <motion.span
                key={currentEmojiIdx}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.2 }}
                transition={{ duration: 0.2 }}
                className="absolute"
              >
                {foodEmojis[currentEmojiIdx]}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
