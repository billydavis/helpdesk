/**
 * Test helper — seeds a customer reply directly into the DB.
 * Called from e2e tests via execSync; not used in production.
 *
 * Required env vars:
 *   TICKET_ID  — numeric ticket ID
 *   REPLY_BODY — text body of the reply
 */
import { prisma } from "./db";
import { SenderType } from "core";

const ticketId = parseInt(process.env.TICKET_ID ?? "");
const body = process.env.REPLY_BODY ?? "";

if (isNaN(ticketId) || !body) {
  console.error("TICKET_ID and REPLY_BODY are required");
  process.exit(1);
}

await prisma.reply.create({
  data: {
    ticketId,
    senderType: SenderType.customer,
    body,
  },
});

console.log(`Customer reply created on ticket ${ticketId}`);
await prisma.$disconnect();
