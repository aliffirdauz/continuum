import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Opt-in on a local Compose stack only: this stops the API briefly and writes
// screenshots to WALKTHROUGH_OUTPUT_DIR for human inspection.
test.skip(
  !process.env.RUN_PHASE4_WALKTHROUGH,
  "Requires explicit local walkthrough opt-in",
);

test("Phase 4 risk walkthrough and outage recovery", async ({
  page,
  request,
}) => {
  const outputDir = process.env.WALKTHROUGH_OUTPUT_DIR;
  if (!outputDir) throw new Error("WALKTHROUGH_OUTPUT_DIR is required");
  const repoRoot = path.resolve(process.cwd(), "../..");
  const consoleErrors: string[] = [];
  const browserApiCalls: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => {
    if (request.url().startsWith("http://localhost:3001/")) {
      browserApiCalls.push(request.url());
    }
  });

  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill("manager@northstar.demo");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_PASSWORD ?? "ContinuumDemo123!");
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Knowledge risk overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Knowledge risk distribution" }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(outputDir, "dashboard-desktop.png"),
    fullPage: true,
  });

  await page.goto("/knowledge");
  const riskSelect = page.getByRole("combobox", { name: "Risk level" });
  await riskSelect.focus();
  await riskSelect.selectOption("CRITICAL");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Show risk-ranked areas" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/risk=CRITICAL/);
  await expect(page.getByText(/Not an organization-wide count/)).toBeVisible();
  await page.screenshot({
    path: path.join(outputDir, "knowledge-filtered.png"),
    fullPage: true,
  });

  await page
    .locator('a[href="/knowledge/ka_line4_troubleshooting#risk"]')
    .click();
  await expect(page.locator("#risk")).toContainText("Documentation gap");
  await expect(page.locator("#risk")).toContainText("Risk points");
  await expect(page.locator("#expertise")).toBeVisible();
  await page.screenshot({
    path: path.join(outputDir, "risk-detail-desktop.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 375, height: 812 });
  for (const url of [
    "/dashboard",
    "/knowledge?risk=CRITICAL",
    "/knowledge/ka_line4_troubleshooting",
  ]) {
    await page.goto(url);
    await expect(page.locator("main h1")).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, url).toBeLessThanOrEqual(0);
  }
  await page.screenshot({
    path: path.join(outputDir, "risk-detail-mobile.png"),
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
  expect(browserApiCalls).toEqual([]);
  const session = await page.request.get("/api/auth/session");
  expect(session.status()).toBe(200);
  expect(await session.text()).not.toMatch(
    /accessToken|Bearer [A-Za-z0-9_.-]{20,}/,
  );

  try {
    execFileSync("docker", ["compose", "stop", "api"], {
      cwd: repoRoot,
      timeout: 60_000,
      stdio: "pipe",
    });
    await page.reload();
    const alert = page.locator("main [role='alert']");
    await expect(alert).toContainText("We could not load this page");
    await expect(alert).not.toContainText(
      /fetch failed|ECONNREFUSED|postgres|redis/i,
    );
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await page.screenshot({
      path: path.join(outputDir, "risk-outage.png"),
      fullPage: true,
    });
  } finally {
    execFileSync("docker", ["compose", "start", "api"], {
      cwd: repoRoot,
      timeout: 60_000,
      stdio: "pipe",
    });
  }
  await expect
    .poll(
      async () => {
        try {
          return (
            await request.get("http://localhost:3001/api/v1/health/ready")
          ).status();
        } catch {
          return 0;
        }
      },
      { timeout: 60_000 },
    )
    .toBe(200);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("#risk")).toContainText("Documentation gap");
  await page.screenshot({
    path: path.join(outputDir, "risk-recovered.png"),
    fullPage: true,
  });
});
