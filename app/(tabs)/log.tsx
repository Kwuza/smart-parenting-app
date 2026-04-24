import { useState, useRef, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput as RNTextInput, FlatList, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../stores/auth';
import { scheduleScheduledActivityNotifications } from '../../lib/notifications';
import { logActivity, scheduleActivity, ActivityType } from '../../lib/api';
import ScreenHeader from '../../components/ScreenHeader';

type ActivityTypeExtended = ActivityType | 'nap' | 'physical_activity';

interface TypeConfig {
  key: ActivityTypeExtended;
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

const QUALITY = [
  { key: 'poor', label: 'Poor', emoji: '😟' },
  { key: 'fair', label: 'Fair', emoji: '😐' },
  { key: 'good', label: 'Good', emoji: '😊' },
];

const DEVICES = [
  { key: 'phone', label: 'Phone', icon: 'phone-portrait-outline' as const },
  { key: 'tablet', label: 'Tablet', icon: 'tablet-portrait-outline' as const },
  { key: 'tv', label: 'TV', icon: 'tv-outline' as const },
  { key: 'computer', label: 'PC', icon: 'desktop-outline' as const },
];

const SCREEN_CATEGORIES = [
  { key: 'leisure', label: 'Leisure', icon: 'game-controller-outline' as const },
  { key: 'educational', label: 'Educational', icon: 'book-outline' as const },
];

const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snack', label: 'Snack' },
  { key: 'dinner', label: 'Dinner' },
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

const PHYSICAL = [
  { key: 'running', label: 'Running' },
  { key: 'swimming', label: 'Swimming' },
  { key: 'cycling', label: 'Cycling' },
  { key: 'sports', label: 'Sports' },
  { key: 'playground', label: 'Playground' },
  { key: 'dancing', label: 'Dancing' },
  { key: 'other', label: 'Other' },
];

const SUBJECTS = [
  { key: 'reading', label: 'Reading' },
  { key: 'homework', label: 'Homework' },
  { key: 'learning_app', label: 'App' },
  { key: 'music', label: 'Music' },
  { key: 'art', label: 'Art' },
];

const sanitizeHour = (text: string) => {
  const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n)) return '1';
  return String(Math.min(12, Math.max(1, n)));
};

const sanitizeMinute = (text: string) => {
  const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n)) return '00';
  return String(Math.min(59, Math.max(0, n))).padStart(2, '0');
};

const stepHour = (value: string, delta: number) =>
  String(Math.min(12, Math.max(1, (parseInt(value, 10) || 0) + delta)));

const stepMinute = (value: string, delta: number) =>
  String(Math.min(59, Math.max(0, (parseInt(value, 10) || 0) + delta))).padStart(2, '0');

// --- Single Time Input (meal timestamp) ---
function SingleTimeInput({
  hour,
  minute,
  period,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
}: {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
  onHourChange: (v: string) => void;
  onMinuteChange: (v: string) => void;
  onPeriodChange: (v: 'AM' | 'PM') => void;
}) {
  const hourRef = useRef<RNTextInput>(null);
  const minuteRef = useRef<RNTextInput>(null);

  return (
    <View style={styles.singleTimeContainer}>
      <View style={styles.singleTimeRow}>
        <View style={styles.timeDigitCol}>
          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => onHourChange(stepHour(hour, 1))}>
            <Ionicons name="add" size={18} color="#FF7F60" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={1} onPress={() => hourRef.current?.focus()}>
            <View style={styles.mealTimeInputBox}>
              <RNTextInput
                ref={hourRef}
                value={hour}
                onChangeText={(t) => onHourChange(sanitizeHour(t))}
                keyboardType="number-pad"
                style={styles.mealTimeInput}
                maxLength={2}
                selectTextOnFocus
                placeholder="12"
                placeholderTextColor="#CBD5E1"
                textAlign="center"
                textAlignVertical="center"
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => onHourChange(stepHour(hour, -1))}>
            <Ionicons name="remove" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <Text style={styles.singleTimeColon}>:</Text>

        <View style={styles.timeDigitCol}>
          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => onMinuteChange(stepMinute(minute, 5))}>
            <Ionicons name="add" size={18} color="#FF7F60" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={1} onPress={() => minuteRef.current?.focus()}>
            <View style={styles.mealTimeInputBox}>
              <RNTextInput
                ref={minuteRef}
                value={minute}
                onChangeText={(t) => onMinuteChange(sanitizeMinute(t))}
                keyboardType="number-pad"
                style={styles.mealTimeInput}
                maxLength={2}
                selectTextOnFocus
                placeholder="00"
                placeholderTextColor="#CBD5E1"
                textAlign="center"
                textAlignVertical="center"
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => onMinuteChange(stepMinute(minute, -5))}>
            <Ionicons name="remove" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.timePeriodCol}>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
            activeOpacity={0.7}
            onPress={() => onPeriodChange('AM')}
          >
            <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
            activeOpacity={0.7}
            onPress={() => onPeriodChange('PM')}
          >
            <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// --- Time Range Input (start/end → calculated duration) ---
