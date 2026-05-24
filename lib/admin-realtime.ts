/**
 * ADMIN REALTIME OPTIMIZATION LAYER
 * 
 * Optimizations:
 * - Delta-only updates to prevent full state recalculations
 * - Batch updates for multiple sessions
 * - Efficient filtering without full recompute
 * - Subscription lifecycle management
 * - Memory-efficient change tracking
 * - Deferred UI updates for bursty events
 */

import { useState, useCallback, useRef, useEffect } from "react";

/* ─── TYPES ────────────────────────────────────── */

export interface AdminSessionState {
  [sessionId: string]: {
    id: string;
    tableId: string;
    status: string;
    orderCount: number;
    totalAmount: number;
    paymentStatus: string;
    lastUpdatedAt: number;
    orders: unknown[];
    payments: unknown[];
  };
}

export interface CreateDelta {
  type: "order.created" | "payment.created" | "session.created";
  sessionId: string;
  itemId?: string;
  data: unknown;
}

export interface UpdateDelta {
  type: "order.updated" | "payment.updated" | "item.served";
  sessionId: string;
  itemId?: string;
  changes: Record<string, unknown>;
}

export interface DeleteDelta {
  type: "order.deleted" | "payment.deleted";
  sessionId: string;
  itemId: string;
}

export type AdminDelta = CreateDelta | UpdateDelta | DeleteDelta;

/* ─── DELTA APPLIER ───────────────────────────────– */

/**
 * Apply delta to session state efficiently
 * Updates only changed properties
 */
export function applyDeltaToSession(
  session: Record<string, unknown>,
  delta: AdminDelta
): Record<string, unknown> | null {
  switch (delta.type) {
    case "order.created":
      return {
        ...session,
        orders: [delta.data, ...(session.orders as unknown[])],
        orderCount: (session.orderCount as number) + 1,
        totalAmount: (session.totalAmount as number) + ((delta.data as { total?: number })?.total || 0),
        lastUpdatedAt: Date.now(),
      };

    case "order.updated":
      return {
        ...session,
        orders: (session.orders as unknown[]).map((o: unknown) =>
          (o as { id?: string }).id === delta.itemId
            ? { ...(o as Record<string, unknown>), ...delta.changes, updatedAt: Date.now() }
            : o
        ),
        lastUpdatedAt: Date.now(),
      };

    case "order.deleted":
      const deletedOrder = (session.orders as unknown[]).find((o: unknown) => (o as { id?: string }).id === delta.itemId);
      return {
        ...session,
        orders: (session.orders as unknown[]).filter((o: unknown) => (o as { id?: string }).id !== delta.itemId),
        orderCount: Math.max(0, (session.orderCount as number) - 1),
        totalAmount: Math.max(0, (session.totalAmount as number) - ((deletedOrder as { total?: number })?.total || 0)),
        lastUpdatedAt: Date.now(),
      };

    case "payment.created":
      return {
        ...session,
        payments: [delta.data, ...(session.payments as unknown[])],
        paymentStatus: (delta.data as { status?: string }).status,
        lastUpdatedAt: Date.now(),
      };

    case "payment.updated":
      return {
        ...session,
        payments: (session.payments as unknown[]).map((p: unknown) =>
          (p as { id?: string }).id === delta.itemId
            ? { ...(p as Record<string, unknown>), ...delta.changes, updatedAt: Date.now() }
            : p
        ),
        paymentStatus: (delta.changes.status as string) || (session.paymentStatus as string),
        lastUpdatedAt: Date.now(),
      };

    case "payment.deleted":
      return {
        ...session,
        payments: (session.payments as unknown[]).filter((p: unknown) => (p as { id?: string }).id !== delta.itemId),
        lastUpdatedAt: Date.now(),
      };

    case "item.served":
      return {
        ...session,
        orders: (session.orders as unknown[]).map((o: unknown) => ({
          ...(o as Record<string, unknown>),
          items: (o as { items?: unknown[] }).items?.map((i: unknown) =>
            (i as { id?: string }).id === delta.itemId
              ? { ...(i as Record<string, unknown>), served: true, servedAt: Date.now() }
              : i
          ),
        })),
        lastUpdatedAt: Date.now(),
      };

    case "session.created":
      return delta.data as Record<string, unknown>;

    default:
      return session;
  }
}

