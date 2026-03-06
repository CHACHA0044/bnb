/**
 * Benne n Beans — Shared constants & data
 * ========================================
 * Central source of truth for menu items, navigation links,
 * gallery images, process steps, and restaurant information.
 */

/* ---------- Navigation ---------- */
export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "#home" },
  { label: "Menu", href: "#menu" },
  { label: "Our Story", href: "#story" },
  { label: "Gallery", href: "#gallery" },
  { label: "Location", href: "#location" },
];

/* ---------- Signature Items ---------- */
export interface SignatureItem {
  title: string;
  description: string;
  image: string;
}

export const SIGNATURE_ITEMS: SignatureItem[] = [
  {
    title: "Benne Dosa",
    description:
      "Crispy, buttery dosa loaded with freshly churned benne (butter), cooked on a seasoned cast-iron tawa until golden perfection.",
    image: "/images/benne-dosa.jpg",
  },
  {
    title: "Thatte Idli",
    description:
      "Soft, plate-sized steamed idlis from the Bidadi tradition, served with aromatic sambar and coconut chutney.",
    image: "/images/thatte-idli.jpg",
  },
  {
    title: "Filter Coffee",
    description:
      "Authentic South Indian filter coffee brewed from freshly ground beans with a rich, aromatic froth.",
    image: "/images/filter-coffee.jpg",
  },
  {
    title: "Uttapam",
    description:
      "Thick, fluffy pancake topped with onions, tomatoes, and green chilies — a wholesome South Indian classic.",
    image: "/images/uttapam.jpg",
  },
];

/* ---------- Menu Items ---------- */
export interface MenuItem {
  name: string;
  description: string;
  price: string;
  category: string;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    name: "Benne Dosa",
    description: "Butter-laden crispy dosa served with chutney & sambar",
    price: "₹120",
    category: "Dosa",
  },
  {
    name: "Butter Masala Dosa",
    description: "Golden dosa stuffed with spiced potato masala",
    price: "₹140",
    category: "Dosa",
  },
  {
    name: "Set Dosa",
    description: "Soft, spongy trio of mini dosas with coconut chutney",
    price: "₹110",
    category: "Dosa",
  },
  {
    name: "Thatte Idli",
    description: "Plate-sized soft idli with sambar & chutney",
    price: "₹100",
    category: "Idli",
  },
  {
    name: "Rava Idli",
    description: "Semolina idli with cashews, curry leaves & mustard",
    price: "₹90",
    category: "Idli",
  },
  {
    name: "Uttapam",
    description: "Thick pancake topped with onions, tomatoes & chilies",
    price: "₹110",
    category: "Uttapam",
  },
  {
    name: "Onion Uttapam",
    description: "Classic uttapam generously topped with crispy onions",
    price: "₹100",
    category: "Uttapam",
  },
  {
    name: "Filter Coffee",
    description: "Traditional South Indian filter coffee, hot & frothy",
    price: "₹60",
    category: "Beverages",
  },
  {
    name: "Badam Milk",
    description: "Rich almond milk with saffron and cardamom",
    price: "₹80",
    category: "Beverages",
  },
];

/* ---------- Dosa Process Steps ---------- */
export interface ProcessStep {
  step: number;
  title: string;
  description: string;
}

export const DOSA_PROCESS: ProcessStep[] = [
  {
    step: 1,
    title: "Fermented Batter",
    description:
      "Rice and urad dal batter is stone-ground and naturally fermented overnight for the perfect tang and rise.",
  },
  {
    step: 2,
    title: "Cast Iron Tawa",
    description:
      "The batter is ladled onto a well-seasoned cast iron tawa heated to just the right temperature.",
  },
  {
    step: 3,
    title: "Butter Melting",
    description:
      "Generous dollops of fresh benne (butter) are spread across the dosa as it sizzles to golden crispness.",
  },
  {
    step: 4,
    title: "Golden Crisp Dosa",
    description:
      "The dosa is carefully folded once it reaches the perfect golden-brown hue with lacy, crispy edges.",
  },
  {
    step: 5,
    title: "Served with Chutneys",
    description:
      "Plated with freshly ground coconut chutney, tomato chutney, and piping-hot sambar.",
  },
];

/* ---------- Gallery ---------- */
export const GALLERY_IMAGES: string[] = [
  "/images/gallery1.jpg",
  "/images/gallery2.jpg",
  "/images/gallery3.jpg",
  "/images/gallery4.jpg",
  "/images/benne-dosa.jpg",
];

/* ---------- Restaurant Info ---------- */
export const RESTAURANT_INFO = {
  name: "Benne n Beans",
  tagline: "Authentic South Indian Flavours in Lucknow",
  phone: "+91 98765 43210",
  email: "hello@bennenbeans.in",
  address: {
    line1: "Sany Palace",
    line2: "Opposite Emerald Mall",
    line3: "Sector K, Ashiyana",
    city: "Lucknow",
  },
  hours: {
    weekday: "8:00 AM – 10:00 PM",
    weekend: "7:30 AM – 10:30 PM",
  },
  socials: {
    instagram: "https://www.instagram.com/bennenbeans?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    facebook: "https://facebook.com/bennenbeans",
    twitter: "https://twitter.com/bennenbeans",
  },
} as const;
