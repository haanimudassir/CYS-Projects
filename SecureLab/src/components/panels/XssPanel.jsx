import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Terminal from '../shared/Terminal.jsx';
import QueryViewer from '../shared/QueryViewer.jsx';
import { escHtml } from '../../utils/helpers.js';

const CHIPS = [
  "<script>alert('XSS')</script>",
  '<img src=x onerror=alert(document.cookie)>',
  "<svg onload=alert('pwned')>",
  '<a href="javascript:alert(1)">click</a>',
  'Hello, world!',
];

export default function XssPanel({ active }) {
  const { mode, markSolved } = useApp();
  const [input, setInput] = useState('');
  const [result, setResult] = useState({ text: 'Waiting for input...', cls: 'neutral' });
  const [preview, setPreview] = useState({ mode: 'text', text: 'Preview appears here...' });
  const [safe, setSafe] = useState({ text: '—', cls: '' });

  function runXSS() {
    const hasScript = /<script|onerror=|onload=|javascript:/i.test(input);
    const escaped = escHtml(input).replace(/'/g, '&#x27;');

    if (mode === 'vulnerable') {
      setResult({
        text: `[Stored] Raw value saved to DB:\n${input}\n\n${hasScript ? '⚠ SCRIPT INJECTED — executing in browser context...\n  → document.cookie accessible to attacker\n  → session token exposed' : 'Note: No script detected in this payload.'}`,
        cls: hasScript ? 'vuln' : 'neutral',
      });
      if (hasScript) {
        setPreview({ mode: 'executed' });
        markSolved('xss');
      } else {
        setPreview({ mode: 'text', text: input });
      }
      setSafe({ text: '(No sanitization applied — | safe filter used in Jinja2 template)', cls: '' });
    } else {
      setResult({
        text: `[200] Comment stored safely.\nSanitized value: ${escaped}\n\nAttack blocked.\nJinja2 autoescaping converted all HTML\nspecial characters to HTML entities.\nCSP header blocks any inline scripts.`,
        cls: 'sec',
      });
      setPreview({ mode: 'text', text: input + ' (rendered as plain text)' });
      setSafe({ text: escaped, cls: 'safe' });
    }
  }

  return (
    <section className={`panel${active ? ' active' : ''}`}>
      <div className="panel-head">
        <div className="panel-head-left">
          <div className="panel-title">
            Cross-Site Scripting (XSS)
            <span className="sev-badge critical">Critical</span>
            <span className="owasp-ref">A03:2021</span>
          </div>
          <div className="panel-desc">Malicious scripts are injected into web pages and executed in other users' browsers — stealing session cookies, performing actions on behalf of users, or defacing pages.</div>
        </div>
      </div>

      <div className="payload-label">Quick payloads</div>
      <div className="payload-chips">
        {CHIPS.map(c => (
          <span key={c} className="chip" onClick={() => setInput(c)}>{c}</span>
        ))}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>Comment / Input Field</div>
          <div className="field-group">
            <label className="field-label">User Input</label>
            <textarea className="field-textarea" value={input} onChange={e => setInput(e.target.value)} placeholder="Enter comment..." />
          </div>
          <button className="btn btn-attack" onClick={runXSS}>⚡ Submit Input</button>
          <Terminal className="mt-10" title="xss_result.log" text={result.text} cls={result.cls} />
        </div>
        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>Render Preview</div>
          <div className="field-label">Browser DOM output</div>
          <div style={{ minHeight: 60, padding: 12, background: 'var(--bg-input)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {preview.mode === 'executed' ? (
              <span style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                ⚠ XSS EXECUTED<br />
                <span style={{ color: '#ff8a95', fontSize: 11 }}>
                  Simulated: alert(document.cookie)<br />
                  Cookie: session=abc123xyz<br />
                  Sent to: attacker.com/steal?c=abc123xyz
                </span>
              </span>
            ) : preview.text}
          </div>
          <div className="field-label">Sanitized (Jinja2 autoescaping)</div>
          <QueryViewer text={safe.text} cls={safe.cls} />
          <div className="field-label mt-10">Flask template comparison</div>
          <div className="code-block">
            <span className="cmt">{'{# ❌ VULNERABLE #}'}</span>{'\n'}
            <span className="bad">{'{{ comment | safe }}'}</span>{'\n\n'}
            <span className="cmt">{'{# ✓ SECURE — default autoescaping #}'}</span>{'\n'}
            <span className="good">{'{{ comment }}'}</span>{'\n'}
            <span className="cmt">{`# Jinja2 escapes < > & " '\n# by default — never use | safe`}</span>
          </div>
        </div>
      </div>

      <div className="explain-section">
        <div className="explain-header"><span>XSS Attack Types &amp; Mitigations</span><span className="line"></span></div>
        <div className="diff-grid">
          <div className="diff-box vuln">
            <div className="diff-box-title">⚠ Vulnerable — Raw HTML Output</div>
            <p>Stored XSS: injected script is saved to DB and rendered for every user. Reflected XSS: input echoed immediately. Both execute in victim's browser context.</p>
            <div className="code-block">
              <span className="cmt"># Flask — DANGEROUS</span>{'\n'}
              <span className="bad">{'return render_template_string(\n  f"<p>{comment}</p>")'}</span>{'\n'}
              <span className="cmt">{'# or in template:\n# {{ comment | safe }}  ← NEVER DO THIS'}</span>{'\n\n'}
              <span className="cmt">{`# Attack impact:\n# • document.cookie → session steal\n# • XMLHttpRequest → CSRF as victim\n# • window.location → redirect/phish`}</span>
            </div>
          </div>
          <div className="diff-box sec">
            <div className="diff-box-title">✓ Secure — Encode + CSP Header</div>
            <p>Use Jinja2 autoescaping (default). Set Content-Security-Policy to block inline scripts. Use bleach library for rich text. HttpOnly cookies prevent cookie theft.</p>
            <div className="code-block">
              <span className="good">{`# Flask secure setup\nfrom flask import Flask\nimport bleach\n\napp = Flask(__name__)\n# Jinja2 autoescape ON by default\n\n# For rich text input:\nclean = bleach.clean(comment,\n  tags=['b','i','u'], strip=True)\n\n# CSP header:\n@app.after_request\ndef csp(r):\n  r.headers['Content-Security-Policy']\\\n  = "default-src 'self'"\n  return r`}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
