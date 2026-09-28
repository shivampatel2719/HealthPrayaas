import { StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';

type Cell = { label: string; value: number };

const TINT_START = { r: 227, g: 242, b: 253 };
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
  if (cells.length === 0) {
    return null;
  }

  const values = cells.map((cell) => cell.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <View style={styles.row}>
      {cells.map((cell) => {
        const t = intensity(cell.value, min, max);
        const textColor = t > 0.5 ? '#FFFFFF' : '#1B1B1F';
        return (
          <Surface key={cell.label} elevation={1} style={[styles.cell, { backgroundColor: intensityColor(t) }]}>
            <Text variant="titleSmall" style={{ color: textColor }}>
              {cell.label}
            </Text>
            <Text variant="bodySmall" style={{ color: textColor }}>
              {cell.value}
            </Text>
          </Surface>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: 104,
    height: 84,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
