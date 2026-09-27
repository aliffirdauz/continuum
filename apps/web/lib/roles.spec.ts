import { describe, expect, it } from "vitest";

import { roleLabels } from "./roles";

describe("roleLabels", () => {
  it("provides a user-facing label for every supported role", () => {
    expect(Object.keys(roleLabels)).toEqual([
      "EMPLOYEE",
      "MANAGER",
      "KNOWLEDGE_ADMIN",
    ]);
  });
});
