# Smart Parenting App — Dual-Agent QA Task Pack

## Source of truth recovered
- Session plan: `~/Documents/x1n4te-workstation/wiki/analyses/smart-parenting-app-final-product-qa-plan.md`
- Session source log: `~/Documents/x1n4te-workstation/wiki/sources/operational/2026-04-23-spa-final-product-dual-agent-qa-plan.md`
- Current baseline: `QA_BASELINE.md`
- Repo: `~/local-projects/smart-parenting-app`

## Current gate status
Final-product QA phases 3–9 are **prepared but not yet clean to certify**. The latest `QA_BASELINE.md` still shows open release blockers:
- Critical: C-01, C-02, C-03, C-04, C-05, C-06
- High: H-01 through H-09

Controller rule:
1. If these blockers are still open, dispatch agents in **precondition verification mode** and fail the phase closed.
2. If blockers are fixed, dispatch the phase tasks below as normal certification tasks.

## Agent roles
- **MiniMax-M2.7** — compliance auditor
- **Kimi-K2.6** — product dogfooder
- **Controller** — merge verdicts, resolve conflicts, decide reruns

## Global rules for every dispatch
- Different mandates per model. Do not duplicate prompts.
- No model self-verifies its own fix.
- Findings are confirmed only when both agents reproduce them, or one agent provides hard evidence.
- No concurrent edits to the same files.
- Every phase must produce three artifacts:
  - `docs/qa/final-product/phase-N/minimax.md`
  - `docs/qa/final-product/phase-N/kimi.md`
  - `docs/qa/final-product/phase-N/verdict.md`
- Hard ship gate remains:
  - 0 known Critical
  - 0 known High
  - 0 dead primary actions
  - 0 prohibited-pattern regressions
  - 0 unresolved runtime console errors in certified flows
  - 0 must-fix bloat findings

## Shared app context to include in all agent prompts
- Expo SDK 52 app with 5 tabs max: Dashboard, Log, History, AI Insights, Settings
- HCI contract: no `Alert.alert()`, inline validation, visible loading/error/empty states, pull-to-refresh on list/data screens
- Compact numeric/time inputs must use RN `TextInput` + `View` wrapper pattern, not Paper `TextInput`
- Supabase is source of truth; mutations must refetch; RLS must remain strict
- Notifications and scheduled activities are in scope
- Focus files from current baseline:
  - `app/(tabs)/index.tsx`
  - `app/(tabs)/log.tsx`
  - `app/(tabs)/history.tsx`
  - `app/(tabs)/ai.tsx`
  - `app/(tabs)/profile.tsx`
  - `app/_layout.tsx`
  - `app/child/wizard.tsx`
  - `app/settings/child/[id].tsx`
  - `app/settings/edit-profile.tsx`
  - `lib/api.ts`
  - `lib/notifications.ts`
  - `components/DatePicker.tsx`

---

## Phase 3 — Runtime Product Validation

### Task: MiniMax-M2.7
**Goal**
Falsify runtime readiness using a strict checklist. Verify state coverage, dead actions, notification hooks, pull-to-refresh, and runtime noise in core surfaces.

**Context to send**
- Audit the running Smart Parenting app as a compliance auditor.
- Prioritize: missing loading/error/empty states, dead buttons, empty handlers, console/runtime errors, `Alert.alert` regressions, missing pull-to-refresh.
- Verify all 5 tabs are reachable and coherent.
- Verify modal open/close behavior and screen resume behavior.
- Use `QA_BASELINE.md` as the known starting point and confirm whether C-01/C-02/C-03/C-04/C-05/C-06 still reproduce.
- Output: `docs/qa/final-product/phase-3/minimax.md`
- Required sections: checklist coverage, confirmed findings, repro steps, file-path suspects, ship gate verdict.

**Suggested toolsets**
- `browser`, `terminal`, `file`

### Task: Kimi-K2.6
**Goal**
Dogfood the app like a real parent and surface runtime friction, confusing affordances, dead taps, and broken flow feel.

**Context to send**
- Cold-start the app and use it like a first-time parent.
- Sign in, select a child, move across all tabs, open/close key modals and forms, background and foreground the app, relaunch and verify persistence.
- Focus on confusion, friction, misleading copy, weak affordances, stale child state, dead taps, and awkward transitions.
- Confirm whether Dashboard and Profile still feel broken or stale on first load.
- Output: `docs/qa/final-product/phase-3/kimi.md`
- Required sections: user-journey notes, friction list, confirmed bugs, screenshots/evidence, pass/fail verdict.

**Suggested toolsets**
- `browser`, `terminal`, `file`, `vision`

### Task: Controller
**Goal**
Merge MiniMax and Kimi findings into a single runtime verdict.

**Context to send**
- Compare `phase-3/minimax.md` and `phase-3/kimi.md`.
- Confirm findings only with dual reproduction or one-source hard evidence.
- Separate: confirmed blockers, likely issues needing rerun, and non-blocking polish.
- Output: `docs/qa/final-product/phase-3/verdict.md`

