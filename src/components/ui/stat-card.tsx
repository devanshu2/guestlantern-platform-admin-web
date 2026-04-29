import type { ReactNode } from "react";

const toneClasses = {
  neutral: "border-line bg-surface-raised text-brand",
  success: "border-success-line bg-success-soft text-success",
  warning: "border-warning-line bg-warning-soft text-warning",
  danger: "border-danger-line bg-danger-soft text-danger",
  info: "border-info-line bg-info-soft text-info"
};

export function StatCard({
  label,
  value,
  helper,
  icon,
  tone = "neutral"
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-raised p-4 shadow-control">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <div className="mt-2 break-words text-xl font-semibold text-ink">{value}</div>
        </div>
        {icon ? (
          <div
            className={`grid h-10 w-10 place-items-center rounded-lg border ${toneClasses[tone]}`}
          >
            {icon}
          </div>
        ) : null}
      </div>
      {helper ? <p className="mt-3 text-sm leading-5 text-muted">{helper}</p> : null}
    </div>
  );
}
