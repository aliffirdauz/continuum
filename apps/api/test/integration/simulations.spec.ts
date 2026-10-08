export {};
const base = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";
const password = process.env.DEMO_USER_PASSWORD ?? "ContinuumDemo123!";
const DAY_IN_MS = 86_400_000;
const path = "/simulations/unavailability";

type Branch = {
  riskScore: number;
  riskLevel: string;
  effectiveExpertCount: number;
  coverage: number;
};
type Run = {
  id: string;
  employee: { id: string; name: string };
  startedAt: string;
  horizonAt: string;
  durationDays: number;
  formulaVersion: string;
  coverageFormulaVersion: string;
  summary: {
    affectedAreas: number;
    affectedObjects: number;
    beforeCoverage: number;
    afterCoverage: number;
    coverageUnit: string;
    coverageDenominator: number;
  };
  areas: Array<{
    knowledgeArea: { id: string; department: { id: string } };
    before: Branch;
    after: Branch;
    riskScoreDelta: number;
    coverageDelta: number;
    businessObjects: Array<{ id: string; impactWeight: number }>;
  }>;
  objects: Array<{ id: string; affectedAreaIds: string[] }>;
};
type Meta = {
  page: number;
  pageSize: number;
  areasTotal: number;
  objectsTotal: number;
  areasTotalPages: number;
  objectsTotalPages: number;
};
type Envelope = { data: Run; meta: Meta };

let manager: string;
let employee: string;
let admin: string;

