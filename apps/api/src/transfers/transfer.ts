/**
 * Knowledge transfer rules (spec sections 23–25). Completing an activity
 * records evidence for the backup, so expertise and risk change only through
 * the Phase 3 and Phase 4 engines reused here.
 *
 * This file is framework-independent.
 */
import { effectiveExpertCount } from "../expertise/concentration";
import { isMeaningfulExpertise, scoreExpertise } from "../expertise/scoring";
import type { EvidenceTypeName } from "../expertise/weights";
import { calculateRisk, RISK_FORMULA_VERSION } from "../risk/risk";

export const TRANSFER_MAPPING_VERSION = "transfer-v1";
export const TRANSFER_EVIDENCE_SOURCE = "Transfer plan";

export const TRANSFER_ACTIVITY_TYPES = [
  "SHADOW_SESSION",
  "DOCUMENTATION",
  "PAIR_WORK",
  "INCIDENT_OBSERVATION",
  "TRAINING",
  "REVIEW",
  "INDEPENDENT_VALIDATION",
  "KNOWLEDGE_INTERVIEW",
] as const;
export type TransferActivityTypeName = (typeof TRANSFER_ACTIVITY_TYPES)[number];

export const ACTIVITY_EVIDENCE_TYPE: Readonly<
  Record<TransferActivityTypeName, EvidenceTypeName>
> = {
  SHADOW_SESSION: "TRAINING_COMPLETED",
  TRAINING: "TRAINING_COMPLETED",
  INCIDENT_OBSERVATION: "TRAINING_COMPLETED",
  KNOWLEDGE_INTERVIEW: "DOCUMENT_CONTRIBUTION",
  DOCUMENTATION: "DOCUMENT_AUTHORED",
  REVIEW: "PEER_CONFIRMATION",
  PAIR_WORK: "PROJECT_PARTICIPATION",
  INDEPENDENT_VALIDATION: "PROCESS_EXECUTION",
};

export const TRANSFER_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
] as const;
export type TransferStatusName = (typeof TRANSFER_STATUSES)[number];

const TRANSITIONS: Readonly<
  Record<TransferStatusName, readonly TransferStatusName[]>
> = {
  PLANNED: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["BLOCKED", "COMPLETED"],
  BLOCKED: ["IN_PROGRESS"],
  COMPLETED: [],
};

export function canTransition(
  from: TransferStatusName,
  to: TransferStatusName,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export type RecommendationBand = "FOUNDATION" | "PRACTICE" | "VALIDATION";
export interface Recommendation {
  /** `null` marks advice that is not an evidence-producing activity. */
  activityType: TransferActivityTypeName | null;
  label: string;
}

const RECOMMENDATIONS: Readonly<Record<RecommendationBand, Recommendation[]>> =
  {
    FOUNDATION: [
      {
        activityType: "SHADOW_SESSION",
        label: "Shadow the primary holder during live work",
      },
      {
        activityType: "DOCUMENTATION",
        label: "Review and update the documentation",
      },
      {
        activityType: "INCIDENT_OBSERVATION",
        label: "Observe an incident or issue being resolved",
      },
      {
        activityType: "KNOWLEDGE_INTERVIEW",
        label: "Interview the primary holder and record the notes",
      },
    ],
    PRACTICE: [
      {
        activityType: "PAIR_WORK",
        label: "Pair on real work with the primary holder",
      },
      {
        activityType: "INDEPENDENT_VALIDATION",
        label: "Resolve an issue independently, then have it validated",
      },
      {
        activityType: "REVIEW",
        label: "Have the primary holder review the backup's work",
      },
    ],
    VALIDATION: [
      {
        activityType: "INDEPENDENT_VALIDATION",
        label: "Validate independent handling of a real case",
      },
      { activityType: null, label: "Assign the backup as a co-owner" },
    ],
  };

/** Spec section 24 bands: below 40, 40–70 inclusive, above 70. */
export function recommendActivities(backupScore: number): {
  band: RecommendationBand;
  recommendations: Recommendation[];
} {
  const band: RecommendationBand =
    backupScore < 40
      ? "FOUNDATION"
      : backupScore <= 70
        ? "PRACTICE"
        : "VALIDATION";
  return { band, recommendations: RECOMMENDATIONS[band] };
}

/** Percentage of the distance from baseline to target, clamped to 0–100. */
export function coverageProgress(
  baseline: number,
  current: number,
  target: number,
): number {
  if (target <= baseline) return 100;
  const share = ((current - baseline) / (target - baseline)) * 100;
  return Number(Math.min(100, Math.max(0, share)).toFixed(1));
}

export interface AreaEvidence {
  employeeId: string;
  type: string;
  strength: number;
  occurredAt: Date;
}

/** Mirrors RiskService: meaningful raw scores feed inverse HHI and risk-v1. */
export function assessArea(input: {
  asOf: Date;
  businessCriticality: number;
  knowledgeDecayRate: number;
  evidence: readonly AreaEvidence[];
  primaryHolderId: string;
  backupEmployeeId: string;
}) {
  const eligible = input.evidence.filter((row) => row.occurredAt <= input.asOf);
  const byPerson = new Map<string, AreaEvidence[]>();
  for (const row of eligible)
    byPerson.set(row.employeeId, [
      ...(byPerson.get(row.employeeId) ?? []),
      row,
    ]);
  const scores = new Map(
    [...byPerson].map(([id, rows]) => [
      id,
      scoreExpertise(rows, {
        asOf: input.asOf,
        knowledgeDecayRate: input.knowledgeDecayRate,
      }),
    ]),
  );
  const expertCount = effectiveExpertCount(
    [...scores.values()]
      .map(({ rawScore }) => rawScore)
      .filter(isMeaningfulExpertise),
  );
  const risk = calculateRisk({
    asOf: input.asOf,
    businessCriticality: input.businessCriticality,
    effectiveExpertCount: expertCount,
    evidence: eligible,
  });
  return {
    primaryHolderScore: scores.get(input.primaryHolderId)?.expertiseScore ?? 0,
    primaryHolderRawScore: scores.get(input.primaryHolderId)?.rawScore ?? 0,
    backupScore: scores.get(input.backupEmployeeId)?.expertiseScore ?? 0,
    effectiveExpertCount: expertCount,
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    evidenceCount: risk.evidenceCount,
    formulaVersion: RISK_FORMULA_VERSION,
  };
}
