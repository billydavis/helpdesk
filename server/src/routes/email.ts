import { Router } from "express";
import multer from "multer";
import { prisma } from "../db";
import { validateEmailWebhook, InboundEmail } from "../middleware/validateEmailWebhook";
import { SenderType } from "core";
import { TicketStatus } from "../generated/prisma/client";
import { sendClassifyJob } from "../queue";

if (!process.env.SENDGRID_WEBHOOK_PUBLIC_KEY) {
  throw new Error("SENDGRID_WEBHOOK_PUBLIC_KEY environment variable is required");
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.none(), validateEmailWebhook, async (req, res) => {
  try {
    const { from, subject, body: bodyText, bodyHtml, headers: rawHeaders } = req.body as InboundEmail;

    const { fromEmail, fromName } = parseFrom(from);
    const body = resolveBody(bodyText, bodyHtml);
    const normalizedSubjectStr = normalizeSubject(subject);

    // Parse In-Reply-To from raw email headers if SendGrid included them.
    const inReplyTo = rawHeaders ? parseEmailHeader(rawHeaders, "In-Reply-To") : undefined;

    const existingTicket = await findExistingTicket(fromEmail, normalizedSubjectStr, inReplyTo);

    if (existingTicket) {
      await prisma.$transaction(async (tx) => {
        // Customer writing back means the issue isn't resolved — reopen it.
        if (existingTicket.status === TicketStatus.resolved) {
          await tx.ticket.update({
            where: { id: existingTicket.id },
            data: { status: TicketStatus.open },
          });
        }
        await tx.reply.create({
          data: {
            ticketId: existingTicket.id,
            senderType: SenderType.customer,
            body,
            bodyHtml: bodyHtml?.trim() ?? null,
            // authorId intentionally omitted — null signals a customer reply
          },
        });
      });
    } else {
      const ticket = await prisma.ticket.create({
        data: {
          fromEmail,
          fromName: fromName ?? null,
          subject: normalizedSubjectStr,
          body,
          rawPayload: req.body,
        },
      });

      await sendClassifyJob({ id: ticket.id, subject: ticket.subject, body: ticket.body });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("[email webhook] failed to process inbound email:", err);
    res.sendStatus(200);
  }
});

/**
 * Looks for an existing non-closed ticket that this email is a reply to.
 * Returns { id, status } if exactly one match is found, or null if there are
 * zero matches (new issue) or two or more matches (ambiguous — create a new
 * ticket rather than risk attaching the reply to the wrong thread).
 *
 * Phase 2 extension point: when outbound email is built, fill in the
 * inReplyTo block to match by emailMessageId before falling back to the
 * subject+sender fuzzy match.
 */
async function findExistingTicket(
  fromEmail: string,
  normalizedSubject: string,
  inReplyTo: string | undefined,
): Promise<{ id: number; status: TicketStatus } | null> {
  // Phase 2 — In-Reply-To header matching (no-op until outbound email stores Message-IDs):
  // if (inReplyTo) {
  //   const ticket = await prisma.ticket.findFirst({ where: { emailMessageId: inReplyTo } });
  //   if (ticket) return ticket;
  //   const reply = await prisma.reply.findFirst({ where: { emailMessageId: inReplyTo }, include: { ticket: true } });
  //   if (reply) return reply.ticket;
  // }

  // Fuzzy fallback: match on sender email + normalized subject, excluding closed tickets.
  const candidates = await prisma.ticket.findMany({
    where: {
      fromEmail,
      subject: normalizedSubject,
      status: { not: TicketStatus.closed },
    },
    orderBy: { createdAt: "desc" },
    take: 2, // take 2 so we can detect ambiguity
    select: { id: true, status: true },
  });

  if (candidates.length === 1) return candidates[0];
  return null; // 0 = new issue, 2+ = ambiguous → create a new ticket either way
}

/**
 * Extracts the value of a named header from a raw email headers string.
 * Header names are matched case-insensitively. Only handles single-line
 * values (sufficient for Message-ID and In-Reply-To which are never folded).
 */
function parseEmailHeader(rawHeaders: string, name: string): string | undefined {
  const pattern = new RegExp(`^${name}:\\s*(.+?)\\s*$`, "im");
  return rawHeaders.match(pattern)?.[1]?.trim();
}

function parseFrom(from: string): { fromEmail: string; fromName: string | undefined } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { fromName: match[1].trim(), fromEmail: match[2].trim() };
  }
  return { fromEmail: from.trim(), fromName: undefined };
}

function resolveBody(body: string | undefined, bodyHtml: string | undefined): string {
  if (bodyHtml?.trim()) return bodyHtml.trim();
  if (body?.trim()) return body.trim();
  return "";
}

function normalizeSubject(subject: string): string {
  // Strip leading Re:, Fwd:, Fw: prefixes (case-insensitive, repeated)
  let s = subject.trim();
  const prefix = /^(re|fwd?)\s*:\s*/i;
  while (prefix.test(s)) {
    s = s.replace(prefix, "").trim();
  }
  return s;
}

export default router;
