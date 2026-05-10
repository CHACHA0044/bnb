import { prisma } from "./prisma";

/**
 * Check if the current time is within working hours.
 * Default: 3:00 PM (15:00) to 12:00 AM (00:00).
 * Update this logic if "3 PM to 12 PM" means something else.
 */
export function isWithinWorkingHours(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Working Hours: 15:00 to 23:59
  // Outside: 00:00 to 14:59
  return currentHour >= 15 && currentHour <= 23;
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

    if (logs.length === 0) {
      // Don't create empty summaries if no data exists
      return null;
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

    // 2. Hourly Heatmap
    const hourlyCounts = Array.from({ length: 24 }, (_, i) => {
      const h = i % 12 || 12;
      const ampm = i < 12 ? "AM" : "PM";
      return {
        hour: i,
        label: `${h} ${ampm}`,
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

    // 3. Top Items
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

    // 4. Table Performance
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

    // 5. Grouped Logs for Reports Dashboard
    const sessionIds = [...new Set(logs.map(l => l.sessionId))];
    const sessions = await prisma.session.findMany({
      where: { id: { in: sessionIds } },
      include: { payments: { where: { status: "CONFIRMED" } } }
    });
    const sessionMap = new Map(sessions.map(s => [s.id, s]));

    const reportOrderGroups: any = {};
    logs.forEach(l => {
      const groupKey = l.orderId;
      if (!reportOrderGroups[groupKey]) {
        const session = sessionMap.get(l.sessionId);
        const payments = session?.payments || [];
        const upiTotal = payments.filter(p => p.method === "UPI").reduce((s, p) => s + p.amount, 0);
        const cashTotal = payments.filter(p => p.method === "CASH").reduce((s, p) => s + p.amount, 0);

        reportOrderGroups[groupKey] = {
          id: l.orderId,
          tableId: l.tableId,
          sessionNumber: l.sessionNumber,
          paymentStatus: l.paymentStatus,
          createdAt: l.timestamp,
          foodTotal: 0,
          packingTotal: 0,
          amount: 0,
          upiPaid: upiTotal || null,
          cashPaid: cashTotal || null,
          items: []
        };
      }
      
      if (l.itemName === "Packing Charges") {
        reportOrderGroups[groupKey].packingTotal += l.finalPrice;
      } else {
        reportOrderGroups[groupKey].foodTotal += l.finalPrice;
        reportOrderGroups[groupKey].items.push(l);
      }
      reportOrderGroups[groupKey].amount += l.finalPrice;
    });

    const groupedLogs = Object.values(reportOrderGroups).map((group: any) => {
      const hasTakeaway = group.items.some((i: any) => i.orderType === "TAKEAWAY");
      const hasDineIn = group.items.some((i: any) => i.orderType === "DINE_IN");
      const isHybrid = hasTakeaway && hasDineIn;

      const itemSummary = group.items.map((i: any) => {
        let name = i.itemName;
        if (isHybrid && i.orderType === "TAKEAWAY") name += " (To-Go)";
        return `${i.quantity}x ${name}`;
      }).join(", ");

      return {
        ...group,
        tableId: group.tableId === "TAKEAWAY" ? `TW${group.sessionNumber || ""}` : group.tableId,
        itemSummary: itemSummary || "Packing Only"
      };
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
      },
      hourlyPattern,
      topItems,
      tablePerformance,
      groupedLogs, // Added for reports
      generatedAt: new Date().toISOString(),
    };


    await (prisma as any).dailySummary.upsert({
      where: { date },
      update: { data: summaryData as any },
      create: { date, data: summaryData as any }
    });

    console.log(`[SUMMARIES] Updated summary for ${date}`);
    return summaryData;
  } catch (err) {
    console.error(`[SUMMARIES] Failed to update summary for ${date}:`, err);
    return null;
  }
}
