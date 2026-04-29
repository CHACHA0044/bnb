import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";

const router = Router();

/**
 * POST /api/payment
 * Create a payment record for a session.
 * Body: { sessionId, method: "UPI" | "CASH", amount }
 * UPI → status: PENDING (admin confirms later)
 * CASH → status: UNPAID (admin marks paid manually)
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, method, amount, orderId } = req.body as { sessionId: string; method: string; amount: number; orderId?: string };

    if (!sessionId || !method || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ error: "sessionId, method (UPI|CASH), and amount (>0) required" });
      return;
    }

    if (!["UPI", "CASH"].includes(method)) {
      res.status(400).json({ error: "method must be UPI or CASH" });
      return;
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== "OPEN") {
      res.status(400).json({ error: "Session not found or closed" });
      return;
    }

    const status = method === "UPI" ? "PENDING" : "UNPAID";

    const payment = await prisma.payment.create({
      data: { sessionId: sessionId as string, method, amount, status, orderId: orderId || null },
    });

    console.log(`[PAYMENT] ${payment.id} — ${method} ₹${amount} → ${status}`);

    try {
      const io = getIO();
      io.to(`session:${sessionId}`).to("admin").emit("payment_created", {
        payment,
        sessionId,
        tableId: session.tableId,
      });
    } catch { /* skip */ }

    res.status(201).json(payment);
  } catch (err) {
    console.error("[PAYMENT] Create error:", err);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

/**
 * PATCH /api/payment/:paymentId/confirm
 * Admin confirms a payment → status: CONFIRMED
 */
router.patch("/:paymentId/confirm", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params as { paymentId: string };

    const payment = await prisma.payment.update({
      where: { id: paymentId as string },
      data: { status: "CONFIRMED" },
      include: { session: true },
    }) as any;

    console.log(`[PAYMENT] ${paymentId} → CONFIRMED`);

    try {
      const io = getIO();
      io.to(`session:${payment.sessionId}`).to("admin").emit("payment_confirmed", {
        payment,
        sessionId: payment.sessionId,
        tableId: payment.session.tableId,
      });
    } catch { /* skip */ }

    res.json(payment);
  } catch (err) {
    console.error("[PAYMENT] Confirm error:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

export default router;
