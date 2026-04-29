"use client";

import { useState } from "react";
import Image from "next/image";
import { ORDER_MENU, ORDER_CATEGORIES } from "@/lib/menu";
import { Coffee } from "lucide-react";

/**
 * MenuGrid optimized for a consistent, premium look.
 * Removed plus button. Added placeholders for all items.
 */
export default function MenuGrid() {
  const [activeCategory, setActiveCategory] = useState(ORDER_CATEGORIES[0]);

  const filteredItems = ORDER_MENU.filter(item => item.category === activeCategory);

  return (
    <section className="section-padding bg-[var(--cream)]/20 min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="font-[var(--font-playfair)] text-5xl md:text-7xl font-bold text-[var(--coffee)] mb-6">
            The <span className="text-[var(--benne-primary)]">Menu</span>
          </h1>
          <p className="text-[var(--coffee)]/60 max-w-xl mx-auto text-lg leading-relaxed font-light">
            Each dish is prepared following authentic Karnataka recipes, using ingredients sourced directly from the region.
          </p>
        </div>

        {/* Category Selector */}
        <div className="flex flex-wrap justify-center gap-3 mb-16 overflow-x-auto pb-4 scrollbar-hide">
          {ORDER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-8 py-3 rounded-full text-sm font-bold tracking-wide whitespace-nowrap transition-all duration-500 ${
                activeCategory === cat
                  ? "bg-[var(--benne-primary)] text-white shadow-lg shadow-[var(--benne-primary)]/30"
                  : "bg-white text-[var(--coffee)] hover:bg-[var(--cream)] border border-[var(--coffee)]/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-[2.5rem] p-4 flex flex-col group hover:shadow-2xl hover:shadow-[var(--coffee)]/5 transition-all duration-500 border border-[var(--coffee)]/5"
            >
              <div className="relative h-64 w-full rounded-[2rem] overflow-hidden mb-6 bg-[var(--cream)] flex items-center justify-center">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <Coffee size={48} className="text-[var(--coffee)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--coffee)]">Image Coming Soon</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="px-4 pb-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--coffee)]">
                    {item.name}
                  </h3>
                  <span className="text-xl font-bold text-[var(--benne-primary)]">
                    {item.priceLabel || `₹${item.price}`}
                  </span>
                </div>
                
                <p className="text-[var(--coffee)]/60 text-sm leading-relaxed mb-6 font-light">
                  {item.description || "Authentic South Indian delicacy prepared with traditional methods and fresh ingredients."}
                </p>

                <div className="flex items-center gap-2 mt-auto">
                  {item.tags?.map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-[var(--cream)] text-[var(--coffee)]/60 text-[10px] font-bold uppercase tracking-widest">
                      {tag}
                    </span>
                  ))}
                  {!item.tags && (
                    <span className="px-3 py-1 rounded-full bg-[var(--cream)] text-[var(--coffee)]/40 text-[10px] font-bold uppercase tracking-widest">
                      Authentic
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
