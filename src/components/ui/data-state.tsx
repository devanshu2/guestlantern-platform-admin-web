import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingState({ children = "Loading..." }: { children?: ReactNode }) {
  return (
    <div
      className="flex min-h-24 items-center gap-3 rounded-lg border border-line bg-surface-muted p-4 text-sm text-muted"
      role="status"
    >
      <Loader2 aria-hidden className="h-4 w-4 animate-spin text-brand" />
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-surface-muted p-5 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      {children ? <div className="mt-2 leading-6 text-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
