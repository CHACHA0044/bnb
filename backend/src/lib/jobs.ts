import * as cron from "node-cron";
import { prisma } from "./prisma";
import { clearActiveCart, getIO } from "./socket";
import { generateDailyReport, generateMonthlyCSV, storeReport } from "./reports";

/**
 * Initialize background jobs.
 */
export function initJobs() {
  // 1. Hourly: Clean up expired QR tokens
  cron.schedule("0 * * * *", async () => {
    try {
      const { count } = await prisma.qrToken.deleteMany({
        where: { expiresAt: { lt: new Date() } }
      });
      if (count > 0) console.log(`[JOBS] Cleaned up ${count} expired QR tokens`);
    } catch (err) {
      console.error("[JOBS] Failed to clean up QR tokens:", err);
    }
  });

  // 2. Every 5 Minutes: Auto-close stale sessions
  cron.schedule("*/5 * * * *", async () => {
    try {
      const openSessions = await prisma.session.findMany({
        where: { status: "OPEN" },
        include: {
          orders: { orderBy: { createdAt: "desc" } }
        }
      });

      const now = new Date();
      const io = getIO();
      
      for (const session of openSessions) {
        const latestOrder = session.orders[0];
        const timeReference = latestOrder ? latestOrder.createdAt : session.updatedAt;
        const minutesSinceActivity = (now.getTime() - timeReference.getTime()) / (1000 * 60);
        
        if (minutesSinceActivity > 90) {
          await prisma.session.update({
            where: { id: session.id },
            data: { status: "CLOSED" }
          });

          console.log(`[JOBS] Auto-closed session ${session.id} (expired after ${Math.round(minutesSinceActivity)} mins)`);
          io.to(`session:${session.id}`).to("admin").emit("session_closed", { sessionId: session.id });
        }
      }
    } catch (err) {
      console.error("[JOBS] Error in session auto-closure:", err);
    }
  });

  // 3. Daily at 4 AM: Clean up and Finalize Reports
  cron.schedule("0 4 * * *", async () => {
    try {
      console.log("[JOBS] Running nightly cleanup and report finalization...");
      const now = new Date();
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const yDate = yesterday.toISOString().split("T")[0];

      // Clean up sessions with no orders that are older than 24 hours
      const { count: sessionCount } = await prisma.session.deleteMany({
        where: {
          orders: { none: {} },
          createdAt: { lt: yesterday }
        }
      });
      console.log(`[JOBS] Removed ${sessionCount} abandoned empty sessions`);

      // Finalize Yesterday's Reports
      const yBuffer = await generateDailyReport(yDate);
      await storeReport("DAILY_EXCEL", yDate, `BnB_Daily_${yDate}.xlsx`, yBuffer);

      const yMonth = yDate.slice(0, 7);
      const yCsv = await generateMonthlyCSV(yMonth);
      await storeReport("MONTHLY_CSV", yMonth, `BnB_Monthly_${yMonth}.csv`, Buffer.from(yCsv, "utf-8"));

      console.log("[JOBS] Nightly report finalization complete");
    } catch (err) {
      console.error("[JOBS] Nightly job failed:", err);
    }
  });

  // Every 10 minutes: Expire stale UPI payments
  cron.schedule("*/10 * * * *", async () => {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const { count } = await prisma.payment.updateMany({
        where: { method: "UPI", status: "PENDING", createdAt: { lt: thirtyMinutesAgo } },
        data: { status: "TIMEOUT" }
      });
      if (count > 0) {
        console.log(`[JOBS] Timed out ${count} stale UPI payments`);
      }
    } catch (err) {
      console.error("[JOBS] UPI timeout error:", err);
    }
  });

  // 4. Every 5 Minutes: Auto-restock expired out-of-stock items
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const { count } = await prisma.menuItem.updateMany({
        where: {
          outOfStock: true,
          outOfStockUntil: { not: null, lte: now }
        },
        data: { outOfStock: false, outOfStockUntil: null }
      });
      if (count > 0) {
        console.log(`[JOBS] Auto-restocked ${count} items`);
        try {
          getIO().emit("menu_updated");
        } catch (socketErr: any) {
          console.warn("[JOBS] Socket.IO not ready to emit menu_updated:", socketErr.message);
        }
      }
    } catch (err) {
      console.error("[JOBS] Failed to auto-restock items:", err);
    }
  });

  console.log("[JOBS] Background jobs initialized");
}
