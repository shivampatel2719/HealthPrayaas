import { useState } from 'react';
import { Button, Container, Image, Paper, SegmentedControl, Stack, Text, TextInput, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

import { useProfileStore, type Role } from '@/store/profile-store';

export function WelcomePage() {
  const navigate = useNavigate();
  const setProfile = useProfileStore((s) => s.setProfile);

  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('admin');

  const handleContinue = () => {
    if (!name.trim()) return;
    setProfile(name.trim(), role);
    navigate('/');
  };

  return (
    <Container size="xs" py={80}>
      <Paper withBorder shadow="sm" p="xl" radius="md">
        <Stack gap="md">
          <Image src="/pathsala.png" alt="Paramguru Pathshala Sankul" h={120} w="auto" fit="contain" mx="auto" />
          <Title order={2} ta="center" c="medblue.6">
            HealthPrayaas
          </Title>
          <Text size="sm" c="dimmed" ta="center">
            Developed by Paramguru Pathshala Sankul
          </Text>

          <TextInput
            label="Your name"
            placeholder="e.g. Priya Sharma"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />

          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Role
            </Text>
            <SegmentedControl
              fullWidth
              value={role}
              onChange={(value) => setRole(value as Role)}
              data={[
                { value: 'admin', label: 'Admin' },
                { value: 'teacher', label: 'Teacher' },
                { value: 'health_staff', label: 'Health Staff' },
              ]}
            />
          </Stack>

          <Button disabled={!name.trim()} onClick={handleContinue}>
            Continue
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
