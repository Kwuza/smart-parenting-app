---
id: child-picker-state-propagation-001
type: concept
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - stores/auth.ts
  - components/child-picker-modal.tsx
  - app/(tabs)/dashboard.tsx
  - app/(tabs)/log.tsx
  - app/(tabs)/history.tsx
confidence: high
status: active
tags:
  - concept
  - state-management
  - smart-parenting-app
  - zustand
related:
  - stores/auth
  - components/child-picker-modal
  - components/dashboard-screen
  - components/log-screen
  - components/history-screen
  - components/ai-insights-screen
---
# Child Picker State Propagation Pattern

**Problem:** Selecting a child in one screen should update data shown in all other screens (Dashboard, Log, History, AI Insights) without prop drilling.

**Solution:** Global Zustand store field `selectedChildId` + subscription.

---

## Data Flow Diagram (text)

```
[ChildPickerModal] --(onSelect)--> setSelectedChildId(child.id)
      ↓
stores/auth.selectedChildId (global state)
      ↓
[Subscription] --useAppStore()--> childId variable
      ↓
API calls: getActivities(childId), getRecommendations(childId), etc.
      ↓
Screens re-render with new child's data
```

---

## Store Field

`stores/auth.ts`:
```typescript
selectedChildId: state.selectedChildId,
setSelectedChildId: (id) => state.selectedChildId = id,
```

**Default:** `null` (no child selected yet). Set after first child is fetched (in Dashboard `useEffect`) or after explicit picker selection.

**Persistence:** Via Zustand persist middleware — survives app restarts (good; user likely doesn't switch families often).

---

## Modal Contract

**File:** `components/ChildPickerModal.tsx` (shared)

**Props:**
```typescript
{ selectedChildId: string | null
  children: Child[]
  onSelect: (child: Child) => void
}
```

**Behavior:**
- Renders horizontal list of CircleAvatar + name chips
- Highlights currently selected child (coral ring)
- On tap `onSelect(child)` → parent sets store via `setSelectedChildId(child.id)`
- Modal dismisses automatically

**Where launched:**
- Dashboard header (child name pill)
- Log screen (same)
- History screen (same)
- AI Insights screen (same)

---

## Screen Subscription Pattern

Each screen that cares about current child:

```typescript
import { useAppStore } from '@/stores/auth'

export default function DashboardScreen() {
  const selectedChildId = useAppStore(s => s.selectedChildId)
  const children = useAppStore(s => s.children)   // full list

  // Derived: actually selected child object
  const selectedChild = children.find(c => c.id === selectedChildId)

  // use selectedChild to query API
}
```

**Zustand best practice:** use single `useAppStore()` call with shallow selector (not destructuring entire store).

---

## First-Run Initial Selection

**Scenario:** First launch, no children exist yet → `selectedChildId = null`.
User adds first child via `app/child/new.tsx`:
1. POST create child
2. On success → refresh children list (store update)
3. Auto-select new child: `setSelectedChildId(newChild.id)`

Result: Dashboard automatically shows newest child stats without manual pick.

---

## Multi-Child Sorting

Children displayed in picker modal sorted:
1. Alphabetical by name (case-insensitive)
2. Age ascending (within same name — unlikely)

Not by creation date.

---

## Bounds Checking

Screens requesting data should deal with `selectedChildId = null`:
- Show empty state "Select a child"
- Or auto-open child picker modal

Currently: Dashboard shows empty stats until child selected; Log screen navigated via quick-add passes `childId` param so pre-fills without relying on store (but store still updated via `setSelectedChildId` in onMount).

---

## Edge Cases

| Condition | Behavior |
|-----------|----------|
| Child deleted while selected | API call fails (RLS); screen catches error, resets `selectedChildId = null`, shows picker |
| Rapid picker taps | Store updates synchronously; screens re-render in same frame (no flicker) |
| Offline mode | Store state unaffected; API calls fail → error UI |
| App rehydrate on cold start | `selectedChildId` restored from AsyncStorage before layout renders → child already selected, no flash of default state |

---

## Related
- [[stores/auth]] — store definition (source of truth)
- [[components/child-picker-modal]] — UI control
- [[components/dashboard-screen]] — consumer example
- [[app/log-screen]] — consumer with prefill via route params
- [[app/ai-insights-screen]] — consumer for analysis scope
