/**
 * Evidence type weights, from spec section 10. These are defaults, not
 * constants: `weightFor` accepts an override map so a caller (or a test) can
 * supply a different set without touching the scoring functions.
 *
 * This file is framework-independent on purpose, so it must not import NestJS or
 * Prisma.
 */
export const DEFAULT_EVIDENCE_WEIGHTS = {
  INCIDENT_RESOLVED: 1.0,
  PROCESS_EXECUTION: 0.95,
  MAINTENANCE_ACTIVITY: 0.95,
  PROJECT_PARTICIPATION: 0.85,
  CODE_CONTRIBUTION: 0.85,
  TICKET_RESOLVED: 0.8,
  DOCUMENT_AUTHORED: 0.75,
  CODE_REVIEW: 0.65,
  DOCUMENT_CONTRIBUTION: 0.6,
  TRAINING_COMPLETED: 0.5,
  PEER_CONFIRMATION: 0.45,
} as const;

export type EvidenceTypeName = keyof typeof DEFAULT_EVIDENCE_WEIGHTS;
export type EvidenceWeights = Readonly<Record<EvidenceTypeName, number>>;

/** Weight used when a caller supplies no entry for a type. */
export const UNKNOWN_TYPE_WEIGHT = 0;

/**
 * Resolves the weight for one evidence type. An unknown type scores 0 rather
 * than throwing, so a newly added Prisma enum value degrades to "no
 * contribution" instead of breaking an entire knowledge area's scoring.
 */
export function weightFor(
  type: string,
  weights: EvidenceWeights = DEFAULT_EVIDENCE_WEIGHTS,
): number {
  if (!Object.prototype.hasOwnProperty.call(weights, type)) {
    return UNKNOWN_TYPE_WEIGHT;
  }

  return weights[type as EvidenceTypeName];
}
