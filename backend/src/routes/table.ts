import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";
import { pendingOrders } from "./order";

const router = Router();
const VALID_TABLES = ["T1", "T2", "T3", "TAKEAWAY"];

/**
 * GET /api/table/:tableId
 * Returns existing OPEN session or creates one.
 */
router.get("/:tableId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableId } = req.params as { tableId: string };
    const { sessionId } = req.query as { sessionId?: string };

    if (!VALID_TABLES.includes(tableId)) {
      res.status(400).json({ error: `Invalid table. Must be one of: ${VALID_TABLES.join(", ")}` });
      return;
    }

    const session = await prisma.session.findFirst({
      where: sessionId ? { id: sessionId, tableId } : { tableId, status: "OPEN" },
      include: {
        orders: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (session) {
      const pendingForSession = Array.from(pendingOrders.values()).filter(po => po.sessionId === session.id);
      if (pendingForSession.length > 0) {
        session.orders.unshift(...pendingForSession);
      }
    }

    res.json(session);
  } catch (err) {
    console.error("[TABLE] Error:", err);
    res.status(500).json({ error: "Failed to fetch/create session" });
  }
});

/**
 * PATCH /api/table/session/:sessionId/reminder
 * Toggle payment reminder for a session
 */
router.patch("/session/:sessionId/reminder", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const { reminder } = req.body as { reminder: boolean };

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: { paymentReminder: reminder }
    });

    try {
      const io = getIO();
      io.to(`session:${sessionId}`).to("admin").emit("session_updated", { sessionId, reminder });
    } catch { /* skip */ }

    res.json(session);
  } catch (err) {
    console.error("[TABLE] Reminder toggle error:", err);
    res.status(500).json({ error: "Failed to toggle reminder" });
  }
});

/**
 * PATCH /api/table/session/:sessionId/review-request
 * Toggle review request for a session
 */
router.patch("/session/:sessionId/review-request", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const { requested } = req.body as { requested: boolean };

    const session = await prisma.session.update({
      where: { id: sessionId },
      // @ts-ignore
      data: { reviewRequested: requested }
    });

    try {
      const io = getIO();
      if (requested) {
        io.to(`session:${sessionId}`).emit("review_requested", {
          message: "We'd love to hear your feedback! Please rate the items you've enjoyed."
        });
      }
      io.to("admin").emit("session_updated", { sessionId, reviewRequested: requested });
    } catch { /* skip */ }

    res.json(session);
  } catch (err) {
    console.error("[TABLE] Review request toggle error:", err);
    res.status(500).json({ error: "Failed to toggle review request" });
  }
});

/**
 * PATCH /api/table/session/:sessionId/review-dismiss
 * Dismiss review request (User-facing)
 */
router.patch("/session/:sessionId/review-dismiss", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params as { sessionId: string };

    const session = await prisma.session.update({
      where: { id: sessionId },
      // @ts-ignore
      data: { reviewRequested: false }
    });

    try {
      const io = getIO();
      io.to("admin").emit("session_updated", { sessionId, reviewRequested: false });
    } catch { /* skip */ }

    res.json(session);
  } catch (err) {
    console.error("[TABLE] Review dismiss error:", err);
    res.status(500).json({ error: "Failed to dismiss review" });
  }
});

export default router;
