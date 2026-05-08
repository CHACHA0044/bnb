import { Star } from "lucide-react";
import { memo } from "react";

interface OrderHistoryProps {
  orders: any[];
  isTakeawayMode: boolean;
  onRateItem?: (name: string, rating: number, orderId?: string) => void;
  ratings?: Record<string, number>;
  ratedItems?: Set<string>;
}

const OrderHistory = ({ orders, isTakeawayMode, onRateItem, ratings = {}, ratedItems = new Set() }: OrderHistoryProps) => {
  if (!orders || orders.length === 0) return null;

  return (
    <div id="order-history-section" className="pt-12 pb-10 border-t border-[#3A241C]/5">
      <h3 className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.4em] text-[#3A241C]/30 mb-6 px-2">Order History</h3>
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
                className={`p-3 lg:p-4 border transition-all duration-500 ${
                  isServed 
                    ? 'bg-[#F9F8F6] border-[#3A241C]/10 shadow-sm' 
                    : 'bg-white border-[#3A241C]/10 shadow-lg shadow-[#3A241C]/5'
                } rounded-[1.2rem] lg:rounded-[1.5rem]`}
              >
                <div className="flex justify-between items-center mb-2 lg:mb-3">
                  <span className={`text-[6px] lg:text-[7px] font-black uppercase tracking-widest px-1.5 lg:px-2 py-0.5 rounded-md ${order.status === 'SERVED' ? 'bg-[#6A994E]/20 text-[#6A994E]' : 'bg-[#E76F51] text-white shadow-sm'}`}>{displayStatus}</span>
                  <span className="text-[7px] lg:text-[8px] font-black text-[#3A241C]/30">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                <div className="space-y-4">
                  {order.items.map((it: { name: string; price: number; quantity: number }, idx: number) => {
                    const isRated = ratedItems.has(it.name);
                    const currentRating = ratings[it.name] || 0;
                    
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-[9px] lg:text-[10px] py-1 border-b border-[#3A241C]/5 last:border-b-0">
                          <span className={`${isServed ? 'text-[#3A241C]/60' : 'text-[#3A241C]'} font-bold leading-tight`}>
                            {isTakeawayMode ? it.name.split('(')[0].trim() : it.name} 
                            <span className="text-[#3A241C]/30 ml-2 font-black tracking-widest">× {it.quantity}</span>
                          </span>
                          <span className={`font-black ${isServed ? 'text-[#3A241C]/30' : 'text-[#3A241C]/40'} tracking-tight`}>₹{it.price * it.quantity}</span>
                        </div>
                        
                        {isServed && onRateItem && (() => {
                          const name = it.name.toLowerCase();
                          const isExcluded = name.includes("water") || 
                                           name.includes("soft drink") || 
                                           name.includes("coke") || 
                                           name.includes("pepsi") || 
                                           name.includes("sprite") || 
                                           name.includes("thums up");
                          if (isExcluded) return null;
                          
                          const ratingKey = `${order.id}-${it.name}`;
                          const isRated = ratedItems.has(ratingKey);
                          const currentRating = ratings[ratingKey] || 0;
                          
                          return (
                            <div className="flex items-center justify-between pl-1">
                              <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <div key={star} className="relative flex w-5 h-8 cursor-pointer group">
                                    {/* Background Star (Gray) */}
                                    <Star size={16} className="absolute inset-0 text-[#3A241C]/10" />
                                    
                                    {/* Colored Star (Foreground) */}
                                    {currentRating >= star - 0.5 && (
                                      <div className="absolute inset-0 overflow-hidden" style={{ width: currentRating >= star ? '100%' : '50%' }}>
                                        <Star size={16} className="fill-[#E76F51] text-[#E76F51]" />
                                      </div>
                                    )}

                                    {/* Hit Areas */}
                                    <button 
                                      disabled={isRated} 
                                      onClick={() => onRateItem(it.name, star - 0.5, order.id)} 
                                      className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer touch-manipulation opacity-0"
                                    />
                                    <button 
                                      disabled={isRated} 
                                      onClick={() => onRateItem(it.name, star, order.id)} 
                                      className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer touch-manipulation opacity-0"
                                    />
                                  </div>
                                ))}
                              </div>
                              {isRated && <span className="text-[6px] font-black text-[#6A994E] uppercase tracking-widest bg-[#6A994E]/5 px-1.5 py-0.5 rounded-md">Rated</span>}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default memo(OrderHistory);
