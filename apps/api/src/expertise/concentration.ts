/**
 * Effective expert count, per spec section 12, as the inverse of the Herfindahl
 * index over normalized expertise shares:
 *
 *   p_i = expertise_i / totalExpertise
 *   HHI = sum(p_i^2)
 *   effectiveExpertCount = 1 / HHI
 *
 * One person holding all the knowledge gives 1.0, two people with equal shares
 * give 2.0, and N people with equal shares give N. It answers "how many real
 * holders are there", which a plain headcount of anyone with evidence cannot.
 *
 * This file is framework-independent.
 */

/**
 * The Herfindahl index, in (0, 1]. Callers pass unrounded scores, so display
 * rounding can never shift the concentration of a knowledge area.
 */
export function herfindahlIndex(scores: readonly number[]): number {
  const total = scores.reduce((sum, score) => sum + score, 0);

  if (total <= 0) {
    return 0;
  }

  return scores.reduce((sum, score) => sum + (score / total) ** 2, 0);
}

/**
 * Effective expert count, from 0 upward. Returns 0 when there is no expertise
 * at all, 1 for a single holder, and approaches the holder count as shares
 * become even.
 */
export function effectiveExpertCount(scores: readonly number[]): number {
  const hhi = herfindahlIndex(scores);

  return hhi === 0 ? 0 : 1 / hhi;
}
