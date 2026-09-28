import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { createStudent } from '@/lib/academic-api';
import { useAuthStore } from '@/store/auth-store';

export default function CreateStudentScreen() {
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [rollNumber, setRollNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateIsValid = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth);
  const canSubmit = rollNumber.trim().length > 0 && fullName.trim().length > 0 && dateIsValid && !isSubmitting;

  const handleSubmit = () => {
    if (!token || !sectionId || !canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    createStudent(token, {
      sectionId,
      rollNumber: rollNumber.trim(),
      fullName: fullName.trim(),
      dateOfBirth,
      gender,
    })
      .then(() => router.back())
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to add student'))
      .finally(() => setIsSubmitting(false));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        <Text variant="titleMedium">New student</Text>

        <TextInput mode="outlined" label="Roll number" value={rollNumber} onChangeText={setRollNumber} style={styles.input} />
        <TextInput mode="outlined" label="Full name" value={fullName} onChangeText={setFullName} style={styles.input} />
        <TextInput
          mode="outlined"
          label="Date of birth"
          placeholder="YYYY-MM-DD"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          style={styles.input}
        />
        <HelperText type={dateIsValid || dateOfBirth.length === 0 ? 'info' : 'error'} visible>
          Format: YYYY-MM-DD, e.g. 2015-04-12
        </HelperText>

        <Text variant="bodyMedium" style={styles.label}>
          Gender
        </Text>
        <SegmentedButtons
          value={gender}
          onValueChange={(value) => setGender(value as 'male' | 'female' | 'other')}
          buttons={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
        />

        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>

        <Button mode="contained" onPress={handleSubmit} loading={isSubmitting} disabled={!canSubmit} style={styles.submit}>
          Add Student
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16, gap: 4 },
  input: { marginTop: 8 },
  label: { marginTop: 12, marginBottom: 4 },
  submit: { marginTop: 16 },
});
