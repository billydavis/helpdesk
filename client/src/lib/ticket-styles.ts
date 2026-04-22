import { TicketStatus, TicketCategory } from "core";

export const STATUS_STYLES: Record<TicketStatus, string> = {
  [TicketStatus.new]: "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/15",
  [TicketStatus.processing]: "bg-violet-500/15 text-violet-400 border-violet-500/30 hover:bg-violet-500/15",
  [TicketStatus.open]: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/15",
  [TicketStatus.resolved]: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15",
  [TicketStatus.closed]: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/15",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.general_question]: "General Question",
  [TicketCategory.technical_question]: "Technical Question",
  [TicketCategory.refund_request]: "Refund Request",
};
