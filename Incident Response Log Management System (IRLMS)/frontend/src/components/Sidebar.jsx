import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LayoutDashboard, ShieldAlert, Server, Users, FileBarChart, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/incidents', label: 'Incidents', icon: ShieldAlert },
  { to: '/assets', label: 'Assets', icon: Server },
  { to: '/users', label: 'Users', icon: Users, roles: ['Admin', 'Manager'] },
  { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ['Admin', 'Manager', 'Auditor'] },
]

export default function Sidebar() {
  const { user, hasRole } = useAuth()
  const [online, setOnline] = useState(null)

  useEffect(() => {
    let cancelled = false
    const check = () => {
      api
        .get('/health')
        .then(() => !cancelled && setOnline(true))
        .catch(() => !cancelled && setOnline(false))
    }
    check()
    const id = setInterval(check, 20000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border-soft bg-surface md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border-soft px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-soft text-signal">
          <ShieldCheck size={18} strokeWidth={2.4} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight text-ink">IRLMS</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-ink-faint">Incident Ops</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.filter((item) => !item.roles || hasRole(...item.roles)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-signal-soft text-signal'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`
            }
          >
            <item.icon size={17} strokeWidth={2.1} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border-soft p-4">
        <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
          <span className="relative flex h-2 w-2">
            {online && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-resolved opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                online === null ? 'bg-ink-faint' : online ? 'bg-resolved' : 'bg-critical'
              }`}
            />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold text-ink">
              {online === null ? 'Checking API…' : online ? 'API Online' : 'API Unreachable'}
            </p>
            <p className="font-mono text-[10px] text-ink-faint">{user?.role || '—'} session</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
