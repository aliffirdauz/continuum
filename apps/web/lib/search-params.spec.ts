import { describe, expect, it } from "vitest";

import {
  buildHref,
  isResourceId,
  parseId,
  parseOption,
  parsePage,
  parseText,
} from "./search-params";

describe("search parameter parsing", () => {
  it("accepts only positive whole page numbers", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2", "5"])).toBe(2);

    for (const invalid of [undefined, "", "0", "-1", "1.5", "abc", "10001"]) {
      expect(parsePage(invalid)).toBe(1);
    }
  });

  it("trims and bounds free text, dropping blank values", () => {
    expect(parseText("  line 4 ")).toBe("line 4");
    expect(parseText("   ")).toBeUndefined();
    expect(parseText(undefined)).toBeUndefined();
    expect(parseText("x".repeat(150))).toHaveLength(100);
  });

  it("drops malformed identifiers before they reach the API", () => {
    expect(parseId("dep_manufacturing")).toBe("dep_manufacturing");
    expect(parseId("")).toBeUndefined();
    expect(parseId("../admin")).toBeUndefined();
    expect(isResourceId("ka_line4_troubleshooting")).toBe(true);
    expect(isResourceId("ka line4")).toBe(false);
  });

  it("accepts only listed options", () => {
    const options = ["criticality", "name"] as const;

    expect(parseOption("name", options)).toBe("name");
    expect(parseOption("risk", options)).toBeUndefined();
  });
});

describe("buildHref", () => {
  it("keeps set parameters and omits empty values and the first page", () => {
    expect(
      buildHref("/knowledge", {
        q: "line 4",
        department: undefined,
        category: "",
        sort: "criticality",
        page: 1,
      }),
    ).toBe("/knowledge?q=line+4&sort=criticality");
    expect(buildHref("/people", { page: 2 })).toBe("/people?page=2");
    expect(buildHref("/people", {})).toBe("/people");
  });
});
