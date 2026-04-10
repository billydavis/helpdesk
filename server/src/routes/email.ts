import { Router } from "express";
import multer from "multer";
import { convert } from "html-to-text";
import { prisma } from "../db";
import { validateEmailWebhook, InboundEmail } from "../middleware/validateEmailWebhook";

if (!process.env.SENDGRID_WEBHOOK_PUBLIC_KEY) {
  throw new Error("SENDGRID_WEBHOOK_PUBLIC_KEY environment variable is required");
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.none(), validateEmailWebhook, async (req, res) => {
  try {
    const { from, subject, text, html } = req.body as InboundEmail;

    const { fromEmail, fromName } = parseFrom(from);
    const body = resolveBody(text, html);

    await prisma.ticket.create({
      data: {
        fromEmail,
        fromName: fromName ?? null,
        subject: subject.trim(),
        body,
        rawPayload: req.body,
      },
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("[email webhook] failed to create ticket:", err);
    res.sendStatus(200);
  }
});

function parseFrom(from: string): { fromEmail: string; fromName: string | undefined } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { fromName: match[1].trim(), fromEmail: match[2].trim() };
  }
  return { fromEmail: from.trim(), fromName: undefined };
}

function resolveBody(text: string | undefined, html: string | undefined): string {
  if (text?.trim()) return text.trim();
  if (html?.trim()) return convert(html, { wordwrap: false });
  return "";
}

export default router;
