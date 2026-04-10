import { Request, Response, NextFunction } from "express";

if (!process.env.WEBHOOK_SECRET) {
  throw new Error("WEBHOOK_SECRET environment variable is required");
}

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export function validateWebhookSecret(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers["x-webhook-secret"];
  if (secret !== WEBHOOK_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
