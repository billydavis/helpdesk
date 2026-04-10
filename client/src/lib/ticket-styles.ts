import { TicketStatus, TicketCategory } from "core";

export const STATUS_STYLES: Record<TicketStatus, string> = {
  [TicketStatus.open]: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent",
  [TicketStatus.resolved]: "bg-green-100 text-green-800 hover:bg-green-100 border-transparent",
  [TicketStatus.closed]: "bg-gray-100 text-gray-600 hover:bg-gray-100 border-transparent",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.general_question]: "General Question",
  [TicketCategory.technical_question]: "Technical Question",
  [TicketCategory.refund_request]: "Refund Request",
};
