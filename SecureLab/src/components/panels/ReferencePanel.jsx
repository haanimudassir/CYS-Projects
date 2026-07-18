import React from 'react';
import { OWASP_REF } from '../../data/constants.js';

export default function ReferencePanel({ active }) {
  return (
    <section className={`panel${active ? ' active' : ''}`}>
      <div className="panel-head">
        <div className="panel-head-left">
          <div className="panel-title">OWASP Top 10 — 2021 Reference</div>
          <div className="panel-desc">Complete reference for the 10 most critical web application security risks, as defined by the Open Web Application Security Project.</div>
        </div>
      </div>
      <div className="ref-grid">
        {OWASP_REF.map(r => (
          <div className="ref-card" key={r.n}>
            <span className="ref-num">{r.n}</span>
            <div>
              <div className="ref-title">{r.title} <span className={`sev-badge ${r.sev}`} style={{ fontSize: 8 }}>{r.sev}</span></div>
              <div className="ref-desc">{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
