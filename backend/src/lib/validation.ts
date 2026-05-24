import { z } from "zod";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { getRedisClient } from "./redis";

/**
 * PAYMENT SCHEMAS
 * These schemas validate ALL incoming payment data strictly.
 * NEVER trust frontend values for amounts, prices, or calculations.
 */

export const CreatePaymentSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  method: z.enum(["UPI", "CASH"] as const, { message: "method must be UPI or CASH" }),
  // Note: amount is NOT included here — it will be calculated server-side from orders
  orderId: z.string().uuid().optional().nullable(),
  customerPhone: z.string().regex(/^\d{10}$/, "Invalid phone number").optional().nullable(),
});

export const ConfirmPaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
});

/**
 * ORDER SCHEMAS
 * Frontend ONLY sends:
 * - item IDs (to be validated against menu)
 * - quantities
 * NEVER: prices, totals, packing charges from frontend
 */

export const OrderItemInput = z.object({
  menuItemId: z.string().uuid("Invalid menu item ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(100, "Quantity too high"),
  variantName: z.string().max(50).optional(), // If user selected a variant
});

export const CreateOrderSchema = z.object({
  sessionId: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.string().uuid("Invalid session ID").optional()),
  tableId: z.string().optional(),
  items: z.array(OrderItemInput).min(1, "At least 1 item required").max(50, "Too many items"),
  isTakeaway: z.boolean().optional().default(false),
  instructions: z.string().max(200, "Instructions too long").optional(),
  customerPhone: z.string().regex(/^\d{10}$/, "Invalid phone number").optional().nullable(),
  // Frontend does NOT send: prices, totals, packing charges
});

/**
 * QR SCHEMAS
 */

export const QRGenerateSchema = z.object({
  tableId: z.string().regex(/^(T[1-3]|TAKEAWAY)$/, "Invalid table ID"),
});

export const QRValidateSchema = z.object({
  tableId: z.string().regex(/^(T[1-3]|TAKEAWAY)$/, "Invalid table ID"),
  token: z.string().min(32, "Invalid token format"),
});

/**
 * REQUEST VALIDATION MIDDLEWARE
 * Validates request body against schema and rejects malformed requests.
 * Also rejects extra unexpected fields (strict mode).
 */

type RequestWithValidatedBody<T> = Request & {
  validatedBody?: T;
  idempotencyKey?: string;
};

function parseWithStrict<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  if (schema instanceof z.ZodObject) {
    return (schema as z.ZodObject<Record<string, z.ZodTypeAny>>).strict().parse(data);
  }

  return schema.parse(data);
}

export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use .strict() to reject extra fields
      const validated = parseWithStrict(schema, req.body) as z.infer<T>;
      (req as RequestWithValidatedBody<z.infer<T>>).validatedBody = validated;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.issues.map(issue => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        console.warn(`[VALIDATION] Rejected malformed request:`, errors);
        res.status(400).json({ error: "Invalid request", details: errors });
        return;
      }
      res.status(400).json({ error: "Request validation failed" });
    }
  };
}

/**
 * REQUEST SIGNING
 * Creates and verifies HMAC signatures for payment operations.
 * This prevents tampering with request payloads.
 */

const SIGNING_KEY = process.env.REQUEST_SIGNING_KEY;
if (!SIGNING_KEY) {
  console.warn("[SECURITY] REQUEST_SIGNING_KEY not set. Request signing disabled.");
}

export function signPayload(payload: Record<string, unknown>): string {
  if (!SIGNING_KEY) {
    console.warn("[SECURITY] Cannot sign payload: REQUEST_SIGNING_KEY is not set.");
    return "";
  }
  const sortedKeys = Object.keys(payload).sort();
  const sortedPayload = sortedKeys.map(k => `${k}=${JSON.stringify(payload[k])}`).join("&");
  return crypto.createHmac("sha256", SIGNING_KEY).update(sortedPayload).digest("hex");
}

export function verifySignature(payload: Record<string, unknown>, signature: string): boolean {
  if (!SIGNING_KEY || !signature) {
    return false;
  }
  const expectedSignature = signPayload(payload);
  if (!expectedSignature) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

/**
 * IDEMPOTENCY KEY TRACKING
 * Prevents duplicate payment submissions from the same request.
 */

const IDEM_PREFIX = "idem:";
const IDEM_TTL = 86400; // 24 hours

export async function requireIdempotentKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const idempotencyKey = req.headers["idempotency-key"] as string;

  if (!idempotencyKey) {
    console.warn("[SECURITY] Missing idempotency-key header on payment request");
    res.status(400).json({ error: "idempotency-key header required for payment operations" });
    return;
  }

  try {
    const redis = await getRedisClient();
    const cached = await redis.get(`${IDEM_PREFIX}${idempotencyKey}`);
    if (cached) {
      console.log(`[SECURITY] Idempotent replay detected for key ${idempotencyKey}`);
      res.status(200).json(JSON.parse(cached));
      return;
    }
  } catch (err) {
    console.warn("[IDEMPOTENCY] Redis check failed, proceeding:", err);
  }

  (req as any).idempotencyKey = idempotencyKey;
  next();
}

export async function cacheIdempotentResponse(
  idempotencyKey: string,
  response: unknown
): Promise<void> {
  try {
    const redis = await getRedisClient();
    await redis.set(`${IDEM_PREFIX}${idempotencyKey}`, JSON.stringify(response), { EX: IDEM_TTL });
  } catch (err) {
    console.warn("[IDEMPOTENCY] Redis cache failed:", err);
  }
}

/**
 * CSRF TOKEN GENERATION & VALIDATION
 * Frontend must include CSRF token for state-changing operations.
 */

const CSRF_PREFIX = "csrf:";
const CSRF_TTL = 3600; // 1 hour

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function storeCSRFToken(sessionId: string, token: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    await redis.set(`${CSRF_PREFIX}${sessionId}`, token, { EX: CSRF_TTL });
  } catch (err) {
    console.warn("[CSRF] Failed to store token in Redis:", err);
  }
}

export async function validateCSRFToken(sessionId: string, token: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const stored = await redis.get(`${CSRF_PREFIX}${sessionId}`);
    if (!stored) return false;

    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(stored)
    );
  } catch (err) {
    console.warn("[CSRF] Failed to validate token from Redis:", err);
    return false;
  }
}

export async function requireCSRFToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const csrfToken = req.headers["x-csrf-token"] as string;
  const sessionId = (req.body?.sessionId || req.query?.sessionId || (req as any).validatedBody?.sessionId) as string;

  if (!csrfToken || !sessionId) {
    console.warn("[SECURITY] Missing CSRF token or sessionId");
    res.status(403).json({ error: "CSRF token required" });
    return;
  }

  const isValid = await validateCSRFToken(sessionId, csrfToken);
  if (!isValid) {
    console.warn(`[SECURITY] Invalid CSRF token for session ${sessionId}`);
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }

  next();
}
