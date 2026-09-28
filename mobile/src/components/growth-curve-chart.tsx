import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { paperTheme } from '@/constants/paper-theme';

type Point = { label: string; value: number };

const CHART_HEIGHT = 160;
const PADDING = 16;

export function GrowthCurveChart({ points }: { points: Point[] }) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  if (points.length === 0) {
    return null;
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const usableWidth = Math.max(width - PADDING * 2, 0);
  const usableHeight = CHART_HEIGHT - PADDING * 2;

  const coords = points.map((point, index) => {
    const x = PADDING + (points.length === 1 ? usableWidth / 2 : (index / (points.length - 1)) * usableWidth);
    const y = PADDING + usableHeight - ((point.value - minValue) / range) * usableHeight;
    return { x, y };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <View onLayout={onLayout} style={{ height: CHART_HEIGHT }}>
      {width > 0 && (
        <Svg width={width} height={CHART_HEIGHT}>
          <Polyline points={polylinePoints} fill="none" stroke={paperTheme.colors.primary} strokeWidth={2} />
          {coords.map((coord, index) => (
            <Circle key={index} cx={coord.x} cy={coord.y} r={4} fill={paperTheme.colors.primary} />
          ))}
        </Svg>
      )}
    </View>
  );
}
