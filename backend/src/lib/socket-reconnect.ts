/**
 * SOCKET RECONNECT RECOVERY SYSTEM
 * 
 * Handles:
 * - Event log storage for missed events
 * - Reconnect state synchronization
 * - Mobile network dropout recovery
 * - Exponential backoff strategies
 * - Deduplication of events
 * - Cache invalidation after reconnect
 */

import { getRedisClient } from "./redis";
import { logger } from "./logger";

/* ─── CONFIGURATION ──────────────────────────────– */

const CONFIG = {
  // Keep event history for 5 minutes
  EVENT_LOG_TTL: 5 * 60,
  // Maximum events to store per session
  MAX_EVENTS_PER_SESSION: 100,
  // Exponential backoff base (ms)
  RECONNECT_BASE_DELAY: 1000,
  // Max reconnect delay (30 seconds)
  RECONNECT_MAX_DELAY: 30000,
  // Number of reconnect attempts before reset
  MAX_RECONNECT_ATTEMPTS: 10,
};

const REDIS_KEYS = {
  EVENT_LOG: "events:log:",
  EVENT_SEQ: "events:seq:",
  SESSION_STATE: "session:state:",
  RECONNECT_STATE: "reconnect:state:",
};

/* ─── EVENT LOGGING ──────────────────────────────– */

export interface StoredEvent {
  seq: number;
  timestamp: number;
  event: string;
  data: unknown;
  sessionId?: string;
  tableId?: string;
}

/**
 * Append event to Redis log
 * Used to recover missed events on reconnect
 */
export async function logRealtimeEvent(
  sessionId: string | null,
  tableId: string | null,
  event: string,
  data: unknown
): Promise<number> {
  const redis = await getRedisClient();
  const logKey = `${REDIS_KEYS.EVENT_LOG}${sessionId || tableId || "global"}`;
  const seqKey = `${REDIS_KEYS.EVENT_SEQ}${sessionId || tableId || "global"}`;

  try {
    // Increment sequence number
    const seq = await redis.incr(seqKey);

    // Store event
    const storedEvent: StoredEvent = {
      seq,
      timestamp: Date.now(),
      event,
      data: JSON.stringify(data),
      sessionId: sessionId || undefined,
      tableId: tableId || undefined,
    };

    // Append to log
    await redis.rPush(logKey, JSON.stringify(storedEvent));

    // Trim to max events
    await redis.lTrim(logKey, -CONFIG.MAX_EVENTS_PER_SESSION, -1);

    // Set TTL
    await redis.expire(logKey, CONFIG.EVENT_LOG_TTL);
    await redis.expire(seqKey, CONFIG.EVENT_LOG_TTL);

    return seq;
  } catch (err) {
    logger.warn({ sessionId, tableId, event, err }, "Event logging failed");
    return -1;
  }
}

/**
 * Get missed events for client
 * Called on reconnect to catch up
 */
export async function getMissedEvents(
  sessionId: string | null,
  tableId: string | null,
  fromSeq: number
): Promise<StoredEvent[]> {
  const redis = await getRedisClient();
  const logKey = `${REDIS_KEYS.EVENT_LOG}${sessionId || tableId || "global"}`;

  try {
    const events = await redis.lRange(logKey, 0, -1);
    
    if (!events.length) {
      return [];
    }

    const parsed: StoredEvent[] = events.map(e => {
      try {
        const event = JSON.parse(e);
        event.data = JSON.parse(event.data);
        return event;
      } catch {
        return null;
      }
    }).filter((e): e is StoredEvent => e !== null);

    // Filter to events after fromSeq
    return parsed.filter(e => e.seq > fromSeq);
  } catch (err) {
    logger.warn({ sessionId, tableId, fromSeq, err }, "Failed to get missed events");
    return [];
  }
}

/**
 * Clear event log (after successful delivery)
 * Saves Redis memory
 */
export async function clearEventLog(sessionId: string | null, tableId: string | null): Promise<void> {
  const redis = await getRedisClient();
  const logKey = `${REDIS_KEYS.EVENT_LOG}${sessionId || tableId || "global"}`;
  const seqKey = `${REDIS_KEYS.EVENT_SEQ}${sessionId || tableId || "global"}`;

  try {
    await Promise.all([
      redis.del(logKey),
      redis.del(seqKey),
    ]);
  } catch (err) {
    logger.warn({ sessionId, tableId, err }, "Failed to clear event log");
  }
}

