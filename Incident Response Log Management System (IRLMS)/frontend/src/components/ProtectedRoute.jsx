import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, hasRole } = useAuth()

  if (loading) return <Spinner className="min-h-screen" />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !hasRole(...roles)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-lg font-semibold text-ink">Access restricted</p>
        <p className="mt-1 text-sm text-ink-muted">Your role does not have permission to view this page.</p>
      </div>
    )
  }
  return children
}
