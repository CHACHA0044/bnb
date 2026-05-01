import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { emitMenuUpdate } from "./menu";
import { getIO } from "../lib/socket";

const router = Router();

// Helper to notify all clients about status change
function emitStatusUpdate() {
  getIO().emit("menu_updated"); // standard event to trigger state refreshes
}

/**
 * GET /api/status
 * Public endpoint to check restaurant status
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    let status = await prisma.restaurantStatus.findUnique({
      where: { id: "CURRENT" }
    });

    if (!status) {
      // @ts-ignore
      status = await prisma.restaurantStatus.create({
        data: { id: "CURRENT", isOpen: true }
      });
    }

    res.json(status);
  } catch (err) {
    console.error("Status fetch error:", err);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

/**
 * POST /api/status/admin/open
 * Reopen the restaurant
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
 * Start 10-min countdown
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

    // Auto-close after 10 mins (though frontend/logic will also gate it)
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
 * Close immediately
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
