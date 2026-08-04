import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-signal-soft text-signal">
        <ShieldAlert size={24} />
      </div>
      <h1 className="text-2xl font-bold text-ink">404 — Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link to="/" className="mt-6 rounded-lg bg-signal px-5 py-2.5 text-sm font-semibold text-[#06231f] hover:bg-signal-dim">
        Back to dashboard
      </Link>
    </div>
  )
}
