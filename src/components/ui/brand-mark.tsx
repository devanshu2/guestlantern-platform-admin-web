import { ShieldCheck } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-brand-soft text-brand shadow-control">
        <ShieldCheck aria-hidden className="h-5 w-5" />
      </span>
      {!compact ? (
        <span>
          <span className="block text-base font-semibold leading-5 text-ink">GuestLantern</span>
          <span className="block text-xs font-medium text-muted">Platform Admin</span>
        </span>
      ) : null}
    </div>
  );
}
