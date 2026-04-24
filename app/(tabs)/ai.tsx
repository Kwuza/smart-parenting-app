import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../stores/auth';
import { getRecommendations, analyzeChild, getActivities, Recommendation } from '../../lib/api';
import { useFocusEffect, useRouter } from 'expo-router';
import ScreenHeader from '../../components/ScreenHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FilterValue = 'all' | 'sleep' | 'meal' | 'education' | 'screen_time' | 'high' | 'medium' | 'low' | 'risk' | 'opportunity' | 'follow_up' | 'positive';

const FILTERS: { key: FilterValue; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'meal', label: 'Meals' },
  { key: 'education', label: 'Education' },
  { key: 'screen_time', label: 'Screen' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'risk', label: 'Risk' },
  { key: 'opportunity', label: 'Opportunity' },
  { key: 'follow_up', label: 'Follow-up' },
  { key: 'positive', label: 'Positive' },
];

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};
const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  sleep: { color: '#10B981', bg: '#ECFDF5' },
  meal: { color: '#F59E0B', bg: '#FFFBEB' },
  education: { color: '#8B5CF6', bg: '#F5F3FF' },
  screen_time: { color: '#FF7F60', bg: '#FFF0ED' },
  general: { color: '#64748B', bg: '#F1F5F9' },
};
const INSIGHT_TYPE_COLORS: Record<string, { color: string; bg: string; icon: string }> = {
  risk: { color: '#EF4444', bg: '#FEF2F2', icon: 'warning' },
  opportunity: { color: '#F59E0B', bg: '#FFFBEB', icon: 'bulb' },
  follow_up: { color: '#3B82F6', bg: '#EFF6FF', icon: 'reload' },
  positive: { color: '#10B981', bg: '#ECFDF5', icon: 'checkmark-circle' },
};
const TREND_COLORS: Record<string, string> = {
  worsening: '#EF4444',
  stable: '#94A3B8',
  improving: '#10B981',
};
const TREND_ARROWS: Record<string, string> = {
  worsening: '↑',
  stable: '→',
  improving: '↓',
};

function FilterBar({
  active,
  onChange,
}: {
  active: FilterValue;
  onChange: (v: FilterValue) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScroll}
    >
      {FILTERS.map((f) => {
        const isActive = active === f.key;
        return (
          <TouchableOpacity
            key={f.key}
            onPress={() => onChange(f.key)}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function SummaryStrip({ recommendations }: { recommendations: Recommendation[] }) {
  const high = recommendations.filter((r) => r.priority === 'high').length;
  const medium = recommendations.filter((r) => r.priority === 'medium').length;
  const low = recommendations.filter((r) => r.priority === 'low').length;

  return (
    <View style={styles.summaryStrip}>
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryCount, { color: '#EF4444' }]}>{high}</Text>
        <Text style={styles.summaryLabel}>High</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryCount, { color: '#F59E0B' }]}>{medium}</Text>
        <Text style={styles.summaryLabel}>Medium</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryCount, { color: '#10B981' }]}>{low}</Text>
        <Text style={styles.summaryLabel}>Low</Text>
      </View>
    </View>
  );
}

