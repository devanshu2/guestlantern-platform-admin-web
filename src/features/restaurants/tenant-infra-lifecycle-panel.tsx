"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/data-state";
import { KeyValue } from "@/components/ui/key-value";
import { Panel } from "@/components/ui/panel";
import { TableFrame } from "@/components/ui/table-frame";
import { TenantInfraLifecycleActionDialog } from "@/features/restaurants/tenant-infra-lifecycle-action-dialog";
import type { TenantInfraLifecycleAction } from "@/features/restaurants/tenant-infra-lifecycle-action-dialog";
import { useAuth } from "@/features/auth/auth-context";
import { platformApi } from "@/lib/api/client";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { formatDateTime, statusLabel } from "@/lib/api/status";
import type {
  Page,
  RestaurantInfraState,
  RestaurantOperationalSummary,
  TenantInfraDatabaseBackupManifest,
  TenantInfraOperationDetail,
  TenantInfraOperationSummary,
  TenantOpsReceipt
} from "@/lib/api/types";

type LifecycleData = {
  infra: RestaurantInfraState | null;
  operations: Page<TenantInfraOperationSummary> | null;
  backups: Page<TenantInfraDatabaseBackupManifest> | null;
};

type LifecycleActionConfig = {
  action: TenantInfraLifecycleAction;
  title: string;
  description: string;
  allowedStates: string[];
};

const lifecycleActions: LifecycleActionConfig[] = [
  {
    action: "database-backup",
    title: "Database Backup",
    description: "Create a tenant Postgres database snapshot.",
    allowedStates: ["enabled", "disabled"]
  },
  {
    action: "disable",
    title: "Disable",
    description: "Detach runtime access while preserving tenant data and metadata.",
    allowedStates: ["enabled"]
  },
  {
    action: "re-enable",
    title: "Re-enable",
    description: "Restore runtime access for disabled tenant infrastructure.",
    allowedStates: ["disabled"]
  },
  {
    action: "permanent-delete",
    title: "Permanent delete",
    description: "Purge live tenant resources after explicit operator confirmation.",
    allowedStates: ["enabled", "disabled"]
  }
];

const activeOperationStatuses = new Set(["queued", "running"]);

function isActiveOperation(status?: string | null): boolean {
  return Boolean(status && activeOperationStatuses.has(status));
}

