export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
    >
      <div
        className={`progress__fill${clamped >= 100 ? ' progress__fill--done' : ''}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
