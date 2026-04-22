---
id: activity-card-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/(tabs)/history.tsx
confidence: high
status: active
tags:
  - component
  - ui-component
  - smart-parenting-app
  - hci
related:
  - components/history-screen
  - database/table-activities
  - concepts/coral-theme-tokens
  - concepts/activity-value-schema
---
# Component: ActivityCard

**Location:** Defined inline in `app/(tabs)/history.tsx` (~50 lines), or extracted to `components/ActivityCard.tsx` if DRY later.
**Purpose:** Render single activity row in History SectionList.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────┐
│ 🎮 Screen time — 1h 30m on Phone         2:30 PM │ ← left border = activity color
├─────────────────────────────────────────────────────┤
│ Category: leisure                                          │
└─────────────────────────────────────────────────────┘
```

**Left border:** 4px solid color matching activity type.

**Icon:** Emoji mapping:
- screen_time: 🎮
- sleep: 😴
- meal: 🍽️
- education: 📚
- nap: 🌙
- physical_activity: 🏃

**Title line:** `<emoji> <type label> — <formatted duration> on <device>`
- device shown only for `screen_time`
- for sleep/meal/education/nap/physical: shows additional primary attribute (quality, subject, etc.)

**Subtitle line:**
- sleep/meal/nap: quality emoji (😟 😐 😊) + determined via `value.quality`
- none for screen_time (category shown as small pill instead)
- education: subject text

---

## Formatting Helpers

`getActivityLabel(activity: Activity): string`
- screen_time: `Screen Time — ${duration} on ${device}`
- sleep: `Sleep — ${start}–${end}`
- meal: `Meal — ${type} (${quality})`
- education: `Education — ${subject} (${duration}min)`
- nap: `Nap — ${start}–${end}`
- physical_activity: `Physical — ${type} ${duration}min`

`formatTimeAgo(recorded_at)` → "Today, 2:30 PM" / "Yesterday, 9:00 AM" / "Mon, Apr 13"

---

## Color Mapping

Uses `ACTIVITY_COLORS` map from `concepts/coral-theme-tokens` (or inline constant). Left border color 4px solid.

**Priority not shown** — plain card, no priority badges (recommendations have priority, activities do not).

---

## Interaction

Tap anywhere on card → navigates to `app/activity/[id]?` (not implemented yet; future detail view).

Long press → "Edit" context menu (not implemented; edit = delete + re-log).

---

## Empty / Null States

If required fields missing in `value` (corrupted data), renders fallback label: `"Screen Time — data unavailable"` in muted italic.

---

## Performance

Rendered inside SectionList cell — lightweight, no images. Emoji are text characters. Card height ~80 fixed.

---

## Related
- [[components/history-screen]] — container
- [[database/table-activities]] — source data schema
- [[concepts/activity-value-schema]] — explains `value` formatting
- [[concepts/coral-theme-tokens]] — left border color source
