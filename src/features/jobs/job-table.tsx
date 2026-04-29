"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { formatDateTime, stepProgress } from "@/lib/api/status";
import type { ProvisionRestaurantJobSummary } from "@/lib/api/types";

export function JobTable({ jobs }: { jobs: ProvisionRestaurantJobSummary[] }) {
  if (jobs.length === 0) {
    return <p className="text-sm text-muted">No provisioning jobs match the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="border-b border-line px-3 py-2 font-semibold">Restaurant</th>
            <th className="border-b border-line px-3 py-2 font-semibold">Status</th>
            <th className="border-b border-line px-3 py-2 font-semibold">Progress</th>
            <th className="border-b border-line px-3 py-2 font-semibold">Worker</th>
            <th className="border-b border-line px-3 py-2 font-semibold">Updated</th>
            <th className="border-b border-line px-3 py-2 font-semibold">Open</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.job_id} className="border-b border-line hover:bg-slate-50">
              <td className="border-b border-line px-3 py-3 align-top">
                <div className="font-medium text-ink">{job.display_name}</div>
                <div className="mt-1 text-xs text-muted">{job.slug}</div>
                <div className="mt-1 max-w-xs truncate font-mono text-xs text-muted">
                  {job.tenant_id}
                </div>
              </td>
              <td className="border-b border-line px-3 py-3 align-top">
                <StatusBadge status={job.job_status} />
                {job.error_message ? (
                  <p className="mt-2 max-w-xs text-xs text-danger">{job.error_message}</p>
                ) : null}
              </td>
              <td className="w-52 border-b border-line px-3 py-3 align-top">
                <ProgressBar
                  value={stepProgress(job.succeeded_step_count, job.step_count)}
                  label={`${job.succeeded_step_count}/${job.step_count} steps`}
                />
                {job.failed_step_count > 0 ? (
                  <p className="mt-1 text-xs text-danger">{job.failed_step_count} failed step</p>
                ) : null}
              </td>
              <td className="border-b border-line px-3 py-3 align-top text-xs text-muted">
                {job.claimed_by ? (
                  <>
                    <div>{job.claimed_by}</div>
                    <div>Heartbeat: {formatDateTime(job.last_heartbeat_at)}</div>
                  </>
                ) : (
                  "Unclaimed"
                )}
              </td>
              <td className="border-b border-line px-3 py-3 align-top text-xs text-muted">
                {formatDateTime(job.updated_at)}
              </td>
              <td className="border-b border-line px-3 py-3 align-top">
                <div className="flex flex-col gap-2">
                  <Link
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                    href={`/jobs/${job.job_id}`}
                  >
                    Job <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
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
    </div>
  );
}
