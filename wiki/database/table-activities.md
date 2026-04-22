---
id: table-activities-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - database/schema.sql
  - database/migration_add_activity_types.sql
confidence: high
status: active
tags:
  - database
  - table
  - activities
  - smart-parenting-app
  - rls
  - activity-logging
related:
  - database/table-children
  - lib/api#logActivity
  - app/log-screen
  - app/history-screen
---
# Table: activities

**Purpose:** Immutable activity log — every recorded child event (screen_time, sleep, meal, education, nap, physical_activity). Source of truth for History screen and AI analysis.

**Size:** Grows continuously; each parent-child-day may insert 3–10 rows. Estimate: ~2KB/row max (value JSONB); ~100 rows/month/child typical.

**Created by:** app writes (RLS + service_role Edge Function fallback)
**Updated by:** Never (append-only; UPDATE forbidden by app convention)

---

## Columns

| Column | Type | Null? | Description |
|--------|------|-------|-------------|
| `id` | UUID PK | NOT | Activity identifier |
| `child_id` | UUID | NOT | FK → children.id |
| `type` | TEXT | NOT | One of 6 activity types (see below) |
| `value` | JSONB | NOT | Activity-type-specific payload |
| `recorded_at` | TIMESTAMPTZ | NOT | When activity occurred (backdated allowed) |
| `created_at` | TIMESTAMPTZ | NOT DEFAULT now() | Insert timestamp |

**Note:** `created_at` is not `recorded_at`. Parent can log yesterday's activity (`recorded_at` = yesterday, `created_at` = now).

---

## Activity Types

| Type | value schema (JSONB keys) | UI Screen |
|------|-------------------------|-----------|
| `screen_time` | `{ device: string, duration_minutes: number }` + optional `category: 'leisure' | 'educational'` | Log |
| `sleep` | `{ start_time: string, end_time: string, quality: 'poor' | 'fair' | 'good' }` | Log |
| `meal` | `{ type: string, quality: 'poor' | 'fair' | 'good', food_groups: string[] }` | Log |
| `education` | `{ subject: string, duration_minutes: number }` | Log |
| `nap` | `{ start_time: string, end_time: string, quality: 'poor' | 'fair' | 'good' }` | Log |
| `physical_activity` | `{ type: string, duration_minutes: number }` | Log |

**Missing CHECK constraint gap:** `schema.sql` defines CHECK type IN ('screen_time','sleep','meal','education') but `nap` and `physical_activity` are logged via app. Direct SQL INSERT of those types would violate the constraint. **Needs schema migration to fix.**

---

## value JSONB Examples

**screen_time:**
```json
{
  "device": "Phone",
  "duration_minutes": 90,
  "category": "leisure"
}
```

**sleep:**
```json
{
  "start_time": "21:00:00",
  "end_time": "06:30:00",
  "quality": "good"
}
```

**meal:**
```json
{
  "type": "Lunch",
  "quality": "good",
  "food_groups": ["grains", "protein", "vegetables"]
}
```

---

## Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_activities_child_type` | `(child_id, type)` | Query a child's screen_time events only |
| `idx_activities_child_recorded` | `(child_id, recorded_at DESC)` | Chronological History list per child |
| `idx_activities_recorded` | `recorded_at` | Date-range scans (optional; not currently used) |

**Current queries used:**
- `SELECT * FROM activities WHERE child_id = $1 ORDER BY recorded_at DESC LIMIT 50`
- `SELECT type, COUNT(*) FROM activities WHERE child_id = $1 AND recorded_at >= $2 GROUP BY type`

---

## RLS Policies

| Policy | Command | Definition |
|--------|---------|------------|
| parents_select_activities | SELECT | `child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)` |
| parents_insert_activities | INSERT | `child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)` |
| parents_update_activities | UPDATE | Not used — app never updates; policy should be DENY (if policy exists) |
| parents_delete_activities | DELETE | Not used — app never deletes; policy should be DENY |

**App convention:** Activities are immutable. Edits = delete + re-insert.

---

## Data Access Patterns

1. **Log screen (today):** `WHERE child_id = $1 AND recorded_at >= today_start()`
2. **History screen (paginated):** `WHERE child_id = $1 ORDER BY recorded_at DESC LIMIT 50 OFFSET $2`
3. **AI analysis (Edge Function):** `SELECT * FROM activities WHERE child_id = $1 AND recorded_at >= now() - interval '28 days'` (last 4 weeks)
4. **Dashboard stats:** `SELECT type, COUNT(*) FROM activities WHERE child_id = $1 AND recorded_at = today() GROUP BY type`

---

## NOT NULL vs NULL Fields

- `recorded_at` NOT NULL — every activity must have a timestamp (can be backdated to any past date).
- `value` NOT NULL — always populated with type-specific keys (validation at app layer).
- `created_at` NOT NULL DEFAULT now() — tracking when row was inserted.

---

## Migration Gap (KNOWN ISSUE)

`migration_add_activity_types.sql` added nap and physical_activity to the app's type union but did **not** update the CHECK constraint in `schema.sql`. Result:
- App logs `nap` and `physical_activity` via Supabase client with RLS bypass (insert with service_role key in Edge Function) → succeeds because Supabase does not enforce CHECK on client inserts by default?
- Actually: Supabase uses PostgreSQL; CHECK is enforced on all INSERT/UPDATE. The fact that app logs these types means either:
  - a) the constraint was already updated in the DB but not committed to schema.sql, OR
  - b) service_role key bypasses RLS but NOT CHECK (CHECK always enforced)
- **Conclusion:** schema.sql is out of date. The deployed DB constraint must already include `nap` and `physical_activity` or app would fail. **Action:** reconcile schema.sql with deployed DB.

---

## Related
- [[lib/api#logActivity]] — inserts here
- [[supabase/edge-function-analyze-child]] — reads for AI
- [[app/history-screen]] — reads for display
- [[components/activity-card]] — renders value JSONB