---

## Phase 4 — Core Flow Completion Matrix

### Task: MiniMax-M2.7
**Goal**
Certify every critical flow with a pass/fail matrix and identify exact failing steps.

**Context to send**
- Validate these flows with checklist discipline:
  1. sign in / sign out
  2. add/select child
  3. log screen time
  4. log sleep
  5. log nap
  6. log meal
  7. log physical activity
  8. log education
  9. create schedule
  10. update schedule
  11. delete schedule
  12. log from schedule
  13. notification tap → correct navigation
  14. History filtering aligned to selected context
  15. AI Insights generation + cache behavior
  16. settings updates
- For each flow: preconditions, exact steps, expected result, actual result, pass/fail, suspected file path.
- Output: `docs/qa/final-product/phase-4/minimax.md`

**Suggested toolsets**
- `browser`, `terminal`, `file`

### Task: Kimi-K2.6
**Goal**
Run the critical flows end-to-end and judge whether they feel production-ready for a parent.

**Context to send**
- Execute the same core flows, but score them on speed, clarity, affordance, feedback, and recovery.
- Pay special attention to:
  - log success feedback
  - form reset behavior in `log.tsx`
  - child switching clarity
  - history filtering trustworthiness
  - AI Insights “no data” and cache behavior
  - schedule CRUD feel
- Output: `docs/qa/final-product/phase-4/kimi.md`
- Include: friction notes, broken expectations, misleading copy, dead-end moments.

**Suggested toolsets**
- `browser`, `terminal`, `file`, `vision`

### Task: Controller
**Goal**
Produce the flow certification matrix.

**Context to send**
- Merge both phase-4 reports into a single table of flows with statuses: PASS, FAIL, PASS WITH CONCERNS.
- Any FAIL in a critical flow blocks release readiness.
- Output: `docs/qa/final-product/phase-4/verdict.md`

---

## Phase 5 — Failure & Edge-Case Validation

### Task: MiniMax-M2.7
**Goal**
Drive the failure matrix and verify coverage of expected failure states.

**Context to send**
- Validate these failure cases:
  - no network
  - Supabase query failure
  - expired auth/session
  - empty data sets
  - soft-deleted child edge cases
  - notification permission denied
  - invalid time range
  - overnight duration cases
  - double-submit
  - fast modal reopen after failure
  - stale child/store transitions
- Confirm presence of inline errors, retry paths, and no stuck spinners.
- Cross-check baseline risks around `profile.tsx`, `log.tsx`, `_layout.tsx`, `wizard.tsx`, and `lib/api.ts`.
- Output: `docs/qa/final-product/phase-5/minimax.md`

**Suggested toolsets**
- `browser`, `terminal`, `file`

### Task: Kimi-K2.6
**Goal**
Judge the UX quality of failure handling and whether a parent can recover without confusion.

**Context to send**
- Exercise the same failure cases, but focus on user experience:
  - Is the error visible?
  - Is recovery obvious?
  - Does the form preserve useful state after failure?
  - Does pull-to-refresh or retry actually help?
  - Does any screen become silently stale?
- Output: `docs/qa/final-product/phase-5/kimi.md`

**Suggested toolsets**
- `browser`, `terminal`, `file`, `vision`

### Task: Controller
**Goal**
Merge failure handling results into a graceful-degradation verdict.

**Context to send**
- Separate failures into: handled well, handled poorly, silently broken, blocked by missing instrumentation.
- Output: `docs/qa/final-product/phase-5/verdict.md`

---

## Phase 6 — Data Integrity & Security Validation

### Task: MiniMax-M2.7
**Goal**
Audit data boundaries, refetch discipline, audit trails, and notification/state correctness.

**Context to send**
- Audit:
  - RLS assumptions and boundaries
  - soft-delete defense-in-depth (`deleted_at IS NULL`)
  - mutation → refetch discipline
  - no client service-role usage
  - no leaked keys
  - AI `based_on` audit trail
  - notification ID consistency
  - stale Zustand closure risks in listeners
- Specifically verify baseline finding M-09 in `lib/api.ts` and notification routing gap C-05 in `app/_layout.tsx`.
- Output: `docs/qa/final-product/phase-6/minimax.md`

**Suggested toolsets**
- `terminal`, `file`

### Task: Kimi-K2.6
**Goal**
Runtime-verify that persisted data, child scoping, and post-write UI state behave correctly.

**Context to send**
- Check that updated data visibly reflects persisted state.
- Switch between children and verify scoping across Dashboard, Log, History, AI, and Settings.
- Verify deleted or soft-deleted child data does not leak back into UI.
- Verify notification taps target the correct child and screen when implemented.
- Output: `docs/qa/final-product/phase-6/kimi.md`

**Suggested toolsets**
- `browser`, `terminal`, `file`

### Task: Controller
**Goal**
Produce the integrity verdict and release-gate decision for data correctness.

