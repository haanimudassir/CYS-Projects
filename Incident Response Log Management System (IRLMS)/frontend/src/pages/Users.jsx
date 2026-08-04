import { useEffect, useState, useCallback } from 'react'
import { Plus, Users as UsersIcon, Trash2 } from 'lucide-react'
import api from '../lib/api'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { RoleBadge } from '../components/Badge'
import { initialsOf, formatRelative } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const ROLES = ['Analyst', 'Manager', 'Admin', 'Auditor']

export default function Users() {
  const { hasRole } = useAuth()
  const { push } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/users')
      setUsers(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u.UserID}`, { isActive: !u.IsActive })
      push(`${u.FullName} ${u.IsActive ? 'deactivated' : 'reactivated'}`, 'success')
      load()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to update user', 'error')
    }
  }

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.FullName}"? Their account will be deactivated and removed from all active views.`)) return
    try {
      await api.put(`/users/${u.UserID}`, { isActive: false })
      push(`${u.FullName} deleted`, 'success')
      load()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to delete user', 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        {hasRole('Admin') && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-[#06231f] hover:bg-signal-dim"
          >
            <Plus size={16} /> New User
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {loading ? (
          <Spinner />
        ) : error ? (
          <EmptyState icon={UsersIcon} title="Couldn't load users" description={error} />
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Active incidents</th>
                  <th className="px-5 py-3 font-medium">Last login</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  {hasRole('Admin') && <th className="px-5 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {users.map((u) => (
                  <tr key={u.UserID} className="transition-colors hover:bg-surface-2">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-ink">
                          {initialsOf(u.FullName)}
                        </div>
                        <div>
                          <p className="font-medium text-ink">{u.FullName}</p>
                          <p className="text-xs text-ink-faint">{u.Email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <RoleBadge value={u.Role} />
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">{u.Department || '—'}</td>
                    <td className="px-5 py-3.5 text-ink-muted">{u.ActiveIncidents}</td>
                    <td className="px-5 py-3.5 text-ink-faint">{formatRelative(u.LastLogin)}</td>
                    <td className="px-5 py-3.5">
                      {hasRole('Admin') ? (
                        <button
                          onClick={() => toggleActive(u)}
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                            u.IsActive
                              ? 'text-resolved bg-emerald-950/60 ring-resolved/30 hover:opacity-80'
                              : 'text-ink-muted bg-surface-2 ring-border hover:opacity-80'
                          }`}
                        >
                          {u.IsActive ? 'Active' : 'Inactive'}
                        </button>
                      ) : (
                        <span className={u.IsActive ? 'text-resolved text-xs' : 'text-ink-faint text-xs'}>
                          {u.IsActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    {hasRole('Admin') && (
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleDelete(u)}
                          title="Delete user"
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

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
          push('User created successfully', 'success')
          load()
        }}
      />
    </div>
  )
}

function CreateUserModal({ open, onClose, onCreated }) {
  const { push } = useToast()
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Analyst',
    fullName: '',
    phone: '',
    department: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/users', form)
      setForm({ username: '', email: '', password: '', role: 'Analyst', fullName: '', phone: '', department: '' })
      onCreated()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to create user', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a new user" wide>
      <form onSubmit={submit} className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Full name</label>
          <input required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Username</label>
          <input required value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Email</label>
          <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Temporary password</label>
          <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Role</label>
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="input">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Department</label>
          <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="input" />
        </div>

        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-2">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-[#06231f] hover:bg-signal-dim disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
