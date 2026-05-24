import { prisma } from "./prisma";
import { getRedisClient } from "./redis";

const SUMMARY_CACHE_PREFIX = "summary:";
const SUMMARY_CACHE_TTL = 60 * 30; // 30 minutes

/**
 * Check if the current time is within working hours.
 */
export function isWithinWorkingHours(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  return currentHour >= 15 && currentHour <= 23;
}

/**
 * Fetch a daily summary, checking Redis first.
 */
export async function getDailySummary(date: string) {
  try {
    const redis = await getRedisClient();
    const cached = await redis.get(`${SUMMARY_CACHE_PREFIX}${date}`);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error("[REDIS] Failed to read from cache in getDailySummary:", err);
  }

  const summary = await (prisma as any).dailySummary.findUnique({ where: { date } });
  if (summary) {
    try {
      const redis = await getRedisClient();
      await redis.set(`${SUMMARY_CACHE_PREFIX}${date}`, JSON.stringify(summary.data), {
        EX: SUMMARY_CACHE_TTL
      });
    } catch (err) {
      console.error("[REDIS] Failed to write to cache in getDailySummary:", err);
    }
    return summary.data;
  }
  return null;
}

/**
 * Generate or Update the DailySummary for a given date.
 */
export async function updateDailySummary(date: string) {
  try {
    const logs = await prisma.analyticsLog.findMany({
      where: {
        date,
        orderStatus: { notIn: ["REJECTED", "CANCELLED"] }
      },
      orderBy: { timestamp: "asc" },
    });

    if (logs.length === 0) return null;

    // 1. KPI Aggregation
    const totalRevenue = logs.reduce((sum: number, l: any) => sum + l.finalPrice + (l.packingCharges || 0), 0);
    const orderIds = new Set(logs.map((l: any) => l.orderId));
    const totalOrders = orderIds.size;
    const totalItems = logs.filter((l: any) => l.itemName !== "Packing Charges").reduce((sum: number, l: any) => sum + l.quantity, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const upiRevenue = logs.filter((l: any) => l.paymentMode === "UPI").reduce((sum: number, l: any) => sum + l.finalPrice, 0);
    const cashRevenue = logs.filter((l: any) => l.paymentMode === "CASH").reduce((sum: number, l: any) => sum + l.finalPrice, 0);
    const packingRevenue = logs.reduce((sum: number, l: any) => sum + (l.packingCharges || 0), 0);

    const dineInRevenue = logs.filter((l: any) => l.orderType === "DINE_IN").reduce((sum: number, l: any) => sum + l.finalPrice, 0);
    const takeawayRevenue = logs.filter((l: any) => l.orderType === "TAKEAWAY").reduce((sum: number, l: any) => sum + l.finalPrice, 0);

    // Performance Metrics (New)
    const confirmedOrders = logs.filter((l: any) => l.confirmationTime !== null);
    const avgConfirmationTime = confirmedOrders.length > 0 
      ? Math.round(confirmedOrders.reduce((sum: number, l: any) => sum + (l.confirmationTime || 0), 0) / confirmedOrders.length)
      : null;

    const servedOrders = logs.filter((l: any) => l.preparationTime !== null);
    const avgPreparationTime = servedOrders.length > 0
      ? Math.round(servedOrders.reduce((sum: number, l: any) => sum + (l.preparationTime || 0), 0) / servedOrders.length)
      : null;

    // 2. Hourly Heatmap
    const hourlyCounts = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i % 12 || 12} ${i < 12 ? "AM" : "PM"}`,
      orders: new Set<string>(),
      revenue: 0,
    }));

    logs.forEach((l: any) => {
      const hour = new Date(l.timestamp).getHours();
      hourlyCounts[hour].orders.add(l.orderId);
      hourlyCounts[hour].revenue += l.finalPrice;
    });

    const hourlyPattern = hourlyCounts.map(h => ({
      hour: h.hour,
      label: h.label,
      orderCount: h.orders.size,
      revenue: h.revenue,
    }));

    // 3. Top Items
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    logs.filter((l: any) => l.itemName !== "Packing Charges").forEach((l: any) => {
      const existing = itemMap.get(l.itemName) || { name: l.itemName, quantity: 0, revenue: 0 };
      existing.quantity += l.quantity;
      existing.revenue += l.finalPrice;
      itemMap.set(l.itemName, existing);
    });

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 15);

    // 4. Table Performance
    const tableMap = new Map<string, { tableId: string; orders: Set<string>; revenue: number }>();
    logs.forEach((l: any) => {
      const existing = tableMap.get(l.tableId) || { tableId: l.tableId, orders: new Set<string>(), revenue: 0 };
      existing.orders.add(l.orderId);
      existing.revenue += l.finalPrice;
      tableMap.set(l.tableId, existing);
    });

    const tablePerformance = Array.from(tableMap.values())
      .map(t => ({
        tableId: t.tableId,
        orderCount: t.orders.size,
        revenue: t.revenue,
        avgOrder: t.orders.size > 0 ? Math.round(t.revenue / t.orders.size) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const dailyRevenue = [{
      date,
      revenue: totalRevenue,
      upi: upiRevenue,
      cash: cashRevenue,
      orderCount: totalOrders,
    }];

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayIndex = new Date(date).getDay();
    const weekdayPattern = weekdays.map((day, i) => ({
      day,
      orderCount: i === dayIndex ? totalOrders : 0,
      revenue: i === dayIndex ? totalRevenue : 0,
      avgOrder: i === dayIndex && totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    }));

    const insights: any[] = [];
    
    // Peak Hour Insight
    const busiestHour = [...hourlyPattern].sort((a, b) => b.orderCount - a.orderCount)[0];
    if (busiestHour && busiestHour.orderCount > 0) {
      insights.push({
        type: "peak",
        icon: "Clock",
        text: `Your busiest window is ${busiestHour.label}, with ${busiestHour.orderCount} orders in this period.`,
      });
    }

    // Top Item Insight
    if (topItems.length > 0) {
      insights.push({
        type: "top_item",
        icon: "Star",
        text: `${topItems[0].name} is your star performer, contributing ₹${topItems[0].revenue} in revenue.`,
      });
    }

    // Payment Mode Insight
    const upiPct = totalRevenue > 0 ? Math.round((upiRevenue / totalRevenue) * 100) : 0;
    insights.push({
      type: "payment",
      icon: "Wallet",
      text: `${upiPct}% of your revenue comes from UPI payments.`,
    });

    // Best Day Insight
    const bestDay = [...weekdayPattern].sort((a, b) => b.revenue - a.revenue)[0];
    if (bestDay && bestDay.revenue > 0) {
      insights.push({
        type: "trend",
        icon: "TrendingUp",
        text: `${bestDay.day}s are your highest-grossing days, averaging ₹${bestDay.avgOrder} per order.`,
      });
    }

    // Performance Insights
    if (avgConfirmationTime !== null) {
      insights.push({
        type: "performance",
        icon: "CheckCircle",
        text: `Average order confirmation time is ${avgConfirmationTime}s.`,
      });
    }

    if (avgPreparationTime !== null) {
      insights.push({
        type: "performance",
        icon: "Timer",
        text: `Average kitchen preparation time is ${Math.round(avgPreparationTime / 60)}m ${avgPreparationTime % 60}s.`,
      });
    }

    const repeatOrdering = computeRepeatOrders(logs);
    const dineInVsTakeaway = { dineIn: dineInRevenue, takeaway: takeawayRevenue };
    const avgSessionDuration = await computeAvgSessionDuration(date);
    const peakStaffWindows = computePeakWindows(hourlyPattern);
    const discountEffectiveness = computeDiscountImpact(logs);

    const summaryData = {
      summary: {
        totalRevenue,
        totalOrders,
        totalItems,
        avgOrderValue,
        upiRevenue,
        cashRevenue,
        packingRevenue,
        dineInRevenue,
        takeawayRevenue,
        avgConfirmationTime,
        avgPreparationTime,
        repeatOrdering,
        dineInVsTakeaway,
        avgSessionDuration,
        peakStaffWindows,
        discountEffectiveness,
      },
      dailyRevenue,
      hourlyPattern,
      weekdayPattern,
      topItems,
      tablePerformance,
      insights,
      generatedAt: new Date().toISOString(),
    };

    // Save to DB and Redis
    await (prisma as any).dailySummary.upsert({
      where: { date },
      update: { data: summaryData as any },
      create: { date, data: summaryData as any }
    });

    try {
      const redis = await getRedisClient();
      await redis.set(`${SUMMARY_CACHE_PREFIX}${date}`, JSON.stringify(summaryData), {
        EX: SUMMARY_CACHE_TTL
      });
    } catch (err) {
      console.error("[REDIS] Cache write failed in updateDailySummary:", err);
    }

    return summaryData;
  } catch (err) {
    console.error(`[SUMMARIES] Failed to update summary for ${date}:`, err);
    return null;
  }
}

// Simple debounced runner to prevent multiple rapid recalculations
let updatePending = false;
let nextUpdateDate: string | null = null;

export async function debouncedUpdateDailySummary(date: string) {
  if (updatePending) {
    nextUpdateDate = date;
    return;
  }

  updatePending = true;
  try {
    await updateDailySummary(date);
  } finally {
    updatePending = false;
    if (nextUpdateDate) {
      const d = nextUpdateDate;
      nextUpdateDate = null;
      setTimeout(() => debouncedUpdateDailySummary(d), 10000); // 10s debounce for production
    }
  }
}

/* ─── Helper Functions for Expanded Analytics ─── */

function computeRepeatOrders(logs: any[]): number {
  const sessionOrders = new Map<string, Set<string>>();
  logs.forEach(l => {
    if (!sessionOrders.has(l.sessionId)) {
      sessionOrders.set(l.sessionId, new Set());
    }
    sessionOrders.get(l.sessionId)!.add(l.orderId);
  });

  if (sessionOrders.size === 0) return 0;

  let repeatCount = 0;
  for (const orders of sessionOrders.values()) {
    if (orders.size >= 2) repeatCount++;
  }

  return Math.round((repeatCount / sessionOrders.size) * 100);
}

async function computeAvgSessionDuration(date: string): Promise<number> {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  try {
    const sessions = await prisma.session.findMany({
      where: {
        status: "CLOSED",
        createdAt: { gte: startDate, lte: endDate }
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    if (sessions.length === 0) return 0;

    const totalDuration = sessions.reduce((sum, s) => {
      const duration = (s.updatedAt.getTime() - s.createdAt.getTime()) / 1000; // in seconds
      return sum + duration;
    }, 0);

    return Math.round(totalDuration / sessions.length); // avg duration in seconds
  } catch (err) {
    console.error("[SUMMARIES] Failed to calculate avg session duration:", err);
    return 0;
  }
}

function computePeakWindows(hourlyPattern: any[]): string[] {
  return [...hourlyPattern]
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 3)
    .filter(h => h.orderCount > 0)
    .map(h => h.label);
}

function computeDiscountImpact(logs: any[]): { totalDiscounts: number; discountSharePct: number } {
  const totalBasePrice = logs.reduce((sum, l) => sum + (l.basePrice * l.quantity), 0);
  const totalFinalPrice = logs.reduce((sum, l) => sum + l.finalPrice, 0);
  const totalDiscounts = Math.max(0, totalBasePrice - totalFinalPrice);
  const discountSharePct = totalBasePrice > 0 ? Math.round((totalDiscounts / totalBasePrice) * 100) : 0;

  return { totalDiscounts, discountSharePct };
}