function TimeRangeInput({
  startHour,
  startMinute,
  endHour,
  endMinute,
  onStartHourChange,
  onStartMinuteChange,
  onEndHourChange,
  onEndMinuteChange,
  startPeriod,
  endPeriod,
  onStartPeriodChange,
  onEndPeriodChange,
}: {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  onStartHourChange: (v: string) => void;
  onStartMinuteChange: (v: string) => void;
  onEndHourChange: (v: string) => void;
  onEndMinuteChange: (v: string) => void;
  startPeriod: 'AM' | 'PM';
  endPeriod: 'AM' | 'PM';
  onStartPeriodChange: (v: 'AM' | 'PM') => void;
  onEndPeriodChange: (v: 'AM' | 'PM') => void;
}) {
  const shRef = useRef<RNTextInput>(null);
  const smRef = useRef<RNTextInput>(null);
  const ehRef = useRef<RNTextInput>(null);
  const emRef = useRef<RNTextInput>(null);

  // Calculate duration
  const calcMinutes = () => {
    let sH = parseInt(startHour) || 0;
    let sM = parseInt(startMinute) || 0;
    let eH = parseInt(endHour) || 0;
    let eM = parseInt(endMinute) || 0;

    // Convert to 24h
    if (startPeriod === 'PM' && sH !== 12) sH += 12;
    if (startPeriod === 'AM' && sH === 12) sH = 0;
    if (endPeriod === 'PM' && eH !== 12) eH += 12;
    if (endPeriod === 'AM' && eH === 12) eH = 0;

    let startTotal = sH * 60 + sM;
    let endTotal = eH * 60 + eM;
    if (endTotal < startTotal) endTotal += 24 * 60; // overnight
    return endTotal - startTotal;
  };

  const totalMins = calcMinutes();
  const durH = Math.floor(totalMins / 60);
  const durM = totalMins % 60;
  const durText = totalMins > 0
    ? `= ${durH > 0 ? `${durH}h ` : ''}${durM > 0 ? `${durM}m` : ''}`.trim()
    : 'Set start and end time';

  const TimeBlock = ({
    label,
    hour,
    minute,
    period,
    onHourChange,
    onMinuteChange,
    onPeriodChange,
    hRef,
    mRef,
  }: {
    label: string;
    hour: string;
    minute: string;
    period: 'AM' | 'PM';
    onHourChange: (v: string) => void;
    onMinuteChange: (v: string) => void;
    onPeriodChange: (v: 'AM' | 'PM') => void;
    hRef: any;
    mRef: any;
  }) => (
    <View style={styles.timeBlock}>
      <Text style={styles.timeBlockLabel}>{label}</Text>
      <View style={styles.timeBlockRow}>
        <View style={styles.timeDigitCol}>
          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => onHourChange(String(Math.min(12, (parseInt(hour) || 0) + 1)))}>
            <Ionicons name="add" size={18} color="#FF7F60" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={1} onPress={() => hRef.current?.focus()}>
            <RNTextInput
              ref={hRef}
              value={hour}
              onChangeText={(t) => { const n = Math.min(12, Math.max(1, parseInt(t.replace(/[^0-9]/g, '')) || 0)); onHourChange(String(n)); }}
              keyboardType="numeric"
              style={[styles.durationText, { width: 52 }]}
              maxLength={2}
              selectTextOnFocus
              placeholder="12"
              placeholderTextColor="#CBD5E1"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => onHourChange(String(Math.max(1, (parseInt(hour) || 0) - 1)))}>
            <Ionicons name="remove" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
        <Text style={styles.durationColon}>:</Text>
        <View style={styles.timeDigitCol}>
          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => onMinuteChange(String(Math.min(59, (parseInt(minute) || 0) + 5)))}>
            <Ionicons name="add" size={18} color="#FF7F60" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={1} onPress={() => mRef.current?.focus()}>
            <RNTextInput
              ref={mRef}
              value={minute}
              onChangeText={(t) => { const n = Math.min(59, Math.max(0, parseInt(t.replace(/[^0-9]/g, '')) || 0)); onMinuteChange(String(n).padStart(2, '0')); }}
              keyboardType="numeric"
              style={[styles.durationText, { width: 52 }]}
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor="#CBD5E1"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => onMinuteChange(String(Math.max(0, (parseInt(minute) || 0) - 5)))}>
            <Ionicons name="remove" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={styles.timePeriodCol}>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
            activeOpacity={0.7}
            onPress={() => onPeriodChange('AM')}
          >
            <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
            activeOpacity={0.7}
            onPress={() => onPeriodChange('PM')}
          >
            <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.timeRangeContainer}>
      <View style={styles.timeRangeRow}>
        <TimeBlock
          label="Start"
          hour={startHour}
          minute={startMinute}
          period={startPeriod}
          onHourChange={onStartHourChange}
          onMinuteChange={onStartMinuteChange}
          onPeriodChange={onStartPeriodChange}
          hRef={shRef}
          mRef={smRef}
        />
        <View style={styles.timeRangeArrow}>
          <Ionicons name="arrow-down" size={18} color="#CBD5E1" />
        </View>
        <TimeBlock
          label="End"
          hour={endHour}
          minute={endMinute}
          period={endPeriod}
          onHourChange={onEndHourChange}
          onMinuteChange={onEndMinuteChange}
          onPeriodChange={onEndPeriodChange}
          hRef={ehRef}
          mRef={emRef}
        />
      </View>
      <Text style={styles.durationCalc}>{durText}</Text>
    </View>
  );
}

