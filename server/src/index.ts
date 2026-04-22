import "./instrument";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { requireAuth, requireRole } from "./middleware/auth";
import { Role } from "./generated/prisma/client";
import { prisma } from "./db";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";
import emailWebhookRouter from "./routes/email";
import { validateWebhookSecret } from "./middleware/validateWebhookSecret";
import { startQueue, stopQueue } from "./queue";

// CLIENT_ORIGIN is validated in auth.ts (imported above)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN!;

const app = express();
const PORT = process.env.PORT || 5150;

app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));

const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const isProduction = process.env.NODE_ENV === "production";

// Must be mounted before express.json()
// All webhook routes require the x-webhook-secret header
const webhooksRouter = express.Router();
webhooksRouter.use(validateWebhookSecret);
webhooksRouter.use("/email", emailWebhookRouter);
app.use("/api/webhooks", webhooksRouter);

app.post(
  "/api/auth/sign-in/email",
  ...(isProduction ? [signInLimiter] : []),
  toNodeHandler(auth)
);
app.all(
  "/api/auth/*",
  ...(isProduction ? [authLimiter] : []),
  toNodeHandler(auth)
);

app.use(express.json());

app.use("/api/tickets", requireAuth, ticketsRouter);

app.get("/api/agents", requireAuth, async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  res.json({ agents });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", requireAuth, (req, res) => {
  if (!req.authSession) return void res.status(401).json({ error: "Unauthenticated" });
  const { id, name, email, role } = req.authSession.user;
  res.json({ user: { id, name, email, role } });
});

// Admin-only routes — both requireAuth and requireRole("admin") are pre-applied
const adminRouter = express.Router();
adminRouter.use(requireAuth);
adminRouter.use(requireRole(Role.admin));
app.use("/api/admin", adminRouter);

adminRouter.use("/users", usersRouter);

// Must be registered after all routes — Sentry captures the error, then calls next(err)
Sentry.setupExpressErrorHandler(app);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function main() {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  await startQueue();
}

async function shutdown() {
  await stopQueue();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
