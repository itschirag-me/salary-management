# Architecture

Salary management software for ACME org (~10,000 employees, multi-country). Single HR-manager persona. This document describes the full system as built: stack, boundaries, data model, and the decisions behind them.

## 1. System Overview

A three-tier web application architecture deployed via Docker Compose:

```
┌──────────────────┐     HTTP/JSON      ┌──────────────────┐    TCP     ┌──────────────┐
│  Next.js (App    │  ───────────────>  │  NestJS REST API │  ──────>   │  PostgreSQL  │
│  Router) client  │  <───────────────  │  (Node 22)       │  <──────   │  + TypeORM   │
└──────────────────┘                    └──────────────────┘            └──────────────┘
     Browser (port 3000)                Container (port 5000)           Container (port 5432)
```

- **Client** — Next.js 16 App Router. `'use client'` pages fetch data from the NestJS API via `axios`. Authentication state lives in a React context backed by an httpOnly cookie — the client itself never holds the token.
- **API** — NestJS. Owns all business logic, validation, and database access. Stateless (JWT in cookie), enabling horizontal scaling.
- **Database** — PostgreSQL via TypeORM. Single source of truth. Chosen because 10,000 rows with country/department aggregates and concurrent HR updates require transactional safety, clean indexes, and `NUMERIC` money types.

All three run as Docker containers for consistency across development and production environments.

## 2. Frontend Structure (Next.js)

App Router with route groups. Pages that need authentication sit inside `(app)/`; the login page lives outside.

```
client/
├── app/
│   ├── (app)/                       # authenticated route group
│   │   ├── layout.tsx               # auth guard → redirects to /login if unauthenticated
│   │   ├── employees/
│   │   │   ├── page.tsx             # paginated, filterable employee table
│   │   │   ├── add/page.tsx         # create employee form
│   │   │   ├── employee-form.tsx    # shared create/edit form (react-hook-form + zod)
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # employee detail + salary history table
│   │   │       ├── edit/page.tsx    # edit employee form
│   │   │       └── record-salary-dialog.tsx  # modal to record a new salary
│   │   └── analytics/
│   │       ├── page.tsx             # analytics dashboard page
│   │       ├── overview-cards.tsx   # headcount + currency breakdown cards
│   │       ├── grouped-bar-chart.tsx # avg salary by department or country (Recharts)
│   │       └── distribution-chart.tsx # salary distribution histogram (Recharts)
│   ├── login/
│   │   └── page.tsx                 # sign-in form
│   └── hooks/
│       └── use-debounce.ts          # generic debounce hook (used for search)
├── components/ui/                   # shadcn/ui component library
├── context/
│   └── auth-context.tsx             # AuthProvider + useAuth hook
├── lib/
│   ├── api.ts                       # axios client + all API call functions
│   ├── types.ts                     # shared TypeScript interfaces
│   └── utils.ts                     # cn() + formatMoney() utilities
├── bun.setup.ts                     # jsdom bootstrap for Vitest under Bun
├── bunfig.toml                      # Bun test runner config (preloads bun.setup.ts)
└── vitest.config.ts                 # Vitest configuration
```

**Key frontend decisions:**
- **No global state library** — server state is managed by co-located `useEffect` + `useState` within each page. Simple for a single-user HR tool.
- **`axios` for API calls** — thin wrapper in `lib/api.ts` centralises the base URL, error class (`ApiRequestError`), and request serialisation.
- **shadcn/ui** — accessible, unstyled-by-default components built on Radix UI / Base-UI primitives. Enables rapid, accessible UI without a heavy CSS framework.
- **Recharts** for analytics charts — lightweight, well-documented, React-native chart library.

## 3. Backend Structure (NestJS)

Modular feature-based folder structure. Each feature module owns its controller, service, entity, and DTO definitions.

```
server/src/
├── main.ts                      # bootstrap, global pipes, CORS, Swagger, cookie-parser
├── app.module.ts
├── app.controller.ts            # health check at GET /health
├── config/                      # typed env validation (Joi schema)
├── database/
│   ├── data-source.ts           # TypeORM DataSource (migration CLI + runtime)
│   ├── migrations/              # versioned schema files
│   └── seeds/                   # 10k-employee batch seed script
├── auth/
│   ├── auth.controller.ts       # POST /auth/login, POST /auth/logout, GET /auth/me
│   ├── auth.service.ts          # bcrypt compare, JWT sign, cookie set/clear
│   ├── auth.module.ts
│   ├── dto/
│   ├── user.entity.ts
│   ├── jwt.strategy.ts          # Passport JWT strategy (reads httpOnly cookie)
│   └── jwt-auth.guard.ts        # Global guard — all routes protected by default
├── employees/
│   ├── employees.controller.ts  # GET/POST/PATCH/DELETE /employees, GET /employees/:id
│   ├── employees.service.ts     # pagination, filtering, soft-delete
│   ├── employees.module.ts
│   ├── entities/employee.entity.ts
│   └── dto/
├── salaries/
│   ├── salaries.controller.ts   # GET/POST /employees/:id/salaries
│   ├── salaries.service.ts      # append-only salary transaction
│   ├── salaries.module.ts
│   ├── entities/salary.entity.ts
│   └── dto/
├── analytics/
│   ├── analytics.controller.ts  # GET /analytics/overview|by-country|by-department|distribution
│   ├── analytics.service.ts     # raw SQL aggregations
│   └── analytics.module.ts
└── common/
    ├── enums/                   # EmploymentStatus, PayFrequency
    ├── filters/                 # AllExceptionsFilter → JSON error envelope
    ├── interceptors/            # ResponseInterceptor → success envelope
    └── pipes/
```

