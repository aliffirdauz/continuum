import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD ?? "ContinuumDemo123!";

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("manager creates a hypothetical run and revisits the immutable result by URL", async ({
  page,
}) => {
  const browserApiCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http://localhost:3001/")) {
      browserApiCalls.push(request.url());
    }
  });
  await signIn(page, "manager@northstar.demo");

  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Simulation" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Unavailability simulation" }),
  ).toBeVisible();
  await expect(
    page.getByText(/not an employee\s+performance rating/),
  ).toBeVisible();

  const employee = page.getByRole("combobox", { name: "Active employee" });
  await employee.focus();
  await employee.selectOption("emp_budi");
  await page.keyboard.press("Tab");
  const duration = page.getByRole("spinbutton", {
    name: "Unavailable for (days)",
  });
  await expect(duration).toBeFocused();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("45");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Create simulation" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/simulate\/[^/?]+$/);
  await expect(
    page.getByRole("heading", { name: "Affected knowledge areas" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Budi Santoso were unavailable for 45 days/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Production Line 4 Troubleshooting" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Connected business objects" }),
  ).toBeVisible();

  const savedUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(savedUrl);
  await expect(
    page.getByText(/Budi Santoso were unavailable for 45 days/),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Filter results by department" })
    .getByRole("link", { name: "Finance" })
    .click();
  await expect(page).toHaveURL(/department=dep_finance/);
  await expect(
    page.getByText("No affected knowledge areas in this department."),
  ).toBeVisible();

  await page.goto(savedUrl);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator("main h1")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);

  expect(browserApiCalls).toEqual([]);
  const session = await page.request.get("/api/auth/session");
  expect(await session.text()).not.toMatch(
    /accessToken|Bearer [A-Za-z0-9_.-]{20,}/,
  );
});

test("a rejected submission keeps the entered selection and duration for retry", async ({
  page,
}) => {
  await signIn(page, "manager@northstar.demo");
  await page.goto("/simulate");
  const employee = page.getByRole("combobox", { name: "Active employee" });
  // Simulate a person who became unavailable after the page loaded.
  await page
    .locator('option[value="emp_budi"]')
    .evaluate((option) => option.setAttribute("value", "emp_missing"));
  await employee.selectOption("emp_missing");
  const duration = page.getByRole("spinbutton", {
    name: "Unavailable for (days)",
  });
  await duration.fill("45");
  await page.getByRole("button", { name: "Create simulation" }).click();
  await expect(page.locator("main [role='alert']")).toContainText(
    "The employee is unavailable",
  );
  await expect(page).toHaveURL(/\/simulate$/);
  await expect(employee).toHaveValue("emp_missing");
  await expect(duration).toHaveValue("45");
});

test("unknown runs render the not-found state", async ({ page }) => {
  await signIn(page, "manager@northstar.demo");
  await page.goto("/simulate/sim_missing");
  await expect(
    page.getByRole("heading", { name: "We could not find that record" }),
  ).toBeVisible();
});

test("employee viewers cannot reach the simulation form or results", async ({
  page,
}) => {
  await signIn(page, "employee@northstar.demo");
  await page.goto("/simulate");
  await expect(
    page.getByText(
      "Simulation is available to managers and knowledge admins only.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create simulation" }),
  ).toHaveCount(0);
  await page.goto("/simulate/sim_missing");
  await expect(
    page.getByText(
      "Simulation is available to managers and knowledge admins only.",
    ),
  ).toBeVisible();
});

test("anonymous visitors cannot see simulation setup or results", async ({
  page,
}) => {
  await page.goto("/simulate");
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto("/simulate/sim_missing");
  await expect(page).toHaveURL(/\/sign-in/);
});
