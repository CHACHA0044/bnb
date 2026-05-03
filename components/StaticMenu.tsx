"use client";

import { useState, useEffect, useRef } from "react";
import { Coffee, Star, MapPin, ChevronRight, Info } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Static Menu Data ─── */

const MENU_DATA = [
  {
    category: "Benne Bliss",
    icon: "🧈",
    image: "/images/menu/plain-benne-dosa.webp",
    description: "Our signature Davangere-style butter dosas, handcrafted on cast-iron tawas.",
    items: [
      { name: "Plain Benne Dosa", price: 140, rating: 4.8, description: "Classic golden crispy dosa with a signature dollop of Davangere butter.", image: "/images/menu/plain-benne-dosa.webp" },
      { name: "Masala Benne Dosa", price: 160, rating: 4.9, description: "The iconic butter dosa filled with our special spiced potato palya.", image: "/images/menu/masala-benne-dosa.webp" },
      { name: "Ghee Podi Benne Dosa", price: 160, rating: 4.8, description: "Crispy dosa layered with aromatic milagai podi and pure desi ghee.", image: "/images/menu/ghee-podi-benne-dosa.webp" },
      { name: "Ghee Podi Masala Benne Dosa", price: 180, rating: 4.9, description: "A power-packed combo of spicy podi and savory potato masala.", image: "/images/menu/ghee-podi-masala-benne-dosa.webp" },
      { name: "Garlic Ghee Roast Benne Dosa", price: 200, rating: 4.7, description: "Infused with roasted garlic and ghee for an extra punch of flavor.", image: "/images/menu/garlic-ghee-roast-benne-dosa.webp" },
      { name: "Paneer Benne Dosa", price: 200, rating: 4.6, description: "Butter dosa stuffed with fresh, spiced paneer crumble.", image: "/images/menu/paneer-benne-dosa.webp" },
    ],
  },
  {
    category: "Classic Dosas",
    icon: "🥞",
    image: "/images/menu/masala-dosa.webp",
    description: "Traditional Bangalore-style dosas prepared with love.",
    items: [
      { name: "Plain Dosa", price: 90, rating: 4.5, description: "Simple, light and crispy — the perfect everyday comfort food.", image: "/images/menu/plain-dosa.webp" },
      { name: "Masala Dosa", price: 120, rating: 4.7, description: "The gold standard of dosas, stuffed with tempered potato palya.", image: "/images/menu/masala-dosa.webp" },
      { name: "Ghee Podi Masala Dosa", price: 140, rating: 4.8, description: "Our classic masala dosa elevated with aromatic podi and ghee.", image: "/images/menu/ghee-podi-masala-dosa.webp" },
      { name: "Mysore Masala Dosa", price: 140, rating: 4.7, description: "Layered with spicy garlic chutney for that authentic Mysore kick.", image: "/images/menu/mysore-masala-dosa.webp" },
      { name: "Paneer Dosa", price: 140, rating: 4.6, description: "A protein-rich variant with spiced paneer filling.", image: "/images/menu/paneer-dosa.webp" },
      { name: "Butter Paneer Dosa", price: 160, rating: 4.7, description: "Indulgent dosa with paneer and an extra hint of butter.", image: "/images/menu/butter-paneer-dosa.webp" },
    ],
  },
  {
    category: "Idli",
    icon: "🍚",
    image: "/images/menu/idli.webp",
    description: "Soft, steamed perfection served with coconut chutney and sambar.",
    items: [
      { name: "Idli - 2 pc", price: 50, rating: 4.5, description: "Traditional soft and fluffy steamed rice cakes.", image: "/images/menu/idli.webp" },
      { name: "Ghee Podi Idli - 2pc", price: 70, rating: 4.7, description: "Idlis tossed in spicy podi and clarified butter.", image: "/images/menu/ghee-podi-idli.webp" },
      { name: "Ghee Podi Thatte Idli - 1pc", price: 70, rating: 4.9, description: "Large, plate-sized idli from Bidadi, soaked in ghee and podi.", image: "/images/menu/thatte-idli.webp" },
    ],
  },
  {
    category: "Uttapam",
    icon: "🫓",
    image: "/images/menu/veg-uttapam.webp",
    description: "Thick, fluffy, and loaded with fresh toppings.",
    items: [
      { name: "Veg Uttapam", price: 100, rating: 4.6, description: "Loaded with onions, tomatoes, and green chilies.", image: "/images/menu/veg-uttapam.webp" },
      { name: "Podi Masala Uttapam", price: 120, rating: 4.8, description: "Fluffy uttapam topped with spicy podi and masala.", image: "/images/menu/podi-masala-uttapam.webp" },
    ],
  },
  {
    category: "Beverages",
    icon: "☕",
    image: "/images/menu/filter-coffee.webp",
    description: "Authentic brews from the plantations of Chikkamagaluru.",
    items: [
      { name: "Filter Coffee", price: 40, rating: 4.9, description: "Our signature decoction-based frothy South Indian coffee.", image: "/images/menu/filter-coffee.webp" },
      { name: "Iced Filter Coffee", price: 90, rating: 4.7, description: "A chilled take on our classic filter coffee.", image: "/images/menu/iced-filter-coffee.webp" },
      { name: "Tea", price: 25, rating: 4.4, description: "Standard ginger-infused tea.", image: "/images/menu/tea.webp" },
      { name: "Soft Drinks", price: null, label: "on MRP", rating: 4.5, description: "Coke, Thums Up, or Sprite served chilled.", image: "/images/menu/soft-drinks.webp" },
      { name: "Buttermilk", price: 40, rating: 4.8, description: "Refreshing spiced buttermilk to beat the heat.", image: "/images/menu/buttermilk.webp" },
      { name: "Mineral Water", price: null, label: "on MRP", rating: 4.2, description: "Packaged drinking water.", image: "/images/menu/mineral-water.webp" },
    ],
  },
];

