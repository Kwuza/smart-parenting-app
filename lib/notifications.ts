/**
 * Local scheduled notifications for Smart Parenting App.
 *
 * Schedules daily reminders based on child routine times:
 * - Bedtime reminder (30 min before)
 * - Wake-up check-in
 * - Breakfast, lunch, snack, dinner reminders
 * - Nap, activity, learn time reminders
 *
 * All notifications are daily triggers — the OS handles firing.
 * No server needed. Persists across app restarts.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Child, ScheduledActivity, getScheduledActivities } from './api';

// Show notification even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface ScheduledNotification {
  id: string;        // e.g., "bedtime-{childId}"
  identifier: string; // Expo notification identifier
  childId: string;
  type: string;
  hour: number;
  minute: number;
}

// Track scheduled notifications so we can cancel/update them
let scheduledNotifications: ScheduledNotification[] = [];

// --- Permission ---

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    if (__DEV__) console.warn('Notifications require a physical device');
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// --- Scheduling helpers ---

async function scheduleDaily(
  id: string,
  childId: string,
  type: string,
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<string | null> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { notificationId: id, childId, type },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return identifier;
  } catch (e) {
    if (__DEV__) console.error(`Failed to schedule ${id}:`, e);
    return null;
  }
}

function parseTime(timeStr: string | null): { hour: number; minute: number } | null {
  if (!timeStr) return null;
  // Handle both "HH:MM" and "HH:MM:SS" formats
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return null;
  return { hour, minute };
}

function offsetTime(hour: number, minute: number, offsetMinutes: number): { hour: number; minute: number } {
  let totalMinutes = hour * 60 + minute + offsetMinutes;
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;
  return {
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
  };
}

function getActivityReminderLabel(activity: ScheduledActivity): string {
  switch (activity.type) {
    case 'screen_time':
      return 'screen time';
    case 'sleep':
      return 'sleep';
    case 'nap':
      return 'nap';
    case 'meal':
      return activity.meal_type || 'meal';
    case 'physical_activity':
      return activity.category || 'activity';
    case 'education':
      return activity.category || 'learning time';
    default:
      return 'activity';
  }
}

async function scheduleOneTime(
  id: string,
  childId: string,
  type: string,
  triggerDate: Date,
  title: string,
  body: string,
  extraData?: Record<string, any>
): Promise<string | null> {
  if (triggerDate.getTime() <= Date.now()) return null;

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { notificationId: id, childId, type, ...extraData },
      },
      trigger: triggerDate as any,
    });
    return identifier;
  } catch (e) {
    if (__DEV__) console.error(`Failed to schedule ${id}:`, e);
    return null;
  }
}

async function getScheduledNotificationIdentifiersByChild(childId: string): Promise<string[]> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled
      .filter((notif: any) => notif.content?.data?.childId === childId)
      .map((notif: any) => notif.identifier);
  } catch {
    return [];
  }
}

async function getScheduledNotificationIdentifiersBySchedule(scheduleId: string): Promise<string[]> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled
      .filter((notif: any) => notif.content?.data?.scheduleId === scheduleId)
      .map((notif: any) => notif.identifier);
  } catch {
    return [];
  }
}

export async function cancelScheduledActivityNotifications(scheduleId: string): Promise<void> {
  const identifiers = await getScheduledNotificationIdentifiersBySchedule(scheduleId);
  for (const identifier of identifiers) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {}
  }
  scheduledNotifications = scheduledNotifications.filter(n => !(n.id.startsWith('scheduled-') && n.id.includes(scheduleId)));
}

export async function scheduleScheduledActivityNotifications(
  activity: ScheduledActivity,
  childName: string
): Promise<void> {
  await cancelScheduledActivityNotifications(activity.id);

  if (activity.status !== 'pending') return;

  const start = new Date(activity.start_time);
  const label = getActivityReminderLabel(activity);
  const minMinutes = activity.min_duration_minutes;
  const maxMinutes = activity.max_duration_minutes;

  const minTrigger =
    minMinutes != null
      ? new Date(start.getTime() + Math.max(0, minMinutes - 5) * 60000)
      : null;

  const maxTrigger =
    maxMinutes != null
      ? new Date(start.getTime() + Math.max(0, maxMinutes - 5) * 60000)
      : null;

  if (minTrigger && maxTrigger && minTrigger.getTime() === maxTrigger.getTime()) {
    const id = `scheduled-max-${activity.id}`;
    const identifier = await scheduleOneTime(
      id,
      activity.child_id,
      activity.type,
      maxTrigger,
      `${childName}'s ${label} ends soon ⏰`,
      `5 minutes left before the scheduled ${label} maximum time ends.`,
      { scheduleId: activity.id, reminderStage: 'max' }
    );
    if (identifier) {
      scheduledNotifications.push({
        id,
        identifier,
        childId: activity.child_id,
        type: activity.type,
        hour: maxTrigger.getHours(),
        minute: maxTrigger.getMinutes(),
      });
    }
    return;
  }

  if (minTrigger) {
    const id = `scheduled-min-${activity.id}`;
    const identifier = await scheduleOneTime(
      id,
      activity.child_id,
      activity.type,
      minTrigger,
      `${childName}'s ${label} check-in ⏳`,
      `5 minutes until the scheduled minimum time for ${label}.`,
      { scheduleId: activity.id, reminderStage: 'min' }
    );
    if (identifier) {
      scheduledNotifications.push({
        id,
        identifier,
        childId: activity.child_id,
        type: activity.type,
        hour: minTrigger.getHours(),
        minute: minTrigger.getMinutes(),
      });
    }
  }

  if (maxTrigger) {
    const id = `scheduled-max-${activity.id}`;
    const identifier = await scheduleOneTime(
      id,
      activity.child_id,
      activity.type,
      maxTrigger,
      `${childName}'s ${label} ends soon ⏰`,
      `5 minutes left before the scheduled ${label} maximum time ends.`,
      { scheduleId: activity.id, reminderStage: 'max' }
    );
    if (identifier) {
      scheduledNotifications.push({
        id,
        identifier,
        childId: activity.child_id,
        type: activity.type,
        hour: maxTrigger.getHours(),
        minute: maxTrigger.getMinutes(),
      });
    }
  }
}

async function schedulePendingScheduledActivityNotifications(child: Child): Promise<void> {
  try {
    const activities = await getScheduledActivities(child.id, 'pending');
    for (const activity of activities) {
      await scheduleScheduledActivityNotifications(activity, child.name);
    }
  } catch (e) {
    if (__DEV__) console.error(`Failed to sync scheduled activity reminders for ${child.name}:`, e);
  }
}

// --- High-level API ---

/**
 * Schedule all notifications for a single child based on their routine.
 * Cancels existing notifications for this child first.
 */
