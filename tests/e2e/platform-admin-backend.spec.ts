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
  test.setTimeout(180_000);

  const suffix = Date.now().toString(36);
  const slug = `web-e2e-${suffix}`;
  const displayName = `Web E2E ${suffix}`;
  const provisionBodies: Array<Record<string, unknown>> = [];

  await page.route("**/api/platform/restaurants/provision", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      provisionBodies.push(JSON.parse(request.postData() ?? "{}"));
    }
    await route.continue();
  });
  await login(page);
  await expect(page.getByText("Backend readiness")).toBeVisible();

  await page.goto("/provision");
  await page.getByLabel("Slug").fill(`${slug}-missing`);
  await page.getByRole("button", { name: "Queue provisioning" }).click();
  await expect(page.getByText("Provisioning queued")).toBeHidden();
  expect(provisionBodies).toHaveLength(0);

  await page.getByLabel("Slug").fill("");
  await page.getByLabel("External code").fill(`WEB-E2E-${suffix.toUpperCase()}`);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Legal name").fill(`${displayName} Foods Pvt Ltd`);
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Owner full name").fill("Web E2E Owner");
  await page.getByLabel("Owner phone number").fill("+913333333334");
  await page.getByLabel("Owner email").fill(`owner+${suffix}@guestlantern.test`);
  await page.getByRole("button", { name: "Queue provisioning" }).click();

  await expect(page.getByText("Provisioning queued")).toBeVisible();
  expect(provisionBodies).toHaveLength(1);
  const openJobLink = page.getByRole("link", { name: "Open job detail" });
  const jobHref = await openJobLink.getAttribute("href");
  expect(jobHref).toMatch(/^\/jobs\/.+/);
  const jobId = jobHref?.replace("/jobs/", "") ?? "";
  await openJobLink.click();
  await expect(page.getByRole("heading", { name: `Job ${jobId}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Job status" })).toBeVisible();

  const summaryLink = page.getByRole("link", { name: "Open restaurant summary" });
  await expect(summaryLink).toBeVisible();
  const summaryHref = await summaryLink.getAttribute("href");
  const tenantId = summaryHref?.replace("/restaurants/", "") ?? "";
  expect(tenantId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
  await expect(page.getByText(tenantId)).toBeVisible();

  await expect(page.getByText("Runtime receipt")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("provisioning_succeeded")).toBeVisible();

  await page.goto(`/restaurants?q=${slug}`);
  await expect(page.getByRole("heading", { name: "Restaurants" })).toBeVisible();
  await expect(
    page.locator('[data-testid="restaurant-directory-row"]:visible').first()
  ).toContainText(displayName);
  await page.getByRole("link", { name: "Summary" }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(`Restaurant ${tenantId.slice(0, 8)}`) })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: displayName })).toBeVisible();
  await expect(page.getByRole("button", { name: "Database Backup" })).toBeEnabled({
    timeout: 30_000
  });

  const authBodies: Array<Record<string, unknown>> = [];
  const databaseBodies: Array<Record<string, unknown>> = [];
  await page.route(`**/api/platform/restaurants/${tenantId}/auth-config`, async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      authBodies.push(JSON.parse(request.postData() ?? "{}"));
    }
    await route.continue();
  });
  await page.route(`**/api/platform/restaurants/${tenantId}/database-config`, async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      databaseBodies.push(JSON.parse(request.postData() ?? "{}"));
    }
    await route.continue();
  });

  const originalIssuer = await page.locator('input[name="issuer"]').inputValue();
  const originalAudience = await page.locator('input[name="audience"]').inputValue();
  const originalAlgorithm = await page.locator('input[name="signing_algorithm"]').inputValue();
  const originalJwtSecretRef = await page.locator('input[name="jwt_secret_ref"]').inputValue();

  await page.locator('input[name="safe_access_token_ttl_seconds"]').fill("1200");
  await page.locator('input[name="safe_refresh_token_ttl_seconds"]').fill("2592600");
  const safeOtpCode = page.locator('input[name="safe_dev_static_otp_code"]');
  if (await safeOtpCode.isVisible()) {
    await safeOtpCode.fill("654321");
  }
  await page.getByRole("button", { name: "Save safe auth update" }).click();
  await expect(
    page.getByText("Safe auth settings saved. Unchanged auth fields were preserved.")
  ).toBeVisible();
  expect(authBodies[0]).toMatchObject({
    issuer: originalIssuer,
    audience: originalAudience,
    signing_algorithm: originalAlgorithm,
    jwt_secret_ref: originalJwtSecretRef,
    access_token_ttl_seconds: 1200,
    refresh_token_ttl_seconds: 2592600
  });
  await expect(page.getByText("Confirm auth repair")).toBeHidden();

  const primaryHost = `${slug}.guestlantern.localhost`;
  const safeHost = `${slug}-safe.guestlantern.localhost`;
  await page.locator('input[name="domain_host"]').fill(safeHost);
  await page.getByRole("button", { name: "Create domain" }).click();
  await expect(page.getByText("Domain binding created. Refreshing summary.")).toBeVisible();
  const domainTable = page.locator("table.data-table").first();
  await expect(domainTable.locator("tr", { hasText: primaryHost })).toContainText("Yes");
  await expect(domainTable.locator("tr", { hasText: safeHost })).toContainText("No");

  await page
    .locator('textarea[name="connection_options"]')
    .fill(JSON.stringify({ pool_mode: "transaction", statement_timeout_ms: 5000 }, null, 2));
  await expect(page.getByText("Confirm database repair")).toBeHidden();
  await page.getByRole("button", { name: "Save database config" }).click();
  await expect(
    page.getByText(/Database config saved\. Infra prepare job .* succeeded/)
  ).toBeVisible({
    timeout: 90_000
  });
  expect(databaseBodies).toHaveLength(1);

  let summaryResponse = await page.request.get(
    `/api/platform/restaurants/${tenantId}/operational-summary`
  );
  expect(summaryResponse.ok()).toBeTruthy();
  let operationalSummary = await summaryResponse.json();
  expect(operationalSummary.database_config.status).toBe("ready");

  const newDbName = `tenant_${slug.replaceAll("-", "_")}_next`;
  await page.locator('input[name="db_name"]').fill(newDbName);
  await expect(page.getByText("Confirm database repair")).toBeVisible();
  await page.getByLabel("Advanced repair confirmation").fill("wrong-db");
  await page.getByRole("button", { name: "Save database config" }).click();
  await expect(
    page.getByText(`Type ${newDbName} to confirm advanced database repair.`)
  ).toBeVisible();
  expect(databaseBodies).toHaveLength(1);

  await page.getByLabel("Advanced repair confirmation").fill(newDbName);
  await page.getByRole("button", { name: "Save database config" }).click();
  await expect(
    page.getByText(/Database config saved\. Infra prepare job .* succeeded/)
  ).toBeVisible({
    timeout: 90_000
  });
  expect(databaseBodies).toHaveLength(2);
  summaryResponse = await page.request.get(
    `/api/platform/restaurants/${tenantId}/operational-summary`
  );
  expect(summaryResponse.ok()).toBeTruthy();
  operationalSummary = await summaryResponse.json();
  expect(operationalSummary.database_config.db_name).toBe(newDbName);
  expect(operationalSummary.database_config.status).toBe("ready");

  await page.goto(`/restaurants/${tenantId}`);
  await expect(page.getByRole("button", { name: "Database Backup" })).toBeEnabled({
    timeout: 30_000
  });
  await page.getByRole("button", { name: "Database Backup" }).click();
  const backupDialog = page.getByRole("dialog", { name: "Database Backup" });
  await backupDialog
    .getByLabel("Platform admin password")
    .fill("change-me-platform-admin-password");
  await backupDialog.getByRole("button", { name: "Confirm database backup" }).click();
  await expect(page.getByText(/Database backup operation .* succeeded/i)).toBeVisible({
    timeout: 90_000
  });
  await expect(page.getByRole("heading", { name: "Database backups" })).toBeVisible();

  await page.goto(`/audit?restaurant_id=${tenantId}`);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.locator("main").getByText("provisioning_succeeded").first()).toBeVisible();
  const actorEmailCount = await page.locator("main").getByText("admin@example.com").count();
  expect(actorEmailCount).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Platform Admin" })).toBeVisible();
});
