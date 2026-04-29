import type { ReactNode } from "react";

export function Panel({
  title,
  description,
  actions,
  children,
  className = ""
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-base font-semibold text-ink">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
