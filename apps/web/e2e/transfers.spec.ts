import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const password = process.env.E2E_PASSWORD ?? "ContinuumDemo123!";
const api = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";
// Avoid Line 4, Budi's areas, and emp_ayu: other suites assert their live state.
const AREA = "ka_warranty_claims";
const BACKUP_POOL = ["emp_lina", "emp_reza", "emp_fitri"];

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Completes plans an interrupted earlier run left open, so backups stay free. */
async function closeOpenPlans(request: APIRequestContext) {
  const login = await request.post(`${api}/auth/login`, {
    data: { email: "manager@northstar.demo", password },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const headers = { Authorization: `Bearer ${accessToken}` };
  const list = await request.get(
    `${api}/transfers?knowledgeAreaId=${AREA}&pageSize=100`,
    { headers },
  );
  const plans = (
    (await list.json()) as { data: Array<{ id: string; status: string }> }
  ).data;
  for (const plan of plans.filter(({ status }) => status !== "COMPLETED")) {
    if (plan.status !== "IN_PROGRESS")
      await request.patch(`${api}/transfers/${plan.id}`, {
        headers,
        data: { status: "IN_PROGRESS" },
      });
    await request.patch(`${api}/transfers/${plan.id}`, {
      headers,
      data: { status: "COMPLETED" },
    });
  }
}

const coverageText = async (page: Page) =>
  (
    await page
      .locator("p", { hasText: /Backup coverage [\d.]+ →/ })
      .first()
      .innerText()
  ).match(/([\d.]+) → ([\d.]+)/)!;

test("manager plans a transfer, completes activities, and sees coverage rise", async ({
  page,
  request,
}) => {
  await closeOpenPlans(request);
  const browserApiCalls: string[] = [];
  page.on("request", (req) => {
    if (req.url().startsWith("http://localhost:3001/"))
      browserApiCalls.push(req.url());
  });
  await signIn(page, "manager@northstar.demo");
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Transfers" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Transfer plans" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "New transfer plan" }).first().click();

  await page
    .getByRole("combobox", { name: "Knowledge area" })
    .selectOption(AREA);
  await page.getByRole("button", { name: "Show people" }).click();
  await expect(page).toHaveURL(new RegExp(`knowledgeArea=${AREA}`));
  // Earlier runs can make a pooled backup the top holder, so choose the
  // seeded primary holder explicitly instead of relying on the default.
  await page
    .getByRole("combobox", { name: "Primary holder" })
    .selectOption("emp_tono");
  const backup = page.getByRole("combobox", { name: "Backup" });
  const available = await backup
    .locator("option:not([disabled])")
    .evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );
  const chosen = BACKUP_POOL.find((id) => available.includes(id));
  expect(chosen, "a free backup from the test pool").toBeDefined();
  await backup.selectOption(chosen!);
  await page.getByRole("spinbutton", { name: "Target coverage" }).fill("100");
  await page.getByRole("button", { name: "Create transfer plan" }).click();

  await expect(page).toHaveURL(/\/transfers\/[^/?#]+$/);
  await expect(
    page.getByText("Plan created (baseline)").filter({ visible: true }),
  ).toBeVisible();
  const [, baseline] = await coverageText(page);

  await page.getByRole("button", { name: "Add to plan" }).first().click();
  await expect(
    page.getByRole("button", { name: "Mark completed" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Mark completed" }).click();
  await expect(page.getByText(/evidence recorded/)).toHaveCount(1);
  await expect(
    page.getByText(/^Completed: /).filter({ visible: true }),
  ).toHaveCount(1);

  // A custom activity, entered with the keyboard only.
  const type = page.getByRole("combobox", { name: "Type" });
  await type.focus();
  await type.selectOption("INDEPENDENT_VALIDATION");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Resolve a warranty claim independently");
  await page.keyboard.press("Tab");
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("0.9");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Add activity" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Resolve a warranty claim independently"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark completed" }).click();
  await expect(page.getByText(/evidence recorded/)).toHaveCount(2);

  const [, , current] = await coverageText(page);
  expect(Number(current)).toBeGreaterThan(Number(baseline));
  await expect(page.getByText("In progress", { exact: true })).toBeVisible();

  const planUrl = page.url();
  await page.setViewportSize({ width: 375, height: 812 });
  for (const url of [
    "/transfers",
    planUrl,
    `/transfers/new?knowledgeArea=${AREA}`,
  ]) {
    await page.goto(url);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
      url,
    ).toBeLessThanOrEqual(0);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(planUrl);
  await page.getByRole("button", { name: "Complete plan" }).click();
  // The status badge, not the "Completed" date label.
  await expect(
    page.locator("main span", { hasText: /^Completed$/ }),
  ).toBeVisible();
  await expect(page.getByText("Recommended next activities")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mark completed" }),
  ).toHaveCount(0);

  expect(browserApiCalls).toEqual([]);
  const session = await page.request.get("/api/auth/session");
  expect(await session.text()).not.toMatch(
    /accessToken|Bearer [A-Za-z0-9_.-]{20,}/,
  );
});

test("employees read transfer plans without write controls", async ({
  page,
}) => {
  await signIn(page, "employee@northstar.demo");
  await page.goto("/transfers");
  await expect(
    page.getByRole("heading", { name: "Transfer plans" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "New transfer plan" }),
  ).toHaveCount(0);
  const first = page.locator('main a[href^="/transfers/"]').first();
  if (await first.count()) {
    await first.click();
    await expect(page.getByText("Progress history")).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Mark completed|Add activity|Add to plan|Complete plan/,
      }),
    ).toHaveCount(0);
  }
  await page.goto("/transfers/new");
  await expect(
    page.getByText(
      "Transfer plans are created by managers and knowledge admins.",
    ),
  ).toBeVisible();
});

test("unknown plans render the not-found state", async ({ page }) => {
  await signIn(page, "manager@northstar.demo");
  await page.goto("/transfers/plan_missing");
  await expect(
    page.getByRole("heading", { name: "We could not find that record" }),
  ).toBeVisible();
});
