import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp, useAuth } from '../../stores/auth';
import { getTodayActivities, Activity, ActivityType } from '../../lib/api';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateString(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getActivityLabel(type: ActivityType, value: Record<string, any>): string {
  switch (type) {
    case 'screen_time': {
      const h = value.hours || 0;
      const m = value.minutes || 0;
      const device = value.device || '';
      return `Screen time — ${h > 0 ? `${h}h ` : ''}${m}m${device ? ` on ${device}` : ''}`;
    }
    case 'sleep': {
      const h = value.hours || 0;
      const m = value.minutes || 0;
      const q = value.quality || '';
      return `Sleep — ${h > 0 ? `${h}h ` : ''}${m}m${q ? ` (${q})` : ''}`;
    }
    case 'meal': {
      const meal = value.meal_type || 'meal';
      const q = value.quality || '';
      return `${meal.charAt(0).toUpperCase() + meal.slice(1)}${q ? ` — ${q}` : ''}`;
    }
    case 'education': {
      const h = value.hours || 0;
      const m = value.minutes || 0;
      const s = value.subject || '';
      return `Learning — ${h > 0 ? `${h}h ` : ''}${m}m${s ? ` (${s.replace('_', ' ')})` : ''}`;
    }
    default:
      return type;
  }
}

interface Stats {
  screenTime: string;
  sleep: string;
  meals: string;
  education: string;
  screenMins: number;
  sleepMins: number;
  mealCount: number;
  eduMins: number;
}

function calculateStats(activities: Activity[]): Stats {
  let screenMins = 0;
  let sleepMins = 0;
  let mealCount = 0;
  let eduMins = 0;

  for (const a of activities) {
    const v = a.value as Record<string, any>;
    switch (a.type) {
      case 'screen_time':
        screenMins += (v.hours || 0) * 60 + (v.minutes || 0);
        break;
      case 'sleep':
        sleepMins += (v.hours || 0) * 60 + (v.minutes || 0);
        break;
      case 'meal':
        mealCount++;
        break;
      case 'education':
        eduMins += (v.hours || 0) * 60 + (v.minutes || 0);
        break;
    }
  }

  const formatMins = (mins: number) => {
    if (mins === 0) return '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return {
    screenTime: formatMins(screenMins),
    sleep: formatMins(sleepMins),
    meals: mealCount > 0 ? `${mealCount}/3` : '--/--',
    education: formatMins(eduMins),
    screenMins,
    sleepMins,
    mealCount,
    eduMins,
  };
}

interface StatItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subtitle: string;
  color: string;
  bgColor: string;
}