async function login(email: string) {
  const response = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  expect(response.status).toBe(201);
  return ((await response.json()) as { accessToken: string }).accessToken;
}
function send(target: string, token: string, body?: unknown) {
  return fetch(`${base}${target}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      "Content-Type": "application/json",
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}
async function create(body: unknown, token = manager, query = "") {
  const response = await send(`${path}${query}`, token, body);
  expect(response.status).toBe(201);
  return (await response.json()) as Envelope;
}
async function read(id: string, token = manager, query = "") {
  const response = await send(`/simulations/${id}${query}`, token);
  expect(response.status).toBe(200);
  return (await response.json()) as Envelope;
}
async function sourceState() {
  const json = async (target: string) =>
    (await (await send(target, employee)).json()) as Record<string, unknown>;
  // Transfer tests may add evidence elsewhere concurrently, so compare the
  // records a simulation could touch rather than the global evidence total.
  const { evidence: _evidence, ...totals } = (await json("/dashboard/summary"))
    .totals as Record<string, number>;
  void _evidence;
  const line4 = (await json("/knowledge/ka_line4_troubleshooting/evidence"))
    .meta;
  return {
    totals,
    line4,
    budiStatus: (await json("/employees/emp_budi")).status,
    budiEvidence: (await json("/employees/emp_budi/evidence")).meta,
    snapshots: (
      await json("/knowledge/ka_line4_troubleshooting/risk/snapshots")
    ).meta,
  };
}

beforeAll(async () => {
  [manager, employee, admin] = await Promise.all([
    login("manager@northstar.demo"),
    login("employee@northstar.demo"),
    login("admin@northstar.demo"),
  ]);
});

describe("saved unavailability simulation API", () => {
  it("rejects missing, invalid, and non-manager tokens", async () => {
    const body = { employeeId: "emp_budi", durationDays: 30 };
    expect((await send(path, "", body)).status).toBe(401);
    expect((await send(path, "invalid", body)).status).toBe(401);
    expect((await send(path, employee, body)).status).toBe(403);
    expect((await send("/simulations/sim_missing", "")).status).toBe(401);
    expect((await send("/simulations/sim_missing", employee)).status).toBe(403);
  });

  it("validates the body, query, and selected person", async () => {
    for (const body of [
      {},
      { employeeId: "bad id!", durationDays: 30 },
      { employeeId: "emp_budi", durationDays: 0 },
      { employeeId: "emp_budi", durationDays: 366 },
      { employeeId: "emp_budi", durationDays: 1.5 },
      { employeeId: "emp_budi", durationDays: "30" },
      { employeeId: "emp_budi", durationDays: 30, startedAt: "2020-01-01" },
      { employeeId: "emp_budi", durationDays: 30, horizonAt: "2030-01-01" },
    ])
      expect((await send(path, manager, body)).status).toBe(400);
    for (const query of [
      "?pageSize=51",
      "?pageSize=0",
      "?page=0",
      "?departmentId=bad!",
    ])
      expect(
        (await send(`${path}${query}`, manager, { employeeId: "emp_budi" }))
          .status,
      ).toBe(400);
    const unknown = await send(path, manager, { employeeId: "emp_missing" });
    expect(unknown.status).toBe(404);
    const inactive = await send(path, manager, { employeeId: "emp_hendra" });
    expect(inactive.status).toBe(400);
    const message = JSON.stringify(await inactive.json());
    expect(message).not.toMatch(/password|secret|token|prisma/i);
  });

  it("captures Budi's run at a same-horizon comparison and lets the creator re-read it unchanged", async () => {
    const requestedAt = Date.now();
    const { data, meta } = await create({ employeeId: "emp_budi" });
    expect(data.durationDays).toBe(30);
    const startedAt = Date.parse(data.startedAt);
    expect(Math.abs(startedAt - requestedAt)).toBeLessThan(60_000);
    expect(Date.parse(data.horizonAt) - startedAt).toBe(30 * DAY_IN_MS);
    expect(data).toMatchObject({
      employee: { id: "emp_budi" },
      formulaVersion: "risk-v1",
      coverageFormulaVersion: "coverage-v1",
      summary: {
        affectedAreas: 4,
        coverageUnit: "percent",
        coverageDenominator: 3,
      },
    });
    expect(
      data.areas.map(({ knowledgeArea }) => knowledgeArea.id).sort(),
    ).toEqual([
      "ka_hydraulic_calibration",
      "ka_line4_troubleshooting",
      "ka_stamping_press_diagnosis",
      "ka_vendor_maintenance",
    ]);
    expect(data.summary.beforeCoverage).toBeGreaterThan(
      data.summary.afterCoverage,
    );
    for (const area of data.areas) {
      expect(area.after.coverage).toBeLessThan(area.before.coverage);
      for (const branch of [area.before, area.after]) {
        expect(branch.riskScore).toBeGreaterThanOrEqual(0);
        expect(branch.riskScore).toBeLessThanOrEqual(100);
      }
    }
    const losses = data.areas.map(
      ({ before, after }) => before.coverage - after.coverage,
    );
    expect(losses).toEqual([...losses].sort((a, b) => b - a));
    const stamping = data.areas.find(
      ({ knowledgeArea }) => knowledgeArea.id === "ka_stamping_press_diagnosis",
    )!;
    expect(stamping.riskScoreDelta).toBeGreaterThan(0);

    const objectIds = data.objects.map(({ id }) => id);
    expect(new Set(objectIds).size).toBe(objectIds.length);
    expect(objectIds).toEqual([...objectIds].sort());
    const areaIds = new Set(
      data.areas.map(({ knowledgeArea }) => knowledgeArea.id),
    );
    for (const object of data.objects)
      for (const id of object.affectedAreaIds) expect(areaIds).toContain(id);
    expect(data.objects.map(({ id }) => id)).toContain("bo_production_line_4");
    expect(meta).toMatchObject({
      page: 1,
      pageSize: 20,
      areasTotal: 4,
      objectsTotal: data.objects.length,
    });

    const reread = await read(data.id);
    expect(reread).toEqual({ data, meta });
    expect(await read(data.id)).toEqual(reread);
    expect(await read(data.id, admin)).toEqual(reread);
  });

  it("ages both branches with duration without adding future evidence", async () => {
    const [short, long] = await Promise.all([
      create({ employeeId: "emp_budi", durationDays: 1 }),
      create({ employeeId: "emp_budi", durationDays: 365 }),
    ]);
    expect(
      Date.parse(long.data.horizonAt) - Date.parse(long.data.startedAt),
    ).toBe(365 * DAY_IN_MS);
    const line4 = (run: Envelope) =>
      run.data.areas.find(
        ({ knowledgeArea }) => knowledgeArea.id === "ka_line4_troubleshooting",
      )!;
    expect(line4(long).before.coverage).toBeLessThan(
      line4(short).before.coverage,
    );
    expect(line4(long).after.coverage).toBeLessThan(
      line4(short).after.coverage,
    );
    expect(long.data.summary.affectedAreas).toBe(
      short.data.summary.affectedAreas,
    );
  });

  it("filters and pages the displayed report without changing the saved run", async () => {
    const filtered = await create(
      { employeeId: "emp_budi", durationDays: 30 },
      manager,
      "?departmentId=dep_finance",
    );
    expect(filtered.data.summary).toMatchObject({
      affectedAreas: 0,
      affectedObjects: 0,
      beforeCoverage: 0,
      afterCoverage: 0,
    });
    expect(filtered.data.areas).toEqual([]);
    expect(filtered.data.objects).toEqual([]);
    expect(filtered.meta).toMatchObject({ areasTotal: 0, areasTotalPages: 0 });

    const id = filtered.data.id;
    const all = await read(id);
    expect(all.meta.areasTotal).toBe(4);
    const manufacturing = await read(
      id,
      manager,
      "?departmentId=dep_manufacturing",
    );
    expect(manufacturing.data.areas).toEqual(all.data.areas);

    const first = await read(id, manager, "?pageSize=3");
    const second = await read(id, manager, "?pageSize=3&page=2");
    expect(first.meta).toMatchObject({ areasTotal: 4, areasTotalPages: 2 });
    expect(first.data.areas).toHaveLength(3);
    expect(second.data.areas).toHaveLength(1);
    expect([...first.data.areas, ...second.data.areas]).toEqual(all.data.areas);
    expect(await read(id, manager, "?pageSize=3&page=2")).toEqual(second);
    const beyond = await read(id, manager, "?page=99");
    expect(beyond.data.areas).toEqual([]);
    expect(beyond.meta.areasTotal).toBe(4);
  });

  it("covers a healthy-coverage employee and a person with no eligible evidence", async () => {
    const kevin = await create({ employeeId: "emp_kevin", durationDays: 30 });
    const auth = kevin.data.areas.find(
      ({ knowledgeArea }) => knowledgeArea.id === "ka_authentication_service",
    )!;
    expect(auth.before.effectiveExpertCount).toBeGreaterThan(2.5);
    expect(auth.after.effectiveExpertCount).toBeGreaterThan(1.5);

    const ayu = await create({ employeeId: "emp_ayu", durationDays: 30 });
    expect(ayu.data.summary).toMatchObject({
      affectedAreas: 0,
      affectedObjects: 0,
      beforeCoverage: 0,
      afterCoverage: 0,
    });
    expect(ayu.data.areas).toEqual([]);
    expect(ayu.data.objects).toEqual([]);
  });

  it("hides runs from non-creators without leaking them and rejects malformed IDs", async () => {
    const { data } = await create({ employeeId: "emp_budi" }, admin);
    const hidden = await send(`/simulations/${data.id}`, manager);
    expect(hidden.status).toBe(404);
    expect(JSON.stringify(await hidden.json())).not.toContain("emp_budi");
    expect((await send("/simulations/sim_missing", manager)).status).toBe(404);
    expect((await send("/simulations/bad!", manager)).status).toBe(400);
  });

  it("creates independent runs concurrently and never mutates source data", async () => {
    const before = await sourceState();
    const runs = await Promise.all(
      Array.from({ length: 3 }, () =>
        create({ employeeId: "emp_budi", durationDays: 30 }),
      ),
    );
    const ids = runs.map(({ data }) => data.id);
    expect(new Set(ids).size).toBe(3);
    for (const run of runs) expect(await read(run.data.id)).toEqual(run);
    expect(await sourceState()).toEqual(before);
    expect(before.budiStatus).toBe("ACTIVE");
  });
});
