import { compareArea } from "../src/simulations/simulation";
import {
  SEED_REFERENCE_DATE,
  buildEvidence,
  knowledgeAreas,
} from "../prisma/seed-data/northstar";

const evidence = buildEvidence();

function simulate(employeeId: string, areaId: string, horizonAt: Date) {
  const area = knowledgeAreas.find(({ id }) => id === areaId)!;
  return compareArea({
    startedAt: SEED_REFERENCE_DATE,
    horizonAt,
    employeeId,
    businessCriticality: area.businessCriticality,
    knowledgeDecayRate: area.knowledgeDecayRate,
    evidence: evidence.filter((row) => row.knowledgeAreaId === areaId),
  });
}

function areasFor(employeeId: string) {
  return [
    ...new Set(
      evidence
        .filter((row) => row.employeeId === employeeId)
        .map((row) => row.knowledgeAreaId),
    ),
  ].sort();
}

describe("Northstar unavailability calibration at the seed reference date", () => {
  it("affects only the areas where Budi holds evidence", () => {
    expect(areasFor("emp_budi")).toEqual([
      "ka_hydraulic_calibration",
      "ka_line4_troubleshooting",
      "ka_stamping_press_diagnosis",
      "ka_vendor_maintenance",
    ]);
  });

  it("drops Line 4 coverage sharply while relative concentration barely moves", () => {
    const { before, after } = simulate(
      "emp_budi",
      "ka_line4_troubleshooting",
      SEED_REFERENCE_DATE,
    );
    expect(before.effectiveExpertCount).toBeCloseTo(1.49, 2);
    expect(after.effectiveExpertCount).toBeCloseTo(1.5, 2);
    expect(before.coverage).toBeCloseTo(38.9, 1);
    expect(after.coverage).toBeCloseTo(7.6, 1);
    expect(before.riskScore).toBe(54.4);
    expect(after.riskScore).toBe(54.1);
    expect([before.riskLevel, after.riskLevel]).toEqual([
      "CRITICAL",
      "CRITICAL",
    ]);
    // Documents Budi authored still count after removal.
    expect(after.factors.documentationGap).toBe(
      before.factors.documentationGap,
    );
    expect(after.evidenceCount).toBe(before.evidenceCount);
  });

  it("raises stamping press diagnosis from medium to critical", () => {
    const { before, after } = simulate(
      "emp_budi",
      "ka_stamping_press_diagnosis",
      SEED_REFERENCE_DATE,
    );
    expect(before.riskLevel).toBe("MEDIUM");
    expect(after.riskLevel).toBe("CRITICAL");
    expect(before.effectiveExpertCount).toBeCloseTo(2.22, 2);
    expect(after.effectiveExpertCount).toBeCloseTo(1.23, 2);
  });

  it("matches the documented hydraulic calibration and vendor maintenance probes", () => {
    const hydraulic = simulate(
      "emp_budi",
      "ka_hydraulic_calibration",
      SEED_REFERENCE_DATE,
    );
    expect(hydraulic.before.riskScore).toBe(51.4);
    expect(hydraulic.after.riskScore).toBe(53.8);
    const vendor = simulate(
      "emp_budi",
      "ka_vendor_maintenance",
      SEED_REFERENCE_DATE,
    );
    expect([vendor.before.riskLevel, vendor.after.riskLevel]).toEqual([
      "LOW",
      "MEDIUM",
    ]);
    expect(vendor.after.effectiveExpertCount).toBeCloseTo(2, 2);
  });

  it("keeps healthy authentication coverage moderate when one of three peers is away", () => {
    const { before, after } = simulate(
      "emp_kevin",
      "ka_authentication_service",
      SEED_REFERENCE_DATE,
    );
    expect(before.riskLevel).toBe("LOW");
    expect(before.effectiveExpertCount).toBeCloseTo(2.99, 2);
    expect(after.effectiveExpertCount).toBeGreaterThan(1.9);
    expect(after.riskScore).toBeLessThan(45);
  });

  it("ages both branches at a later horizon without forecasting new evidence", () => {
    const later = new Date(SEED_REFERENCE_DATE.getTime() + 365 * 86_400_000);
    const today = simulate(
      "emp_budi",
      "ka_line4_troubleshooting",
      SEED_REFERENCE_DATE,
    );
    const yearOut = simulate("emp_budi", "ka_line4_troubleshooting", later);
    expect(yearOut.before.coverage).toBeLessThan(today.before.coverage);
    expect(yearOut.after.coverage).toBeLessThan(today.after.coverage);
    expect(yearOut.before.factors.freshness).toBeGreaterThan(
      today.before.factors.freshness,
    );
    expect(yearOut.before.evidenceCount).toBe(today.before.evidenceCount);
  });
});