function StatCard({ item }: { item: StatItem }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.statCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/log?type=${item.key === 'screen' ? 'screen_time' : item.key === 'edu' ? 'education' : item.key}`)}
    >
      <View style={[styles.statIcon, { backgroundColor: item.bgColor }]}>
        <Ionicons name={item.icon} size={20} color={item.color} />
      </View>
      <Text style={styles.statLabel}>{item.label}</Text>
      <Text style={[styles.statValue, item.value === '--' && styles.statValueEmpty]}>
        {item.value}
      </Text>
      <Text style={styles.statSubtitle}>{item.subtitle}</Text>
    </TouchableOpacity>
  );
}

function RecentItem({ activity }: { activity: Activity }) {
  const typeConfig: Record<string, { color: string; bg: string; letter: string }> = {
    screen_time: { color: '#3B82F6', bg: '#EFF6FF', letter: 'S' },
    sleep: { color: '#10B981', bg: '#ECFDF5', letter: 'Z' },
    meal: { color: '#F59E0B', bg: '#FFFBEB', letter: 'M' },
    education: { color: '#8B5CF6', bg: '#F5F3FF', letter: 'E' },
  };
  const config = typeConfig[activity.type] || typeConfig.screen_time;

  return (
    <View style={styles.recentItem}>
      <View style={[styles.recentIcon, { backgroundColor: config.bg }]}>
        <Text style={[styles.recentLetter, { color: config.color }]}>{config.letter}</Text>
      </View>
      <View style={styles.recentContent}>
        <Text style={styles.recentText}>
          {getActivityLabel(activity.type, activity.value as Record<string, any>)}
        </Text>
        <Text style={styles.recentTime}>{formatTime(activity.recorded_at)}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { selectedChild, children, loadChildren } = useApp();
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);

  const loadTodayData = async () => {
    if (selectedChild) {
      try {
        const activities = await getTodayActivities(selectedChild.id);
        setTodayActivities(activities);
      } catch (err) {
        console.error('Failed to load activities:', err);
      }
    } else {
      setTodayActivities([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChildren().then(() => loadTodayData());
    }, [])
  );

  // Reload activities when selectedChild changes
  useEffect(() => {
    loadTodayData();
  }, [selectedChild?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChildren();
    await loadTodayData();
    setRefreshing(false);
  };

  const userName = user?.user_metadata?.name?.split(' ')[0] || 'there';
  const hasChild = !!selectedChild;
  const childName = selectedChild?.name || '';
  const age = selectedChild?.date_of_birth
    ? Math.floor(
        (Date.now() - new Date(selectedChild.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  const stats = calculateStats(todayActivities);

  const statItems: StatItem[] = [
    { key: 'screen', icon: 'phone-portrait-outline', label: 'Screen Time', value: stats.screenTime, subtitle: 'today', color: '#3B82F6', bgColor: '#EFF6FF' },
    { key: 'sleep', icon: 'moon-outline', label: 'Sleep', value: stats.sleep, subtitle: 'last night', color: '#10B981', bgColor: '#ECFDF5' },
    { key: 'meal', icon: 'restaurant-outline', label: 'Meals', value: stats.meals, subtitle: 'tracked today', color: '#F59E0B', bgColor: '#FFFBEB' },
    { key: 'edu', icon: 'school-outline', label: 'Education', value: stats.education, subtitle: 'today', color: '#8B5CF6', bgColor: '#F5F3FF' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity style={styles.notifButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color="#0F172A" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        <Text style={styles.date}>{getDateString()}</Text>

        {/* Child Selector / Add Child */}
        {hasChild ? (
          <TouchableOpacity
            style={styles.childBanner}
            activeOpacity={0.7}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.childAvatar}>
              <Text style={styles.childAvatarText}>
                {childName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{childName}</Text>
              <Text style={styles.childMeta}>
                {age !== null ? `${age} years old` : 'Age not set'} · {todayActivities.length} activities today
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addChildBanner}
            activeOpacity={0.7}
            onPress={() => router.push('/child/new')}
          >
            <View style={styles.addChildIcon}>
              <Ionicons name="add" size={24} color="#3B82F6" />
            </View>
            <View style={styles.addChildContent}>
              <Text style={styles.addChildTitle}>Add your first child</Text>
              <Text style={styles.addChildSubtitle}>
                Create a profile to start tracking activities
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        )}

        {/* Quick Log */}
        <TouchableOpacity
          style={styles.quickLog}
          activeOpacity={0.85}
          onPress={() => router.push('/log')}
        >
          <View style={styles.quickLogContent}>
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.quickLogText}>Log an Activity</Text>
          </View>
          <Text style={styles.quickLogSub}>
            {hasChild ? `For ${childName}` : 'Screen time, sleep, meals, education'}
          </Text>
        </TouchableOpacity>

        {/* Stats Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <TouchableOpacity onPress={() => router.push('/ai')}>
            <Text style={styles.sectionLink}>View Insights →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsGrid}>
          {statItems.map((s) => (
            <StatCard key={s.key} item={s} />
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {hasChild && todayActivities.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/log')}>
              <Text style={styles.sectionLink}>Log New →</Text>
            </TouchableOpacity>
          )}
        </View>

        {todayActivities.length > 0 ? (
          <View style={styles.recentList}>
            {todayActivities.slice(0, 5).map((a) => (
              <RecentItem key={a.id} activity={a} />
            ))}
            {todayActivities.length > 5 && (
              <Text style={styles.moreText}>
                +{todayActivities.length - 5} more activities
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={32} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>
              {hasChild ? 'No activities yet' : 'Activities appear here'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {hasChild
                ? 'Tap the + button or "Log an Activity" to get started'
                : 'Add a child profile first, then start logging'}
            </Text>
          </View>
        )}

        {/* AI Banner */}
        <TouchableOpacity
          style={styles.aiBanner}
          activeOpacity={0.85}
          onPress={() => router.push('/ai')}
        >
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.aiContent}>
            <Text style={styles.aiTitle}>AI Insights</Text>
            <Text style={styles.aiSubtitle} numberOfLines={2}>
              {hasChild
                ? `Get personalized recommendations for ${childName}`
                : 'Unlock AI-powered parenting recommendations'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    backgroundColor: '#F8FAFC',
  },
  headerContent: {},
  greeting: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '400',
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  date: {
    fontSize: 13,
    color: '#94A3B8',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  childBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  childMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  addChildBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addChildIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  addChildContent: {
    flex: 1,
  },
  addChildTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E40AF',
  },
  addChildSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  quickLog: {
    backgroundColor: '#3B82F6',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  quickLogContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickLogText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickLogSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    marginLeft: 34,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  statValueEmpty: {
    color: '#CBD5E1',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  recentList: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentLetter: {
    fontSize: 14,
    fontWeight: '700',
  },
  recentContent: {
    flex: 1,
  },
  recentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  recentTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  moreText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    padding: 28,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#3B82F6',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiContent: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aiSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    lineHeight: 16,
  },
});
