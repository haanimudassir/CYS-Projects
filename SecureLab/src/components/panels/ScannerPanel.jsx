import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { SCAN_CHECKS } from '../../data/constants.js';
import { callGroqScan, parseScanResponse, friendlyErrorMessage } from '../../utils/groqScanner.js';
import { buildReportHTML, safeBlobDownload } from '../../utils/reportGenerator.js';

const PROGRESS_MSGS = [
  'Initializing AI security engine…',
  'Mapping attack surface…',
  'Checking injection vectors…',
  'Analysing authentication flows…',
  'Evaluating access controls…',
  'Scanning cryptographic implementations…',
  'Checking for misconfigurations…',
  'Assessing vulnerable components…',
  'Generating remediation guidance…',
  'Finalising security report…',
];

const LANG_GROUPS = [
  { label: 'Most Used', options: [
    ['python', 'Python (Flask / Django)'], ['javascript', 'JavaScript / Node.js'], ['typescript', 'TypeScript'],
    ['java', 'Java (Spring)'], ['csharp', 'C# (ASP.NET)'], ['php', 'PHP'], ['c', 'C'], ['cpp', 'C++'], ['go', 'Go'], ['rust', 'Rust'],
  ]},
  { label: 'Web & Scripting', options: [
    ['html', 'HTML / Template'], ['ruby', 'Ruby on Rails'], ['swift', 'Swift'], ['kotlin', 'Kotlin (Android)'],
    ['dart', 'Dart / Flutter'], ['r', 'R'], ['perl', 'Perl'], ['lua', 'Lua'],
  ]},
  { label: 'Database & Query', options: [
    ['sql', 'SQL (Raw Queries)'], ['graphql', 'GraphQL Schema'], ['bash', 'Bash / Shell Script'], ['powershell', 'PowerShell'],
  ]},
  { label: 'Config & Infrastructure', options: [
    ['yaml', 'YAML (Config / CI-CD)'], ['dockerfile', 'Dockerfile'], ['terraform', 'Terraform (IaC)'], ['nginx', 'Nginx Config'],
  ]},
];

