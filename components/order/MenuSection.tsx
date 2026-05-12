"use client";

import React, { memo } from "react";
import MenuItem from "./MenuItem";
import { type OrderMenuItem } from "@/lib/menu";

interface MenuSectionProps {
  category: string;
  items: OrderMenuItem[];
  onAdd: (item: OrderMenuItem) => void;
  isRestaurantOpen: boolean;
  sectionRef: (el: HTMLElement | null) => void;
}

const MenuSection = ({
  category,
  items,
  onAdd,
  isRestaurantOpen,
  sectionRef
}: MenuSectionProps) => {
  return (
    <section 
      id={category}
      ref={sectionRef}
      className="scroll-mt-24 lg:scroll-mt-28"
    >
      <div className="flex items-center gap-4 lg:gap-6 mb-8 lg:mb-10">
        <h2 className="font-[var(--font-playfair)] text-2xl lg:text-4xl font-black text-[#3A241C] tracking-tight">{category}</h2>
        <div className="h-[2px] flex-1 bg-gradient-to-r from-[#3A241C]/10 to-transparent rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {items.map((item, idx) => (
          <MenuItem 
            key={item.id}
            item={item}
            onAdd={onAdd}
            isRestaurantOpen={isRestaurantOpen}
            priority={idx < 4} // Priority for top items in each category
          />
        ))}
      </div>
    </section>
  );
};

export default memo(MenuSection);
