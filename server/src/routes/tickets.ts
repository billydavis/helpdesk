import { Router } from "express";
import { prisma } from "../db";
import { TicketStatus, TicketCategory } from "core";

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

  const sortBy: SortableColumn = SORTABLE_COLUMNS.includes(sortByRaw as SortableColumn)
    ? (sortByRaw as SortableColumn)
    : "createdAt";
  const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";

  const status = statusRaw && VALID_STATUSES.includes(statusRaw) ? (statusRaw as TicketStatus) : undefined;
  const category = categoryRaw && VALID_CATEGORIES.includes(categoryRaw) ? (categoryRaw as TicketCategory) : undefined;

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(status !== undefined && { status }),
      ...(category !== undefined && { category }),
      ...(search && {
        OR: [
          { subject: { contains: search, mode: "insensitive" } },
          { fromEmail: { contains: search, mode: "insensitive" } },
          { fromName: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { [sortBy]: sortOrder },
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