export async function scheduleChildNotifications(
  child: Child,
  notifToggles?: Record<string, boolean>
): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Cancel existing notifications for this child first
  await cancelChildNotifications(child.id);

  const name = child.name;

  const isEnabled = (key: string): boolean => {
    // If notifToggles is provided, use it; otherwise default to enabled
    if (notifToggles === undefined) return true;
    return notifToggles[key] ?? true;
  };

  const addNotif = async (
    type: string,
    timeStr: string | null,
    titleFn: (n: string) => string,
    bodyFn: (n: string) => string,
    offsetMinutes = 0
  ) => {
    if (!isEnabled(type)) return; // Skip if this notification type is disabled
    const parsed = parseTime(timeStr);
    if (!parsed) return;
    const adjusted = offsetTime(parsed.hour, parsed.minute, offsetMinutes);
    const id = `${type}-${child.id}`;
    const identifier = await scheduleDaily(
      id, child.id, type,
      adjusted.hour, adjusted.minute,
      titleFn(name), bodyFn(name)
    );
    if (identifier) {
      scheduledNotifications.push({ id, identifier, childId: child.id, type, hour: adjusted.hour, minute: adjusted.minute });
    }
  };

  // Sleep
  await addNotif('bedtime', child.bedtime,
    (n) => `Bedtime for ${n} 🌙`,
    (n) => `It's almost ${n}'s bedtime. Time to start winding down!`,
    -30
  );

  await addNotif('wake_up', child.wake_up_time,
    (n) => `Good morning, ${n}! ☀️`,
    (n) => `${n}'s wake-up time. How did they sleep?`
  );

  // Meals
  await addNotif('breakfast', child.breakfast_time,
    (n) => `Breakfast time for ${n} 🍳`,
    (n) => `Time for ${n}'s breakfast. Don't forget to log it!`
  );

  await addNotif('lunch', child.lunch_time,
    (n) => `Lunch time for ${n} 🍚`,
    (n) => `Time for ${n}'s lunch. Log what they ate!`
  );

  await addNotif('snack', child.snack_time,
    (n) => `Snack time for ${n} 🍎`,
    (n) => `${n}'s scheduled snack time. Log it after!`
  );

  await addNotif('dinner', child.dinner_time,
    (n) => `Dinner time for ${n} 🍲`,
    (n) => `Time for ${n}'s dinner. Log what they had!`
  );

  // Activities
  await addNotif('nap', child.nap_time,
    (n) => `Nap time for ${n} 😴`,
    (n) => `${n}'s scheduled nap time. Sweet dreams!`
  );

  await addNotif('activity', child.activity_time,
    (n) => `Activity time for ${n} 🏃`,
    (n) => `Time for ${n}'s physical activity. Stay active!`
  );

  await addNotif('learn', child.learn_time,
    (n) => `Learning time for ${n} 📚`,
    (n) => `${n}'s scheduled learning time. Happy studying!`
  );

  // Weekly growth check reminder
  if (isEnabled('weekly_growth')) {
    await scheduleWeeklyGrowthReminder(child, true);
  }

  // One-off reminders for pending scheduled activities (5 min before min/max duration)
  await schedulePendingScheduledActivityNotifications(child);

  if (__DEV__) console.log(`Scheduled ${scheduledNotifications.filter(n => n.childId === child.id).length} notifications for ${name}`);
}

