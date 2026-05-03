import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";

const router = Router();

// All analytics routes require admin auth
router.use(requireAdmin);

/**
 * GET /api/admin/analytics
 * Returns comprehensive analytics payload for a given date range.
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;

    if (!fromDate || !toDate) {
      res.status(400).json({ error: "from and to dates required (YYYY-MM-DD)" });
      return;
    }

    // Fetch all logs in range
    const logs = await prisma.analyticsLog.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { timestamp: "asc" },
    });

    if (logs.length === 0) {
      res.json({ empty: true, message: "No data found for this period" });
      return;
    }

    // 1. KPI Aggregation
    const totalRevenue = logs.reduce((sum, l) => sum + l.finalPrice, 0);
    const orderIds = new Set(logs.map(l => l.orderId));
    const totalOrders = orderIds.size;
    const totalItems = logs.filter(l => l.itemName !== "Packing Charges").reduce((sum, l) => sum + l.quantity, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const upiRevenue = logs.filter(l => l.paymentMode === "UPI").reduce((sum, l) => sum + l.finalPrice, 0);
    const cashRevenue = logs.filter(l => l.paymentMode === "CASH").reduce((sum, l) => sum + l.finalPrice, 0);
    const packingRevenue = logs.reduce((sum, l) => sum + l.packingCharges, 0);

    const dineInLogs = logs.filter(l => l.orderType === "DINE_IN");
    const takeawayLogs = logs.filter(l => l.orderType === "TAKEAWAY");

    const dineInRevenue = dineInLogs.reduce((sum, l) => sum + l.finalPrice, 0);
    const takeawayRevenue = takeawayLogs.reduce((sum, l) => sum + l.finalPrice, 0);

    // 2. Revenue Timeline (Daily)
    const dailyMap = new Map<string, { date: string; revenue: number; upi: number; cash: number; orders: Set<string> }>();
    logs.forEach(l => {
      const existing = dailyMap.get(l.date) || { date: l.date, revenue: 0, upi: 0, cash: 0, orders: new Set<string>() };
      existing.revenue += l.finalPrice;
      if (l.paymentMode === "UPI") existing.upi += l.finalPrice;
      if (l.paymentMode === "CASH") existing.cash += l.finalPrice;
      existing.orders.add(l.orderId);
      dailyMap.set(l.date, existing);
    });

    const dailyRevenue = Array.from(dailyMap.values()).map(d => ({
      date: d.date,
      revenue: d.revenue,
      upi: d.upi,
      cash: d.cash,
      orderCount: d.orders.size,
    }));

    // 3. Hourly Heatmap (Orders by Hour)
    const hourlyCounts = Array.from({ length: 24 }, (_, i) => {
      const hour = i % 12 || 12;
      const ampm = i < 12 ? "AM" : "PM";
      return {
        hour: i,
        label: `${hour} ${ampm}`,
        orders: new Set<string>(),
        revenue: 0,
      };
    });

    logs.forEach(l => {
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

    // 4. Weekday Pattern
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayMap = new Map<number, { day: string; orders: Set<string>; revenue: number }>();
    
    logs.forEach(l => {
      const dayIndex = new Date(l.timestamp).getDay();
      const existing = weekdayMap.get(dayIndex) || { day: weekdays[dayIndex], orders: new Set<string>(), revenue: 0 };
      existing.orders.add(l.orderId);
      existing.revenue += l.finalPrice;
      weekdayMap.set(dayIndex, existing);
    });

    const weekdayPattern = weekdays.map((day, i) => {
      const data = weekdayMap.get(i) || { day, orders: new Set(), revenue: 0 };
      return {
        day,
        orderCount: data.orders.size,
        revenue: data.revenue,
        avgOrder: data.orders.size > 0 ? Math.round(data.revenue / data.orders.size) : 0,
      };
    });

    // 5. Top Items
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    logs.filter(l => l.itemName !== "Packing Charges").forEach(l => {
      const existing = itemMap.get(l.itemName) || { name: l.itemName, quantity: 0, revenue: 0 };
      existing.quantity += l.quantity;
      existing.revenue += l.finalPrice;
      itemMap.set(l.itemName, existing);
    });

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 15);

    // 6. Table Performance
    const tableMap = new Map<string, { tableId: string; orders: Set<string>; revenue: number }>();
    logs.forEach(l => {
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

    // 7. Smart Insights Algorithms
    const insights: any[] = [];
    
    // Peak Hour Insight
    const busiestHour = [...hourlyPattern].sort((a, b) => b.orderCount - a.orderCount)[0];
    if (busiestHour.orderCount > 0) {
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
    const upiPct = Math.round((upiRevenue / totalRevenue) * 100);
    insights.push({
      type: "payment",
      icon: "Wallet",
      text: `${upiPct}% of your revenue comes from UPI payments.`,
    });

    // Best Day Insight
    const bestDay = [...weekdayPattern].sort((a, b) => b.revenue - a.revenue)[0];
    if (bestDay.revenue > 0) {
      insights.push({
        type: "trend",
        icon: "TrendingUp",
        text: `${bestDay.day}s are your highest-grossing days, averaging ₹${bestDay.avgOrder} per order.`,
      });
    }

    res.json({
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
      },
      dailyRevenue,
      hourlyPattern,
      weekdayPattern,
      topItems,
      tablePerformance,
      insights,
    });

  } catch (err) {
    console.error("[ANALYTICS] Error generating analytics:", err);
    res.status(500).json({ error: "Failed to generate analytics" });
  }
});

export default router;
