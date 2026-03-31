import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { Role } from "../generated/prisma/client";
import type { Request, Response, NextFunction } from "express";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return void res.status(401).json({ error: "Unauthenticated" });
  req.authSession = session;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authSession) {
      return void res.status(401).json({ error: "Unauthenticated" });
    }
    if (!roles.includes(req.authSession.user.role as Role)) {
      return void res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
