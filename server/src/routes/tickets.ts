import { Router } from "express";
import { prisma } from "../db";
import { TicketStatus, TicketCategory } from "core";
import { Prisma } from "../generated/prisma/client";

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
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

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

export default router;
