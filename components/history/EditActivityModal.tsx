import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Activity, ActivityType, UpdateActivityInput, ActivityValue } from '../../lib/api';
import {
  ACTIVITY_TYPE_CONFIG,
  DEVICES,
  EDUCATION_SUBJECT_OPTIONS,
  FOOD_GROUPS,
  MEALS,
  PHYSICAL_ACTIVITY_OPTIONS,
  QUALITY,
  SCREEN_CATEGORIES,
  buildUpdatedActivityValue,
  type DeviceKey,
  type EducationSubjectKey,
  type MealKey,
  type PhysicalActivityKey,
  type QualityKey,
  type ScreenCategoryKey,
} from '../../lib/activity-values';

interface EditActivityModalProps {
  visible: boolean;
  activity: Activity | null;
  childName?: string;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (updates: UpdateActivityInput) => void;
}

type Period = 'AM' | 'PM';

interface TimeParts {
  hour: string;
  minute: string;
  period: Period;
}

interface ValidationState {
  recordedDate?: string;
  recordedTime?: string;
  startTime?: string;
  endTime?: string;
  mealType?: string;
}

const DEFAULT_START: TimeParts = { hour: '8', minute: '00', period: 'AM' };
const DEFAULT_END: TimeParts = { hour: '8', minute: '30', period: 'AM' };

function readString(value: ActivityValue | undefined, key: string): string | null {
  const raw = value?.[key];
  return typeof raw === 'string' ? raw : null;
}

function readNumber(value: ActivityValue | undefined, key: string): number {
  const raw = value?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function readStringArray(value: ActivityValue | undefined, key: string): string[] {
  const raw = value?.[key];
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

function minuteText(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 2);
}

function hourText(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 2);
}

function padMinute(value: string): string {
  const digits = minuteText(value);
  if (!digits) return '';
  return String(Math.min(59, Math.max(0, Number(digits)))).padStart(2, '0');
}

function sanitizeHour(value: string): string {
  const digits = hourText(value);
  if (!digits) return '';
  return String(Math.min(12, Math.max(1, Number(digits))));
}

function isValidTime(parts: TimeParts): boolean {
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  return (
    parts.hour.length > 0 &&
    parts.minute.length > 0 &&
    Number.isFinite(hour) &&
    Number.isFinite(minute) &&
    hour >= 1 &&
    hour <= 12 &&
    minute >= 0 &&
    minute <= 59
  );
}

function parseTimeLabel(value: string | null | undefined, fallback: TimeParts): TimeParts {
  if (!value) return fallback;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return fallback;
  return {
    hour: sanitizeHour(match[1]),
    minute: padMinute(match[2]),
    period: match[3].toUpperCase() === 'PM' ? 'PM' : 'AM',
  };
}

function formatTimeParts(parts: TimeParts): string {
  return `${sanitizeHour(parts.hour)}:${padMinute(parts.minute)} ${parts.period}`;
}

function partsToMinutes(parts: TimeParts): number {
  if (!isValidTime(parts)) return Number.NaN;
  let hour = Number(sanitizeHour(parts.hour));
  const minute = Number(padMinute(parts.minute));
  if (parts.period === 'AM' && hour === 12) hour = 0;
  if (parts.period === 'PM' && hour !== 12) hour += 12;
  return hour * 60 + minute;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function recordedTimeParts(date: Date): TimeParts {
  const hours = date.getHours();
  const period: Period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return { hour: String(hour12), minute: String(date.getMinutes()).padStart(2, '0'), period };
}

function parseDateKey(value: string): { date?: Date; error?: string } {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { error: 'Use YYYY-MM-DD format.' };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { error: 'Enter a valid calendar date.' };
  }
  return { date };
}

