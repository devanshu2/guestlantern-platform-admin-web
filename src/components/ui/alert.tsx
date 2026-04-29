import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const toneClasses = {
  info: "border-cyan-200 bg-cyan-50 text-cyan-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  danger: "border-red-200 bg-red-50 text-red-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950"
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
      className={`flex gap-3 border p-3 text-sm ${toneClasses[tone]}`}
      style={{ borderRadius: 8 }}
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
