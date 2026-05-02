"use client";

import React, { memo } from "react";

interface OrderHistoryProps {
  orders: any[];
  isTakeawayMode: boolean;
}

const OrderHistory = ({ orders, isTakeawayMode }: OrderHistoryProps) => {
  if (!orders || orders.length === 0) return null;

  return (
    <div className="pt-8 border-t border-[#3A241C]/5">
      <h3 className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.4em] text-[#3A241C]/20 mb-6">Order History</h3>
      <div className="space-y-4">
        {[...orders]
          .sort((a, b) => {
            if (a.status !== 'SERVED' && b.status === 'SERVED') return -1;
            if (a.status === 'SERVED' && b.status !== 'SERVED') return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
          .map((order: any) => {
            const isTakeawayOrder = order.items.some((it: any) => it.name.toLowerCase().includes("(to-go)"));
            const isReady = order.status === 'SERVED' && isTakeawayOrder;
            const displayStatus = isReady ? "READY" : order.status;
            const isServed = order.status === 'SERVED';

            return (
              <div 
                key={order.id} 
                className={`p-5 lg:p-6 border transition-all duration-500 ${
                  isServed 
                    ? 'bg-[#F9F7F4]/60 border-[#3A241C]/10 opacity-80' 
                    : 'bg-white border-[#3A241C]/10 shadow-lg shadow-[#3A241C]/5'
                } rounded-[1.5rem] lg:rounded-[2rem]`}
              >
                <div className="flex justify-between items-center mb-3 lg:mb-4">
                  <span className={`text-[7px] lg:text-[8px] font-black uppercase tracking-widest px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-md lg:rounded-lg ${order.status === 'SERVED' ? 'bg-[#6A994E]/10 text-[#6A994E]' : 'bg-[#E76F51] text-white shadow-sm'}`}>{displayStatus}</span>
                  <span className="text-[8px] lg:text-[9px] font-black text-[#3A241C]/20">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {order.items.map((it: { name: string; price: number; quantity: number }, idx: number) => (
                  <div key={idx} className="flex justify-between text-[10px] lg:text-[11px] py-1.5 border-b border-[#3A241C]/5 last:border-b-0 last:mb-0">
                    <span className={`${isServed ? 'text-[#3A241C]/60' : 'text-[#3A241C]'} font-bold leading-tight`}>
                      {isTakeawayMode ? it.name.split('(')[0].trim() : it.name} 
                      <span className="text-[#3A241C]/30 ml-2 font-black tracking-widest">× {it.quantity}</span>
                    </span>
                    <span className={`font-black ${isServed ? 'text-[#3A241C]/30' : 'text-[#3A241C]/40'} tracking-tight`}>₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default memo(OrderHistory);
