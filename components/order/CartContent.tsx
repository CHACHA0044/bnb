"use client";

import React, { memo } from "react";
import { ShoppingCart, MessageSquare, Info, Banknote, QrCode, ChevronLeft, Phone, ArrowRight, Loader2, Receipt, X, Clock, Printer, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CartItem from "./CartItem";
import OrderSummary from "./OrderSummary";
import OrderHistory from "./OrderHistory";
import OrderSuccess from "./OrderSuccess";

interface CartContentProps {
  cart: any[];
  cartSubtotal: number;
  cartTotal: number;
  packingCharges: number;
  session: any;
  ordering: boolean;
  orderPlaced: boolean;
  setOrderPlaced: (val: boolean) => void;
  onPlaceOrder: (phoneNumber?: string) => Promise<void>;
  onRemove: (id: string, packing: boolean, variant?: string) => void;
  onAdd: (item: any, variant?: string) => void;
  onDelete: (id: string, packing: boolean, variant?: string) => void;
  onTogglePacking: (id: string, current: boolean, variant?: string) => void;
  remaining: number;
  paymentMode: "UPI" | "CASH" | null;
  setPaymentMode: (mode: "UPI" | "CASH" | null) => void;
  handleUPIPayment: () => void;
  handleCashPayment: (phone?: string) => void;
  payingUPI: boolean;
  payingCash: boolean;
  clientId: string;
  cartLocked: boolean;
  lockedBy: string | null;
  handleRateItem: (name: string, rating: number) => void;
  ratings: Record<string, number>;
  ratedItems: Set<string>;
  isTakeaway: boolean;
  instructionsRef: React.MutableRefObject<string>;
  deletedOrders: any[];
  isProcessingOrder: boolean;
  paymentSuccess: boolean;
  sessionClosed: boolean;
  showReviewPrompt: boolean;
  setShowReviewPrompt: (val: boolean) => void;
  onAnimationComplete: () => void;
  autoScrollToHistory?: boolean;
  onScrollComplete?: () => void;
  onFeedbackSubmit?: (feedback: string) => void;
  mobileFooter?: React.ReactNode;
  orderConfig?: { upiId: string } | null;
  tableId?: string;
}

const CartContent = ({
  cart,
  cartSubtotal,
  cartTotal,
  packingCharges,
  session,
  ordering,
  orderPlaced,
  setOrderPlaced,
  onPlaceOrder,
  onRemove,
  onAdd,
  onDelete,
  onTogglePacking,
  remaining,
  paymentMode,
  setPaymentMode,
  handleUPIPayment,
  handleCashPayment,
  payingUPI,
  payingCash,
  clientId,
  cartLocked,
  lockedBy,
  handleRateItem,
  ratings,
  ratedItems,
  isTakeaway,
  instructionsRef,
  deletedOrders,
  isProcessingOrder,
  paymentSuccess,
  sessionClosed,
  showReviewPrompt,
  setShowReviewPrompt,
  onAnimationComplete,
  autoScrollToHistory,
  onScrollComplete,
  onFeedbackSubmit,
  mobileFooter,
  orderConfig,
  tableId
}: CartContentProps) => {
  const [localInstructions, setLocalInstructions] = React.useState(instructionsRef.current);
  const [showPresets, setShowPresets] = React.useState(false);
  const [paymentStep, setPaymentStep] = React.useState<'CART' | 'SELECTION' | 'CASH_DETAILS'>('CART');
  const [showBill, setShowBill] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [phoneError, setPhoneError] = React.useState('');
  const presets = ["Make it spicy", "Less spicy", "Extra crispy", "No onion/garlic", "Extra chutney", "Extra sambar"];
  const contradictions: Record<string, string> = {
    "Make it spicy": "Less spicy",
    "Less spicy": "Make it spicy",
  };

  const handlePresetClick = (preset: string) => {
    let currentInstructions = localInstructions.trim();
    const presetLower = preset.toLowerCase();

    // Check if exactly this preset exists (case-insensitive) - split by comma now
    const parts = currentInstructions.split(/,\s*/).map(p => p.trim());
    const isPresent = parts.some(p => p.toLowerCase() === presetLower);

    if (isPresent) {
      // Remove it
      const filteredParts = parts.filter(p => p.toLowerCase() !== presetLower);
      currentInstructions = filteredParts.join(', ');
    } else {
      // Add it
      if (currentInstructions) {
        currentInstructions = `${currentInstructions}, ${preset.toLowerCase()}`;
      } else {
        currentInstructions = preset;
      }
    }

    // Professional formatting
    if (currentInstructions) {
      currentInstructions = currentInstructions.replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim();
      currentInstructions = currentInstructions.charAt(0).toUpperCase() + currentInstructions.slice(1);
    }

    const val = currentInstructions.slice(0, 100);
    setLocalInstructions(val);
    instructionsRef.current = val;
  };

  // Sync parent clear to local
  React.useEffect(() => {
    if (instructionsRef.current === "" && localInstructions !== "") {
      setLocalInstructions("");
    }
  }, [instructionsRef.current]);

  // Auto-reset payment step if cart becomes empty or balance is settled
  React.useEffect(() => {
    if (paymentStep !== 'CART' && cart.length === 0 && remaining === 0) {
      setPaymentStep('CART');
    }
  }, [cart.length, remaining, paymentStep]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (autoScrollToHistory) {
      const timer = setTimeout(() => {
        const historyEl = document.getElementById('order-history-section');
        if (historyEl && scrollContainerRef.current) {
          // Direct scroll calculation for better reliability on mobile drawers
          const container = scrollContainerRef.current;
          const rect = historyEl.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const targetOffset = container.scrollTop + (rect.top - containerRect.top) - 20;

          container.scrollTo({
            top: targetOffset,
            behavior: 'smooth'
          });
          onScrollComplete?.();
        }
      }, 800); // More generous timeout for mobile drawer animations
      return () => clearTimeout(timer);
    }
  }, [autoScrollToHistory, onScrollComplete]);

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const groupedCart = cart.reduce((acc: any, item: any) => {
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

  const sessionTotal = session?.orders
    .filter((o: any) => o.status !== "CANCELLED")
    .reduce(
      (sum: number, o: any) => sum + o.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0) + (o.packingCharges || 0), 0
    ) || 0;
  const paidTotal = session?.payments
    .filter((p: any) => p.status === "CONFIRMED")
    .reduce((s: number, p: any) => s + p.amount, 0) || 0;

  if (orderPlaced) {
    return (
      <OrderSuccess
        session={session}
        remaining={remaining}
        onAddMore={() => setOrderPlaced(false)}
        onPaymentModeChange={setPaymentMode}
        paymentMode={paymentMode}
        onUPIPayment={handleUPIPayment}
        onCashPayment={handleCashPayment}
        payingUPI={payingUPI}
        payingCash={payingCash}
        onRateItem={handleRateItem}
        ratings={ratings}
        ratedItems={ratedItems}
        isTakeaway={isTakeaway}
        isProcessingOrder={isProcessingOrder}
        deletedOrders={deletedOrders}
        paymentSuccess={paymentSuccess}
        sessionClosed={sessionClosed}
        showReviewPrompt={showReviewPrompt}
        setShowReviewPrompt={setShowReviewPrompt}
        onFeedbackSubmit={onFeedbackSubmit}
        orderConfig={orderConfig}
      />
    );
  }

  return (
    <div className="flex flex-col w-full lg:flex-1 lg:min-h-0 lg:h-full no-print">
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

      {/* SCROLLABLE AREA - Hardware Accelerated */}
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto custom-scrollbar touch-auto px-6 lg:px-10 pt-4 pb-6 lg:pb-16 flex-1 min-h-0"
        style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
      >

        {/* Bill Summary Row */}
        {session && sessionTotal > 0 && (
          <div className="w-full mb-8 space-y-4 no-print">
            <div className="grid grid-cols-3 gap-2">
              <div
                onClick={() => remaining === 0 && setShowBill(true)}
                className={`bg-[#F9F7F4] p-2.5 lg:p-3 rounded-2xl border border-[#3A241C]/10 flex flex-col justify-center transition-all group ${remaining === 0 ? 'cursor-pointer hover:bg-[#F9F7F4]/80 active:scale-95' : 'opacity-80'}`}
              >
                <p className="text-[7px] font-black text-[#3A241C]/60 uppercase tracking-[0.2em] mb-1">Total Bill</p>
                <p className="text-sm lg:text-base font-black text-[#3A241C]">₹{sessionTotal}</p>
                {remaining === 0 && (
                  <p className="text-[6px] font-bold text-[#E76F51] uppercase tracking-widest mt-0.5 group-hover:underline">View Details</p>
                )}
              </div>
              <div className="bg-[#6A994E]/5 p-2.5 lg:p-3 rounded-2xl border border-[#6A994E]/20 flex flex-col justify-center">
                <p className="text-[7px] font-black text-[#6A994E]/70 uppercase tracking-[0.2em] mb-1">Paid</p>
                <p className="text-sm lg:text-base font-black text-[#6A994E]">₹{paidTotal}</p>
              </div>
              <div
                onClick={() => {
                  if (remaining > 0) {
                    // Place order in background and show payment immediately
                    onPlaceOrder();
                    setOrderPlaced(true);
                  }
                }}
                className={`bg-[#E76F51]/5 p-2.5 lg:p-3 rounded-2xl border border-[#E76F51]/20 flex flex-col justify-center ring-2 ring-[#E76F51]/5 transition-all active:scale-95 ${remaining > 0 ? 'cursor-pointer hover:bg-[#E76F51]/10' : 'opacity-50'}`}
              >
                <p className="text-[7px] font-black text-[#E76F51]/80 uppercase tracking-[0.2em] mb-1">Balance</p>
                <p className="text-sm lg:text-base font-black text-[#3A241C]">₹{remaining}</p>
                {remaining > 0 && (
                  <p className="text-[6px] font-bold text-[#E76F51] uppercase tracking-widest mt-0.5 group-hover:underline">Click to Pay</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BASKET ITEMS OR PAYMENT FLOW */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {paymentStep === 'SELECTION' ? (
              <motion.div
                key="payment-selection"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="py-8 space-y-6"
              >
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => setPaymentStep('CART')}
                    className="w-11 h-11 rounded-2xl bg-[#3A241C]/5 flex items-center justify-center text-[#3A241C]/60 hover:bg-[#3A241C]/10 transition-all active:scale-90"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <div>
                    <h3 className="font-black text-2xl text-[#3A241C] tracking-tight leading-none mb-1">Choose Payment</h3>
                    <p className="text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em]">Select your method</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div
                    onClick={() => {
                      if (ordering) return;
                      setPaymentMode('UPI');
                      setOrderPlaced(true); // Show QR screen immediately
                    }}
                    className={`w-full p-5 bg-white rounded-3xl border-2 transition-all flex items-center gap-5 group cursor-pointer shadow-sm hover:shadow-xl active:scale-[0.98] ${ordering ? 'opacity-50 pointer-events-none' : 'border-[#3A241C]/5 hover:border-[#E76F51]/30'}`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#E76F51]/10 flex items-center justify-center text-[#E76F51] group-hover:bg-[#E76F51] group-hover:text-white transition-all duration-300">
                      <QrCode size={28} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-black text-base text-[#3A241C] tracking-tight">UPI</h4>
                        {!ordering && <span className="px-2 py-0.5 bg-[#6A994E]/10 text-[#6A994E] text-[8px] font-black uppercase tracking-widest rounded-md">Suggested</span>}
                      </div>
                      <p className="text-[10px] font-bold text-[#3A241C]/30 uppercase tracking-widest">Scan and pay instantly</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#3A241C]/5 flex items-center justify-center text-[#3A241C]/20 group-hover:bg-[#E76F51]/10 group-hover:text-[#E76F51] transition-all">
                      <ArrowRight size={16} />
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      if (ordering) return;
                      setPaymentStep('CASH_DETAILS');
                    }}
                    className={`w-full p-5 bg-white rounded-3xl border-2 transition-all flex items-center gap-5 group cursor-pointer shadow-sm hover:shadow-xl active:scale-[0.98] ${ordering ? 'opacity-50 pointer-events-none' : 'border-[#3A241C]/5 hover:border-[#3A241C]/30'}`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#3A241C]/5 flex items-center justify-center text-[#3A241C]/30 group-hover:bg-[#3A241C] group-hover:text-white transition-all duration-300">
                      <Banknote size={28} />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-black text-base text-[#3A241C] tracking-tight">Cash Payment</h4>
                      <p className="text-[10px] font-bold text-[#3A241C]/30 uppercase tracking-widest">Pay at counter or to staff</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#3A241C]/5 flex items-center justify-center text-[#3A241C]/20 group-hover:bg-[#3A241C]/10 group-hover:text-[#3A241C] transition-all">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col items-center gap-2 opacity-40">
                  <div className="flex items-center gap-2">
                    <div className="h-px w-8 bg-[#3A241C]" />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#3A241C]">Secure Checkout</span>
                    <div className="h-px w-8 bg-[#3A241C]" />
                  </div>
                  <p className="text-[7px] font-bold text-[#3A241C] uppercase tracking-widest">Orders are synchronized in real-time</p>
                </div>
              </motion.div>
            ) : paymentStep === 'CASH_DETAILS' ? (
              <motion.div
                key="cash-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="py-8 space-y-6"
              >
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => setPaymentStep('SELECTION')}
                    className="w-11 h-11 rounded-2xl bg-[#3A241C]/5 flex items-center justify-center text-[#3A241C]/60 hover:bg-[#3A241C]/10 transition-all active:scale-90"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <div>
                    <h3 className="font-black text-2xl text-[#3A241C] tracking-tight leading-none mb-1">Cash Payment</h3>
                    <p className="text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em]">Enter contact details</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 ml-2">Phone Number</label>
                    <div className={`flex items-center gap-4 bg-white p-4 rounded-2xl border transition-all ${phoneError ? 'border-red-500' : 'border-[#3A241C]/5 focus-within:border-[#3A241C]/20'}`}>
                      <Phone size={20} className="text-[#3A241C]/20 flex-shrink-0" />
                      <div className="flex items-center flex-1">
                        <span className="text-sm font-black text-[#3A241C]/40 mr-2">+91</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={phoneNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setPhoneNumber(val);
                            if (val.length === 10) setPhoneError('');
                          }}
                          placeholder="00000 00000"
                          className="flex-1 bg-transparent border-none !border-0 p-0 m-0 outline-none !outline-none focus:ring-0 !ring-0 font-black text-base text-[#3A241C] placeholder:text-[#3A241C]/10 shadow-none appearance-none"
                        />
                      </div>
                    </div>
                    {phoneError && (
                      <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-2">{phoneError}</p>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={ordering}
                    onClick={() => {
                      if (phoneNumber.length !== 10) {
                        setPhoneError('Please enter a valid 10-digit number');
                        return;
                      }
                      setPaymentMode('CASH');
                      handleCashPayment(phoneNumber);
                    }}
                    className={`w-full h-16 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all ${ordering ? 'bg-[#3A241C]/50 cursor-not-allowed' : 'bg-[#3A241C] text-white shadow-[#3A241C]/20'}`}
                  >
                    {ordering ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>Confirm Cash Order <ArrowRight size={18} /></>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ) : cart.length === 0 ? (
              <motion.div
                key="empty-cart"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-20 flex flex-col items-center justify-center text-[#3A241C]/30 h-full relative"
              >
                <div className="relative mb-8">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-[#E76F51]/10 rounded-full blur-2xl"
                  />
                  <div className="relative w-28 h-28 rounded-[2.5rem] bg-white flex items-center justify-center shadow-[0_20px_50px_rgba(58,36,28,0.05)] border border-[#3A241C]/5">
                    <ShoppingCart size={48} className="text-[#3A241C]/10" />
                    <motion.div
                      initial={{ x: -5, y: -5, opacity: 0 }}
                      animate={{ x: 0, y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="absolute -top-1 -right-1 w-8 h-8 bg-[#F9F7F4] rounded-full border-4 border-white flex items-center justify-center"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E76F51]/30" />
                    </motion.div>
                  </div>
                </div>
                <h3 className="font-black text-2xl text-[#3A241C]/30 tracking-tighter uppercase mb-3">Your Basket is Empty</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3A241C]/20 text-center leading-loose max-w-[200px]">
                  Browse our menu and add your favorite dishes to start your meal
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="cart-items"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {groupedCartArray.map((group: any) => (
                  <motion.div layout key={group.name} className="space-y-3 mb-8 last:mb-0">
                    <h3 className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em] text-[#3A241C]/40 ml-2">
                      {group.isMe ? "Added by You" : `Added by ${group.name}`}
                    </h3>
                    <div className="space-y-2">
                      <AnimatePresence initial={false} mode="popLayout">
                        {group.items.map((item: any) => (
                          <CartItem
                            key={item.cartItemId || `${item.id}-${item.forPacking}-${item.variant}`}
                            item={item}
                            isTakeaway={isTakeaway}
                            cartLocked={cartLocked}
                            clientId={clientId}
                            onRemove={onRemove}
                            onAdd={onAdd}
                            onDelete={onDelete}
                            onTogglePacking={onTogglePacking}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* INSTRUCTIONS PILL */}
        <AnimatePresence>
          {cart.length > 0 && paymentStep === 'CART' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 mb-1"
            >
              <div className="relative group">
                <div className={`flex flex-col bg-white p-3 lg:p-4 rounded-[1.25rem] lg:rounded-2xl border border-[rgba(58,36,28,0.12)] shadow-sm transition-all duration-300 ${localInstructions ? 'bg-[#F9F7F4]/20' : ''}`}>
                  <div className="flex items-start gap-3 lg:gap-4 w-full">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-[#3A241C]/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageSquare size={13} className={`transition-colors ${localInstructions ? 'text-[#E76F51]' : 'text-[#3A241C]/20'}`} />
                      </div>
                      <button
                        onClick={() => setShowPresets(!showPresets)}
                        className={`w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${showPresets ? 'bg-[#E76F51] text-white shadow-md' : 'bg-[#3A241C]/5 text-[#3A241C]/40 hover:bg-[#3A241C]/10'}`}
                      >
                        <Info size={13} />
                      </button>
                    </div>

                    <div className="flex-1 relative pt-1.5 lg:pt-2">
                      {!localInstructions && (
                        <div className="absolute inset-0 flex flex-col justify-center pointer-events-none select-none">
                          <span className="text-[10px] lg:text-[11px] font-black tracking-wide text-[#3A241C]/50 leading-none">
                            Cooking Instructions
                          </span>
                          <span className="text-[8px] lg:text-[9px] font-bold text-[#3A241C]/40 tracking-wide leading-none mt-1">
                            We will try to implement them as best as possible
                          </span>
                        </div>
                      )}
                      <textarea
                        value={localInstructions}
                        onChange={(e) => {
                          const val = e.target.value.slice(0, 100);
                          setLocalInstructions(val);
                          instructionsRef.current = val;
                        }}
                        maxLength={100}
                        rows={1}
                        wrap="off"
                        spellCheck={false}
                        style={{
                          border: 'none',
                          outline: 'none',
                          boxShadow: 'none',
                          WebkitAppearance: 'none',
                          whiteSpace: 'nowrap',
                          overflowX: 'auto'
                        }}
                        className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus:ring-transparent text-xs lg:text-sm font-semibold text-[#3A241C] resize-none p-0 placeholder:text-transparent appearance-none shadow-none custom-scrollbar-hide"
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {showPresets && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="overflow-hidden w-full py-1"
                      >
                        <div className="flex overflow-x-auto gap-2 pb-2 pt-1 px-0.5 custom-scrollbar">
                          {presets.map((p, idx) => {
                            const lowerInstr = localInstructions.toLowerCase();
                            const isSelected = lowerInstr.split(/,\s*/).some(part => part.trim() === p.toLowerCase());
                            const contra = contradictions[p];
                            const isContradicting = contra && lowerInstr.split(/,\s*/).some(part => part.trim() === contra.toLowerCase());

                            return (
                              <motion.button
                                key={p}
                                whileTap={{ scale: 0.95 }}
                                animate={isSelected ? { scale: 1.02 } : { scale: 1 }}
                                disabled={!!isContradicting}
                                onClick={() => handlePresetClick(p)}
                                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${isSelected ? 'bg-[#E76F51]/10 text-[#E76F51] border-[#E76F51]/30 shadow-sm' : isContradicting ? 'bg-[#3A241C]/5 text-[#3A241C]/30 border-transparent opacity-50 cursor-not-allowed' : 'bg-[#3A241C]/5 text-[#3A241C]/60 border-transparent hover:bg-[#3A241C]/10'}`}
                              >
                                {isSelected && <Check size={12} className="stroke-[3]" />}
                                {p}
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {localInstructions.length >= 100 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[7px] font-black text-[#E76F51] uppercase tracking-widest mt-2 ml-14"
                  >
                    Limit of 100 characters reached
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOTALS BOX */}
        <AnimatePresence>
          {cart.length > 0 && paymentStep === 'CART' && (
            <OrderSummary
              cartSubtotal={cartSubtotal}
              packingCharges={packingCharges}
              cartTotal={cartTotal}
              ordering={ordering}
              cartLocked={cartLocked}
              lockedBy={lockedBy}
              clientId={clientId}
              onPlaceOrder={async () => {
                try {
                  // Fire and forget - order is sent in background
                  // Immediately show payment screen while order is being submitted
                  onPlaceOrder();
                  setPaymentStep('SELECTION');
                } catch (e) {
                  // Swallowed: already toasted by parent
                }
              }}
              onAnimationComplete={onAnimationComplete}
              isProceedOnly={true}
            />
          )}
        </AnimatePresence>

        {/* ORDER HISTORY */}
        <OrderHistory
          orders={session?.orders}
          isTakeawayMode={isTakeaway}
          onRateItem={handleRateItem}
          ratings={ratings}
          ratedItems={ratedItems}
          onFeedbackSubmit={onFeedbackSubmit}
          sessionFeedback={session?.feedback}
        />

        {/* Mobile bottom footer (e.g. Continue Browsing button) */}
        {mobileFooter && (
          <div className="lg:hidden w-full pt-1 pb-4">
            {mobileFooter}
          </div>
        )}
      </div>

      {/* DETAILED BILL MODAL */}
      <AnimatePresence>
        {showBill && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 lg:p-12 print:p-0 print:static">
            <style jsx global>{`
              @media print {
                /* Aggressively hide everything except the bill */
                body > *:not(.bill-portal) { display: none !important; }
                #print-bill-root, #print-bill-root * { display: block !important; visibility: visible !important; }
                
                /* Reset body for print */
                body { 
                  visibility: hidden !important; 
                  background: white !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }

                .bill-to-print { 
                  visibility: visible !important;
                  display: block !important;
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 40px !important;
                  height: auto !important;
                  box-shadow: none !important;
                  border: none !important;
                  border-radius: 0 !important;
                  background: white !important;
                }
                
                .bill-to-print * { visibility: visible !important; }
                .no-print { display: none !important; }
                .bill-scroll-area { overflow: visible !important; max-height: none !important; }
                
                /* Hide the close button and print button on the printed page */
                .no-print-element { display: none !important; }
              }
            `}</style>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBill(false)}
              className="absolute inset-0 bg-[#3A241C]/60 backdrop-blur-md no-print"
            />

            <motion.div
              id="print-bill-root"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-[calc(100%-2rem)] md:max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] bill-to-print mx-4 my-6 lg:my-10"
            >
              {/* BILL HEADER */}
              <div className="bg-[#3A241C] text-white p-8 pb-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 no-print no-print-element">
                  <button onClick={() => setShowBill(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Receipt size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight leading-none mb-2">Order Bill</h2>
                    <div className="flex items-center gap-4 opacity-60">
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-white/30" />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest">Table {tableId || "T1"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BILL ITEMS - SCROLLABLE */}
              <div className="flex-1 overflow-y-auto overscroll-contain bill-scroll-area custom-scrollbar p-6 lg:p-8 pt-4 lg:pt-6">
                <div className="space-y-6">
                  {/* Group items across all orders */}
                  {(() => {
                    const allItems = session?.orders
                      .filter((o: any) => o.status !== "CANCELLED")
                      .flatMap((o: any) => o.items) || [];

                    const grouped = allItems.reduce((acc: any, it: any) => {
                      const key = `${it.name}-${it.variant || ''}`;
                      if (!acc[key]) acc[key] = { ...it };
                      else acc[key].quantity += it.quantity;
                      return acc;
                    }, {});

                    return Object.values(grouped).map((it: any, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-black text-sm text-[#3A241C] leading-tight mb-1">{it.name}</h4>
                          <p className="text-[10px] font-bold text-[#3A241C]/40 uppercase tracking-widest">₹{it.price} x {it.quantity}</p>
                        </div>
                        <span className="font-black text-sm text-[#3A241C]">₹{it.price * it.quantity}</span>
                      </div>
                    ));
                  })()}

                  {/* Packing Charges if any */}
                  {(() => {
                    const totalPacking = session?.orders
                      .filter((o: any) => o.status !== "CANCELLED")
                      .reduce((sum: number, o: any) => sum + (o.packingCharges || 0), 0) || 0;

                    if (totalPacking === 0) return null;
                    return (
                      <div className="flex justify-between items-center py-4 border-t border-[#3A241C]/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40">Packing Charges</span>
                        <span className="font-black text-sm text-[#3A241C]">₹{totalPacking}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* PAYMENT METHODS */}
                {(session?.payments?.length ?? 0) > 0 && (
                  <div className="mt-8 pt-6 border-t-2 border-dashed border-[#3A241C]/5">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#3A241C]/30 mb-4">Payment History</h5>
                    <div className="space-y-3">
                      {session.payments.filter((p: any) => p.status === "CONFIRMED").map((p: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-[#F9F7F4] p-3 rounded-xl border border-[#3A241C]/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#3A241C]/40 shadow-sm">
                              {p.method === 'UPI' ? <QrCode size={14} /> : <Banknote size={14} />}
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-[#3A241C] uppercase tracking-widest">{p.method}</p>
                            </div>
                          </div>
                          <span className="text-sm font-black text-[#6A994E]">₹{p.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BILL TOTALS */}
              <div className="bg-[#F9F7F4] p-8 border-t border-[#3A241C]/5 no-print">
                <div className="space-y-4">
                  <div className="flex justify-between items-center opacity-60">
                    <span className="text-[10px] font-black uppercase tracking-widest">Paid Amount</span>
                    <span className="font-black text-sm tracking-tight text-[#6A994E]">₹{paidTotal}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase tracking-widest text-[#3A241C]/30 mb-1">Total Bill</span>
                      <span className="text-4xl font-black tracking-tighter text-[#3A241C]">₹{sessionTotal}</span>
                    </div>
                    {remaining > 0 ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#E76F51] mb-1">Balance</span>
                        <span className="text-2xl font-black tracking-tighter text-[#E76F51]">₹{remaining}</span>
                      </div>
                    ) : (
                      <div className="bg-[#6A994E]/10 text-[#6A994E] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        Fully Paid
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full mt-8 h-14 rounded-2xl bg-[#3A241C] text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-[#3A241C]/20 active:scale-[0.98] transition-all no-print no-print-element"
                >
                  <Printer size={18} /> Print Invoice
                </button>
              </div>

              {/* PRINT-ONLY TOTALS */}
              <div className="hidden print:block p-8 bg-[#F9F7F4] border-t-4 border-double border-[#3A241C]/10">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#3A241C]/40 mb-1">Total Amount Paid</p>
                    <p className="text-4xl font-black text-[#3A241C] tracking-tighter">₹{sessionTotal}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#6A994E] mb-1">Status</p>
                    <p className="text-xl font-black text-[#6A994E] tracking-widest uppercase">Fully Paid</p>
                  </div>
                </div>
                <div className="mt-8 text-center border-t border-[#3A241C]/5 pt-6">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#3A241C]/20">Thank you for visiting Benne n Beans!</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(CartContent);
