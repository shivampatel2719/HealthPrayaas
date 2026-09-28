import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const listMessagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
});
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
