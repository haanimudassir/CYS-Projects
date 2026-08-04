export default function StatCard({ label, value, icon: Icon, accent = 'signal', hint }) {
  const accentMap = {
    signal: 'text-signal bg-signal-soft',
    critical: 'text-critical bg-critical-soft',
    high: 'text-high bg-high-soft',
    medium: 'text-medium bg-medium-soft',
    low: 'text-low bg-low-soft',
  }
  return (
    <div className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">{label}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
        </div>
        {Icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accentMap[accent]}`}>
            <Icon size={17} />
          </div>
        )}
      </div>
    </div>
  )
}
