import { expect, type Locator, type Page, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { themeStorageKey, type ThemeMode, type ThemePreset } from "@/components/theme/theme-config";
import { CSRF_COOKIE } from "@/lib/security/cookie-names";

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
  await expect(page.locator('[data-testid="job-list-item"]:visible').first()).toBeVisible();
}

test("dashboard loads with accessible core landmarks", async ({ page }) => {
  await login(page);

  await expect(page.getByText("Backend readiness")).toBeVisible();
  await expect(page.getByText("Recent provisioning jobs")).toBeVisible();
  await expect(page.locator('a[href="/jobs"]:visible').first()).toBeVisible();

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

test("blocks missing required create fields before provisioning request", async ({ page }) => {
  const provisionBodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/platform/restaurants/provision", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      provisionBodies.push(JSON.parse(request.postData() ?? "{}"));
    }
    await route.continue();
  });

  await login(page);
  await page.goto("/provision");

  await page.getByLabel("Slug").fill("missing-required-fields");
  await page.getByRole("button", { name: "Queue provisioning" }).click();

  await expect(page.getByText("Provisioning queued")).toBeHidden();
  await expect(page.getByLabel("External code")).toBeVisible();
  expect(provisionBodies).toHaveLength(0);
});

test("loads provisioning preview and submits advanced config atomically", async ({ page }) => {
  const provisionBodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/platform/restaurants/provision", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      provisionBodies.push(JSON.parse(request.postData() ?? "{}"));
    }
    await route.continue();
  });

  await login(page);
  await page.goto("/provision");

  await page.getByLabel("External code").fill("SMOKE-PROVISIONED");
  await page.getByLabel("Slug").fill("smoke-provisioned");
  await page.getByLabel("Legal name").fill("Smoke Provisioned Foods Pvt Ltd");
  await page.getByLabel("Display name").fill("Smoke Provisioned Foods");
  await page.getByLabel("Owner full name").fill("Smoke Owner");
  await page.getByLabel("Owner phone number").fill("+913333333333");
  await page.getByLabel("Owner email").fill("owner@smoke-provisioned.test");

  await page.getByRole("button", { name: "Load suggestions" }).click();
  await expect(page.getByText("Managed public host")).toBeVisible();
  await expect(page.getByText("Effective public host")).toBeVisible();
  await expect(page.getByText("Admin host")).toBeVisible();
  await expect(page.getByText("Environment")).toBeVisible();
  await expect(page.getByText("development", { exact: true })).toBeVisible();
  await expect(page.getByText("Secret store")).toBeVisible();
  await expect(page.getByText("generated_env", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Primary host")).toHaveValue(
    "smoke-provisioned.guestlantern.localhost"
  );
  await expect(page.getByLabel("Database name")).toHaveValue("tenant_smoke_provisioned");
  await expect(page.getByLabel("Database host")).toHaveValue("127.0.0.1");
  await expect(page.getByLabel("DB schema version")).toHaveValue(
    "restaurant_template/0001_init.sql"
  );
  await expect(page.getByLabel("Issuer")).toHaveValue("smoke-provisioned.guestlantern.localhost");
  await expect(page.getByLabel("Audience")).toHaveValue("tenant-smoke-provisioned-clients");
  await expect(page.getByLabel("Signing algorithm")).toHaveValue("HS256");
  await expect(page.getByLabel("JWT secret ref")).toHaveValue(
    "secret://smoke-provisioned-jwt-secret"
  );
  await expect(page.getByLabel("Access token TTL seconds")).toHaveValue("900");
  await expect(page.getByLabel("Refresh token TTL seconds")).toHaveValue("2592000");
  await expect(page.getByLabel("Allow development static OTP")).toBeChecked();
  await expect(page.getByLabel("Development static OTP code")).toHaveValue("123456");
  await page.getByLabel("Access token TTL seconds").fill("1200");
  await page.getByRole("button", { name: "Queue provisioning" }).click();

  await expect(page.getByText("Provisioning queued")).toBeVisible();
  expect(provisionBodies).toHaveLength(1);
  const provisionBody = provisionBodies[0] as {
    auth?: Record<string, unknown>;
    database?: Record<string, unknown>;
  };
  expect(provisionBody).toMatchObject({
    slug: "smoke-provisioned",
    domain: {
      host: "smoke-provisioned.guestlantern.localhost",
      domain_type: "subdomain",
      is_primary: true
    },
    database: {
      db_name: "tenant_smoke_provisioned",
      db_user_secret_ref: "secret://smoke-provisioned-db-user",
      db_password_secret_ref: "secret://smoke-provisioned-db-password"
    },
    auth: {
      issuer: "smoke-provisioned.guestlantern.localhost",
      jwt_secret_ref: "secret://smoke-provisioned-jwt-secret",
      access_token_ttl_seconds: 1200
    }
  });
  expect(provisionBody.database ?? {}).not.toHaveProperty("db_password");
  expect(provisionBody.database ?? {}).not.toHaveProperty("db_user");
  expect(provisionBody.auth ?? {}).not.toHaveProperty("jwt_secret");
});

