import type {
  Page,
  PlatformAdminAuthTokens,
  PlatformBootstrapResponse,
  ProvisionRestaurantAuditEvent,
  ProvisionRestaurantJobReceipt,
  ProvisionRestaurantJobStatus,
  ProvisionRestaurantJobSummary,
  ProvisionRestaurantJobTimeline,
  ReadinessReport,
  RestaurantAuthConfig,
  RestaurantDatabaseConfig,
  RestaurantDomain,
  RestaurantInfraPrepareReceipt,
  RestaurantOperationalSummary,
  RuntimeMetricsReport
} from "@/lib/api/types";

const now = "2026-04-30 01:00:00+00";
const restaurantId = "33333333-3333-4333-8333-333333333333";
const failedJobId = "job-failed-001";
const runningJobId = "job-running-001";
const succeededJobId = "job-succeeded-001";

const admin = {
  session_id: "11111111-1111-4111-8111-111111111111",
  admin_id: "22222222-2222-4222-8222-222222222222",
  display_name: "Platform Operator",
  email: "admin@example.com",
  role: "super_admin" as const
};

const baseReceipt = {
  tenant_id: restaurantId,
  slug: "smoke-provisioned",
  public_host: "smoke-provisioned.guestlantern.localhost",
  admin_host: "admin.smoke-provisioned.guestlantern.localhost"
};

const domains: RestaurantDomain[] = [
  {
    id: "domain-primary",
    restaurant_id: restaurantId,
    host: baseReceipt.public_host,
    domain_type: "subdomain",
    is_primary: true,
    is_active: true,
    verified_at: now,
    created_at: now,
    updated_at: now
  }
];

const databaseConfig: RestaurantDatabaseConfig = {
  id: "db-config-1",
  restaurant_id: restaurantId,
  db_name: "tenant_smoke_provisioned",
  db_host: "127.0.0.1",
  db_port: 16432,
  db_user_secret_ref: "secret://smoke-provisioned-db-user",
  db_password_secret_ref: "secret://smoke-provisioned-db-password",
  status: "ready",
  schema_version: "restaurant_template/0001_init.sql",
  connection_options: { pool_mode: "transaction" },
  last_verified_at: now,
  created_at: now,
  updated_at: now
};

const authConfig: RestaurantAuthConfig = {
  id: "auth-config-1",
  restaurant_id: restaurantId,
  issuer: baseReceipt.public_host,
  audience: "tenant-smoke-provisioned-clients",
  signing_algorithm: "HS256",
  jwt_secret_ref: "secret://smoke-provisioned-jwt-secret",
  access_token_ttl_seconds: 900,
  refresh_token_ttl_seconds: 2_592_000,
  allow_dev_static_otp: true,
  dev_static_otp_code: "123456",
  created_at: now,
  updated_at: now
};

const jobSummaries: ProvisionRestaurantJobSummary[] = [
  {
    job_id: runningJobId,
    ...baseReceipt,
    display_name: "Smoke Provisioned Foods",
    job_status: "running",
    restaurant_status: "provisioning",
    schema_version: "restaurant_template/0001_init.sql",
    step_count: 5,
    succeeded_step_count: 2,
    failed_step_count: 0,
    created_at: now,
    updated_at: now,
    started_at: now,
    claimed_by: "mock-worker-1",
    last_heartbeat_at: now,
    claim_expires_at: "2026-04-30 01:05:00+00"
  },
  {
    job_id: failedJobId,
    ...baseReceipt,
    display_name: "Smoke Provisioned Foods",
    job_status: "failed",
    restaurant_status: "draft",
    schema_version: "restaurant_template/0001_init.sql",
    error_message: "PgBouncer reload failed in mock data.",
    step_count: 5,
    succeeded_step_count: 3,
    failed_step_count: 1,
    created_at: now,
    updated_at: now,
    started_at: now,
    finished_at: now
  },
  {
    job_id: succeededJobId,
    ...baseReceipt,
    display_name: "Smoke Provisioned Foods",
    job_status: "succeeded",
    restaurant_status: "active",
    schema_version: "restaurant_template/0001_init.sql",
    step_count: 5,
    succeeded_step_count: 5,
    failed_step_count: 0,
    created_at: now,
    updated_at: now,
    started_at: now,
    finished_at: now
  }
];

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function error(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

function tokens(): PlatformAdminAuthTokens {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    token_type: "Bearer",
    expires_in_secs: 900,
    refresh_expires_in_secs: 2_592_000,
    admin
  };
}

