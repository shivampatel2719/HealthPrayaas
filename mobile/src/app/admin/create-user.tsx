import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { registerUser, type Role } from '@/lib/auth-api';
import { useAuthStore } from '@/store/auth-store';

export default function CreateUserScreen() {
  const token = useAuthStore((s) => s.token);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('teacher');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0 && password.length >= 8 && !isSubmitting;

  const handleSubmit = () => {
    if (!token || !canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    setSuccessEmail(null);

    registerUser(token, { email: email.trim(), password, fullName: fullName.trim(), role })
      .then((created) => {
        setSuccessEmail(created.email);
        setFullName('');
        setEmail('');
        setPassword('');
        setRole('teacher');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to create account'))
      .finally(() => setIsSubmitting(false));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        <Text variant="headlineSmall">Add Staff Account</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Create a login for a teacher, health staff member, or another admin. There&apos;s no
          public sign-up — accounts are provisioned by an admin.
        </Text>

        <TextInput mode="outlined" label="Full name" value={fullName} onChangeText={setFullName} style={styles.input} />
        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Temporary password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <HelperText type="info" visible>
          Minimum 8 characters
        </HelperText>

        <Text variant="bodyMedium" style={styles.fieldLabel}>
          Role
        </Text>
        <SegmentedButtons
          value={role}
          onValueChange={(value) => setRole(value as Role)}
          buttons={[
            { value: 'teacher', label: 'Teacher' },
            { value: 'health_staff', label: 'Health Staff' },
            { value: 'admin', label: 'Admin' },
          ]}
        />

        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
        {successEmail && (
          <Text variant="bodySmall" style={styles.success}>
            Account created for {successEmail}.
          </Text>
        )}

        <Button mode="contained" onPress={handleSubmit} loading={isSubmitting} disabled={!canSubmit} style={styles.submit}>
          Create Account
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16, gap: 4 },
  subtitle: { opacity: 0.7, marginBottom: 8 },
  input: { marginTop: 8 },
  fieldLabel: { marginTop: 12, marginBottom: 4 },
  success: { color: '#146C2E' },
  submit: { marginTop: 16 },
});
