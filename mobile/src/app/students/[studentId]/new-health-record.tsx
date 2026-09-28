import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, ProgressBar, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { ChipRow } from '@/components/chip-row';
import { getStudent, type StudentDto } from '@/lib/academic-api';
import {
  createHealthRecord,
  type DentalHygieneStatus,
  type DietaryPreference,
  type HearingStatus,
  type PostureStatus,
} from '@/lib/health-records-api';
import { useAuthStore } from '@/store/auth-store';

const STEP_TITLES = ['Demographics', 'Physical Vitals', 'Clinical Indicators', 'Medical History', 'Lifestyle'];

const DIET_OPTIONS: { id: DietaryPreference; label: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'non_vegetarian', label: 'Non-vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'eggetarian', label: 'Eggetarian' },
  { id: 'other', label: 'Other' },
];

function computeAgeYears(dateOfBirth: string): number {
  const ageMs = Date.now() - new Date(dateOfBirth).getTime();
  return Math.round((ageMs / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
}

type FormState = {
  heightCm: string;
  weightKg: string;
  heartRateBpm: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  visionLeftAcuity: string;
  visionRightAcuity: string;
  dentalHygieneStatus: DentalHygieneStatus | null;
  hearingStatus: HearingStatus | null;
  postureStatus: PostureStatus | null;
  knownAllergies: string;
  chronicConditions: string;
  currentMedications: string;
  avgSleepHours: string;
  physicalActivityDaysPerWeek: string;
  dietaryPreference: DietaryPreference | null;
};

const INITIAL_FORM: FormState = {
  heightCm: '',
  weightKg: '',
  heartRateBpm: '',
  bloodPressureSystolic: '',
  bloodPressureDiastolic: '',
  visionLeftAcuity: '',
  visionRightAcuity: '',
  dentalHygieneStatus: null,
  hearingStatus: null,
  postureStatus: null,
  knownAllergies: '',
  chronicConditions: '',
  currentMedications: '',
  avgSleepHours: '',
  physicalActivityDaysPerWeek: '',
  dietaryPreference: null,
};

function toList(csv: string): string[] {
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function NewHealthRecordScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [student, setStudent] = useState<StudentDto | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !studentId) return;
    getStudent(token, studentId).then(setStudent).catch(() => setError('Failed to load student'));
  }, [token, studentId]);

  const bmi = useMemo(() => {
    const heightM = Number(form.heightCm) / 100;
    const weight = Number(form.weightKg);
    if (!heightM || !weight) return null;
    return (weight / (heightM * heightM)).toFixed(2);
  }, [form.heightCm, form.weightKg]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canGoNext = useMemo(() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return form.heightCm.trim().length > 0 && form.weightKg.trim().length > 0;
      case 2:
        return Boolean(form.dentalHygieneStatus && form.hearingStatus && form.postureStatus);
      case 3:
        return true;
      case 4:
        return Boolean(
          form.avgSleepHours.trim().length > 0 &&
            form.physicalActivityDaysPerWeek.trim().length > 0 &&
            form.dietaryPreference,
        );
      default:
        return false;
    }
  }, [step, form]);

  const isLastStep = step === STEP_TITLES.length - 1;

  const handleNext = () => {
    if (!canGoNext) return;
    if (isLastStep) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSubmit = () => {
    if (!token || !studentId || !student) return;
    setIsSubmitting(true);
    setError(null);
    createHealthRecord(token, studentId, {
      ageYears: computeAgeYears(student.dateOfBirth),
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      heartRateBpm: form.heartRateBpm ? Number(form.heartRateBpm) : undefined,
      bloodPressureSystolic: form.bloodPressureSystolic ? Number(form.bloodPressureSystolic) : undefined,
      bloodPressureDiastolic: form.bloodPressureDiastolic ? Number(form.bloodPressureDiastolic) : undefined,
      visionLeftAcuity: form.visionLeftAcuity || undefined,
      visionRightAcuity: form.visionRightAcuity || undefined,
      dentalHygieneStatus: form.dentalHygieneStatus!,
      hearingStatus: form.hearingStatus!,
      postureStatus: form.postureStatus!,
      knownAllergies: toList(form.knownAllergies),
      chronicConditions: toList(form.chronicConditions),
      currentMedications: toList(form.currentMedications),
      avgSleepHours: Number(form.avgSleepHours),
      physicalActivityDaysPerWeek: Number(form.physicalActivityDaysPerWeek),
      dietaryPreference: form.dietaryPreference!,
    })
      .then(() => router.back())
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to submit'))
      .finally(() => setIsSubmitting(false));
  };

  if (!student) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <ProgressBar progress={(step + 1) / STEP_TITLES.length} style={styles.progress} />
        <Text variant="bodySmall" style={styles.mutedText}>
          Step {step + 1} of {STEP_TITLES.length}: {STEP_TITLES[step]}
        </Text>
      </View>

      <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent}>
        {step === 0 && (
          <>
            <Field label="Name" value={student.fullName} />
            <Field label="Roll number" value={student.rollNumber} />
            <Field label="Gender" value={student.gender} />
            <Field label="Date of birth" value={student.dateOfBirth} />
            <Field label="Age at this visit" value={`${computeAgeYears(student.dateOfBirth)} years`} />
          </>
        )}

        {step === 1 && (
          <>
            <TextInput
              mode="outlined"
              label="Height (cm)"
              value={form.heightCm}
              onChangeText={(v) => update('heightCm', v)}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Weight (kg)"
              value={form.weightKg}
              onChangeText={(v) => update('weightKg', v)}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            {bmi && <Field label="BMI (auto-calculated)" value={bmi} />}
            <TextInput
              mode="outlined"
              label="Heart rate (bpm)"
              value={form.heartRateBpm}
              onChangeText={(v) => update('heartRateBpm', v)}
              keyboardType="number-pad"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Blood pressure — systolic"
              value={form.bloodPressureSystolic}
              onChangeText={(v) => update('bloodPressureSystolic', v)}
              keyboardType="number-pad"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Blood pressure — diastolic"
              value={form.bloodPressureDiastolic}
              onChangeText={(v) => update('bloodPressureDiastolic', v)}
              keyboardType="number-pad"
              style={styles.input}
            />
          </>
        )}

        {step === 2 && (
          <>
            <TextInput
              mode="outlined"
              label="Vision — left eye"
              value={form.visionLeftAcuity}
              onChangeText={(v) => update('visionLeftAcuity', v)}
              placeholder="e.g. 6/6"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Vision — right eye"
              value={form.visionRightAcuity}
              onChangeText={(v) => update('visionRightAcuity', v)}
              placeholder="e.g. 6/6"
              style={styles.input}
            />
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              Dental hygiene
            </Text>
            <SegmentedButtons
              value={form.dentalHygieneStatus ?? ''}
              onValueChange={(v) => update('dentalHygieneStatus', v as DentalHygieneStatus)}
              buttons={[
                { value: 'good', label: 'Good' },
                { value: 'fair', label: 'Fair' },
                { value: 'poor', label: 'Poor' },
              ]}
            />
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              Hearing
            </Text>
            <SegmentedButtons
              value={form.hearingStatus ?? ''}
              onValueChange={(v) => update('hearingStatus', v as HearingStatus)}
              buttons={[
                { value: 'normal', label: 'Normal' },
                { value: 'impaired', label: 'Impaired' },
              ]}
            />
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              Posture
            </Text>
            <SegmentedButtons
              value={form.postureStatus ?? ''}
              onValueChange={(v) => update('postureStatus', v as PostureStatus)}
              buttons={[
                { value: 'normal', label: 'Normal' },
                { value: 'mild_issue', label: 'Mild' },
                { value: 'significant_issue', label: 'Significant' },
              ]}
            />
          </>
        )}

        {step === 3 && (
          <>
            <TextInput
              mode="outlined"
              label="Known allergies (comma-separated)"
              value={form.knownAllergies}
              onChangeText={(v) => update('knownAllergies', v)}
              placeholder="e.g. pollen, peanuts"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Chronic conditions (comma-separated)"
              value={form.chronicConditions}
              onChangeText={(v) => update('chronicConditions', v)}
              placeholder="e.g. asthma"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Current medications (comma-separated)"
              value={form.currentMedications}
              onChangeText={(v) => update('currentMedications', v)}
              placeholder="e.g. inhaler"
              style={styles.input}
            />
          </>
        )}

        {step === 4 && (
          <>
            <TextInput
              mode="outlined"
              label="Average sleep hours"
              value={form.avgSleepHours}
              onChangeText={(v) => update('avgSleepHours', v)}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Physical activity (days/week)"
              value={form.physicalActivityDaysPerWeek}
              onChangeText={(v) => update('physicalActivityDaysPerWeek', v)}
              keyboardType="number-pad"
              style={styles.input}
            />
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              Dietary preference
            </Text>
            <ChipRow
              items={DIET_OPTIONS}
              selectedId={form.dietaryPreference}
              onSelect={(v) => update('dietaryPreference', v as DietaryPreference)}
            />
          </>
        )}

        {error && (
          <Text variant="bodySmall" style={styles.error}>
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <Button mode="outlined" style={styles.footerButton} onPress={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        <Button
          mode="contained"
          style={styles.footerButton}
          disabled={!canGoNext}
          loading={isSubmitting}
          onPress={handleNext}>
          {isLastStep ? 'Submit' : 'Next'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="bodySmall" style={styles.mutedText}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingHorizontal: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 8, gap: 6 },
  progress: { height: 6, borderRadius: 3 },
  mutedText: { opacity: 0.7 },
  stepScroll: { flex: 1 },
  stepContent: { gap: 12, paddingVertical: 12 },
  field: { gap: 2 },
  fieldLabel: { marginTop: 4 },
  input: {},
  error: { color: '#B3261E' },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  footerButton: { flex: 1 },
});
