/**
 * SOCKET.IO METRICS & OBSERVABILITY
 * 
 * Tracks:
 * - Event latency (send → receive)
 * - Payload sizes (identifies bandwidth hogs)
 * - Room sizes (connection concentration)
 * - Event throughput (ops/sec)
 * - Reconnect frequency and recovery time
 * - Stale socket detection
 * - Memory usage per connection
 */

import { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger";

/* ─── METRICS INTERFACES ───────────────────────────── */

export interface SocketMetrics {
  socketId: string;
  tableId?: string;
  isAdmin?: boolean;
  connectedAt: number;
  reconnectCount: number;
  lastActivityAt: number;
  totalEventsEmitted: number;
  totalEventsReceived: number;
  totalBytesEmitted: number;
  totalBytesReceived: number;
  currentLatencyMs: number;
  latencyPercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface EventMetric {
  event: string;
  count: number;
  totalSize: number;
  avgSize: number;
  maxSize: number;
  latencyMs: number[];
  lastEmittedAt: number;
}

export interface RoomMetrics {
  roomId: string;
  socketCount: number;
  totalBytesPerSecond: number;
  eventsPerSecond: number;
  activeNow: boolean;
}

/* ─── METRICS COLLECTOR ──────────────────────────– */

export class SocketMetricsCollector {
  private socketMetrics: Map<string, SocketMetrics> = new Map();
  private eventMetrics: Map<string, EventMetric> = new Map();
  private roomMetrics: Map<string, RoomMetrics> = new Map();
  private latencyHistory: Map<string, number[]> = new Map(); // Keep last 100 measurements
  private readonly maxHistorySize = 100;

  /**
   * Register new socket connection
   */
  registerSocket(socketId: string, tableId?: string, isAdmin?: boolean) {
    this.socketMetrics.set(socketId, {
      socketId,
      tableId,
      isAdmin,
      connectedAt: Date.now(),
      reconnectCount: 0,
      lastActivityAt: Date.now(),
      totalEventsEmitted: 0,
      totalEventsReceived: 0,
      totalBytesEmitted: 0,
      totalBytesReceived: 0,
      currentLatencyMs: 0,
      latencyPercentiles: { p50: 0, p95: 0, p99: 0 },
    });

    this.latencyHistory.set(socketId, []);
  }

  /**
   * Record reconnection
   */
  recordReconnect(socketId: string) {
    const metrics = this.socketMetrics.get(socketId);
    if (metrics) {
      metrics.reconnectCount++;
      metrics.lastActivityAt = Date.now();
    }
  }

  /**
   * Track emitted event
   */
  recordEmit(socketId: string, event: string, payloadBytes: number, latencyMs: number) {
    const metrics = this.socketMetrics.get(socketId);
    if (metrics) {
      metrics.totalEventsEmitted++;
      metrics.totalBytesEmitted += payloadBytes;
      metrics.lastActivityAt = Date.now();
      metrics.currentLatencyMs = latencyMs;

      // Update latency percentiles
      this.updateLatencyPercentiles(socketId, latencyMs);
    }

    // Update event metrics
    this.recordEventMetric(event, payloadBytes, latencyMs);
  }

  /**
   * Track received event
   */
  recordReceive(socketId: string, event: string, payloadBytes: number) {
    const metrics = this.socketMetrics.get(socketId);
    if (metrics) {
      metrics.totalEventsReceived++;
      metrics.totalBytesReceived += payloadBytes;
      metrics.lastActivityAt = Date.now();
    }
  }

  /**
   * Update event-level metrics
   */
  private recordEventMetric(event: string, payloadBytes: number, latencyMs: number) {
    if (!this.eventMetrics.has(event)) {
      this.eventMetrics.set(event, {
        event,
        count: 0,
        totalSize: 0,
        avgSize: 0,
        maxSize: 0,
        latencyMs: [],
        lastEmittedAt: Date.now(),
      });
    }

    const metric = this.eventMetrics.get(event)!;
    metric.count++;
    metric.totalSize += payloadBytes;
    metric.avgSize = metric.totalSize / metric.count;
    metric.maxSize = Math.max(metric.maxSize, payloadBytes);
    metric.latencyMs.push(latencyMs);
    metric.lastEmittedAt = Date.now();

    // Keep last 100 latency measurements
    if (metric.latencyMs.length > 100) {
      metric.latencyMs.shift();
    }
  }

  /**
   * Update latency percentiles
   */
  private updateLatencyPercentiles(socketId: string, latencyMs: number) {
    const history = this.latencyHistory.get(socketId) || [];
    history.push(latencyMs);

    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.latencyHistory.set(socketId, history);

    // Calculate percentiles
    const sorted = [...history].sort((a, b) => a - b);
    const metrics = this.socketMetrics.get(socketId);
    if (metrics) {
      metrics.latencyPercentiles = {
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }
  }

  /**
   * Update room metrics
   */
  updateRoomMetrics(io: SocketIOServer) {
    const rooms = io.sockets.adapter.rooms;

    rooms.forEach((sockets, roomId) => {
      if (roomId.startsWith("admin") || roomId.startsWith("table:") || roomId.startsWith("session:")) {
        this.roomMetrics.set(roomId, {
          roomId,
          socketCount: sockets.size,
          totalBytesPerSecond: this.calculateRoomBandwidth(roomId),
          eventsPerSecond: this.calculateRoomThroughput(roomId),
          activeNow: sockets.size > 0,
        });
      }
    });
  }

  /**
   * Calculate room bandwidth usage (bytes/sec)
   */
  private calculateRoomBandwidth(roomId: string): number {
    let totalBytes = 0;
    const rooms = Array.from(this.socketMetrics.values()).filter(m => m.tableId === roomId || m.isAdmin);

    rooms.forEach(metric => {
      // Estimate bytes per second (rough - emitted / uptime in seconds * 1sec window)
      const uptimeSeconds = (Date.now() - metric.connectedAt) / 1000;
      const bytesPerSecond = metric.totalBytesEmitted / Math.max(uptimeSeconds, 1);
      totalBytes += bytesPerSecond;
    });

    return totalBytes;
  }

  /**
   * Calculate room event throughput (ops/sec)
   */
  private calculateRoomThroughput(roomId: string): number {
    let totalOps = 0;
    const rooms = Array.from(this.socketMetrics.values()).filter(m => m.tableId === roomId || m.isAdmin);

    rooms.forEach(metric => {
      const uptimeSeconds = (Date.now() - metric.connectedAt) / 1000;
      const opsPerSecond = metric.totalEventsEmitted / Math.max(uptimeSeconds, 1);
      totalOps += opsPerSecond;
    });

    return totalOps;
  }

  /**
   * Get metrics for specific socket
   */
  getSocketMetrics(socketId: string): SocketMetrics | undefined {
    return this.socketMetrics.get(socketId);
  }

  /**
   * Get metrics for specific event
   */
  getEventMetrics(event: string): EventMetric | undefined {
    return this.eventMetrics.get(event);
  }

  /**
   * Get all room metrics
   */
  getRoomMetrics(): RoomMetrics[] {
    return Array.from(this.roomMetrics.values());
  }

  /**
   * Detect stale sockets (no activity > 5 minutes)
   */
  getStaleConnections(staleAfterMs: number = 5 * 60 * 1000): SocketMetrics[] {
    const now = Date.now();
    return Array.from(this.socketMetrics.values()).filter(
      m => now - m.lastActivityAt > staleAfterMs
    );
  }

  /**
   * Get high-latency connections (p99 > threshold)
   */
  getHighLatencyConnections(thresholdMs: number = 1000): SocketMetrics[] {
    return Array.from(this.socketMetrics.values()).filter(
      m => m.latencyPercentiles.p99 > thresholdMs
    );
  }

  /**
   * Get bandwidth hog events
   */
  getBandwidthHogs(topN: number = 10): EventMetric[] {
    return Array.from(this.eventMetrics.values())
      .sort((a, b) => b.totalSize - a.totalSize)
      .slice(0, topN);
  }

  /**
   * Get slowest events
   */
  getSlowestEvents(topN: number = 10): EventMetric[] {
    return Array.from(this.eventMetrics.values())
      .sort((a, b) => {
        const aAvg = a.latencyMs.reduce((s, v) => s + v, 0) / Math.max(a.latencyMs.length, 1);
        const bAvg = b.latencyMs.reduce((s, v) => s + v, 0) / Math.max(b.latencyMs.length, 1);
        return bAvg - aAvg;
      })
      .slice(0, topN);
  }

  /**
   * Remove socket metrics on disconnect
   */
  removeSocket(socketId: string) {
    this.socketMetrics.delete(socketId);
    this.latencyHistory.delete(socketId);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const sockets = Array.from(this.socketMetrics.values());
    const allLatencies: number[] = [];

    sockets.forEach(m => {
      const history = this.latencyHistory.get(m.socketId) || [];
      allLatencies.push(...history);
    });

    const sortedLatencies = allLatencies.sort((a, b) => a - b);

    return {
      connectedSockets: sockets.length,
      totalEventsEmitted: sockets.reduce((s, m) => s + m.totalEventsEmitted, 0),
      totalEventsReceived: sockets.reduce((s, m) => s + m.totalEventsReceived, 0),
      totalBytesEmitted: sockets.reduce((s, m) => s + m.totalBytesEmitted, 0),
      totalBytesReceived: sockets.reduce((s, m) => s + m.totalBytesReceived, 0),
      globalLatency: {
        p50: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)],
        p95: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
        p99: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)],
        max: Math.max(...allLatencies, 0),
      },
      avgEventsPerSocket: sockets.length > 0 
        ? sockets.reduce((s, m) => s + m.totalEventsEmitted, 0) / sockets.length 
        : 0,
      highLatencyConnections: this.getHighLatencyConnections().length,
      staleConnections: this.getStaleConnections().length,
    };
  }

  /**
   * Log periodic diagnostics
   */
  logDiagnostics() {
    const summary = this.getSummary();
    const bandwidthHogs = this.getBandwidthHogs(5);
    const slowest = this.getSlowestEvents(5);

    if (process.env.NODE_ENV !== "production") {
      console.log("\n📊 [SOCKET METRICS SUMMARY]");
      console.log(`  Sockets: ${summary.connectedSockets}`);
      console.log(`  Global Latency: p50=${summary.globalLatency.p50}ms, p95=${summary.globalLatency.p95}ms, p99=${summary.globalLatency.p99}ms`);
      console.log(`  Events Emitted: ${summary.totalEventsEmitted}`);
      console.log(`  Bytes Emitted: ${(summary.totalBytesEmitted / 1024).toFixed(2)}KB`);
      console.log(`  Stale Connections: ${summary.staleConnections}`);

      if (bandwidthHogs.length > 0) {
        console.log("\n  Top 5 Bandwidth Hogs:");
        bandwidthHogs.forEach(e => {
          console.log(`    - ${e.event}: ${(e.totalSize / 1024).toFixed(2)}KB (${e.count} events)`);
        });
      }

      if (slowest.length > 0) {
        console.log("\n  Slowest 5 Events:");
        slowest.forEach(e => {
          const avgLatency = e.latencyMs.reduce((s, v) => s + v, 0) / e.latencyMs.length;
          console.log(`    - ${e.event}: ${avgLatency.toFixed(1)}ms avg`);
        });
      }
      console.log("");
    }

    logger.info({ summary, bandwidthHogs: bandwidthHogs.map(e => e.event), slowest: slowest.map(e => e.event) }, 
      "[SOCKET] Metrics snapshot");
  }
}

