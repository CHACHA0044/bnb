import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Remote DBs have inherent network latency (~100-200ms), so 500ms is a meaningful threshold
const SLOW_QUERY_THRESHOLD_MS = 500;

// Transaction control statements that can't be optimised — skip logging for these
const TRANSACTION_NOISE_PATTERNS = ["BEGIN", "COMMIT", "ROLLBACK", "DEALLOCATE ALL", "SET "];

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "error" },
    { emit: "stdout", level: "warn" },
  ],
});

// @ts-ignore
prisma.$on("query", (e: any) => {
  // Skip transaction control statements — they appear slow due to network roundtrip but are not actionable
  const isNoise = TRANSACTION_NOISE_PATTERNS.some(p => e.query.trimStart().startsWith(p));
  if (isNoise) return;

  if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
    logger.warn({
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
      message: "🐌 Slow Prisma query detected",
    });
  }
});

globalForPrisma.prisma = prisma;

