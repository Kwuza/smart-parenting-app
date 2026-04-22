---
id: history-screen-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/(tabs)/history.tsx
confidence: high
status: active
tags:
  - component
  - screen
  - history
  - smart-parenting-app
  - hci
related:
  - components/activity-card
  - components/child-picker-modal
  - lib/api#getActivitiesByDateRange
  - database/table-activities
---
# Screen: History (app/(tabs)/history.tsx)

**Path:** `app/(tabs)/history.tsx`
**Lines:** 770
**Purpose:** Paginated, date-grouped activity feed with type filtering and child switching.

---

## Layout

```
[Header: "History" + child picker pill]

[Filter Pills — horizontally scrollable]
 ◀ All | Screen Time | Sleep | Meal | Education | Nap | Physical ▶

[SectionList]
  Section: Today
    Activity card 1 (type icon, formatted label, time)
    Activity card 2 ...
  Section: Yesterday, Mon Apr 13
    ...
  Section: Mon, Apr 12
    ...
```

**SectionList** uses `sections` prop: `{ title: string, data: Activity[] }[]`. Each section clamped to first N activities (pagination at section level not implemented; unlimited scroll).

---

## Data Fetching Pattern

```typescript
const PAGE_SIZE = 30
const [page, setPage] = useState(0)
const [sections, setSections] = useState<Section[]>([])

useFocusEffect(
  useCallback(() => {
    loadPage(childId, page)
  }, [childId, page])
)
```

`loadPage()` calls `getActivitiesByDateRange(childId, earliestDate, now)` with offset. Earliest date computed as `today - (page+1) * PAGE_SIZE_DAYS` (rough time-bucketing).

**Total page count not tracked** — infinite scroll by appending new sections when scroll hits bottom.

---

## Filter Pills

7 chips horizontally scrollable. Tapping a pill:
- Filters in-memory by `activity.type` (client-side filter on already-fetched data)
- No server round-trip (History API call fetches all types; client narrows)
- Active pill coral background with white text

**Edge case:** Changing child resets page to 0 and reloads from scratch.

---

## Child Picker Integration

Header pill = same component as Dashboard. Opens modal; selection updates global store → screen reacts via `useAppStore()` and resets list.

---

## Activity Card Rendering

Component: `components/ActivityCard.tsx`

**Props:** `{ activity: Activity }`

**Displays:**
- Leading icon (type-specific emoji or SFSymbol)
- Primary: formatted label (e.g., "Screen time — 1h 30m on Phone")
- Secondary: time (e.g., "Today, 2:30 PM") via `formatDistanceToNow`
- Tertiary: quality badge (if sleep/meal/nap with quality ≠ 'good' shows colored dot)

**Color coding:** left border matches activity type color (same as Dashboard stat colors).

---

## Pull-to-Refresh

`FlatList` with `refreshing` state + `onRefresh = () => { setPage(0); loadPage(); }`. Refresh indicator color = coral theme (`#FF7F60`).

---

## Empty States

- **No children:** empty state with CTA "Add a child" → `app/child/new.tsx`
- **Child exists but no activities:** card saying "No activities yet. Tap + to get started"
- **Filter active but matches none:** "No results for this activity type"

---

## Calendar Highlight Pattern (Planned, Not Implemented)

Originally considered: month view with dots per day. Deferred. Current design: date-section headers only.

---

## Performance

- Each page fetches up to 30 days × ~5 activities/day = ~150 rows max
- `groupByDate()` groups records on JS thread (fast)
- No virtualization within sections (SectionList uses native cell recycling but all cells kept in memory — acceptable for few hundred rows)

**Potential improvement:** VirtualizedFlatList with date-grouped adapter; not needed for current scale.

---

## Time Formatting

Uses `date-fns`:
- `formatDistanceToNow(stub, { addSuffix: true })` → "2 hours ago", "Yesterday at 2:30 PM"
- Section header: Today/Yesterday/locale full date (e.g., "Monday, April 13")

All timestamps from `recorded_at` (not `created_at`) — user-provided activity time.

---

## Known Issues

- **Calendar cell sizing bug** (2026-04-16): replaced `aspectRatio: 1` with fixed `height: 48` + transparent border on the calendar month component to ensure uniform cell sizing across platforms.
- Timezone handling: `recorded_at` stored in UTC; displayed via `new Date().toLocaleString()` which uses device TZ. No TZ offset adjustment needed for family use (all local time).

---

## Related
- [[app/log-screen]] — origin of new activities
- [[database/table-activities]] — source data; `idx_activities_child_recorded` index critical
- [[components/activity-card]] — card UI primitive
- [[lib/api#getActivitiesByDateRange]] — fetch function
- [[components/child-picker-modal]] — child switcher
