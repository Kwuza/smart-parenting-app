---
id: tsconfig-001
type: config
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - tsconfig.json
confidence: high
status: active
tags:
  - config
  - typescript
  - smart-parenting-app
related:
  - config/package-json
---
# TypeScript Configuration — tsconfig.json

**Location:** project root
**Base:** Expo default (`expo/tsconfig.base.json`) extended with custom strictness.

---

## Extended Base + Overrides

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false
  }
}
```

---

## Strict Mode Flags

| Flag | Effect | Why enabled |
|------|--------|-------------|
| `strict: true` | Enables all strict checking | Baseline type safety |
| `noUncheckedIndexedAccess` | `arr[i]` type includes `undefined` | Prevents silent undefined from out-of-bounds |
| `noImplicitOverride` | `override` keyword required for subclass method overrides | Catches typos in method names |
| `noPropertyAccessFromIndexSignature` | `obj["key"]` where key is computed from index signature disallowed | Prevents accidental misspellings |

**Result:** TypeScript catches more bugs at compile time; fails fast.

---

## Expo Base Extends

`expo/tsconfig.base.json` provides:
- `jsx: "react-native"`
- `lib: ["ES2022"]`
- `paths` mapping for `@/*` → `./*` (alias)
- Type definitions for React Native, Expo modules

---

## Path Aliases

None beyond Expo's default `@/` → project root. Files import using relative paths (`../../lib/api`) or absolute with `@/` alias:

```typescript
import { getChildren } from '@/lib/api'
```

**tsconfig does NOT define custom path aliases** — relies on Expo default.

---

## Module Resolution

`"moduleResolution": "bundler"` (Expo default) — matches Metro bundler behavior.

---

## Skip Library Check

`"skipLibCheck": true` inherited from Expo base — faster builds, third-party d.ts not checked.

---

## Strict Function Types

Enabled via `strict: true` — enforces parameter/return type variance (contravariant parameters).

---

## Ignored Files

None. All `.ts`/`.tsx` files in `app/`, `components/`, `lib/`, `stores/` checked.

---

## Build Impact

`tsc --noEmit` runs in CI (GitHub Actions) as type-check step.

**Error as warning?** No — CI fails on any TypeScript error. Local `expo start` shows errors inline.

---

## Common Type Errors & Fixes

When adding a new activity type:
1. Add to `ActivityType` union in `database.types.ts` (Supabase generated)
2. Update zod schema in log screen
3. If accessing `value.xxx` in code, narrow by `type` guard first: `if (type === 'screen_time') { value.duration_minutes }`

---

## Related
- [[config/package-json]] — TypeScript version
- [[lib/api]] — typed with Supabase-generated `database.types.ts`
- [[database/schema-overview]] — types extend from DB schema
