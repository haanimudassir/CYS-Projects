import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { MODULES } from '../../data/constants.js';

const SEV_DOT = { critical: 'sev-critical', high: 'sev-high', medium: 'sev-medium', low: 'sev-low' };

export default function DashboardPanel({ active }) {
  const { mode, solved, solvedCount, totalModules, goPanel } = useApp();
  const pct = Math.round((solvedCount / totalModules) * 100);

  return (
    <section className={`panel${active ? ' active' : ''}`}>
      <div className="panel-head">
        <div className="panel-head-left">
          <div className="panel-title">
            Security Dashboard
            <span className="flask-badge">Flask/Python</span>
          </div>
          <div className="panel-desc">OWASP Top 10 training platform — toggle between vulnerable and secure implementations to understand real-world attack patterns and their mitigations.</div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card cyan">
          <div className="stat-num">{solvedCount}</div>
          <div className="stat-label">Exploits Found</div>
        </div>
        <div className="stat-card red">
          <div className="stat-num">{totalModules}</div>
          <div className="stat-label">Modules Total</div>
        </div>
        <div className="stat-card green">
          <div className="stat-num">{pct}%</div>
          <div className="stat-label">Completion</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-num">{mode === 'vulnerable' ? 'VULN' : 'SAFE'}</div>
          <div className="stat-label">Active Mode</div>
        </div>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: pct + '%' }}></div>
      </div>

      <div className="challenge-grid">
        {MODULES.map(m => (
          <div
            key={m.id}
            className={`challenge-row${solved[m.id] ? ' solved' : ''}`}
            onClick={() => goPanel(m.id)}
          >
            <div className="ch-emoji">{m.icon}</div>
            <div className="ch-info">
              <div className="ch-name">{m.name}</div>
              <div className="ch-desc">{m.desc}</div>
            </div>
            <div className="ch-right">
              <span className={`sev-badge ${m.sev}`}>{m.sev}</span>
              <span className="owasp-ref" style={{ fontSize: 9 }}>{m.owasp}</span>
              <span className={`ch-status ${solved[m.id] ? 'solved' : 'unsolved'}`}>
                {solved[m.id] ? '✓ SOLVED' : 'UNSOLVED'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Contact Us */}
      <div className="contact-card">
        <div className="contact-card-title"><span className="cc-dot"></span>Contact Us</div>
        <div className="contact-members">
          <div className="contact-member">
            <div className="contact-member-name">Syeda Haani</div>
            <div className="contact-member-role">23K-2017 · Project Lead & Secure Software Developer</div>
            <div className="contact-member-links">
              <a className="contact-link" href="mailto:haanimudassir@gmail.com">✉ haanimudassir@gmail.com</a>
              <a className="contact-link" href="https://www.linkedin.com/in/haani-mudassir-4abb8531b" target="_blank" rel="noreferrer">🔗 LinkedIn</a>
            </div>
          </div>
          <div className="contact-member">
            <div className="contact-member-name">Mohammad Faiq Afaq</div>
            <div className="contact-member-role">23K-2008 · Security Researcher & Pentester</div>
            <div className="contact-member-links">
              <a className="contact-link" href="mailto:faiqafaq23.cy@gmail.com">✉ faiqafaq23.cy@gmail.com</a>
              <a className="contact-link" href="https://www.linkedin.com/in/mohammad-faiq-afaq-a886242b9" target="_blank" rel="noreferrer">🔗 LinkedIn</a>
            </div>
          </div>
          <div className="contact-member">
            <div className="contact-member-name">Mehak Dhuka</div>
            <div className="contact-member-role">23K-2006 · Security Researcher & Pentester</div>
            <div className="contact-member-links">
              <a className="contact-link" href="mailto:mehakmushtaq355@gmail.com">✉ mehakmushtaq355@gmail.com</a>
              <a className="contact-link" href="https://www.linkedin.com/in/mehak-dhuka-b98362371" target="_blank" rel="noreferrer">🔗 LinkedIn</a>
            </div>
          </div>
        </div>
        <div className="contact-course">Secure Software Design · FAST-NUCES Karachi · 2026 </div>
      </div>
    </section>
  );
}
