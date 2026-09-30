import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ExpertiseCoverage } from "./expertise-coverage";
import type { ExpertiseContributor } from "@/lib/api-types";

const contributor: ExpertiseContributor = {
  employee: {
    id: "emp_budi",
    name: "Budi Santoso",
    jobTitle: "Engineer",
    status: "ACTIVE",
    department: { id: "dep_manufacturing", name: "Manufacturing" },
  },
  expertiseScore: 84.6,
  confidence: "HIGH",
  evidenceCount: 2,
  lastEvidenceAt: "2026-08-01T00:00:00Z",
  evidenceByType: [{ type: "INCIDENT_RESOLVED", count: 2 }],
  evidence: [
    {
      id: "ev_1",
      type: "INCIDENT_RESOLVED",
      title: "Restored line",
      occurredAt: "2026-08-01T00:00:00Z",
      strength: 0.9,
      weight: 1,
      recencyMultiplier: 1,
      contribution: 0.9,
    },
  ],
};

describe("ExpertiseCoverage", () => {
  it("explains coverage using score, evidence breakdown, and linked contributor", () => {
    const html = renderToStaticMarkup(
      <ExpertiseCoverage
        contributors={[contributor]}
        effectiveExpertCount={1.4}
        total={1}
      />,
    );
    expect(html).toContain("1.4 effective experts");
    expect(html).toContain("/people/emp_budi");
    expect(html).toContain("84.6");
    expect(html).toContain("High confidence");
    expect(html).toContain("Incident resolved");
    expect(html).toContain("Restored line");
    expect(html).toContain("0.9");
    expect(html).not.toMatch(/risk level|leaderboard/i);
  });

  it("explains what no recorded expertise means", () => {
    const html = renderToStaticMarkup(
      <ExpertiseCoverage
        contributors={[]}
        effectiveExpertCount={0}
        total={0}
      />,
    );
    expect(html).toContain("No expertise evidence yet");
    expect(html).toContain("0 effective experts");
  });
});
