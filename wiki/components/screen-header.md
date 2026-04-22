---
id: screen-header-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - components/ScreenHeader.tsx
confidence: high
status: active
tags:
  - component
  - screen-header
  - smart-parenting-app
  - hci
related:
  - components/log-screen
  - components/history-screen
  - components/ai-insights-screen
  - components/child-picker-modal
---
# Component: ScreenHeader

**File:** `components/ScreenHeader.tsx`
**Purpose:** Shared header bar across Log, History, AI Insights screens — consistent icon + title + child picker pill.

---

## Layout

```
[Icon (left)]   [Title (center)]                             [Child picker pill (right)]
[📝]            "Log Activity"                               👦 Alex Jr. ▾
```

**Fixed height:** 56 (Android), 60 (iOS). Uses `react-native-paper` `Appbar` or custom View.

---

## Props

```typescript
interface ScreenHeaderProps {
  icon: 'log' | 'history' | 'ai' | 'settings'  // determines SFSymbol/MaterialIcon
  title: string
  showChildPicker?: boolean   // false on screens without child context (login)
}
```

**Child picker pill:** Renders `ChildPickerCompact` — circle avatar + name + chevron → taps open modal.

---

## Usage Pattern

```tsx
<ScreenHeader icon="log" title="Log Activity" />
<ScreenHeader icon="history" title="History" />
<ScreenHeader icon="bulb" title="AI Insights" />
```

Included at top of each screen's ScrollView (not sticky; scrolls away with content).

---

## Consistency Rationale

HCI principle: **Consistency & Standards** — same header layout reduces cognitive load when switching tabs. User always knows where to tap to change child.

---

## Related
- [[components/child-picker-modal]] — tapped child picker opens this
- [[components/log-screen]] — consumer
- [[components/history-screen]] — consumer
- [[components/ai-insights-screen]] — consumer
- [[stores/auth]] — selectedChildId state read by header