function InsightTypeBadge({ insightType }: { insightType: string }) {
  const config = INSIGHT_TYPE_COLORS[insightType] || INSIGHT_TYPE_COLORS.positive;
  return (
    <View style={[styles.insightBadge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon as any} size={10} color={config.color} />
      <Text style={[styles.insightText, { color: config.color }]}>
        {insightType.replace('_', ' ')}
      </Text>
    </View>
  );
}

function TrendIndicator({ trend }: { trend: string | null | undefined }) {
  if (!trend) return null;
  const color = TREND_COLORS[trend] || TREND_COLORS.stable;
  const arrow = TREND_ARROWS[trend] || '';
  return (
    <Text style={[styles.trendArrow, { color }]}>{arrow}</Text>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const catColors = CATEGORY_COLORS[rec.category || 'general'] || CATEGORY_COLORS.general;
  const priorityColor = PRIORITY_COLORS[rec.priority || 'low'] || PRIORITY_COLORS.low;

  return (
    <View style={styles.recCard}>
      <View style={styles.recHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: catColors.bg }]}>
          <Text style={[styles.categoryText, { color: catColors.color }]}>
            {(rec.category || 'General').replace('_', ' ')}
          </Text>
        </View>
        <View style={styles.recHeaderRight}>
          {rec.insight_type && <InsightTypeBadge insightType={rec.insight_type} />}
          <TrendIndicator trend={rec.trend} />
          <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}15` }]}>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {(rec.priority || 'low').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.recContent}>{rec.content}</Text>
    </View>
  );
}

interface AnalysisSummary {
  confidence: 'high' | 'medium' | 'low';
  data_days: number;
  flags: string[];
}

export default function AIScreen() {
  const { selectedChild, children } = useApp();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [hasActivityData, setHasActivityData] = useState(false);

  const getAnalysisKey = (childId: string) => `last_analysis_${childId}`;

  const checkRateLimit = useCallback(async (childId: string) => {
    try {
      const key = getAnalysisKey(childId);
      const stored = await AsyncStorage.getItem(key);
      if (!stored) { setRateLimited(false); return; }
      const lastDate = new Date(stored);
      const now = new Date();
      const sameDay = lastDate.getFullYear() === now.getFullYear() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getDate() === now.getDate();
      setRateLimited(sameDay);
    } catch {
      setRateLimited(false);
    }
  }, []);

  const markAnalysisRun = async (childId: string) => {
    try {
      await AsyncStorage.setItem(getAnalysisKey(childId), new Date().toISOString());
      setRateLimited(true);
    } catch {
      // non-critical
    }
  };

  useFocusEffect(
    useCallback(() => {
      const cid = useApp.getState().selectedChild?.id;
      if (cid) {
        setLoading(true);
        setError('');
        checkRateLimit(cid);
        Promise.all([
          getRecommendations(cid),
          getActivities(cid),
        ])
          .then(([data, activities]) => {
            setRecommendations(data);
            setHasActivityData(activities.length > 0);
            if (data.length > 0) setLastRun(new Date());
          })
          .catch(() => setError('Failed to load recommendations. Pull down to refresh.'))
          .finally(() => setLoading(false));
      }
    }, [selectedChild?.id, checkRateLimit])
  );

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  };

  const handleAnalyze = async () => {
    const child = useApp.getState().selectedChild;
    if (!child) return;
    if (rateLimited || !hasActivityData) return;

    if (recommendations.length > 0 && isToday(recommendations[0].created_at)) {
      setLastRun(new Date(recommendations[0].created_at));
      return;
    }

    setAnalyzing(true);
    setError('');
    try {
      const result = await analyzeChild(child.id);
      if (result.summary) {
        setAnalysisSummary(result.summary);
      }
      const fresh = await getRecommendations(child.id);
      setRecommendations(fresh);
      setLastRun(new Date());
      await markAnalysisRun(child.id);
    } catch (err) {
      if (__DEV__) console.error('Analysis failed:', err);
      setError('Analysis failed. Pull down to try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const filtered = useMemo(() => {
    let base = recommendations;
    if (activeFilter === 'all') {
      return [...base].sort(
        (a, b) => (PRIORITY_ORDER[a.priority || 'low'] || 2) - (PRIORITY_ORDER[b.priority || 'low'] || 2)
      );
    }
    if (['high', 'medium', 'low'].includes(activeFilter)) {
      base = recommendations.filter((r) => r.priority === activeFilter);
    } else if (['risk', 'opportunity', 'follow_up', 'positive'].includes(activeFilter)) {
      base = recommendations.filter((r) => r.insight_type === activeFilter);
    } else {
      base = recommendations.filter((r) => r.category === activeFilter);
    }
    return [...base].sort(
      (a, b) => (PRIORITY_ORDER[a.priority || 'low'] || 2) - (PRIORITY_ORDER[b.priority || 'low'] || 2)
    );
  }, [recommendations, activeFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      const cid = useApp.getState().selectedChild?.id;
      if (cid) {
        const data = await getRecommendations(cid);
        setRecommendations(data);
        if (data.length > 0) setLastRun(new Date());
      }
    } catch {
      setError('Failed to refresh. Pull down to try again.');
    } finally {
      setRefreshing(false);
    }
  };

  if (!selectedChild) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bulb-outline" size={48} color="#94A3B8" />
        <Text style={styles.emptyText}>
          {children.length === 0 ? 'Add a child to get AI insights' : 'Select a child first'}
        </Text>
        {children.length === 0 && (
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => router.push('/child/wizard')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.emptyCtaText}>Add Child</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const lastRunText = lastRun
    ? `Last run ${lastRun.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : 'Not run yet';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="AI Insights"
        icon="sparkles"
        subtitle={lastRun ? `Last run ${lastRun.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'Not run yet'}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF7F60" />
        }
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError('')} hitSlop={8}>
              <Ionicons name="close" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleAnalyze}
          disabled={analyzing || rateLimited || !hasActivityData}
          activeOpacity={0.85}
          style={[styles.analyzeButton, (analyzing || rateLimited || !hasActivityData) && styles.analyzeButtonDisabled]}
        >
          <Ionicons
            name={!hasActivityData ? 'warning' : rateLimited ? 'checkmark-circle' : 'flash-outline'}
            size={18}
            color={!hasActivityData ? '#F59E0B' : rateLimited ? '#94A3B8' : '#FF7F60'}
          />
          <Text style={[styles.analyzeText, (rateLimited || !hasActivityData) && styles.analyzeTextDisabled]}>
            {analyzing ? 'Analyzing...' : rateLimited ? 'Analysis used today' : !hasActivityData ? 'Log activities first' : 'Run AI Analysis'}
          </Text>
          <Text style={styles.lastRunText}>{lastRunText}</Text>
        </TouchableOpacity>

        {recommendations.length > 0 && <SummaryStrip recommendations={recommendations} />}

        {analysisSummary?.confidence === 'low' && (
          <View style={styles.confidenceWarning}>
            <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
            <Text style={styles.confidenceWarningText}>
              Low confidence — limited data ({analysisSummary.data_days} days). Recommendations may be speculative.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <Text style={styles.sectionCount}>
              {filtered.length} of {recommendations.length}
            </Text>
          </View>
          <FilterBar active={activeFilter} onChange={setActiveFilter} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={28} color="#CBD5E1" />
            <Text style={styles.emptyCardText}>
              {recommendations.length === 0
                ? 'No recommendations yet. Log more activities and run AI analysis.'
                : 'No recommendations for this filter'}
            </Text>
          </View>
        ) : (
          <View style={styles.recList}>
            {filtered.map((rec, i) => (
              <RecommendationCard key={rec.id || i} rec={rec} />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFBF6',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94A3B8',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF7F60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E2E8F0',
  },
  analyzeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF7F60',
    flex: 1,
  },
  analyzeTextDisabled: {
    color: '#94A3B8',
  },
  lastRunText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFDFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  confidenceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  confidenceWarningText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    fontWeight: '500',
  },
  sectionHeader: {
    marginBottom: 12,
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionCount: {
    fontSize: 12,
    color: '#94A3B8',
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#FFF0ED',
    borderColor: '#FF7F60',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FF7F60',
  },
  recList: {
    gap: 10,
  },
  recCard: {
    backgroundColor: '#FFFDFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  recHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  insightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  insightText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  trendArrow: {
    fontSize: 12,
    fontWeight: '700',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  recContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDFF',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    padding: 32,
    marginTop: 16,
  },
  emptyCardText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
    fontWeight: '500',
  },
});