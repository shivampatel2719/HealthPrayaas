import { AppShell, Burger, Button, Group, NavLink, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet, useNavigate } from 'react-router-dom';

import { useProfileStore } from '@/store/profile-store';

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const navigate = useNavigate();
  const name = useProfileStore((s) => s.name);
  const role = useProfileStore((s) => s.role);
  const clearProfile = useProfileStore((s) => s.clearProfile);

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg" c="medblue.6">
              HealthPrayaas
            </Text>
          </Group>
          <Group gap="sm" wrap="nowrap">
            <Text size="sm" c="dimmed" visibleFrom="xs">
              {name} · {role?.replace('_', ' ')}
            </Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                clearProfile();
                navigate('/welcome');
              }}>
              Switch profile
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink component={Link} to="/" label="Students" onClick={close} />
        <NavLink component={Link} to="/settings" label="Settings" onClick={close} />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
