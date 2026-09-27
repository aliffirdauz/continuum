// Runs against a live, seeded API, for example the Docker Compose stack:
//   pnpm --filter @continuum/api test:integration
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "ContinuumDemo123!";

interface Page<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

interface NamedRecord {
  id: string;
  name: string;
}

let accessToken: string;

async function get(path: string, token: string | null = accessToken) {
  return fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function getJson<T>(path: string): Promise<T> {
  const response = await get(path);

  expect(response.status, `GET ${path}`).toBe(200);
  return (await response.json()) as T;
}

beforeAll(async () => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "employee@northstar.demo",
      password: DEMO_PASSWORD,
    }),
  });

  expect(response.status).toBe(201);
  ({ accessToken } = (await response.json()) as { accessToken: string });
});

describe("authentication boundary", () => {
  it.each([
    "/dashboard/summary",
    "/departments",
    "/departments/dep_manufacturing",
    "/employees",
    "/employees/emp_budi",
    "/employees/emp_budi/evidence",
    "/knowledge",
    "/knowledge/categories",
    "/knowledge/ka_line4_troubleshooting",
    "/knowledge/ka_line4_troubleshooting/evidence",
    "/business-objects",
    "/business-objects/bo_production_line_4",
    "/evidence",
    "/evidence/ev_line4_troubleshooting_001",
  ])("rejects %s without a token or with an invalid one", async (path) => {
    expect((await get(path, null)).status).toBe(401);
    expect((await get(path, "invalid")).status).toBe(401);
  });
});

describe("seeded inventory", () => {
  it("summarizes the Northstar dataset", async () => {
    const summary = await getJson<{
      totals: Record<string, number>;
      highCriticalityKnowledgeAreas: number;
    }>("/dashboard/summary");

    expect(summary.totals).toMatchObject({
      departments: 6,
      employees: 35,
      knowledgeAreas: 25,
      businessObjects: 12,
    });
    expect(summary.totals.evidence).toBeGreaterThanOrEqual(120);
    expect(summary.totals.evidence).toBeLessThanOrEqual(200);
    expect(summary.highCriticalityKnowledgeAreas).toBeGreaterThan(0);
  });

  it("lists departments with record counts", async () => {
    const { data } = await getJson<{
      data: Array<NamedRecord & { employeeCount: number }>;
    }>("/departments");

    expect(data.map(({ name }) => name)).toEqual([
      "Customer Support",
      "Engineering",
      "Finance",
      "Manufacturing",
      "Operations",
      "Procurement",
    ]);
    expect(
      data.reduce((sum, { employeeCount }) => sum + employeeCount, 0),
    ).toBe(35);
  });
});

