import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RiskBadge, RiskExplanation, RiskOverview } from "./risk-summary";

const risk = {
  knowledgeArea: {
    id: "ka_line",
    name: "Line 4",
    department: { id: "dep_mfg", name: "Manufacturing" },
    businessCriticality: 0.92,
  },
  effectiveExpertCount: 0,
  riskScore: 92,
  riskLevel: "CRITICAL" as const,
  weightedContributions: {
    concentration: 69,
    freshness: 13.8,
    documentationGap: 9.2,
  },
  factors: {
    businessCriticality: 0.92,
    concentration: 1,
    freshness: 1,
    documentationGap: 1,
  },
  formulaVersion: "risk-v1",
  evidenceCount: 0,
  latestEvidenceAgeDays: null,
  latestDocumentationAgeDays: null,
  asOf: "2026-09-01T00:00:00.000Z",
};

describe("risk presentation", () => {
  it("explains all factors, absent evidence and documentation, and point-in-time formula", () => {
    const html = renderToStaticMarkup(<RiskExplanation risk={risk} />);
    expect(html).toContain("Critical");
    expect(html).toContain("92.0");
    expect(html).toContain("Business criticality");
    expect(html).toContain("Concentration");
    expect(html).toContain("Evidence freshness");
    expect(html).toContain("Documentation gap");
    expect(html).toContain("No evidence recorded");
    expect(html).toContain("No documentation recorded");
    expect(html).toContain("v1");
    expect(html).toContain("75% concentration");
    expect(html).toContain("15% freshness");
    expect(html).toContain("10% documentation gap");
    expect(html).toContain("Risk points");
    expect(html).toContain("2026");
    expect(html).not.toMatch(/employee risk|person risk/i);
  });

  it("renders API-provided weighted contributions instead of recalculating them", () => {
    const html = renderToStaticMarkup(
      <RiskExplanation
        risk={{
          ...risk,
          weightedContributions: {
            concentration: 12.3,
            freshness: 4.5,
            documentationGap: 6.7,
          },
        }}
      />,
    );
    expect(html).toContain("12.3 points");
    expect(html).toContain("4.5 points");
    expect(html).toContain("6.7 points");
  });
  it("shows text labels and full-organization distribution even when empty", () => {
    const html = renderToStaticMarkup(
      <RiskOverview
        distribution={{
          asOf: risk.asOf,
          totals: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        }}
      />,
    );
    expect(html).toContain("No knowledge areas scored yet");
    expect(html).toContain("Low");
    expect(html).toContain("Critical");
    expect(
      renderToStaticMarkup(<RiskBadge level="HIGH" score={67.2} />),
    ).toContain("High");
  });
});
