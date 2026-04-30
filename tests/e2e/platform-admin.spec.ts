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
  await expect(page.getByText("restaurant.provisioning.jobs.failed")).toBeVisible();
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
  await expect(page.getByRole("link", { name: "Open job detail" })).toBeVisible();
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
  await page.getByRole("button", { name: "Prepare infra" }).click();
  await expect(page.getByText(/Infra prepare queued as job/)).toBeVisible();
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

      await page.goto("/restaurants/33333333-3333-4333-8333-333333333333");
      await expectTheme(page, theme);
      await expect(page.getByRole("heading", { name: "Smoke Provisioned Foods" })).toBeVisible();
      await expect(page.getByText("tenant_smoke_provisioned", { exact: true })).toBeVisible();
      await waitForScreenshotReady(page);
      await expect(page).toHaveScreenshot(`restaurant-${theme.name}.png`, screenshotOptions);
    });
  }
});
