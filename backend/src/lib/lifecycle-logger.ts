import { logger } from "./logger";
import { prisma } from "./prisma";

export type LifecycleEventType =
  | "order.created"
  | "order.confirmed"
  | "order.status_changed"
  | "order.cancelled"
  | "order.served"
  | "session.created"
  | "session.closed"
  | "payment.created"
  | "payment.confirmed"
  | "payment.rejected"
  | "payment.timeout"
  | "menu.item_updated"
  | "menu.stock_changed"
  | "qr.generated"
  | "qr.validated"
  | "admin.login";

export interface LifecycleLogPayload {
  sessionId?: string;
  orderId?: string;
  paymentId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  details?: Record<string, any>;
}

export async function logLifecycleEvent(
  eventType: LifecycleEventType,
  payload: LifecycleLogPayload
) {
  const {
    sessionId,
    orderId,
    paymentId,
    userId,
    ipAddress,
    userAgent,
    severity = "INFO",
    details = {}
  } = payload;

  // 1. Log to structured Pino logger
  logger.info({
    event: eventType,
    sessionId,
    orderId,
    paymentId,
    userId,
    ipAddress,
    severity,
    ...details
  }, `[LIFECYCLE] ${eventType}`);

  // 2. Also record in database AuditLog table for persistent audit trail
  try {
    await prisma.auditLog.create({
      data: {
        eventType: eventType.toUpperCase().replace(/\./g, "_"),
        sessionId,
        orderId,
        paymentId,
        userId,
        ipAddress,
        userAgent,
        details: details as any,
        severity
      }
    });
  } catch (err: any) {
    logger.error({ err: err.message, eventType }, "Failed to write lifecycle audit log to DB");
  }
}
