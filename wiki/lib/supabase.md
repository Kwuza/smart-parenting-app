---
id: supabase-client-001
type: concept
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - lib/supabase.ts
confidence: high
status: active
tags:
  - supabase
  - lib
  - config
  - smart-parenting-app
related:
  - lib/api
  - stores/auth
  - config/env-variables
---
# Supabase Client — lib/supabase.ts

**File:** `lib/supabase.ts` (41 lines)
**Pattern:** Lazy singleton — client created on first access, not at module load

---

## Why Lazy Init?

React Native app starts quickly; Supabase client initialization reads from AsyncStorage (session token) which is async. Eager init would block startup or require async module top-level (unsupported). Solution: `getSupabaseClient()` returns same instance after first call.

---

## Code Summary

```typescript
let supabase: SupabaseClient | null = null

export const getSupabaseClient = async () => {
  if (!supabase) {
    const session = await getSession()   // from stores/auth, reads AsyncStorage
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storage: AsyncStorage },    // session persistence
      db: { schema: 'public' },
      global: { headers: { 'x-custom-header': 'smart-parenting-app' } }
    })
  }
  return supabase
}
```

**Singleton thread-safety:** Single JS thread in RN — no race condition concerns.

---

## Configuration Source

**URL + anon key:** from `.env` via `expo-constants`:

```typescript
import Constants from 'expo-constants'
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey
```

**Where defined:** `app.json` → `extra` section. For EAS builds, secrets set via `eas secret` — not committed to repo.

---

## Storage & Session

- `auth.storage`: `AsyncStorage` (persists session across app restarts)
- Auto-refresh: Supabase client handles token refresh automatically using refresh token stored in AsyncStorage
- `getSession()` reads from AsyncStorage synchronously (cached); async if cache miss

---

## Global Headers

Custom header `'x-custom-header': 'smart-parenting-app'` used for Supabase Logs/Logflare integration (identifies app source in Supabase logs).

---

## Usage Pattern Throughout Codebase

**In API layer (lib/api.ts):**

```typescript
import { getSupabaseClient } from './supabase'

export const getChildren = async () => {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.from('children').select('*')
  if (error) throw error
  return data
}
```

**Why `await getSupabaseClient()` every time?** Lazy init makes it safe to call from any async function without pre-initializing.

---

## Service Role Key Access

**Not in lib/supabase.ts.** Service role key only used by:
- Supabase Edge Functions (configured in Supabase dashboard)
- Direct server-side scripts (not in app code)

Client-side NEVER gets service_role key.

---

## Error Propagation

Supabase errors bubble up as `PostgrestError` objects. Caller (lib/api.ts) forwards them with no translation. Frontend screens map to user-friendly messages.

Common error codes:
- `PGRST301` — RLS violation
- `23505` — unique constraint violation (email already registered)
- `22P02` — invalid JSON (malformed value payload)

---

## Related
- [[lib/api]] — consumer of this client
- [[stores/auth]] — provides `getSession()` used here
- [[config/app-json]] — where keys are defined (via `extra`)
- [[supabase/edge-function-analyze-child]] — service_role context, separate client
