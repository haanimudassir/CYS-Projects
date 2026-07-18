export const MODULES = [
  { id: 'sqli',   icon: '💉', name: 'SQL Injection',     desc: 'Bypass login using SQLi payload',            sev: 'critical', owasp: 'A03' },
  { id: 'xss',    icon: '🎯', name: 'XSS',               desc: 'Inject script into comment / input field',   sev: 'critical', owasp: 'A03' },
  { id: 'auth',   icon: '🔓', name: 'Broken Auth',       desc: 'Authenticate with weak default credentials', sev: 'high',     owasp: 'A07' },
  { id: 'access', icon: '🚪', name: 'Access Control',    desc: 'Access the admin panel as a guest user',     sev: 'critical', owasp: 'A01' },
  { id: 'csrf',   icon: '🔁', name: 'CSRF',              desc: 'Submit a forged cross-site bank transfer',   sev: 'high',     owasp: 'A01' },
  { id: 'cmd',    icon: '💻', name: 'Command Injection', desc: 'Chain OS commands via the ping utility',     sev: 'critical', owasp: 'A03' },
  { id: 'idor',   icon: '🗂️', name: 'IDOR',              desc: "Read another user's private profile",       sev: 'medium',   owasp: 'A01' },
];

export const OWASP_REF = [
  { n: 'A01', title: 'Broken Access Control',              sev: 'critical', desc: 'Moving up from #5 to #1. 94% of apps tested had some form of broken access control. IDOR, privilege escalation, route bypass.' },
  { n: 'A02', title: 'Cryptographic Failures',             sev: 'high',     desc: 'Formerly "Sensitive Data Exposure". Plaintext passwords, weak algorithms (MD5/SHA1), missing TLS, improper key management.' },
  { n: 'A03', title: 'Injection',                          sev: 'critical', desc: 'SQL, NoSQL, OS, LDAP injection. XSS falls here too. 94% of apps tested, 274k occurrences. Use parameterized queries and ORM.' },
  { n: 'A04', title: 'Insecure Design',                    sev: 'high',     desc: 'New in 2021. Missing or ineffective control design, lack of threat modeling, no secure design patterns or reference architectures.' },
  { n: 'A05', title: 'Security Misconfiguration',          sev: 'medium',   desc: 'Missing hardening, default credentials, unnecessary features, overly permissive CORS, verbose error messages exposing stack traces.' },
  { n: 'A06', title: 'Vulnerable & Outdated Components',   sev: 'medium',   desc: 'Using components with known CVEs. Run pip audit / npm audit regularly. Monitor NVD for dependency vulnerabilities.' },
  { n: 'A07', title: 'Identification & Auth Failures',     sev: 'high',     desc: 'Weak credentials, no brute force protection, missing MFA, insecure session management, predictable session IDs.' },
  { n: 'A08', title: 'Software & Data Integrity Failures',  sev: 'high',    desc: 'CI/CD pipeline without integrity checks, insecure deserialization, untrusted plugins/CDN, auto-updates without signature verification.' },
  { n: 'A09', title: 'Security Logging & Monitoring',      sev: 'medium',   desc: 'Insufficient logging of logins, failures, and high-value transactions. Breaches go undetected. Log to tamper-proof storage.' },
  { n: 'A10', title: 'Server-Side Request Forgery',        sev: 'medium',   desc: 'New in 2021. Server fetches remote URL based on user input — can reach internal services, cloud metadata (169.254.169.254), etc.' },
];

export const PANEL_NAMES = {
  dashboard: 'Dashboard', sqli: 'SQL Injection', xss: 'XSS', auth: 'Broken Auth',
  access: 'Access Control', csrf: 'CSRF', cmd: 'Command Injection', idor: 'IDOR',
  scanner: 'AI Vuln Scanner', reference: 'OWASP Reference',
};

export const WEAK_PASSWORDS = ['1234', 'password', 'admin', 'qwerty', 'letmein', '123456', 'pass', 'test', 'abc123', 'admin123'];

export const fakeUsers = {
  1: { name: 'Aisha Siddiqui', email: 'aisha.s@gmail.com',    dob: '1990-03-12', card: '4242 **** **** 8821', phone: '+92-300-1234567', role: 'user' },
  2: { name: 'Omar Farooq',    email: 'omar.farooq@yahoo.com', dob: '1985-07-22', card: '5100 **** **** 3344', phone: '+92-321-9876543', role: 'user' },
  3: { name: 'Sara Qureshi',   email: 'sara.q@outlook.com',   dob: '1992-11-05', card: '3782 **** **** 7712', phone: '+92-333-5556677', role: 'admin' },
  4: { name: 'Zain Malik',     email: 'zain.malik@gmail.com',  dob: '1988-01-30', card: '6011 **** **** 4490', phone: '+92-312-4443322', role: 'user' },
  5: { name: 'You (Guest)',    email: 'guest@securelab.com',   dob: '1995-06-18', card: '4111 **** **** 0000', phone: '+92-XXX-XXXXXXX', role: 'user' },
};

export const fakeOrders = {
  100: { user: 1, items: 'Laptop x1', total: 'PKR 150,000', status: 'Delivered' },
  200: { user: 2, items: 'Phone x2',  total: 'PKR 80,000',  status: 'Shipped' },
  501: { user: 5, items: 'Book x3',   total: 'PKR 2,400',   status: 'Processing' },
  502: { user: 5, items: 'Mouse x1',  total: 'PKR 1,800',   status: 'Delivered' },
  999: { user: 3, items: 'Server x1', total: 'PKR 750,000', status: 'Pending' },
};

export const SCAN_CHECKS = [
  { id: 'injection',  label: 'Injection Flaws (SQLi / XSS / Cmd)' },
  { id: 'auth',       label: 'Authentication & Session Management' },
  { id: 'access',     label: 'Broken Access Control' },
  { id: 'crypto',     label: 'Cryptographic Failures' },
  { id: 'misconfig',  label: 'Security Misconfiguration' },
  { id: 'components', label: 'Vulnerable Components' },
  { id: 'logging',    label: 'Logging & Monitoring Gaps' },
  { id: 'design',     label: 'Insecure Design Patterns' },
];