test("surfaces invalid advanced provisioning values before create request", async ({ page }) => {
  const provisionBodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/platform/restaurants/provision", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      provisionBodies.push(JSON.parse(request.postData() ?? "{}"));
    }
    await route.continue();
  });

  await login(page);
  await page.goto("/provision");

  await page.getByLabel("External code").fill("SMOKE-PROVISIONED");
  await page.getByLabel("Slug").fill("smoke-provisioned");
  await page.getByLabel("Legal name").fill("Smoke Provisioned Foods Pvt Ltd");
  await page.getByLabel("Display name").fill("Smoke Provisioned Foods");
  await page.getByLabel("Owner full name").fill("Smoke Owner");
  await page.getByLabel("Owner phone number").fill("+913333333333");
  await page.getByLabel("Owner email").fill("owner@smoke-provisioned.test");
  await page.getByRole("button", { name: "Load suggestions" }).click();
  await expect(page.getByText("Managed public host")).toBeVisible();

  async function expectInvalid(
    field: Locator,
    invalidValue: string,
    expectedMessage: string,
    resetValue: string
  ) {
    await field.fill(invalidValue);
    await page.getByRole("button", { name: "Queue provisioning" }).click();
    await expect(page.getByText(expectedMessage)).toBeVisible();
    expect(provisionBodies).toHaveLength(0);
    await field.fill(resetValue);
  }

  await expectInvalid(
    page.getByLabel("Database name"),
    "tenant smoke",
    "Database name: Start with a lowercase letter and use only lowercase letters, numbers, and underscores.",
    "tenant_smoke_provisioned"
  );
  await expectInvalid(
    page.getByLabel("Database name"),
    "Tenant-Smoke",
    "Database name: Start with a lowercase letter and use only lowercase letters, numbers, and underscores.",
    "tenant_smoke_provisioned"
  );
  await expectInvalid(
    page.getByLabel("Database name"),
    `tenant_${"a".repeat(50)}`,
    "Database name: Use 48 characters or fewer.",
    "tenant_smoke_provisioned"
  );
  await expectInvalid(
    page.getByLabel("Database name"),
    "postgres",
    "Database name: Use a tenant database name, not a reserved Postgres database.",
    "tenant_smoke_provisioned"
  );
  await expectInvalid(
    page.getByLabel("Primary host"),
    "https://bad host:8443/path",
    "Primary host: Use a lowercase hostname with letters, numbers, dots, and hyphens.",
    "smoke-provisioned.guestlantern.localhost"
  );
  await expectInvalid(
    page.getByLabel("DB user secret ref"),
    "plain-secret",
    "DB user secret ref: Use a secret ref such as secret://tenant-db-password.",
    "secret://smoke-provisioned-db-user"
  );
  await expectInvalid(
    page.getByLabel("DB schema version"),
    "../schema.sql",
    "DB schema version: Use a relative schema path.",
    "restaurant_template/0001_init.sql"
  );
  await expectInvalid(
    page.getByLabel("Development static OTP code"),
    "12AB56",
    "Development static OTP code: Use a 6 digit static OTP.",
    "123456"
  );

  await page.getByLabel("Access token TTL seconds").fill("1200");
  await page.getByLabel("Refresh token TTL seconds").fill("900");
  await page.getByRole("button", { name: "Queue provisioning" }).click();
  await expect(
    page.getByText(
      "Refresh token TTL seconds: Refresh token TTL must be greater than access token TTL."
    )
  ).toBeVisible();
  expect(provisionBodies).toHaveLength(0);
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