/* ─── RECONNECT STATE MANAGEMENT ──────────────────────────– */

export interface ReconnectState {
  lastSeq: number;
  lastSessionId: string | null;
  lastTableId: string | null;
  disconnectedAt: number;
  reconnectAttempts: number;
  lastReconnectAt: number;
}

/**
 * Save reconnect state for client recovery
 */
export async function saveReconnectState(
  clientId: string,
  lastSeq: number,
  sessionId: string | null,
  tableId: string | null
): Promise<void> {
  const redis = await getRedisClient();
  const key = `${REDIS_KEYS.RECONNECT_STATE}${clientId}`;

  try {
    const state: ReconnectState = {
      lastSeq,
      lastSessionId: sessionId,
      lastTableId: tableId,
      disconnectedAt: Date.now(),
      reconnectAttempts: 0,
      lastReconnectAt: 0,
    };

    // Keep for 30 minutes
    await redis.set(key, JSON.stringify(state), { EX: 30 * 60 });
  } catch (err) {
    logger.warn({ clientId, err }, "Failed to save reconnect state");
  }
}

/**
 * Get reconnect state for client
 */
export async function getReconnectState(clientId: string): Promise<ReconnectState | null> {
  const redis = await getRedisClient();
  const key = `${REDIS_KEYS.RECONNECT_STATE}${clientId}`;

  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn({ clientId, err }, "Failed to get reconnect state");
    return null;
  }
}

/**
 * Update reconnect attempt count
 */
export async function recordReconnectAttempt(clientId: string): Promise<number> {
  const redis = await getRedisClient();
  const key = `${REDIS_KEYS.RECONNECT_STATE}${clientId}`;

  try {
    const state = await getReconnectState(clientId);
    if (!state) return 1;

    state.reconnectAttempts++;
    state.lastReconnectAt = Date.now();

    await redis.set(key, JSON.stringify(state), { EX: 30 * 60 });
    return state.reconnectAttempts;
  } catch (err) {
    logger.warn({ clientId, err }, "Failed to record reconnect attempt");
    return 1;
  }
}

/**
 * Clear reconnect state after successful reconnect
 */
export async function clearReconnectState(clientId: string): Promise<void> {
  const redis = await getRedisClient();
  const key = `${REDIS_KEYS.RECONNECT_STATE}${clientId}`;

  try {
    await redis.del(key);
  } catch (err) {
    logger.warn({ clientId, err }, "Failed to clear reconnect state");
  }
}

/* ─── EXPONENTIAL BACKOFF CALCULATION ────────────────────────– */

/**
 * Calculate next reconnect delay with exponential backoff
 */
export function calculateNextReconnectDelay(
  attemptNumber: number
): number {
  // Exponential backoff: base * 2^attempt, capped
  const exponentialDelay = CONFIG.RECONNECT_BASE_DELAY * Math.pow(2, attemptNumber - 1);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * exponentialDelay * 0.1; // 10% jitter
  
  // Cap at max delay
  const delay = Math.min(exponentialDelay + jitter, CONFIG.RECONNECT_MAX_DELAY);
  
  return Math.floor(delay);
}

/**
 * Check if reconnect should be attempted
 * Returns false if max attempts exceeded
 */
export function shouldAttemptReconnect(attemptNumber: number): boolean {
  return attemptNumber <= CONFIG.MAX_RECONNECT_ATTEMPTS;
}

/* ─── STATE SYNC ON RECONNECT ────────────────────────– */

export interface ReconnectSyncPayload {
  missedEvents: StoredEvent[];
  sequenceNumber: number;
  stateVersion: number;
  requiresFullSync: boolean;
  reconnectTimestampMs: number;
}

/**
 * Prepare reconnect sync payload
 * Sends missed events + signals if full state sync needed
 */
