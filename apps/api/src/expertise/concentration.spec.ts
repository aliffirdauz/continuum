import { effectiveExpertCount, herfindahlIndex } from "./concentration";

describe("herfindahlIndex", () => {
  it("returns 0 when there is no expertise at all", () => {
    expect(herfindahlIndex([])).toBe(0);
    expect(herfindahlIndex([0, 0])).toBe(0);
  });

  it("returns 1 when a single holder has everything", () => {
    expect(herfindahlIndex([10])).toBe(1);
  });
});

describe("effectiveExpertCount", () => {
  it("returns 0 for an empty distribution", () => {
    expect(effectiveExpertCount([])).toBe(0);
    expect(effectiveExpertCount([0, 0, 0])).toBe(0);
  });

  it("returns exactly 1 for a single holder", () => {
    expect(effectiveExpertCount([42])).toBe(1);
  });

  it("returns exactly 2 for two equal holders", () => {
    expect(effectiveExpertCount([50, 50])).toBe(2);
  });

  it("returns exactly 3 for three equal holders", () => {
    expect(effectiveExpertCount([30, 30, 30])).toBe(3);
  });

  it("stays near 3 for a near-even split", () => {
    expect(effectiveExpertCount([33, 33, 34])).toBeCloseTo(3, 2);
  });

  it("stays between 1 and 2 when one holder dominates", () => {
    const count = effectiveExpertCount([92, 24, 3, 2]);

    expect(count).toBeGreaterThan(1);
    expect(count).toBeLessThan(2);
  });

  it("rises as the distribution becomes more even", () => {
    const concentrated = effectiveExpertCount([100, 5, 3, 1]);
    const balanced = effectiveExpertCount([100, 90, 85, 80]);

    expect(balanced).toBeGreaterThan(concentrated);
  });

  it("never exceeds the number of holders", () => {
    expect(effectiveExpertCount([10, 9, 8, 7, 6])).toBeLessThanOrEqual(5);
  });

  it("ignores the scale of the scores and only reads the shares", () => {
    expect(effectiveExpertCount([1, 1, 1])).toBeCloseTo(
      effectiveExpertCount([100, 100, 100]),
      10,
    );
  });
});
