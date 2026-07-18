import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Terminal from '../shared/Terminal.jsx';
import QueryViewer from '../shared/QueryViewer.jsx';

const CHIPS = ["admin'--", "' OR 1=1--", "' OR '1'='1", "'; DROP TABLE users;--", 'admin@lab.com', "' UNION SELECT 1,username,password,4 FROM users--"];

export default function SqliPanel({ active }) {
  const { mode, markSolved } = useApp();
  const [user, setUser] = useState("admin'--");
  const [pass, setPass] = useState('anything');
  const [query, setQuery] = useState({ text: 'Query will render here...', cls: '' });
  const [db, setDb] = useState({ text: '—', cls: '' });
  const [result, setResult] = useState({ text: 'Waiting for input...', cls: 'neutral' });

  function runSQLi() {
    const isInject = /['";]|--|OR\s+\d|OR\s+'/i.test(user) || /union\s+select/i.test(user);
    if (mode === 'vulnerable') {
      const q = `SELECT * FROM users\nWHERE email='${user}'\nAND password='${pass}'`;
      setQuery({ text: q, cls: 'danger' });
      if (isInject) {
        const shortUser = user.split("'")[0] || 'admin';
        setDb({ text: `[ROW] id=1 | email=${shortUser}@lab.com | role=admin | pw=1234\n(all columns returned — auth bypassed)`, cls: 'danger' });
        const token = 'eyJ' + btoa(JSON.stringify({ user: shortUser, role: 'admin', iat: Math.floor(Date.now() / 1000) })).replace(/=/g, '') + '.' + btoa('signature').replace(/=/g, '');
        setResult({
          text: `[200 OK] Login success — ${shortUser}@lab.com\nRole:    ADMIN\nToken:   ${token}\n\n⚠ ATTACK SUCCEEDED\nThe injected quote broke out of the SQL\nstring literal and altered query logic.\nPassword check was commented out.`,
          cls: 'vuln',
        });
        markSolved('sqli');
      } else {
        setDb({ text: 'Empty result set (0 rows)', cls: '' });
        setResult({ text: `[401] Login failed.\nTip: try  admin'--  or  ' OR 1=1--`, cls: 'neutral' });
      }
    } else {
      const q = `SELECT * FROM users\nWHERE email = ?\nAND password_hash = ?\n→ params: ["${user}", "[hashed]"]`;
      setQuery({ text: q, cls: 'safe' });
      setDb({ text: 'Query executed safely. 0 rows returned.', cls: 'safe' });
      setResult({ text: `[401] Invalid credentials.\n\nAttack blocked.\nParameterized query — input is data,\nnot SQL syntax. No injection possible.\n\nFlask/SQLAlchemy used correctly.`, cls: 'sec' });
    }
  }

  return (
    <section className={`panel${active ? ' active' : ''}`}>
      <div className="panel-head">
        <div className="panel-head-left">
          <div className="panel-title">
            SQL Injection
            <span className="sev-badge critical">Critical</span>
            <span className="owasp-ref">A03:2021</span>
          </div>
          <div className="panel-desc">Unsanitized user input is concatenated directly into SQL queries, allowing attackers to manipulate database logic, bypass authentication, and exfiltrate data.</div>
        </div>
      </div>

      <div className="payload-label">Quick payloads</div>
      <div className="payload-chips">
        {CHIPS.map(c => (
          <span key={c} className="chip" onClick={() => setUser(c)}>{c}</span>
        ))}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>Login Form</div>
          <div className="field-group">
            <label className="field-label">Username / Email</label>
            <input className="field-input" type="text" value={user} onChange={e => setUser(e.target.value)} placeholder="Enter email..." />
          </div>
          <div className="field-group">
            <label className="field-label">Password</label>
            <input className="field-input" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Enter password..." />
          </div>
          <button className="btn btn-attack mt-10" onClick={runSQLi}>⚡ Execute Attack</button>
          <Terminal className="mt-10" title="auth_response.log" text={result.text} cls={result.cls} />
        </div>
        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>Query Inspector</div>
          <div className="field-label">Constructed SQL query</div>
          <QueryViewer text={query.text} cls={query.cls} />
          <div className="field-label mt-10">Flask route (simplified)</div>
          <div className="code-block">
            <span className="cmt"># route: POST /auth/login</span>{'\n'}
            <span className="kw">@app</span>.route(<span className="str">'/login'</span>, methods=[<span className="str">'POST'</span>]){'\n'}
            <span className="kw">def</span> login():{'\n'}
            {'    '}email = request.form[<span className="str">'email'</span>]{'\n'}
            {'    '}pw    = request.form[<span className="str">'password'</span>]{'\n'}
            {'    '}<span className="cmt"># ❌ VULNERABLE — direct concat</span>{'\n'}
            {'    '}q = <span className="bad">{`f"SELECT * FROM users WHERE\n    email='{email}' AND pw='{pw}'"`}</span>{'\n'}
            {'    '}cur.execute(q)
          </div>
          <div className="field-label mt-10">Database response</div>
          <QueryViewer text={db.text} cls={db.cls} />
        </div>
      </div>

      <div className="explain-section">
        <div className="explain-header">
          <span>How It Works &amp; How To Fix It</span>
          <span className="line"></span>
        </div>
        <div className="diff-grid">
          <div className="diff-box vuln">
            <div className="diff-box-title">⚠ Vulnerable — String Concatenation</div>
            <p>Input is pasted directly into the SQL string. A single quote <code>'</code> breaks out of the string context and changes query logic. With <code>admin'--</code> the password check is commented out entirely.</p>
            <div className="code-block">
              <span className="bad">{`query = "SELECT * FROM users\n WHERE email='" + email + "'\n AND password='" + pw + "'"`}</span>{'\n\n'}
              <span className="cmt">{`# Input: admin'--\n# Result: WHERE email='admin'--' AND pw=...\n# The -- comments out the password check`}</span>
            </div>
          </div>
          <div className="diff-box sec">
            <div className="diff-box-title">✓ Secure — Parameterized Queries</div>
            <p>Input is bound as a typed parameter via SQLAlchemy/sqlite3. The DB engine handles escaping — no user data can alter query structure. Also use ORM models.</p>
            <div className="code-block">
              <span className="good">{`# Flask + SQLAlchemy (secure)\nuser = User.query.filter_by(\n    email=email).first()\n\n# Or raw with parameters:\ncur.execute(\n  "SELECT * FROM users\n   WHERE email=? AND pw=?",\n  (email, hashed_pw))`}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
