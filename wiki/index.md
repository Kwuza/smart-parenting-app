# Smart Parenting App — Codespace Wiki Index

**Last updated:** 2026-04-22
**Total pages:** 32
**Log:** 1 entry (initialization)

---

## 📄 Components (Screens & UI)

`[[components/dashboard-screen]]` — Dashboard home: 5 stat cards + 6-type quick-add grid + child picker
`[[components/log-screen]]` — Activity logger (6 types): duration stepper, time range pickers, quality emoji
`[[components/history-screen]]` — Date-sectioned activity list with filter pills + pull-to-refresh
`[[components/ai-insights-screen]]` — AI recommendations viewer + "Run AI Insights" button
`[[components/settings-screen]]` — Account, children management, notification toggles, version
`[[components/add-child-screen]]` — Child profile creation (name, DOB, photo)
`[[components/routine-wizard]]` — 4-step routine schedule + gender/height/weight/BMI entry
`[[components/child-picker-modal]]` — Shared modal child selector (coral ring highlight)
`[[components/stat-card]]` — Reusable stat card with icon, label, value, accent color
`[[components/activity-card]]` — History row: type icon, formatted duration, quality badge
`[[components/screen-header]]` — Uniform header layout (icon+title + child picker pill) used Log/History/AI

---

## 🔗 Hooks

*No pages yet.*

---

## 🗃️ State (Stores)

`[[stores/auth]]` — Zustand store: session, user, selectedChildId, isHydrated flag

---

## 💾 Database

`[[database/schema-overview]]` — ER diagram text, RLS subquery policy pattern, migration timeline
`[[database/table-children]]` — Child profiles, 11 TIME routine columns, limits, gender, BMI columns
`[[database/table-activities]]` — Immutable activity log with JSONB value, 6 types, indexes, CHECK gap note
`[[database/table-recommendations]]` — AI advice cache with `based_on` JSONB audit, priority categories
`[[database/table-alerts]]` — In-app alert messages (UI not implemented)

---

## 🌐 API & Backend

`[[lib/api]]` — 14-function catalogue: children/activities/recommendations/alerts CRUD + Edge Function caller
`[[lib/supabase]]` — Lazy singleton client, session hydration, configuration
`[[supabase/edge-function-analyze-child]]` — AI Edge Function: aggregation, OpenRouter call, recommendations insert

---

## 🛠️ Utilities (lib/)

`[[lib/bmi-calculator]]` — WHO LMS percentile calculator (ages 24–60 months, gender-specific)
`[[lib/sleep-calculator]]` — Age-based sleep recommendation (2–5 years) + minutes conversion utility
`[[lib/notifications-scheduler]]` — Expo local notifications: schedule/cancel per-child routine times

---

## ⚙️ Configuration

`[[config/package-json]]` — Dependencies: RN 0.76.9, Expo ~52, Supabase ^2.49
`[[config/eas-json]]` — EAS Build profiles
`[[config/app-json]]` — Expo config: scheme, slug, extra (Supabase URL/key)
`[[config/tsconfig]]` — TypeScript strict config

---

## 🧩 Concepts & Patterns

`[[concepts/coral-theme-tokens]]` — Color palette: primary #FF7F60, activity type colors
`[[concepts/activity-value-schema]]` — JSONB payload shapes per activity type (6 matrices)
`[[concepts/child-picker-state-propagation]]` — Global Zustand field propagation to all screens
`[[concepts/hci-consistency-patterns]]` — Shared UI patterns (Section/Item cards, input styles)
`[[concepts/bmi-categorization]]` — WHO percentile categories (underweight/normal/overweight/obese)

---

## MOCs (Maps of Content)

`[[mocs/codebase-map]]` — Filesystem-to-wiki mapping, question-oriented navigation
`[[../concepts/smart-parenting-app-tech-stack]]` — Main LLM Wiki broader tech stack reference (external context)

---

## How to Use This Index

1. **Find a component** → scan Components alphabetically
2. **Understand a data model** → read Database section starting with `schema-overview`
3. **Call an API** → read `lib/api` function reference
4. **See feature flow** → follow Related links from a screen to components and data sources
5. **Orientation** → start at `[[mocs/codebase-map]]`

**Builder agent workflow:** MOC → affected tables → API → screen/components → HCI patterns. Each page links forward (dependencies) and backward (consumers).

---

## Recent Additions (2026-04-22)
- Database schema reference (4 tables + overview)
- API layer + Supabase client reference
- Edge Function analyze-child reference
- 5 screen deep dives (Dashboard, Log, History, AI Insights, Settings)
- Routine wizard + Add Child flow
- BMI calculator + notifications scheduler utilities
- Auth store + child picker modal pattern
- Activity payload schema + coral theme tokens + HCI consistency patterns
- Configuration references (package.json, eas.json, app.json, tsconfig)
