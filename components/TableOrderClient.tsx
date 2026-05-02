"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Loader2, Package, MapPin, ShieldAlert, Lock, CheckCircle2, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";

import { 
  fetchSession, placeOrder, createPayment, fetchMenu, 
  fetchRestaurantStatus, verifyLocation,
  type SessionData, type OrderData, type PaymentData,
  type RestaurantStatusData
} from "@/lib/api";
import { useSocket } from "@/lib/socket-client";
import { type OrderMenuItem } from "@/lib/menu";

// Import modular components
import MenuHeader from "./order/MenuHeader";
import CategoryBar from "./order/CategoryBar";
import MenuSection from "./order/MenuSection";
import CartContent from "./order/CartContent";

// Lazy load modals for better initial load performance
const VariantModal = dynamic(() => import("./order/VariantModal"), { ssr: false });

/* ─── Types ────────────────────────────────── */
interface CartItem extends OrderMenuItem {
  quantity: number;
  forPacking?: boolean;
  variant?: string;
  addedBy?: string;
  addedByName?: string;
}

/* ─── Component ────────────────────────────── */
export default function TableOrderClient({ tableId, mode = "table" }: { tableId: string; mode?: "table" | "takeaway" }) {
  const isTakeawayMode = mode === "takeaway";
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(true);
  const [error, setError] = useState("");

  // Location verification state
  const [locationVerified, setLocationVerified] = useState<boolean | null>(null);
  const [locationDistance, setLocationDistance] = useState<number | null>(null);

  // Menu Data
  const [menuItems, setMenuItems] = useState<OrderMenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [restaurantStatus, setRestaurantStatus] = useState<RestaurantStatusData>({ isOpen: true, closingAt: null });
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Lazy Section Loading
  const [visibleCategoriesCount, setVisibleCategoriesCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLElement>(null);

  // Cart & Order Flow
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isTakeawayGlobal, setIsTakeawayGlobal] = useState(isTakeawayMode);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);
  
  // Multiplayer Cart State (Local-first now)
  const [clientId, setClientId] = useState<string>("");
  const [cartLocked, setCartLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [cartUsers, setCartUsers] = useState<{ clientId: string; friendlyName: string }[]>([]);

  // UI States
  const [lang, setLang] = useState<"EN" | "HI">("EN");
  const [toast, setToast] = useState<string | null>(null);

  const dragControls = useDragControls();
  const [variantModalItem, setVariantModalItem] = useState<OrderMenuItem | null>(null);
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

  /* ─── Geolocation Verification ─────────── */
  const tryVerifyLocation = useCallback(async (sid?: string) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationVerified(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const result = await verifyLocation(pos.coords.latitude, pos.coords.longitude, sid);
          setLocationVerified(result.verified);
          setLocationDistance(result.distance);
        } catch {
          setLocationVerified(null);
        }
      },
      () => setLocationVerified(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

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
      let sidToFetch: string | undefined = undefined;
      
      if (isTakeawayMode) {
        sidToFetch = localStorage.getItem("bnb_takeaway_session_id") || undefined;
        if (!sidToFetch) {
          setLoading(false);
          loadStatus();
          return;
        }
      }

      const [sessionData] = await Promise.all([
        fetchSession(tableId, sidToFetch),
        loadStatus()
      ]);

      setSession(sessionData);
      if (sessionData?.status === "CLOSED") {
        if (isTakeawayMode) localStorage.removeItem("bnb_takeaway_session_id");
        setError("This session has been closed. Please ask staff.");
      }
    } catch (err) {
      if (isTakeawayMode) localStorage.removeItem("bnb_takeaway_session_id");
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [tableId, loadStatus, isTakeawayMode]);

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
    loadSession();
  }, [loadMenuData, loadSession]);

  useEffect(() => {
    if (locationVerified === null) {
      tryVerifyLocation(session?.id);
    }
  }, [session?.id, tryVerifyLocation, locationVerified]);

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
      return typeof updater === "function" ? updater(prev) : updater;
    });
  }, []);

  /* ─── Scroll tracking ────────────── */
  const scrollToCategory = useCallback((cat: string) => {
    const el = categoryRefs.current[cat];
    const container = menuContainerRef.current;
    if (el && container) {
      // Precise offset calculation for sticky category bar
      const offset = el.offsetTop - 110; 
      container.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    
    const timeout = setTimeout(() => {
      const rootEl = menuContainerRef.current;
      if (!rootEl) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter((e) => e.isIntersecting);
          if (visible.length > 0) {
            const topMost = [...visible].sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            const catId = topMost.target.id;
            
            setActiveCategory((prev) => {
              if (prev === catId) return prev;
              
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
          root: rootEl,
          rootMargin: '-120px 0px -60% 0px', // Adjusted for more accurate tracking
          threshold: [0, 0.1]
        }
      );

      categories.forEach((cat) => {
        const el = categoryRefs.current[cat];
        if (el) observer.observe(el);
      });

      return () => observer.disconnect();
    }, 100);

    return () => clearTimeout(timeout);
  }, [categories, visibleCategoriesCount]);

  /* ─── Lazy Load Categories ─────────── */
  useEffect(() => {
    if (categories.length === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCategoriesCount(prev => Math.min(prev + 3, categories.length));
        }
      },
      { 
        threshold: 0, 
        rootMargin: '800px', 
        root: menuContainerRef.current 
      }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [categories.length]);

  /* ─── Cart Logic ───────────────────────── */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const addToCart = useCallback((item: OrderMenuItem, variant?: string, qty: number = 1) => {
    if (!restaurantStatus.isOpen && !restaurantStatus.closingAt) {
      return showToast("Restaurant is closed for today!");
    }
    if (cartLocked) return showToast("Cart is locked for checkout!");
    
    if (item.variants && !variant) {
      setVariantModalItem(item);
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
  }, [restaurantStatus.isOpen, restaurantStatus.closingAt, cartLocked, cartUsers, clientId, isTakeawayGlobal, syncCart, showToast]);

  const handleAddTempVariants = useCallback(() => {
    if (!variantModalItem) return;
    Object.entries(tempVariants).forEach(([v, q]) => {
      if (q > 0) addToCart(variantModalItem, v, q);
    });
    setVariantModalItem(null);
    setTempVariants({});
  }, [variantModalItem, tempVariants, addToCart]);

  const removeFromCart = useCallback((itemId: string, forPacking?: boolean, variant?: string) => {
    if (cartLocked) return showToast("Cart is locked for checkout!");
    syncCart((prev) => {
      const existing = prev.find((c) => c.id === itemId && c.forPacking === forPacking && c.variant === variant && c.addedBy === clientId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((c) => !(c.id === itemId && c.forPacking === forPacking && c.variant === variant && c.addedBy === clientId));
      }
      return prev.map((c) => (c.id === itemId && c.forPacking === forPacking && c.variant === variant && c.addedBy === clientId) ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }, [cartLocked, clientId, syncCart, showToast]);

  const toggleItemPacking = useCallback((itemId: string, currentPacking: boolean, variant?: string) => {
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
  }, [cartLocked, clientId, syncCart, showToast]);

  const deleteFromCart = useCallback((itemId: string, forPacking?: boolean, variant?: string) => {
    if (cartLocked) return showToast("Cart is locked for checkout!");
    syncCart((prev) => {
      return prev.filter((c) => !(c.id === itemId && c.forPacking === forPacking && c.variant === variant && c.addedBy === clientId));
    });
  }, [cartLocked, clientId, syncCart, showToast]);

  const handleGlobalTakeawayToggle = useCallback((isTakeaway: boolean) => {
    if (isTakeawayMode) return;
    setIsTakeawayGlobal(isTakeaway);
    if (cartLocked) return;
    syncCart((prev) => prev.map(c => ({ ...c, forPacking: isTakeaway })));
  }, [isTakeawayMode, cartLocked, syncCart]);

  /* ─── Calculations ─────────────────────── */
  const packingCharges = useMemo(() => {
    let dosaCount = 0;
    let idliUttapamCount = 0;
    cart.filter(c => c.forPacking).forEach(c => {
      if (c.category === "Benne Bliss" || c.category === "Classic Dosas") dosaCount += c.quantity;
      if (c.category === "Idli" || c.category === "Uttapam") idliUttapamCount += c.quantity;
    });
    return (Math.ceil(dosaCount / 2) * 20) + (Math.ceil(idliUttapamCount / 2) * 10);
  }, [cart]);

  const cartSubtotal = useMemo(() => cart.reduce((sum, c) => sum + (c.price || 0) * c.quantity, 0), [cart]);
  const cartTotal = cartSubtotal + packingCharges;
  const cartCount = useMemo(() => cart.reduce((sum, c) => sum + c.quantity, 0), [cart]);

  /* ─── Order Action ─────────────────────── */
  const handlePlaceOrder = useCallback(async () => {
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

      const response = await placeOrder(session?.id || "", itemsToKitchen, isTakeawayGlobal, tableId, packingCharges);
      
      if (isTakeawayMode && response.order.sessionId) {
        localStorage.setItem("bnb_takeaway_session_id", response.order.sessionId);
      }
      
      if (socket) socket.emit("cart_unlock", { tableId });
      
      syncCart([]);
      setSession(response.session);
      setOrderPlaced(true);
      setShowCartMobile(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
      if (socket) socket.emit("cart_unlock", { tableId });
    } finally {
      setOrdering(false);
    }
  }, [restaurantStatus.isOpen, restaurantStatus.closingAt, cart, cartLocked, lockedBy, clientId, socket, tableId, session?.id, isTakeawayGlobal, packingCharges, isTakeawayMode, syncCart, showToast]);

  /* ─── Payment Actions ──────────────────── */
  const sessionTotal = useMemo(() => session?.orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.quantity, 0) + (o.packingCharges || 0), 0
  ) || 0, [session]);

  const paidTotal = useMemo(() => session?.payments
    .filter((p) => p.status === "CONFIRMED")
    .reduce((s, p) => s + p.amount, 0) || 0, [session]);

  const remaining = sessionTotal - paidTotal;

  const handleUPIPayment = useCallback(async () => {
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
  }, [session, remaining, loadSession]);

  const handleCashPayment = useCallback(async () => {
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
  }, [session, remaining, payingCash, loadSession]);

  const handleCloseTable = useCallback(() => {
    if (!session) return;
    if (remaining > 0) return showToast("Please settle the payment first!");
    
    showToast("Requesting table closure...");
    if (socket) socket.emit("table_close_request", { tableId, sessionId: session.id });
  }, [session, remaining, socket, tableId, showToast]);

  const handleRateItem = useCallback(async (itemName: string, rating: number) => {
    try {
      const { submitRating } = await import("@/lib/api");
      const menuItem = menuItems.find(m => m.name === itemName);
      if (menuItem) await submitRating(menuItem.id, rating);
      setRatings(prev => ({ ...prev, [itemName]: rating }));
      setRatedItems(prev => new Set(prev).add(itemName));
      showToast("Thank you for your rating!");
    } catch (err) {
      showToast("Failed to submit rating");
    }
  }, [menuItems, showToast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]">
        <Loader2 className="animate-spin text-[#E76F51]" size={40} />
      </div>
    );
  }

  const commonCartProps = {
    cart, cartSubtotal, cartTotal, packingCharges, session,
    ordering, orderPlaced, setOrderPlaced,
    onPlaceOrder: handlePlaceOrder,
    onRemove: removeFromCart,
    onAdd: addToCart,
    onDelete: deleteFromCart,
    onTogglePacking: toggleItemPacking,
    remaining, paymentMode, setPaymentMode,
    handleUPIPayment, handleCashPayment,
    payingUPI, payingCash,
    clientId, cartLocked, lockedBy,
    handleRateItem, ratings, ratedItems,
    isTakeaway: isTakeawayMode
  };

  const menuTransition: any = { duration: 0.3, ease: [0.22, 1, 0.36, 1] };

  return (
    <div className="h-screen h-[100dvh] bg-[#F9F7F4] flex flex-col overflow-hidden relative">
      {/* REMOTE ORDERS LOCKOUT */}
      {locationVerified === false && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[200] bg-[#3A241C]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-[#E76F51]/10 flex items-center justify-center text-[#E76F51] mb-8 border border-[#E76F51]/20"><MapPin size={48} className="animate-pulse" /></div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">Remote Orders Restricted</h2>
          <p className="text-[#F9F7F4]/60 text-xs font-bold uppercase tracking-[0.2em] max-w-xs leading-loose">We only accept orders from users within the restaurant premises (50m range).</p>
        </motion.div>
      )}

      {/* CLOSED OVERLAY */}
      {!restaurantStatus.isOpen && !session && (
        <div className="absolute inset-0 z-[100] bg-[#3A241C] flex items-center justify-center p-6 text-center">
          <div className="max-w-md">
            <div className="w-20 h-20 bg-[#E76F51] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3"><Lock size={40} className="text-white" /></div>
            <h1 className="font-[var(--font-playfair)] text-4xl lg:text-5xl font-bold text-white mb-6"> We're Closed</h1>
            <p className="text-white/60 text-lg mb-10 leading-relaxed font-light">Our kitchen has closed for the day. We serve from <span className="text-[#E76F51] font-bold underline underline-offset-4 decoration-2">4 PM onwards</span>.</p>
          </div>
        </div>
      )}

      <MenuHeader 
        tableId={tableId}
        isTakeawayMode={isTakeawayMode}
        isTakeawayGlobal={isTakeawayGlobal}
        session={session}
        remaining={remaining}
        timeLeft={timeLeft}
        connected={connected}
        onCloseTable={handleCloseTable}
        onToggleGlobalTakeaway={handleGlobalTakeawayToggle}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <main ref={menuContainerRef as any} id="menu-container" className="flex-1 relative border-r border-[#3A241C]/5 overflow-y-auto w-full scroll-smooth transform-gpu translate-z-0">
          <CategoryBar 
            categories={categories} 
            activeCategory={activeCategory} 
            onCategoryClick={scrollToCategory} 
          />

          <div className="p-4 lg:p-8 pb-32 lg:pb-16 space-y-12 lg:y-20">
            {categories.slice(0, visibleCategoriesCount).map((cat) => (
              <MenuSection 
                key={cat}
                category={cat}
                items={menuItems.filter(m => m.category === cat)}
                lang={lang}
                onAdd={addToCart}
                onToggleLang={() => setLang(l => l === "EN" ? "HI" : "EN")}
                isRestaurantOpen={restaurantStatus.isOpen || !!restaurantStatus.closingAt}
                sectionRef={(el) => { categoryRefs.current[cat] = el; }}
              />
            ))}
            
            {visibleCategoriesCount < categories.length && (
              <div ref={loadMoreRef} className="h-40 flex items-center justify-center pb-20">
                <Loader2 size={32} className="animate-spin text-[#E76F51]/20" />
              </div>
            )}
          </div>
        </main>

        {/* Desktop Cart */}
        <aside className="hidden lg:flex w-[550px] p-8 flex-col h-full pr-12 relative">
          <div className="absolute top-1/2 right-20 w-72 h-72 bg-[#E76F51]/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2" />
          <div className="flex-1 bg-white/90 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_30px_100px_-20px_rgba(58,36,28,0.1)] border border-white/60 overflow-hidden flex flex-col ml-4 relative z-10 min-h-0">
            <CartContent {...commonCartProps} />
          </div>
        </aside>

        {/* Mobile Cart UI - Synchronized and Butter Smooth */}
        <AnimatePresence initial={false}>
          {!showCartMobile ? (
            <motion.div 
              key="cart-trigger"
              initial={{ y: 150, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 150, opacity: 0 }} 
              transition={menuTransition}
              className="lg:hidden fixed bottom-8 left-6 right-6 z-[120] transform-gpu translate-z-0"
            >
              <motion.button 
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowCartMobile(true)} 
                className="w-full h-16 bg-[#3A241C] text-white rounded-[2.5rem] flex items-center justify-between px-8 shadow-[0_20px_50px_rgba(58,36,28,0.3)] border border-white/5 overflow-hidden relative touch-none select-none"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full ${orderPlaced ? 'bg-[#6A994E]' : 'bg-[#E76F51]'} flex items-center justify-center text-[11px] font-black`}>{orderPlaced ? <Package size={14} /> : cartCount}</div>
                  <span className="font-black text-[11px] uppercase tracking-widest">{orderPlaced ? "View Order" : "Cart Items"}</span>
                </div>
                <span className="font-black text-sm tracking-tight">{orderPlaced ? (remaining > 0 ? `Pay ₹${remaining}` : "View Status") : `₹${cartTotal}`}</span>
              </motion.button>
            </motion.div>
          ) : (
            <div key="cart-drawer-container">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setShowCartMobile(false)} 
                className="lg:hidden fixed inset-0 z-[60] bg-[#3A241C]/40 backdrop-blur-sm transform-gpu translate-z-0" 
              />
              <motion.div 
                drag="y" dragListener={false} dragControls={dragControls} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.15 }} 
                onDragEnd={(e, info) => { if (info.offset.y > 100 || info.velocity.y > 500) setShowCartMobile(false) }}
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }} 
                transition={menuTransition}
                style={{ willChange: "transform" }}
                className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] bg-white rounded-t-[3rem] h-[92vh] flex flex-col shadow-2xl overflow-hidden transform-gpu translate-z-0"
              >
                <div onPointerDown={(e) => dragControls.start(e)} className="flex justify-center py-6 cursor-grab active:cursor-grabbing touch-none z-20"><div className="w-12 h-1.5 bg-[#3A241C]/10 rounded-full" /></div>
                <div className="flex-1 relative flex flex-col min-h-0">
                  <CartContent {...commonCartProps} />
                  <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none flex justify-center z-50">
                    <motion.button 
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setShowCartMobile(false)} 
                      className="pointer-events-auto w-full py-5 bg-white border-2 border-[#3A241C]/5 text-[#3A241C] rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(58,36,28,0.05)] active:bg-[#F9F7F4] transition-all touch-none select-none"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#3A241C]/5 flex items-center justify-center">
                        <ChevronDown size={14} className="text-[#3A241C]/40" />
                      </div>
                      Continue Browsing
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Variant Modal */}
        <AnimatePresence>
          {variantModalItem && (
            <VariantModal 
              item={variantModalItem} 
              tempVariants={tempVariants} 
              onClose={() => setVariantModalItem(null)} 
              onUpdateTempVariant={(v, d) => setTempVariants(p => ({ ...p, [v]: Math.max(0, (p[v] || 0) + d) }))}
              onConfirm={handleAddTempVariants}
            />
          )}
        </AnimatePresence>

        {/* PREMIUM TOAST NOTIFICATION */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: -40, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              className="fixed top-24 lg:top-12 left-0 right-0 mx-auto w-fit z-[200] px-6 transform-gpu translate-z-0"
            >
              <div className="bg-[#3A241C] text-white px-6 py-3.5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 flex items-center gap-3 transform-gpu backdrop-blur-xl">
                <div className="w-6 h-6 rounded-full bg-[#6A994E] flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={14} className="text-white" />
                </div>
                <span className="font-black text-[10px] lg:text-[11px] uppercase tracking-[0.15em] whitespace-nowrap">{toast}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
