import ExcelJS from "exceljs";
import { prisma } from "./prisma";
import { getRedisClient } from "./redis";

const REPORT_CACHE_PREFIX = "report:";
const REPORT_CACHE_TTL = 60 * 60 * 12; // 12 hours

/**
 * Helper to group logs by order and assign sequential numbers per day.
 */
async function processLogsForReport(logs: any[]) {
  const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const sessionIds = [...new Set(sortedLogs.map(l => l.sessionId))];
  const sessions = await prisma.session.findMany({
    where: { id: { in: sessionIds } },
    include: { payments: { where: { status: "CONFIRMED" } } }
  });
  const sessionMap = new Map(sessions.map(s => [s.id, s]));

  const dayMap = new Map<string, any[]>(); 
  sortedLogs.forEach(l => {
    if (!dayMap.has(l.date)) dayMap.set(l.date, []);
    dayMap.get(l.date)!.push(l);
  });

  const finalRows: any[] = [];
  const sortedDates = [...dayMap.keys()].sort();

  for (const date of sortedDates) {
    const dayLogs = dayMap.get(date)!;
    const orderGroups = new Map<string, any>();
    const orderSequence: string[] = [];

    dayLogs.forEach(l => {
      const groupKey = l.orderId;
      if (!orderGroups.has(groupKey)) {
        const session = sessionMap.get(l.sessionId);
        const confirmedPayments = session?.payments || [];
        
        const upiTotal = confirmedPayments.filter(p => p.method === "UPI").reduce((s, p) => s + p.amount, 0);
        const cashTotal = confirmedPayments.filter(p => p.method === "CASH").reduce((s, p) => s + p.amount, 0);

        const payTime = confirmedPayments.length > 0 
          ? confirmedPayments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
          : "-";

        orderGroups.set(groupKey, {
          date: l.date,
          orderId: l.orderId,
          timestamp: l.timestamp,
          tableId: l.tableId,
          sessionNumber: l.sessionNumber,
          items: [],
          foodTotal: 0,
          packingTotal: 0,
          upiPaid: upiTotal || null,
          cashPaid: cashTotal || null,
          payTime: payTime
        });
        
        if (!orderSequence.includes(l.orderId)) orderSequence.push(l.orderId);
      }
      
      const group = orderGroups.get(groupKey);
      if (l.itemName === "Packing Charges") {
        group.packingTotal += l.finalPrice;
      } else {
        group.items.push(l);
        group.foodTotal += l.finalPrice;
      }
    });

    orderSequence.forEach((orderId, idx) => {
      const group = orderGroups.get(orderId);
      const timeStr = new Date(group.timestamp).toLocaleTimeString("en-IN", { 
        hour: '2-digit', minute: '2-digit', hour12: true 
      }).toLowerCase();

      let tableDisplay = group.tableId;
      if (group.tableId === "TAKEAWAY") {
        tableDisplay = `TW${group.sessionNumber}`;
      }

      const hasTakeaway = group.items.some((i: any) => i.orderType === "TAKEAWAY");
      const hasDineIn = group.items.some((i: any) => i.orderType === "DINE_IN");
      const isHybrid = hasTakeaway && hasDineIn;

      const itemStr = group.items.map((i: any) => {
        let name = i.itemName;
        if (isHybrid && i.orderType === "TAKEAWAY") name += " (To-Go)";
        return `${i.quantity}x ${name}`;
      }).join(", ");

      finalRows.push({
        date: group.date,
        orderNo: `Order ${idx + 1}`,
        time: timeStr,
        table: tableDisplay,
        items: itemStr,
        foodTotal: group.foodTotal,
        packing: group.packingTotal || null,
        grandTotal: group.foodTotal + group.packingTotal,
        upi: group.upiPaid,
        cash: group.cashPaid,
        payTime: group.payTime
      });
    });
  }
  return finalRows;
}

/**
 * Generate a daily Excel report.
 */
