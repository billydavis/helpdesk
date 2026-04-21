import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { readFileSync } from "fs";
import { resolve } from "path";
import { prisma } from "../db";
import { TicketStatus, SenderType } from "../generated/prisma/client";
import type { AutoResolveJobData } from "../queues/auto-resolve";

const knowledgeBase = readFileSync(resolve(__dirname, "../../../knowledge-base.md"), "utf-8");

const responseSchema = z.object({
  action: z.enum(["resolve", "escalate"]),
  reply: z.string(),
});

export async function autoResolveTicketWorker([job]: { data: AutoResolveJobData }[]): Promise<void> {
  const { id, subject, body } = job.data;

  await prisma.ticket.update({
    where: { id },
    data: { status: TicketStatus.processing },
  });

  let output: { action: "resolve" | "escalate"; reply: string };

  try {
    ({ output } = await generateText({
      model: openai("gpt-5-nano"),
      output: Output.object({ schema: responseSchema }),
      system:
        "You are an AI support agent for Code with Mosh, an online coding education platform.\n\n" +
        "Using ONLY the knowledge base below, decide whether you can fully resolve the customer's ticket.\n\n" +
        "You MUST set action to 'escalate' if any of the following apply:\n" +
        "  - The customer threatens legal action\n" +
        "  - The customer explicitly requests a refund outside the 30-day window\n" +
        "  - The customer disputes a charge or mentions a chargeback\n" +
        "  - The issue involves account security concerns\n" +
        "  - You cannot find a confident, complete answer in the knowledge base\n\n" +
        "Otherwise, set action to 'resolve' and write a polite, concise reply answering the customer's question. " +
        "When action is 'escalate', set reply to an empty string. " +
        "Sign off as 'The Code with Mosh Support Team'.\n\n" +
        "KNOWLEDGE BASE:\n" +
        knowledgeBase,
      prompt: `Subject: ${subject}\n\n${body.slice(0, 2000)}`,
    }));
    console.log(`[auto-resolve] ticket ${id}: action=${output.action}`);
  } catch (err) {
    console.error(`[auto-resolve] AI call failed for ticket ${id}, escalating:`, err);
    await prisma.ticket.update({ where: { id }, data: { status: TicketStatus.open } });
    return;
  }

  if (output.action === "resolve" && output.reply) {
    await prisma.$transaction(async (tx) => {
      await tx.reply.create({
        data: {
          ticketId: id,
          senderType: SenderType.agent,
          body: output.reply,
        },
      });
      await tx.ticket.update({
        where: { id },
        data: { status: TicketStatus.resolved },
      });
    });
  } else {
    await prisma.ticket.update({
      where: { id },
      data: { status: TicketStatus.open },
    });
  }
}
