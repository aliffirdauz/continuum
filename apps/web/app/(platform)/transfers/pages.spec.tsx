import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const { apiGet, requireSession } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  requireSession: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ apiGet }));
vi.mock("@/lib/session", () => ({ requireSession }));
vi.mock("./actions", () => ({
  createTransfer: vi.fn(),
  updateTransferStatus: vi.fn(),
  addTransferActivity: vi.fn(),
  completeTransferActivity: vi.fn(),
}));
import TransferPlanPage from "./[id]/page";
import NewTransferPage from "./new/page";
import TransfersPage from "./page";

const person = (id: string, name: string) => ({
  id,
  name,
  jobTitle: "Engineer",
  department: { id: "dep_mfg", name: "Manufacturing" },
});
const summary = {
  id: "plan_1",
  status: "IN_PROGRESS",
  knowledgeArea: {
    id: "ka_line",
    name: "Line 4",
    department: { id: "dep_mfg", name: "Manufacturing" },
    businessCriticality: 0.96,
  },
  primaryHolder: person("emp_budi", "Budi Santoso"),
  backupEmployee: person("emp_andri", "Andri Pratama"),
  coverage: {
    baseline: 18.3,
    current: 46.1,
    target: 70,
    progress: 53.8,
    targetMet: false,
  },
  risk: {
    riskScore: 39.3,
    riskLevel: "HIGH",
    effectiveExpertCount: 1.91,
    formulaVersion: "risk-v1",
  },
  activities: { total: 5, completed: 4 },
  targetDate: "2026-12-31",
  startedAt: "2026-10-08T09:00:00.000Z",
  completedAt: null,
  createdAt: "2026-10-08T08:00:00.000Z",
};
const detail = {
  ...summary,
  activities: [
    {
      id: "act_done",
      type: "SHADOW_SESSION",
      title: "Shadow a conveyor restart",
      description: null,
      status: "COMPLETED",
      weight: 1,
      completedAt: "2026-10-08T09:00:00.000Z",
      createdAt: "2026-10-08T08:30:00.000Z",
      evidence: {
        id: "ev_1",
        type: "TRAINING_COMPLETED",
        occurredAt: "2026-10-08T09:00:00.000Z",
      },
    },
    {
      id: "act_open",
      type: "PAIR_WORK",
      title: "Pair on a PLC fault",
      description: null,
      status: "PLANNED",
      weight: 0.8,
      completedAt: null,
      createdAt: "2026-10-08T08:40:00.000Z",
      evidence: null,
    },
  ],
  checkpoints: [
    {
      id: "cp_0",
      activityId: null,
      capturedAt: "2026-10-08T08:00:00.000Z",
      backupScore: 18.3,
      primaryHolderScore: 93.2,
      effectiveExpertCount: 1.49,
      riskScore: 56.9,
      riskLevel: "CRITICAL",
      formulaVersion: "risk-v1",
      mappingVersion: "transfer-v1",
    },
    {
      id: "cp_1",
      activityId: "act_done",
      capturedAt: "2026-10-08T09:00:00.000Z",
      backupScore: 23.6,
      primaryHolderScore: 93.2,
      effectiveExpertCount: 1.59,
      riskScore: 53.3,
      riskLevel: "CRITICAL",
      formulaVersion: "risk-v1",
      mappingVersion: "transfer-v1",
    },
  ],
  recommendations: {
    band: "PRACTICE",
    recommendations: [
      {
        activityType: "PAIR_WORK",
        label: "Pair on real work with the primary holder",
      },
    ],
  },
  mappingVersion: "transfer-v1",
  asOf: "2026-10-08T10:00:00.000Z",
};
const role = (value: string) =>
  requireSession.mockResolvedValue({ user: { role: value } });

beforeEach(() => {
  vi.resetAllMocks();
  role("MANAGER");
});

