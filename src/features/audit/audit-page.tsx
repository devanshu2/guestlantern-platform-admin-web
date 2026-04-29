"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/data-state";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { platformApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/api/status";
import type { Page, ProvisionRestaurantAuditEvent } from "@/lib/api/types";
import { uuidSchema } from "@/lib/validation/platform";

export function AuditPage() {
  const searchParams = useSearchParams();
  const [jobId, setJobId] = useState(searchParams.get("job_id") ?? "");
  const [restaurantId, setRestaurantId] = useState(searchParams.get("restaurant_id") ?? "");
  const [events, setEvents] = useState<Page<ProvisionRestaurantAuditEvent> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setMessage(null);
    setEvents(null);

    if (!jobId.trim() && !restaurantId.trim()) {
      setMessage(
        "Enter a job ID, restaurant UUID, or both. The backend rejects unscoped audit reads."
      );
      return;
    }
    if (restaurantId.trim()) {
      const parsed = uuidSchema.safeParse(restaurantId);
      if (!parsed.success) {
        setMessage(parsed.error.issues[0]?.message ?? "Restaurant ID must be a UUID.");
        return;
      }
    }

    const params = new URLSearchParams({ per_page: "50" });
    if (jobId.trim()) params.set("job_id", jobId.trim());
    if (restaurantId.trim()) params.set("restaurant_id", restaurantId.trim());

    setLoading(true);
    try {
      const result = await platformApi<Page<ProvisionRestaurantAuditEvent>>(
        `/restaurants/provisioning-audit-events?${params.toString()}`
      );
      setEvents(result);
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Provisioning audit"
        title="Audit events"
        description="Search provisioning audit history by job ID, restaurant UUID, or both. Unscoped audit browsing is intentionally blocked by the backend."
      />

      <Panel
        title="Audit filters"
        description="Use precise identifiers from job detail, restaurant summary, support tickets, or external operator records."
      >
        <form className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-start" onSubmit={search}>
          <Field
            label="Job ID"
            name="audit_job_id"
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            helper="Optional. Example: 935dedef-8b1c-479f-a5b0-b2b9d561c80f or the backend job key shown in the jobs table."
          />
          <Field
            label="Restaurant UUID"
            name="audit_restaurant_id"
            value={restaurantId}
            onChange={(event) => setRestaurantId(event.target.value)}
            helper="Optional when job ID is present. Example: 33333333-3333-4333-8333-333333333333."
          />
          <Button
            type="submit"
            loading={loading}
            className="lg:mt-6"
            icon={<Search aria-hidden className="h-4 w-4" />}
          >
            Search
          </Button>
        </form>
        {message ? (
          <div className="mt-4">
            <Alert tone={message.includes("Enter") ? "warning" : "danger"} live>
              {message}
            </Alert>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Results"
        description="Audit events include actor metadata when available, backend event type, success flag, message, and structured metadata."
      >
        {events ? (
          events.items.length > 0 ? (
            <ol className="space-y-3">
              {events.items.map((event) => (
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
                  <dl className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-ink">Actor</dt>
                      <dd>{event.actor_email ?? "system or unavailable"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Restaurant</dt>
                      <dd className="break-all">{event.target_restaurant_id ?? "Not scoped"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">Job</dt>
                      <dd className="break-all">{event.provisioning_job_id ?? "Not scoped"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-ink">IP</dt>
                      <dd>{event.ip_address ?? "Not recorded"}</dd>
                    </div>
                  </dl>
                  <pre className="mt-3 overflow-x-auto rounded-md border border-line bg-surface-raised p-3 text-xs text-ink">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No audit events">
              No audit events matched the current filters.
            </EmptyState>
          )
        ) : (
          <EmptyState title="No search run">Run a search to load scoped audit events.</EmptyState>
        )}
      </Panel>
    </div>
  );
}
