import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { generateDailyReport, generateMonthlyCSV, generateRangeReport, storeReport } from "../lib/reports";
import { isWithinWorkingHours, updateDailySummary } from "../lib/summaries";

const router = Router();

// All report routes require admin auth
router.use(requireAdmin);

/**
 * GET /api/admin/reports/daily?date=2026-05-02
 * Download the daily Excel report. Generates on-demand if not cached.
 */
router.get("/daily", async (req: Request, res: Response): Promise<void> => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

    // Check if report already exists in DB
    let report = await prisma.report.findUnique({
      where: { type_date: { type: "DAILY_EXCEL", date } }
    });

    if (!report) {
      // Generate fresh
      const buffer = await generateDailyReport(date);
      const filename = `BnB_Daily_${date}.xlsx`;
      await storeReport("DAILY_EXCEL", date, filename, buffer);
      report = await prisma.report.findUnique({
        where: { type_date: { type: "DAILY_EXCEL", date } }
      });
    }

    if (!report) {
      res.status(404).json({ error: "Failed to generate report" });
      return;
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
    res.send(Buffer.from(report.data));
  } catch (err) {
    console.error("[REPORTS] Daily download error:", err);
    res.status(500).json({ error: "Failed to generate daily report" });
  }
});

/**
 * GET /api/admin/reports/monthly?month=2026-05
 * Download the monthly CSV report directly.
 */
router.get("/monthly", async (req: Request, res: Response): Promise<void> => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const csv = await generateMonthlyCSV(month);
    const filename = `BnB_Monthly_${month}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error("[REPORTS] Monthly download error:", err);
    res.status(500).json({ error: "Failed to generate monthly report" });
  }
});

/**
 * GET /api/admin/reports/range?from=2026-05-01&to=2026-05-07
 * Download an Excel report for a specific date range directly.
 */
router.get("/range", async (req: Request, res: Response): Promise<void> => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;

    if (!from || !to) {
      res.status(400).json({ error: "from and to dates required" });
      return;
    }

    const buffer = await generateRangeReport(from, to);
    const filename = `BnB_Report_${from}_to_${to}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("[REPORTS] Range download error:", err);
    res.status(500).json({ error: "Failed to generate range report" });
  }
});

/**
 * POST /api/admin/reports/daily/regenerate?date=2026-05-02
 * Force regenerate a daily report (e.g., after late payment confirmations).
 */
router.post("/daily/regenerate", async (req: Request, res: Response): Promise<void> => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const buffer = await generateDailyReport(date);
    const filename = `BnB_Daily_${date}.xlsx`;
    await storeReport("DAILY_EXCEL", date, filename, buffer);
    res.json({ success: true, date, filename });
  } catch (err) {
    console.error("[REPORTS] Regenerate error:", err);
    res.status(500).json({ error: "Failed to regenerate report" });
  }
});

/**
 * GET /api/admin/reports/summary
 * Get a quick JSON summary with consolidated order rows.
 */
router.get("/summary", async (req: Request, res: Response): Promise<void> => {
  try {
    const fromDate = req.query.from as string;
    const toDate = req.query.to as string;
    const singleDate = (req.query.date as string) || new Date().toISOString().split("T")[0];

    const isSingleDay = !fromDate && !toDate;
    const dateToUse = (fromDate && toDate && fromDate === toDate) ? fromDate : singleDate;

    // During working hours, check for cached summary first
    if (isSingleDay && isWithinWorkingHours()) {
      const summary = await (prisma as any).dailySummary.findUnique({
        where: { date: dateToUse }
      });
      if (summary && summary.data.groupedLogs) {
        console.log(`[REPORTS] Serving cached summary for ${dateToUse}`);
        res.json(summary.data);
        return;
      }
    }


    let whereClause: any = {
      orderStatus: { notIn: ["REJECTED", "CANCELLED"] }
    };
    if (fromDate && toDate) {
      whereClause.date = { gte: fromDate, lte: toDate };
    } else {
      whereClause.date = singleDate;
    }

    const logs = await prisma.analyticsLog.findMany({ where: whereClause });

    const sessionIds = [...new Set(logs.map(l => l.sessionId))];
    const sessions = await prisma.session.findMany({
      where: { id: { in: sessionIds } },
      include: { payments: { where: { status: "CONFIRMED" } } }
    });
    const sessionMap = new Map(sessions.map(s => [s.id, s]));

    const totalRevenue = logs.reduce((sum, l) => sum + l.finalPrice, 0);
    const totalOrders = new Set(logs.map(l => l.orderId)).size;
    const totalItems = logs.filter(l => l.itemName !== "Packing Charges").reduce((sum, l) => sum + l.quantity, 0);

    // Group logs by orderId
    const orderGroups: any = {};
    logs.forEach(l => {
      const groupKey = l.orderId;
      if (!orderGroups[groupKey]) {
        const session = sessionMap.get(l.sessionId);
        const payments = session?.payments || [];
        const upiTotal = payments.filter(p => p.method === "UPI").reduce((s, p) => s + p.amount, 0);
        const cashTotal = payments.filter(p => p.method === "CASH").reduce((s, p) => s + p.amount, 0);

        orderGroups[groupKey] = {
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
        orderGroups[groupKey].packingTotal += l.finalPrice;
      } else {
        orderGroups[groupKey].foodTotal += l.finalPrice;
        orderGroups[groupKey].items.push(l);
      }
      orderGroups[groupKey].amount += l.finalPrice;
    });

    const groupedLogs = Object.values(orderGroups).map((group: any) => {
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

    const reportData = {
      date: singleDate,
      totalRevenue,
      totalOrders,
      totalItems,
      upiRevenue: logs.filter(l => l.paymentMode === "UPI").reduce((sum, l) => sum + l.finalPrice, 0),
      cashRevenue: logs.filter(l => l.paymentMode === "CASH").reduce((sum, l) => sum + l.finalPrice, 0),
      logs: groupedLogs
    };

    // If outside working hours, update the cache
    if (isSingleDay && !isWithinWorkingHours()) {
      updateDailySummary(dateToUse).catch(e => console.error("[REPORTS] Auto-cache error:", e));
    }

    res.json(reportData);

  } catch (err) {
    console.error("[REPORTS] Summary error:", err);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

export default router;
