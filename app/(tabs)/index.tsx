import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../stores/auth';

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
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{subValue}</Text>
      {trendValue ? (
        <View style={styles.trendRow}>
          <Ionicons name={TrendIcon} size={14} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>{trendValue}</Text>
        </View>
      ) : null}
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

  const hasChild = !!selectedChild;
  const childName = selectedChild?.name || 'Your Child';

  const age = selectedChild?.date_of_birth
    ? Math.floor(
        (Date.now() - new Date(selectedChild.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  const stats: StatData[] = [
    {
      icon: 'phone-portrait-outline',
      label: 'Screen Time',
      value: hasChild ? '--' : '--',
      subValue: 'Today',
      trend: 'neutral',
      trendValue: '',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
    },
    {
      icon: 'moon-outline',
      label: 'Sleep',
      value: hasChild ? '--' : '--',
      subValue: 'Last night',
      trend: 'neutral',
      trendValue: '',
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      icon: 'restaurant-outline',
      label: 'Meals',
      value: hasChild ? '--/--' : '--/--',
      subValue: 'Tracked today',
      trend: 'neutral',
      trendValue: '',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
    {
      icon: 'school-outline',
      label: 'Education',
      value: hasChild ? '--' : '--',
      subValue: 'Learning time',
      trend: 'neutral',
      trendValue: '',
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
                {hasChild ? childName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View>
              <TouchableOpacity
                style={styles.nameRow}
                onPress={() => {
                  if (!hasChild) router.push('/child/new');
                }}
              >
                <Text style={styles.childName}>
                  {hasChild ? childName : 'Add a child'}
                </Text>
                <Ionicons
                  name={hasChild ? 'chevron-down' : 'add-circle-outline'}
                  size={16}
                  color="#94A3B8"
                />
              </TouchableOpacity>
              <Text style={styles.childAge}>
                {hasChild && age !== null
                  ? `${age} years old`
                  : hasChild
                    ? 'Age not set'
                    : 'Tap to create a profile'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={22} color="#0F172A" />
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
        <TouchableOpacity
          style={styles.aiBanner}
          activeOpacity={0.9}
          onPress={() => router.push('/ai')}
        >
          <View style={styles.aiBannerIcon}>
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.aiBannerContent}>
            <Text style={styles.aiBannerTitle}>AI Recommendations</Text>
            <Text style={styles.aiBannerText} numberOfLines={2}>
              {hasChild
                ? `Log activities for ${childName} to get personalized insights.`
                : 'Add a child profile and log activities to unlock AI insights.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.emptyActivity}>
            <Ionicons name="time-outline" size={28} color="#CBD5E1" />
            <Text style={styles.emptyActivityText}>
              {hasChild
                ? 'No activities logged yet'
                : 'Activities will appear here'}
            </Text>
            {hasChild && (
              <TouchableOpacity
                style={styles.emptyActivityBtn}
                onPress={() => router.push('/log')}
              >
                <Text style={styles.emptyActivityBtnText}>Log Activity</Text>
              </TouchableOpacity>
            )}
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
    borderColor: '#E2E8F0',
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
  emptyActivity: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    padding: 28,
  },
  emptyActivityText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  emptyActivityBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyActivityBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
});
