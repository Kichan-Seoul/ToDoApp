export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="text-muted">{label}</span>
          <span className="font-semibold text-ink">{clamped}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-surface-strong">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
