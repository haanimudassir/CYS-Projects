import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ShieldAlert, Server, User, Clock, MessageSquare,
  Activity, UserCheck, CheckCircle2, Paperclip, Download, Trash2, Upload, Fingerprint, Copy, Eye,
} from 'lucide-react'
import api from '../lib/api'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { SeverityBadge, StatusBadge } from '../components/Badge'
import { formatDateTime, formatRelative } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed', 'Reopened']

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const { push } = useToast()

  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analysts, setAnalysts] = useState([])
  const [assets, setAssets] = useState([])

  const [statusValue, setStatusValue] = useState('')
  const [resolution, setResolution] = useState('')
  const [assetValue, setAssetValue] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  const [assignTo, setAssignTo] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [actionType, setActionType] = useState('')
  const [actionDetails, setActionDetails] = useState('')
  const [loggingAction, setLoggingAction] = useState(false)

  const [comment, setComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const [evidence, setEvidence] = useState([])
  const [evidenceLoading, setEvidenceLoading] = useState(true)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [deletingIncident, setDeletingIncident] = useState(false)
  const fileInputRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/incidents/${id}`)
      setDetail(res.data.data)
      setStatusValue(res.data.data.incident.Status)
      setResolution(res.data.data.incident.Resolution || '')
      setAssetValue(res.data.data.incident.AssetID || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load incident.')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadEvidence = useCallback(async () => {
    setEvidenceLoading(true)
    try {
      const res = await api.get(`/incidents/${id}/evidence`)
      setEvidence(res.data.data)
    } catch {
      // Non-fatal: the rest of the incident page still works without evidence.
    } finally {
      setEvidenceLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
    loadEvidence()
    api.get('/users/analysts').then((res) => setAnalysts(res.data.data)).catch(() => {})
    api.get('/assets').then((res) => setAssets(res.data.data)).catch(() => {})
  }, [load, loadEvidence])

  if (loading) return <Spinner className="min-h-[60vh]" />

  if (error || !detail) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Couldn't load this incident"
        description={error || 'The incident may not exist or you may not have access.'}
        action={
          <Link to="/incidents" className="text-sm font-medium text-signal hover:underline">
            Back to incidents
          </Link>
        }
      />
    )
  }

  const { incident, actions, comments, assignments } = detail

  const canManage = hasRole('Analyst', 'Manager', 'Admin')
  const canAssign = hasRole('Manager', 'Admin')
  const canDelete = hasRole('Admin')

  const handleDeleteIncident = async () => {
    if (
      !window.confirm(
        `Delete incident ${incident.IncidentRefNo}? It will be removed from all views. This cannot be undone from the UI.`
      )
    )
      return
    setDeletingIncident(true)
    try {
      await api.delete(`/incidents/${id}`)
      push('Incident deleted', 'success')
      navigate('/incidents')
    } catch (err) {
      push(err.response?.data?.message || 'Failed to delete incident', 'error')
      setDeletingIncident(false)
    }
  }

  const updateStatus = async (e) => {
    e.preventDefault()
    setSavingStatus(true)
    try {
      await api.put(`/incidents/${id}`, {
        status: statusValue,
        resolution: resolution || undefined,
        assetId: assetValue ? Number(assetValue) : null,
      })
      push('Incident status updated', 'success')
      load()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to update status', 'error')
    } finally {
      setSavingStatus(false)
    }
  }

  const submitAssign = async (e) => {
    e.preventDefault()
    if (!assignTo) return
    setAssigning(true)
    try {
      await api.post(`/incidents/${id}/assign`, { assignedToId: Number(assignTo) })
      push('Incident assigned', 'success')
      setAssignTo('')
      load()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to assign incident', 'error')
    } finally {
      setAssigning(false)
    }
  }

  const submitAction = async (e) => {
    e.preventDefault()
    if (!actionType || !actionDetails) return
    setLoggingAction(true)
    try {
      await api.post(`/incidents/${id}/actions`, { actionType, details: actionDetails })
      push('Response action logged', 'success')
      setActionType('')
      setActionDetails('')
      load()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to log action', 'error')
    } finally {
      setLoggingAction(false)
    }
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    setPostingComment(true)
    try {
      await api.post(`/incidents/${id}/comments`, { commentText: comment })
      setComment('')
      load()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to post comment', 'error')
    } finally {
      setPostingComment(false)
    }
  }

  const handleEvidenceUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingEvidence(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post(`/incidents/${id}/evidence`, formData)
      const shortHash = res.data.data.hashValue.slice(0, 12)
      push(`Evidence uploaded — SHA-256 ${shortHash}…`, 'success')
      loadEvidence()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to upload evidence', 'error')
    } finally {
      setUploadingEvidence(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleEvidenceDownload = async (item) => {
    try {
      const res = await api.get(`/incidents/${id}/evidence/${item.EvidenceID}/download`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = item.FileName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      push('Failed to download evidence file', 'error')
    }
  }

  const isPreviewable = (item) => {
    const type = item.FileType || ''
    const name = item.FileName || ''
    return type.startsWith('text/') || /\.(txt|log|csv|json|md)$/i.test(name)
  }

  const handleEvidencePreview = async (item) => {
    setPreviewItem(item)
    setPreviewLoading(true)
    setPreviewContent('')
    try {
      const res = await api.get(`/incidents/${id}/evidence/${item.EvidenceID}/download`, {
        responseType: 'blob',
      })
      const text = await res.data.text()
      setPreviewContent(text)
    } catch {
      setPreviewContent('')
      push('Failed to load file content', 'error')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCopyHash = async (hash) => {
    if (!hash) return
    try {
      await navigator.clipboard.writeText(hash)
      push('Hash copied to clipboard', 'success')
    } catch {
      push('Could not copy hash', 'error')
    }
  }

  const handleEvidenceDelete = async (item) => {
    if (!window.confirm(`Permanently delete "${item.FileName}"? This cannot be undone.`)) return
    try {
      await api.delete(`/incidents/${id}/evidence/${item.EvidenceID}`)
      push('Evidence deleted', 'success')
      loadEvidence()
    } catch (err) {
      push(err.response?.data?.message || 'Failed to delete evidence', 'error')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === null || bytes === undefined) return '—'
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  return (
    <div className="space-y-5">
      <Link to="/incidents" className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Back to incidents
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="mono-tag text-xs font-semibold text-ink-faint">{incident.IncidentRefNo}</span>
            <h1 className="mt-1 text-xl font-bold text-ink">{incident.Title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{incident.Description}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex gap-2">
              <SeverityBadge value={incident.SeverityName} />
              <StatusBadge value={incident.Status} />
            </div>
            <p className="text-xs text-ink-faint">reported {formatRelative(incident.ReportedAt)}</p>
            {canDelete && (
              <button
                onClick={handleDeleteIncident}
                disabled={deletingIncident}
                title="Delete incident"
                className="flex items-center gap-1.5 rounded-md border border-critical/30 px-2.5 py-1.5 text-xs font-medium text-critical hover:bg-critical-soft disabled:opacity-60"
              >
                <Trash2 size={13} />
                {deletingIncident ? 'Deleting…' : 'Delete incident'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border-soft pt-5 sm:grid-cols-4">
          <MetaItem icon={User} label="Reporter" value={incident.ReporterName || '—'} />
          <MetaItem icon={UserCheck} label="Assigned to" value={incident.AssigneeName || 'Unassigned'} />
          <MetaItem icon={Server} label="Affected asset" value={incident.Hostname || 'None'} />
          <MetaItem icon={Clock} label="SLA window" value={incident.ResponseSLAHours ? `${incident.ResponseSLAHours}h` : '—'} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: actions & comments */}
        <div className="space-y-5 lg:col-span-2">
          {canManage && (
            <Panel icon={Activity} title="Log a response action">
              <form onSubmit={submitAction} className="space-y-3">
                <select
                  required
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="input"
                >
                  <option value="">Select action type</option>
                  {['Investigation', 'Containment', 'Eradication', 'Recovery', 'Communication', 'Escalation', 'Review', 'Other'].map(
                    (t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    )
                  )}
                </select>
                <textarea
                  required
                  rows={2}
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  placeholder="Details of what was done…"
                  className="input resize-none"
                />
                <button
                  type="submit"
                  disabled={loggingAction}
                  className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-[#06231f] hover:bg-signal-dim disabled:opacity-60"
                >
                  {loggingAction ? 'Logging…' : 'Log action'}
                </button>
              </form>
            </Panel>
          )}

          <Panel icon={Activity} title={`Response actions (${actions.length})`}>
            {actions.length === 0 ? (
              <p className="text-sm text-ink-faint">No response actions logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {actions.map((a) => (
                  <li key={a.ActionID} className="rounded-lg border border-border-soft bg-surface-2 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">{a.ActionType}</p>
                      <span className="font-mono text-[11px] text-ink-faint">{formatDateTime(a.ActionTime)}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">{a.Details}</p>
                    <p className="mt-1.5 text-[11px] text-ink-faint">by {a.ActionByName || 'Unknown'}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel icon={Paperclip} title={`Evidence (${evidence.length})`}>
            {(hasRole('Analyst', 'Manager', 'Admin')) && (
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="evidence-file-input"
                  onChange={handleEvidenceUpload}
                  disabled={uploadingEvidence}
                  className="hidden"
                />
                <label
                  htmlFor="evidence-file-input"
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-soft bg-surface-2 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-signal hover:text-signal ${
                    uploadingEvidence ? 'pointer-events-none opacity-60' : ''
                  }`}
                >
                  <Upload size={15} />
                  {uploadingEvidence ? 'Uploading & hashing…' : 'Upload evidence file (logs, pcaps, screenshots…)'}
                </label>
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  Every file is SHA-256 hashed on upload for chain-of-custody integrity verification.
                </p>
              </div>
            )}

            {evidenceLoading ? (
              <p className="text-sm text-ink-faint">Loading evidence…</p>
            ) : evidence.length === 0 ? (
              <p className="text-sm text-ink-faint">No evidence files attached yet.</p>
            ) : (
              <ul className="space-y-2">
                {evidence.map((item) => (
                  <li
                    key={item.EvidenceID}
                    className="flex items-center gap-3 rounded-lg border border-border-soft bg-surface-2 p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-3 text-ink-faint">
                      <Paperclip size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{item.FileName}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-faint">
                        <span>{formatFileSize(item.FileSize)}</span>
                        <span>·</span>
                        <span>{item.UploadedByName || 'Unknown'}</span>
                        <span>·</span>
                        <span>{formatRelative(item.UploadedAt)}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCopyHash(item.HashValue)}
                        title="Click to copy full hash"
                        className="mono-tag mt-1 flex w-full items-start gap-1 break-all text-left text-[10px] text-ink-faint hover:text-signal"
                      >
                        <Fingerprint size={10} className="mt-0.5 shrink-0" />
                        <span className="break-all">{item.HashValue || '—'}</span>
                        <Copy size={10} className="mt-0.5 shrink-0" />
                      </button>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {isPreviewable(item) && (
                        <button
                          onClick={() => handleEvidencePreview(item)}
                          title="Preview content"
                          className="rounded-md p-1.5 text-ink-muted hover:bg-surface-3 hover:text-signal"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEvidenceDownload(item)}
                        title="Download"
                        className="rounded-md p-1.5 text-ink-muted hover:bg-surface-3 hover:text-signal"
                      >
                        <Download size={14} />
                      </button>
                      {hasRole('Manager', 'Admin') && (
                        <button
                          onClick={() => handleEvidenceDelete(item)}
                          title="Delete"
                          className="rounded-md p-1.5 text-ink-muted hover:bg-critical-soft hover:text-critical"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel icon={MessageSquare} title={`Comments (${comments.length})`}>
            <form onSubmit={submitComment} className="mb-4 flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                className="input"
              />
              <button
                type="submit"
                disabled={postingComment}
                className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-60"
              >
                Post
              </button>
            </form>
            {comments.length === 0 ? (
              <p className="text-sm text-ink-faint">No comments yet.</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li key={c.CommentID} className="rounded-lg border border-border-soft bg-surface-2 p-3">
                    <p className="text-sm text-ink">{c.CommentText}</p>
                    <p className="mt-1.5 text-[11px] text-ink-faint">
                      {c.CommentByName || 'Unknown'} · {formatRelative(c.CreatedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Right: lifecycle controls */}
        <div className="space-y-5">
          {canManage && (
            <Panel icon={CheckCircle2} title="Update lifecycle">
              <form onSubmit={updateStatus} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-muted">Status</label>
                  <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)} className="input">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-muted">Affected asset</label>
                  <select value={assetValue} onChange={(e) => setAssetValue(e.target.value)} className="input">
                    <option value="">None</option>
                    {assets.map((a) => (
                      <option key={a.AssetID} value={a.AssetID}>
                        {a.Hostname}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-muted">Resolution notes</label>
                  <textarea
                    rows={3}
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Root cause & remediation summary…"
                    className="input resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="w-full rounded-lg bg-signal py-2 text-sm font-semibold text-[#06231f] hover:bg-signal-dim disabled:opacity-60"
                >
                  {savingStatus ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </Panel>
          )}

          {canAssign && (
            <Panel icon={UserCheck} title="Assign incident">
              <form onSubmit={submitAssign} className="space-y-3">
                <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="input">
                  <option value="">Select analyst / manager</option>
                  {analysts.map((a) => (
                    <option key={a.UserID} value={a.UserID}>
                      {a.FullName} ({a.Role})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={assigning || !assignTo}
                  className="w-full rounded-lg border border-border py-2 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-60"
                >
                  {assigning ? 'Assigning…' : 'Assign'}
                </button>
              </form>
            </Panel>
          )}

          <Panel icon={Clock} title="Assignment history">
            {assignments.length === 0 ? (
              <p className="text-sm text-ink-faint">No assignment history.</p>
            ) : (
              <ul className="space-y-2.5">
                {assignments.map((a) => (
                  <li key={a.AssignmentID} className="text-xs text-ink-muted">
                    <span className="font-medium text-ink">{a.AssignedToName}</span> assigned by{' '}
                    {a.AssignedByName || 'system'}
                    <div className="text-ink-faint">{formatDateTime(a.AssignedAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Modal
        open={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title={previewItem?.FileName || 'File preview'}
        wide
      >
        {previewLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <pre className="mono-tag max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-2 p-4 text-xs text-ink">
            {previewContent || 'No content to display.'}
          </pre>
        )}
      </Modal>
    </div>
  )
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-faint">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
        <p className="truncate text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  )
}

function Panel({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={15} className="text-signal" />
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </div>
  )
}