function buildRecordedAt(dateKey: string, time: TimeParts): { iso?: string; errors: ValidationState } {
  const parsed = parseDateKey(dateKey);
  const errors: ValidationState = {};
  if (parsed.error || !parsed.date) errors.recordedDate = parsed.error ?? 'Date is required.';
  const hour = Number(sanitizeHour(time.hour));
  const minute = Number(padMinute(time.minute));
  if (!isValidTime(time) || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    errors.recordedTime = 'Enter a valid recorded time.';
  }
  if (Object.keys(errors).length > 0 || !parsed.date) return { errors };
  let fullHour = hour;
  if (time.period === 'AM' && fullHour === 12) fullHour = 0;
  if (time.period === 'PM' && fullHour !== 12) fullHour += 12;
  const recorded = new Date(parsed.date);
  recorded.setHours(fullHour, minute, 0, 0);
  return { iso: recorded.toISOString(), errors };
}

function getDefaultTypeFields(type: ActivityType) {
  return {
    start: DEFAULT_START,
    end: DEFAULT_END,
    quality: 'good' as QualityKey,
    device: 'tablet' as DeviceKey,
    category: 'leisure' as ScreenCategoryKey,
    mealType: 'lunch' as MealKey,
    foodGroups: [] as string[],
    physicalActivity: 'playground' as PhysicalActivityKey,
    subject: 'reading' as EducationSubjectKey,
    notes: '',
    type,
  };
}

function timeDuration(type: ActivityType, start: TimeParts, end: TimeParts): { hours: number; minutes: number; helper?: string; error?: string } {
  if (!isValidTime(start)) return { hours: 0, minutes: 0, error: 'Enter a valid start time.' };
  if (!isValidTime(end)) return { hours: 0, minutes: 0, error: 'Enter a valid end time.' };
  const startMinutes = partsToMinutes(start);
  let endMinutes = partsToMinutes(end);
  let helper: string | undefined;
  if (endMinutes <= startMinutes && type === 'sleep') {
    endMinutes += 24 * 60;
    helper = 'Ends the next morning';
  }
  const diff = endMinutes - startMinutes;
  if (diff <= 0) return { hours: 0, minutes: 0, error: 'End time must be after start time.' };
  return { hours: Math.floor(diff / 60), minutes: diff % 60, helper };
}

