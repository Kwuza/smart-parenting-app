import { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, TextInput as RNTextInput, Modal, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../stores/auth';
import { logActivity, ActivityType, Child } from '../../lib/api';

type ActivityTypeExtended = ActivityType | 'nap' | 'physical_activity';

interface TypeConfig {
  key: ActivityTypeExtended;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const ACTIVITY_TYPES: TypeConfig[] = [
  { key: 'screen_time', label: 'Screen', icon: 'phone-portrait-outline', color: '#3B82F6', bgColor: '#EFF6FF' },
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
          <Ionicons name="add" size={18} color="#3B82F6" />
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
          <Ionicons name="add" size={18} color="#3B82F6" />
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
              <Ionicons name={item.icon as any} size={16} color={isActive ? '#3B82F6' : '#64748B'} style={{ marginRight: 4 }} />
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
            {isActive && <Ionicons name="checkmark" size={14} color="#3B82F6" style={{ marginLeft: 2 }} />}
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
  const [showChildPicker, setShowChildPicker] = useState(false);
  const { selectedChild, children, selectChild } = useApp();
  const router = useRouter();

  // Duration (shared across screen, sleep, nap, education, physical)
  const [hours, setHours] = useState('1');
  const [minutes, setMinutes] = useState('30');

  // Screen time
  const [device, setDevice] = useState('phone');

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

  const toggleFoodGroup = (key: string) => {
    setFoodGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

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
          value = { hours: parseInt(hours) || 0, minutes: parseInt(minutes) || 0, quality: sleepQuality };
          break;
        case 'nap':
          value = { hours: parseInt(hours) || 0, minutes: parseInt(minutes) || 0, quality: napQuality };
          break;
        case 'meal':
          value = {
            meal_type: mealType,
            quality: mealQuality,
            food_groups: foodGroups,
          };
          break;
        case 'physical_activity':
          value = {
            hours: parseInt(hours) || 0,
            minutes: parseInt(minutes) || 0,
            activity: physicalType,
          };
          break;
        case 'education':
          value = { hours: parseInt(hours) || 0, minutes: parseInt(minutes) || 0, subject };
          break;
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Activity</Text>
        {selectedChild ? (
          <TouchableOpacity
            style={styles.headerChild}
            onPress={() => setShowChildPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.headerChildAvatar}>
              <Text style={styles.headerChildAvatarText}>
                {selectedChild.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.headerChildText}>{selectedChild.name}</Text>
            {children.length > 1 && (
              <Ionicons name="chevron-down" size={14} color="#3B82F6" />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Child Picker Modal */}
      <Modal visible={showChildPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowChildPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log for whom?</Text>
            {children.map((child) => {
              const isSelected = child.id === selectedChild?.id;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.modalItem, isSelected && styles.modalItemActive]}
                  onPress={() => {
                    selectChild(child);
                    setShowChildPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.modalAvatar, isSelected && styles.modalAvatarActive]}>
                    <Text style={[styles.modalAvatarText, isSelected && styles.modalAvatarTextActive]}>
                      {child.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                    {child.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.modalAddBtn}
              onPress={() => {
                setShowChildPicker(false);
                router.push('/child/new');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
              <Text style={styles.modalAddText}>Add another child</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Type Selector */}
        <Text style={styles.sectionLabel}>What are you logging?</Text>
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

        {/* Duration (screen, sleep, nap, education, physical) */}
        {activityType !== 'meal' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Duration</Text>
            <DurationInput hours={hours} minutes={minutes} onHoursChange={setHours} onMinutesChange={setMinutes} />
          </View>
        )}

        {/* Screen Time details */}
        {activityType === 'screen_time' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Device</Text>
            <ChipSelector items={DEVICES} value={device} onChange={setDevice} showIcon />
          </View>
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
          <TouchableOpacity style={styles.noChildHint} onPress={() => router.push('/child/new')} activeOpacity={0.7}>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#0F172A' },
  headerChild: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  headerChildAvatar: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerChildAvatarText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  headerChildText: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32,
  },
  modalContent: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16, textAlign: 'center' },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, backgroundColor: '#F8FAFC',
    marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  modalItemActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  modalAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  modalAvatarActive: { backgroundColor: '#3B82F6' },
  modalAvatarText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  modalAvatarTextActive: { color: '#FFFFFF' },
  modalItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0F172A' },
  modalItemTextActive: { fontWeight: '600' },
  modalAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center', padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#DBEAFE', borderStyle: 'dashed',
    marginTop: 4,
  },
  modalAddText: { fontSize: 14, fontWeight: '500', color: '#3B82F6' },
  scrollContent: { padding: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeCard: {
    width: '30%', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#E2E8F0',
    paddingVertical: 14, paddingHorizontal: 8,
  },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, marginBottom: 14,
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
  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  chipTextActive: { color: '#3B82F6' },
  // Notes
  notesInput: {
    backgroundColor: '#F8FAFC', borderRadius: 14, fontSize: 14, color: '#0F172A',
    minHeight: 80, padding: 14, borderWidth: 1, borderColor: '#E2E8F0',
  },
  // Button
  logButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#3B82F6', borderRadius: 16, height: 56, marginTop: 8,
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
  },
  logButtonDisabled: { backgroundColor: '#93C5FD', shadowOpacity: 0, elevation: 0 },
  logButtonLoading: { backgroundColor: '#60A5FA' },
  logButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spinner: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#FFFFFF', borderTopColor: 'transparent' },
  noChildHint: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 16, padding: 12 },
  noChildText: { fontSize: 13, color: '#3B82F6', fontWeight: '500' },
  // Success
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 24 },
  successCheck: { marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});
