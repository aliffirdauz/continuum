/**
 * Confidence, as a summary of how much evidence supports a score.
 *
 * It is deliberately a documented heuristic over three factors, not a
 * probability: evidence volume, how recent the latest evidence is, and how
 * varied the evidence types are. Spec section 4.3 requires an explainable
 * score, and a stated threshold is explainable in a way a probability is not.
 *
 * This file is framework-independent.
 */
import {
  HIGH_CONFIDENCE_MAX_AGE_DAYS,
  HIGH_CONFIDENCE_MIN_EVIDENCE,
  HIGH_CONFIDENCE_MIN_TYPES,
  MEDIUM_CONFIDENCE_MAX_AGE_DAYS,
  MEDIUM_CONFIDENCE_MIN_EVIDENCE,
  MEDIUM_CONFIDENCE_MIN_TYPES,
} from "./expertise.config";
import { ageInDays } from "./recency";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface ConfidenceInput {
  evidenceCount: number;
  uniqueTypeCount: number;
  /** Latest evidence date, or null when the area has no evidence. */
  lastEvidenceAt: Date | null;
  asOf: Date;
}

/**
 * Confidence in an expertise score. Someone with no evidence has no confidence
 * value: they are not surfaced as an expert at all, so the caller never asks.
 */
export function confidenceFor({
  evidenceCount,
  uniqueTypeCount,
  lastEvidenceAt,
  asOf,
}: ConfidenceInput): Confidence {
  if (evidenceCount === 0 || !lastEvidenceAt) {
    return "LOW";
  }

  const age = ageInDays(lastEvidenceAt, asOf);

  if (
    evidenceCount >= HIGH_CONFIDENCE_MIN_EVIDENCE &&
    age <= HIGH_CONFIDENCE_MAX_AGE_DAYS &&
    uniqueTypeCount >= HIGH_CONFIDENCE_MIN_TYPES
  ) {
    return "HIGH";
  }

  if (
    evidenceCount >= MEDIUM_CONFIDENCE_MIN_EVIDENCE &&
    (age <= MEDIUM_CONFIDENCE_MAX_AGE_DAYS ||
      uniqueTypeCount >= MEDIUM_CONFIDENCE_MIN_TYPES)
  ) {
    return "MEDIUM";
  }

  return "LOW";
}
