import { supabase } from './supabase';

// Activity types
export type ActivityType = 'screen_time' | 'sleep' | 'meal' | 'education';

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
  created_at: string;
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

export async function createChild(name: string, dateOfBirth: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('children')
    .insert({ name, date_of_birth: dateOfBirth, parent_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Child;
}

// Activities CRUD
export async function logActivity(childId: string, type: ActivityType, value: Record<string, any>) {
  const { data, error } = await supabase
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
    .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  if (error) throw error;
  return data;
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
  // This calls the AI service to generate recommendations
  const activities = await getActivitySummary(childId);
  const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/analyze-child`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ child_id: childId, activities }),
  });
  if (!response.ok) throw new Error('Analysis failed');
  return await response.json();
}
