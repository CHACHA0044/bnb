import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";
import { getAllPendingOrders } from "../lib/pending-orders";
import { validateQrToken } from "../lib/qr-token";
import { generateCSRFToken, storeCSRFToken } from "../lib/validation";

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
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (session) {
      // Auto-close settled sessions on fresh scan to prevent new guests from seeing previous orders
      if (!sessionId) {
        const sessionTotal = session.orders
          .filter((o: any) => o.status !== "CANCELLED")
          .reduce((sum: number, o: any) => sum + o.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0) + (o.packingCharges || 0), 0);
        
        const paidTotal = session.payments
          .filter((p: any) => p.status === "CONFIRMED")
          .reduce((sum: number, p: any) => sum + p.amount, 0);

        if (sessionTotal > 0 && sessionTotal <= paidTotal) {
          console.log(`[TABLE] Auto-closing fully paid session ${session.id} for table ${tableId}`);
          await prisma.session.update({
            where: { id: session.id },
            data: { status: "CLOSED" }
          });
          
          try {
            const io = getIO();
            io.to(`session:${session.id}`).to("admin").emit("session_closed", {
              sessionId: session.id,
              closedAt: new Date().toISOString()
            });
          } catch {}
          
          res.json(null);
          return;
        }
      }

      const pendingOrders = await getAllPendingOrders();
      const pendingForSession = pendingOrders.filter(po => po.sessionId === session.id);
      if (pendingForSession.length > 0) {
        session.orders.unshift(...pendingForSession);
      }

      const csrfToken = generateCSRFToken();
      await storeCSRFToken(session.id, csrfToken);
      
      res.json({
        ...session,
        csrfToken
      });
      return;
    }

    res.json(null);
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

/**
 * POST /api/table/session/start
 * Creates a NEW session for a table (primarily for Takeaway isolation).
 */
router.post("/session/start", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableId, qrToken } = req.body as { tableId: string; qrToken?: string };
    if (!VALID_TABLES.includes(tableId)) {
      res.status(400).json({ error: `Invalid table: ${tableId}` });
      return;
    }

    // If QR token is provided, validate it to ensure security
    if (qrToken) {
      const valid = await validateQrToken(tableId, qrToken);
      if (!valid) {
        res.status(403).json({ error: "Invalid or expired QR code" });
        return;
      }
    }

    const session = await prisma.session.create({
      data: { 
        tableId, 
        status: "OPEN"
      },
      include: {
        orders: { include: { items: true } },
        payments: true
      }
    });

    res.json(session);
  } catch (err) {
    console.error("[TABLE] Session start error:", err);
    res.status(500).json({ error: "Failed to start session" });
  }
});

export default router;
