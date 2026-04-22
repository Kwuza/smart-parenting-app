---
id: log-screen-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/(tabs)/log.tsx
confidence: high
status: active
tags:
  - component
  - screen
  - activity-logging
  - smart-parenting-app
  - hci
related:
  - components/dashboard-screen
  - components/activity-form
  - lib/api#createActivity
  - database/table-activities
---
# Screen: Log (app/(tabs)/log.tsx)

**Path:** `app/(tabs)/log.tsx`
**Lines:** 880
**Purpose:** Primary activity data entry screen — 6 activity types with type-specific form UIs.

---

## Layout

```
[Header: "Log Activity" + child picker pill]

[Activity Type Selector]
 ┌─────────┐ ┌─────────┐ ┌─────────┐
 │Screen   │ │Sleep    │ │Meal     │ ...
 └─────────┘ └─────────┘ └─────────┘
(6 large cards, row-major 3×2; selected = coral ring)

[Activity Form Body] ← dynamically renders based on selected type
  - Screen Time: Device chips + Duration stepper + Category chips (Leisure/Educational)
  - Sleep: Start/End time pickers (vertical) + Quality emoji selector
  - Meal: Type dropdown + Quality emoji + Food group multi-select chips
  - Education: Subject text input + Duration stepper
  - Nap: same as Sleep
  - Physical: Activity type text input + Duration stepper

[Submit Button] — "Log Activity" (coral, disabled until form valid)
```

---

## State Shape (local)

```typescript
const [selectedType, setSelectedType] = useState<ActivityType>('screen_time')
const [device, setDevice] = useState<DeviceType>('Phone')
const [durationMinutes, setDurationMinutes] = useState(30)
const [category, setCategory] = useState<Category>('leisure')     // screen_time only
const [startTime, setStartTime] = useState('21:00')              // sleep/nap
const [endTime, setEndTime] = useState('06:30')
const [quality, setQuality] = useState<Quality>('good')         // sleep/meal/nap
const [mealType, setMealType] = useState<MealType>('Lunch')
const [foodGroups, setFoodGroups] = useState<string[]>([])
const [subject, setSubject] = useState('')
```

` zod` schema validates per-type; form errors shown inline below fields.

---

## Device Chips (Screen Time)

Five fixed options rendered as selectable chips:
- Phone (📱)
- Tablet (tab)
- TV (📺)
- PC (🖥️)
- Other (📦)

**Selection:** single-choice; chip outline color toggles coral/blue-gray.

---

## Duration Input Pattern

**Shared component/pattern across types that need duration:**

```tsx
<View style={styles.durationRow}>
  <TouchableOpacity onPress={() => setMinutes(Math.max(1, minutes - 15))}>–15</TouchableOpacity>
  <TextInput value={String(minutes)} keyboardType="numeric" />
  <TouchableOpacity onPress={() => setMinutes(minutes + 15)}>+15</TouchableOpacity>
</View>
```

Stepper increments by 15 minutes (30, 45, 60, 75, …). Text field allows exact entry.

**Screen time only:** manual minutes input only (no time-range). Sleep/Education/Physical use start→end time pickers instead.

---

## Time Range Input (Sleep/Nap/Education/Physical)

Vertical layout: Start time picker, then End time picker (both Expo `DateTimePicker` in `mode="time"`). Duration auto-calculated:

```typescript
const start = parseTime(startTime)   // → Date object today at HH:MM
const end = parseTime(endTime)
let diffMins = (end.getTime() - start.getTime()) / 60000
if (diffMins < 0) diffMins += 24 * 60   // overnight case (21:00 → 06:30 = 570 mins = 9.5h)
```

Edge case verified 2026-04-16: midnight rollover (12AM = 00:00:00) handled.

---

## Quality Selector (Sleep/Meal/Nap)

Horizontal row of 3 emoji chips:
😟 poor | 😐 fair | 😊 good

**No numeric scale** — HCI decision: recognition over recall, more emotional.

---

## Food Groups (Meal only)

7 chips (grains, protein, vegetables, fruit, dairy, oils, sweets). Multi-select; at least 1 required unless quality is 'poor'.

---

## Form Validation (zod)

`ActivityFormSchema` discriminates by `type`; field-level errors displayed inline under each input, not via Alert. Empty required fields disable submit.

**Validation highlights:**
- Duration: 1 ≤ m ≤ 480 (max 8h)
- Times: valid `HH:mm` strings (24h clock)
- End must be > start unless overnight (handled by auto diff)
- Subject: non-empty for education
- Device: required for screen_time

---

## Submission Flow

1. Press "Log Activity" → validate
2. `createActivity(childId, type, value)` (lib/api)
3. Optimistic UI: adds to local ActivityStore immediately (no await)
4. On success: navigate back, toast "Activity logged"
5. On error: show inline error, DO NOT navigate back

**Error categories mapped:**
- RLS violation → "Permission error — try switching child"
- Network → "Connection failed — check internet"
- Validation (caught pre-flight) → inline field error

---

## Navigation In

- From Dashboard quick-add: `router.push('/(tabs)/log?type=screen_time&childId=...')`
- From child profile: `router.push({ pathname: 'log', params: { childId } })`
- From History filter pill: same as Dashboard

**Params:**
- `type` (optional) — pre-selects activity type
- `childId` (optional) — pre-selects child (otherwise uses store's current)

---

## Related
- [[lib/api#createActivity]] — backend writer
- [[database/table-activities]] — target table + value schema
- [[components/dashboard-screen]] — quick-add origin
- [[components/activity-form]] — form body component (extracted, if file exists)
- [[stores/activity-store]] — may cache today's activities locally
