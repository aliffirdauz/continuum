/**
 * Tunable constants for the expertise engine. They live here, apart from the
 * formulas, so calibration never means editing a formula.
 *
 * This file is framework-independent.
 */

/**
 * Evidence types needed for the full diversity bonus, per spec section 9.
 */
export const DIVERSITY_SATURATION_TYPES = 5;

/**
 * Diversity and volume both scale the weighted base score between these bounds,
 * so having more evidence of more kinds always helps but never by an unbounded
 * amount.
 */
export const DIVERSITY_FLOOR = 0.7;
export const DIVERSITY_RANGE = 0.3;

/**
 * Recency bands from spec section 11, as the multiplier applied at the top of
 * each band. Band boundaries are inclusive at the maximum age.
 */
export const RECENCY_BANDS: ReadonlyArray<{
  maxAgeDays: number;
  multiplier: number;
}> = [
  { maxAgeDays: 90, multiplier: 1.0 },
  { maxAgeDays: 180, multiplier: 0.9 },
  { maxAgeDays: 365, multiplier: 0.75 },
  { maxAgeDays: 730, multiplier: 0.55 },
  { maxAgeDays: Number.POSITIVE_INFINITY, multiplier: 0.35 },
];

/**
 * How strongly a knowledge area's decay rate modulates the band table.
 *
 * Seeded rates sit between 0.02 and 0.06, so this maps the whole seeded range
 * onto a meaningful 0 to 1 blend: a rate of 0.05 or more applies the full band
 * penalty, and a rate of 0 disables aging. The stored value is a severity
 * rating rather than a per-year rate, which is exactly why it needs scaling
 * before it can modulate a band multiplier.
 */
export const DECAY_SENSITIVITY = 20;

/**
 * Calibration constant for the linear score scale.
 *
 * Derived by scoring all four seeded scenarios. With K = 12, scenario A scores
 * Budi 94, Andri 19, and the two weak contributors under 3; scenario C holds
 * Kevin, Raka, and Dina within 3 points of each other; and scenario D scores
 * lowest of the four, which is the outcome that scenario exists to demonstrate.
 * No seeded value approaches the 100 ceiling.
 *
 * One global K is deliberate. A per-area K would make scores incomparable across
 * knowledge areas, which is the one thing this metric must not do.
 */
export const SCORE_SCALE = 12;

/**
 * Confidence thresholds, as a summary of evidence quality rather than a
 * probability. See spec section 20.
 */
export const HIGH_CONFIDENCE_MIN_EVIDENCE = 5;
export const HIGH_CONFIDENCE_MAX_AGE_DAYS = 180;
export const HIGH_CONFIDENCE_MIN_TYPES = 3;

export const MEDIUM_CONFIDENCE_MIN_EVIDENCE = 2;
export const MEDIUM_CONFIDENCE_MAX_AGE_DAYS = 365;
export const MEDIUM_CONFIDENCE_MIN_TYPES = 2;
