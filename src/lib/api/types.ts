export type TenantId = string;

export type PlatformAdminRole = "super_admin" | "ops_admin";

export type PlatformAdminPrincipal = {
  session_id: string;
  admin_id: string;
  display_name: string;
  email: string;
  role: PlatformAdminRole;
};

export type PlatformAdminAuthSummary = {
  strategy: string;
  status: string;
  access_token_ttl_secs: number;
  refresh_token_ttl_secs: number;
};

export type PlatformBootstrapResponse = {
  boundary: "platform_admin";
  database_plane: "control_plane";
  auth: PlatformAdminAuthSummary;
  current_admin: PlatformAdminPrincipal;
};

export type PlatformAdminAuthTokens = {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer" | string;
  expires_in_secs: number;
  refresh_expires_in_secs: number;
  admin: PlatformAdminPrincipal;
};

export type PlatformAdminLogoutResult = {
  status: string;
  revoked_current_session: boolean;
};

export type PlatformStepUpRequest = {
  password: string;
  scope: string;
};

export type PlatformAdminStepUpGrant = {
  status: string;
  scope: string;
  expires_in_secs: number;
  expires_at_unix: number;
};

export type HttpErrorDetails = {
  code: string;
  message: string;
};

export type HttpErrorBody = {
  error: HttpErrorDetails;
};

export type Page<T> = {
  items: T[];
  page: number;
  per_page: number;
  total: number;
};

export type ReadinessCheckStatus = "ready" | "disabled" | "not_ready";

export type ReadinessCheck = {
  name: string;
  status: ReadinessCheckStatus;
  detail?: string | null;
};

export type ReadinessReport = {
  surface: string;
  ready: boolean;
  status: ReadinessCheckStatus;
  checks: ReadinessCheck[];
};

export type RuntimeCounter = {
  name: string;
  value: number;
};

export type RuntimeMetricsReport = {
  surface: string;
  counters: RuntimeCounter[];
};

export type ProvisioningJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type ProvisioningStepStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

export type TenantInfraOperationStatus = "queued" | "running" | "succeeded" | "failed" | string;

export type TenantInfraOperationKind =
  | "database_backup"
  | "disable"
  | "re_enable"
  | "permanent_delete"
  | string;

export type ProvisionRestaurantRequest = {
  tenant_id?: TenantId;
  external_code: string;
  slug: string;
  legal_name: string;
  display_name: string;
  owner_full_name: string;
  owner_phone_number: string;
  owner_email?: string;
  schema_version?: string;
};

export type ProvisionRestaurantJobReceipt = {
  job_id: string;
  tenant_id: TenantId;
  slug: string;
  public_host: string;
  admin_host: string;
  job_status: ProvisioningJobStatus | string;
};

export type ProvisionRestaurantJobSummary = {
  job_id: string;
  tenant_id: TenantId;
  slug: string;
  display_name: string;
  public_host: string;
  admin_host: string;
  job_status: ProvisioningJobStatus | string;
  restaurant_status: string;
  schema_version: string;
  error_message?: string | null;
  step_count: number;
  succeeded_step_count: number;
  failed_step_count: number;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  claimed_by?: string | null;
  last_heartbeat_at?: string | null;
  claim_expires_at?: string | null;
};

export type ProvisionRestaurantJobStepStatus = {
  step_key: string;
  step_order: number;
  step_status: ProvisioningStepStatus | string;
  started_at?: string | null;
  finished_at?: string | null;
  error_message?: string | null;
};

export type ProvisionRestaurantReceipt = {
  tenant_id: TenantId;
  slug: string;
  public_host: string;
  admin_host: string;
  database_name: string;
  database_user_secret_ref: string;
  database_password_secret_ref: string;
  garage_bucket: string;
  garage_access_key_id_secret_ref: string;
  garage_secret_access_key_secret_ref: string;
  dragonfly_admin_user_secret_ref: string;
  dragonfly_client_user_secret_ref: string;
  schema_version: string;
  status: string;
};

export type ProvisionRestaurantJobStatus = {
  job_id: string;
  tenant_id: TenantId;
  slug: string;
  public_host: string;
  admin_host: string;
  job_status: ProvisioningJobStatus | string;
  restaurant_status: string;
  schema_version: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  claimed_by?: string | null;
  last_heartbeat_at?: string | null;
  claim_expires_at?: string | null;
  steps: ProvisionRestaurantJobStepStatus[];
  receipt?: ProvisionRestaurantReceipt | null;
};

