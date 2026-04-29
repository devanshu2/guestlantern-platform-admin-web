import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Platform admin email").fill("admin@example.com");
  await page.getByLabel("Password").fill("change-me-platform-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("real Docker backend: provision, monitor, inspect restaurant, audit, and logout", async ({
  page
}) => {
  test.setTimeout(120_000);

  const tenantId = randomUUID();
  const suffix = Date.now().toString(36);
  const slug = `web-e2e-${suffix}`;
  const displayName = `Web E2E ${suffix}`;

  await login(page);
  await expect(page.getByText("Backend readiness")).toBeVisible();

  await page.goto("/provision");
  await page.getByLabel("Tenant ID").fill(tenantId);
  await page.getByLabel("External code").fill(`WEB-E2E-${suffix.toUpperCase()}`);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Legal name").fill(`${displayName} Foods Pvt Ltd`);
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Owner full name").fill("Web E2E Owner");
  await page.getByLabel("Owner phone number").fill("+913333333334");
  await page.getByLabel("Owner email").fill(`owner+${suffix}@guestlantern.test`);
  await page.getByRole("button", { name: "Queue provisioning" }).click();

  await expect(page.getByText("Provisioning queued")).toBeVisible();
  const openJobLink = page.getByRole("link", { name: "Open job detail" });
  const jobHref = await openJobLink.getAttribute("href");
  expect(jobHref).toMatch(/^\/jobs\/.+/);
  const jobId = jobHref?.replace("/jobs/", "") ?? "";
  await openJobLink.click();
  await expect(page.getByRole("heading", { name: `Job ${jobId}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Job status" })).toBeVisible();
  await expect(page.getByText(tenantId)).toBeVisible();

  await expect(page.getByText("Runtime receipt")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("provisioning_succeeded")).toBeVisible();

  await page.getByRole("link", { name: "Open restaurant summary" }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(`Restaurant ${tenantId.slice(0, 8)}`) })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: displayName })).toBeVisible();
  await page.getByRole("button", { name: "Prepare infra" }).click();
  await expect(page.getByText(/Infra prepare queued as job/)).toBeVisible();

  await page.goto(`/audit?restaurant_id=${tenantId}`);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("provisioning_succeeded")).toBeVisible();
  const actorEmailCount = await page.locator("main").getByText("admin@example.com").count();
  expect(actorEmailCount).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Platform Admin" })).toBeVisible();
});