function readiness(): ReadinessReport {
  return {
    surface: "platform_admin",
    ready: true,
    status: "ready",
    checks: [
      { name: "control_plane_postgres", status: "ready" },
      { name: "dragonfly_auth", status: "disabled", detail: "Mock mode" },
      { name: "restaurant_provisioning", status: "ready" }
    ]
  };
}

function metrics(): RuntimeMetricsReport {
  return {
    surface: "platform_admin",
    counters: [
      { name: "platform.auth.throttle.login.blocked", value: 0 },
      { name: "restaurant.provisioning.jobs.queued", value: 2 },
      { name: "restaurant.provisioning.jobs.running", value: 1 },
      { name: "restaurant.provisioning.jobs.succeeded", value: 8 },
      { name: "restaurant.provisioning.jobs.failed", value: 1 },
      { name: "restaurant.provisioning.jobs.cancelled", value: 0 }
    ]
  };
}

function jobStatus(jobId: string): ProvisionRestaurantJobStatus {
  const summary =
    jobSummaries.find((job) => job.job_id === jobId) ?? jobSummaries[0];
  const failed = summary.job_status === "failed";
  const succeeded = summary.job_status === "succeeded";

  return {
    job_id: summary.job_id,
    tenant_id: summary.tenant_id,
    slug: summary.slug,
    public_host: summary.public_host,
    admin_host: summary.admin_host,
    job_status: summary.job_status,
    restaurant_status: summary.restaurant_status,
    schema_version: summary.schema_version,
    error_message: summary.error_message,
    created_at: summary.created_at,
    updated_at: summary.updated_at,
    started_at: summary.started_at,
    finished_at: summary.finished_at,
    claimed_by: summary.claimed_by,
    last_heartbeat_at: summary.last_heartbeat_at,
    claim_expires_at: summary.claim_expires_at,
    steps: [
      { step_key: "restaurant_record", step_order: 1, step_status: "succeeded", started_at: now, finished_at: now },
      { step_key: "domains", step_order: 2, step_status: "succeeded", started_at: now, finished_at: now },
      { step_key: "database_config", step_order: 3, step_status: failed ? "failed" : "succeeded", started_at: now, finished_at: now, error_message: failed ? "PgBouncer reload failed in mock data." : undefined },
      { step_key: "auth_config", step_order: 4, step_status: succeeded ? "succeeded" : "pending" },
      { step_key: "runtime_receipt", step_order: 5, step_status: succeeded ? "succeeded" : "pending" }
    ],
    receipt: succeeded
      ? {
          ...baseReceipt,
          database_name: databaseConfig.db_name,
          database_user_secret_ref: databaseConfig.db_user_secret_ref,
          database_password_secret_ref: databaseConfig.db_password_secret_ref,
          garage_bucket: "gl-local-tenant-smoke-provisioned",
          garage_access_key_id_secret_ref: "secret://smoke-provisioned-garage-access-key-id",
          garage_secret_access_key_secret_ref: "secret://smoke-provisioned-garage-secret-access-key",
          dragonfly_admin_user_secret_ref: "secret://smoke-provisioned-dragonfly-admin-user",
          dragonfly_client_user_secret_ref: "secret://smoke-provisioned-dragonfly-client-user",
          schema_version: databaseConfig.schema_version ?? "restaurant_template/0001_init.sql",
          status: "ready"
        }
      : null
  };
}

