import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const { apiGet, requireSession } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  requireSession: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ apiGet }));
vi.mock("@/lib/session", () => ({ requireSession }));
import SimulationResultPage from "./page";

const run = {
  data: {
    id: "sim_123",
    employee: { id: "emp_budi", name: "Budi Santoso" },
    startedAt: "2026-10-01T00:00:00.000Z",
    horizonAt: "2026-10-31T00:00:00.000Z",
    durationDays: 30,
    formulaVersion: "risk-v1",
    coverageFormulaVersion: "coverage-v1",
    summary: {
      affectedAreas: 1,
      affectedObjects: 1,
      beforeCoverage: 38.9,
      afterCoverage: 7.6,
    },
    areas: [
      {
        knowledgeArea: {
          id: "ka_line",
          name: "Production Line 4 Troubleshooting",
          department: { id: "dep_mfg", name: "Manufacturing" },
        },
        before: {
          riskScore: 54.4,
          riskLevel: "CRITICAL",
          effectiveExpertCount: 1.49,
          coverage: 38.9,
        },
        after: {
          riskScore: 54.1,
          riskLevel: "CRITICAL",
          effectiveExpertCount: 1.5,
          coverage: 7.6,
        },
        businessObjects: [
          {
            id: "obj_line",
            name: "Production Line 4",
            type: "MACHINE",
            criticality: 0.9,
            impactWeight: 0.8,
          },
        ],
      },
    ],
    objects: [
      {
        id: "obj_line",
        name: "Production Line 4",
        type: "MACHINE",
        criticality: 0.9,
        affectedAreaIds: ["ka_line"],
      },
    ],
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  requireSession.mockResolvedValue({ user: { role: "MANAGER" } });
  apiGet.mockImplementation(async (path: string) =>
    path === "/departments"
      ? { data: [{ id: "dep_mfg", name: "Manufacturing" }] }
      : run,
  );
});

it("renders revisitable same-horizon area comparison and linked business objects without rating an employee", async () => {
  const html = renderToStaticMarkup(
    await SimulationResultPage({
      params: Promise.resolve({ id: "sim_123" }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(apiGet).toHaveBeenCalledWith(
    "/simulations/sim_123",
    expect.any(Object),
  );
  expect(html).toContain("Budi Santoso");
  expect(html).toContain("38.9%");
  expect(html).toContain("7.6%");
  expect(html).toContain("54.4");
  expect(html).toContain("54.1");
  expect(html).toContain("1.49");
  expect(html).toContain("1.50");
  expect(html).toContain('href="/knowledge/ka_line"');
  expect(html).toContain("Production Line 4");
  expect(html).toContain("same future horizon");
  expect(html).not.toMatch(/employee (score|rating|performance)/i);
});

it("shows a no-affected-areas state without fabricated impacts", async () => {
  apiGet.mockImplementation(async (path: string) =>
    path === "/departments"
      ? { data: [{ id: "dep_mfg", name: "Manufacturing" }] }
      : {
          data: {
            ...run.data,
            summary: {
              affectedAreas: 0,
              affectedObjects: 0,
              beforeCoverage: 0,
              afterCoverage: 0,
            },
            areas: [],
            objects: [],
          },
        },
  );
  const html = renderToStaticMarkup(
    await SimulationResultPage({
      params: Promise.resolve({ id: "sim_empty" }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(html).toContain("No affected knowledge areas");
  expect(html).not.toContain("Production Line 4 Troubleshooting");
});

it("uses API area pagination metadata for next and previous links", async () => {
  apiGet.mockImplementation(async (path: string) =>
    path === "/departments"
      ? { data: [{ id: "dep_mfg", name: "Manufacturing" }] }
      : {
          ...run,
          meta: {
            page: 1,
            pageSize: 20,
            areasTotal: 45,
            objectsTotal: 1,
            areasTotalPages: 3,
            objectsTotalPages: 1,
          },
        },
  );
  const html = renderToStaticMarkup(
    await SimulationResultPage({
      params: Promise.resolve({ id: "sim_123" }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(html).toContain("Page 1 of 3");
  expect(html).toContain('href="/simulate/sim_123?page=2"');
});

it("keeps API-filtered objects even when their linked area is on another page", async () => {
  apiGet.mockImplementation(async (path: string) =>
    path === "/departments"
      ? { data: [{ id: "dep_mfg", name: "Manufacturing" }] }
      : {
          data: { ...run.data, areas: [], objects: run.data.objects },
          meta: {
            page: 2,
            pageSize: 20,
            areasTotal: 1,
            objectsTotal: 21,
            areasTotalPages: 1,
            objectsTotalPages: 2,
          },
        },
  );
  const html = renderToStaticMarkup(
    await SimulationResultPage({
      params: Promise.resolve({ id: "sim_123" }),
      searchParams: Promise.resolve({ department: "dep_mfg", page: "2" }),
    }),
  );
  expect(apiGet).toHaveBeenCalledWith("/simulations/sim_123", {
    departmentId: "dep_mfg",
    page: 2,
    pageSize: 20,
  });
  expect(html).toContain("Connected business objects");
  expect(html).toContain("Production Line 4");
  expect(html).toContain("No knowledge areas on this page");
});

it("offers department filters beyond the current result page", async () => {
  apiGet.mockImplementation(async (path: string) =>
    path === "/departments"
      ? {
          data: [
            { id: "dep_mfg", name: "Manufacturing" },
            { id: "dep_eng", name: "Engineering" },
          ],
        }
      : run,
  );
  const html = renderToStaticMarkup(
    await SimulationResultPage({
      params: Promise.resolve({ id: "sim_123" }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(html).toContain('href="/simulate/sim_123?department=dep_eng"');
});

it("does not retrieve another manager's run for a viewer", async () => {
  requireSession.mockResolvedValue({ user: { role: "VIEWER" } });
  const html = renderToStaticMarkup(
    await SimulationResultPage({
      params: Promise.resolve({ id: "sim_123" }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(html).toContain("managers and knowledge admins");
  expect(apiGet).not.toHaveBeenCalled();
});