**Context to send**
- Merge static and runtime integrity findings.
- Any auth boundary issue, soft-delete leak, post-write stale UI, or missing AI audit trail is release-blocking.
- Output: `docs/qa/final-product/phase-6/verdict.md`

---

## Phase 7 — Performance & Bloat Audit

### Task: MiniMax-M2.7
**Goal**
Identify codebase bloat, dead code, banned dependencies, and cleanup items that are serious enough to block release.

**Context to send**
- Audit for:
  - unused dependencies
  - dead files/components/hooks/styles/constants
  - TODO/FIXME/stub leftovers
  - debug logs and stray console calls
  - duplicate UI implementations
  - banned packages
  - abandoned/generated leftovers
- Confirm `Alert.alert` stays at zero and production console leaks are removed.
- Output: `docs/qa/final-product/phase-7/minimax.md`

**Suggested toolsets**
- `terminal`, `file`

### Task: Kimi-K2.6
**Goal**
Audit perceived performance and user-facing responsiveness in core flows.

**Context to send**
- Evaluate:
  - dashboard responsiveness
  - tab-switch latency
  - modal open/close responsiveness
  - pull-to-refresh smoothness
  - History chart rendering behavior
  - schedule/log flow responsiveness
- Focus on perceived jank, hesitation, and awkward refresh behavior.
- Output: `docs/qa/final-product/phase-7/kimi.md`

**Suggested toolsets**
- `browser`, `terminal`, `file`, `vision`

### Task: Controller
**Goal**
Merge bloat and performance findings into a surgical cleanup verdict.

**Context to send**
- Keep recommendations narrow. No speculative refactors.
- Output: `docs/qa/final-product/phase-7/verdict.md`

---

## Phase 8 — Release Candidate Validation

### Task: MiniMax-M2.7
**Goal**
Validate technical release readiness for the actual ship candidate.

**Context to send**
- Check:
  - TypeScript health
  - Expo health / doctor status
  - environment config sanity
  - DB migration readiness/application state
  - notification configuration sanity
  - release-only risk checklist
- Respect Expo SDK 52 constraints; do not introduce `@expo/dom-webview`.
- Output: `docs/qa/final-product/phase-8/minimax.md`

**Suggested toolsets**
- `terminal`, `file`

### Task: Kimi-K2.6
**Goal**
Smoke-test the release candidate in fresh-install conditions.

**Context to send**
- Validate:
  - fresh install
  - reinstall / relaunch
  - first-run permissions
  - notification behavior after reinstall
  - core flow smoke in release-like conditions
- Focus on what a parent would encounter on first use.
- Output: `docs/qa/final-product/phase-8/kimi.md`

**Suggested toolsets**
- `browser`, `terminal`, `file`, `vision`

### Task: Controller
**Goal**
Merge technical and product smoke signals into a release-candidate verdict.

**Context to send**
- Separate: ready, ready with targeted fixes, not ready.
- Output: `docs/qa/final-product/phase-8/verdict.md`

---

## Phase 9 — Final Sign-Off Gate

### Task: MiniMax-M2.7
**Goal**
Independently score release readiness from a compliance perspective.

**Context to send**
- Score 0–10 for: runtime stability, HCI correctness, data integrity, platform parity, bloat status, ship confidence.
- Fail closed if any critical/high issue remains unresolved.
- Output: `docs/qa/final-product/phase-9/minimax.md`

**Suggested toolsets**
- `terminal`, `file`

### Task: Kimi-K2.6
**Goal**
Independently score release readiness from a product experience perspective.

**Context to send**
- Score 0–10 for: user trust, clarity, flow smoothness, perceived quality, recovery from failure, ship confidence.
- Fail closed if any core parent flow feels unreliable or confusing.
- Output: `docs/qa/final-product/phase-9/kimi.md`

**Suggested toolsets**
- `browser`, `terminal`, `file`, `vision`

### Task: Controller
**Goal**
Produce final release sign-off.

**Context to send**
- Merge both phase-9 scores and all previous verdicts into `docs/qa/final-product/RELEASE_SIGNOFF.md`.
- Release passes only if all hard ship-gate conditions are satisfied.

---

## Immediate recommended dispatch order
1. Re-verify whether `QA_BASELINE.md` Critical and High findings are still open.
2. If any Critical/High remains, stop certification and return a blocker list.
3. If clean, run phases in this order:
   - Phase 3 and Phase 4 first
   - Phase 5 next
   - Phase 6 next
   - Phase 7 and Phase 8 next
   - Phase 9 last
4. After each phase:
   - merge verdict
   - batch fixes by severity
   - re-test impacted paths and adjacent regressions only

## Minimal controller dispatch template
```text
Run two parallel QA agents against Smart Parenting App.
- Repo: ~/local-projects/smart-parenting-app
- Baseline: QA_BASELINE.md
- Use the role split defined in docs/qa/final-product/AGENT_TASKS.md
- Require separate outputs for MiniMax and Kimi, then a merged verdict.
- Fail closed on evidence.
- Do not let either model self-verify its own fix.
```
