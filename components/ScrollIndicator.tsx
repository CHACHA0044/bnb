"use client";

import { useEffect, useRef } from "react";

/**
 * Pure CSS + minimal JS scroll indicator.
 * No Framer Motion, no React state — directly manipulates DOM for zero re-renders.
 * Shows a thin progress bar on the right side with a food emoji marker.
 */
const foodEmojis = ["🥞", "☕", "🧈", "🥥"];

export default function ScrollIndicator() {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handle = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const current = window.scrollY;
        const progress = total > 0 ? current / total : 0;
        const visible = current > 300;

        if (containerRef.current) {
          containerRef.current.style.opacity = visible ? "1" : "0";
          containerRef.current.style.transform = visible ? "translateX(0)" : "translateX(20px)";
        }
        if (barRef.current) {
          barRef.current.style.height = `${progress * 100}%`;
        }
        if (iconRef.current) {
          const idx = Math.min(Math.floor(progress * foodEmojis.length), foodEmojis.length - 1);
          iconRef.current.textContent = foodEmojis[idx];
        }
      });
    };

    window.addEventListener("scroll", handle, { passive: true });
    return () => {
      window.removeEventListener("scroll", handle);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed right-6 top-1/2 -translate-y-1/2 z-[60] hidden lg:flex flex-col items-center gap-4 transition-all duration-300 ease-out"
      style={{ opacity: 0, transform: "translateX(20px)" }}
    >
      {/* Progress Track */}
      <div ref={trackRef} className="relative w-[4px] h-64 bg-[var(--coffee)]/10 rounded-full overflow-hidden">
        <div
          ref={barRef}
          className="absolute top-0 left-0 w-full bg-[var(--benne-primary)] rounded-full transition-[height] duration-100 ease-out"
          style={{ height: "0%" }}
        />
      </div>

      {/* Floating Icon */}
      <div
        ref={iconRef}
        className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-2xl border border-[var(--cream)]"
      >
        🥞
      </div>
    </div>
  );
}
