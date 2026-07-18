import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { MODULES } from '../../data/constants.js';

const SEV_DOT = { critical: 'sev-critical', high: 'sev-high', medium: 'sev-medium', low: 'sev-low' };

export default function Sidebar() {
  const { activePanel, goPanel, solved, mobileNavOpen } = useApp();

  const NavItem = ({ id, icon, children, meta }) => (
    <button
      className={`nav-item${activePanel === id ? ' active' : ''}`}
      onClick={() => goPanel(id)}
    >
      <span className="nav-icon">{icon}</span>
      {children}
      {meta}
    </button>
  );

  return (
    <nav className={`sidebar${mobileNavOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar-section">
        <div className="sidebar-label">Overview</div>
        <NavItem id="dashboard" icon="⊞">Dashboard</NavItem>
      </div>

      <div className="sidebar-divider"></div>

      <div className="sidebar-section">
        <div className="sidebar-label">Attack Modules</div>
        {MODULES.map(m => (
          <NavItem
            key={m.id}
            id={m.id}
            icon={m.icon}
            meta={
              <span className="nav-meta">
                <span className={`severity-dot ${SEV_DOT[m.sev]}`}></span>
                <span>{solved[m.id] ? <span className="solved-check">✓</span> : ''}</span>
              </span>
            }
          >
            {m.name}
          </NavItem>
        ))}
      </div>

      <div className="sidebar-divider"></div>

      <div className="sidebar-section">
        <div className="sidebar-label">AI Tools</div>
        <NavItem
          id="scanner"
          icon="🔍"
          meta={
            <span className="nav-meta">
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
                background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)',
                borderRadius: 3, padding: '1px 5px', color: 'var(--accent-cyan)', letterSpacing: '0.06em',
              }}>AI</span>
            </span>
          }
        >
          AI Vuln Scanner
        </NavItem>
      </div>

      <div className="sidebar-divider"></div>

      <div className="sidebar-section">
        <div className="sidebar-label">Reference</div>
        <NavItem id="reference" icon="📖">OWASP Top 10</NavItem>
      </div>

      <div className="sidebar-footer">
        <p>Secure Software Design<br />FAST-NUCES · 2026</p>
        <p className="authors">Syeda Haani · Faiq Afaq · Mehak Dhuka</p>
      </div>
    </nav>
  );
}
