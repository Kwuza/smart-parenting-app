import { supabase } from './supabase';

// Activity types
export type ActivityType = 'screen_time' | 'sleep' | 'nap' | 'meal' | 'physical_activity' | 'education';

export interface Activity {
  id: string;
  child_id: string;
  type: ActivityType;
  value: Record<string, any>;
  recorded_at: string;
  created_at: string;
}

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  date_of_birth: string;
  max_screen_time_minutes: number | null;
  min_sleep_minutes: number | null;
  // Routine schedule (TIME format: HH:MM or HH:MM:SS)
  bedtime: string | null;
  wake_up_time: string | null;
  breakfast_time: string | null;
  lunch_time: string | null;
  snack_time: string | null;
  dinner_time: string | null;
  nap_time: string | null;
  activity_time: string | null;
  learn_time: string | null;
  // Physical measurements
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  // Demographics
  gender: 'male' | 'female' | null;
  avatar_url: string | null;
  notifications: Record<string, boolean> | null;
  created_at: string;
  // Computed fields (not stored in DB)
  age_months: number | null;
  bmi_assessment: {
    bmi: number;
    zScore: number;
    percentile: number;
    category: 'underweight' | 'normal' | 'overweight' | 'obese';
    label: string;
    ageMonths: number;
  } | null;
}

export type AgeGroup = 'toddler' | 'child'; // 2-5 = toddler, 6+ = child

export function getAgeGroup(dob: string): AgeGroup {
  if (!dob) return 'toddler';
  const birth = new Date(dob);
  const now = new Date();
  const age = now.getFullYear() - birth.getFullYear();
  return age < 6 ? 'toddler' : 'child';
}

export function getAgeMonths(dob: string): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

