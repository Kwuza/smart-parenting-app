---
id: 5step-add-child-wizard-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/child/wizard.tsx
confidence: high
status: active
tags:
  - component
  - screen
  - wizard
  - smart-parenting-app
  - hci
related:
  - components/add-child-screen (deprecated)
  - components/routine-wizard (deprecated)
  - lib/api#createChild
  - lib/api#updateChildRoutine
  - lib/api#updateChildSettings
  - lib/image#pickAndUploadImage
  - lib/bmi-calculator
  - lib/sleep-calculator
  - lib/notifications
  - database/table-children
---
# Component: 5-Step Add Child Wizard (`app/child/wizard.tsx`)

**Path:** `app/child/wizard.tsx`  
**Lines:** ~831  
**Purpose:** Unified child onboarding flow combining identity, routine, physical measurements, and avatar setup into a single 5-step progressive disclosure wizard.

---

## Overview

Replaces the previous two-screen flow (`new.tsx` → `routine.tsx`) with a single immersive experience. All data is saved in one transaction-like sequence, ensuring child profile + routine + settings are fully consistent.

**Step order:**
1. **Profile** — name, date of birth (with quick-age chips), avatar icon picker + optional photo upload
2. **Body** — gender, height, weight; live BMI preview (for ages 2–5)
3. **Sleep** — bedtime & wake-up times with quick presets; minimum sleep toggle (for ages 2–5 only) with age-based recommendation
4. **Meals** — breakfast, lunch, snack, dinner times with quick presets
5. **Active** — nap, activity, learning times (required for ages 2–5, optional + "Skip" button for 6+)

---

## State Shape

| Step | Fields | Type | Notes |
|------|--------|------|-------|
| Profile | `name`, `dob` (YYYY-MM-DD string), `avatarUrl` (string \| null), `selectedIcon` (emoji) | various | DOB quick-age: 1,3,5,7,10 years presets |
| Body | `height` (string), `weight` (string), `gender` ('male'/'female') | various | BMI computed client-side on input change for preview only |
| Sleep | `bedH`, `bedM`, `bedP`, `wakeH`, `wakeM`, `wakeP`, `useMinSleep` (bool), `minSleepH`, `minSleepM` | string, bool | Min sleep shown only for ages 2–5 |
| Meals | `bfH/M/P`, `luH/M/P`, `snH/M/P`, `diH/M/P` | strings | All required |
| Active | `napH/M/P`, `actH/M/P`, `lrnH/M/P` | strings | Required if `ageYears ∈ [2,5]`, else optional |

**Computed:**
- `ageMonths = getAgeMonths(dob)`
- `ageYears = floor(ageMonths / 12)`
- `isRequired = ageYears >= 2 && ageYears <= 5`
- `sleepRec = getSleepRecommendation(ageYears)` (null outside 2–5)

---

## Validation Rules (Inline)

| Field | Rule | Error Message |
|-------|------|---------------|
| Name | required, min 2 chars, max 50 | "Please enter your child's name" / "Name must be at least 2 characters" |
| DOB | required, format `YYYY-MM-DD`, not future date | "Date of birth must be in format YYYY-MM-DD" / "Date cannot be in the future" |
| Gender | required (Body step) | "Please select a gender" |
| Height | numeric, 30–250 cm | "Enter a valid height (30–250 cm)" |
| Weight | numeric, 2–200 kg | "Enter a valid weight (2–200 kg)" |
| Sleep | both bed & wake times required | "Please set both bedtime and wake-up time" |
| Meals | all 4 times required | "Please set all four meal times" |
| Active (if required) | nap, act, learn all required | "Please set all activity times for ages 2–5" |

Errors appear in a red banner above the bottom button; cleared on next successful step advance.

---

## Submission Flow

1. **Profile creation** → `createChild(name, dob, userId, avatarUrl)`
2. **BMI compute** (if age 24–60 months and height/weight/gender present) → `assessBmi()` from WHO LMS tables
3. **Routine update** → `updateChildRoutine(childId, routine)` where `routine` includes all time fields, physical measurements, and computed `bmi`
4. **Settings update** (optional) → if `useMinSleep` true: `updateChildSettings(childId, { min_sleep_minutes: total })`
5. **Notifications** → `scheduleChildNotifications(updatedChild)` where `updatedChild` is the return value from step 3 (includes routine)
6. **Refresh + Navigate** → `loadChildren()` then `router.replace('/(tabs)/' as any)`

All steps are sequential; if any API call fails, error displayed inline and flow stops. No partial child records left behind (create → routine → settings are each isolated; if routine update fails, child exists without routine).

---

## Avatar Handling

- **Default:** Eight emoji icons (👶 🧒 👧 👦 🦁 🐰 🐻 ⭐) selectable via modal.
- **Photo upload:** Immediate upload on selection using `pickAndUploadImage` from `lib/image.ts`.
  - Uploads to Supabase Storage bucket `child-photos/{userId}_{timestamp}.jpg`.
  - Shows spinner overlay during upload.
  - On failure: inline error, continues without photo (avatar_url remains null).
- **Display:** If `avatarUrl` set → `<Image>`; else large centered emoji.

---

## Time Input Component Pattern

