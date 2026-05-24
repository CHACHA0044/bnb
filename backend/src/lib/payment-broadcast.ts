/**
 * OPTIMIZED PAYMENT CONFIRMATION BROADCASTING
 * 
 * Ensures instant payment updates across:
 * - Admin dashboard
 * - Table/client ordering page
 * - Session participants
 * - Analytics tracking
 * 
 * Uses granular events to minimize payload size
 */

import { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger";
import { broadcastToSession, broadcastToAdmin } from "./socket-events";
import { metricsCollector } from "./socket-metrics";
import { logRealtimeEvent } from "./socket-reconnect";
import { savePaymentState, PaymentStateEntry } from "./redis-cache";

/* ─── PAYMENT BROADCAST INFRASTRUCTURE ────────────────────────– */

/**
 * Broadcast payment confirmed event
 * Sends to: admin room + session participants
 * Payload: ~150 bytes (vs 2KB+ full session)
 */
export async function broadcastPaymentConfirmed(
  io: SocketIOServer,
  paymentId: string,
  sessionId: string,
  amount: number,
  method: "UPI" | "CASH",
  confirmedAt: number
): Promise<void> {
  try {
    const payload: any = {
      paymentId,
      sessionId,
      amount,
      method,
      confirmedAt,
    };

    // Broadcast to admin
    broadcastToAdmin(io, "payment_confirmed", payload);

    // Broadcast to session participants
    broadcastToSession(io, sessionId, "payment_confirmed", payload);

    // Store for recovery
    await logRealtimeEvent(sessionId, null, "payment_confirmed", payload);

    // Cache payment state
    const entry: PaymentStateEntry = {
      paymentId,
      sessionId,
      amount,
      method,
      status: "CONFIRMED",
      createdAt: confirmedAt,
    };
    await savePaymentState(entry);

    // Metrics
    const payloadSize = JSON.stringify(payload).length;
    metricsCollector.recordEmit("admin", "payment_confirmed", payloadSize, 1);

    logger.info(
      { paymentId, sessionId, amount, method },
      "[BROADCAST] Payment confirmed"
    );
  } catch (err) {
    logger.error({ paymentId, sessionId, err }, "Failed to broadcast payment confirmation");
  }
}

/**
 * Broadcast payment rejected event
 * Much smaller payload than full session update
 */
export async function broadcastPaymentRejected(
  io: SocketIOServer,
  paymentId: string,
  sessionId: string,
  reason: string
): Promise<void> {
  try {
    const payload: any = {
      paymentId,
      sessionId,
      reason,
      rejectedAt: Date.now(),
    };

    // Broadcast to admin and session
    broadcastToAdmin(io, "payment_rejected", payload);
    broadcastToSession(io, sessionId, "payment_rejected", payload);

    // Store for recovery
    await logRealtimeEvent(sessionId, null, "payment_rejected", payload);

    // Metrics
    const payloadSize = JSON.stringify(payload).length;
    metricsCollector.recordEmit("admin", "payment_rejected", payloadSize, 1);

    logger.warn(
      { paymentId, sessionId, reason },
      "[BROADCAST] Payment rejected"
    );
  } catch (err) {
    logger.error({ paymentId, sessionId, err }, "Failed to broadcast payment rejection");
  }
}

/**
 * Broadcast payment created event
 * Initial payment pending state
 */
export async function broadcastPaymentCreated(
  io: SocketIOServer,
  paymentId: string,
  sessionId: string,
  amount: number,
  method: "UPI" | "CASH"
): Promise<void> {
  try {
    const payload: any = {
      paymentId,
      sessionId,
      amount,
      method,
      status: method === "UPI" ? "PENDING" : "UNPAID",
      createdAt: Date.now(),
    };

    // Broadcast to session only (not admin yet - payment just initiated)
    broadcastToSession(io, sessionId, "payment_created", payload);

    // Store for recovery
    await logRealtimeEvent(sessionId, null, "payment_created", payload);

    // Cache
    const entry: PaymentStateEntry = {
      paymentId,
      sessionId,
      amount,
      method,
      status: payload.status,
      createdAt: payload.createdAt,
    };
    await savePaymentState(entry);

    const payloadSize = JSON.stringify(payload).length;
    metricsCollector.recordEmit("session", "payment_created", payloadSize, 1);

    logger.info(
      { paymentId, sessionId, amount, method },
      "[BROADCAST] Payment created"
    );
  } catch (err) {
    logger.error({ paymentId, sessionId, err }, "Failed to broadcast payment creation");
  }
}

/* ─── BULK PAYMENT OPERATIONS ──────────────────────────– */

/**
 * Broadcast payment status changes in bulk
 * Useful for admin batch operations
 */
export async function broadcastPaymentsBulkUpdated(
  io: SocketIOServer,
  updates: Array<{
    paymentId: string;
    sessionId: string;
    changes: Record<string, unknown>;
  }>
): Promise<void> {
  try {
    const payload: any = {
      type: "payment.batch_updated",
      updates: updates.map(u => ({
        id: u.paymentId,
        changes: u.changes,
      })),
      timestamp: Date.now(),
    };

    for (const { sessionId } of updates) {
      broadcastToAdmin(io, "payments_bulkupdated", payload);
      await logRealtimeEvent(sessionId, null, "payments_bulkupdated", payload);
    }

    logger.info({ count: updates.length }, "[BROADCAST] Bulk payment update");
  } catch (err) {
    logger.error({ err }, "Failed to broadcast bulk payment update");
  }
}

/* ─── PAYMENT ACKNOWLEDGMENT HANDLING ───────────────────────– */

/**
 * Handle payment acknowledgment from client
 * Ensures consistency
 */
export async function handlePaymentAck(
  sessionId: string,
  paymentId: string,
  ackType: "received" | "processed" | "displayed"
): Promise<void> {
  try {
    logger.debug(
      { sessionId, paymentId, ackType },
      "[PAYMENT ACK] Client acknowledged"
    );

    // Could use this for retry logic or analytics
    // For now, just log for debugging
  } catch (err) {
    logger.warn({ sessionId, paymentId, err }, "Failed to handle payment ack");
  }
}

/* ─── PAYMENT RETRY ON RECONNECT ───────────────────────– */

/**
 * Resend pending payment confirmation if client missed it
 */
export async function resendPaymentOnReconnect(
  io: SocketIOServer,
  sessionId: string,
  paymentId: string,
  amount: number,
  method: "UPI" | "CASH",
  confirmedAt: number
): Promise<void> {
  try {
    const payload: any = {
      paymentId,
      sessionId,
      amount,
      method,
      confirmedAt,
    };

    // Send to session
    broadcastToSession(io, sessionId, "payment_confirmed", payload);

    logger.info(
      { sessionId, paymentId },
      "[PAYMENT] Resent after reconnect"
    );
  } catch (err) {
    logger.error({ sessionId, paymentId, err }, "Failed to resend payment");
  }
}

/* ─── PAYMENT NOTIFICATION SERVICE ────────────────────────– */

export interface PaymentNotification {
  type: "payment.confirmed" | "payment.rejected" | "payment.pending" | "payment.timeout";
  paymentId: string;
  sessionId: string;
  amount: number;
  method: "UPI" | "CASH";
  timestamp: number;
  message: string;
  action?: "retry" | "manual_confirm" | "cancel";
}

/**
 * Send payment notification to client
 * Used for user-facing messages
 */
export function broadcastPaymentNotification(
  io: SocketIOServer,
  notification: PaymentNotification
): void {
  try {
    // Broadcast to session for user notification
    broadcastToSession(io, notification.sessionId, "payment_notification", {
      type: notification.type,
      message: notification.message,
      action: notification.action,
      amount: notification.amount,
      timestamp: notification.timestamp,
    });

    logger.info(
      { sessionId: notification.sessionId, type: notification.type },
      "[NOTIFICATION] Payment notification sent"
    );
  } catch (err) {
    logger.error({ notification, err }, "Failed to broadcast payment notification");
  }
}

/* ─── ANALYTICS TRACKING ───────────────────────– */

/**
 * Track payment event for analytics
 * Does not block payment confirmation broadcast
 */
export async function trackPaymentEvent(
  paymentId: string,
  sessionId: string,
  event: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    // Fire and forget - don't wait for response
    // This prevents analytics from blocking payment operations
    logRealtimeEvent(
      sessionId,
      null,
      `analytics:payment:${event}`,
      {
        paymentId,
        ...metadata,
        timestamp: Date.now(),
      }
    ).catch(err => {
      logger.warn({ paymentId, event, err }, "Analytics tracking failed");
    });
  } catch (err) {
    // Silently fail - don't affect payment flow
    logger.debug({ err }, "Analytics tracking error (ignored)");
  }
}

