import { Request, Response, NextFunction } from "express";
import { inboundEmailSchema, InboundEmail } from "core";

export type { InboundEmail };

export function validateEmailWebhook(req: Request, res: Response, next: NextFunction) {
  const result = inboundEmailSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.flatten().fieldErrors });
    return;
  }
  req.body = result.data;
  next();
}
