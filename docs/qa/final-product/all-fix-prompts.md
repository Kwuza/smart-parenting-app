# Smart Parenting App — All Remaining Fix Prompts

**Purpose:** Exact prompts for all remaining **code fixes** and all **re-verification steps** currently identified from the Phase 3 backlog.

**Source of truth:**
- `docs/qa/final-product/phase-3-fix-backlog.md`
- `docs/qa/final-product/phase-3/verdict.md`

**What this file includes:**
- prompts for the one remaining **pre-Phase-3-rerun High** code issue
- prompts for the remaining **Medium/Low code fixes**
- prompts to **re-verify** the fixes already changed on the current branch

**What this file does NOT include:**
- runtime retest prompts
- controller merge prompts
- Phase 4+ certification prompts

---

## 0. Current execution order

### Fix now
1. Notification toggle semantics

### Re-verify already changed branch work
2. `selectedChild` persistence fix
3. Dashboard bell removal
4. Auth dead-affordance removal
5. Log `useFocusEffect` fix

### Then optional/non-blocking code cleanup
6. Notification deep-link fragility
7. Cold-start spinner branding/context
8. StatusBar visibility
9. Child deletion UI
10. Wizard Step 1 inline validation
11. Auth redirect progress explanation
12. Age calculation helper extraction
13. Auth store `user` typing

---

# 1. Notification Toggle Semantics — `app/(tabs)/profile.tsx`

## 1A. Implementer Prompt

```md
You are implementing the next Smart Parenting App fix.

## Goal
Fix the verified Phase 3 High issue: **notification toggle semantics are inverted and misleading** in Settings.

## Repo
`~/local-projects/smart-parenting-app`

## Verified problem
In `app/(tabs)/profile.tsx:326-336`, the UI shows:
- label: `All Notifications`
- description: `Turn off all child activity alerts`
- switch value bound to `allNotificationsDisabled`

This means the switch looks like an enable toggle, but `true` actually means notifications are disabled.

## Required implementation
Make the smallest safe change that makes the switch semantics match user expectation.

### Requirements
1. The visible switch must use truthful semantics.
2. ON must mean notifications are enabled.
3. OFF must mean notifications are disabled.
4. Keep the current notification scheduling/cancel behavior correct.
5. Keep the current Settings screen layout coherent.
6. Do not add new notification features.
7. Do not change routes, tabs, auth, RLS, or database logic.
8. No `Alert.alert()`, no TODOs, no speculative refactor.
9. Minimum surface area only.

## Files
Primary target:
- `app/(tabs)/profile.tsx`

Only touch other files if absolutely necessary, and explain why.

## Verification
After editing, run:
```bash
npx tsc --noEmit
```

## Output format
Return:
1. summary of what changed
2. exact files modified
3. unified diff
4. verification result from `npx tsc --noEmit`
5. any risks or edge cases left

Do not commit.
Do not broaden scope.
```

## 1B. Spec Reviewer Prompt

```md
You are the independent spec reviewer for a Smart Parenting App fix.

## Task
Review whether the implementation exactly satisfies the spec for fixing notification toggle semantics.

## Repo
`~/local-projects/smart-parenting-app`

## Original spec
The Settings notification switch must no longer have inverted semantics.

### Required behavior
- the switch meaning is truthful
- ON means notifications are enabled
- OFF means notifications are disabled
- no misleading label/description mismatch remains
- existing notification scheduling/cancel behavior is preserved
- no unrelated Settings refactor
- no scope creep outside this fix

## Files to inspect
- `app/(tabs)/profile.tsx`
- current diff

## Review checklist
Check:
- [ ] switch semantics are no longer inverted
- [ ] visible UI wording matches actual behavior
- [ ] notification behavior path was preserved
- [ ] no unrelated layout or logic changes were introduced
- [ ] no scope creep

## Output format
Return exactly:
- `PASS`
or
- `REQUEST_CHANGES`

If `REQUEST_CHANGES`, list only concrete spec gaps with file paths and exact reasons.
```

## 1C. Code Quality Reviewer Prompt

```md
You are the independent code quality reviewer for a Smart Parenting App fix.

## Task
Review the implementation quality of the notification-toggle semantics fix.

## Repo
`~/local-projects/smart-parenting-app`

## Files to review
- `app/(tabs)/profile.tsx`
- any other touched files

## Check for
- semantic inversion still present in code
- label/description mismatch still present
- accidental notification behavior regression
- unused state or dead variable names after the fix
- unnecessary scope expansion
- type regressions

## Output format
Return exactly these sections:

Critical Issues:
- ...

Important Issues:
- ...

Minor Issues:
- ...

Verdict:
- `APPROVED`
or
- `REQUEST_CHANGES`
```

