# Incident Response Log Management System (IRLMS)

A full-stack, database-driven platform for centralizing, tracking, and analyzing security incidents across an organization's assets and personnel — a database systems project demonstrating normalized schema design, transactional integrity, and role-based application architecture end to end, from the SQL up through a production-style UI.

> Reporting → Triage → Response → Resolution → Audit, all in one auditable system of record.

This project runs entirely locally against your own MySQL instance, there's no hosted demo. See **[Getting started](#getting-started)** below to run it in a few minutes.


## Why this exists

Security teams without centralized logging end up with fragmented incident records, slow response times, and no reliable audit trail for compliance. IRLMS solves this with a normalized relational database at its core and a role-aware web application on top, so every incident, action, and status change is captured, timestamped, and attributable.

## Core features

- **Incident lifecycle management**: report, assign, respond to, and resolve incidents with full status history (`Open → In Progress → Resolved/Reopened → Closed`).
- **Role-based access control**: Analyst, Manager, Admin, and Auditor roles, enforced both in the API (JWT + middleware) and the UI (route/action gating).
- **Asset inventory & risk mapping**: incidents link directly to affected assets, with a computed risk view surfacing "Active Threat" hosts.
- **Response action & comment trail**: every containment/eradication/recovery step is logged with actor, timestamp, and duration.
- **Evidence & chain of custody**: analysts attach evidence files (logs, packet captures, screenshots) to an incident; every file is SHA-256 hashed on upload and stored under a randomized filename, so integrity can be verified later and the original filename is never trusted for storage.
- **SLA tracking**: severity levels carry response-time SLAs; breaches are detected automatically via a scheduled MySQL event.
- **Reporting & analytics**: analyst performance, asset risk assessment, monthly summaries, and CSV export.
- **Full audit trail**: database triggers log every INSERT/UPDATE/DELETE on key tables to an `AuditLogs` table for forensic and compliance purposes.

## Architecture
```
irlms/
├── .github/workflows/  CI: backend tests + audit, frontend lint + build + audit
├── database/           MySQL schema, seed data, triggers, stored procedures, views, events, indexes
├── backend/             Node.js + Express REST API (JWT auth, RBAC middleware, validation, tests)
└── frontend/            React + Vite + Tailwind CSS SPA
```

**Database design highlights**
- Schema normalized to BCNF across 8+ core tables (`Users`, `Assets`, `Incidents`, `ResponseActions`, `Assignments`, `AuditLogs`, `IncidentComments`, `IncidentEvidence`, `SLABreachNotifications`, plus lookup tables).
- Stored procedures encapsulate multi-step transactional operations (e.g. `sp_CreateIncident`, `sp_AssignIncident`) with `START TRANSACTION` / `ROLLBACK` on error.
- Triggers maintain the audit log and enforce business rules automatically at the data layer.
- A scheduled `EVENT` periodically scans for SLA breaches so nothing depends on the application being online.
- Dynamic filter queries in stored procedures use `QUOTE()`-escaped parameters to prevent SQL injection.

**Backend**
- Express REST API with JWT authentication, bcrypt password hashing, per-route RBAC (`authorize('Admin', 'Manager')`), rate limiting, centralized error handling, and multer-based file uploads with path-traversal-safe storage.
- Test suite (Jest + Supertest) covering authentication, auth middleware, RBAC, and request validation — the DB layer is mocked, so tests run without a live MySQL instance. 27 tests across 5 suites.

**Frontend**
- React 18 + Vite, Tailwind CSS v4 design system (custom theme tokens, no default Tailwind look), React Router, Recharts for analytics, and a lightweight toast/notification layer — no UI framework kit, hand-built components.
- Route-level code splitting (`React.lazy`) — the initial bundle only ships the login page; every authenticated page, including the chart-heavy Dashboard, loads on demand.

**CI**
- GitHub Actions [[![CI](https://github.com/haanimudassir/CYS-Projects/actions/workflows/irlms-ci.yml/badge.svg)](https://github.com/haanimudassir/CYS-Projects/actions/workflows/irlms-ci.yml)] runs on every push/PR touching this project: backend test suite, frontend lint (`oxlint`) and production build, and `npm audit` on both.


## Tech stack

| Layer | Technology |
|---|---|
| Database | MySQL 8 — schema, triggers, stored procedures, views, events |
| Backend | Node.js, Express, JWT, bcrypt, express-validator, multer |
| Frontend | React, Vite, Tailwind CSS v4, React Router, Recharts, Lucide Icons |
| Testing | Jest, Supertest |
| Tooling | dotenv, mysql2 (promise pool), oxlint, GitHub Actions |

## Getting started

Requires Node.js 18+ and a local MySQL 8 server.

### 1. Database
```bash
mysql -u root -p < database/01_schema.sql
mysql -u root -p irlms_db < database/02_seed_data.sql
mysql -u root -p irlms_db < database/03_triggers.sql
mysql -u root -p irlms_db < database/04_stored_procedures.sql
mysql -u root -p irlms_db < database/05_events.sql
mysql -u root -p irlms_db < database/06_indexes.sql
mysql -u root -p irlms_db < database/07_views.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # then fill in your DB credentials and a JWT secret
npm install
npm run dev             # http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env    # points at your backend's /api URL
npm install
npm run dev              # http://localhost:3000
```

### Demo login
Seeded via `database/02_seed_data.sql`:
```
admin@irlms.com / Password123!
```


### Running the tests
```bash
cd backend
npm test              # run once
npm run test:coverage # with coverage report
```

## Roles at a glance

| Role | Can do |
|---|---|
| **Analyst** | Log incidents, record response actions, upload evidence, comment |
| **Manager** | Everything an Analyst can, plus assign incidents, delete evidence, view reports |
| **Admin** | Full access, including user management |
| **Auditor** | Read-only access to reports and asset risk data |

## Security considerations

- Passwords are hashed with bcrypt; JWTs are short-lived and required on every protected route.
- SQL is parameterized throughout; including dynamic filter queries in stored procedures, which use `QUOTE()`-escaped parameters rather than string concatenation.
- Uploaded evidence is stored under a randomized filename, never the user-supplied one, closing off path-traversal rather than trying to sanitize against it.
- Rate limiting (100 req/15 min per IP by default) applies to all `/api/` routes, since a system logging security incidents is itself a plausible target.
- RBAC is enforced server-side in Express middleware; frontend route gating exists only for UX, never for the actual boundary.
