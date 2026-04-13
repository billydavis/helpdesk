import { z } from "zod";

export const inboundEmailSchema = z.object({
  from: z.string().min(1, "from is required").max(255),
  subject: z.string().min(1, "subject is required").max(255), // RFC 2822 limit
  body: z.string().max(4000).optional(),
  bodyHtml: z.string().max(4000).optional(),
  headers: z.string().max(4000).optional(), // raw email headers block from SendGrid
  to: z.string().max(255).optional(),          // envelope recipient (for future reply-to-address routing)
});

export type InboundEmail = z.infer<typeof inboundEmailSchema>;
