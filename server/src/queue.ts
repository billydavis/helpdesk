import { PgBoss } from "pg-boss";
import * as Sentry from "@sentry/node";
import { CLASSIFY_TICKET_QUEUE, registerClassifyQueue, type ClassifyJobData } from "./queues/classify";
import { AUTO_RESOLVE_TICKET_QUEUE, registerAutoResolveQueue, type AutoResolveJobData } from "./queues/auto-resolve";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export type { ClassifyJobData, AutoResolveJobData };

export const boss = new PgBoss(process.env.DATABASE_URL);
boss.on("error", (err) => {
  console.error("[pg-boss]", err);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, { tags: { source: "pg-boss" } });
  }
});

export async function sendClassifyJob(data: ClassifyJobData): Promise<void> {
  await boss.send(CLASSIFY_TICKET_QUEUE, data);
}

export async function sendAutoResolveJob(data: AutoResolveJobData): Promise<void> {
  await boss.send(AUTO_RESOLVE_TICKET_QUEUE, data);
}

export async function stopQueue(): Promise<void> {
  await boss.stop();
}

export async function startQueue(): Promise<void> {
  await boss.start();
  await registerClassifyQueue(boss);
  await registerAutoResolveQueue(boss);
  console.log(`pg-boss workers started on queues "${CLASSIFY_TICKET_QUEUE}", "${AUTO_RESOLVE_TICKET_QUEUE}"`);
}
