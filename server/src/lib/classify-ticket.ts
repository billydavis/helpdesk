import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { TicketCategory } from "../generated/prisma/client";
import { prisma } from "../db";
import type { ClassifyJobData } from "../queue";

const VALID_CATEGORIES = Object.values(TicketCategory) as TicketCategory[];

export async function classifyTicketWorker([job]: { data: ClassifyJobData } []): Promise<void> {
  const { id, subject, body } = job.data;

  const { output: category } = await generateText({
    model: openai("gpt-5-nano"),
    output: Output.choice({ options: VALID_CATEGORIES }),
    system:
      "You are a support ticket classifier. Classify the ticket into exactly one category.\n\n" +
      "Categories:\n" +
      "  general_question   — general inquiries, how-to questions, account/billing questions\n" +
      "  technical_question — bugs, errors, integration issues, technical troubleshooting\n" +
      "  refund_request     — refund, cancellation, billing disputes, chargeback requests",
    prompt: `Subject: ${subject}\n\nBody:\n${body.slice(0, 1000)}`,
  });

  if (!VALID_CATEGORIES.includes(category as TicketCategory)) {
    throw new Error(`[classify-ticket] Unexpected category "${category}" for ticket ${id}`);
  }

  await prisma.ticket.update({
    where: { id },
    data: { category: category as TicketCategory },
  });
}
