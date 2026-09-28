import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { listMessagesQuerySchema, sendMessageSchema } from "./chat.schema.js";
import { getOrCreateConversation, listMessages, streamChatReply } from "./chat.service.js";

export const chatRouter = Router();

chatRouter.use(requireAuth);

const sendMessageLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

chatRouter.get<{ studentId: string }>("/students/:studentId/chat", async (req, res) => {
  const conversation = await getOrCreateConversation(req.params.studentId, req.user!.id);
  const messages = await listMessages(conversation.id);
  res.json({ conversation, messages });
});

chatRouter.post<{ studentId: string }>(
  "/students/:studentId/chat/messages",
  sendMessageLimiter,
  validateBody(sendMessageSchema),
  async (req, res) => {
    const conversation = await getOrCreateConversation(req.params.studentId, req.user!.id);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      await streamChatReply(req.params.studentId, conversation.id, req.body.content, (token) => {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate a reply" })}\n\n`,
      );
    } finally {
      res.end();
    }
  },
);

chatRouter.get<{ conversationId: string }>("/conversations/:conversationId/messages", async (req, res) => {
  const query = listMessagesQuerySchema.parse(req.query);
  const messages = await listMessages(req.params.conversationId, query.before ? new Date(query.before) : undefined);
  res.json(messages);
});
