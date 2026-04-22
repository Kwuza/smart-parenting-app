---
id: table-alerts-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - database/schema.sql
confidence: medium
status: active
tags:
  - database
  - table
  - alerts
  - smart-parenting-app
  - rls
related:
  - database/table-children
  - app/ai-insights-screen
  - lib/api#getAlerts
---
# Table: alerts

**Purpose:** In-app notification-like messages — critical child-related events (not system notifications). Different from Expo local notifications (which are time-based reminders).

**Current status:** Table exists; backend queries implemented (`getAlerts()`); frontend UI not yet implemented (placeholder in AI Insights screen).

**Size:** Very small; intended for rare, high-priority alerts (e.g., "Child missed 3-day meal log", "BMI percentile crossed threshold").

---

## Columns

| Column | Type | Null? | Description |
|--------|------|-------|-------------|
| `id` | UUID PK | NOT | Alert identifier |
| `child_id` | UUID | NOT | FK → children.id |
| `type` | TEXT | NOT | `'bmi_threshold'`, `'inactivity'`, `routine_missed'`, etc. |
| `message` | TEXT | NOT | Human-readable alert text |
| `severity` | TEXT | YES | `'low' | 'medium' | 'high'` |
| `acknowledged` | BOOLEAN | NOT DEFAULT false | Has parent seen/dismissed |
| `created_at` | TIMESTAMPTZ | NOT DEFAULT now() | |

---

## RLS Policies

Same subquery pattern as other child-scoped tables:

```sql
CREATE POLICY "parents can select own alerts" ON alerts
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL
    )
  );
-- INSERT/UPDATE/DENY similar (likely only INSERT from service_role backend, UPDATE only acknowledged flag by parent)
```

---

## Data Flow (Planned)

1. Backend logic (cron or sync trigger) scans recent activities for anomaly patterns
2. If condition met, INSERT alert row (service_role)
3. Frontend polls `getAlerts(childId)` on AI Insights tab entrance
4. UI shows card per alert with Dismiss button (sets `acknowledged = true`)

**Current reality:** Only step 2 (test data inserts) and step 3 (query) exist. No UI, no generation logic.

---

## Related
- [[lib/api#getAlerts]] — read endpoint
- [[database/table-children]] — parent via child_id
- [[app/ai-insights-screen]] — placeholder "Alerts" card exists but empty
