---
id: settings-screen-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/(tabs)/profile.tsx
  - components/settings-section.tsx
confidence: high
status: active
tags:
  - component
  - screen
  - settings
  - smart-parenting-app
  - hci
related:
  - components/child-card
  - lib/api#updateChild
  - app/child/new-screen
---
# Screen: Settings (app/(tabs)/profile.tsx)

**Path:** `app/(tabs)/profile.tsx`
**Lines:** ~765
**Purpose:** Account management + child profile editing + notification preferences.

---

## Layout

```
[Header: "Settings" + optional avatar]

[Account Section]
  ┌─────────────────────────────┐
  │ Name: Alex Parent           │
  │ Email: alex@example.com     │
  │ [Sign Out] (red)            │
  └─────────────────────────────┘

[Children Section]
  ┌─────────────────────────────┐
  │ 👦 Alex Jr. (3 yrs)         │ ← ChildCard tappable → opens per-child modal
  │ 👶 Sam (1 yr)               │
  │ [+ Add Child]                 │
  └─────────────────────────────┘

[Notifications Section]
  ┌─────────────────────────────┐
  │ Routine Reminders           │ [Switch ON]
  │ Daily Summary               │ [Switch OFF]
  │ AI Insights Alerts          │ [Switch ON]
  └─────────────────────────────┘

[Privacy & Security Section]
  Show: Data Usage Policy
  Show: Delete Account (disabled in v1)

[Support Section]
  Help Center → (link placeholder)
  Version: 1.2.0 (123)
```

---

## Section Components

Settings screen decomposes into reusable `Section` and `Item` components:

```tsx
<Section title="Children">
  {children.map(child => (
    <ChildCard key={child.id} child={child} onPress={() => openChildModal(child)} />
  ))}
  <AddChildCard onPress={router.push('/child/new')} />
</Section>
```

---

## Sign-Out Flow

1. Tap "Sign Out"
2. Modal confirmation (coral "Sign Out" button on red bg, gray "Cancel")
3. Dismissible on background tap
4. Confirm → `stores/auth.signOut()` clears session in Supabase + AsyncStorage
5. Navigate to `(auth)/login` with `replace: true`

**Animation:** Goodbye fade-out (login screen uses welcome fade-in on reverse).

---

## Child Management Modal

**Header:** "Child Settings" + child avatar/name
**Body:**
- Editable fields: name, date_of_birth, gender (if needed), photo avatar picker
- Routine schedule section (6 TIME inputs)
- Limits section: screen time cap (dropdown: 30m/1h/1.5h/2h/3h/none), sleep min (8h/9h/10h/11h/12h/none)
- Physical: height (cm), weight (kg) — triggers BMI recalc

**Save:** "Save Changes" (coral) — calls `api.updateChild(childId, updates)`
**Cancel:** "Cancel" (gray) — dismisses modal

**Delete child:** swipe-to-delete or trash icon? Currently no soft-delete button in UI (must be admin-only?); app uses soft-delete via `deleted_at` on backend; frontend not implemented.

---

## Notification Toggles

Stored in `AsyncStorage` key `notification_prefs` as JSON:

```json
{
  "routine_reminders": true,
  "daily_summary": false,
  "ai_insights": true
}
```

**Effect:**
- `routine_reminders` → passed to `scheduleChildNotifications(child)` when child created/updated
- `daily_summary` → unused (future: daily digest at 8PM)
- `ai_insights` → unused (future: push notification when new AI batch ready)

Toggle changes call `AsyncStorage.setItem()` immediately; no API needed.

---

## Per-Child Settings Modal (Connection)

Tapping a ChildCard opens the same modal used during `app/child/routine.tsx` Step 4 (physical + limits). This ensures form reuse.

**When saved:**
- Children table updated via `api.updateChild()`
- If routine changed → reschedules notifications via `notifications.cancelChildNotifications(childId)` then `scheduleChildNotifications(updatedChild)`
- If limits changed → no backend effect yet (frontend only; enforcement checks limits on Log screen but limits not server-validated)

---

## Version Info

Static string read from `app.json` → `expoConstants.nativeAppVersion`. Display only; no update check.

---

## Privacy & Security

- "Data Usage Policy" → modal explaining data never sold, child data encrypted at rest (Supabase), AI runs on third-party OpenRouter (data leaves server)
- "Delete Account" disabled — future: cascade delete all children + activities via service_role admin call

---

## Related
- [[stores/auth]] — sign-out logic
- [[lib/api#updateChild]] — saves child edits
- [[lib/notifications-scheduler]] — called when routine changes
- [[app/child/new-screen]] — similar form (create vs edit)
- [[components/child-card]] — child selector card UI
- [[config/app-json]] — version string source