export default function ScannerPanel({ active }) {
  const { notify } = useApp();

  // API key
  const [apiKey, setApiKey] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);
  const keyStatus = apiKey.length === 0 ? { text: '⬤ Not set', color: 'var(--text-dim)' }
    : (apiKey.startsWith('gsk_') && apiKey.length > 20) ? { text: '✓ Ready', color: 'var(--accent-green)' }
    : { text: '⚠ Must start with gsk_', color: 'var(--accent-amber)' };

  useEffect(() => {
    const saved = sessionStorage.getItem('slGroqKey');
    if (saved) setApiKey(saved);
  }, []);
  useEffect(() => {
    if (apiKey.startsWith('gsk_') && apiKey.length > 20) {
      sessionStorage.setItem('slGroqKey', apiKey);
    }
  }, [apiKey]);

  // Scan input mode
  const [scanMode, setScanMode] = useState('url');
  const [scanUrl, setScanUrl] = useState('');
  const [scanAppType, setScanAppType] = useState('');
  const [scanUrlContext, setScanUrlContext] = useState('');
  const [scanLang, setScanLang] = useState('python');
  const [scanCode, setScanCode] = useState('');
  const [scanHttp, setScanHttp] = useState('');
  const [scanHttpNotes, setScanHttpNotes] = useState('');

  // Scan progress
  const [scanning, setScanning] = useState(false);
  const [checklistState, setChecklistState] = useState('idle'); // 'idle' | 'running' | number | 'done'
  const [progressPct, setProgressPct] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const checkIntervalRef = useRef(null);
  const progIntervalRef = useRef(null);

  // Results
  const [scanResult, setScanResult] = useState(null); // { result, input }
  const [openFindings, setOpenFindings] = useState(() => new Set());
  const [scanHistory, setScanHistory] = useState([]);
  const apiKeyInputRef = useRef(null);
  const resultsRef = useRef(null);

  function getScanInput() {
    if (scanMode === 'url') {
      if (!scanUrl.trim()) return null;
      return { type: 'url', url: scanUrl.trim(), appType: scanAppType, ctx: scanUrlContext };
    } else if (scanMode === 'code') {
      if (!scanCode.trim()) return null;
      return { type: 'code', code: scanCode.trim(), lang: scanLang };
    } else {
      if (!scanHttp.trim()) return null;
      return { type: 'http', http: scanHttp.trim(), notes: scanHttpNotes };
    }
  }

  async function runAIScan() {
    const input = getScanInput();
    if (!input) {
      notify('⚠ Enter a target URL, code snippet, or HTTP request first.', 'vuln');
      return;
    }
    if (!apiKey || !apiKey.startsWith('gsk_') || apiKey.length < 20) {
      notify('⚠ Enter a valid Groq API key (gsk_…) — get one FREE at console.groq.com', 'vuln');
      apiKeyInputRef.current?.focus();
      return;
    }

    setScanning(true);
    setScanResult(null);
    setShowProgress(true);
    setChecklistState('running');

    let checkIdx = 0;
    checkIntervalRef.current = setInterval(() => {
      checkIdx++;
      if (checkIdx < SCAN_CHECKS.length) setChecklistState(checkIdx);
      else { clearInterval(checkIntervalRef.current); setChecklistState('done'); }
    }, 650);

    let pct = 0, msgIdx = 0;
    setStatusText(PROGRESS_MSGS[0]);
    progIntervalRef.current = setInterval(() => {
      pct = Math.min(pct + Math.random() * 6 + 2, 90);
      setProgressPct(pct);
      const want = Math.floor(pct / 10);
      if (want > msgIdx && msgIdx < PROGRESS_MSGS.length - 1) {
        msgIdx = Math.min(want, PROGRESS_MSGS.length - 1);
        setStatusText(PROGRESS_MSGS[msgIdx]);
      }
    }, 400);

    let rawText = '';
    try {
      const { response, lastErrMsg } = await callGroqScan(input, apiKey);

      clearInterval(checkIntervalRef.current);
      clearInterval(progIntervalRef.current);
      setChecklistState('done');
      setProgressPct(100);
      setStatusText('Processing results…');

      if (!response.ok) {
        throw new Error(friendlyErrorMessage(lastErrMsg));
      }

      const data = await response.json();
      rawText = (data.choices?.[0]?.message?.content || '').trim();
      if (!rawText) throw new Error('AI returned an empty response — please try again.');

      const result = parseScanResponse(rawText);
      if (!Array.isArray(result.findings)) result.findings = [];

      setStatusText(`Scan complete — ${result.findings.length} findings`);
      setScanResult({ result, input });
      setOpenFindings(() => {
        const firstBig = result.findings.findIndex(f => f.severity === 'critical' || f.severity === 'high');
        return firstBig >= 0 ? new Set([firstBig]) : new Set();
      });

      const label = input.type === 'url' ? input.url : input.type === 'code' ? `[${input.lang} snippet]` : '[HTTP request]';
      setScanHistory(prev => [{ label, time: new Date().toLocaleTimeString(), findings: result.findings, result, input }, ...prev]);
      notify(`✓ Scan complete — ${result.findings.length} finding${result.findings.length !== 1 ? 's' : ''} identified`, 'sec');

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      clearInterval(checkIntervalRef.current);
      clearInterval(progIntervalRef.current);
      setProgressPct(0);
      setStatusText('Scan failed — see notification');
      setChecklistState('idle');
      const msg = (err.message || String(err)).slice(0, 180);
      notify('❌ ' + msg, 'vuln');
      console.error('[SecureLab Scanner Error]', err, '\nRaw AI response:', rawText);
    } finally {
      setScanning(false);
      setTimeout(() => setShowProgress(false), 3000);
    }
  }

  function toggleFinding(i) {
    setOpenFindings(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function reloadScanResult(i) {
    const h = scanHistory[i];
    if (!h) return;
    setScanResult({ result: h.result, input: h.input });
    setOpenFindings(() => {
      const firstBig = (h.result.findings || []).findIndex(f => f.severity === 'critical' || f.severity === 'high');
      return firstBig >= 0 ? new Set([firstBig]) : new Set();
    });
    notify('📋 Loaded previous scan result', 'sec');
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  function generateReport() {
    if (!scanResult || !scanResult.result.findings || scanResult.result.findings.length === 0) {
      notify('⚠ No scan results to export yet.', 'vuln');
      return;
    }
    const { result, input } = scanResult;
    const target = input.url || 'Unknown Target';
    const html = buildReportHTML(result, input);
    const safeTarget = target.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
    const ok = safeBlobDownload(html, `SecureLab_Report_${safeTarget}_${Date.now()}.html`);
    if (ok) notify('📄 Report downloaded — open the file in your browser', 'sec');
    else notify('Enable popups to view the report, or try a different browser.', 'vuln');
  }

  const findings = scanResult?.result?.findings || [];
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });

  const targetLabel = scanResult
    ? '— ' + (scanResult.input.type === 'url' ? scanResult.input.url : scanResult.input.type === 'code' ? `${scanResult.input.lang} source code` : 'HTTP request')
    : '';

  function checklistItemClass(i) {
    if (checklistState === 'running' && i === 0) return 'checker-item checking';
    if (typeof checklistState === 'number' && i < checklistState) return 'checker-item done';
    if (typeof checklistState === 'number' && i === checklistState) return 'checker-item checking';
    if (checklistState === 'done') return 'checker-item done';
    return 'checker-item';
  }
  function checklistItemSym(i) {
    if (checklistState === 'running' && i === 0) return '◉';
    if (typeof checklistState === 'number' && i < checklistState) return '✓';
    if (typeof checklistState === 'number' && i === checklistState) return '◉';
    if (checklistState === 'done') return '✓';
    return '○';
  }

  return (
    <section className={`panel${active ? ' active' : ''}`}>
      <div className="panel-head">
        <div className="panel-head-left">
          <div className="panel-title">
            AI Vulnerability Scanner
            <span className="ai-badge"><span className="ai-dot"></span>POWERED BY GPT-OSS 120B - GROQ LPU</span>
            <span className="owasp-ref">OWASP Top 10</span>
          </div>
          <div className="panel-desc">Paste a URL, code snippet, or HTTP request —  Analysis runs via GPT-OSS 120B (Groq) for OWASP vulnerabilities and provide step-by-step remediation guidance.</div>
        </div>
      </div>

      <div className="disclaimer-box" style={{ background: 'rgba(0,212,255,0.06)', borderColor: 'rgba(0,212,255,0.2)', color: 'var(--accent-cyan)' }}>
        <span className="disc-icon">🎓</span>
        <span><strong>Educational Mode:</strong> Designed for security training on intentionally vulnerable lab environments such as OWASP Juice Shop, DVWA, WebGoat, and HackTheBox. This tool performs passive AI-based analysis — it does not send any requests to target systems.</span>
      </div>

      {/* API Key Row */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--accent-cyan) 55%, transparent)', marginBottom: 3 }}>Groq API Key</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'color-mix(in srgb, var(--text-dim) 75%, var(--text-secondary))' }}>Groq API key active &middot; Stored for this browser tab only &middot; cleared on close &middot; get yours at console.groq.com</div>
          </div>
          <div style={{ flex: 1, minWidth: 260, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={apiKeyInputRef}
              className="field-input"
              type={keyVisible ? 'text' : 'password'}
              placeholder="gsk_... (Groq API key — free)"
              style={{ flex: 1, margin: 0 }}
              value={apiKey}
              onChange={e => setApiKey(e.target.value.trim())}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: keyStatus.color, flexShrink: 0, whiteSpace: 'nowrap' }}>{keyStatus.text}</div>
          </div>
          <button
            onClick={() => setKeyVisible(v => !v)}
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
            title="Show/hide key"
          >👁</button>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 0 }}>
        {/* Left: Input */}
        <div>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title"><span className="card-title-icon"></span>Scan Input</div>

            <div className="scanner-mode-tabs">
              <button className={`scan-mode-btn${scanMode === 'url' ? ' active' : ''}`} onClick={() => setScanMode('url')}>🌐 URL / Domain</button>
              <button className={`scan-mode-btn${scanMode === 'code' ? ' active' : ''}`} onClick={() => setScanMode('code')}>📄 Source Code</button>
              <button className={`scan-mode-btn${scanMode === 'http' ? ' active' : ''}`} onClick={() => setScanMode('http')}>📡 HTTP Request</button>
            </div>

            {scanMode === 'url' && (
              <div className="scan-input-pane active">
                <div className="field-group">
                  <label className="field-label">Target URL or Domain</label>
                  <input className="field-input" placeholder="https://example.com  or  example.com" value={scanUrl} onChange={e => setScanUrl(e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">App Type (optional)</label>
                  <select className="field-input" style={{ cursor: 'pointer' }} value={scanAppType} onChange={e => setScanAppType(e.target.value)}>
                    <option value="">Auto-detect</option>
                    <option value="ecommerce">E-Commerce</option>
                    <option value="banking">Banking / Finance</option>
                    <option value="cms">CMS (WordPress / Drupal)</option>
                    <option value="api">REST / GraphQL API</option>
                    <option value="spa">Single Page App (React/Vue)</option>
                    <option value="corporate">Corporate Website</option>
                    <option value="login">Login / Auth Portal</option>
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Additional Context (optional)</label>
                  <textarea className="field-textarea" placeholder="e.g. The site uses PHP + MySQL, has a login page, handles payment cards..." style={{ minHeight: 60 }} value={scanUrlContext} onChange={e => setScanUrlContext(e.target.value)} />
                </div>
              </div>
            )}

            {scanMode === 'code' && (
              <div className="scan-input-pane active">
                <div className="field-group">
                  <label className="field-label">Language / Framework</label>
                  <select className="field-input" style={{ cursor: 'pointer' }} value={scanLang} onChange={e => setScanLang(e.target.value)}>
                    {LANG_GROUPS.map(g => (
                      <optgroup label={g.label} key={g.label}>
                        {g.options.map(([v, label]) => <option value={v} key={v}>{label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Paste Source Code</label>
                  <textarea className="field-textarea" placeholder="Paste your route handler, template, query, or function here..." style={{ minHeight: 160, fontFamily: 'var(--font-mono)', fontSize: 11 }} value={scanCode} onChange={e => setScanCode(e.target.value)} />
                </div>
              </div>
            )}

            {scanMode === 'http' && (
              <div className="scan-input-pane active">
                <div className="field-group">
                  <label className="field-label">Raw HTTP Request</label>
                  <textarea className="field-textarea" placeholder={'POST /login HTTP/1.1\nHost: example.com\nContent-Type: application/x-www-form-urlencoded\n\nusername=admin&password=1234'} style={{ minHeight: 160, fontFamily: 'var(--font-mono)', fontSize: 11 }} value={scanHttp} onChange={e => setScanHttp(e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Notes (optional)</label>
                  <textarea className="field-textarea" placeholder="e.g. This endpoint handles admin login, no rate limiting observed..." style={{ minHeight: 50 }} value={scanHttpNotes} onChange={e => setScanHttpNotes(e.target.value)} />
                </div>
              </div>
            )}

            <button className={`btn-scan${scanning ? ' scanning' : ''}`} disabled={scanning} onClick={runAIScan}>
              <span className="scan-icon">⚡</span>
              <div className="scan-spinner"></div>
              Run AI Security Scan
            </button>
          </div>
        </div>

        {/* Right: Scan progress / checklist */}
        <div>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title"><span className="card-title-icon"></span>Scan Checks</div>
            {checklistState === 'idle' && !showProgress ? (
              <div className="scan-empty-state">
                <div className="scan-empty-icon">🛡️</div>
                <div className="scan-empty-text">Configure your target above<br />and click <strong>Run AI Security Scan</strong><br />to begin analysis.</div>
              </div>
            ) : (
              <div className="checker-grid">
                {SCAN_CHECKS.map((c, i) => (
                  <div className={checklistItemClass(i)} key={c.id}>
                    <span className="ci-dot"></span>
                    <span>{checklistItemSym(i)} {c.label}</span>
                  </div>
                ))}
              </div>
            )}
            {showProgress && (
              <div style={{ marginTop: 14 }}>
                <div className="scan-status-text">{statusText}</div>
                <div className="scan-progress-bar">
                  <div className="scan-progress-fill" style={{ width: progressPct + '%' }}></div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 10 }}><span className="card-title-icon" style={{ background: 'var(--accent-purple)' }}></span>Recent Scans</div>
              <div className="history-list">
                {scanHistory.length === 0 ? (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>No scans yet</div>
                ) : scanHistory.slice(0, 5).map((h, i) => {
                  const c = { critical: 0, high: 0, medium: 0 };
                  (h.findings || []).forEach(f => { if (c[f.severity] !== undefined) c[f.severity]++; });
                  return (
                    <div className="history-item" key={i} onClick={() => reloadScanResult(i)}>
                      <div className="history-url">{h.label}</div>
                      <div className="history-findings">
                        {Object.entries(c).filter(([, v]) => v > 0).map(([k, v]) => (
                          <span key={k} className={`scan-pill ${k}`} style={{ fontSize: 8, padding: '1px 5px' }}>{v} {k[0].toUpperCase()}</span>
                        ))}
                      </div>
                      <div className="history-time">{h.time}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {scanResult && (
        <div className="scan-results-wrap" ref={resultsRef}>
          <div className="scan-results-header">
            <div className="scan-results-title">
              🔍 Scan Results
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-cyan)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{targetLabel}</span>
            </div>
            <div className="scan-summary-pills">
              {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
                <span key={k} className={`scan-pill ${k}`}>{v} {k}</span>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title"><span className="card-title-icon" style={{ background: 'var(--accent-purple)' }}></span>Executive Summary</div>
            <div className="finding-text" style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}>{scanResult.result.executive_summary || ''}</div>
          </div>

          <div>
            {findings.map((f, i) => (
              <div className={`vuln-finding${openFindings.has(i) ? ' open' : ''}`} key={i}>
                <div className="vuln-finding-header" onClick={() => toggleFinding(i)}>
                  <div className="vuln-finding-left">
                    <div className={`vuln-finding-icon ${f.severity}`}>{f.icon || '🔍'}</div>
                    <div>
                      <div className="vuln-finding-name">{f.title}</div>
                      <div className="vuln-finding-meta">
                        <span className={`sev-badge ${f.severity}`}>{f.severity}</span>
                        <span className="finding-tag">{f.owasp || ''}</span>
                        {f.location && <span className="finding-tag">{f.location}</span>}
                      </div>
                    </div>
                  </div>
                  <span className="vuln-finding-chevron">▼</span>
                </div>
                <div className="vuln-finding-body">
                  <div className="finding-section">
                    <div className="finding-section-label">Description</div>
                    <div className="finding-text">{f.description || ''}</div>
                  </div>
                  {f.evidence && (
                    <div className="finding-section">
                      <div className="finding-section-label">Evidence / Pattern</div>
                      <div className="finding-code">{f.evidence}</div>
                    </div>
                  )}
                  {f.impact && (
                    <div className="finding-section">
                      <div className="finding-section-label">Business Impact</div>
                      <div className="finding-impact">{f.impact}</div>
                    </div>
                  )}
                  {f.remediation_steps && (
                    <div className="finding-section">
                      <div className="finding-section-label">How to Fix</div>
                      <div className="finding-text" style={{ whiteSpace: 'pre-line' }}>{f.remediation_steps}</div>
                    </div>
                  )}
                  {f.secure_code_example && (
                    <div className="finding-section">
                      <div className="finding-section-label">Secure Code Example</div>
                      <div className="finding-fix">{f.secure_code_example}</div>
                    </div>
                  )}
                  {f.references && (
                    <div className="finding-section">
                      <div className="finding-section-label">References</div>
                      <div className="finding-text" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{f.references}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-title"><span className="card-title-icon" style={{ background: 'var(--accent-green)' }}></span>Remediation Roadmap</div>
            <div className="finding-text" style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{scanResult.result.remediation_roadmap || ''}</div>
          </div>

          {scanResult.input.type === 'url' && (
            <div style={{ marginTop: 14 }}>
              <button className="btn-report" onClick={generateReport}>📄 Download Security Report</button>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 6 }}>
                Generates a full PDF-style HTML report of this URL scan
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
