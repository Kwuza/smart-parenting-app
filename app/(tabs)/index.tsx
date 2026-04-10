import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../stores/auth';
import { getActivitySummary } from '../../lib/api';

type TrendDir = 'up' | 'down' | 'neutral';

interface StatData {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subValue: string;
  trend: TrendDir;
  trendValue: string;
  color: string;
  bgColor: string;
}

function StatCard({ icon, label, value, subValue, trend, trendValue, color, bgColor }: StatData) {
  const TrendIcon =
    trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#94A3B8';

  return (
    <View style={[styles.statCard, { borderColor: '#E2E8F0' }]}>
      <View style={[styles.statIconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{subValue}</Text>
      <View style={styles.trendRow}>
        <Ionicons name={TrendIcon} size={14} color={trendColor} />
        <Text style={[styles.trendText, { color: trendColor }]}>{trendValue}</Text>
      </View>
    </View>
  );
}

function RecentActivityItem({
  time,
  activity,
  iconBg,
  iconColor,
  iconLetter,
}: {
  time: string;
  activity: string;
  iconBg: string;
  iconColor: string;
  iconLetter: string;
}) {
  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: iconBg }]}>
        <Text style={[styles.activityIconLetter, { color: iconColor }]}>{iconLetter}</Text>
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>{activity}</Text>
        <Text style={styles.activityTime}>{time}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { selectedChild, children, loadChildren } = useApp();
  const router = useRouter();
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    loadChildren();
    setDateString(
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    );
  }, []);

  if (!selectedChild) {
    return (
      <View style={styles.empty}>
        <Ionicons name="child-outline" size={48} color="#94A3B8" />
        <Text style={styles.emptyTitle}>No children added yet</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/child/new')}
        >
          <Text style={styles.emptyButtonText}>Add Child Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate age from DOB
  const age = selectedChild.date_of_birth
    ? Math.floor(
        (Date.now() - new Date(selectedChild.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  // Sample data (would come from getActivitySummary in production)
  const stats: StatData[] = [
    {
      icon: 'phone-portrait-outline',
      label: 'Screen Time',
      value: '2h 45m',
      subValue: 'Today',
      trend: 'down',
      trendValue: '15% less than yesterday',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
    },
    {
      icon: 'moon-outline',
      label: 'Sleep',
      value: '9h',
      subValue: 'Last night',
      trend: 'up',
      trendValue: '1h more than avg',
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      icon: 'restaurant-outline',
      label: 'Meals',
      value: '2/3',
      subValue: 'Tracked today',
      trend: 'neutral',
      trendValue: 'On track',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
    {
      icon: 'school-outline',
      label: 'Education',
      value: '45m',
      subValue: 'Learning time',
      trend: 'up',
      trendValue: '20% more this week',
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {selectedChild.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <TouchableOpacity style={styles.nameRow}>
                <Text style={styles.childName}>{selectedChild.name}</Text>
                <Ionicons name="chevron-down" size={16} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={styles.childAge}>
                {age !== null ? `${age} years old` : 'Age not set'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={22} color="#0F172A" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Date */}
        <Text style={styles.date}>{dateString}</Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </View>

        {/* AI Recommendations Banner */}
        <TouchableOpacity style={styles.aiBanner} activeOpacity={0.9}>
          <View style={styles.aiBannerIcon}>
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.aiBannerContent}>
            <Text style={styles.aiBannerTitle}>AI Recommendations</Text>
            <Text style={styles.aiBannerText} numberOfLines={2}>
              Based on {selectedChild.name}'s sleep patterns, consider an earlier bedtime tonight for better rest.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            <RecentActivityItem
              time="3:30 PM"
              activity="Completed math lesson"
              iconBg="#F5F3FF"
              iconColor="#8B5CF6"
              iconLetter="E"
            />
            <RecentActivityItem
              time="2:00 PM"
              activity="Lunch tracked"
              iconBg="#FFFBEB"
              iconColor="#F59E0B"
              iconLetter="M"
            />
            <RecentActivityItem
              time="12:15 PM"
              activity="30 min educational video"
              iconBg="#EFF6FF"
              iconColor="#3B82F6"
              iconLetter="S"
            />
          </View>
        </View>
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
    paddingBottom: 100,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3B82F6',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  childAge: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  date: {
    fontSize: 13,
    color: '#94A3B8',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
    paddingTop: 4,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconContainer: {
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
  statSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  aiBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiBannerContent: {
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aiBannerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    lineHeight: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconLetter: {
    fontSize: 12,
    fontWeight: '700',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  activityTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
