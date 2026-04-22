---
id: hci-consistency-patterns-001
type: concept
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - components/ScreenHeader.tsx
  - components/Section.tsx (if exists)
  - components/Item.tsx (if exists)
  - app/(tabs)/profile.tsx
confidence: high
status: active
tags:
  - hci
  - ui-ux
  - react-native
  - smart-parenting-app
related:
  - components/settings-screen
  - components/stat-card
  - screen-header
  - concepts/coral-theme-tokens
---
# HCI Consistency Patterns — Smart Parenting App

**Context:** Derived from Settings screen architecture and reused across Dashboard, Log, History, AI.

Reference: Nielsen's 10 Usability Heuristics, iOS HIG, Material Design 3.

---

## 1. Section/Item Card Pattern

**Where:** Settings screen sections (Account, Children, Notifications, Privacy, Support).

**Structure:**
```
Section Title (uppercase, subdued)

Card (surface bg, rounded-12, padding 12):
  Item row: [icon] [label] [value/trailing]
  Item row: [icon] [label] [switch/toggle]
```

**Component hierarchy (if extracted):**
- `<Section title="...">` — container with title label + vertical stack
- `<Item icon="..." label="..." trailing={...}>` — touchable row with onPress

**Status:** Currently inline in profile.tsx — not yet extracted to reusable component.

---

## 2. ChildCard Pattern

**Appearance:** Circle avatar (child photo or emoji) + name + age subtitle.

**Used in:**
- Dashboard stats header (primary child display)
- Settings Children section list (each child tappable to edit)
- Child picker modal list

**Color:** coral ring outline when selected; neutral when not.

---

## 3. FormInput Pattern

**Fields across app:** name, date, numeric input, time picker.

**Shared layout:**
```
Label (optional, top)
[Input field — height 52, border 1px outline, rounded-12]
Helper text / error message (below, 10sp, red or gray)
```

**Focus ring:** borderColor changes to `primary` (#FF7F60) when focused.

---

## 4. Button Patterns

**Primary CTA:**
- bg: `primary` (#FF7F60)
- text: white, medium
- height: 52, rounded-16
- shadow: elevation 2 (Android), subtle opacity (iOS)

**Secondary / Destructive:**
- bg: `#F1F5F9` (light gray), text: `#64748B`
- bg: `#EF4444` (error red) for destructive (Sign Out)

**Disabled:** opacity 0.5, no press feedback

---

## 5. Color System Consistency

All UI colors derive from `concepts/coral-theme-tokens`. Activity-type colors fixed; no ad-hoc hex values in screens (should refactor to `ACTIVITY_COLORS` map if any remain).

---

## 6. Error Presentation

- **Inline per field** (not Alert modal)
- Error row below input, left border red? Actually full-width red text, dismissible × on right if transient
- Error auto-clears on field edit (controlled component behavior)

---

## 7. Navigation Hierarchy

Tab bar (5 items): Dashboard → Log → History → AI Insights → Settings

**Tab bar rules:**
- Always visible (except on modal screens like Add Child / Routine Wizard)
- `tabBarShowLabel: true` (icons + text labels)
- `tabBarActiveTintColor = primary`
- `tabBarInactiveTintColor = gray`
- Height: 80 Android, 100 iOS (standard safe-area insets)

**Child creation flow:** Tabs → `app/child/new.tsx` → `app/child/routine.tsx` → (back to tabs). These screens hide tab bar (options: `tabBarStyle: { display: 'none' }`).

---

## 8. Empty States

Pattern: Centered icon + heading + description + primary CTA button.

Examples:
- No children yet: "Add a child to get started" → + Add Child
- No activities: "No activities yet. Tap + to log"
- No recommendations: "Run AI Insights to get personalized advice"

---

## 9. Status Indicators

- **Loading:** spinner overlay on button or full-screen spinner for list loads
- **Success:** green checkmark screen on sign-up; toast on activity log success
- **Error:** inline error + toast

---

## 10. Spacing & Typography

**Vertical rhythm:**
- Section spacing: 24
- Card within section: 12 vertical padding
- Input vertical margin: 16

**Typography scale:**
- H1 (screen title): 28sp, semibold
- H2 (section title): 16/600, uppercase tracked 0.5
- Body (labels): 16sp
- Caption (hints): 12sp medium

---

## Related
- [[concepts/coral-theme-tokens]] — colors/spacing base
- [[components/dashboard-screen]] — uses stat card pattern
- [[components/settings-screen]] — uses Section/Item pattern
- [[hci-design-principles-mobile]] — main LLM Wiki principles reference
