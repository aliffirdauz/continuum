import {
  DEFAULT_EVIDENCE_WEIGHTS,
  UNKNOWN_TYPE_WEIGHT,
  weightFor,
} from "./weights";

describe("weightFor", () => {
  it("returns the spec section 10 default for every known type", () => {
    expect(DEFAULT_EVIDENCE_WEIGHTS).toEqual({
      INCIDENT_RESOLVED: 1.0,
      PROCESS_EXECUTION: 0.95,
      MAINTENANCE_ACTIVITY: 0.95,
      PROJECT_PARTICIPATION: 0.85,
      CODE_CONTRIBUTION: 0.85,
      TICKET_RESOLVED: 0.8,
      DOCUMENT_AUTHORED: 0.75,
      CODE_REVIEW: 0.65,
      DOCUMENT_CONTRIBUTION: 0.6,
      TRAINING_COMPLETED: 0.5,
      PEER_CONFIRMATION: 0.45,
    });

    for (const type of Object.keys(DEFAULT_EVIDENCE_WEIGHTS)) {
      expect(weightFor(type)).toBe(
        DEFAULT_EVIDENCE_WEIGHTS[type as keyof typeof DEFAULT_EVIDENCE_WEIGHTS],
      );
    }
  });

  it("keeps the table ordered from strongest to weakest evidence", () => {
    const values = Object.values(DEFAULT_EVIDENCE_WEIGHTS);
    const sorted = [...values].sort((left, right) => right - left);

    expect(values).toEqual(sorted);
  });

  it("honours an override map without changing the defaults", () => {
    const weights = { ...DEFAULT_EVIDENCE_WEIGHTS, INCIDENT_RESOLVED: 0.1 };

    expect(weightFor("INCIDENT_RESOLVED", weights)).toBe(0.1);
    expect(weightFor("INCIDENT_RESOLVED")).toBe(1.0);
  });

  it("scales an unknown type to zero instead of throwing", () => {
    expect(weightFor("SOMETHING_NEW")).toBe(UNKNOWN_TYPE_WEIGHT);
    expect(weightFor("toString")).toBe(UNKNOWN_TYPE_WEIGHT);
    expect(weightFor("constructor")).toBe(UNKNOWN_TYPE_WEIGHT);
  });

  it("never returns a weight outside 0 to 1", () => {
    for (const value of Object.values(DEFAULT_EVIDENCE_WEIGHTS)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
