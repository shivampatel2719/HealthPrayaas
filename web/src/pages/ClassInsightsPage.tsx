import { useEffect, useState } from 'react';
import { Card, Loader, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useParams } from 'react-router-dom';

import { listSectionsByClass } from '@/db/academic';
import { getHeatmap } from '@/db/analytics';
import type { CohortMetric } from '@/db/db';
import { HeatmapGrid } from '@/components/heatmap-grid';
import { useSettingsStore } from '@/store/settings-store';

export function ClassInsightsPage() {
  const { classId } = useParams<{ classId: string }>();
  const apiKey = useSettingsStore((s) => s.openaiApiKey);

  const [metric, setMetric] = useState<CohortMetric>('overall');
  const [cells, setCells] = useState<{ label: string; value: number }[]>([]);
  const [summaries, setSummaries] = useState<{ label: string; summary: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    listSectionsByClass(classId)
      .then(async (sections) => {
        const results = await Promise.all(
          sections.map((section) => getHeatmap(section.id, metric, apiKey).then((result) => ({ section, result }))),
        );
        setCells(results.map(({ section, result }) => ({ label: `Section ${section.name}`, value: result.avgValue })));
        setSummaries(results.map(({ section, result }) => ({ label: `Section ${section.name}`, summary: result.aiSummary })));
      })
      .finally(() => setIsLoading(false));
  }, [classId, metric, apiKey]);

  return (
    <Stack maw={700}>
      <Title order={2}>Class Insights</Title>
      <SegmentedControl
        value={metric}
        onChange={(value) => {
          setMetric(value as CohortMetric);
          setIsLoading(true);
        }}
        data={[
          { value: 'overall', label: 'Overall' },
          { value: 'bmi', label: 'BMI' },
          { value: 'illness_rate', label: 'Issue rate' },
        ]}
      />

      {isLoading ? (
        <Loader color="medblue" />
      ) : (
        <Stack gap="md">
          <HeatmapGrid cells={cells} />
          {summaries.map((item) => (
            <Card key={item.label} withBorder padding="sm">
              <Text fw={600}>{item.label}</Text>
              <Text size="sm" c="dimmed">
                {item.summary}
              </Text>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
