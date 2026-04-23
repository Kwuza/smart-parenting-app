import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, FlatList, Modal, TextInput as RNTextInput } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp, useAuth } from '../../stores/auth';
import { cancelScheduledActivityNotifications, scheduleScheduledActivityNotifications } from '../../lib/notifications';
import { getTodayActivities, getScheduledActivities, logActivity, deleteScheduledActivity, updateScheduledActivity, Activity, ActivityType, ScheduledActivity } from '../../lib/api';

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

function UpcomingItem({
  scheduled,
  onLogConfirm,
  onUpdate,
  onCancel,
}: {
  scheduled: ScheduledActivity;
  onLogConfirm: (s: ScheduledActivity) => void;
  onUpdate: (s: ScheduledActivity) => void;
  onCancel: (id: string) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const typeConfig: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
    screen_time: { color: '#FF7F60', bg: '#FFF0ED', icon: 'phone-portrait-outline', label: 'Screen' },
    sleep: { color: '#10B981', bg: '#ECFDF5', icon: 'moon-outline', label: 'Sleep' },
    nap: { color: '#8B5CF6', bg: '#F5F3FF', icon: 'bed-outline', label: 'Nap' },
    meal: { color: '#F59E0B', bg: '#FFFBEB', icon: 'restaurant-outline', label: 'Meal' },
    physical_activity: { color: '#EF4444', bg: '#FEF2F2', icon: 'fitness-outline', label: 'Active' },
    education: { color: '#6366F1', bg: '#EEF2FF', icon: 'school-outline', label: 'Learn' },
  };
  const config = typeConfig[scheduled.type] || typeConfig.screen_time;

  const start = new Date(scheduled.start_time);
  const end = scheduled.planned_end_time ? new Date(scheduled.planned_end_time) : null;
  const now = new Date();

  // Can only log if the scheduled time is currently ongoing or has passed
  const hasStarted = now >= start;

  const isTodayCheck = () => {
    return start.getDate() === now.getDate() && start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
  };

  const dateLabel = isTodayCheck()
    ? 'Today'
    : start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const timeLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const endTime = scheduled.planned_end_time
    ? new Date(scheduled.planned_end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;
  const showEndTime = !!end && end.getTime() !== start.getTime();

  const duration = scheduled.max_duration_minutes
    ? `${Math.floor(scheduled.max_duration_minutes / 60)}h ${scheduled.max_duration_minutes % 60}m`
    : null;

  return (
    <View style={styles.upcomingItem}>
      <View style={styles.upcomingTopRow}>
        <View style={[styles.upcomingIcon, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={18} color={config.color} />
        </View>
        <View style={styles.upcomingContent}>
          <View style={styles.upcomingRow}>
            <Text style={styles.upcomingLabel}>{config.label}</Text>
            <View style={[styles.upcomingBadge, { backgroundColor: config.bg }]}>
              <Text style={[styles.upcomingBadgeText, { color: config.color }]}>{dateLabel}</Text>
            </View>
            {!hasStarted && (
              <View style={[styles.upcomingBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.upcomingBadgeText, { color: '#D97706', fontWeight: '600', fontSize: 10 }]}>⏳ Upcoming</Text>
              </View>
            )}
          </View>
          <Text style={styles.upcomingTime}>
            {timeLabel}
            {showEndTime ? ` → ${endTime}` : ''}
            {duration ? ` · up to ${duration}` : ''}
          </Text>
          {scheduled.category && (
            <Text style={styles.upcomingMeta}>{scheduled.category}</Text>
          )}
          {scheduled.meal_type && (
            <Text style={styles.upcomingMeta}>{scheduled.meal_type}</Text>
          )}
          {scheduled.food_groups && scheduled.food_groups.length > 0 && (
            <Text style={styles.upcomingMeta}>{scheduled.food_groups.join(', ')}</Text>
          )}
        </View>
      </View>

      {/* Inline cancel confirmation */}
      {showConfirm ? (
        <View style={styles.confirmRow}>
          <Text style={styles.confirmText}>Delete this schedule permanently?</Text>
          <View style={styles.confirmBtnRow}>
            <TouchableOpacity
              style={styles.confirmBtnNo}
              onPress={() => setShowConfirm(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnNoText}>Keep</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtnYes}
              onPress={() => {
                setShowConfirm(false);
                onCancel(scheduled.id);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnYesText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Action buttons — Log only available when scheduled time has started */
        <View style={styles.actionRow}>
          {hasStarted ? (
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => onLogConfirm(scheduled)}
            >
              <Ionicons name="create-outline" size={14} color="#FF7F60" />
              <Text style={styles.actionBtnText}>Log</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => onUpdate(scheduled)}
          >
            <Ionicons name="refresh-outline" size={14} color="#8B5CF6" />
            <Text style={[styles.actionBtnText, { color: '#8B5CF6' }]}>Update</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => setShowConfirm(true)}
          >
            <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function UpdateScheduleModal({
  visible,
  scheduled,
  onClose,
  onSave,
}: {
  visible: boolean;
  scheduled: ScheduledActivity | null;
  onClose: () => void;
  onSave: (id: string, updates: any) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState(scheduled?.type || 'screen_time');
  const [category, setCategory] = useState(scheduled?.category || 'leisure');
  const [mealType, setMealType] = useState(scheduled?.meal_type || 'lunch');
  const [foodGroups, setFoodGroups] = useState<string[]>([]);

  const defaultCategoryForType = (activityType: string) => {
    switch (activityType) {
      case 'screen_time':
        return 'leisure';
      case 'physical_activity':
        return 'other';
      case 'education':
        return 'reading';
      default:
        return '';
    }
  };

  const getCategoryOptions = (activityType: string) => {
    switch (activityType) {
      case 'screen_time':
        return SCREEN_CATEGORIES;
      case 'physical_activity':
        return PHYSICAL_CATEGORIES;
      case 'education':
        return EDUCATION_CATEGORIES;
      default:
        return [];
    }
  };

  // Parse time helpers
  const to12h = (d: Date) => {
    let h = d.getHours();
    const m = d.getMinutes();
    const p = (h >= 12 ? 'PM' : 'AM') as 'AM' | 'PM';
    h = h % 12 || 12;
    return { h: String(h), m: String(m).padStart(2, '0'), p };
  };

  const from12h = (h: string, m: string, p: 'AM' | 'PM') => {
    let hh = parseInt(h) || 0;
    if (p === 'PM' && hh !== 12) hh += 12;
    if (p === 'AM' && hh === 12) hh = 0;
    return { hh, mm: parseInt(m) || 0 };
  };

  const toDurationParts = (totalMinutes: number | null | undefined) => {
    const mins = totalMinutes || 0;
    return {
      h: String(Math.floor(mins / 60)),
      m: String(mins % 60).padStart(2, '0'),
    };
  };

  const start = scheduled ? new Date(scheduled.start_time) : new Date();
  const s12 = to12h(start);
  const minParts = toDurationParts(scheduled?.min_duration_minutes);
  const maxParts = toDurationParts(scheduled?.max_duration_minutes);

  const [startH, setStartH] = useState(s12.h);
  const [startM, setStartM] = useState(s12.m);
  const [startP, setStartP] = useState<'AM' | 'PM'>(s12.p);
  const [minDurationH, setMinDurationH] = useState(minParts.h);
  const [minDurationM, setMinDurationM] = useState(minParts.m);
  const [maxDurationH, setMaxDurationH] = useState(maxParts.h);
  const [maxDurationM, setMaxDurationM] = useState(maxParts.m);

  // Reset when scheduled changes
  useEffect(() => {
    if (scheduled) {
      setType(scheduled.type);
      setCategory(scheduled.category || defaultCategoryForType(scheduled.type));
      setMealType(scheduled.meal_type || 'lunch');
      setFoodGroups(scheduled.food_groups || []);
      const s = new Date(scheduled.start_time);
      const s12n = to12h(s);
      const minNext = toDurationParts(scheduled.min_duration_minutes);
      const maxNext = toDurationParts(scheduled.max_duration_minutes);
      setStartH(s12n.h);
      setStartM(s12n.m);
      setStartP(s12n.p);
      setMinDurationH(minNext.h);
      setMinDurationM(minNext.m);
      setMaxDurationH(maxNext.h);
      setMaxDurationM(maxNext.m);
    }
  }, [scheduled?.id]);

  const mealOptions = [
    { key: 'breakfast', label: 'Breakfast', color: '#F59E0B', bg: '#FFFBEB' },
    { key: 'lunch', label: 'Lunch', color: '#F59E0B', bg: '#FFFBEB' },
    { key: 'dinner', label: 'Dinner', color: '#F59E0B', bg: '#FFFBEB' },
    { key: 'snack', label: 'Snack', color: '#F59E0B', bg: '#FFFBEB' },
  ];

  const typeOptions = [
    { key: 'screen_time', label: 'Screen', color: '#FF7F60', bg: '#FFF0ED' },
    { key: 'sleep', label: 'Sleep', color: '#10B981', bg: '#ECFDF5' },
    { key: 'nap', label: 'Nap', color: '#8B5CF6', bg: '#F5F3FF' },
    { key: 'meal', label: 'Meal', color: '#F59E0B', bg: '#FFFBEB' },
    { key: 'physical_activity', label: 'Active', color: '#EF4444', bg: '#FEF2F2' },
    { key: 'education', label: 'Learn', color: '#6366F1', bg: '#EEF2FF' },
  ];
  const selectedTypeOption = typeOptions.find((t) => t.key === type) || typeOptions[0];

  const handleSave = async () => {
    if (!scheduled) return;
    setSaving(true);
    try {
      const s = from12h(startH, startM, startP);
      const baseDate = new Date(scheduled.start_time);
      const newStart = new Date(baseDate);
      newStart.setHours(s.hh, s.mm, 0, 0);

      const isMealSchedule = type === 'meal';
      const minDurationMinutes = isMealSchedule
        ? null
        : (parseInt(minDurationH) || 0) * 60 + (parseInt(minDurationM) || 0);
      const maxDurationMinutes = isMealSchedule
        ? null
        : (parseInt(maxDurationH) || 0) * 60 + (parseInt(maxDurationM) || 0);

      if (!isMealSchedule) {
        if ((minDurationMinutes || 0) > (maxDurationMinutes || 0)) {
          throw new Error('Minimum duration cannot exceed maximum duration');
        }
        if ((maxDurationMinutes || 0) === 0) {
          throw new Error('Maximum duration must be greater than 0');
        }
      }

      const plannedEnd = isMealSchedule
        ? new Date(newStart)
        : new Date(newStart.getTime() + (maxDurationMinutes || 0) * 60000);

      await onSave(scheduled.id, {
        type,
        start_time: newStart.toISOString(),
        planned_end_time: plannedEnd.toISOString(),
        min_duration_minutes: minDurationMinutes,
        max_duration_minutes: maxDurationMinutes,
        category: type === 'screen_time' || type === 'physical_activity' || type === 'education'
          ? (category || defaultCategoryForType(type) || null)
          : null,
        meal_type: type === 'meal' ? (mealType || 'lunch') : null,
        food_groups: type === 'meal' ? (foodGroups.length ? foodGroups : null) : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const TimeField = ({
    label,
    hour,
    minute,
    period,
    onHour,
    onMinute,
    onPeriod,
  }: {
    label: string;
    hour: string;
    minute: string;
    period: 'AM' | 'PM';
    onHour: (v: string) => void;
    onMinute: (v: string) => void;
    onPeriod: (v: 'AM' | 'PM') => void;
  }) => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <View style={styles.modalTimeFieldRow}>
        <View style={styles.modalCompactRow}>
          <View style={styles.modalDigitCol}>
            <TouchableOpacity
              style={styles.modalStepper}
              onPress={() => onHour(String(Math.min(12, (parseInt(hour) || 0) + 1)))}
              activeOpacity={0.6}
            >
              <Ionicons name="add" size={16} color="#FF7F60" />
            </TouchableOpacity>
            <RNTextInput
              value={hour}
              onChangeText={(t) => { const n = Math.min(12, Math.max(1, parseInt(t.replace(/[^0-9]/g, '')) || 0)); onHour(String(n)); }}
              keyboardType="numeric"
              style={styles.modalTimeInput}
              maxLength={2}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.modalStepper}
              onPress={() => onHour(String(Math.max(1, (parseInt(hour) || 0) - 1)))}
              activeOpacity={0.6}
            >
              <Ionicons name="remove" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalTimeColon}>:</Text>
          <View style={styles.modalDigitCol}>
            <TouchableOpacity
              style={styles.modalStepper}
              onPress={() => onMinute(String(Math.min(59, (parseInt(minute) || 0) + 5)))}
              activeOpacity={0.6}
            >
              <Ionicons name="add" size={16} color="#FF7F60" />
            </TouchableOpacity>
            <RNTextInput
              value={minute}
              onChangeText={(t) => { const n = Math.min(59, Math.max(0, parseInt(t.replace(/[^0-9]/g, '')) || 0)); onMinute(String(n).padStart(2, '0')); }}
              keyboardType="numeric"
              style={styles.modalTimeInput}
              maxLength={2}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.modalStepper}
              onPress={() => onMinute(String(Math.max(0, (parseInt(minute) || 0) - 5)))}
              activeOpacity={0.6}
            >
              <Ionicons name="remove" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.modalPeriodStack}>
          <TouchableOpacity
            style={[styles.modalPeriodBtn, period === 'AM' && styles.modalPeriodActive]}
            onPress={() => onPeriod('AM')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modalPeriodText, period === 'AM' && styles.modalPeriodTextActive]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalPeriodBtn, period === 'PM' && styles.modalPeriodActive]}
            onPress={() => onPeriod('PM')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modalPeriodText, period === 'PM' && styles.modalPeriodTextActive]}>PM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const DurationField = ({
    label,
    hour,
    minute,
    onHour,
    onMinute,
  }: {
    label: string;
    hour: string;
    minute: string;
    onHour: (v: string) => void;
    onMinute: (v: string) => void;
  }) => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <View style={styles.modalCompactRow}>
        <View style={styles.modalDigitCol}>
          <TouchableOpacity
            style={styles.modalStepper}
            onPress={() => onHour(String(Math.min(23, (parseInt(hour) || 0) + 1)))}
            activeOpacity={0.6}
          >
            <Ionicons name="add" size={16} color="#FF7F60" />
          </TouchableOpacity>
          <RNTextInput
            value={hour}
            onChangeText={(t) => { const n = Math.min(23, Math.max(0, parseInt(t.replace(/[^0-9]/g, '')) || 0)); onHour(String(n)); }}
            keyboardType="numeric"
            style={styles.modalTimeInput}
            maxLength={2}
            selectTextOnFocus
          />
          <TouchableOpacity
            style={styles.modalStepper}
            onPress={() => onHour(String(Math.max(0, (parseInt(hour) || 0) - 1)))}
            activeOpacity={0.6}
          >
            <Ionicons name="remove" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
        <Text style={styles.modalTimeColon}>:</Text>
        <View style={styles.modalDigitCol}>
          <TouchableOpacity
            style={styles.modalStepper}
            onPress={() => onMinute(String(Math.min(59, (parseInt(minute) || 0) + 5)))}
            activeOpacity={0.6}
          >
            <Ionicons name="add" size={16} color="#FF7F60" />
          </TouchableOpacity>
          <RNTextInput
            value={minute}
            onChangeText={(t) => { const n = Math.min(59, Math.max(0, parseInt(t.replace(/[^0-9]/g, '')) || 0)); onMinute(String(n).padStart(2, '0')); }}
            keyboardType="numeric"
            style={styles.modalTimeInput}
            maxLength={2}
            selectTextOnFocus
          />
          <TouchableOpacity
            style={styles.modalStepper}
            onPress={() => onMinute(String(Math.max(0, (parseInt(minute) || 0) - 5)))}
            activeOpacity={0.6}
          >
            <Ionicons name="remove" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const computeUpdateScheduleRange = () => {
    const { hh, mm } = from12h(startH, startM, startP);
    const baseDate = scheduled ? new Date(scheduled.start_time) : new Date();
    const startDate = new Date(baseDate);
    startDate.setHours(hh, mm, 0, 0);

    const minMins = (parseInt(minDurationH) || 0) * 60 + (parseInt(minDurationM) || 0);
    const maxMins = (parseInt(maxDurationH) || 0) * 60 + (parseInt(maxDurationM) || 0);

    const minEnd = new Date(startDate.getTime() + minMins * 60000);
    const maxEnd = new Date(startDate.getTime() + maxMins * 60000);

    const fmt = (d: Date) =>
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return {
      startTime: fmt(startDate),
      minEndTime: fmt(minEnd),
      maxEndTime: fmt(maxEnd),
      minMins,
      maxMins,
    };
  };


  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Update {type === 'screen_time' ? 'Screen Time' : type === 'physical_activity' ? 'Physical Activity' : type === 'education' ? 'Learning' : type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
            {/* Start time */}
            <View>
              <Text style={styles.modalLabel}>Start Time</Text>
              <TimeField
                label="Start"
                hour={startH}
                minute={startM}
                period={startP}
                onHour={setStartH}
                onMinute={setStartM}
                onPeriod={setStartP}
              />
            </View>

            {/* Duration allotment for non-meal schedules */}
            {type !== 'meal' && (
              <View>
                <Text style={styles.modalLabel}>Allotted Duration</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <DurationField
                    label="Minimum"
                    hour={minDurationH}
                    minute={minDurationM}
                    onHour={setMinDurationH}
                    onMinute={setMinDurationM}
                  />
                  <DurationField
                    label="Maximum"
                    hour={maxDurationH}
                    minute={maxDurationM}
                    onHour={setMaxDurationH}
                    onMinute={setMaxDurationM}
                  />
                </View>
                {(() => {
                  const range = computeUpdateScheduleRange();
                  const same = range.minEndTime === range.maxEndTime;
                  return (
                    <View style={styles.modalRangePreviewCard}>
                      <Text style={styles.modalRangePreviewTitle}>Calculated Time Range</Text>
                      <Text style={styles.modalRangePreviewText}>
                        <Text style={styles.modalRangePreviewTime}>{range.startTime}</Text>
                        {' → '}
                        {same ? (
                          <Text style={styles.modalRangePreviewTime}>{range.maxEndTime}</Text>
                        ) : (
                          <>
                            <Text style={styles.modalRangePreviewTime}>{range.minEndTime}</Text>
                            {' – '}
                            <Text style={styles.modalRangePreviewTime}>{range.maxEndTime}</Text>
                          </>
                        )}
                      </Text>
                      <Text style={styles.modalRangePreviewSub}>
                        The activity can be logged within the minimum to maximum allotted window.
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}

            {/* Tailored category input by type */}
            {type === 'meal' ? (
              <View>
                <Text style={styles.modalLabel}>Meal Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {mealOptions.map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => setMealType(m.key)}
                      style={[
                        styles.modalTypeChip,
                        mealType === m.key && { backgroundColor: m.bg, borderColor: m.color },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.modalTypeChipText,
                        mealType === m.key && { color: m.color, fontWeight: '700' },
                      ]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ height: 16 }} />
                <Text style={styles.modalLabel}>Planned Food Groups</Text>
                <View style={styles.logConfirmChips}>
                  {FOOD_GROUPS.map((fg) => {
                    const active = foodGroups.includes(fg.key);
                    return (
                      <TouchableOpacity
                        key={fg.key}
                        onPress={() => {
                          setFoodGroups((prev) =>
                            prev.includes(fg.key) ? prev.filter((k) => k !== fg.key) : [...prev, fg.key]
                          );
                        }}
                        style={[styles.logConfirmChip, active && styles.logConfirmChipActive]}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.logConfirmChipEmoji}>{fg.emoji}</Text>
                        <Text style={[styles.logConfirmChipText, active && styles.logConfirmChipTextActive]}>{fg.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : type === 'screen_time' || type === 'physical_activity' || type === 'education' ? (
              <View>
                <Text style={styles.modalLabel}>
                  {type === 'screen_time' ? 'Category' : type === 'physical_activity' ? 'Activity' : 'Subject'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {getCategoryOptions(type).map((option: any) => (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setCategory(option.key)}
                      style={[
                        styles.modalTypeChip,
                        category === option.key && { backgroundColor: selectedTypeOption.bg, borderColor: selectedTypeOption.color },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalTypeChipText,
                          category === option.key && { color: selectedTypeOption.color, fontWeight: '700' },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity
            style={[styles.modalSaveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={styles.modalSaveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const QUALITY = [
  { key: 'poor', label: 'Poor', emoji: '😟' },
  { key: 'fair', label: 'Fair', emoji: '😐' },
  { key: 'good', label: 'Good', emoji: '😊' },
];

const FOOD_GROUPS = [
  { key: 'fruits', label: 'Fruits', emoji: '🍎' },
  { key: 'vegetables', label: 'Veggies', emoji: '🥦' },
  { key: 'protein', label: 'Protein', emoji: '🍗' },
  { key: 'grains', label: 'Grains', emoji: '🍚' },
  { key: 'dairy', label: 'Dairy', emoji: '🥛' },
  { key: 'junk', label: 'Junk Food', emoji: '🍟' },
  { key: 'drinks', label: 'Drinks', emoji: '🥤' },
];

const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snack', label: 'Snack' },
  { key: 'dinner', label: 'Dinner' },
];

const SCREEN_CATEGORIES = [
  { key: 'leisure', label: 'Leisure', icon: 'game-controller-outline' as const },
  { key: 'educational', label: 'Educational', icon: 'book-outline' as const },
];

const PHYSICAL_CATEGORIES = [
  { key: 'running', label: 'Running' },
  { key: 'swimming', label: 'Swimming' },
  { key: 'cycling', label: 'Cycling' },
  { key: 'sports', label: 'Sports' },
  { key: 'playground', label: 'Playground' },
  { key: 'dancing', label: 'Dancing' },
  { key: 'other', label: 'Other' },
];

const EDUCATION_CATEGORIES = [
  { key: 'reading', label: 'Reading' },
  { key: 'homework', label: 'Homework' },
  { key: 'learning_app', label: 'App' },
  { key: 'music', label: 'Music' },
  { key: 'art', label: 'Art' },
];

function LogConfirmModal({
  visible,
  scheduled,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  scheduled: ScheduledActivity | null;
  onClose: () => void;
  onConfirm: (s: ScheduledActivity, value: Record<string, any>) => Promise<void>;
}) {
  const [quality, setQuality] = useState('good');
  const [foodGroups, setFoodGroups] = useState<string[]>([]);
  const [mealType, setMealType] = useState(scheduled?.meal_type || 'lunch');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset state when scheduled changes
  useEffect(() => {
    if (scheduled) {
      setQuality('good');
      setFoodGroups(scheduled.food_groups || []);
      setMealType(scheduled.meal_type || 'lunch');
      setNotes('');
    }
  }, [scheduled?.id]);

  const isMeal = scheduled?.type === 'meal';
  const mins = scheduled?.max_duration_minutes || 30;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;

  const typeConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
    screen_time: { icon: 'phone-portrait-outline', label: 'Screen Time' },
    sleep: { icon: 'moon-outline', label: 'Sleep' },
    nap: { icon: 'bed-outline', label: 'Nap' },
    meal: { icon: 'restaurant-outline', label: 'Meal' },
    physical_activity: { icon: 'fitness-outline', label: 'Physical Activity' },
    education: { icon: 'school-outline', label: 'Education' },
  };
  const config = typeConfig[scheduled?.type || ''] || typeConfig.screen_time;

  const toggleFoodGroup = (key: string) => {
    setFoodGroups((prev) =>
      prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!scheduled) return;
    setSaving(true);
    try {
      let value: Record<string, any> = { hours, minutes };
      switch (scheduled.type) {
        case 'meal':
          value = { meal_type: mealType, food_groups: foodGroups, quality, hours, minutes, notes: notes || undefined };
          break;
        case 'screen_time':
          value = { hours, minutes, category: scheduled.category || 'leisure', device: 'phone', notes: notes || undefined };
          break;
        case 'sleep':
        case 'nap':
          value = { hours, minutes, quality: 'good', notes: notes || undefined };
          break;
        case 'physical_activity':
          value = { hours, minutes, activity: scheduled.category || 'other', notes: notes || undefined };
          break;
        case 'education':
          value = { hours, minutes, subject: scheduled.category || 'reading', notes: notes || undefined };
          break;
      }
      await onConfirm(scheduled, value);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {config.icon === 'restaurant-outline' ? '🍳' : ''} Log {config.label}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
            {!isMeal && (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.logConfirmDuration}>
                  {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
                </Text>
                <Text style={styles.logConfirmSubtext}>Scheduled duration</Text>
              </View>
            )}

            {isMeal && (
              <>
                {/* Quality selector */}
                <View>
                  <Text style={styles.modalLabel}>How was it?</Text>
                  <View style={styles.logConfirmChips}>
                    {QUALITY.map((q) => {
                      const active = quality === q.key;
                      return (
                        <TouchableOpacity
                          key={q.key}
                          onPress={() => setQuality(q.key)}
                          style={[styles.logConfirmChip, active && styles.logConfirmChipActive]}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.logConfirmChipEmoji}>{q.emoji}</Text>
                          <Text style={[styles.logConfirmChipText, active && styles.logConfirmChipTextActive]}>{q.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Food groups */}
                <View>
                  <Text style={styles.modalLabel}>Food Groups</Text>
                  <View style={styles.logConfirmChips}>
                    {FOOD_GROUPS.map((fg) => {
                      const active = foodGroups.includes(fg.key);
                      return (
                        <TouchableOpacity
                          key={fg.key}
                          onPress={() => toggleFoodGroup(fg.key)}
                          style={[styles.logConfirmChip, active && styles.logConfirmChipActive]}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.logConfirmChipEmoji}>{fg.emoji}</Text>
                          <Text style={[styles.logConfirmChipText, active && styles.logConfirmChipTextActive]}>{fg.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Meal type */}
                <View>
                  <Text style={styles.modalLabel}>Meal Type</Text>
                  <View style={styles.logConfirmChips}>
                    {MEALS.map((m) => {
                      const active = mealType === m.key;
                      return (
                        <TouchableOpacity
                          key={m.key}
                          onPress={() => setMealType(m.key)}
                          style={[styles.logConfirmChip, active && styles.logConfirmChipActive]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.logConfirmChipText, active && styles.logConfirmChipTextActive]}>{m.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {/* Notes */}
            <View>
              <Text style={styles.modalLabel}>Notes</Text>
              <RNTextInput
                value={notes}
                onChangeText={setNotes}
                style={styles.logConfirmNotesInput}
                placeholder={isMeal ? 'Any notes about this meal…' : 'Add notes about this activity…'}
                placeholderTextColor="#CBD5E1"
                multiline
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.modalSaveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={styles.modalSaveText}>{saving ? 'Logging…' : 'Log Activity'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
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
    screen_time: { color: '#FF7F60', bg: '#FFF0ED', letter: 'S' },
    sleep: { color: '#10B981', bg: '#ECFDF5', letter: 'Z' },
    nap: { color: '#8B5CF6', bg: '#F5F3FF', letter: 'N' },
    meal: { color: '#F59E0B', bg: '#FFFBEB', letter: 'M' },
    physical_activity: { color: '#EF4444', bg: '#FEF2F2', letter: 'A' },
    education: { color: '#6366F1', bg: '#EEF2FF', letter: 'E' },
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
  const { selectedChild, children, loadChildren, selectChild } = useApp();
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<ScheduledActivity[]>([]);
  const [error, setError] = useState('');
  const [editSchedule, setEditSchedule] = useState<ScheduledActivity | null>(null);
  const [logModalSchedule, setLogModalSchedule] = useState<ScheduledActivity | null>(null);

  const loadDashboardData = async (childId?: string, options?: { silent?: boolean }) => {
    setError('');
    if (!options?.silent) setLoading(true);
    try {
      // Refresh children list first
      await loadChildren();
      // Use passed childId or resolve from current store state
      const cid = childId || useApp.getState().selectedChild?.id;
      if (cid) {
        const [activities, scheduled] = await Promise.all([
          getTodayActivities(cid),
          getScheduledActivities(cid, 'pending'),
        ]);
        setTodayActivities(activities);
        // Filter to only show upcoming (start_time >= start of today)
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const upcoming = (scheduled || []).filter(
          (s) => new Date(s.start_time) >= now
        );
        setUpcomingActivities(upcoming);
      } else {
        setTodayActivities([]);
        setUpcomingActivities([]);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to load dashboard. Pull down to refresh.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // Also reload when selectedChild changes (e.g. user switches child)
  useEffect(() => {
    if (selectedChild) {
      loadDashboardData(selectedChild.id);
    }
  }, [selectedChild?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(undefined, { silent: true });
    setRefreshing(false);
  };

  const handleCancelSchedule = async (id: string) => {
    try {
      await cancelScheduledActivityNotifications(id);
      await deleteScheduledActivity(id);
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      setError('Failed to delete schedule. Pull down to refresh.');
    }
  };

  const handleLogScheduleConfirm = async (s: ScheduledActivity, value: Record<string, any>) => {
    if (!selectedChild) throw new Error('No child selected');
    await logActivity(selectedChild.id, s.type as ActivityType, value);
    await cancelScheduledActivityNotifications(s.id);
    await loadDashboardData();
  };

  const handleUpdateSchedule = async (id: string, updates: any) => {
    const updated = await updateScheduledActivity(id, updates);
    if (selectedChild) {
      await scheduleScheduledActivityNotifications(updated, selectedChild.name);
    }
    await loadDashboardData();
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
    { key: 'screen', icon: 'phone-portrait-outline', label: 'Screen Time', value: stats.screenTime, subtitle: 'today', color: '#FF7F60', bgColor: '#FFF0ED' },
    { key: 'sleep', icon: 'moon-outline', label: 'Sleep', value: stats.sleep, subtitle: 'last night', color: '#10B981', bgColor: '#ECFDF5' },
    { key: 'meal', icon: 'restaurant-outline', label: 'Meals', value: stats.meals, subtitle: 'tracked today', color: '#F59E0B', bgColor: '#FFFBEB' },
    { key: 'edu', icon: 'school-outline', label: 'Education', value: stats.education, subtitle: 'today', color: '#8B5CF6', bgColor: '#F5F3FF' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEFBF6' }]}>
        <ActivityIndicator size="large" color="#FF7F60" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF7F60" />
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

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError('')} hitSlop={8}>
              <Ionicons name="close" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.date}>{getDateString()}</Text>

        {/* Children Selector — horizontal scroll */}
        <View style={styles.childrenSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Children</Text>
            <TouchableOpacity onPress={() => router.push('/child/wizard' as any)}>
              <Text style={styles.sectionLink}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {children.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childrenScroll}
            >
              {children.map((child) => {
                const isSelected = child.id === selectedChild?.id;
                const childAge = child.date_of_birth
                  ? Math.floor(
                      (Date.now() - new Date(child.date_of_birth).getTime()) /
                        (365.25 * 24 * 60 * 60 * 1000)
                    )
                  : null;
                return (
                  <TouchableOpacity
                    key={child.id}
                    style={[styles.childChip, isSelected && styles.childChipActive]}
                    onPress={() => selectChild(child)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.childChipAvatar, isSelected && styles.childChipAvatarActive]}>
                      <Text style={[styles.childChipAvatarText, isSelected && styles.childChipAvatarTextActive]}>
                        {child.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.childChipName, isSelected && styles.childChipNameActive]} numberOfLines={1}>
                      {child.name}
                    </Text>
                    <Text style={styles.childChipAge}>
                      {childAge !== null ? `${childAge}y` : '—'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {/* Add child button */}
              <TouchableOpacity
                style={styles.addChildChip}
                onPress={() => router.push('/child/wizard' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.addChildChipIcon}>
                  <Ionicons name="add" size={20} color="#FF7F60" />
                </View>
                <Text style={styles.addChildChipText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={styles.addChildBanner}
              activeOpacity={0.7}
              onPress={() => router.push('/child/wizard' as any)}
            >
              <View style={styles.addChildIcon}>
                <Ionicons name="add" size={24} color="#FF7F60" />
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
        </View>

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

        {/* Upcoming Scheduled Activities — always visible */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <TouchableOpacity onPress={() => router.push('/log')}>
            <Text style={styles.sectionLink}>Schedule →</Text>
          </TouchableOpacity>
        </View>
        {upcomingActivities.length > 0 ? (
          <View style={styles.upcomingList}>
            {upcomingActivities.slice(0, 3).map((s) => (
              <UpcomingItem key={s.id} scheduled={s} onLogConfirm={setLogModalSchedule} onUpdate={setEditSchedule} onCancel={handleCancelSchedule} />
            ))}
            {upcomingActivities.length > 3 && (
              <Text style={styles.moreText}>
                +{upcomingActivities.length - 3} more scheduled
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyStateSmall}>
            <Ionicons name="calendar-outline" size={28} color="#CBD5E1" />
            <Text style={styles.emptyTitleSmall}>No upcoming activities</Text>
            <Text style={styles.emptySubtitleSmall}>
              {hasChild
                ? 'Tap Schedule → to plan your child\'s day'
                : 'Add a child profile to start scheduling'}
            </Text>
          </View>
        )}

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

      <UpdateScheduleModal
        visible={!!editSchedule}
        scheduled={editSchedule}
        onClose={() => setEditSchedule(null)}
        onSave={handleUpdateSchedule}
      />

      <LogConfirmModal
        visible={!!logModalSchedule}
        scheduled={logModalSchedule}
        onClose={() => setLogModalSchedule(null)}
        onConfirm={handleLogScheduleConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFBF6',
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
    backgroundColor: '#FEFBF6',
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
    backgroundColor: '#FFFDFF',
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  date: {
    fontSize: 13,
    color: '#94A3B8',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  childrenSection: {
    marginBottom: 20,
  },
  childrenScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  childChip: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFDFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  childChipActive: {
    backgroundColor: '#FFF0ED',
    borderColor: '#FF7F60',
  },
  childChipAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childChipAvatarActive: {
    backgroundColor: '#FF7F60',
  },
  childChipAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  childChipAvatarTextActive: {
    color: '#FFFFFF',
  },
  childChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: 72,
    textAlign: 'center',
  },
  childChipNameActive: {
    color: '#1E40AF',
  },
  childChipAge: {
    fontSize: 11,
    color: '#94A3B8',
  },
  addChildChip: {
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFE5E0',
    borderStyle: 'dashed',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  addChildChipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChildChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF7F60',
  },
  addChildBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF0ED',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE5E0',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addChildIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFDFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE5E0',
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
    backgroundColor: '#FF7F60',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#FF7F60',
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
    color: '#FF7F60',
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
    backgroundColor: '#FFFDFF',
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
    backgroundColor: '#FFFDFF',
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

  // Upcoming scheduled
  upcomingList: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  upcomingItem: {
    backgroundColor: '#FFFDFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  upcomingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  upcomingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  upcomingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  upcomingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  upcomingTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  upcomingMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    textTransform: 'capitalize',
  },

  // Action buttons on scheduled items
  upcomingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF7F60',
  },
  actionDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },

  // Inline cancel confirmation
  confirmRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  confirmBtnNo: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  confirmBtnNoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmBtnYes: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  confirmBtnYesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },

  emptyState: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDFF',
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

  // Small empty state (for upcoming section)
  emptyStateSmall: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFDFF',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 20,
  },
  emptyTitleSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  emptySubtitleSmall: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 17,
  },

  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FF7F60',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#FF7F60',
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

  // Update Schedule Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FEFBF6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTypeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalTypeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  modalStepper: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTimeFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  modalDigitCol: {
    width: 46,
    alignItems: 'center',
  },
  modalTimeColon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginHorizontal: 0,
  },
  modalTimeInput: {
    width: 44,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFFDFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  modalPeriodStack: {
    gap: 4,
  },
  modalPeriodBtn: {
    width: 40,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPeriodActive: {
    backgroundColor: '#FFF0ED',
  },
  modalPeriodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  modalPeriodTextActive: {
    color: '#FF7F60',
  },
  modalTextInput: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFDFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  modalSaveBtn: {
    backgroundColor: '#FF7F60',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalRangePreviewCard: {
    marginTop: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    alignItems: 'center',
  },
  modalRangePreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalRangePreviewText: {
    fontSize: 15,
    color: '#166534',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalRangePreviewTime: {
    fontWeight: '700',
    fontSize: 18,
    color: '#15803D',
  },
  modalRangePreviewSub: {
    fontSize: 12,
    color: '#22C55E',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 17,
  },

  // Log Confirm Modal
  logConfirmDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  logConfirmSubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  logConfirmChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  logConfirmChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  logConfirmChipActive: {
    backgroundColor: '#FFF0ED',
    borderColor: '#FF7F60',
  },
  logConfirmChipEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  logConfirmChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  logConfirmChipTextActive: {
    color: '#FF7F60',
  },
  logConfirmNotesInput: {
    backgroundColor: '#FEFBF6',
    borderRadius: 14,
    minHeight: 80,
    padding: 14,
    fontSize: 15,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
});
