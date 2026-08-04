import { useState } from 'react'
import { Outlet, useLocation, NavLink } from 'react-router-dom'
import { X, ShieldCheck } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const TITLES = {
  '/': ['Dashboard', 'Real-time overview of security operations'],
  '/incidents': ['Incidents', 'Track and respond to reported incidents'],
  '/assets': ['Assets', 'Organizational asset inventory'],
  '/users': ['Users', 'Manage analyst, manager and admin accounts'],
  '/reports': ['Reports', 'Operational analytics and SLA compliance'],
}

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  const base = '/' + (location.pathname.split('/')[1] || '')
  const [title, subtitle] = TITLES[base] || TITLES[location.pathname] || ['IRLMS', '']

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div className="relative flex w-64 flex-col bg-surface">
            <div className="flex h-16 items-center justify-between border-b border-border-soft px-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-signal" />
                <span className="text-sm font-bold text-ink">IRLMS</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-ink-muted">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 p-3">
              {Object.entries(TITLES).map(([path, [label]]) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm font-medium ${
                      isActive ? 'bg-signal-soft text-signal' : 'text-ink-muted'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="md:pl-60">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setDrawerOpen(true)} />
        <main className="px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