/* ─── PAYMENT STATE MACHINE ───────────────────────– */

/**
 * Payment status transitions
 * Ensures only valid state changes are broadcast
 */
export const PAYMENT_STATES = {
  CREATED: "CREATED",
  PENDING: "PENDING", // UPI awaiting confirmation
  CONFIRMED: "CONFIRMED", // Payment received
  REJECTED: "REJECTED", // Payment failed
  CANCELLED: "CANCELLED", // User cancelled
  TIMEOUT: "TIMEOUT", // UPI timeout
} as const;

export function isValidPaymentTransition(
  fromStatus: string,
  toStatus: string
): boolean {
  const validTransitions: Record<string, string[]> = {
    [PAYMENT_STATES.CREATED]: [
      PAYMENT_STATES.PENDING,
      PAYMENT_STATES.CONFIRMED,
      PAYMENT_STATES.CANCELLED,
    ],
    [PAYMENT_STATES.PENDING]: [
      PAYMENT_STATES.CONFIRMED,
      PAYMENT_STATES.REJECTED,
      PAYMENT_STATES.TIMEOUT,
      PAYMENT_STATES.CANCELLED,
    ],
    [PAYMENT_STATES.CONFIRMED]: [], // Terminal state
    [PAYMENT_STATES.REJECTED]: [
      PAYMENT_STATES.PENDING, // Can retry
      PAYMENT_STATES.CANCELLED,
    ],
    [PAYMENT_STATES.TIMEOUT]: [
      PAYMENT_STATES.PENDING, // Can retry
      PAYMENT_STATES.CANCELLED,
    ],
    [PAYMENT_STATES.CANCELLED]: [], // Terminal state
  };

  return (validTransitions[fromStatus] || []).includes(toStatus);
}

/**
 * Get user-friendly message for payment status
 */
export function getPaymentStatusMessage(status: string, method: "UPI" | "CASH"): string {
  const messages: Record<string, string> = {
    [PAYMENT_STATES.CREATED]: "Payment initiated...",
    [PAYMENT_STATES.PENDING]: `Waiting for ${method} confirmation...`,
    [PAYMENT_STATES.CONFIRMED]: "Payment confirmed! ✓",
    [PAYMENT_STATES.REJECTED]: "Payment failed. Please try again.",
    [PAYMENT_STATES.TIMEOUT]: `${method} request timed out.`,
    [PAYMENT_STATES.CANCELLED]: "Payment cancelled.",
  };

  return messages[status] || "Unknown status";
}
