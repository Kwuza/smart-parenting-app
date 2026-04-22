---
id: moc-codebase-001
type: MOC
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/**
  - lib/**
  - database/**
confidence: high
status: active
tags:
  - moc
  - smart-parenting-app
  - codebase-map
related: []
---
# Map of Content — Smart Parenting App Codebase

**Purpose:** High-level oriented map from filesystem → wiki pages. Use this when you don't know where to start.

---

## Filesystem → Wiki Cross-Reference

```
smart-parenting-app/
├── app/                          → [[components/]] and [[routing/]]
│   ├── (auth)/login.tsx          → [[components/login-screen]]
│   ├── (auth)/signup.tsx         → [[components/signup-screen]]
│   ├── (tabs)/                   → [[components/tab-navigation]]
│   │   ├── index.tsx             → [[components/dashboard-screen]]
│   │   ├── log.tsx               → [[components/log-screen]]
│   │   ├── history.tsx           → [[components/history-screen]]
│   │   ├── ai.tsx                → [[components/ai-insights-screen]]
│   │   └── profile.tsx           → [[components/settings-screen]]
│   ├── child/
│   │   ├── new.tsx               → [[components/add-child-screen]]
│   │   └── routine.tsx           → [[components/routine-wizard]]
│   └── _layout.tsx               → [[routing/root-layout]]
├── components/                   → [[components/ui-primitives]] + individual files
├── lib/                          → [[lib/]]
│   ├── api.ts                    → [[lib/api]]
│   ├── supabase.ts               → [[lib/supabase]]
│   ├── bmi.ts                    → [[lib/bmi-calculator]]
│   └── notifications.ts          → [[lib/notifications-scheduler]]
├── stores/                       → [[stores/]]
│   └── auth.ts                   → [[stores/auth]]
├── database/                     → [[database/]]
│   ├── schema.sql                → [[database/schema-overview]]
│   ├── migration_*.sql           → individual pages per migration
│   └── types/                    → (Supabase-generated types; not manually edited)
├── supabase/functions/           → [[supabase/]]
│   └── analyze-child/index.ts    → [[supabase/edge-function-analyze-child]]
├── assets/                       → images/icons (no wiki pages; references in components)
├── package.json                  → [[config/package-json]]
├── app.json                      → [[config/app-json]]
├── eas.json                      → [[config/eas-json]]
└── tsconfig.json                 → [[config/tsconfig]]
```

---

## Knowledge Domains (by question)

| Question | Start Here |
|----------|------------|
| How do I add a new screen? | [[routing/expo-router-conventions]] + [[components/screen-template]] |
| How do I call the backend? | [[lib/api]] — function catalogue |
| What does the DB look like? | [[database/schema-overview]] → individual table pages |
| How does AI insights work? | [[supabase/edge-function-analyze-child]] + [[lib/api#runAiAnalysis]] |
| How is state managed? | [[stores/auth]] (global) + [[stores/activity-store]] (if exists) |
| What are the UI design tokens? | [[config/theme-colors]] (if exists; otherwise [[concepts/smart-parenting-app-tech-stack]]) |
| How do notifications work? | [[lib/notifications-scheduler]] + [[config/permissions]] |
| What are all the activity types and payload shapes? | [[database/table-activities]] |
| How is BMI calculated? | [[lib/bmi-calculator]] |
| How does offline sync work? | Not yet documented (future: [[concepts/offline-queue-sync]]) |

---

## Page Clusters by Feature

**Feature: Logging Activities**
- [[components/log-screen]]
- [[components/activity-form]]
- [[lib/api#createActivity]]
- [[database/table-activities]]

**Feature: History Browsing**
- [[components/history-screen]]
- [[lib/api#getActivitiesByDateRange]]
- [[database/table-activities]] (indexes)

**Feature: AI Insights**
- [[components/ai-insights-screen]]
- [[lib/api#runAiAnalysis]]
- [[supabase/edge-function-analyze-child]]
- [[database/table-recommendations]]

**Feature: Child Management**
- [[components/add-child-screen]]
- [[components/routine-wizard]]
- [[lib/api#getChildren]] / `createChild` / `updateChild`
- [[database/table-children]]

---

## Open Questions (Not Yet Documented)
- Where is the `ActivityStore` (Zustand) defined? (if not in stores/auth)
- How are Expo notifications scheduled upon child creation?
- What is the exact error recovery strategy for failed Edge Function calls?
- Does the app implement any offline queue (reads IndexedDB anywhere)?
- Are there integration tests or just unit tests?
