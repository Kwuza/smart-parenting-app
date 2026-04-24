import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useAuth, useApp } from '../stores/auth';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
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
  useApp();
  const segments = useSegments();
  const router = useRouter();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  // Guards all router calls until the navigator tree is fully mounted.
  // Without this, onAuthStateChange callbacks fire synchronously during loadSession()
  // before <Stack> mounts, causing "Attempted to navigate before mounting" errors.
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Determine which tab to navigate to based on notification type
  const getNotificationRoute = (type: string): string => {
    const t = type.toLowerCase();
    if (['bedtime', 'wake', 'nap', 'sleep'].some(k => t.includes(k))) return '/(tabs)/log';
    if (['meal', 'breakfast', 'lunch', 'dinner', 'snack'].some(k => t.includes(k))) return '/(tabs)/log';
    if (['activity', 'learn', 'education'].some(k => t.includes(k))) return '/(tabs)/log';
    if (['growth', 'weekly'].some(k => t.includes(k))) return '/(tabs)/profile';
    return '/(tabs)';
  };

  useEffect(() => {
    loadSession();
    initNotifications();

    // Handle notification taps
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { notificationId?: string; childId?: string; type?: string };
      if (data?.childId) {
        // Select the matching child — read fresh from store to avoid stale closure
        const currentChildren = useApp.getState().children;
        const matchingChild = currentChildren.find(c => c.id === data.childId);
        if (matchingChild) {
          useApp.getState().selectChild(matchingChild);
        }

        const route = data.type ? getNotificationRoute(data.type) : '/(tabs)';
        const navigate = () => {
          if (!isMounted.current) return;
          try {
            router.replace(route as any);
          } catch {
            // navigation failed — no-op, user is on an auth screen or router is unready
          }
        };
        // Wait for auth to be confirmed ready (up to 1000ms), then navigate
        let elapsed = 0;
        const interval = setInterval(() => {
          elapsed += 100;
          const auth = useAuth.getState();
          if (!auth.loading && auth.user) {
            clearInterval(interval);
            navigate();
          } else if (elapsed >= 1000) {
            clearInterval(interval);
            navigate();
          }
        }, 100);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Not logged in and not on auth screens — redirect immediately
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Logged in but on auth screens — delay to let "Welcome back!" animation play
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      setRedirecting(true);
      redirectTimer.current = setTimeout(() => {
        setRedirecting(false);
        if (isMounted.current) {
          try { router.replace('/(tabs)'); } catch {}
        }
      }, 1800);
    }

    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      setRedirecting(false);
    };
  }, [user, loading, segments]);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="child/wizard" options={{ title: 'Add Child' }} />
      </Stack>

      {(loading || redirecting) && (
        <View pointerEvents="auto" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF7F60" />
          <Text style={styles.loadingText}>
            {redirecting ? 'Setting things up…' : 'Smart Parenting'}
          </Text>
        </View>
      )}
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEFBF6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
