import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * PAYMENT AUDIT LOGS
 * 
 * All critical payment operations are logged:
 * - Payment creation
 * - Payment confirmation/rejection
 * - Failed payment attempts
 * - Admin overrides
 * - Session abuse attempts
 * - QR tampering
 * - Unauthorized access
 * 
 * These logs enable investigation of fraudulent activity.
 */

export enum AuditEventType {
  PAYMENT_CREATED = "PAYMENT_CREATED",
  PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED",
  PAYMENT_REJECTED = "PAYMENT_REJECTED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  ORDER_PLACED = "ORDER_PLACED",
  ORDER_MODIFIED = "ORDER_MODIFIED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  SESSION_CREATED = "SESSION_CREATED",
  SESSION_CLOSED = "SESSION_CLOSED",
  QR_GENERATED = "QR_GENERATED",
  QR_VALIDATION_FAILED = "QR_VALIDATION_FAILED",
  ADMIN_LOGIN = "ADMIN_LOGIN",
  ADMIN_PAYMENT_OVERRIDE = "ADMIN_PAYMENT_OVERRIDE",
  FRAUD_ATTEMPT_DETECTED = "FRAUD_ATTEMPT_DETECTED",
  DUPLICATE_PAYMENT_ATTEMPT = "DUPLICATE_PAYMENT_ATTEMPT",
  SESSION_HIJACK_ATTEMPT = "SESSION_HIJACK_ATTEMPT",
  UPI_TAMPERING_ATTEMPT = "UPI_TAMPERING_ATTEMPT",
}

export interface AuditEvent {
  type: AuditEventType;
  sessionId?: string;
  paymentId?: string;
  orderId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, unknown>;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

type AuditLogCreateInput = {
  eventType: string;
  sessionId?: string | null;
  paymentId?: string | null;
  orderId?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details: Prisma.InputJsonValue;
  severity: string;
  timestamp: Date;
};

type AuditLogFindManyArgs = {
  where?: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">;
  take?: number;
};

type AuditLogDelegate = {
  create(args: { data: AuditLogCreateInput }): Promise<unknown>;
  findMany(args: AuditLogFindManyArgs): Promise<unknown[]>;
};

function getAuditLogDelegate(): AuditLogDelegate {
  return (prisma as unknown as { auditLog: AuditLogDelegate }).auditLog;
}

function toJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Log an audit event to database
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await getAuditLogDelegate().create({
      data: {
        eventType: event.type,
        sessionId: event.sessionId || null,
        paymentId: event.paymentId || null,
        orderId: event.orderId || null,
        userId: event.userId || null,
        ipAddress: event.ipAddress || null,
        userAgent: event.userAgent || null,
        details: toJsonValue(event.details),
        severity: event.severity,
        timestamp: new Date(),
      },
    });
  } catch (err) {
    console.error("[AUDIT] Failed to log event:", err);
    // Don't throw — continue processing even if audit fails
  }
}

/**
 * Log payment creation
 */
export async function auditPaymentCreated(
  sessionId: string,
  paymentId: string,
  method: string,
  amount: number,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    type: AuditEventType.PAYMENT_CREATED,
    sessionId,
    paymentId,
    ipAddress,
    details: { method, amount },
    severity: "INFO",
  });
}

/**
 * Log payment confirmation
 */
export async function auditPaymentConfirmed(
  sessionId: string,
  paymentId: string,
  adminId: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    type: AuditEventType.PAYMENT_CONFIRMED,
    sessionId,
    paymentId,
    userId: adminId,
    ipAddress,
    details: { confirmedBy: adminId },
    severity: "INFO",
  });
}

/**
 * Log payment rejection
 */
export async function auditPaymentRejected(
  sessionId: string,
  paymentId: string,
  adminId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    type: AuditEventType.PAYMENT_REJECTED,
    sessionId,
    paymentId,
    userId: adminId,
    ipAddress,
    details: { rejectedBy: adminId, reason },
    severity: "WARNING",
  });
}

/**
 * Log fraud attempt (e.g., amount mismatch)
 */
export async function auditFraudAttempt(
  sessionId: string,
  reason: string,
  details: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    type: AuditEventType.FRAUD_ATTEMPT_DETECTED,
    sessionId,
    ipAddress,
    details: { reason, ...details },
    severity: "CRITICAL",
  });
}

/**
 * Log duplicate payment attempt
 */
export async function auditDuplicatePayment(
  sessionId: string,
  paymentId: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    type: AuditEventType.DUPLICATE_PAYMENT_ATTEMPT,
    sessionId,
    paymentId,
    ipAddress,
    details: { message: "Duplicate payment submission detected" },
    severity: "WARNING",
  });
}

/**
 * Log session hijack attempt
 */
export async function auditSessionHijackAttempt(
  sessionId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    type: AuditEventType.SESSION_HIJACK_ATTEMPT,
    sessionId,
    ipAddress,
    details: { reason },
    severity: "CRITICAL",
  });
}

/**
 * Log UPI tampering attempt
 */
export async function auditUPITamperingAttempt(
  sessionId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    type: AuditEventType.UPI_TAMPERING_ATTEMPT,
    sessionId,
    ipAddress,
    details: { reason },
    severity: "CRITICAL",
  });
}

/**
 * Get audit logs for a session (admin-only)
 */
export async function getSessionAuditLogs(sessionId: string) {
  try {
    const logs = await getAuditLogDelegate().findMany({
      where: { sessionId },
      orderBy: { timestamp: "desc" },
      take: 100,
    });
    return logs;
  } catch (err) {
    console.error("[AUDIT] Failed to retrieve logs:", err);
    return [];
  }
}

/**
 * Get suspicious activities (high-severity audit logs)
 */
export async function getSuspiciousActivities(limit = 50) {
  try {
    const logs = await getAuditLogDelegate().findMany({
      where: { severity: { in: ["CRITICAL", "WARNING"] } },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
    return logs;
  } catch (err) {
    console.error("[AUDIT] Failed to retrieve suspicious activities:", err);
    return [];
  }
}
