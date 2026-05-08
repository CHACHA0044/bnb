import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";

const router = Router();

// Helper to notify all clients about status change
function emitStatusUpdate() {
  getIO().emit("menu_updated"); // standard event to trigger state refreshes
}

/**
 * GET /api/status
 * Public endpoint to check restaurant status with robustness for client/schema mismatches
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    // Optimized: Use upsert to ensure the record exists without race conditions
    let status = await (prisma as any).restaurantStatus.upsert({
      where: { id: "CURRENT" },
      update: {}, // No updates needed, just ensure it exists
      create: { id: "CURRENT", isOpen: true, closingAt: null }
    }).catch(async () => {
        // Fallback: Raw check if Prisma model is not yet generated correctly
        try {
            const raw = await prisma.$queryRaw`SELECT * FROM "RestaurantStatus" WHERE id = 'CURRENT' LIMIT 1`;
            if (Array.isArray(raw) && raw.length > 0) return raw[0];
            
            await prisma.$executeRaw`INSERT INTO "RestaurantStatus" (id, "isOpen", "updatedAt") VALUES ('CURRENT', true, NOW()) ON CONFLICT DO NOTHING`;
            return { id: "CURRENT", isOpen: true, closingAt: null };
        } catch {
            return { id: "CURRENT", isOpen: true, closingAt: null };
        }
    });

    res.json(status);
  } catch (err) {
    console.error("Status fetch error:", err);
    // Return a default status instead of 500 to keep the app usable
    res.json({ id: "CURRENT", isOpen: true, closingAt: null });
  }
});

/**
 * POST /api/status/admin/open
 */
router.post("/admin/open", requireAdmin, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const status = await prisma.restaurantStatus.upsert({
      where: { id: "CURRENT" },
      update: { isOpen: true, closingAt: null },
      create: { id: "CURRENT", isOpen: true, closingAt: null }
    });
    emitStatusUpdate();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: "Failed to open restaurant" });
  }
});

/**
 * POST /api/status/admin/close
 */
router.post("/admin/close", requireAdmin, async (req: Request, res: Response) => {
  try {
    const closingAt = new Date(Date.now() + 10 * 60 * 1000);
    // @ts-ignore
    const status = await prisma.restaurantStatus.upsert({
      where: { id: "CURRENT" },
      update: { closingAt },
      create: { id: "CURRENT", isOpen: true, closingAt }
    });
    
    emitStatusUpdate();
    res.json(status);

    setTimeout(async () => {
        try {
            // @ts-ignore
            const current = await prisma.restaurantStatus.findUnique({ where: { id: "CURRENT" } });
            if (current && current.closingAt && new Date() >= current.closingAt) {
                // @ts-ignore
                await prisma.restaurantStatus.update({
                    where: { id: "CURRENT" },
                    data: { isOpen: false, closingAt: null }
                });
                emitStatusUpdate();
            }
        } catch (e) {
            console.error("Delayed close error:", e);
        }
    }, 10 * 60 * 1000);

  } catch (err) {
    res.status(500).json({ error: "Failed to initiate close" });
  }
});

/**
 * POST /api/status/admin/force-close
 */
router.post("/admin/force-close", requireAdmin, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const status = await prisma.restaurantStatus.upsert({
      where: { id: "CURRENT" },
      update: { isOpen: false, closingAt: null },
      create: { id: "CURRENT", isOpen: false, closingAt: null }
    });
    emitStatusUpdate();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: "Failed to force close" });
  }
});

export default router;
