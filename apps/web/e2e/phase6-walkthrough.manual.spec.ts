import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Opt-in on a local Compose stack only: this resets the local database before
// and after the run, and writes screenshots to WALKTHROUGH_OUTPUT_DIR.
test.skip(
  !process.env.RUN_PHASE6_WALKTHROUGH,
  "Requires explicit local walkthrough opt-in",
);
test.setTimeout(240_000);

const repoRoot = path.resolve(process.cwd(), "../..");
const LINE4 = "ka_line4_troubleshooting";
const resetDatabase = () =>
  execFileSync(
    "docker",
    [
      "compose",
      "run",
      "--rm",
      "--no-deps",
      "seed",
      "pnpm",
      "--filter",
      "@continuum/api",
      "db:reset",
      "--yes",
    ],
    { cwd: repoRoot, timeout: 180_000, stdio: "pipe" },
  );

const areaRisk = (page: Page) =>
  page.getByText(/^(Low|Medium|High|Critical) · [\d.]+\/100$/).first();
const coverage = async (page: Page) =>
  Number(
    (
      await page
        .locator("p", { hasText: /Backup coverage [\d.]+ →/ })
        .first()
        .innerText()
    ).match(/→ ([\d.]+)/)![1],
  );

/** Follows the recommendations, one activity at a time, until done() holds. */
async function followRecommendations(page: Page, done: () => Promise<boolean>) {
  for (let step = 0; step < 12 && !(await done()); step++) {
    const add = page.getByRole("button", { name: "Add to plan" });
    await add.nth(step % (await add.count())).click();
    const complete = page.getByRole("button", { name: "Mark completed" });
    await expect(complete).toHaveCount(1);
    await complete.click();
    await expect(page.getByText(/evidence recorded/)).toHaveCount(step + 1);
  }
}

async function createPlan(page: Page, backup: string, target: number) {
  await page.goto(`/transfers/new?knowledgeArea=${LINE4}&primary=emp_budi`);
  await expect(
    page.getByRole("combobox", { name: "Primary holder" }),
  ).toHaveValue("emp_budi");
  await page.getByRole("combobox", { name: "Backup" }).selectOption(backup);
  await page
    .getByRole("spinbutton", { name: "Target coverage" })
    .fill(String(target));
  await page.getByRole("button", { name: "Create transfer plan" }).click();
  await expect(
    page.getByText("Plan created (baseline)").filter({ visible: true }),
  ).toBeVisible();
}

test("Phase 6 flagship transfer walkthrough: CRITICAL → HIGH → LOW", async ({
  page,
}) => {
  const outputDir = process.env.WALKTHROUGH_OUTPUT_DIR;
  if (!outputDir) throw new Error("WALKTHROUGH_OUTPUT_DIR is required");
  const shot = (name: string) =>
    page.screenshot({ path: path.join(outputDir, name), fullPage: true });
  const errors: string[] = [];
  const browserApiCalls: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().startsWith("http://localhost:3001/"))
      browserApiCalls.push(request.url());
  });

  resetDatabase();
  try {
    await page.goto("/sign-in");
    await page.getByLabel("Work email").fill("manager@northstar.demo");
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.E2E_PASSWORD ?? "ContinuumDemo123!");
    await page.getByRole("button", { name: "Enter workspace" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto(`/knowledge/${LINE4}`);
    await expect(page.locator("#risk")).toContainText("Critical");
    await page.getByRole("link", { name: "Plan knowledge transfer" }).click();
    await expect(page).toHaveURL(new RegExp(`knowledgeArea=${LINE4}`));
    await page
      .getByRole("combobox", { name: "Backup" })
      .selectOption("emp_andri");
    await page.getByRole("button", { name: "Create transfer plan" }).click();
    await expect(
      page.getByText("Plan created (baseline)").filter({ visible: true }),
    ).toBeVisible();
    await expect(areaRisk(page)).toHaveText(/^Critical/);

    await followRecommendations(page, async () => (await coverage(page)) >= 70);
    expect(await coverage(page)).toBeGreaterThanOrEqual(70);
    await expect(areaRisk(page)).toHaveText(/^High/);
    await shot("transfer-andri-desktop.png");
    await page.getByRole("button", { name: "Complete plan" }).click();
    await expect(
      page.locator("main span", { hasText: /^Completed$/ }),
    ).toBeVisible();

    await createPlan(page, "emp_joko", 50);
    await expect(areaRisk(page)).toHaveText(/^High/);
    await followRecommendations(page, async () =>
      /^Low/.test(await areaRisk(page).innerText()),
    );
    await expect(areaRisk(page)).toHaveText(/^Low/);
    const history = page.locator("table");
    await expect(history).toContainText("High");
    await expect(history).toContainText("Medium");
    await expect(history).toContainText("Low");
    await shot("transfer-joko-desktop.png");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(page.url());
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
    await shot("transfer-joko-mobile.png");
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto("/transfers");
    await expect(
      page.getByRole("heading", { name: "Transfer plans" }),
    ).toBeVisible();
    await shot("transfers-list.png");
    await page.goto(`/knowledge/${LINE4}`);
    await expect(page.locator("#risk")).toContainText("Low");

    expect(errors).toEqual([]);
    expect(browserApiCalls).toEqual([]);
  } finally {
    resetDatabase();
  }
});