function auditEvents(jobId = succeededJobId): ProvisionRestaurantAuditEvent[] {
  return [
    {
      audit_id: "audit-1",
      actor_admin_user_id: admin.admin_id,
      actor_email: admin.email,
      actor_full_name: admin.display_name,
      target_restaurant_id: restaurantId,
      provisioning_job_id: jobId,
      event_type: "provisioning_requested",
      is_success: true,
      event_message: "Provisioning was requested by a platform operator.",
      ip_address: "127.0.0.1",
      user_agent: "mock-browser",
      metadata: { source: "mock" },
      created_at: now
    },
    {
      audit_id: "audit-2",
      actor_admin_user_id: admin.admin_id,
      actor_email: admin.email,
      actor_full_name: admin.display_name,
      target_restaurant_id: restaurantId,
      provisioning_job_id: jobId,
      event_type: "provisioning_succeeded",
      is_success: true,
      event_message: "Provisioning completed in mock mode.",
      metadata: { source: "mock" },
      created_at: now
    }
  ];
}

function operationalSummary(): RestaurantOperationalSummary {
  return {
    restaurant: {
      restaurant_id: restaurantId,
      external_code: "SMOKE-PROVISIONED",
      slug: "smoke-provisioned",
      legal_name: "Smoke Provisioned Foods Pvt Ltd",
      display_name: "Smoke Provisioned Foods",
      status: "active",
      owner_full_name: "Smoke Owner",
      owner_phone_number: "+913333333333",
      owner_email: "owner@smoke-provisioned.test",
      created_at: now,
      updated_at: now
    },
    domains,
    database_config: databaseConfig,
    auth_config: authConfig,
    infra_state: {
      restaurant_id: restaurantId,
      infra_state: "enabled",
      db_owner_role_name: "tenant_smoke_provisioned_owner",
      active_runtime_db_role_name: "tenant_smoke_provisioned_app",
      runtime_role_generation: 1,
      pgbouncer_alias: "tenant_smoke_provisioned",
      garage_bucket: "gl-local-tenant-smoke-provisioned",
      active_garage_key_name: "tenant-smoke-provisioned-runtime",
      active_garage_access_key_id_secret_ref: "secret://smoke-provisioned-garage-access-key-id",
      active_garage_secret_access_key_secret_ref: "secret://smoke-provisioned-garage-secret-access-key",
      active_dragonfly_admin_user_secret_ref: "secret://smoke-provisioned-dragonfly-admin-user",
      active_dragonfly_client_user_secret_ref: "secret://smoke-provisioned-dragonfly-client-user",
      last_reenabled_at: now,
      created_at: now,
      updated_at: now
    },
    provisioning_readiness: {
      restaurant_id: restaurantId,
      ready: true,
      restaurant_status: "active",
      missing_items: []
    },
    provisioning_runtime: {
      runtime_enabled: true,
      target_database_exists: true,
      db_user_secret_resolved: true,
      db_password_secret_resolved: true
    }
  };
}

