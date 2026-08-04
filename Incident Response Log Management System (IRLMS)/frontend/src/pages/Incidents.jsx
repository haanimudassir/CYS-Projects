import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react'
import api from '../lib/api'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { SeverityBadge, StatusBadge } from '../components/Badge'
import { formatRelative } from '../lib/format'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed', 'Reopened']

export default function Incidents() {
  const { hasRole } = useAuth()
  const { push } = useToast()

  const [data, setData] = useState({ incidents: [], pagination: { page: 1, totalPages: 1, total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/incidents', {
        params: { page, limit: 15, status: status || undefined, search: search || undefined },
      })
      setData(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load incidents.')
    } finally {
      setLoading(false)
    }
  }, [page, status, search])

  useEffect(() => {
    load()
  }, [load])

  const onSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={onSearchSubmit} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or ref no…"
              className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink focus:border-signal focus:outline-none"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </form>

        {hasRole('Analyst', 'Manager', 'Admin') && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-[#06231f] hover:bg-signal-dim"
          >
            <Plus size={16} /> New Incident
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {loading ? (
          <Spinner />
        ) : error ? (
          <EmptyState icon={ShieldAlert} title="Couldn't load incidents" description={error} />
        ) : data.incidents.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No incidents found"
            description="Try adjusting your filters, or log a new incident."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-xs uppercase tracking-wider text-ink-faint">
                    <th className="px-5 py-3 font-medium">Ref</th>
                    <th className="px-5 py-3 font-medium">Title</th>
                    <th className="px-5 py-3 font-medium">Severity</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Assigned to</th>
                    <th className="px-5 py-3 font-medium">Reported</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {data.incidents.map((inc) => (
                    <tr key={inc.IncidentID} className="transition-colors hover:bg-surface-2">
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/incidents/${inc.IncidentID}`}
                          className="mono-tag text-xs font-medium text-signal hover:underline"
                        >
                          {inc.IncidentRefNo}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link to={`/incidents/${inc.IncidentID}`} className="font-medium text-ink hover:text-signal">
                          {inc.Title}
                        </Link>
                        <p className="text-xs text-ink-faint">{inc.TypeName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <SeverityBadge value={inc.SeverityName} />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge value={inc.Status} />
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted">{inc.AssigneeName || 'Unassigned'}</td>
                      <td className="px-5 py-3.5 text-ink-faint">{formatRelative(inc.ReportedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border-soft px-5 py-3 text-xs text-ink-muted">
              <span>
                Page {data.pagination.page} of {Math.max(data.pagination.totalPages, 1)} · {data.pagination.total} total
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 disabled:opacity-40"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateIncidentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
          push('Incident created successfully', 'success')
          load()
        }}
      />
    </div>
  )
}

function CreateIncidentModal({ open, onClose, onCreated }) {
  const { push } = useToast()
  const [types, setTypes] = useState([])
  const [severities, setSeverities] = useState([])
  const [assets, setAssets] = useState([])
  const [form, setForm] = useState({ title: '', description: '', typeId: '', severityId: '', assetId: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([api.get('/meta/types'), api.get('/meta/severities'), api.get('/assets')])
      .then(([t, s, a]) => {
        setTypes(t.data.data)
        setSeverities(s.data.data)
        setAssets(a.data.data)
      })
      .catch(() => push('Failed to load form options', 'error'))
  }, [open, push])

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/incidents', {
        title: form.title,
        description: form.description,
        typeId: Number(form.typeId),
        severityId: Number(form.severityId),
        assetId: form.assetId ? Number(form.assetId) : undefined,
      })
      setForm({ title: '', description: '', typeId: '', severityId: '', assetId: '' })
      onCreated()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to create incident', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log a new incident" wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Suspicious login activity on prod-db-02"
            className="input"
          />
        </Field>
        <Field label="Description">
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What was observed, when, and by whom…"
            className="input resize-none"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Incident type">
            <select
              required
              value={form.typeId}
              onChange={(e) => setForm((f) => ({ ...f, typeId: e.target.value }))}
              className="input"
            >
              <option value="">Select type</option>
              {types.map((t) => (
                <option key={t.TypeID} value={t.TypeID}>
                  {t.TypeName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Severity">
            <select
              required
              value={form.severityId}
              onChange={(e) => setForm((f) => ({ ...f, severityId: e.target.value }))}
              className="input"
            >
              <option value="">Select severity</option>
              {severities.map((s) => (
                <option key={s.SeverityID} value={s.SeverityID}>
                  {s.SeverityName} — SLA {s.ResponseSLAHours}h
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Affected asset (optional)">
          <select
            value={form.assetId}
            onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))}
            className="input"
          >
            <option value="">No specific asset</option>
            {assets.map((a) => (
              <option key={a.AssetID} value={a.AssetID}>
                {a.Hostname} ({a.IPAddress || 'no IP'})
              </option>
            ))}
          </select>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-2">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-[#06231f] hover:bg-signal-dim disabled:opacity-60"
          >
            {submitting ? 'Logging…' : 'Log incident'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  )
}
