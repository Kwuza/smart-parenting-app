---
id: table-recommendations-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - database/schema.sql
confidence: high
status: active
tags:
  - database
  - table
  - recommendations
  - smart-parenting-app
  - rls
  - ai-insights
related:
  - database/table-children
  - supabase/edge-function-analyze-child
  - app/ai-insights-screen
---
# Table: recommendations

**Purpose:** AI-generated parenting advice, one batch per child per day. Cached results to avoid re-running AI unnecessarily.

**Size:** Small. ~1 row per child per day if used daily. Old rows kept for history view.

**Created by:** Supabase Edge Function `analyze-child` (service_role key, bypasses RLS)
**Read by:** Frontend app via `getRecommendations(childId)`

---

## Columns

| Column | Type | Null? | Description |
|--------|------|-------|-------------|
| `id` | UUID PK | NOT | Recommendation identifier |
| `child_id` | UUID | NOT | FK → children.id |
| `content` | TEXT | NOT | Human-readable advice paragraph |
| `category` | TEXT | YES | `'sleep'`, `'screen_time'`, `'nutrition'`, `'activity'`, `'general'` (derived) |
| `priority` | TEXT | YES | `'low' | 'medium' | 'high'` (AI-assigned) |
| `created_at` | TIMESTAMPTZ | NOT DEFAULT now() | When generated |
| `based_on` | JSONB | YES | Audit trail: { period, activity_summary, previous_rec_ids, child_settings, model } |

---

## based_on JSONB Schema

```json
{
  "period": "2026-03-17 to 2026-04-14",
  "activity_summary": {
    "sleep": { "avg_minutes": 540, "consistency": "medium" },
    "screen_time": { "total_minutes": 1200, "breakdown": { "leisure": 800, "educational": 400 } },
    ...
  },
  "previous_rec_ids": ["uuid-1", "uuid-2"],
  "child_settings": {
    "max_screen_time_minutes": 120,
    "min_sleep_minutes": 540
  },
  "model": "openrouter/elephant-alpha"
}
```

**Purpose:** Explainability for AI recommendations — show parent what data influenced the advice.

---

## RLS Policies

| Policy | Command | Definition |
|--------|---------|------------|
| parents_select_recommendations | SELECT | `child_id IN (SELECT id FROM children WHERE parent_id = auth.uid() AND deleted_at IS NULL)` |

**No INSERT/UPDATE/DELETE policies for parents.** Only Edge Function inserts; no client-side mutation.

---

## Lifecycle

1. User taps "Run AI Insights" (AI tab)
2. Frontend checks: `SELECT EXISTS(SELECT 1 FROM recommendations WHERE child_id = $1 AND created_at >= today())`
   - If exists: skip Edge Function call, return cached
   - If none: call `supabase/functions/analyze-child`
3. Edge Function:
   - Aggregates 28-day activity stats
   - Builds zero-shot prompt
   - Calls OpenRouter
   - Parses response into 3–5 recommendations with category/priority
   - Inserts rows via `supabase.from('recommendations').insert()` using service_role key
   - Populates `based_on` with full context
4. Frontend reloads recommendations, displays with priority-based color badges (high = red, medium = amber, low = blue)

---

## Display Priority Colors

| priority | Color | Usage |
|----------|-------|-------|
| `high` | `#EF4444` (red-500) | Border-left coral accent on card |
| `medium` | `#F59E0B` (amber-500) | Accent |
| `low` | `#3B82F6` (blue-500) | Subtle |

If `priority` is NULL or unrecognized, treat as `medium`.

---

## Caching Strategy

- **Cache key:** `(child_id, DATE(created_at))`
- **Cache duration:** until next calendar day (user can manually re-run anytime)
- **Invalidation:** New batch overwrites previous day's row (not UPDATE — new INSERT with new date). History view orders by `created_at DESC`; latest day appears first.

**User control:** "Run AI Insights" button always visible; if already generated today, tapping shows toast "Recommendations already generated today" (skips API call).

---

## Related
- [[supabase/edge-function-analyze-child]] — sole writer
- [[app/ai-insights-screen]] — consumer
- [[lib/api#getRecommendations]] — read API
- [[lib/api#runAiAnalysis]] — triggers Edge Function
