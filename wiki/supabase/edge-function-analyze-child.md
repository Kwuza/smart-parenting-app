---
id: edge-function-analyze-child-002
type: entity
created: 2026-04-22
updated: 2026-04-23
source_refs:
  - supabase/functions/analyze-child/index.ts
confidence: high
status: active
tags:
  - supabase
  - edge-function
  - ai-integration
  - smart-parenting-app
  - ollama
related:
  - lib/api#analyzeChild
  - database/table-recommendations
  - database/table-activities
  - database/table-children
  - database/migrations/001_add_insight_type_and_trend
---
# Edge Function: analyze-child

**File:** `supabase/functions/analyze-child/index.ts` (~850 lines)
**Runtime:** Deno (Supabase Edge Functions)
**Trigger:** `POST /functions/v1/analyze-child`
**Auth:** Service role key (bypasses RLS)

---

## Purpose

Generate AI parenting recommendations from activity data. Produces 1-3 recommendations with category, priority, insight type, and trend — then inserts them into the `recommendations` table.

---

## Request / Response

**Request body:**
```json
{
  "child_id": "uuid",
  "child": {
    "id": "uuid",
    "name": "Emma",
    "date_of_birth": "2021-03-15",
    "max_screen_time_minutes": 120,
    "min_sleep_minutes": 600,
    "age_months": 40,
    "gender": "female",
    "height_cm": 96.5,
    "weight_kg": 14.2,
    "bmi_assessment": { "bmi": 15.4, "zScore": -0.3, "percentile": 38.2, "category": "normal", "label": "Healthy weight", "ageMonths": 40 },
    "bedtime": "20:00",
    "wake_up_time": "07:00",
    "breakfast_time": "08:00",
    "lunch_time": "12:00",
    "snack_time": "15:00",
    "dinner_time": "18:00",
    "nap_time": "13:00",
    "activity_time": "10:00",
    "learn_time": "09:00"
  },
  "activities": [
    { "type": "sleep", "value": { "hours": 10 }, "recorded_at": "2026-04-13T22:00:00Z" },
    { "type": "screen_time", "value": { "minutes": 90, "category": "leisure" }, "recorded_at": "2026-04-13T15:00:00Z" }
  ],
  "previous_recommendations": [
    { "id": "uuid", "content": "...", "category": "sleep", "priority": "medium", "created_at": "2026-04-20T10:00:00Z" }
  ]
}
```

**Success response (200):**
```json
{
  "recommendations": [{ "id": "uuid", "content": "...", "category": "sleep", "priority": "medium", "insight_type": "follow_up", "trend": "improving" }],
  "summary": { "confidence": "high", "data_days": 28, "flags": [] }
}
```

**Error responses:**
- `400` — Missing required fields
- `502` — AI service failed or returned unparseable response after retry

---

## Step-by-Step Flow

### 1. Input Enrichment (done client-side in `lib/api.ts`)

`analyzeChild()` computes before sending:
- `age_months` — calculated from `date_of_birth` via `getAgeMonths()`
- `bmi_assessment` — calculated via `lib/bmi.ts` (`assessBmi()`) only if `height_cm`, `weight_kg`, `gender` exist and age is 24-60 months

### 2. Compact Summary Building (`buildCompactSummary()`)

Raw activities → human-readable structured summary. Instead of dumping raw JSON, produces lines like:
```
SLEEP: avg 10.1h/night (range 9.0-11.0h), 28 days logged. Consistency: 0.85. meets min sleep.
SCREEN TIME: avg 145 min/day (+25 min over limit), 28 days logged. Leisure 600 min, Educational 180 min.
MEALS: avg 3.0 meals/day, 12 unique foods, 28 days logged.
```

### 3. Trend Computation (`computeTrends()`)

Compares current period vs previous period (synthetic baseline). Returns:
```typescript
interface TrendDetail {
  direction: 'worsening' | 'stable' | 'improving' | null;
  current: number | null;
  previous: number | null;
  unit: string;
}
```
Trend direction rules:
- Screen time: ↑ worsening if increasing (more is worse)
- Sleep/meals/education/activity: ↑ improving if increasing (more is better)
- ±10% threshold = stable

### 4. Confidence Computation (`computeConfidence()`)

Based on total `days_with_logs` across all activity types:
- `high` — ≥14 log days
- `medium` — 7-13 log days
- `low` — <7 log days (flags as speculative)

Flags added: first analysis, missing key metrics, sparse data.

### 5. Scheduled Activities (`queryScheduledActivities()`)

Queries `scheduled_activities` table directly via service role key (not inferred from logs). Returns real counts of completed/pending/skipped/missed per type.

### 6. Prompt Building (`buildPrompt()`)

