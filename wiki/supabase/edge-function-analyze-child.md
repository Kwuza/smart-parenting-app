---
id: edge-function-analyze-child-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - supabase/functions/analyze-child/index.ts
confidence: high
status: active
tags:
  - supabase
  - edge-function
  - ai-integration
  - smart-parenting-app
  - openrouter
related:
  - lib/api#runAiAnalysis
  - database/table-recommendations
  - database/table-activities
  - database/table-children
---
# Edge Function: analyze-child

**File:** `supabase/functions/analyze-child/index.ts` (328 lines)
**Runtime:** Deno (Supabase Edge Functions)
**Trigger:** `POST /functions/v1/analyze-child`
**Auth:** Service role key (bypasses RLS)
**Cost:** OpenRouter free tier — negligible

---

## Purpose

Generate AI parenting recommendations from last 28 days of activity data. Inserts 3–5 rows into `recommendations` table.

**Why Edge Function not client-side?**
- Avoid exposing service_role key to client
- Keep expensive aggregation on server (less data transfer)
- Consistent audit through `based_on` JSONB field

---

## Request / Response

**Request body:**
```json
{ "childId": "uuid-here" }
```

**Success response (200):**
```json
{ "success": true, "count": 4 }
```

**Error response (502/504):**
```json
{ "error": "AI service unavailable" }
```

---

## Step-by-Step Flow

1. **Auth + child validation**
   Verify `childId` exists (SELECT from children). 404 if not found.

2. **Fetch recent activities**
   ```sql
   SELECT * FROM activities
   WHERE child_id = $1 AND recorded_at >= (now() - interval '28 days')
   ```
   Returns up to ~500 rows typical.

3. **Aggregate stats** (JS loop)
   Compute per-type aggregates:
   - sleep: avg minutes, consistency score
   - screen_time: total leisure vs educational minutes
   - meals: frequency, quality counts
   - education: total minutes, subject diversity
   - nap: avg duration, quality
   - physical_activity: total minutes, type variety

   Stores in `stats` object for prompt.

4. **Fetch previous recommendations**
   `SELECT * FROM recommendations WHERE child_id = $1 ORDER BY created_at DESC LIMIT 3`
   For `based_on.previous_rec_ids` field.

5. **Build zero-shot prompt**
   System role: "You are an experienced child development advisor..."
   Context: child profile (name, age), stats summary, previous recommendations (numbered)
   Constraints: respond with JSON array of 3–5 items, each with `{ category, priority, content }`

6. **Call OpenRouter API**
   Model: `openrouter/elephant-alpha` (free, no key in code — uses SUPABASE_ANON_KEY? Actually Edge Function env var `OPENROUTER_API_KEY`)
   Endpoint: `https://openrouter.ai/api/v1/chat/completions`
   payload: `{ model, messages: [{role:'system'..}, {role:'user'..}], temperature: 0.7 }`

7. **Parse response**
   Extracts `choices[0].message.content` (markdown code block with JSON array). Regex-based extraction; fallback text split.

8. **Insert recommendations**
   For each parsed item:
   ```sql
   INSERT INTO recommendations (child_id, content, category, priority, based_on)
   VALUES ($1, $2, $3, $4, $5)
   ```
   `based_on` = full context object (period, activity_summary, previous_rec_ids, child_settings, model).

9. **Return** `{ success: true, count: N }`

---

## Prompt Engineering (Excerpt)

```
You are a child development advisor. Analyze the following 28-day activity summary for {childName}, age {ageYears}y {ageMonths}m.

Activity summary:
- Sleep: avg 540 mins/night, consistency medium
- Screen time: 1200 total (leisure 800, educational 400)
- Meals: 14 logged, avg quality good, food groups grains/protein/vegetables
...

Previous recommendations:
1. [Apr 7] Establish consistent bedtime... (priority: high)
2. [Apr 10] Limit leisure screen time... (priority: medium)

Provide 3–5 new recommendations prioritized as high/medium/low.
Each recommendation must be a concise actionable paragraph (2–3 sentences).
Respond in JSON format only: [{ "category": "sleep", "priority": "high", "content": "..." }]
```

---

## Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `SUPABASE_URL` | Supabase automatically set | DB connection |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set | Admin privileges |
| `OPENROUTER_API_KEY` | Set in function config | Auth to OpenRouter |

**No hardcoded secrets.**

---

## Error Handling

| Failure | Response | Recovery |
|---------|----------|----------|
| Child not found | 404 | Frontend shows "Child deleted" |
| OpenRouter timeout/502 | 502 | Frontend toast "AI service unavailable — try again later" |
| Database insert fail | 502 | Logged; partial inserts possible |
| JSON parse fail | 502 | Edge Function returns 502; no recs stored |

**Retry policy:** none — frontend must re-tap button.

---

## Idempotency

None. Calling twice creates two batches (different `created_at` timestamps). Frontend `shouldRunAiAnalysis()` prevents double-call same day.

---

## Cost Analysis

OpenRouter elephant-alpha: free (unlimited?) — monitor for rate limits in production.

**Token usage per call:** ~2K input tokens (28-day stats summary) + ~1K output tokens (4 recs × ~250 tokens). Negligible.

---

## Performance

- Cold start: ~1s (Deno runtime init)
- Warm: ~500ms total (DB 100ms, aggregation 50ms, OpenRouter 200–500ms)
- Frontend button disabled ~3s total (acceptable)

---

## Testing Strategy

Currently no automated Edge Function tests. Manual:
1. Create test child with activities
2. Hit endpoint via Supabase `functions.invoke('analyze-child', { body: { childId } })`
3. Verify recommendations table populated with 3–5 rows, `based_on` populated

---

## Future Improvements

- Add per-child `last_analysis_at` column to children table (instead of querying recommendations)
- Debounce rapid taps on frontend to prevent duplicate Edge Function calls
- Cache OpenRouter responses locally? Not needed due to natural date bucket
- Store raw AI response in `recommendations.raw_payload` for audit

---

## Related
- [[lib/api#runAiAnalysis]] — client caller
- [[lib/api#shouldRunAiAnalysis]] — pre-check
- [[database/table-recommendations]] — destination table
- [[database/table-activities]] — source data
- [[app/ai-insights-screen]] — consumer
