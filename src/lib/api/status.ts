const ACTIVE_JOB_STATUSES = new Set(["queued", "running"]);

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
  pending: "Pending",
  skipped: "Skipped",
  active: "Active",
  draft: "Draft",
  provisioning: "Provisioning",
  suspended: "Suspended",
  disabled: "Disabled",
  ready: "Ready",
  not_ready: "Not ready",
  enabled: "Enabled",
  deleted: "Deleted",
  database_backup: "Database backup",
  re_enable: "Re-enable",
  permanent_delete: "Permanent delete"
};

export function isActiveJobStatus(status: string): boolean {
  return ACTIVE_JOB_STATUSES.has(status);
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return (
    STATUS_LABELS[status] ??
    status
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function statusTone(status: string | null | undefined) {
  switch (status) {
    case "succeeded":
    case "ready":
    case "active":
    case "enabled":
      return "success";
    case "queued":
    case "running":
    case "pending":
    case "provisioning":
      return "info";
    case "cancelled":
    case "disabled":
    case "deleted":
    case "skipped":
      return "muted";
    case "failed":
    case "not_ready":
    case "suspended":
      return "danger";
    default:
      return "neutral";
  }
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

export function stepProgress(succeeded: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((succeeded / total) * 100);
}
