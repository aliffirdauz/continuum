import { defineConfig, devices } from "@playwright/test";

// Runs against an already running, seeded stack such as `docker compose up`.
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  reporter: [["list"]],
  retries: process.env.CI ? 1 : 0,
  // Six concurrent browsers on a laptop intermittently stalled a sign-in fetch
  // inside Chromium while the server stayed responsive; three ran reliably.
  workers: 3,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
