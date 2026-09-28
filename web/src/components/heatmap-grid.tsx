import { Paper, SimpleGrid, Text } from '@mantine/core';

type Cell = { label: string; value: number };

const TINT_START = { r: 234, g: 243, b: 251 };
const TINT_END = { r: 25, g: 118, b: 210 };

function intensity(value: number, min: number, max: number): number {
  const range = max - min || 1;
  return Math.min(1, Math.max(0, (value - min) / range));
}

function intensityColor(t: number): string {
  const r = Math.round(TINT_START.r + (TINT_END.r - TINT_START.r) * t);
  const g = Math.round(TINT_START.g + (TINT_END.g - TINT_START.g) * t);
  const b = Math.round(TINT_START.b + (TINT_END.b - TINT_START.b) * t);
  return `rgb(${r},${g},${b})`;
}

export function HeatmapGrid({ cells }: { cells: Cell[] }) {
  if (cells.length === 0) return null;

  const values = cells.map((cell) => cell.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
      {cells.map((cell) => {
        const t = intensity(cell.value, min, max);
        return (
          <Paper
            key={cell.label}
            p="md"
            radius="md"
            style={{ backgroundColor: intensityColor(t), color: t > 0.5 ? '#FFFFFF' : '#1B1B1F' }}>
            <Text fw={600} size="sm">
              {cell.label}
            </Text>
            <Text size="xs">{cell.value}</Text>
          </Paper>
        );
      })}
    </SimpleGrid>
  );
}
