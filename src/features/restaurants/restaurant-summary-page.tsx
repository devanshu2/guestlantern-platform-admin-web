"use client";

import { Play, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/data-state";
import { KeyValue } from "@/components/ui/key-value";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { TableFrame } from "@/components/ui/table-frame";
import { AuthConfigForm } from "@/features/restaurants/auth-config-form";
import { DatabaseConfigForm } from "@/features/restaurants/database-config-form";
import { DomainForm } from "@/features/restaurants/domain-form";
import { SafeAuthUpdateForm } from "@/features/restaurants/safe-auth-update-form";
import { TenantInfraLifecyclePanel } from "@/features/restaurants/tenant-infra-lifecycle-panel";
import { platformApi } from "@/lib/api/client";
import { useLoader } from "@/lib/api/hooks";
import { errorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/api/status";
import type { RestaurantInfraPrepareReceipt, RestaurantOperationalSummary } from "@/lib/api/types";
import { useAuth } from "@/features/auth/auth-context";
import { useState } from "react";

function BoolValue({ value }: { value?: boolean | null }) {
  if (value == null) return <span className="text-muted">Not probeable</span>;
  return <StatusBadge status={value ? "ready" : "not_ready"} />;
}

export function RestaurantSummaryPage({ restaurantId }: { restaurantId: string }) {
  const { bootstrap } = useAuth();
  const summary = useLoader<RestaurantOperationalSummary>(
    (signal) => platformApi(`/restaurants/${restaurantId}/operational-summary`, { signal }),
    [restaurantId]
  );
  const [prepareMessage, setPrepareMessage] = useState<string | null>(null);
  const [prepareLoading, setPrepareLoading] = useState(false);

  async function prepareInfra() {
    setPrepareLoading(true);
    setPrepareMessage(null);
    try {
      const receipt = await platformApi<RestaurantInfraPrepareReceipt>(
        `/restaurants/${restaurantId}/infra/prepare`,
        {
          method: "POST"
        }
      );
      setPrepareMessage(`Infra prepare queued as job ${receipt.job_id}.`);
      await summary.reload();
    } catch (err) {
      setPrepareMessage(errorMessage(err));
    } finally {
      setPrepareLoading(false);
    }
  }

  const data = summary.data;
  const allowDevStaticOtpSupported =
    bootstrap?.provisioning?.allow_dev_static_otp_supported ?? false;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Restaurant operations"
        title={`Restaurant ${restaurantId}`}
        description="Operational summary is a repair-oriented view. It shows restaurant metadata, domain bindings, runtime config, infra state, readiness gaps, and probe results from the current backend contract."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => summary.reload()}
            icon={<RefreshCcw aria-hidden className="h-4 w-4" />}
          >
            Refresh
          </Button>
        }
      />

      {summary.error ? <Alert tone="danger">{summary.error}</Alert> : null}
      {prepareMessage ? (
        <Alert tone={prepareMessage.includes("queued") ? "success" : "danger"} live>
          {prepareMessage}
        </Alert>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Restaurant"
              value={data.restaurant.display_name}
              helper={data.restaurant.slug}
              tone="neutral"
            />
            <StatCard
              label="Readiness"
              value={
                <StatusBadge status={data.provisioning_readiness.ready ? "ready" : "not_ready"} />
              }
              helper={`${data.provisioning_readiness.missing_items.length} readiness gaps`}
              tone={data.provisioning_readiness.ready ? "success" : "warning"}
            />
            <StatCard
              label="Domains"
              value={data.domains.length}
              helper="Active and inactive bindings"
              tone="info"
            />
            <StatCard
              label="Infra state"
              value={data.infra_state?.infra_state ?? "Missing"}
              helper={data.provisioning_runtime.runtime_enabled ? "Runtime enabled" : "Runtime off"}
              tone={data.infra_state ? "success" : "warning"}
            />
          </div>

          <Panel
            title={data.restaurant.display_name}
            description="Core restaurant metadata returned by `/operational-summary`."
            actions={
              <div className="flex flex-wrap gap-2">
                <Link
                  className="text-sm font-semibold text-brand hover:underline"
                  href={`/audit?restaurant_id=${data.restaurant.restaurant_id}`}
                >
                  View audit
                </Link>
                <Button
                  type="button"
                  onClick={prepareInfra}
                  loading={prepareLoading}
                  icon={<Play aria-hidden className="h-4 w-4" />}
                >
                  Prepare infra
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={data.restaurant.status} />
                <StatusBadge status={data.provisioning_readiness.ready ? "ready" : "not_ready"} />
              </div>
              <KeyValue
                items={[
                  { label: "External code", value: data.restaurant.external_code },
                  { label: "Slug", value: data.restaurant.slug },
                  { label: "Legal name", value: data.restaurant.legal_name },
                  { label: "Owner", value: data.restaurant.owner_full_name },
                  { label: "Owner phone", value: data.restaurant.owner_phone_number },
                  { label: "Owner email", value: data.restaurant.owner_email },
                  { label: "Created", value: formatDateTime(data.restaurant.created_at) },
                  { label: "Updated", value: formatDateTime(data.restaurant.updated_at) }
                ]}
              />
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Panel
              title="Readiness gaps"
              description="Missing items are actionable blockers before a restaurant is considered ready."
            >
              {data.provisioning_readiness.missing_items.length === 0 ? (
                <Alert tone="success">No readiness gaps reported by the backend.</Alert>
              ) : (
                <ul className="space-y-2">
                  {data.provisioning_readiness.missing_items.map((item) => (
                    <li
                      key={item.code}
                      className="rounded-lg border border-line bg-surface-muted p-3"
                    >
                      <p className="font-mono text-xs text-danger">{item.code}</p>
                      <p className="mt-1 text-sm text-ink">{item.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Runtime probes"
              description="Probe fields may be absent when a dependency is not probeable in the current runtime."
            >
              <KeyValue
                items={[
                  {
                    label: "Runtime enabled",
                    value: <BoolValue value={data.provisioning_runtime.runtime_enabled} />
                  },
                  {
                    label: "Target database exists",
                    value: <BoolValue value={data.provisioning_runtime.target_database_exists} />
                  },
                  {
                    label: "DB user secret resolves",
                    value: <BoolValue value={data.provisioning_runtime.db_user_secret_resolved} />
                  },
                  {
                    label: "DB password secret resolves",
                    value: (
                      <BoolValue value={data.provisioning_runtime.db_password_secret_resolved} />
                    )
                  }
                ]}
              />
            </Panel>
          </div>

          <Panel
            title="Safe updates"
            description="Low-risk post-provision updates. These operations preserve hidden runtime fields and do not expose secret values."
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">Domains</h2>
                  <p className="mt-1 text-sm text-muted">
                    Active and inactive bindings. Creating a primary domain can promote it according
                    to backend rules.
                  </p>
                </div>
                <TableFrame>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Host</th>
                        <th>Type</th>
                        <th>Primary</th>
                        <th>Active</th>
                        <th>Verified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.domains.map((domain) => (
                        <tr key={domain.id}>
                          <td className="font-mono text-xs">{domain.host}</td>
                          <td>{domain.domain_type}</td>
                          <td>{domain.is_primary ? "Yes" : "No"}</td>
                          <td>{domain.is_active ? "Yes" : "No"}</td>
                          <td className="text-xs text-muted">
                            {formatDateTime(domain.verified_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableFrame>
                <DomainForm restaurantId={restaurantId} onSaved={summary.reload} />
              </div>

              <div className="space-y-4 border-t border-line pt-5">
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Token TTL and development OTP
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Saves through the full auth-config API while preserving issuer, audience,
                    algorithm, and secret ref.
                  </p>
                </div>
                <SafeAuthUpdateForm
                  restaurantId={restaurantId}
                  config={data.auth_config}
                  allowDevStaticOtpSupported={allowDevStaticOtpSupported}
                  onSaved={summary.reload}
                />
              </div>
            </div>
          </Panel>

          <Panel
            title="Advanced repair"
            description="Use only when runtime metadata is wrong or incomplete. Database repair queues infra prepare after saving; auth identity or secret-ref repair queues infra prepare when reconciliation is needed."
          >
            <div className="space-y-6">
              <Alert tone="warning" title="Advanced repair can disrupt a running restaurant">
                DB target changes require infra prepare and may point the restaurant at a different
                database. Auth identity or secret-reference changes can break sessions or clients.
              </Alert>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-ink">Database config</h2>
                  {data.database_config ? (
                    <StatusBadge status={data.database_config.status} />
                  ) : null}
                </div>
                {!data.database_config ? (
                  <Alert tone="warning">
                    No database config returned. Use the form to create a repair record.
                  </Alert>
                ) : null}
                {data.database_config?.verification_error ? (
                  <Alert tone="danger" title="Last verification error">
                    {data.database_config.verification_error}
                  </Alert>
                ) : null}
                <DatabaseConfigForm
                  restaurantId={restaurantId}
                  restaurantSlug={data.restaurant.slug}
                  config={data.database_config}
                  onSaved={summary.reload}
                  queuePrepareAfterSave
                />
              </div>

              <div className="space-y-4 border-t border-line pt-5">
                <div>
                  <h2 className="text-base font-semibold text-ink">Auth config</h2>
                  <p className="mt-1 text-sm text-muted">
                    Repair tenant JWT identity and secret references. Secret values are never
                    exposed, only secret refs.
                  </p>
                </div>
                <AuthConfigForm
                  restaurantId={restaurantId}
                  restaurantSlug={data.restaurant.slug}
                  config={data.auth_config}
                  onSaved={summary.reload}
                  queuePrepareOnRuntimeChange
                />
              </div>
            </div>
          </Panel>

          <Panel
            title="Infra state"
            description="Current tenant runtime infrastructure state, when present."
          >
            {data.infra_state ? (
              <KeyValue
                items={[
                  { label: "Infra state", value: data.infra_state.infra_state },
                  { label: "DB owner role", value: data.infra_state.db_owner_role_name },
                  { label: "Runtime DB role", value: data.infra_state.active_runtime_db_role_name },
                  { label: "Role generation", value: data.infra_state.runtime_role_generation },
                  { label: "PgBouncer alias", value: data.infra_state.pgbouncer_alias },
                  { label: "Garage bucket", value: data.infra_state.garage_bucket },
                  { label: "Garage key", value: data.infra_state.active_garage_key_name },
                  {
                    label: "Garage access ref",
                    value: data.infra_state.active_garage_access_key_id_secret_ref
                  },
                  {
                    label: "Garage secret ref",
                    value: data.infra_state.active_garage_secret_access_key_secret_ref
                  },
                  {
                    label: "Dragonfly admin ref",
                    value: data.infra_state.active_dragonfly_admin_user_secret_ref
                  },
                  {
                    label: "Dragonfly client ref",
                    value: data.infra_state.active_dragonfly_client_user_secret_ref
                  },
                  {
                    label: "Last re-enabled",
                    value: formatDateTime(data.infra_state.last_reenabled_at)
                  }
                ]}
              />
            ) : (
              <Alert tone="warning">
                No infra state returned. Use Prepare infra after domain, database, and auth config
                are present.
              </Alert>
            )}
          </Panel>

          <TenantInfraLifecyclePanel
            restaurantId={restaurantId}
            summary={data}
            onSummaryReload={summary.reload}
          />
        </>
      ) : (
        <LoadingState>Loading restaurant operational summary...</LoadingState>
      )}
    </div>
  );
}
