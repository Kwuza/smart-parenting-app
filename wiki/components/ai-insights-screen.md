---
id: ai-insights-screen-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/(tabs)/ai.tsx
  - supabase/functions/analyze-child/index.ts
confidence: high
status: active
tags:
  - component
  - screen
  - ai-insights
  - smart-parenting-app
  - ai-integration
related:
  - lib/api#runAiAnalysis
  - lib/api#getRecommendations
  - supabase/edge-function-analyze-child
  - database/table-recommendations
  - database/table-alerts
---
# Screen: AI Insights (app/(tabs)/ai.tsx)

**Path:** `app/(tabs)/ai.tsx`
**Lines:** ~457
**Purpose:** Display AI-generated parenting recommendations + trigger new analysis.

---

## Layout

```
[Header: "AI Insights" + child picker pill]

[Insights Status Card]
  • Last analyzed: Apr 14, 2026 at 10:30 AM
  • Tap "Run AI Insights" to generate new advice

[Run Analysis Button]
  [Run AI Insights] (coral, disabled if already run today)

[Recommendations List]
  ┌─────────────────────────────────┐
  │Priority: High   [red border-left]
  │ Ensure consistent bedtime...   │
  │ based on last 28 days...        │
  └─────────────────────────────────┘
  (3–5 cards, priority-sorted: high→medium→low)

[Alerts Card — PLACEHOLDER, NOT IMPLEMENTED]
  (No UI yet; backend table exists)
```

---

## Data Flow

1. Mount → `getRecommendations(childId)` fetches all rows DESC by `created_at`
2. Extract most recent batch (today's) → display as cards
3. If no today batch → show "Run AI Insights" button enabled
4. Tap button → `shouldRunAiAnalysis()` checks if today exists (race-safe via separate call)
5. If OK → `runAiAnalysis(childId)` calls Edge Function
6. On Edge Function resolve → refresh recommendations list

---

## Run AI Insights Button

**Enabled state:** `!hasTodaysRecommendation`
**Disabled state:** shows "Already analyzed today — check back tomorrow"

**Press handler:**
```typescript
const handleRun = async () => {
  setLoading(true)
  try {
    await runAiAnalysis(selectedChild.id)   // calls Edge Function
    await loadRecommendations()             // re-fetch
    toast.success('Recommendations ready')
  } catch (err) {
    toast.error('AI analysis failed — try again')
  } finally {
    setLoading(false)
  }
}
```

Loading overlay: spinner over button text.

---

## Recommendation Card Rendering

Top-level component may be inline or separate: `components/RecommendationCard.tsx`

**Priority border-left:**
- high → `#EF4444` (red-500, 4px border)
- medium → `#F59E0B` (amber-500)
- low → `#3B82F6` (blue-500)

**Body:**
- Category badge (small pill: "Sleep" / "Nutrition" / etc.)
- Content paragraph (plain text)
- Footer (optional): "Based on last 28 days · elephant-alpha model"

**based_on expandable?** Not implemented — audit trail not shown to parent (internal only).

---

## Edge Function Call Details

**Function:** `supabase/functions/analyze-child`
**Method:** POST with JSON `{ childId }`
**Auth:** Service role key (configured in Supabase dashboard)
**Timeout:** ~10 seconds (OpenRouter free tier latency variable)

**Success response:** `{ success: true, count: 4 }`
**Error response:** HTTP 502/504 on timeout or OpenRouter failure

**Caching logic:** `runAiAnalysis()` does NOT check `shouldRunAiAnalysis()` — caller must. Prevents race where two devices tap simultaneously.

---

## Caching Policy

**Natural key:** `(child_id, DATE(created_at))` — one batch per child per calendar day.

**Why date bucket not TTL?** Simpler; user sees historical batches in future (e.g., "last week's advice").

**Potential bug:** If user runs twice on same day before first batch completes, second call creates duplicate batch (two rows same day). Edge Function does not deduplicate. **Mitigation:** UI disables button after first tap; no concurrent calls.

---

## Priority Assignment

Edge Function assigns based on activity severity signals:
- Sleep deficit → high
- Screen time excess → medium
- Meal irregularity → low

**No frontend override** — priority comes from AI response.

---

## Alerts Placeholder

Card at bottom labeled "Alerts" with empty state "No critical alerts". Implementation deferred. Table `alerts` exists; API `getAlerts()` returns rows; no UI consumed yet.

---

## Related
- [[lib/api#runAiAnalysis]] — triggers Edge Function
- [[supabase/edge-function-analyze-child]] — backend AI logic
- [[database/table-recommendations]] — storage
- [[lib/bmi-calculator]] — BMI data potentially included in AI prompt
- [[components/activity-card]] — similar card pattern (different styling)
