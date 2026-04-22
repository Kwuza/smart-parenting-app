---
id: api-layer-001
type: concept
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - lib/api.ts
  - lib/supabase.ts
  - supabase/functions/analyze-child/index.ts
confidence: high
status: active
tags:
  - api
  - lib
  - smart-parenting-app
  - supabase
  - rls
related:
  - database/table-children
  - database/table-activities
  - supabase/edge-function-analyze-child
  - stores/auth
  - stores/activity-store
---
# API Layer — lib/api.ts

**File size:** 209 lines
**Exports:** 14 functions (children, activities, recommendations, alerts)
**Base client:** `lib/supabase.ts` — lazy-loaded Supabase JS client with `auth` and `from()` helpers
**Auth context:** `stores/auth.ts` holds `session?.user?.id` which becomes `auth.uid()` in RLS policies

---

## Core Pattern: RLS-Protected Direct Table Access

Most functions are thin wrappers around Supabase CRUD with **no service_role bypass**. RLS enforces ownership. Example:

```typescript
export const getChildren = async (): Promise<Child[]> => {
  const { data, error } = await supabase.from('children').select('*')
  if (error) throw error
  return data
}
```

RLS ensures parent only sees their own children.

**Exceptions:**
- `runAiAnalysis(childId)` — calls Edge Function (service_role inside function)
- Any Edge Function (supabase/functions/*) — runs with service_role key (full admin access)

---

## Module Exports (Alphabetical)

### Activity Functions
| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `createActivity(childId, type, value)` | Log activity | `ActivityPayload` | `{ id }` |
| `getActivities(childId, limit?, offset?)` | Paginated list DESC by `recorded_at` | childId, limit=50, offset=0 | `Activity[]` |
| `getTodayActivities(childId)` | Today only (UTC-based date filter) | childId | `Activity[]` |
| `getActivitiesByDateRange(childId, start, end)` | Date window inclusive | childId, startDate, endDate | `Activity[]` |
| `deleteActivity(id)` | Soft-delete via DELETE RLS (not used; app prefers never delete) | id | void |

**Note:** `value` is typed as `Record<string, any>` but clients must supply keys per activity type schema (lib/api.ts does not runtime-validate; zod validation happens on screens).

### Alert Functions
| Function | Purpose |
|----------|---------|
| `getAlerts(childId)` | Unacknowledged alerts only (implicit: `WHERE acknowledged = false`) |
| `acknowledgeAlert(id)` | Sets `acknowledged = true` |

### Child Functions
| Function | Purpose |
|----------|---------|
| `getChildren()` | All children belonging to current parent (RLS-filtered) |
| `getChild(id)` | Single child by ID (RLS ensures ownership) |
| `createChild(data)` | INSERT with `parent_id` from auth context |
| `updateChild(id, updates)` | PATCH mutable fields; routine columns included |
| `deleteChild(id)` | Soft-delete (`deleted_at = now()`) only |

### Recommendation Functions
| Function | Purpose |
|----------|---------|
| `getRecommendations(childId)` | All recommendations DESC by `created_at` |
| `getTodaysRecommendation(childId)` | One row where `created_at >= today()`; returns null if none |
| `runAiAnalysis(childId)` | POST to Edge Function `analyze-child` — returns Promise<void> (Edge Function inserts rows directly) |
| `shouldRunAiAnalysis(childId)` | Checks if recommendation already generated today (skip logic) |

---

## Error Handling Pattern

All functions throw on error. Frontend catches with:

```typescript
try {
  await createActivity(...)
} catch (error) {
  const msg = error instanceof Error ? error.message : 'Unknown error'
  // Map to user-friendly toast
  if (msg.includes('foreign key constraint')) {
    setFormError('Invalid child selected')
  } else if (msg.includes('Row Level Security')) {
    setFormError('Permission denied')
  } else {
    setFormError('Network error — please try again')
  }
}
```

**Edge Function errors:** throw as HTTP 4xx/5xx with JSON body; catch similarly.

---

## Activity Value Payload Shape per Type

**Type:** `screen_time`
```typescript
{ device: 'Phone' | 'Tablet' | 'TV' | 'PC' | 'Other'
  duration_minutes: number
  category?: 'leisure' | 'educational' }
```

**Type:** `sleep`
```typescript
{ start_time: 'HH:MM:SS'   // ISO time string, e.g., '21:00:00'
  end_time: 'HH:MM:SS'
  quality: 'poor' | 'fair' | 'good' }
```

**Type:** `meal`
```typescript
{ type: 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner'
  quality: 'poor' | 'fair' | 'good'
  food_groups: string[] }   // e.g., ['grains','protein','vegetables']
```

**Type:** `education`
```typescript
{ subject: string   // free-text, e.g., 'Math'
  duration_minutes: number }
```

**Type:** `nap`
{ start_time, end_time, quality } — same shape as `sleep`

**Type:** `physical_activity`
```typescript
{ type: string   // e.g., 'Running', 'Cycling'
  duration_minutes: number }
```

---

## Edge Function: analyze-child

**File:** `supabase/functions/analyze-child/index.ts` (328 lines)
**Trigger:** `POST /functions/v1/analyze-child`
**Auth:** Service role key (bypasses RLS)
**Input:** `{ childId: string }`
**Output:** Inserts 3–5 recommendation rows, returns `{ success: true, count: number }`

**Steps:**
1. Fetch child profile + last 28 days of activities (all types)
2. Aggregate stats per type (avg sleep mins, screen_time leisure/edu breakdown, meal frequency, etc.)
3. Build zero-shot prompt with child profile + stats + previous recs
4. Call OpenRouter `elephant-alpha` (temperature 0.7, free)
5. Parse markdown → JSON recommendation objects
6. Insert each with `based_on` audit trail
7. Return summary

**Failure handling:** If AI call fails, Edge Function returns 502; frontend shows generic error.

---

## Zod Validation Layer

**Location:** `screens/log/ActivityFormFields.tsx` (not exported standalone). Each screen validates locally before `createActivity()` call.

**Validation rules:**
- `duration_minutes`: min 1, max 480 (8 hours), integer
- Times: `HH:MM` format accepted; converted to `HH:MM:SS` for DB
- Food groups: at least 1 required when meal quality is not 'poor'
- Device: from hardcoded enum

---

## Helpers Not Exported (Internal Only)

- `supabase.ts`: `getSupabaseClient()` — singleton with lazy init
- ` supabase.ts`: `getSession()` — reads from AsyncStorage
- `api.ts`: `handleApiError(error)` — maps error codes to messages (not exported)
- `api.ts`: `parseTimeString(str)` — converts `HH:MM` to Date for duration calc

---

## Concurrency & Idempotency

No idempotency keys. Frontend disables submit button while request in flight. If user double-taps quickly, second call may create duplicate activity rows (acceptable edge case; admin can delete one).

**Recommendation dedup:** `runAiAnalysis()` checks `shouldRunAiAnalysis()` first — natural idempotency key is `(child_id, DATE(created_at))`.

---

## Related
- [[lib/supabase]] — client initialization
- [[stores/auth]] — session source
- [[stores/activity-store]] — Zustand store that calls these API functions
- [[app/log-screen]] — main consumer
- [[supabase/edge-function-analyze-child]] — AI backend
