const SEVERITY_STYLES = {
  Critical: 'text-critical bg-[var(--color-critical-soft)] ring-critical/30',
  High: 'text-high bg-[var(--color-high-soft)] ring-high/30',
  Medium: 'text-medium bg-[var(--color-medium-soft)] ring-medium/30',
  Low: 'text-low bg-[var(--color-low-soft)] ring-low/30',
}

const STATUS_STYLES = {
  Open: 'text-open bg-[var(--color-critical-soft)] ring-open/30',
  'In Progress': 'text-progress bg-[var(--color-medium-soft)] ring-progress/30',
  Resolved: 'text-resolved bg-emerald-950/60 ring-resolved/30',
  Closed: 'text-closed bg-slate-800/60 ring-closed/30',
  Reopened: 'text-reopened bg-orange-950/60 ring-reopened/30',
}

const CRITICALITY_STYLES = {
  Critical: 'text-critical bg-[var(--color-critical-soft)] ring-critical/30',
  High: 'text-high bg-[var(--color-high-soft)] ring-high/30',
  Medium: 'text-medium bg-[var(--color-medium-soft)] ring-medium/30',
  Low: 'text-low bg-[var(--color-low-soft)] ring-low/30',
}

export function SeverityBadge({ value }) {
  const cls = SEVERITY_STYLES[value] || 'text-ink-muted bg-surface-2 ring-border'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value}
    </span>
  )
}

export function StatusBadge({ value }) {
  const cls = STATUS_STYLES[value] || 'text-ink-muted bg-surface-2 ring-border'
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {value}
    </span>
  )
}

export function CriticalityBadge({ value }) {
  const cls = CRITICALITY_STYLES[value] || 'text-ink-muted bg-surface-2 ring-border'
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {value}
    </span>
  )
}

export function RoleBadge({ value }) {
  const map = {
    Admin: 'text-signal bg-[var(--color-signal-soft)] ring-signal/30',
    Manager: 'text-low bg-[var(--color-low-soft)] ring-low/30',
    Analyst: 'text-ink-muted bg-surface-2 ring-border',
    Auditor: 'text-medium bg-[var(--color-medium-soft)] ring-medium/30',
  }
  const cls = map[value] || 'text-ink-muted bg-surface-2 ring-border'
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {value}
    </span>
  )
}