function statusPath(path: string): string {
  try {
    const parsed = new URL(path);
    return statusPath(parsed.pathname);
  } catch {
    if (path.startsWith("/platform/")) return path.slice("/platform".length);
    return path;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function actionUnavailableReason({
  action,
  infra,
  loading,
  unsupported,
  isSuperAdmin,
  restaurantStatus,
  activeOperation,
  pollingOperationId
}: {
  action: LifecycleActionConfig;
  infra: RestaurantInfraState | null;
  loading: boolean;
  unsupported: boolean;
  isSuperAdmin: boolean;
  restaurantStatus: string;
  activeOperation?: TenantInfraOperationSummary;
  pollingOperationId: string | null;
}): string | null {
  if (loading) return "Lifecycle state is loading.";
  if (unsupported) return "Tenant infra lifecycle API is unavailable for this restaurant.";
  if (!isSuperAdmin) return "Requires a super_admin platform account.";
  if (restaurantStatus === "provisioning") return "Restaurant provisioning is still active.";
  if (pollingOperationId) return `Waiting for lifecycle operation ${pollingOperationId}.`;
  if (activeOperation) {
    return `Lifecycle operation ${activeOperation.operation_id} is ${statusLabel(
      activeOperation.operation_status
    ).toLowerCase()}.`;
  }
  if (!infra) return "No tenant infra state was returned.";
  if (!action.allowedStates.includes(infra.infra_state)) {
    return `${action.title} requires infra state ${action.allowedStates
      .map(statusLabel)
      .join(" or ")}.`;
  }
  return null;
}

export function TenantInfraLifecyclePanel({
  restaurantId,
  summary,
  onSummaryReload
}: {
  restaurantId: string;
  summary: RestaurantOperationalSummary;
  onSummaryReload: () => Promise<void>;
}) {
  const { admin } = useAuth();
  const [data, setData] = useState<LifecycleData>({
    infra: null,
    operations: null,
    backups: null
  });
  const [loading, setLoading] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "success" | "danger" | "info";
    text: string;
  } | null>(null);
  const [pollingOperationId, setPollingOperationId] = useState<string | null>(null);

  const loadLifecycle = useCallback(
    async (signal?: AbortSignal, silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      setUnsupported(false);
      try {
        const [infra, operations, backups] = await Promise.all([
          platformApi<RestaurantInfraState>(`/restaurants/${restaurantId}/infra`, { signal }),
          platformApi<Page<TenantInfraOperationSummary>>(
            `/restaurants/${restaurantId}/infra/operations?page=1&per_page=50`,
            { signal }
          ),
          platformApi<Page<TenantInfraDatabaseBackupManifest>>(
            `/restaurants/${restaurantId}/infra/database-backups?page=1&per_page=50`,
            { signal }
          )
        ]);
        setData({ infra, operations, backups });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.status === 404) {
          setUnsupported(true);
          setData({ infra: null, operations: null, backups: null });
          setError(
            "Tenant infra lifecycle routes or state are not available. Upgrade the backend contract, or run Prepare infra if this restaurant has no infra row."
          );
        } else {
          setError(errorMessage(err));
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [restaurantId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadLifecycle(controller.signal);
    return () => controller.abort();
  }, [loadLifecycle]);

  const activeOperation = useMemo(
    () => data.operations?.items.find((operation) => isActiveOperation(operation.operation_status)),
    [data.operations]
  );

  useEffect(() => {
    if (!activeOperation || pollingOperationId) return;
    const interval = window.setInterval(() => {
      void loadLifecycle(undefined, true);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeOperation, loadLifecycle, pollingOperationId]);

  async function pollOperation(receipt: TenantOpsReceipt) {
    setPollingOperationId(receipt.operation_id);
    setMessage({
      tone: "info",
      text: `${statusLabel(receipt.operation_kind)} operation ${receipt.operation_id} queued.`
    });

    let latest: TenantInfraOperationDetail | null = null;
    try {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (attempt > 0) await delay(1000);
        latest = await platformApi<TenantInfraOperationDetail>(statusPath(receipt.status_url));
        await loadLifecycle(undefined, true);
        if (!isActiveOperation(latest.operation_status)) break;
      }
      await Promise.all([loadLifecycle(undefined, true), onSummaryReload()]);

      if (!latest || isActiveOperation(latest.operation_status)) {
        setMessage({
          tone: "info",
          text: `${statusLabel(receipt.operation_kind)} operation ${receipt.operation_id} is still active. Refresh later for final status.`
        });
      } else if (latest.operation_status === "failed") {
        setMessage({
          tone: "danger",
          text:
            latest.error_message ??
            `${statusLabel(receipt.operation_kind)} operation ${receipt.operation_id} failed.`
        });
      } else {
        setMessage({
          tone: "success",
          text: `${statusLabel(receipt.operation_kind)} operation ${receipt.operation_id} ${statusLabel(
            latest.operation_status
          ).toLowerCase()}.`
        });
      }
    } catch (err) {
      setMessage({ tone: "danger", text: errorMessage(err) });
    } finally {
      setPollingOperationId(null);
    }
  }

  const isSuperAdmin = admin?.role === "super_admin";
  const restaurantStatus = summary.restaurant.status;

  return (
    <Panel
      title="Tenant infra lifecycle"
      description="Restaurant-scoped lifecycle controls use the current tenant infra API state, database backup manifests, and operation journal."
      actions={<ButtonRefresh loading={loading} onClick={() => loadLifecycle()} />}
    >
      <div className="space-y-5">
        {error ? <Alert tone={unsupported ? "warning" : "danger"}>{error}</Alert> : null}
        {message ? (
          <Alert tone={message.tone} live>
            {message.text}
          </Alert>
        ) : null}

        {loading && !data.infra ? (
          <LoadingState>Loading tenant infra lifecycle...</LoadingState>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">Current infra state</h3>
              <StatusBadge status={data.infra?.infra_state ?? summary.infra_state?.infra_state} />
            </div>
            <KeyValue
              items={[
                {
                  label: "Restaurant status",
                  value: <StatusBadge status={summary.restaurant.status} />
                },
                {
                  label: "PgBouncer alias",
                  value: data.infra?.pgbouncer_alias ?? "Not recorded"
                },
                {
                  label: "Runtime role",
                  value: data.infra?.active_runtime_db_role_name ?? "Not recorded"
                },
                {
                  label: "Last re-enabled",
                  value: formatDateTime(data.infra?.last_reenabled_at)
                }
              ]}
            />
          </div>

          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">Controls</h3>
              {activeOperation ? <Badge tone="info">Operation active</Badge> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {lifecycleActions.map((action) => {
                const reason = actionUnavailableReason({
                  action,
                  infra: data.infra,
                  loading,
                  unsupported,
                  isSuperAdmin,
                  restaurantStatus,
                  activeOperation,
                  pollingOperationId
                });
                return (
                  <div
                    key={action.action}
                    className="rounded-lg border border-line bg-surface-raised p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{action.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{action.description}</p>
                      </div>
                    </div>
                    {reason ? (
                      <p className="mt-2 text-xs leading-5 text-muted">Unavailable: {reason}</p>
                    ) : null}
                    <div className="mt-3">
                      <TenantInfraLifecycleActionDialog
                        restaurantId={restaurantId}
                        slug={summary.restaurant.slug}
                        action={action.action}
                        disabled={Boolean(reason)}
                        disabledReason={reason ?? undefined}
                        onQueued={pollOperation}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Latest lifecycle operations</h3>
            {data.operations?.items.length ? (
              <TableFrame>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Operation</th>
                      <th>Status</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.operations.items.slice(0, 6).map((operation) => (
                      <tr key={operation.operation_id}>
                        <td>
                          <div className="font-medium text-ink">
                            {statusLabel(operation.operation_kind)}
                          </div>
                          <div className="font-mono text-xs text-muted">
                            {operation.operation_id}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={operation.operation_status} />
                        </td>
                        <td className="text-xs text-muted">
                          {formatDateTime(operation.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableFrame>
            ) : (
              <Alert tone="info">No lifecycle operations recorded for this restaurant.</Alert>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Database backups</h3>
            {data.backups?.items.length ? (
              <TableFrame>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Backup database</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.backups.items.slice(0, 6).map((backup) => (
                      <tr key={backup.backup_id}>
                        <td>
                          <div className="font-mono text-xs text-ink">
                            {backup.postgres_backup_database_name}
                          </div>
                          <div className="font-mono text-xs text-muted">{backup.backup_id}</div>
                        </td>
                        <td>
                          <StatusBadge status={backup.manifest_status} />
                        </td>
                        <td className="text-xs text-muted">{formatDateTime(backup.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableFrame>
            ) : (
              <Alert tone="info">
                No tenant Postgres database snapshots are recorded for this restaurant.
              </Alert>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ButtonRefresh({
  loading,
  onClick
}: {
  loading: boolean;
  onClick: () => Promise<void> | void;
}) {
  return (
    <button
      type="button"
      className="text-sm font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      disabled={loading}
      onClick={() => void onClick()}
    >
      Refresh lifecycle
    </button>
  );
}
