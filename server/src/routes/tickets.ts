import { Router } from "express";
import { prisma } from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      subject: true,
      fromEmail: true,
      fromName: true,
      status: true,
      category: true,
      createdAt: true,
    },
  });
  res.json({ tickets });
});

export default router;
