const SEV_COLOR = { critical: '#ff4757', high: '#ffa502', medium: '#f9ca24', low: '#2ed573', info: '#a4b0be' };

function rEsc(str) {
  return (str || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function buildReportHTML(result, input) {
  const target = input.url || 'Unknown Target';
  const date = new Date().toLocaleString();

  const findingsHTML = (result.findings || []).map(f => `
    <div style="background:#1a1a2e;border:1px solid ${SEV_COLOR[f.severity] || '#444'};border-radius:8px;padding:18px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:20px">${rEsc(f.icon) || '🔍'}</span>
        <div>
          <div style="font-size:15px;font-weight:700;color:#e8edf3">${rEsc(f.title)}</div>
          <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap">
            <span style="background:${SEV_COLOR[f.severity] || '#444'}22;color:${SEV_COLOR[f.severity] || '#aaa'};border:1px solid ${SEV_COLOR[f.severity] || '#444'};padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase">${rEsc(f.severity)}</span>
            <span style="background:#ffffff10;color:#8892a4;padding:2px 8px;border-radius:4px;font-size:10px">${rEsc(f.owasp)}</span>
            ${f.location ? `<span style="background:#ffffff08;color:#8892a4;padding:2px 8px;border-radius:4px;font-size:10px">${rEsc(f.location)}</span>` : ''}
          </div>
        </div>
      </div>
      ${f.description ? `<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4a5568;margin-bottom:4px">Description</div><div style="font-size:12px;color:#8892a4;line-height:1.6">${rEsc(f.description)}</div></div>` : ''}
      ${f.evidence ? `<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4a5568;margin-bottom:4px">Evidence</div><div style="background:#060a0e;border:1px solid #1e2a3a;border-radius:4px;padding:8px 10px;font-family:monospace;font-size:11px;color:#8892a4;white-space:pre-wrap;word-break:break-all">${rEsc(f.evidence)}</div></div>` : ''}
      ${f.impact ? `<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4a5568;margin-bottom:4px">Business Impact</div><div style="font-size:12px;color:#ff8a95;line-height:1.6">${rEsc(f.impact)}</div></div>` : ''}
      ${f.remediation_steps ? `<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4a5568;margin-bottom:4px">How to Fix</div><div style="font-size:12px;color:#5effa4;line-height:1.6;white-space:pre-line">${rEsc(f.remediation_steps)}</div></div>` : ''}
      ${f.secure_code_example ? `<div><div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4a5568;margin-bottom:4px">Secure Code</div><div style="background:#060a0e;border:1px solid #1e2a3a;border-radius:4px;padding:8px 10px;font-family:monospace;font-size:11px;color:#5effa4;white-space:pre-wrap">${rEsc(f.secure_code_example)}</div></div>` : ''}
    </div>`).join('');

  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  (result.findings || []).forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });
  const pillsHTML = Object.entries(counts).filter(([, v]) => v > 0)
    .map(([k, v]) => `<span style="background:${SEV_COLOR[k]}22;color:${SEV_COLOR[k]};border:1px solid ${SEV_COLOR[k]};padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;margin-right:6px">${v} ${k}</span>`).join('');

  const riskColor = SEV_COLOR[result.overall_risk] || '#aaa';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>SecureLab Security Report — ${rEsc(target)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1117; color: #e8edf3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 0; }
  @media print { body { background: #0d1117 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div style="max-width:860px;margin:0 auto;padding:40px 30px">

  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #1e2a3a">
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#00d4ff;margin-bottom:6px">SecureLab · Security Assessment Report</div>
      <div style="font-size:26px;font-weight:800;color:#e8edf3;margin-bottom:4px">Vulnerability Scan Results</div>
      <div style="font-family:monospace;font-size:12px;color:#8892a4">${target}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;color:#4a5568;margin-bottom:4px">Overall Risk</div>
      <div style="font-size:22px;font-weight:800;color:${riskColor};text-transform:uppercase">${result.overall_risk || 'Unknown'}</div>
      <div style="font-size:10px;color:#4a5568;margin-top:8px">${date}</div>
    </div>
  </div>

  <div style="background:#111820;border:1px solid #1e2a3a;border-radius:10px;padding:18px;margin-bottom:20px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a5568;margin-bottom:8px">Executive Summary</div>
    <div style="font-size:13px;color:#8892a4;line-height:1.7">${rEsc(result.executive_summary)}</div>
  </div>

  <div style="margin-bottom:20px">${pillsHTML}</div>

  <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4a5568;margin-bottom:12px">Security Findings (${(result.findings || []).length})</div>
  ${findingsHTML}

  ${result.remediation_roadmap ? `
  <div style="background:#111820;border:1px solid #1e2a3a;border-radius:10px;padding:18px;margin-top:20px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a5568;margin-bottom:8px">Remediation Roadmap</div>
    <div style="font-size:12px;color:#8892a4;line-height:1.8;white-space:pre-line">${rEsc(result.remediation_roadmap)}</div>
  </div>` : ''}

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #1e2a3a;display:flex;justify-content:space-between;align-items:center">
    <div style="font-family:monospace;font-size:10px;color:#2d3748">Generated by SecureLab · FAST-NUCES · Secure Software Design 2026</div>
    <div style="font-family:monospace;font-size:10px;color:#2d3748">Educational use only · Passive analysis</div>
  </div>

</div>
</body>
</html>`;
}

export function safeBlobDownload(html, filename) {
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    return true;
  } catch (e) {
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); return true; }
    return false;
  }
}
