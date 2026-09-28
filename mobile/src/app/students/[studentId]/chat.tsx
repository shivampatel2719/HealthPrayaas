import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, IconButton, Surface, Text, TextInput } from 'react-native-paper';

import { getOrCreateChat, streamChatMessage, type ChatMessageDto } from '@/lib/chat-api';
import { useAuthStore } from '@/store/auth-store';

export default function ChatScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const token = useAuthStore((s) => s.token);

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessageDto>>(null);

  useEffect(() => {
    if (!token || !studentId) return;
    getOrCreateChat(token, studentId)
      .then((result) => setMessages(result.messages))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load chat'))
      .finally(() => setIsLoading(false));
  }, [token, studentId]);

  const handleSend = () => {
    if (!token || !studentId || !draft.trim() || isSending) return;
    const content = draft.trim();
    setDraft('');
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, conversationId: '', role: 'user', content, createdAt: new Date().toISOString() },
    ]);
    setIsSending(true);
    setStreamingText('');

    let fullText = '';
    streamChatMessage(token, studentId, content, (chunk) => {
      fullText += chunk;
      setStreamingText(fullText);
    })
      .then(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `local-assistant-${Date.now()}`,
            conversationId: '',
            role: 'assistant',
            content: fullText,
            createdAt: new Date().toISOString(),
          },
        ]);
        setStreamingText('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to get a reply'))
      .finally(() => setIsSending(false));
  };

  const displayMessages = streamingText
    ? [...messages, { id: 'streaming', conversationId: '', role: 'assistant' as const, content: streamingText, createdAt: '' }]
    : messages;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isLoading ? (
          <ActivityIndicator style={styles.spacingTop} />
        ) : (
          <FlatList
            ref={listRef}
            data={displayMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <Text style={styles.mutedText}>
                Ask about this student&apos;s health history, allergies, or recent checkups.
              </Text>
            }
            renderItem={({ item }) => (
              <Surface
                elevation={item.role === 'user' ? 2 : 1}
                style={[
                  styles.bubble,
                  item.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}>
                <Text style={item.role === 'user' ? styles.userText : undefined}>{item.content}</Text>
              </Surface>
            )}
          />
        )}

        {error && (
          <Text variant="bodySmall" style={styles.error}>
            {error}
          </Text>
        )}

        <View style={styles.inputRow}>
          <TextInput
            mode="outlined"
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask a question..."
            style={styles.input}
            multiline
          />
          <IconButton
            icon="send"
            mode="contained"
            disabled={isSending || draft.trim().length === 0}
            loading={isSending}
            onPress={handleSend}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingHorizontal: 12 },
  keyboardAvoiding: { flex: 1 },
  spacingTop: { marginTop: 24 },
  mutedText: { opacity: 0.7, padding: 8 },
  list: { gap: 8, paddingVertical: 8 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#1976D2' },
  assistantBubble: { alignSelf: 'flex-start' },
  userText: { color: '#FFFFFF' },
  error: { color: '#B3261E', paddingVertical: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  input: { flex: 1, maxHeight: 120 },
});
