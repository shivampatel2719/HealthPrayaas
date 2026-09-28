import { LineChart } from '@mantine/charts';

type Point = { date: string; bmi: number };

export function GrowthCurveChart({ points }: { points: Point[] }) {
  if (points.length === 0) return null;

  return (
    <LineChart
      h={240}
      data={points}
      dataKey="date"
      series={[{ name: 'bmi', color: 'medblue.6', label: 'BMI' }]}
      curveType="monotone"
      withDots
      withLegend={false}
    />
  );
}
