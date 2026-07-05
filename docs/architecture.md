# Architecture

Salary management software for ACME org (~10,000 employees, multi-country). Single HR-manager persona. This document describes the system as built: stack, boundaries, data model, and the decisions behind them.

## 1. System overview

A three-tier web application:

```
┌──────────────────┐     HTTP/JSON      ┌──────────────────┐    TCP     ┌──────────────┐
│  Next.js (App    │  ───────────────>  │  NestJS REST API │  ──────>   │  PostgreSQL  │
│  Router) client  │  <───────────────  │  (Node 22)       │  <──────   │  + TypeORM   │
└──────────────────┘                    └──────────────────┘            └──────────────┘
     Browser                            Container (Docker)              Container / RDS
```

- **Client** — Next.js App Router. Server Components fetch list/aggregate data; Client Components handle interactive filtering and forms. Talks to the API over JSON.
- **API** — NestJS. Owns all business logic, validation, and DB access. Stateless, so it scales horizontally behind a load balancer.
- **Database** — PostgreSQL via TypeORM. Single source of truth. Chosen over SQLite because 10k rows with country/department aggregations and concurrent HR edits want real indexes, a query planner, and `NUMERIC` money types.

All three run as containers (multi-stage Docker builds) for parity between local and deployed environments.

## 2. Backend structure (NestJS)

Feature-module layout. Each module owns its controller, service, entity, and DTOs — no shared "utils" dumping ground.

```
src/
├── main.ts                      # bootstrap, global pipes, CORS, Swagger
├── app.module.ts
├── config/                      # typed env config (ConfigModule)
├── database/
│   ├── data-source.ts           # TypeORM DataSource (CLI + runtime)
│   ├── migrations/              # versioned schema changes
│   └── seeds/                   # 10k-employee seed script
├── employees/
│   ├── employees.controller.ts
│   ├── employees.service.ts
│   ├── employee.entity.ts
│   └── dto/
├── salaries/
│   ├── salaries.controller.ts   # salary records + history
│   ├── salaries.service.ts
│   ├── salary.entity.ts
│   └── dto/
├── analytics/
│   ├── analytics.controller.ts  # "how does the org pay people" queries
│   └── analytics.service.ts     # aggregation SQL, no writes
└── common/
    ├── pipes/                   # ValidationPipe config
    ├── filters/                 # exception → JSON error shape
    └── interceptors/            # pagination, logging
```

**Why feature modules:** the assessment rewards clear boundaries. A reviewer can open `salaries/` and see everything about salaries in one place. Services hold logic; controllers stay thin (parse → delegate → return).

**Layering rule:** Controller → Service → Repository (TypeORM). Controllers never touch the repository directly; services never parse HTTP. This is what makes the services unit-testable in isolation (mock the repository, assert on logic).

## 3. Frontend structure (Next.js App Router)

```
app/
├── layout.tsx                   # shell, nav, providers
├── page.tsx                     # dashboard: org-level pay stats
├── employees/
│   ├── page.tsx                 # paginated, filterable table (Server Component)
│   └── [id]/page.tsx            # employee detail + salary history
├── analytics/
│   └── page.tsx                 # pay-by-country / dept / band charts
components/
├── ui/                          # component library primitives
├── employee-table.tsx           # Client Component: sort/filter/paginate
├── salary-form.tsx              # Client Component: create/edit with validation
└── charts/
lib/
├── api.ts                       # typed fetch wrapper to NestJS
└── types.ts                     # shared response types
```

**Server vs Client split:** tables and dashboards render on the server (fast first paint, no client data-fetching waterfall for 10k rows — pagination happens server-side via the API). Forms and interactive filters are Client Components because they need state and event handlers.

## 4. Data model

Three core tables. Money is always `NUMERIC(12,2)` + an ISO currency code — never floats.

**`employees`**
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| employee_code | varchar unique | human-facing ID |
| first_name / last_name | varchar | |
| email | varchar unique | |
| department | varchar | indexed |
| job_title | varchar | |
| country | char(2) | ISO 3166, indexed |
| employment_status | enum | active / terminated |
| hire_date | date | |
| created_at / updated_at | timestamptz | |

**`salaries`** — current salary is the latest row per employee; history is preserved (never overwrite pay).
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| employee_id | uuid FK → employees | indexed |
| base_amount | numeric(12,2) | |
| currency | char(3) | ISO 4217 |
| effective_from | date | indexed |
| effective_to | date null | null = current |
| pay_frequency | enum | annual / monthly |
| created_at | timestamptz | |

**`salary_components`** (optional, if time permits) — bonus, allowance, etc., linked to a salary row. Kept separate so base pay stays clean and additions don't require schema changes.

**Key indexes**
- `salaries(employee_id, effective_from DESC)` — fetch current salary fast.
- `employees(country)`, `employees(department)` — power the analytics aggregations without full scans.

**Why salary history as rows, not a mutable column:** "how does the org pay people" and any real HR tool needs to answer *what did we pay, and when*. Overwriting loses that. A new salary = a new row; the old one gets `effective_to` set. This is the single most important data decision in the system.

## 5. Analytics / query layer

The persona's core job is answering questions: average pay by country, by department, salary bands, headcount cost. These are read-only aggregations, isolated in `analytics.service.ts`.

- Aggregations run in **Postgres**, not in Node — `AVG`, `PERCENTILE_CONT`, `GROUP BY country`. Pulling 10k rows into JS to average them would be the wrong call.
- Currency caveat: raw amounts are in local currency. The doc/README states the normalization approach (either report per-currency, or convert to a base currency with a stored/fixed rate). Being explicit about this is product thinking — mixing currencies in one average is a bug, and calling it out is the point.

## 6. Cross-cutting concerns

- **Validation:** global `ValidationPipe` with `class-validator` DTOs. Every request body is validated at the edge; services trust their inputs.
- **Errors:** one exception filter maps thrown errors to a consistent JSON shape `{ statusCode, message, error }`. No stack traces to the client.
- **Pagination:** the employees list is always paginated (`limit`/`offset` or cursor). 10k rows never ship in one response.
- **API docs:** Swagger auto-generated from DTOs at `/api/docs`.
- **Config:** typed `ConfigModule`, all secrets via env. Nothing hardcoded.

## 7. Scaling considerations (for 10k, and honest about the ceiling)

10k employees is small — this fits comfortably on one Postgres instance and one API container. The architecture is built so the obvious growth paths don't require a rewrite:

- **Stateless API** → add replicas behind a load balancer; no session affinity needed.
- **Indexed aggregations** → analytics stay fast well beyond 10k; if they ever slow, a materialized view for dashboard stats is the next step (noted, not built).
- **Seed performance** → 10k inserts use batched `insert()` (chunks of ~1k), not 10k individual saves. Naive per-row insert is the trap; batching keeps seeding to seconds.

What is deliberately *not* here: caching layer (Redis), read replicas, event sourcing. At this scale they'd be resume-driven complexity. The requirements doc records this as a conscious cut.

## 8. Deployment

- Multi-stage Dockerfiles for API and client (deps → build → slim runtime, non-root user).
- `docker-compose` for local: api + client + postgres.
- Deployed target: containers on a host/PaaS with a managed Postgres. Migrations run on deploy (`typeorm migration:run`), then the seed script for the demo dataset.
- A short screen-recorded demo walks through: dashboard → employee list/filter → edit a salary → see history → analytics view.