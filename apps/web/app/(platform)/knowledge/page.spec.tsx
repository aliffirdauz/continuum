import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/lib/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet: vi.fn() }));
import { apiGet } from "@/lib/api";
import KnowledgePage from "./page";

it("offers a keyboard-native risk filter and scopes results to the fetched ranked page", async () => {
  vi.mocked(apiGet).mockImplementation(async (path) => {
    if (path === "/knowledge")
      return {
        data: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      };
    if (path === "/departments" || path === "/knowledge/categories")
      return { data: [] };
    if (path === "/dashboard/high-risk-knowledge")
      return {
        asOf: "2026-09-01T00:00:00Z",
        data: [
          {
            knowledgeArea: {
              id: "ka_line",
              name: "Line 4",
              department: { id: "dep_mfg", name: "Manufacturing" },
              businessCriticality: 0.9,
            },
            effectiveExpertCount: 0,
            riskScore: 85,
            riskLevel: "CRITICAL",
          },
          {
            knowledgeArea: {
              id: "ka_other",
              name: "Other",
              department: { id: "dep_mfg", name: "Manufacturing" },
              businessCriticality: 0.8,
            },
            effectiveExpertCount: 1,
            riskScore: 70,
            riskLevel: "HIGH",
          },
        ],
        meta: { page: 1, pageSize: 20, total: 35, totalPages: 2 },
      };
    throw new Error(`Unexpected ${path}`);
  });
  const html = renderToStaticMarkup(
    await KnowledgePage({
      searchParams: Promise.resolve({ risk: "CRITICAL" }),
    }),
  );
  expect(html).toContain('name="risk"');
  expect(html).toContain("Risk-ranked results");
  expect(html).toContain("Line 4");
  expect(html).not.toContain('href="/knowledge/ka_other"');
  expect(html).toContain("ranked page");
  expect(html).not.toContain("1 knowledge area across Northstar");
});
