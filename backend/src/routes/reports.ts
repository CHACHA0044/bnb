import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { generateDailyReport, generateMonthlyCSV, storeReport } from "../lib/reports";

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
 * Download the monthly CSV report.
 */
router.get("/monthly", async (req: Request, res: Response): Promise<void> => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

    // Check if report exists
    let report = await prisma.report.findUnique({
      where: { type_date: { type: "MONTHLY_CSV", date: month } }
    });

    if (!report) {
      // Generate fresh
      const csv = await generateMonthlyCSV(month);
      const buffer = Buffer.from(csv, "utf-8");
      const filename = `BnB_Monthly_${month}.csv`;
      await storeReport("MONTHLY_CSV", month, filename, buffer);
      report = await prisma.report.findUnique({
        where: { type_date: { type: "MONTHLY_CSV", date: month } }
      });
    }

    if (!report) {
      res.status(404).json({ error: "Failed to generate report" });
      return;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
    res.send(Buffer.from(report.data));
  } catch (err) {
    console.error("[REPORTS] Monthly download error:", err);
    res.status(500).json({ error: "Failed to generate monthly report" });
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
 * GET /api/admin/reports/summary?date=2026-05-02
 * Get a quick JSON summary for today (for dashboard preview).
 */
router.get("/summary", async (req: Request, res: Response): Promise<void> => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

    const logs = await prisma.analyticsLog.findMany({ where: { date } });

    const totalRevenue = logs.reduce((sum, l) => sum + l.finalPrice, 0);
    const totalOrders = new Set(logs.map(l => l.orderId)).size;
    const totalItems = logs.filter(l => l.itemName !== "Packing Charges").reduce((sum, l) => sum + l.quantity, 0);
    const upiRevenue = logs.filter(l => l.paymentMode === "UPI").reduce((sum, l) => sum + l.finalPrice, 0);
    const cashRevenue = logs.filter(l => l.paymentMode === "CASH").reduce((sum, l) => sum + l.finalPrice, 0);

    res.json({ date, totalRevenue, totalOrders, totalItems, upiRevenue, cashRevenue });
  } catch (err) {
    console.error("[REPORTS] Summary error:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export default router;
