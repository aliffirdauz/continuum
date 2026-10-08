import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// The spec section 49 flagship demo, end to end. Opt-in on a local Compose
// stack only: it resets the local database before and after the run and
// writes README screenshots to WALKTHROUGH_OUTPUT_DIR.
test.skip(
  !process.env.RUN_PORTFOLIO_DEMO,
  "Requires explicit local demo opt-in",
);
test.setTimeout(300_000);
test.use({ viewport: { width: 1440, height: 900 } });

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

test("portfolio demo: risk → evidence → experts → simulation → transfer → LOW", async ({
  page,
}) => {
  const outputDir = process.env.WALKTHROUGH_OUTPUT_DIR;
  if (!outputDir) throw new Error("WALKTHROUGH_OUTPUT_DIR is required");
  const shot = (name: string, fullPage = false) =>
    page.screenshot({ path: path.join(outputDir, name), fullPage });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  resetDatabase();
  try {
    await page.goto("/sign-in");
    await page.getByLabel("Work email").fill("manager@northstar.demo");
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.E2E_PASSWORD ?? "ContinuumDemo123!");
    await page.getByRole("button", { name: "Enter workspace" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Active transfer plans")).toBeVisible();
    await shot("01-dashboard.png");

    await page.goto(`/knowledge/${LINE4}`);
    await expect(page.locator("#risk")).toContainText("Critical");
    await shot("02-knowledge-risk.png");
    await page.getByRole("button", { name: "How these figures work" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await shot("03-explanation-drawer.png");
    await page.keyboard.press("Escape");
    await page.locator("#evidence").scrollIntoViewIfNeeded();
    await shot("04-evidence.png");

    await page.goto("/experts?q=line+4");
    await expect(page.getByText("Budi Santoso").first()).toBeVisible();
    await shot("05-expert-finder.png");

    await page.goto("/simulate");
    await page
      .getByRole("combobox", { name: "Active employee" })
      .selectOption("emp_budi");
    await page.getByRole("button", { name: "Create simulation" }).click();
    await expect(
      page.getByRole("heading", { name: "Affected knowledge areas" }),
    ).toBeVisible();
    await shot("06-simulation.png");

    await page
      .locator(`a[href^="/transfers/new?knowledgeArea=${LINE4}"]`)
      .click();
    await expect(
      page.getByRole("combobox", { name: "Primary holder" }),
    ).toHaveValue("emp_budi");
    await page
      .getByRole("combobox", { name: "Backup" })
      .selectOption("emp_andri");
    await page.getByRole("button", { name: "Create transfer plan" }).click();
    await expect(areaRisk(page)).toHaveText(/^Critical/);
    await followRecommendations(page, async () => (await coverage(page)) >= 70);
    await expect(areaRisk(page)).toHaveText(/^High/);
    await page.getByRole("button", { name: "Complete plan" }).click();
    await expect(
      page.locator("main span", { hasText: /^Completed$/ }),
    ).toBeVisible();

    await page.goto(`/transfers/new?knowledgeArea=${LINE4}&primary=emp_budi`);
    await page
      .getByRole("combobox", { name: "Backup" })
      .selectOption("emp_joko");
    await page.getByRole("spinbutton", { name: "Target coverage" }).fill("50");
    await page.getByRole("button", { name: "Create transfer plan" }).click();
    await followRecommendations(page, async () =>
      /^Low/.test(await areaRisk(page).innerText()),
    );
    await expect(areaRisk(page)).toHaveText(/^Low/);
    await shot("07-transfer-progress.png", true);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(page.url());
    await expect(page.locator("main h1")).toBeVisible();
    await shot("08-transfer-mobile.png");
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto("/dashboard");
    await expect(page.getByText("Active transfer plans")).toBeVisible();
    await shot("09-dashboard-after.png");
    await page.goto(`/knowledge/${LINE4}`);
    await expect(page.locator("#risk")).toContainText("Low");

    expect(errors).toEqual([]);
  } finally {
    resetDatabase();
  }
});
