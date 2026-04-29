export interface OrderMenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
  priceLabel?: string;
  tags?: string[];
}

export const ORDER_CATEGORIES = [
  "Benne Bliss",
  "Classic Dosas",
  "Idli",
  "Uttapam",
  "Beverages",
];

export const ORDER_MENU: OrderMenuItem[] = [
  /* ─── Benne Bliss ─────────────────────── */
  { id: "bb-1", name: "Plain Benne Dosa", price: 140, category: "Benne Bliss" },
  { id: "bb-2", name: "Masala Benne Dosa", price: 160, category: "Benne Bliss" },
  { id: "bb-3", name: "Ghee Podi Benne Dosa", price: 160, category: "Benne Bliss" },
  { id: "bb-4", name: "Ghee Podi Masala Benne Dosa", price: 180, category: "Benne Bliss" },
  { id: "bb-5", name: "Garlic Ghee Roast Benne Dosa", price: 200, category: "Benne Bliss" },
  { id: "bb-6", name: "Paneer Benne Dosa", price: 200, category: "Benne Bliss" },

  /* ─── Classic Dosas ───────────────────── */
  { id: "cd-1", name: "Plain Dosa", price: 90, category: "Classic Dosas" },
  { id: "cd-2", name: "Masala Dosa", price: 120, category: "Classic Dosas" },
  { id: "cd-3", name: "Ghee Podi Masala Dosa", price: 140, category: "Classic Dosas" },
  { id: "cd-4", name: "Mysore Masala Dosa", price: 140, category: "Classic Dosas" },
  { id: "cd-5", name: "Paneer Dosa", price: 140, category: "Classic Dosas" },
  { id: "cd-6", name: "Butter Paneer Dosa", price: 160, category: "Classic Dosas" },

  /* ─── Idli ────────────────────────────── */
  { id: "id-1", name: "Idli - 2 pc", price: 50, category: "Idli" },
  { id: "id-2", name: "Ghee Podi Idli - 2pc", price: 70, category: "Idli" },
  { id: "id-3", name: "Ghee Podi Thatte Idli - 1pc", price: 70, category: "Idli" },

  /* ─── Uttapam ─────────────────────────── */
  { id: "ut-1", name: "Veg Uttapam", price: 100, category: "Uttapam" },
  { id: "ut-2", name: "Podi Masala Uttapam", price: 120, category: "Uttapam" },

  /* ─── Beverages ───────────────────────── */
  { id: "bv-1", name: "Filter Coffee", price: 40, category: "Beverages" },
  { id: "bv-2", name: "Iced Filter Coffee", price: 90, category: "Beverages" },
  { id: "bv-3", name: "Tea", price: 25, category: "Beverages" },
  { id: "bv-4", name: "Mineral Water", price: 0, category: "Beverages", priceLabel: "on MRP" },
  { id: "bv-5", name: "Thumps up/Coke", price: 0, category: "Beverages", priceLabel: "on MRP" },
  { id: "bv-6", name: "Sprite", price: 0, category: "Beverages", priceLabel: "on MRP" },
  { id: "bv-7", name: "Buttermilk", price: 40, category: "Beverages" },

  /* ─── Others ──────────────────────────── */
  { id: "pkg", name: "Packing Charges", price: 20, category: "Others" },
];
