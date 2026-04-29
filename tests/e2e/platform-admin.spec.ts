import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Platform admin email").fill("admin@example.com");
  await page.getByLabel("Password").fill("change-me-platform-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("dashboard loads with accessible core landmarks", async ({ page }) => {
  await login(page);

  await expect(page.getByText("Backend readiness")).toBeVisible();
  await expect(page.getByText("Recent provisioning jobs")).toBeVisible();
  await expect(page.getByRole("link", { name: "Monitor jobs" })).toBeVisible();

  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
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
