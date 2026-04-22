---
id: table-children-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - database/schema.sql
  - database/migration_child_routine.sql
  - database/migration_gender.sql
  - database/migration_child_settings.sql
confidence: high
status: active
tags:
  - database
  - table
  - children
  - smart-parenting-app
  - rls
  - routine-schedule
  - bmi
related:
  - database/table-activities
  - database/table-recommendations
  - database/table-alerts
  - lib/api#updateChild
  - app/child/new-screen
---
# Table: children

**Purpose:** Core domain entity — child profile owned by a parent. All activities, recommendations, and alerts cascade from this table.

**Size:** ≤10 rows per typical family (1–5 children). Very small.

**Owner:** `parent_id` → `auth.users.id` (FK, enforced at app layer; RLS enforces ownership)

**Soft-delete:** `deleted_at TIMESTAMP` — RLS filters `IS NULL`. No ON DELETE CASCADE to preserve history.

---

## Columns

| Column | Type | Null? | Description |
|--------|------|-------|-------------|
| `id` | UUID PK | NOT | Child identifier |
| `parent_id` | UUID | NOT | Owner (auth.uid()) |
| `name` | TEXT | NOT | Child display name |
| `date_of_birth` | DATE | NOT | Used for age calculations, BMI percentiles |
| `deleted_at` | TIMESTAMPTZ | YES | Soft-delete marker; RLS checks IS NULL |
| `bedtime` | TIME | YES | Routine: scheduled bedtime |
| `wake_up_time` | TIME | YES | Routine: scheduled wake-up |
| `breakfast_time` | TIME | YES | Routine |
| `lunch_time` | TIME | YES | Routine |
| `snack_time` | TIME | YES | Routine |
| `dinner_time` | TIME | YES | Routine |
| `activity_time` | TIME | YES | Routine: scheduled activity/learn time |
| `max_screen_time_minutes` | INTEGER | YES | Per-child limit (NULL = no enforced limit) |
| `min_sleep_minutes` | INTEGER | YES | Per-child minimum (NULL = no enforced minimum) |
| `height_cm` | NUMERIC | YES | For BMI calculation (WHO method) |
| `weight_kg` | NUMERIC | YES | For BMI calculation |
| `bmi` | NUMERIC | YES | Cached computed BMI (optional; can be recomputed) |
| `gender` | TEXT | YES | `'male'` or `'female'` — affects BMI percentile |

---

## Routine Schedule Pattern

11 optional TIME columns represent the **4-step routine wizard** (app/child/routine.tsx):
- Step 1 Sleep: bedtime + wake_up_time
- Step 2 Meals: breakfast_time, lunch_time, snack_time, dinner_time
- Step 3 Activities: activity_time (covers education, nap, physical)
- Step 4 Physical: gender already captured; height/weight captured in profile (not routine)

**Why separate routine columns?** Not JSONB — allows easy date-part extraction (e.g., "all children with bedtime before 8PM") without unnesting.

---

## Per-Child Limits Pattern

- `max_screen_time_minutes` — enforced client-side in Log screen (boundary validation)
- `min_sleep_minutes` — used in AI recommendations (suggestion threshold) + routine wizard optional setting
- Both nullable: NULL = parent has not set a limit → no enforced cap

## Routine Age Gate

Routine wizard steps are **required only for ages 2–5** (toddler). Children younger than 2 or aged 6+ skip the routine entirely (wizard shows Skip button).

**Implementation:** `isRoutineAge = ageYears >= 2 && ageYears <= 5` in `app/child/routine.tsx:120`.

**Why 2–5?** BMI calculation (WHO LMS) supports exactly 24–60 months (2–5 years). Routine schedule is most relevant for toddlers; infants (<2) have irregular schedules and older children (6+) self-manage.

---



## Gender + BMI Integration

Gender added 2026-04-16 via `migration_gender.sql`. Previously BMI calculation used hardcoded `'male'`. Now:
- `lib/bmi.ts:assessBmi()` receives `gender` param
- `app/child/routine.tsx` captures Boy/Girl chip → writes to `children.gender`
- BMI percentile category varies by gender (WHO LMS tables separate)

---

## RLS Policies

| Policy | Command | Definition |
|--------|---------|------------|
| parents_select_own_children | SELECT | `parent_id = auth.uid() AND deleted_at IS NULL` |
| parents_insert_own_children | INSERT | `parent_id = auth.uid()` (new row parent_id must match) |
| parents_update_own_children | UPDATE | `parent_id = auth.uid() AND deleted_at IS NULL` |
| parents_delete_soft | UPDATE | UPDATE only `deleted_at` column (soft-delete rule enforced via column-level policy — actual implementation may use app-layer guard) |

---

## Indexes

- `idx_children_parent` (`parent_id`) — parent → children lookup (dashboard)

---

## Related
API functions: `[[lib/api#getChildren]]`, `[[lib/api#createChild]]`, `[[lib/api#updateChild]]`
UI screens: `[[components/add-child-screen]]`, `[[components/routine-wizard]]`
Data: `[[database/table-activities]]` (FK chain), `[[lib/bmi-calculator]]` (BMI column usage)

---

## Open Questions / Tech Debt
- Should `bmi` be a generated column (STORED) instead of app-computed? Currently computed client-side only; DB does not store it.
- Routine columns could be JSONB (fewer NULL columns) but current structure allows easier time-based queries without JSON extraction.
- Gender CHECK (male/female) could be ENUM but TEXT + CHECK chosen for simplicity; migration path to lookup table if expanded.
