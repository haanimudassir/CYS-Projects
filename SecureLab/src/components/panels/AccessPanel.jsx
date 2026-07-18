import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Terminal from '../shared/Terminal.jsx';
import { randHex, nowPK } from '../../utils/helpers.js';

const CHIPS = ['/admin', '/admin/users', '/admin/config', '/api/user?id=1'];

export default function AccessPanel({ active }) {
  const { mode, markSolved, csrfSession } = useApp();
  const [path, setPath] = useState('/admin');
  const [accessResult, setAccessResult] = useState({ text: '—', cls: 'neutral' });
  const [privescResult, setPrivescResult] = useState({ text: '—', cls: 'neutral' });

  function runAccess() {
    if (mode === 'vulnerable') {
      if (path.startsWith('/admin')) {
        const users = Math.floor(800 + Math.random() * 2000);
        const rev = (Math.floor(10000 + Math.random() * 90000) * 100).toLocaleString();
        const apiKey = 'sk_live_' + randHex(12);
        const dbDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        setAccessResult({
          text: `[200 OK] ${path}\n\n=== ADMIN PANEL ===\nTotal users:   ${users.toLocaleString()}\nTotal revenue: PKR ${rev}\nDB backup:     /backup/prod_${dbDate}.sql\nAPI secret:    ${apiKey}\nAll user PII:  [FULLY EXPOSED]\n\n⚠ Full admin access granted — no auth\ncheck on this Flask route. Guest user\naccessed sensitive production data.`,
          cls: 'vuln',
        });
        markSolved('access');
      } else {
        setAccessResult({ text: `[200 OK] Resource returned.\nNo authorization check performed.`, cls: 'neutral' });
      }
    } else {
      setAccessResult({
        text: `[403] Forbidden\n\nAccess denied.\nYour role:     user\nRequired role: admin\nPath:          ${path}\n\n@admin_required decorator raised 403.\nEvent logged:\n  user=guest | path=${path}\n  session=${csrfSession || 'sess_' + Math.random().toString(36).slice(2, 10)}\n  time=${nowPK()}`,
        cls: 'sec',
      });
    }
  }

  function runPrivesc() {
    if (mode === 'vulnerable') {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
      const payload = btoa(JSON.stringify({ user: 'guest', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })).replace(/=/g, '');
      const sig = randHex(16);
      setPrivescResult({
        text: `[200 OK] Token accepted!\n\nForged JWT:\n  ${header}.${payload}.${sig}\n\nDecoded payload:\n  { user: "guest", role: "admin" }  ← forged\n\n⚠ Server trusted role claim without\nverifying HMAC-SHA256 signature.\nRole escalated: user → admin.\n\nFix: jwt.decode(token,\n  app.config['SECRET_KEY'],\n  algorithms=['HS256'])`,
        cls: 'vuln',
      });
      markSolved('access');
    } else {
      setPrivescResult({
        text: `[401] Token signature invalid.\n\nForged JWT rejected.\npyjwt.decode() verified HMAC-SHA256\nsignature against SECRET_KEY.\nPayload tampering detected.\n\nFix applied: jwt.decode(token,\n  app.config['SECRET_KEY'],\n  algorithms=['HS256'])`,
        cls: 'sec',
      });
    }
  }

  return (
    <section className={`panel${active ? ' active' : ''}`}>
      <div className="panel-head">
        <div className="panel-head-left">
          <div className="panel-title">
            Broken Access Control
            <span className="sev-badge critical">Critical</span>
            <span className="owasp-ref">A01:2021</span>
          </div>
          <div className="panel-desc">OWASP #1. Users can access functions or data beyond their intended permissions — admin routes, other users' data, or elevated privileges.</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>Unauthorized Route Access</div>
          <div className="info-row">Logged in as: <strong>guest</strong> · Role: <strong>user</strong></div>
          <div className="payload-chips">
            {CHIPS.map(c => <span key={c} className="chip" onClick={() => setPath(c)}>{c}</span>)}
          </div>
          <div className="field-group">
            <label className="field-label">Target Path</label>
            <input className="field-input" value={path} onChange={e => setPath(e.target.value)} />
          </div>
          <button className="btn btn-attack mt-10" onClick={runAccess}>⚡ Access Resource</button>
          <Terminal className="mt-10" title="access.log" text={accessResult.text} cls={accessResult.cls} />
        </div>
        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>Privilege Escalation — JWT Forgery</div>
          <div className="info-row">Forging a JWT token with elevated role</div>
          <div className="code-block">
            <span className="cmt">{`# Attacker decodes JWT, changes role,\n# re-encodes (if signature not verified)`}</span>{'\n'}
            <span className="bad">{`{\n  "user": "guest",\n  "role": "admin",  ← forged\n  "exp": 9999999999\n}`}</span>
          </div>
          <button className="btn btn-attack mt-10" onClick={runPrivesc}>⚡ Send Forged Token</button>
          <Terminal className="mt-10" title="jwt_check.log" text={privescResult.text} cls={privescResult.cls} />
        </div>
      </div>

      <div className="explain-section">
        <div className="explain-header"><span>Access Control — Flask Implementation</span><span className="line"></span></div>
        <div className="diff-grid">
          <div className="diff-box vuln">
            <div className="diff-box-title">⚠ Vulnerable — No Server-Side Check</div>
            <p>Hiding UI elements is not security. Any route without a server-side auth decorator is publicly accessible regardless of frontend state.</p>
            <div className="code-block">
              <span className="bad">{`@app.route('/admin')\ndef admin_panel():\n    # No check! Anyone can hit this.\n    return render_template('admin.html',\n        data=get_all_users())`}</span>
            </div>
          </div>
          <div className="diff-box sec">
            <div className="diff-box-title">✓ Secure — Decorator + Role Check</div>
            <p>Use flask-login's @login_required + custom @role_required decorator on every protected route. Verify JWT signature with SECRET_KEY. Log all 403s.</p>
            <div className="code-block">
              <span className="good">{`from functools import wraps\n\ndef admin_required(f):\n  @wraps(f)\n  def decorated(*args, **kwargs):\n    if not current_user.is_authenticated\\\n    or current_user.role != 'admin':\n      abort(403)\n    return f(*args, **kwargs)\n  return decorated\n\n@app.route('/admin')\n@admin_required\ndef admin_panel():\n    return render_template('admin.html')`}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
