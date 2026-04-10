import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Text, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../stores/auth';
import { logActivity, ActivityType } from '../../lib/api';

const ACTIVITY_TYPES = [
  { key: 'screen_time' as ActivityType, label: 'Screen' },
  { key: 'sleep' as ActivityType, label: 'Sleep' },
  { key: 'meal' as ActivityType, label: 'Meals' },
  { key: 'education' as ActivityType, label: 'Learn' },
];

const DEVICES = [
  { key: 'phone', icon: 'phone-portrait-outline' as const, label: 'Phone' },
  { key: 'tablet', icon: 'tablet-portrait-outline' as const, label: 'Tablet' },
  { key: 'tv', icon: 'tv-outline' as const, label: 'TV' },
  { key: 'computer', icon: 'desktop-outline' as const, label: 'PC' },
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

function SegmentedControl({
  value,
  onChange,
}: {
  value: ActivityType;
  onChange: (v: ActivityType) => void;
}) {
  return (
    <View style={styles.segmentContainer}>
      {ACTIVITY_TYPES.map((t) => {
        const isActive = value === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

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

export default function LogActivityScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [activityType, setActivityType] = useState<ActivityType>(
    (type as ActivityType) || 'screen_time'
  );
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { selectedChild } = useApp();
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

  const handleLog = async () => {
    if (!selectedChild) {
      Alert.alert('Error', 'No child selected');
      return;
    }
    setLoading(true);
    try {
      let value: Record<string, any> = {};
      switch (activityType) {
        case 'screen_time':
          value = {
            hours: parseInt(hours) || 0,
            minutes: parseInt(minutes) || 0,
            device,
          };
          break;
        case 'sleep':
          value = {
            hours: parseInt(sleepHours) || 0,
            minutes: parseInt(sleepMinutes) || 0,
            quality: sleepQuality,
          };
          break;
        case 'meal':
          value = { meal_type: mealType, quality: mealQuality };
          break;
        case 'education':
          value = {
            hours: parseInt(eduHours) || 0,
            minutes: parseInt(eduMinutes) || 0,
            subject,
          };
          break;
      }
      if (notes) value.notes = notes;

      await logActivity(selectedChild.id, activityType, value);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 1500);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const durationLabel =
    activityType === 'sleep'
      ? 'Sleep Duration'
      : activityType === 'education'
        ? 'Learning Time'
        : 'Screen Time';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Activity</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Segmented Control */}
        <SegmentedControl value={activityType} onChange={setActivityType} />

        {/* Duration (screen time, sleep, education) */}
        {activityType !== 'meal' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{durationLabel}</Text>
            <View style={styles.durationRow}>
              <View style={styles.durationField}>
                <TextInput
                  value={activityType === 'sleep' ? sleepHours : activityType === 'education' ? eduHours : hours}
                  onChangeText={activityType === 'sleep' ? setSleepHours : activityType === 'education' ? setEduHours : setHours}
                  keyboardType="numeric"
                  style={styles.durationInput}
                  underlineColorAndroid="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={styles.durationInputContent}
                  maxLength={2}
                />
                <Text style={styles.durationLabel}>hrs</Text>
              </View>
              <View style={styles.durationField}>
                <TextInput
                  value={activityType === 'sleep' ? sleepMinutes : activityType === 'education' ? eduMinutes : minutes}
                  onChangeText={activityType === 'sleep' ? setSleepMinutes : activityType === 'education' ? setEduMinutes : setMinutes}
                  keyboardType="numeric"
                  style={styles.durationInput}
                  underlineColorAndroid="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={styles.durationInputContent}
                  maxLength={2}
                />
                <Text style={styles.durationLabel}>min</Text>
              </View>
            </View>
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
              <Text style={styles.cardTitle}>Sleep Quality</Text>
              <ChipSelector items={QUALITY} value={sleepQuality} onChange={setSleepQuality} />
            </>
          )}
          {activityType === 'meal' && (
            <>
              <Text style={styles.cardTitle}>Meal</Text>
              <ChipSelector items={MEALS} value={mealType} onChange={setMealType} />
              <Text style={[styles.cardTitle, { marginTop: 16 }]}>Quality</Text>
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
          <Text style={styles.cardTitle}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional details..."
            multiline
            numberOfLines={3}
            style={styles.notesInput}
            underlineColorAndroid="transparent"
            activeUnderlineColor="transparent"
            placeholderTextColor="#94A3B8"
            contentStyle={styles.notesContent}
          />
        </View>

        {/* Bottom spacer for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Log Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handleLog}
          disabled={loading || showSuccess}
          activeOpacity={0.85}
          style={styles.logButton}
        >
          <Text style={styles.logButtonText}>
            {showSuccess
              ? 'Logged!'
              : loading
                ? 'Logging...'
                : `Log ${ACTIVITY_TYPES.find((t) => t.key === activityType)?.label}`}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(241,245,249,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#0F172A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 12,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationField: {
    flex: 1,
    alignItems: 'center',
  },
  durationInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    height: 64,
  },
  durationInputContent: {
    paddingVertical: 0,
  },
  durationLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
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
    borderWidth: 1,
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
  notesInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 0,
  },
  notesContent: {
    padding: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  logButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
