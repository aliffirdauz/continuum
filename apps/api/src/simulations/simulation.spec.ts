import { describe, expect, it } from "vitest";
import { compareArea, coverageFor } from "./simulation";

const startedAt = new Date("2026-09-01T00:00:00Z");
const horizonAt = new Date("2026-10-01T00:00:00Z");
const evidence = [
  {
    employeeId: "emp_a",
    type: "DOCUMENT_AUTHORED",
    strength: 1,
    occurredAt: new Date("2026-08-01T00:00:00Z"),
  },
  {
    employeeId: "emp_b",
    type: "TICKET_RESOLVED",
    strength: 0.5,
    occurredAt: new Date("2026-08-01T00:00:00Z"),
  },
  {
    employeeId: "emp_a",
    type: "INCIDENT_RESOLVED",
    strength: 1,
    occurredAt: new Date("2026-09-15T00:00:00Z"),
  },
];

describe("same-horizon unavailability comparison", () => {
  it("freezes eligible evidence at capture while retaining departed person's documents in both risk branches", () => {
    const result = compareArea({
      startedAt,
      horizonAt,
      employeeId: "emp_a",
      businessCriticality: 1,
      knowledgeDecayRate: 0.02,
      evidence,
    });
    expect(result.before.coverage).toBeGreaterThan(result.after.coverage);
    expect(result.before.effectiveExpertCount).toBeGreaterThan(1);
    expect(result.after.effectiveExpertCount).toBe(1);
    expect(result.before.factors.documentationGap).toBe(
      result.after.factors.documentationGap,
    );
    expect(result.before.evidenceCount).toBe(2);
    expect(result.after.evidenceCount).toBe(2);
  });
  it("includes evidence at the capture instant and excludes anything later", () => {
    const at = (occurredAt: Date) =>
      compareArea({
        startedAt,
        horizonAt,
        employeeId: "emp_a",
        businessCriticality: 1,
        knowledgeDecayRate: 0.02,
        evidence: [
          {
            employeeId: "emp_b",
            type: "INCIDENT_RESOLVED",
            strength: 1,
            occurredAt,
          },
        ],
      });
    expect(at(startedAt).before.evidenceCount).toBe(1);
    expect(at(new Date(startedAt.getTime() + 1)).before.evidenceCount).toBe(0);
  });
  it("treats removing the only holder as zero coverage and maximum concentration", () => {
    const { before, after } = compareArea({
      startedAt,
      horizonAt,
      employeeId: "emp_a",
      businessCriticality: 1,
      knowledgeDecayRate: 0.02,
      evidence: [evidence[0]!],
    });
    expect(before.effectiveExpertCount).toBe(1);
    expect(after).toMatchObject({ effectiveExpertCount: 0, coverage: 0 });
    expect(after.factors.concentration).toBe(1);
    expect(after.riskScore).toBeLessThanOrEqual(100);
    expect(after.riskScore).toBeGreaterThanOrEqual(before.riskScore);
  });
  it("bounds coverage and handles zero holders", () => {
    expect(coverageFor([])).toBe(0);
    expect(coverageFor([100, 100, 100, 100])).toBe(100);
    expect(coverageFor([100])).toBeCloseTo(33.3333, 3);
  });
});
