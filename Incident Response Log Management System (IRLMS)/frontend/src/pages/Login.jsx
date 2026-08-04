import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*_-/\\<>[]{}01'
const HEADLINE = 'One console for every security incident, from first alert to root cause.'

// Scrambles-in the headline character by character, left to right, like a terminal decrypting text on boot.
function useDecryptText(text, { speed = 18, startDelay = 200 } = {}) {
  const [display, setDisplay] = useState('')
  const frame = useRef(0)

  useEffect(() => {
    let raf
    let timeout
    const resolvedUpTo = { current: 0 }

    function tick() {
      frame.current += 1
      resolvedUpTo.current = Math.min(text.length, Math.floor(frame.current / 2))

      let out = ''
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          out += ' '
        } else if (i < resolvedUpTo.current) {
          out += text[i]
        } else {
          out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        }
      }
      setDisplay(out)

      if (resolvedUpTo.current < text.length) {
        raf = setTimeout(tick, speed)
      }
    }

    timeout = setTimeout(tick, startDelay)
    return () => {
      clearTimeout(timeout)
      clearTimeout(raf)
    }
  }, [text, speed, startDelay])

  return display
}

// Animates a number counting up from 0 to `target` once, on mount.
function useCountUp(target, { duration = 1400, startDelay = 300 } = {}) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf
    let start
    const timeout = setTimeout(() => {
      function step(ts) {
        if (!start) start = ts
        const progress = Math.min(1, (ts - start) / duration)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, startDelay)

    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
  }, [target, duration, startDelay])

  return value
}

const FEED_LINES = [
  { icon: ShieldAlert, tone: 'critical', text: 'IRLMS-2026-0042 · Critical severity assigned' },
  { icon: CheckCircle2, tone: 'resolved', text: 'IRLMS-2026-0039 · Marked Resolved by S. Johnson' },
  { icon: ShieldAlert, tone: 'high', text: 'IRLMS-2026-0043 · New incident reported on DC-PROD-02' },
  { icon: CheckCircle2, tone: 'signal', text: 'Response action logged · Containment complete' },
  { icon: ShieldAlert, tone: 'medium', text: 'IRLMS-2026-0044 · SLA warning on WS-FINANCE-01' },
  { icon: CheckCircle2, tone: 'resolved', text: 'IRLMS-2026-0037 · Closed after root-cause review' },
]

const TONE_CLASS = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  resolved: 'text-resolved',
  signal: 'text-signal',
}

// Cycles through sample incident events, one visible at a time, like a live SOC feed.
function LiveFeed() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % FEED_LINES.length)
    }, 2600)
    return () => clearInterval(id)
  }, [])

  const line = FEED_LINES[index]
  const Icon = line.icon

  return (
    <div className="flex h-[52px] items-center gap-3 rounded-lg border border-border-soft bg-surface-2 px-4 py-3">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
      </span>
      <div key={index} className="flex min-w-0 items-center gap-2 login-feed-line">
        <Icon size={14} className={`shrink-0 ${TONE_CLASS[line.tone]}`} />
        <span className="mono-tag truncate text-xs text-ink-muted">{line.text}</span>
      </div>
    </div>
  )
}

function StatCounter({ label, target, suffix = '' }) {
  const value = useCountUp(target)
  return (
    <div className="rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5">
      <p className="mono-tag text-lg font-bold text-ink">
        {value.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-0.5 text-[10px] uppercase leading-tight tracking-wider text-ink-faint">{label}</p>
    </div>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const headline = useDecryptText(HEADLINE)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in. Check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative grid min-h-screen grid-cols-1 bg-canvas md:grid-cols-2">
      <style>{`
        @keyframes login-radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes login-feed-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-radar-sweep {
          animation: login-radar-spin 6s linear infinite;
        }
        .login-feed-line {
          animation: login-feed-in 0.35s ease-out;
        }
      `}</style>

      {/* Hero panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border-soft bg-surface p-10 md:flex">
        {/* Static grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-signal) 1px, transparent 1px), linear-gradient(90deg, var(--color-signal) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-soft text-signal">
              <ShieldCheck size={20} strokeWidth={2.4} />
            </div>
            <span className="text-lg font-bold tracking-tight text-ink">IRLMS</span>
          </div>

          <h1 className="mono-tag mt-9 max-w-md min-h-[108px] text-3xl font-bold leading-tight text-ink">
            {headline}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
            IRLMS centralizes incident logs, asset ownership, and response actions into a single
            auditable system of record, built on a normalized relational schema with full
            transactional integrity.
          </p>

          {/* Animated stat counters */}
          <div className="mt-6 grid max-w-sm grid-cols-3 gap-2.5">
            <StatCounter label="Incidents Resolved" target={1204} />
            <StatCounter label="Avg. Response Time" target={18} suffix="m" />
            <StatCounter label="Uptime" target={99.9} suffix="%" />
          </div>
        </div>

        {/* Live incident feed replaces the old static bullet list */}
        <div className="relative z-10 mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">Sample activity feed</p>
          <LiveFeed />
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center overflow-hidden px-6 py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-signal) 1px, transparent 1px), linear-gradient(90deg, var(--color-signal) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-soft text-signal">
              <ShieldCheck size={20} />
            </div>
            <span className="text-lg font-bold text-ink">IRLMS</span>
          </div>

          <h2 className="text-xl font-bold text-ink">Sign in to your workspace</h2>
          <p className="mt-1 text-sm text-ink-muted">Enter your credentials to access the incident console.</p>

          <form onSubmit={submit} className="mt-7 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.com"
                  className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
                  style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06), rgba(255,255,255,0.06))' }}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
                  style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06), rgba(255,255,255,0.06))' }}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-critical/30 bg-critical-soft px-3 py-2.5 text-xs text-critical">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-signal py-2.5 text-sm font-semibold text-[#06231f] transition-colors hover:bg-signal-dim disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>
        </div>
      </div>

      <div
        className="login-radar-sweep pointer-events-none absolute left-1/2 top-0 hidden h-72 w-72 -translate-x-1/2 -translate-y-12 opacity-20 md:block"
        style={{
          background: 'conic-gradient(from 0deg, var(--color-signal), transparent 25%)',
          borderRadius: '9999px',
        }}
      />
    </div>
  )
}
