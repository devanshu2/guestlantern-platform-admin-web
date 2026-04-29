import { statusLabel, statusTone } from "@/lib/api/status";

const toneClasses: Record<string, string> = {
  success: "border-success-line bg-success-soft text-success",
  danger: "border-danger-line bg-danger-soft text-danger",
  warning: "border-warning-line bg-warning-soft text-warning",
  info: "border-info-line bg-info-soft text-info",
  muted: "border-line bg-surface-muted text-muted",
  neutral: "border-line bg-surface-raised text-ink"
};

export function StatusBadge({ status }: { status?: string | null }) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      <span aria-hidden className="status-dot h-1.5 w-1.5 bg-current" />
      {statusLabel(status)}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
