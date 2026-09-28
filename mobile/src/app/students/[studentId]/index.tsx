import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Card, Chip, FAB, Text } from 'react-native-paper';

import { GrowthCurveChart } from '@/components/growth-curve-chart';
import { getStudent, type StudentDto } from '@/lib/academic-api';
import {
  getGrowthCurve,
  listRiskFlags,
  refreshRiskFlags,
  updateRiskFlag,
  type GrowthCurvePoint,
  type RiskFlagDto,
} from '@/lib/analytics-api';
import { listHealthRecords, type HealthRecordDto } from '@/lib/health-records-api';
import { useAuthStore } from '@/store/auth-store';

const SEVERITY_COLOR: Record<string, string> = {
  low: '#5C8A3A',
  medium: '#B8860B',
  high: '#B3261E',
};

export default function StudentProfileScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [student, setStudent] = useState<StudentDto | null>(null);
  const [records, setRecords] = useState<HealthRecordDto[]>([]);
  const [growthCurve, setGrowthCurve] = useState<GrowthCurvePoint[]>([]);
  const [riskFlags, setRiskFlags] = useState<RiskFlagDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingRisk, setIsRefreshingRisk] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token || !studentId) return;
      setIsLoading(true);
      Promise.all([
        getStudent(token, studentId),
        listHealthRecords(token, studentId),
        getGrowthCurve(token, studentId),
        listRiskFlags(token, studentId),
      ])
        .then(([studentResult, recordsResult, growthResult, riskFlagsResult]) => {
          setStudent(studentResult);
          setRecords(recordsResult);
          setGrowthCurve(growthResult);
          setRiskFlags(riskFlagsResult);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load student'))
        .finally(() => setIsLoading(false));
    }, [token, studentId]),
  );

  const handleRefreshRisk = () => {
    if (!token || !studentId) return;
    setIsRefreshingRisk(true);
    refreshRiskFlags(token, studentId)
      .then(setRiskFlags)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to check for risks'))
      .finally(() => setIsRefreshingRisk(false));
  };

  const handleUpdateFlagStatus = (flagId: string, status: 'acknowledged' | 'resolved') => {
    if (!token) return;
    updateRiskFlag(token, flagId, status)
      .then(() => setRiskFlags((prev) => prev.filter((flag) => flag.id !== flagId)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to update risk flag'));
  };

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!student || isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const latestInsight = [...growthCurve].reverse().find((point) => point.insight)?.insight ?? null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineSmall">{student.fullName}</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Roll No. {student.rollNumber}
        </Text>

        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.cardContent}>
            <Row label="Date of birth" value={student.dateOfBirth} />
            <Row label="Gender" value={student.gender} />
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          icon="clipboard-plus-outline"
          style={styles.actionButton}
          onPress={() =>
            router.push({ pathname: '/students/[studentId]/new-health-record', params: { studentId: student.id } })
          }>
          New Health Check
        </Button>

        <SectionTitle>Growth curve (BMI)</SectionTitle>
        <GrowthCurveChart
          points={growthCurve.map((point) => ({
            label: point.record.recordedAt,
            value: Number(point.record.bmi),
          }))}
        />
        {growthCurve.length === 0 && <Text style={styles.mutedText}>No checkups recorded yet.</Text>}
        {latestInsight && (
          <Card style={styles.card} mode="outlined">
            <Card.Content style={styles.cardContent}>
              <Text variant="titleSmall">AI summary (score {latestInsight.healthScore}/100)</Text>
              <Text variant="bodySmall" style={styles.mutedText}>
                {latestInsight.summary}
              </Text>
            </Card.Content>
          </Card>
        )}

        <SectionTitle>Risk flags</SectionTitle>
        <Button mode="outlined" onPress={handleRefreshRisk} loading={isRefreshingRisk} style={styles.actionButton}>
          Check for risks
        </Button>
        {riskFlags.length === 0 ? (
          <Text style={styles.mutedText}>No open risk flags.</Text>
        ) : (
          riskFlags.map((flag) => (
            <Card key={flag.id} style={styles.card} mode="outlined">
              <Card.Content style={styles.cardContent}>
                <View style={styles.flagHeader}>
                  <Text variant="titleSmall">{flag.riskType.replace(/_/g, ' ')}</Text>
                  <Chip
                    compact
                    style={{ backgroundColor: `${SEVERITY_COLOR[flag.severity] ?? '#999'}22` }}
                    textStyle={{ color: SEVERITY_COLOR[flag.severity] ?? '#333' }}>
                    {flag.severity}
                  </Chip>
                </View>
                <Text variant="bodySmall" style={styles.mutedText}>
                  {flag.rationale}
                </Text>
                <Text variant="bodySmall">Suggested: {flag.suggestedIntervention}</Text>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => handleUpdateFlagStatus(flag.id, 'acknowledged')}>Acknowledge</Button>
                <Button onPress={() => handleUpdateFlagStatus(flag.id, 'resolved')}>Resolve</Button>
              </Card.Actions>
            </Card>
          ))
        )}

        <SectionTitle>Health check history</SectionTitle>
        {records.length === 0 ? (
          <Text style={styles.mutedText}>No health checks recorded yet.</Text>
        ) : (
          records.map((record) => (
            <Card key={record.id} style={styles.card} mode="outlined">
              <Card.Content style={styles.cardContent}>
                <Text variant="bodySmall" style={styles.mutedText}>
                  {new Date(record.recordedAt).toLocaleDateString()}
                </Text>
                <Text variant="bodyMedium">
                  Height {record.heightCm}cm · Weight {record.weightKg}kg · BMI {record.bmi}
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="chat-outline"
        style={styles.fab}
        onPress={() => router.push({ pathname: '/students/[studentId]/chat', params: { studentId: student.id } })}
      />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="bodySmall" style={styles.mutedText}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="titleMedium" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 96, gap: 4 },
  subtitle: { opacity: 0.7, marginBottom: 8 },
  card: { marginTop: 8 },
  cardContent: { gap: 6 },
  row: { gap: 2 },
  actionButton: { marginTop: 12 },
  sectionTitle: { marginTop: 20, marginBottom: 4 },
  mutedText: { opacity: 0.7 },
  errorText: { color: '#B3261E', padding: 16 },
  flagHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
