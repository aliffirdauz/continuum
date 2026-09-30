import {
  diversityBonus,
  diversityFactor,
  normalize,
  scoreExpertise,
  type ScoredEvidence,
} from "./scoring";
import { DEFAULT_EVIDENCE_WEIGHTS } from "./weights";

const AS_OF = new Date("2026-09-01T00:00:00.000Z");

/** Builds evidence from the seed's (type, strength, ageInDays) triples. */
function fromSeed(
  records: ReadonlyArray<[string, number, number]>,
): ScoredEvidence[] {
  return records.map(([type, strength, ageInDays]) => ({
    type,
    strength,
    occurredAt: new Date(AS_OF.getTime() - ageInDays * 86_400_000),
  }));
}

describe("diversityBonus", () => {
  it("is zero with no evidence types and one at the saturation point", () => {
    expect(diversityBonus(0)).toBe(0);
    expect(diversityBonus(5)).toBe(1);
  });

  it("caps at 1 beyond the saturation point", () => {
    expect(diversityBonus(6)).toBe(1);
    expect(diversityBonus(11)).toBe(1);
  });

  it("grows linearly up to saturation", () => {
    expect(diversityBonus(1)).toBeCloseTo(0.2, 10);
    expect(diversityBonus(3)).toBeCloseTo(0.6, 10);
  });
});

describe("diversityFactor", () => {
  it("stays within the configured floor to one band", () => {
    expect(diversityFactor(0)).toBeCloseTo(0.7, 10);
    expect(diversityFactor(11)).toBeCloseTo(1.0, 10);
  });

  it("never exceeds 1 even with every evidence type", () => {
    expect(diversityFactor(11)).toBeLessThanOrEqual(1);
  });
});

describe("normalize", () => {
  it("returns 0 for a non-positive raw score", () => {
    expect(normalize(0)).toBe(0);
    expect(normalize(-5)).toBe(0);
  });

  it("scales linearly", () => {
    expect(normalize(1, 10)).toBe(10);
    expect(normalize(2, 10)).toBe(20);
  });

  it("never exceeds 100", () => {
    expect(normalize(1000)).toBe(100);
    expect(normalize(8.4)).toBeLessThanOrEqual(100);
  });
});

