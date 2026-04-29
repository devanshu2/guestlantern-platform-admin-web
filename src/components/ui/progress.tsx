export function ProgressBar({ value, label }: { value: number; label: string }) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span>{bounded}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted ring-1 ring-line">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${bounded}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={bounded}
          aria-label={label}
        />
      </div>
    </div>
  );
}
