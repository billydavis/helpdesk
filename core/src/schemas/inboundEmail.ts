import { z } from "zod";

export const inboundEmailSchema = z.object({
  from: z.string().min(1, "from is required"),
  subject: z.string().min(1, "subject is required"),
  text: z.string().optional(),
  html: z.string().optional(),
});

export type InboundEmail = z.infer<typeof inboundEmailSchema>;
