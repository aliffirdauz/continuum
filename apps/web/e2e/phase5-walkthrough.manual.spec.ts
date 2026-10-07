import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Opt-in on a local Compose stack only: this stops the API briefly and writes
// screenshots to WALKTHROUGH_OUTPUT_DIR for human inspection.
test.skip(
  !process.env.RUN_PHASE5_WALKTHROUGH,
  "Requires explicit local walkthrough opt-in",
);

const repoRoot = path.resolve(process.cwd(), "../..");
const compose = (action: "stop" | "start") =>
  execFileSync("docker", ["compose", action, "api"], {
    cwd: repoRoot,
    timeout: 60_000,
    stdio: "pipe",
  });

async function waitForApi(page: Page) {
  await expect
    .poll(
      async () => {
        try {
          return (
            await page.request.get("http://localhost:3001/api/v1/health/ready")
          ).status();
        } catch {
          return 0;
        }
      },
      { timeout: 60_000 },
    )
    .toBe(200);
}

test("Phase 5 simulation walkthrough and outage recovery", async ({ page }) => {
  const outputDir = process.env.WALKTHROUGH_OUTPUT_DIR;
  if (!outputDir) throw new Error("WALKTHROUGH_OUTPUT_DIR is required");
  const shot = (name: string) =>
    page.screenshot({ path: path.join(outputDir, name), fullPage: true });
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

  await page.goto("/simulate");
  await expect(page.locator("main h1")).toHaveText("Unavailability simulation");
  await shot("simulate-form-desktop.png");

  const employee = page.getByRole("combobox", { name: "Active employee" });
  await employee.focus();
  await employee.selectOption("emp_budi");
  await page.keyboard.press("Tab");
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("30");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Create simulation" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/simulate\/[^/?]+$/);
  await expect(
    page.getByRole("heading", { name: "Affected knowledge areas" }),
  ).toBeVisible();
  const resultUrl = page.url();
  await page.getByText("Risk factor contributions").first().click();
  await shot("simulate-result-desktop.png");

  await page.setViewportSize({ width: 375, height: 812 });
  for (const url of ["/simulate", resultUrl]) {
    await page.goto(url);
    await expect(page.locator("main h1")).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, url).toBeLessThanOrEqual(0);
  }
  await shot("simulate-result-mobile.png");
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto("/simulate/sim_missing");
  await expect(
    page.getByRole("heading", { name: "We could not find that record" }),
  ).toBeVisible();
  await shot("simulate-unknown-run.png");

  expect(consoleErrors).toEqual([]);
  expect(browserApiCalls).toEqual([]);
  const session = await page.request.get("/api/auth/session");
  expect(session.status()).toBe(200);
  expect(await session.text()).not.toMatch(
    /accessToken|Bearer [A-Za-z0-9_.-]{20,}/,
  );

  await page.goto("/simulate");
  await page
    .getByRole("combobox", { name: "Active employee" })
    .selectOption("emp_budi");
  try {
    compose("stop");
    await page.getByRole("button", { name: "Create simulation" }).click();
    await expect(page.locator("main [role='alert']")).toHaveText(
      "Could not save this simulation. Please try again.",
    );
    await expect(
      page.getByRole("combobox", { name: "Active employee" }),
    ).toHaveValue("emp_budi");
    await shot("simulate-create-outage.png");
    await page.goto(resultUrl);
    const alert = page.locator("main [role='alert']");
    await expect(alert).toContainText("We could not load this page");
    await expect(alert).not.toContainText(
      /fetch failed|ECONNREFUSED|postgres|redis/i,
    );
    await shot("simulate-result-outage.png");
  } finally {
    compose("start");
  }
  await waitForApi(page);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Affected knowledge areas" }),
  ).toBeVisible();
  await shot("simulate-result-recovered.png");
});
