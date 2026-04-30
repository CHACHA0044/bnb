import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";

const router = Router();
const VALID_TABLES = ["T1", "T2", "T3"];

/**
 * GET /api/table/:tableId
 * Returns existing OPEN session or creates one.
 */
router.get("/:tableId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableId } = req.params as { tableId: string };

    if (!VALID_TABLES.includes(tableId)) {
      res.status(400).json({ error: `Invalid table. Must be one of: ${VALID_TABLES.join(", ")}` });
      return;
    }

    const session = await prisma.session.findFirst({
      where: { tableId: tableId as string, status: "OPEN" },
      include: {
        orders: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

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

export default router;
