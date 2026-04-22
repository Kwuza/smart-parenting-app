# Smart Parenting App — Codespace Wiki Schema

## Domain
This wiki captures the **Smart Parenting App (NestNote) codebase** — implementation details, architecture decisions, component APIs, and runtime behavior. It is a **builder's reference**, not a user manual.

**Scope boundaries:**
- ✅ File-level implementation details (component signatures, hooks, stores)
- ✅ Database schema + RLS policies + migrations
- ✅ API layer functions and error handling patterns
- ✅ State management flows (Zustand stores, Zustand persist middleware)
- ✅ Supabase Edge Functions (inputs, outputs, auth flow)
- ✅ Routing structure (Expo Router file conventions, nested layouts)
- ✅ Build configuration (EAS, eas.json profiles, SDK versions)
- ❌ Product requirements or user stories (see main LLM Wiki)
- ❌ HCI principles or design theory (see main LLM Wiki)
- ❌ General React Native or Expo documentation (link externally)

## Conventions
- File names: lowercase, hyphens, no spaces (e.g., `dashboard-screen.md`, `api-layer.md`)
- Every page starts with YAML frontmatter (see below)
- Use `[[wikilinks]]` to link between pages (minimum 2 outbound links per page)
- When updating, always bump the `updated` date
- Every new page added to `index.md` under correct section, alphabetically
- Every action appended to `log.md`
- `raw/` is immutable —never modify source files after ingestion

## Frontmatter
```yaml
---
id: deterministic-slug-001          # slug + hash suffix
type: entity | concept | analysis | MOC | source
created: YYYY-MM-DD
updated: YYYY-MM-DD
source_refs:                         # what backs this page
  - path/to/source-file.tsx
  - database/schema.sql
confidence: high | medium | low
status: active | archived | under_review | stale
tags:                                # from taxonomy below ONLY
  - tag1
  - tag2
related:                             # cross-references to other pages
  - components/child-picker-modal
  - lib/api
---
```

**TTL (review_after / stale_after):**
- Code components: 60 days | 120 days
- Database schema: 90 days | 180 days
- Config/build: 120 days | 240 days
- Runtime behavior: 30 days | 90 days

## Tag Taxonomy (Codebase-Focused)

### Layer Tags
- `component` — React Native screen or reusable component
- `hook` — Custom React hook (useSomething)
- `store` — Zustand store or state slice
- `api` — Backend FastAPI endpoint or Supabase Edge Function
- `database` — Table, migration, RLS policy, index
- `supabase` — Supabase client usage, auth, storage
- `routing` — Expo Router screens and navigation
- `config` — package.json, eas.json, tsconfig, app.json

### Data & Types
- `types` — TypeScript interfaces, database.types.ts
- `schema` — SQL DDL, table definitions, constraints
- `migration` — Database migration file (.sql)
- `validation` — zod schemas, form validation
- `jsonb` — JSONB columns or payloads

### Infrastructure
- `build` — EAS Build profiles, native config
- `security` — Auth, encryption, IDB storage, key management
- `offline` — IndexedDB, queue, sync logic
- `notifications` — Expo notifications, scheduling
- `ai-integration` — OpenRouter calls, prompt engineering

### UI & UX
- `ui-component` — Reusable visual component (Card, Button, Input)
- `screen` — Top-level screen component (Dashboard, History, etc.)
- `hci` — Usability pattern, interaction design
- `theme` — Colors, typography, design tokens

### Project
- `smart-parenting-app` —Always present (root domain tag)
- `expo` — Expo SDK/platform
- `react-native` — React Native specifics

**Rule:** Every tag on a page must appear in this taxonomy. If you need a new tag, add it here first in the correct section.

## Page Thresholds
- **Create a page** for any file-level unit of code: components, screens, hooks, stores, API endpoints, database tables, migrations, configs
- **Combine related files** into one page when they form a coherent unit (e.g., the Dashboard screen + all child components it uses)
- **Split a page** when it exceeds 200 lines — break into sub-topics with cross-links
- **Don't create a page** for one-liners or trivial utilities unless they have notable complexity
- **Always cross-reference** — link to related pages (callers, callees, dependencies, data sources)

## Reference Conventions

### Component Page Template
```markdown
# ComponentName — One-line purpose

**Path:** `app/(tabs)/dashboard.tsx`
**Lines:** 785
**Dependencies:** [[components/stat-card]], [[lib/api]], [[stores/auth]]
**Used by:** [[screens/dashboard-layout]]

## Purpose
Brief description of what this component does and why it exists.

## Props Interface
```typescript
interface Props {
  childId: string;
  onSelect: (child: Child) => void;
}
```

## State & Side Effects
- Local state: ...
- Store subscriptions: ...
- Effects: ...

## Render Tree
Quick ASCII or list of rendered children components.

## Key Logic Blocks
- Block purpose → code snippet + explanation

## Related
- [[lib/api#getChildActivities]] — data source
- [[stores/auth]] — auth state used here
```

### Database Table Page Template
```markdown
# Table: tablename

**Migration:** `database/migration_YYYY-MM-DD-description.sql`
**RLS:** enabled (policy summary)

## Columns
| Column | Type | Null? | Description |
|--------|------|-------|-------------|

## Indexes
- `idx_name` (columns) — purpose

## RLS Policies
| Policy | Command | Definition |
|--------|---------|------------|

## Relationships
- FK to `other_table` via `column`
- Referenced by `child_table.child_id`

## Migration Notes
What changed over time (added columns, constraint changes).
```

### API Layer Page Template
```markdown
# API Module: lib/api.ts

**Total exports:** 12 functions
**Base URL:** Supabase client (lib/supabase.ts)
**Auth:** RLS + service_role for admin ops

## Exports Reference
| Function | Purpose | Input | Output |
|----------|---------|-------|--------|

## Error Handling Pattern
Standard Supabase error parsing with toast fallback.

## Known Gotchas
- `updateChildRoutine()` mutates local store before DB ack
- `deleteActivity()` cascades via RLS; client soft-deletes first
```

## Update Policy
When code changes:
1. Update the corresponding wiki page within the same session
2. Bump `updated` date
3. Add `source_refs` pointing to the changed files
4. If breaking change, add a `BREAKING CHANGE:` banner at top
5. Flag for `under_review` if architectural implications uncertain

## Archiving
When code is removed or fully superseded:
1. Move to `_archive/YYYY-MM-DD-filename.md`
2. Remove from `index.md`
3. Update pages that linked to it (replace `[[wikilink]]` with plain text + "(deprecated)")
4. Log the archive action

## Linking Style
- Components link to their children, parents, and data sources
- Hooks link to their consumers and any stores they modify
- Stores link to API functions that update them
- DB tables link to API endpoints that query them
- Config files link to affected components (e.g., eas.json build profile → app.json)

## Quick Navigation
Builder agent should start here:
- `index.md` — full page list
- `moc-codebase.md` — Map of Content: filesystem → wiki mapping
- `database/schema-overview.md` — table relationship diagram
- `lib/api.md` — all API functions reference
- `components/ui-primitives.md` — shared Button, Card, Input patterns