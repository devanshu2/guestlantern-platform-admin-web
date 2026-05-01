"use client";

import { RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/data-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { JobTable } from "@/features/jobs/job-table";
import { platformApi } from "@/lib/api/client";
import { useLoader } from "@/lib/api/hooks";
import { isActiveJobStatus, statusLabel } from "@/lib/api/status";
import type { Page, ProvisionRestaurantJobSummary } from "@/lib/api/types";

const statuses = ["all", "queued", "running", "succeeded", "failed", "cancelled"];

export function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const page = Number(searchParams.get("page") ?? 1);
  const statusQuery = status === "all" ? "" : `&status=${encodeURIComponent(status)}`;
  const jobs = useLoader<Page<ProvisionRestaurantJobSummary>>(
    (signal) =>
      platformApi(`/restaurants/provisioning-jobs?page=${page}&per_page=25${statusQuery}`, {
        signal
      }),
    [status, page]
  );

  useEffect(() => {
    const active = jobs.data?.items.some((job) => isActiveJobStatus(job.job_status));
    if (!active) return;
    const id = window.setInterval(
      () => {
        void jobs.reload();
      },
      Number(process.env.NEXT_PUBLIC_JOB_POLL_INTERVAL_MS ?? 5000)
    );
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.data, status, page]);

  function setStatus(nextStatus: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextStatus === "all") params.delete("status");
    else params.set("status", nextStatus);
    params.set("page", "1");
    router.push(`/jobs?${params.toString()}`);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Provisioning operations"
        title="Provisioning jobs"
        description="Filter by backend job status, open details for step progress, and jump to restaurant summaries from tenant IDs."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => jobs.reload()}
            icon={<RefreshCcw aria-hidden className="h-4 w-4" />}
          >
            Refresh
          </Button>
        }
      />

      <Panel
        title="Job list"
        description="Statuses map directly to the current backend contract: queued, running, succeeded, failed, and cancelled."
      >
        <div
          className="mb-4 flex flex-wrap gap-2 rounded-lg border border-line bg-surface-muted p-2"
          role="tablist"
          aria-label="Job status filters"
        >
          {statuses.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={status === item}
              className={`min-h-10 rounded-md px-3 py-2 text-sm font-semibold transition ${
                status === item
                  ? "bg-brand text-on-brand"
                  : "border border-transparent text-muted hover:bg-surface-raised hover:text-ink"
              }`}
              onClick={() => setStatus(item)}
            >
              {item === "all" ? "All" : statusLabel(item)}
            </button>
          ))}
        </div>

        {jobs.error ? <Alert tone="danger">{jobs.error}</Alert> : null}
        {jobs.data ? (
          <JobTable jobs={jobs.data.items} />
        ) : (
          <LoadingState>Loading jobs...</LoadingState>
        )}

        {jobs.data ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {jobs.data.page} of{" "}
              {Math.max(1, Math.ceil(jobs.data.total / jobs.data.per_page))}; {jobs.data.total}{" "}
              matching jobs.
            </span>
            <div className="flex gap-2">
              <Link
                aria-disabled={page <= 1}
                className={`rounded-md border border-line px-3 py-2 ${
                  page <= 1
                    ? "pointer-events-none opacity-50"
                    : "bg-surface-raised text-ink hover:bg-surface-muted"
                }`}
                href={`/jobs?${new URLSearchParams({ ...(status !== "all" ? { status } : {}), page: String(Math.max(1, page - 1)) })}`}
              >
                Previous
              </Link>
              <Link
                className="rounded-md border border-line bg-surface-raised px-3 py-2 text-ink hover:bg-surface-muted"
                href={`/jobs?${new URLSearchParams({ ...(status !== "all" ? { status } : {}), page: String(page + 1) })}`}
              >
                Next
              </Link>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
