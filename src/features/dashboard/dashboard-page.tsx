"use client";

import { Activity, ClipboardList, Gauge, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/data-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatCard } from "@/components/ui/stat-card";
import { JobTable } from "@/features/jobs/job-table";
import { RestaurantLookup } from "@/features/dashboard/restaurant-lookup";
import { healthApi, platformApi } from "@/lib/api/client";
import { useLoader } from "@/lib/api/hooks";
import { isActiveJobStatus } from "@/lib/api/status";
import type {
  Page,
  ProvisionRestaurantJobSummary,
  ReadinessReport,
  RuntimeMetricsReport
} from "@/lib/api/types";

const counterLabels: Record<string, string> = {
  "platform.auth.throttle.login.blocked": "Blocked login attempts",
  "restaurant_provisioning.jobs_queued_current": "Queued jobs",
  "restaurant_provisioning.jobs_running_current": "Running jobs",
  "restaurant_provisioning.jobs_succeeded_current": "Succeeded jobs",
  "restaurant_provisioning.jobs_failed_current": "Failed jobs",
  "restaurant_provisioning.jobs_cancelled_current": "Cancelled jobs",
  "restaurant_provisioning.job_counts_unavailable": "Job counts unavailable",
  "restaurant_provisioning.jobs_recovered": "Recovered jobs",
  "restaurant_provisioning.recovery_failed": "Recovery failures",
  "restaurant_provisioning.jobs_succeeded": "Worker successes",
  "restaurant_provisioning.jobs_failed": "Worker failures"
};

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function counterLabel(name: string) {
  if (counterLabels[name]) return counterLabels[name];
  return titleCase(name.replace(/[._]+/g, " ").toLowerCase());
}

function counterGroup(name: string) {
  if (name.startsWith("restaurant_provisioning.")) return "Provisioning";
  if (name.startsWith("platform.auth.")) return "Auth";
  return "Runtime";
}

function RuntimeCounters({ counters }: { counters: RuntimeMetricsReport["counters"] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2" data-testid="runtime-counters-grid">
      {counters.map((counter) => (
        <div
          key={counter.name}
          className="min-w-0 rounded-lg border border-line bg-surface-muted p-3"
          data-counter-name={counter.name}
          data-testid="runtime-counter-card"
          title={counter.name}
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <dt className="min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {counterGroup(counter.name)}
              </span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-ink">
                {counterLabel(counter.name)}
              </span>
              <span className="mt-1 block text-xs leading-4 text-muted">Current runtime count</span>
            </dt>
            <dd className="shrink-0 rounded-md border border-line bg-surface-raised px-2 py-1 text-base font-semibold tabular-nums text-ink">
              {counter.value.toLocaleString()}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function DashboardPage() {
  const readiness = useLoader<ReadinessReport>((signal) => healthApi("/ready", signal), []);
  const runtime = useLoader<RuntimeMetricsReport>((signal) => healthApi("/runtime", signal), []);
  const jobs = useLoader<Page<ProvisionRestaurantJobSummary>>(
    (signal) => platformApi(`/restaurants/provisioning-jobs?per_page=8`, { signal }),
    []
  );

  async function reloadAll() {
    await Promise.all([readiness.reload(), runtime.reload(), jobs.reload()]);
  }

  const activeJobCount =
    jobs.data?.items.filter((job) => isActiveJobStatus(job.job_status)).length ?? 0;
  const failedJobCount = jobs.data?.items.filter((job) => job.job_status === "failed").length ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operator overview"
        title="Dashboard"
        description="Monitor platform readiness, provisioning queues, and tenant repair entry points. Restaurant search is UUID based until the backend exposes a general tenant search route."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={reloadAll}
            icon={<RefreshCcw aria-hidden className="h-4 w-4" />}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Readiness"
          value={readiness.data ? <StatusBadge status={readiness.data.status} /> : "Checking"}
          helper={readiness.data?.surface ?? readiness.error ?? "Backend dependency probe"}
          icon={<Gauge aria-hidden className="h-5 w-5" />}
          tone={
            readiness.error ? "danger" : readiness.data?.status === "ready" ? "success" : "info"
          }
        />
        <StatCard
          label="Runtime counters"
          value={runtime.data?.counters.length ?? 0}
          helper={runtime.error ?? "Counters available from runtime telemetry"}
          icon={<Activity aria-hidden className="h-5 w-5" />}
          tone={runtime.error ? "danger" : "info"}
        />
        <StatCard
          label="Active jobs"
          value={jobs.data ? activeJobCount : "Loading"}
          helper="Queued and running jobs in the recent window"
          icon={<ClipboardList aria-hidden className="h-5 w-5" />}
          tone={activeJobCount > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Failed jobs"
          value={jobs.data ? failedJobCount : "Loading"}
          helper="Recent jobs needing operator review"
          icon={<ClipboardList aria-hidden className="h-5 w-5" />}
          tone={failedJobCount > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel
          title="Backend readiness"
          description="Unauthenticated `/health/ready` checks required platform dependencies."
        >
          {readiness.error ? <Alert tone="danger">{readiness.error}</Alert> : null}
          {readiness.data ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={readiness.data.status} />
                <span className="text-sm text-muted">Surface: {readiness.data.surface}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {readiness.data.checks.map((check) => (
                  <div
                    key={check.name}
                    className="rounded-lg border border-line bg-surface-muted p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs text-ink">{check.name}</p>
                      <StatusBadge status={check.status} />
                    </div>
                    {check.detail ? (
                      <p className="mt-2 text-xs text-muted">{check.detail}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <LoadingState>Loading readiness...</LoadingState>
          )}
        </Panel>

        <Panel
          title="Runtime counters"
          description="Current in-memory operational counters from `/health/runtime`."
        >
          {runtime.error ? <Alert tone="danger">{runtime.error}</Alert> : null}
          {runtime.data ? (
            <RuntimeCounters counters={runtime.data.counters} />
          ) : (
            <LoadingState>Loading counters...</LoadingState>
          )}
        </Panel>
      </div>

      <Panel
        title="Recent provisioning jobs"
        description="Provisioning jobs are the current tenant index. Open a job for timeline and operator controls, or open the restaurant summary by tenant ID."
        actions={
          <Link className="text-sm font-semibold text-brand hover:underline" href="/jobs">
            View all jobs
          </Link>
        }
      >
        {jobs.error ? <Alert tone="danger">{jobs.error}</Alert> : null}
        {jobs.data ? (
          <JobTable jobs={jobs.data.items} />
        ) : (
          <LoadingState>Loading jobs...</LoadingState>
        )}
      </Panel>

      <Panel
        title="Restaurant lookup"
        description="Open an operational summary when you already have a restaurant UUID from provisioning, audit, or an external support ticket."
        className="scroll-mt-24"
      >
        <div id="lookup">
          <RestaurantLookup />
        </div>
      </Panel>

      <Panel
        title="Backend-blocked lifecycle operations"
        description="These controls are intentionally not callable until matching backend routes exist in the current OpenAPI contract."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {["Backup", "Disable", "Re-enable", "Permanent delete"].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-dashed border-line-strong bg-surface-muted p-3"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">{item}</p>
                <Badge tone="muted">Blocked</Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                Requires backend tenant lifecycle API additions before this dashboard can execute
                the operation.
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
