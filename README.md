# Salary Management System - Setup Guide

This repository contains the configuration and base setup for the Salary Management System, consisting of a Next.js client, NestJS server, and PostgreSQL database.

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Docker & Docker Compose**
- **Node.js** (v22 or later recommended for local development)
- **Bun** (v1.x or later for running the client locally)
- **pnpm** (v9 or later for running the server locally)

---

## Directory Structure

```text
├── client/              # Next.js Frontend (uses Bun)
│   ├── Dockerfile       # Multi-stage Bun -> Node Alpine Dockerfile
│   └── ...
├── server/              # NestJS Backend (uses pnpm)
│   ├── Dockerfile       # Multi-stage Node Alpine Dockerfile
│   └── ...
├── docker-compose.yml   # Multi-service setup linking client, server, and postgres
└── README.md            # Setup instructions
```

---

## Docker Compose Setup (Recommended)

To run the entire stack (Database, Server, and Client) with a single command:

1. **Start the services:**
   ```bash
   docker compose up --build
   ```
   This will:
   - Build the NestJS server image.
   - Build the Next.js client image, passing the server API URL (`http://localhost:5000`) as a build-time argument.
   - Spin up a PostgreSQL database instance.

2. **Access the services:**
   - **Frontend Client:** [http://localhost:3000](http://localhost:3000)
   - **Backend Server:** [http://localhost:5000](http://localhost:5000)
   - **Database Connection:** `localhost:5432`

3. **Stop the services:**
   ```bash
   docker compose down
   ```
   *Note: Database data is persisted using a named volume `postgres_data` so your data will persist when stopping the containers.*

---

## Local Development Setup (Manual)

If you prefer to run services individually outside of Docker:

### 1. PostgreSQL Database
You can run a local PostgreSQL instance on port `5432`. Ensure you create a database named `salary_management` with user `postgres` and password `postgres_password`.

### 2. NestJS Backend Server
Navigate to the `server` directory, install dependencies using `pnpm`, and run the development server:
```bash
cd server
pnpm install
pnpm run start:dev
```
*The server will run at [http://localhost:3000](http://localhost:3000) by default, or you can configure a custom port by defining a `PORT` environment variable (e.g. `PORT=5000`).*

### 3. Next.js Frontend Client
Navigate to the `client` directory, install dependencies using `bun`, and run the development server:
```bash
cd client
bun install
bun run dev
```
*The client will run at [http://localhost:3000](http://localhost:3000). If you want to direct api traffic to a non-default server port, configure the server URL in your `.env` or during compilation.*

---

## Environment Variables & Configuration

### Database Credentials (Docker Setup)
- **Host:** `db` (inside container) / `localhost` (external)
- **Port:** `5432`
- **Username:** `postgres`
- **Password:** `postgres_password`
- **Database:** `salary_management`
- **Connection URI:** `postgresql://postgres:postgres_password@db:5432/salary_management?schema=public`

### Server Configuration (Docker Setup)
- **Port:** `5000`

### Client Configuration (Docker Setup)
- **Port:** `3000`
- **NEXT_PUBLIC_API_URL:** `http://localhost:5000` (Build Argument)