/**
 * Global metrics instance
 */
export const metricsCollector = new SocketMetricsCollector();

/**
 * Integration hook for Socket.IO
 * Call in socket initialization
 */
export function initializeMetricsCollection(io: SocketIOServer) {
  // Update room metrics every 10 seconds
  setInterval(() => {
    metricsCollector.updateRoomMetrics(io);
  }, 10000);

  // Log diagnostics every minute
  setInterval(() => {
    metricsCollector.logDiagnostics();
  }, 60000);

  // Check for stale connections every 5 minutes
  setInterval(() => {
    const staleConnections = metricsCollector.getStaleConnections();
    if (staleConnections.length > 0) {
      logger.warn(
        { count: staleConnections.length, socketIds: staleConnections.map(s => s.socketId) },
        "[SOCKET] Stale connections detected - consider cleanup"
      );
    }
  }, 5 * 60 * 1000);
}

/**
 * Export metrics endpoint data (for monitoring dashboard)
 */
export function getMetricsSnapshot() {
  return {
    summary: metricsCollector.getSummary(),
    roomMetrics: metricsCollector.getRoomMetrics(),
    topBandwidthHogs: metricsCollector.getBandwidthHogs(10),
    slowestEvents: metricsCollector.getSlowestEvents(10),
    highLatencyConnections: metricsCollector.getHighLatencyConnections(),
    staleConnections: metricsCollector.getStaleConnections(),
  };
}
