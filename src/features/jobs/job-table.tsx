"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/data-state";
import { ProgressBar } from "@/components/ui/progress";
import { TableFrame } from "@/components/ui/table-frame";
import { formatDateTime, stepProgress } from "@/lib/api/status";
import type { ProvisionRestaurantJobSummary } from "@/lib/api/types";

function shortUuid(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export function JobTable({ jobs }: { jobs: ProvisionRestaurantJobSummary[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState title="No provisioning jobs">
        No provisioning jobs match the current filters.
      </EmptyState>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {jobs.map((job) => {
          const progress = stepProgress(job.succeeded_step_count, job.step_count);
          return (
            <article
              key={job.job_id}
              data-testid="job-list-item"
              className="rounded-md border border-line bg-surface-raised p-3 shadow-control"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink [overflow-wrap:anywhere]">
                    {job.display_name}
                  </h3>
                  <p className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">{job.slug}</p>
                  <p className="mt-1 font-mono text-xs text-subtle" title={job.tenant_id}>
                    {shortUuid(job.tenant_id)}
                  </p>
                </div>
                <StatusBadge status={job.job_status} />
              </div>

              <div className="mt-3">
                <ProgressBar
                  value={progress}
                  label={`${job.succeeded_step_count}/${job.step_count} steps`}
                />
                {job.failed_step_count > 0 ? (
                  <p className="mt-2 text-xs font-medium text-danger">
                    {job.failed_step_count} failed step
                  </p>
                ) : null}
              </div>

              {job.error_message ? (
                <p className="mt-3 rounded-md border border-danger-line bg-danger-soft p-2 text-xs leading-5 text-danger [overflow-wrap:anywhere]">
                  {job.error_message}
                </p>
              ) : null}

              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
                <div>
                  <dt className="font-semibold uppercase text-muted">Worker</dt>
                  <dd className="mt-1 text-ink [overflow-wrap:anywhere]">
                    {job.claimed_by ?? "Unclaimed"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase text-muted">Updated</dt>
                  <dd className="mt-1 text-ink">{formatDateTime(job.updated_at)}</dd>
                </div>
                {job.claimed_by ? (
                  <div className="col-span-2">
                    <dt className="font-semibold uppercase text-muted">Heartbeat</dt>
                    <dd className="mt-1 text-ink">{formatDateTime(job.last_heartbeat_at)}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-line bg-surface-muted px-3 py-2 text-sm font-semibold text-ink hover:bg-surface"
                  href={`/jobs/${job.job_id}`}
                >
                  Job <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                </Link>
                <Link
                  className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-line bg-surface-muted px-3 py-2 text-sm font-semibold text-ink hover:bg-surface"
                  href={`/restaurants/${job.tenant_id}`}
                >
                  Summary <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden md:block">
        <TableFrame>
          <table className="data-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Worker</th>
                <th>Updated</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_id} data-testid="job-list-item">
                  <td>
                    <div className="font-medium text-ink">{job.display_name}</div>
                    <div className="mt-1 text-xs text-muted">{job.slug}</div>
                    <div className="mt-1 max-w-xs truncate font-mono text-xs text-muted">
                      {job.tenant_id}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={job.job_status} />
                    {job.error_message ? (
                      <p className="mt-2 max-w-xs text-xs text-danger">{job.error_message}</p>
                    ) : null}
                  </td>
                  <td className="w-52">
                    <ProgressBar
                      value={stepProgress(job.succeeded_step_count, job.step_count)}
                      label={`${job.succeeded_step_count}/${job.step_count} steps`}
                    />
                    {job.failed_step_count > 0 ? (
                      <p className="mt-1 text-xs text-danger">
                        {job.failed_step_count} failed step
                      </p>
                    ) : null}
                  </td>
                  <td className="text-xs text-muted">
                    {job.claimed_by ? (
                      <>
                        <div>{job.claimed_by}</div>
                        <div>Heartbeat: {formatDateTime(job.last_heartbeat_at)}</div>
                      </>
                    ) : (
                      "Unclaimed"
                    )}
                  </td>
                  <td className="text-xs text-muted">{formatDateTime(job.updated_at)}</td>
                  <td>
                    <div className="flex flex-col gap-2">
                      <Link
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                        href={`/jobs/${job.job_id}`}
                      >
                        Job <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                        href={`/restaurants/${job.tenant_id}`}
                      >
                        Summary <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      </div>
    </>
  );
}
