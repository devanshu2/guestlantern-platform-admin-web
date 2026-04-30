export function KeyValue({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-lg border border-line bg-surface-muted p-3"
        >
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted [overflow-wrap:anywhere]">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm text-ink [overflow-wrap:anywhere]">
            {item.value || "Not recorded"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
