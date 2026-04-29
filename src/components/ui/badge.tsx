import { statusLabel, statusTone } from "@/lib/api/status";

const toneClasses: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-cyan-200 bg-cyan-50 text-cyan-900",
  muted: "border-slate-200 bg-slate-100 text-slate-700",
  neutral: "border-line bg-white text-ink"
};

export function StatusBadge({ status }: { status?: string | null }) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-1 text-xs font-medium ${toneClasses[tone]}`}
      style={{ borderRadius: 999 }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
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
      className={`inline-flex items-center border px-2 py-1 text-xs font-medium ${toneClasses[tone]}`}
      style={{ borderRadius: 999 }}
    >
      {children}
    </span>
  );
}
