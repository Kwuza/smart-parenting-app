---
id: sleep-calculator-001
type: concept
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - lib/sleep-calculator.ts
confidence: high
status: active
tags:
  - lib
  - sleep
  - health
  - smart-parenting-app
related:
  - components/routine-wizard
  - database/table-children
---
# Sleep Requirements Calculator — lib/sleep-calculator.ts

**File:** `lib/sleep-calculator.ts` (new, 2026-04-22)
**Purpose:** Age-based sleep recommendation lookup for toddlers (2–5 years) and conversion utility.

---

## Public API

```typescript
export interface SleepRecommendation {
  minHours: number;
  maxHours: number;
  label: string;   // e.g. "11-13 hours"
}

export function getSleepRecommendation(ageYears: number): SleepRecommendation | null
export function toMinutes(hours: number, mins: number): number
```

---

## getSleepRecommendation(ageYears)

Returns recommended sleep range per CDC/AAP guidelines:

| Age Years | minHours | maxHours | label |
|-----------|----------|----------|-------|
| 2–3       | 11       | 13       | "11-13 hours" |
| 4–5       | 10       | 12       | "10-12 hours" |

Returns `null` for ages outside 2–5 (infants <2 and children 6+ have no toddler-specific recommendation in this utility).

---

## toMinutes(hours, mins)

Simple conversion: `hours * 60 + mins`. Used by routine wizard to persist `min_sleep_minutes` as total minutes.

---

## Usage in App

**Routine wizard Step 1 (Sleep minimum)** — `app/child/routine.tsx`:

1. Toggle "Set minimum sleep requirement" enabled → calls `getSleepRecommendation(ageYears)`
2. Pre-fills hour input with `rec.minHours`, minutes with `0`
3. On save: `toMinutes(hours, mins)` → total minutes → `updateChildSettings({ min_sleep_minutes })`

**Settings screen (`app/settings/child/[id].tsx`)** already reads and edits `min_sleep_minutes` via `updateChildSettings`.

---

## Data Flow

```
RoutineWizard (Step 1 toggle ON)
   ↓ getSleepRecommendation(ageYears)
   → prefill form (11 hrs or 10 hrs)
   ↓ User optionally adjusts hours/minutes
   ↓ handleSave() → toMinutes(hours, mins)
   ↓ updateChildSettings(childId, { min_sleep_minutes: totalMinutes })
   ↓ children.min_sleep_minutes column updated
```

---

## Related
- `[[components/routine-wizard]]` — step 1 integration
- `[[database/table-children]]` — `min_sleep_minutes` column
- `[[lib/api#updateChildSettings]]` — persistence API
