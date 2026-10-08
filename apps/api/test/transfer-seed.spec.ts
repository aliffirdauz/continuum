import {
  ACTIVITY_EVIDENCE_TYPE,
  assessArea,
  recommendActivities,
  type AreaEvidence,
} from "../src/transfers/transfer";
import {
  SEED_REFERENCE_DATE,
  buildEvidence,
  knowledgeAreas,
} from "../prisma/seed-data/northstar";

const area = knowledgeAreas.find(
  ({ id }) => id === "ka_line4_troubleshooting",
)!;
const asOf = SEED_REFERENCE_DATE;

function assess(evidence: readonly AreaEvidence[], backupEmployeeId: string) {
  return assessArea({
    asOf,
    businessCriticality: area.businessCriticality,
    knowledgeDecayRate: area.knowledgeDecayRate,
    evidence,
    primaryHolderId: "emp_budi",
    backupEmployeeId,
  });
}

/** Completes recommended activities, as a manager would, until done() holds. */
function followRecommendations(
  evidence: AreaEvidence[],
  backupEmployeeId: string,
  done: (state: ReturnType<typeof assess>) => boolean,
) {
  const path = [assess(evidence, backupEmployeeId)];
  for (let step = 0; step < 15 && !done(path.at(-1)!); step++) {
    const { recommendations } = recommendActivities(path.at(-1)!.backupScore);
    const activities = recommendations.filter((r) => r.activityType !== null);
    const next = activities[step % activities.length]!.activityType!;
    evidence.push({
      employeeId: backupEmployeeId,
      type: ACTIVITY_EVIDENCE_TYPE[next],
      strength: 1,
      occurredAt: asOf,
    });
    path.push(assess(evidence, backupEmployeeId));
  }
  return path;
}

describe("Northstar Line 4 transfer calibration", () => {
  it("moves CRITICAL → HIGH with Andri and HIGH → LOW once Joko becomes a second backup", () => {
    const evidence: AreaEvidence[] = buildEvidence().filter(
      ({ knowledgeAreaId }) => knowledgeAreaId === area.id,
    );
    const andri = followRecommendations(
      evidence,
      "emp_andri",
      ({ backupScore }) => backupScore >= 70,
    );
    expect(andri[0]).toMatchObject({ riskLevel: "CRITICAL" });
    expect(andri[0]!.backupScore).toBeCloseTo(18.4, 1);
    expect(andri.at(-1)!.backupScore).toBeGreaterThanOrEqual(70);
    expect(andri.length - 1).toBeLessThanOrEqual(8);
    expect(andri.at(-1)!.riskLevel).toBe("HIGH");
    // One backup cannot reach LOW under risk-v1.
    expect(andri.every(({ riskLevel }) => riskLevel !== "LOW")).toBe(true);

    const joko = followRecommendations(
      evidence,
      "emp_joko",
      ({ riskLevel }) => riskLevel === "LOW",
    );
    expect(joko.at(-1)!.riskLevel).toBe("LOW");
    expect(joko.length - 1).toBeLessThanOrEqual(8);

    const scores = [...andri, ...joko.slice(1)].map((s) => s.riskScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    // The primary holder's own expertise is untouched by the transfer.
    expect(joko.at(-1)!.primaryHolderScore).toBe(andri[0]!.primaryHolderScore);
  });
});