/* ─── BATCH DELTA PROCESSOR ────────────────────────────– */

/**
 * Queue deltas and apply in batches
 * Prevents excessive state updates
 */
export class DeltaBatcher {
  private deltas: AdminDelta[] = [];
  private isProcessing = false;
  private batchTimeout: NodeJS.Timeout | null = null;
  readonly BATCH_INTERVAL = 100; // ms
  readonly MAX_BATCH_SIZE = 50;

  constructor(private onBatch: (deltas: AdminDelta[]) => void) {}

  /**
   * Queue a delta for batch processing
   */
  queue(delta: AdminDelta): void {
    this.deltas.push(delta);

    if (this.deltas.length >= this.MAX_BATCH_SIZE) {
      this.flush();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flush(), this.BATCH_INTERVAL);
    }
  }

  /**
   * Process queued deltas
   */
  private flush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.deltas.length === 0) return;

    const batch = this.deltas.splice(0, this.MAX_BATCH_SIZE);
    this.onBatch(batch);
  }

  /**
   * Force immediate flush
   */
  flushImmediate(): void {
    this.flush();
  }

  /**
   * Clear queue without processing
   */
  clear(): void {
    this.deltas = [];
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }

  /**
   * Get queue size for debugging
   */
  getQueueSize(): number {
    return this.deltas.length;
  }
}

/* ─── EFFICIENT STATE UPDATES ─────────────────────────– */

/**
 * Compute only the updated sessions
 * Prevents recalculating untouched sessions
 */
export function computeAffectedSessions(
  deltas: AdminDelta[]
): Set<string> {
  return new Set(deltas.map(d => d.sessionId));
}

/**
 * Check if change is meaningful
 * Prevents unnecessary UI updates
 */
export function isDeltaMeaningful(delta: AdminDelta): boolean {
  // Ignore updates with no actual changes
  if (delta.type.includes("updated")) {
    const updateDelta = delta as UpdateDelta;
    return Object.keys(updateDelta.changes).length > 0;
  }

  // Creation and deletion are always meaningful
  return true;
}

/**
 * Deduplicate deltas for same resource
 * Keeps only the latest change
 */
export function deduplicateDeltas(deltas: AdminDelta[]): AdminDelta[] {
  const map = new Map<string, AdminDelta>();

  deltas.forEach(delta => {
    const key = `${delta.type}:${delta.sessionId}:${delta.itemId || ""}`;
    
    // Keep updates, but only the latest one
    if (delta.type.includes("deleted")) {
      // Deletion overrides everything
      map.set(key, delta);
    } else if (delta.type.includes("created")) {
      // Creation is final
      if (!map.has(key)) {
        map.set(key, delta);
      }
    } else if (delta.type.includes("updated")) {
      // Merge updates
      const existing = map.get(key);
      if (existing && existing.type.includes("updated")) {
        const existingUpdate = existing as UpdateDelta;
        const deltaUpdate = delta as UpdateDelta;
        const merged: UpdateDelta = {
          ...deltaUpdate,
          changes: { ...existingUpdate.changes, ...deltaUpdate.changes },
        };
        map.set(key, merged);
      } else {
        map.set(key, delta);
      }
    }
  });

  return Array.from(map.values());
}

/* ─── ADMIN SUBSCRIPTION MANAGER ────────────────────────– */

/**
 * Manages admin realtime subscriptions
 * Efficiently handles multiple tables/sessions
 */
