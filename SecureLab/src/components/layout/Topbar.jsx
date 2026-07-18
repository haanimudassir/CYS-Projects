import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { PANEL_NAMES } from '../../data/constants.js';

export default function Topbar() {
  const { activePanel, mode, toggleMode, solvedCount, totalModules, toggleMobileNav } = useApp();
  const isSecure = mode === 'secure';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-nav-btn" aria-label="Toggle Menu" onClick={toggleMobileNav}>☰</button>
        <div className="logo-mark">
          <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 2L5 7.5v7C5 20.5 9.5 26 15 27.5 20.5 26 25 20.5 25 14.5v-7L15 2z" fill="rgba(0,212,255,0.12)" stroke="#00d4ff" strokeWidth="1.2" />
            <path d="M11 15l3 3 6-6" stroke="#00ff94" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="15" cy="15" r="2" fill="#00d4ff" opacity="0.3" />
          </svg>
        </div>
        <div className="logo-text">
          <div className="name">SecureLab</div>
          <div className="tagline">OWASP · FAST-NUCES</div>
        </div>
      </div>

      <div className="topbar-center">
        <div className="breadcrumb">
          <span>SecureLab</span>
          <span className="sep">/</span>
          <span className="current">{PANEL_NAMES[activePanel] || activePanel}</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="owasp-pill"><span className="dot"></span>OWASP Top 10 · 2026</div>
        <div className="score-badge">
          <span>Exploits</span>
          <span className="num">{solvedCount}</span>
          <span>/ {totalModules}</span>
        </div>
        <div className="mode-toggle-wrap">
          <span className="mode-indicator vuln" style={{ opacity: isSecure ? 0.35 : 1 }}>Vulnerable</span>
          <div className={`toggle-switch${isSecure ? ' on' : ''}`} onClick={toggleMode}>
            <div className="toggle-track"></div>
            <div className="toggle-thumb"></div>
          </div>
          <span className="mode-indicator sec" style={{ opacity: isSecure ? 1 : 0.35 }}>Secure</span>
        </div>
      </div>
    </header>
  );
}
