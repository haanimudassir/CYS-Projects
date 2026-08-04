import { useEffect, useState, useCallback } from 'react'
import { Plus, Server, Search, Trash2 } from 'lucide-react'
import api from '../lib/api'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { CriticalityBadge } from '../components/Badge'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const ASSET_TYPES = ['Server', 'Workstation', 'Network', 'Cloud', 'IoT', 'Mobile', 'Other']
const CRITICALITY = ['Low', 'Medium', 'High', 'Critical']

export default function Assets() {
  const { hasRole } = useAuth()
  const { push } = useToast()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/assets')
      setAssets(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (asset) => {
    if (!window.confirm(`Permanently delete asset "${asset.Hostname}"? This cannot be undone.`)) return
    try {
      await api.delete(`/assets/${asset.AssetID}`)
      push('Asset deleted', 'success')
      load()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to delete asset', 'error')
    }
  }

  const filtered = assets.filter(
    (a) =>
      !search ||
      a.Hostname?.toLowerCase().includes(search.toLowerCase()) ||
      a.IPAddress?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hostname or IP…"
            className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
          />
        </div>
        {hasRole('Manager', 'Admin') && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-[#06231f] hover:bg-signal-dim"
          >
            <Plus size={16} /> New Asset
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {loading ? (
          <Spinner />
        ) : error ? (
          <EmptyState icon={Server} title="Couldn't load assets" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Server} title="No assets found" description="Register your first asset to map incidents to it." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-3 font-medium">Hostname</th>
                  <th className="px-5 py-3 font-medium">IP address</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Criticality</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Incidents</th>
                  {hasRole('Admin') && <th className="px-5 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filtered.map((a) => (
                  <tr key={a.AssetID} className="transition-colors hover:bg-surface-2">
                    <td className="px-5 py-3.5 font-medium text-ink">{a.Hostname}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-muted">{a.IPAddress || '—'}</td>
                    <td className="px-5 py-3.5 text-ink-muted">{a.AssetType}</td>
                    <td className="px-5 py-3.5">
                      <CriticalityBadge value={a.Criticality} />
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">{a.OwnerName || 'Unassigned'}</td>
                    <td className="px-5 py-3.5 text-ink-muted">{a.IncidentCount}</td>
                    {hasRole('Admin') && (
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleDelete(a)}
                          title="Delete asset"
                          className="rounded-md p-1.5 text-ink-muted hover:bg-critical-soft hover:text-critical"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateAssetModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
          push('Asset created successfully', 'success')
          load()
        }}
      />
    </div>
  )
}

function CreateAssetModal({ open, onClose, onCreated }) {
  const { push } = useToast()
  const [form, setForm] = useState({
    hostname: '',
    ipAddress: '',
    assetType: 'Server',
    location: '',
    criticality: 'Medium',
    ownerId: '',
  })
  const [users, setUsers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    api
      .get('/users')
      .then((res) => setUsers(res.data.data.filter((u) => u.IsActive)))
      .catch(() => {})
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/assets', { ...form, ownerId: form.ownerId || null })
      setForm({ hostname: '', ipAddress: '', assetType: 'Server', location: '', criticality: 'Medium', ownerId: '' })
      onCreated()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to create asset', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Register a new asset">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Hostname</label>
          <input
            required
            value={form.hostname}
            onChange={(e) => setForm((f) => ({ ...f, hostname: e.target.value }))}
            placeholder="prod-db-02"
            className="input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">IP address</label>
          <input
            value={form.ipAddress}
            onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))}
            placeholder="10.0.4.12"
            className="input"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Asset type</label>
            <select
              value={form.assetType}
              onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))}
              className="input"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Criticality</label>
            <select
              value={form.criticality}
              onChange={(e) => setForm((f) => ({ ...f, criticality: e.target.value }))}
              className="input"
            >
              {CRITICALITY.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Location</label>
          <input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="us-east-1 / HQ rack 4"
            className="input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Owner</label>
          <select
            value={form.ownerId}
            onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}
            className="input"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.UserID} value={u.UserID}>
                {u.FullName} ({u.Role})
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-2">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-[#06231f] hover:bg-signal-dim disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Register asset'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
