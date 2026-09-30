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

  test("filters people and opens a profile with per-area expertise", async ({
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
    await expect(page.locator("#expertise")).toContainText(
      "Expertise by knowledge area",
    );
    await expect(page.locator("#expertise")).toContainText(
      "Hydraulic Calibration",
    );
    await expect(page.locator("#expertise")).toContainText("confidence");
    await expect(page.locator("main")).not.toContainText(/risk level/i);
  });

  test("finds expertise by area and explains evidence", async ({ page }) => {
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Experts" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Expert Finder" }),
    ).toBeVisible();
    await page.getByLabel("Knowledge topic").fill("line 4");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(
      page.getByRole("link", { name: "Production Line 4 Troubleshooting" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Explore evidence and coverage" })
      .first()
      .click();
    await expect(page.locator("#expertise")).toContainText("effective experts");
    await page.locator("#expertise details summary").first().click();
    await expect(page.locator("#expertise details").first()).toContainText(
      "Contribution",
    );
  });

  test("navigates Expert Finder and evidence explanation with a keyboard", async ({
    page,
  }) => {
    await page.goto("/experts");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    await page.keyboard.press("Tab");
    const topic = page.getByRole("searchbox", { name: "Knowledge topic" });
    await expect(topic).toBeFocused();
    await page.keyboard.type("line 4");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/experts\?q=line\+4/);

    const result = page.getByRole("link", {
      name: "Production Line 4 Troubleshooting",
    });
    await expect(result).toBeVisible();
    for (let index = 0; index < 15; index += 1) {
      if (await result.evaluate((node) => node === document.activeElement))
        break;
      await page.keyboard.press("Tab");
    }
    await expect(result).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/knowledge\/ka_line4_troubleshooting/);

    const explanation = page.locator("#expertise details summary").first();
    for (let index = 0; index < 35; index += 1) {
      if (await explanation.evaluate((node) => node === document.activeElement))
        break;
      await page.keyboard.press("Tab");
    }
    await expect(explanation).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#expertise details").first()).toHaveAttribute(
      "open",
      "",
    );
    await expect(page.locator("#expertise details").first()).toContainText(
      "Contribution",
    );
  });

  test("covers alternative search, empty results, and a profile without evidence", async ({
    page,
  }) => {
    await page.goto("/experts?q=Japan+machinery+import");
    await expect(
      page.getByRole("link", { name: "Japan Machinery Import Process" }),
    ).toBeVisible();
    await page.goto("/experts?q=no-such-expertise");
    await expect(page.getByText("No matching knowledge areas")).toBeVisible();
    await page.goto("/people/emp_ayu");
    await expect(page.locator("#expertise")).toContainText(
      "No expertise evidence yet",
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

    for (const path of [
      "/dashboard",
      "/knowledge",
      "/knowledge/ka_line4_troubleshooting",
      "/experts?q=line+4",
      "/people/emp_budi",
    ]) {
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