= The fix correctly inverts the toggle semantics end-to-end:

    • State renamed: allNotificationsDisabled → notificationsEnabled — no orphaned     references remain (grep confirmed clean across entire app/ and stores/).
    • Logic flipped: if (notificationsEnabled) { schedule } else { cancel } — matches the     new positive semantics. The useEffect dependency array updated to     [notificationsEnabled].
    • UI aligned: icon changed from notifications-off-outline → notifications-outline,     description changed from "Turn off all child activity alerts" → "Receive child     activity alerts". Label "All Notifications" unchanged — now reads naturally with the     positive switch.
    • Thumb color preserved: active coral (#FF7F60) when enabled, neutral when disabled.     No visual regression.
    • Initial state: false (notifications off by default) — reasonable opt-in default.
    • No scope creep: only the notification toggle section touched, no other lines     modified.
    • No type regressions: remains boolean state throughout.

---

# 2. Re-Verify `selectedChild` Persistence — `stores/auth.ts`

## 2A. Spec Reviewer Prompt

```md
You are the independent spec reviewer for a Smart Parenting App fix.

## Task
Re-review the current implementation of the `selectedChild` persistence fix against the live source tree.

## Repo
`~/local-projects/smart-parenting-app`

## Files to inspect
- `stores/auth.ts`
- current git diff for `stores/auth.ts`

## Original spec
The fix must resolve the verified Phase 3 blocker: `selectedChild` is not persisted across relaunch.

### Required behavior
- child selection survives app relaunch
- persistence uses Zustand persist + AsyncStorage
- only child selection id is persisted, not full child object
- public store API remains compatible for current callers
- `selectChild(child)` updates both selected child and persisted id
- `loadChildren()` restores the matching child if still present
- fallback is first child, else null
- sign-out clears selected child, persisted selection id, and children
- no UI changes
- no route changes
- no RLS / backend / schema changes
- no unrelated refactors

## Output format
Return exactly:
- `PASS`
or
- `REQUEST_CHANGES`

If `REQUEST_CHANGES`, list only concrete spec gaps with file paths and exact reasons.
```

## 2B. Code Quality Reviewer Prompt

```md
You are the independent code quality reviewer for a Smart Parenting App fix.

## Task
Review the implementation quality of the `selectedChild` persistence fix.

## Repo
`~/local-projects/smart-parenting-app`

## Files to review
- `stores/auth.ts`
- any other touched files

## Check for
- persisting full child object instead of id
- stale persisted id not healing correctly on fallback
- cross-account leakage on sign-out
- type safety regressions
- overcomplication / scope creep
- hidden runtime hazards in current store flow

## Output format
Return exactly these sections:

Critical Issues:
- ...

Important Issues:
- ...

Minor Issues:
- ...

Verdict:
- `APPROVED`
or
- `REQUEST_CHANGES`
```

---

# 3. Re-Verify Dashboard Bell Removal — `app/(tabs)/index.tsx`

## 3A. Spec Reviewer Prompt

```md
You are the independent spec reviewer for a Smart Parenting App fix.

## Task
Review whether the implementation exactly satisfies the spec for the dashboard dead-bell removal.

## Repo
`~/local-projects/smart-parenting-app`

## Original spec
The fix must resolve the verified Phase 3 blocker: dead dashboard notification bell with fake red dot.

### Required behavior
- the dead notification bell is removed from the dashboard header
- the fake red dot is removed
- no replacement fake affordance is introduced
- no notification inbox or new navigation is added
- dashboard header remains coherent
- no unrelated dashboard refactor

## Files to inspect
- `app/(tabs)/index.tsx`
- current diff

## Output format
Return exactly:
- `PASS`
or
- `REQUEST_CHANGES`

If `REQUEST_CHANGES`, list only concrete spec gaps with file paths and exact reasons.
```

## 3B. Code Quality Reviewer Prompt

```md
You are the independent code quality reviewer for a Smart Parenting App fix.

## Task
Review the implementation quality of the dashboard dead-bell removal.

## Repo
`~/local-projects/smart-parenting-app`

## Files to review
- `app/(tabs)/index.tsx`
- any other touched files

## Check for
- bell JSX still present anywhere in dashboard header
- red dot JSX still present
- unused `notifButton` / `notifDot` styles left behind if no longer used
- accidental header layout regression in source structure
- unnecessary scope expansion
- type regressions

## Output format
Return exactly these sections:

Critical Issues:
- ...

Important Issues:
- ...

Minor Issues:
- ...

Verdict:
- `APPROVED`
or
- `REQUEST_CHANGES`
```

---

# 4. Re-Verify Auth Dead-Affordance Removal — `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`

## 4A. Spec Reviewer Prompt

```md
You are the independent spec reviewer for a Smart Parenting App fix.

## Task
Review whether the implementation exactly satisfies the spec for removing dead auth affordances.

## Repo
`~/local-projects/smart-parenting-app`

## Original spec
The fix must remove dead auth affordances from the login and signup screens.

### Required behavior
- login screen no longer shows the dead "Forgot password?" affordance
- login screen no longer shows dead Google / Apple buttons
- signup screen no longer shows dead Google / Apple buttons
- the now-empty “or continue with” divider is removed from both screens
- no placeholder fake affordance replaces them
- existing working auth flows remain untouched
- no OAuth added
- no password reset flow added
- no unrelated refactor

## Files to inspect
- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`
- current diff

## Output format
Return exactly:
- `PASS`
or
- `REQUEST_CHANGES`

If `REQUEST_CHANGES`, list only concrete spec gaps with file paths and exact reasons.
```

## 4B. Code Quality Reviewer Prompt

```md
You are the independent code quality reviewer for a Smart Parenting App fix.

## Task
Review the implementation quality of the auth dead-affordance removal.

## Repo
`~/local-projects/smart-parenting-app`

## Files to review
- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`
- any other touched files

## Check for
- any removed affordance still present in JSX
- any now-empty divider or section left behind
- unused style objects left behind after JSX removal
- unused imports introduced by the removals
- accidental regression to working auth behavior
- unnecessary scope expansion
- type regressions

## Output format
Return exactly these sections:

Critical Issues:
- ...

Important Issues:
- ...

Minor Issues:
- ...

Verdict:
- `APPROVED`
or
- `REQUEST_CHANGES`
```

---

# 5. Re-Verify Log `useFocusEffect` Fix — `app/(tabs)/log.tsx`

## 5A. Spec Reviewer Prompt

```md
You are the independent spec reviewer for a Smart Parenting App fix.

## Task
Review whether the implementation exactly satisfies the spec for the Log tab `useFocusEffect` fix.

## Repo
`~/local-projects/smart-parenting-app`

## Original spec
The fix must resolve the verified Phase 3 High issue: the Log tab does not reload child state on tab focus.

### Required behavior
- `app/(tabs)/log.tsx` now uses `useFocusEffect`
- when the Log tab gains focus, child state is reloaded using the existing store flow
- current pull-to-refresh behavior is preserved
- no full-screen loading state or focus-time UI flash is introduced
- the form is not reset on every focus
- no speculative refactor

## Files to inspect
- `app/(tabs)/log.tsx`
- current diff

## Output format
Return exactly:
- `PASS`
or
- `REQUEST_CHANGES`

If `REQUEST_CHANGES`, list only concrete spec gaps with file paths and exact reasons.
```

## 5B. Code Quality Reviewer Prompt

```md
You are the independent code quality reviewer for a Smart Parenting App fix.

## Task
Review the implementation quality of the Log tab `useFocusEffect` fix.

## Repo
`~/local-projects/smart-parenting-app`

## Files to review
- `app/(tabs)/log.tsx`
- any other touched files

## Check for
- `useFocusEffect` added incorrectly or not actually wired to child reload
- duplicated refresh logic that creates drift or inconsistency
- stale-closure mistakes inside focus callback
- unnecessary rerenders or noisy focus-time state changes
- accidental form reset on tab focus
- accidental regression to pull-to-refresh behavior
- unused imports / dead local helpers after the edit
- type regressions

## Output format
Return exactly these sections:

Critical Issues:
- ...

Important Issues:
- ...

Minor Issues:
- ...

Verdict:
- `APPROVED`
or
- `REQUEST_CHANGES`
```

---

# 6. Notification Deep-Link Fragility — `app/_layout.tsx`

## 6A. Implementer Prompt

```md
You are implementing a Smart Parenting App fix.

## Goal
Harden the notification deep-link flow in `app/_layout.tsx` so it is less fragile and less silent on failure.

## Verified problem
The notification response handler currently:
- selects a matching child from store state
- waits 500ms
- calls `router.replace(...)`
- only does `console.warn` on failure

Current location:
- `app/_layout.tsx:70-78`

## Required implementation
Make the smallest safe improvement.

### Requirements
1. Reduce fragility in the notification navigation path.
2. Keep the current child-selection behavior intact.
3. Keep the current route mapping behavior intact.
4. Remove or reduce reliance on an arbitrary blind delay if a safer approach is possible with minimum surface area.
5. Do not add `Alert.alert()`.
6. Do not add a new screen or notification inbox.
7. Do not refactor unrelated auth/layout logic.
8. If failure still occurs, handle it more safely than `console.warn`-only.

## Files
- `app/_layout.tsx`

## Verification
Run:
```bash
npx tsc --noEmit
```

## Output format
Return summary, files modified, unified diff, verification result, remaining risks.
```

## 6B. Spec Reviewer Prompt

```md
You are the independent spec reviewer for a Smart Parenting App fix.

## Task
Review whether the notification deep-link hardening fix satisfies the spec.

## Required behavior
- notification tap flow remains functional
- child selection still occurs correctly
- the deep-link path is less fragile than before
- failure handling is safer than `console.warn`-only
- no unrelated layout/auth/navigation refactor was introduced

## Files to inspect
- `app/_layout.tsx`
- current diff

## Output format
Return exactly:
- `PASS`
or
- `REQUEST_CHANGES`
```

## 6C. Code Quality Reviewer Prompt

```md
You are the independent code quality reviewer for a Smart Parenting App fix.

## Task
Review the implementation quality of the notification deep-link hardening fix.

## Files to review
- `app/_layout.tsx`

## Check for
- stale-closure issues
- arbitrary delay still unjustified
- swallowed errors
- routing regressions
- auth timing regressions
- unnecessary scope expansion

## Output format
Return exactly the standard sections and verdict:
- `APPROVED` or `REQUEST_CHANGES`
```

---

# 7. Cold-Start Spinner Branding/Context — `app/_layout.tsx`

## 7A. Implementer Prompt

```md
You are implementing a Smart Parenting App fix.

## Goal
Improve the cold-start loading state in `app/_layout.tsx` so it is not just a raw spinner.

## Verified problem
Current loading state is a plain full-screen `ActivityIndicator` on the brand background with no app identity or loading context.

Current location:
- `app/_layout.tsx:105-111`

## Required implementation
Make the smallest HCI-correct improvement.

### Requirements
1. Keep the full-screen loading state.
2. Add lightweight brand/context so the screen does not feel blank.
3. Do not overbuild an animation system.
4. Do not change auth flow timing in this patch.
5. No `Alert.alert()`, no TODOs, no speculative redesign.
6. Minimum surface area only.

## Files
- `app/_layout.tsx`

## Verification
Run:
```bash
npx tsc --noEmit
```
```

## 7B. Spec Reviewer Prompt

```md
You are the independent spec reviewer for a Smart Parenting App fix.

## Task
Review whether the cold-start spinner improvement satisfies the spec.

## Required behavior
- loading state is still present
- screen is no longer only a raw spinner
- added branding/context is lightweight and coherent
- no auth-flow logic changes were introduced
- no scope creep

## Files to inspect
- `app/_layout.tsx`
- current diff

## Output format
Return `PASS` or `REQUEST_CHANGES` only, with concrete gaps if failing.
```

## 7C. Code Quality Reviewer Prompt

```md
You are the independent code quality reviewer for a Smart Parenting App fix.

## Task
Review the implementation quality of the cold-start loading-state improvement.

## Check for
- overbuilding
- visual-only code with unnecessary complexity
- auth logic drift
- type regressions
- unused styles/imports

## Output format
Return the standard sections and verdict.
```

---

# 8. StatusBar Visibility — `app/_layout.tsx`

## 8A. Implementer Prompt

```md
You are implementing a Smart Parenting App fix.

## Goal
Resolve the global hidden StatusBar issue in `app/_layout.tsx`.

## Verified problem
Current root layout uses:
```tsx
<StatusBar style="auto" hidden />
```
which hides time/battery/signal globally.

## Required implementation
Make the smallest safe change to stop globally hiding the StatusBar.

### Requirements
1. StatusBar should no longer be globally hidden.
2. Keep root layout behavior otherwise unchanged.
3. Do not alter tab structure, auth flow, or navigation.
4. Minimum surface area only.

## Files
- `app/_layout.tsx`

## Verification
Run `npx tsc --noEmit`.
```

## 8B. Spec Reviewer Prompt

```md
Review whether the StatusBar fix satisfies the spec:
- StatusBar is no longer globally hidden
- no unrelated layout changes
- no scope creep

Inspect:
- `app/_layout.tsx`
- current diff

Return only `PASS` or `REQUEST_CHANGES`.
```

## 8C. Code Quality Reviewer Prompt

```md
Review the implementation quality of the StatusBar visibility fix.

Check for:
- accidental platform regression
- unnecessary layout changes
- dead code
- type regressions

Return the standard sections and verdict.
```

---

# 9. Child Deletion UI — `app/settings/child/[id].tsx`

## 9A. Implementer Prompt

```md
You are implementing a Smart Parenting App fix.

## Goal
Add a safe child deletion UI flow to `app/settings/child/[id].tsx`.

## Verified problem
There is currently no delete/remove affordance in the child settings UI at all.
The baseline issue transformed from “missing confirmation modal” into “feature missing entirely.”

## Required implementation
Add a complete deletion flow that matches project HCI rules.

### Requirements
1. Add a visible delete/remove child action in child settings.
2. Destructive action must require confirmation via in-app modal, not `Alert.alert()`.
3. Show loading state during delete.
4. Show inline error/success feedback or deterministic navigation outcome.
5. Refetch/update state after deletion so stale child data does not linger.
6. Respect existing data/auth boundaries.
7. Minimum surface area only.
8. Do not weaken RLS or backend safeguards.
9. No TODOs.

## Files
Primary likely target:
- `app/settings/child/[id].tsx`

Touch API/store files only if required, and explain why.

## Verification
Run `npx tsc --noEmit`.
```

## 9B. Spec Reviewer Prompt

```md
Review whether the child deletion UI implementation satisfies the spec.

Required behavior:
- delete affordance exists
- confirmation modal exists
- no `Alert.alert()` used
- destructive flow has loading state
- stale child state is resolved after deletion
- no backend/security weakening

Inspect touched files and current diff.
Return only `PASS` or `REQUEST_CHANGES`.
```

## 9C. Code Quality Reviewer Prompt

```md
Review the implementation quality of the child deletion UI flow.

Check for:
- destructive action without confirmation
- missing loading/error handling
- stale selected-child aftermath
- accidental security regression
- unnecessary scope expansion
- type regressions

Return the standard sections and verdict.
```

---

# 10. Wizard Step 1 Inline Validation — `app/child/wizard.tsx`

## 10A. Implementer Prompt

```md
You are implementing a Smart Parenting App fix.

## Goal
Upgrade Step 1 of the child wizard from submit-triggered validation to real-time inline validation.

## Verified problem
Current `validateStep()` exists, but Step 1 validation only appears on Next press rather than as inline per-field guidance.

## Required implementation
Make Step 1 validation HCI-correct with minimum surface area.

### Requirements
1. Step 1 fields must show inline validation feedback as the user interacts.
2. At minimum cover:
   - name required / minimum length
   - DOB required / non-future
3. Do not use `Alert.alert()`.
4. Keep current wizard structure and step order.
5. Do not redesign the entire wizard.
6. Preserve existing submit-time guard too.
7. Minimum surface area only.

## Files
- `app/child/wizard.tsx`

## Verification
Run `npx tsc --noEmit`.
```

## 10B. Spec Reviewer Prompt

```md
Review whether Step 1 wizard validation now satisfies the spec.

Required behavior:
- inline validation exists for Step 1 fields
- name and DOB validation are visible before final step advance
- submit-time safety still exists
- no `Alert.alert()` introduced
- no broad wizard redesign

Inspect `app/child/wizard.tsx` and current diff.
Return only `PASS` or `REQUEST_CHANGES`.
```

## 10C. Code Quality Reviewer Prompt

```md
Review the implementation quality of the wizard Step 1 inline-validation fix.

Check for:
- duplicated validation logic drifting from `validateStep()`
- poor field-state hygiene
- stale error states not clearing correctly
- unnecessary refactor beyond Step 1
- type regressions

Return the standard sections and verdict.
```

---

# 11. Auth Redirect Progress Explanation — `app/_layout.tsx`

## 11A. Implementer Prompt

```md
You are implementing a Smart Parenting App fix.

## Goal
Improve the 1.8s auth redirect delay so it does not feel unexplained/frozen.

## Verified structural issue
`app/_layout.tsx:95-97` uses a 1.8s delayed redirect after login to preserve the welcome animation, but there is no explicit progress explanation during that delay.

## Required implementation
Make the delay feel intentional without removing the welcome/goodbye animation contract.

### Requirements
1. Keep the welcome animation contract intact unless absolutely necessary.
2. Add lightweight visual/contextual explanation so the delay does not feel frozen.
3. Do not redesign auth flow.
4. Do not add modal/alert patterns.
5. Minimum surface area only.

## Files
- `app/_layout.tsx`
- auth screen only if absolutely necessary

## Verification
Run `npx tsc --noEmit`.
```

## 11B. Spec Reviewer Prompt

```md
Review whether the auth-delay explanation fix satisfies the spec.

Required behavior:
- redirect delay remains intentional/explained
- welcome animation contract remains intact
- no broad auth-flow refactor
- no extra fake loading pattern introduced

Inspect touched files and current diff.
Return `PASS` or `REQUEST_CHANGES`.
```

## 11C. Code Quality Reviewer Prompt

```md
Review the implementation quality of the auth-delay explanation fix.

Check for:
- timing drift/breakage
- duplicate state
- unnecessary auth-flow complexity
- unused styles/imports
- type regressions

Return the standard sections and verdict.
```

---

# 12. Age Calculation Helper Extraction — dashboard/profile

## 12A. Implementer Prompt

```md
You are implementing a Smart Parenting App cleanup fix.

## Goal
Remove duplicated inline `365.25` age calculations and move them to a shared helper.

## Verified problem
Dashboard/Profile still use inline age calculation logic rather than a shared helper.

## Required implementation
Make the smallest safe cleanup.

### Requirements
1. Extract age calculation into a shared helper.
2. Replace duplicated inline calculations in the affected files.
3. Do not change visible age semantics unexpectedly.
4. Minimum surface area only.

## Verification
Run `npx tsc --noEmit`.
```

## 12B. Spec Reviewer Prompt

```md
Review whether the age-calculation cleanup satisfies the spec:
- duplicated inline calculation removed where targeted
- shared helper used
- no visible behavior change beyond the refactor
- no scope creep

Return `PASS` or `REQUEST_CHANGES`.
```

## 12C. Code Quality Reviewer Prompt

```md
Review the implementation quality of the age-calculation helper extraction.

Check for:
- hidden behavior drift
- unnecessary helper sprawl
- partial replacement leaving inconsistent logic
- type regressions

Return the standard sections and verdict.
```

---

# 13. Auth Store `user` Typing — `stores/auth.ts`

## 13A. Implementer Prompt

```md
You are implementing a Smart Parenting App type-safety cleanup.

## Goal
Replace `user: any | null` in `stores/auth.ts` with a more accurate type.

## Verified problem
Current auth store uses:
- `user: any | null`

This is low-severity but weakens TypeScript safety.

## Required implementation
Make the smallest safe type improvement.

### Requirements
1. Replace `any` with a concrete/auth-appropriate type.
2. Keep runtime behavior unchanged.
3. Do not refactor unrelated store logic.
4. Minimum surface area only.

## Verification
Run `npx tsc --noEmit`.
```

## 13B. Spec Reviewer Prompt

```md
Review whether the auth-store typing fix satisfies the spec:
- `any` replaced with a concrete type
- runtime behavior unchanged
- no unrelated store refactor

Inspect `stores/auth.ts` and current diff.
Return `PASS` or `REQUEST_CHANGES`.
```

## 13C. Code Quality Reviewer Prompt

```md
Review the implementation quality of the auth-store typing fix.

Check for:
- inaccurate imported type
- unnecessary type gymnastics
- type mismatch with current auth usage
- scope creep

Return the standard sections and verdict.
```

---

## Final note
For immediate Phase 3 rerun readiness, the most important prompts in this file are:
1. Notification toggle semantics
2. Re-verification prompts for:
   - `stores/auth.ts`
   - dashboard bell removal
   - auth dead-affordance removal
   - Log `useFocusEffect`

Everything after that is valid backlog work, but it does not need to block the immediate Phase 3 recertification cycle unless you want to clear more debt before rerunning the agents.
