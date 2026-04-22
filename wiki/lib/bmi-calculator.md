---
id: bmi-calculator-001
type: concept
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - lib/bmi.ts
confidence: high
status: active
tags:
  - lib
  - bmi
  - smart-parenting-app
  - health
related:
  - components/routine-wizard
  - database/table-children
---
# BMI Calculator — lib/bmi.ts

**File:** `lib/bmi.ts` (201 lines)
**Purpose:** WHO BMI-for-age percentile calculation for children 24–60 months (2–5 years) using LMS method.

---

## Public API

```typescript
export function calculateBmi(heightCm: number, weightKg: number): number
export function assessBmi(
  heightCm: number,
  weightKg: number,
  ageMonths: number,
  gender: 'male' | 'female'
): BmiAssessment | null
```

**Return type (`BmiAssessment`):**
```typescript
{
  bmi: number,           // raw BMI = weight / (height/100)^2
  zScore: number,        // LMS-transformed z-score
  percentile: number,    // 0–100
  category: 'underweight' | 'normal' | 'overweight' | 'obese',
  label: string          // e.g. "68th percentile (normal)"
}
```

Returns `null` if `ageMonths < 24 || ageMonths > 60` (outside WHO table range).

---

## Method: LMS

LMS = Lambda (skew), Mu (median), Sigma (variation). WHO provides separate L, M, S tables per month (24–60) per gender.

**Z-score formula:**
```
z = ((BMI / M)^L - 1) / (L * S)
```

**Percentile:** Abramowitz-Stegun approximation for standard normal CDF from z-score.

**Data source:** Hardcoded LMS tables in `lib/bmi.ts` — copied from WHO 2006 growth standards.

---

## Categories (CDC/WHO cutoffs)

| Percentile | Category |
|------------|----------|
| < 5th      | underweight |
| 5th – 85th | normal |
| 85th – 95th | overweight |
| ≥ 95th     | obese |

---

## Usage in App

1. **Routine wizard Step 4:** live preview as parent types height/weight
   ```typescript
   const assessment = assessBmi(height, weight, ageMonths, gender)
   // displays: "BMI: 16.2 (68th percentile, normal)"
   ```
2. **History screen (future):** may display BMI trend card
3. **AI prompt (future):** could include BMI category in health summary

---

## Edge Cases Handled

- **Age outside 24–60 months:** returns `null` — app shows "BMI unavailable for age"
- **Zero/negative inputs:** validation layer (zod) catches before calling `calculateBmi`
- **Extreme BMI:** z-score outside -3 to +3 maps to <0.13th or >99.87th percentile clamp

---

## Precision & Rounding

- Raw BMI: 2 decimal places (16.24)
- Percentile: integer (68%)
- Categories match WHO definitions exactly

---

## Extensibility

If app expands to older children (5–19 years), need separate CDC 2000 LMS tables (different age buckets). Current tables are hardcoded; future could inline from JSON lookup.

---

## Testing

Manual test vectors exist (not automated):
- Height 95cm, weight 14kg, age 36 months, male → BMI 15.5, ~50th percentile
- Height 105cm, weight 20kg, age 48 months, female → BMI 18.1, ~85th percentile boundary
- Height 90cm, weight 13kg, age 30 months, male → BMI 16.0, ~68th percentile

No unit tests in repo yet.

---

## Related
- [[components/routine-wizard]] — live preview caller
- [[database/table-children]] — height/weight/gender storage columns
- [[lib/api#updateChild]] — persists bmi column though not currently used server-side
