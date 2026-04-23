# Smart Parenting App — QA Baseline Checklist

**Generated:** 2026-04-23  
**App Version:** 1.0.0  
**Total Screens:** 16  
**Total LOC:** ~7,200 (103 files)

---

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| `Alert.alert` instances | **0** | ✅ Cleared |
| Dead `Alert` import | **1** | ⚠️ Remove |
| Console.error in UX code | **3** | ⚠️ Should be user-facing |
| Console.log in production | **2** | ⚠️ Should be removed |
| Missing Pull-to-Refresh | **4 screens** | 🔴 To fix |
| Missing Loading State | **2 screens** | 🔴 To fix |
| Missing Empty State | **1 screen** | 🔴 To fix |
| Missing Error State | **1 screen** | 🔴 To fix |
| Inconsistent Header Component | **3 screens** | 🟠 To fix |
| Missing KeyboardAvoidingView | **1 screen** | 🟠 To fix |
| Notification tap handler empty | **1** | 🔴 Dead code |

---

## Phase 0: Baseline Audit Results

### 1. Screen-by-Screen Triple-State Matrix

| Screen | Loading | Error | Empty | Pull-to-Refresh | Header Component | Grade |
|--------|---------|-------|-------|-----------------|------------------|-------|
| `history.tsx` | ✅ | ✅ | ✅ | ✅ | `ScreenHeader` ✅ | **A** |
| `index.tsx` | ⚠️* | ✅ | ✅ | ✅ | Custom inline ⚠️ | **B** |
| `log.tsx` | ✅ | ✅ | N/A | ❌ | `ScreenHeader` ✅ | **C** |
| `ai.tsx` | ✅ | ✅ | ✅ | ✅ | `ScreenHeader` ✅ | **A** |
| `profile.tsx` | ❌ | ❌ | ⚠️ | ❌ | Custom inline ⚠️ | **D** |
| `login.tsx` | ✅ | ✅ | N/A | N/A | N/A (auth) | **A** |
| `signup.tsx` | ✅ | ✅ | N/A | N/A | N/A (auth) | **A** |
| `wizard.tsx` | ✅ | ⚠️ | N/A | N/A | Custom inline | **B** |
| `change-email.tsx` | ✅ | ✅ | N/A | N/A | Custom inline | **A** |
| `change-password.tsx` | ✅ | ✅ | N/A | N/A | Custom inline | **A** |
| `edit-profile.tsx` | ✅ | ✅ | N/A | N/A | Custom inline | **A** |
| `child/[id].tsx` | ✅ | ✅ | N/A | N/A | Custom inline | **A** |
| `help.tsx` | N/A (static) | N/A | N/A | N/A | Custom inline | **A** |
| `privacy.tsx` | N/A (static) | N/A | N/A | N/A | Custom inline | **A** |

\* `index.tsx` has no explicit initial-loading UI. The screen is blank/empty while `loadDashboardData()` runs on mount. Only `refreshing` spinner exists for pull-to-refresh.

**Header Consistency Note:** `ScreenHeader` component is used in 3/5 tab screens (History, Log, AI). Dashboard and Profile use custom inline headers. Settings sub-screens all use custom inline headers with a back arrow. This is acceptable for settings (different layout needs), but Dashboard should use `ScreenHeader` for consistency.

---

### 2. Detailed Findings by Severity

#### 🔴 Critical — Block User Experience

| ID | File | Finding | Impact |
|----|------|---------|--------|
| **C-01** | `app/(tabs)/index.tsx` | No initial loading state. Dashboard shows empty sections while data loads. | Users see blank stats/empty lists on first open. |
| **C-02** | `app/(tabs)/index.tsx:735` | Notification bell button has `onPress` missing. Dead UI element. | Users tap bell, nothing happens. |
| **C-03** | `app/(tabs)/profile.tsx` | No loading, error, or retry state. If `children` load fails, screen shows stale/nothing with no feedback. | Silent failures, no user recovery path. |
| **C-04** | `app/(tabs)/log.tsx` | No pull-to-refresh. If `children` list changes (e.g., added via wizard), log screen shows stale child selector until app restart. | Data inconsistency across tabs. |
| **C-05** | `app/_layout.tsx:51` | Notification tap handler is empty — `if (data?.childId) { /* Could navigate */ }`. Dead code. | Tapping a notification does nothing; no deep link navigation. |
| **C-06** | `app/(tabs)/profile.tsx` | No pull-to-refresh. Notification toggle + child list can become stale. | Stale data, no recovery. |

