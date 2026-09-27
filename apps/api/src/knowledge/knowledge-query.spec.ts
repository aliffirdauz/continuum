import { buildKnowledgeOrderBy, buildKnowledgeWhere } from "./knowledge-query";

describe("buildKnowledgeWhere", () => {
  it("leaves absent filters undefined so Prisma ignores them", () => {
    expect(buildKnowledgeWhere({})).toEqual({
      departmentId: undefined,
      category: undefined,
      status: undefined,
    });
  });

  it("combines exact filters with a case-insensitive text search", () => {
    expect(
      buildKnowledgeWhere({
        search: "line 4",
        departmentId: "dep_manufacturing",
        category: "Manufacturing Operations",
        status: "ACTIVE",
      }),
    ).toEqual({
      departmentId: "dep_manufacturing",
      category: "Manufacturing Operations",
      status: "ACTIVE",
      OR: [
        { name: { contains: "line 4", mode: "insensitive" } },
        { description: { contains: "line 4", mode: "insensitive" } },
      ],
    });
  });
});

describe("buildKnowledgeOrderBy", () => {
  it("sorts by criticality from high to low by default with a name tiebreaker", () => {
    expect(buildKnowledgeOrderBy({ sort: "criticality" })).toEqual([
      { businessCriticality: "desc" },
      { name: "asc" },
    ]);
  });

  it("sorts by name alphabetically by default", () => {
    expect(buildKnowledgeOrderBy({ sort: "name" })).toEqual([{ name: "asc" }]);
  });

  it("honors an explicit order", () => {
    expect(
      buildKnowledgeOrderBy({ sort: "criticality", order: "asc" }),
    ).toEqual([{ businessCriticality: "asc" }, { name: "asc" }]);
    expect(buildKnowledgeOrderBy({ sort: "name", order: "desc" })).toEqual([
      { name: "desc" },
    ]);
  });
});
