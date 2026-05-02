"use client";

import React, { memo } from "react";
import { ShoppingCart } from "lucide-react";
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
  onPlaceOrder: () => void;
  onRemove: (id: string, packing: boolean, variant?: string) => void;
  onAdd: (item: any, variant?: string) => void;
  onDelete: (id: string, packing: boolean, variant?: string) => void;
  onTogglePacking: (id: string, current: boolean, variant?: string) => void;
  remaining: number;
  paymentMode: "UPI" | "CASH" | null;
  setPaymentMode: (mode: "UPI" | "CASH" | null) => void;
  handleUPIPayment: () => void;
  handleCashPayment: () => void;
  payingUPI: boolean;
  payingCash: boolean;
  clientId: string;
  cartLocked: boolean;
  lockedBy: string | null;
  handleRateItem: (name: string, rating: number) => void;
  ratings: Record<string, number>;
  ratedItems: Set<string>;
  isTakeaway: boolean;
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
  isTakeaway
}: CartContentProps) => {
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

  const sessionTotal = session?.orders.reduce(
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
      />
    );
  }

  return (
    <div className="flex flex-col h-full relative transform-gpu translate-z-0">
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
        className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 touch-auto px-6 lg:px-10 pt-4 pb-32 lg:pb-10 transform-gpu"
        style={{ willChange: "transform" }}
      >
        
        {/* Bill Summary Row */}
        {session && session.orders.length > 0 && (
          <div className="w-full mb-8 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#F9F7F4] p-4 rounded-2xl border border-[#3A241C]/5 flex flex-col justify-center">
                <p className="text-[7px] font-black text-[#3A241C]/40 uppercase tracking-[0.2em] mb-1.5">Total Bill</p>
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
          </div>
        )}

        {/* BASKET ITEMS */}
        <div className="flex-1">
          {cart.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#3A241C]/30 h-full relative">
              <div className="w-24 h-24 rounded-full bg-[#F9F7F4] flex items-center justify-center mb-6 shadow-inner border border-[#3A241C]/5">
                <ShoppingCart size={40} className="text-[#3A241C]/20" />
              </div>
              <h3 className="font-black text-lg text-[#3A241C]/40 tracking-tight mb-2">Basket is Empty</h3>
              <p className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.3em] text-[#3A241C]/20 text-center leading-loose">
                Add some delicious items<br/>from the menu
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedCartArray.map((group: any) => (
                <div key={group.name} className="space-y-3 mb-8 last:mb-0">
                  <h3 className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em] text-[#3A241C]/40 ml-2">
                    {group.isMe ? "Added by You" : `Added by ${group.name}`}
                  </h3>
                  <div className="space-y-2">
                    <AnimatePresence initial={false} mode="popLayout">
                      {group.items.map((item: any) => (
                        <CartItem 
                          key={`${item.id}-${item.forPacking}-${item.variant}`}
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TOTALS BOX */}
        <AnimatePresence>
          {cart.length > 0 && (
            <OrderSummary 
              cartSubtotal={cartSubtotal}
              packingCharges={packingCharges}
              cartTotal={cartTotal}
              ordering={ordering}
              cartLocked={cartLocked}
              lockedBy={lockedBy}
              clientId={clientId}
              onPlaceOrder={onPlaceOrder}
            />
          )}
        </AnimatePresence>

        {/* ORDER HISTORY */}
        <OrderHistory orders={session?.orders} isTakeawayMode={isTakeaway} />
      </div>
    </div>
  );
};

export default memo(CartContent);
