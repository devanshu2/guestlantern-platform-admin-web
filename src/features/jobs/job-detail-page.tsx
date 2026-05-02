"use client";

import { Activity, ClipboardList, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/data-state";
import { KeyValue } from "@/components/ui/key-value";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { TableFrame } from "@/components/ui/table-frame";
import { OperatorActionDialog } from "@/features/jobs/operator-action-dialog";
import { platformApi } from "@/lib/api/client";
import { useLoader } from "@/lib/api/hooks";
import { formatDateTime, isActiveJobStatus, stepProgress } from "@/lib/api/status";
import type { ProvisionRestaurantJobStatus, ProvisionRestaurantJobTimeline } from "@/lib/api/types";

export function JobDetailPage({ jobId }: { jobId: string }) {
  const status = useLoader<ProvisionRestaurantJobStatus>(
    (signal) => platformApi(`/restaurants/provisioning-jobs/${jobId}`, { signal }),
    [jobId]
  );
  const timeline = useLoader<ProvisionRestaurantJobTimeline>(
    (signal) => platformApi(`/restaurants/provisioning-jobs/${jobId}/timeline`, { signal }),
    [jobId]
  );
  const job = timeline.data?.job ?? status.data;
  const progress = job
    ? stepProgress(
        job.steps.filter((step) => step.step_status === "succeeded").length,
        job.steps.length
      )
    : 0;

  async function reload() {
    await Promise.all([status.reload(), timeline.reload()]);
  }

  useEffect(() => {
    if (!job || !isActiveJobStatus(job.job_status)) return;
    const id = window.setInterval(
      () => {
        void reload();
      },
      Number(process.env.NEXT_PUBLIC_JOB_POLL_INTERVAL_MS ?? 5000)
    );
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.job_status, jobId]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Provisioning workflow"
        title={`Job ${jobId}`}
        description="Job detail combines worker lease metadata, ordered provisioning steps, final runtime receipt, and audit events."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={reload}
            icon={<RefreshCcw aria-hidden className="h-4 w-4" />}
          >
            Refresh
          </Button>
        }
      />

      {status.error ? <Alert tone="danger">{status.error}</Alert> : null}
      {timeline.error ? <Alert tone="danger">{timeline.error}</Alert> : null}

      {job ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Job status"
              value={<StatusBadge status={job.job_status} />}
              helper={`Restaurant status: ${job.restaurant_status}`}
              icon={<Activity aria-hidden className="h-5 w-5" />}
              tone={job.job_status === "failed" ? "danger" : "info"}
            />
            <StatCard
              label="Steps"
              value={`${job.steps.filter((step) => step.step_status === "succeeded").length}/${job.steps.length}`}
              helper="Succeeded steps in this attempt"
              icon={<ClipboardList aria-hidden className="h-5 w-5" />}
              tone={progress === 100 ? "success" : "warning"}
            />
            <StatCard
              label="Worker"
              value={job.claimed_by ?? "Unclaimed"}
              helper={`Heartbeat: ${formatDateTime(job.last_heartbeat_at)}`}
              icon={<Activity aria-hidden className="h-5 w-5" />}
              tone={job.claimed_by ? "success" : "neutral"}
            />
            <StatCard
              label="Updated"
              value={formatDateTime(job.updated_at)}
              helper={`Created: ${formatDateTime(job.created_at)}`}
              icon={<RefreshCcw aria-hidden className="h-5 w-5" />}
              tone="neutral"
            />
          </div>

          <Panel
            title="Job status"
            description="Status, tenant, hosts, lease, and timing fields are returned directly by the backend."
            actions={
              <div className="flex flex-wrap gap-2">
                <OperatorActionDialog jobId={jobId} action="retry" onDone={reload} />
                <OperatorActionDialog jobId={jobId} action="cancel" onDone={reload} />
                <OperatorActionDialog jobId={jobId} action="requeue" onDone={reload} />
                <OperatorActionDialog jobId={jobId} action="force-fail" onDone={reload} />
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={job.job_status} />
                <StatusBadge status={job.restaurant_status} />
                <Link
                  className="text-sm font-semibold text-brand hover:underline"
                  href={`/restaurants/${job.tenant_id}`}
                >
                  Open restaurant summary
                </Link>
              </div>
              <ProgressBar value={progress} label="Step progress" />
              {job.error_message ? (
                <Alert tone="danger" title="Backend failure detail">
                  {job.error_message}
                </Alert>
              ) : null}
              <KeyValue
                items={[
                  { label: "Tenant ID", value: job.tenant_id },
                  { label: "Slug", value: job.slug },
                  { label: "Public host", value: job.public_host },
                  { label: "Admin host", value: job.admin_host },
                  { label: "Schema version", value: job.schema_version },
                  { label: "Claimed by", value: job.claimed_by ?? "Unclaimed" },
                  { label: "Last heartbeat", value: formatDateTime(job.last_heartbeat_at) },
                  { label: "Claim expires", value: formatDateTime(job.claim_expires_at) },
                  { label: "Created", value: formatDateTime(job.created_at) },
                  { label: "Updated", value: formatDateTime(job.updated_at) },
                  { label: "Started", value: formatDateTime(job.started_at) },
                  { label: "Finished", value: formatDateTime(job.finished_at) }
                ]}
              />
            </div>
          </Panel>

          <Panel
            title="Provisioning steps"
            description="Steps are displayed in backend execution order. Error text is shown only when the backend returns it."
          >
            <ol className="m-0 grid list-none gap-3 p-0 md:hidden">
              {job.steps.map((step) => (
                <li
                  key={step.step_key}
                  className="rounded-md border border-line bg-surface-raised p-3 shadow-control"
                >
                  <div className="grid gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-muted">
                        Step {step.step_order}
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-ink [overflow-wrap:anywhere]">
                        {step.step_key}
                      </p>
                    </div>
                    <div className="justify-self-start">
                      <StatusBadge status={step.step_status} />
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
                    <div>
                      <dt className="font-semibold uppercase text-muted">Started</dt>
                      <dd className="mt-1 text-ink">{formatDateTime(step.started_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase text-muted">Finished</dt>
                      <dd className="mt-1 text-ink">{formatDateTime(step.finished_at)}</dd>
                    </div>
                  </dl>
                  {step.error_message ? (
                    <p className="mt-3 rounded-md border border-danger-line bg-danger-soft p-2 text-xs leading-5 text-danger [overflow-wrap:anywhere]">
                      {step.error_message}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>

            <div className="hidden md:block">
              <TableFrame>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Step key</th>
                      <th>Status</th>
                      <th>Started</th>
                      <th>Finished</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.steps.map((step) => (
                      <tr key={step.step_key}>
                        <td>{step.step_order}</td>
                        <td className="font-mono text-xs">{step.step_key}</td>
                        <td>
                          <StatusBadge status={step.step_status} />
                        </td>
                        <td className="text-xs text-muted">{formatDateTime(step.started_at)}</td>
                        <td className="text-xs text-muted">{formatDateTime(step.finished_at)}</td>
                        <td className="text-xs text-danger">{step.error_message ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableFrame>
            </div>
          </Panel>

          {job.receipt ? (
            <Panel
              title="Runtime receipt"
              description="Final runtime resources returned after successful provisioning. Secret values are not exposed, only secret refs."
            >
              <KeyValue
                items={[
                  { label: "Database", value: job.receipt.database_name },
                  { label: "DB user ref", value: job.receipt.database_user_secret_ref },
                  { label: "DB password ref", value: job.receipt.database_password_secret_ref },
                  { label: "Garage bucket", value: job.receipt.garage_bucket },
                  {
                    label: "Garage access key ref",
                    value: job.receipt.garage_access_key_id_secret_ref
                  },
                  {
                    label: "Garage secret key ref",
                    value: job.receipt.garage_secret_access_key_secret_ref
                  },
                  {
                    label: "Dragonfly admin ref",
                    value: job.receipt.dragonfly_admin_user_secret_ref
                  },
                  {
                    label: "Dragonfly client ref",
                    value: job.receipt.dragonfly_client_user_secret_ref
                  }
                ]}
              />
            </Panel>
          ) : null}
        </>
      ) : (
        <LoadingState>Loading job detail...</LoadingState>
      )}

      <Panel
        title="Audit timeline"
        description="Job-scoped audit events are returned newest first by `/timeline`."
      >
        {timeline.data ? (
          <ol className="space-y-3">
            {timeline.data.audit_events.map((event) => (
              <li
                key={event.audit_id}
                className="rounded-lg border border-line bg-surface-muted p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={event.is_success ? "succeeded" : "failed"} />
                  <span className="font-mono text-xs text-ink">{event.event_type}</span>
                  <span className="text-xs text-muted">{formatDateTime(event.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-ink">
                  {event.event_message ?? "No event message recorded."}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Actor: {event.actor_email ?? "system or unavailable"}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <LoadingState>Loading audit timeline...</LoadingState>
        )}
      </Panel>
    </div>
  );
}
