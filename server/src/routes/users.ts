import { Router, type Response } from "express";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";
import { type ZodSchema } from "zod";
import { prisma } from "../db";
import { Role } from "../generated/prisma/client";
import { createUserSchema, updateUserSchema } from "core";

const router = Router();

function parseBody<T>(schema: ZodSchema<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return null;
  }
  return result.data;
}

router.get("/", async (req, res) => {
  const roleRaw = req.query.role as string | undefined;
  const roleFilter = roleRaw === Role.admin || roleRaw === Role.agent ? roleRaw : undefined;

  const users = await prisma.user.findMany({
    where: { deletedAt: null, ...(roleFilter && { role: roleFilter }) },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

router.post("/", async (req, res) => {
  const data = parseBody(createUserSchema, req.body, res);
  if (!data) return;
  const { name, email, password } = data;

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

router.patch("/:id", async (req, res) => {
  const data = parseBody(updateUserSchema, req.body, res);
  if (!data) return;
  const { name, email, password } = data;

  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id: req.params.id } },
  });
  if (existing) {
    return void res.status(409).json({ error: "A user with that email already exists." });
  }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { name, email },
  });

  if (password) {
    const hashedPassword = await hashPassword(password);
    await prisma.account.updateMany({
      where: { userId: req.params.id, providerId: "credential" },
      data: { password: hashedPassword },
    });
  }

  res.json({ success: true });
});

router.delete("/:id", async (req, res) => {
  if (req.params.id === req.authSession!.user.id) {
    return void res.status(400).json({ error: "You cannot delete your own account." });
  }
  await prisma.user.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });
  await prisma.ticket.updateMany({
    where: { assignedToId: req.params.id },
    data: { assignedToId: null },
  });
  await prisma.session.deleteMany({ where: { userId: req.params.id } });
  res.json({ success: true });
});

export default router;
