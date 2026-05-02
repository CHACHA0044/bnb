"use client";

import { useState } from "react";
import { Coffee } from "lucide-react";

/* ─── Static Menu Data (matching physical menu card) ─── */

const MENU_DATA = [
  {
    category: "Benne Bliss",
    icon: "🧈",
    description: "Our signature Davangere-style butter dosas",
    items: [
      { name: "Plain Benne Dosa", price: 140 },
      { name: "Masala Benne Dosa", price: 160 },
      { name: "Ghee Podi Benne Dosa", price: 160 },
      { name: "Ghee Podi Masala Benne Dosa", price: 180 },
      { name: "Garlic Ghee Roast Benne Dosa", price: 200 },
      { name: "Paneer Benne Dosa", price: 200 },
    ],
  },
  {
    category: "Classic Dosas",
    icon: "🥞",
    description: "Traditional dosas prepared on cast-iron tawas",
    items: [
      { name: "Plain Dosa", price: 90 },
      { name: "Masala Dosa", price: 120 },
      { name: "Ghee Podi Masala Dosa", price: 140 },
      { name: "Mysore Masala Dosa", price: 140 },
      { name: "Paneer Dosa", price: 140 },
      { name: "Butter Paneer Dosa", price: 160 },
    ],
  },
  {
    category: "Idli",
    icon: "🍚",
    description: "Soft, steamed perfection",
    items: [
      { name: "Idli - 2 pc", price: 50 },
      { name: "Ghee Podi Idli - 2pc", price: 70 },
      { name: "Ghee Podi Thatte Idli - 1pc", price: 70 },
    ],
  },
  {
    category: "Uttapam",
    icon: "🫓",
    description: "Thick, fluffy, and loaded with toppings",
    items: [
      { name: "Veg Uttapam", price: 100 },
      { name: "Podi Masala Uttapam", price: 120 },
    ],
  },
  {
    category: "Beverages",
    icon: "☕",
    description: "From the plantations of Chikkamagaluru",
    items: [
      { name: "Filter Coffee", price: 40 },
      { name: "Iced Filter Coffee", price: 90 },
      { name: "Tea", price: 25 },
      { name: "Mineral Water", price: null, label: "on MRP" },
      { name: "Thums Up / Coke", price: null, label: "on MRP" },
      { name: "Sprite", price: null, label: "on MRP" },
      { name: "Buttermilk", price: 40 },
    ],
  },
];

/**
 * StaticMenu — Beautiful, animated, static menu display.
 * No API calls. Light coffee-brown background matching cream palette.
 */
export default function StaticMenu() {
  const [activeCategory, setActiveCategory] = useState(MENU_DATA[0].category);

  return (
    <section className="bg-[var(--cream)] pb-20">
      {/* Category Pills */}
      <div className="sticky top-[72px] z-40 bg-[var(--cream)]/95 backdrop-blur-md border-b border-[var(--coffee)]/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex gap-3 overflow-x-auto scrollbar-hide">
          {MENU_DATA.map((cat) => (
            <button
              key={cat.category}
              onClick={() => {
                setActiveCategory(cat.category);
                const el = document.getElementById(`menu-${cat.category}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all duration-300 border ${
                activeCategory === cat.category
                  ? "bg-[var(--benne-primary)] text-white border-[var(--benne-primary)] shadow-lg shadow-[var(--benne-primary)]/30"
                  : "bg-white text-[var(--coffee)]/60 border-[var(--coffee)]/10 hover:bg-[var(--coffee)]/5 hover:text-[var(--coffee)]"
              }`}
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Sections */}
      <div className="max-w-5xl mx-auto px-6 pt-12 space-y-16">
        {MENU_DATA.map((cat) => (
          <div
            key={cat.category}
            id={`menu-${cat.category}`}
            className="scroll-mt-36"
          >
            {/* Category Header */}
            <div className="flex items-center gap-5 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--benne-primary)]/10 flex items-center justify-center text-2xl border border-[var(--benne-primary)]/20">
                {cat.icon}
              </div>
              <div className="flex-1">
                <h2 className="font-[var(--font-playfair)] text-3xl md:text-4xl font-bold text-[var(--coffee)] tracking-tight">
                  {cat.category}
                </h2>
                <p className="text-[var(--coffee)]/40 text-sm mt-1 font-light">{cat.description}</p>
              </div>
              <div className="h-[2px] flex-1 bg-gradient-to-r from-[var(--coffee)]/10 to-transparent rounded-full hidden md:block" />
            </div>

            {/* Items */}
            <div className="space-y-1">
              {cat.items.map((item) => (
                <div
                  key={item.name}
                  className="group flex items-center justify-between py-4 px-5 rounded-2xl hover:bg-white transition-colors duration-200 border border-transparent hover:border-[var(--coffee)]/5 hover:shadow-sm"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-[var(--benne-primary)]/30 group-hover:bg-[var(--benne-primary)] transition-colors duration-200 flex-shrink-0" />
                    <span className="text-[var(--coffee)]/80 font-semibold text-base md:text-lg tracking-tight truncate group-hover:text-[var(--coffee)] transition-colors duration-200">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className="font-black text-[var(--benne-primary)] text-lg md:text-xl tracking-tighter">
                      {item.price ? `₹${item.price}` : (item as any).label || ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Packing Charges Note */}
        <div className="text-center pt-8 pb-4 border-t border-[var(--coffee)]/5">
          <p className="text-[var(--coffee)]/30 text-xs font-bold uppercase tracking-[0.3em]">
            Packing Charges — ₹20 per box
          </p>
        </div>

        {/* CTA */}
        <div className="text-center pb-8">
          <a
            href="/table/T1"
            className="inline-flex items-center gap-3 bg-[var(--benne-primary)] text-white px-10 py-5 rounded-full text-lg font-bold shadow-2xl shadow-[var(--benne-primary)]/30 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Coffee size={22} />
            Order Now — Scan QR at Your Table
          </a>
        </div>
      </div>
    </section>
  );
}
