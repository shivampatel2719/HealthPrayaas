import { DefaultTheme, Link, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { IconButton, PaperProvider } from 'react-native-paper';

import { paperTheme } from '@/constants/paper-theme';
import { useAuthStore } from '@/store/auth-store';

function HeaderActions() {
  const role = useAuthStore((s) => s.user?.role);
  const logout = useAuthStore((s) => s.logout);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {role === 'admin' && (
        <Link href="/admin/create-user" asChild>
          <IconButton icon="account-plus" iconColor={paperTheme.colors.onPrimary} />
        </Link>
      )}
      <IconButton icon="logout" iconColor={paperTheme.colors.onPrimary} onPress={logout} />
    </View>
  );
}

SplashScreen.preventAutoHideAsync();

const HealthPrayaasNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: paperTheme.colors.primary,
    background: paperTheme.colors.background,
    card: paperTheme.colors.surface,
    text: paperTheme.colors.onBackground,
  },
};

function useAuthGate() {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;

    SplashScreen.hideAsync();

    const onLoginScreen = segments[0] === 'login';
    if (!token && !onLoginScreen) {
      router.replace('/login');
    } else if (token && onLoginScreen) {
      router.replace('/');
    }
  }, [token, isHydrated, segments, router]);

  return isHydrated;
}

export default function RootLayout() {
  const isHydrated = useAuthGate();

  if (!isHydrated) {
    return null;
  }

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={HealthPrayaasNavTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: paperTheme.colors.primary },
            headerTintColor: paperTheme.colors.onPrimary,
          }}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ title: 'Students', headerRight: HeaderActions }} />
          <Stack.Screen name="students/[studentId]/index" options={{ title: 'Student Profile' }} />
          <Stack.Screen name="students/[studentId]/new-health-record" options={{ title: 'New Health Check' }} />
          <Stack.Screen name="students/[studentId]/chat" options={{ title: 'Chat' }} />
          <Stack.Screen name="students/create" options={{ title: 'Add Student' }} />
          <Stack.Screen name="insights/[classId]" options={{ title: 'Class Insights' }} />
          <Stack.Screen name="admin/create-user" options={{ title: 'Add Staff Account' }} />
        </Stack>
      </ThemeProvider>
    </PaperProvider>
  );
}