export function useAdminRealtimeOptimized() {
  const [sessions, setSessions] = useState<AdminSessionState>({});
  const batcherRef = useRef<DeltaBatcher | null>(null);
  const processingRef = useRef(false);

  /**
   * Initialize batcher
   */
  useEffect(() => {
    batcherRef.current = new DeltaBatcher((deltas) => {
      if (processingRef.current) return; // Prevent concurrent updates

      processingRef.current = true;

      try {
        // Deduplicate to prevent redundant updates
        const meaningful = deltas.filter(isDeltaMeaningful);
        const deduped = deduplicateDeltas(meaningful);

        // Find affected sessions
        const affected = computeAffectedSessions(deduped);

        // Update only affected sessions
        setSessions((prev: AdminSessionState) => {
          const next = { ...prev };
          let hasChanges = false;

          affected.forEach(sessionId => {
            const session = next[sessionId];
            if (!session) return;

            let updated: unknown = session;

            const sessionDeltas = deduped.filter(d => d.sessionId === sessionId);
            sessionDeltas.forEach(delta => {
              const result = applyDeltaToSession(updated as Record<string, unknown>, delta);
              if (result) {
                updated = result;
                hasChanges = true;
              }
            });

            if (hasChanges) {
              next[sessionId] = updated as typeof session;
            }
          });

          return hasChanges ? next : prev;
        });
      } finally {
        processingRef.current = false;
      }
    });

    return () => {
      batcherRef.current?.clear();
    };
  }, []);

  /**
   * Queue delta for processing
   */
  const queueDelta = useCallback((delta: AdminDelta) => {
    batcherRef.current?.queue(delta);
  }, []);

  /**
   * Batch queue multiple deltas
   */
  const queueDeltas = useCallback((deltas: AdminDelta[]) => {
    deltas.forEach(d => batcherRef.current?.queue(d));
  }, []);

  /**
   * Manual flush for critical updates
   */
  const flush = useCallback(() => {
    batcherRef.current?.flushImmediate();
  }, []);

  /**
   * Replace entire session
   */
  const setSession = useCallback((sessionId: string, session: unknown) => {
    setSessions((prev: AdminSessionState) => ({
      ...prev,
      [sessionId]: session as AdminSessionState[string],
    }));
  }, []);

  /**
   * Bulk replace sessions
   */
  const setMultipleSessions = useCallback((newSessions: Record<string, unknown>) => {
    setSessions((prev: AdminSessionState) => ({
      ...prev,
      ...(newSessions as Record<string, AdminSessionState[string]>),
    }));
  }, []);

  /**
   * Remove session
   */
  const removeSession = useCallback((sessionId: string) => {
    setSessions((prev: AdminSessionState) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }, []);

  /**
   * Get queue size for debugging
   */
  const getQueueSize = useCallback(() => {
    return batcherRef.current?.getQueueSize() ?? 0;
  }, []);

  return {
    sessions,
    queueDelta,
    queueDeltas,
    setSession,
    setMultipleSessions,
    removeSession,
    flush,
    getQueueSize,
  };
}

/* ─── SELECTOR PATTERNS FOR MEMOIZATION ──────────────────────– */

/**
 * Select single session without rerendering other tables
 */
export function selectSession(
  sessions: AdminSessionState,
  sessionId: string
): Record<string, unknown> | null {
  return (sessions[sessionId] as Record<string, unknown>) || null;
}

/**
 * Select table sessions
 */
export function selectTableSessions(
  sessions: AdminSessionState,
  tableId: string
): Record<string, unknown>[] {
  return Object.values(sessions).filter(s => (s as Record<string, unknown>).tableId === tableId);
}

/**
 * Select open sessions
 */
export function selectOpenSessions(sessions: AdminSessionState): Record<string, unknown>[] {
  return Object.values(sessions).filter(s => (s as Record<string, unknown>).status === "OPEN");
}

/**
 * Compute session summary without full state traversal
 */
export function computeSessionSummary(session: Record<string, unknown>) {
  return {
    id: session.id,
    tableId: session.tableId,
    orderCount: session.orderCount,
    totalAmount: session.totalAmount,
    paymentStatus: session.paymentStatus,
    lastUpdatedAt: session.lastUpdatedAt,
  };
}

/**
 * Compute admin dashboard KPIs efficiently
 */
export function computeAdminKPIs(sessions: AdminSessionState) {
  const values = Object.values(sessions);

  return {
    totalActiveSessions: values.length,
    totalOrders: values.reduce((s: number, v) => s + v.orderCount, 0),
    totalRevenue: values.reduce((s: number, v) => s + v.totalAmount, 0),
    pendingPayments: values.filter(v => v.paymentStatus === "PENDING").length,
    completedSessions: values.filter(v => v.status === "CLOSED").length,
  };
}
