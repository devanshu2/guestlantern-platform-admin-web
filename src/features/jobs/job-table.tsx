"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/data-state";
import { ProgressBar } from "@/components/ui/progress";
import { TableFrame } from "@/components/ui/table-frame";
import { formatDateTime, stepProgress } from "@/lib/api/status";
import type { ProvisionRestaurantJobSummary } from "@/lib/api/types";

export function JobTable({ jobs }: { jobs: ProvisionRestaurantJobSummary[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState title="No provisioning jobs">
        No provisioning jobs match the current filters.
      </EmptyState>
    );
  }

  return (
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
            <tr key={job.job_id}>
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
                  <p className="mt-1 text-xs text-danger">{job.failed_step_count} failed step</p>
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
  );
}
