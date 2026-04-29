import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();
const VALID_TABLES = ["T1", "T2", "T3"];

/**
 * GET /api/table/:tableId
 * Returns existing OPEN session or creates one.
 * Includes orders (with items) and payments.
 */
router.get("/:tableId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableId } = req.params;

    if (!VALID_TABLES.includes(tableId)) {
      res.status(400).json({ error: `Invalid table. Must be one of: ${VALID_TABLES.join(", ")}` });
      return;
    }

    // Use transaction to prevent race condition (two concurrent requests creating duplicates)
    const session = await prisma.$transaction(async (tx) => {
      const existing = await tx.session.findFirst({
        where: { tableId, status: "OPEN" },
        include: {
          orders: {
            include: { items: true },
            orderBy: { createdAt: "desc" },
          },
          payments: { orderBy: { createdAt: "desc" } },
        },
      });

      if (existing) return existing;

      return tx.session.create({
        data: { tableId },
        include: {
          orders: { include: { items: true } },
          payments: true,
        },
      });
    });

    console.log(`[TABLE] ${tableId} → session ${session.id} (${session.status})`);
    res.json(session);
  } catch (err) {
    console.error("[TABLE] Error:", err);
    res.status(500).json({ error: "Failed to fetch/create session" });
  }
});

export default router;
