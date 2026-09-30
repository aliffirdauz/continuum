import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Opt-in only: this test stops the local Compose API temporarily. Never run it
// against a shared environment or as part of the regular parallel E2E suite.
test.skip(
  !process.env.RUN_OUTAGE_ACCEPTANCE,
  "Requires explicit local outage opt-in",
);

const repoRoot = path.resolve(process.cwd(), "../..");
const password = process.env.E2E_PASSWORD ?? "ContinuumDemo123!";

function compose(...args: string[]) {
  execFileSync("docker", ["compose", ...args], {
    cwd: repoRoot,
    timeout: 60_000,
    stdio: "pipe",
  });
}

test("Expert Finder handles API outage and recovers after restart", async ({
  page,
  request,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill("manager@northstar.demo");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/experts?q=line+4");
  await expect(
    page.getByRole("heading", { name: "Expert Finder" }),
  ).toBeVisible();

  try {
    compose("stop", "api");
    await page.reload();
    const alert = page.locator("main [role='alert']");
    await expect(alert).toContainText("We could not load this page");
    await expect(alert).not.toContainText(
      /fetch failed|ECONNREFUSED|postgres|redis/i,
    );
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  } finally {
    compose("start", "api");
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
  await expect(
    page.getByRole("heading", { name: "Expert Finder" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Production Line 4 Troubleshooting" }),
  ).toBeVisible();
});
