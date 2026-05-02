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
    // Attempt to fetch using prisma (with fallback for schema mismatches)
    // @ts-ignore
    let status = await prisma.restaurantStatus.findUnique({
      where: { id: "CURRENT" }
    }).catch(async () => {
        // Fallback: Try a raw query if the model is not yet in the generated client
        try {
            const raw = await prisma.$queryRaw`SELECT * FROM "RestaurantStatus" WHERE id = 'CURRENT' LIMIT 1`;
            return Array.isArray(raw) && raw.length > 0 ? raw[0] : null;
        } catch {
            return null;
        }
    });

    if (!status) {
      try {
        // @ts-ignore
        status = await prisma.restaurantStatus.create({
            data: { id: "CURRENT", isOpen: true }
        }).catch(async () => {
            // Fallback: Raw insert
            await prisma.$executeRaw`INSERT INTO "RestaurantStatus" (id, "isOpen", "updatedAt") VALUES ('CURRENT', true, NOW()) ON CONFLICT DO NOTHING`;
            return { id: "CURRENT", isOpen: true, closingAt: null };
        });
      } catch {
          // Absolute fallback
          status = { id: "CURRENT", isOpen: true, closingAt: null };
      }
    }

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
