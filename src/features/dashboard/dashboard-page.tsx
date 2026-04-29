"use client";

import { RefreshCcw } from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyValue } from "@/components/ui/key-value";
import { Panel } from "@/components/ui/panel";
import { JobTable } from "@/features/jobs/job-table";
import { RestaurantLookup } from "@/features/dashboard/restaurant-lookup";
import { healthApi, platformApi } from "@/lib/api/client";
import { useLoader } from "@/lib/api/hooks";
import type {
  Page,
  ProvisionRestaurantJobSummary,
  ReadinessReport,
  RuntimeMetricsReport
} from "@/lib/api/types";

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

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Operator overview
          </p>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Monitor platform readiness, provisioning queues, and tenant repair entry points.
            Restaurant search is currently UUID based because the backend does not expose a general
            tenant list/search route.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={reloadAll}
          icon={<RefreshCcw aria-hidden className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </section>

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
                  <div key={check.name} className="rounded-md border border-line bg-slate-50 p-3">
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
            <p className="text-sm text-muted">Loading readiness...</p>
          )}
        </Panel>

        <Panel
          title="Runtime counters"
          description="Current in-memory operational counters from `/health/runtime`."
        >
          {runtime.error ? <Alert tone="danger">{runtime.error}</Alert> : null}
          {runtime.data ? (
            <KeyValue
              items={runtime.data.counters.map((counter) => ({
                label: counter.name,
                value: counter.value.toLocaleString()
              }))}
            />
          ) : (
            <p className="text-sm text-muted">Loading counters...</p>
          )}
        </Panel>
      </div>

      <Panel
        title="Recent provisioning jobs"
        description="Provisioning jobs are the current tenant index. Open a job for timeline and operator controls, or open the restaurant summary by tenant ID."
        actions={
          <Link className="text-sm font-medium text-brand hover:underline" href="/jobs">
            View all jobs
          </Link>
        }
      >
        {jobs.error ? <Alert tone="danger">{jobs.error}</Alert> : null}
        {jobs.data ? (
          <JobTable jobs={jobs.data.items} />
        ) : (
          <p className="text-sm text-muted">Loading jobs...</p>
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
            <div key={item} className="rounded-md border border-dashed border-line bg-slate-50 p-3">
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
