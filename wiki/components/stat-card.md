---
id: stat-card-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/(tabs)/index.tsx
confidence: high
status: active
tags:
  - component
  - ui-component
  - smart-parenting-app
  - hci
related:
  - components/dashboard-screen
  - concepts/coral-theme-tokens
---
# Component: StatCard

**Location:** Defined inline in `app/(tabs)/index.tsx` (Dashboard), 50–80 lines.
**Purpose:** Reusable card displaying a single numeric stat with icon and label.

---

## Visual Specs

```tsx
<View style={styles.card}>
  <View style={[styles.accent, { backgroundColor: color }]} />
  <Text style={styles.icon}>{icon}</Text>
  <Text style={styles.label}>{label}</Text>
  <Text style={styles.value}>{value}</Text>
</View>
```

- Card: `surface` bg, rounded-16, padding 12
- Accent: left border 4px solid (activity color)
- Icon: 28sp emoji centered
- Label: 12sp muted, uppercase tracked
- Value: 24sp bold `onSurface`

---

## Props

```typescript
interface StatCardProps {
  icon: string          // emoji or SFSymbol name
  label: string         // "Screen Time"
  value: string         // "1h 30m" or "3 meals"
  color: string         // hex from coral-theme-tokens
  onPress?: () => void  // navigation to filtered Log screen
}
```

**On press:** navigates to `app/(tabs)/log.tsx` with pre-set type filter (e.g., `?type=screen_time`).

---

## Activity Color Mapping

| label | color | hex |
|-------|-------|-----|
| Screen Time | coral | #FF7F60 |
| Sleep | emerald | #10B981 |
| Meals | amber | #F59E0B |
| Education | violet | #8B5CF6 |
| Nap | slate | #64748B |
| Physical | cyan | #06B6D4 |

---

## Data Source

Stat values computed client-side from `getTodayActivities(childId)`:

```typescript
const todayActs = await getTodayActivities(childId)
const screenTimeMins = todayActs
  .filter(a => a.type === 'screen_time')
  .reduce((sum, a) => sum + a.value.duration_minutes, 0)
const screenTimeStr = formatMinutes(screenTimeMins)  // "1h 30m" or "45m"
```

Meals count: `todayActs.filter(a => a.type === 'meal').length`

---

## Empty State

If no data yet (child created today, no logs), StatCard renders value "0" (does not hide).

---

## Related
- [[components/dashboard-screen]] — parent screen that creates 6 StatCards
- [[concepts/coral-theme-tokens]] — color values source
- [[lib/api#getTodayActivities]] — data source
