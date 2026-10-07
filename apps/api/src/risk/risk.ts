export const RISK_FORMULA_VERSION = "risk-v1";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskEvidence {
  type: string;
  occurredAt: Date;
}

export interface RiskInput {
  asOf: Date;
  businessCriticality: number;
  effectiveExpertCount: number;
  evidence: readonly RiskEvidence[];
}

function ageInDays(occurredAt: Date, asOf: Date): number {
  return Math.floor((asOf.getTime() - occurredAt.getTime()) / 86_400_000);
}

function ageRisk(days: number): number {
  if (days <= 90) return 0;
  if (days <= 180) return 0.25;
  if (days <= 365) return 0.5;
  if (days <= 730) return 0.75;
  return 1;
}

function levelFor(score: number): RiskLevel {
  if (score < 10) return "LOW";
  if (score < 30) return "MEDIUM";
  if (score < 45) return "HIGH";
  return "CRITICAL";
}

export function calculateRisk({
  asOf,
  businessCriticality,
  effectiveExpertCount,
  evidence,
}: RiskInput) {
  const eligible = evidence.filter((item) => item.occurredAt <= asOf);
  const documents = eligible.filter(
    (item) =>
      item.type === "DOCUMENT_AUTHORED" ||
      item.type === "DOCUMENT_CONTRIBUTION",
  );
  const newestAge = (items: readonly RiskEvidence[]) =>
    items.length
      ? Math.min(...items.map((item) => ageInDays(item.occurredAt, asOf)))
      : null;
  const latestEvidenceAgeDays = newestAge(eligible);
  const latestDocumentationAgeDays = newestAge(documents);
  const factors = {
    businessCriticality,
    concentration:
      effectiveExpertCount === 0
        ? 1
        : Math.max(0, Math.min(1, (3 - effectiveExpertCount) / 2)),
    freshness:
      latestEvidenceAgeDays === null ? 1 : ageRisk(latestEvidenceAgeDays),
    documentationGap:
      latestDocumentationAgeDays === null
        ? 1
        : ageRisk(latestDocumentationAgeDays),
  };
  const weightedContributions = {
    concentration: 100 * businessCriticality * 0.75 * factors.concentration,
    freshness: 100 * businessCriticality * 0.15 * factors.freshness,
    documentationGap:
      100 * businessCriticality * 0.1 * factors.documentationGap,
  };
  const riskScore =
    100 *
    businessCriticality *
    (0.75 * factors.concentration +
      0.15 * factors.freshness +
      0.1 * factors.documentationGap);
  return {
    riskScore,
    weightedContributions,
    riskLevel: levelFor(riskScore),
    formulaVersion: RISK_FORMULA_VERSION,
    factors,
    evidenceCount: eligible.length,
    latestEvidenceAgeDays,
    latestDocumentationAgeDays,
    asOf,
  };
}
