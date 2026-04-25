# Known Issues & Limitations

This document tracks confirmed bugs, technical debt, and intentional design trade-offs in the Smart Parenting App. Items are not prioritized here; use the project issue tracker for sprint planning.

---

## Active Issues

### 1. Global Notifications Toggle — Missing Dependency
- **Location:** `app/(tabs)/settings.tsx`
- **Issue:** The `useEffect` that toggles global notifications does not include `children` in its dependency array. If the child list loads after the effect runs, the global toggle may initialize with stale data.
- **Workaround:** Restart the app after adding your first child if notifications fail to schedule.
- **Fix:** Add `children` to the `useEffect` dependency array and guard against empty lists.

### 2. Activity Type Mapping — `nap` vs `sleep`
- **Location:** `lib/api.ts` (insert logic) and database migrations
- **Issue:** The UI exposes both "Nap" and "Sleep" as distinct activity types, but the database currently stores both under the `sleep` type enum. The `nap` label is a presentation-layer abstraction without a dedicated DB value.
- **Impact:** History filtering by "Nap" only may incorrectly include overnight sleep records if front-end filtering is not applied.
- **Fix:** Add `nap` to the `activity_type` enum and migrate historical data, or enforce client-side filtering consistently.

### 3. Password Reset Flow — Not Implemented In-App
- **Location:** Auth flow (`app/(auth)/`)
- **Issue:** There is no "Forgot Password?" screen in the mobile app. Users must use the Supabase hosted auth page or contact support.
- **Workaround:** Direct users to the Supabase project URL with `auth/v1/verify` params.
- **Fix:** Add a password reset screen that calls `supabase.auth.resetPasswordForEmail()`.

### 4. PDPA / Consent Checkbox — Onboarding Placeholder
- **Location:** Onboarding wizard (`app/(auth)/`)
- **Issue:** The Personal Data Protection Act (PDPA) consent screen is present in the UI flow but the checkbox state is not persisted to the database or checked during auth guard logic.
- **Impact:** Compliance checkbox is cosmetic only.
- **Fix:** Store consent timestamp in a `user_consents` table and validate on login.

### 5. Child Deletion — AsyncStorage Stale `selectedChildId`
- **Location:** `lib/store.ts` / child management modal
- **Issue:** After deleting a child, the store resets `selectedChildId` to the first available child. However, `AsyncStorage` may retain the deleted child's UUID until the next write.
- **Impact:** On next cold start, the app may attempt to load a deleted child and fall back to "Add Child" screen.
- **Workaround:** Functional fallback already handles this gracefully; no user-facing crash.
- **Fix:** Force an `AsyncStorage` write immediately after child deletion, or validate `selectedChildId` against the fetched list on every startup.

---

## Platform-Specific Limitations

### iOS Physical Device (Expo Go)
- **Local notifications** require the device to be on the same Wi-Fi network as the development machine for Expo Go to receive the JS bundle. Notifications themselves are scheduled locally and do not need internet.
- **EAS Build** is the only supported path for generating `.ipa` files on Windows. No local iOS compilation is possible without macOS + Xcode.

### Android
- **StatusBar styling** uses `barStyle="dark-content"` globally; automatic light/dark switching per screen is not implemented.
- **Paper TextInput** internal padding issues on certain Android devices require the plain `RNTextInput` + `View` wrapper pattern (documented in design system). Screens using Paper inputs for compact numeric fields may show vertical misalignment.

---

## Technical Debt

| Item | Context | Risk |
|------|---------|------|
| Age calculation inlined in 2 places | Wizard and AI insights both calculate age from DOB | Use `getAgeYears()` from `lib/api.ts` everywhere; drift possible if formula changes |
| Share/copy logic duplicated | History screen and pull-to-refresh both contain share logic | Extract to `lib/share.ts` |
| No E2E tests | Detox / Maestro not configured | Regression risk on navigation and auth flows |
| No CI/CD pipeline | EAS Build is manual | Every production build requires local CLI invocation |

---

## Design Trade-Offs (Intentional)

1. **Five-tab maximum:** New features must fit inside existing tabs via segmented controls or modals. This keeps navigation shallow but may require UI density compromises.
2. **Zero-alert policy:** All user feedback uses inline validation, spinners, or modal confirmations. This improves UX but requires more state management than simple `Alert.alert()` calls.
3. **Supabase as source of truth:** All mutations are followed by a full refetch. This guarantees data consistency but increases network load compared to optimistic updates.
4. **Stateless AI insights:** Recommendations are generated on-demand with zero-shot prompting. No fine-tuned model, no conversation memory. Keeps costs predictable but limits personalization depth.

---

## Resolved Issues (Recent)

| Issue | Resolution | Date |
|-------|------------|------|
| `@expo/dom-webview` breaking Android builds | Removed dependency; use `expo-file-system` + base64 for uploads | April 2026 |
| TextInput vertical centering on Android | Replaced Paper TextInput with RNTextInput + View wrapper | April 2026 |
| History stats misaligned with selected month | Weekly/monthly stats now derive from user-selected date context | April 2026 |
| Zustand stale closures in notification handlers | Switched to `useStore.getState().value` inside async callbacks | April 2026 |

---

*Last updated: April 25, 2026*
