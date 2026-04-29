import { Request, Response, NextFunction } from "express";

/**
 * Express middleware — checks Authorization: Bearer ADMIN_SECRET.
 * Returns 401 if missing or wrong.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    console.error("[AUTH] ADMIN_SECRET not set in env");
    res.status(500).json({ error: "Server misconfigured" });
    return;
  }

  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
