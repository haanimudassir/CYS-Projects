import { useEffect, useState } from 'react'
import { FileBarChart, Download, TrendingUp, ShieldAlert } from 'lucide-react'
import api from '../lib/api'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import { CriticalityBadge } from '../components/Badge'
import { formatRelative } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Reports() {
  const { hasRole } = useAuth()
  const { push } = useToast()
  const [performance, setPerformance] = useState(null)
  const [risk, setRisk] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const calls = [api.get('/reports/asset-risk')]
        if (hasRole('Manager', 'Admin')) calls.unshift(api.get('/reports/analyst-performance'))
        const results = await Promise.all(calls)
        if (cancelled) return
        if (hasRole('Manager', 'Admin')) {
          setPerformance(results[0].data.data)
          setRisk(results[1].data.data)
        } else {
          setRisk(results[0].data.data)
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load reports.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [hasRole])

  const exportCsv = async () => {
    setExporting(true)
    try {
      const res = await api.get('/reports/export')
      const rows = res.data.data
      if (!rows.length) {
        push('No incidents to export', 'info')
        return
      }
      const headers = Object.keys(rows[0])
      const csv = [
        headers.join(','),
        ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `irlms-incidents-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      push('Export downloaded', 'success')
    } catch (err) {
      push(err.response?.data?.message || 'Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <Spinner className="min-h-[60vh]" />

  if (error) {
    return <EmptyState icon={FileBarChart} title="Couldn't load reports" description={error} />
  }

  return (
    <div className="space-y-6">
      {hasRole('Manager', 'Admin') && (
        <div className="flex justify-end">
          <button
            onClick={exportCsv}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-60"
          >
            <Download size={15} /> {exporting ? 'Preparing…' : 'Export incidents (CSV)'}
          </button>
        </div>
      )}

      {performance && (
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border-soft px-5 py-4">
            <TrendingUp size={15} className="text-signal" />
            <h3 className="text-sm font-semibold text-ink">Analyst performance</h3>
          </div>
          {performance.length === 0 ? (
            <EmptyState title="No performance data yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-xs uppercase tracking-wider text-ink-faint">
                    <th className="px-5 py-3 font-medium">Analyst</th>
                    <th className="px-5 py-3 font-medium">Assignments</th>
                    <th className="px-5 py-3 font-medium">Worked</th>
                    <th className="px-5 py-3 font-medium">Resolved</th>
                    <th className="px-5 py-3 font-medium">Avg resolution</th>
                    <th className="px-5 py-3 font-medium">SLA violations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {performance.map((p) => (
                    <tr key={p.UserID} className="hover:bg-surface-2">
                      <td className="px-5 py-3.5 font-medium text-ink">{p.FullName}</td>
                      <td className="px-5 py-3.5 text-ink-muted">{p.TotalAssignments}</td>
                      <td className="px-5 py-3.5 text-ink-muted">{p.IncidentsWorked}</td>
                      <td className="px-5 py-3.5 text-ink-muted">{p.ResolvedCount}</td>
                      <td className="px-5 py-3.5 text-ink-muted">{p.AvgResolutionHours ? `${p.AvgResolutionHours}h` : '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={p.SLAViolations > 0 ? 'text-critical font-semibold' : 'text-ink-muted'}>
                          {p.SLAViolations}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border-soft px-5 py-4">
          <ShieldAlert size={15} className="text-signal" />
          <h3 className="text-sm font-semibold text-ink">Asset risk assessment</h3>
        </div>
        {!risk || risk.length === 0 ? (
          <EmptyState title="No asset risk data yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-3 font-medium">Asset</th>
                  <th className="px-5 py-3 font-medium">Criticality</th>
                  <th className="px-5 py-3 font-medium">Total incidents</th>
                  <th className="px-5 py-3 font-medium">High severity</th>
                  <th className="px-5 py-3 font-medium">Last incident</th>
                  <th className="px-5 py-3 font-medium">Risk status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {risk.map((r) => (
                  <tr key={r.AssetID} className="hover:bg-surface-2">
                    <td className="px-5 py-3.5 font-medium text-ink">{r.Hostname}</td>
                    <td className="px-5 py-3.5">
                      <CriticalityBadge value={r.Criticality} />
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">{r.TotalIncidents}</td>
                    <td className="px-5 py-3.5 text-ink-muted">{r.HighSeverityIncidents}</td>
                    <td className="px-5 py-3.5 text-ink-faint">{formatRelative(r.LastIncidentDate)}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={
                          r.RiskStatus === 'Active Threat'
                            ? 'text-critical text-xs font-semibold'
                            : r.RiskStatus === 'No Incidents'
                            ? 'text-ink-faint text-xs'
                            : 'text-medium text-xs font-semibold'
                        }
                      >
                        {r.RiskStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
