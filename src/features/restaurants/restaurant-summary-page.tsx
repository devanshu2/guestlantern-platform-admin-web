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
import { TenantInfraLifecyclePanel } from "@/features/restaurants/tenant-infra-lifecycle-panel";
import { platformApi } from "@/lib/api/client";
import { useLoader } from "@/lib/api/hooks";
import { errorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/api/status";
import type { RestaurantInfraPrepareReceipt, RestaurantOperationalSummary } from "@/lib/api/types";
import { useState } from "react";

function BoolValue({ value }: { value?: boolean | null }) {
  if (value == null) return <span className="text-muted">Not probeable</span>;
  return <StatusBadge status={value ? "ready" : "not_ready"} />;
}

export function RestaurantSummaryPage({ restaurantId }: { restaurantId: string }) {
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
            title="Domains"
            description="Active and inactive domain bindings. Creating a primary domain can promote it according to backend rules."
          >
            <div className="mb-4">
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
                        <td className="text-xs text-muted">{formatDateTime(domain.verified_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableFrame>
            </div>
            <DomainForm restaurantId={restaurantId} onSaved={summary.reload} />
          </Panel>

          <Panel
            title="Database config"
            description="Repair tenant database runtime metadata. Saving marks the config pending until infra prepare verifies it."
          >
            {data.database_config ? (
              <StatusBadge status={data.database_config.status} />
            ) : (
              <Alert tone="warning">
                No database config returned. Use the form to create a repair record.
              </Alert>
            )}
            {data.database_config?.verification_error ? (
              <Alert tone="danger" title="Last verification error">
                {data.database_config.verification_error}
              </Alert>
            ) : null}
            <div className="mt-4">
              <DatabaseConfigForm
                restaurantId={restaurantId}
                config={data.database_config}
                onSaved={summary.reload}
              />
            </div>
          </Panel>

          <Panel
            title="Auth config"
            description="Repair tenant JWT and development OTP runtime metadata. Secret values are never exposed, only secret refs."
          >
            <AuthConfigForm
              restaurantId={restaurantId}
              config={data.auth_config}
              onSaved={summary.reload}
            />
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
