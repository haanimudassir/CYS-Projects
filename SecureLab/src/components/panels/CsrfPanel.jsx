import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Terminal from '../shared/Terminal.jsx';
import { nowPK } from '../../utils/helpers.js';

export default function CsrfPanel({ active }) {
  const {
    mode, markSolved, notify,
    csrfToken, setCsrfToken, csrfBalance, setCsrfBalance,
    csrfSession, setCsrfSession, csrfUsedTokens, setCsrfUsedTokens,
    genCsrfToken, genCsrfSession,
  } = useApp();

  const [victimEmail, setVictimEmail] = useState('');
  const [victimAccount, setVictimAccount] = useState('');
  const [initBalanceInput, setInitBalanceInput] = useState('');

  const [amount, setAmount] = useState('10000');
  const [to, setTo] = useState('attacker_account_XK99');
  const [legitAmount, setLegitAmount] = useState('500');
  const [legitTo, setLegitTo] = useState('friend_account_AB12');

  const [csrfResult, setCsrfResult] = useState({ text: '—', cls: 'neutral' });
  const [csrfLegitResult, setCsrfLegitResult] = useState({ text: '—', cls: 'neutral' });

  function applySetup() {
    const bal = parseInt(initBalanceInput || '0');
    if (!victimEmail.trim()) { notify('⚠ Enter your email to set up the scenario.', 'vuln'); return; }
    if (!bal || bal <= 0) { notify('⚠ Enter a valid account balance.', 'vuln'); return; }
    setCsrfBalance(bal);
    setCsrfSession(genCsrfSession());
    setCsrfToken(genCsrfToken());
    setCsrfUsedTokens(new Set());
    notify('✓ Scenario configured — run the attack now.', 'sec');
  }

  function resetBalance() {
    const bal = parseInt(initBalanceInput || '0');
    setCsrfBalance(bal > 0 ? bal : 0);
    setCsrfUsedTokens(new Set());
    setCsrfToken(genCsrfToken());
    notify('↺ Balance reset.', 'sec');
  }

  function regenerateToken() {
    setCsrfToken(genCsrfToken());
    setCsrfUsedTokens(new Set());
    notify('↻ New CSRF token generated', 'sec');
  }

  function runCSRF() {
    const amt = parseInt(amount || '10000');
    const dest = (to || 'attacker_account').trim();
    if (!amt || amt <= 0) { notify('⚠ Enter a valid transfer amount.', 'vuln'); return; }
    if (csrfBalance <= 0) { notify('⚠ Set up your scenario first — enter email, balance, and click Apply Setup.', 'vuln'); return; }

    const ts = nowPK();

    if (mode === 'vulnerable') {
      if (amt > csrfBalance) {
        setCsrfResult({ text: `[400] Transfer failed — insufficient funds.\nBalance: PKR ${csrfBalance.toLocaleString()}\nRequested: PKR ${amt.toLocaleString()}`, cls: 'neutral' });
        return;
      }
      const newBalance = csrfBalance - amt;
      setCsrfBalance(newBalance);
      setCsrfResult({
        text: `[200 OK] Transfer processed!\n\nPOST /transfer HTTP/1.1\nHost: bank.com\nCookie: ${csrfSession}  ← sent automatically\n\nPayload:\n  to:     ${dest}\n  amount: PKR ${amt.toLocaleString()}\n  csrf_token: (none)\n\nResult:\n  Transferred: PKR ${amt.toLocaleString()}\n  From: ${victimEmail.trim() || 'victim@bank.com'}\n  To:   ${dest}\n  New balance: PKR ${newBalance.toLocaleString()}\n  Time: ${ts}\n\n⚠ ATTACK SUCCEEDED\nNo CSRF token required. Server trusted\nthe session cookie alone. Forged request\nfrom attacker domain was accepted.`,
        cls: 'vuln',
      });
      markSolved('csrf');
    } else {
      setCsrfResult({
        text: `[403] Forbidden — CSRF validation failed.\n\nPOST /transfer HTTP/1.1\nHost: bank.com\nCookie: ${csrfSession}\n\nPayload:\n  to:     ${dest}\n  amount: PKR ${amt.toLocaleString()}\n  csrf_token: (missing)\n\nFlask-WTF CSRFProtect raised:\n  WTForms CSRFError: CSRF token missing\n  HTTP 403 returned\n\nBalance unchanged: PKR ${csrfBalance.toLocaleString()}\n\nDefenses active:\n  ✓ CSRF token required and missing\n  ✓ Cookie SameSite=Strict\n  ✓ Origin header validated\n\nAttacker's page cannot read the token\n(Same-Origin Policy) — attack blocked.`,
        cls: 'sec',
      });
    }
  }

  function runCSRFLegit() {
    const amt = parseInt(legitAmount || '500');
    const dest = (legitTo || 'friend_account').trim();
    const ts = nowPK();
    if (!amt || amt <= 0) { notify('⚠ Enter a valid transfer amount.', 'vuln'); return; }

    if (mode === 'secure') {
      if (!csrfToken) {
        setCsrfLegitResult({ text: `[400] No CSRF token found in session.\nRegenerate token and try again.`, cls: 'neutral' });
        return;
      }
      if (csrfUsedTokens.has(csrfToken)) {
        setCsrfLegitResult({ text: `[403] CSRF token already used.\n\nThis token was consumed in a previous\nrequest — cannot be reused.\nClick ↻ Regenerate to get a new token.\n\n✓ Replay attack prevented.`, cls: 'sec' });
        return;
      }
      if (amt > csrfBalance) {
        setCsrfLegitResult({ text: `[400] Insufficient funds.\nBalance: PKR ${csrfBalance.toLocaleString()}\nRequested: PKR ${amt.toLocaleString()}`, cls: 'neutral' });
        return;
      }
      setCsrfUsedTokens(new Set(csrfUsedTokens).add(csrfToken));
      const newBalance = csrfBalance - amt;
      setCsrfBalance(newBalance);
      setCsrfLegitResult({
        text: `[200 OK] Transfer completed.\n\nPOST /transfer HTTP/1.1\nHost: bank.com\nCookie: ${csrfSession}\n\nPayload:\n  to:          ${dest}\n  amount:      PKR ${amt.toLocaleString()}\n  csrf_token:  ${csrfToken}\n\nFlask-WTF validation:\n  ✓ Token present\n  ✓ Token matches session\n  ✓ Token not expired\n  ✓ Token consumed (single-use)\n\nResult:\n  Transferred: PKR ${amt.toLocaleString()}\n  To: ${dest}\n  New balance: PKR ${newBalance.toLocaleString()}\n  Time: ${ts}\n\n✓ Legitimate request accepted safely.`,
        cls: 'sec',
      });
    } else {
      const fakeToken = 'csrf_' + Math.random().toString(36).slice(2, 12);
      if (amt > csrfBalance) {
        setCsrfLegitResult({ text: `[400] Insufficient funds.\nBalance: PKR ${csrfBalance.toLocaleString()}`, cls: 'neutral' });
        return;
      }
      const newBalance = csrfBalance - amt;
      setCsrfBalance(newBalance);
      setCsrfLegitResult({
        text: `[200 OK] Transfer completed.\n\nPayload:\n  to:         ${dest}\n  amount:     PKR ${amt.toLocaleString()}\n  csrf_token: ${fakeToken}  ← generated\n\n(Token was generated but never\nvalidated server-side in vulnerable\nmode — it is completely ignored.)\n\nBalance: PKR ${newBalance.toLocaleString()}\nNote: In vulnerable mode, even a forged\nrequest would have succeeded equally.`,
        cls: 'neutral',
      });
    }
  }

  const tokenDisplay = mode === 'secure' ? csrfToken : '(disabled in vulnerable mode)';
  const tokenInForm = mode === 'secure' ? csrfToken : 'NO_TOKEN';

  return (
    <section className={`panel${active ? ' active' : ''}`}>
      <div className="panel-head">
        <div className="panel-head-left">
          <div className="panel-title">
            Cross-Site Request Forgery
            <span className="sev-badge high">High</span>
            <span className="owasp-ref">A01:2021</span>
          </div>
          <div className="panel-desc">Malicious sites trick authenticated users into submitting requests using their active session — triggering state-changing actions without user consent.</div>
        </div>
      </div>

      {/* CSRF Setup */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title"><span className="card-title-icon"></span>Setup Your Scenario</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">Your Email (Victim)</label>
            <input className="field-input" type="email" placeholder="e.g. john@mybank.com" value={victimEmail} onChange={e => setVictimEmail(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Your Account Balance</label>
            <input className="field-input" type="number" placeholder="e.g. 75000" min="1" value={initBalanceInput} onChange={e => setInitBalanceInput(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Your Account ID</label>
            <input className="field-input" type="text" placeholder="e.g. ACC-004821" value={victimAccount} onChange={e => setVictimAccount(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-normal" style={{ width: 'auto', padding: '7px 18px', fontSize: 11 }} onClick={applySetup}>Apply Setup</button>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-dim)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius)', padding: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>Active Session — User</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{victimEmail.trim() || 'Not set — fill in Setup above'}</div>
          </div>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius)', padding: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>Current Balance</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-green)' }}>{csrfBalance > 0 ? 'PKR ' + csrfBalance.toLocaleString() : 'Not set — fill in Setup above'}</div>
          </div>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius)', padding: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>Session Cookie (auto)</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>{csrfSession || '—'}</div>
          </div>
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>CSRF Token (secure mode):</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-cyan)' }}>{tokenDisplay}</div>
          <button className="btn btn-normal" style={{ padding: '3px 10px', fontSize: 10, width: 'auto' }} onClick={regenerateToken}>↻ New Token</button>
          <button className="btn" style={{ padding: '3px 10px', fontSize: 10, width: 'auto', borderColor: 'var(--border-dim)' }} onClick={resetBalance}>↺ Reset Balance</button>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>Forged Request (from attacker's domain)</div>
          <div style={{ marginBottom: 10 }}>
            <label className="field-label">Transfer Amount (PKR)</label>
            <input className="field-input" type="number" value={amount} min="1" max="50000" onChange={e => setAmount(e.target.value)} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="field-label">Destination Account</label>
            <input className="field-input" type="text" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="code-block" style={{ marginBottom: 12, fontSize: 10 }}>
            <span className="cmt">{'<!-- attacker.com — auto-submitting form -->'}</span>{'\n'}
            <span className="bad">
              {`<form action="https://bank.com/transfer" method="POST">\n  <input name="to" value="${to}">\n  <input name="amount" value="${amount}">\n  `}
              <span className="cmt">{'<!-- No csrf_token field! -->'}</span>{'\n'}
              {`</form>\n<script>document.forms[0].submit()</script>`}
            </span>
          </div>
          <button className="btn btn-attack btn-full" onClick={runCSRF}>⚡ Send Forged Request</button>
          <Terminal className="mt-10" title="csrf_attack.log" text={csrfResult.text} cls={csrfResult.cls} />
        </div>

        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>Legitimate Transfer + CSRF Token</div>
          <div style={{ marginBottom: 10 }}>
            <label className="field-label">Transfer Amount (PKR)</label>
            <input className="field-input" type="number" value={legitAmount} min="1" onChange={e => setLegitAmount(e.target.value)} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="field-label">Destination Account</label>
            <input className="field-input" type="text" value={legitTo} onChange={e => setLegitTo(e.target.value)} />
          </div>
          <div className="code-block" style={{ marginBottom: 12, fontSize: 10 }}>
            <span className="cmt">{'{# Jinja2 — secure form with token #}'}</span>{'\n'}
            <span className="good">
              {`<form method="POST">\n  {{ form.hidden_tag() }}\n  <input name="to" value="${legitTo}">\n  <input name="amount" value="${legitAmount}">\n  <input type="hidden" name="csrf_token"\n    value="`}
              <span>{tokenInForm}</span>
              {`"></form>`}
            </span>
          </div>
          <button className="btn btn-normal btn-full" onClick={runCSRFLegit}>Submit Legitimate Transfer</button>
          <Terminal className="mt-10" title="csrf_legit.log" text={csrfLegitResult.text} cls={csrfLegitResult.cls} />
        </div>
      </div>

      <div className="explain-section">
        <div className="explain-header"><span>CSRF Protection — Flask-WTF</span><span className="line"></span></div>
        <div className="diff-grid">
          <div className="diff-box vuln">
            <div className="diff-box-title">⚠ Why CSRF Works Without Protection</div>
            <p>Browsers automatically attach session cookies to every request — even those triggered from a different domain. The server sees a valid cookie and cannot tell if the request was intentional.</p>
            <div className="code-block">
              <span className="cmt"># ❌ No CSRF check — any POST accepted</span>{'\n'}
              <span className="bad">{`@app.route('/transfer', methods=['POST'])\n@login_required\ndef transfer():\n    to  = request.form['to']\n    amt = request.form['amount']\n    do_transfer(current_user, to, amt)\n    return "OK"  # attacker wins`}</span>
            </div>
          </div>
          <div className="diff-box sec">
            <div className="diff-box-title">✓ Flask-WTF Token Validation</div>
            <div className="code-block">
              <span className="good">{`pip install Flask-WTF\n\nfrom flask_wtf.csrf import CSRFProtect\ncsrf = CSRFProtect(app)\napp.config['WTF_CSRF_ENABLED'] = True\n\n@app.route('/transfer', methods=['POST'])\n@login_required\ndef transfer():\n    # csrf token auto-validated\n    # attacker's form has no token\n    # → 400 Bad Request automatically\n    to  = request.form['to']\n    amt = request.form['amount']\n    do_transfer(current_user, to, amt)`}</span>{'\n'}
              <span className="cmt">{`# Cookie: SameSite=Strict also prevents\n# cross-origin cookie transmission`}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
