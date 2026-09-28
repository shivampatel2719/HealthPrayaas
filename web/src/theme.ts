import { createTheme, type MantineColorsTuple } from '@mantine/core';

const medblue: MantineColorsTuple = [
  '#eaf3fb',
  '#cde3f5',
  '#a9cdec',
  '#82b6e2',
  '#5da0d8',
  '#3a8bcf',
  '#1976d2',
  '#145fa8',
  '#0f4a80',
  '#0a3559',
];

export const theme = createTheme({
  primaryColor: 'medblue',
  colors: { medblue },
  defaultRadius: 'md',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
});
