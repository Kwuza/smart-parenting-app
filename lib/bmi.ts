/**
 * WHO BMI-for-age percentile calculator for children 2-5 years.
 *
 * For children, raw BMI is meaningless — pediatricians use BMI-for-age
 * percentiles based on WHO growth charts. This module:
 * 1. Calculates raw BMI = weight(kg) / height(m)²
 * 2. Converts to BMI-for-age z-score using WHO LMS parameters
 * 3. Maps z-score to percentile + category
 *
 * WHO reference: https://www.who.int/tools/growth-reference-5-19
 */

// WHO LMS parameters for BMI-for-age (boys, 24-60 months)
// Source: WHO Child Growth Standards, LMS method
// Format: { ageMonths: { L, M, S } } — L=Box-Cox, M=Median, S=Coefficient of variation
const WHO_BMI_LMS_BOYS: Record<number, { L: number; M: number; S: number }> = {
  24: { L: -0.1581, M: 16.4397, S: 0.08305 },
  25: { L: -0.1712, M: 16.3824, S: 0.08318 },
  26: { L: -0.1837, M: 16.3275, S: 0.08333 },
  27: { L: -0.1955, M: 16.2752, S: 0.08348 },
  28: { L: -0.2067, M: 16.2256, S: 0.08364 },
  29: { L: -0.2174, M: 16.1788, S: 0.08380 },
  30: { L: -0.2276, M: 16.1348, S: 0.08397 },
  31: { L: -0.2373, M: 16.0937, S: 0.08414 },
  32: { L: -0.2464, M: 16.0555, S: 0.08432 },
  33: { L: -0.2551, M: 16.0202, S: 0.08450 },
  34: { L: -0.2633, M: 15.9877, S: 0.08469 },
  35: { L: -0.2711, M: 15.9581, S: 0.08488 },
  36: { L: -0.2784, M: 15.9313, S: 0.08507 },
  37: { L: -0.2853, M: 15.9072, S: 0.08526 },
  38: { L: -0.2918, M: 15.8858, S: 0.08546 },
  39: { L: -0.2979, M: 15.8671, S: 0.08566 },
  40: { L: -0.3036, M: 15.8509, S: 0.08586 },
  41: { L: -0.3090, M: 15.8373, S: 0.08606 },
  42: { L: -0.3140, M: 15.8262, S: 0.08627 },
  43: { L: -0.3187, M: 15.8176, S: 0.08647 },
  44: { L: -0.3230, M: 15.8113, S: 0.08668 },
  45: { L: -0.3271, M: 15.8074, S: 0.08689 },
  46: { L: -0.3308, M: 15.8058, S: 0.08710 },
  47: { L: -0.3343, M: 15.8065, S: 0.08731 },
  48: { L: -0.3375, M: 15.8093, S: 0.08752 },
  49: { L: -0.3405, M: 15.8143, S: 0.08773 },
  50: { L: -0.3432, M: 15.8214, S: 0.08794 },
  51: { L: -0.3457, M: 15.8305, S: 0.08815 },
  52: { L: -0.3480, M: 15.8417, S: 0.08837 },
  53: { L: -0.3501, M: 15.8548, S: 0.08858 },
  54: { L: -0.3519, M: 15.8698, S: 0.08879 },
  55: { L: -0.3536, M: 15.8867, S: 0.08901 },
  56: { L: -0.3551, M: 15.9054, S: 0.08922 },
  57: { L: -0.3564, M: 15.9259, S: 0.08944 },
  58: { L: -0.3576, M: 15.9481, S: 0.08965 },
  59: { L: -0.3586, M: 15.9720, S: 0.08987 },
  60: { L: -0.3594, M: 15.9976, S: 0.09008 },
};

