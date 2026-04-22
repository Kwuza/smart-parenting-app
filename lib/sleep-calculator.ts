/**
 * Sleep Requirements Calculator — age-based recommendations.
 * Source: CDC/AAP guidelines for toddlers (2-5 years).
 */

export interface SleepRecommendation {
  minHours: number;
  maxHours: number;
  label: string; // e.g. "11-13 hours"
}

/**
 * Get recommended sleep range for a child given age in full years.
 *
 * Age bounds:
 * - 2-3 years: 11-13 hours (including naps)
 * - 4-5 years: 10-12 hours
 *
 * Returns null for ages outside 2-5 (applies to toddler routine requirement).
 */
export function getSleepRecommendation(ageYears: number): SleepRecommendation | null {
  if (ageYears < 2 || ageYears > 5) return null;

  if (ageYears <= 3) {
    // 2-3 years
    return { minHours: 11, maxHours: 13, label: '11-13 hours' };
  } else {
    // 4-5 years
    return { minHours: 10, maxHours: 12, label: '10-12 hours' };
  }
}

/**
 * Convert hours + minutes into total minutes.
 */
export function toMinutes(hours: number, mins: number): number {
  return hours * 60 + mins;
}
