import { useEffect, useState } from 'react'
import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function Topbar({ title, subtitle, onMenuClick }) {
  const { user, logout } = useAuth()
  const now = useClock()

  const initials = (user?.fullName || user?.username || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border-soft bg-canvas/90 px-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-ink-muted hover:bg-surface-2 md:hidden"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-ink">{title}</h1>
          {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden font-mono text-xs text-ink-faint sm:block">
          {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          <span className="mx-2 text-border">·</span>
          {now.toLocaleTimeString(undefined, { hour12: false })}
        </div>
        <div className="h-6 w-px bg-border-soft" />
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-ink">
            {initials}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-semibold text-ink">{user?.fullName}</p>
            <p className="text-[11px] text-ink-faint">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-critical-soft hover:text-critical"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