// WHO LMS parameters for BMI-for-age (girls, 24-60 months)
const WHO_BMI_LMS_GIRLS: Record<number, { L: number; M: number; S: number }> = {
  24: { L: -0.0349, M: 16.0696, S: 0.08561 },
  25: { L: -0.0543, M: 16.0086, S: 0.08578 },
  26: { L: -0.0728, M: 15.9504, S: 0.08597 },
  27: { L: -0.0905, M: 15.8951, S: 0.08616 },
  28: { L: -0.1073, M: 15.8428, S: 0.08636 },
  29: { L: -0.1233, M: 15.7935, S: 0.08657 },
  30: { L: -0.1385, M: 15.7473, S: 0.08678 },
  31: { L: -0.1529, M: 15.7041, S: 0.08700 },
  32: { L: -0.1665, M: 15.6640, S: 0.08722 },
  33: { L: -0.1794, M: 15.6269, S: 0.08744 },
  34: { L: -0.1916, M: 15.5928, S: 0.08767 },
  35: { L: -0.2031, M: 15.5617, S: 0.08790 },
  36: { L: -0.2139, M: 15.5336, S: 0.08813 },
  37: { L: -0.2241, M: 15.5084, S: 0.08837 },
  38: { L: -0.2337, M: 15.4861, S: 0.08860 },
  39: { L: -0.2427, M: 15.4666, S: 0.08884 },
  40: { L: -0.2512, M: 15.4499, S: 0.08908 },
  41: { L: -0.2591, M: 15.4360, S: 0.08932 },
  42: { L: -0.2665, M: 15.4248, S: 0.08956 },
  43: { L: -0.2734, M: 15.4162, S: 0.08980 },
  44: { L: -0.2799, M: 15.4103, S: 0.09005 },
  45: { L: -0.2859, M: 15.4069, S: 0.09029 },
  46: { L: -0.2915, M: 15.4060, S: 0.09053 },
  47: { L: -0.2967, M: 15.4076, S: 0.09078 },
  48: { L: -0.3015, M: 15.4116, S: 0.09102 },
  49: { L: -0.3059, M: 15.4180, S: 0.09127 },
  50: { L: -0.3100, M: 15.4268, S: 0.09151 },
  51: { L: -0.3137, M: 15.4379, S: 0.09176 },
  52: { L: -0.3171, M: 15.4513, S: 0.09200 },
  53: { L: -0.3202, M: 15.4669, S: 0.09225 },
  54: { L: -0.3230, M: 15.4848, S: 0.09249 },
  55: { L: -0.3255, M: 15.5049, S: 0.09274 },
  56: { L: -0.3278, M: 15.5272, S: 0.09298 },
  57: { L: -0.3298, M: 15.5516, S: 0.09323 },
  58: { L: -0.3316, M: 15.5781, S: 0.09347 },
  59: { L: -0.3331, M: 15.6066, S: 0.09371 },
  60: { L: -0.3344, M: 15.6371, S: 0.09396 },
};

export interface BmiResult {
  bmi: number;
  zScore: number;
  percentile: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese';
  label: string;
  ageMonths: number;
}

/**
 * Calculate raw BMI from height (cm) and weight (kg).
 */
export function calculateBmi(heightCm: number, weightKg: number): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Calculate BMI-for-age z-score using WHO LMS method.
 * For ages 24-60 months (2-5 years).
 *
 * z = ((BMI/M)^L - 1) / (L * S)
 */
function calculateZScore(bmi: number, ageMonths: number, gender: 'male' | 'female'): number | null {
  // Clamp age to supported range
  const clampedAge = Math.max(24, Math.min(60, Math.round(ageMonths)));
  const lmsTable = gender === 'male' ? WHO_BMI_LMS_BOYS : WHO_BMI_LMS_GIRLS;
  const lms = lmsTable[clampedAge];
  if (!lms) return null;

  const { L, M, S } = lms;
  return (Math.pow(bmi / M, L) - 1) / (L * S);
}

/**
 * Convert z-score to percentile using approximation of normal CDF.
 */
function zScoreToPercentile(z: number): number {
  // Approximation of the normal CDF (Abramowitz and Stegun)
  if (z < -6) return 0.01;
  if (z > 6) return 99.99;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);
  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);

  const percentile = 50 * (1 + sign * y);
  return Math.round(percentile * 10) / 10;
}

/**
 * Get BMI category from percentile (WHO/CDC thresholds for children).
 */
function getCategory(percentile: number): BmiResult['category'] {
  if (percentile < 5) return 'underweight';
  if (percentile < 85) return 'normal';
  if (percentile < 95) return 'overweight';
  return 'obese';
}

/**
 * Get human-readable label from category.
 */
function getCategoryLabel(category: BmiResult['category']): string {
  switch (category) {
    case 'underweight': return 'Underweight — consult pediatrician';
    case 'normal': return 'Healthy weight';
    case 'overweight': return 'Overweight — monitor diet/activity';
    case 'obese': return 'Obese — consult pediatrician';
  }
}

/**
 * Full BMI assessment for a child 2-5 years old.
 * Returns null if age is outside WHO reference range (<24 or >60 months).
 */
export function assessBmi(
  heightCm: number,
  weightKg: number,
  ageMonths: number,
  gender: 'male' | 'female'
): BmiResult | null {
  if (ageMonths < 24 || ageMonths > 60) return null;

  const bmi = calculateBmi(heightCm, weightKg);
  if (bmi === null) return null;

  const zScore = calculateZScore(bmi, ageMonths, gender);
  if (zScore === null) return null;

  const percentile = zScoreToPercentile(zScore);
  const category = getCategory(percentile);
  const label = getCategoryLabel(category);

  return { bmi, zScore: Math.round(zScore * 100) / 100, percentile, category, label, ageMonths };
}
