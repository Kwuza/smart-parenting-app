import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../stores/auth';
import { getRecommendations, analyzeChild, Recommendation } from '../../lib/api';
import { useFocusEffect } from 'expo-router';
import ScreenHeader from '../../components/ScreenHeader';

type FilterValue = 'all' | 'sleep' | 'meal' | 'education' | 'screen_time' | 'high' | 'medium' | 'low';

const FILTERS: { key: FilterValue; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'meal', label: 'Meals' },
  { key: 'education', label: 'Education' },
  { key: 'screen_time', label: 'Screen' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
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
        <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}15` }]}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={[styles.priorityText, { color: priorityColor }]}>
            {(rec.priority || 'low').toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.recContent}>{rec.content}</Text>
    </View>
  );
}

export default function AIScreen() {
  const { selectedChild } = useApp();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');

  // Load saved recommendations on focus
  useFocusEffect(
    useCallback(() => {
      const cid = useApp.getState().selectedChild?.id;
      if (cid) {
        setLoading(true);
        getRecommendations(cid)
          .then((data) => {
            setRecommendations(data);
            if (data.length > 0) setLastRun(new Date());
          })
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    }, [selectedChild?.id])
  );

  // Check if recommendations were generated today
  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  };

  // Call Edge Function — skip if already run today
  const handleAnalyze = async () => {
    const child = useApp.getState().selectedChild;
    if (!child) return;

    // Check if we already have today's recommendations (from DB via useFocusEffect)
    if (recommendations.length > 0 && isToday(recommendations[0].created_at)) {
      setLastRun(new Date(recommendations[0].created_at));
      return;
    }

    setAnalyzing(true);
    try {
      const result = await analyzeChild(child.id);
      // Reload from DB to get the persisted records
      const fresh = await getRecommendations(child.id);
      setRecommendations(fresh);
      setLastRun(new Date());
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const filtered = useMemo(() => {
    let base = activeFilter === 'all'
      ? recommendations
      : recommendations.filter(
          (r) =>
            r.priority === activeFilter ||
            r.category === activeFilter
        );
    return [...base].sort(
      (a, b) => (PRIORITY_ORDER[a.priority || 'low'] || 2) - (PRIORITY_ORDER[b.priority || 'low'] || 2)
    );
  }, [recommendations, activeFilter]);

  if (!selectedChild) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bulb-outline" size={48} color="#94A3B8" />
        <Text style={styles.emptyText}>Select a child first</Text>
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
      >
        {/* Run Analysis Button */}
        <TouchableOpacity
          onPress={handleAnalyze}
          disabled={analyzing}
          activeOpacity={0.85}
          style={styles.analyzeButton}
        >
          <Ionicons name="flash-outline" size={18} color="#FF7F60" />
          <Text style={styles.analyzeText}>
            {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
          </Text>
          <Text style={styles.lastRunText}>{lastRunText}</Text>
        </TouchableOpacity>

        {/* Summary Strip */}
        {recommendations.length > 0 && (
          <SummaryStrip recommendations={recommendations} />
        )}

        {/* Section + Filter */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <Text style={styles.sectionCount}>
              {filtered.length} of {recommendations.length}
            </Text>
          </View>
          <FilterBar active={activeFilter} onChange={setActiveFilter} />
        </View>

        {/* Cards */}
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
  analyzeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF7F60',
    flex: 1,
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
    marginBottom: 20,
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
});
