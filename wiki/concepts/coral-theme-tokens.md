---
id: coral-theme-tokens-001
type: concept
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/theme.ts (if exists)
  - components/stat-card.tsx
confidence: high
status: active
tags:
  - theme
  - design-tokens
  - smart-parenting-app
  - hci
related:
  - components/stat-card
  - components/dashboard-screen
  - components/log-screen
---
# Coral Theme Tokens

**Palette source:** Applied 2026-04-12 during UI redesign. Coral (#FF7F60) primary, cream background.

---

## Color Map

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#FF7F60` | Active tabs, CTA buttons, borders, selected chips |
| `primaryContainer` | `#FFE5E0` | Subtle backgrounds (e.g., category pills) |
| `background` | `#FEFBF6` | Screen background (cream) |
| `surface` | `#FFFDFF` | Card backgrounds |
| `error` | `#EF4444` | Form errors, destructive actions |
| `onSurface` | `#0F172A` | Primary text (slate-900) |
| `outline` | `#E2E8F0` | Input borders, dividers |

---

## Activity-Type Color Map (6 types)

| Activity Type | Color | Hex |
|---------------|-------|-----|
| screen_time | coral | `#FF7F60` |
| sleep | emerald | `#10B981` |
| meal | amber | `#F59E0B` |
| education | violet | `#8B5CF6` |
| nap | slate | `#64748B` |
| physical_activity | cyan | `#06B6D4` |

**Used by:**
- StatCard left border accent
- ActivityCard left border
- Activity type filter pills on History screen
- Log screen type selector cards

**Source:** `app/theme.ts` (if file exists) or hardcoded in components.

---

## Typography (Inferred)

**Default font:** System (San Francisco iOS, Roboto Android). No custom fonts loaded.

**Size scale:** (not yet codified)
- H1: 28sp, bold (screen titles)
- H2: 20sp, semibold (section headers)
- Body: 16sp, regular
- Caption: 12sp, medium (hints, secondary)

---

## Spacing Tokens (Likely)

Based on observed patterns:
- Padding inside cards: 16
- Gap between children in list: 12
- Section spacing: 24
- Input field height: 52 (consistent across forms)

**Not yet centralized** — per-component inline constants.

---

## Component Color Variants

### Button (primary)
```
bg: primary (#FF7F60)
text: white
borderRadius: 16
height: 52
```

### Input field
```
border: 1px solid outline (#E2E8F0)
bg: surface (#FFFDFF)
borderRadius: 12
height: 52
paddingHorizontal: 16
focus borderColor: primary (#FF7F60)
```

### Card
```
bg: surface
borderRadius: 16
padding: 16
shadow: elevation 2 (Android), subtle shadow (iOS)
```

---

## Dark Mode?

**None** — app uses fixed light theme only. `background` is cream, not dark.

---

## Activity Color Utility

`getActivityColor(type)` likely exported from a constants file:

```typescript
export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  screen_time: '#FF7F60',
  sleep: '#10B981',
  meal: '#F59E0B',
  education: '#8B5CF6',
  nap: '#64748B',
  physical_activity: '#06B6D4',
}
```

Used across StatCard, ActivityCard, filter pills.

---

## Related
- [[components/stat-card]] — uses primary & activity colors
- [[components/activity-card]] — uses activity color for left border
- [[concepts/hci-consistency-patterns]] — design token application
- [[config/theme-file]] — if centralized theme.ts is created