export type ProvisionRestaurantAuditEvent = {
  audit_id: string;
  actor_admin_user_id?: string | null;
  actor_email?: string | null;
  actor_full_name?: string | null;
  target_restaurant_id?: TenantId | null;
  provisioning_job_id?: string | null;
  event_type: string;
  is_success: boolean;
  event_message?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ProvisionRestaurantJobTimeline = {
  job: ProvisionRestaurantJobStatus;
  audit_events: ProvisionRestaurantAuditEvent[];
};

export type RestaurantDomain = {
  id: string;
  restaurant_id: TenantId;
  host: string;
  domain_type: "subdomain" | "custom" | string;
  is_primary: boolean;
  is_active: boolean;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type RestaurantDomainRequest = {
  host: string;
  domain_type: "subdomain" | "custom" | string;
  is_primary?: boolean;
};

export type RestaurantDatabaseConfig = {
  id: string;
  restaurant_id: TenantId;
  db_name: string;
  db_host: string;
  db_port: number;
  db_user_secret_ref: string;
  db_password_secret_ref: string;
  status: string;
  schema_version?: string | null;
  connection_options: Record<string, unknown>;
  last_verified_at?: string | null;
  verification_error?: string | null;
  created_at: string;
  updated_at: string;
};

export type RestaurantDatabaseConfigRequest = {
  db_name: string;
  db_host: string;
  db_port: number;
  db_user_secret_ref: string;
  db_password_secret_ref: string;
  schema_version?: string;
  connection_options?: Record<string, unknown>;
};

export type RestaurantAuthConfig = {
  id: string;
  restaurant_id: TenantId;
  issuer: string;
  audience: string;
  signing_algorithm: string;
  jwt_secret_ref: string;
  access_token_ttl_seconds: number;
  refresh_token_ttl_seconds: number;
  allow_dev_static_otp: boolean;
  dev_static_otp_code?: string | null;
  created_at: string;
  updated_at: string;
};

export type RestaurantAuthConfigRequest = {
  issuer: string;
  audience: string;
  signing_algorithm: string;
  jwt_secret_ref: string;
  access_token_ttl_seconds: number;
  refresh_token_ttl_seconds: number;
  allow_dev_static_otp: boolean;
  dev_static_otp_code?: string | null;
};

export type RestaurantOperationalRecord = {
  restaurant_id: TenantId;
  external_code: string;
  slug: string;
  legal_name: string;
  display_name: string;
  status: string;
  owner_full_name?: string | null;
  owner_phone_number?: string | null;
  owner_email?: string | null;
  created_at: string;
  updated_at: string;
};

export type RestaurantDirectoryItem = {
  restaurant_id: TenantId;
  external_code: string;
  slug: string;
  legal_name: string;
  display_name: string;
  status: string;
  owner_email?: string | null;
  primary_host?: string | null;
  latest_provisioning_job_id?: string | null;
  latest_provisioning_job_status?: string | null;
  latest_provisioning_job_updated_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type RestaurantInfraState = {
  restaurant_id: TenantId;
  infra_state: string;
  db_owner_role_name: string;
  active_runtime_db_role_name?: string | null;
  runtime_role_generation: number;
  pgbouncer_alias: string;
  garage_bucket: string;
  active_garage_key_name?: string | null;
  active_garage_access_key_id_secret_ref?: string | null;
  active_garage_secret_access_key_secret_ref?: string | null;
  active_dragonfly_admin_user_secret_ref?: string | null;
  active_dragonfly_client_user_secret_ref?: string | null;
  last_reenabled_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantInfraOperationRequest = {
  reason?: string | null;
  confirm_restaurant_id?: TenantId | null;
  confirm_slug?: string | null;
};

export type TenantOpsReceipt = {
  operation_id: string;
  restaurant_id: TenantId;
  operation_kind: TenantInfraOperationKind;
  operation_status: TenantInfraOperationStatus;
  status_url: string;
};

export type TenantInfraDatabaseBackupManifest = {
  backup_id: string;
  restaurant_id: TenantId;
  created_by_admin_user_id?: string | null;
  postgres_backup_database_name: string;
  manifest_status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type TenantInfraOperationStep = {
  step_key: string;
  step_order: number;
  step_status: string;
  resource_identifier?: string | null;
  error_message?: string | null;
  metadata: Record<string, unknown>;
  started_at?: string | null;
  finished_at?: string | null;
};

export type TenantInfraOperationSummary = {
  operation_id: string;
  restaurant_id?: TenantId | null;
  restaurant_id_snapshot: TenantId;
  operation_kind: TenantInfraOperationKind;
  operation_status: TenantInfraOperationStatus;
  failure_code?: string | null;
  error_message?: string | null;
  metadata: Record<string, unknown>;
  started_at: string;
  finished_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantInfraOperationDetail = TenantInfraOperationSummary & {
  steps: TenantInfraOperationStep[];
};

export type RestaurantReadinessItem = {
  code: string;
  message: string;
};

export type RestaurantProvisioningReadiness = {
  restaurant_id: TenantId;
  ready: boolean;
  restaurant_status: string;
  missing_items: RestaurantReadinessItem[];
};

export type RestaurantProvisioningRuntimeSupport = {
  runtime_enabled: boolean;
  target_database_exists?: boolean | null;
  db_user_secret_resolved?: boolean | null;
  db_password_secret_resolved?: boolean | null;
};

export type RestaurantInfraPrepareReceipt = {
  job_id: string;
  tenant_id: TenantId;
  slug: string;
  public_host: string;
  admin_host: string;
  job_status: ProvisioningJobStatus | string;
};

export type RestaurantOperationalSummary = {
  restaurant: RestaurantOperationalRecord;
  domains: RestaurantDomain[];
  database_config?: RestaurantDatabaseConfig | null;
  auth_config?: RestaurantAuthConfig | null;
  infra_state?: RestaurantInfraState | null;
  provisioning_readiness: RestaurantProvisioningReadiness;
  provisioning_runtime: RestaurantProvisioningRuntimeSupport;
};
