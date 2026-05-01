"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { 
  ShoppingCart, Plus, Minus, Loader2, 
  Trash2, ChevronRight, Package, Utensils, Star,
  CreditCard, Banknote, CheckCircle2, X, Bell, Lock
} from "lucide-react";
import { type OrderMenuItem } from "@/lib/menu";
import { 
  fetchSession, placeOrder, createPayment, fetchMenu, 
  fetchRestaurantStatus, type SessionData, type OrderData, type OrderItemData, type PaymentData,
  type RestaurantStatusData
} from "@/lib/api";
import { useSocket } from "@/lib/socket-client";
import Image from "next/image";

/* ─── Types ────────────────────────────────── */
interface CartItem extends OrderMenuItem {
  quantity: number;
  forPacking?: boolean;
  variant?: string;
  addedBy?: string;
  addedByName?: string;
}

/* ─── Component ────────────────────────────── */
export default function TableOrderClient({ tableId }: { tableId: string }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(true);
  const [error, setError] = useState("");

  // Menu Data
  const [menuItems, setMenuItems] = useState<OrderMenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [restaurantStatus, setRestaurantStatus] = useState<RestaurantStatusData>({ isOpen: true, closingAt: null });
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Cart & Order Flow
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isTakeawayGlobal, setIsTakeawayGlobal] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);
  
  // Multiplayer Cart State
  const [clientId, setClientId] = useState<string>("");
  const [cartLocked, setCartLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [cartUsers, setCartUsers] = useState<{ clientId: string; friendlyName: string }[]>([]);

  // UI States
  const [lang, setLang] = useState<"EN" | "HI">("EN");
  const [toast, setToast] = useState<string | null>(null);

  const dragControls = useDragControls();
  const [variantModal, setVariantModal] = useState<OrderMenuItem | null>(null);
  const [tempVariants, setTempVariants] = useState<{ [key: string]: number }>({});
  const categoryRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Payment
  const [paymentMode, setPaymentMode] = useState<"UPI" | "CASH" | null>(null);
  const [payingUPI, setPayingUPI] = useState(false);
  const [payingCash, setPayingCash] = useState(false);

  // Rating
  const [ratings, setRatings] = useState<{ [itemName: string]: number }>({});
  const [ratedItems, setRatedItems] = useState<Set<string>>(new Set());

  // Socket
  const { socket, joinSession, on, connected } = useSocket();

  /* ─── Client Identity ──────────────────── */
  useEffect(() => {
    let cid = localStorage.getItem("bnb_client_id");
    if (!cid) {
      cid = "user_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("bnb_client_id", cid);
    }
    setClientId(cid);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const status = await fetchRestaurantStatus();
      setRestaurantStatus(status);
    } catch (err) {
      console.error("Failed to load restaurant status:", err);
    }
  }, []);

  /* ─── Load session ─────────────────────── */
  const loadSession = useCallback(async () => {
    try {
      const data = await fetchSession(tableId);
      setSession(data);
      if (data?.status === "CLOSED") {
        setError("This session has been closed. Please ask staff.");
      }
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [tableId, loadStatus]);

  /* ─── Load Menu ────────────────────────── */
  const loadMenuData = useCallback(async () => {
    try {
      const data = await fetchMenu();
      setMenuItems(data.items);
      setCategories(data.categories);
      if (data.categories.length > 0 && !activeCategory) {
        setActiveCategory(data.categories[0]);
      }
    } catch (err) {
      console.error("Failed to load menu:", err);
    } finally {
      setMenuLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    loadMenuData();
  }, [loadMenuData]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!session) {
      loadStatus();
      return;
    }
    joinSession(session.id);
    const unsubs = [
      on("order_placed", () => loadSession()),
      on("order_updated", () => loadSession()),
      on("payment_confirmed", () => loadSession()),
      on("session_updated", () => loadSession()),
      on("menu_updated", () => {
        loadMenuData();
        loadStatus();
      }),
      on("takeaway_ready", (data: any) => {
        showToast(data.message);
        loadSession();
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [session?.id, joinSession, on, loadSession, loadMenuData, loadStatus]);

  // Countdown timer logic
  useEffect(() => {
    if (!restaurantStatus.closingAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const closingDate = new Date(restaurantStatus.closingAt!);
      const now = new Date();
      const diff = closingDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("00:00");
        clearInterval(interval);
        loadStatus();
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [restaurantStatus.closingAt, loadStatus]);

  /* ─── Multiplayer Sync ─────────────────── */
  useEffect(() => {
    if (!clientId || !connected || !socket) return;
    
    socket.emit("join_table", { tableId, clientId });

    const unsubs = [
      on("cart_sync", (sharedCart: any) => {
        setCart(sharedCart.items);
        setCartLocked(sharedCart.isLocked);
        setLockedBy(sharedCart.lockedBy);
        setCartUsers(sharedCart.users);
      }),
      on("cart_toast", (msg: any) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
      })
    ];
    return () => unsubs.forEach(u => u());
  }, [clientId, connected, socket, tableId, on]);

  const syncCart = useCallback((updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCart((prev) => {
      const newCart = typeof updater === "function" ? updater(prev) : updater;
      if (socket && clientId && !cartLocked) {
        socket.emit("cart_update", { tableId, clientId, items: newCart });
      }
      return newCart;
    });
  }, [socket, clientId, tableId, cartLocked]);

  /* ─── Scroll to Category ───────────────── */
  const scrollToCategory = (cat: string) => {
    const el = categoryRefs.current[cat];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Intersection Observer for Scroll Tracking
  useEffect(() => {
    if (categories.length === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        // Get all sections that are at least partially visible
        const visible = entries.filter((e) => e.isIntersecting);
        
        if (visible.length > 0) {
          // Sort items by their top position to find the one closest to the top of the viewport
          const topMost = [...visible].sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          const catId = topMost.target.id;
          
          setActiveCategory((prev) => {
            if (prev === catId) return prev;
            
            // Scroll the category button into view if changed
            const btn = document.getElementById(`cat-btn-${catId}`);
            if (btn) {
              const container = btn.parentElement;
              if (container) {
                const scrollTarget = btn.offsetLeft - (container.offsetWidth / 2) + (btn.offsetWidth / 2);
                container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
              }
            }
            return catId;
          });
        }
      },
      {
        root: document.getElementById('menu-container'),
        // rootMargin matches the header height and some padding to trigger when title hits top area
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0
      }
    );

    categories.forEach((cat) => {
      const el = categoryRefs.current[cat];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories]);

  /* ─── Cart Logic ───────────────────────── */
  const addToCart = (item: OrderMenuItem, variant?: string, qty: number = 1) => {
    if (!restaurantStatus.isOpen && !restaurantStatus.closingAt) {
      return showToast("Restaurant is closed for today!");
    }
    if (cartLocked) return showToast("Cart is locked for checkout!");
    if (item.variants && !variant) {
      setVariantModal(item);
      const initial: { [key: string]: number } = {};
      item.variants.forEach(v => initial[v] = 0);
      setTempVariants(initial);
      return;
    }

    const actualPrice = (variant && item.variantPrices && item.variantPrices[variant]) ? item.variantPrices[variant] : item.price;
    const me = cartUsers.find(u => u.clientId === clientId);

    syncCart((prev) => {
      const packingState = isTakeawayGlobal;
      const existing = prev.find((c) => c.id === item.id && c.forPacking === packingState && c.variant === variant && c.addedBy === clientId);
      if (existing) return prev.map((c) => (c.id === item.id && c.forPacking === packingState && c.variant === variant && c.addedBy === clientId) ? { ...c, quantity: c.quantity + qty } : c);
      return [...prev, { ...item, price: actualPrice, quantity: qty, forPacking: packingState, variant, addedBy: clientId, addedByName: me?.friendlyName || "You" }];
    });
    
    const displayName = item.name === "Soft Drinks" ? `${qty} Soft Drinks` : variant ? `${item.name} (${variant})` : item.name;
    const socketName = item.name === "Soft Drinks" ? `${qty} Soft Drinks` : item.name;
    
    showToast(`Added ${displayName}`);
    if (socket && clientId) socket.emit("cart_notify", { tableId, message: `${me?.friendlyName || "Someone"} added ${socketName}` });
  };

  const handleAddTempVariants = () => {
    if (!variantModal) return;
    Object.entries(tempVariants).forEach(([v, q]) => {
      if (q > 0) addToCart(variantModal, v, q);
    });
    setVariantModal(null);
    setTempVariants({});
  };

  const removeFromCart = (itemId: string, forPacking?: boolean, variant?: string) => {
    if (cartLocked) return showToast("Cart is locked for checkout!");
    syncCart((prev) => {
      const existing = prev.find((c) => c.id === itemId && c.forPacking === forPacking && c.variant === variant && c.addedBy === clientId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        showToast(`Removed ${existing.name}${variant ? ` (${variant})` : ""}`);
        return prev.filter((c) => !(c.id === itemId && c.forPacking === forPacking && c.variant === variant && c.addedBy === clientId));
      }
      return prev.map((c) => (c.id === itemId && c.forPacking === forPacking && c.variant === variant && c.addedBy === clientId) ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const toggleItemPacking = (itemId: string, currentPacking: boolean, variant?: string) => {
    if (cartLocked) return showToast("Cart is locked for checkout!");
    syncCart((prev) => {
      const idx = prev.findIndex(c => c.id === itemId && c.forPacking === currentPacking && c.variant === variant && c.addedBy === clientId);
      if (idx === -1) return prev;
      
      const newCart = [...prev];
      const item = { ...newCart[idx], forPacking: !currentPacking };
      
      const targetIdx = prev.findIndex(c => c.id === itemId && c.forPacking === !currentPacking && c.variant === variant && c.addedBy === clientId);
      if (targetIdx !== -1) {
        newCart[targetIdx].quantity += item.quantity;
        newCart.splice(idx, 1);
      } else {
        newCart[idx] = item;
      }
      return newCart;
    });
  };

  const deleteFromCart = (itemId: string, forPacking?: boolean, variant?: string) => {
    if (cartLocked) return showToast("Cart is locked for checkout!");
    syncCart((prev) => {
      const existing = prev.find((c) => c.id === itemId && c.forPacking === forPacking && c.variant === variant && c.addedBy === clientId);
      if (existing) showToast(`Removed ${existing.name}${variant ? ` (${variant})` : ""}`);
      return prev.filter((c) => !(c.id === itemId && c.forPacking === forPacking && c.variant === variant && c.addedBy === clientId));
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleGlobalTakeawayToggle = (isTakeaway: boolean) => {
    setIsTakeawayGlobal(isTakeaway);
    if (cartLocked) return;
    syncCart((prev) => prev.map(c => ({ ...c, forPacking: isTakeaway })));
    if (socket && clientId) socket.emit("cart_notify", { tableId, message: `Switched order to ${isTakeaway ? 'Takeaway' : 'Dine-In'}` });
  };

  /* ─── Packing Charges Logic ────────────── */
  const packingCharges = useMemo(() => {
    let dosaCount = 0;
    let idliUttapamCount = 0;

    cart.filter(c => c.forPacking).forEach(c => {
      if (c.category === "Benne Bliss" || c.category === "Classic Dosas") dosaCount += c.quantity;
      if (c.category === "Idli" || c.category === "Uttapam") idliUttapamCount += c.quantity;
    });

    const dosaCharge = Math.ceil(dosaCount / 2) * 20;
    const idliUttapamCharge = Math.ceil(idliUttapamCount / 2) * 10;
    
    return dosaCharge + idliUttapamCharge;
  }, [cart]);

  const cartSubtotal = useMemo(() => cart.reduce((sum, c) => sum + (c.price || 0) * c.quantity, 0), [cart]);
  const cartTotal = cartSubtotal + packingCharges;
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  /* ─── Order Action ─────────────────────── */
  const handlePlaceOrder = async () => {
    if (!restaurantStatus.isOpen && !restaurantStatus.closingAt) {
      return showToast("Restaurant is closed for today!");
    }
    if (cart.length === 0) return;
    if (cartLocked && lockedBy !== clientId) return showToast("Someone else is placing the order!");
    setOrdering(true);
    if (socket && clientId) socket.emit("cart_lock", { tableId, clientId });
    
    try {
      const itemsToKitchen = cart.map((c) => ({ 
        name: `${c.name}${c.variant ? ` (${c.variant})` : ""}${c.forPacking ? " (To-Go)" : ""}`, 
        price: c.price, 
        quantity: c.quantity 
      }));

      if (packingCharges > 0) {
        itemsToKitchen.push({ name: "Packing Charges", price: packingCharges, quantity: 1 });
      }

      // Pass sessionId if it exists, otherwise pass tableId so backend can create it
      await placeOrder(session?.id || "", itemsToKitchen, isTakeawayGlobal, tableId);
      
      // Order success, cart is cleared by backend, unlock it
      if (socket) socket.emit("cart_unlock", { tableId });
      
      syncCart([]);
      setOrderPlaced(true);
      setShowCartMobile(false);
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
      if (socket) socket.emit("cart_unlock", { tableId });
    } finally {
      setOrdering(false);
    }
  };

  /* ─── Payment Actions ──────────────────── */
  const sessionTotal = session?.orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0
  ) || 0;
  const paidTotal = session?.payments
    .filter((p) => p.status === "CONFIRMED")
    .reduce((s, p) => s + p.amount, 0) || 0;
  const remaining = sessionTotal - paidTotal;

  const handleUPIPayment = async () => {
    if (!session || remaining <= 0) return;
    setPayingUPI(true);
    try {
      await createPayment(session.id, "UPI", remaining);
      setPaymentMode(null);
      await loadSession();
    } catch (err) {
      setError("Payment failed");
    } finally {
      setPayingUPI(false);
    }
  };

  const handleCashPayment = async () => {
    if (!session || remaining <= 0 || payingCash) return;
    setPayingCash(true);
    try {
      await createPayment(session.id, "CASH", remaining);
      setPaymentMode(null);
      await loadSession();
    } catch (err) {
      setError("Failed to record cash");
    } finally {
      setPayingCash(false);
    }
  };

  const handleCloseTable = async () => {
    if (!session) return;
    if (remaining > 0) {
      return showToast("Please settle the payment first!");
    }
    try {
      // For now, we signal admin. In a real system, this would call a PATCH /session/:id/close
      showToast("Requesting table closure...");
      if (socket) socket.emit("table_close_request", { tableId, sessionId: session.id });
    } catch (err) {
      showToast("Failed to close table");
    }
  };

  const handleRateItem = async (itemName: string, rating: number) => {
    try {
      const { submitRating } = await import("@/lib/api");
      // Find the menu item ID by name (simplified for this context)
      const menuItem = menuItems.find(m => m.name === itemName);
      if (menuItem) {
        await submitRating(menuItem.id, rating);
      }
      setRatings(prev => ({ ...prev, [itemName]: rating }));
      setRatedItems(prev => new Set(prev).add(itemName));
      showToast("Thank you for your rating!");
    } catch (err) {
      showToast("Failed to submit rating");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]">
        <Loader2 className="animate-spin text-[#E76F51]" size={40} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F9F7F4] flex flex-col overflow-hidden relative">
      {/* CLOSED OVERLAY */}
      {!restaurantStatus.isOpen && !session && (
        <div className="absolute inset-0 z-[100] bg-[#3A241C] flex items-center justify-center p-6 text-center">
          <div className="max-w-md">
            <div className="w-20 h-20 bg-[#E76F51] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3">
              <Lock size={40} className="text-white" />
            </div>
            <h1 className="font-[var(--font-playfair)] text-4xl lg:text-5xl font-bold text-white mb-6">We're Closed</h1>
            <p className="text-white/60 text-lg mb-10 leading-relaxed font-light">
              Our kitchen has closed for the day. We serve from <span className="text-[#E76F51] font-bold underline underline-offset-4 decoration-2">4 PM onwards</span>. Please visit us again tomorrow!
            </p>
            <div className="h-[1px] w-20 bg-white/20 mx-auto" />
          </div>
        </div>
      )}

      {/* FULL WIDTH HEADER */}
      <header className="flex-shrink-0 z-40 bg-[#3A241C] text-white px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between shadow-xl w-full">
        <div className="flex items-center gap-4 lg:gap-8">
          {session && session.orders.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleCloseTable}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] transition-all ${remaining <= 0 ? "bg-[#6A994E] text-white shadow-lg shadow-[#6A994E]/20" : "bg-white/5 text-white/30 border border-white/10"}`}
            >
              <X size={14} /> Close Table
            </motion.button>
          )}
          <div className="flex items-center gap-3 lg:gap-6">
            <span className="px-4 lg:px-6 py-1.5 lg:py-2 bg-[#E76F51] rounded-2xl lg:rounded-full text-[10px] lg:text-[12px] font-black uppercase tracking-[0.2em] shadow-lg">Table {tableId.replace(/^t/i, '')}</span>
            {timeLeft && (
              <div className="flex items-center gap-2 bg-[#B71C1C] px-3 py-1 rounded-lg animate-pulse shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">Closes in {timeLeft}</span>
              </div>
            )}
            {!connected && (
              <div className="flex items-center gap-2 lg:gap-2.5">
                <span className="w-2 lg:w-2.5 h-2 lg:h-2.5 rounded-full animate-pulse bg-orange-400" />
                <span className="text-[8px] lg:text-[10px] font-black text-white/50 uppercase tracking-[0.2em] whitespace-nowrap">Reconnecting</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center bg-[#2A1A14] rounded-full p-1 gap-1 border border-white/10 shadow-inner">
          <button 
            onClick={() => handleGlobalTakeawayToggle(false)}
            className={`flex items-center gap-1.5 lg:gap-2.5 px-4 lg:px-6 py-2 lg:py-2.5 rounded-full text-[8px] lg:text-[10px] font-black uppercase tracking-widest transition-all ${!isTakeawayGlobal ? "bg-[#E76F51] text-white shadow-lg" : "text-white/40 hover:text-white"}`}
          >
            <Utensils size={12} className="lg:w-[14px] lg:h-[14px]" /> Dine-in
          </button>
          <button 
            onClick={() => handleGlobalTakeawayToggle(true)}
            className={`flex items-center gap-1.5 lg:gap-2.5 px-4 lg:px-6 py-2 lg:py-2.5 rounded-full text-[8px] lg:text-[10px] font-black uppercase tracking-widest transition-all ${isTakeawayGlobal ? "bg-[#E76F51] text-white shadow-lg" : "text-white/40 hover:text-white"}`}
          >
            <Package size={12} className="lg:w-[14px] lg:h-[14px]" /> Takeaway
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT: Menu Section */}
        <main 
          id="menu-container"
          className="flex-1 relative border-r border-[#3A241C]/5 overflow-y-auto w-full scroll-smooth transform-gpu translate-z-0"
        >
          {/* Category Quick Links */}
          <div className="sticky top-0 z-50 bg-[#F9F7F4]/95 backdrop-blur-md px-4 lg:px-8 py-3 lg:py-4 flex gap-2 lg:gap-4 overflow-x-auto scrollbar-hide border-b border-[#3A241C]/5">
            {categories.map(cat => (
              <button
                key={cat}
                id={`cat-btn-${cat}`}
                onClick={() => scrollToCategory(cat)}
                className={`px-4 lg:px-6 py-2.5 lg:py-3 rounded-2xl text-[8px] lg:text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm transition-all whitespace-nowrap ${activeCategory === cat ? "bg-[#3A241C] text-white border-[#3A241C]" : "bg-white text-[#3A241C]/40 hover:bg-[#3A241C] hover:text-white border-[#3A241C]/5"}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Sections (Stacked) */}
          <div className="p-4 lg:p-8 pb-32 lg:pb-16 space-y-12 lg:y-20">
            {categories.map((cat, idx) => (
              <section 
                key={cat} 
                id={cat}
                ref={(el) => { categoryRefs.current[cat] = el; }}
                className="scroll-mt-24 lg:scroll-mt-28"
              >
                <div className="flex items-center gap-4 lg:gap-6 mb-8 lg:mb-10">
                  <h2 className="font-[var(--font-playfair)] text-2xl lg:text-4xl font-black text-[#3A241C] tracking-tight">{cat}</h2>
                  <div className="h-[2px] flex-1 bg-gradient-to-r from-[#3A241C]/10 to-transparent rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  {menuItems.filter(m => m.category === cat).map(item => {
                    const discountedPrice = item.discountPct 
                      ? Math.round(item.price * (1 - item.discountPct / 100))
                      : item.discountFlat 
                        ? item.price - item.discountFlat
                        : item.price;
                    const hasDiscount = item.discountPct || item.discountFlat;

                    const isDisabled = item.outOfStock || (!restaurantStatus.isOpen && !restaurantStatus.closingAt);

                    return (
                      <div 
                        key={item.id}
                        className={`bg-white rounded-[2rem] p-4 lg:p-5 shadow-sm border border-[#3A241C]/5 flex gap-4 group transition-all duration-300 relative overflow-hidden h-[140px] lg:h-[164px] ${isDisabled ? "grayscale opacity-60 pointer-events-none" : "hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"}`}
                      >
                        {item.outOfStock && (
                          <div className="absolute inset-0 z-20 bg-[#3A241C]/20 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="bg-[#3A241C] text-white px-4 py-2 rounded-full font-black text-[10px] lg:text-[12px] uppercase tracking-[0.2em] shadow-2xl">Out of Stock</span>
                          </div>
                        )}

                        {!restaurantStatus.isOpen && !restaurantStatus.closingAt && !item.outOfStock && (
                            <div className="absolute inset-0 z-20 bg-[#3A241C]/40 backdrop-blur-[2px] flex items-center justify-center">
                              <span className="bg-[#B71C1C] text-white px-4 py-2 rounded-full font-black text-[10px] lg:text-[12px] uppercase tracking-[0.2em] shadow-2xl">Kitchen Closed</span>
                            </div>
                        )}

                        {/* Image Box */}
                        <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-2xl bg-[#F9F7F4] flex-shrink-0 overflow-hidden relative border border-[#3A241C]/5">
                          {hasDiscount && !item.outOfStock && (
                            <div className="absolute top-2 left-2 z-10 bg-[#6A994E] text-white px-2 py-0.5 rounded-lg font-black text-[8px] lg:text-[10px] uppercase tracking-widest shadow-lg">
                              {item.discountPct ? `${item.discountPct}% OFF` : `₹${item.discountFlat} OFF`}
                            </div>
                          )}
                          {item.image && (
                            <Image src={item.image} alt={item.name} fill className="object-cover opacity-0 transition-opacity duration-300" onLoadingComplete={(img) => img.classList.remove('opacity-0')} />
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <h3 className="font-black text-[#3A241C] text-sm lg:text-base group-hover:text-[#E76F51] transition-colors tracking-tight line-clamp-2 pr-2 leading-tight">{item.name}</h3>
                              <button 
                                onClick={() => setLang(l => l === "EN" ? "HI" : "EN")}
                                className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-[#E76F51] bg-[#E76F51]/10 px-2 lg:px-3 py-1 rounded-md lg:rounded-lg hover:bg-[#E76F51]/20 transition-all active:scale-95 flex-shrink-0"
                              >
                                {lang === "EN" ? "अ" : "A"}
                              </button>
                            </div>
                            {(item.descriptionEn || item.descriptionHi) && (
                              <p className="text-[10px] lg:text-[11px] text-[#3A241C]/50 leading-[1.5] mb-1 font-medium tracking-[0.02em] antialiased line-clamp-2">
                                {lang === "EN" ? item.descriptionEn : item.descriptionHi}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-auto pt-1">
                            <div className="flex items-center gap-2">
                              {hasDiscount && (
                                <span className="text-[10px] lg:text-xs text-[#3A241C]/30 line-through font-bold">₹{item.price}</span>
                              )}
                              <span className="font-black text-lg text-[#E76F51] tracking-tighter">
                                {item.priceLabel ? item.priceLabel : `₹${discountedPrice}`}
                              </span>
                              {item.rating && (
                                <div className="flex items-center gap-1 bg-[#F9F7F4] px-1.5 py-0.5 rounded-md border border-[#3A241C]/5 ml-2">
                                  <Star className="w-[10px] h-[10px] lg:w-3 lg:h-3 fill-[#E76F51] text-[#E76F51]" />
                                  <span className="text-[9px] lg:text-[10px] font-black text-[#3A241C]/80">{item.rating}</span>
                                </div>
                              )}
                            </div>
                            <motion.button 
                              whileTap={!item.outOfStock ? { scale: 0.8 } : {}}
                              onClick={() => !item.outOfStock && addToCart({ ...item, price: discountedPrice })}
                              disabled={item.outOfStock}
                              className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center transition-all shadow-inner border border-[#3A241C]/5 ${item.outOfStock ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-[#F9F7F4] text-[#3A241C] hover:bg-[#E76F51] hover:text-white"}`}
                            >
                              <Plus size={16} className="lg:w-5 lg:h-5" />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </main>

        {/* RIGHT: Cart Sticky (Desktop) */}
        <aside className="hidden lg:flex w-[550px] p-8 flex-col h-full pr-12 relative">
          <div className="absolute top-1/2 right-20 w-72 h-72 bg-[#E76F51]/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2" />
          <div className="flex-1 bg-white/90 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_30px_100px_-20px_rgba(58,36,28,0.1)] border border-white/60 overflow-hidden flex flex-col ml-4 relative z-10 min-h-0">
            <CartContent 
              cart={cart} 
              cartSubtotal={cartSubtotal}
              cartTotal={cartTotal}
              packingCharges={packingCharges}
              session={session}
              ordering={ordering}
              orderPlaced={orderPlaced}
              setOrderPlaced={setOrderPlaced}
              onPlaceOrder={handlePlaceOrder}
              onRemove={removeFromCart}
              onAdd={addToCart}
              onDelete={deleteFromCart}
              onTogglePacking={toggleItemPacking}
              sessionTotal={sessionTotal}
              paidTotal={paidTotal}
              remaining={remaining}
              paymentMode={paymentMode}
              setPaymentMode={setPaymentMode}
              handleUPIPayment={handleUPIPayment}
              handleCashPayment={handleCashPayment}
              payingUPI={payingUPI}
              payingCash={payingCash}
              clientId={clientId}
              cartLocked={cartLocked}
              lockedBy={lockedBy}
              handleRateItem={handleRateItem}
              ratings={ratings}
              ratedItems={ratedItems}
            />
          </div>
        </aside>

        {/* Variant Modal (Soft Drinks) */}
        <AnimatePresence>
          {variantModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setVariantModal(null)} className="absolute inset-0 bg-[#3A241C]/80 backdrop-blur-xl" />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white rounded-[2.5rem] lg:rounded-[3.5rem] w-full max-w-sm p-8 lg:p-10 shadow-2xl overflow-hidden"
              >
                <div className="mb-6 lg:mb-8">
                  <h3 className="font-black text-[#3A241C] text-xl lg:text-2xl tracking-tighter mb-1">Select Flavors</h3>
                  <p className="text-[9px] lg:text-[10px] font-bold text-[#3A241C]/30 uppercase tracking-widest">Multiple selections allowed</p>
                </div>
                
                <div className="space-y-3 lg:space-y-4 mb-8 lg:mb-10">
                  {variantModal.variants?.map(v => (
                    <div key={v} className="flex items-center justify-between p-4 lg:p-5 bg-[#F9F7F4] rounded-2xl border border-[#3A241C]/5">
                      <span className="font-black text-[10px] lg:text-xs uppercase tracking-widest text-[#3A241C]">
                        {v} <span className="text-[#E76F51] ml-1 opacity-80">₹{variantModal.variantPrices?.[v] || variantModal.price}</span>
                      </span>
                      <div className="flex items-center gap-3 lg:gap-4">
                        <button 
                          onClick={() => setTempVariants(prev => ({ ...prev, [v]: Math.max(0, prev[v] - 1) }))}
                          className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white text-[#3A241C]/20 hover:text-[#E76F51] flex items-center justify-center transition-all shadow-sm"
                        >
                          <Minus size={12} className="lg:w-[14px]" />
                        </button>
                        <span className="w-4 text-center font-black text-sm">{tempVariants[v] || 0}</span>
                        <button 
                          onClick={() => setTempVariants(prev => ({ ...prev, [v]: (prev[v] || 0) + 1 }))}
                          className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white text-[#3A241C]/20 hover:text-[#E76F51] flex items-center justify-center transition-all shadow-sm"
                        >
                          <Plus size={12} className="lg:w-[14px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 lg:gap-4">
                  <button 
                    onClick={handleAddTempVariants}
                    disabled={Object.values(tempVariants).reduce((a, b) => a + b, 0) === 0}
                    className="w-full py-4 lg:py-5 bg-[#E76F51] text-white rounded-2xl font-black text-[9px] lg:text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-[#E76F51]/30 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                  >
                    Add to Cart
                  </button>
                  <button onClick={() => setVariantModal(null)} className="py-2 text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-[#3A241C]/20 hover:text-[#3A241C] transition-all">Cancel</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MOBILE: Bottom Cart Drawer */}
        <AnimatePresence>
          {cart.length > 0 && !orderPlaced && (
            <motion.div 
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="lg:hidden fixed bottom-6 left-6 right-6 z-[40]"
            >
              <button 
                onClick={() => setShowCartMobile(true)}
                className="w-full h-16 bg-[#3A241C] text-white rounded-[2.5rem] flex items-center justify-between px-8 shadow-2xl border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#E76F51] flex items-center justify-center text-[11px] font-black">{cartCount}</div>
                  <span className="font-black text-[11px] uppercase tracking-widest">Cart Items</span>
                </div>
                <span className="font-black text-sm tracking-tight">₹{cartTotal}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCartMobile && (
            <motion.div 
              key="cart-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowCartMobile(false)} 
              className="lg:hidden fixed inset-0 z-[60] bg-[#3A241C]/40 backdrop-blur-sm" 
            />
          )}
          {showCartMobile && (
            <motion.div 
              key="cart-drawer"
              drag="y" 
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }} 
              dragElastic={{ top: 0, bottom: 0.15 }} 
              onDragEnd={(e, info) => { if (info.offset.y > 100 || info.velocity.y > 500) setShowCartMobile(false) }}
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 35, stiffness: 350, mass: 0.8 }} 
              className="lg:hidden fixed bottom-0 left-0 right-0 z-[61] bg-white border-t border-[#3A241C]/5 rounded-t-[2.5rem] h-[92vh] flex flex-col shadow-[0_-20px_40px_rgba(0,0,0,0.1)] will-change-transform"
            >
              <div 
                onPointerDown={(e) => dragControls.start(e)}
                className="flex justify-center py-5 cursor-grab active:cursor-grabbing touch-none z-20 flex-shrink-0"
              >
                <div className="w-12 h-1.5 bg-[#3A241C]/10 rounded-full" />
              </div>
              <div className="flex-1 relative flex flex-col min-h-0">
                <CartContent 
                  cart={cart} 
                  cartSubtotal={cartSubtotal}
                  cartTotal={cartTotal}
                  packingCharges={packingCharges}
                  session={session}
                  ordering={ordering}
                  orderPlaced={orderPlaced}
                  setOrderPlaced={setOrderPlaced}
                  onPlaceOrder={handlePlaceOrder}
                  onRemove={removeFromCart}
                  onAdd={addToCart}
                  onDelete={deleteFromCart}
                  onTogglePacking={toggleItemPacking}
                  remaining={remaining}
                  paymentMode={paymentMode}
                  setPaymentMode={setPaymentMode}
                  handleUPIPayment={handleUPIPayment}
                  handleCashPayment={handleCashPayment}
                  payingUPI={payingUPI}
                  payingCash={payingCash}
                  clientId={clientId}
                  cartLocked={cartLocked}
                  lockedBy={lockedBy}
                  handleRateItem={handleRateItem}
                  ratings={ratings}
                  ratedItems={ratedItems}
                />
                {/* Floating Continue Browsing */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none flex justify-center z-50">
                  <button onClick={() => setShowCartMobile(false)} className="pointer-events-auto w-full py-4 bg-white text-[#3A241C] border-2 border-[#3A241C] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                    Continue Browsing
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOAST */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 lg:bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-[#3A241C] text-white px-6 lg:px-8 py-3 lg:py-4 rounded-2xl lg:rounded-[2rem] shadow-2xl font-black text-[10px] lg:text-[11px] uppercase tracking-widest border border-white/5 antialiased"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Cart Content Partial ────────────────── */
function CartContent({ 
  cart, cartSubtotal, cartTotal, packingCharges, session, 
  ordering, orderPlaced, setOrderPlaced, onPlaceOrder, onRemove, onAdd, onDelete, onTogglePacking,
  sessionTotal, paidTotal, remaining, paymentMode, setPaymentMode, handleUPIPayment, handleCashPayment, payingUPI, payingCash,
  clientId, cartLocked, lockedBy, handleRateItem, ratings, ratedItems
}: any) {
  const cartCount = cart.reduce((sum: number, c: CartItem) => sum + c.quantity, 0);

  const groupedCart = cart.reduce((acc: any, item: CartItem) => {
    const key = item.addedBy || 'unknown';
    const name = item.addedByName || 'Someone';
    if (!acc[key]) acc[key] = { name, isMe: key === clientId, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  const groupedCartArray = Object.values(groupedCart).sort((a: any, b: any) => {
    if (a.isMe) return -1;
    if (b.isMe) return 1;
    return 0;
  });

  if (orderPlaced) {
    const allOrderedItems = (session?.orders ?? []).flatMap((o: OrderData) => o.items)
      .filter((i: OrderItemData) => !i.name.toLowerCase().includes("packing charges"));
    
    const preparingItems = allOrderedItems.filter((i: OrderItemData) => !i.isServed);
    const servedItems = allOrderedItems.filter((i: OrderItemData) => i.isServed);
    
    const ratingEligibleItems = allOrderedItems.filter((i: OrderItemData) => !i.name.toLowerCase().includes("soft drink"));
    const hasPendingPayment = (session?.payments ?? []).some((p: PaymentData) => p.status === "PENDING" || p.status === "UNPAID");

    return (
      <div className="p-8 lg:p-10 flex flex-col items-center text-center h-full overflow-y-auto scrollbar-hide">
        {/* Banners Area */}
        <div className="w-full space-y-3 mb-6">
          {session?.paymentReminder && remaining > 0 && (
            <motion.div 
              initial={{ y: -10, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="w-full bg-[#B71C1C] text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg border border-white/10"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
                <Bell size={20} className="animate-bounce" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-left flex-1">Please settle your bill at the counter or via UPI!</p>
            </motion.div>
          )}

          {(() => {
            const hasReadyTakeaway = (session?.orders ?? []).some((o: any) => 
              o.items.some((i: any) => i.name.toLowerCase().includes("(to-go)") && i.isServed)
            );
            if (!hasReadyTakeaway) return null;
            return (
              <motion.div 
                initial={{ y: -10, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                className="w-full bg-[#6A994E] text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg border border-white/10"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
                  <Package size={20} className="animate-bounce" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">Takeaway Ready!</p>
                  <p className="text-[9px] font-bold text-white/60 leading-tight">Your packed items are ready at the counter.</p>
                </div>
              </motion.div>
            );
          })()}
        </div>

        <div className="w-16 lg:w-20 h-16 lg:h-20 rounded-full bg-[#6A994E]/10 flex items-center justify-center text-[#6A994E] mb-4 border border-[#6A994E]/10"><CheckCircle2 size={32} className="lg:w-10 lg:h-10" /></div>
        <h2 className="font-black text-[#3A241C] text-2xl lg:text-3xl mb-1 tracking-tighter uppercase">Ordered!</h2>
        
        <button 
          onClick={() => setOrderPlaced(false)} 
          className="mt-4 px-8 py-3 bg-[#3A241C] text-white rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] flex items-center gap-2 group transition-all hover:bg-[#E76F51] shadow-xl shadow-[#3A241C]/10"
        >
          <Plus size={14} className="group-hover:rotate-180 transition-transform duration-500" />
          Add More Items
        </button>
        
        {/* Payment Summary Box (Moved Up) */}
        {remaining > 0 ? (
          <div className="w-full space-y-4 lg:space-y-6 mt-6 mb-10">
            <div className="bg-[#F9F7F4] rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-8 shadow-inner border-2 border-[#E76F51]/20">
              <span className="text-[9px] lg:text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.4em]">Pending Bill</span>
              <p className="text-3xl lg:text-4xl font-black text-[#3A241C] mt-2 tracking-tighter">₹ {remaining}</p>
            </div>
            
            {hasPendingPayment ? (
              <div className="bg-[#F9F7F4] rounded-[2rem] p-8 border-2 border-dashed border-[#3A241C]/10 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-[#3A241C]/20" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40">Waiting for admin confirmation...</p>
                <p className="text-[8px] font-bold text-[#3A241C]/20 uppercase">Admin will confirm your {session?.payments[0]?.method} payment shortly</p>
              </div>
            ) : !paymentMode ? (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  disabled={payingUPI || payingCash}
                  onClick={() => setPaymentMode("UPI")} 
                  className="py-4 bg-[#3A241C] text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-[#3A241C]/20 active:scale-95 transition-all"
                >
                  <CreditCard size={14} /> Pay UPI
                </button>
                <button 
                  disabled={payingUPI || payingCash}
                  onClick={handleCashPayment} 
                  className="py-4 border-2 border-[#3A241C] text-[#3A241C] rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {payingCash ? <Loader2 className="animate-spin" size={14} /> : <Banknote size={14} />} Pay Cash
                </button>
              </div>
            ) : paymentMode === "UPI" ? (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] p-6 border-2 border-[#E76F51] shadow-2xl">
                <div className="relative w-40 h-40 mx-auto mb-4 border-2 border-[#F9F7F4] p-2 rounded-2xl overflow-hidden bg-[#F9F7F4]"><Image src="/images/qr/payment_qr.jpeg" alt="QR" fill className="object-contain" /></div>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#3A241C]/30 mb-6">Scan to pay directly</p>
                <button onClick={handleUPIPayment} disabled={payingUPI} className="w-full py-4 bg-[#6A994E] text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#6A994E]/20">
                  {payingUPI ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} I Have Paid
                </button>
              </motion.div>
            ) : null}
          </div>
        ) : (
          <div className="p-6 bg-[#6A994E]/10 rounded-2xl w-full text-[#6A994E] font-black text-[10px] uppercase tracking-[0.4em] border border-[#6A994E]/10 mt-6 mb-10">
            Transaction Settled
          </div>
        )}

        {/* Live Status Tracking (Separated) */}
        <div className="w-full space-y-6 mb-10">
          {(preparingItems.length > 0 || servedItems.length > 0) && (
            <div className="bg-[#F9F7F4] rounded-[2rem] p-6 border border-[#3A241C]/5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#3A241C]/40 mb-4 text-left">Live Status</p>
              
              {preparingItems.length > 0 && (
                <div className="space-y-3 mb-6">
                   <p className="text-[8px] font-black text-[#F4A261] uppercase tracking-[0.1em] text-left ml-1">Preparing</p>
                   {preparingItems.map((item: OrderItemData, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#3A241C]/5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#F4A261] animate-pulse" />
                        <span className="text-xs font-bold text-[#3A241C]">{item.name}</span>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#F4A261]/10 text-[#F4A261]">
                        Preparing
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {servedItems.length > 0 && (
                <div className="space-y-3">
                   <p className="text-[8px] font-black text-[#6A994E] uppercase tracking-[0.1em] text-left ml-1">Served / Ready</p>
                   {servedItems.map((item: OrderItemData, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#3A241C]/5 shadow-sm opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#6A994E]" />
                        <span className="text-xs font-bold text-[#3A241C]">{item.name}</span>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#6A994E]/10 text-[#6A994E]">
                        {item.name.toLowerCase().includes("(to-go)") ? "Ready" : "Served"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rating Section */}
        {ratingEligibleItems.length > 0 && (
          <div className="w-full mb-10 text-left">
            <h3 className="font-black text-[#3A241C] text-lg tracking-tight mb-1">Rate Your Experience</h3>
            <p className="text-[10px] font-bold text-[#3A241C]/40 uppercase tracking-widest mb-6 leading-relaxed">Please rate the quality once u have eaten</p>
            <div className="space-y-4">
              {ratingEligibleItems.map((item: OrderItemData, idx: number) => {
                const isRated = ratedItems.has(item.name);
                const currentRating = ratings[item.name] || 0;

                return (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-[#3A241C]/5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-[#3A241C] text-sm">{item.name}</span>
                      {isRated && <span className="text-[9px] font-black text-[#6A994E] uppercase tracking-widest bg-[#6A994E]/10 px-2 py-0.5 rounded-md">Thanks!</span>}
                    </div>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <div key={star} className="relative group">
                          <motion.div className="flex">
                            {/* Half Star Left */}
                            <button
                              disabled={isRated}
                              onClick={() => handleRateItem(item.name, star - 0.5)}
                              className="w-5 h-10 flex items-center justify-end overflow-hidden"
                            >
                              <Star 
                                size={22} 
                                className={`flex-shrink-0 -mr-[11px] ${currentRating >= star - 0.5 ? "fill-[#E76F51] text-[#E76F51]" : "text-[#3A241C]/10"}`}
                                style={{ clipPath: 'inset(0 50% 0 0)' }}
                              />
                            </button>
                            {/* Half Star Right */}
                            <button
                              disabled={isRated}
                              onClick={() => handleRateItem(item.name, star)}
                              className="w-5 h-10 flex items-center justify-start overflow-hidden"
                            >
                              <Star 
                                size={22} 
                                className={`flex-shrink-0 -ml-[11px] ${currentRating >= star ? "fill-[#E76F51] text-[#E76F51]" : "text-[#3A241C]/10"}`}
                                style={{ clipPath: 'inset(0 0 0 50%)' }}
                              />
                            </button>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="h-20 flex-shrink-0" /> {/* Bottom Spacer */}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* HEADER SECTION - Fixed at top */}
      <div className="px-6 lg:px-10 pt-6 lg:pt-8 flex-shrink-0">
        <div className="flex items-center justify-between bg-[#F9F7F4]/60 p-4 lg:p-5 rounded-[2rem] border border-[#3A241C]/5 backdrop-blur-md">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#E76F51]/10 flex items-center justify-center border border-[#E76F51]/20">
              <ShoppingCart size={18} className="text-[#E76F51] lg:w-5 lg:h-5" />
            </div>
            <h2 className="font-black text-[#3A241C] text-xl lg:text-2xl tracking-tighter">Your Basket</h2>
          </div>
          {cartCount > 0 ? (
            <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[10px] lg:text-[11px] font-black bg-[#E76F51] text-white px-4 lg:px-5 py-2 lg:py-2.5 rounded-full uppercase tracking-widest shadow-lg shadow-[#E76F51]/30">{cartCount} Items</motion.span>
          ) : (
            <span className="text-[10px] lg:text-[11px] font-black bg-[#3A241C]/5 text-[#3A241C]/40 px-4 lg:px-5 py-2 lg:py-2.5 rounded-full uppercase tracking-widest">Empty</span>
          )}
        </div>
      </div>

      {/* SCROLLABLE AREA - Everything else scrolls */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 touch-auto px-6 lg:px-10 pt-4 pb-20 lg:pb-10">

        {/* Banners Area */}
        <div className="w-full space-y-3 mb-6">
          {/* 1. Payment Reminder (Priority 1) */}
          {session?.paymentReminder && remaining > 0 && (
            <motion.div 
              initial={{ y: -10, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="w-full bg-[#B71C1C] text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg border border-white/10"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
                <Bell size={20} className="animate-bounce" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-left flex-1">Please settle your bill at the counter or via UPI!</p>
            </motion.div>
          )}

          {/* 2. Takeaway Ready (Priority 2) */}
          {(() => {
            const takeawayItems = (session?.orders ?? []).flatMap((o: any) => 
              o.items.filter((i: any) => i.name.toLowerCase().includes("(to-go)"))
            );
            
            if (takeawayItems.length === 0) return null;

            const totalCount = takeawayItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
            const readyCount = takeawayItems
              .filter((i: any) => i.isServed)
              .reduce((acc: number, item: any) => acc + item.quantity, 0);

            if (readyCount === 0) return null;

            const isAllReady = readyCount >= totalCount;

            return (
              <motion.div 
                initial={{ y: -10, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                className={`w-full ${isAllReady ? 'bg-[#6A994E]' : 'bg-[#F4A261]'} text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg border border-white/10 transition-colors duration-500`}
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
                  <Package size={20} className={isAllReady ? "animate-bounce" : "animate-pulse"} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">
                    {isAllReady ? 'Takeaway Ready!' : 'Packing in Progress...'}
                  </p>
                  <p className="text-[9px] font-bold text-white/80 leading-tight">
                    {isAllReady 
                      ? 'Your takeaway order is packed and ready at the counter.' 
                      : `${readyCount} out of ${totalCount} items are packed. Please wait.`}
                  </p>
                </div>
              </motion.div>
            );
          })()}
        </div>

        {/* Bill Summary - 3 Column Row */}
        {session && session.orders.length > 0 && (
          <div className="w-full px-6 lg:px-10 mb-8 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#3A241C]/5 flex flex-col justify-center">
                <p className="text-[7px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mb-1.5">Total Bill</p>
                <p className="text-sm lg:text-base font-black text-[#3A241C]">₹{sessionTotal}</p>
              </div>
              <div className="bg-[#6A994E]/5 p-4 rounded-2xl border border-[#6A994E]/10 flex flex-col justify-center">
                <p className="text-[7px] font-black text-[#6A994E]/40 uppercase tracking-[0.2em] mb-1.5">Paid</p>
                <p className="text-sm lg:text-base font-black text-[#6A994E]">₹{paidTotal}</p>
              </div>
              <div 
                onClick={() => remaining > 0 && setOrderPlaced(true)}
                className={`bg-[#E76F51]/5 p-4 rounded-2xl border border-[#E76F51]/10 flex flex-col justify-center ring-2 ring-[#E76F51]/5 transition-all active:scale-95 ${remaining > 0 ? 'cursor-pointer hover:bg-[#E76F51]/10' : ''}`}
              >
                <p className="text-[7px] font-black text-[#E76F51] uppercase tracking-[0.2em] mb-1.5">Balance</p>
                <p className="text-sm lg:text-base font-black text-[#3A241C]">₹{remaining}</p>
              </div>
            </div>
            {remaining > 0 && (
              <p className="text-[8px] font-black text-[#3A241C]/60 uppercase tracking-[0.3em] text-center">Click on balance to get QR for payment</p>
            )}
          </div>
        )}

        {/* BASKET ITEMS */}
        <div className="flex-1">
          {cart.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="py-12 flex flex-col items-center justify-center text-[#3A241C]/30 h-full relative"
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 bg-[#E76F51]/5 rounded-full blur-[60px]"></div>
              </div>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="relative z-10"
              >
                <div className="w-24 h-24 rounded-full bg-[#F9F7F4] flex items-center justify-center mb-6 shadow-inner border border-[#3A241C]/5">
                  <ShoppingCart size={40} className="text-[#3A241C]/20" />
                </div>
              </motion.div>
              <h3 className="font-black text-lg text-[#3A241C]/40 tracking-tight mb-2 relative z-10">Basket is Empty</h3>
              <p className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.3em] text-[#3A241C]/20 text-center leading-loose relative z-10">
                Add some delicious items<br/>from the menu
              </p>
            </motion.div>
          ) : (
            groupedCartArray.map((group: any) => (
              <div key={group.name} className="space-y-2 lg:space-y-3 mb-8">
                <h3 className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em] text-[#3A241C]/40 ml-2">
                  {group.isMe ? "Added by You" : `Added by ${group.name}`}
                </h3>
                {group.items.map((item: CartItem) => (
                  <div key={`${item.id}-${item.forPacking}-${item.variant}`} className="flex items-center justify-between group bg-[#F9F7F4]/40 p-3 lg:p-4 rounded-[1.25rem] lg:rounded-2xl border border-[#3A241C]/5 hover:border-[#3A241C]/10 transition-all gap-2 lg:gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-[#3A241C] text-[11px] lg:text-sm leading-snug mb-0.5 truncate tracking-tight flex items-center gap-1.5 lg:gap-2">
                        <span className="truncate">
                          {item.name === "Soft Drinks" && item.variant ? item.variant : `${item.name.replace(/Benne Dosa/gi, 'B.D.')}${item.variant ? ` (${item.variant})` : ""}`}
                        </span>
                      </h4>
                      <div className="flex items-center gap-1.5 lg:gap-2">
                        <span className="text-[9px] lg:text-[10px] font-black text-[#3A241C]/40">₹{item.price} × {item.quantity} = </span>
                        <span className="text-[10px] lg:text-[11px] font-black text-[#E76F51]">₹{item.price * item.quantity}</span>
                        {item.forPacking && <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-[#6A994E] bg-[#6A994E]/10 px-1.5 py-0.5 rounded-md flex-shrink-0 ml-1">To-Go</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 lg:gap-2.5 flex-shrink-0">
                      <button 
                        onClick={() => onTogglePacking(item.id, item.forPacking, item.variant)} 
                        disabled={cartLocked || item.addedBy !== clientId}
                        className={`p-1.5 lg:p-2 rounded-lg transition-all active:scale-75 shadow-sm border disabled:opacity-30 disabled:grayscale ${item.forPacking ? 'bg-[#3A241C] text-white border-[#3A241C]' : 'bg-white text-[#3A241C]/40 hover:text-[#3A241C] border-[#3A241C]/10'}`}
                        title="Toggle Packing"
                      >
                        <Package size={14} className="lg:w-4 lg:h-4" />
                      </button>
                      <div className={`flex items-center bg-white rounded-lg overflow-hidden p-0.5 shadow-sm border border-[#3A241C]/5 ${(cartLocked || item.addedBy !== clientId) ? 'opacity-30 grayscale' : ''}`}>
                        <button onClick={() => onRemove(item.id, item.forPacking, item.variant)} disabled={cartLocked || item.addedBy !== clientId} className="w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center text-[#3A241C]/60 hover:text-[#E76F51] active:scale-75 transition-all"><Minus size={10} className="lg:w-3" /></button>
                        <span className="w-4 lg:w-5 text-center text-[9px] lg:text-[10px] font-black">{item.quantity}</span>
                        <button onClick={() => onAdd(item, item.variant)} disabled={cartLocked || item.addedBy !== clientId} className="w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center text-[#3A241C]/60 hover:text-[#E76F51] active:scale-75 transition-all"><Plus size={10} className="lg:w-3" /></button>
                      </div>
                      <button 
                        onClick={() => onDelete(item.id, item.forPacking, item.variant)} 
                        disabled={cartLocked || item.addedBy !== clientId}
                        className="p-1.5 lg:p-2 rounded-lg text-[#B71C1C]/60 hover:text-[#B71C1C] hover:bg-[#FDECEA] active:scale-75 transition-all disabled:opacity-30 disabled:grayscale"
                        title="Remove Item"
                      >
                        <Trash2 size={14} className="lg:w-4 lg:h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* TOTALS BOX */}
        <AnimatePresence>
          {cart.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-gradient-to-br from-[#3A241C] to-[#2A1A14] rounded-[2.5rem] lg:rounded-[3rem] p-6 lg:p-10 text-white shadow-[0_10px_30px_-10px_rgba(58,36,28,0.2)] relative overflow-hidden flex-shrink-0 border border-white/10 mt-4 isolate"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#E76F51] to-orange-400" />
              <div className="absolute -right-20 -top-20 w-48 h-48 bg-[#E76F51]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-3 lg:space-y-4 mb-6 lg:mb-8 relative z-10">
                <div className="flex justify-between text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-white/40">
                  <span>Bill Amount</span>
                  <span>₹ {cartSubtotal}</span>
                </div>
                {packingCharges > 0 && (
                  <div className="flex justify-between text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-[#E76F51]">
                    <span>Packing Add-on</span>
                    <span>₹ {packingCharges}</span>
                  </div>
                )}
                <div className="pt-4 lg:pt-6 border-t border-white/10 flex justify-between items-end">
                  <span className="font-black text-base lg:text-xl uppercase tracking-tighter">Payable</span>
                  <span className="text-3xl lg:text-4xl font-black text-[#E76F51] tracking-tighter">₹ {cartTotal}</span>
                </div>
              </div>
              <button 
                onClick={onPlaceOrder} 
                disabled={ordering || (cartLocked && lockedBy !== clientId)} 
                className="w-full py-4 lg:py-5 bg-gradient-to-r from-[#E76F51] to-orange-500 text-white rounded-xl lg:rounded-[1.75rem] font-black text-[10px] lg:text-[11px] uppercase tracking-[0.4em] shadow-[0_10px_30px_-10px_rgba(231,111,81,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 lg:gap-3 group relative z-10 disabled:opacity-50 disabled:grayscale"
              >
                {ordering ? <Loader2 className="animate-spin lg:w-[18px]" size={16} /> : (cartLocked && lockedBy !== clientId) ? <Loader2 className="animate-spin lg:w-[18px]" size={16} /> : <ChevronRight className="lg:w-[18px] group-hover:translate-x-1 transition-transform" size={16} />}
                {ordering ? "Processing..." : (cartLocked && lockedBy !== clientId) ? "Someone Placing..." : "Place Order"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ORDER HISTORY */}
        {session && session.orders.length > 0 && (
          <div className="pt-8 border-t border-[#3A241C]/5">
            <h3 className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.4em] text-[#3A241C]/20 mb-6">Order History</h3>
            <div className="space-y-4">
              {[...session.orders]
                .sort((a, b) => {
                  if (a.status !== 'SERVED' && b.status === 'SERVED') return -1;
                  if (a.status === 'SERVED' && b.status !== 'SERVED') return 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((order: OrderData) => {
                  const isTakeawayOrder = order.items.some(it => it.name.toLowerCase().includes("(to-go)"));
                  const isReady = order.status === 'SERVED' && isTakeawayOrder;
                  const displayStatus = isReady ? "READY" : order.status;
                  const isServed = order.status === 'SERVED';

                  return (
                    <div 
                      key={order.id} 
                      className={`p-5 lg:p-6 border transition-all duration-500 ${
                        isServed 
                          ? 'bg-[#F9F7F4]/30 border-[#3A241C]/5 opacity-50 grayscale-[0.5]' 
                          : 'bg-white border-[#3A241C]/10 shadow-lg shadow-[#3A241C]/5'
                      } rounded-[1.5rem] lg:rounded-[2rem]`}
                    >
                      <div className="flex justify-between items-center mb-3 lg:mb-4">
                        <span className={`text-[7px] lg:text-[8px] font-black uppercase tracking-widest px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-md lg:rounded-lg ${order.status === 'SERVED' ? 'bg-[#6A994E]/10 text-[#6A994E]' : 'bg-[#E76F51] text-white shadow-sm'}`}>{displayStatus}</span>
                        <span className="text-[8px] lg:text-[9px] font-black text-[#3A241C]/20">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {order.items.map((it: { name: string; price: number; quantity: number }, idx: number) => (
                        <div key={idx} className="flex justify-between text-[10px] lg:text-[11px] py-1.5 border-b border-[#3A241C]/5 last:border-0">
                          <span className={`${isServed ? 'text-[#3A241C]/40' : 'text-[#3A241C]'} font-bold leading-tight`}>{it.name} <span className="text-[#3A241C]/20 ml-2 font-black tracking-widest">× {it.quantity}</span></span>
                          <span className={`font-black ${isServed ? 'text-[#3A241C]/20' : 'text-[#3A241C]/40'} tracking-tight`}>₹{it.price * it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
