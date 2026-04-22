import { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, TextInput as RNTextInput, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../stores/auth';
import { logActivity, ActivityType, Child } from '../../lib/api';
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

// --- Duration Input with both stepper and text ---
function DurationInput({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
}: {
  hours: string;
  minutes: string;
  onHoursChange: (v: string) => void;
  onMinutesChange: (v: string) => void;
}) {
  const hRef = useRef<RNTextInput>(null);
  const mRef = useRef<RNTextInput>(null);

  return (
    <View style={styles.durationRow}>
      <View style={styles.durationCol}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onHoursChange(String(Math.min(23, (parseInt(hours) || 0) + 1)))}
          activeOpacity={0.6}
        >
          <Ionicons name="add" size={18} color="#FF7F60" />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={1} onPress={() => hRef.current?.focus()}>
          <RNTextInput
            ref={hRef}
            value={hours}
            onChangeText={(t) => {
              const cleaned = t.replace(/[^0-9]/g, '');
              const num = parseInt(cleaned) || 0;
              onHoursChange(String(Math.min(23, num)));
            }}
            keyboardType="numeric"
            style={styles.durationText}
            maxLength={2}
            selectTextOnFocus
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onHoursChange(String(Math.max(0, (parseInt(hours) || 0) - 1)))}
          activeOpacity={0.6}
        >
          <Ionicons name="remove" size={18} color="#64748B" />
        </TouchableOpacity>
        <Text style={styles.durationLabel}>hrs</Text>
      </View>
      <Text style={styles.durationColon}>:</Text>
      <View style={styles.durationCol}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onMinutesChange(String(Math.min(59, (parseInt(minutes) || 0) + 5)))}
          activeOpacity={0.6}
        >
          <Ionicons name="add" size={18} color="#FF7F60" />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={1} onPress={() => mRef.current?.focus()}>
          <RNTextInput
            ref={mRef}
            value={minutes}
            onChangeText={(t) => {
              const cleaned = t.replace(/[^0-9]/g, '');
              const num = parseInt(cleaned) || 0;
              onMinutesChange(String(Math.min(59, num)));
            }}
            keyboardType="numeric"
            style={styles.durationText}
            maxLength={2}
            selectTextOnFocus
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onMinutesChange(String(Math.max(0, (parseInt(minutes) || 0) - 5)))}
          activeOpacity={0.6}
        >
          <Ionicons name="remove" size={18} color="#64748B" />
        </TouchableOpacity>
        <Text style={styles.durationLabel}>min</Text>
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
  const [activityType, setActivityType] = useState<ActivityTypeExtended>('screen_time');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { selectedChild, children, selectChild } = useApp();
  const router = useRouter();

  // Duration (screen_time only — uses hours/minutes)
  const [hours, setHours] = useState('1');
  const [minutes, setMinutes] = useState('30');

  // Time range (sleep, nap, education, physical — start/end, duration auto-calculated)
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

  // Physical
  const [physicalType, setPhysicalType] = useState('running');

  // Education
  const [subject, setSubject] = useState('reading');

  // Notes (shared)
  const [notes, setNotes] = useState('');

  const activeType = ACTIVITY_TYPES.find((t) => t.key === activityType)!;

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

  const handleLog = async () => {
    if (!selectedChild) {
      Alert.alert('No child selected', 'Add a child profile first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Child', onPress: () => router.push('/child/wizard' as any) },
      ]);
      return;
    }

    setLoading(true);
    try {
      let value: Record<string, any> = {};
      switch (activityType) {
        case 'screen_time':
          value = { hours: parseInt(hours) || 0, minutes: parseInt(minutes) || 0, device, category: screenCategory };
          break;
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
        physical_activity: 'education',
        education: 'education',
      };
      const dbType = typeMapping[activityType] || 'screen_time';

      await logActivity(selectedChild.id, dbType, value);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.back();
      }, 1800);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to log activity');
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
        <Text style={styles.successTitle}>Logged!</Text>
        <Text style={styles.successSubtitle}>
          {activeType.label} recorded for {selectedChild?.name || 'your child'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Log Activity" icon="create-outline" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

        {/* Duration — screen_time only (manual hours/minutes) */}
        {activityType === 'screen_time' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Duration</Text>
            <DurationInput hours={hours} minutes={minutes} onHoursChange={setHours} onMinutesChange={setMinutes} />
          </View>
        )}

        {/* Time Range — sleep, nap, education, physical */}
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

        {/* Log Button */}
        <TouchableOpacity
          onPress={handleLog}
          disabled={loading || !selectedChild}
          activeOpacity={0.85}
          style={[styles.logButton, !selectedChild && styles.logButtonDisabled, loading && styles.logButtonLoading]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <View style={styles.spinner} />
              <Text style={styles.logButtonText}>Logging…</Text>
            </View>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.logButtonText}>Log {activeType.label}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFBF6' },

  scrollContent: { padding: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
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
});
