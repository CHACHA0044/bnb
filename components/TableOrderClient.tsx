"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Package, MapPin, ShieldAlert, Lock, CheckCircle2, ChevronDown, Coffee, Bell, X, Star } from "lucide-react";
import dynamic from "next/dynamic";

import {
  fetchSession, placeOrder, createPayment, fetchMenu,
  fetchRestaurantStatus, verifyLocation, dismissReviewRequest,
  fetchOrderConfig,
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
import { AnimatedAmount } from "./order/OrderSummary";

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
  const [pendingHistoryScroll, setPendingHistoryScroll] = useState(false);
  const [deletedOrders, setDeletedOrders] = useState<any[]>([]);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);

  // Global Notification States
  const [showCancellation, setShowCancellation] = useState(false);
  const notifiedCancelledIds = useRef(new Set<string>());

  // Multiplayer Cart State (Local-first now)
  const [clientId, setClientId] = useState<string>("");
  const [cartLocked, setCartLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [cartUsers, setCartUsers] = useState<{ clientId: string; friendlyName: string }[]>([]);

  // UI States
  const [lang, setLang] = useState<"EN" | "HI">("EN");
  const [toast, setToast] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const instructionsRef = useRef("");
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const [variantModalItem, setVariantModalItem] = useState<OrderMenuItem | null>(null);
  const [tempVariants, setTempVariants] = useState<{ [key: string]: number }>({});
  const categoryRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Touch gesture state for cart drawer swipe-to-close
  const drawerTouchStart = useRef<{ y: number; time: number } | null>(null);
  const drawerTranslateY = useRef(0);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingDrawer = useRef(false);

  // Payment
  const [paymentMode, setPaymentMode] = useState<"UPI" | "CASH" | null>(null);
  const [payingUPI, setPayingUPI] = useState(false);
  const [payingCash, setPayingCash] = useState(false);

  // Rating
  const [ratings, setRatings] = useState<{ [itemName: string]: number }>({});
  const [ratedItems, setRatedItems] = useState<Set<string>>(new Set());
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [orderConfig, setOrderConfig] = useState<{ upiId: string } | null>(null);

  // Socket
  const { socket, joinSession, on, connected } = useSocket();
  const [showConfirmed, setShowConfirmed] = useState(false);
  const [showAdminConfirmed, setShowAdminConfirmed] = useState(false);
  const notifiedConfirmedIds = useRef(new Set<string>());

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    setShowReviewPrompt(!!session?.reviewRequested);
  }, [session?.reviewRequested]);

  useEffect(() => {
    if (session) {
      console.log(`[STATE] Session ${session.id} - paymentReminder: ${session.paymentReminder}, reviewRequested: ${session.reviewRequested}`);
    }
    console.log(`[STATE] showReviewPrompt: ${showReviewPrompt}`);
  }, [session, showReviewPrompt]);

  /* ─── Geolocation Verification ─────────── */
  const tryVerifyLocation = useCallback(async (sid?: string) => {
    if (typeof navigator === "undefined") {
      setLocationVerified(null);
      return;
    }

    // DEVELOPMENT BYPASS: Auto-verify on local network IPs or localhost
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || 
                    hostname.startsWith("192.168.") || hostname.startsWith("10.") || 
                    hostname.startsWith("172.");

    if (isLocal) {
      console.log("[DEV] Local network detected, bypassing location check.");
      setLocationVerified(true);
      setLocationDistance(0);
      return;
    }

    if (!navigator.geolocation) {
      setLocationVerified(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const result = await verifyLocation(pos.coords.latitude, pos.coords.longitude, sid);
          setLocationVerified(result.verified);
          setLocationDistance(result.distance);
        } catch {
          setLocationVerified(false);
        }
      },
      (err) => {
        console.warn("Geolocation failed:", err);
        setLocationVerified(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    setIsMounted(true);
    let cid = localStorage.getItem("bnb_client_id");
    if (!cid) {
      cid = "user_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("bnb_client_id", cid);
    }
    setClientId(cid);

    const key = `bnb_last_welcome_${mode}`;
    const lastWelcome = localStorage.getItem(key);
    const now = Date.now();
    const shouldShow = !lastWelcome || (now - parseInt(lastWelcome || "0")) > 1000 * 60 * 60 * 3;

    if (shouldShow) {
      setShowWelcome(true);
      localStorage.setItem(key, now.toString());
    } else {
      setWelcomeDismissed(true);
    }
  }, [mode]);

  // Hydrate from cache for instant load
  useEffect(() => {
    const cachedMenu = localStorage.getItem("bnb_cached_menu");
    const sessionKey = isTakeawayMode ? "bnb_cached_session_takeaway" : `bnb_cached_session_${tableId}`;
    const cachedSession = localStorage.getItem(sessionKey);

    if (cachedMenu) {
      try {
        const { items, categories: cats } = JSON.parse(cachedMenu);
        if (items && cats) {
          setMenuItems(items);
          setCategories(cats);
          setMenuLoading(false);
          if (cats.length > 0) setActiveCategory(cats[0]);
        }
      } catch (e) { console.error("Menu cache parse error", e); }
    }

    if (cachedSession) {
      try {
        const data = JSON.parse(cachedSession);
        if (data) {
          setSession(data);
          setLoading(false);
        }
      } catch (e) { console.error("Session cache parse error", e); }
    }
  }, [tableId, isTakeawayMode]);

  // PERSIST CART
  useEffect(() => {
    const cachedCart = localStorage.getItem(`bnb_cart_${tableId}`);
    if (cachedCart) {
      try {
        const parsed = JSON.parse(cachedCart);
        if (Array.isArray(parsed)) setCart(parsed);
      } catch (e) { console.error("Cart hydration error", e); }
    }
  }, [tableId]);

  useEffect(() => {
    if (cart.length > 0 || isMounted) {
      localStorage.setItem(`bnb_cart_${tableId}`, JSON.stringify(cart));
    }
  }, [cart, tableId, isMounted]);

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
      const sessionKey = isTakeawayMode ? "bnb_cached_session_takeaway" : `bnb_cached_session_${tableId}`;
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));

      if (sessionData?.status === "CLOSED") {
        if (isTakeawayMode) localStorage.removeItem("bnb_takeaway_session_id");
        localStorage.removeItem(sessionKey);
        setSessionClosed(true);
        setOrderPlaced(true); // Show the thank you screen
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
      localStorage.setItem("bnb_cached_menu", JSON.stringify(data));
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

  /* ─── Search Filtering Logic ───────────── */
  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    const q = searchQuery.toLowerCase().trim();
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.descriptionEn && item.descriptionEn.toLowerCase().includes(q))
    );
  }, [menuItems, searchQuery]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    // Only show categories that have items matching the search
    const activeCats = new Set(filteredMenuItems.map(m => m.category));
    return categories.filter(c => activeCats.has(c));
  }, [categories, filteredMenuItems, searchQuery]);

  useEffect(() => {
    if (locationVerified === null) {
      tryVerifyLocation(session?.id);
    }
    
    // Fetch Order Config
    fetchOrderConfig().then(setOrderConfig).catch(console.error);
  }, [session?.id, tryVerifyLocation, locationVerified]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!socket || !connected) return;
    const unsubs = [
      on("menu_updated", () => {
        loadMenuData();
        loadStatus();
      }),
      on("menu_item_stock_updated", (updates: any) => {
        if (!updates || !Array.isArray(updates)) return;
        setMenuItems(prev => prev.map(item => {
          const update = updates.find((u: any) => u.id === item.id);
          if (update) return { ...item, outOfStock: update.outOfStock };
          return item;
        }));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [socket, connected, on, loadMenuData, loadStatus]);

  useEffect(() => {
    if (!session) {
      loadStatus();
      return;
    }
    joinSession(session.id);
    const unsubs = [
      on("order_placed", () => loadSession()),
      on("order_updated", (data: any) => {
        console.log("[SOCKET] order_updated received:", data.order?.id, data.order?.status);
        setIsProcessingOrder(false);
        if (data.order) {
          setSession(prev => {
            if (!prev) return null;
            const updatedOrders = prev.orders.map(o => {
              if (o.id === data.order.id || o.id === data.tempOrderId) {
                // Deep merge items to preserve local state if necessary
                return { ...o, ...data.order, items: data.order.items || o.items };
              }
              return o;
            });
            return { ...prev, orders: updatedOrders };
          });
        }
        // Force a re-fetch to be absolutely sure we have latest state
        loadSession();
      }),
      on("order_deleted", (data: any) => {
        setIsProcessingOrder(false);
        if (data.orderId) {
          setSession(prev => {
            if (!prev) return null;
            return { ...prev, orders: prev.orders.filter(o => o.id !== data.orderId) };
          });
        }

        // Track deleted order for notification
        if (data.order) {
          setDeletedOrders(prev => [...prev, data.order]);
          setTimeout(() => {
            setDeletedOrders(prev => prev.filter(o => o.id !== data.order.id));
          }, 90000);
        }

        loadSession();
      }),
      on("payment_confirmed", (data: any) => {
        if (data.payment) {
          // Handle REJECTED payments — admin denied the payment
          if (data.payment.status === "REJECTED") {
            setSession(prev => {
              if (!prev) return null;
              return {
                ...prev,
                payments: prev.payments.filter(p => p.id !== data.payment.id)
              };
            });
            setPaymentSuccess(false);
            setPaymentMode(null);
            setPayingUPI(false);
            setPayingCash(false);
            showToast("Payment was rejected by admin");
            loadSession();
            return;
          }

          setSession(prev => {
            if (!prev) return null;
            const exists = prev.payments.some(p => p.id === data.payment.id);
            if (exists) {
              return {
                ...prev,
                payments: prev.payments.map(p => p.id === data.payment.id ? data.payment : p)
              };
            }
            return { ...prev, payments: [data.payment, ...prev.payments] };
          });
        }
        loadSession();
        setPaymentSuccess(true);
        setOrderPlaced(true);
        setTimeout(() => setPaymentSuccess(false), 90000);
      }),
      on("review_requested", () => {
        console.log("Review request received!");
        setShowReviewPrompt(true);
      }),
      on("session_updated", (data: any) => {
        console.log("[SOCKET] session_updated received:", data);
        loadSession();
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [session?.id, joinSession, on, loadSession, loadStatus, showToast]);

  // Auto-reset orderPlaced if session becomes empty AND no active notifications
  useEffect(() => {
    if (orderPlaced && !isProcessingOrder && session && session.orders.length === 0 && deletedOrders.length === 0 && !paymentSuccess) {
      setOrderPlaced(false);
    }
  }, [session, isProcessingOrder, orderPlaced, deletedOrders.length, paymentSuccess]);

  // Track Admin Confirmation for Notifications
  useEffect(() => {
    if (!session) return;
    const confirmedOrders = session.orders.filter(o => o.status !== "UNCONFIRMED" && o.status !== "CANCELLED");
    const newConfirmed = confirmedOrders.filter(o => !notifiedConfirmedIds.current.has(o.id));
    
    if (newConfirmed.length > 0) {
      if (orderPlaced) {
        setShowAdminConfirmed(true);
        setTimeout(() => setShowAdminConfirmed(false), 8000);
      }
      newConfirmed.forEach(o => notifiedConfirmedIds.current.add(o.id));
    }
  }, [session?.orders, orderPlaced]);

  // Global Notification Tracking
  const cancelledOrders = useMemo(() => [
    ...(session?.orders ?? []).filter((o: any) => o.status === "CANCELLED"),
    ...deletedOrders
  ], [session, deletedOrders]);

  useEffect(() => {
    const currentIds = cancelledOrders.map((o: any) => o.id);
    const newIds = currentIds.filter(id => !notifiedCancelledIds.current.has(id));

    if (newIds.length > 0) {
      setShowCancellation(true);
      newIds.forEach(id => notifiedCancelledIds.current.add(id));
      const timer = setTimeout(() => setShowCancellation(false), 60000); // Hide after 1 min
      return () => clearTimeout(timer);
    }
  }, [cancelledOrders]);


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
        // Smart merge: keep MY items local, sync OTHER users' items from server
        setCart(prev => {
          const myItems = prev.filter(item => item.addedBy === clientId);
          const otherItems = (sharedCart.items || []).filter((item: any) => item.addedBy !== clientId);
          return [...myItems, ...otherItems];
        });
        setCartLocked(sharedCart.isLocked);
        setLockedBy(sharedCart.lockedBy);
        setCartUsers(sharedCart.users);
      }),
      on("cart_toast", (msg: any) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
      }),
      on("order_updated", () => loadSession()),
      on("session_updated", () => loadSession()),
      on("order_placed", () => loadSession()),
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

              const desktopBtn = document.getElementById(`desktop-cat-btn-${catId}`);
              if (desktopBtn) {
                const container = desktopBtn.parentElement;
                if (container) {
                  const scrollTarget = desktopBtn.offsetLeft - (container.offsetWidth / 2) + (desktopBtn.offsetWidth / 2);
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

  const addToCart = useCallback((item: OrderMenuItem, variant?: string, qty: number = 1) => {
    if (!restaurantStatus.isOpen && !restaurantStatus.closingAt) {
      return showToast("Restaurant is closed for today!");
    }
    if (cartLocked) return showToast("Cart is locked for checkout!");

    // Clear notifications when adding new items
    setOrderPlaced(false);
    setDeletedOrders([]);
    setPaymentSuccess(false);

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
      return [...prev, { ...item, price: actualPrice, quantity: qty, forPacking: packingState, variant, addedBy: clientId, addedByName: me?.friendlyName || "You", cartItemId: Math.random().toString(36).substring(7) }];
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

  // Mobile cart drawer persistence handled by state (manual close only)

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
  const handlePlaceOrder = useCallback(async (customerPhone?: string) => {
    if (!restaurantStatus.isOpen && !restaurantStatus.closingAt) {
      return showToast("Restaurant is closed for today!");
    }
    if (cart.length === 0) return;
    if (cartLocked && lockedBy !== clientId) return showToast("Someone else is placing the order!");

    setOrdering(true);
    setIsProcessingOrder(true);
    // Don't hide mobile cart yet — let the animation play first

    try {
      const itemsToKitchen = cart.map((c) => ({
        name: `${c.name}${c.variant ? ` (${c.variant})` : ""}${c.forPacking ? " (Packing)" : ""}`,
        price: c.price,
        quantity: c.quantity
      }));

      const response = await placeOrder(session?.id || "", itemsToKitchen, isTakeawayGlobal, tableId, packingCharges, instructionsRef.current, customerPhone);

      if (isTakeawayMode && response.order.sessionId) {
        localStorage.setItem("bnb_takeaway_session_id", response.order.sessionId);
      }

      // Backend route already emits to admin — no client emission needed
      instructionsRef.current = "";
      setSession(response.session);
      setIsProcessingOrder(false);
      setOrderPlaced(true); // Ensure success screen shows immediately
      setCart([]);
      localStorage.removeItem(`bnb_cart_${tableId}`);
      // Notification will now be triggered by 'order_confirmed' socket event instead of being shown immediately
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
      setIsProcessingOrder(false);
      setOrderPlaced(false);
      if (socket) socket.emit("cart_unlock", { tableId });
    } finally {
      setOrdering(false);
    }
  }, [restaurantStatus.isOpen, restaurantStatus.closingAt, cart, cartLocked, lockedBy, clientId, socket, tableId, session?.id, isTakeawayGlobal, packingCharges, isTakeawayMode, syncCart, showToast]);

  /* ─── Payment Actions ──────────────────── */
  const sessionTotal = useMemo(() => session?.orders
    .filter(o => o.status !== "CANCELLED")
    .reduce(
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

  const handleRateItem = useCallback(async (itemName: string, rating: number, orderId?: string) => {
    // ... logic omitted for brevity in target content matching, but I will replace the whole block
    try {
      const { submitRating } = await import("@/lib/api");
      const menuItem = menuItems.find(m => m.name === itemName);
      if (menuItem) await submitRating(menuItem.id, rating, session?.id, orderId);

      const ratingKey = orderId ? `${orderId}-${itemName}` : itemName;
      setRatings(prev => ({ ...prev, [ratingKey]: rating }));

      setRatedItems(prev => {
        const next = new Set(prev).add(ratingKey);

        if (session?.orders) {
          const rateableItemsKeys = new Set<string>();
          session.orders.forEach(o => {
            if (o.status === 'SERVED') {
              o.items.forEach((it: any) => {
                const n = it.name.toLowerCase();
                const isExcluded = n.includes("water") || n.includes("soft drink") ||
                  n.includes("coke") || n.includes("pepsi") ||
                  n.includes("sprite") || n.includes("thums up");
                if (!isExcluded) {
                  rateableItemsKeys.add(`${o.id}-${it.name}`);
                }
              });
            }
          });

          let allRated = true;
          rateableItemsKeys.forEach(key => {
            if (!next.has(key)) allRated = false;
          });

          if (allRated && rateableItemsKeys.size > 0) {
            showToast("Thank you for your rating!");
          }
        }

        return next;
      });
    } catch (err) {
      showToast("Failed to submit rating");
    }
  }, [menuItems, showToast, session]);

  const handleFeedbackSubmit = useCallback(async (feedback: string) => {
    if (!session) return;
    try {
      const { submitFeedback } = await import("@/lib/api");
      await submitFeedback(session.id, feedback);
      // Local state update
      setSession(prev => prev ? { ...prev, feedback } : null);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  }, [session]);

  // Drawer touch gesture handlers (must be before early returns)
  const handleDrawerTouchStart = useCallback((e: React.TouchEvent) => {
    drawerTouchStart.current = { y: e.touches[0].clientY, time: Date.now() };
    isDraggingDrawer.current = false;
  }, []);

  const handleDrawerTouchMove = useCallback((e: React.TouchEvent) => {
    if (!drawerTouchStart.current || !drawerRef.current) return;
    const deltaY = e.touches[0].clientY - drawerTouchStart.current.y;
    
    // Only allow downward drag when at top of scroll
    const scrollEl = drawerScrollRef.current;
    const isAtTop = !scrollEl || scrollEl.scrollTop <= 0;
    
    if (deltaY > 0 && isAtTop) {
      isDraggingDrawer.current = true;
      e.preventDefault();
      const dampened = deltaY * 0.4;
      drawerTranslateY.current = dampened;
      drawerRef.current.style.transform = `translateY(${dampened}px)`;
      drawerRef.current.style.transition = 'none';
    }
  }, []);

  const handleDrawerTouchEnd = useCallback(() => {
    if (!drawerRef.current || !drawerTouchStart.current) {
      drawerTouchStart.current = null;
      return;
    }
    
    const elapsed = Date.now() - drawerTouchStart.current.time;
    const velocity = drawerTranslateY.current / (elapsed || 1) * 1000;
    
    if (drawerTranslateY.current > 80 || velocity > 400) {
      drawerRef.current.style.transition = 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
      drawerRef.current.style.transform = 'translateY(100%)';
      setTimeout(() => setShowCartMobile(false), 350);
    } else {
      drawerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
      drawerRef.current.style.transform = 'translateY(0)';
    }
    
    drawerTranslateY.current = 0;
    drawerTouchStart.current = null;
    isDraggingDrawer.current = false;
  }, []);

  // Logic: Show premium welcome screen for all initial loading states
  if (!isMounted || loading || (showWelcome && !welcomeDismissed)) {
    return (
      <AnimatePresence>
        <motion.div
          key="welcome-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[1000] bg-[#F9F7F4] flex flex-col items-center justify-center p-8 overflow-hidden"
        >
          {/* Hardware Accelerated Background Elements */}
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[var(--benne-primary)]/5 rounded-full blur-[80px] pointer-events-none transform-gpu translate-z-0" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-[#3A241C]/5 rounded-full blur-[80px] pointer-events-none transform-gpu translate-z-0" />

          <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
            {/* Logo Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-24 h-24 bg-[#3A241C] rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl relative will-change-transform"
            >
              <Coffee size={40} className="text-white" />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 border-4 border-[#3A241C] rounded-[2.5rem] will-change-transform"
              />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="will-change-transform"
            >
              <h1 className="font-[var(--font-playfair)] text-4xl font-bold text-[#3A241C] mb-4 italic">
                {showWelcome ? "Welcome to  Benne n Beans" : "Brewing things back up"}
              </h1>

              <div className="h-px w-12 bg-[var(--benne-primary)]/30 mx-auto mb-6" />

              <p className="text-[#3A241C]/40 text-xs font-black uppercase tracking-[0.25em] leading-loose mb-12 h-10 flex items-center justify-center">
                {showWelcome
                  ? (isTakeawayMode ? "Take the legacy of flavor home." : "Dine-in with the soul of Karnataka.")
                  : "Bringing back your delicious session..."
                }
              </p>

              <div className="flex flex-col items-center gap-4">
                {/* Optimized Progress Indicator */}
                <div className="relative w-48 h-1 bg-[#3A241C]/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={(!loading && !menuLoading) ? { x: "0%" } : { 
                      x: ["-100%", "-20%", "-20%", "0%"],
                      transition: { 
                        times: [0, 0.4, 0.8, 1],
                        duration: 3,
                        ease: "easeInOut",
                        repeat: (loading || menuLoading) ? Infinity : 0
                      }
                    }}
                    onAnimationComplete={() => {
                      if (!loading && !menuLoading) {
                        setWelcomeDismissed(true);
                      }
                    }}
                    className="absolute inset-0 bg-[var(--benne-primary)] will-change-transform"
                  />
                </div>
                <span className="text-[10px] font-black text-[#3A241C]/20 uppercase tracking-[0.2em]">
                  {(loading || menuLoading) ? "Getting things ready..." : "Ready to serve"}
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // If welcome is already seen but data is still loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[var(--benne-primary)]" size={32} />
          <span className="text-[10px] font-black text-[#3A241C]/20 uppercase tracking-widest">Restoring Session...</span>
        </div>
      </div>
    );
  }

  const commonCartProps = {
    cart, cartSubtotal, cartTotal, packingCharges, session,
    ordering, orderPlaced, setOrderPlaced,
    orderConfig,
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
    isTakeaway: isTakeawayMode,
    instructionsRef,
    isProcessingOrder,
    deletedOrders,
    paymentSuccess,
    sessionClosed,
    showReviewPrompt,
    tableId: tableId,
    setShowReviewPrompt,
    onAnimationComplete: () => {
      // Animation complete logic moved to handlePlaceOrder
    },
    autoScrollToHistory: pendingHistoryScroll,
    onScrollComplete: () => setPendingHistoryScroll(false)
  };

  const menuTransition: any = { duration: 0.4, ease: [0.22, 1, 0.36, 1] };

  return (
    <div className="h-screen h-[100dvh] bg-[#F9F7F4] flex flex-col overflow-hidden relative">
      {/* GLOBAL NOTIFICATIONS */}
      <div className="fixed top-24 left-6 right-6 z-[150] space-y-4 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {session?.paymentReminder && (
            <motion.div
              key="payment-reminder"
              initial={{ y: -20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.9 }}
              className="mx-auto w-fit max-w-[90vw] bg-[#B71C1C] text-white p-3 lg:p-4 rounded-2xl flex items-center gap-3 lg:gap-4 shadow-[0_20px_50px_rgba(183,28,28,0.3)] border border-white/10 pointer-events-auto"
            >
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-md">
                <Bell size={18} className="animate-bounce" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest leading-tight">
                  Please settle your bill at the counter or via UPI!
                </p>
              </div>
            </motion.div>
          )}

          {showReviewPrompt && (
            <motion.div
              key="review-prompt"
              initial={{ y: -20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.9 }}
              onClick={async () => {
                setShowReviewPrompt(false);
                if (session) dismissReviewRequest(session.id);
                setPendingHistoryScroll(true);
                setShowCartMobile(true);
              }}
              className="mx-auto w-fit max-w-[90vw] bg-[#E76F51] text-white p-3 lg:p-4 rounded-2xl flex items-center gap-3 lg:gap-4 shadow-[0_20px_50px_rgba(231,111,81,0.3)] border border-white/10 pointer-events-auto cursor-pointer group"
            >
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0 group-hover:scale-110 transition-transform">
                <Star size={18} className="fill-white animate-bounce" />
              </div>
              <div className="flex-1 text-left pr-2">
                <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest leading-tight">Rate Your Meal! Tap to open history & share feedback.</p>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  setShowReviewPrompt(false);
                  if (session) dismissReviewRequest(session.id);
                }}
                className="w-7 h-7 lg:w-8 lg:h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}

          {showAdminConfirmed && (
            <motion.div
              key="admin-confirmed"
              initial={{ y: -20, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0, scale: 0.9 }} className="mx-auto w-fit max-w-[90vw] bg-[#6A994E] text-white p-3 lg:p-4 rounded-2xl flex items-center gap-3 lg:gap-4 shadow-2xl border border-white/10 pointer-events-auto">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
                <CheckCircle2 size={18} className="text-white" />
              </div>
              <div className="flex-1 text-left pr-2">
                <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest mb-0.5 leading-tight">Order Confirmed!</p>
                <p className="text-[8px] lg:text-[9px] font-bold text-white/80 leading-tight">Our kitchen has started preparing your delicious meal.</p>
              </div>
              <button onClick={() => setShowAdminConfirmed(false)} className="w-7 h-7 lg:w-8 lg:h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            </motion.div>
          )}



          {showCancellation && (
            <motion.div
              key="order-cancelled"
              initial={{ y: -20, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0, scale: 0.9 }} className="mx-auto w-fit max-w-[90vw] bg-[#B71C1C] text-white p-3 lg:p-4 rounded-2xl flex items-center gap-3 lg:gap-4 shadow-2xl border border-white/10 pointer-events-auto">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
                <ShieldAlert size={18} className="animate-pulse" />
              </div>
              <div className="flex-1 text-left pr-2">
                <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest mb-0.5 leading-tight">Order Cancelled</p>
                <p className="text-[8px] lg:text-[9px] font-bold text-white/80 leading-tight">Your order could not be accepted. Added items are removed.</p>
              </div>
              <button onClick={() => setShowCancellation(false)} className="w-7 h-7 lg:w-8 lg:h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            </motion.div>
          )}

          {(() => {
            const hasReadyTakeaway = (session?.orders ?? []).some((o: any) =>
              o.items.some((i: any) => i.name.toLowerCase().includes("(packing)") && i.isServed)
            );
            if (!hasReadyTakeaway) return null;
            return (
              <motion.div
                key="takeaway-ready"
                initial={{ y: -20, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0, scale: 0.9 }} className="mx-auto w-fit max-w-[90vw] bg-[#6A994E] text-white p-3 lg:p-4 rounded-2xl flex items-center gap-3 lg:gap-4 shadow-2xl border border-white/10 pointer-events-auto">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
                  <Package size={18} className="animate-bounce" />
                </div>
                <div className="flex-1 text-left pr-2">
                  <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest mb-0.5 leading-tight">Takeaway Ready!</p>
                  <p className="text-[8px] lg:text-[9px] font-bold text-white/80 leading-tight">Please collect your items from the counter.</p>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
      {/* REMOTE ORDERS LOCKOUT */}
      {locationVerified === false && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[200] bg-[#3A241C]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-[#E76F51]/10 flex items-center justify-center text-[#E76F51] mb-8 border border-[#E76F51]/20"><MapPin size={48} className="animate-pulse" /></div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">Remote Orders Restricted</h2>
          <p className="text-[#F9F7F4]/60 text-xs font-bold uppercase tracking-[0.2em] max-w-xs leading-loose mb-8">We only accept orders from users within the restaurant premises (50m range).</p>
          
          <button 
            onClick={() => {
              setLocationVerified(null);
              tryVerifyLocation(session?.id);
            }}
            className="bg-[#E76F51] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_20px_50px_rgba(231,111,81,0.3)] hover:scale-105 active:scale-95 transition-all mb-8 border border-white/10"
          >
            Allow Location & Try Again
          </button>

          <p className="text-[#E76F51] text-[10px] font-black uppercase tracking-[0.2em] max-w-xs leading-loose">If at restaurant, please enable location permissions and tap try again.</p>
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

          {/* ── UNIFIED HEADER (Categories + Search) ────────────────────── */}
          <div className="sticky top-0 z-50 bg-[#F9F7F4]/95 backdrop-blur-md px-4 lg:px-8 py-3 border-b border-[#3A241C]/5 flex items-center justify-start gap-2 lg:gap-4 w-full overflow-hidden">
            {!searchQuery && (
              <div
                className="flex-none w-auto max-w-[calc(100%-120px)] lg:max-w-[calc(100%-360px)] overflow-x-auto scrollbar-hide"
                style={{ maskImage: "linear-gradient(to right, black calc(100% - 30px), transparent 100%)", WebkitMaskImage: "linear-gradient(to right, black calc(100% - 30px), transparent 100%)" }}
              >
                <div className="flex gap-2 lg:gap-4 pr-2 lg:pr-4 pb-1 pt-1 w-max">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      id={`desktop-cat-btn-${cat}`}
                      onClick={() => scrollToCategory(cat)}
                      className={`px-4 lg:px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm transition-colors duration-150 ease-out whitespace-nowrap flex-shrink-0 ${activeCategory === cat ? "bg-[#3A241C] text-white border-[#3A241C]" : "bg-white text-[#3A241C]/40 hover:bg-[#3A241C] hover:text-white border-[#3A241C]/5"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <motion.div
              animate={{
                scale: isSearchFocused ? 1.01 : 1,
                boxShadow: isSearchFocused ? "0 10px 30px rgba(58,36,28,0.08)" : "0 4px 12px rgba(58,36,28,0.03)"
              }}
              className={`flex items-center gap-2 lg:gap-3 bg-white px-3 lg:px-4 h-10 lg:h-12 rounded-2xl border-2 transition-all duration-150 ease-out ${isSearchFocused ? "border-[#E76F51]" : "border-[#3A241C]/5"} flex-1 ${searchQuery ? "w-full" : "lg:flex-none lg:w-[340px]"} flex-shrink-0 min-w-[100px]`}
            >
              <motion.div animate={{ rotate: isSearchFocused ? 90 : 0, color: isSearchFocused ? "#E76F51" : "#3A241C4d" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lg:w-[18px] lg:h-[18px]"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </motion.div>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="flex-1 w-full min-w-0 bg-transparent border-none focus:border-none focus:ring-0 focus:ring-transparent outline-none focus:outline-none focus-visible:outline-none shadow-none appearance-none text-[13px] lg:text-sm font-bold text-[#3A241C] placeholder:text-[#3A241C]/30"
                style={{ outline: 'none', boxShadow: 'none' }}
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} onClick={() => setSearchQuery("")} className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-[#3A241C]/5 flex items-center justify-center text-[#3A241C]/40 hover:bg-[#E76F51]/10 hover:text-[#E76F51] transition-colors"><X size={12} className="lg:w-[14px] lg:h-[14px]" /></motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="p-4 lg:p-8 pb-32 lg:pb-16 space-y-12 lg:y-20">
            {filteredCategories.slice(0, searchQuery ? categories.length : visibleCategoriesCount).map((cat) => (
              <MenuSection
                key={cat}
                category={cat}
                items={filteredMenuItems.filter(m => m.category === cat)}
                lang={lang}
                onAdd={addToCart}
                onToggleLang={() => setLang(l => l === "EN" ? "HI" : "EN")}
                isRestaurantOpen={restaurantStatus.isOpen || !!restaurantStatus.closingAt}
                sectionRef={(el) => { categoryRefs.current[cat] = el; }}
              />
            ))}

            {!searchQuery && visibleCategoriesCount < categories.length && (
              <div ref={loadMoreRef} className="h-40 flex items-center justify-center pb-20">
                <Loader2 size={32} className="animate-spin text-[#E76F51]/20" />
              </div>
            )}

            {searchQuery && filteredMenuItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-20 flex flex-col items-center justify-center text-center px-6"
              >
                <div className="w-16 h-16 bg-[#3A241C]/5 rounded-full flex items-center justify-center text-[#3A241C]/20 mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </div>
                <h3 className="text-lg font-black text-[#3A241C] uppercase tracking-widest mb-2">No Matches Found</h3>
                <p className="text-xs font-bold text-[#3A241C]/30 uppercase tracking-widest leading-loose">We couldn't find any dishes matching "{searchQuery}"</p>
              </motion.div>
            )}
          </div>
        </main>

        {/* Desktop Cart */}
        <aside className="hidden lg:flex w-[550px] p-8 flex-col h-full pr-12 relative">
          <div className="absolute top-1/2 right-20 w-72 h-72 bg-[#E76F51]/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2" />
          <div className="flex-1 bg-white/90 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_30px_100px_-20px_rgba(58,36,28,0.1)] border border-white/60 overflow-hidden flex flex-col ml-4 relative z-10 min-h-0">
            <CartContent {...commonCartProps} onFeedbackSubmit={handleFeedbackSubmit} />
          </div>
        </aside>

        {/* Mobile Cart UI - Synchronized and Butter Smooth */}
        <AnimatePresence initial={false}>
          {!showCartMobile && (cartCount > 0 || orderPlaced || remaining > 0 || session?.paymentReminder) && (
            <motion.div
              key="cart-trigger"
              initial={{ y: 150, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 150, opacity: 0 }}
              transition={menuTransition}
              className="lg:hidden fixed bottom-8 left-6 right-6 z-[120] transform-gpu translate-z-0"
            >
              <motion.button
                key={`cart-trigger-${cartCount}-${orderPlaced}`}
                initial={{ scale: 1 }}
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowCartMobile(true)}
                className="w-full h-16 bg-[#3A241C] text-white rounded-[2.5rem] flex items-center justify-between px-8 shadow-[0_20px_50px_rgba(58,36,28,0.3)] border border-white/5 overflow-hidden relative touch-none select-none"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full ${orderPlaced || remaining > 0 ? 'bg-[#6A994E]' : 'bg-[#E76F51]'} flex items-center justify-center text-[11px] font-black`}>
                    {orderPlaced || remaining > 0 ? <Package size={14} /> : cartCount}
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-widest">
                    {orderPlaced || remaining > 0 ? "View Status & Bill" : "Cart Items"}
                  </span>
                </div>
                <span className="font-black text-sm tracking-tight">
                  {orderPlaced ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold opacity-60 uppercase">
                        {(session?.orders ?? []).some(o => o.items.some(i => !i.isServed) && o.status !== "CANCELLED") ? "Preparing" : "Served"}
                      </span>
                      {remaining > 0 ? `₹${remaining}` : ""}
                    </div>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <AnimatedAmount value={cartTotal} />
                    </span>
                  )}
                </span>
              </motion.button>
            </motion.div>
          )}

          {showCartMobile && (
            <div key="cart-drawer-container">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setShowCartMobile(false)}
                className="lg:hidden fixed inset-0 z-[60] bg-[#3A241C]/40 backdrop-blur-sm transform-gpu"
              />
              <motion.div
                ref={drawerRef}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={menuTransition}
                onAnimationComplete={() => {
                  if (drawerRef.current) {
                    drawerRef.current.style.transform = '';
                    drawerRef.current.style.transition = '';
                  }
                }}
                style={{ willChange: "transform", overscrollBehavior: "contain" }}
                className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] bg-white rounded-t-[3rem] max-h-[92vh] flex flex-col shadow-[0_-10px_60px_rgba(58,36,28,0.15)] overflow-hidden transform-gpu"
              >
                {/* Drag Handle — touch-none prevents browser gestures */}
                <div 
                  onTouchStart={handleDrawerTouchStart}
                  onTouchMove={handleDrawerTouchMove}
                  onTouchEnd={handleDrawerTouchEnd}
                  className="flex justify-center py-6 cursor-grab active:cursor-grabbing touch-none z-20 select-none"
                >
                  <div className="w-12 h-1.5 bg-[#3A241C]/10 rounded-full" />
                </div>
                <div 
                  ref={drawerScrollRef}
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                  style={{ overscrollBehavior: "contain" }}
                  onTouchStart={handleDrawerTouchStart}
                  onTouchMove={handleDrawerTouchMove}
                  onTouchEnd={handleDrawerTouchEnd}
                >
                  <CartContent 
                    {...commonCartProps} 
                    onFeedbackSubmit={handleFeedbackSubmit} 
                    mobileFooter={
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
                    }
                  />
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
              key="premium-toast"
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              className="fixed top-24 lg:top-12 left-0 right-0 mx-auto w-fit max-w-[90vw] z-[200] px-6 transform-gpu translate-z-0 pointer-events-none"
            >
              <div className="bg-[#3A241C] text-white p-3 lg:p-4 rounded-2xl flex items-center gap-3 lg:gap-4 shadow-2xl border border-white/10 pointer-events-auto backdrop-blur-xl">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md flex-shrink-0">
                  <Bell size={18} className="text-white" />
                </div>
                <div className="flex-1 text-left pr-2">
                  <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest leading-tight">{toast}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
