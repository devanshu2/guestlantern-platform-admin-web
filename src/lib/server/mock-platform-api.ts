import type {
  Page,
  PlatformAdminAuthTokens,
  PlatformBootstrapResponse,
  ProvisionRestaurantAuditEvent,
  ProvisionRestaurantJobReceipt,
  ProvisionRestaurantPreview,
  ProvisionRestaurantJobStatus,
  ProvisionRestaurantJobSummary,
  ProvisionRestaurantJobTimeline,
  ReadinessReport,
  RestaurantAuthConfig,
  RestaurantDatabaseConfig,
  RestaurantDirectoryItem,
  RestaurantDomain,
  RestaurantInfraState,
  RestaurantInfraPrepareReceipt,
  RestaurantOperationalSummary,
  RuntimeMetricsReport,
  TenantInfraDatabaseBackupManifest,
  TenantInfraOperationDetail,
  TenantInfraOperationSummary,
  TenantOpsReceipt
} from "@/lib/api/types";

const now = "2026-04-30 01:00:00+00";
const restaurantId = "33333333-3333-4333-8333-333333333333";
const failedJobId = "job-failed-001";
const runningJobId = "job-running-001";
const succeededJobId = "job-succeeded-001";

function fnv1a32(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function defaultDatabaseName(slug: string) {
  const candidate = `tenant_${slug.replaceAll("-", "_")}`;
  if (candidate.length <= 48) return candidate;
  const suffix = fnv1a32(candidate).toString(16).padStart(8, "0");
  return `${candidate.slice(0, 48 - suffix.length - 1)}_${suffix}`;
}

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

const tenantInfraState: RestaurantInfraState = {
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
};

type MockTenantInfraOperation = TenantInfraOperationDetail & {
  poll_count: number;
};

type TenantInfraMockState = {
  infra: RestaurantInfraState;
  operations: MockTenantInfraOperation[];
  backups: TenantInfraDatabaseBackupManifest[];
};

const tenantInfraOperations: MockTenantInfraOperation[] = [
  {
    operation_id: "11111111-2222-4333-8444-555555555555",
    restaurant_id: restaurantId,
    restaurant_id_snapshot: restaurantId,
    operation_kind: "database_backup",
    operation_status: "succeeded",
    metadata: { reason: "mock baseline database backup" },
    started_at: now,
    finished_at: now,
    created_at: now,
    updated_at: now,
    steps: [
      {
        step_key: "postgres_database_backup",
        step_order: 1,
        step_status: "succeeded",
        metadata: {},
        started_at: now,
        finished_at: now
      },
      {
        step_key: "manifest",
        step_order: 2,
        step_status: "succeeded",
        metadata: {},
        started_at: now,
        finished_at: now
      }
    ],
    poll_count: 99
  }
];

const databaseBackupManifests: TenantInfraDatabaseBackupManifest[] = [
  {
    backup_id: "backup-baseline-001",
    restaurant_id: restaurantId,
    created_by_admin_user_id: admin.admin_id,
    postgres_backup_database_name: "tenant_smoke_provisioned_backup_baseline",
    manifest_status: "available",
    metadata: { source: "mock" },
    created_at: now,
    updated_at: now
  }
];

const tenantInfraMockSessions = new Map<string, TenantInfraMockState>();
let mockTokenSequence = 0;

function createTenantInfraMockState(): TenantInfraMockState {
  return {
    infra: structuredClone(tenantInfraState),
    operations: structuredClone(tenantInfraOperations),
    backups: structuredClone(databaseBackupManifests)
  };
}

const fallbackTenantInfraMockState = createTenantInfraMockState();

function tenantInfraMockStateForRequest(request: Request): TenantInfraMockState {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return fallbackTenantInfraMockState;

  const existing = tenantInfraMockSessions.get(token);
  if (existing) return existing;

  const state = createTenantInfraMockState();
  tenantInfraMockSessions.set(token, state);
  return state;
}

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

const restaurantDirectoryItems: RestaurantDirectoryItem[] = [
  {
    restaurant_id: restaurantId,
    external_code: "SMOKE-PROVISIONED",
    slug: "smoke-provisioned",
    legal_name: "Smoke Provisioned Foods Pvt Ltd",
    display_name: "Smoke Provisioned Foods",
    status: "active",
    owner_email: "owner@smoke-provisioned.test",
    primary_host: baseReceipt.public_host,
    latest_provisioning_job_id: succeededJobId,
    latest_provisioning_job_status: "succeeded",
    latest_provisioning_job_updated_at: now,
    created_at: now,
    updated_at: now
  },
  {
    restaurant_id: "44444444-4444-4444-8444-444444444444",
    external_code: "DRAFT-CURRY",
    slug: "draft-curry",
    legal_name: "Draft Curry Foods Pvt Ltd",
    display_name: "Draft Curry",
    status: "draft",
    owner_email: "owner@draft-curry.test",
    primary_host: null,
    latest_provisioning_job_id: null,
    latest_provisioning_job_status: null,
    latest_provisioning_job_updated_at: null,
    created_at: now,
    updated_at: now
  }
];

const restaurantDirectorySortFields = [
  "updated_at",
  "created_at",
  "display_name",
  "slug",
  "status",
  "owner_email",
  "primary_host",
  "latest_job_updated_at"
] as const;

type RestaurantDirectorySortField = (typeof restaurantDirectorySortFields)[number];

function isRestaurantDirectorySortField(value: string): value is RestaurantDirectorySortField {
  return restaurantDirectorySortFields.includes(value as RestaurantDirectorySortField);
}

function restaurantDirectorySortValue(
  restaurant: RestaurantDirectoryItem,
  sortBy: RestaurantDirectorySortField
) {
  switch (sortBy) {
    case "latest_job_updated_at":
      return restaurant.latest_provisioning_job_updated_at ?? "";
    case "owner_email":
      return restaurant.owner_email ?? "";
    case "primary_host":
      return restaurant.primary_host ?? "";
    default:
      return restaurant[sortBy] ?? "";
  }
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function error(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

function tokens(): PlatformAdminAuthTokens {
  mockTokenSequence += 1;
  const tokenSuffix = String(mockTokenSequence).padStart(6, "0");
  const accessToken = `mock-access-token-${tokenSuffix}`;
  tenantInfraMockSessions.set(accessToken, createTenantInfraMockState());
  return {
    access_token: accessToken,
    refresh_token: `mock-refresh-token-${tokenSuffix}`,
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
      { name: "restaurant_provisioning.jobs_queued_current", value: 2 },
      { name: "restaurant_provisioning.jobs_running_current", value: 1 },
      { name: "restaurant_provisioning.jobs_succeeded_current", value: 8 },
      { name: "restaurant_provisioning.jobs_failed_current", value: 1 },
      { name: "restaurant_provisioning.jobs_cancelled_current", value: 0 }
    ]
  };
}

function jobStatus(jobId: string): ProvisionRestaurantJobStatus {
  const summary = jobSummaries.find((job) => job.job_id === jobId) ?? jobSummaries[0];
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
      {
        step_key: "restaurant_record",
        step_order: 1,
        step_status: "succeeded",
        started_at: now,
        finished_at: now
      },
      {
        step_key: "domains",
        step_order: 2,
        step_status: "succeeded",
        started_at: now,
        finished_at: now
      },
      {
        step_key: "database_config",
        step_order: 3,
        step_status: failed ? "failed" : "succeeded",
        started_at: now,
        finished_at: now,
        error_message: failed ? "PgBouncer reload failed in mock data." : undefined
      },
      { step_key: "auth_config", step_order: 4, step_status: succeeded ? "succeeded" : "pending" },
      {
        step_key: "runtime_receipt",
        step_order: 5,
        step_status: succeeded ? "succeeded" : "pending"
      }
    ],
    receipt: succeeded
      ? {
          ...baseReceipt,
          database_name: databaseConfig.db_name,
          database_user_secret_ref: databaseConfig.db_user_secret_ref,
          database_password_secret_ref: databaseConfig.db_password_secret_ref,
          garage_bucket: "gl-local-tenant-smoke-provisioned",
          garage_access_key_id_secret_ref: "secret://smoke-provisioned-garage-access-key-id",
          garage_secret_access_key_secret_ref:
            "secret://smoke-provisioned-garage-secret-access-key",
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

function operationalSummary(state: TenantInfraMockState): RestaurantOperationalSummary {
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
    infra_state: state.infra,
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

function provisionPreview(body: Record<string, unknown>): ProvisionRestaurantPreview {
  const slug = typeof body.slug === "string" && body.slug ? body.slug : baseReceipt.slug;
  const tenantId =
    typeof body.tenant_id === "string" && body.tenant_id ? body.tenant_id : restaurantId;
  const managedHost = `${slug}.guestlantern.localhost`;
  const domain =
    body.domain && typeof body.domain === "object" ? (body.domain as Record<string, unknown>) : {};
  const domainHost =
    "host" in domain && typeof domain.host === "string" && domain.host ? domain.host : managedHost;
  const domainType =
    "domain_type" in domain && domain.domain_type === "custom" ? "custom" : "subdomain";
  const schemaVersion =
    typeof body.schema_version === "string" && body.schema_version
      ? body.schema_version
      : "restaurant_template/0001_init.sql";

  return {
    tenant_id: tenantId,
    slug,
    managed_public_host: managedHost,
    public_host: domainHost,
    admin_host: `admin.${domainHost}`,
    domain: {
      managed_host: managedHost,
      host: domainHost,
      domain_type: domainType,
      is_primary: true
    },
    database: {
      db_name: defaultDatabaseName(slug),
      db_host: "127.0.0.1",
      db_port: 16432,
      db_user_secret_ref: `secret://${slug}-db-user`,
      db_password_secret_ref: `secret://${slug}-db-password`,
      schema_version: schemaVersion,
      connection_options: {}
    },
    auth: {
      issuer: domainHost,
      audience: `tenant-${slug}-clients`,
      signing_algorithm: "HS256",
      jwt_secret_ref: `secret://${slug}-jwt-secret`,
      access_token_ttl_seconds: 900,
      refresh_token_ttl_seconds: 2_592_000,
      allow_dev_static_otp: true,
      dev_static_otp_code: "123456"
    },
    capabilities: {
      environment: "development",
      allow_dev_static_otp_supported: true,
      secret_store_backend: "generated_env"
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

function pageFrom<T>(items: T[], url: URL): Page<T> {
  const pageNumber = Number(url.searchParams.get("page") ?? 1);
  const perPage = Number(url.searchParams.get("per_page") ?? 50);
  const start = Math.max(0, (pageNumber - 1) * perPage);
  return {
    items: items.slice(start, start + perPage),
    page: pageNumber,
    per_page: perPage,
    total: items.length
  };
}

function tenantInfraOperationSummary(
  operation: MockTenantInfraOperation
): TenantInfraOperationSummary {
  return {
    operation_id: operation.operation_id,
    restaurant_id: operation.restaurant_id,
    restaurant_id_snapshot: operation.restaurant_id_snapshot,
    operation_kind: operation.operation_kind,
    operation_status: operation.operation_status,
    failure_code: operation.failure_code,
    error_message: operation.error_message,
    metadata: operation.metadata,
    started_at: operation.started_at,
    finished_at: operation.finished_at,
    created_at: operation.created_at,
    updated_at: operation.updated_at
  };
}

function setStepStatus(operation: MockTenantInfraOperation, status: string) {
  operation.steps = operation.steps.map((step) => ({
    ...step,
    step_status: status,
    started_at: step.started_at ?? now,
    finished_at: status === "succeeded" ? now : step.finished_at
  }));
}

function finalizeTenantInfraOperation(
  state: TenantInfraMockState,
  operation: MockTenantInfraOperation
) {
  if (operation.operation_status === "succeeded") return;
  operation.operation_status = "succeeded";
  operation.finished_at = now;
  operation.updated_at = now;
  setStepStatus(operation, "succeeded");

  if (operation.operation_kind === "database_backup") {
    const backupId = `backup-${operation.operation_id.slice(0, 8)}`;
    if (!state.backups.some((backup) => backup.backup_id === backupId)) {
      state.backups.unshift({
        backup_id: backupId,
        restaurant_id: restaurantId,
        created_by_admin_user_id: admin.admin_id,
        postgres_backup_database_name: `tenant_smoke_provisioned_backup_${operation.operation_id.slice(0, 8)}`,
        manifest_status: "available",
        metadata: { operation_id: operation.operation_id, source: "mock" },
        created_at: now,
        updated_at: now
      });
    }
  }

  if (operation.operation_kind === "disable") {
    state.infra.infra_state = "disabled";
    state.infra.active_runtime_db_role_name = null;
    state.infra.active_garage_key_name = null;
    state.infra.updated_at = now;
  }

  if (operation.operation_kind === "re_enable") {
    state.infra.infra_state = "enabled";
    state.infra.active_runtime_db_role_name = "tenant_smoke_provisioned_app_reenabled";
    state.infra.active_garage_key_name = "tenant-smoke-provisioned-runtime-reenabled";
    state.infra.runtime_role_generation += 1;
    state.infra.last_reenabled_at = now;
    state.infra.updated_at = now;
  }
}

function tenantInfraOperationDetail(
  state: TenantInfraMockState,
  operationId: string
): TenantInfraOperationDetail | null {
  const operation = state.operations.find((item) => item.operation_id === operationId);
  if (!operation) return null;

  if (isActiveMockOperation(operation)) {
    operation.poll_count += 1;
    if (operation.poll_count === 1) {
      operation.operation_status = "running";
      operation.updated_at = now;
      operation.steps = operation.steps.map((step, index) => ({
        ...step,
        step_status: index === 0 ? "running" : "pending",
        started_at: index === 0 ? now : step.started_at
      }));
    } else {
      finalizeTenantInfraOperation(state, operation);
    }
  }

  return {
    ...tenantInfraOperationSummary(operation),
    steps: operation.steps
  };
}

function isActiveMockOperation(operation: MockTenantInfraOperation): boolean {
  return operation.operation_status === "queued" || operation.operation_status === "running";
}

function settlePolledTenantInfraOperations(state: TenantInfraMockState) {
  for (const operation of state.operations) {
    if (isActiveMockOperation(operation) && operation.poll_count > 0) {
      finalizeTenantInfraOperation(state, operation);
    }
  }
}

function queueTenantInfraOperation(
  state: TenantInfraMockState,
  kind: "database_backup" | "disable" | "re_enable" | "permanent_delete",
  body: Record<string, unknown>
): Response {
  const requiresReason = kind !== "database_backup";
  if (requiresReason && typeof body.reason !== "string") {
    return error("validation_error", "reason is required", 400);
  }
  if (requiresReason && body.confirm_restaurant_id !== restaurantId) {
    return error("validation_error", "confirm_restaurant_id must match restaurant_id", 400);
  }
  if (kind === "permanent_delete" && body.confirm_slug !== baseReceipt.slug) {
    return error("validation_error", "confirm_slug must match the current restaurant slug", 400);
  }
  const operationId = `22222222-3333-4444-8555-${String(state.operations.length + 1).padStart(
    12,
    "0"
  )}`;
  const operation: MockTenantInfraOperation = {
    operation_id: operationId,
    restaurant_id: restaurantId,
    restaurant_id_snapshot: restaurantId,
    operation_kind: kind,
    operation_status: "queued",
    metadata: { reason: body.reason ?? "tenant infra lifecycle operation queued" },
    started_at: now,
    created_at: now,
    updated_at: now,
    steps:
      kind === "database_backup"
        ? [
            {
              step_key: "postgres_database_backup",
              step_order: 1,
              step_status: "pending",
              metadata: {}
            },
            { step_key: "manifest", step_order: 2, step_status: "pending", metadata: {} }
          ]
        : [
            { step_key: "validate_state", step_order: 1, step_status: "pending", metadata: {} },
            { step_key: "runtime_mutation", step_order: 2, step_status: "pending", metadata: {} },
            { step_key: "persist_state", step_order: 3, step_status: "pending", metadata: {} }
          ],
    poll_count: 0
  };
  state.operations.unshift(operation);
  const receipt: TenantOpsReceipt = {
    operation_id: operation.operation_id,
    restaurant_id: restaurantId,
    operation_kind: kind,
    operation_status: operation.operation_status,
    status_url: `/platform/infra/operations/${operation.operation_id}`
  };
  return json(receipt, 202);
}

export async function mockPlatformApi(request: Request, path: string): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const routePath = path.split("?")[0] ?? path;
  const tenantState = tenantInfraMockStateForRequest(request);

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
  if (method === "POST" && routePath === "/platform/auth/step-up") {
    const body = await requestBody(request);
    if (body.password !== "change-me-platform-admin-password") {
      return error("unauthorized", "Platform admin password is invalid.", 401);
    }
    if (typeof body.scope !== "string" || !body.scope.startsWith("tenant_infra.")) {
      return error("validation_error", "step-up scope is invalid", 400);
    }
    return json({
      status: "granted",
      scope: body.scope,
      expires_in_secs: 300,
      expires_at_unix: 1_777_777_777
    });
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
      provisioning: {
        environment: "development",
        allow_dev_static_otp_supported: true,
        secret_store_backend: "generated_env"
      },
      current_admin: admin
    };
    return json(response);
  }
  if (method === "GET" && routePath === "/platform/auth/me") return json(admin);

  if (method === "GET" && routePath === "/platform/restaurants") {
    const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const status = url.searchParams.get("status")?.trim().toLowerCase();
    const sortByParam = url.searchParams.get("sort_by") ?? "updated_at";
    const sortDirParam = url.searchParams.get("sort_dir") ?? "desc";
    if (!isRestaurantDirectorySortField(sortByParam)) {
      return error("validation_error", "sort_by is invalid", 400);
    }
    if (sortDirParam !== "asc" && sortDirParam !== "desc") {
      return error("validation_error", "sort_dir is invalid", 400);
    }
    const pageNumber = Number(url.searchParams.get("page") ?? 1);
    const perPage = Number(url.searchParams.get("per_page") ?? 50);
    const filtered = restaurantDirectoryItems
      .filter((restaurant) => {
        const matchesStatus = !status || restaurant.status === status;
        const searchable = [
          restaurant.restaurant_id,
          restaurant.external_code,
          restaurant.slug,
          restaurant.legal_name,
          restaurant.display_name,
          restaurant.owner_email,
          restaurant.primary_host
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return matchesStatus && (!query || searchable.includes(query));
      })
      .sort((left, right) => {
        const leftValue = restaurantDirectorySortValue(left, sortByParam).toLowerCase();
        const rightValue = restaurantDirectorySortValue(right, sortByParam).toLowerCase();
        if (leftValue === rightValue) return left.restaurant_id.localeCompare(right.restaurant_id);
        const comparison = leftValue.localeCompare(rightValue);
        return sortDirParam === "asc" ? comparison : -comparison;
      });
    const start = Math.max(0, (pageNumber - 1) * perPage);
    const page: Page<RestaurantDirectoryItem> = {
      items: filtered.slice(start, start + perPage),
      page: pageNumber,
      per_page: perPage,
      total: filtered.length
    };
    return json(page);
  }

  if (method === "POST" && routePath === "/platform/restaurants/provision/preview") {
    return json(provisionPreview(await requestBody(request)));
  }

  if (method === "POST" && routePath === "/platform/restaurants/provision") {
    const body = await requestBody(request);
    const preview = provisionPreview(body);
    const receipt: ProvisionRestaurantJobReceipt = {
      job_id: "job-new-001",
      tenant_id: preview.tenant_id,
      slug: preview.slug,
      public_host: preview.public_host,
      admin_host: preview.admin_host,
      job_status: "queued"
    };
    return json(receipt, 202);
  }

  if (method === "GET" && routePath === "/platform/restaurants/provisioning-jobs") {
    const status = url.searchParams.get("status");
    const items = status ? jobSummaries.filter((job) => job.job_status === status) : jobSummaries;
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

  const jobMatch = routePath.match(
    /^\/platform\/restaurants\/provisioning-jobs\/([^/]+)(?:\/([^/]+))?$/
  );
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

  const tenantInfraOperationMatch = routePath.match(/^\/platform\/infra\/operations\/([^/]+)$/);
  if (tenantInfraOperationMatch && method === "GET") {
    const detail = tenantInfraOperationDetail(tenantState, tenantInfraOperationMatch[1]);
    if (!detail) return error("not_found", "tenant infra operation was not found", 404);
    return json(detail);
  }

  const restaurantMatch = routePath.match(
    /^\/platform\/restaurants\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/
  );
  if (restaurantMatch) {
    const [, id, resource, nested] = restaurantMatch;
    if (id !== restaurantId && !id.match(/^[0-9a-f-]{36}$/i)) {
      return error("bad_request", "restaurant id must be a valid UUID", 400);
    }
    if (method === "GET" && resource === "operational-summary") {
      return json(operationalSummary(tenantState));
    }
    if (method === "GET" && resource === "domains") return json(domains);
    if (method === "POST" && resource === "domains") {
      const body = await requestBody(request);
      if (body.is_primary) {
        domains.forEach((domain) => {
          domain.is_primary = false;
        });
      }
      const domain: RestaurantDomain = {
        id: `domain-created-${domains.length + 1}`,
        restaurant_id: id,
        host: String(body.host ?? "custom.guestlantern.localhost"),
        domain_type: String(body.domain_type ?? "custom"),
        is_primary: Boolean(body.is_primary),
        is_active: true,
        verified_at: now,
        created_at: now,
        updated_at: now
      };
      domains.unshift(domain);
      return json(domain, 201);
    }
    if (method === "GET" && resource === "database-config") return json(databaseConfig);
    if (method === "PUT" && resource === "database-config") {
      Object.assign(databaseConfig, await requestBody(request), {
        status: "pending",
        updated_at: now
      });
      return json(databaseConfig);
    }
    if (method === "GET" && resource === "auth-config") return json(authConfig);
    if (method === "PUT" && resource === "auth-config") {
      Object.assign(authConfig, await requestBody(request), { updated_at: now });
      return json(authConfig);
    }
    if (method === "GET" && resource === "infra" && !nested) return json(tenantState.infra);
    if (method === "GET" && resource === "infra" && nested === "operations") {
      settlePolledTenantInfraOperations(tenantState);
      return json(pageFrom(tenantState.operations.map(tenantInfraOperationSummary), url));
    }
    if (method === "GET" && resource === "infra" && nested === "database-backups") {
      return json(pageFrom(tenantState.backups, url));
    }
    if (method === "POST" && resource === "infra" && nested === "prepare") {
      const receipt: RestaurantInfraPrepareReceipt = {
        job_id: "job-prepare-001",
        ...baseReceipt,
        job_status: "queued"
      };
      return json(receipt, 202);
    }
    if (method === "POST" && resource === "infra" && nested === "database-backup") {
      return queueTenantInfraOperation(tenantState, "database_backup", await requestBody(request));
    }
    if (method === "POST" && resource === "infra" && nested === "disable") {
      return queueTenantInfraOperation(tenantState, "disable", await requestBody(request));
    }
    if (method === "POST" && resource === "infra" && nested === "re-enable") {
      return queueTenantInfraOperation(tenantState, "re_enable", await requestBody(request));
    }
    if (method === "POST" && resource === "infra" && nested === "permanent-delete") {
      return queueTenantInfraOperation(tenantState, "permanent_delete", await requestBody(request));
    }
  }

  return error("not_found", `Mock route not implemented: ${method} ${path}`, 404);
}
