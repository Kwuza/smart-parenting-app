import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../stores/auth';
import { View, ActivityIndicator } from 'react-native';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#3B82F6',
    primaryContainer: '#DBEAFE',
    secondary: '#F1F5F9',
    secondaryContainer: '#E2E8F0',
    surface: '#FFFFFF',
    background: '#F8FAFC',
    error: '#EF4444',
    onPrimary: '#FFFFFF',
    onSecondary: '#334155',
    onSurface: '#0F172A',
    onBackground: '#0F172A',
    outline: '#E2E8F0',
    outlineVariant: '#F1F5F9',
    screenTime: '#3B82F6',
    screenTimeBg: '#EFF6FF',
    sleep: '#10B981',
    sleepBg: '#ECFDF5',
    meals: '#F59E0B',
    mealsBg: '#FFFBEB',
    education: '#8B5CF6',
    educationBg: '#F5F3FF',
  },
};

export default function RootLayout() {
  const { user, loading, loadSession } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Not logged in and not on auth screens — redirect immediately
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Logged in but on auth screens — delay to let "Welcome back!" animation play
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      redirectTimer.current = setTimeout(() => {
        router.replace('/(tabs)');
      }, 1800);
    }

    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="child/new" options={{ title: 'Add Child' }} />
      </Stack>
    </PaperProvider>
  );
}