async function requestBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function mockPlatformApi(request: Request, path: string): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const routePath = path.split("?")[0] ?? path;

  if (method === "GET" && routePath === "/health/live") {
    return json({ status: "ok", surface: "platform_admin" });
  }
  if (method === "GET" && routePath === "/health/ready") return json(readiness());
  if (method === "GET" && routePath === "/health/runtime") return json(metrics());

  if (method === "POST" && routePath === "/platform/auth/login") {
    const body = await requestBody(request);
    if (body.email === "locked@example.com") {
      return error("rate_limited", "Too many login attempts for this account.", 429);
    }
    return json(tokens());
  }
  if (method === "POST" && routePath === "/platform/auth/refresh") return json(tokens());
  if (method === "POST" && routePath === "/platform/auth/logout") {
    return json({ status: "logged_out", revoked_current_session: true });
  }
  if (method === "GET" && routePath === "/platform/bootstrap") {
    const response: PlatformBootstrapResponse = {
      boundary: "platform_admin",
      database_plane: "control_plane",
      auth: {
        strategy: "password",
        status: "enabled",
        access_token_ttl_secs: 900,
        refresh_token_ttl_secs: 2_592_000
      },
      current_admin: admin
    };
    return json(response);
  }
  if (method === "GET" && routePath === "/platform/auth/me") return json(admin);

  if (method === "POST" && routePath === "/platform/restaurants/provision") {
    const body = await requestBody(request);
    const slug = typeof body.slug === "string" ? body.slug : baseReceipt.slug;
    const receipt: ProvisionRestaurantJobReceipt = {
      job_id: "job-new-001",
      tenant_id:
        typeof body.tenant_id === "string" && body.tenant_id
          ? body.tenant_id
          : restaurantId,
      slug,
      public_host: `${slug}.guestlantern.localhost`,
      admin_host: `admin.${slug}.guestlantern.localhost`,
      job_status: "queued"
    };
    return json(receipt, 202);
  }

  if (method === "GET" && routePath === "/platform/restaurants/provisioning-jobs") {
    const status = url.searchParams.get("status");
    const items = status
      ? jobSummaries.filter((job) => job.job_status === status)
      : jobSummaries;
    const page: Page<ProvisionRestaurantJobSummary> = {
      items,
      page: Number(url.searchParams.get("page") ?? 1),
      per_page: Number(url.searchParams.get("per_page") ?? 50),
      total: items.length
    };
    return json(page);
  }

  if (method === "GET" && routePath === "/platform/restaurants/provisioning-audit-events") {
    if (!url.searchParams.get("job_id") && !url.searchParams.get("restaurant_id")) {
      return error("validation_error", "At least one audit filter is required.", 400);
    }
    const events = auditEvents(url.searchParams.get("job_id") ?? succeededJobId);
    const page: Page<ProvisionRestaurantAuditEvent> = {
      items: events,
      page: 1,
      per_page: 50,
      total: events.length
    };
    return json(page);
  }

  const jobMatch = routePath.match(/^\/platform\/restaurants\/provisioning-jobs\/([^/]+)(?:\/([^/]+))?$/);
  if (jobMatch) {
    const [, jobId, action] = jobMatch;
    if (method === "GET" && action === "timeline") {
      const timeline: ProvisionRestaurantJobTimeline = {
        job: jobStatus(jobId),
        audit_events: auditEvents(jobId)
      };
      return json(timeline);
    }
    if (method === "GET" && !action) return json(jobStatus(jobId));
    if (method === "POST" && action === "retry") {
      return json({ ...baseReceipt, job_id: "job-retry-001", job_status: "queued" }, 202);
    }
    if (method === "POST" && ["cancel", "requeue", "force-fail"].includes(action ?? "")) {
      const status = action === "cancel" ? "cancelled" : action === "requeue" ? "queued" : "failed";
      return json({ ...jobStatus(jobId), job_status: status });
    }
  }

  const restaurantMatch = routePath.match(/^\/platform\/restaurants\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
  if (restaurantMatch) {
    const [, id, resource, nested] = restaurantMatch;
    if (id !== restaurantId && !id.match(/^[0-9a-f-]{36}$/i)) {
      return error("bad_request", "restaurant id must be a valid UUID", 400);
    }
    if (method === "GET" && resource === "operational-summary") return json(operationalSummary());
    if (method === "GET" && resource === "domains") return json(domains);
    if (method === "POST" && resource === "domains") {
      const body = await requestBody(request);
      return json(
        {
          id: "domain-created",
          restaurant_id: id,
          host: body.host ?? "custom.guestlantern.localhost",
          domain_type: body.domain_type ?? "custom",
          is_primary: Boolean(body.is_primary),
          is_active: true,
          verified_at: now,
          created_at: now,
          updated_at: now
        },
        201
      );
    }
    if (method === "GET" && resource === "database-config") return json(databaseConfig);
    if (method === "PUT" && resource === "database-config") {
      return json({ ...databaseConfig, ...(await requestBody(request)), status: "pending" });
    }
    if (method === "GET" && resource === "auth-config") return json(authConfig);
    if (method === "PUT" && resource === "auth-config") {
      return json({ ...authConfig, ...(await requestBody(request)) });
    }
    if (method === "POST" && resource === "infra" && nested === "prepare") {
      const receipt: RestaurantInfraPrepareReceipt = {
        job_id: "job-prepare-001",
        ...baseReceipt,
        job_status: "queued"
      };
      return json(receipt, 202);
    }
  }

  return error("not_found", `Mock route not implemented: ${method} ${path}`, 404);
}
