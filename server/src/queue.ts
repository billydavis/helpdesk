import { PgBoss } from "pg-boss";
import { classifyTicketWorker } from "./lib/classify-ticket";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";

export interface ClassifyJobData {
  id: number;
  subject: string;
  body: string;
}

export const boss = new PgBoss(process.env.DATABASE_URL);
boss.on("error", (err) => console.error("[pg-boss]", err));

export async function stopQueue(): Promise<void> {
  await boss.stop();
}

export async function sendClassifyJob(data: ClassifyJobData): Promise<void> {
  await boss.send(CLASSIFY_TICKET_QUEUE, data);
}

export async function startQueue(): Promise<void> {
  await boss.start();
  await boss.createQueue(CLASSIFY_TICKET_QUEUE);
  await boss.work(CLASSIFY_TICKET_QUEUE, classifyTicketWorker);
  console.log(`pg-boss worker started, listening on queue "${CLASSIFY_TICKET_QUEUE}"`);
}
