# Salary Management System

Employee salary management software for an organization with ~10,000 employees across multiple countries. Built for an HR-manager persona to manage salary data via a web interface and answer questions about how the organization pays people — replacing a spreadsheet-based workflow.

The system is a monorepo with three parts: a **Next.js** client, a **NestJS** server, and a **PostgreSQL** database.

---

## Prerequisites

- **Docker & Docker Compose**
- **Node.js** v22 or later (ships with npm v10+)

---

## Project Structure

```text
.
├── client/                     # Next.js frontend (App Router)
│   ├── app/                    # Routes, layout, global styles
│   ├── public/                 # Static assets
│   ├── Dockerfile              # Multi-stage Node Alpine build
│   └── package.json
│
├── server/                     # NestJS backend
│   ├── src/
│   │   ├── auth/               # JWT auth (httpOnly cookie), guard, strategy
│   │   │   ├── dto/
│   │   │   └── user.entity.ts
│   │   ├── common/
│   │   │   ├── enums/          # EmploymentStatus, PayFrequency
│   │   │   ├── filters/        # Global exception filter
│   │   │   ├── interceptors/   # Response envelope interceptor
│   │   │   └── pipes/
│   │   ├── config/             # Env validation (Joi schema)
│   │   ├── database/
│   │   │   ├── data-source.ts  # TypeORM DataSource (CLI + runtime)
│   │   │   ├── migrations/     # Versioned schema changes
│   │   │   └── seeds/          # 10k-employee seed script
│   │   ├── employees/          # Employee CRUD + paginated/filtered list
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   ├── salaries/           # Salary history (append-only)
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/                   # e2e tests
│   ├── Dockerfile              # Multi-stage Node Alpine build
│   └── package.json
│
├── docs/                       # Design artifacts
│   ├── requirements.md         # One-page requirements (goal, scope, exclusions)
│   ├── architecture.md         # Stack, data model, module boundaries
│   ├── design.md               # API contract, flows, testing strategy
│   └── ai-prompts.md           # AI usage and prompt strategy
│
├── docker-compose.yml          # Links client, server, and postgres
└── README.md
```

---

## Quick Start (Docker Compose)

Run the entire stack — database, server, and client — with one command:

```bash
docker compose up --build
```

This builds the server and client images and starts a PostgreSQL instance.

On first run, apply migrations and seed the database in a separate terminal:

```bash
docker compose exec server npm run migration:run
docker compose exec server npm run seed
```

Then access:

- **Client:** [http://localhost:3000](http://localhost:3000)
- **Server:** [http://localhost:5000](http://localhost:5000)
- **Database:** `localhost:5432`

Log in with the seeded HR credentials (`HR_EMAIL` / `HR_PASSWORD` from your env).

Stop the stack:

```bash
docker compose down        # keep data
docker compose down -v     # wipe the database volume
```

---

## Local Development (without Docker)

### 1. Database

Start just the database via Docker:

```bash
docker compose up -d db
```

Or run your own PostgreSQL on port `5432` with database `salary_management`, user `postgres`, password `postgres_password`.

### 2. Server (NestJS)

```bash
cd server
npm install
npm run migration:run    # create the schema
npm run seed             # 10,000 employees + HR user
npm run start:dev
```

Runs at [http://localhost:5000](http://localhost:5000) (set `PORT=5000` in `server/.env`).

### 3. Client (Next.js)

```bash
cd client
npm install
npm run dev
```

Runs at [http://localhost:3000](http://localhost:3000).

---

## Database Migrations & Seeding

Schema is owned by TypeORM migrations — `synchronize` is disabled, so nothing auto-alters the database. Run these from the `server/` directory.

> When running against the Dockerized database from your host, set `DB_HOST=localhost` in `server/.env`. Inside the container the host is `db`.

### Migration commands

| Command                                                        | Purpose                                               |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| `npm run migration:generate -- src/database/migrations/<Name>` | Diff entities against the DB and generate a migration |
| `npm run migration:create -- src/database/migrations/<Name>`   | Create an empty migration to fill by hand             |
| `npm run migration:run`                                        | Apply all pending migrations                          |
| `npm run migration:revert`                                     | Roll back the most recent migration                   |

After changing an entity:

```bash
npm run migration:generate -- src/database/migrations/DescribeYourChange
npm run migration:run
```

### Seeding

The seed script inserts 10,000 employees across multiple countries and currencies (fixed random seed for reproducibility), each with one current salary, plus the single HR login user. Re-running truncates and repopulates for a clean, known dataset. It refuses to run when `NODE_ENV=production`.

```bash
npm run seed
```

Verify:

```bash
docker compose exec db psql -U postgres -d salary_management \
  -c "SELECT COUNT(*) FROM employees;"
```

---

## Testing

Unit and e2e tests run from the `server/` directory:

```bash
cd server
npm run test         # unit tests
npm run test:e2e     # end-to-end tests
npm run test:cov     # coverage report
```

Tests focus on core logic — the append-only salary history transaction, employee query/pagination, and the response/error envelope. They are deterministic (fixed seed, fixed dates) and mock the database at the service layer.

---

## Environment Variables

The server validates its environment on startup (Joi) and refuses to boot if required variables are missing or malformed.

### `server/.env`

```dotenv
# Server
PORT=5000

# Database — "localhost" for host-run commands, "db" inside Docker
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres_password
DB_DATABASE=salary_management

# Auth
JWT_SECRET=change-me-to-a-long-random-string-min-32-chars
JWT_EXPIRES_IN=1d

# Frontend origin (CORS + cookie)
FRONTEND_URL=http://localhost:3000

# Seeded HR login credentials
HR_EMAIL=hr@acme.example
HR_PASSWORD=changeme123

# true in production (HTTPS-only cookie)
COOKIE_SECURE=false
```

### `client/.env`

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Docker networking

Inside Compose, the server reaches the database at host `db` (the service name); the Compose config sets `DB_HOST=db` for the server service. From your host — running migrations or seeds directly — the database is at `localhost:5432`, so keep `DB_HOST=localhost` in your `.env` for those commands.

---

## Architecture Overview

```
┌──────────────────┐   HTTP/JSON    ┌──────────────────┐    TCP    ┌──────────────┐
│  Next.js client  │ ─────────────> │  NestJS REST API │ ───────>  │  PostgreSQL  │
│  (App Router)    │ <───────────── │  (Node 22)       │ <───────  │  + TypeORM   │
└──────────────────┘                └──────────────────┘           └──────────────┘
```

Key decisions (see `docs/` for full reasoning):

- **PostgreSQL over SQLite** — real `NUMERIC` money types, aggregation performance, concurrent edits.
- **Append-only salary history** — a salary change inserts a new row and closes the previous one in a single transaction; pay history is never overwritten.
- **Aggregation in SQL, grouped by currency** — averages/min/max computed in Postgres, never by loading rows into Node, and never mixing currencies into one number.
- **Auth scoped to one persona** — JWT in an httpOnly cookie, global route guard. Multi-user and RBAC are deliberately out of scope.

---

## Authentication

- Log in with the seeded `HR_EMAIL` / `HR_PASSWORD`.
- The JWT is stored in an **httpOnly cookie** (not readable by JavaScript), closing the XSS token-theft surface.
- All API routes are protected by a global guard except `/auth/login` and `/auth/logout`.

---

## Documentation

The `docs/` directory contains the design artifacts behind this build:

- **requirements.md** — goal, scope, features, and deliberate exclusions.
- **architecture.md** — system design, data model, and scaling considerations.
- **design.md** — API contract, key flows, and testing strategy.
- **ai-prompts.md** — how AI tools were used, with example prompts.
