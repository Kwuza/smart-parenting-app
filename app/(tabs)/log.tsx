import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../stores/auth';
import { logActivity, ActivityType } from '../../lib/api';

const ACTIVITY_TYPES: { key: ActivityType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }[] = [
  { key: 'screen_time', label: 'Screen', icon: 'phone-portrait-outline', color: '#3B82F6', bgColor: '#EFF6FF' },
  { key: 'sleep', label: 'Sleep', icon: 'moon-outline', color: '#10B981', bgColor: '#ECFDF5' },
  { key: 'meal', label: 'Meals', icon: 'restaurant-outline', color: '#F59E0B', bgColor: '#FFFBEB' },
  { key: 'education', label: 'Learn', icon: 'school-outline', color: '#8B5CF6', bgColor: '#F5F3FF' },
];

const DEVICES = [
  { key: 'phone', label: 'Phone', icon: 'phone-portrait-outline' as const },
  { key: 'tablet', label: 'Tablet', icon: 'tablet-portrait-outline' as const },
  { key: 'tv', label: 'TV', icon: 'tv-outline' as const },
  { key: 'computer', label: 'PC', icon: 'desktop-outline' as const },
];

const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
];

const QUALITY = [
  { key: 'poor', label: 'Poor' },
  { key: 'fair', label: 'Fair' },
  { key: 'good', label: 'Good' },
];

const SUBJECTS = [
  { key: 'reading', label: 'Reading' },
  { key: 'homework', label: 'Homework' },
  { key: 'learning_app', label: 'App' },
];