export async function generateDailyReport(date: string): Promise<Buffer> {
  try {
    const redis = await getRedisClient();
    const cached = await redis.get(`${REPORT_CACHE_PREFIX}daily:${date}`);
    if (cached) return Buffer.from(cached, "base64");
  } catch (err) {
    console.error("[REDIS] Failed to read from cache in generateDailyReport:", err);
  }

  const logs = await prisma.analyticsLog.findMany({
    where: { 
      date,
      orderStatus: { notIn: ["REJECTED", "CANCELLED"] }
    },
    orderBy: { timestamp: "asc" }
  });

  const workbook = new ExcelJS.Workbook();
  const txSheet = workbook.addWorksheet("Transactions");
  
  txSheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Order", key: "orderNo", width: 12 },
    { header: "Order Time", key: "time", width: 12 },
    { header: "Table/TW", key: "table", width: 12 },
    { header: "Items Ordered", key: "items", width: 45 },
    { header: "Food Total", key: "foodTotal", width: 12 },
    { header: "Packing", key: "packing", width: 10 },
    { header: "Grand Total", key: "grandTotal", width: 12 },
    { header: "UPI Paid", key: "upi", width: 12 },
    { header: "Cash Paid", key: "cash", width: 12 },
    { header: "Payment Time", key: "payTime", width: 15 },
  ];

  txSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  txSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3A241C" } };

  const rows = await processLogsForReport(logs);
  rows.forEach(r => txSheet.addRow(r));

  ["F", "G", "H", "I", "J"].forEach(col => {
    txSheet.getColumn(col).numFmt = "₹#,##0";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const result = Buffer.from(buffer);
  
  try {
    const redis = await getRedisClient();
    await redis.set(`${REPORT_CACHE_PREFIX}daily:${date}`, result.toString("base64"), {
      EX: REPORT_CACHE_TTL
    });
  } catch (err) {
    console.error("[REDIS] Failed to write to cache in generateDailyReport:", err);
  }

  return result;
}

/**
 * Generate an Excel report for a specific date range.
 */
export async function generateRangeReport(from: string, to: string): Promise<Buffer> {
  const logs = await prisma.analyticsLog.findMany({
    where: { 
      date: { gte: from, lte: to },
      orderStatus: { notIn: ["REJECTED", "CANCELLED"] }
    },
    orderBy: { timestamp: "asc" }
  });

  const workbook = new ExcelJS.Workbook();
  const txSheet = workbook.addWorksheet("Range Report");
  
  txSheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Order", key: "orderNo", width: 12 },
    { header: "Order Time", key: "time", width: 12 },
    { header: "Table/TW", key: "table", width: 12 },
    { header: "Items Ordered", key: "items", width: 45 },
    { header: "Food Total", key: "foodTotal", width: 12 },
    { header: "Packing", key: "packing", width: 10 },
    { header: "Grand Total", key: "grandTotal", width: 12 },
    { header: "UPI Paid", key: "upi", width: 12 },
    { header: "Cash Paid", key: "cash", width: 12 },
    { header: "Payment Time", key: "payTime", width: 15 },
  ];

  txSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  txSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3A241C" } };

  const rows = await processLogsForReport(logs);
  rows.forEach(r => txSheet.addRow(r));

  ["F", "G", "H", "I", "J"].forEach(col => {
    txSheet.getColumn(col).numFmt = "₹#,##0";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate a monthly CSV string.
 */
export async function generateMonthlyCSV(month: string): Promise<string> {
  try {
    const redis = await getRedisClient();
    const cached = await redis.get(`${REPORT_CACHE_PREFIX}monthly:${month}`);
    if (cached) return cached;
  } catch (err) {
    console.error("[REDIS] Failed to read from cache in generateMonthlyCSV:", err);
  }

  const logs = await prisma.analyticsLog.findMany({
    where: { 
      date: { startsWith: month },
      orderStatus: { notIn: ["REJECTED", "CANCELLED"] }
    },
    orderBy: { timestamp: "asc" }
  });

  const processed = await processLogsForReport(logs);
  const headers = ["Date", "Order", "Order Time", "Table/TW", "Items", "Food Total", "Packing", "Grand Total", "UPI Paid", "Cash Paid", "Payment Time"];
  
  const csvRows = processed.map(r => [
    r.date,
    r.orderNo,
    r.time,
    r.table,
    `"${r.items}"`,
    r.foodTotal,
    r.packing || 0,
    r.grandTotal,
    r.upi || 0,
    r.cash || 0,
    r.payTime
  ]);

  const result = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
  
  try {
    const redis = await getRedisClient();
    await redis.set(`${REPORT_CACHE_PREFIX}monthly:${month}`, result, {
      EX: REPORT_CACHE_TTL
    });
  } catch (err) {
    console.error("[REDIS] Failed to write to cache in generateMonthlyCSV:", err);
  }

  return result;
}

/**
 * Store a report in the database.
 */
export async function storeReport(
  type: "DAILY_EXCEL" | "MONTHLY_CSV",
  date: string,
  filename: string,
  data: Buffer
): Promise<void> {
  await prisma.report.upsert({
    where: { type_date: { type, date } },
    update: { data: new Uint8Array(data), filename },
    create: { type, date, filename, data: new Uint8Array(data) }
  });
}
