export enum TicketStatus {
  new = "new",
  processing = "processing",
  open = "open",
  resolved = "resolved",
  closed = "closed",
}

export enum TicketCategory {
  general_question = "general_question",
  technical_question = "technical_question",
  refund_request = "refund_request",
}

export interface Agent {
  id: string;
  name: string;
  email: string;
}

/** Shape returned by GET /api/tickets (list) */
export interface TicketSummary {
  id: number;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  createdAt: string;
}

/** Shape returned by GET /api/tickets/:id (detail) */
export interface Ticket extends TicketSummary {
  body: string | null;
  updatedAt: string;
  assignedTo: Agent | null;
}
