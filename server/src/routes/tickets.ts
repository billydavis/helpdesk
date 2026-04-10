import { Router } from "express";
import { prisma } from "../db";

const router = Router();

const SORTABLE_COLUMNS = ["id", "subject", "fromEmail", "status", "category", "createdAt"] as const;
type SortableColumn = typeof SORTABLE_COLUMNS[number];

router.get("/", async (req, res) => {
  const sortByRaw = req.query.sortBy as string | undefined;
  const sortOrderRaw = req.query.sortOrder as string | undefined;

  const sortBy: SortableColumn = SORTABLE_COLUMNS.includes(sortByRaw as SortableColumn)
    ? (sortByRaw as SortableColumn)
    : "createdAt";
  const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";

  const tickets = await prisma.ticket.findMany({
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
