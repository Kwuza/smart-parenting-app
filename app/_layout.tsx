import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../stores/auth';
import { View, ActivityIndicator } from 'react-native';
import { initNotifications } from '../lib/notifications';
import * as Notifications from 'expo-notifications';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#FF7F60',
    primaryContainer: '#FFE5E0',
    secondary: '#F1F5F9',
    secondaryContainer: '#E2E8F0',
    surface: '#FFFDFF',
    background: '#FEFBF6',
    error: '#EF4444',
    onPrimary: '#FFFFFF',
    onSecondary: '#334155',
    onSurface: '#0F172A',
    onBackground: '#0F172A',
    outline: '#E2E8F0',
    outlineVariant: '#F1F5F9',
    screenTime: '#FF7F60',
    screenTimeBg: '#FFF0ED',
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
    initNotifications();

    // Handle notification taps
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.childId) {
        // Could navigate to log screen for this child
      }
    });
    return () => sub.remove();
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFBF6' }}>
        <ActivityIndicator size="large" color="#FF7F60" />
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
        <Stack.Screen name="child/routine" options={{ title: 'Set Routine' }} />
      </Stack>
    </PaperProvider>
  );
}
