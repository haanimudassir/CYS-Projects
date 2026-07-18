import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Terminal from '../shared/Terminal.jsx';
import QueryViewer from '../shared/QueryViewer.jsx';

const CHIPS = ['google.com', 'google.com; cat /etc/passwd', 'google.com && whoami', 'google.com | ls -la /', '$(cat /etc/shadow)', '`id`'];

export default function CmdPanel({ active }) {
  const { mode, markSolved } = useApp();
  const [host, setHost] = useState('google.com');
  const [shell, setShell] = useState({ text: '—', cls: '' });
  const [output, setOutput] = useState({ text: '—', cls: '' });
  const [result, setResult] = useState({ text: '—', cls: 'neutral' });

  function runCmd() {
    const shellCmd = `ping -c 1 ${host}`;
    const isInject = /[;&|`$]/.test(host) || /\$\(/.test(host);
    setShell({ text: shellCmd, cls: isInject && mode === 'vulnerable' ? 'danger' : '' });

    if (mode === 'vulnerable') {
      if (isInject) {
        const parts = host.split(/[;&|]/);
        let out = '';
        parts.forEach(p => {
          p = p.trim().replace(/[`$()]/g, '');
          if (/ping/i.test(p) || (!p.includes(' ') && p)) out += `PING ${p || 'target'}: bytes=32 time=12ms TTL=64\n`;
          else if (/cat.*passwd/.test(p)) out += `root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon\nwww-data:x:33:33:www-data:/var/www\nnobody:x:65534:65534:nobody\n`;
          else if (/whoami/.test(p)) out += `www-data\n`;
          else if (/ls/.test(p)) out += `server.py  config.py  .env  templates/  static/  requirements.txt\n`;
          else if (/id/.test(p)) out += `uid=33(www-data) gid=33(www-data) groups=33(www-data)\n`;
          else if (/shadow/.test(p)) out += `Permission denied (requires root)\n`;
          else out += `sh: ${p}: executed\n`;
        });
        setOutput({ text: out.trim() + '\n\n⚠ OS command injection successful!', cls: 'danger' });
        setResult({ text: `⚠ COMMAND INJECTION SUCCEEDED\n\nShell command executed:\n  ${shellCmd}\n\nOS commands chained via metacharacter.\nServer process user exposed.\nAttacker can read config files, .env,\nsource code, and database credentials.`, cls: 'vuln' });
        markSolved('cmd');
      } else {
        setOutput({ text: `PING ${host}: bytes=32 time=14ms TTL=64\nPING ${host}: bytes=32 time=11ms TTL=64\n\n--- ${host} ping statistics ---\n2 packets transmitted, 2 received`, cls: '' });
        setResult({ text: `[200 OK] Ping completed.\nHost: ${host}\nLatency: 12ms avg`, cls: 'neutral' });
      }
    } else {
      if (isInject || !/^[a-zA-Z0-9.\-]+$/.test(host)) {
        setShell({ text: 'Input rejected before subprocess call.', cls: 'safe' });
        setOutput({ text: '400 Bad Request — Invalid hostname format.', cls: 'safe' });
        setResult({ text: `[400] Bad Request\n\nInput validation failed.\nRegex: ^[a-zA-Z0-9.\\-]+$\nMetacharacters blocked.\n\nsubprocess.run() called with\nshell=False — no shell spawned.\nList args prevent injection:\n  ['ping', '-c', '1', host]`, cls: 'sec' });
      } else {
        setOutput({ text: `PING ${host}: 64 bytes, time=13ms`, cls: 'safe' });
        setResult({ text: `[200 OK] Ping completed safely.\n\nInput validated ✓\nshell=False ✓\nList args used ✓\nHost: ${host}`, cls: 'sec' });
      }
    }
  }

  return (
    <section className={`panel${active ? ' active' : ''}`}>
      <div className="panel-head">
        <div className="panel-head-left">
          <div className="panel-title">
            Command Injection
            <span className="sev-badge critical">Critical</span>
            <span className="owasp-ref">A03:2021</span>
          </div>
          <div className="panel-desc">User input is passed to OS shell functions, allowing attackers to chain arbitrary commands and execute them as the server's process user.</div>
        </div>
      </div>

      <div className="payload-label">Attack payloads</div>
      <div className="payload-chips">
        {CHIPS.map(c => <span key={c} className="chip" onClick={() => setHost(c)}>{c}</span>)}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>Ping Utility Tool</div>
          <div className="info-row">Server executes: <strong>ping -c 1 [your_input]</strong></div>
          <div className="field-group">
            <label className="field-label">Target Host</label>
            <input className="field-input" value={host} onChange={e => setHost(e.target.value)} type="text" />
          </div>
          <button className="btn btn-attack mt-10" onClick={runCmd}>⚡ Run Command</button>
          <Terminal className="mt-10" title="shell_output.log" text={result.text} cls={result.cls} />
        </div>
        <div className="card">
          <div className="card-title"><span className="card-title-icon"></span>Shell Expansion Inspector</div>
          <div className="field-label">Constructed shell command</div>
          <QueryViewer text={shell.text} cls={shell.cls} />
          <div className="field-label mt-10">Simulated OS output</div>
          <QueryViewer text={output.text} cls={output.cls} />
          <div className="field-label mt-10">Secure Python fix</div>
          <div className="code-block">
            <span className="cmt"># ❌ VULNERABLE</span>{'\n'}
            <span className="bad">{`os.system("ping -c 1 " + host)\nsubprocess.run(cmd, shell=True)`}</span>{'\n\n'}
            <span className="cmt"># ✓ SECURE — no shell, validated input</span>{'\n'}
            <span className="good">{`import re, subprocess\nif not re.match(r'^[a-zA-Z0-9.\\-]+$',host):\n    abort(400)\nsubprocess.run(['ping','-c','1',host],\n    shell=False, timeout=5)`}</span>
          </div>
        </div>
      </div>

      <div className="explain-section">
        <div className="explain-header"><span>Command Injection Attack Chain</span><span className="line"></span></div>
        <div className="diff-grid">
          <div className="diff-box vuln">
            <div className="diff-box-title">⚠ Shell Metacharacters</div>
            <p>Characters like <code>;</code> <code>&amp;&amp;</code> <code>|</code> <code>$()</code> and backticks chain commands. With <code>shell=True</code>, Python passes the whole string to <code>/bin/sh</code> for expansion.</p>
            <div className="code-block">
              <span className="bad">{`# Input: google.com; cat /etc/passwd\n# Shell sees:\nping -c 1 google.com; cat /etc/passwd\n#                    ^ new command!`}</span>
            </div>
          </div>
          <div className="diff-box sec">
            <div className="diff-box-title">✓ List Args + Input Validation</div>
            <p>Pass command as a list to subprocess — no shell is invoked, metacharacters are treated as literal argument text. Combine with strict regex validation.</p>
            <div className="code-block">
              <span className="good">{`# List form — SAFE:\nsubprocess.run(\n  ['ping', '-c', '1', host],\n  shell=False  # no shell expansion\n)\n# ';', '&&', '|' become literal args\n# ping rejects them as invalid host`}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
