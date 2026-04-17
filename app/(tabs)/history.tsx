import { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../../stores/auth';
import { getActivities, Activity } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';

// --- Types ---

interface TypeConfig {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const ACTIVITY_TYPES: TypeConfig[] = [
  { key: 'screen_time', label: 'Screen', icon: 'phone-portrait-outline', color: '#FF7F60', bgColor: '#FFF0ED' },
  { key: 'sleep', label: 'Sleep', icon: 'moon-outline', color: '#10B981', bgColor: '#ECFDF5' },
  { key: 'nap', label: 'Nap', icon: 'bed-outline', color: '#8B5CF6', bgColor: '#F5F3FF' },
  { key: 'meal', label: 'Meals', icon: 'restaurant-outline', color: '#F59E0B', bgColor: '#FFFBEB' },
  { key: 'physical_activity', label: 'Active', icon: 'fitness-outline', color: '#EF4444', bgColor: '#FEF2F2' },
  { key: 'education', label: 'Learn', icon: 'school-outline', color: '#6366F1', bgColor: '#EEF2FF' },
];

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  ...ACTIVITY_TYPES.map(t => ({ key: t.key, label: t.label })),
];

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// --- Helpers ---

function getTypeConfig(key: string): TypeConfig | undefined {
  return ACTIVITY_TYPES.find(t => t.key === key);
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getActivityLabel(type: string, value: Record<string, any>): string {
  const h = value.hours || 0;
  const m = value.minutes || 0;
  const dur = h > 0 ? `${h}h ${m}m` : `${m}m`;

  switch (type) {
    case 'screen_time':
      return `Screen time (${value.category || 'leisure'}) — ${dur}${value.device ? ` on ${value.device}` : ''}`;
    case 'sleep':
      return `Sleep — ${dur}${value.quality ? ` (${value.quality})` : ''}`;
    case 'nap':
      return `Nap — ${dur}${value.quality ? ` (${value.quality})` : ''}`;
    case 'meal': {
      const meal = value.meal_type || 'meal';
      const foods = value.food_groups?.length ? ` · ${value.food_groups.join(', ')}` : '';
      return `${meal.charAt(0).toUpperCase() + meal.slice(1)}${value.quality ? ` — ${value.quality}` : ''}${foods}`;
    }
    case 'physical_activity':
      return `Physical — ${dur}${value.activity ? ` (${value.activity})` : ''}`;
    case 'education':
      return `Learning — ${dur}${value.subject ? ` (${value.subject.replace('_', ' ')})` : ''}`;
    default:
      return type;
  }
}

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface CalendarDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasActivities: boolean;
}

function buildCalendarGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = firstOfMonth.getDay(); // 0=Sunday

  const today = new Date();
  const days: CalendarDay[] = [];

  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const date = new Date(year, month - 1, d);
    days.push({
      date,
      dayNum: d,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isSelected: false,
      hasActivities: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    days.push({
      date,
      dayNum: d,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isSelected: false,
      hasActivities: false,
    });
  }

  // Next month padding — fill to complete rows (6 rows × 7 = 42 cells)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    days.push({
      date,
      dayNum: d,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isSelected: false,
      hasActivities: false,
    });
  }

  return days;
}

// --- Component ---

