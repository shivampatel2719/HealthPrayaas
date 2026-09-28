import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Group, Loader, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams } from 'react-router-dom';

import { GrowthCurveChart } from '@/components/growth-curve-chart';
import { getStudent } from '@/db/academic';
import { getGrowthCurve, listRiskFlags, refreshRiskFlags, setRiskFlagStatus } from '@/db/analytics';
import type { AiInsightRow, HealthRecordRow, RiskFlagRow, StudentRow } from '@/db/db';
import { listHealthRecords } from '@/db/health-records';
import { useSettingsStore } from '@/store/settings-store';

const SEVERITY_COLOR: Record<string, string> = { low: 'green', medium: 'yellow', high: 'red' };

export function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const apiKey = useSettingsStore((s) => s.openaiApiKey);

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [records, setRecords] = useState<HealthRecordRow[]>([]);
  const [latestInsight, setLatestInsight] = useState<AiInsightRow | null>(null);
  const [riskFlags, setRiskFlags] = useState<RiskFlagRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingRisk, setIsRefreshingRisk] = useState(false);

  const load = () => {
    if (!studentId) return;
    Promise.all([getStudent(studentId), listHealthRecords(studentId), getGrowthCurve(studentId), listRiskFlags(studentId)])
      .then(([studentResult, recordsResult, growthResult, riskFlagsResult]) => {
        setStudent(studentResult ?? null);
        setRecords(recordsResult);
        const latest = [...growthResult].reverse().find((point) => point.insight)?.insight ?? null;
        setLatestInsight(latest);
        setRiskFlags(riskFlagsResult);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [studentId]);

  const handleRefreshRisk = () => {
    if (!studentId) return;
    if (!apiKey) {
      notifications.show({ color: 'red', message: 'Add an OpenAI API key in Settings first.' });
      return;
    }
    setIsRefreshingRisk(true);
    refreshRiskFlags(studentId, apiKey)
      .then(setRiskFlags)
      .catch((error) => notifications.show({ color: 'red', message: error instanceof Error ? error.message : 'Failed to check for risks' }))
      .finally(() => setIsRefreshingRisk(false));
  };

  const handleUpdateFlag = (flagId: string, status: 'acknowledged' | 'resolved') => {
    setRiskFlagStatus(flagId, status).then(() => setRiskFlags((prev) => prev.filter((flag) => flag.id !== flagId)));
  };

  if (isLoading) return <Loader color="medblue" />;
  if (!student) return <Alert color="red">Student not found.</Alert>;

  return (
    <Stack gap="lg" maw={800}>
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={2}>{student.fullName}</Title>
          <Text c="dimmed">
            Roll No. {student.rollNumber} · {student.gender} · DOB {student.dateOfBirth}
          </Text>
        </div>
        <Group>
          <Button variant="outline" onClick={() => navigate(`/students/${studentId}/chat`)}>
            Chat
          </Button>
          <Button onClick={() => navigate(`/students/${studentId}/new-record`)}>New Health Check</Button>
        </Group>
      </Group>

      <Card withBorder>
        <Title order={4} mb="xs">
          Growth curve (BMI)
        </Title>
        {records.length === 0 ? (
          <Text c="dimmed">No checkups recorded yet.</Text>
        ) : (
          <GrowthCurveChart
            points={[...records]
              .reverse()
              .map((record) => ({ date: new Date(record.recordedAt).toLocaleDateString(), bmi: record.bmi }))}
          />
        )}
        {latestInsight && (
          <Alert color="medblue" mt="md" title={`AI summary (score ${latestInsight.healthScore}/100)`}>
            {latestInsight.summary}
          </Alert>
        )}
      </Card>

      <Card withBorder>
        <Group justify="space-between" mb="xs">
          <Title order={4}>Risk flags</Title>
          <Button size="xs" variant="outline" loading={isRefreshingRisk} onClick={handleRefreshRisk}>
            Check for risks
          </Button>
        </Group>
        {riskFlags.length === 0 ? (
          <Text c="dimmed">No open risk flags.</Text>
        ) : (
          <Stack gap="sm">
            {riskFlags.map((flag) => (
              <Card key={flag.id} withBorder padding="sm">
                <Group justify="space-between" mb={4}>
                  <Text fw={600}>{flag.riskType.replace(/_/g, ' ')}</Text>
                  <Badge color={SEVERITY_COLOR[flag.severity] ?? 'gray'}>{flag.severity}</Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {flag.rationale}
                </Text>
                <Text size="sm">Suggested: {flag.suggestedIntervention}</Text>
                <Group mt="sm" gap="xs">
                  <Button size="xs" variant="subtle" onClick={() => handleUpdateFlag(flag.id, 'acknowledged')}>
                    Acknowledge
                  </Button>
                  <Button size="xs" variant="subtle" onClick={() => handleUpdateFlag(flag.id, 'resolved')}>
                    Resolve
                  </Button>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Card>

      <Card withBorder>
        <Title order={4} mb="xs">
          Health check history
        </Title>
        {records.length === 0 ? (
          <Text c="dimmed">No health checks recorded yet.</Text>
        ) : (
          <Table.ScrollContainer minWidth={400}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Height</Table.Th>
                  <Table.Th>Weight</Table.Th>
                  <Table.Th>BMI</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {records.map((record) => (
                  <Table.Tr key={record.id}>
                    <Table.Td>{new Date(record.recordedAt).toLocaleDateString()}</Table.Td>
                    <Table.Td>{record.heightCm}cm</Table.Td>
                    <Table.Td>{record.weightKg}kg</Table.Td>
                    <Table.Td>{record.bmi}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </Stack>
  );
}
