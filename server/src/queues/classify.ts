import type { PgBoss } from "pg-boss";
import { classifyTicketWorker } from "../lib/classify-ticket";

export interface ClassifyJobData {
  id: number;
  subject: string;
  body: string;
}

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";

export async function registerClassifyQueue(boss: PgBoss): Promise<void> {
  await boss.createQueue(CLASSIFY_TICKET_QUEUE);
  await boss.work(CLASSIFY_TICKET_QUEUE, classifyTicketWorker);
}
