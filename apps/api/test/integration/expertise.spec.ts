export {};
const base = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";
const asOf = "2026-09-01T00:00:00Z";
let token: string;
async function get(path: string, auth = token) {
  return fetch(`${base}${path}`, {
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
  });
}
async function json<T>(path: string): Promise<T> {
  const response = await get(path);
  expect(response.status, path).toBe(200);
  return response.json() as Promise<T>;
}
beforeAll(async () => {
  const login = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "employee@northstar.demo",
      password: process.env.DEMO_USER_PASSWORD ?? "ContinuumDemo123!",
    }),
  });
  expect(login.status).toBe(201);
  token = ((await login.json()) as { accessToken: string }).accessToken;
});

describe("expertise endpoints against seeded API", () => {
  const paths = [
    "/knowledge/ka_line4_troubleshooting/experts",
    "/employees/emp_budi/expertise",
    "/expert-search?q=line",
  ];
  it.each(paths)("protects %s", async (path) => {
    expect((await get(path, "")).status).toBe(401);
    expect((await get(path, "invalid")).status).toBe(401);
  });
  it.each([
    "/knowledge/ka_missing/experts",
    "/employees/emp_missing/expertise",
  ])("returns 404 for %s", async (path) => {
    expect((await get(path)).status).toBe(404);
  });
  it.each([
    "/expert-search",
    "/expert-search?q=%20",
    "/expert-search?q=line&asOf=bad",
    "/knowledge/ka_line4_troubleshooting/experts?pageSize=101",
    "/employees/emp_budi/expertise?asOf=2026-02-30T00:00:00Z",
  ])("rejects invalid %s", async (path) => {
    expect((await get(path)).status).toBe(400);
  });
  it("explains real evidence and paginates while concentration remains based on all holders", async () => {
    type Result = {
      data: {
        effectiveExpertCount: number;
        totalExpertise: number;
        contributors: Array<{
          employee: { id: string };
          expertiseScore: number;
          evidence: Array<{ id: string; contribution: number }>;
        }>;
      };
      meta: { total: number; page: number; totalPages: number; asOf: string };
    };
    const full = await json<Result>(
      `/knowledge/ka_line4_troubleshooting/experts?asOf=${asOf}`,
    );
    const page = await json<Result>(
      `/knowledge/ka_line4_troubleshooting/experts?asOf=${asOf}&pageSize=1&page=2`,
    );
    expect(full.meta.total).toBe(4);
    expect(full.data.contributors[0]?.employee.id).toBe("emp_budi");
    expect(full.data.effectiveExpertCount).toBeGreaterThan(1);
    expect(full.data.effectiveExpertCount).toBeLessThan(2);
    expect(page.meta.totalPages).toBe(4);
    expect(page.data.contributors).toHaveLength(1);
    expect(page.data.effectiveExpertCount).toBe(full.data.effectiveExpertCount);
    expect(full.data.contributors[0]?.evidence[0]?.id).toMatch(/^ev_/);
  });
  it("matches the seeded concentration scenarios at an explicit reference date", async () => {
    const ids = [
      "ka_line4_troubleshooting",
      "ka_month_end_closing",
      "ka_authentication_service",
    ];
    const counts = await Promise.all(
      ids.map(async (id) => {
        const result = await json<{
          data: {
            effectiveExpertCount: number;
            contributors: Array<{ employee: { id: string } }>;
          };
        }>(`/knowledge/${id}/experts?asOf=${asOf}`);
        return result.data;
      }),
    );

    expect(counts[0]?.effectiveExpertCount).toBeCloseTo(1.49, 1);
    expect(counts[1]?.effectiveExpertCount).toBeCloseTo(2.66, 1);
    expect(counts[2]?.effectiveExpertCount).toBeCloseTo(2.99, 1);
    expect(counts[0]?.contributors[0]?.employee.id).toBe("emp_budi");
    expect(counts[1]?.contributors.map(({ employee }) => employee.id)).toEqual([
      "emp_sarah",
      "emp_nadia",
      "emp_fajar",
    ]);
    expect(counts[2]?.contributors.map(({ employee }) => employee.id)).toEqual([
      "emp_kevin",
      "emp_raka",
      "emp_dina",
    ]);
  });
  it("omits evidence after asOf and returns zero coverage before all evidence", async () => {
    const result = await json<{
      data: { effectiveExpertCount: number; contributors: unknown[] };
      meta: { total: number };
    }>("/knowledge/ka_line4_troubleshooting/experts?asOf=2020-01-01T00:00:00Z");
    expect(result.data.effectiveExpertCount).toBe(0);
    expect(result.data.contributors).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
  it("returns empty known-person and deterministic area search", async () => {
    const empty = await json<{ data: unknown[]; meta: { total: number } }>(
      `/employees/emp_ayu/expertise?asOf=${asOf}`,
    );
    expect(empty.data).toEqual([]);
    expect(empty.meta.total).toBe(0);
    const result = await json<{
      data: Array<{
        knowledgeArea: { id: string };
        topContributors: unknown[];
      }>;
      meta: { query: string; total: number };
    }>(`/expert-search?q=LINE&asOf=${asOf}`);
    expect(result.meta.query).toBe("LINE");
    expect(result.data.length).toBeLessThanOrEqual(5);
    expect(
      result.data.some(
        ({ knowledgeArea }) => knowledgeArea.id === "ka_line4_troubleshooting",
      ),
    ).toBe(true);
    expect(
      result.data.every(({ topContributors }) => topContributors.length <= 3),
    ).toBe(true);
  });
});
