import { expect, type Page, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { themeStorageKey, type ThemeMode, type ThemePreset } from "@/components/theme/theme-config";

type VisualTheme = {
  name: string;
  preset: ThemePreset;
  mode: ThemeMode;
};

const visualThemes: VisualTheme[] = [
  { name: "lantern-light", preset: "lantern", mode: "light" },
  { name: "lantern-dark", preset: "lantern", mode: "dark" },
  { name: "harbor-light", preset: "harbor", mode: "light" },
  { name: "harbor-dark", preset: "harbor", mode: "dark" },
  { name: "ember-light", preset: "ember", mode: "light" },
  { name: "ember-dark", preset: "ember", mode: "dark" },
  { name: "forest-light", preset: "forest", mode: "light" },
  { name: "forest-dark", preset: "forest", mode: "dark" }
];

const coreVisualThemes = [
  visualThemes[0],
  visualThemes.find((theme) => theme.name === "harbor-dark")
].filter((theme): theme is VisualTheme => Boolean(theme));

const screenshotOptions = {
  animations: "disabled",
  caret: "hide",
  fullPage: true,
  scale: "css"
} as const;

async function submitLogin(page: Page) {
  await page.getByLabel("Platform admin email").fill("admin@example.com");
  await page.getByLabel("Password").fill("change-me-platform-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

async function login(page: Page) {
  await page.goto("/login");
  await submitLogin(page);
}

async function seedTheme(page: Page, theme: VisualTheme) {
  await page.addInitScript(
    ({ key, preference }) => {
      window.localStorage.setItem(key, JSON.stringify(preference));
    },
    {
      key: themeStorageKey,
      preference: { preset: theme.preset, mode: theme.mode }
    }
  );
}

async function expectTheme(page: Page, theme: VisualTheme) {
  await expect(page.locator("html")).toHaveAttribute("data-theme-preset", theme.preset);
  await expect(page.locator("html")).toHaveAttribute("data-theme-mode", theme.mode);
}

async function waitForScreenshotReady(page: Page) {
  await page.evaluate(() => document.fonts?.ready);
}

async function expectDashboardLoaded(page: Page) {
  await expect(page.getByText("control_plane_postgres")).toBeVisible();
  await expect(
    page.locator('[data-counter-name="restaurant_provisioning.jobs_failed_current"]')
  ).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
}

test("dashboard loads with accessible core landmarks", async ({ page }) => {
  await login(page);

  await expect(page.getByText("Backend readiness")).toBeVisible();
  await expect(page.getByText("Recent provisioning jobs")).toBeVisible();
  await expect(page.getByRole("link", { name: "Monitor jobs" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("dashboard runtime counters stay inside their tiles", async ({ page }) => {
  await login(page);
  await expectDashboardLoaded(page);

  const overflowingCounters = await page.getByTestId("runtime-counter-card").evaluateAll((cards) =>
    cards
      .map((card) => {
        const overflowed = card.scrollWidth > card.clientWidth + 1;
        return overflowed ? card.textContent?.trim() : null;
      })
      .filter(Boolean)
  );

  expect(overflowingCounters).toEqual([]);
});

test("searches restaurant directory and opens summary", async ({ page }) => {
  await login(page);
  await page.goto("/restaurants");

  await expect(page.getByRole("heading", { name: "Restaurants" })).toBeVisible();
  await expect(
    page.locator('[data-testid="restaurant-directory-row"]:visible').first()
  ).toContainText("Smoke Provisioned Foods");
  await page.getByLabel("Search").fill("smoke");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/q=smoke/);
  await expect(page).toHaveURL(/sort_by=updated_at/);
  await expect(page).toHaveURL(/sort_dir=desc/);
  await expect(page).toHaveURL(/page=1/);
  await expect(
    page.locator('[data-testid="restaurant-directory-row"]:visible').first()
  ).toContainText("Smoke Provisioned Foods");
  await expect(page.getByText("Draft Curry")).toBeHidden();
  await page.getByRole("link", { name: "Summary" }).click();

  await expect(page.getByRole("heading", { name: /Restaurant 33333333/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Smoke Provisioned Foods" })).toBeVisible();
});

test("sorts restaurant directory without page overflow", async ({ page }) => {
  await login(page);
  await page.goto("/restaurants");

  const visibleRows = page.locator('[data-testid="restaurant-directory-row"]:visible');
  await expect(visibleRows.first()).toContainText("Smoke Provisioned Foods");

  const restaurantSortButton = page.getByRole("button", { name: "Sort by restaurant" });
  if (await restaurantSortButton.isVisible()) {
    await restaurantSortButton.click();
  } else {
    await page.goto("/restaurants?sort_by=display_name&sort_dir=asc&page=1");
  }
  await expect(page).toHaveURL(/sort_by=display_name/);
  await expect(page).toHaveURL(/sort_dir=asc/);
  await expect(visibleRows.first()).toContainText("Draft Curry");

  const updatedSortButton = page.getByRole("button", { name: "Sort by updated" });
  if (await updatedSortButton.isVisible()) {
    await updatedSortButton.click();
  } else {
    await page.goto("/restaurants?sort_by=updated_at&sort_dir=desc&page=1");
  }
  await expect(page).toHaveURL(/sort_by=updated_at/);
  await expect(page).toHaveURL(/sort_dir=desc/);

  const bodyOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(bodyOverflow).toBeLessThanOrEqual(1);
});

test("restaurant directory filter controls stay aligned", async ({ page }) => {
  await login(page);
  await page.goto("/restaurants");
  await expect(page.getByRole("heading", { name: "Restaurants" })).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth < 1024) {
    await expect(page.getByTestId("restaurant-search-submit")).toBeVisible();
    return;
  }

  const searchInput = page.getByTestId("restaurant-search-control").getByLabel("Search");
  const statusSelect = page.getByTestId("restaurant-status-control").getByLabel("Status");
  const searchButton = page.getByTestId("restaurant-search-submit");
  await expect(searchInput).toBeVisible();
  await expect(statusSelect).toBeVisible();
  await expect(searchButton).toBeVisible();

  const searchBox = await searchInput.boundingBox();
  const statusBox = await statusSelect.boundingBox();
  const buttonBox = await searchButton.boundingBox();
  const iconBox = await searchButton.locator("svg").boundingBox();
  const labelBox = await searchButton.locator("span").boundingBox();
  if (!searchBox || !statusBox || !buttonBox || !iconBox || !labelBox) {
    throw new Error("Restaurant directory filter controls were not measurable");
  }

  expect(Math.abs(searchBox.y - statusBox.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(searchBox.height - statusBox.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(searchBox.y - buttonBox.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(searchBox.height - buttonBox.height)).toBeLessThanOrEqual(1);

  const iconCenterY = iconBox.y + iconBox.height / 2;
  const labelCenterY = labelBox.y + labelBox.height / 2;
  expect(Math.abs(iconCenterY - labelCenterY)).toBeLessThanOrEqual(1);
});

test("queues a provisioning request", async ({ page }) => {
  await login(page);
  await page.goto("/provision");

  await page.getByLabel("External code").fill("SMOKE-PROVISIONED");
  await page.getByLabel("Slug").fill("smoke-provisioned");
  await page.getByLabel("Legal name").fill("Smoke Provisioned Foods Pvt Ltd");
  await page.getByLabel("Display name").fill("Smoke Provisioned Foods");
  await page.getByLabel("Owner full name").fill("Smoke Owner");
  await page.getByLabel("Owner phone number").fill("+913333333333");
  await page.getByLabel("Owner email").fill("owner@smoke-provisioned.test");
  await page.getByRole("button", { name: "Queue provisioning" }).click();

  await expect(page.getByText("Provisioning queued")).toBeVisible();
  await expect(page.getByText("The form has been cleared")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open job detail" })).toBeVisible();
  await expect(page.getByLabel("External code")).toBeHidden();

  await page.getByRole("button", { name: "Provision another" }).click();
  await expect(page.getByLabel("External code")).toBeVisible();
  await expect(page.getByLabel("External code")).toHaveValue("");
  await expect(page.getByLabel("Schema version")).toHaveValue("restaurant_template/0001_init.sql");
});

test("opens job detail and confirms retry", async ({ page }) => {
  await login(page);
  await page.goto("/jobs/job-failed-001");

  await expect(page.getByRole("heading", { name: /Job job-failed-001/ })).toBeVisible();
  await page.getByRole("button", { name: "Retry failed job" }).click();
  await expect(page.getByRole("dialog", { name: "Retry failed job" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm retry failed job" }).click();
  await expect(page.getByRole("dialog", { name: "Retry failed job" })).toBeHidden();
});

test("opens restaurant summary and queues infra prepare", async ({ page }) => {
  await login(page);
  await page.goto("/restaurants/33333333-3333-4333-8333-333333333333");

  await expect(page.getByRole("heading", { name: /Restaurant 33333333/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Smoke Provisioned Foods" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tenant infra lifecycle" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Database Backup" })).toBeVisible();
  await page.getByRole("button", { name: "Prepare infra" }).click();
  await expect(page.getByText(/Infra prepare queued as job/)).toBeVisible();
});

test("queues a database backup lifecycle operation with step-up", async ({ page }) => {
  await login(page);
  await page.goto("/restaurants/33333333-3333-4333-8333-333333333333");

  await page.getByRole("button", { name: "Database Backup" }).click();
  const dialog = page.getByRole("dialog", { name: "Database Backup" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Platform admin password").fill("change-me-platform-admin-password");
  await dialog.getByRole("button", { name: "Confirm database backup" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText(/Database backup operation .* succeeded/i)).toBeVisible({
    timeout: 12_000
  });
  await expect(page.getByText("tenant_smoke_provisioned_backup_22222222")).toBeVisible();
});

test("requires lifecycle confirmations and disables controls during active operations", async ({
  page
}) => {
  await login(page);
  const restaurantId = "33333333-3333-4333-8333-333333333333";
  await page.goto(`/restaurants/${restaurantId}`);

  await page.getByRole("button", { name: "Disable" }).click();
  const disableDialog = page.getByRole("dialog", { name: "Disable" });
  await disableDialog
    .getByLabel("Platform admin password")
    .fill("change-me-platform-admin-password");
  await disableDialog.getByLabel("Operator reason").fill("Testing disable confirmation");
  await expect(disableDialog.getByRole("button", { name: "Confirm disable" })).toBeDisabled();
  await disableDialog.getByLabel("Confirm restaurant ID").fill("wrong-id");
  await expect(page.getByText("Restaurant ID must match exactly.")).toBeVisible();
  await disableDialog.getByLabel("Confirm restaurant ID").fill(restaurantId);
  await expect(disableDialog.getByRole("button", { name: "Confirm disable" })).toBeEnabled();
  await disableDialog.getByRole("button", { name: "Confirm disable" }).click();

  await expect(disableDialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Database Backup" })).toBeDisabled();
  await expect(page.getByText(/Disable operation .* succeeded/i)).toBeVisible({ timeout: 12_000 });

  await page.getByRole("button", { name: "Re-enable" }).click();
  const reEnableDialog = page.getByRole("dialog", { name: "Re-enable" });
  await reEnableDialog
    .getByLabel("Platform admin password")
    .fill("change-me-platform-admin-password");
  await reEnableDialog.getByLabel("Operator reason").fill("Testing re-enable confirmation");
  await expect(reEnableDialog.getByRole("button", { name: "Confirm re-enable" })).toBeDisabled();
  await reEnableDialog.getByLabel("Confirm restaurant ID").fill(restaurantId);
  await expect(reEnableDialog.getByRole("button", { name: "Confirm re-enable" })).toBeEnabled();
  await reEnableDialog.getByRole("button", { name: "Confirm re-enable" }).click();
  await expect(page.getByText(/Re-enable operation .* succeeded/i)).toBeVisible({
    timeout: 12_000
  });
});

test("requires typed restaurant ID and slug for permanent delete", async ({ page }) => {
  await login(page);
  const restaurantId = "33333333-3333-4333-8333-333333333333";
  await page.goto(`/restaurants/${restaurantId}`);

  await page.getByRole("button", { name: "Permanent delete" }).click();
  const dialog = page.getByRole("dialog", { name: "Permanent delete" });
  await dialog.getByLabel("Platform admin password").fill("change-me-platform-admin-password");
  await dialog.getByLabel("Operator reason").fill("Testing permanent delete confirmation");
  await dialog.getByLabel("Confirm restaurant ID").fill(restaurantId);
  await expect(dialog.getByRole("button", { name: "Confirm permanent delete" })).toBeDisabled();
  await dialog.getByLabel("Confirm slug").fill("wrong-slug");
  await expect(page.getByText("Slug must match exactly.")).toBeVisible();
  await dialog.getByLabel("Confirm slug").fill("smoke-provisioned");
  await expect(dialog.getByRole("button", { name: "Confirm permanent delete" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Close" }).click();
});

test("searches scoped audit events", async ({ page }) => {
  await login(page);
  await page.goto("/audit?restaurant_id=33333333-3333-4333-8333-333333333333");

  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("provisioning_requested")).toBeVisible();
  await expect(page.getByText("Provisioning was requested by a platform operator.")).toBeVisible();
});

test.describe("branded visual baselines", () => {
  for (const theme of visualThemes) {
    test(`dashboard visual baseline uses ${theme.name}`, async ({ page }) => {
      await seedTheme(page, theme);
      await login(page);
      await expectTheme(page, theme);
      await expectDashboardLoaded(page);
      await waitForScreenshotReady(page);

      await expect(page).toHaveScreenshot(`dashboard-${theme.name}.png`, screenshotOptions);
    });
  }

  for (const theme of coreVisualThemes) {
    test(`critical page visual baselines use ${theme.name}`, async ({ page }) => {
      test.slow();
      await seedTheme(page, theme);

      await page.goto("/login");
      await expectTheme(page, theme);
      await expect(page.getByRole("heading", { name: "Platform Admin" })).toBeVisible();
      await waitForScreenshotReady(page);
      await expect(page).toHaveScreenshot(`login-${theme.name}.png`, screenshotOptions);

      await submitLogin(page);

      await page.goto("/jobs");
      await expectTheme(page, theme);
      await expect(page.getByRole("heading", { name: "Provisioning jobs" })).toBeVisible();
      await expect(page.locator("tbody tr")).toHaveCount(3);
      await waitForScreenshotReady(page);
      await expect(page).toHaveScreenshot(`jobs-${theme.name}.png`, screenshotOptions);

      await page.goto("/restaurants");
      await expectTheme(page, theme);
      await expect(page.getByRole("heading", { name: "Restaurants" })).toBeVisible();
      await expect(
        page.locator('[data-testid="restaurant-directory-row"]:visible').first()
      ).toContainText("Smoke Provisioned Foods");
      await waitForScreenshotReady(page);
      await expect(page).toHaveScreenshot(`restaurants-${theme.name}.png`, screenshotOptions);

      await page.goto("/restaurants/33333333-3333-4333-8333-333333333333");
      await expectTheme(page, theme);
      await expect(page.getByRole("heading", { name: "Smoke Provisioned Foods" })).toBeVisible();
      await expect(
        page.getByText("tenant_smoke_provisioned", { exact: true }).first()
      ).toBeVisible();
      await waitForScreenshotReady(page);
      await expect(page).toHaveScreenshot(`restaurant-${theme.name}.png`, screenshotOptions);
    });
  }
});
