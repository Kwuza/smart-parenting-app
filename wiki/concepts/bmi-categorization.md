---
id: bmi-categorization-001
type: concept
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - lib/bmi.ts
  - components/routine-wizard.tsx
confidence: high
status: active
tags:
  - bmi
  - health
  - smart-parenting-app
  - pediatric
related:
  - lib/bmi-calculator
  - components/routine-wizard
  - database/table-children
---
# BMI Categorization — WHO Percentiles (Ages 2–5)

**Source:** WHO Child Growth Standards (2006)
**Method:** LMS (Lambda-Mu-Sigma) transformation
**Range:** 24–60 months (2–5 years)
**Gender:** Separate tables for male/female

---

## Categories

| Percentile Range | Category | Clinical Interpretation |
|------------------|----------|-------------------------|
| < 5th | underweight | Possible undernutrition |
| 5th – 85th | normal | Healthy weight |
| 85th – 95th | overweight | Above optimal, monitor |
| ≥ 95th | obese | High risk, consult pediatrician |

**Label format:** `"68th percentile (normal)"`

---

## Calculation Pipeline

```
raw BMI = weight (kg) / (height (m))^2
z = ((BMI / M)^L - 1) / (L * S)   // L,M,S per month from WHO table
percentile = normal_cdf(z) * 100    // Abramowitz-Stegun approximation
```

**Output:** `{ bmi: number, zScore: number, percentile: number, category: string, label: string }`

---

## Age Bounds

- **Minimum:** 24 months (2 years) — WHO table starts at 24 mo
- **Maximum:** 60 months (5 years) — table ends at 60 mo

Outside: `null` returned, app displays "BMI unavailable for age".

---

## Input Validation (Frontend)

Height: 50–150 cm (reasonable toddler range)
Weight: 5–50 kg
Both numeric only, no negative numbers.

---

## Data Storage

`children` table columns (nullable):
- `height_cm`
- `weight_kg`
- `bmi` (currently NOT used; computed only client-side)

**Potential DB enhancement:** Computed `bmi` generated column (STORED) to avoid repeated client computation. Not needed for scale.

---

## Clinical Disclaimer (Future)

App should display: "BMI percentile is for informational purposes only. Consult a pediatrician for clinical assessment." — not yet added to UI.

---

## Related
- [[lib/bmi-calculator]] — implementation
- [[components/routine-wizard]] — Step 4 where BMI assessed
- [[database/table-children]] — where height/weight stored
