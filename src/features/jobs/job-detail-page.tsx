"use client";

import { RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyValue } from "@/components/ui/key-value";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress";
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
    <div className="space-y-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Provisioning workflow
          </p>
          <h1 className="break-all text-2xl font-semibold text-ink">Job {jobId}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Job detail combines worker lease metadata, ordered provisioning steps, final runtime
            receipt, and audit events.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={reload}
          icon={<RefreshCcw aria-hidden className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </section>

      {status.error ? <Alert tone="danger">{status.error}</Alert> : null}
      {timeline.error ? <Alert tone="danger">{timeline.error}</Alert> : null}

      {job ? (
        <>
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
                  className="text-sm font-medium text-brand hover:underline"
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
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted">
                    <th className="border-b border-line px-3 py-2">Order</th>
                    <th className="border-b border-line px-3 py-2">Step key</th>
                    <th className="border-b border-line px-3 py-2">Status</th>
                    <th className="border-b border-line px-3 py-2">Started</th>
                    <th className="border-b border-line px-3 py-2">Finished</th>
                    <th className="border-b border-line px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {job.steps.map((step) => (
                    <tr key={step.step_key}>
                      <td className="border-b border-line px-3 py-3">{step.step_order}</td>
                      <td className="border-b border-line px-3 py-3 font-mono text-xs">
                        {step.step_key}
                      </td>
                      <td className="border-b border-line px-3 py-3">
                        <StatusBadge status={step.step_status} />
                      </td>
                      <td className="border-b border-line px-3 py-3 text-xs text-muted">
                        {formatDateTime(step.started_at)}
                      </td>
                      <td className="border-b border-line px-3 py-3 text-xs text-muted">
                        {formatDateTime(step.finished_at)}
                      </td>
                      <td className="border-b border-line px-3 py-3 text-xs text-danger">
                        {step.error_message ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        <p className="text-sm text-muted">Loading job detail...</p>
      )}

      <Panel
        title="Audit timeline"
        description="Job-scoped audit events are returned newest first by `/timeline`."
      >
        {timeline.data ? (
          <ol className="space-y-3">
            {timeline.data.audit_events.map((event) => (
              <li key={event.audit_id} className="rounded-md border border-line bg-slate-50 p-3">
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
          <p className="text-sm text-muted">Loading audit timeline...</p>
        )}
      </Panel>
    </div>
  );
}
