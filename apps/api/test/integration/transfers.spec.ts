export {};
const base = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";
const password = process.env.DEMO_USER_PASSWORD ?? "ContinuumDemo123!";
// Avoid Line 4, Budi's areas, and emp_ayu: other suites assert their live state.
const AREA = "ka_safety_approval";
const PRIMARY = "emp_wulan";
const BACKUP_POOL = ["emp_bayu", "emp_fitri", "emp_reza"];

type Checkpoint = {
  activityId: string | null;
  backupScore: number;
  primaryHolderScore: number;
  riskScore: number;
};
type Activity = {
  id: string;
  type: string;
  status: string;
  completedAt: string | null;
  evidence: { id: string; type: string } | null;
};
type Plan = {
  id: string;
  status: string;
  backupEmployee: { id: string };
  coverage: {
    baseline: number;
    current: number;
    target: number;
    progress: number;
  };
  risk: { riskScore: number; riskLevel: string };
  startedAt: string | null;
  completedAt: string | null;
  activities: Activity[];
  checkpoints: Checkpoint[];
  recommendations: {
    band: string;
    recommendations: Array<{ activityType: string | null }>;
  };
};
type Candidates = {
  holders: Array<{ employee: { id: string }; expertiseScore: number }>;
  candidates: Array<{
    employee: { id: string };
    expertiseScore: number;
    openPlanId: string | null;
  }>;
};

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
function call(method: string, path: string, token: string, body?: unknown) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      "Content-Type": "application/json",
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}
async function json<T>(response: Response, status: number) {
  expect(response.status).toBe(status);
  return ((await response.json()) as { data: T }).data;
}
const futureDate = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/** Closes plans left open by an interrupted earlier run. */
async function closeOpenPlans() {
  const response = await call(
    "GET",
    `/transfers?knowledgeAreaId=${AREA}&pageSize=100`,
    manager,
  );
  const plans = ((await response.json()) as { data: Plan[] }).data;
  for (const plan of plans.filter(({ status }) => status !== "COMPLETED")) {
    if (plan.status !== "IN_PROGRESS")
      await call("PATCH", `/transfers/${plan.id}`, manager, {
        status: "IN_PROGRESS",
      });
    await call("PATCH", `/transfers/${plan.id}`, manager, {
      status: "COMPLETED",
    });
  }
}

beforeAll(async () => {
  [manager, employee, admin] = await Promise.all([
    login("manager@northstar.demo"),
    login("employee@northstar.demo"),
    login("admin@northstar.demo"),
  ]);
  await closeOpenPlans();
});

