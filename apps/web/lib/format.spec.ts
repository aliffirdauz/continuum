import { describe, expect, it } from "vitest";

import { evidenceTypes } from "./api-types";
import {
  evidenceTypeLabels,
  formatDate,
  formatMonth,
  formatPercent,
  initials,
  pluralize,
} from "./format";

describe("formatting", () => {
  it("formats dates in UTC so server output is stable", () => {
    expect(formatDate("2026-08-23T00:00:00.000Z")).toBe("23 Aug 2026");
    expect(formatMonth("2011-03-14T00:00:00.000Z")).toBe("Mar 2011");
  });

  it("formats ratios as whole percentages", () => {
    expect(formatPercent(0.96)).toBe("96%");
    expect(formatPercent(0.555)).toBe("56%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("pluralizes counts", () => {
    expect(pluralize(1, "knowledge area")).toBe("1 knowledge area");
    expect(pluralize(25, "knowledge area")).toBe("25 knowledge areas");
    expect(pluralize(2, "person", "people")).toBe("2 people");
  });

  it("derives initials for avatars", () => {
    expect(initials("Budi Santoso")).toBe("BS");
    expect(initials("Maya")).toBe("M");
  });

  it("labels every evidence type", () => {
    for (const type of evidenceTypes) {
      expect(evidenceTypeLabels[type]).toBeTruthy();
    }
  });
});
