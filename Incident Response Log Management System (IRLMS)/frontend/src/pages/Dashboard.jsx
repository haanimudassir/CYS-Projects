import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ShieldAlert, Clock, Flame, ArrowUpRight } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import api from '../lib/api'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import StatCard from '../components/StatCard'
import { SeverityBadge, StatusBadge } from '../components/Badge'
import { formatRelative } from '../lib/format'

const STATUS_COLORS = {
  Open: 'var(--color-open)',
  'In Progress': 'var(--color-progress)',
  Resolved: 'var(--color-resolved)',
  Closed: 'var(--color-closed)',
  Reopened: 'var(--color-reopened)',
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [alerts, setAlerts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [statsRes, recentRes, alertsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/recent'),
          api.get('/dashboard/alert-stats'),
        ])
        if (cancelled) return
        setStats(statsRes.data.data)
        setRecent(recentRes.data.data)
        setAlerts(alertsRes.data.data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load dashboard data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <Spinner className="min-h-[60vh]" />

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load the dashboard"
        description={error}
      />
    )
  }

  const statusData = (stats?.statusDistribution || []).map((s) => ({
    name: s.Status,
    value: s.Count,
  }))

  const typeData = (stats?.incidentsByType || []).slice(0, 6).map((t) => ({
    name: t.TypeName,
    count: t.Count,
  }))

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open Incidents"
          value={alerts?.TotalOpen ?? 0}
          icon={ShieldAlert}
          accent="signal"
          hint="Across Open, In Progress & Reopened"
        />
        <StatCard
          label="SLA Warnings"
          value={alerts?.SLAWarning ?? 0}
          icon={Clock}
          accent="medium"
          hint="Past their response SLA window"
        />
        <StatCard
          label="Critical Open"
          value={alerts?.CriticalOpen ?? 0}
          icon={Flame}
          accent="critical"
          hint="Highest priority, immediate action"
        />
        <StatCard
          label="High Severity Open"
          value={alerts?.HighOpen ?? 0}
          icon={AlertTriangle}
          accent="high"
          hint="Respond within SLA window"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Status distribution */}
        <div className="rounded-xl border border-border bg-surface p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-ink">Status distribution</h3>
          <p className="text-xs text-ink-muted">All non-deleted incidents</p>
          {statusData.length === 0 ? (
            <EmptyState title="No incidents yet" description="Create your first incident to see it here." />
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#64748b'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#16213a',
                      border: '1px solid #223047',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="-mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: STATUS_COLORS[s.name] || '#64748b' }}
                    />
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Incidents by type */}
        <div className="rounded-xl border border-border bg-surface p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink">Top incident types</h3>
          <p className="text-xs text-ink-muted">Last 30 days</p>
          {typeData.length === 0 ? (
            <EmptyState title="No incidents in the last 30 days" />
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid stroke="#1a2436" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#8b97ad', fontSize: 11 }} stroke="#223047" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#8b97ad', fontSize: 11 }}
                    stroke="#223047"
                    width={140}
                  />
                  <Tooltip
                    cursor={{ fill: '#16213a' }}
                    contentStyle={{ background: '#16213a', border: '1px solid #223047', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#22d3b8" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent incident feed */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Recent activity</h3>
            <p className="text-xs text-ink-muted">Latest incidents reported across the organization</p>
          </div>
          <Link to="/incidents" className="flex items-center gap-1 text-xs font-medium text-signal hover:underline">
            View all <ArrowUpRight size={13} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No incidents logged yet"
            description="New incidents will appear here as soon as they're reported."
          />
        ) : (
          <ul className="divide-y divide-border-soft">
            {recent.map((inc) => (
              <li key={inc.IncidentID}>
                <Link
                  to={`/incidents/${inc.IncidentID}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
                  style={{ borderLeft: `3px solid ${STATUS_COLORS[inc.Status] || '#64748b'}` }}
                >
                  <span className="mono-tag shrink-0 rounded bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-muted">
                    {inc.IncidentRefNo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{inc.Title}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-faint">
                      {inc.TypeName} · reported {formatRelative(inc.ReportedAt)}
                      {inc.AssigneeName ? ` · assigned to ${inc.AssigneeName}` : ' · unassigned'}
                    </p>
                  </div>
                  <SeverityBadge value={inc.SeverityName} />
                  <StatusBadge value={inc.Status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
