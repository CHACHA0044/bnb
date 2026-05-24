import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    console.error("[AUTH] ADMIN_SECRET not set in env");
    res.status(500).json({ error: "Server misconfigured" });
    return;
  }

  const auth = req.headers.authorization;
  const providedSecret = auth?.replace("Bearer ", "");
  
  if (!providedSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Timing-safe comparison
  try {
    const a = Buffer.from(providedSecret);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      console.warn("[AUTH] Unauthorized timing-safe check failed");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
