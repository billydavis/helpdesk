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

export interface DailyTicketCount {
  date: string; // YYYY-MM-DD
  count: number;
}

/** Shape returned by GET /api/stats */
export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  aiResolvedTickets: number;
  aiResolvedPercent: number;
  avgResolutionTimeMs: number | null;
  ticketsPerDay: DailyTicketCount[];
}

