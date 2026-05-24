import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedisClient } from "./redis";

/**
 * Initialize Redis-backed rate limiters.
 */
export async function createRateLimiters() {
  const client = await getRedisClient();

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    requestPropertyName: 'apiRateLimit',
    store: new RedisStore({
      sendCommand: (...args: string[]) => client.sendCommand(args),
    }),
  });

  const orderLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    message: { error: "Too many orders. Please wait a minute." },
    requestPropertyName: 'orderRateLimit',
    store: new RedisStore({
      sendCommand: (...args: string[]) => client.sendCommand(args),
    }),
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many login attempts." },
    requestPropertyName: 'authRateLimit',
    store: new RedisStore({
      sendCommand: (...args: string[]) => client.sendCommand(args),
    }),
  });

  return { apiLimiter, orderLimiter, authLimiter };
}
