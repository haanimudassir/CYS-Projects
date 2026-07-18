import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Terminal from '../shared/Terminal.jsx';
import { WEAK_PASSWORDS } from '../../data/constants.js';
import { randHex, nowPK } from '../../utils/helpers.js';

export default function AuthPanel({ active }) {
  const { mode, markSolved, authAttempts, setAuthAttempts } = useApp();
  const [tab, setTab] = useState('weak');
  const [user, setUser] = useState('admin');
  const [pass, setPass] = useState('1234');
  const [authResult, setAuthResult] = useState({ text: '—', cls: 'neutral' });
  const [bruteResult, setBruteResult] = useState({ text: '—', cls: 'neutral' });

  function runAuth(overridePass) {
    const p = overridePass !== undefined ? overridePass : pass;
    const nextAttempts = authAttempts + 1;
    setAuthAttempts(nextAttempts);
    if (mode === 'vulnerable') {
      if (WEAK_PASSWORDS.includes(p) && ['admin', 'administrator', 'root'].includes(user.toLowerCase())) {
        setAuthResult({
          text: `[200] LOGIN SUCCESS\nUser:    ${user}@lab.com\nRole:    ADMIN\nPassword: ${p} (plaintext, accepted as-is)\nSession: sess_${randHex(4)}\nTime:    ${new Date().toLocaleString('en-PK', { hour12: false })}\n\n⚠ Weak password accepted.\nAttempt #${nextAttempts} — zero lockout.\nNo rate limiting in vulnerable mode.`,
          cls: 'vuln',
        });
        markSolved('auth');
      } else {
        setAuthResult({ text: `[401] Login failed (attempt #${nextAttempts})\nNo lockout enforced. Keep trying.`, cls: 'neutral' });
      }
    } else {
      if (nextAttempts > 5) {
        setAuthResult({ text: `[429] Too Many Requests\n\nAccount locked — 15 minute cooldown.\nEvent logged: ${nextAttempts} failed attempts\nfrom this session.\n\nFlask-Limiter: @limiter.limit("5/minute")`, cls: 'sec' });
      } else {
        setAuthResult({ text: `[401] Invalid credentials.\nPassword policy: min 12 chars, mixed\ncase + digit + symbol required.\nAttempt ${nextAttempts}/5 before lockout.`, cls: 'sec' });
      }
    }
  }

  function quickTry(p) {
    setPass(p);
    runAuth(p);
  }

  function runBrute() {
    if (mode === 'vulnerable') {
      let log = 'Simulating 10 rapid login requests...\n\n';
      ['wrong1', 'wrong2', '1234', 'wrong3', 'password', 'wrong4', 'admin', 'wrong5', 'qwerty', 'wrong6'].forEach((p, i) => {
        const hit = ['1234', 'password', 'admin'].includes(p);
        log += `req ${String(i + 1).padStart(2, ' ')}: admin / ${p.padEnd(10, ' ')} → ${hit ? '200 OK  ← SUCCESS' : '401    '}\n`;
      });
      log += '\n⚠ Credentials cracked in 0.04 seconds.\nNo rate limiting. No lockout. No delay.';
      setBruteResult({ text: log, cls: 'vuln' });
      markSolved('auth');
    } else {
      setBruteResult({
        text: `Attempt 1–5: 401 Unauthorized\nAttempt 6:   429 Too Many Requests\n\nBrute force blocked.\nAccount locked. Alert triggered.\nAll attempts logged:\n  IP: [client IP — logged by server]\n  Time: ${nowPK()}\n  User-Agent: SecureLab/Simulator`,
        cls: 'sec',
      });
    }
  }

  const TABS = [
    { id: 'weak', label: 'Weak Passwords' },
    { id: 'brute', label: 'Brute Force' },
    { id: 'storage', label: 'Password Storage' },
    { id: 'session', label: 'Session Security' },
  ];

  return (
    <section className={`panel${active ? ' active' : ''}`}>
      <div className="panel-head">
        <div className="panel-head-left">
          <div className="panel-title">
            Broken Authentication
            <span className="sev-badge high">High</span>
            <span className="owasp-ref">A07:2021</span>
          </div>
          <div className="panel-desc">Weak credentials, missing rate limiting, plaintext password storage, and insecure session management allow attackers to compromise user accounts.</div>
        </div>
      </div>

      <div className="tab-row">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'weak' && (
        <div className="tab-pane active">
          <div className="two-col">
            <div className="card">
              <div className="card-title"><span className="card-title-icon"></span>Login Attempt</div>
              <div className="field-group">
                <label className="field-label">Username</label>
                <input className="field-input" value={user} onChange={e => setUser(e.target.value)} type="text" />
              </div>
              <div className="field-group">
                <label className="field-label">Password</label>
                <input className="field-input" value={pass} onChange={e => setPass(e.target.value)} type="password" />
              </div>
              <button className="btn btn-attack mt-10" onClick={() => runAuth()}>⚡ Login</button>
              <Terminal className="mt-10" title="auth.log" text={authResult.text} cls={authResult.cls} />
            </div>
            <div className="card">
              <div className="card-title"><span className="card-title-icon"></span>Try Common Passwords</div>
              <div className="info-row">Target user: <strong>admin</strong></div>
              <div style={{ display: 'grid', gap: 5 }}>
                {['1234', 'password', 'admin', 'qwerty', 'letmein'].map(p => (
                  <button key={p} className="btn btn-attack" style={{ fontSize: 11, padding: 7 }} onClick={() => quickTry(p)}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'brute' && (
        <div className="tab-pane active">
          <div className="two-col">
            <div className="card">
              <div className="card-title"><span className="card-title-icon"></span>Brute Force Simulator</div>
              <div className="info-row">No rate limiting in vulnerable mode</div>
              <button className="btn btn-attack" onClick={runBrute}>⚡ Simulate 10 Rapid Attempts</button>
              <Terminal className="mt-10" title="brute_force.log" text={bruteResult.text} cls={bruteResult.cls} />
            </div>
            <div className="card">
              <div className="card-title"><span className="card-title-icon"></span>Flask Rate Limiting Fix</div>
              <div className="code-block">
                <span className="cmt"># pip install Flask-Limiter</span>{'\n'}
                <span className="kw">from</span> flask_limiter <span className="kw">import</span> Limiter{'\n\n'}
                limiter = Limiter(app,{'\n'}
                {'  '}key_func=get_remote_address){'\n\n'}
                <span className="good">{`@app.route('/login', methods=['POST'])\n@limiter.limit("5 per minute")\ndef login():\n    ...`}</span>{'\n\n'}
                <span className="cmt">{`# Also: account lockout after 5 failures\n# Store failed_attempts in session/DB\n# Exponential backoff: 2^n seconds`}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'storage' && (
        <div className="tab-pane active">
          <div className="two-col">
            <div className="card">
              <div className="card-title"><span className="card-title-icon"></span>Vulnerable — Plaintext DB</div>
              <Terminal title="db dump" cls="vuln" text={`SELECT * FROM users;\n\nid | email              | password\n---+--------------------+---------\n 1 | admin@lab.com      | 1234\n 2 | user@lab.com       | hello\n 3 | test@lab.com       | password\n\n⚠ DB breach = instant credential exposure\n   No cracking required whatsoever.`} />
            </div>
            <div className="card">
              <div className="card-title"><span className="card-title-icon"></span>Secure — Bcrypt Hashed</div>
              <Terminal title="db dump (secure)" cls="sec" text={`SELECT * FROM users;\n\nid | email         | password_hash\n---+---------------+----------------------\n 1 | admin@lab.com | $2b$12$xHQj3aK...\n 2 | user@lab.com  | $2b$12$yKRm7fQ...\n\n✓ Hashes are computationally infeasible\n  to reverse. bcrypt cost=12 means\n  ~250ms per check — kills brute force.`} />
              <div className="code-block mt-10">
                <span className="kw">from</span> werkzeug.security <span className="kw">import</span> {'\\'}{'\n'}
                {'    '}generate_password_hash, check_password_hash{'\n\n'}
                <span className="cmt"># Store:</span>{'\n'}
                <span className="good">{`pw_hash = generate_password_hash(\n    pw, method='pbkdf2:sha256',\n    salt_length=16)`}</span>{'\n\n'}
                <span className="cmt"># Verify:</span>{'\n'}
                <span className="good">check_password_hash(pw_hash, pw)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'session' && (
        <div className="tab-pane active">
          <div className="two-col">
            <div className="card">
              <div className="card-title"><span className="card-title-icon"></span>Session Security Issues</div>
              <Terminal title="session_vuln.log" cls="vuln" text={`⚠ Common session vulnerabilities:\n\n1. Predictable session IDs\n   session_id = str(user_id)  ← guessable\n\n2. No expiry\n   Session valid forever after login\n\n3. Missing HttpOnly / Secure flags\n   JS can read cookie → XSS steals it\n\n4. No re-authentication on sensitive ops\n   Change password without old password`} />
            </div>
            <div className="card">
              <div className="card-title"><span className="card-title-icon"></span>Secure Session Config (Flask)</div>
              <div className="code-block">
                <span className="good">{`app.config.update(\n  SECRET_KEY=secrets.token_hex(32),\n  SESSION_COOKIE_HTTPONLY=True,\n  SESSION_COOKIE_SECURE=True,\n  SESSION_COOKIE_SAMESITE='Strict',\n  PERMANENT_SESSION_LIFETIME=\n      timedelta(hours=1)\n)\n\n# Use flask-login:\nfrom flask_login import LoginManager\nlogin_manager = LoginManager(app)\n\n# Regenerate session on login:\nsession.clear()\nsession['user_id'] = user.id\nsession.modified = True`}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="explain-section">
        <div className="explain-header"><span>Authentication Hardening Summary</span><span className="line"></span></div>
        <div className="diff-grid">
          <div className="diff-box vuln">
            <div className="diff-box-title">⚠ Common Failures</div>
            <p>Plaintext passwords, no lockout after failures, predictable session tokens, no MFA support, default credentials left active, JWT with alg:none accepted.</p>
          </div>
          <div className="diff-box sec">
            <div className="diff-box-title">✓ Secure Implementation</div>
            <p>werkzeug / bcrypt hashing (cost ≥ 12), Flask-Limiter for rate limiting, secrets.token_hex() for session IDs, HttpOnly + Secure + SameSite cookies, TOTP-based MFA via pyotp.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
