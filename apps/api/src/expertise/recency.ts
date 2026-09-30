/**
 * Recency decay for evidence, per spec section 11.
 *
 * The spec offers a per-area exponential, `e^(-decayRate * ageInYears)`, and a
 * simpler band table. This module uses the band table, blended with the
 * knowledge area decay rate:
 *
 *   multiplier = 1 - (1 - band(age)) * min(1, decayRate * DECAY_SENSITIVITY)
 *
 * The exponential was implemented first and rejected during calibration.
 * Seeded decay rates sit between 0.02 and 0.06, so evidence 800 days old lost
 * only about 4% of its weight under a per-year exponential, and the aged
 * knowledge scenario scored as high as the healthy one. That defeats the
 * purpose of the scenario. The bands are what separate aged evidence, and
 * blending the decay rate keeps the stored per-area field meaningful.
 *
 * This file is framework-independent.
 */
import { DECAY_SENSITIVITY, RECENCY_BANDS } from "./expertise.config";

/** Whole days between two instants, floored so same-day evidence is age 0. */
export function ageInDays(occurredAt: Date, asOf: Date): number {
  const elapsed = asOf.getTime() - occurredAt.getTime();

  return elapsed <= 0 ? 0 : Math.floor(elapsed / 86_400_000);
}

/**
 * True when the evidence is dated on or before the reference date. Evidence
 * after `asOf` is excluded from scoring rather than clamped to age zero, so
 * backdating a reference date cannot invent expertise from future records.
 */
export function isOnOrBefore(occurredAt: Date, asOf: Date): boolean {
  return occurredAt.getTime() <= asOf.getTime();
}

/** The unmodified band multiplier for an age in days. */
export function bandMultiplier(ageDays: number): number {
  const band = RECENCY_BANDS.find(({ maxAgeDays }) => ageDays <= maxAgeDays);

  return band?.multiplier ?? RECENCY_BANDS.at(-1)!.multiplier;
}

/**
 * Recency multiplier in (0, 1]. Same-day evidence returns exactly 1, and the
 * result never reaches 0, so very old evidence still counts for something.
 * A decay rate of 0 disables aging entirely.
 */
export function recencyMultiplier(
  occurredAt: Date,
  asOf: Date,
  decayRate: number,
): number {
  if (decayRate <= 0) {
    return 1;
  }

  const band = bandMultiplier(ageInDays(occurredAt, asOf));
  const severity = Math.min(1, decayRate * DECAY_SENSITIVITY);

  return 1 - (1 - band) * severity;
}
