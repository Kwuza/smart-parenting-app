import type { ActivityType, ActivityValue } from './api';

export type QualityKey = 'poor' | 'fair' | 'good';
export type MealKey = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type ScreenCategoryKey = 'leisure' | 'educational';
export type DeviceKey = 'phone' | 'tablet' | 'tv' | 'computer';
export type PhysicalActivityKey =
  | 'running'
  | 'swimming'
  | 'cycling'
  | 'sports'
  | 'playground'
  | 'dancing'
  | 'other';
export type EducationSubjectKey = 'reading' | 'homework' | 'learning_app' | 'music' | 'art';

export interface ActivityOption<Key extends string = string> {
  key: Key;
  label: string;
  emoji?: string;
  icon?: string;
}

export interface ActivityTypeConfig {
  key: ActivityType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface TimeRangeValueInput {
  hours: number;
  minutes: number;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface ScreenTimeValueInput extends TimeRangeValueInput {
  device: DeviceKey | string;
  category: ScreenCategoryKey;
}

export interface QualityTimeRangeValueInput extends TimeRangeValueInput {
  quality: QualityKey;
}

export interface MealValueInput {
  mealType: MealKey;
  quality: QualityKey;
  foodGroups: string[];
  startTime: string;
  notes?: string;
}

export interface PhysicalActivityValueInput extends TimeRangeValueInput {
  activity: PhysicalActivityKey | string;
}

export interface EducationValueInput extends TimeRangeValueInput {
  subject: EducationSubjectKey | string;
}

export type BuildUpdatedActivityValueInput =
  | { type: 'screen_time'; fields: ScreenTimeValueInput }
  | { type: 'sleep'; fields: QualityTimeRangeValueInput }
  | { type: 'nap'; fields: QualityTimeRangeValueInput }
  | { type: 'meal'; fields: MealValueInput }
  | { type: 'physical_activity'; fields: PhysicalActivityValueInput }
  | { type: 'education'; fields: EducationValueInput };

export const ACTIVITY_TYPE_CONFIG: ActivityTypeConfig[] = [
  { key: 'screen_time', label: 'Screen', icon: 'phone-portrait-outline', color: '#FF7F60', bgColor: '#FFF0ED' },
  { key: 'sleep', label: 'Sleep', icon: 'moon-outline', color: '#10B981', bgColor: '#ECFDF5' },
  { key: 'nap', label: 'Nap', icon: 'bed-outline', color: '#8B5CF6', bgColor: '#F5F3FF' },
  { key: 'meal', label: 'Meals', icon: 'restaurant-outline', color: '#F59E0B', bgColor: '#FFFBEB' },
  { key: 'physical_activity', label: 'Active', icon: 'fitness-outline', color: '#EF4444', bgColor: '#FEF2F2' },
  { key: 'education', label: 'Learn', icon: 'school-outline', color: '#6366F1', bgColor: '#EEF2FF' },
];

export const QUALITY: ActivityOption<QualityKey>[] = [
  { key: 'poor', label: 'Poor', emoji: '😟' },
  { key: 'fair', label: 'Fair', emoji: '😐' },
  { key: 'good', label: 'Good', emoji: '😊' },
];

export const DEVICES: ActivityOption<DeviceKey>[] = [
  { key: 'phone', label: 'Phone', icon: 'phone-portrait-outline' },
  { key: 'tablet', label: 'Tablet', icon: 'tablet-portrait-outline' },
  { key: 'tv', label: 'TV', icon: 'tv-outline' },
  { key: 'computer', label: 'PC', icon: 'desktop-outline' },
];

export const SCREEN_CATEGORIES: ActivityOption<ScreenCategoryKey>[] = [
  { key: 'leisure', label: 'Leisure', icon: 'game-controller-outline' },
  { key: 'educational', label: 'Educational', icon: 'book-outline' },
];

export const MEALS: ActivityOption<MealKey>[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snack', label: 'Snack' },
  { key: 'dinner', label: 'Dinner' },
];

export const FOOD_GROUPS: ActivityOption[] = [
  { key: 'fruits', label: 'Fruits', emoji: '🍎' },
  { key: 'vegetables', label: 'Veggies', emoji: '🥦' },
  { key: 'protein', label: 'Protein', emoji: '🍗' },
  { key: 'grains', label: 'Grains', emoji: '🍚' },
  { key: 'dairy', label: 'Dairy', emoji: '🥛' },
  { key: 'junk', label: 'Junk Food', emoji: '🍟' },
  { key: 'drinks', label: 'Drinks', emoji: '🥤' },
];

export const PHYSICAL_ACTIVITY_OPTIONS: ActivityOption<PhysicalActivityKey>[] = [
  { key: 'running', label: 'Running' },
  { key: 'swimming', label: 'Swimming' },
  { key: 'cycling', label: 'Cycling' },
  { key: 'sports', label: 'Sports' },
  { key: 'playground', label: 'Playground' },
  { key: 'dancing', label: 'Dancing' },
  { key: 'other', label: 'Other' },
];

export const EDUCATION_SUBJECT_OPTIONS: ActivityOption<EducationSubjectKey>[] = [
  { key: 'reading', label: 'Reading' },
  { key: 'homework', label: 'Homework' },
  { key: 'learning_app', label: 'App' },
  { key: 'music', label: 'Music' },
  { key: 'art', label: 'Art' },
];

export const TIME_BASED_ACTIVITY_TYPES = [
  'screen_time',
  'sleep',
  'education',
  'physical_activity',
  'nap',
] as const satisfies readonly ActivityType[];

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function labelFromKey(value: string): string {
  return value.replace(/_/g, ' ');
}

export function getDurationMinutes(value: ActivityValue): number {
  return readNumber(value.hours) * 60 + readNumber(value.minutes);
}

export function getDurationLabel(value: ActivityValue): string {
  const hours = readNumber(value.hours);
  const minutes = readNumber(value.minutes);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function getFoodGroups(value: ActivityValue): string[] {
  return readStringArray(value.food_groups);
}

export function getActivityLabel(type: ActivityType | string, value: ActivityValue): string {
  const duration = getDurationLabel(value);

  switch (type) {
    case 'screen_time': {
      const category = readString(value.category) ?? 'leisure';
      const device = readString(value.device);
      return `Screen time (${category}) — ${duration}${device ? ` on ${device}` : ''}`;
    }
    case 'sleep': {
      const quality = readString(value.quality);
      return `Sleep — ${duration}${quality ? ` (${quality})` : ''}`;
    }
    case 'nap': {
      const quality = readString(value.quality);
      return `Nap — ${duration}${quality ? ` (${quality})` : ''}`;
    }
    case 'meal': {
      const meal = readString(value.meal_type) ?? 'meal';
      const mealTime = readString(value.start_time) ? ` @ ${readString(value.start_time)}` : '';
      const quality = readString(value.quality);
      const foods = getFoodGroups(value);
      return `${capitalize(meal)}${mealTime}${quality ? ` — ${quality}` : ''}${foods.length ? ` · ${foods.join(', ')}` : ''}`;
    }
    case 'physical_activity': {
      const activity = readString(value.activity);
      return `Physical — ${duration}${activity ? ` (${activity})` : ''}`;
    }
    case 'education': {
      const subject = readString(value.subject);
      return `Learning — ${duration}${subject ? ` (${labelFromKey(subject)})` : ''}`;
    }
    default:
      return type;
  }
}

function withOptionalNotes(value: ActivityValue, notes?: string): ActivityValue {
  const trimmedNotes = notes?.trim();
  return trimmedNotes ? { ...value, notes: trimmedNotes } : value;
}

function buildTimeRangeValue(fields: TimeRangeValueInput): ActivityValue {
  return {
    hours: fields.hours,
    minutes: fields.minutes,
    start_time: fields.startTime,
    end_time: fields.endTime,
  };
}

export function buildUpdatedActivityValue(input: BuildUpdatedActivityValueInput): ActivityValue {
  switch (input.type) {
    case 'screen_time':
      return withOptionalNotes(
        {
          ...buildTimeRangeValue(input.fields),
          device: input.fields.device,
          category: input.fields.category,
        },
        input.fields.notes
      );
    case 'sleep':
    case 'nap':
      return withOptionalNotes(
        {
          ...buildTimeRangeValue(input.fields),
          quality: input.fields.quality,
        },
        input.fields.notes
      );
    case 'meal':
      return withOptionalNotes(
        {
          meal_type: input.fields.mealType,
          quality: input.fields.quality,
          food_groups: input.fields.foodGroups,
          start_time: input.fields.startTime,
        },
        input.fields.notes
      );
    case 'physical_activity':
      return withOptionalNotes(
        {
          ...buildTimeRangeValue(input.fields),
          activity: input.fields.activity,
        },
        input.fields.notes
      );
    case 'education':
      return withOptionalNotes(
        {
          ...buildTimeRangeValue(input.fields),
          subject: input.fields.subject,
        },
        input.fields.notes
      );
  }
}
