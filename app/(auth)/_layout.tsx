import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../../stores/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, loadSession } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}
