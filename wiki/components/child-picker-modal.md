---
id: child-picker-modal-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - components/ScreenHeader.tsx (modal embedded)
  - app/(tabs)/dashboard.tsx
  - app/(tabs)/log.tsx
confidence: high
status: active
tags:
  - component
  - modal
  - smart-parenting-app
  - hci
related:
  - stores/auth
  - components/dashboard-screen
  - components/log-screen
  - components/history-screen
  - concept/child-picker-state-propagation
---
# Component: ChildPickerModal (Compact)

**Implementation:** Inline within `components/ScreenHeader.tsx` as `ChildPickerCompact` — not a separate file yet.
**Purpose:** Global child selector dropdown modal — invoked from any screen's header.

---

## Invocation Points

| Screen | Trigger Control |
|--------|----------------|
| Dashboard | Child name pill in header |
| Log | Same |
| History | Same |
| AI Insights | Same |

---

## Visual Design

**Closed state (pill):**
```
👦 Alex Jr. ▾
```
Circle avatar (child photo or fallback emoji), name (truncated to 12 chars if long), down chevron. Coral ring if currently selected.

**Open modal:**
Full-screen modal with transparent scrim (rgba(0,0,0,0.4)).
Centered card:
```
Select Child
────────────────────
👦 Alex Jr.   ●
👶 Sam        ○
[Add New Child] (link)
```

Selection radio-dot shows current; tap to select, tap outside to dismiss.

---

## State Interaction

1. User taps pill
2. Modal opens — children list from `useAppStore(s => s.children)` (already loaded)
3. User taps child → `setSelectedChildId(child.id)` called on store
4. Modal dismisses (`setOpen(false)`)
5. All subscribed screens re-render with new `selectedChildId`

**No API call on selection** — store update instantaneous; data fetch on next screen focus (useFocusEffect).

---

## Children List Source

From store's `children` array, filtered `deleted_at IS NULL`. Already hydrated by Dashboard on app launch (or from AsyncStorage cache). Sorted alphabetically name ascending.

---

## Empty State

If no children exist (first launch):
Modal shows "No children yet" + "Add your first child" CTA → navigates to `app/child/new.tsx`.

---

## Add Child Shortcut

Bottom of list: `[+ Add Child]` cell — navigates to `app/child/new.tsx`. After creation, new child auto-selected and modal closes (child creation flow calls `setSelectedChildId` directly).

---

## Accessibility

- `accessibilityLabel`: "Select child, current: Alex Jr."
- `accessibilityHint`: "Double-tap to open child selection list"
- Children rows: `accessibilityRole="button"`

---

## HCI Principles Applied

- **Recognition over recall:** Child avatar+name always visible, not hidden in menu
- **User control:** Can switch context instantly from any screen; state propagates globally
- **Consistency:** Identical modal across all screens (reduces learning curve)

---

## Known Limitations

- No search/filter when >10 children (not a current use case; max likely 5)
- Does not show child age (only name + avatar) — could add subtle age indicator if needed
- No re-order or favorite pinning

---

## Related
- [[stores/auth]] — store with `selectedChildId`
- [[components/dashboard-screen]] — header integration
- [[app/child/new-screen]] — add-child destination
- [[concepts/child-picker-state-propagation]] — full data flow explanation
- [[components/screen-header]] — containing component
