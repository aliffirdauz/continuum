import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet: vi.fn() }));
import { apiGet } from "@/lib/api";
import { requireSession } from "@/lib/session";
import KnowledgeDetailPage from "./page";

it.each([
  [
    "with actual captures",
    "MANAGER",
    [
      {
        id: "snap_1",
        snapshotDate: "2026-09-01T00:00:00.000Z",
        asOf: "2026-09-01T12:00:00.000Z",
        riskScore: 54.4,
        riskLevel: "CRITICAL",
        formulaVersion: "risk-v1",
      },
    ],
  ],
  ["without captures", "EMPLOYEE", []],
] as const)(
  "shows the area risk explanation %s",
  async (_label, role, history) => {
    vi.mocked(requireSession).mockResolvedValue({
      user: { role },
    } as Awaited<ReturnType<typeof requireSession>>);
    vi.mocked(apiGet).mockImplementation(async (path) => {
      if (path === "/knowledge/ka_line")
        return {
          id: "ka_line",
          name: "Line 4",
          description: "Manufacturing line",
          category: "Operations",
          status: "ACTIVE",
          businessCriticality: 0.9,
          department: { id: "dep_mfg", name: "Manufacturing" },
          contributorCount: 0,
          evidenceCount: 0,
          lastEvidenceAt: null,
          evidenceByType: [],
          businessObjects: [],
          contributors: [],
        };
      if (path === "/knowledge/ka_line/evidence")
        return {
          data: [],
          meta: { page: 1, totalPages: 1, total: 0, pageSize: 10 },
        };
      if (path === "/knowledge/ka_line/experts")
        return {
          data: { contributors: [], effectiveExpertCount: 0 },
          meta: { page: 1, totalPages: 1, total: 0, pageSize: 20 },
        };
      if (path === "/knowledge/ka_line/risk/snapshots")
        return {
          data: history,
          meta: { page: 1, totalPages: 1, total: history.length, pageSize: 5 },
        };
      if (path === "/knowledge/ka_line/risk")
        return {
          data: {
            knowledgeArea: {
              id: "ka_line",
              name: "Line 4",
              department: { id: "dep_mfg", name: "Manufacturing" },
              businessCriticality: 0.9,
            },
            effectiveExpertCount: 0,
            riskScore: 85,
            riskLevel: "CRITICAL",
            factors: {
              businessCriticality: 0.9,
              concentration: 1,
              freshness: 1,
              documentationGap: 1,
            },
            formulaVersion: "v1",
            evidenceCount: 0,
            latestEvidenceAgeDays: null,
            latestDocumentationAgeDays: null,
            asOf: "2026-09-01T00:00:00Z",
          },
        };
      throw new Error(`Unexpected ${path}`);
    });
    const html = renderToStaticMarkup(
      await KnowledgeDetailPage({
        params: Promise.resolve({ id: "ka_line" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(html).toContain("Knowledge resilience risk");
    if (history.length) {
      expect(html).toContain("Captured risk snapshots");
      expect(html).toContain("54.4/100");
    } else {
      expect(html).not.toContain("Captured risk snapshots");
    }
    expect(html).toContain("Documentation gap");
    expect(html).toContain("Expertise coverage");
    expect(html).toContain("No evidence to show");
    // Only managers and knowledge admins can start a transfer plan.
    if (role === "MANAGER") {
      expect(html).toContain('href="/transfers/new?knowledgeArea=ka_line"');
    } else {
      expect(html).not.toContain("Plan knowledge transfer");
    }
  },
);
