import { expect, test, type Page } from "@playwright/test";

const PASSWORD = process.env.E2E_PASSWORD ?? "ContinuumDemo123!";

async function signIn(page: Page) {
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));

  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill("manager@northstar.demo");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // A submission before hydration once sent the credentials as URL parameters.
  expect(requestedUrls.filter((url) => /password/i.test(url))).toEqual([]);
}

test("redirects anonymous visitors away from knowledge pages", async ({
  page,
}) => {
  await page.goto("/knowledge/ka_line4_troubleshooting");

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByText("Production Line 4")).toHaveCount(0);
});

test.describe("signed in", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("shows the knowledge inventory on the dashboard", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Knowledge overview" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Inventory totals" }),
    ).toContainText("25");
    await expect(
      page.getByRole("link", { name: "Production Line 4 Troubleshooting" }),
    ).toBeVisible();
  });

  test("inspects a critical knowledge area and its evidence", async ({
    page,
  }) => {
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Knowledge" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Knowledge areas" }),
    ).toBeVisible();

    await page.getByLabel("Search").fill("line 4");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/q=line\+4/);
    await expect(
      page.getByText("2 knowledge areas", { exact: true }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "Production Line 4 Troubleshooting" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Production Line 4 Troubleshooting" }),
    ).toBeVisible();
    await expect(
      page.getByText("Production Line 4", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Budi Santoso" }).first(),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Filter evidence by type" })
      .getByRole("link", { name: /Incident resolved/ })
      .click();
    await expect(page).toHaveURL(/type=INCIDENT_RESOLVED/);
    await expect(
      page
        .getByRole("table", { name: /Evidence for Production Line 4/ })
        .locator("tbody tr"),
    ).toHaveCount(3);
  });

  test("filters people and opens a profile without scores", async ({
    page,
  }) => {
    await page.goto("/people");
    await page
      .getByLabel("Department")
      .selectOption({ label: "Manufacturing" });
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("7 people", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Budi Santoso" }).click();
    await expect(
      page.getByRole("heading", { name: "Budi Santoso" }),
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Knowledge areas with evidence" }),
    ).toContainText("Hydraulic Calibration");
    await expect(page.locator("main")).not.toContainText(
      /expertise score|risk level/i,
    );
  });

  test("shows empty and not-found states", async ({ page }) => {
    await page.goto("/knowledge?q=no-such-knowledge");
    await expect(
      page.getByText("No knowledge areas match these filters"),
    ).toBeVisible();

    await page.goto("/knowledge/ka_missing");
    await expect(
      page.getByRole("heading", { name: "We could not find that record" }),
    ).toBeVisible();
  });

  test("works on a narrow screen without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const path of ["/dashboard", "/knowledge", "/people/emp_budi"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }

    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "People" })
      .click();
    await expect(page).toHaveURL(/\/people$/);
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  });
});
