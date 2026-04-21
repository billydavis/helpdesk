import type { PgBoss } from "pg-boss";
import { autoResolveTicketWorker } from "../lib/auto-resolve-ticket";

export interface AutoResolveJobData {
  id: number;
  subject: string;
  body: string;
}

export const AUTO_RESOLVE_TICKET_QUEUE = "auto-resolve-ticket";

export async function registerAutoResolveQueue(boss: PgBoss): Promise<void> {
  await boss.createQueue(AUTO_RESOLVE_TICKET_QUEUE);
  await boss.work(AUTO_RESOLVE_TICKET_QUEUE, autoResolveTicketWorker);
}
