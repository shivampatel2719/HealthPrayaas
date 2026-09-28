import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import { useAuthStore } from '@/store/auth-store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn);
  const loginError = useAuthStore((s) => s.loginError);
  const login = useAuthStore((s) => s.login);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoggingIn;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {/* TODO: replace with the school logo once the asset file is added under assets/images/ */}
        <Text variant="headlineMedium" style={styles.title}>
          HealthPrayaas
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Sign in to continue
        </Text>

        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <HelperText type="error" visible={!!loginError}>
          {loginError}
        </HelperText>

        <Button mode="contained" onPress={() => login(email.trim(), password)} loading={isLoggingIn} disabled={!canSubmit}>
          Log In
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 4 },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: 16, opacity: 0.7 },
  input: { marginTop: 8 },
});
