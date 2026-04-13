import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { TicketStatus, TicketCategory, SenderType, createReplySchema } from "core";
import { Prisma } from "../generated/prisma/client";

const patchTicketSchema = z.object({
  assignedToId: z.string().nullable().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).nullable().optional(),
});

const router = Router();

const SORTABLE_COLUMNS = ["id", "subject", "fromEmail", "status", "category", "createdAt"] as const;
type SortableColumn = typeof SORTABLE_COLUMNS[number];

const VALID_STATUSES = Object.values(TicketStatus) as string[];
const VALID_CATEGORIES = Object.values(TicketCategory) as string[];

router.get("/", async (req, res) => {
  const sortByRaw = req.query.sortBy as string | undefined;
  const sortOrderRaw = req.query.sortOrder as string | undefined;
  const statusRaw = req.query.status as string | undefined;
  const categoryRaw = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));

  const sortBy: SortableColumn = SORTABLE_COLUMNS.includes(sortByRaw as SortableColumn)
    ? (sortByRaw as SortableColumn)
    : "createdAt";
  const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";

  const status = statusRaw && VALID_STATUSES.includes(statusRaw) ? (statusRaw as TicketStatus) : undefined;
  const category = categoryRaw && VALID_CATEGORIES.includes(categoryRaw) ? (categoryRaw as TicketCategory) : undefined;

  const where: Prisma.TicketWhereInput = {
    ...(status !== undefined && { status }),
    ...(category !== undefined && { category }),
    ...(search && {
      OR: [
        { subject: { contains: search, mode: "insensitive" } },
        { fromEmail: { contains: search, mode: "insensitive" } },
        { fromName: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        subject: true,
        fromEmail: true,
        fromName: true,
        status: true,
        category: true,
        createdAt: true,
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total, page, pageSize });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      fromEmail: true,
      fromName: true,
      body: true,
      status: true,
      category: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json(ticket);
});

router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const result = patchTicketSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }

  const { assignedToId, status, category } = result.data;

  if (assignedToId !== undefined && assignedToId !== null) {
    const agent = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!agent || agent.deletedAt) {
      res.status(400).json({ error: "Agent not found" });
      return;
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      ...(assignedToId !== undefined && { assignedToId }),
      ...(status !== undefined && { status }),
      ...(category !== undefined && { category }),
    },
    select: {
      id: true,
      status: true,
      category: true,
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(ticket);
});

router.get("/:id/replies", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      senderType: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true } },
    },
  });

  res.json({ replies });
});

router.post("/:id/replies", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const result = createReplySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }

  const authorId = req.authSession!.user.id;

  const reply = await prisma.reply.create({
    data: {
      ticketId: id,
      authorId,
      senderType: SenderType.agent,
      body: result.data.body,
    },
    select: {
      id: true,
      body: true,
      senderType: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json(reply);
});

export default router;
