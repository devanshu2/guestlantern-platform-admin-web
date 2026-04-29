export function KeyValue({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-line bg-surface-muted p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</dt>
          <dd className="mt-1 break-words text-sm text-ink">{item.value || "Not recorded"}</dd>
        </div>
      ))}
    </dl>
  );
}