test("safe auth update preserves hidden fields without advanced repair prompt", async ({
  page
}) => {
  const authBodies: Array<Record<string, unknown>> = [];
  await page.route(
    "**/api/platform/restaurants/33333333-3333-4333-8333-333333333333/auth-config",
    async (route) => {
      const request = route.request();
      if (request.method() === "PUT") {
        authBodies.push(JSON.parse(request.postData() ?? "{}"));
      }
      await route.continue();
    }
  );

  await login(page);
  await page.goto("/restaurants/33333333-3333-4333-8333-333333333333");
  await expect(page.getByRole("button", { name: "Save safe auth update" })).toBeVisible();

  await page.locator('input[name="safe_access_token_ttl_seconds"]').fill("1200");
  await page.locator('input[name="safe_refresh_token_ttl_seconds"]').fill("2592600");
  await page.locator('input[name="safe_dev_static_otp_code"]').fill("654321");
  await page.getByRole("button", { name: "Save safe auth update" }).click();

  await expect(
    page.getByText("Safe auth settings saved. Unchanged auth fields were preserved.")
  ).toBeVisible();
  await expect(page.getByText("Confirm auth repair")).toBeHidden();
  expect(authBodies).toHaveLength(1);
  expect(authBodies[0]).toMatchObject({
    issuer: "smoke-provisioned.guestlantern.localhost",
    audience: "tenant-smoke-provisioned-clients",
    signing_algorithm: "HS256",
    jwt_secret_ref: "secret://smoke-provisioned-jwt-secret",
    access_token_ttl_seconds: 1200,
    refresh_token_ttl_seconds: 2592600,
    allow_dev_static_otp: true,
    dev_static_otp_code: "654321"
  });
});

test("advanced repair confirmation appears only for risky changed fields", async ({ page }) => {
  const databaseBodies: Array<Record<string, unknown>> = [];
  await page.route(
    "**/api/platform/restaurants/33333333-3333-4333-8333-333333333333/database-config",
    async (route) => {
      const request = route.request();
      if (request.method() === "PUT") {
        databaseBodies.push(JSON.parse(request.postData() ?? "{}"));
      }
      await route.continue();
    }
  );

  await login(page);
  await page.goto("/restaurants/33333333-3333-4333-8333-333333333333");
  await expect(page.getByRole("button", { name: "Save database config" })).toBeVisible();

  await page
    .locator('textarea[name="connection_options"]')
    .fill(JSON.stringify({ pool_mode: "transaction", statement_timeout_ms: 5000 }, null, 2));
  await expect(page.getByText("Confirm database repair")).toBeHidden();
  await page.getByRole("button", { name: "Save database config" }).click();
  await expect(
    page.getByText(/Infra prepare (queued as job job-prepare-001|job job-prepare-001 finished)/)
  ).toBeVisible();
  expect(databaseBodies).toHaveLength(1);

  await page.locator('input[name="db_name"]').fill("tenant_smoke_provisioned_next");
  await expect(page.getByText("Confirm database repair")).toBeVisible();
  await page.getByLabel("Advanced repair confirmation").fill("wrong-db");
  await page.getByRole("button", { name: "Save database config" }).click();
  await expect(
    page.getByText("Type tenant_smoke_provisioned_next to confirm advanced database repair.")
  ).toBeVisible();
  expect(databaseBodies).toHaveLength(1);

  await page.getByLabel("Advanced repair confirmation").fill("tenant_smoke_provisioned_next");
  await page.getByRole("button", { name: "Save database config" }).click();
  await expect(
    page.getByText(/Infra prepare (queued as job job-prepare-001|job job-prepare-001 finished)/)
  ).toBeVisible();
  expect(databaseBodies).toHaveLength(2);
});

