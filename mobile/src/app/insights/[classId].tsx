import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Card, SegmentedButtons, Text } from 'react-native-paper';

import { HeatmapGrid } from '@/components/heatmap-grid';
import { listSectionsByClass } from '@/lib/academic-api';
import { getHeatmap, type CohortMetric } from '@/lib/analytics-api';
import { useAuthStore } from '@/store/auth-store';

export default function ClassInsightsScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const token = useAuthStore((s) => s.token);

  const [metric, setMetric] = useState<CohortMetric>('overall');
  const [cells, setCells] = useState<{ label: string; value: number }[]>([]);
  const [summaries, setSummaries] = useState<{ label: string; summary: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !classId) return;
    listSectionsByClass(token, classId)
      .then(async (sections) => {
        const results = await Promise.all(
          sections.map((section) => getHeatmap(token, section.id, metric).then((result) => ({ section, result }))),
        );
        setCells(
          results.map(({ section, result }) => ({ label: `Section ${section.name}`, value: result.avgValue })),
        );
        setSummaries(
          results.map(({ section, result }) => ({ label: `Section ${section.name}`, summary: result.aiSummary })),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load heatmap'))
      .finally(() => setIsLoading(false));
  }, [token, classId, metric]);

  const handleSelectMetric = (value: string) => {
    setMetric(value as CohortMetric);
    setIsLoading(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <SegmentedButtons
        value={metric}
        onValueChange={handleSelectMetric}
        style={styles.segmented}
        buttons={[
          { value: 'overall', label: 'Overall' },
          { value: 'bmi', label: 'BMI' },
          { value: 'illness_rate', label: 'Issue rate' },
        ]}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.spacingTop} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <HeatmapGrid cells={cells} />
          {summaries.map((item) => (
            <Card key={item.label} style={styles.summaryCard} mode="outlined">
              <Card.Content style={styles.cardContent}>
                <Text variant="titleSmall">{item.label}</Text>
                <Text variant="bodySmall" style={styles.mutedText}>
                  {item.summary}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingHorizontal: 16 },
  segmented: { marginTop: 8 },
  spacingTop: { marginTop: 24 },
  error: { color: '#B3261E', marginTop: 24 },
  content: { gap: 12, paddingVertical: 16 },
  summaryCard: {},
  cardContent: { gap: 4 },
  mutedText: { opacity: 0.7 },
});