function ChipSelector({
  items,
  value,
  onChange,
  showIcon = false,
}: {
  items: { key: string; label: string; icon?: string }[];
  value: string;
  onChange: (v: string) => void;
  showIcon?: boolean;
}) {
  return (
    <View style={styles.chipRow}>
      {items.map((item) => {
        const isActive = value === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.chip, isActive && styles.chipActive]}
            activeOpacity={0.7}
          >
            {showIcon && item.icon && (
              <Ionicons
                name={item.icon as any}
                size={16}
                color={isActive ? '#3B82F6' : '#64748B'}
                style={{ marginRight: 6 }}
              />
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
  return (
    <View style={styles.durationRow}>
      <View style={styles.durationField}>
        <TouchableOpacity
          style={styles.durationStepper}
          onPress={() => onHoursChange(String(Math.min(23, (parseInt(hours) || 0) + 1)))}
          activeOpacity={0.6}
        >
          <Ionicons name="add" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.durationValue}>{hours}</Text>
        <TouchableOpacity
          style={styles.durationStepper}
          onPress={() => onHoursChange(String(Math.max(0, (parseInt(hours) || 0) - 1)))}
          activeOpacity={0.6}
        >
          <Ionicons name="remove" size={20} color="#64748B" />
        </TouchableOpacity>
        <Text style={styles.durationLabel}>hrs</Text>
      </View>
      <View style={styles.durationDivider} />
      <View style={styles.durationField}>
        <TouchableOpacity
          style={styles.durationStepper}
          onPress={() => onMinutesChange(String(Math.min(59, (parseInt(minutes) || 0) + 5)))}
          activeOpacity={0.6}
        >
          <Ionicons name="add" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.durationValue}>{minutes}</Text>
        <TouchableOpacity
          style={styles.durationStepper}
          onPress={() => onMinutesChange(String(Math.max(0, (parseInt(minutes) || 0) - 5)))}
          activeOpacity={0.6}
        >
          <Ionicons name="remove" size={20} color="#64748B" />
        </TouchableOpacity>
        <Text style={styles.durationLabel}>min</Text>
      </View>
    </View>
  );
}

export default function LogActivityScreen() {
  const [activityType, setActivityType] = useState<ActivityType>('screen_time');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { selectedChild, children } = useApp();
  const router = useRouter();

  // Screen time
  const [hours, setHours] = useState('1');
  const [minutes, setMinutes] = useState('30');
  const [device, setDevice] = useState('phone');

  // Sleep
  const [sleepHours, setSleepHours] = useState('8');
  const [sleepMinutes, setSleepMinutes] = useState('0');
  const [sleepQuality, setSleepQuality] = useState('good');

  // Meal
  const [mealType, setMealType] = useState('lunch');
  const [mealQuality, setMealQuality] = useState('good');

  // Education
  const [eduHours, setEduHours] = useState('0');
  const [eduMinutes, setEduMinutes] = useState('45');
  const [subject, setSubject] = useState('reading');

  // Notes
  const [notes, setNotes] = useState('');

  const activeType = ACTIVITY_TYPES.find((t) => t.key === activityType)!;

  const handleLog = async () => {
    if (!selectedChild) {
      Alert.alert('No child selected', 'Add a child profile first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Child', onPress: () => router.push('/child/new') },
      ]);
      return;
    }

    setLoading(true);
    try {
      let value: Record<string, any> = {};
      switch (activityType) {
        case 'screen_time':
          value = { hours: parseInt(hours) || 0, minutes: parseInt(minutes) || 0, device };
          break;
        case 'sleep':
          value = { hours: parseInt(sleepHours) || 0, minutes: parseInt(sleepMinutes) || 0, quality: sleepQuality };
          break;
        case 'meal':
          value = { meal_type: mealType, quality: mealQuality };
          break;
        case 'education':
          value = { hours: parseInt(eduHours) || 0, minutes: parseInt(eduMinutes) || 0, subject };
          break;
      }
      if (notes) value.notes = notes;

      await logActivity(selectedChild.id, activityType, value);
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Activity</Text>
        {selectedChild ? (
          <View style={styles.headerChild}>
            <Text style={styles.headerChildText}>{selectedChild.name}</Text>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Activity Type Selector — Large cards */}
        <Text style={styles.sectionLabel}>What are you logging?</Text>
        <View style={styles.typeGrid}>
          {ACTIVITY_TYPES.map((t) => {
            const isActive = activityType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActivityType(t.key)}
                style={[
                  styles.typeCard,
                  isActive && { borderColor: t.color, backgroundColor: t.bgColor },
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.typeIcon, { backgroundColor: isActive ? t.color : '#F1F5F9' }]}>
                  <Ionicons name={t.icon} size={22} color={isActive ? '#FFFFFF' : '#64748B'} />
                </View>
                <Text style={[styles.typeLabel, isActive && { color: t.color }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duration (screen, sleep, education) */}
        {activityType !== 'meal' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Duration</Text>
            <DurationInput
              hours={activityType === 'sleep' ? sleepHours : activityType === 'education' ? eduHours : hours}
              minutes={activityType === 'sleep' ? sleepMinutes : activityType === 'education' ? eduMinutes : minutes}
              onHoursChange={activityType === 'sleep' ? setSleepHours : activityType === 'education' ? setEduHours : setHours}
              onMinutesChange={activityType === 'sleep' ? setSleepMinutes : activityType === 'education' ? setEduMinutes : setMinutes}
            />
          </View>
        )}

        {/* Activity-specific options */}
        <View style={styles.card}>
          {activityType === 'screen_time' && (
            <>
              <Text style={styles.cardTitle}>Device</Text>
              <ChipSelector
                items={DEVICES.map((d) => ({ key: d.key, label: d.label, icon: d.icon }))}
                value={device}
                onChange={setDevice}
                showIcon
              />
            </>
          )}
          {activityType === 'sleep' && (
            <>
              <Text style={styles.cardTitle}>Quality</Text>
              <ChipSelector items={QUALITY} value={sleepQuality} onChange={setSleepQuality} />
            </>
          )}
          {activityType === 'meal' && (
            <>
              <Text style={styles.cardTitle}>Meal</Text>
              <ChipSelector items={MEALS} value={mealType} onChange={setMealType} />
              <Text style={[styles.cardTitle, { marginTop: 20 }]}>Quality</Text>
              <ChipSelector items={QUALITY} value={mealQuality} onChange={setMealQuality} />
            </>
          )}
          {activityType === 'education' && (
            <>
              <Text style={styles.cardTitle}>Subject</Text>
              <ChipSelector items={SUBJECTS} value={subject} onChange={setSubject} />
            </>
          )}
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional — add any details..."
            multiline
            numberOfLines={3}
            style={styles.notesInput}
            underlineColorAndroid="transparent"
            activeUnderlineColor="transparent"
            placeholderTextColor="#94A3B8"
            contentStyle={styles.notesContent}
          />
        </View>

        {/* Log Button — in flow, not fixed */}
        <TouchableOpacity
          onPress={handleLog}
          disabled={loading || !selectedChild}
          activeOpacity={0.85}
          style={[
            styles.logButton,
            !selectedChild && styles.logButtonDisabled,
            loading && styles.logButtonLoading,
          ]}
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

        {/* No child hint */}
        {!selectedChild && (
          <TouchableOpacity
            style={styles.noChildHint}
            onPress={() => router.push('/child/new')}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
            <Text style={styles.noChildText}>Add a child profile to start logging</Text>
            <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  headerChild: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerChildText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  scrollContent: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  // Type selector
  typeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  // Duration
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  durationField: {
    alignItems: 'center',
    gap: 4,
  },
  durationStepper: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#0F172A',
    marginVertical: 4,
  },
  durationLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  durationDivider: {
    width: 1,
    height: 80,
    backgroundColor: '#E2E8F0',
  },
  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#3B82F6',
  },
  // Notes
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesContent: {
    padding: 14,
  },
  // Log button
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    height: 56,
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  logButtonDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0,
    elevation: 0,
  },
  logButtonLoading: {
    backgroundColor: '#60A5FA',
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderTopColor: 'transparent',
  },
  // No child hint
  noChildHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
  },
  noChildText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  successCheck: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