#### 🟠 High — Degraded Experience

| ID | File | Finding | Impact |
|----|------|---------|--------|
| **H-01** | `app/(tabs)/index.tsx:634` | `console.error('Failed to load dashboard:', err)` — error hidden from user. | Only banner shows generic text; debug info lost. |
| **H-02** | `app/(tabs)/index.tsx:663` | `console.error('Failed to delete schedule:', err)` — same as above. | Silent error for schedule deletion. |
| **H-03** | `app/(tabs)/ai.tsx:261` | `console.error('Analysis failed:', err)` — analysis failure hidden. | User sees banner but dev log only has detail. |
| **H-04** | `app/settings/edit-profile.tsx:32,37,53` | `console.log` and `console.error` in production UX code. | Leaks debug info, unprofessional. |
| **H-05** | `app/(tabs)/profile.tsx` | No empty state for "no children" — just renders empty `<Section>` with Add button only. | First-time users see unclear state. |
| **H-06** | `app/child/wizard.tsx` | No inline validation on Step 1 (name, DOB) until submit. | Users can tap "Next" with empty fields, error only at final step. |
| **H-07** | `app/(tabs)/log.tsx` | Form resets are inconsistent after successful log/schedule. Some fields retain previous values. | Risk of double-logging same activity. |
| **H-08** | `app/(auth)/signup.tsx:2` | Dead `Alert` import from `react-native`. Not used anywhere in the file. | Unused import, potential bundle bloat, violates "no Alert" contract. |
| **H-09** | `app/(tabs)/log.tsx` | No `KeyboardAvoidingView` wrapper. Keyboard can cover bottom form fields on Android (especially schedule date/time inputs). | Input fields obscured, poor UX on soft keyboard. |

#### 🟡 Medium — Polish & Consistency

| ID | File | Finding | Impact |
|----|------|---------|--------|
| **M-01** | `app/(tabs)/ai.tsx` | `hasActivityData` check only runs on initial load. If user logs first activity, AI screen still shows "no data" until manual refresh. | Stale state, confusing UX. |
| **M-02** | `app/(tabs)/index.tsx` | Upcoming activity "Log" button shows loading state but no error state if `handleLogSchedule` throws. | Silent failure on log-from-schedule. |
| **M-03** | `app/settings/child/[id].tsx` | No confirmation modal on "Delete Child". Destructive action is instant. | Risk of accidental deletion. |
| **M-04** | `app/(tabs)/profile.tsx` | Notification toggle has no error state if `scheduleChildNotifications` throws. | Toggle may appear to work but silently fails. |
| **M-05** | `app/(tabs)/index.tsx` | Child age calculation uses `365.25` constant inline (lines 770, 204). Duplicated logic, inconsistent with `getAgeGroup` in api.ts. | Maintenance risk, slight inaccuracy. |
| **M-06** | `app/(tabs)/index.tsx` | Dashboard header uses custom inline JSX instead of `ScreenHeader` component. Inconsistent with other tab screens. | Design drift, harder to maintain. |
| **M-07** | `app/(tabs)/profile.tsx` | Profile/Settings header uses custom inline JSX instead of `ScreenHeader`. | Same as M-06. |
| **M-08** | `app/_layout.tsx:89` | `<StatusBar style="auto" hidden />` — StatusBar is hidden globally. This is unusual; most apps show the status bar. | Users cannot see time/battery/signal while using the app. |
| **M-09** | `lib/api.ts:98-104` | `getChildren()` does not filter `deleted_at IS NULL` client-side. Relies entirely on RLS policy for soft-delete filtering. | If RLS policy is misconfigured, deleted children would appear. |

#### 🟢 Low — Nice to Have

