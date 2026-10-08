import { describe, expect, it } from "vitest";
import { DEFAULT_EVIDENCE_WEIGHTS } from "../expertise/weights";
import { calculateRisk } from "../risk/risk";
import {
  ACTIVITY_EVIDENCE_TYPE,
  TRANSFER_ACTIVITY_TYPES,
  TRANSFER_MAPPING_VERSION,
  assessArea,
  canTransition,
  coverageProgress,
  recommendActivities,
} from "./transfer";

const asOf = new Date("2026-09-01T00:00:00Z");
const daysAgo = (days: number) => new Date(asOf.getTime() - days * 86_400_000);

describe("activity-to-evidence mapping", () => {
  it("maps every activity type to a weighted evidence type under a versioned rule set", () => {
    expect(TRANSFER_MAPPING_VERSION).toBe("transfer-v1");
    expect(Object.keys(ACTIVITY_EVIDENCE_TYPE).sort()).toEqual(
      [...TRANSFER_ACTIVITY_TYPES].sort(),
    );
    for (const type of TRANSFER_ACTIVITY_TYPES) {
      expect(
        DEFAULT_EVIDENCE_WEIGHTS[ACTIVITY_EVIDENCE_TYPE[type]],
      ).toBeGreaterThan(0);
    }
    expect(ACTIVITY_EVIDENCE_TYPE).toMatchObject({
      SHADOW_SESSION: "TRAINING_COMPLETED",
      DOCUMENTATION: "DOCUMENT_AUTHORED",
      KNOWLEDGE_INTERVIEW: "DOCUMENT_CONTRIBUTION",
      REVIEW: "PEER_CONFIRMATION",
      PAIR_WORK: "PROJECT_PARTICIPATION",
      INDEPENDENT_VALIDATION: "PROCESS_EXECUTION",
    });
  });
});

describe("deterministic recommendations", () => {
  it.each([
    [0, "FOUNDATION"],
    [39.9, "FOUNDATION"],
    [40, "PRACTICE"],
    [70, "PRACTICE"],
    [70.1, "VALIDATION"],
    [100, "VALIDATION"],
  ] as const)("puts a backup score of %s in the %s band", (score, band) => {
    expect(recommendActivities(score).band).toBe(band);
  });

  it("suggests the spec's activities for each band", () => {
    const types = (score: number) =>
      recommendActivities(score).recommendations.map((r) => r.activityType);
    expect(types(10)).toEqual([
      "SHADOW_SESSION",
      "DOCUMENTATION",
      "INCIDENT_OBSERVATION",
      "KNOWLEDGE_INTERVIEW",
    ]);
    expect(types(55)).toEqual([
      "PAIR_WORK",
      "INDEPENDENT_VALIDATION",
      "REVIEW",
    ]);
    // Owner assignment is advice, not an activity that creates evidence.
    expect(types(80)).toEqual(["INDEPENDENT_VALIDATION", null]);
    for (const score of [10, 55, 80])
      for (const item of recommendActivities(score).recommendations)
        expect(item.label.length).toBeGreaterThan(0);
  });
});

describe("plan status transitions", () => {
  it.each([
    ["PLANNED", "IN_PROGRESS", true],
    ["PLANNED", "BLOCKED", true],
    ["PLANNED", "COMPLETED", false],
    ["IN_PROGRESS", "BLOCKED", true],
    ["IN_PROGRESS", "COMPLETED", true],
    ["IN_PROGRESS", "PLANNED", false],
    ["BLOCKED", "IN_PROGRESS", true],
    ["BLOCKED", "COMPLETED", false],
    ["COMPLETED", "IN_PROGRESS", false],
    ["COMPLETED", "BLOCKED", false],
    ["IN_PROGRESS", "IN_PROGRESS", false],
  ] as const)("%s → %s allowed: %s", (from, to, allowed) => {
    expect(canTransition(from, to)).toBe(allowed);
  });
});

describe("coverage progress", () => {
  it("measures the share of the gap from baseline to target, clamped to 0–100", () => {
    expect(coverageProgress(20, 20, 70)).toBe(0);
    expect(coverageProgress(20, 45, 70)).toBe(50);
    expect(coverageProgress(20, 70, 70)).toBe(100);
    expect(coverageProgress(20, 95, 70)).toBe(100);
    expect(coverageProgress(20, 10, 70)).toBe(0);
    expect(coverageProgress(80, 85, 70)).toBe(100);
  });
});

describe("area assessment", () => {
  const evidence = [
    {
      employeeId: "emp_a",
      type: "INCIDENT_RESOLVED",
      strength: 1,
      occurredAt: daysAgo(5),
    },
    {
      employeeId: "emp_a",
      type: "DOCUMENT_AUTHORED",
      strength: 1,
      occurredAt: daysAgo(30),
    },
    {
      employeeId: "emp_b",
      type: "TRAINING_COMPLETED",
      strength: 1,
      occurredAt: daysAgo(10),
    },
    // Recorded after asOf, so it must not count.
    {
      employeeId: "emp_b",
      type: "PROCESS_EXECUTION",
      strength: 1,
      occurredAt: new Date(asOf.getTime() + 1),
    },
  ];

  it("scores primary and backup and reuses the Phase 4 risk formula unchanged", () => {
    const result = assessArea({
      asOf,
      businessCriticality: 0.9,
      knowledgeDecayRate: 0.02,
      evidence,
      primaryHolderId: "emp_a",
      backupEmployeeId: "emp_b",
    });
    expect(result.primaryHolderScore).toBeGreaterThan(result.backupScore);
    expect(result.backupScore).toBeGreaterThan(0);
    const expected = calculateRisk({
      asOf,
      businessCriticality: 0.9,
      effectiveExpertCount: result.effectiveExpertCount,
      evidence: evidence.slice(0, 3),
    });
    expect(result.riskScore).toBe(expected.riskScore);
    expect(result.riskLevel).toBe(expected.riskLevel);
    expect(result.evidenceCount).toBe(3);
    expect(result.formulaVersion).toBe("risk-v1");
  });

  it("gives a backup without evidence a zero score", () => {
    const result = assessArea({
      asOf,
      businessCriticality: 0.9,
      knowledgeDecayRate: 0.02,
      evidence: evidence.slice(0, 2),
      primaryHolderId: "emp_a",
      backupEmployeeId: "emp_z",
    });
    expect(result.backupScore).toBe(0);
    expect(result.effectiveExpertCount).toBe(1);
  });
});