function TimeInput({ label, value, onChange, error }: { label: string; value: TimeParts; onChange: (value: TimeParts) => void; error?: string }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.timeRow, error && styles.inputWrapError]}>
        <View style={styles.timeInputBox}>
          <RNTextInput
            value={value.hour}
            onChangeText={text => onChange({ ...value, hour: hourText(text) })}
            onBlur={() => onChange({ ...value, hour: sanitizeHour(value.hour) || '1' })}
            keyboardType="number-pad"
            maxLength={2}
            style={styles.timeInputText}
            textAlign="center"
            textAlignVertical="center"
          />
        </View>
        <Text style={styles.timeColon}>:</Text>
        <View style={styles.timeInputBox}>
          <RNTextInput
            value={value.minute}
            onChangeText={text => onChange({ ...value, minute: minuteText(text) })}
            onBlur={() => onChange({ ...value, minute: padMinute(value.minute) || '00' })}
            keyboardType="number-pad"
            maxLength={2}
            style={styles.timeInputText}
            textAlign="center"
            textAlignVertical="center"
          />
        </View>
        <View style={styles.periodStack}>
          {(['AM', 'PM'] as const).map(period => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, value.period === period && styles.periodButtonActive]}
              onPress={() => onChange({ ...value, period })}
              activeOpacity={0.75}
            >
              <Text style={[styles.periodText, value.period === period && styles.periodTextActive]}>{period}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function Chip<OptionKey extends string>({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipActive]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function EditActivityModal({
  visible,
  activity,
  childName,
  loading,
  error,
  onCancel,
  onSave,
}: EditActivityModalProps) {
  const [type, setType] = useState<ActivityType>('screen_time');
  const [recordedDate, setRecordedDate] = useState('');
  const [recordedTime, setRecordedTime] = useState<TimeParts>(DEFAULT_START);
  const [start, setStart] = useState<TimeParts>(DEFAULT_START);
  const [end, setEnd] = useState<TimeParts>(DEFAULT_END);
  const [quality, setQuality] = useState<QualityKey>('good');
  const [device, setDevice] = useState<DeviceKey>('tablet');
  const [category, setCategory] = useState<ScreenCategoryKey>('leisure');
  const [mealType, setMealType] = useState<MealKey>('lunch');
  const [foodGroups, setFoodGroups] = useState<string[]>([]);
  const [physicalActivity, setPhysicalActivity] = useState<PhysicalActivityKey>('playground');
  const [subject, setSubject] = useState<EducationSubjectKey>('reading');
  const [notes, setNotes] = useState('');
  const [validation, setValidation] = useState<ValidationState>({});

  useEffect(() => {
    if (!activity || !visible) return;
    const value = activity.value;
    const recorded = new Date(activity.recorded_at);
    setType(activity.type);
    setRecordedDate(localDateKey(recorded));
    setRecordedTime(recordedTimeParts(recorded));
    setStart(parseTimeLabel(readString(value, 'start_time'), DEFAULT_START));
    setEnd(parseTimeLabel(readString(value, 'end_time'), DEFAULT_END));
    setQuality((readString(value, 'quality') as QualityKey | null) ?? 'good');
    setDevice((readString(value, 'device') as DeviceKey | null) ?? 'tablet');
    setCategory((readString(value, 'category') as ScreenCategoryKey | null) ?? 'leisure');
    setMealType((readString(value, 'meal_type') as MealKey | null) ?? 'lunch');
    setFoodGroups(readStringArray(value, 'food_groups'));
    setPhysicalActivity((readString(value, 'activity') as PhysicalActivityKey | null) ?? 'playground');
    setSubject((readString(value, 'subject') as EducationSubjectKey | null) ?? 'reading');
    setNotes(readString(value, 'notes') ?? '');
    setValidation({});
  }, [activity, visible]);

  const duration = useMemo(() => timeDuration(type, start, end), [type, start, end]);

  const resetForType = (nextType: ActivityType) => {
    setType(nextType);
    const defaults = getDefaultTypeFields(nextType);
    setStart(defaults.start);
    setEnd(defaults.end);
    setQuality(defaults.quality);
    setDevice(defaults.device);
    setCategory(defaults.category);
    setMealType(defaults.mealType);
    setFoodGroups(defaults.foodGroups);
    setPhysicalActivity(defaults.physicalActivity);
    setSubject(defaults.subject);
    setNotes('');
    setValidation({});
  };

  const validate = (): { updates?: UpdateActivityInput; errors: ValidationState } => {
    const recorded = buildRecordedAt(recordedDate, recordedTime);
    const errors: ValidationState = { ...recorded.errors };
    if (type === 'meal') {
      if (!mealType) errors.mealType = 'Meal type is required.';
    } else if (duration.error) {
      errors.endTime = duration.error;
    }
    if (Object.keys(errors).length > 0 || !recorded.iso) return { errors };

    if (type === 'screen_time') {
      return {
        errors,
        updates: {
          type,
          recorded_at: recorded.iso,
          value: buildUpdatedActivityValue({
            type,
            fields: { hours: duration.hours, minutes: duration.minutes, startTime: formatTimeParts(start), endTime: formatTimeParts(end), device, category, notes },
          }),
        },
      };
    }
    if (type === 'sleep' || type === 'nap') {
      return {
        errors,
        updates: {
          type,
          recorded_at: recorded.iso,
          value: buildUpdatedActivityValue({
            type,
            fields: { hours: duration.hours, minutes: duration.minutes, startTime: formatTimeParts(start), endTime: formatTimeParts(end), quality, notes },
          }),
        },
      };
    }
    if (type === 'meal') {
      return {
        errors,
        updates: {
          type,
          recorded_at: recorded.iso,
          value: buildUpdatedActivityValue({ type, fields: { mealType, quality, foodGroups, startTime: formatTimeParts(start), notes } }),
        },
      };
    }
    if (type === 'physical_activity') {
      return {
        errors,
        updates: {
          type,
          recorded_at: recorded.iso,
          value: buildUpdatedActivityValue({
            type,
            fields: { hours: duration.hours, minutes: duration.minutes, startTime: formatTimeParts(start), endTime: formatTimeParts(end), activity: physicalActivity, notes },
          }),
        },
      };
    }
    return {
      errors,
      updates: {
        type,
        recorded_at: recorded.iso,
        value: buildUpdatedActivityValue({
          type: 'education',
          fields: { hours: duration.hours, minutes: duration.minutes, startTime: formatTimeParts(start), endTime: formatTimeParts(end), subject, notes },
        }),
      },
    };
  };

  const validationNow = validate();
  const isInvalid = Object.keys(validationNow.errors).length > 0;

  const handleSave = () => {
    const result = validate();
    setValidation(result.errors);
    if (!result.updates) return;
    onSave(result.updates);
  };

  const renderOptionChips = <Key extends string,>(options: { key: Key; label: string; emoji?: string }[], selected: Key, onSelect: (key: Key) => void) => (
    <View style={styles.chipWrap}>
      {options.map(option => (
        <Chip<Key>
          key={option.key}
          label={`${option.emoji ? `${option.emoji} ` : ''}${option.label}`}
          selected={selected === option.key}
          onPress={() => onSelect(option.key)}
        />
      ))}
    </View>
  );

  const toggleFood = (key: string) => {
    setFoodGroups(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={loading ? undefined : onCancel}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onCancel} disabled={loading} activeOpacity={0.75}>
            <Ionicons name="close" size={22} color="#64748B" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Edit Activity</Text>
            <Text style={styles.headerSubtitle}>{childName ? `${childName} · ${recordedDate}` : recordedDate}</Text>
          </View>
          <View style={styles.headerButtonPlaceholder} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.submitError}>{error}</Text> : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity type</Text>
            <View style={styles.typeGrid}>
              {ACTIVITY_TYPE_CONFIG.map(config => (
                <TouchableOpacity
                  key={config.key}
                  style={[styles.typeChip, type === config.key && styles.typeChipActive]}
                  onPress={() => resetForType(config.key)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={config.icon as keyof typeof Ionicons.glyphMap} size={17} color={type === config.key ? '#FFFFFF' : config.color} />
                  <Text style={[styles.typeChipText, type === config.key && styles.typeChipTextActive]}>{config.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recorded at</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Date</Text>
              <View style={[styles.dateInputWrap, validation.recordedDate && styles.inputWrapError]}>
                <RNTextInput
                  value={recordedDate}
                  onChangeText={text => { setRecordedDate(text); setValidation(current => ({ ...current, recordedDate: undefined })); }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#CBD5E1"
                  style={styles.dateInputText}
                  autoCapitalize="none"
                />
              </View>
              {validation.recordedDate ? <Text style={styles.errorText}>{validation.recordedDate}</Text> : null}
            </View>
            <TimeInput label="Time" value={recordedTime} onChange={value => { setRecordedTime(value); setValidation(current => ({ ...current, recordedTime: undefined })); }} error={validation.recordedTime} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            {type === 'meal' ? (
              <>
                <TimeInput label="Meal time" value={start} onChange={setStart} />
                <Text style={styles.fieldLabel}>Meal type</Text>
                {renderOptionChips(MEALS, mealType, key => setMealType(key as MealKey))}
                {validation.mealType ? <Text style={styles.errorText}>{validation.mealType}</Text> : null}
                <Text style={styles.fieldLabel}>Quality</Text>
                {renderOptionChips(QUALITY, quality, key => setQuality(key as QualityKey))}
                <Text style={styles.fieldLabel}>Food groups</Text>
                <View style={styles.chipWrap}>
                  {FOOD_GROUPS.map(food => (
                    <Chip key={food.key} label={`${food.emoji ? `${food.emoji} ` : ''}${food.label}`} selected={foodGroups.includes(food.key)} onPress={() => toggleFood(food.key)} />
                  ))}
                </View>
              </>
            ) : (
              <>
                <TimeInput label="Start time" value={start} onChange={value => { setStart(value); setValidation(current => ({ ...current, endTime: undefined })); }} error={validation.startTime} />
                <TimeInput label="End time" value={end} onChange={value => { setEnd(value); setValidation(current => ({ ...current, endTime: undefined })); }} error={validation.endTime} />
                {duration.helper ? <Text style={styles.helperText}>{duration.helper}</Text> : null}
                {!duration.error ? <Text style={styles.durationPreview}>Duration: {duration.hours}h {duration.minutes}m</Text> : null}
                {type === 'screen_time' ? (
                  <>
                    <Text style={styles.fieldLabel}>Device</Text>
                    {renderOptionChips(DEVICES, device, key => setDevice(key as DeviceKey))}
                    <Text style={styles.fieldLabel}>Category</Text>
                    {renderOptionChips(SCREEN_CATEGORIES, category, key => setCategory(key as ScreenCategoryKey))}
                  </>
                ) : null}
                {type === 'sleep' || type === 'nap' ? (
                  <>
                    <Text style={styles.fieldLabel}>Quality</Text>
                    {renderOptionChips(QUALITY, quality, key => setQuality(key as QualityKey))}
                  </>
                ) : null}
                {type === 'physical_activity' ? (
                  <>
                    <Text style={styles.fieldLabel}>Activity</Text>
                    {renderOptionChips(PHYSICAL_ACTIVITY_OPTIONS, physicalActivity, key => setPhysicalActivity(key as PhysicalActivityKey))}
                  </>
                ) : null}
                {type === 'education' ? (
                  <>
                    <Text style={styles.fieldLabel}>Subject</Text>
                    {renderOptionChips(EDUCATION_SUBJECT_OPTIONS, subject, key => setSubject(key as EducationSubjectKey))}
                  </>
                ) : null}
              </>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Notes optional</Text>
              <View style={styles.notesInputWrap}>
                <RNTextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add context for this activity"
                  placeholderTextColor="#CBD5E1"
                  style={styles.notesInputText}
                  multiline
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {isInvalid ? <Text style={styles.footerError}>Fix the highlighted fields before saving.</Text> : null}
          <TouchableOpacity
            style={[styles.saveButton, (loading || isInvalid) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading || isInvalid}
            activeOpacity={0.75}
          >
            {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
            <Text style={styles.saveButtonText}>{loading ? 'Saving…' : 'Save changes'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFBF6' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#FFFDFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  headerButtonPlaceholder: { width: 42, height: 42 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 28, gap: 14 },
  section: { backgroundColor: '#FFFDFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  submitError: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', color: '#EF4444', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '700' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  typeChipActive: { backgroundColor: '#FF7F60', borderColor: '#FF7F60' },
  typeChipText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  typeChipTextActive: { color: '#FFFFFF' },
  inputGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 },
  dateInputWrap: { height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FEFBF6', justifyContent: 'center' },
  dateInputText: { height: '100%', paddingHorizontal: 12, paddingVertical: 0, color: '#0F172A', fontSize: 15, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInputBox: { width: 48, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FEFBF6', alignItems: 'center', justifyContent: 'center' },
  timeInputText: { width: '100%', height: '100%', padding: 0, margin: 0, color: '#0F172A', fontSize: 18, fontWeight: '800', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  timeColon: { width: 10, color: '#0F172A', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  periodStack: { width: 44, gap: 4 },
  periodButton: { height: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  periodButtonActive: { backgroundColor: '#FF7F60' },
  periodText: { fontSize: 10, fontWeight: '900', color: '#64748B' },
  periodTextActive: { color: '#FFFFFF' },
  inputWrapError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#EF4444', fontWeight: '700', marginTop: 2 },
  helperText: { fontSize: 12, color: '#D97706', fontWeight: '700', backgroundColor: '#FEF3C7', borderRadius: 10, padding: 8 },
  durationPreview: { fontSize: 13, color: '#059669', fontWeight: '800', backgroundColor: '#ECFDF5', borderRadius: 10, padding: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  chipActive: { backgroundColor: '#FFF0ED', borderColor: '#FF7F60' },
  chipText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  chipTextActive: { color: '#FF7F60' },
  notesInputWrap: { minHeight: 84, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FEFBF6' },
  notesInputText: { minHeight: 84, padding: 12, color: '#0F172A', fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  footer: { padding: 16, backgroundColor: '#FFFDFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  footerError: { color: '#EF4444', fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  saveButton: { minHeight: 52, borderRadius: 14, backgroundColor: '#FF7F60', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveButtonDisabled: { opacity: 0.55 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
