import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";
import { updateAnalyticsPayment } from "../lib/analytics";
import { 
  validateRequest, 
  CreatePaymentSchema, 
  ConfirmPaymentSchema,
  requireIdempotentKey,
  cacheIdempotentResponse,
  requireCSRFToken,
} from "../lib/validation";
import {
  auditPaymentCreated,
  auditPaymentConfirmed,
  auditPaymentRejected,
  auditDuplicatePayment,
  auditFraudAttempt,
  auditSessionHijackAttempt,
} from "../lib/audit";
import {
  calculatePayableAmount,
  verifyPaymentAmount,
} from "../lib/payment-calc";

const router = Router();

/**
 * POST /api/payment
 * Create a payment record for a session.
 * 
 * CRITICAL SECURITY:
 * - Frontend MUST NOT send the amount
 * - Frontend sends: sessionId, method (UPI|CASH)
 * - Backend calculates the final amount from database
 * - Request must include idempotency-key to prevent duplicates
 * - Session must be validated and owned by requestor
 * 
 * Body: { sessionId, method: "UPI" | "CASH" }
 */
router.post(
  "/",
  requireIdempotentKey,
  requireCSRFToken,
  validateRequest(CreatePaymentSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, method, customerPhone } = (req as any).validatedBody;
      const idempotencyKey = (req as any).idempotencyKey;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] as string || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      // Fetch session, all orders, and payments
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          orders: {
            include: { items: true },
          },
          payments: true,
        },
      });

      if (!session) {
        await auditSessionHijackAttempt(sessionId, "Session not found", ipAddress);
        res.status(404).json({ error: "Session not found" });
        return;
      }

      if (session.status !== "OPEN") {
        await auditFraudAttempt(
          sessionId,
          "Payment attempted on closed session",
          { sessionStatus: session.status },
          ipAddress
        );
        res.status(400).json({ error: "Session is not OPEN" });
        return;
      }

      // Verify session is not expired (90 min limit)
      const sessionAge = Date.now() - new Date(session.createdAt).getTime();
      if (sessionAge > 90 * 60 * 1000) {
        await auditFraudAttempt(
          sessionId,
          "Payment attempted on expired session",
          { sessionAgeMinutes: Math.round(sessionAge / 60000) },
          ipAddress
        );
        res.status(400).json({ error: "Session has expired" });
        return;
      }

      // Calculate amount from ALL non-cancelled orders
      let calculatedAmount = 0;
      try {
        const nonCancelledOrders = session.orders.filter(order => order.status !== "CANCELLED");
        if (nonCancelledOrders.length === 0) {
          res.status(400).json({ error: "No active orders in session to pay for" });
          return;
        }

        for (const order of nonCancelledOrders) {
          const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const packing = order.packingCharges || 0;
          const taxes = Math.round(subtotal * 0.05); // 5% GST
          calculatedAmount += subtotal + packing + taxes;
        }

        // Subtract already confirmed payments
        const confirmedPayments = session.payments
          .filter(p => p.status === "CONFIRMED")
          .reduce((sum, p) => sum + p.amount, 0);
        
        calculatedAmount = Math.max(0, calculatedAmount - confirmedPayments);
      } catch (err) {
        console.error("[PAYMENT] Calculation error:", err);
        await auditFraudAttempt(
          sessionId,
          "Payment calculation failed",
          { error: err instanceof Error ? err.message : "unknown" },
          ipAddress
        );
        res.status(400).json({ error: "Could not calculate payment amount" });
        return;
      }

      // Ensure we have a valid calculated amount
      if (calculatedAmount <= 0) {
        res.status(400).json({ error: "No remaining balance or invalid payment amount calculated" });
        return;
      }

      const status = method === "UPI" ? "PENDING" : "UNPAID";

      // Create payment in a transaction
      const payment = await prisma.$transaction(async (tx) => {
        return tx.payment.create({
          data: {
            sessionId,
            method,
            amount: calculatedAmount,
            status,
          },
          include: { session: true },
        });
      });

      // Cache this response for idempotency
      const responseData = {
        id: payment.id,
        sessionId: payment.sessionId,
        method: payment.method,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
      };

      cacheIdempotentResponse(idempotencyKey, responseData);

      // Update customer phone if provided
      if (customerPhone) {
        await prisma.order.updateMany({
          where: { sessionId },
          data: { customerPhone },
        });
      }

      // Audit log
      await auditPaymentCreated(sessionId, payment.id, method, calculatedAmount, ipAddress);

      console.log(`[PAYMENT] Created ${payment.id} — ${method} ₹${calculatedAmount} → ${status}`);

      // Emit to frontend and admin
      try {
        const io = getIO();
        io.to(`session:${sessionId}`).to("admin").emit("payment_created", {
          payment: responseData,
          sessionId,
          tableId: session.tableId,
        });
      } catch { /* skip socket errors */ }

      // Analytics
      try {
        await updateAnalyticsPayment(sessionId, method, status);
      } catch { /* skip analytics errors */ }

      res.status(201).json(responseData);
    } catch (err) {
      console.error("[PAYMENT] Create error:", err);
      res.status(500).json({ error: "Failed to create payment" });
    }
  }
);

