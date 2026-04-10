import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563EB',
    primaryContainer: '#DBEAFE',
    secondary: '#10B981',
    secondaryContainer: '#D1FAE5',
    surface: '#FFFFFF',
    background: '#F8FAFC',
    error: '#EF4444',
  },
};

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="child/[id]" />
        <Stack.Screen name="log-activity" />
        <Stack.Screen name="ai-analysis" />
      </Stack>
    </PaperProvider>
  );
}
