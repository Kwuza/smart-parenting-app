---
id: activity-value-schema-001
type: concept
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - database/table-activities
  - app/log-screen
  - components/activity-form
confidence: high
status: active
tags:
  - schema
  - activity-logging
  - database
  - smart-parenting-app
related:
  - database/table-activities
  - components/log-screen
  - lib/api#createActivity
---
# Activity Value Payload Schema

**Type:** `JSONB` in `activities.value` column
**Schema:** discriminator by `type` — each activity type has a distinct payload shape.
**Validation:** Frontend `zod` schema per activity type; no DB-level JSON schema enforcement.

---

## Type-to-Schema Matrix

| Type | Required Keys | Optional Keys | Value Types |
|------|---------------|---------------|-------------|
| screen_time | `device`, `duration_minutes` | `category` | string, number, enum |
| sleep | `start_time`, `end_time`, `quality` | — | string, string, enum |
| meal | `type`, `quality`, `food_groups` | — | string, enum, string[] |
| education | `subject`, `duration_minutes` | — | string, number |
| nap | `start_time`, `end_time`, `quality` | — | string, string, enum |
| physical_activity | `type`, `duration_minutes` | — | string, number |

**All timestamps:** stored as `HH:MM:SS` strings (24-hour clock, zero-padded). Not TIMESTAMPTZ.

**Enums:**
- `device` — Phone, Tablet, TV, PC, Other
- `category` — leisure, educational (screen_time only)
- `quality` — poor, fair, good (sleep/meal/nap)
- `meal type` — Breakfast, Lunch, Snack, Dinner
- `subject` (education) — free text

---

## Why JSONB?

Activity types diverge in shape. Using JSONB avoids:
- 6 narrow tables (complex joins)
- Sparse column table (many nullable columns per type)
- Schema migrations for new activity types (embargoed; current 6 types fixed)

**Downsides:**
- No declarative constraints at DB level (CHECK could use JSON path but tricky)
- No foreign keys inside `value`
- Indexing limited to GIN on whole column (not used currently)

---

## Example Payloads

**screen_time (leisure, device=Phone):**
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

**education:**
```json
{
  "subject": "Math",
  "duration_minutes": 45
}
```

---

## Time Format Conventions

All TIME-derived values stored as strings:
- Seconds always zero-padded (`"09:30:00"`, not `"9:30:00"`)
- Lexicographically sortable → chronological order guaranteed
- UI input uses `DateTimePicker` time mode → auto-converts to `HH:mm:ss`

**Duration vs Point-in-time:**
- `recorded_at` = point-in-time when log entry is created (TIMESTAMPTZ, now())
- `value.start_time` / `end_time` = wall-clock times for the activity occurrence (not timestamps, just `HH:MM:SS` without date)
- `duration_minutes` = computed scalar (not stored; computed from start/end or direct input)

---

## Validation Stack

| Layer | Responsibility |
|-------|----------------|
| Form inputs | Zod schemas (required fields, enums, numeric bounds) |
| `lib/api.createActivity` | No runtime validation — relies on frontend zod |
| RLS | No JSONB validation |
| Migration CHECK | Does NOT constrain `value` fields (only `type` column) |

**Critical gap:** If a raw SQL INSERT sent malformed `value` (missing keys), DB would accept it. App layer is source of truth.

---

## Querying Inside JSONB

Current queries never drill into JSONB (all filters on parent table columns). If future reports need to filter by, e.g., "all screen_time with duration > 2h", would need:
```sql
SELECT * FROM activities
WHERE type = 'screen_time'
  AND (value->>'duration_minutes')::int > 120
```
with GIN index on `value` (not yet present).

---

## Size Estimate

Each activity row ≈ 300–500 bytes average (including JSONB). With 100 activities/month → ~50KB/year per child. Negligible for PostgreSQL autovacuum.

---

## Evolution & Versioning

Adding a new activity type requires:
1. Add type string to `ActivityType` union in TypeScript
2. Add zod schema discriminator case
3. Add enum option to any UI type selectors
4. Update CHECK constraint in `schema.sql` (currently only 4 types)
5. Update this concept page schema matrix

No `value` migration needed (new keys just appear).

---

## Related
- [[database/table-activities]] — host table + indexes
- [[components/log-screen]] — UI that produces these payloads
- [[lib/api#createActivity]] — writer function
- [[concepts/activity-type-colors]] — UI mapping per type
