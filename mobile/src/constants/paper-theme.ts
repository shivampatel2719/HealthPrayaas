import { MD3LightTheme } from 'react-native-paper';

// v1 ships light theme only, per PRD; dark theme is a deferred nice-to-have.
export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976D2',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D3E4FA',
    onPrimaryContainer: '#0D3D6E',
    secondaryContainer: '#E3F2FD',
    onSecondaryContainer: '#0D3D6E',
    background: '#FAFAFA',
    onBackground: '#1B1B1F',
    surface: '#FFFFFF',
    onSurface: '#1B1B1F',
    surfaceVariant: '#E3F2FD',
    onSurfaceVariant: '#3A4750',
    outline: '#7A8B99',
  },
};