/**
 * Schedule a weekly growth check reminder for a child.
 * Fires every Sunday at 9:00 AM by default.
 */
export async function scheduleWeeklyGrowthReminder(
  child: Child,
  enabled: boolean
): Promise<void> {
  const id = `weekly-growth-${child.id}`;

  // Cancel any existing weekly growth reminder first
  await cancelWeeklyGrowthReminder(child.id);

  if (!enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📏 Weekly Growth Check for ${child.name}!`,
        body: `Time to record ${child.name}'s weight and height for accurate BMI tracking.`,
        sound: 'default',
        data: { notificationId: id, childId: child.id, type: 'weekly_growth' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Monday (1=Sunday, 2=Monday, ..., 7=Saturday)
        hour: 9,
        minute: 0,
      },
    });

    scheduledNotifications.push({
      id,
      identifier,
      childId: child.id,
      type: 'weekly_growth',
      hour: 9,
      minute: 0,
    });

    if (__DEV__) console.log(`Scheduled weekly growth reminder for ${child.name}`);
  } catch (e) {
    if (__DEV__) console.error(`Failed to schedule weekly growth reminder:`, e);
  }
}

/**
 * Cancel the weekly growth reminder for a specific child.
 */
export async function cancelWeeklyGrowthReminder(childId: string): Promise<void> {
  const id = `weekly-growth-${childId}`;
  const existing = scheduledNotifications.find(n => n.id === id);
  if (existing) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existing.identifier);
    } catch {}
  }
  scheduledNotifications = scheduledNotifications.filter(n => n.id !== id);
}

/**
 * Cancel all notifications for a specific child.
 */
export async function cancelChildNotifications(childId: string) {
  // Cancel all OS-level scheduled notifications for this child (routine + weekly + scheduled activities)
  const identifiers = await getScheduledNotificationIdentifiersByChild(childId);
  for (const identifier of identifiers) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {}
  }

  scheduledNotifications = scheduledNotifications.filter(n => n.childId !== childId);
}

/**
 * Cancel all scheduled notifications across all children.
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  scheduledNotifications = [];
}

/**
 * Get count of scheduled notifications (for debug/settings display).
 */
export function getScheduledCount(): number {
  return scheduledNotifications.length;
}

/**
 * Initialize notifications on app start.
 * Call once in root layout.
 */
export async function initNotifications() {
  await requestNotificationPermission();
}

/**
 * Check if notifications are enabled for a child (has at least one routine set).
 */
export function hasRoutineSet(child: Child): boolean {
  return !!(
    child.bedtime || child.wake_up_time ||
    child.breakfast_time || child.lunch_time || child.snack_time || child.dinner_time ||
    child.nap_time || child.activity_time || child.learn_time
  );
}
