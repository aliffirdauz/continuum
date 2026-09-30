import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ExpertSearchResults } from "./expert-search-results";
import type { ExpertSearch } from "@/lib/api-types";

const matches: ExpertSearch["data"] = [
  {
    knowledgeArea: {
      id: "ka_line4",
      name: "Line 4",
      businessCriticality: 0.95,
      department: { id: "dep_a", name: "Manufacturing" },
    },
    effectiveExpertCount: 1.4,
    topContributors: [
      {
        employee: {
          id: "emp_budi",
          name: "Budi",
          jobTitle: "Engineer",
          status: "ACTIVE",
          department: { id: "dep_a", name: "Manufacturing" },
        },
        expertiseScore: 80,
        confidence: "HIGH",
        evidenceCount: 4,
        lastEvidenceAt: "2026-08-01T00:00:00Z",
        evidenceByType: [],
        evidence: [],
      },
    ],
  },
];

it("disambiguates matched areas and links each contributor in area context", () => {
  const html = renderToStaticMarkup(
    <ExpertSearchResults matches={matches} query="line" total={1} />,
  );
  expect(html).toContain("Line 4");
  expect(html).toContain("Manufacturing");
  expect(html).toContain("/knowledge/ka_line4");
  expect(html).toContain("/people/emp_budi");
  expect(html).toContain("1.4 effective experts");
  expect(html).not.toMatch(/leaderboard|risk level/i);
});

it("renders no-match and initial guidance separately", () => {
  expect(
    renderToStaticMarkup(
      <ExpertSearchResults matches={[]} query="missing" total={0} />,
    ),
  ).toContain("No matching knowledge areas");
  expect(
    renderToStaticMarkup(<ExpertSearchResults matches={[]} total={0} />),
  ).toContain("Search for a knowledge area");
});