Each time field group rendered by `renderTimeRow(label, h, setH, m, setM, p, setP, presets)` inline helper (not a separate component per Karpathy simplicity). It provides:

- **Label** (optional param; empty for Bed/Wake since they have column headers)
- **Quick preset row** – 5 buttons pre-filled from `QUICK_TIMES` mapping
- **Hour / Minute / AM‑PM controls**
  - Hour: numeric TextInput (max 2 digits)
  - Minute: numeric TextInput (max 2 digits)
  - AM/PM: two TouchableOpacity buttons

Values converted to `HH:MM:00` string via `toTimeStr()` before sending to API.

---

## BMI Computation Details

- Only displayed/calculated for children aged **24–60 months** (2–5 years), matching WHO LMS table support.
- Uses `assessBm` from `lib/bmi.ts` with gender-specific L-M-S parameters.
- Preview shown in Body step once valid numbers entered (no persistence to DB until final submit).
- On submit, computed BMI is included in `RoutineData.bmi` and saved by `updateChildRoutine`.
- For ages outside 2–5, `bmi` saved as `null`.

---

## Sleep Minimum Toggle (Ages 2–5 Only)

- Toggle label: "Minimum Sleep"
- When enabled, two numeric inputs appear: hours and minutes.
- Auto-prefilled using `getSleepRecommendation(ageYears)`:
  - 2–3 years → 11 hours
  - 4–5 years → 10 hours
- Hint text: "Recommended: 11–13 hours" or "10–12 hours" respectively.
- Saved via `updateChildSettings` as `min_sleep_minutes` (total minutes).

---

## Conditional Behavior: Ages 6+

- **Sleep minimum:** Hidden (not rendered).
- **Active step:** Rendered with "Activities (optional)" title. All three fields present but not required. "Skip and Complete" button bypasses validation and calls `handleSubmit` directly.

---

## Performance & UX Notes

- **Single-screen wizard** → no context loss between steps; React state preservation across step transitions.
- **Keyboard avoidance:** `Keyboard.dismiss()` called on every Next/Complete `onPress` before navigation to prevent `KeyboardAvoidingView` oscillation.
- **Photo upload** occurs immediately during profile step to avoid long submit latency and allow early retry.
- **Error handling:** Inline banner only; no `Alert.alert` for validation (only used in settings screen elsewhere).
- **Notifications scheduled** after routine saved; uses fresh `updatedChild` object to ensure routine times present.

---

## Database Changes

**Migration:** `database/002_add_avatar_url.sql`
```sql
ALTER TABLE children ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

**Column mapping:**
| Column | Source | Notes |
|--------|--------|-------|
| `avatar_url` | `createChild(..., avatarUrl)` | Nullable; set by upload or emoji fallback (null) |
| `bmi` | computed in wizard | Auto-calculated from height/weight; trigger also exists but we explicitly send value |
| All `*_time` columns | `toTimeStr()` conversions | Saved as `HH:MM:SS` text |
| `min_sleep_minutes` | `updateChildSettings` | Separate table; nullable |

---

## Related Files

- **API:** `lib/api.ts` – `createChild`, `updateChildRoutine`, `updateChildSettings`, `Child` interface extended with `avatar_url` and `bmi`
- **Types:** `lib/database.types.ts` – augmented with `avatar_url` in Row/Insert/Update
- **Image:** `lib/image.ts` – `pickAndUploadImage` used for photo upload
- **BMI:** `lib/bmi.ts` – `assessBmi` for percentile calculation
- **Sleep:** `lib/sleep-calculator.ts` – `getSleepRecommendation`
- **Notifications:** `lib/notifications.ts` – `scheduleChildNotifications`
- **Settings editor:** `app/settings/child/[id].tsx` – also sends `bmi` when updating routine

---

## Open Questions / Future Work

- **BMI persistence strategy:** Currently computed client-side; could be moved to DB trigger for consistency.
- **Avatar icon only vs photo upload:** Both supported; icon is fallback when photo absent.
- **Routine optionality:** Routine is now **mandatory** to finish wizard. Original design allowed skipping routine entirely; this changes product behavior. Consider if "Skip Routine" button needed for ages 6+.
- **Error recovery:** If API fails mid-flow, child may exist with partial data. No compensation transaction implemented; user must edit later.

---

## Migration & Rollout

- **Archive:** `app/child/new.tsx` and `app/child/routine.tsx` moved to `app/child/archive/`.
- **Routing:** All `router.push('/child/new')` replaced with `/child/wizard`.
- **Backward compatibility:** Old endpoints unchanged; API still accepts same fields plus new ones (`avatar_url`, `bmi`).
- **Rollback:** Revert branch to previous commit; old files remain in git history.

---

## Testing Checklist

- [ ] Create child age 3 with photo, min sleep toggled → verify DB row: all routine times + `bmi` populated + `avatar_url` non-null + notifications scheduled
- [ ] Create child age 7 without activity times → optional skip works, no validation error
- [ ] Future DOB → inline error
- [ ] Height 300cm → error
- [ ] Weight 0 → error
- [ ] Back navigation between steps retains state
- [ ] Photo upload failure → error shown, flow continues with emoji avatar
- [ ] TypeScript build: `npx tsc --noEmit` passes with 0 errors in `app/`