// --- Chip Selector ---
function ChipSelector({
  items,
  value,
  onChange,
  showIcon = false,
  showEmoji = false,
}: {
  items: { key: string; label: string; icon?: string; emoji?: string }[];
  value: string | string[];
  onChange: (v: string) => void;
  showIcon?: boolean;
  showEmoji?: boolean;
  multi?: boolean;
}) {
  const isMulti = Array.isArray(value);
  return (
    <View style={styles.chipRow}>
      {items.map((item) => {
        const isActive = isMulti
          ? (value as string[]).includes(item.key)
          : value === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.chip, isActive && styles.chipActive]}
            activeOpacity={0.7}
          >
            {showIcon && item.icon && (
              <Ionicons name={item.icon as any} size={16} color={isActive ? '#FF7F60' : '#64748B'} style={{ marginRight: 4 }} />
            )}
            {showEmoji && item.emoji && (
              <Text style={{ fontSize: 14, marginRight: 4 }}>{item.emoji}</Text>
            )}
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// --- Multi-select chips ---
function MultiChipSelector({
  items,
  selected,
  onToggle,
}: {
  items: { key: string; label: string; emoji?: string }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {items.map((item) => {
        const isActive = selected.includes(item.key);
        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => onToggle(item.key)}
            style={[styles.chip, isActive && styles.chipActive]}
            activeOpacity={0.7}
          >
            {item.emoji && <Text style={{ fontSize: 14, marginRight: 4 }}>{item.emoji}</Text>}
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {item.label}
            </Text>
            {isActive && <Ionicons name="checkmark" size={14} color="#FF7F60" style={{ marginLeft: 2 }} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// --- Main Screen ---
export default function LogActivityScreen() {
  const [mode, setMode] = useState<'log' | 'schedule'>('log');
  const [activityType, setActivityType] = useState<ActivityTypeExtended>('screen_time');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { selectedChild, children, selectChild, loadChildren } = useApp();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);

  const refreshChildren = useCallback(async () => {
    await loadChildren();
    const freshChildren = useApp.getState().children;
    const freshSelected = useApp.getState().selectedChild;
    if (freshSelected) {
      const updated = freshChildren.find(c => c.id === freshSelected.id);
      if (!updated && freshChildren[0]) {
        useApp.getState().selectChild(freshChildren[0]);
      }
    }
  }, [loadChildren]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshChildren();
    } catch {
      // error handled by children list being empty
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshChildren().catch(() => {});
    }, [refreshChildren])
  );

  // Time range (sleep, nap, education, physical, screen_time — start/end, duration auto-calculated)
  const [sleepStartH, setSleepStartH] = useState('9');
  const [sleepStartM, setSleepStartM] = useState('00');
  const [sleepStartP, setSleepStartP] = useState<'AM' | 'PM'>('PM');
  const [sleepEndH, setSleepEndH] = useState('6');
  const [sleepEndM, setSleepEndM] = useState('00');
  const [sleepEndP, setSleepEndP] = useState<'AM' | 'PM'>('AM');

  const [napStartH, setNapStartH] = useState('1');
  const [napStartM, setNapStartM] = useState('00');
  const [napStartP, setNapStartP] = useState<'AM' | 'PM'>('PM');
  const [napEndH, setNapEndH] = useState('2');
  const [napEndM, setNapEndM] = useState('00');
  const [napEndP, setNapEndP] = useState<'AM' | 'PM'>('PM');

  const [learnStartH, setLearnStartH] = useState('3');
  const [learnStartM, setLearnStartM] = useState('00');
  const [learnStartP, setLearnStartP] = useState<'AM' | 'PM'>('PM');
  const [learnEndH, setLearnEndH] = useState('4');
  const [learnEndM, setLearnEndM] = useState('00');
  const [learnEndP, setLearnEndP] = useState<'AM' | 'PM'>('PM');

  const [activeStartH, setActiveStartH] = useState('4');
  const [activeStartM, setActiveStartM] = useState('00');
  const [activeStartP, setActiveStartP] = useState<'AM' | 'PM'>('PM');
  const [activeEndH, setActiveEndH] = useState('5');
  const [activeEndM, setActiveEndM] = useState('00');
  const [activeEndP, setActiveEndP] = useState<'AM' | 'PM'>('PM');

  // Screen time
  const [screenStartH, setScreenStartH] = useState('3');
  const [screenStartM, setScreenStartM] = useState('00');
  const [screenStartP, setScreenStartP] = useState<'AM' | 'PM'>('PM');
  const [screenEndH, setScreenEndH] = useState('4');
  const [screenEndM, setScreenEndM] = useState('00');
  const [screenEndP, setScreenEndP] = useState<'AM' | 'PM'>('PM');
  const [device, setDevice] = useState('phone');
  const [screenCategory, setScreenCategory] = useState('leisure');

  // Sleep
  const [sleepQuality, setSleepQuality] = useState('good');

  // Nap
  const [napQuality, setNapQuality] = useState('good');

  // Meal
  const [mealType, setMealType] = useState('lunch');
  const [mealQuality, setMealQuality] = useState('good');
  const [foodGroups, setFoodGroups] = useState<string[]>([]);
  const [mealTimeH, setMealTimeH] = useState('12');
  const [mealTimeM, setMealTimeM] = useState('00');
  const [mealTimeP, setMealTimeP] = useState<'AM' | 'PM'>('PM');

  // Physical
  const [physicalType, setPhysicalType] = useState('running');

  // Education
  const [subject, setSubject] = useState('reading');

  // Notes (shared)
  const [notes, setNotes] = useState('');

  // ── Schedule mode state ──
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [schedHour, setSchedHour] = useState('3');
  const [schedMinute, setSchedMinute] = useState('00');
  const [schedPeriod, setSchedPeriod] = useState<'AM' | 'PM'>('PM');
  const [minDurationH, setMinDurationH] = useState('1');
  const [minDurationM, setMinDurationM] = useState('0');
  const [maxDurationH, setMaxDurationH] = useState('2');
  const [maxDurationM, setMaxDurationM] = useState('0');
  const [schedMealType, setSchedMealType] = useState('lunch');
  const [schedCategory, setSchedCategory] = useState('leisure');

  const activeType = ACTIVITY_TYPES.find((t) => t.key === activityType)!;

  const resetForm = () => {
    setMode('log');
    setSleepStartH('9'); setSleepStartM('00'); setSleepStartP('PM');
    setSleepEndH('6'); setSleepEndM('00'); setSleepEndP('AM');
    setNapStartH('1'); setNapStartM('00'); setNapStartP('PM');
    setNapEndH('2'); setNapEndM('00'); setNapEndP('PM');
    setLearnStartH('3'); setLearnStartM('00'); setLearnStartP('PM');
    setLearnEndH('4'); setLearnEndM('00'); setLearnEndP('PM');
    setActiveStartH('4'); setActiveStartM('00'); setActiveStartP('PM');
    setActiveEndH('5'); setActiveEndM('00'); setActiveEndP('PM');
    setScreenStartH('3'); setScreenStartM('00'); setScreenStartP('PM');
    setScreenEndH('4'); setScreenEndM('00'); setScreenEndP('PM');
    setDevice('phone');
    setScreenCategory('leisure');
    setSleepQuality('good');
    setNapQuality('good');
    setMealType('lunch');
    setMealQuality('good');
    setFoodGroups([]);
    setMealTimeH('12'); setMealTimeM('00'); setMealTimeP('PM');
    setPhysicalType('running');
    setSubject('reading');
    setNotes('');
    setScheduleDate(new Date());
    setSchedHour('3'); setSchedMinute('00'); setSchedPeriod('PM');
    setMinDurationH('1'); setMinDurationM('0');
    setMaxDurationH('2'); setMaxDurationM('0');
    setSchedMealType('lunch');
    setSchedCategory('leisure');
  };

  // Calculate hours/minutes from time range
  const calcDuration = (sH: string, sM: string, sP: 'AM' | 'PM', eH: string, eM: string, eP: 'AM' | 'PM') => {
    let startH = parseInt(sH) || 0;
    let startMin = parseInt(sM) || 0;
    let endH = parseInt(eH) || 0;
    let endMin = parseInt(eM) || 0;
    if (sP === 'PM' && startH !== 12) startH += 12;
    if (sP === 'AM' && startH === 12) startH = 0;
    if (eP === 'PM' && endH !== 12) endH += 12;
    if (eP === 'AM' && endH === 12) endH = 0;
    let total = (endH * 60 + endMin) - (startH * 60 + startMin);
    if (total < 0) total += 24 * 60;
    return { hours: Math.floor(total / 60), minutes: total % 60 };
  };

  const toggleFoodGroup = (key: string) => {
    setFoodGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Date helpers for scheduling
  const goToPrevDay = () => {
    const d = new Date(scheduleDate);
    d.setDate(d.getDate() - 1);
    setScheduleDate(d);
  };
  const goToNextDay = () => {
    const d = new Date(scheduleDate);
    d.setDate(d.getDate() + 1);
    setScheduleDate(d);
  };
  const goToToday = () => setScheduleDate(new Date());

  const formatScheduleDate = (d: Date) => {
    const isT = isToday(d);
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return isT ? `Today, ${dateStr}` : dateStr;
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const to24Hour = (h: string, m: string, p: 'AM' | 'PM') => {
    let hour = parseInt(h) || 0;
    const min = parseInt(m) || 0;
    if (p === 'PM' && hour !== 12) hour += 12;
    if (p === 'AM' && hour === 12) hour = 0;
    return { hour, min };
  };

  const computeScheduleRange = () => {
    const { hour, min } = to24Hour(schedHour, schedMinute, schedPeriod);
    const start = new Date(scheduleDate);
    start.setHours(hour, min, 0, 0);

    const minMins = (parseInt(minDurationH) || 0) * 60 + (parseInt(minDurationM) || 0);
    const maxMins = (parseInt(maxDurationH) || 0) * 60 + (parseInt(maxDurationM) || 0);

    const minEnd = new Date(start.getTime() + minMins * 60000);
    const maxEnd = new Date(start.getTime() + maxMins * 60000);

    const fmt = (d: Date) => {
      let h = d.getHours();
      const m = d.getMinutes();
      const p = h >= 12 ? 'PM' : 'AM';
      if (h === 0) h = 12;
      else if (h > 12) h -= 12;
      return `${h}:${String(m).padStart(2, '0')} ${p}`;
    };

    return { startTime: fmt(start), minEndTime: fmt(minEnd), maxEndTime: fmt(maxEnd), minMins, maxMins };
  };

  const handleSchedule = async () => {
    if (!selectedChild) return;
    setLoading(true);
    setSubmitError('');
    try {
      const { hour, min } = to24Hour(schedHour, schedMinute, schedPeriod);
      const start = new Date(scheduleDate);
      start.setHours(hour, min, 0, 0);
      const startIso = start.toISOString();

      let minMins: number | null = null;
      let maxMins: number | null = null;
      let category: string | undefined;
      let mealType: string | undefined;

      if (activityType === 'meal') {
        mealType = schedMealType;
      } else {
        minMins = (parseInt(minDurationH) || 0) * 60 + (parseInt(minDurationM) || 0);
        maxMins = (parseInt(maxDurationH) || 0) * 60 + (parseInt(maxDurationM) || 0);
        if (minMins > maxMins) {
          throw new Error('Minimum duration cannot exceed maximum duration');
        }
        if (maxMins === 0) {
          throw new Error('Maximum duration must be greater than 0');
        }
        if (activityType === 'screen_time') {
          category = schedCategory;
        }
      }

      const scheduled = await scheduleActivity(
        selectedChild.id,
        activityType,
        startIso,
        minMins,
        maxMins,
        category,
        mealType,
        activityType === 'meal' ? foodGroups : undefined
      );
      await scheduleScheduledActivityNotifications(scheduled, selectedChild.name);
      resetForm();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.back();
      }, 1800);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to schedule activity');
    } finally {
      setLoading(false);
    }
  };

  const handleLog = async () => {
    if (!selectedChild) return;

    setLoading(true);
    setSubmitError('');
    try {
      let value: Record<string, any> = {};
      switch (activityType) {
        case 'screen_time': {
          const sd = calcDuration(screenStartH, screenStartM, screenStartP, screenEndH, screenEndM, screenEndP);
          value = { hours: sd.hours, minutes: sd.minutes, device, category: screenCategory, start_time: `${screenStartH}:${screenStartM} ${screenStartP}`, end_time: `${screenEndH}:${screenEndM} ${screenEndP}` };
          break;
        }
        case 'sleep': {
          const sd = calcDuration(sleepStartH, sleepStartM, sleepStartP, sleepEndH, sleepEndM, sleepEndP);
          value = { hours: sd.hours, minutes: sd.minutes, quality: sleepQuality, start_time: `${sleepStartH}:${sleepStartM} ${sleepStartP}`, end_time: `${sleepEndH}:${sleepEndM} ${sleepEndP}` };
          break;
        }
        case 'nap': {
          const nd = calcDuration(napStartH, napStartM, napStartP, napEndH, napEndM, napEndP);
          value = { hours: nd.hours, minutes: nd.minutes, quality: napQuality, start_time: `${napStartH}:${napStartM} ${napStartP}`, end_time: `${napEndH}:${napEndM} ${napEndP}` };
          break;
        }
        case 'meal':
          value = {
            meal_type: mealType,
            quality: mealQuality,
            food_groups: foodGroups,
            start_time: `${mealTimeH}:${mealTimeM} ${mealTimeP}`,
          };
          break;
        case 'physical_activity': {
          const pd = calcDuration(activeStartH, activeStartM, activeStartP, activeEndH, activeEndM, activeEndP);
          value = {
            hours: pd.hours,
            minutes: pd.minutes,
            activity: physicalType,
            start_time: `${activeStartH}:${activeStartM} ${activeStartP}`,
            end_time: `${activeEndH}:${activeEndM} ${activeEndP}`,
          };
          break;
        }
        case 'education': {
          const ed = calcDuration(learnStartH, learnStartM, learnStartP, learnEndH, learnEndM, learnEndP);
          value = { hours: ed.hours, minutes: ed.minutes, subject, start_time: `${learnStartH}:${learnStartM} ${learnStartP}`, end_time: `${learnEndH}:${learnEndM} ${learnEndP}` };
          break;
        }
      }
      if (notes) value.notes = notes;

      // Map extended types to DB-compatible types until migration is run
      const typeMapping: Record<string, ActivityType> = {
        screen_time: 'screen_time',
        sleep: 'sleep',
        nap: 'sleep',
        meal: 'meal',
        physical_activity: 'physical_activity',
        education: 'education',
      };
      const dbType = typeMapping[activityType] || 'screen_time';

      await logActivity(selectedChild.id, dbType, value);
      resetForm();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.back();
      }, 1800);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  // Success overlay
  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCheck}>
          <Ionicons name="checkmark-circle" size={72} color="#10B981" />
        </View>
        <Text style={styles.successTitle}>{mode === 'schedule' ? 'Scheduled!' : 'Logged!'}</Text>
        <Text style={styles.successSubtitle}>
          {mode === 'schedule'
            ? `${activeType.label} scheduled for ${selectedChild?.name || 'your child'}`
            : `${activeType.label} recorded for ${selectedChild?.name || 'your child'}`}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FEFBF6' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Activities" icon="create-outline" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor='#FF7F60' />}>
        {/* Error Banner */}
        {submitError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{submitError}</Text>
            <TouchableOpacity onPress={() => setSubmitError('')} hitSlop={8}>
              <Ionicons name="close" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'log' && styles.modeBtnActive]}
            onPress={() => setMode('log')}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={mode === 'log' ? '#FF7F60' : '#94A3B8'} />
            <Text style={[styles.modeBtnText, mode === 'log' && styles.modeBtnTextActive]}>Log</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'schedule' && styles.modeBtnActive]}
            onPress={() => setMode('schedule')}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={16} color={mode === 'schedule' ? '#FF7F60' : '#94A3B8'} />
            <Text style={[styles.modeBtnText, mode === 'schedule' && styles.modeBtnTextActive]}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Type Selector */}
        <View style={styles.typeGrid}>
          {ACTIVITY_TYPES.map((t) => {
            const isActive = activityType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActivityType(t.key)}
                style={[styles.typeCard, isActive && { borderColor: t.color, backgroundColor: t.bgColor }]}
                activeOpacity={0.7}
              >
                <View style={[styles.typeIcon, { backgroundColor: isActive ? t.color : '#F1F5F9' }]}>
                  <Ionicons name={t.icon} size={20} color={isActive ? '#FFFFFF' : '#64748B'} />
                </View>
                <Text style={[styles.typeLabel, isActive && { color: t.color }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ────────────────────────────────────────────────── */}
        {/* SCHEDULE MODE FORM */}
        {/* ────────────────────────────────────────────────── */}
        {mode === 'schedule' && (
          <>
            {/* Date selector */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Date</Text>
              <View style={styles.dateNavRow}>
                <TouchableOpacity onPress={goToPrevDay} style={styles.dateArrow} activeOpacity={0.6}>
                  <Ionicons name="chevron-back" size={20} color="#0F172A" />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                  <Text style={styles.dateText}>{formatScheduleDate(scheduleDate)}</Text>
                  {!isToday(scheduleDate) && (
                    <TouchableOpacity onPress={goToToday} style={styles.todayPill} activeOpacity={0.7}>
                      <Text style={styles.todayPillText}>↩ Today</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={goToNextDay} style={styles.dateArrow} activeOpacity={0.6}>
                  <Ionicons name="chevron-forward" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Start time */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Start Time</Text>
              <View style={styles.scheduleTimeRow}>
                <View style={styles.timeDigitCol}>
                  <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setSchedHour(String(Math.min(12, (parseInt(schedHour) || 0) + 1)))}>
                    <Ionicons name="add" size={18} color="#FF7F60" />
                  </TouchableOpacity>
                  <RNTextInput
                    value={schedHour}
                    onChangeText={(t) => { const n = Math.min(12, Math.max(1, parseInt(t.replace(/[^0-9]/g, '')) || 0)); setSchedHour(String(n)); }}
                    keyboardType="numeric"
                    style={[styles.durationText, { width: 52 }]}
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setSchedHour(String(Math.max(1, (parseInt(schedHour) || 0) - 1)))}>
                    <Ionicons name="remove" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.durationColon}>:</Text>
                <View style={styles.timeDigitCol}>
                  <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setSchedMinute(String(Math.min(59, (parseInt(schedMinute) || 0) + 5)))}>
                    <Ionicons name="add" size={18} color="#FF7F60" />
                  </TouchableOpacity>
                  <RNTextInput
                    value={schedMinute}
                    onChangeText={(t) => { const n = Math.min(59, Math.max(0, parseInt(t.replace(/[^0-9]/g, '')) || 0)); setSchedMinute(String(n).padStart(2, '0')); }}
                    keyboardType="numeric"
                    style={[styles.durationText, { width: 52 }]}
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setSchedMinute(String(Math.max(0, (parseInt(schedMinute) || 0) - 5)))}>
                    <Ionicons name="remove" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={styles.timePeriodCol}>
                  <TouchableOpacity
                    style={[styles.periodBtn, schedPeriod === 'AM' && styles.periodBtnActive]}
                    activeOpacity={0.7}
                    onPress={() => setSchedPeriod('AM')}
                  >
                    <Text style={[styles.periodText, schedPeriod === 'AM' && styles.periodTextActive]}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.periodBtn, schedPeriod === 'PM' && styles.periodBtnActive]}
                    activeOpacity={0.7}
                    onPress={() => setSchedPeriod('PM')}
                  >
                    <Text style={[styles.periodText, schedPeriod === 'PM' && styles.periodTextActive]}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Duration range — hidden for meal (just start-time reminder) */}
            {activityType !== 'meal' && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Duration Range</Text>
                  <View style={styles.durationRangeRow}>
                    <View style={styles.durationRangeCol}>
                      <Text style={styles.durationRangeLabel}>Minimum</Text>
                      <View style={styles.durationRangeInputs}>
                        <View style={styles.timeDigitCol}>
                          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setMinDurationH(String(Math.min(23, (parseInt(minDurationH) || 0) + 1)))}>
                            <Ionicons name="add" size={16} color="#FF7F60" />
                          </TouchableOpacity>
                          <RNTextInput
                            value={minDurationH}
                            onChangeText={(t) => { const n = Math.min(23, Math.max(0, parseInt(t.replace(/[^0-9]/g, '')) || 0)); setMinDurationH(String(n)); }}
                            keyboardType="numeric"
                            style={[styles.durationText, { width: 44, fontSize: 24 }]}
                            maxLength={2}
                            selectTextOnFocus
                          />
                          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setMinDurationH(String(Math.max(0, (parseInt(minDurationH) || 0) - 1)))}>
                            <Ionicons name="remove" size={16} color="#64748B" />
                          </TouchableOpacity>
                          <Text style={styles.smallLabel}>h</Text>
                        </View>
                        <View style={styles.timeDigitCol}>
                          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setMinDurationM(String(Math.min(59, (parseInt(minDurationM) || 0) + 5)))}>
                            <Ionicons name="add" size={16} color="#FF7F60" />
                          </TouchableOpacity>
                          <RNTextInput
                            value={minDurationM}
                            onChangeText={(t) => { const n = Math.min(59, Math.max(0, parseInt(t.replace(/[^0-9]/g, '')) || 0)); setMinDurationM(String(n)); }}
                            keyboardType="numeric"
                            style={[styles.durationText, { width: 44, fontSize: 24 }]}
                            maxLength={2}
                            selectTextOnFocus
                          />
                          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setMinDurationM(String(Math.max(0, (parseInt(minDurationM) || 0) - 5)))}>
                            <Ionicons name="remove" size={16} color="#64748B" />
                          </TouchableOpacity>
                          <Text style={styles.smallLabel}>m</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.durationRangeDivider} />
                    <View style={styles.durationRangeCol}>
                      <Text style={styles.durationRangeLabel}>Maximum</Text>
                      <View style={styles.durationRangeInputs}>
                        <View style={styles.timeDigitCol}>
                          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setMaxDurationH(String(Math.min(23, (parseInt(maxDurationH) || 0) + 1)))}>
                            <Ionicons name="add" size={16} color="#FF7F60" />
                          </TouchableOpacity>
                          <RNTextInput
                            value={maxDurationH}
                            onChangeText={(t) => { const n = Math.min(23, Math.max(0, parseInt(t.replace(/[^0-9]/g, '')) || 0)); setMaxDurationH(String(n)); }}
                            keyboardType="numeric"
                            style={[styles.durationText, { width: 44, fontSize: 24 }]}
                            maxLength={2}
                            selectTextOnFocus
                          />
                          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setMaxDurationH(String(Math.max(0, (parseInt(maxDurationH) || 0) - 1)))}>
                            <Ionicons name="remove" size={16} color="#64748B" />
                          </TouchableOpacity>
                          <Text style={styles.smallLabel}>h</Text>
                        </View>
                        <View style={styles.timeDigitCol}>
                          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setMaxDurationM(String(Math.min(59, (parseInt(maxDurationM) || 0) + 5)))}>
                            <Ionicons name="add" size={16} color="#FF7F60" />
                          </TouchableOpacity>
                          <RNTextInput
                            value={maxDurationM}
                            onChangeText={(t) => { const n = Math.min(59, Math.max(0, parseInt(t.replace(/[^0-9]/g, '')) || 0)); setMaxDurationM(String(n)); }}
                            keyboardType="numeric"
                            style={[styles.durationText, { width: 44, fontSize: 24 }]}
                            maxLength={2}
                            selectTextOnFocus
                          />
                          <TouchableOpacity style={styles.stepperBtn} activeOpacity={0.6} onPress={() => setMaxDurationM(String(Math.max(0, (parseInt(maxDurationM) || 0) - 5)))}>
                            <Ionicons name="remove" size={16} color="#64748B" />
                          </TouchableOpacity>
                          <Text style={styles.smallLabel}>m</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Computed time range preview */}
                {(() => {
                  const range = computeScheduleRange();
                  const same = range.minEndTime === range.maxEndTime;
                  return (
                    <View style={[styles.card, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                      <Text style={[styles.cardTitle, { color: '#166534' }]}>Scheduled Time</Text>
                      <Text style={styles.rangePreviewText}>
                        <Text style={styles.rangePreviewTime}>{range.startTime}</Text>
                        {'  →  '}
                        {same ? (
                          <Text style={styles.rangePreviewTime}>{range.maxEndTime}</Text>
                        ) : (
                          <>
                            <Text style={styles.rangePreviewTime}>{range.minEndTime}</Text>
                            {' – '}
                            <Text style={styles.rangePreviewTime}>{range.maxEndTime}</Text>
                          </>
                        )}
                      </Text>
                      <Text style={styles.rangePreviewSub}>
                        {range.maxMins > 0
                          ? `Up to ${Math.floor(range.maxMins / 60)}h ${range.maxMins % 60}m max`
                          : 'Set a maximum duration'}
                      </Text>
                    </View>
                  );
                })()}

                {/* Screen category for scheduled screen time */}
                {activityType === 'screen_time' && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Category</Text>
                    <ChipSelector items={SCREEN_CATEGORIES} value={schedCategory} onChange={setSchedCategory} showIcon />
                  </View>
                )}
              </>
            )}

            {/* Meal type for scheduled meals */}
            {activityType === 'meal' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Meal Type</Text>
                <ChipSelector items={MEALS} value={schedMealType} onChange={setSchedMealType} />
                <Text style={styles.mealHint}>You'll get a reminder at this time.</Text>
              </View>
            )}
          </>
        )}

        {/* ────────────────────────────────────────────────── */}
        {/* LOG MODE FORM */}
        {/* ────────────────────────────────────────────────── */}
        {mode === 'log' && (
          <>
            {/* Time Range — sleep, nap, education, physical, screen_time */}
            {activityType === 'screen_time' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Screen Time</Text>
                <TimeRangeInput
                  startHour={screenStartH} startMinute={screenStartM} startPeriod={screenStartP}
                  endHour={screenEndH} endMinute={screenEndM} endPeriod={screenEndP}
                  onStartHourChange={setScreenStartH} onStartMinuteChange={setScreenStartM} onStartPeriodChange={setScreenStartP}
                  onEndHourChange={setScreenEndH} onEndMinuteChange={setScreenEndM} onEndPeriodChange={setScreenEndP}
                />
              </View>
            )}
            {activityType === 'sleep' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sleep Time</Text>
                <TimeRangeInput
                  startHour={sleepStartH} startMinute={sleepStartM} startPeriod={sleepStartP}
                  endHour={sleepEndH} endMinute={sleepEndM} endPeriod={sleepEndP}
                  onStartHourChange={setSleepStartH} onStartMinuteChange={setSleepStartM} onStartPeriodChange={setSleepStartP}
                  onEndHourChange={setSleepEndH} onEndMinuteChange={setSleepEndM} onEndPeriodChange={setSleepEndP}
                />
              </View>
            )}
            {activityType === 'nap' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Nap Time</Text>
                <TimeRangeInput
                  startHour={napStartH} startMinute={napStartM} startPeriod={napStartP}
                  endHour={napEndH} endMinute={napEndM} endPeriod={napEndP}
                  onStartHourChange={setNapStartH} onStartMinuteChange={setNapStartM} onStartPeriodChange={setNapStartP}
                  onEndHourChange={setNapEndH} onEndMinuteChange={setNapEndM} onEndPeriodChange={setNapEndP}
                />
              </View>
            )}
            {activityType === 'education' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Learning Time</Text>
                <TimeRangeInput
                  startHour={learnStartH} startMinute={learnStartM} startPeriod={learnStartP}
                  endHour={learnEndH} endMinute={learnEndM} endPeriod={learnEndP}
                  onStartHourChange={setLearnStartH} onStartMinuteChange={setLearnStartM} onStartPeriodChange={setLearnStartP}
                  onEndHourChange={setLearnEndH} onEndMinuteChange={setLearnEndM} onEndPeriodChange={setLearnEndP}
                />
              </View>
            )}
            {activityType === 'physical_activity' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Active Time</Text>
                <TimeRangeInput
                  startHour={activeStartH} startMinute={activeStartM} startPeriod={activeStartP}
                  endHour={activeEndH} endMinute={activeEndM} endPeriod={activeEndP}
                  onStartHourChange={setActiveStartH} onStartMinuteChange={setActiveStartM} onStartPeriodChange={setActiveStartP}
                  onEndHourChange={setActiveEndH} onEndMinuteChange={setActiveEndM} onEndPeriodChange={setActiveEndP}
                />
              </View>
            )}

            {/* Screen Time details */}
            {activityType === 'screen_time' && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Category</Text>
                  <ChipSelector items={SCREEN_CATEGORIES} value={screenCategory} onChange={setScreenCategory} showIcon />
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Device</Text>
                  <ChipSelector items={DEVICES} value={device} onChange={setDevice} showIcon />
                </View>
              </>
            )}

            {/* Sleep details */}
            {activityType === 'sleep' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sleep Quality</Text>
                <ChipSelector items={QUALITY} value={sleepQuality} onChange={setSleepQuality} showEmoji />
              </View>
            )}

            {/* Nap details */}
            {activityType === 'nap' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Nap Quality</Text>
                <ChipSelector items={QUALITY} value={napQuality} onChange={setNapQuality} showEmoji />
              </View>
            )}

            {/* Meal details */}
            {activityType === 'meal' && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Meal Time</Text>
                  <SingleTimeInput
                    hour={mealTimeH}
                    minute={mealTimeM}
                    period={mealTimeP}
                    onHourChange={setMealTimeH}
                    onMinuteChange={setMealTimeM}
                    onPeriodChange={setMealTimeP}
                  />
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Meal</Text>
                  <ChipSelector items={MEALS} value={mealType} onChange={setMealType} />
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>How was it?</Text>
                  <ChipSelector items={QUALITY} value={mealQuality} onChange={setMealQuality} showEmoji />
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Food Groups (select all that apply)</Text>
                  <MultiChipSelector items={FOOD_GROUPS} selected={foodGroups} onToggle={toggleFoodGroup} />
                </View>
              </>
            )}

            {/* Physical Activity details */}
            {activityType === 'physical_activity' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Activity</Text>
                <ChipSelector items={PHYSICAL} value={physicalType} onChange={setPhysicalType} />
              </View>
            )}

            {/* Education details */}
            {activityType === 'education' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Subject</Text>
                <ChipSelector items={SUBJECTS} value={subject} onChange={setSubject} />
              </View>
            )}
          </>
        )}

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          <RNTextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional — add any details..."
            multiline
            numberOfLines={3}
            style={styles.notesInput}
            placeholderTextColor="#94A3B8"
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={mode === 'schedule' ? handleSchedule : handleLog}
          disabled={loading || !selectedChild}
          activeOpacity={0.85}
          style={[styles.logButton, !selectedChild && styles.logButtonDisabled, loading && styles.logButtonLoading]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <View style={styles.spinner} />
              <Text style={styles.logButtonText}>{mode === 'schedule' ? 'Scheduling…' : 'Logging…'}</Text>
            </View>
          ) : (
            <>
              <Ionicons name={mode === 'schedule' ? 'calendar' : 'checkmark-circle'} size={20} color="#FFFFFF" />
              <Text style={styles.logButtonText}>
                {mode === 'schedule' ? `Schedule ${activeType.label}` : `Log ${activeType.label}`}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!selectedChild && (
          <TouchableOpacity style={styles.noChildHint} onPress={() => router.push('/child/wizard' as any)} activeOpacity={0.7}>
            <Ionicons name="information-circle-outline" size={16} color="#FF7F60" />
            <Text style={styles.noChildText}>Add a child profile to start logging</Text>
            <Ionicons name="chevron-forward" size={14} color="#FF7F60" />
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFBF6' },

  scrollContent: { padding: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  typeCard: {
    width: '30%', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFDFF', borderRadius: 16, borderWidth: 2, borderColor: '#E2E8F0',
    paddingVertical: 14, paddingHorizontal: 8,
  },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  card: {
    backgroundColor: '#FFFDFF', borderRadius: 18, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  // Duration
  durationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  durationCol: { alignItems: 'center', gap: 4 },
  stepperBtn: {
    width: 44, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  durationText: {
    fontSize: 36, fontWeight: '700', color: '#0F172A', textAlign: 'center',
    width: 64, paddingVertical: 4, borderBottomWidth: 2, borderBottomColor: '#E2E8F0',
  },
  durationColon: { fontSize: 28, fontWeight: '300', color: '#CBD5E1', marginBottom: 28 },
  durationLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  // Time Range Input
  timeRangeContainer: { alignItems: 'center', width: '100%' },
  timeRangeRow: { flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' },
  timeRangeArrow: { paddingVertical: 2 },
  timeBlock: { alignItems: 'center' },
  timeBlockLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeBlockRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  timeDigitCol: { alignItems: 'center', gap: 3 },
  timeColon: { fontSize: 24, fontWeight: '300', color: '#CBD5E1', marginBottom: 24 },
  timePeriodCol: { marginLeft: 3, gap: 3, marginBottom: 28 },
  singleTimeContainer: { alignItems: 'center', width: '100%' },
  singleTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  singleTimeColon: { fontSize: 28, fontWeight: '300', color: '#CBD5E1', marginBottom: 28 },
  mealTimeInputBox: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  mealTimeInput: {
    width: '100%',
    height: '100%',
    padding: 0,
    margin: 0,
    fontSize: 30,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  periodBtn: {
    paddingHorizontal: 6, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: 'transparent',
  },
  periodBtnActive: { backgroundColor: '#FFF0ED', borderColor: '#FF7F60' },
  periodText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  periodTextActive: { color: '#FF7F60' },
  durationCalc: { fontSize: 14, fontWeight: '600', color: '#FF7F60', marginTop: 8 },
  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: '#FFF0ED', borderColor: '#FF7F60' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  chipTextActive: { color: '#FF7F60' },
  // Notes
  notesInput: {
    backgroundColor: '#FEFBF6', borderRadius: 14, fontSize: 14, color: '#0F172A',
    minHeight: 80, padding: 14, borderWidth: 1, borderColor: '#E2E8F0',
  },
  // Button
  logButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FF7F60', borderRadius: 16, height: 56, marginTop: 8,
    shadowColor: '#FF7F60', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
  },
  logButtonDisabled: { backgroundColor: '#93C5FD', shadowOpacity: 0, elevation: 0 },
  logButtonLoading: { backgroundColor: '#60A5FA' },
  logButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spinner: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#FFFFFF', borderTopColor: 'transparent' },
  noChildHint: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 16, padding: 12 },
  noChildText: { fontSize: 13, color: '#FF7F60', fontWeight: '500' },
  // Success
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFDFF', padding: 24 },
  successCheck: { marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  // Error Banner
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
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: '#FFFDFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modeBtnTextActive: {
    color: '#FF7F60',
  },

  // Schedule form
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  todayPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFF0ED',
  },
  todayPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF7F60',
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  durationRangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 16,
  },
  durationRangeCol: {
    alignItems: 'center',
    gap: 8,
  },
  durationRangeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationRangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationRangeDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    alignSelf: 'stretch',
    marginVertical: 8,
  },
  smallLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  mealHint: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 10,
    textAlign: 'center',
  },
  rangePreviewText: {
    fontSize: 15,
    color: '#166534',
    textAlign: 'center',
    marginBottom: 6,
  },
  rangePreviewTime: {
    fontWeight: '700',
    fontSize: 18,
    color: '#15803D',
  },
  rangePreviewSub: {
    fontSize: 12,
    color: '#22C55E',
    textAlign: 'center',
    fontWeight: '500',
  },
});
