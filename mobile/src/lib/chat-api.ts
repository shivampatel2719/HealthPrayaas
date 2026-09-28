import { fetch as expoFetch } from 'expo/fetch';

import { apiRequest } from '@/lib/api-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type ChatMessageDto = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type ChatConversationDto = {
  id: string;
  studentId: string;
  userId: string;
  createdAt: string;
  lastMessageAt: string | null;
};

export function getOrCreateChat(token: string, studentId: string) {
  return apiRequest<{ conversation: ChatConversationDto; messages: ChatMessageDto[] }>(
    `/api/students/${studentId}/chat`,
    { token },
  );
}

type StreamEvent = { token?: string; done?: boolean; error?: string };

export async function streamChatMessage(
  token: string,
  studentId: string,
  content: string,
  onToken: (token: string) => void,
): Promise<void> {
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not set. Add it to mobile/.env');
  }

  const response = await expoFetch(`${API_URL}/api/students/${studentId}/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });

  if (!response.body) {
    throw new Error('Streaming is not supported on this platform');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const rawEvent of events) {
      const line = rawEvent.trim();
      if (!line.startsWith('data:')) continue;

      const payload = JSON.parse(line.slice('data:'.length).trim()) as StreamEvent;
      if (payload.error) {
        throw new Error(payload.error);
      }
      if (payload.token) {
        onToken(payload.token);
      }
    }
  }
}
