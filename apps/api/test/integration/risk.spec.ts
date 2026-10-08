export {};
const base = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";
const asOf = "2026-09-01T00:00:00Z";
let employeeToken: string;
let adminToken: string;
async function login(email: string) {
  const result = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: process.env.DEMO_USER_PASSWORD ?? "ContinuumDemo123!",
    }),
  });
  expect(result.status).toBe(201);
  return ((await result.json()) as { accessToken: string }).accessToken;
}
function request(path: string, token = employeeToken, method = "GET") {
  return fetch(`${base}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
beforeAll(async () => {
  employeeToken = await login("employee@northstar.demo");
  adminToken = await login("admin@northstar.demo");
});
describe("risk API", () => {
  const paths = [
    "/dashboard/risk-overview",
    "/knowledge/ka_line4_troubleshooting/risk",
    "/dashboard/risk-distribution",
    "/dashboard/departments-risk",
    "/dashboard/high-risk-knowledge",
  ];
  it.each(paths)("protects %s", async (path) => {
    expect((await request(path, "")).status).toBe(401);
    expect((await request(path, "invalid")).status).toBe(401);
  });
  it("rejects invalid dates, page sizes, IDs, and unknown areas", async () => {
    expect((await request("/knowledge/ka_missing/risk")).status).toBe(404);
    expect((await request("/knowledge/bad!/risk")).status).toBe(400);
    expect(
      (await request("/dashboard/risk-distribution?asOf=bad")).status,
    ).toBe(400);
    expect(
      (await request("/dashboard/high-risk-knowledge?pageSize=101")).status,
    ).toBe(400);
  });
  it("returns calibrated seeded scenarios, distribution, deterministic pagination, and department averages", async () => {
    const knowledge = await request(
      `/knowledge/ka_line4_troubleshooting/risk?asOf=${asOf}`,
    );
    expect(knowledge.status).toBe(200);
    const result = (await knowledge.json()) as {
      data: {
        riskLevel: string;
        riskScore: number;
        effectiveExpertCount: number;
        evidenceCount: number;
        formulaVersion: string;
        asOf: string;
        factors: { concentration: number };
        weightedContributions: {
          concentration: number;
          freshness: number;
          documentationGap: number;
        };
      };
    };
    expect(result.data).toMatchObject({
      riskLevel: "CRITICAL",
      formulaVersion: "risk-v1",
      asOf: new Date(asOf).toISOString(),
    });
    expect(result.data.riskScore).toBeGreaterThan(50);
    expect(result.data.weightedContributions.concentration).toBeGreaterThan(50);
    expect(result.data.weightedContributions.freshness).toBe(0);
    expect(result.data.weightedContributions.documentationGap).toBe(0);
    expect(result.data.effectiveExpertCount).toBeCloseTo(1.49, 1);
    expect(result.data.evidenceCount).toBeGreaterThan(0);
    const distribution = await request(
      `/dashboard/risk-distribution?asOf=${asOf}`,
    );
    expect(distribution.status).toBe(200);
    const totals = (await distribution.json()) as {
      asOf: string;
      totals: Record<string, number>;
    };
    expect(totals.asOf).toBe(new Date(asOf).toISOString());
    expect(Object.keys(totals.totals).sort()).toEqual([
      "CRITICAL",
      "HIGH",
      "LOW",
      "MEDIUM",
    ]);
    const first = await request(
      `/dashboard/high-risk-knowledge?asOf=${asOf}&page=1&pageSize=1`,
    );
    const second = await request(
      `/dashboard/high-risk-knowledge?asOf=${asOf}&page=2&pageSize=1`,
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const page = (await first.json()) as {
      data: Array<{ knowledgeArea: { id: string } }>;
      meta: { total: number; totalPages: number };
    };
    const next = (await second.json()) as typeof page;
    expect(page.meta.total).toBeGreaterThan(1);
    expect(page.data[0]?.knowledgeArea.id).not.toBe(
      next.data[0]?.knowledgeArea.id,
    );
    const overview = await request(`/dashboard/risk-overview?asOf=${asOf}`);
    expect(overview.status).toBe(200);
    expect(await overview.json()).toMatchObject({ totalKnowledgeAreas: 25 });
    const departments = await request(
      `/dashboard/departments-risk?asOf=${asOf}`,
    );
    expect(departments.status).toBe(200);
    expect(
      ((await departments.json()) as { data: unknown[] }).data.length,
    ).toBeGreaterThan(0);
  });
  it.each([
    ["ka_month_end_closing", "MEDIUM", 13.8, "documentationGap", 0.25],
    ["ka_authentication_service", "LOW", 0.2, "documentationGap", 0],
    ["ka_legacy_supplier_import", "HIGH", 39.4, "documentationGap", 1],
    ["ka_bank_reconciliation", "MEDIUM", 23.5, "documentationGap", 1],
  ] as const)(
    "matches the seeded %s calibration",
    async (id, level, score, factor, expectedFactor) => {
      const response = await request(`/knowledge/${id}/risk?asOf=${asOf}`);
      expect(response.status).toBe(200);
      const { data } = (await response.json()) as {
        data: {
          riskScore: number;
          riskLevel: string;
          factors: Record<string, number>;
        };
      };
      expect(data.riskLevel).toBe(level);
      expect(data.riskScore).toBeCloseTo(score, 0);
      expect(data.factors[factor]).toBe(expectedFactor);
    },
  );
  it("separates read-only GET from admin-only, idempotent snapshot capture and stored history", async () => {
    const path = "/knowledge/ka_line4_troubleshooting/risk/snapshots";
    const before = await request(path);
    expect(before.status).toBe(200);
    const count = ((await before.json()) as { meta: { total: number } }).meta
      .total;
    const noWrite = await request(
      `/knowledge/ka_line4_troubleshooting/risk?asOf=${asOf}`,
    );
    expect(noWrite.status).toBe(200);
    const unchanged = await request(path);
    expect(
      ((await unchanged.json()) as { meta: { total: number } }).meta.total,
    ).toBe(count);
    expect(
      (await request(`${path}?asOf=2020-01-01T00:00:00Z`, adminToken, "POST"))
        .status,
    ).toBe(400);
    expect((await request(path, "", "POST")).status).toBe(401);
    expect((await request(path, employeeToken, "POST")).status).toBe(403);
    const captured = await request(path, adminToken, "POST");
    expect(captured.status).toBe(201);
    const snapshot = (await captured.json()) as {
      id: string;
      asOf: string;
      snapshotDate: string;
      factors: { concentration: number };
    };
    expect(snapshot.factors.concentration).toBeGreaterThan(0);
    const repeated = await request(path, adminToken, "POST");
    expect(repeated.status).toBe(201);
    expect(((await repeated.json()) as { id: string }).id).toBe(snapshot.id);
    const after = await request(path);
    expect(
      ((await after.json()) as { meta: { total: number } }).meta.total,
    ).toBeGreaterThanOrEqual(count);
    expect((await request(`${path}?pageSize=101`)).status).toBe(400);
  });
});

describe("highest-risk primary holders", () => {
  it("names the person holding most of each area's expertise", async () => {
    const response = await request(
      `/dashboard/high-risk-knowledge?asOf=${asOf}&pageSize=25`,
    );
    expect(response.status).toBe(200);
    const { data } = (await response.json()) as {
      data: Array<{
        knowledgeArea: { id: string };
        primaryHolder: { id: string; name: string } | null;
      }>;
    };
    const line4 = data.find(
      ({ knowledgeArea }) => knowledgeArea.id === "ka_line4_troubleshooting",
    );
    expect(line4?.primaryHolder).toEqual({
      id: "emp_budi",
      name: "Budi Santoso",
    });
    expect(JSON.stringify(data)).not.toMatch(/rank|score":\s*\{/i);
  });
});
