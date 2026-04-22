---
id: notifications-scheduler-001
type: concept
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - lib/notifications.ts
confidence: high
status: active
tags:
  - lib
  - notifications
  - expo-notifications
  - smart-parenting-app
related:
  - components/routine-wizard
  - components/settings-screen
  - database/table-children
---
# Notifications Scheduler — lib/notifications.ts

**File:** `lib/notifications.ts` (243 lines)
**Purpose:** Local scheduled notifications for child routine times (bedtime, wake-up, meals, activities).

---

## Core Pattern

One notification per routine time per day per child. All notifications are `DAILY` repeating triggers. Stored by Expo Notifications service, not app-local state.

---

## Public API

```typescript
export async function requestNotificationPermission(): Promise<boolean>
export async function scheduleChildNotifications(child: Child): Promise<void>
export async function cancelChildNotifications(childId: string): Promise<void>
export async function cancelAllNotifications(): Promise<void>
export function hasRoutineSet(child: Child): boolean
```

---

## Permission Flow

`requestNotificationPermission()` checks platform:
- iOS: `Notifications.getPermissionsAsync()` — if `status !== 'granted'`, call `requestPermissionsAsync()`
- Android: `Permissions.askAsync(Permissions.NOTIFICATIONS)` (Expo notifications module)

Returns boolean granted status. Called on:
- First app launch (if not granted)
- Settings screen toggle (if turned OFF → ON)

---

## Scheduling: `scheduleChildNotifications(child)`

Iterates through all 7 routine TIME columns on child:

```typescript
const times: { time: string; title: string; body: string }[] = [
  { time: child.bedtime,       title: 'Bedtime Reminder',       body: "Time for bed!" },
  { time: child.wake_up_time,  title: 'Wake-up Check-in',       body: "Good morning!" },
  { time: child.breakfast_time, title: 'Breakfast Reminder',    body: "Breakfast ready!" },
  { time: child.lunch_time,    title: 'Lunch Reminder',         body: "Lunch time!" },
  { time: child.snack_time,    title: 'Snack Reminder',         body: "Snack time!" },
  { time: child.dinner_time,   title: 'Dinner Reminder',        body: "Dinner ready!" },
  { time: child.activity_time, title: 'Activity Reminder',      body: "Scheduled activity" },
]
```

**For each time:**
- Skip if time is null/undefined (`hasRoutineSet(child)` pre-check prevents this)
- Build `Date` object for today at that time
- `Notifications.scheduleNotificationAsync(trigger, content)`
  - `trigger`: `SchedulableTriggerInputTypes.DAILY` with `hour`/`minute` from time string
  - `content`: `{ title, body, data: { childId, type } }`
- Notification identifier automatically assigned by OS (not tracked by app)

---

## Cancelation Pattern

**Cancel one child:** `cancelChildNotifications(childId)`

Problem: Expo Notifications does not provide getScheduledNotifications() to list identifiers. Workaround: call `cancelAllNotifications()` and reschedule all other children.

**Implementation:**
1. Cancel ALL notifications via `Notifications.cancelAllScheduledNotificationsAsync()`
2. Fetch all children via `api.getChildren()`
3. For each child (except canceled one), call `scheduleChildNotifications(child)`

**Why not per-child cancel?** No reliable way to cancel by identifier only; accept slight over-cancel/reschedule.

**`cancelAllNotifications()`** used on sign-out or global disable.

---

## Has Routine Check

`hasRoutineSet(child)` returns `true` if ANY of the 7 time fields are non-null. Used to skip scheduling for children with no routine set.

---

## Dependencies

- `expo-notifications` (Notifications module)
- `expo-device` (for `Device.osName` — iOS/Android branching)
- `expo-constants` for app config
- `AsyncStorage` for permission flag caching (not in this file, but Settings toggles use it)

---

## Error Handling

- `scheduleChildNotifications()` errors if permission not granted → caller must check `requestNotificationPermission()` first
- Individual time failures (rare) logged with `console.error()` but continue loop
- No retry logic — failure is silent; user may not get that specific reminder

---

## Settings Integration

Settings screen "Routine Reminders" toggle:
- ON → `api.getChildren()` loop → for each child with routine → `scheduleChildNotifications`
- OFF → `cancelAllNotifications()` (global)

No per-child toggle — notifications are all-or-nothing app-wide.

---

## Time Parsing

`parseTime(str: string): Date` converts `"HH:MM"` or `"HH:MM:SS"` to Date object for today at that time.

```typescript
const [hour, minute] = timeString.split(':').map(Number)
const date = new Date()
date.setHours(hour, minute, 0, 0)
return date
```

Used only for constructing trigger; Expo expects hour/minute numbers for DAILY trigger, not full date, but we pass `Date` to `scheduleNotificationAsync` with `SchedulableTriggerInputTypes.DAILY`.

---

## Related
- [[components/settings-screen]] — toggle that triggers these functions
- [[components/routine-wizard]] — writes routine columns to DB
- [[database/table-children]] — routine columns source
- [[config/app-json]] — expo-notifications permissions required key
