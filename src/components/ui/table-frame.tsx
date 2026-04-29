import type { ReactNode } from "react";

export function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface-raised shadow-control">
      {children}
    </div>
  );
}