it("lists plans with coverage and risk, and offers creation only to writers", async () => {
  apiGet.mockResolvedValue({
    data: [summary],
    meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
  });
  const html = renderToStaticMarkup(
    await TransfersPage({
      searchParams: Promise.resolve({ status: "IN_PROGRESS" }),
    }),
  );
  expect(apiGet).toHaveBeenCalledWith("/transfers", {
    status: "IN_PROGRESS",
    page: 1,
    pageSize: 20,
  });
  expect(html).toContain("Budi Santoso → Andri Pratama");
  expect(html).toContain("18.3 → 46.1");
  expect(html).toContain("4 of 5 activities completed");
  expect(html).toContain('href="/transfers/new"');
  expect(html).not.toMatch(/performance rating|rank/i);
  role("EMPLOYEE");
  apiGet.mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  });
  const empty = renderToStaticMarkup(
    await TransfersPage({ searchParams: Promise.resolve({}) }),
  );
  expect(empty).toContain("No transfer plans yet");
  expect(empty).not.toContain('href="/transfers/new"');
});

it("shows progress history, recommendations, and write controls to managers", async () => {
  apiGet.mockResolvedValue({ data: detail });
  const html = renderToStaticMarkup(
    await TransferPlanPage({ params: Promise.resolve({ id: "plan_1" }) }),
  );
  expect(html).toContain("Plan created (baseline)");
  expect(html).toContain("Completed: Shadow a conveyor restart");
  expect(html).toContain("Critical · 56.9/100");
  expect(html).toContain("Guided practice");
  expect(html).toContain("Mark completed");
  expect(html).toContain("Complete plan");
  expect(html).toContain("Add activity");
  expect(html).toContain("evidence recorded");
});

it("keeps employees read-only and hides planning on completed plans", async () => {
  role("EMPLOYEE");
  apiGet.mockResolvedValue({ data: detail });
  const readOnly = renderToStaticMarkup(
    await TransferPlanPage({ params: Promise.resolve({ id: "plan_1" }) }),
  );
  expect(readOnly).toContain("Progress history");
  expect(readOnly).not.toContain("Mark completed");
  expect(readOnly).not.toContain("Add activity");
  role("MANAGER");
  apiGet.mockResolvedValue({
    data: {
      ...detail,
      status: "COMPLETED",
      completedAt: "2026-10-09T00:00:00.000Z",
    },
  });
  const completed = renderToStaticMarkup(
    await TransferPlanPage({ params: Promise.resolve({ id: "plan_1" }) }),
  );
  expect(completed).not.toContain("Recommended next activities");
  expect(completed).not.toContain("Mark completed");
  expect(completed).not.toContain("Add activity");
});

it("guides area choice, preselects the simulated holder, and disables backups with open plans", async () => {
  apiGet.mockImplementation(async (path: string) =>
    path === "/knowledge"
      ? {
          data: [
            {
              id: "ka_line",
              name: "Line 4",
              department: { id: "dep_mfg", name: "Manufacturing" },
            },
          ],
          meta: {},
        }
      : {
          data: {
            knowledgeArea: summary.knowledgeArea,
            holders: [
              {
                employee: person("emp_budi", "Budi Santoso"),
                expertiseScore: 93.2,
                openPlanId: null,
              },
              {
                employee: person("emp_andri", "Andri Pratama"),
                expertiseScore: 18.3,
                openPlanId: "plan_1",
              },
            ],
            candidates: [
              {
                employee: person("emp_andri", "Andri Pratama"),
                expertiseScore: 18.3,
                openPlanId: "plan_1",
              },
              {
                employee: person("emp_joko", "Joko Susilo"),
                expertiseScore: 2.7,
                openPlanId: null,
              },
            ],
            asOf: "2026-10-08T00:00:00.000Z",
          },
        },
  );
  const chooser = renderToStaticMarkup(
    await NewTransferPage({ searchParams: Promise.resolve({}) }),
  );
  expect(chooser).toContain("Choose a knowledge area");
  expect(chooser).not.toContain("Create transfer plan");
  const html = renderToStaticMarkup(
    await NewTransferPage({
      searchParams: Promise.resolve({
        knowledgeArea: "ka_line",
        primary: "emp_andri",
      }),
    }),
  );
  expect(apiGet).toHaveBeenCalledWith("/knowledge/ka_line/transfer-candidates");
  expect(html).toMatch(
    /<option value="emp_andri" selected="">Andri Pratama · Engineer · coverage 18\.3/,
  );
  expect(html).toMatch(
    /<option value="emp_andri" disabled="">[^<]*already has an open plan/,
  );
  expect(html).toContain("Create transfer plan");
  role("EMPLOYEE");
  const denied = renderToStaticMarkup(
    await NewTransferPage({ searchParams: Promise.resolve({}) }),
  );
  expect(denied).toContain("created by managers and knowledge admins");
});
