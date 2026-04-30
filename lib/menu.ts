export interface OrderMenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  descriptionEn?: string;
  descriptionHi?: string;
  image?: string;
  priceLabel?: string;
  tags?: string[];
  variants?: string[];
  variantPrices?: Record<string, number>;
  rating?: number;
  ratingCount?: number;
  outOfStock?: boolean;
  discountPct?: number;
  discountFlat?: number;
}

// These are now empty by default and fetched from the API
export const ORDER_CATEGORIES: string[] = [];
export const ORDER_MENU: OrderMenuItem[] = [];
