---
id: routine-wizard-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/child/routine.tsx (deprecated)
  - app/child/wizard.tsx (current)
confidence: high
status: deprecated
tags:
  - component
  - screen
  - routine-wizard
  - smart-parenting-app
  - hci
  - deprecated
related:
  - components/5step-add-child-wizard
  - lib/api#updateChild
  - lib/bmi-calculator
  - database/table-children
---
# Screen: Routine Wizard (DEPRECATED — use 5-Step Wizard)

**Old Path:** `app/child/routine.tsx` (archived)  
**New Path:** `app/child/wizard.tsx`

**Status:** ⚠️ Deprecated. Merged into unified 5-step add child wizard (`components/5step-add-child-wizard`).

---

## Flow (4 Steps)

```
Step 1: Sleep Schedule
 ├─ Bedtime  [TimePicker]
 ├─ Wake-up  [TimePicker]
 ├─ Minimum Sleep (optional toggle, pre-filled with age-based recommendation)
   [Next]

Step 2: Meals Schedule
 ├─ Breakfast [TimePicker]
 ├─ Lunch     [TimePicker]
 ├─ Snack     [TimePicker]
 └─ Dinner    [TimePicker]
   [Next]

Step 3: Activities Schedule  (required for ages 2–5, optional for 6+)
 ├─ Nap Time               [TimePicker]
 ├─ Activity Time          [TimePicker]
 ├─ Learning Time          [TimePicker]
   [Next]

Step 4: Physical & BMI
 ├─ Gender: [Boy] [Girl] (chips)
 ├─ Height: [___] cm (numeric)
 └─ Weight: [___] kg (numeric)
   [Complete] → calls updateChildRoutine() + optional updateChildSettings()
```

**Progress indicator:** 4-dot stepper at top (● ○ ○ ○ → ● ● ○ ○ → ● ● ● ○ → ● ● ● ●)

---

## Data Shape Collected

```typescript
interface RoutineFormData {
  bedtime: string       // "21:30"
  wake_up_time: string
  breakfast_time: string
  lunch_time: string
  snack_time: string
  dinner_time: string
  activity_time: string
  nap_time: string
  gender: 'male' | 'female'
  height_cm: number
  weight_kg: number
}
```

## Step 1: Sleep Minimum (Optional)

For toddlers (2–5 years), a recommended minimum sleep duration can be set.

**UI:**
- Toggle "Set minimum sleep requirement" (off by default)
- When enabled, pre-fills with age-based recommendation:
  - 2–3 years: 11–13 hours → defaults to 11 hrs 0 mins
  - 4–5 years: 10–12 hours → defaults to 10 hrs 0 mins
- User can adjust hours/minutes manually
- Hint text shows recommended range for child's age
- If toggle is off, no value is saved

**Persistence:** Saved via `updateChildSettings()` as `min_sleep_minutes` (total minutes). Separate from routine update.

**Validation:** None enforced at DB level; used client-side in Log screen and AI recommendations future.

**Age gate:** Sleep minimum UI only shown for ages 2–5 (`isRoutineAge`). Younger infants (<2) and older children (6+) do not see this field.

---

All TIME fields mapped directly to `children` table columns.

---

## Step 4: Gender + Height/Weight

**Gender chips:** Boy/Girl (coral outline for selected, gray fill for unselected). Selection writes to `formData.gender`.

**BMI preview (optional):** Live computed as user types:
```typescript
const bmiResult = assessBmi(height, weight, ageMonths, gender)
// displays: "BMI: 16.2 (68th percentile, normal)" in subdued text
```

`ageMonths` derived from `date_of_birth` of the child (from route params). Not editable.

---

## Submission: `updateChildRoutine`

**API call:** `api.updateChild(childId, updates)` where updates = `{ ...formData }`.

**On success:**
1. Dismiss modal
2. Reschedule notifications for child (via `notifications.scheduleChildNotifications(updatedChild)`)
3. Toast: "Child routine updated"
4. Refresh child list in Settings screen (if open)

**On error:** Inline error banner below submit button; do not dismiss modal.

---

## Notification Reschedule Side Effect

Routine times changed → all previously scheduled notifications for this child are cancelled (`notifications.cancelChildNotifications(childId)`), then new set queued for ALL routine times (bedtime, wake-up, 4 meals, activity, nap).

**No-op check:** `hasRoutineSet(child)` returns false if no routine times → skips scheduling.

---

## Time Input Pattern (Steps 1–3)

Expo `DateTimePicker` in `mode="time"`.

**Round-trip edge case verified 2026-04-16:**
- User selects `12:00 AM` → stored as `"00:00:00"`
- Picker shows `12:00 AM` correctly on reload
- Duration calculation across midnight (e.g., 9:00 PM → 6:00 AM) adds 24h if `end < start` → correct 9h duration

---

## Birthday → Age Months

For BMI percentile calculation only (shown as preview, not saved to DB). Derived:
```typescript
const today = new Date()
const born = new Date(child.date_of_birth)
const months = (today.getFullYear() - born.getFullYear()) * 12 + (today.getMonth() - born.getMonth())
```
If `months < 24` or `> 60`, BMI assessment returns null (outside WHO LMS table range).

---

## Keyboard Avoidance Bug Fix (2026-04-16)

On Step 4 (height/weight inputs), keyboard would push whole view causing oscillation. Fix: call `Keyboard.dismiss()` in `onPress` of Next/Complete buttons before `router.replace()` to ensure keyboard hides before navigation gesture.

---

## Per-Child Settings Reuse

Same modal invoked from Settings screen child card tap. State lifted differently:
- Routine wizard → Step 4 of multi-step flow, submit routes back to child list
- Settings edit → standalone modal, submit dismisses inline

Form component could be extracted to `components/ChildRoutineForm.tsx` for DRY — not yet done.

---

## Related
- [[components/add-child-screen]] — similar fields (but without routine; routine wizard is separate flow)
- [[lib/api#updateChild]] — endpoint
- [[lib/notifications-scheduler]] — side-effect after save
- [[database/table-children]] — destination columns
- [[lib/bmi-calculator]] — used in Step 4 preview
