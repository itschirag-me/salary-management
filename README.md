# Salary Management System

Employee salary management software for an organization with ~10,000 employees across multiple countries. Built for an HR-manager persona to manage salary data via a web interface and answer questions about how the organization pays people — replacing a spreadsheet-based workflow.

The system is a monorepo with three parts: a **Next.js** client, a **NestJS** server, and a **PostgreSQL** database.

---

## Prerequisites

You need Docker and Docker Compose installed. Everything else (Node, Postgres) runs inside containers, so you do **not** need to install them separately to run the app via Docker.

### Install Docker & Docker Compose

- **macOS / Windows:** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/). It bundles both Docker Engine and Docker Compose. After installing, launch Docker Desktop and wait until it reports "running".
- **Linux:** Install [Docker Engine](https://docs.docker.com/engine/install/) and the [Compose plugin](https://docs.docker.com/compose/install/linux/) for your distribution.

Verify the installation:

```bash
docker --version
docker compose version
```

Both commands should print a version number. If `docker compose version` fails but `docker-compose --version` works, you have the older standalone Compose — use `docker-compose` in place of `docker compose` throughout this guide.

### Optional: for local development without Docker

Only needed if you want to run the client or server directly on your machine (see [Local Development](#local-development-without-docker)):

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

This is the recommended way to run everything. Make sure Docker Desktop (or the Docker daemon on Linux) is running first.

### 1. Start the stack

```bash
docker compose up --build
```

This builds the server and client images and starts a PostgreSQL instance. Leave this terminal running — it streams logs from all three services.

### 2. Set up the database

On first run the database is empty. In a **separate terminal**, apply migrations and seed the data:

```bash
docker compose exec server npm run migration:run:prod
docker compose exec server npm run seed:prod
```

Running these **inside the container** (via `docker compose exec`) is the recommended approach — it connects to the database automatically with no host/network configuration. See [Where migration and seed commands connect](#where-migration-and-seed-commands-connect) if you want to understand why, or run them from your host instead.

### 3. Open the app

- **Client:** [http://localhost:3000](http://localhost:3000)
- **Server:** [http://localhost:5000](http://localhost:5000)
- **Database:** `localhost:5432`

Log in with the seeded HR credentials (`HR_EMAIL` / `HR_PASSWORD` from your env — defaults are in the [Environment Variables](#environment-variables) section).

### 4. Stop the stack

```bash
docker compose down        # stop, keep data
docker compose down -v     # stop and wipe the database volume
```

Data persists in a named volume between runs, so you only need to seed once unless you wipe with `-v`.

---

## Database Migrations & Seeding

Schema is owned by TypeORM migrations — `synchronize` is disabled, so nothing auto-alters the database. The seed script populates the demo dataset separately.

### Where migration and seed commands connect

There is only **one** database (the Postgres container). But the address used to reach it depends on **where you run the command from**:

| Where you run it                                      | Reaches Postgres at | Requires `DB_HOST` = |
| ----------------------------------------------------- | ------------------- | -------------------- |
| Inside the container (`docker compose exec server …`) | `db`                | `db`                 |
| On your host machine (`cd server && npm run …`)       | `localhost`         | `localhost`          |

Both connect to the **same** database — only the hostname differs. This trips people up: there is no separate "inner" and "outer" database, just two addresses for the same one.

**Recommended — run inside the container.** No host configuration needed, because the command runs in the same Docker network as the database and the compose file already sets `DB_HOST=db` for the server service:

```bash
docker compose exec server npm run migration:run:prod
docker compose exec server npm run seed:prod
```

**Alternative — run from your host.** Useful for local development. Set `DB_HOST=localhost` in `server/.env` and make sure the database is up with its port published (`docker compose up -d db`):

```bash
cd server
npm install
npm run migration:run
npm run seed
```

> **Common error:** `getaddrinfo ENOTFOUND db` means a command running on your host is trying to use `DB_HOST=db`. Fix it by either running the command inside the container (recommended) or setting `DB_HOST=localhost` in `server/.env` for host-run commands.

### Migration commands

Run these with `docker compose exec server` (container) or from the `server/` directory (host):

| Command                                                        | Purpose                                               |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| `npm run migration:generate -- src/database/migrations/<Name>` | Diff entities against the DB and generate a migration |
| `npm run migration:create -- src/database/migrations/<Name>`   | Create an empty migration to fill by hand             |
| `npm run migration:run:prod`                                   | Apply all pending migrations                          |
| `npm run migration:revert`                                     | Roll back the most recent migration                   |

After changing an entity, generate the migration on your host machine, then apply it inside the container:
 
 ```bash
 # On host:
 cd server && npm run migration:generate -- src/database/migrations/DescribeYourChange
 
 # In container:
 docker compose exec server npm run migration:run:prod
 ```

### Seeding
 
The seed script inserts 10,000 employees across multiple countries and currencies (fixed random seed for reproducibility), each populated with a **full salary history (1 to 4 staggered, chronological salary tiers with realistic 5% to 15% raises)**, plus the single HR login user. Re-running truncates and repopulates for a clean, known dataset. Seeding is bypass-enabled in the production container using the `seed:prod` command.
 
```bash
docker compose exec server npm run seed:prod
```

Verify the data landed:

```bash
docker compose exec db psql -U postgres -d salary_management \
  -c "SELECT COUNT(*) FROM employees;"
```

You should see 10000.

---

## Local Development (without Docker)

If you prefer to run the client and server directly on your machine (with only the database in Docker), you need Node.js v22+ installed.

### 1. Database

Start just the database in Docker:

```bash
docker compose up -d db
```

Or run your own PostgreSQL on port `5432` with database `salary_management`, user `postgres`, password `postgres_password`.

### 2. Server (NestJS)

Set `DB_HOST=localhost` in `server/.env` (host-run commands reach the DB at localhost — see the table above), then:

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

## Testing

### Server API Tests
Unit and e2e tests run from the `server/` directory:

```bash
cd server
npm run test         # unit tests
npm run test:e2e     # end-to-end tests
npm run test:cov     # coverage report
```
Server tests focus on core logic — the append-only salary history transaction, employee query/pagination, and the response/error envelope.

### Client UI Tests
Unit and component tests run from the `client/` directory using Vitest and React Testing Library:

```bash
cd client
bun run test        # run tests once
bun run test:watch  # run tests in watch mode
```
Client tests focus on utility helper formatting (e.g. monetary calculations, classname utilities) and dashboard UI rendering (e.g. total headcount aggregation and geographic breakdowns).

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

Inside Compose, the server reaches the database at host `db` (the service name); the compose config sets `DB_HOST=db` for the server service, overriding your `.env`. From your host — running migrations or seeds directly — the database is at `localhost:5432`, so keep `DB_HOST=localhost` in your `.env` for host-run commands.

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