Structured sections:
1. **Data Quality** — confidence level + flags
2. **Child Profile** — name, age (computed), gender, BMI assessment
3. **Developmental Context** — 6 age brackets (infant → adolescent) with specific guidance
4. **Routine Schedule** — configured times
5. **Configured Limits** — max screen time, min sleep
6. **Trend Analysis** — per-category trend arrows with values and units
7. **Activity Summary** — compact readable format (not raw JSON dump)
8. **Scheduled Activities** — real planned activity data
9. **Previous Recommendations** — with relative time ("1 day ago") and full content
10. **Changes Since Last Recommendations** — explicit instruction to compare current data vs prior advice

**CRITICAL TRANSPARENCY RULE:** Every recommendation must cite specific data values. Content format enforced: `"[Data citation with specific value]. [How it compares to limit/goal]. [2-3 sentence actionable advice.]"`

### 7. AI Call (Ollama Cloud)

```
POST https://ollama.com/api/chat
Authorization: Bearer <OLLAMA_API_KEY>
{
  "model": "qwen3.5:latest",
  "messages": [{ "role": "user", "content": "<prompt>" }],
  "stream": false,
  "options": { "temperature": 0.4, "num_predict": 2048 }
}
```

**Retry:** 1 retry on parse failure, temperature increased by 0.15 for second attempt.

### 8. Response Parsing

Ollama returns `message.content` as a string. `extractJSON()` searches for ` ```json ... ``` ` block first, then falls back to raw string parse.

### 9. Database Insert

For each recommendation:
```sql
INSERT INTO recommendations
  (child_id, content, category, priority, insight_type, trend, based_on)
VALUES
  ($1, $2, $3, $4, $5, $6, $7)
```
`based_on` stores: period, compact_summary, previous_rec_ids, child_settings, bmi_category, age_months, scheduled_summary, model, confidence.

---

## Response Schema (AI Output)

```json
{
  "recommendations": [
    {
      "content": "Your data shows 145 min/day screen time — 25 min over your 120 min limit. Saturday spiked to 160 min with weekday average at 140 min. Replace weekend tablet time with outdoor play to bring the average down.",
      "category": "screen_time|sleep|nutrition|activity|general",
      "priority": "high|medium|low",
      "insight_type": "risk|opportunity|follow_up|positive",
      "trend": "worsening|stable|improving|null"
    }
  ],
  "summary": {
    "confidence": "high|medium|low",
    "data_days": 28,
    "flags": ["Limited activity history"]
  }
}
```

---

## Insight Type Taxonomy

| Type | When to use |
|------|-------------|
| `risk` | Concerning pattern needing attention (e.g., consistently exceeding limits, poor sleep) |
| `opportunity` | Area with potential to build on (e.g., strong reading interest) |
| `follow_up` | Checking on a specific prior recommendation's effectiveness |
| `positive` | Reinforcing good behavior to encourage continuation |

At least one `follow_up` recommendation is expected when previous recommendations exist and data is sufficient.

---

## Transparency Rule

Every `content` field MUST:
1. Start with a data citation (e.g., "Screen time averaged 145 min/day over 14 days")
2. Explicitly compare against configured limits with delta (e.g., "25 min over your 120 min limit")
3. Reference previous advice by quoting/paraphrasing it (for `follow_up`)
4. Maximum 4 sentences

---

## Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `SUPABASE_URL` | Auto-set | DB connection |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set | Admin privileges |
| `OLLAMA_API_KEY` | Set in Supabase Edge Functions Secrets | Auth to Ollama Cloud |
| `OLLAMA_MODEL` | Set in Supabase Edge Functions Secrets | Model to use (default: `qwen3.5:latest`) |

---

## Error Handling

| Failure | Response | Recovery |
|---------|----------|----------|
| Missing required fields | 400 | Frontend validation |
| Ollama rate limit (429) | 502 + error in response body | Wait or use different model |
| JSON parse fail after retry | 502 | No rows inserted |
| DB insert fail | 502 | Partial inserts possible |

---

## Rate Limiting

Managed client-side in `app/(tabs)/ai.tsx` via AsyncStorage:
- Key: `last_analysis_{child_id}`
- Value: ISO timestamp of last successful run
- One run per child per calendar day
- Persists across app restarts
- Also gates on: no activity data (must log activities first)

---

## Future Improvements

- Move rate limit to server-side (`children.last_analysis_at` column)
- Add `response_format: { type: "json_object" }` when Ollama supports it
- Period-over-period comparison using real previous period data (not synthetic baselines)
- Cache OpenRouter responses in `recommendations` table

---

## Related
- [[lib/api#analyzeChild]] — client caller
- [[database/table-recommendations]] — destination table
- [[database/table-activities]] — source data
- [[app/ai-insights-screen]] — consumer
- [[lib/bmi-calculator]] — BMI calculation used in prompt
