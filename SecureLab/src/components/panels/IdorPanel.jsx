import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Terminal from '../shared/Terminal.jsx';
import { fakeUsers, fakeOrders } from '../../data/constants.js';

export default function IdorPanel({ active }) {
  const { mode, markSolved } = useApp();
  const [uid, setUid] = useState('1');
  const [oid, setOid] = useState('100');
  const [userResult, setUserResult] = useState({ text: '—', cls: 'neutral' });
  const [orderResult, setOrderResult] = useState({ text: '—', cls: 'neutral' });

  function runUser() {
    const id = parseInt(uid);
    const u = fakeUsers[id];
    if (!u) { setUserResult({ text: `[404] User ${id} not found.`, cls: 'neutral' }); return; }
    if (mode === 'vulnerable') {
      const body = JSON.stringify({ id, ...u }, null, 2);
      setUserResult({
        text: body + (id !== 5 ? `\n\n⚠ IDOR! Accessed user #${id}'s private data.\nDOB, card, phone and role exposed without\nownership check on the Flask route.` : ''),
        cls: id !== 5 ? 'vuln' : 'neutral',
      });
      if (id !== 5) markSolved('idor');
    } else {
      if (id !== 5) {
        setUserResult({ text: `[404] Not Found\n\nOwnership check failed.\nuid requested: ${id}\nuid in session: 5\n\nReturning 404 (not 403) to prevent\nresource enumeration by attackers.`, cls: 'sec' });
      } else {
        setUserResult({ text: `[200 OK] Your profile:\n\n${JSON.stringify(fakeUsers[5], null, 2)}`, cls: 'sec' });
      }
    }
  }

  function runOrder() {
    const id = parseInt(oid);
    const o = fakeOrders[id];
    if (!o) { setOrderResult({ text: `[404] Order #${id} not found.`, cls: 'neutral' }); return; }
    if (mode === 'vulnerable') {
      setOrderResult({
        text: `[200 OK] GET /api/order/${id}\n\n${JSON.stringify(o, null, 2)}` + (o.user !== 5 ? `\n\n⚠ IDOR! This order belongs to user #${o.user}\nFinancial data exposed without auth check.` : ''),
        cls: o.user !== 5 ? 'vuln' : 'neutral',
      });
      if (o.user !== 5) markSolved('idor');
    } else {
      if (o.user !== 5) {
        setOrderResult({ text: `[404] Not Found\n\nOrder #${id} does not belong to you.\nOwnership verified server-side.\nAttempt logged.`, cls: 'sec' });
      } else {
        setOrderResult({ text: `[200 OK] Your order:\n\n${JSON.stringify(o, null, 2)}`, cls: 'sec' });
      }
    }
  }

  return (
    <section className={`panel${active ? ' active' : ''}`}>
      <div className="panel-head">
        <div className="panel-head-left">
          <div className="panel-title">
            Insecure Direct Object Reference
            <span className="sev-badge medium">Medium</span>
            <span className="owasp-ref">A01:2021</span>
          </div>
          <div className="panel-desc">Attackers manipulate object IDs in URLs or request bodies to access records belonging to other users — profiles, orders, documents, or any database objects.</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>User Profile Endpoint</div>
          <div className="info-row">You are logged in as: <strong>user_id = 5</strong></div>
          <div className="payload-chips">
            {['1', '2', '3', '5'].map(v => <span key={v} className="chip" onClick={() => setUid(v)}>{v}</span>)}
          </div>
          <div className="field-group">
            <label className="field-label">GET /api/user/</label>
            <input className="field-input" value={uid} onChange={e => setUid(e.target.value)} type="number" />
          </div>
          <button className="btn btn-attack mt-10" onClick={runUser}>⚡ Fetch User</button>
          <Terminal className="mt-10" title="idor_user.log" text={userResult.text} cls={userResult.cls} />
        </div>
        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>Order Endpoint</div>
          <div className="info-row">Your orders: <strong>#501, #502, #503</strong></div>
          <div className="payload-chips">
            {['100', '200', '501', '999'].map(v => <span key={v} className="chip" onClick={() => setOid(v)}>{v}</span>)}
          </div>
          <div className="field-group">
            <label className="field-label">GET /api/order/</label>
            <input className="field-input" value={oid} onChange={e => setOid(e.target.value)} type="number" />
          </div>
          <button className="btn btn-attack mt-10" onClick={runOrder}>⚡ Fetch Order</button>
          <Terminal className="mt-10" title="idor_order.log" text={orderResult.text} cls={orderResult.cls} />
        </div>
      </div>

      <div className="explain-section">
        <div className="explain-header"><span>IDOR Fix — Flask Ownership Check</span><span className="line"></span></div>
        <div className="diff-grid">
          <div className="diff-box vuln">
            <div className="diff-box-title">⚠ No Ownership Verification</div>
            <div className="code-block">
              <span className="bad">{`@app.route('/api/user/<int:uid>')\n@login_required\ndef get_user(uid):\n    # uses URL param directly — no check!\n    user = User.query.get(uid)\n    return jsonify(user.to_dict())`}</span>
            </div>
          </div>
          <div className="diff-box sec">
            <div className="diff-box-title">✓ Always Check Ownership</div>
            <div className="code-block">
              <span className="good">{`@app.route('/api/user/<int:uid>')\n@login_required\ndef get_user(uid):\n    # Only allow own profile or admin\n    if (uid != current_user.id and\n        current_user.role != 'admin'):\n        abort(404)  # 404 not 403!\n    user = User.query.get_or_404(uid)\n    return jsonify(user.to_dict())`}</span>{'\n'}
              <span className="cmt">{`# Return 404 to prevent enumeration:\n# attacker can't tell if ID exists`}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
