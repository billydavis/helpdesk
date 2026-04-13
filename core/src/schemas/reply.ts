import { z } from "zod";

export enum SenderType {
  agent = "agent",
  customer = "customer",
}

export const createReplySchema = z.object({
  body: z.string().min(1, "Reply cannot be empty").max(10000),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