**Layering rule:** Controller → Service → Repository (TypeORM). Controllers handle request/response shaping and validation; services execute business rules; repositories manage persistence. This separation allows services to be unit-tested in isolation by mocking TypeORM repositories.

## 4. Data Model

Three core tables. Money is represented as `NUMERIC(12,2)` + a three-letter ISO currency code (`char(3)`) to maintain precision and avoid floating-point errors.

**`employees`**
| column | type | notes |
|---|---|---|
| id | uuid PK | Primary identifier |
| employee_code | varchar unique | Human-readable unique code |
| first_name / last_name | varchar | Employee name |
| email | varchar unique | Contact email |
| department | varchar | Indexed for analytics |
| job_title | varchar | Job description |
| country | char(2) | ISO 3166-1 alpha-2, indexed |
| employment_status | enum | `active` / `terminated` |
| hire_date | date | Start date |
| created_at / updated_at | timestamptz | Lifecycle timestamps |

**`salaries`** — current salary is the latest row per employee (`effective_to IS NULL`); history is preserved (a new salary appends and closes the previous row).
| column | type | notes |
|---|---|---|
| id | uuid PK | Primary identifier |
| employee_id | uuid FK → employees | Indexed |
| base_amount | numeric(12,2) | Decimal base pay amount |
| currency | char(3) | ISO 4217 currency code |
| effective_from | date | Start date of salary tier |
| effective_to | date null | End date (`null` = currently active) |
| pay_frequency | enum | `annual` / `monthly` / `biweekly` |
| created_at | timestamptz | Log timestamp |

**`users`** — HR administrator credentials.
| column | type | notes |
|---|---|---|
| id | uuid PK | Primary identifier |
| email | varchar unique | Authentication email |
| password_hash | varchar | bcrypt hash |
| created_at | timestamptz | Registration timestamp |

**Key indexes**
- `idx_salary_employee_effective` on `salaries(employee_id, effective_from DESC)` — speeds current-salary lookup and history queries.
- `idx_employees_department` on `employees(department)` — accelerates department analytics.
- `idx_employees_country` on `employees(country)` — accelerates country analytics.

**Why append-only salary history:** To answer *what did we pay, and when*, compensation data is immutable. A salary change inserts a new record and terminates the active record (`effective_to = new_date - 1 day`).

## 5. Analytics / Query Layer

Analytics are read-only aggregations isolated in `analytics.service.ts`.

- **Four endpoints:** overview (by currency), by-country, by-department, and salary distribution (bucketed histogram).
- Calculations execute directly in **Postgres** (using `AVG`, `MIN`, `MAX`, `COUNT`, `WIDTH_BUCKET`) rather than downloading rows and computing in Node.
- All calculations are partitioned **strictly by currency code** — a consumer never receives a mixed-currency average.
- Only *current* salaries (`effective_to IS NULL`) of *active* employees (`employment_status = 'active'`) are included — analytics reflect the live state of the org.

## 6. Authentication Flow

```
POST /auth/login { email, password }
  → bcrypt.compare(password, user.password_hash)
  → JWT signed with HS256, 1-day expiry
  → Set-Cookie: access_token=<jwt>; HttpOnly; SameSite=Lax; Secure (prod)
  ← 200 OK

Subsequent requests
  → Cookie: access_token=<jwt> (sent automatically by browser)
  → JwtStrategy reads from req.cookies.access_token
  → JwtAuthGuard attaches req.user
  ← 200 OK

POST /auth/logout
  → Clears the access_token cookie
  ← 200 OK
```

The JWT is never accessible to JavaScript (`httpOnly`), closing the XSS token-theft attack surface.

## 7. Cross-Cutting Concerns

- **Validation:** Global `ValidationPipe` with `class-validator`. Payloads are validated at the network boundary; services assume clean models.
- **Errors:** Global `AllExceptionsFilter` converts thrown errors into `{ success: false, statusCode, path, timestamp, error }`.
- **Responses:** `ResponseInterceptor` wraps successful responses in `{ success: true, statusCode, path, timestamp, data, meta? }`.
- **API Docs:** Swagger/OpenAPI generated at `/docs`. Declares DTO response schemas, required inputs, and HTTP-only cookie authentication security scheme.
- **Config:** Strongly typed `ConfigService` backed by Joi env schema validation — the server refuses to start if required variables are missing or malformed.
- **CORS:** Configured to accept credentials from `FRONTEND_URL` only.