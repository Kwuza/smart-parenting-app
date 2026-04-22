---
id: add-child-screen-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app/child/new.tsx (deprecated)
  - app/child/wizard.tsx (current)
confidence: high
status: deprecated
tags:
  - component
  - screen
  - smart-parenting-app
  - hci
  - deprecated
related:
  - components/5step-add-child-wizard
  - lib/api#createChild
  - database/table-children
---
# Screen: Add Child (DEPRECATED — use 5-Step Wizard)

**Old Path:** `app/child/new.tsx` (archived)  
**New Path:** `app/child/wizard.tsx`

**Status:** ⚠️ Deprecated. Replaced by unified 5-step wizard (`components/5step-add-child-wizard`). This two-screen flow (new + routine) has been superseded.

---

## Flow

1. **Form page only** — initial fields:
   - Name (text, required, min 2 chars)
   - Date of Birth (date picker, required; must be past date, not future)
   - Photo (optional) — opens image picker, crops to square, preview

2. **Submit** → `api.createChild({ name, date_of_birth, photo_url })`
   - Success: navigates to `app/child/routine.tsx` (routine wizard) with `childId` param
   - Error: inline banner

3. **Routine wizard** (separate screen, see `components/routine-wizard`) completes rest of child setup (routine times, gender/height/weight/BMI).

---

## Validation

```typescript
const schema = z.object({
  name: z.string().min(2).max(50),
  dateOfBirth: z.date().max(new Date()),  // not in future
  photo: z.any().optional(),
})
```

**Inline errors:** below each field, not using Alert.

---

## Photo Upload

Uses `expo-image-picker`:
- `launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1,1] })`
- Result → local URI → not uploaded yet; stored in AsyncStorage temporarily
- Actual upload to Supabase Storage (bucket `child-photos`) happens post-create via `api.uploadChildPhoto(childId, uri)` — might be separate step

**Storage path pattern:** `child-photos/{childId}.jpg`

---

## Post-Create Auto-Select

On success, also calls `setSelectedChildId(newChild.id)` globally and navigates to routine wizard. Ensures child picker state is immediately correct.

---

## Keyboard Handling Fix (2026-04-16)

Original issue: after entering name, keyboard stayed open during `router.replace()` causing `KeyboardAvoidingView` oscillation and view bounce.
**Fix:** call `Keyboard.dismiss()` before `router.replace()` in submit handler.

---

## Relation to Routine Wizard

Divorced for progressive disclosure:
1. Add child: minimal required fields (identity)
2. Routine: non-essential schedule (can skip)

If parent abandons after Step 1, child exists but with NULL routine columns — valid state.

---

## Duplicate Prevention

No duplicate detection by name. Could add `UNIQUE(parent_id, name)` constraint at DB level (currently not present). Not needed for current scale.

---

## Related
- [[lib/api#createChild]] — backend API call
- [[components/routine-wizard]] — Step 2 completion
- [[stores/auth]] — sets `selectedChildId` after success
- [[database/table-children]] — destination table
- [[app/child/routine]] — redirect destination
