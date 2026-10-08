import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD ?? "ContinuumDemo123!";

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill("manager@northstar.demo");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

const overflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test("explanation drawers open, trap focus, and return it with the keyboard", async ({
  page,
}) => {
  await signIn(page);
  await expect(page.getByText("Active transfer plans")).toBeVisible();
  await expect(page.getByText(/primary holder/).first()).toBeVisible();

  const trigger = page.getByRole("button", { name: "How risk is calculated" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", {
    name: "How knowledge risk is calculated",
  });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("risk-v1");
  await expect(
    drawer.getByRole("button", { name: "Close explanation" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.goto("/knowledge/ka_line4_troubleshooting");
  await page.getByRole("button", { name: "How these figures work" }).click();
  const figures = page.getByRole("dialog", {
    name: "How risk and expertise are calculated",
  });
  await expect(figures).toContainText("Effective experts");
  await figures.getByRole("button", { name: "Close explanation" }).click();
  await expect(figures).toBeHidden();
});

test("definitions appear on focus, dismiss with Escape, and fit a 375-pixel screen", async ({
  page,
}) => {
  await signIn(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/dashboard");
  const tip = page.getByRole("button", {
    name: "About Average effective experts",
  });
  await tip.focus();
  const tooltip = page.getByRole("tooltip").filter({ visible: true });
  await expect(tooltip).toContainText("inverse HHI");
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);

  await page.getByRole("button", { name: "How risk is calculated" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test("every primary page fits a 375-pixel screen with a visible heading", async ({
  page,
}) => {
  await signIn(page);
  await page.setViewportSize({ width: 375, height: 812 });
  for (const url of [
    "/dashboard",
    "/knowledge?risk=CRITICAL",
    "/knowledge/ka_line4_troubleshooting",
    "/experts?q=line+4",
    "/people",
    "/people/emp_budi",
    "/simulate",
    "/transfers",
    "/transfers/new?knowledgeArea=ka_warranty_claims",
  ]) {
    await page.goto(url);
    await expect(page.locator("main h1"), url).toBeVisible();
    expect(await overflow(page), url).toBeLessThanOrEqual(0);
  }
});
