---
id: database-schema-overview-001
type: concept
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - database/schema.sql
  - database/migration_child_routine.sql
  - database/migration_gender.sql
  - database/migration_add_activity_types.sql
confidence: high
status: active
tags:
  - database
  - schema
  - smart-parenting-app
  - supabase
  - rls
related:
  - database/table-children
  - database/table-activities
  - database/table-recommendations
  - database/table-alerts
  - lib/api
---
# Database Schema Overview

**Engine:** PostgreSQL via Supabase
**Schema:** `public` (default)
**RLS:** Enabled on all 4 user-facing tables
**Tables:** 4 core + 1 (future: `user_settings`)

---

## Entity Relationship Diagram (Text)

```
auth.users (Supabase managed)
    ↑ 1:FK
children (parent_id → auth.users.id)
    ↑ 1:FK
activities (child_id → children.id)
    ↑ 1:FK
recommendations (child_id → children.id)
    ↑ 1:FK
alerts (child_id → children.id)
```

**Cardinality:** One parent → many children → many activities/recommendations/alerts.

---

## Table Reference Quick Table

| Table | Purpose | Row Count (est) | Key Indexes |
|-------|---------|-----------------|-------------|
| [[database/table-children]] | Child profiles + routine schedule | 1–10 per family | `idx_children_parent` |
| [[database/table-activities]] | Activity logs (6 types) | 100s per child/month | `idx_activities_child_type`, `idx_activities_child_recorded` |
| [[database/table-recommendations]] | AI-generated advice | ~1 per child/week | `idx_recommendations_child` |
| [[database/table-alerts]] | In-app notifications | Few, critical only | `idx_alerts_child` |

**Total estimated size:** <100KB for typical household (negligible).

---

## RLS Policy Pattern (All Tables)

Every table follows the same **subquery pattern**:

```sql
-- Example: children SELECT
CREATE POLICY "parents can select own children" ON children
  FOR SELECT USING (
    parent_id = auth.uid()
    AND deleted_at IS NULL
  );

-- Example: activities SELECT (subquery)
CREATE POLICY "parents can select own children's activities" ON activities
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM children
      WHERE parent_id = auth.uid() AND deleted_at IS NULL
    )
  );
```

**Why subquery?** Prevents direct parent_id tampering on child tables. Child references validated against parent's owned children set.

**Policies per table:** SELECT / INSERT / UPDATE / DELETE (separate policies, same pattern).

---

## Critical Constraints

1. **activities.type CHECK constraint gap:**
   ```sql
   CHECK (type IN ('screen_time', 'sleep', 'meal', 'education'))
   ```
   **Missing:** `nap`, `physical_activity`. These are logged via app but would fail if direct SQL enforces constraint. Needs migration to expand CHECK or convert to foreign key to `activity_types` lookup table.

2. **children.deleted_at soft-delete:**
   - RLS filters `deleted_at IS NULL`
   - No ON DELETE CASCADE to activities — intentional (preserve history)
   - Frontend filters children by `deleted_at IS NULL`

3. **recommendations.based_on JSONB:**
   - Audit trail field: period, activity_summary, previous_rec_ids, child_settings, model
   - Not queried by backend (only read by app for display)

---

## Migration Timeline

| Migration | Date | Change |
|-----------|------|--------|
| `schema.sql` | baseline | 4 tables, base RLS |
| `migration_add_activity_types.sql` | 2026-04-12 | Added `nap`, `physical_activity` types (only partial — CHECK not updated) |
| `migration_child_routine.sql` | 2026-04-14 | 11 TIME/NUMERIC columns for routine schedule (bed/wake/meals/activities) + BMI trigger |
| `migration_child_settings.sql` | 2026-04-14 | `max_screen_time_minutes`, `min_sleep_minutes` per-child limits |
| `migration_gender.sql` | 2026-04-16 | ADD COLUMN `gender` TEXT CHECK (male/female) |

---

## Data Retention Policy (Code-Level)
- Activities: no automatic prune; UI History shows up to 90 days (paginated older)
- Recommendations: replaced by new batch; old rows accumulate (consider TTL index)
- Alerts: `acknowledged` flag + client-side filter; DB never deletes automatically

---

## Performance Indexes
- Compound `(child_id, type)` for activity type queries (History filter pills)
- Compound `(child_id, recorded_at DESC)` for chronological queries (History list)
- Single-column foreign keys: `activities.child_id`, `recommendations.child_id`, `alerts.child_id`
- Single-column `children.parent_id` for parent lookup

**Missing indexes (potential):**
- `activities(recorded_at)` alone for date-range scans without child filter
- `recommendations(child_id, created_at DESC)` if latest-first queries become common

---

## Related
- [[supabase/edge-function-analyze-child]] — uses all 4 tables
- [[lib/api]] — wraps all table operations with RLS-aware queries
- [[stores/auth]] — holds `auth.uid()` for RLS context
- [[database/migration-child-routine]] — routine columns deep dive