describe("scoreExpertise", () => {
  it("preserves persisted evidence identifiers for explanations", () => {
    const score = scoreExpertise(
      [
        {
          id: "ev_real_001",
          title: "Resolved incident",
          type: "INCIDENT_RESOLVED",
          strength: 1,
          occurredAt: AS_OF,
        },
      ],
      { asOf: AS_OF, knowledgeDecayRate: 0.02 },
    );
    expect(score.contributions[0]).toMatchObject({
      id: "ev_real_001",
      title: "Resolved incident",
    });
  });
  it("returns a zero score for no evidence", () => {
    const score = scoreExpertise([], {
      asOf: AS_OF,
      knowledgeDecayRate: 0.02,
    });

    expect(score.expertiseScore).toBe(0);
    expect(score.rawScore).toBe(0);
    expect(score.evidenceCount).toBe(0);
    expect(score.uniqueTypeCount).toBe(0);
    expect(score.lastEvidenceAt).toBe(null);
  });

  it("returns a zero score when every record has zero strength", () => {
    const score = scoreExpertise(
      fromSeed([
        ["INCIDENT_RESOLVED", 0, 5],
        ["MAINTENANCE_ACTIVITY", 0, 5],
      ]),
      { asOf: AS_OF, knowledgeDecayRate: 0.02 },
    );

    expect(score.expertiseScore).toBe(0);
    expect(score.evidenceCount).toBe(2);
  });

  it("scores a single recent incident with full weight", () => {
    const score = scoreExpertise(fromSeed([["INCIDENT_RESOLVED", 1, 0]]), {
      asOf: AS_OF,
      knowledgeDecayRate: 0.02,
    });

    // base 1.0, one type of five, so 1.0 * (0.7 + 0.3 * 0.2) = 0.76
    expect(score.baseScore).toBeCloseTo(1, 10);
    expect(score.rawScore).toBeCloseTo(0.76, 10);
    expect(score.expertiseScore).toBeCloseTo(9.1, 1);
  });

  it("excludes evidence dated after the reference date", () => {
    const eligible = scoreExpertise(fromSeed([["INCIDENT_RESOLVED", 1, 10]]), {
      asOf: AS_OF,
      knowledgeDecayRate: 0.02,
    });
    const withFuture = scoreExpertise(
      fromSeed([
        ["INCIDENT_RESOLVED", 1, 10],
        ["INCIDENT_RESOLVED", 1, -30],
      ]),
      { asOf: AS_OF, knowledgeDecayRate: 0.02 },
    );

    expect(withFuture.evidenceCount).toBe(eligible.evidenceCount);
    expect(withFuture.expertiseScore).toBe(eligible.expertiseScore);
  });

  it("keeps the latest evidence date among counted records", () => {
    const score = scoreExpertise(
      fromSeed([
        ["INCIDENT_RESOLVED", 1, 200],
        ["MAINTENANCE_ACTIVITY", 1, 12],
        ["PEER_CONFIRMATION", 1, 90],
      ]),
      { asOf: AS_OF, knowledgeDecayRate: 0.02 },
    );

    expect(score.lastEvidenceAt).toEqual(new Date("2026-08-20T00:00:00.000Z"));
  });

  it("scores aged evidence below the same evidence collected recently", () => {
    const fresh = scoreExpertise(fromSeed([["INCIDENT_RESOLVED", 1, 10]]), {
      asOf: AS_OF,
      knowledgeDecayRate: 0.05,
    });
    const aged = scoreExpertise(fromSeed([["INCIDENT_RESOLVED", 1, 900]]), {
      asOf: AS_OF,
      knowledgeDecayRate: 0.05,
    });

    expect(aged.expertiseScore).toBeLessThan(fresh.expertiseScore);
  });

  it("weights evidence types apart", () => {
    const incident = scoreExpertise(fromSeed([["INCIDENT_RESOLVED", 1, 0]]), {
      asOf: AS_OF,
      knowledgeDecayRate: 0.02,
    });
    const training = scoreExpertise(fromSeed([["TRAINING_COMPLETED", 1, 0]]), {
      asOf: AS_OF,
      knowledgeDecayRate: 0.02,
    });

    expect(incident.expertiseScore).toBeGreaterThan(training.expertiseScore);
    expect(incident.expertiseScore / training.expertiseScore).toBeCloseTo(2, 1);
  });

  it("honours a weight override", () => {
    const evidence = fromSeed([["INCIDENT_RESOLVED", 1, 0]]);
    const demoted = scoreExpertise(evidence, {
      asOf: AS_OF,
      knowledgeDecayRate: 0.02,
      weights: { ...DEFAULT_EVIDENCE_WEIGHTS, INCIDENT_RESOLVED: 0.5 },
    });

    expect(demoted.expertiseScore).toBeCloseTo(4.6, 1);
  });

  it("contributes nothing for an unknown evidence type", () => {
    const score = scoreExpertise(fromSeed([["SOMETHING_NEW", 1, 0]]), {
      asOf: AS_OF,
      knowledgeDecayRate: 0.02,
    });

    expect(score.expertiseScore).toBe(0);
    expect(score.uniqueTypeCount).toBe(0);
  });

  it("stays within 0 to 100 for the heaviest seeded contributor", () => {
    const score = scoreExpertise(
      fromSeed([
        ["INCIDENT_RESOLVED", 1, 9],
        ["MAINTENANCE_ACTIVITY", 0.95, 16],
        ["INCIDENT_RESOLVED", 0.95, 34],
        ["MAINTENANCE_ACTIVITY", 0.9, 47],
        ["PEER_CONFIRMATION", 0.8, 60],
        ["DOCUMENT_AUTHORED", 0.9, 75],
        ["MAINTENANCE_ACTIVITY", 0.9, 102],
        ["INCIDENT_RESOLVED", 0.9, 138],
        ["PROJECT_PARTICIPATION", 0.85, 190],
        ["MAINTENANCE_ACTIVITY", 0.85, 260],
      ]),
      { asOf: AS_OF, knowledgeDecayRate: 0.02 },
    );

    expect(score.expertiseScore).toBeGreaterThan(0);
    expect(score.expertiseScore).toBeLessThan(100);
  });

  it("is deterministic across repeated calls", () => {
    const evidence = fromSeed([
      ["INCIDENT_RESOLVED", 0.9, 40],
      ["MAINTENANCE_ACTIVITY", 0.8, 120],
    ]);

    const first = scoreExpertise(evidence, {
      asOf: AS_OF,
      knowledgeDecayRate: 0.03,
    });
    const second = scoreExpertise(evidence, {
      asOf: AS_OF,
      knowledgeDecayRate: 0.03,
    });

    expect(first.expertiseScore).toBe(second.expertiseScore);
    expect(first.rawScore).toBe(second.rawScore);
  });
});