test("advanced auth repair confirmation blocks risky identity changes until confirmed", async ({
  page
}, testInfo) => {
  const authBodies: Array<Record<string, unknown>> = [];
  await page.route(
    "**/api/platform/restaurants/33333333-3333-4333-8333-333333333333/auth-config",
    async (route) => {
      const request = route.request();
      if (request.method() === "PUT") {
        authBodies.push(JSON.parse(request.postData() ?? "{}"));
      }
      await route.continue();
    }
  );

  await login(page);
  await page.goto("/restaurants/33333333-3333-4333-8333-333333333333");
  await expect(page.getByRole("button", { name: "Save auth config" })).toBeVisible();

  const currentJwtSecretRef = await page.locator('input[name="jwt_secret_ref"]').inputValue();
  const nextJwtSecretRef = `${currentJwtSecretRef}-${testInfo.project.name}-repair`;
  await page.locator('input[name="jwt_secret_ref"]').fill(nextJwtSecretRef);
  await expect(page.getByText("Confirm auth repair")).toBeVisible();
  await page.getByLabel("Advanced repair confirmation").fill("wrong-slug");
  await page.getByRole("button", { name: "Save auth config" }).click();
  await expect(
    page.getByText("Type smoke-provisioned to confirm advanced auth repair.")
  ).toBeVisible();
  expect(authBodies).toHaveLength(0);

  await page.getByLabel("Advanced repair confirmation").fill("smoke-provisioned");
  await page.getByRole("button", { name: "Save auth config" }).click();
  await expect(
    page.getByText(/Infra prepare (queued as job job-prepare-001|job job-prepare-001 finished)/)
  ).toBeVisible();
  expect(authBodies).toHaveLength(1);
  expect(authBodies[0]).toMatchObject({
    issuer: "smoke-provisioned.guestlantern.localhost",
    audience: "tenant-smoke-provisioned-clients",
    signing_algorithm: "HS256",
    jwt_secret_ref: nextJwtSecretRef
  });
});

test("repairs missing csrf cookie before saving restaurant config", async ({ page }) => {
  await login(page);
  await page.goto("/restaurants/33333333-3333-4333-8333-333333333333");
  await expect(page.getByRole("button", { name: "Save database config" })).toBeVisible();

  const cookies = await page.context().cookies();
  await page.context().clearCookies();
  await page.context().addCookies(cookies.filter((cookie) => cookie.name !== CSRF_COOKIE));

  await page.getByRole("button", { name: "Save database config" }).click();

  await expect(
    page.getByText(
      "Database config saved. Backend marks it pending until infra prepare verifies it."
    )
  ).toBeVisible();
  await expect(page.getByText("Security check failed")).toBeHidden();
});

test("keeps restaurant config forms mounted during save refresh", async ({ page }) => {
  const summaryUrl =
    "**/api/platform/restaurants/33333333-3333-4333-8333-333333333333/operational-summary";
  let mutateSummaryTimestamps = false;

  await page.route(summaryUrl, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (mutateSummaryTimestamps) {
      body.database_config.updated_at = "2026-05-02T17:30:00Z";
      body.auth_config.updated_at = "2026-05-02T17:31:00Z";
    }
    await route.fulfill({ response, json: body });
  });

  await login(page);
  await page.goto("/restaurants/33333333-3333-4333-8333-333333333333");
  await expect(page.getByRole("button", { name: "Save database config" })).toBeVisible();

  await page
    .getByLabel("Database name")
    .evaluate((element) => element.setAttribute("data-remount-sentinel", "database"));
  await page
    .getByLabel("Issuer")
    .evaluate((element) => element.setAttribute("data-remount-sentinel", "auth"));

  mutateSummaryTimestamps = true;

  await page.getByRole("button", { name: "Save database config" }).click();
  await expect(
    page.getByText(
      "Database config saved. Backend marks it pending until infra prepare verifies it."
    )
  ).toBeVisible();
  await expect(page.getByLabel("Database name")).toHaveAttribute(
    "data-remount-sentinel",
    "database"
  );
  await expect(page.getByText("Loading restaurant operational summary")).toBeHidden();

  await page.getByRole("button", { name: "Save auth config" }).click();
  await expect(
    page.getByText("Auth config saved. Tenant JWT and development OTP settings were updated.")
  ).toBeVisible();
  await expect(page.getByLabel("Issuer")).toHaveAttribute("data-remount-sentinel", "auth");
  await expect(page.getByText("Loading restaurant operational summary")).toBeHidden();
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
  await expect(
    page
      .locator('[data-testid="database-backup-name"]:visible')
      .filter({ hasText: "tenant_smoke_provisioned_backup_22222222" })
  ).toBeVisible();
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
      await expect(page.locator('[data-testid="job-list-item"]:visible')).toHaveCount(3);
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
