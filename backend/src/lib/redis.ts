import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
let proxiedRedisClient: RedisClientType | null = null;
let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;

let redisCommandCount = 0;
let redisLatencySum = 0;

export function getRedisMetrics() {
  return {
    commandCount: redisCommandCount,
    avgLatencyMs: redisCommandCount > 0 ? redisLatencySum / redisCommandCount : 0,
  };
}

const MONITORED_COMMANDS = new Set([
  "get", "set", "del", "incr", "expire", "scan", "mGet", "ping", "watch", "unwatch"
]);

/**
 * Get or create a singleton Redis client.
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (proxiedRedisClient) return proxiedRedisClient;

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          const delay = Math.min(retries * 50, 2000);
          return delay;
        },
      },
    });

    redisClient.on("error", (err: Error) => console.error("[REDIS] Client Error:", err));
    redisClient.on("connect", () => console.log("[REDIS] Client Connected"));

    await redisClient.connect();
  }

  proxiedRedisClient = new Proxy(redisClient, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && MONITORED_COMMANDS.has(prop)) {
        const originalValue = target[prop as keyof typeof target];
        if (typeof originalValue === "function") {
          return async function (...args: any[]) {
            const start = Date.now();
            redisCommandCount++;
            try {
              return await (originalValue as Function).apply(target, args);
            } finally {
              redisLatencySum += (Date.now() - start);
            }
          };
        }
      }
      return Reflect.get(target, prop, receiver);
    }
  });

  return proxiedRedisClient;
}

/**
 * Get Redis clients for Socket.IO adapter.
 */
export async function getRedisAdapterClients() {
  if (pubClient && subClient) return { pubClient, subClient };

  pubClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries: number) => Math.min(retries * 50, 2000),
    },
  });
  subClient = pubClient.duplicate();

  pubClient.on("error", (err: Error) => console.error("[REDIS] Pub Client Error:", err));
  subClient.on("error", (err: Error) => console.error("[REDIS] Sub Client Error:", err));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  return { pubClient, subClient };
}

/**
 * Gracefully close Redis connections.
 */
export async function closeRedis() {
  if (redisClient) await redisClient.quit();
  if (pubClient) await pubClient.quit();
  if (subClient) await subClient.quit();
}
