---
id: dashboard-screen-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/(tabs)/index.tsx
  - components/stat-card.tsx
confidence: high
status: active
tags:
  - component
  - screen
  - dashboard
  - smart-parenting-app
  - hci
related:
  - components/stat-card
  - lib/api#getTodayActivities
  - app/log-screen
---
# Screen: Dashboard (app/(tabs)/index.tsx)

**Path:** `app/(tabs)/index.tsx`
**Lines:** ~785
**Layout:** ScrollView vertical + 5 stat cards + 6-type activity grid + child selector header

---

## Purpose

Home screen — daily snapshot dashboard. Immediate visibility into today's activity counts and quick entry points.

**Key HCI principle:** Visibility of system status + recognition over recall.

---

## Visual Layout

```
[Child Selector Pill]   ← taps cycle children, opens modal on tap
────────────────────────────────────────────────
 Todays Activity
────────────────────────────────────────────────
[Screen Time stat card]  [Sleep stat card]
[Meals stat card]        [Education stat card]
[Naps stat card]         [Physical stat card]

────────────────────────────────────────────────
Quick Add
────────────────────────────────────────────────
[Screen Time icon] [Sleep icon] [Meal icon] ...
(6 circular icon buttons — tap to open Log screen
 with type pre-selected and child already set)
```

---

## Data Flow

1. **On mount:** fetch current child (from store), fetch today's activities
2. **Compute stats:** `getTodayActivities(childId)` → reduce by `type` → counts/durations
3. **Render stats:** StatCard components (value + label + icon)
4. **Quick-add buttons:** Each navigates to `app/log.tsx` with `initialType` param (preselects activity type)

**Refresh pattern:** Pull-to-refresh with coral tint (History has same pattern). `useFocusEffect` to reload when tab gains focus.

---

## StatCard Component

**File:** `components/StatCard.tsx` (reusable)

**Props:**
```typescript
interface StatCardProps {
  icon: string         // emoji
  label: string        // "Screen Time"
  value: string        // "1h 30m" or "3 meals"
  color: string        // coral/emerald/amber/violet
  onPress?: () => void // navigation to Log screen with filter
}
```

**Design token colors:**
- screen_time → `#FF7F60` (coral)
- sleep → `#10B981` (emerald)
- meal → `#F59E0B` (amber)
- education → `#8B5CF6` (violet)
- nap → `#64748B` (slate)
- physical_activity → `#06B6D4` (cyan)

StatCard renders colored left border accent.

---

## Child Selector Pills

**Pattern:** Horizontal scrollable row of CircleAvatar+name chips. Active child highlighted with coral ring.

**Interaction:** Tap → opens modal `components/ChildPickerModal` (shared across Dashboard, Log, History, AI Insights). Selection updates `useAppStore` globally.

---

## Quick-Add Grid

6 circular icon buttons aligned 3×2.

**Navigation:** `router.push('/(tabs)/log?type=screen_time&childId=...')`

Log screen reads `useLocalSearchParams()` to pre-select type.

---

## Empty States

- No children yet: renders empty state with CTA "Add a child" → `app/child/new.tsx`
- Child exists but no activities today: stats show "0", quick-add still visible

---

## Performance

- Single API call: `getTodayActivities(childId)` once
- Stat computation in render (fast, <10 items)
- No pagination or heavy lists

---

## Known Quirks

- Child selector pill uses Zustand store; if store not hydrated on initial mount, briefly shows stale state → resolved with loading spinner overlay
- StatCard value formatting uses helper `formatDuration(minutes)` — handles pluralization ("1 hour" vs "2 hours")

---

## Related
- [[app/log-screen]] — navigation destination for quick-add
- [[components/stat-card]] — UI building block
- [[stores/app-store]] — holds selectedChildId
- [[lib/api#getTodayActivities]] — data source
- [[components/child-picker-modal]] — shared selector modal
