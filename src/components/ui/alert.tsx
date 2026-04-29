import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const toneClasses = {
  info: "border-info-line bg-info-soft text-info",
  success: "border-success-line bg-success-soft text-success",
  danger: "border-danger-line bg-danger-soft text-danger",
  warning: "border-warning-line bg-warning-soft text-warning"
};

const icons = {
  info: Info,
  success: CheckCircle2,
  danger: AlertCircle,
  warning: AlertCircle
};

export function Alert({
  title,
  children,
  tone = "info",
  live = false
}: {
  title?: string;
  children: React.ReactNode;
  tone?: keyof typeof toneClasses;
  live?: boolean;
}) {
  const Icon = icons[tone];
  return (
    <div
      className={`flex gap-3 rounded-lg border p-3 text-sm ${toneClasses[tone]}`}
      role={tone === "danger" ? "alert" : "status"}
      aria-live={live ? "polite" : undefined}
    >
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="leading-6">{children}</div>
      </div>
    </div>
  );
}
