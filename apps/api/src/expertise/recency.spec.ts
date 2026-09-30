import {
  ageInDays,
  bandMultiplier,
  isOnOrBefore,
  recencyMultiplier,
} from "./recency";

const AS_OF = new Date("2026-09-01T00:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(AS_OF.getTime() - days * 86_400_000);
}

describe("ageInDays", () => {
  it("returns 0 for same-day evidence", () => {
    expect(ageInDays(AS_OF, AS_OF)).toBe(0);
  });

  it("counts whole days and floors partial ones", () => {
    expect(ageInDays(daysAgo(30), AS_OF)).toBe(30);
    expect(ageInDays(daysAgo(30.5), AS_OF)).toBe(30);
  });

  it("never returns a negative age for future evidence", () => {
    expect(ageInDays(daysAgo(-10), AS_OF)).toBe(0);
  });
});

describe("isOnOrBefore", () => {
  it("accepts evidence dated exactly on the reference date", () => {
    expect(isOnOrBefore(AS_OF, AS_OF)).toBe(true);
  });

  it("rejects evidence dated after the reference date", () => {
    expect(isOnOrBefore(daysAgo(-1), AS_OF)).toBe(false);
  });
});

describe("bandMultiplier", () => {
  it("applies the spec section 11 bands at their inclusive boundaries", () => {
    expect(bandMultiplier(0)).toBe(1.0);
    expect(bandMultiplier(90)).toBe(1.0);
    expect(bandMultiplier(91)).toBe(0.9);
    expect(bandMultiplier(180)).toBe(0.9);
    expect(bandMultiplier(181)).toBe(0.75);
    expect(bandMultiplier(365)).toBe(0.75);
    expect(bandMultiplier(366)).toBe(0.55);
    expect(bandMultiplier(730)).toBe(0.55);
    expect(bandMultiplier(731)).toBe(0.35);
    expect(bandMultiplier(5000)).toBe(0.35);
  });

  it("decreases monotonically with age", () => {
    const ages = [0, 90, 91, 180, 181, 365, 366, 730, 731, 5000];
    const values = ages.map(bandMultiplier);

    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]!).toBeLessThanOrEqual(values[index - 1]!);
    }
  });
});

describe("recencyMultiplier", () => {
  it("returns exactly 1 for same-day evidence", () => {
    expect(recencyMultiplier(AS_OF, AS_OF, 0.05)).toBe(1);
  });

  it("returns 1 at every decay rate when the rate is 0", () => {
    expect(recencyMultiplier(daysAgo(3000), AS_OF, 0)).toBe(1);
  });

  it("applies the band in full once the decay rate reaches full severity", () => {
    // A rate of 0.05 maps to severity 1 with DECAY_SENSITIVITY 20.
    expect(recencyMultiplier(daysAgo(800), AS_OF, 0.05)).toBe(0.35);
    expect(recencyMultiplier(daysAgo(200), AS_OF, 0.05)).toBe(0.75);
  });

  it("reduces the band penalty for a lower decay rate", () => {
    const severe = recencyMultiplier(daysAgo(800), AS_OF, 0.05);
    const mild = recencyMultiplier(daysAgo(800), AS_OF, 0.02);

    expect(mild).toBeGreaterThan(severe);
    expect(mild).toBeLessThan(1);
  });

  it("separates aged evidence from fresh evidence", () => {
    const fresh = recencyMultiplier(daysAgo(20), AS_OF, 0.05);
    const aged = recencyMultiplier(daysAgo(900), AS_OF, 0.05);

    expect(fresh).toBe(1.0);
    expect(aged).toBeLessThan(fresh);
  });

  it("never reaches zero and stays deterministic", () => {
    const veryOld = recencyMultiplier(daysAgo(100_000), AS_OF, 0.05);

    expect(veryOld).toBeGreaterThan(0);
    expect(recencyMultiplier(daysAgo(400), AS_OF, 0.03)).toBe(
      recencyMultiplier(daysAgo(400), AS_OF, 0.03),
    );
  });
});
