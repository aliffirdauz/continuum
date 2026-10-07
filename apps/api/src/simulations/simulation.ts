import { effectiveExpertCount } from "../expertise/concentration";
import { isMeaningfulExpertise, scoreExpertise } from "../expertise/scoring";
import { calculateRisk } from "../risk/risk";

export const COVERAGE_FORMULA_VERSION = "coverage-v1";
export const COVERAGE_DENOMINATOR = 3;
export type SimulationEvidence = {
  employeeId: string;
  type: string;
  strength: number;
  occurredAt: Date;
};

export function coverageFor(scores: readonly number[]): number {
  return Math.min(
    100,
    scores.reduce((sum, score) => sum + Math.min(100, Math.max(0, score)), 0) /
      COVERAGE_DENOMINATOR,
  );
}

export function compareArea(input: {
  startedAt: Date;
  horizonAt: Date;
  employeeId: string;
  businessCriticality: number;
  knowledgeDecayRate: number;
  evidence: readonly SimulationEvidence[];
}) {
  const eligible = input.evidence.filter(
    (row) => row.occurredAt <= input.startedAt,
  );
  const grouped = new Map<string, SimulationEvidence[]>();
  for (const row of eligible)
    grouped.set(row.employeeId, [...(grouped.get(row.employeeId) ?? []), row]);
  const holders = [...grouped]
    .map(([id, rows]) => ({
      id,
      score: scoreExpertise(rows, {
        asOf: input.horizonAt,
        knowledgeDecayRate: input.knowledgeDecayRate,
      }),
    }))
    .filter(({ score }) => isMeaningfulExpertise(score.rawScore));
  function branch(exclude: boolean) {
    const selected = holders.filter(
      ({ id }) => !exclude || id !== input.employeeId,
    );
    const effective = effectiveExpertCount(
      selected.map(({ score }) => score.rawScore),
    );
    const risk = calculateRisk({
      asOf: input.horizonAt,
      businessCriticality: input.businessCriticality,
      effectiveExpertCount: effective,
      evidence: eligible,
    });
    return {
      riskScore: Number(risk.riskScore.toFixed(1)),
      riskLevel: risk.riskLevel,
      effectiveExpertCount: effective,
      coverage: coverageFor(selected.map(({ score }) => score.expertiseScore)),
      factors: risk.factors,
      weightedContributions: risk.weightedContributions,
      evidenceCount: risk.evidenceCount,
    };
  }
  return { before: branch(false), after: branch(true) };
}
