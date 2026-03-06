"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const foodIcons = [
  { emoji: "🥞", color: "#E76F51" },
  { emoji: "☕", color: "#F4A261" },
  { emoji: "🧈", color: "#D35400" },
  { emoji: "🥥", color: "#6A994E" },
  { emoji: "🌶️", color: "#E76F51" },
  { emoji: "🍯", color: "#F4A261" },
];

// Fixed particle positions — CSS-animated so they never touch the JS thread
const particles = [
  { size: 5, x: -10, y: -18, tx: -12, ty: -36, delay: 0,   dur: 2.4 },
  { size: 4, x:   4, y: -14, tx:   8, ty: -42, delay: 0.4, dur: 2.8 },
  { size: 6, x:  12, y: -10, tx:  14, ty: -32, delay: 0.8, dur: 2.2 },
  { size: 3, x:  -6, y:  -8, tx: -16, ty: -28, delay: 1.2, dur: 3.0 },
  { size: 5, x:   0, y: -20, tx:   4, ty: -44, delay: 0.6, dur: 2.6 },
  { size: 4, x: -14, y:  -6, tx: -10, ty: -38, delay: 1.6, dur: 2.0 },
];

interface ScrollState {
  progress: number;
  iconIndex: number;
  visible: boolean;
}

export default function ScrollIndicator() {
  const [state, setState] = useState<ScrollState>({
    progress: 0,
    iconIndex: 0,
    visible: false,
  });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handle = () => {
      // Throttle to one update per animation frame — prevents 3 setState
      // calls per scroll tick; browser batches the single setState naturally
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const progress = total > 0 ? Math.min(window.scrollY / total, 1) : 0;
        setState({
          progress,
          iconIndex: Math.floor(progress * (foodIcons.length - 1)),
          visible: window.scrollY > 200,
        });
      });
    };

    window.addEventListener("scroll", handle, { passive: true });
    return () => {
      window.removeEventListener("scroll", handle);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const { progress, iconIndex, visible } = state;
  const icon = foodIcons[iconIndex];

  return (
    <>
      {/* Particle keyframes injected once — zero JS per frame */}
      <style>{`
        @keyframes si-particle {
          0%   { opacity: 0; transform: translate(0,0) scale(0.4); }
          40%  { opacity: 0.85; }
          100% { opacity: 0; transform: translate(var(--tx),var(--ty)) scale(0.15); }
        }
      `}</style>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            className="fixed right-5 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-3"
            style={{ willChange: "opacity, transform" }}
          >
            {/* Scroll track */}
            <div
              className="relative w-[3px] h-56 rounded-full"
              style={{ background: "rgba(58,36,28,0.12)" }}
            >
              <motion.div
                className="absolute top-0 left-0 w-full rounded-full origin-top"
                style={{ background: `linear-gradient(180deg, ${icon.color}, #F4A261)` }}
                animate={{ height: `${progress * 100}%` }}
                transition={{ duration: 0.1, ease: "easeOut" }}
              />
            </div>

            {/* Emoji — slides in/out, no wrapping circle */}
            <div
              className="relative flex items-center justify-center w-10 h-10 overflow-hidden"
              style={{ willChange: "contents" }}
            >
              <AnimatePresence>
                <motion.span
                  key={iconIndex}
                  initial={{ y: 18, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0,  opacity: 1, scale: 1   }}
                  exit={{    y: -18, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute text-3xl select-none"
                  style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.18))" }}
                >
                  {icon.emoji}
                </motion.span>
              </AnimatePresence>

              {/* CSS-animated particles — GPU-only, no JS per frame */}
              {particles.map((p, i) => (
                <span
                  key={`${iconIndex}-${i}`}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width:  p.size,
                    height: p.size,
                    background: icon.color,
                    left: `calc(50% + ${p.x}px)`,
                    top:  `calc(50% + ${p.y}px)`,
                    opacity: 0,
                    /* custom props consumed by the keyframe */
                    ["--tx" as string]: `${p.tx}px`,
                    ["--ty" as string]: `${p.ty}px`,
                    animation: `si-particle ${p.dur}s ease-out ${p.delay}s infinite`,
                    willChange: "transform, opacity",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
