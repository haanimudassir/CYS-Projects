# 🛡️ SecureLab: OWASP Top 10 Security Training Platform

SecureLab is a hands-on, interactive security training platform built for
learning how the OWASP Top 10 vulnerabilities actually work and how to fix
them. Run a real attack (SQL injection, XSS, CSRF, command injection, and
more), flip a switch, and watch the exact same attack get blocked by a
secure implementation, side by side.

It also includes an AI-powered vulnerability scanner that analyzes URLs,
source code, or raw HTTP requests and returns a structured OWASP-aligned
security report, including a downloadable, shareable HTML report for URL
scans.

## 🌐 Live Demo

**SecureLab:** https://securelab.vercel.app 

## ✨ Features

- **7 interactive attack modules**, each with a *Vulnerable* and *Secure*
  mode toggle: SQL Injection, XSS, Broken Authentication, Broken Access
  Control, CSRF, Command Injection, and IDOR
- **AI Vulnerability Scanner**: paste a URL, source code (26 languages), or
  a raw HTTP request and get back a structured OWASP-aligned report with
  evidence, impact, and copy-paste-ready fixes, powered by the Groq API
  (with automatic fallback across models for reliability)
- **Downloadable HTML security reports** for URL scans
- **Live CSRF simulation**: configurable victim account, real-time balance,
  session cookies, and single-use token handling
- **Progress tracking**: exploits found, completion percentage, per-module
  status
- **Fully responsive** across desktop, tablet, and mobile
- **OWASP Top 10 (2021) reference** built in

## 🎓 Educational use only

SecureLab is a **passive, client-side simulator**. It does not send attacks
to real target systems. It's modeled on intentionally vulnerable training
environments like OWASP Juice Shop, DVWA, and WebGoat, and is meant purely
for learning. Do not use the techniques demonstrated here against systems
you don't own or have explicit permission to test.

## 🧱 Tech Stack

| Layer      | Technology                                                     |
|------------|-----------------------------------------------------------------|
| Framework  | React 18                                                         |
| Build tool | Vite                                                             |
| Language   | JavaScript (ES2020+) with JSX, compiled via Vite's React plugin  |
| Styling    | Modern CSS; Tailwind installed and configured, not currently used for visual styling |
| AI Scanner | Groq API (GPT-OSS 120B, with automatic fallback)                 |
| State      | React Context (no external state library)                        |

## 🛠️ Installation

Requires [Node.js](https://nodejs.org) 18 or later.

**1. Clone the repository**

```bash
git clone https://github.com/haanimudassir/CYS-Projects.git
cd CYS-Projects/SecureLab
```

**2. Install dependencies**

```bash
npm install
```

**3. Start the development server**

```bash
npm run dev
```

No `.env` file or API key setup needed to run the app; see
[Environment variables](#environment-variables) below for why.

Open the URL Vite prints (usually http://localhost:5173).

### Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally to sanity-check it
```

### Environment variables

**None required.** The Groq API key is entered by the user directly in the
app's UI (AI Scanner panel) and stored only in `sessionStorage` for that
browser tab. It's never read from an environment variable or build-time
config. Anyone using the deployed site brings their own free key from
[console.groq.com](https://console.groq.com).

## 📱 Usage

1. Open the app in your browser at `http://localhost:5173`.
2. Pick an attack module from the sidebar: SQL Injection, XSS, Broken
   Auth, Access Control, CSRF, Command Injection, or IDOR.
3. Run the attack in **Vulnerable** mode and see it succeed.
4. Flip the mode toggle to **Secure** and run the same attack again to see
   it get blocked.
5. Head to **AI Vuln Scanner** to try the AI-powered scanner: paste a URL,
   source code, or an HTTP request, enter a free Groq API key
   (from [console.groq.com](https://console.groq.com)), and run a scan.

## 🗺️ OWASP Coverage

| Module                 | OWASP Category                                          |
|-------------------------|-----------------------------------------------------------|
| SQL Injection            | A03:2021 Injection                                        |
| XSS                       | A03:2021 Injection                                        |
| Broken Authentication      | A07:2021 Identification & Authentication Failures            |
| Broken Access Control       | A01:2021 Broken Access Control                               |
| CSRF                         | A01:2021 Broken Access Control                               |
| Command Injection             | A03:2021 Injection                                        |
| IDOR                            | A01:2021 Broken Access Control                              |

## 💡 Troubleshooting & Tips

- **Groq API Errors**: If the AI Scanner fails, check that your API key is active at [://groq.com](https://://groq.com) and that you haven't hit your rate limits. The app will automatically attempt to fall back to alternative models if the primary 120B model is congested.
- **Vite Port Conflicts**: If port `5173` is already in use by another project, Vite will automatically spin up on the next available port (e.g., `5174`). Check your terminal output for the exact local URL.
- **Session Reset**: Because your API key and progress tracking are saved in `sessionStorage`, closing the browser tab will securely wipe your key and reset your module completion stats.