describe("knowledge API", () => {
  it("paginates knowledge areas with metadata", async () => {
    const page = await getJson<Page<NamedRecord>>(
      "/knowledge?pageSize=10&page=3",
    );

    expect(page.meta).toEqual({
      page: 3,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
    expect(page.data).toHaveLength(5);
  });

  it("searches names case-insensitively", async () => {
    const { data } = await getJson<Page<NamedRecord>>(
      "/knowledge?search=LINE%204",
    );

    expect(data.map(({ id }) => id)).toContain("ka_line4_troubleshooting");
  });

  it("filters by department and category", async () => {
    const byDepartment = await getJson<
      Page<NamedRecord & { department: NamedRecord }>
    >("/knowledge?departmentId=dep_finance&pageSize=100");
    const byCategory = await getJson<Page<NamedRecord & { category: string }>>(
      "/knowledge?category=Tax%20Compliance",
    );

    expect(byDepartment.meta.total).toBe(4);
    expect(
      byDepartment.data.every(
        ({ department }) => department.id === "dep_finance",
      ),
    ).toBe(true);
    expect(byCategory.data.map(({ category }) => category)).toEqual([
      "Tax Compliance",
      "Tax Compliance",
    ]);
  });

  it("sorts by business criticality, highest first", async () => {
    const { data } = await getJson<
      Page<NamedRecord & { businessCriticality: number }>
    >("/knowledge?sort=criticality&pageSize=100");
    const values = data.map(({ businessCriticality }) => businessCriticality);

    expect(data[0]?.id).toBe("ka_line4_troubleshooting");
    expect(values).toEqual([...values].sort((left, right) => right - left));
  });

  it("returns a knowledge area with business objects and people with evidence", async () => {
    const area = await getJson<{
      evidenceCount: number;
      contributorCount: number;
      businessObjects: NamedRecord[];
      contributors: NamedRecord[];
    }>("/knowledge/ka_line4_troubleshooting");

    expect(area.businessObjects[0]?.id).toBe("bo_production_line_4");
    expect(area.contributors.map(({ name }) => name)).toEqual([
      "Andri Pratama",
      "Budi Santoso",
      "Joko Susilo",
      "Wahyu Hidayat",
    ]);
    expect(area.contributorCount).toBe(4);
    expect(JSON.stringify(area)).not.toMatch(/score|rank|risk/i);
  });

  it("lists evidence for a knowledge area, newest first, filtered by type", async () => {
    const all = await getJson<Page<{ occurredAt: string }>>(
      "/knowledge/ka_line4_troubleshooting/evidence?pageSize=100",
    );
    const incidents = await getJson<Page<{ type: string }>>(
      "/knowledge/ka_line4_troubleshooting/evidence?type=INCIDENT_RESOLVED",
    );
    const dates = all.data.map(({ occurredAt }) => occurredAt);

    expect(dates).toEqual([...dates].sort().reverse());
    expect(incidents.meta.total).toBe(3);
    expect(
      incidents.data.every(({ type }) => type === "INCIDENT_RESOLVED"),
    ).toBe(true);
  });
});

describe("people API", () => {
  it("filters the directory by department", async () => {
    const { data, meta } = await getJson<
      Page<NamedRecord & { knowledgeAreaCount: number }>
    >("/employees?departmentId=dep_manufacturing");

    expect(meta.total).toBe(7);
    expect(data.find(({ id }) => id === "emp_budi")?.knowledgeAreaCount).toBe(
      4,
    );
  });

  it("returns a profile without scores and an empty profile for a person without evidence", async () => {
    const budi = await getJson<{ knowledgeAreas: NamedRecord[] }>(
      "/employees/emp_budi",
    );
    const ayu = await getJson<{ knowledgeAreas: NamedRecord[] }>(
      "/employees/emp_ayu",
    );

    expect(budi.knowledgeAreas.map(({ name }) => name)).toEqual([
      "Hydraulic Calibration",
      "Production Line 4 Troubleshooting",
      "Stamping Press Diagnosis",
      "Vendor Maintenance Workflow",
    ]);
    expect(JSON.stringify(budi)).not.toMatch(/score|rank/i);
    expect(ayu.knowledgeAreas).toEqual([]);
  });
});

describe("business objects and evidence API", () => {
  it("lists business objects and their dependent knowledge areas", async () => {
    const list = await getJson<Page<NamedRecord>>(
      "/business-objects?type=PROCESS",
    );
    const line = await getJson<{ knowledgeAreas: NamedRecord[] }>(
      "/business-objects/bo_production_line_4",
    );

    expect(list.meta.total).toBe(3);
    expect(line.knowledgeAreas.map(({ id }) => id)).toContain(
      "ka_line4_troubleshooting",
    );
  });

  it("returns one evidence record with its person and knowledge area", async () => {
    const evidence = await getJson<{
      employee: NamedRecord;
      knowledgeArea: NamedRecord;
    }>("/evidence/ev_line4_troubleshooting_001");

    expect(evidence.employee.id).toBe("emp_budi");
    expect(evidence.knowledgeArea.id).toBe("ka_line4_troubleshooting");
  });
});

describe("input validation and errors", () => {
  it.each([
    "/knowledge?pageSize=101",
    "/knowledge?page=0",
    "/knowledge?sort=risk",
    "/knowledge?departmentId=dep%20finance",
    "/knowledge?unexpected=1",
    "/employees?status=FIRED",
    "/evidence?type=GOSSIP",
    "/knowledge/ka_line4_troubleshooting/evidence?knowledgeAreaId=ka_other",
    "/knowledge/bad%20id",
  ])("returns 400 for %s", async (path) => {
    expect((await get(path)).status).toBe(400);
  });

  it.each([
    "/knowledge/ka_missing",
    "/knowledge/ka_missing/evidence",
    "/employees/emp_missing",
    "/employees/emp_missing/evidence",
    "/business-objects/bo_missing",
    "/departments/dep_missing",
    "/evidence/ev_missing",
  ])("returns 404 for %s", async (path) => {
    const response = await get(path);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toMatch(/not found/i);
  });
});