/** Convert a local Date to YYYY-MM-DD without UTC timezone shifts */
export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getAgeYears(dob: string): number | null {
  if (!dob) return null;
  return Math.floor(
    (Date.now() - new Date(dob).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );
}

export interface RoutineData {
  bedtime: string | null;
  wake_up_time: string | null;
  breakfast_time: string | null;
  lunch_time: string | null;
  snack_time: string | null;
  dinner_time: string | null;
  nap_time: string | null;
  activity_time: string | null;
  learn_time: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  gender: 'male' | 'female' | null;
  bmi: number | null;
}

export interface Recommendation {
  id: string;
  child_id: string;
  content: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  insight_type?: 'risk' | 'opportunity' | 'follow_up' | 'positive';
  trend?: 'worsening' | 'stable' | 'improving' | null;
  created_at: string;
}

// Children CRUD
export async function getChildren() {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Child[];
}

export async function createChild(name: string, dateOfBirth: string, userId: string, avatarUrl?: string) {
  const { data, error } = await (supabase as any)
    .from('children')
    .insert({ name, date_of_birth: dateOfBirth, parent_id: userId, avatar_url: avatarUrl ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Child;
}

// Full child settings update — covers name, dob, avatar, limits, and notification toggles
export async function updateChildSettings(
  childId: string,
  settings: {
    max_screen_time_minutes?: number | null;
    min_sleep_minutes?: number | null;
    avatar_url?: string | null;
    name?: string;
    date_of_birth?: string;
    notifications?: Record<string, boolean> | null;
  }
) {
  const { data, error } = await (supabase as any)
    .from('children')
    .update(settings)
    .eq('id', childId)
    .select()
    .single();
  if (error) throw error;
  return data as Child;
}

// Child routine + physical measurements
export async function updateChildRoutine(childId: string, routine: RoutineData) {
  const { data, error } = await (supabase as any)
    .from('children')
    .update(routine)
    .eq('id', childId)
    .select()
    .single();
  if (error) throw error;
  return data as Child;
}

// Activities CRUD
export async function logActivity(childId: string, type: ActivityType, value: Record<string, any>, date?: Date) {
  const { data, error } = await (supabase as any)
    .from('activities')
    .insert({ child_id: childId, type, value, recorded_at: (date || new Date()).toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as Activity;
}

export async function getActivities(childId: string, type?: ActivityType) {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('child_id', childId)
    .order('recorded_at', { ascending: false })
    .limit(100);
  if (type) query = query.eq('type', type);
  const { data, error } = await query;
  if (error) throw error;
  return data as Activity[];
}

export async function getActivitySummary(childId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('type, value, recorded_at')
    .eq('child_id', childId)
    .gte('recorded_at', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString());
  if (error) throw error;
  return data;
}

export async function getTodayActivities(childId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('child_id', childId)
    .gte('recorded_at', today.toISOString())
    .order('recorded_at', { ascending: false });
  if (error) throw error;
  return data as Activity[];
}

// AI Recommendations
export async function getRecommendations(childId: string) {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data as Recommendation[];
}

export async function analyzeChild(childId: string) {
  const [activities, previousRecs, child]: [any[], Recommendation[], Child] = await Promise.all([
    getActivitySummary(childId),
    supabase.from('recommendations').select('*').eq('child_id', childId).order('created_at', { ascending: false }).limit(3).then(({ data, error }) => {
      if (error) throw error;
      return data as Recommendation[];
    }),
    supabase.from('children').select('*').eq('id', childId).single().then(({ data, error }) => {
      if (error) throw error;
      return data as Child;
    }),
  ]);

  const ageMonths = getAgeMonths(child.date_of_birth);
  let bmi_assessment: Child['bmi_assessment'] = null;
  if (child.height_cm && child.weight_kg && child.gender && ageMonths >= 24 && ageMonths <= 60) {
    const { assessBmi } = await import('../lib/bmi');
    bmi_assessment = assessBmi(child.height_cm, child.weight_kg, ageMonths, child.gender);
  }

  const enrichedChild: Child = {
    ...child,
    age_months: ageMonths,
    bmi_assessment,
  };

const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/analyze-child`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ child_id: childId, child: enrichedChild, activities, previous_recommendations: previousRecs }),
  });
  if (!response.ok) throw new Error('Analysis failed');
  return await response.json();
}

// ── Scheduled Activities ────────────────────────────────────────

export interface ScheduledActivity {
  id: string;
  child_id: string;
  type: string;
  start_time: string;
  min_duration_minutes: number | null;
  max_duration_minutes: number | null;
  planned_end_time: string;
  category: string | null;
  status: 'pending' | 'completed' | 'skipped';
  meal_type: string | null;
  food_groups: string[] | null;
  created_at: string;
}

export async function scheduleActivity(
  childId: string,
  type: string,
  startTime: string,
  minDurationMinutes: number | null,
  maxDurationMinutes: number | null,
  category?: string,
  mealType?: string,
  foodGroups?: string[]
) {
  const start = new Date(startTime);
  const plannedEnd = maxDurationMinutes
    ? new Date(start.getTime() + maxDurationMinutes * 60000).toISOString()
    : startTime;

  const { data, error } = await (supabase as any)
    .from('scheduled_activities')
    .insert({
      child_id: childId,
      type,
      start_time: startTime,
      min_duration_minutes: minDurationMinutes,
      max_duration_minutes: maxDurationMinutes,
      planned_end_time: plannedEnd,
      category: category ?? null,
      meal_type: mealType ?? null,
      food_groups: foodGroups ?? null,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data as ScheduledActivity;
}

export async function getScheduledActivities(childId: string, status?: string) {
  let query = supabase
    .from('scheduled_activities')
    .select('*')
    .eq('child_id', childId)
    .order('start_time', { ascending: true });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data as ScheduledActivity[];
}

export async function updateScheduledActivityStatus(
  id: string,
  status: 'completed' | 'skipped'
) {
  const { data, error } = await (supabase as any)
    .from('scheduled_activities')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ScheduledActivity;
}

export async function deleteScheduledActivity(id: string) {
  const { error } = await (supabase as any)
    .from('scheduled_activities')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function updateScheduledActivity(
  id: string,
  updates: Partial<Omit<ScheduledActivity, 'id' | 'child_id' | 'created_at'>>
) {
  const { data, error } = await (supabase as any)
    .from('scheduled_activities')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ScheduledActivity;
}

export async function deleteChild(childId: string) {
  const { error } = await (supabase as any)
    .from('children')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', childId);
  if (error) throw error;
}
