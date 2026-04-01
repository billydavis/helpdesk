import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { prisma } from "./db";
import { requireAuth, requireRole } from "./middleware/auth";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";
import { Role } from "./generated/prisma/client";
import { z } from "zod";

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
adminRouter.use(requireRole("admin"));
app.use("/api/admin", adminRouter);

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(12),
  role: z.enum(["admin", "agent"]),
});

adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

adminRouter.post("/users", async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    return void res.status(400).json({ error: result.error.issues[0].message });
  }
  const { name, email, password, role } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return void res.status(409).json({ error: "A user with that email already exists." });
  }

  const userId = generateId();
  const hashedPassword = await hashPassword(password);

  await prisma.user.create({
    data: { id: userId, name, email, emailVerified: true, role: role as Role },
  });
  await prisma.account.create({
    data: {
      id: generateId(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
    },
  });

  res.status(201).json({ success: true });
});

adminRouter.delete("/users/:id", async (req, res) => {
  if (req.params.id === req.authSession!.user.id) {
    return void res.status(400).json({ error: "You cannot delete your own account." });
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
