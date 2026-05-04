"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Coffee, Star, MapPin, ChevronRight, Info } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

import { useSocket } from "@/lib/socket-client";
import { type OrderMenuItem } from "@/lib/menu";
import { fetchMenu } from "@/lib/api";

const SkeletonItem = () => (
  <div className="bg-white rounded-[2rem] p-3 lg:p-4 border border-[#3A241C]/5 flex items-center gap-3 lg:gap-4 h-[140px] lg:h-[164px] animate-pulse">
    <div className="w-[104px] h-[104px] lg:w-[124px] lg:h-[124px] rounded-2xl bg-[#F9F7F4] flex-shrink-0" />
    <div className="flex-1 space-y-3">
      <div className="h-4 bg-[#F9F7F4] rounded-full w-2/3" />
      <div className="h-3 bg-[#F9F7F4] rounded-full w-1/2" />
      <div className="h-2 bg-[#F9F7F4] rounded-full w-3/4" />
      <div className="h-6 bg-[#F9F7F4] rounded-full w-1/4 mt-4" />
    </div>
  </div>
);

export default function StaticMenu() {
  const [categories, setCategories] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<OrderMenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const { on, connected } = useSocket();

  const loadMenuData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await fetchMenu();
      setMenuItems(data.items);
      setCategories(data.categories);
      if (data.categories.length > 0 && (isInitial || !activeCategory)) {
        setActiveCategory(data.categories[0]);
      }
    } catch (err) {
      console.error("Failed to load menu:", err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    loadMenuData(true);
  }, []); // Only on mount

  useEffect(() => {
    if (!connected) return;
    const unsubs = [
      on("menu_updated", () => loadMenuData(false)),
      on("menu_item_stock_updated", (updates: any) => {
        if (!updates || !Array.isArray(updates)) return;
        setMenuItems(prev => prev.map(item => {
          const update = updates.find((u: any) => u.id === item.id);
          if (update) return { ...item, outOfStock: update.outOfStock };
          return item;
        }));
      })
    ];
    return () => unsubs.forEach(u => u());
  }, [connected, on, loadMenuData]);


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
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => scrollToSection(cat)}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 ${
                    activeCategory === cat
                      ? "bg-white text-[var(--benne-primary)] shadow-[0_10px_30px_rgba(58,36,28,0.08)] border border-[var(--coffee)]/5"
                      : "text-[var(--coffee)]/50 hover:text-[var(--coffee)] hover:bg-white/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl grayscale-[0.5] group-hover:grayscale-0">
                      {cat === "Beverages" ? "☕" : cat === "Idli" ? "🍚" : cat === "Uttapam" ? "🫓" : "🥞"}
                    </span>
                    {cat}
                  </div>
                  {activeCategory === cat && (
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
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => scrollToSection(cat)}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all duration-300 border ${
                  activeCategory === cat
                    ? "bg-[var(--benne-primary)] text-white border-[var(--benne-primary)] shadow-lg"
                    : "bg-white text-[var(--coffee)]/60 border-[var(--coffee)]/10"
                }`}
              >
                <span className="mr-1.5">
                  {cat === "Beverages" ? "☕" : cat === "Idli" ? "🍚" : cat === "Uttapam" ? "🫓" : "🥞"}
                </span>
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Sections */}
          <div className="flex-1 space-y-12 md:space-y-24 md:pt-0">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonItem key={i} />)}
              </div>
            ) : (
              categories.map((cat) => {
                const items = menuItems.filter(i => i.category === cat);
                if (items.length === 0) return null;
                
                // Get category icon and description (hardcoded fallback for now or we could extend the API)
                const catInfo = {
                  "Benne Bliss": { icon: "🧈", desc: "Our signature Davangere-style butter dosas, handcrafted on cast-iron tawas." },
                  "Classic Dosas": { icon: "🥞", desc: "Traditional Bangalore-style dosas prepared with love." },
                  "Idli": { icon: "🍚", desc: "Soft, steamed perfection served with coconut chutney and sambar." },
                  "Uttapam": { icon: "🫓", desc: "Thick, fluffy, and loaded with fresh toppings." },
                  "Beverages": { icon: "☕", desc: "Authentic brews from the plantations of Chikkamagaluru." }
                }[cat] || { icon: "🥞", desc: "Delicious South Indian delicacies." };

                return (
                  <section 
                    key={cat} 
                    id={`section-${cat}`}
                    ref={(el) => { sectionRefs.current[cat] = el; }}
                    className="scroll-mt-32"
                  >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[var(--coffee)]/5 pb-8">
                      <div className="max-w-2xl">
                        <div className="flex items-center gap-3 text-[var(--benne-primary)] font-black text-[10px] uppercase tracking-[0.25em] mb-3">
                          <span className="w-8 h-[1.5px] bg-[var(--benne-primary)]" />
                          {cat}
                        </div>
                        <h2 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-bold text-[var(--coffee)] mb-4 tracking-tight italic">
                          {catInfo.desc.split(',')[0]} <span className="text-[var(--benne-primary)]">.</span>
                        </h2>
                        <p className="text-[var(--coffee)]/50 text-sm md:text-base font-light leading-relaxed">
                          {catInfo.desc}
                        </p>
                      </div>
                      <div className="relative w-full md:w-48 h-32 rounded-3xl overflow-hidden shadow-lg border-4 border-white shrink-0 group">
                        <Image 
                          src={items[0]?.image || "/images/hero.webp"} 
                          alt={cat} 
                          fill 
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="(max-width: 768px) 100vw, 200px"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                      {items.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.05 }}
                          className={`bg-white rounded-[2.5rem] p-4 lg:p-5 border border-[var(--coffee)]/5 shadow-[0_10px_40px_-15px_rgba(58,36,28,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(58,36,28,0.1)] transition-all duration-500 group flex items-center gap-4 h-[160px] lg:h-[180px] overflow-hidden relative ${item.outOfStock ? "grayscale opacity-60" : ""}`}
                        >
                          {item.outOfStock && (
                            <div className="absolute inset-0 z-20 bg-[#3A241C]/20 backdrop-blur-[2px] flex items-center justify-center">
                              <span className="bg-[#3A241C] text-white px-4 py-2 rounded-full font-black text-[10px] lg:text-[12px] uppercase tracking-[0.2em] shadow-2xl">Out of Stock</span>
                            </div>
                          )}

                          {/* Image Box */}
                          <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-3xl bg-[var(--cream)] flex-shrink-0 overflow-hidden relative border border-[var(--coffee)]/5">
                            <Image 
                              src={item.image || "/images/hero.webp"} 
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
                                  {(item as any).volume && <span className="text-[var(--coffee)]/40 text-[10px] lg:text-xs normal-case tracking-normal ml-1.5 font-bold">({(item as any).volume})</span>}
                                </h3>
                                {item.rating && item.ratingCount && !["Soft Drinks", "Mineral Water"].includes(item.name) && (
                                  <div className="flex items-center gap-1 bg-[var(--benne-primary)]/5 px-2 py-0.5 rounded-lg border border-[var(--benne-primary)]/10 flex-shrink-0">
                                    <Star className="w-2.5 h-2.5 fill-[var(--benne-primary)] text-[var(--benne-primary)]" />
                                    <span className="text-[10px] font-black text-[var(--benne-primary)]">
                                      {item.rating}({item.ratingCount})
                                    </span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[var(--coffee)]/50 text-[11px] lg:text-xs leading-relaxed font-medium line-clamp-2 antialiased">
                                {item.descriptionEn}
                              </p>
                            </div>
                            
                            <div className="mt-auto">
                              <span className="font-black text-[var(--benne-primary)] text-xl lg:text-2xl tracking-tighter">
                                {item.priceLabel ? item.priceLabel : `₹${item.price}`}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                );
              })
            )}

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