| ID | File | Finding | Impact |
|----|------|---------|--------|
| **L-01** | `app/(tabs)/ai.tsx` | Filter bar has 11 chips; on small screens (iPhone SE), chips may wrap awkwardly or require excessive scrolling. | Minor visual clutter. |
| **L-02** | `app/(tabs)/log.tsx` | Duration inputs allow values > 24 hours without validation warning. | Nonsensical data possible. |
| **L-03** | `app/(tabs)/history.tsx` | Stats module uses `screenWidth` from Dimensions; may not react to orientation changes. | Landscape mode charts may overflow. |
| **L-04** | Global | No analytics/screen-view tracking. No crash reporting integration. | Operational blindness in production. |
| **L-05** | `app/(auth)/signup.tsx` | Uses Paper `TextInput` for auth fields (email, password). This is acceptable — not compact/numeric fields. Convention allows Paper TextInput for long-form auth fields. | No issue, just documenting convention. |

---

### 3. New Feature QA Coverage

| Feature | File(s) | Test Cases | Status |
|---------|---------|------------|--------|
| **Local Notifications** | `lib/notifications.ts`, `app/(tabs)/profile.tsx` | 1. Permission request on first launch<br>2. Toggle ON schedules daily reminders<br>3. Toggle OFF cancels all reminders<br>4. Notification fires at correct time<br>5. Tapping notification opens app (C-05 blocks this) | ⚠️ **Not tested** |
| **Scheduled Activities** | `app/(tabs)/index.tsx`, `app/(tabs)/log.tsx` | 1. Schedule activity for future date<br>2. Appears in Upcoming list<br>3. Log from schedule creates activity<br>4. Cancel removes from list<br>5. Edit updates schedule | ⚠️ **Partially tested** |
| **AI Insights** | `app/(tabs)/ai.tsx` | 1. Generate insights with activity data<br>2. Rate limit prevents same-day re-run<br>3. Filter by category/priority/insight type<br>4. Pull-to-refresh loads new recs<br>5. Empty state when no child selected | ⚠️ **Partially tested** |
| **Physical Activity / Nap** | `app/(tabs)/log.tsx`, `lib/api.ts` | 1. Log physical activity with duration<br>2. Log nap with start/end time<br>3. Appear in history with correct icons<br>4. Stats aggregate correctly | ⚠️ **Not tested** |
| **Child Wizard v2** | `app/child/wizard.tsx` | 1. Step navigation (→ and ←)<br>2. Photo upload with crop<br>3. BMI calculation feedback<br>4. Sleep duration warnings<br>5. Save creates child with all fields | ⚠️ **Partially tested** |
| **DatePicker Component** | `components/DatePicker.tsx` | 1. Opens modal with calendar<br>2. Selects date correctly<br>3. Min/max date constraints<br>4. Closes on confirm/cancel | ⚠️ **Not tested** |

---

### 4. Platform Parity Checklist

