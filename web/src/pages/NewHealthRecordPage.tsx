import { useEffect, useMemo, useState } from 'react';
import { Button, Group, NumberInput, SegmentedControl, Stack, Stepper, TagsInput, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams } from 'react-router-dom';

import { getStudent } from '@/db/academic';
import type { DentalHygieneStatus, DietaryPreference, HearingStatus, PostureStatus, StudentRow } from '@/db/db';
import { createHealthRecord } from '@/db/health-records';
import { useSettingsStore } from '@/store/settings-store';

const STEP_TITLES = ['Demographics', 'Physical Vitals', 'Clinical Indicators', 'Medical History', 'Lifestyle'];

function computeAgeYears(dateOfBirth: string): number {
  const ageMs = Date.now() - new Date(dateOfBirth).getTime();
  return Math.round((ageMs / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
}

type FormState = {
  heightCm: number | '';
  weightKg: number | '';
  heartRateBpm: number | '';
  bloodPressureSystolic: number | '';
  bloodPressureDiastolic: number | '';
  visionLeftAcuity: string;
  visionRightAcuity: string;
  dentalHygieneStatus: DentalHygieneStatus | null;
  hearingStatus: HearingStatus | null;
  postureStatus: PostureStatus | null;
  knownAllergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  avgSleepHours: number | '';
  physicalActivityDaysPerWeek: number | '';
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
  knownAllergies: [],
  chronicConditions: [],
  currentMedications: [],
  avgSleepHours: '',
  physicalActivityDaysPerWeek: '',
  dietaryPreference: null,
};

export function NewHealthRecordPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const apiKey = useSettingsStore((s) => s.openaiApiKey);

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    getStudent(studentId).then((result) => setStudent(result ?? null));
  }, [studentId]);

  const bmi = useMemo(() => {
    if (!form.heightCm || !form.weightKg) return null;
    const heightM = Number(form.heightCm) / 100;
    return Math.round((Number(form.weightKg) / (heightM * heightM)) * 100) / 100;
  }, [form.heightCm, form.weightKg]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const canGoNext = useMemo(() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return form.heightCm !== '' && form.weightKg !== '';
      case 2:
        return Boolean(form.dentalHygieneStatus && form.hearingStatus && form.postureStatus);
      case 3:
        return true;
      case 4:
        return form.avgSleepHours !== '' && form.physicalActivityDaysPerWeek !== '' && Boolean(form.dietaryPreference);
      default:
        return false;
    }
  }, [step, form]);

  const isLastStep = step === STEP_TITLES.length - 1;

  const handleSubmit = () => {
    if (!studentId || !student) return;
    setIsSubmitting(true);
    createHealthRecord(studentId, apiKey, {
      ageYears: computeAgeYears(student.dateOfBirth),
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      heartRateBpm: form.heartRateBpm === '' ? undefined : Number(form.heartRateBpm),
      bloodPressureSystolic: form.bloodPressureSystolic === '' ? undefined : Number(form.bloodPressureSystolic),
      bloodPressureDiastolic: form.bloodPressureDiastolic === '' ? undefined : Number(form.bloodPressureDiastolic),
      visionLeftAcuity: form.visionLeftAcuity || undefined,
      visionRightAcuity: form.visionRightAcuity || undefined,
      dentalHygieneStatus: form.dentalHygieneStatus!,
      hearingStatus: form.hearingStatus!,
      postureStatus: form.postureStatus!,
      knownAllergies: form.knownAllergies,
      chronicConditions: form.chronicConditions,
      currentMedications: form.currentMedications,
      avgSleepHours: Number(form.avgSleepHours),
      physicalActivityDaysPerWeek: Number(form.physicalActivityDaysPerWeek),
      dietaryPreference: form.dietaryPreference!,
    })
      .then(() => navigate(`/students/${studentId}`))
      .catch((error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Failed to submit' }))
      .finally(() => setIsSubmitting(false));
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (isLastStep) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  if (!student) return null;

  return (
    <Stack maw={600}>
      <Stepper active={step} size="sm">
        {STEP_TITLES.map((title) => (
          <Stepper.Step key={title} label={title} />
        ))}
      </Stepper>

      <Stack gap="md" mt="md">
        {step === 0 && (
          <>
            <Text>Name: {student.fullName}</Text>
            <Text>Roll number: {student.rollNumber}</Text>
            <Text>Gender: {student.gender}</Text>
            <Text>Date of birth: {student.dateOfBirth}</Text>
            <Text>Age at this visit: {computeAgeYears(student.dateOfBirth)} years</Text>
          </>
        )}

        {step === 1 && (
          <>
            <NumberInput label="Height (cm)" value={form.heightCm} onChange={(v) => update('heightCm', v as number | '')} />
            <NumberInput label="Weight (kg)" value={form.weightKg} onChange={(v) => update('weightKg', v as number | '')} />
            {bmi !== null && <Text size="sm">BMI (auto-calculated): {bmi}</Text>}
            <NumberInput label="Heart rate (bpm)" value={form.heartRateBpm} onChange={(v) => update('heartRateBpm', v as number | '')} />
            <NumberInput
              label="Blood pressure — systolic"
              value={form.bloodPressureSystolic}
              onChange={(v) => update('bloodPressureSystolic', v as number | '')}
            />
            <NumberInput
              label="Blood pressure — diastolic"
              value={form.bloodPressureDiastolic}
              onChange={(v) => update('bloodPressureDiastolic', v as number | '')}
            />
          </>
        )}

        {step === 2 && (
          <>
            <TextInput
              label="Vision — left eye"
              placeholder="e.g. 6/6"
              value={form.visionLeftAcuity}
              onChange={(e) => update('visionLeftAcuity', e.currentTarget.value)}
            />
            <TextInput
              label="Vision — right eye"
              placeholder="e.g. 6/6"
              value={form.visionRightAcuity}
              onChange={(e) => update('visionRightAcuity', e.currentTarget.value)}
            />
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                Dental hygiene
              </Text>
              <SegmentedControl
                value={form.dentalHygieneStatus ?? ''}
                onChange={(v) => update('dentalHygieneStatus', v as DentalHygieneStatus)}
                data={[
                  { value: 'good', label: 'Good' },
                  { value: 'fair', label: 'Fair' },
                  { value: 'poor', label: 'Poor' },
                ]}
              />
            </Stack>
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                Hearing
              </Text>
              <SegmentedControl
                value={form.hearingStatus ?? ''}
                onChange={(v) => update('hearingStatus', v as HearingStatus)}
                data={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'impaired', label: 'Impaired' },
                ]}
              />
            </Stack>
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                Posture
              </Text>
              <SegmentedControl
                value={form.postureStatus ?? ''}
                onChange={(v) => update('postureStatus', v as PostureStatus)}
                data={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'mild_issue', label: 'Mild' },
                  { value: 'significant_issue', label: 'Significant' },
                ]}
              />
            </Stack>
          </>
        )}

        {step === 3 && (
          <>
            <TagsInput
              label="Known allergies"
              placeholder="Type and press Enter"
              value={form.knownAllergies}
              onChange={(v) => update('knownAllergies', v)}
            />
            <TagsInput
              label="Chronic conditions"
              placeholder="Type and press Enter"
              value={form.chronicConditions}
              onChange={(v) => update('chronicConditions', v)}
            />
            <TagsInput
              label="Current medications"
              placeholder="Type and press Enter"
              value={form.currentMedications}
              onChange={(v) => update('currentMedications', v)}
            />
          </>
        )}

        {step === 4 && (
          <>
            <NumberInput
              label="Average sleep hours"
              value={form.avgSleepHours}
              onChange={(v) => update('avgSleepHours', v as number | '')}
            />
            <NumberInput
              label="Physical activity (days/week)"
              value={form.physicalActivityDaysPerWeek}
              onChange={(v) => update('physicalActivityDaysPerWeek', v as number | '')}
            />
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                Dietary preference
              </Text>
              <SegmentedControl
                value={form.dietaryPreference ?? ''}
                onChange={(v) => update('dietaryPreference', v as DietaryPreference)}
                data={[
                  { value: 'vegetarian', label: 'Vegetarian' },
                  { value: 'non_vegetarian', label: 'Non-veg' },
                  { value: 'vegan', label: 'Vegan' },
                  { value: 'eggetarian', label: 'Eggetarian' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </Stack>
          </>
        )}
      </Stack>

      <Group justify="space-between" mt="md">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </Button>
        <Button disabled={!canGoNext} loading={isSubmitting} onClick={handleNext}>
          {isLastStep ? 'Submit' : 'Next'}
        </Button>
      </Group>
    </Stack>
  );
}
