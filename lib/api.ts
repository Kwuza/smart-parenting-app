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
  created_at: string;
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
}

export interface Recommendation {
  id: string;
  child_id: string;
  content: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

// Children CRUD
export async function getChildren() {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Child[];
}

export async function createChild(name: string, dateOfBirth: string, userId: string) {
  const { data, error } = await (supabase as any)
    .from('children')
    .insert({ name, date_of_birth: dateOfBirth, parent_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Child;
}

// Child settings
export async function updateChildSettings(
  childId: string,
  settings: { max_screen_time_minutes: number | null; min_sleep_minutes: number | null }
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
export async function logActivity(childId: string, type: ActivityType, value: Record<string, any>) {
  const { data, error } = await (supabase as any)
    .from('activities')
    .insert({ child_id: childId, type, value, recorded_at: new Date().toISOString() })
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
  // Fetch all context in parallel
  const [activities, previousRecs, child] = await Promise.all([
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

  const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/analyze-child`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ child_id: childId, child, activities, previous_recommendations: previousRecs }),
  });
  if (!response.ok) throw new Error('Analysis failed');
  return await response.json();
}