| Check | Android | iOS | Notes |
|-------|---------|-----|-------|
| TextInput centering (View wrapper) | ✅ | ✅ | Verified on wizard, log, settings |
| Paper TextInput avoided for compact fields | ✅ | ✅ | All numeric/time use RNTextInput |
| Tab bar height (80px / 100px) | ✅ | ✅ | Verified in `_layout.tsx` lines 15-16 |
| Tab bar labels shown | ✅ | ✅ | `tabBarShowLabel: true` |
| RefreshControl tintColor (#FF7F60) | ❓ | ❓ | Android uses `progressBackgroundColor`? |
| Notification permission flow | ❓ | ❓ | iOS requires explicit permission dialog |
| Image upload (base64 → Uint8Array) | ✅ | ❓ | `lib/image.ts` uses correct pattern, no `fetch().blob()` |
| StatusBar hidden globally | ❓ | ❓ | May cause notch/safe-area issues on iPhone |
| KeyboardAvoidingView coverage | iOS ✅ | Android ❓ | Missing in `log.tsx`, present in auth/wizard |
| `useFocusEffect` for tab data reload | ✅ | ✅ | Dashboard, History, AI Insights, Child Settings all use it |

---

### 5. RLS & Data Integrity Checks

| Check | Location | Expected | Status |
|-------|----------|----------|--------|
| `children` soft-delete (`deleted_at IS NULL`) | RLS policies (server-side) | Present | ✅ |
| `children` soft-delete client filter | `lib/api.ts` `getChildren()` | Missing | ⚠️ M-09 |
| Activity insert RLS | `parent_id = auth.uid()` | Present | ✅ |
| Recommendation read RLS | `child_id` subquery | Present | ✅ |
| Edge Function service role | `analyze-child` uses service key | Present | ✅ |
| Scheduled activity RLS | `child_id` → `parent_id` | Present | ✅ |
| `supabase` key exposure in client | All files | Uses env vars | ✅ |

---

### 6. Accessibility & Performance

| Check | Finding | Severity |
|-------|---------|----------|
| All TouchableOpacity have `activeOpacity` | ✅ Yes, ~95% coverage | — |
| `hitSlop` on small close buttons | ✅ Present on error banners | — |
| `accessibilityLabel` on icons | ❌ Missing throughout | Medium |
| `accessibilityRole` on buttons | ❌ Missing throughout | Medium |
| Large title text scales with system font | ❌ Not tested | Low |
| List rendering uses `getItemLayout` or `keyExtractor` | ✅ FlatList uses keyExtractor | — |
| Image loading has placeholder | ❌ Avatar uses initials fallback only | Low |
| `keyboardShouldPersistTaps="handled"` | ✅ Present in auth, wizard ScrollView | — |
| `keyboardShouldPersistTaps` in log.tsx | ❓ Not verified | Low |

---

### 7. Architecture & State Management

| Check | Finding | Severity |
|-------|---------|----------|
| Zustand stores for client state only | ✅ `useAuth` + `useApp` only | — |
| Supabase is source of truth | ✅ All mutations refetch after write | — |
| `useFocusEffect` for tab-screen reloads | ✅ 4/5 tab screens use it (Profile doesn't) | 🟠 |
| `selectChild` persists across tabs | ✅ Zustand global state | — |
| No local state relied on post-write | ⚠️ `log.tsx` form fields don't fully reset (H-07) | 🟠 |
| `user` type is `any` in auth store | ⚠️ `stores/auth.ts:6` — `user: any \| null` | Low |

---

### 8. Prohibited Action Compliance

| Prohibited Action | Status | Notes |
|-------------------|--------|-------|
| Install `@expo/dom-webview` | ✅ Not installed | Verified in node_modules |
| Use `Alert.alert()` | ✅ Zero instances | grep confirmed |
| Use Paper TextInput for compact/numeric fields | ✅ All compact use RNTextInput | Wizard, log, child settings |
| Add a 6th bottom tab | ✅ 5 tabs only | Home, Activities, History, Insights, Settings |
| Use `fetch().blob()` on local RN file URIs | ✅ Uses base64 + Uint8Array | `lib/image.ts` confirmed |
| Remove or weaken RLS policies | ✅ All present | RLS section verified |
| Hardcode Supabase keys | ✅ Uses env vars | `lib/supabase.ts` |
| Skip loading/error/empty states | ⚠️ Profile missing all three | C-03 |
| Commit without showing diff | N/A | Process check |
| Ship incomplete features with TODO | ✅ No TODO placeholders found | grep confirmed |

---

## Phase 1–4: Hardening Checklist

### Phase 1: State Completion (Loading/Error/Empty)

- [ ] **C-01** Add `loading` state to `index.tsx` with skeleton or spinner overlay on initial load
- [ ] **C-03** Add `loading`, `error`, and `onRetry` to `profile.tsx`
- [ ] **C-04** Add `RefreshControl` to `log.tsx`
- [ ] **C-06** Add `RefreshControl` to `profile.tsx`
- [ ] **H-05** Add empty state illustration + CTA in `profile.tsx` when `children.length === 0`
- [ ] **M-02** Add error state to `UpcomingItem` log button
- [ ] **M-04** Wrap notification toggle in try/catch with inline error

### Phase 2: Alert → Inline (Already Complete)

- [x] Zero `Alert.alert` found — **PASS** ✅
- [ ] **H-08** Remove dead `Alert` import from `signup.tsx`

### Phase 3: Form Validation Hardening

- [ ] **H-06** Add real-time inline validation to wizard Step 1 (name min length, DOB valid)
- [ ] **H-07** Standardize form reset after successful submit in `log.tsx`
- [ ] **M-03** Add confirmation modal before child deletion
- [ ] **M-01** Re-check `hasActivityData` on focus in `ai.tsx`
- [ ] **L-02** Add sensible max duration validation (e.g., 12h for sleep, 4h for screen)

### Phase 4: Polish & Cleanup

- [ ] **C-05** Implement notification deep-link handler in `_layout.tsx` (navigate to log/history on tap)
- [ ] **C-02** Implement notification inbox or remove bell button
- [ ] **H-01–H-04** Remove all `console.error` and `console.log` from production screens (or guard with `__DEV__`)
- [ ] **H-09** Add `KeyboardAvoidingView` to `log.tsx`
- [ ] **M-05** Extract age calculation to shared helper, dedupe
- [ ] **M-06** Refactor `index.tsx` header to use `ScreenHeader` component
- [ ] **M-07** Refactor `profile.tsx` header to use `ScreenHeader` component
- [ ] **M-08** Review `StatusBar hidden` — decide if intentional or revert to visible
- [ ] **M-09** Add `.is('deleted_at', null)` filter to `getChildren()` in `lib/api.ts`
- [ ] **L-03** Make stats chart responsive to orientation changes
- [ ] **L-04** Add Sentry/Crashlytics integration (post-launch)

### Phase 5: New Feature Regression Testing

- [ ] Test notification scheduling on physical Android device
- [ ] Test notification scheduling on physical iOS device
- [ ] Test notification tap deep-link (after C-05 is fixed)
- [ ] Test scheduled activity CRUD end-to-end
- [ ] Test AI Insights generation with < 3 days of data (edge case)
- [ ] Test AI Insights rate limiting (same-day block)
- [ ] Test physical activity + nap in history aggregation
- [ ] Test child wizard with photo upload on Android
- [ ] Test child wizard with photo upload on iOS
- [ ] Test DatePicker with min date (DOB cannot be future)

---

## Appendix: File Inventory

### Tab Screens
- `app/(tabs)/index.tsx` — Dashboard (1,616 LOC)
- `app/(tabs)/log.tsx` — Log Activity (1,410 LOC)
- `app/(tabs)/history.tsx` — History (1,196 LOC)
- `app/(tabs)/ai.tsx` — AI Insights (656 LOC)
- `app/(tabs)/profile.tsx` — Settings / Profile (514 LOC)

### Tab Layout
- `app/(tabs)/_layout.tsx` — Tab bar config (82 LOC)

### Auth Screens
- `app/(auth)/login.tsx` — Login (472 LOC)
- `app/(auth)/signup.tsx` — Signup (593 LOC)
- `app/(auth)/_layout.tsx` — Auth stack (10 LOC)

### Settings Stack
- `app/settings/edit-profile.tsx` — Edit parent profile
- `app/settings/change-email.tsx` — Change email
- `app/settings/change-password.tsx` — Change password
- `app/settings/child/[id].tsx` — Child settings (dynamic route)
- `app/settings/help.tsx` — Help & FAQ (602 LOC, research-backed)
- `app/settings/privacy.tsx` — Privacy Policy (154 LOC, static)

### Wizard
- `app/child/wizard.tsx` — Child setup (1,827 LOC)

### Root Layout
- `app/_layout.tsx` — Root layout, auth guard, theme, notifications init (97 LOC)

### State
- `stores/auth.ts` — Zustand `useAuth` + `useApp` stores (70 LOC)

### Libraries
- `lib/api.ts` — API client (340 LOC)
- `lib/notifications.ts` — Local notifications (323 LOC)
- `lib/bmi.ts` — BMI calculations
- `lib/sleep-calculator.ts` — Sleep recommendations
- `lib/image.ts` — Image upload helpers (base64 + Uint8Array)
- `lib/supabase.ts` — Supabase client
- `lib/database.types.ts` — Generated DB types

### Components
- `components/ScreenHeader.tsx` — Reusable header (used in 3/5 tabs)
- `components/DatePicker.tsx` — Calendar modal picker
