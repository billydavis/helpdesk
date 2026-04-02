import { Router } from "express";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";
import { prisma } from "../db";
import { Role } from "../generated/prisma/client";
import { createUserSchema } from "core";

const router = Router();

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

router.post("/", async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    return void res.status(400).json({ error: result.error.issues[0].message });
  }
  const { name, email, password } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return void res.status(409).json({ error: "A user with that email already exists." });
  }

  const userId = generateId();
  const hashedPassword = await hashPassword(password);

  await prisma.user.create({
    data: { id: userId, name, email, emailVerified: true, role: Role.agent },
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

router.delete("/:id", async (req, res) => {
  if (req.params.id === req.authSession!.user.id) {
    return void res.status(400).json({ error: "You cannot delete your own account." });
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