export async function prepareReconnectSync(
  clientId: string,
  sessionId: string | null,
  tableId: string | null
): Promise<ReconnectSyncPayload> {
  try {
    const reconnectState = await getReconnectState(clientId);
    const lastSeq = reconnectState?.lastSeq ?? 0;
    
    // Get missed events
    const missedEvents = await getMissedEvents(sessionId, tableId, lastSeq);
    
    // Calculate current sequence
    const redis = await getRedisClient();
    const seqKey = `${REDIS_KEYS.EVENT_SEQ}${sessionId || tableId || "global"}`;
    const currentSeq = parseInt(await redis.get(seqKey) || "0");
    
    // If gap too large, request full sync
    const gap = currentSeq - lastSeq;
    const requiresFullSync = gap > CONFIG.MAX_EVENTS_PER_SESSION || missedEvents.length === 0;
    
    return {
      missedEvents: missedEvents.slice(0, CONFIG.MAX_EVENTS_PER_SESSION),
      sequenceNumber: currentSeq,
      stateVersion: Date.now(), // Simple version
      requiresFullSync,
      reconnectTimestampMs: Date.now(),
    };
  } catch (err) {
    logger.error({ clientId, sessionId, tableId, err }, "Reconnect sync preparation failed");
    
    return {
      missedEvents: [],
      sequenceNumber: 0,
      stateVersion: 0,
      requiresFullSync: true, // Safety: request full sync on error
      reconnectTimestampMs: Date.now(),
    };
  }
}

/* ─── MOBILE NETWORK RESILIENCE ──────────────────────– */

/**
 * Mobile-specific reconnect configuration
 * Slower backoff for battery/data savings
 */
export const MOBILE_RECONNECT_CONFIG = {
  // More aggressive exponential backoff for mobile
  BASE_DELAY: 2000, // Start at 2 seconds instead of 1
  MAX_ATTEMPTS: 15,
  // Longer TTLs for mobile sessions
  EVENT_LOG_TTL: 10 * 60, // 10 minutes instead of 5
  // Disable aggressive reconnects on cellular
  CELLULAR_MAX_RECONNECT_FREQUENCY: 30000, // Max 1 reconnect per 30 sec on cellular
};

/**
 * Detect network weakness and adjust strategy
 */
export function getReconnectConfig(isMobileNetwork: boolean, isWeakConnection: boolean) {
  if (isMobileNetwork || isWeakConnection) {
    return MOBILE_RECONNECT_CONFIG;
  }
  return {
    BASE_DELAY: CONFIG.RECONNECT_BASE_DELAY,
    MAX_ATTEMPTS: CONFIG.MAX_RECONNECT_ATTEMPTS,
    EVENT_LOG_TTL: CONFIG.EVENT_LOG_TTL,
    CELLULAR_MAX_RECONNECT_FREQUENCY: Infinity, // No limit for desktop
  };
}

/* ─── RECOVERY STATISTICS ────────────────────────– */

export interface RecoveryStats {
  totalReconnects: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  avgRecoveryTimeMs: number;
  avgMissedEventsPerReconnect: number;
}

/**
 * Track recovery metrics
 * Helps optimize reconnect strategy
 */
export async function trackRecoveryStats(
  clientId: string,
  success: boolean,
  recoveryTimeMs: number,
  missedEventCount: number
): Promise<void> {
  const redis = await getRedisClient();
  const statsKey = `stats:recovery:${clientId}`;

  try {
    const statsData = await redis.get(statsKey);
    const stats: RecoveryStats = statsData ? JSON.parse(statsData) : {
      totalReconnects: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      avgRecoveryTimeMs: 0,
      avgMissedEventsPerReconnect: 0,
    };

    stats.totalReconnects++;
    
    if (success) {
      stats.successfulRecoveries++;
      stats.avgRecoveryTimeMs = 
        (stats.avgRecoveryTimeMs * (stats.successfulRecoveries - 1) + recoveryTimeMs) / 
        stats.successfulRecoveries;
      stats.avgMissedEventsPerReconnect =
        (stats.avgMissedEventsPerReconnect * (stats.successfulRecoveries - 1) + missedEventCount) /
        stats.successfulRecoveries;
    } else {
      stats.failedRecoveries++;
    }

    await redis.set(statsKey, JSON.stringify(stats), { EX: 24 * 60 * 60 });
  } catch (err) {
    logger.warn({ clientId, err }, "Failed to track recovery stats");
  }
}

/**
 * Get recovery statistics for a client
 */
export async function getRecoveryStats(clientId: string): Promise<RecoveryStats | null> {
  const redis = await getRedisClient();
  const statsKey = `stats:recovery:${clientId}`;

  try {
    const data = await redis.get(statsKey);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn({ clientId, err }, "Failed to get recovery stats");
    return null;
  }
}