export default function StaticMenu() {
  const [activeCategory, setActiveCategory] = useState(MENU_DATA[0].category);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px -80% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveCategory(entry.target.id.replace('section-', ''));
        }
      });
    }, observerOptions);

    Object.values(sectionRefs.current).forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="bg-[var(--cream)] pt-8 md:pt-24 pb-10 md:pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Desktop Sidebar Navigation */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-32 space-y-2">
              <div className="mb-8 px-4">
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-[var(--coffee)]/30 mb-2">Categories</h3>
                <div className="h-1 w-8 bg-[var(--benne-primary)] rounded-full" />
              </div>
              {MENU_DATA.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => scrollToSection(cat.category)}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 ${
                    activeCategory === cat.category
                      ? "bg-white text-[var(--benne-primary)] shadow-[0_10px_30px_rgba(58,36,28,0.08)] border border-[var(--coffee)]/5"
                      : "text-[var(--coffee)]/50 hover:text-[var(--coffee)] hover:bg-white/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl grayscale-[0.5] group-hover:grayscale-0">{cat.icon}</span>
                    {cat.category}
                  </div>
                  {activeCategory === cat.category && (
                    <motion.div layoutId="active-indicator">
                      <ChevronRight size={16} />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* Mobile Category Bar - Hidden as requested */}
          <div className="hidden lg:hidden sticky top-[72px] z-[50] bg-[var(--cream)]/90 backdrop-blur-xl border-b border-[var(--coffee)]/5 -mx-6 px-6 py-4 overflow-x-auto scrollbar-hide flex gap-3">
            {MENU_DATA.map((cat) => (
              <button
                key={cat.category}
                onClick={() => scrollToSection(cat.category)}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all duration-300 border ${
                  activeCategory === cat.category
                    ? "bg-[var(--benne-primary)] text-white border-[var(--benne-primary)] shadow-lg"
                    : "bg-white text-[var(--coffee)]/60 border-[var(--coffee)]/10"
                }`}
              >
                <span className="mr-1.5">{cat.icon}</span>
                {cat.category}
              </button>
            ))}
          </div>

          {/* Menu Sections */}
          <div className="flex-1 space-y-12 md:space-y-24 md:pt-0">
            {MENU_DATA.map((cat) => (
              <section 
                key={cat.category} 
                id={`section-${cat.category}`}
                ref={(el) => { sectionRefs.current[cat.category] = el; }}
                className="scroll-mt-32"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[var(--coffee)]/5 pb-8">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-3 text-[var(--benne-primary)] font-black text-[10px] uppercase tracking-[0.25em] mb-3">
                      <span className="w-8 h-[1.5px] bg-[var(--benne-primary)]" />
                      {cat.category}
                    </div>
                    <h2 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-bold text-[var(--coffee)] mb-4 tracking-tight italic">
                      {cat.description.split(',')[0]} <span className="text-[var(--benne-primary)]">.</span>
                    </h2>
                    <p className="text-[var(--coffee)]/50 text-sm md:text-base font-light leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                  <div className="relative w-full md:w-48 h-32 rounded-3xl overflow-hidden shadow-lg border-4 border-white shrink-0 group">
                    <Image 
                      src={cat.image} 
                      alt={cat.category} 
                      fill 
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, 200px"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                  {cat.items.map((item, idx) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-[2.5rem] p-4 lg:p-5 border border-[var(--coffee)]/5 shadow-[0_10px_40px_-15px_rgba(58,36,28,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(58,36,28,0.1)] transition-all duration-500 group flex items-center gap-4 h-[160px] lg:h-[180px] overflow-hidden"
                    >
                      {/* Image Box */}
                      <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-3xl bg-[var(--cream)] flex-shrink-0 overflow-hidden relative border border-[var(--coffee)]/5">
                        <Image 
                          src={(item as any).image || cat.image} 
                          alt={item.name} 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          sizes="150px"
                          loading="lazy"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex flex-col justify-between h-full py-1 min-w-0">
                        <div className="min-w-0">
                          <div className="flex justify-between items-start mb-1.5 gap-2">
                            <h3 className="font-bold text-[var(--coffee)] text-base lg:text-lg group-hover:text-[var(--benne-primary)] transition-colors tracking-tight line-clamp-1 flex-1">
                              {item.name}
                            </h3>
                            {item.rating && (
                              <div className="flex items-center gap-1 bg-[var(--benne-primary)]/5 px-1.5 py-0.5 rounded-lg border border-[var(--benne-primary)]/10 flex-shrink-0">
                                <Star className="w-2.5 h-2.5 fill-[var(--benne-primary)] text-[var(--benne-primary)]" />
                                <span className="text-[9px] font-black text-[var(--benne-primary)]">{item.rating}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[var(--coffee)]/50 text-[11px] lg:text-xs leading-relaxed font-medium line-clamp-2 antialiased">
                            {item.description}
                          </p>
                        </div>
                        
                        <div className="mt-auto">
                          <span className="font-black text-[var(--benne-primary)] text-xl lg:text-2xl tracking-tighter">
                            {item.price ? `₹${item.price}` : item.label}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            ))}

            {/* Packing Charges & CTA */}
            <div className="pt-8 md:pt-16 border-t border-[var(--coffee)]/5 text-center">
              <div className="inline-flex items-center gap-4 bg-white px-6 py-3 md:px-8 md:py-4 rounded-2xl md:rounded-3xl shadow-sm border border-[var(--coffee)]/5 mb-8 md:mb-12">
                <MapPin size={16} className="text-[var(--benne-primary)]" />
                <span className="text-[var(--coffee)]/40 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                  Packing Charges: ₹20 per box
                </span>
              </div>
              
              <div className="relative group max-w-xl mx-auto px-4 md:px-0">
                <div className="absolute inset-0 bg-[var(--benne-primary)] rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <a
                  href="/table/T1"
                  className="relative flex items-center justify-center gap-4 bg-[#3A241C] text-white px-8 py-5 md:px-12 md:py-7 rounded-[2rem] md:rounded-[2.5rem] text-lg md:text-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-2xl overflow-hidden"
                >
                  <Coffee size={20} className="md:w-6 md:h-6 animate-pulse" />
                  Order Now at Table
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
