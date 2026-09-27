import { rollUpEvidence } from "./evidence-rollup";

describe("rollUpEvidence", () => {
  it("sums counts, keeps the latest date, and orders the breakdown", () => {
    const rollups = rollUpEvidence([
      {
        key: "emp_budi",
        subKey: "PEER_CONFIRMATION",
        count: 1,
        lastOccurredAt: new Date("2026-07-03T00:00:00.000Z"),
      },
      {
        key: "emp_budi",
        subKey: "MAINTENANCE_ACTIVITY",
        count: 4,
        lastOccurredAt: new Date("2026-08-16T00:00:00.000Z"),
      },
      {
        key: "emp_budi",
        subKey: "INCIDENT_RESOLVED",
        count: 4,
        lastOccurredAt: new Date("2026-08-23T00:00:00.000Z"),
      },
      {
        key: "emp_andri",
        subKey: "TRAINING_COMPLETED",
        count: 1,
        lastOccurredAt: null,
      },
    ]);

    expect(rollups.get("emp_budi")).toEqual({
      evidenceCount: 9,
      lastEvidenceAt: new Date("2026-08-23T00:00:00.000Z"),
      breakdown: [
        { key: "INCIDENT_RESOLVED", count: 4 },
        { key: "MAINTENANCE_ACTIVITY", count: 4 },
        { key: "PEER_CONFIRMATION", count: 1 },
      ],
    });
    expect(rollups.get("emp_andri")).toMatchObject({
      evidenceCount: 1,
      lastEvidenceAt: null,
    });
  });

  it("merges repeated sub-keys into one breakdown entry", () => {
    const rollup = rollUpEvidence([
      { key: "ka_a", subKey: "CODE_REVIEW", count: 2, lastOccurredAt: null },
      { key: "ka_a", subKey: "CODE_REVIEW", count: 3, lastOccurredAt: null },
    ]).get("ka_a");

    expect(rollup?.breakdown).toEqual([{ key: "CODE_REVIEW", count: 5 }]);
  });

  it("returns an empty map when there is no evidence", () => {
    expect(rollUpEvidence([]).size).toBe(0);
  });
});
