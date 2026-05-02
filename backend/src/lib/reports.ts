import ExcelJS from "exceljs";
import { prisma } from "./prisma";

/**
 * Generate a daily Excel report with multiple sheets.
 */
export async function generateDailyReport(date: string): Promise<Buffer> {
  const logs = await prisma.analyticsLog.findMany({
    where: { date },
    orderBy: { timestamp: "asc" }
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Benne n Beans";
  workbook.created = new Date();

  // ─── Sheet 1: All Transactions ───────────────
  const txSheet = workbook.addWorksheet("Transactions", {
    properties: { tabColor: { argb: "FFE76F51" } }
  });

  txSheet.columns = [
    { header: "Time", key: "timestamp", width: 20 },
    { header: "Table", key: "tableId", width: 12 },
    { header: "Session", key: "sessionId", width: 15 },
    { header: "Order", key: "orderId", width: 15 },
    { header: "Item", key: "itemName", width: 30 },
    { header: "Qty", key: "quantity", width: 8 },
    { header: "Unit Price", key: "basePrice", width: 12 },
    { header: "Discount", key: "discountApplied", width: 12 },
    { header: "Total", key: "finalPrice", width: 12 },
    { header: "Type", key: "orderType", width: 12 },
    { header: "Payment", key: "paymentMode", width: 12 },
    { header: "Pay Status", key: "paymentStatus", width: 14 },
    { header: "Order Status", key: "orderStatus", width: 14 },
    { header: "Location", key: "locationVerified", width: 12 },
  ];

  // Style header
  txSheet.getRow(1).font = { bold: true, size: 11 };
  txSheet.getRow(1).fill = {
    type: "pattern", pattern: "solid",
    fgColor: { argb: "FF3A241C" }
  };
  txSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

  for (const log of logs) {
    txSheet.addRow({
      timestamp: new Date(log.timestamp).toLocaleTimeString("en-IN"),
      tableId: log.tableId,
      sessionId: log.orderType === "TAKEAWAY" ? `TW${log.sessionNumber}` : `#${log.sessionNumber}`,
      orderId: log.orderId.slice(-6).toUpperCase(),
      itemName: log.itemName,
      quantity: log.quantity,
      basePrice: log.basePrice,
      discountApplied: log.discountApplied || "-",
      finalPrice: log.finalPrice,
      orderType: log.orderType,
      paymentMode: log.paymentMode || "Pending",
      paymentStatus: log.paymentStatus,
      orderStatus: log.orderStatus,
      locationVerified: log.locationVerified ? "Yes" : "No",
    });
  }

  // ─── Sheet 2: Summary ───────────────────────
  const summarySheet = workbook.addWorksheet("Summary", {
    properties: { tabColor: { argb: "FF6A994E" } }
  });

  const totalRevenue = logs.reduce((sum, l) => sum + l.finalPrice, 0);
  const totalOrders = new Set(logs.map(l => l.orderId)).size;
  const totalSessions = new Set(logs.map(l => l.sessionId)).size;
  const totalItems = logs.filter(l => l.itemName !== "Packing Charges").reduce((sum, l) => sum + l.quantity, 0);
  const upiTotal = logs.filter(l => l.paymentMode === "UPI").reduce((sum, l) => sum + l.finalPrice, 0);
  const cashTotal = logs.filter(l => l.paymentMode === "CASH").reduce((sum, l) => sum + l.finalPrice, 0);
  const packingTotal = logs.filter(l => l.itemName === "Packing Charges").reduce((sum, l) => sum + l.finalPrice, 0);
  const dineInTotal = logs.filter(l => l.orderType === "DINE_IN").reduce((sum, l) => sum + l.finalPrice, 0);
  const takeawayTotal = logs.filter(l => l.orderType === "TAKEAWAY").reduce((sum, l) => sum + l.finalPrice, 0);

  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 25 },
    { header: "Value", key: "value", width: 20 },
  ];

  summarySheet.getRow(1).font = { bold: true, size: 12 };

  const summaryRows = [
    { metric: "Date", value: date },
    { metric: "Total Revenue", value: `₹${totalRevenue}` },
    { metric: "Total Orders", value: totalOrders },
    { metric: "Total Sessions", value: totalSessions },
    { metric: "Total Items Sold", value: totalItems },
    { metric: "UPI Revenue", value: `₹${upiTotal}` },
    { metric: "Cash Revenue", value: `₹${cashTotal}` },
    { metric: "Dine-In Revenue", value: `₹${dineInTotal}` },
    { metric: "Takeaway Revenue", value: `₹${takeawayTotal}` },
    { metric: "Packing Charges", value: `₹${packingTotal}` },
  ];

  summaryRows.forEach(r => summarySheet.addRow(r));

  // ─── Sheet 3: Item Breakdown ────────────────
  const itemSheet = workbook.addWorksheet("Items Sold", {
    properties: { tabColor: { argb: "FFF4A261" } }
  });

  itemSheet.columns = [
    { header: "Item", key: "name", width: 30 },
    { header: "Quantity Sold", key: "qty", width: 15 },
    { header: "Revenue", key: "revenue", width: 15 },
  ];
  itemSheet.getRow(1).font = { bold: true, size: 11 };

  // Aggregate items
  const itemMap = new Map<string, { qty: number; revenue: number }>();
  for (const log of logs.filter(l => l.itemName !== "Packing Charges")) {
    const existing = itemMap.get(log.itemName) || { qty: 0, revenue: 0 };
    existing.qty += log.quantity;
    existing.revenue += log.finalPrice;
    itemMap.set(log.itemName, existing);
  }

  for (const [name, data] of [...itemMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue)) {
    itemSheet.addRow({ name, qty: data.qty, revenue: `₹${data.revenue}` });
  }

  // ─── Sheet 4: Table-wise Summary ────────────
  const tableSheet = workbook.addWorksheet("Table Summary", {
    properties: { tabColor: { argb: "FF3A241C" } }
  });

  tableSheet.columns = [
    { header: "Table", key: "table", width: 15 },
    { header: "Orders", key: "orders", width: 12 },
    { header: "Items", key: "items", width: 12 },
    { header: "Revenue", key: "revenue", width: 15 },
  ];
  tableSheet.getRow(1).font = { bold: true, size: 11 };

  const tableMap = new Map<string, { orders: Set<string>; items: number; revenue: number }>();
  for (const log of logs) {
    const existing = tableMap.get(log.tableId) || { orders: new Set<string>(), items: 0, revenue: 0 };
    existing.orders.add(log.orderId);
    existing.items += log.quantity;
    existing.revenue += log.finalPrice;
    tableMap.set(log.tableId, existing);
  }

  for (const [table, data] of tableMap) {
    tableSheet.addRow({ table, orders: data.orders.size, items: data.items, revenue: `₹${data.revenue}` });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate a monthly CSV string from all analytics logs for a given month.
 */
export async function generateMonthlyCSV(month: string): Promise<string> {
  // month format: YYYY-MM
  const logs = await prisma.analyticsLog.findMany({
    where: {
      date: { startsWith: month }
    },
    orderBy: { timestamp: "asc" }
  });

  const headers = [
    "Date", "Time", "Table", "Session", "Order", "Item", "Qty",
    "Unit Price", "Discount", "Total", "Type", "Payment Mode",
    "Payment Status", "Order Status", "Packing Charges", "Location Verified"
  ];

  const rows = logs.map(log => [
    log.date,
    new Date(log.timestamp).toLocaleTimeString("en-IN"),
    log.tableId,
    log.orderType === "TAKEAWAY" ? `TW${log.sessionNumber}` : `#${log.sessionNumber}`,
    log.orderId.slice(-6).toUpperCase(),
    `"${log.itemName}"`,
    log.quantity,
    log.basePrice,
    log.discountApplied || "-",
    log.finalPrice,
    log.orderType,
    log.paymentMode || "Pending",
    log.paymentStatus,
    log.orderStatus,
    log.packingCharges,
    log.locationVerified ? "Yes" : "No"
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
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
  console.log(`[REPORTS] Stored ${type} for ${date}`);
}