/**
 * PATCH /api/payment/:paymentId/confirm
 * Admin confirms a payment → status: CONFIRMED
 * 
 * CRITICAL: Only admin can confirm.
 * Logs all confirmation actions for audit trail.
 */
router.patch(
  "/:paymentId/confirm",
  requireAdmin,
  validateRequest(ConfirmPaymentSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentId = req.params.paymentId as string;
      const adminId = (req as any).adminId || "unknown";
      const ipAddress = req.ip || req.headers["x-forwarded-for"] as string || "unknown";

      const existingPayment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { session: true }
      });

      if (!existingPayment) {
        res.status(404).json({ error: "Payment not found" });
        return;
      }

      if (existingPayment.status === "CONFIRMED") {
        res.json({
          id: existingPayment.id,
          status: existingPayment.status,
          amount: existingPayment.amount,
        });
        return;
      }

      if (existingPayment.status !== "PENDING" && existingPayment.status !== "UNPAID") {
        res.status(409).json({ error: `Cannot confirm payment in status: ${existingPayment.status}` });
        return;
      }

      const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "CONFIRMED", updatedAt: new Date() },
        include: { session: true },
      }) as any;

      // Audit log
      await auditPaymentConfirmed(payment.sessionId, paymentId, adminId, ipAddress);

      console.log(`[PAYMENT] ${paymentId} → CONFIRMED by ${adminId}`);

      try {
        const io = getIO();
        io.to(`session:${payment.sessionId}`).to("admin").emit("payment_confirmed", {
          payment: {
            id: payment.id,
            sessionId: payment.sessionId,
            amount: payment.amount,
            status: payment.status,
          },
          sessionId: payment.sessionId,
          tableId: payment.session.tableId,
        });
      } catch { /* skip */ }

      try {
        await updateAnalyticsPayment(payment.sessionId, payment.method, "CONFIRMED");
      } catch { /* skip */ }

      res.json({
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
      });
    } catch (err) {
      console.error("[PAYMENT] Confirm error:", err);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  }
);

/**
 * DELETE /api/payment/:paymentId
 * Admin rejects/deletes a payment record
 * 
 * Logs all rejections for audit trail and fraud investigation.
 */
router.delete(
  "/:paymentId",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentId = req.params.paymentId as string;
      const adminId = (req as any).adminId || "unknown";
      const reason = (req.body as any)?.reason || "Admin rejection";
      const ipAddress = req.ip || req.headers["x-forwarded-for"] as string || "unknown";

      const payment = await prisma.payment.delete({
        where: { id: paymentId },
        include: { session: true },
      }) as any;

      // Audit log
      await auditPaymentRejected(
        payment.sessionId,
        paymentId,
        adminId,
        reason,
        ipAddress
      );

      console.log(`[PAYMENT] ${paymentId} → REJECTED by ${adminId} (${reason})`);

      try {
        const io = getIO();
        const rejectedPayload = {
          payment: { ...payment, status: "REJECTED" },
          sessionId: payment.sessionId,
          tableId: payment.session.tableId,
        };
        io.to(`session:${payment.sessionId}`).to("admin").emit("payment_rejected", rejectedPayload);
        io.to(`session:${payment.sessionId}`).to("admin").emit("payment_confirmed", rejectedPayload);
      } catch { /* skip */ }

      res.json({ success: true });
    } catch (err) {
      console.error("[PAYMENT] Delete error:", err);
      res.status(500).json({ error: "Failed to reject payment" });
    }
  }
);

/**
 * GET /api/payment/:paymentId
 * Get payment details (for verification)
 */
router.get("/:paymentId", async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = req.params.paymentId as string;
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    res.json({
      id: payment.id,
      sessionId: payment.sessionId,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      createdAt: payment.createdAt,
    });
  } catch (err) {
    console.error("[PAYMENT] Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

export default router;



