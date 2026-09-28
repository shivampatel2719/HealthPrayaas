import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Group, Paper, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
import { useParams } from 'react-router-dom';

import { listMessages, sendMessage } from '@/db/chat';
import type { ChatMessageRow } from '@/db/db';
import { useSettingsStore } from '@/store/settings-store';

export function ChatPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const apiKey = useSettingsStore((s) => s.openaiApiKey);

  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!studentId) return;
    listMessages(studentId).then(setMessages);
  }, [studentId]);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = () => {
    if (!studentId || !draft.trim() || isSending) return;
    if (!apiKey) {
      setError('Add an OpenAI API key in Settings first.');
      return;
    }
    const content = draft.trim();
    setDraft('');
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, studentId, role: 'user', content, createdAt: new Date().toISOString() },
    ]);
    setIsSending(true);
    setStreamingText('');

    let fullText = '';
    sendMessage(studentId, apiKey, content, (chunk) => {
      fullText += chunk;
      setStreamingText(fullText);
    })
      .then(() => {
        setMessages((prev) => [
          ...prev,
          { id: `local-assistant-${Date.now()}`, studentId, role: 'assistant', content: fullText, createdAt: new Date().toISOString() },
        ]);
        setStreamingText('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to get a reply'))
      .finally(() => setIsSending(false));
  };

  const displayMessages = streamingText
    ? [...messages, { id: 'streaming', studentId: studentId ?? '', role: 'assistant' as const, content: streamingText, createdAt: '' }]
    : messages;

  return (
    <Stack maw={700} h="calc(100vh - 140px)">
      <ScrollArea flex={1} viewportRef={viewportRef}>
        <Stack gap="sm" p="xs">
          {displayMessages.length === 0 && (
            <Text c="dimmed">Ask about this student's health history, allergies, or recent checkups.</Text>
          )}
          {displayMessages.map((message) => (
            <Paper
              key={message.id}
              p="sm"
              radius="md"
              maw="80%"
              ml={message.role === 'user' ? 'auto' : 0}
              bg={message.role === 'user' ? 'medblue.6' : 'gray.1'}
              c={message.role === 'user' ? 'white' : undefined}>
              {message.content}
            </Paper>
          ))}
        </Stack>
      </ScrollArea>

      {error && <Alert color="red">{error}</Alert>}

      <Group gap="xs" align="flex-end" wrap="nowrap">
        <Textarea
          placeholder="Ask a question..."
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          autosize
          minRows={1}
          maxRows={4}
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button loading={isSending} disabled={!draft.trim()} onClick={handleSend}>
          Send
        </Button>
      </Group>
    </Stack>
  );
}
