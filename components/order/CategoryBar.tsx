"use client";

import React, { memo } from "react";

interface CategoryBarProps {
  categories: string[];
  activeCategory: string;
  onCategoryClick: (category: string) => void;
}

const CategoryBar = ({ categories, activeCategory, onCategoryClick }: CategoryBarProps) => {
  return (
    <div className="bg-[#F9F7F4]/95 backdrop-blur-md px-4 lg:px-8 py-3 lg:py-4 flex gap-2 lg:gap-4 overflow-x-auto scrollbar-hide border-b border-[#3A241C]/5 w-full">
      {categories.map(cat => (
        <button
          key={cat}
          id={`cat-btn-${cat}`}
          onClick={() => onCategoryClick(cat)}
          className={`px-4 lg:px-6 py-2.5 lg:py-3 rounded-2xl text-[8px] lg:text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm transition-colors duration-200 whitespace-nowrap flex-shrink-0 ${activeCategory === cat ? "bg-[#3A241C] text-white border-[#3A241C]" : "bg-white text-[#3A241C]/40 hover:bg-[#3A241C] hover:text-white border-[#3A241C]/5"}`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default memo(CategoryBar);