export default function HistoryScreen() {
  const { selectedChild, children } = useApp();

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  // Data state
  const [monthActivities, setMonthActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Load all activities for the current child (we filter by month/date client-side)
  const loadActivities = useCallback(async () => {
    if (!selectedChild) return;
    try {
      setError('');
      setLoading(true);
      const data = await getActivities(selectedChild.id);
      setMonthActivities(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [loadActivities])
  );

  // Build set of dates that have activities (for calendar dots)
  const activityDateKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const a of monthActivities) {
      keys.add(a.recorded_at.split('T')[0]);
    }
    return keys;
  }, [monthActivities]);

  // Filter activities for selected date
  const selectedDayActivities = useMemo(() => {
    const selKey = getDateKey(selectedDate);
    let filtered = monthActivities.filter(a => a.recorded_at.startsWith(selKey));
    if (activeFilter !== 'all') {
      filtered = filtered.filter(a => a.type === activeFilter);
    }
    // Sort newest first within the day
    filtered.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    return filtered;
  }, [monthActivities, selectedDate, activeFilter]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const grid = buildCalendarGrid(viewYear, viewMonth);
    const selKey = getDateKey(selectedDate);
    return grid.map(day => ({
      ...day,
      isSelected: getDateKey(day.date) === selKey,
      hasActivities: activityDateKeys.has(getDateKey(day.date)),
    }));
  }, [viewYear, viewMonth, selectedDate, activityDateKeys]);

  // Navigation
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(now);
  };

  // --- Renderers ---

  const renderHeader = () => (
    <ScreenHeader
      title="History"
      icon="time-outline"
      subtitle={selectedChild ? formatDateHeader(selectedDate) : undefined}
    />
  );

  const renderCalendar = () => {
    const isCurrentMonth =
      viewYear === today.getFullYear() && viewMonth === today.getMonth();

    return (
      <View style={styles.calendarContainer}>
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.monthArrow} activeOpacity={0.6}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.monthTitle}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>

          <View style={styles.monthNavRight}>
            {!isCurrentMonth && (
              <TouchableOpacity onPress={goToToday} style={styles.todayBtn} activeOpacity={0.7}>
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={goToNextMonth} style={styles.monthArrow} activeOpacity={0.6}>
              <Ionicons name="chevron-forward" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Day-of-week headers */}
        <View style={styles.dayNamesRow}>
          {DAY_NAMES.map((name, i) => (
            <View key={i} style={styles.dayNameCell}>
              <Text style={[styles.dayNameText, i === 0 && styles.dayNameSunday]}>{name}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid — 6 rows × 7 columns */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, idx) => {
            const cellStyle = [
              styles.dayCell,
              !day.isCurrentMonth && styles.dayCellOutside,
              day.isSelected && styles.dayCellSelected,
              day.isToday && !day.isSelected && styles.dayCellToday,
            ];

            const textStyle = [
              styles.dayText,
              !day.isCurrentMonth && styles.dayTextOutside,
              day.isSelected && styles.dayTextSelected,
              day.isToday && !day.isSelected && styles.dayTextToday,
            ];

            return (
              <TouchableOpacity
                key={idx}
                style={cellStyle}
                onPress={() => setSelectedDate(day.date)}
                activeOpacity={0.6}
              >
                <Text style={textStyle}>{day.dayNum}</Text>
                {day.hasActivities && (
                  <View
                    style={[
                      styles.activityDot,
                      day.isSelected && styles.activityDotSelected,
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFilterBar = () => (
    <View style={styles.filterWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {FILTER_OPTIONS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterPill,
              activeFilter === f.key && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === f.key && styles.filterPillTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderActivityItem = ({ item }: { item: Activity }) => {
    const config = getTypeConfig(item.type);
    const value = item.value as Record<string, any>;

    return (
      <View style={styles.activityCard}>
        <View style={[styles.activityIcon, { backgroundColor: config?.bgColor || '#F1F5F9' }]}>
          <Ionicons
            name={config?.icon || 'ellipse-outline'}
            size={18}
            color={config?.color || '#64748B'}
          />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityLabel} numberOfLines={2}>
            {getActivityLabel(item.type, value)}
          </Text>
        </View>
        <Text style={styles.activityTime}>{formatTime(item.recorded_at)}</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No activities this day</Text>
      <Text style={styles.emptySubtitle}>
        Tap the Log tab to record an{'\n'}activity for this date
      </Text>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color="#FF7F60" />
      <Text style={styles.loadingText}>Loading…</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerState}>
      <View style={styles.errorIconCircle}>
        <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
      </View>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={loadActivities} activeOpacity={0.7}>
        <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // --- Main render ---

  const content = selectedChild ? (
    loading ? (
      renderLoading()
    ) : error ? (
      renderError()
    ) : (
      <FlatList
        data={selectedDayActivities}
        keyExtractor={(item) => item.id}
        renderItem={renderActivityItem}
        ListHeaderComponent={
          <>
            {renderCalendar()}
            {renderFilterBar()}
            {selectedDayActivities.length > 0 && (
              <View style={styles.daySectionHeader}>
                <Text style={styles.daySectionText}>
                  {selectedDayActivities.length}{' '}
                  {selectedDayActivities.length === 1 ? 'activity' : 'activities'}
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    )
  ) : (
    renderEmpty()
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {content}
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFBF6',
  },

  // Calendar
  calendarContainer: {
    backgroundColor: '#FFFDFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  monthNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFF0ED',
    marginRight: 4,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF7F60',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  dayNameSunday: {
    color: '#EF4444',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 2,
  },
  dayCellOutside: {
    opacity: 0.3,
  },
  dayCellSelected: {
    backgroundColor: '#FF7F60',
    borderColor: '#FF7F60',
  },
  dayCellToday: {
    borderColor: '#FF7F60',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  dayTextOutside: {
    color: '#94A3B8',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#FF7F60',
    fontWeight: '700',
  },
  activityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FF7F60',
  },
  activityDotSelected: {
    backgroundColor: '#FFFFFF',
  },

  // Filter bar
  filterWrapper: {
    backgroundColor: '#FFFDFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
  },
  filterBar: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#FF7F60',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  // Day section header
  daySectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  daySectionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },

  // Activity cards
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFDFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    flexShrink: 0,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Loading / Error states
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF7F60',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

});
