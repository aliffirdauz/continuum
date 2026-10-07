import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet: vi.fn() }));

import { apiGet } from "@/lib/api";
import DashboardPage from "./page";

const asOf = "2026-09-01T00:00:00Z";
const area = {
  id: "ka_line",
  name: "Line 4",
  category: "Operations",
  department: { id: "dep_mfg", name: "Manufacturing" },
  businessCriticality: 0.9,
  contributorCount: 1,
};

describe("dashboard risk overview", () => {
  it("shows organization distribution, department risk, and highest-risk area with links", async () => {
    vi.mocked(apiGet).mockImplementation(async (path) => {
      switch (path) {
        case "/dashboard/summary":
          return {
            totals: {
              departments: 1,
              employees: 1,
              knowledgeAreas: 1,
              businessObjects: 0,
              evidence: 0,
            },
            highCriticalityKnowledgeAreas: 1,
            highCriticalityThreshold: 0.8,
            latestEvidenceAt: null,
          };
        case "/departments":
          return {
            data: [
              {
                id: "dep_mfg",
                name: "Manufacturing",
                knowledgeAreaCount: 1,
                employeeCount: 1,
                businessObjectCount: 0,
              },
            ],
          };
        case "/knowledge":
          return { data: [area] };
        case "/evidence":
          return { data: [] };
        case "/dashboard/risk-distribution":
          return { asOf, totals: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 1 } };
        case "/dashboard/departments-risk":
          return {
            asOf,
            data: [
              {
                department: area.department,
                riskScore: 78,
                riskLevel: "HIGH",
                knowledgeAreaCount: 1,
              },
            ],
          };
        case "/dashboard/high-risk-knowledge":
          return {
            asOf,
            data: [
              {
                knowledgeArea: area,
                effectiveExpertCount: 1,
                riskScore: 85,
                riskLevel: "CRITICAL",
              },
            ],
            meta: { page: 1, pageSize: 6, total: 1, totalPages: 1 },
          };
        default:
          throw new Error(`Unexpected ${path}`);
      }
    });
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain("Knowledge risk distribution");
    expect(html).toContain("Highest-risk knowledge");
    expect(html).toContain("Department risk");
    expect(html).toContain("85.0/100");
    expect(html).toContain("/knowledge/ka_line");
    expect(html).toContain("/knowledge?risk=CRITICAL");
  });
});