describe("knowledge transfer API", () => {
  it("lets every role read but only managers and admins write", async () => {
    expect((await call("GET", "/transfers", "")).status).toBe(401);
    expect((await call("GET", "/transfers", "invalid")).status).toBe(401);
    expect((await call("GET", "/transfers", employee)).status).toBe(200);
    expect((await call("POST", "/transfers", employee, {})).status).toBe(403);
    expect(
      (await call("PATCH", "/transfers/plan_x", employee, {})).status,
    ).toBe(403);
    expect(
      (await call("POST", "/transfers/plan_x/activities", employee, {})).status,
    ).toBe(403);
    expect(
      (await call("PATCH", "/transfers/plan_x/activities/act_x", employee, {}))
        .status,
    ).toBe(403);
    expect(
      (await call("GET", `/knowledge/${AREA}/transfer-candidates`, employee))
        .status,
    ).toBe(403);
    expect(
      (await call("GET", `/knowledge/${AREA}/transfer-candidates`, admin))
        .status,
    ).toBe(200);
  });

  it("validates input and reports unknown records", async () => {
    const valid = {
      knowledgeAreaId: AREA,
      primaryHolderId: PRIMARY,
      backupEmployeeId: BACKUP_POOL[0],
      targetDate: futureDate(60),
    };
    for (const body of [
      {},
      { ...valid, targetDate: "31-12-2026" },
      { ...valid, targetDate: futureDate(-1) },
      { ...valid, targetDate: futureDate(800) },
      { ...valid, backupEmployeeId: PRIMARY },
      { ...valid, targetCoverage: 0 },
      { ...valid, targetCoverage: 101 },
      { ...valid, targetCoverage: 50.5 },
      { ...valid, baselineCoverage: 90 },
      { ...valid, backupEmployeeId: "emp_hendra" },
      { ...valid, primaryHolderId: "emp_reza", backupEmployeeId: "emp_bayu" },
    ])
      expect(
        (await call("POST", "/transfers", manager, body)).status,
        JSON.stringify(body),
      ).toBe(400);
    expect(
      (
        await call("POST", "/transfers", manager, {
          ...valid,
          knowledgeAreaId: "ka_missing",
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call("POST", "/transfers", manager, {
          ...valid,
          backupEmployeeId: "emp_missing",
        })
      ).status,
    ).toBe(404);
    expect((await call("GET", "/transfers/plan_missing", manager)).status).toBe(
      404,
    );
    expect((await call("GET", "/transfers/bad!", manager)).status).toBe(400);
    expect((await call("GET", "/transfers?pageSize=101", manager)).status).toBe(
      400,
    );
    expect((await call("GET", "/transfers?status=NOPE", manager)).status).toBe(
      400,
    );
    expect(
      (await call("GET", "/knowledge/ka_missing/transfer-candidates", manager))
        .status,
    ).toBe(404);
  });

  it("records evidence per completed activity, tracks checkpoints, and enforces the lifecycle", async () => {
    const line4Before = await json<{
      riskScore: number;
      evidenceCount: number;
    }>(
      await call("GET", "/knowledge/ka_line4_troubleshooting/risk", employee),
      200,
    );
    const candidates = await json<Candidates>(
      await call("GET", `/knowledge/${AREA}/transfer-candidates`, manager),
      200,
    );
    // Earlier runs grow backups' evidence here, so the primary need not lead.
    expect(candidates.holders.map(({ employee: e }) => e.id)).toContain(
      PRIMARY,
    );
    const holderScores = candidates.holders.map((h) => h.expertiseScore);
    expect(holderScores).toEqual([...holderScores].sort((a, b) => b - a));
    const scoreOf = (id: string) =>
      candidates.candidates.find(({ employee: e }) => e.id === id)
        ?.expertiseScore ?? 0;
    const backup =
      BACKUP_POOL.find((id) => scoreOf(id) < 80) ?? BACKUP_POOL[0]!;
    const target = Math.min(100, Math.ceil(scoreOf(backup)) + 20);

    const created = await json<Plan>(
      await call("POST", "/transfers", manager, {
        knowledgeAreaId: AREA,
        primaryHolderId: PRIMARY,
        backupEmployeeId: backup,
        targetCoverage: target,
        targetDate: futureDate(90),
      }),
      201,
    );
    expect(created).toMatchObject({
      status: "PLANNED",
      backupEmployee: { id: backup },
      coverage: { baseline: scoreOf(backup), target, progress: 0 },
      startedAt: null,
    });
    expect(created.checkpoints).toHaveLength(1);
    expect(created.checkpoints[0]!.activityId).toBeNull();
    expect(created.recommendations.recommendations.length).toBeGreaterThan(0);
    const duplicate = await call("POST", "/transfers", admin, {
      knowledgeAreaId: AREA,
      primaryHolderId: PRIMARY,
      backupEmployeeId: backup,
      targetCoverage: target,
      targetDate: futureDate(90),
    });
    expect(duplicate.status).toBe(409);
    const flagged = await json<Candidates>(
      await call("GET", `/knowledge/${AREA}/transfer-candidates`, manager),
      200,
    );
    expect(
      flagged.candidates.find(({ employee: e }) => e.id === backup)?.openPlanId,
    ).toBe(created.id);

    const path = `/transfers/${created.id}`;
    for (const body of [
      { type: "NOPE", title: "Something useful" },
      { type: "TRAINING", title: "x" },
      { type: "TRAINING", title: "Course", weight: 0 },
      { type: "TRAINING", title: "Course", weight: 1.5 },
      { type: "TRAINING", title: "Course", evidenceId: "ev_x" },
    ])
      expect(
        (await call("POST", `${path}/activities`, manager, body)).status,
      ).toBe(400);
    await json<Plan>(
      await call("POST", `${path}/activities`, manager, {
        type: "DOCUMENTATION",
        title: "Update the permit approval checklist",
      }),
      201,
    );
    const withTwo = await json<Plan>(
      await call("POST", `${path}/activities`, admin, {
        type: "INDEPENDENT_VALIDATION",
        title: "Approve a permit independently",
        weight: 0.9,
      }),
      201,
    );
    const [first, second] = withTwo.activities;
    expect(first).toMatchObject({ status: "PLANNED", evidence: null });

    expect(
      (
        await call("PATCH", `${path}/activities/${first!.id}`, manager, {
          status: "PLANNED",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call("PATCH", `${path}/activities/act_missing`, manager, {
          status: "COMPLETED",
        })
      ).status,
    ).toBe(404);
    const afterFirst = await json<Plan>(
      await call("PATCH", `${path}/activities/${first!.id}`, manager, {
        status: "COMPLETED",
      }),
      200,
    );
    expect(afterFirst.status).toBe("IN_PROGRESS");
    expect(afterFirst.startedAt).not.toBeNull();
    expect(afterFirst.coverage.current).toBeGreaterThan(
      created.coverage.baseline,
    );
    expect(afterFirst.coverage.progress).toBeGreaterThan(0);
    const done = afterFirst.activities.find(({ id }) => id === first!.id)!;
    expect(done).toMatchObject({
      status: "COMPLETED",
      evidence: { type: "DOCUMENT_AUTHORED" },
    });
    expect(afterFirst.checkpoints).toHaveLength(2);
    expect(afterFirst.checkpoints[1]).toMatchObject({ activityId: first!.id });
    expect(afterFirst.checkpoints[1]!.backupScore).toBeGreaterThan(
      afterFirst.checkpoints[0]!.backupScore,
    );
    // Inverse HHI is relative: once earlier runs make a backup the dominant
    // holder, more evidence concentrates knowledge and risk may rise.
    const [baselineCheckpoint, firstCheckpoint] = afterFirst.checkpoints;
    if (firstCheckpoint!.backupScore < firstCheckpoint!.primaryHolderScore)
      expect(firstCheckpoint!.riskScore).toBeLessThanOrEqual(
        baselineCheckpoint!.riskScore,
      );

    const evidence = await call(
      "GET",
      `/evidence/${done.evidence!.id}`,
      employee,
    );
    expect(evidence.status).toBe(200);
    expect((await evidence.json()) as Record<string, unknown>).toMatchObject({
      employee: { id: backup },
      knowledgeArea: { id: AREA },
      source: "Transfer plan",
      sourceReference: first!.id,
    });
    expect(
      (
        await call("PATCH", `${path}/activities/${first!.id}`, manager, {
          status: "COMPLETED",
        })
      ).status,
    ).toBe(409);

    expect((await call("PATCH", path, manager, {})).status).toBe(400);
    expect(
      (await call("PATCH", path, manager, { status: "PLANNED" })).status,
    ).toBe(409);
    expect(
      (
        await json<Plan>(
          await call("PATCH", path, manager, { status: "BLOCKED" }),
          200,
        )
      ).status,
    ).toBe("BLOCKED");
    expect(
      (
        await call("POST", `${path}/activities`, manager, {
          type: "TRAINING",
          title: "Course",
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await call("PATCH", `${path}/activities/${second!.id}`, manager, {
          status: "COMPLETED",
        })
      ).status,
    ).toBe(409);
    expect(
      (await call("PATCH", path, manager, { status: "COMPLETED" })).status,
    ).toBe(409);
    await json<Plan>(
      await call("PATCH", path, manager, {
        status: "IN_PROGRESS",
        targetDate: futureDate(120),
      }),
      200,
    );

    // Concurrent completions of one activity must record exactly one evidence row.
    const third = (
      await json<Plan>(
        await call("POST", `${path}/activities`, manager, {
          type: "REVIEW",
          title: "Review a permit decision",
        }),
        201,
      )
    ).activities.at(-1)!;
    const race = await Promise.all(
      [manager, admin].map((token) =>
        call("PATCH", `${path}/activities/${third.id}`, token, {
          status: "COMPLETED",
        }),
      ),
    );
    expect(race.map(({ status }) => status).sort()).toEqual([200, 409]);

    const final = await json<Plan>(
      await call("PATCH", `${path}/activities/${second!.id}`, admin, {
        status: "COMPLETED",
      }),
      200,
    );
    expect(final.checkpoints).toHaveLength(4);
    expect(new Set(final.activities.map(({ evidence: e }) => e?.id)).size).toBe(
      3,
    );
    const completed = await json<Plan>(
      await call("PATCH", path, manager, { status: "COMPLETED" }),
      200,
    );
    expect(completed.completedAt).not.toBeNull();
    expect(
      (await call("PATCH", path, manager, { status: "IN_PROGRESS" })).status,
    ).toBe(409);
    expect(
      (
        await call("POST", `${path}/activities`, manager, {
          type: "TRAINING",
          title: "Course",
        })
      ).status,
    ).toBe(409);

    const list = await call(
      "GET",
      `/transfers?knowledgeAreaId=${AREA}&status=COMPLETED`,
      employee,
    );
    const page = (await list.json()) as {
      data: Plan[];
      meta: { total: number };
    };
    expect(page.data.some(({ id }) => id === created.id)).toBe(true);
    expect(page.data.every(({ status }) => status === "COMPLETED")).toBe(true);
    expect((await call("GET", path, employee)).status).toBe(200);

    const line4After = await json<{ riskScore: number; evidenceCount: number }>(
      await call("GET", "/knowledge/ka_line4_troubleshooting/risk", employee),
      200,
    );
    expect(line4After.evidenceCount).toBe(line4Before.evidenceCount);
  });
});

describe("transfer dashboard summary", () => {
  it("counts plans by status for every authenticated role", async () => {
    expect((await call("GET", "/dashboard/transfer-summary", "")).status).toBe(
      401,
    );
    const response = await call("GET", "/dashboard/transfer-summary", employee);
    expect(response.status).toBe(200);
    const summary = (await response.json()) as {
      totals: Record<string, number>;
      active: number;
    };
    const list = await call("GET", "/transfers?pageSize=1", employee);
    const total = ((await list.json()) as { meta: { total: number } }).meta
      .total;
    const sum = Object.values(summary.totals).reduce((a, b) => a + b, 0);
    expect(sum).toBe(total);
    expect(summary.active).toBe(
      summary.totals.PLANNED! +
        summary.totals.IN_PROGRESS! +
        summary.totals.BLOCKED!,
    );
  });
});
