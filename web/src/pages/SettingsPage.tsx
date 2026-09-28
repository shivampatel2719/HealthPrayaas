import { useState } from 'react';
import { Alert, Button, Container, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { useSettingsStore } from '@/store/settings-store';

export function SettingsPage() {
  const openaiApiKey = useSettingsStore((s) => s.openaiApiKey);
  const setOpenaiApiKey = useSettingsStore((s) => s.setOpenaiApiKey);
  const [draft, setDraft] = useState(openaiApiKey ?? '');

  const handleSave = () => {
    setOpenaiApiKey(draft.trim() || null);
    notifications.show({ message: 'Settings saved', color: 'medblue' });
  };

  return (
    <Container size="sm">
      <Title order={2} mb="md">
        Settings
      </Title>

      <Stack gap="md" maw={480}>
        <Alert color="yellow" title="Prototype trade-off">
          This key is stored in your browser and used to call OpenAI directly from this
          page. Never do this in a real deployed app — anyone with dev tools open can read
          it. Fine for a local demo only.
        </Alert>

        <PasswordInput
          label="OpenAI API key"
          placeholder="sk-..."
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
        <Text size="sm" c="dimmed">
          Required for AI features: checkup insights, risk flags, cohort summaries, and the
          chatbot. Everything else works without it.
        </Text>

        <Button onClick={handleSave} style={{ alignSelf: 'flex-start' }}>
          Save
        </Button>
      </Stack>
    </Container>
  );
}
