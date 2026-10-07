import { describe, expect, it } from "vitest";
import { calculateRisk } from "./risk";

const asOf = new Date("2026-09-01T00:00:00Z");
const daysAgo = (days: number) => new Date(asOf.getTime() - days * 86_400_000);

const input = {
  asOf,
  businessCriticality: 0.96,
  effectiveExpertCount: 1.49,
  evidence: [
    { type: "INCIDENT_RESOLVED", occurredAt: daysAgo(9) },
    { type: "DOCUMENT_AUTHORED", occurredAt: daysAgo(70) },
  ],
};

describe("knowledge risk", () => {
  it("makes recent, documented single-holder critical knowledge critical", () => {
    const result = calculateRisk(input);
    expect(result.riskScore).toBeCloseTo(54.36, 1);
    expect(result.riskLevel).toBe("CRITICAL");
    expect(result.factors).toEqual({
      businessCriticality: 0.96,
      concentration: 0.755,
      freshness: 0,
      documentationGap: 0,
    });
    expect(result.formulaVersion).toBe("risk-v1");
    expect(result.weightedContributions).toEqual({
      concentration: 54.36,
      freshness: 0,
      documentationGap: 0,
    });
  });

  it("makes evenly distributed recent knowledge low risk despite high criticality", () => {
    const result = calculateRisk({
      ...input,
      businessCriticality: 0.87,
      effectiveExpertCount: 3,
    });
    expect(result.riskLevel).toBe("LOW");
    expect(result.riskScore).toBe(0);
  });

  it("treats absent evidence and documentation as maximum exposure", () => {
    const result = calculateRisk({
      ...input,
      evidence: [],
      effectiveExpertCount: 0,
    });
    expect(result.riskScore).toBe(96);
    expect(result.factors).toMatchObject({
      concentration: 1,
      freshness: 1,
      documentationGap: 1,
    });
  });

  it("does not let fresh activity disguise old documentation", () => {
    const result = calculateRisk({
      ...input,
      evidence: [
        { type: "INCIDENT_RESOLVED", occurredAt: daysAgo(1) },
        { type: "DOCUMENT_CONTRIBUTION", occurredAt: daysAgo(731) },
        { type: "DOCUMENT_AUTHORED", occurredAt: daysAgo(-1) },
      ],
    });
    expect(result.factors.freshness).toBe(0);
    expect(result.factors.documentationGap).toBe(1);
  });

  it("uses inclusive day bands and computes levels before rounding", () => {
    for (const [days, expected] of [
      [90, 0],
      [91, 0.25],
      [180, 0.25],
      [181, 0.5],
      [365, 0.5],
      [366, 0.75],
      [730, 0.75],
      [731, 1],
    ] as const) {
      const result = calculateRisk({
        ...input,
        evidence: [{ type: "DOCUMENT_AUTHORED", occurredAt: daysAgo(days) }],
      });
      expect(result.factors.freshness).toBe(expected);
      expect(result.factors.documentationGap).toBe(expected);
    }
    const boundary = calculateRisk({
      ...input,
      businessCriticality: 0.1,
      effectiveExpertCount: 1,
    });
    expect(boundary.riskScore).toBeCloseTo(7.5, 5);
    expect(boundary.riskLevel).toBe("LOW");
  });
});
