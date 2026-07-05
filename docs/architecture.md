# Architecture

Salary management software for ACME org (~10,000 employees, multi-country). Single HR-manager persona. This document describes the backend system as built: stack, boundaries, data model, and the decisions behind them.

## 1. System overview

A three-tier web application architecture:

```
┌──────────────────┐     HTTP/JSON      ┌──────────────────┐    TCP     ┌──────────────┐
│  Next.js (App    │  ───────────────>  │  NestJS REST API │  ──────>   │  PostgreSQL  │
│  Router) client  │  <───────────────  │  (Node 22)       │  <──────   │  + TypeORM   │
└──────────────────┘                    └──────────────────┘            └──────────────┘
     Browser                            Container (Docker)              Container / RDS
```

- **Client** — Next.js App Router (boilerplate ready for integration).
- **API** — NestJS. Owns all business logic, validation, and database access. Stateless, enabling simple horizontal scaling.
- **Database** — PostgreSQL via TypeORM. Single source of truth. Chosen because 10,000 rows with country/department aggregates and concurrent HR updates require transactional safety, clean indexes, and `NUMERIC` money types.

Both API and Database run as Docker containers for consistency across development and production environments.

## 2. Backend structure (NestJS)

Modular feature-based folder structure. Each feature module owns its controller, service, entity, and DTO definitions.

```
src/
├── main.ts                      # bootstrap, global pipes, CORS, Swagger setup
├── app.module.ts
├── app.controller.ts            # health checks
├── app.service.ts
├── config/                      # typed environment configuration validation
├── database/
│   ├── data-source.ts           # TypeORM DataSource for migration running
│   ├── migrations/              # versioned schema files
│   └── seeds/                   # 10k-employee batch seed script
├── employees/
│   ├── employees.controller.ts  # CRUD endpoints
│   ├── employees.service.ts
│   ├── employees.module.ts
│   ├── entities/
│   │   └── employee.entity.ts   # Employee schema definition
│   └── dto/                     # validation schema models
├── salaries/
│   ├── salaries.controller.ts   # salary record & history append endpoints
│   ├── salaries.service.ts
│   ├── salaries.module.ts
│   ├── entities/
│   │   └── salary.entity.ts     # Salary history schema definition
│   └── dto/                     # validation schema models
├── analytics/
│   ├── analytics.controller.ts  # payroll analytics endpoints
│   ├── analytics.service.ts     # aggregate SQL execution
│   └── analytics.module.ts
└── common/
    ├── filters/                 # exceptions interceptor (JSON error shape)
    └── interceptors/            # response format wrapper interceptor
```

**Why feature modules:** Outlines clear boundary structures. A reviewer can inspect `salaries/` or `employees/` and find related endpoints, schemas, and specs localized together.
**Layering rule:** Controller → Service → Repository (TypeORM). Controllers handle request formatting and validation; services execute business rules; repositories manage persistence. This allows services to be unit-tested in isolation by mocking TypeORM entities.

## 3. Data model

Three core tables. Money is represented as `NUMERIC(12,2)` + a three-letter ISO currency code (`char(3)`) to maintain precision and avoid rounding errors.

**`employees`**
| column | type | notes |
|---|---|---|
| id | uuid PK | Primary identifier |
| employee_code | varchar unique | Human-readable unique code |
| first_name / last_name | varchar | Employee name |
| email | varchar unique | Contact email |
| department | varchar | Indexed |
| job_title | varchar | Job description |
| country | char(2) | ISO 3166-1 alpha-2, indexed |
| employment_status | enum | active / terminated |
| hire_date | date | Start date |
| created_at / updated_at | timestamptz | Lifecycle timestamps |

**`salaries`** — current salary is the latest row per employee (`effective_to IS NULL`); history is preserved (new salary appends).
| column | type | notes |
|---|---|---|
| id | uuid PK | Primary identifier |
| employee_id | uuid FK → employees | Associated employee, indexed |
| base_amount | numeric(12,2) | Decimal base pay amount |
| currency | char(3) | ISO 4217 Currency code |
| effective_from | date | Start date of salary tier |
| effective_to | date null | End date (null indicates current active tier) |
| pay_frequency | enum | annual / monthly / biweekly |
| created_at | timestamptz | Log timestamp |

**`users`** — credentials of HR administrators accessing the system.
| column | type | notes |
|---|---|---|
| id | uuid PK | Primary identifier |
| email | varchar unique | Authentication email |
| password_hash | varchar | bcrypt password hash |
| created_at | timestamptz | Registration timestamp |

**Key indexes**
- `idx_salary_employee_effective` on `salaries(employee_id, effective_from DESC)` — speeds up retrieval of current active salary and history queries.
- `idx_employees_department` on `employees(department)` — accelerates department-based analytics groupings.
- `idx_employees_country` on `employees(country)` — accelerates country-based analytics groupings.

**Why salary history as rows, not a mutable column:** To answer *what did we pay, and when*, compensation data is made append-only. A salary change inserts a new record and terminates the active record (`effective_to = new_date - 1`).

## 4. Analytics / Query Layer

Analytics are read-only aggregations isolated in `analytics.service.ts`.
- Calculations execute directly in **Postgres** (using SQL aggregates like `AVG`, `MIN`, `MAX`, `COUNT`) rather than downloading records and looping in JavaScript memory.
- To prevent incorrect mixing of currencies, all calculations are partitioned and reported strictly by payment currency.

## 5. Cross-Cutting Concerns

- **Validation:** Global `ValidationPipe` with class-validator. Payloads are validated at the network boundary; services assume clean models.
- **Errors:** Global `AllExceptionsFilter` converts thrown errors into consistent JSON envelopes `{ success: false, statusCode, path, timestamp, error }`.
- **API Docs:** Swagger/OpenAPI generated at `/docs`. Declares response schemas, required inputs, and HTTP-only cookie authentication security.
- **Config:** Strongly typed `ConfigService` reading env profiles.