import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp, useAuth } from '../../stores/auth';

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

interface StatItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subtitle: string;
  color: string;
  bgColor: string;
  route: string;
}

function StatCard({ item }: { item: StatItem }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.statCard}
      activeOpacity={0.7}
      onPress={() => router.push(item.route as any)}
    >
      <View style={[styles.statIcon, { backgroundColor: item.bgColor }]}>
        <Ionicons name={item.icon} size={20} color={item.color} />
      </View>
      <Text style={styles.statLabel}>{item.label}</Text>
      <Text style={styles.statValue}>{item.value}</Text>
      <Text style={styles.statSubtitle}>{item.subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { selectedChild, children, loadChildren } = useApp();
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadChildren();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChildren();
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

  const stats: StatItem[] = [
    {
      key: 'screen',
      icon: 'phone-portrait-outline',
      label: 'Screen Time',
      value: '--',
      subtitle: 'hrs today',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
      route: '/log?type=screen_time',
    },
    {
      key: 'sleep',
      icon: 'moon-outline',
      label: 'Sleep',
      value: '--',
      subtitle: 'hrs last night',
      color: '#10B981',
      bgColor: '#ECFDF5',
      route: '/log?type=sleep',
    },
    {
      key: 'meals',
      icon: 'restaurant-outline',
      label: 'Meals',
      value: '--/--',
      subtitle: 'tracked today',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
      route: '/log?type=meal',
    },
    {
      key: 'edu',
      icon: 'school-outline',
      label: 'Education',
      value: '--',
      subtitle: 'mins today',
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
      route: '/log?type=education',
    },
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
            {/* Notification dot — show when there are alerts */}
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Date */}
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
                {age !== null ? `${age} years old` : 'Age not set'} · Tracking active
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

        {/* Quick Log — Big CTA */}
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
          {stats.map((s) => (
            <StatCard key={s.key} item={s} />
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {hasChild && (
            <TouchableOpacity onPress={() => router.push('/log')}>
              <Text style={styles.sectionLink}>Log New →</Text>
            </TouchableOpacity>
          )}
        </View>
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
  // Child banner
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
  // Add child banner
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
  // Quick log
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
  // Sections
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
  // Stats
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
  statSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  // Empty state
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
  // AI banner
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
