"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const foodIcons = [
  { emoji: "🥞", label: "Dosa",    color: "#E76F51" },
  { emoji: "☕", label: "Coffee",  color: "#F4A261" },
  { emoji: "🧈", label: "Butter",  color: "#D35400" },
  { emoji: "🥥", label: "Coconut", color: "#6A994E" },
  { emoji: "🌶️", label: "Spices",  color: "#E76F51" },
  { emoji: "🍯", label: "Sweet",   color: "#F4A261" },
];

// Fixed particle configs — avoids hydration mismatch from Math.random()
const particles = [
  { size: 5, offsetX: -10, offsetY: -18, travelX: -12, travelY: -36, delay: 0,    dur: 2.4 },
  { size: 4, offsetX:   4, offsetY: -14, travelX:   8, travelY: -42, delay: 0.4,  dur: 2.8 },
  { size: 6, offsetX:  12, offsetY: -10, travelX:  14, travelY: -32, delay: 0.8,  dur: 2.2 },
  { size: 3, offsetX:  -6, offsetY:  -8, travelX: -16, travelY: -28, delay: 1.2,  dur: 3.0 },
  { size: 5, offsetX:   0, offsetY: -20, travelX:   4, travelY: -44, delay: 0.6,  dur: 2.6 },
  { size: 4, offsetX: -14, offsetY:  -6, travelX: -10, travelY: -38, delay: 1.6,  dur: 2.0 },
];

export default function ScrollIndicator() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentIcon, setCurrentIcon]       = useState(0);
  const [isVisible, setIsVisible]           = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress    = Math.min(window.scrollY / totalHeight, 1);
      setScrollProgress(progress);
      setIsVisible(window.scrollY > 200);
      setCurrentIcon(Math.floor(progress * (foodIcons.length - 1)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const icon = foodIcons[currentIcon];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="fixed right-5 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-3"
        >
          {/* Scroll track */}
          <div
            className="relative w-[3px] h-56 rounded-full"
            style={{ background: "rgba(58,36,28,0.12)" }}
          >
            <motion.div
              className="absolute top-0 left-0 w-full rounded-full origin-top"
              style={{
                background: `linear-gradient(180deg, ${icon.color}, #F4A261)`,
                height: `${scrollProgress * 100}%`,
              }}
              animate={{ height: `${scrollProgress * 100}%` }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            />
          </div>

          {/* Bare emoji — no circle, no background */}
          <div className="relative flex items-center justify-center w-10 h-10 overflow-hidden">
            <AnimatePresence>
              <motion.span
                key={currentIcon}
                initial={{ y: 20, opacity: 0, scale: 0.6 }}
                animate={{ y: 0,  opacity: 1, scale: 1   }}
                exit={{    y: -20, opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute text-3xl select-none"
                style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.18))" }}
              >
                {icon.emoji}
              </motion.span>
            </AnimatePresence>

            {/* Particles orbiting the emoji */}
            {particles.map((p, i) => (
              <motion.div
                key={`${currentIcon}-${i}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width:  p.size,
                  height: p.size,
                  background: icon.color,
                  left: "50%",
                  top:  "50%",
                  marginLeft: p.offsetX,
                  marginTop:  p.offsetY,
                  opacity: 0,
                }}
                animate={{
                  y:       [0, p.travelY * 0.5, p.travelY],
                  x:       [0, p.travelX * 0.6, p.travelX],
                  opacity: [0, 0.9, 0],
                  scale:   [0.4, 1.2, 0.2],
                }}
                transition={{
                  duration: p.dur,
                  repeat: Infinity,
                  delay:  p.delay,
                  ease:   "easeOut",
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
