---
id: auth-store-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - stores/auth.ts
confidence: high
status: active
tags:
  - store
  - zustand
  - smart-parenting-app
  - auth
related:
  - lib/supabase
  - app/root-layout
  - (auth)/login-screen
  - (auth)/signup-screen
---
# Store: Auth — stores/auth.ts

**File:** `stores/auth.ts` (71 lines)
**Purpose:** Global authentication state + selected child + app hydration flag.

---

## State Shape

```typescript
interface AuthState {
  session: Session | null        // Supabase session object
  user: User | null             // auth.users row (profile)
  selectedChildId: string | null
  isHydrated: boolean           // AsyncStorage restore complete?
}
```

**Initial state:**
```typescript
{
  session: null,
  user: null,
  selectedChildId: null,
  isHydrated: false
}
```

---

## Actions (Methods)

| Method | Purpose | Side Effects |
|--------|---------|--------------|
| `hydrate()` | Read session from AsyncStorage; set `session`, `user`, `isHydrated` | Reads storage |
| `signOut()` | Call `supabase.auth.signOut()`, clear state, navigate to login | Clears AsyncStorage session |
| `setSelectedChild(id)` | Update `selectedChildId` globally | Persists to Zustand persist middleware |
| `refreshSession()` | Refresh from server (token rotation) | Updates `session` in place |

---

## Persistence

**Zustand persist middleware** saves `session`, `user`, `selectedChildId` to AsyncStorage key `@auth_storage`. Rehydrated on app launch via `hydrate()` called from `_layout.tsx` auth guard.

**Hydration check in layout:**
```typescript
<Stack>
  {isHydrated ? <AppNavigator /> : <SplashScreen />}
</Stack>
```
Shows splash until storage read completes.

---

## Selected Child Global State

Why global? Multiple screens need current child:
- Dashboard (stats)
- Log (prefill childId)
- History (query filter)
- AI Insights (analysis scope)

**Change propagation:** Store subscription in each screen via `useAppStore()`; modal picker writes to store; all subscribed screens re-render.

---

## Session Refresh Behavior

Supabase client auto-refreshes access tokens using refresh token in storage. `refreshSession()` manually invoked only if 401 detected mid-flow (not currently implemented).

---

## Login → Sign-Up Flow

`(auth)/login.tsx` calls `supabase.auth.signInWithPassword()` → on success → sets store `session`/`user` automatically via Supabase's `onAuthStateChange` listener that calls `store.hydrate()`? Actually: layout's auth guard listens to `onAuthStateChange` and refreshes store.

**Store hydration triggered by:**
- App initial load (explicit `hydrate()` call)
- Auth state change events (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`) from Supabase client

---

## Error State

No explicit `error` field in store. Errors handled locally in screens and cleared on next action.

---

## Related
- [[app/root-layout]] — auth guard using `isHydrated`
- [[app/login-screen]] — auth entry point
- [[lib/supabase]] — session storage reader used by `hydrate()`
- [[components/child-picker-modal]] — writes `setSelectedChildId`
- [[lib/api]] — all API calls read `session?.user?.id` as RLS `auth.uid()`
