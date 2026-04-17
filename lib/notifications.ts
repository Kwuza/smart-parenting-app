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
import { Platform } from 'react-native';
import { Child, getAgeGroup } from './api';

// Show notification even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
    console.warn('Notifications require a physical device');
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
    console.error(`Failed to schedule ${id}:`, e);
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

// --- High-level API ---

/**
 * Schedule all notifications for a single child based on their routine.
 * Cancels existing notifications for this child first.
 */
export async function scheduleChildNotifications(child: Child): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Cancel existing notifications for this child
  await cancelChildNotifications(child.id);

  const name = child.name;
  const ageGroup = getAgeGroup(child.date_of_birth);
  const tasks: Promise<void>[] = [];

  const addNotif = async (
    type: string,
    timeStr: string | null,
    titleFn: (n: string) => string,
    bodyFn: (n: string) => string,
    offsetMinutes = 0
  ) => {
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
    -30 // 30 min before
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

  // Activities (skip for 6+ if not set)
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

  console.log(`Scheduled ${scheduledNotifications.filter(n => n.childId === child.id).length} notifications for ${name}`);
}

/**
 * Cancel all notifications for a specific child.
 */
export async function cancelChildNotifications(childId: string) {
  const childNotifs = scheduledNotifications.filter(n => n.childId === childId);
  for (const notif of childNotifs) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
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
