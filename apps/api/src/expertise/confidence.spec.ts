import { confidenceFor } from "./confidence";

const AS_OF = new Date("2026-09-01T00:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(AS_OF.getTime() - days * 86_400_000);
}

describe("confidenceFor", () => {
  it("is LOW when there is no evidence at all", () => {
    expect(
      confidenceFor({
        evidenceCount: 0,
        uniqueTypeCount: 0,
        lastEvidenceAt: null,
        asOf: AS_OF,
      }),
    ).toBe("LOW");
  });

  it("is HIGH with enough volume, recent evidence, and varied types", () => {
    expect(
      confidenceFor({
        evidenceCount: 5,
        uniqueTypeCount: 3,
        lastEvidenceAt: daysAgo(30),
        asOf: AS_OF,
      }),
    ).toBe("HIGH");
  });

  it("drops out of HIGH at each individual threshold", () => {
    const tooFew = confidenceFor({
      evidenceCount: 4,
      uniqueTypeCount: 3,
      lastEvidenceAt: daysAgo(30),
      asOf: AS_OF,
    });
    const tooOld = confidenceFor({
      evidenceCount: 5,
      uniqueTypeCount: 3,
      lastEvidenceAt: daysAgo(181),
      asOf: AS_OF,
    });
    const tooUniform = confidenceFor({
      evidenceCount: 5,
      uniqueTypeCount: 2,
      lastEvidenceAt: daysAgo(30),
      asOf: AS_OF,
    });

    expect(tooFew).toBe("MEDIUM");
    expect(tooOld).toBe("MEDIUM");
    expect(tooUniform).toBe("MEDIUM");
  });

  it("is MEDIUM with modest volume and a recent record", () => {
    expect(
      confidenceFor({
        evidenceCount: 2,
        uniqueTypeCount: 1,
        lastEvidenceAt: daysAgo(10),
        asOf: AS_OF,
      }),
    ).toBe("MEDIUM");
  });

  it("is MEDIUM on variety alone, even when the latest record is old", () => {
    expect(
      confidenceFor({
        evidenceCount: 2,
        uniqueTypeCount: 2,
        lastEvidenceAt: daysAgo(400),
        asOf: AS_OF,
      }),
    ).toBe("MEDIUM");
  });

  it("is LOW for a single stale record", () => {
    expect(
      confidenceFor({
        evidenceCount: 1,
        uniqueTypeCount: 1,
        lastEvidenceAt: daysAgo(800),
        asOf: AS_OF,
      }),
    ).toBe("LOW");
  });
});
