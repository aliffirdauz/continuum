/**
 * Expertise scoring, per spec sections 9 and 10:
 *
 *   baseScore        = sum(weight * strength * recencyMultiplier)
 *   diversityBonus   = min(uniqueEvidenceTypes / 5, 1)
 *   expertiseScore   = min(100, baseScore * (0.7 + 0.3 * diversityBonus) * K)
 *
 * The linear scale is deliberate. A saturating curve would compress the top of
 * the range, but explainability requires that each evidence record's
 * contribution stays visible, which a curve obscures.
 *
 * This file is framework-independent.
 */
import {
  DIVERSITY_FLOOR,
  DIVERSITY_RANGE,
  DIVERSITY_SATURATION_TYPES,
  SCORE_SCALE,
} from "./expertise.config";
import { isOnOrBefore, recencyMultiplier } from "./recency";
import {
  DEFAULT_EVIDENCE_WEIGHTS,
  weightFor,
  type EvidenceWeights,
} from "./weights";

/** The minimum evidence an employee needs to carry a positive score. */
const MIN_STRENGTH = 0.01;

export interface ScoredEvidence {
  id?: string;
  title?: string;
  type: string;
  strength: number;
  occurredAt: Date;
}

export interface ScoringOptions {
  asOf: Date;
  knowledgeDecayRate: number;
  weights?: EvidenceWeights;
  scale?: number;
}

export interface EvidenceContribution {
  id: string;
  title?: string;
  type: string;
  strength: number;
  occurredAt: Date;
  weight: number;
  recencyMultiplier: number;
  contribution: number;
}

export interface ExpertiseScore {
  /** Rounded 0 to 100, for display. */
  expertiseScore: number;
  /**
   * The same score before rounding and before the ceiling. Concentration must
   * use this, so display rounding can never change a distribution.
   */
  rawScore: number;
  baseScore: number;
  diversityBonus: number;
  evidenceCount: number;
  uniqueTypeCount: number;
  lastEvidenceAt: Date | null;
  contributions: EvidenceContribution[];
}

/** Volume and diversity scale the base score between the floor and 1. */
export function diversityBonus(uniqueTypeCount: number): number {
  return Math.min(uniqueTypeCount / DIVERSITY_SATURATION_TYPES, 1);
}

export function diversityFactor(uniqueTypeCount: number): number {
  return DIVERSITY_FLOOR + DIVERSITY_RANGE * diversityBonus(uniqueTypeCount);
}

/** Maps a raw score onto the 0 to 100 display scale. */
export function normalize(rawScore: number, scale = SCORE_SCALE): number {
  if (rawScore <= 0) {
    return 0;
  }

  return Math.min(100, rawScore * scale);
}

/**
 * Scores one employee against one knowledge area. Evidence dated after `asOf`
 * is dropped before anything else happens, so the result depends only on the
 * reference date and the records that existed on it.
 */
export function scoreExpertise(
  evidence: readonly ScoredEvidence[],
  {
    asOf,
    knowledgeDecayRate,
    weights = DEFAULT_EVIDENCE_WEIGHTS,
    scale = SCORE_SCALE,
  }: ScoringOptions,
): ExpertiseScore {
  const eligible = evidence.filter(({ occurredAt }) =>
    isOnOrBefore(occurredAt, asOf),
  );

  const contributions: EvidenceContribution[] = [];
  const types = new Set<string>();
  let baseScore = 0;
  let lastEvidenceAt: Date | null = null;

  for (const record of eligible) {
    const weight = weightFor(record.type, weights);
    const recency = recencyMultiplier(
      record.occurredAt,
      asOf,
      knowledgeDecayRate,
    );
    const contribution = weight * record.strength * recency;

    if (weight > 0 && record.strength > 0) {
      types.add(record.type);
      baseScore += contribution;
    }

    if (
      record.occurredAt.getTime() >=
      (lastEvidenceAt?.getTime() ?? Number.NEGATIVE_INFINITY)
    ) {
      lastEvidenceAt = record.occurredAt;
    }

    contributions.push({
      id: record.id ?? `${record.type}:${record.occurredAt.toISOString()}`,
      ...(record.title !== undefined && { title: record.title }),
      type: record.type,
      strength: record.strength,
      occurredAt: record.occurredAt,
      weight,
      recencyMultiplier: recency,
      contribution,
    });
  }

  const rawScore = baseScore * diversityFactor(types.size);

  return {
    expertiseScore: Number(normalize(rawScore, scale).toFixed(1)),
    rawScore,
    baseScore,
    diversityBonus: diversityBonus(types.size),
    evidenceCount: eligible.length,
    uniqueTypeCount: types.size,
    lastEvidenceAt,
    contributions,
  };
}

/** True when a score is too small to report as expertise. */
export function isMeaningfulExpertise(rawScore: number): boolean {
  return rawScore >= MIN_STRENGTH;
}

/** Sums the unrounded scores that make up a distribution. */
export function totalExpertise(scores: readonly number[]): number {
  return scores.reduce((total, score) => total + score, 0);
}
