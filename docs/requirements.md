# Requirements Document — ACME Salary Management System

**Author:** Chirag Raja
**Date:** July 2026
**Status:** Completed v1.0
**Audience:** Engineering reviewers, HR stakeholder (primary user)

---

## 1. Context & Problem Statement

ACME's HR team manages compensation data for **10,000 employees across multiple countries** entirely in spreadsheets. This approach has reached its breaking point:

- **No single source of truth** — multiple Excel files drift out of sync; nobody knows which is canonical.
- **Analysis is manual and error-prone** — answering "what's our average pay in Germany?" means hand-filtering rows and writing ad-hoc formulas.
- **No access control** — anyone with access to the spreadsheet can modify data; there is no authentication mechanism.
- **Multi-currency is unmanaged** — salaries in EUR, USD, INR, and GBP sit side by side with no separation, risking incorrect aggregates.

The HR Manager needs **web-based software** to manage salary data reliably and, critically, to **answer questions about how the organization pays people** using distinct currency metrics.

## 2. Goal

Deliver a production-quality NestJS backend API that lets an HR Manager **manage** employee compensation records and **understand** organizational pay through analytics — replacing the spreadsheet workflow with a system that is correct, secure, and fast at 10,000-employee scale.

## 3. Primary User Persona

**Priya — HR Manager at ACME**
- Manages compensation for the entire org across multiple countries.
- Core jobs-to-be-done:
  1. *"Onboard a new hire and set their salary."*
  2. *"Give someone a raise and log the start date."*
  3. *"Find every employee matching some criteria quickly."*
  4. *"Answer leadership's queries about pay averages, minimums, maximums, and headcount per currency."*
  5. *"Ensure anonymous users cannot access employee salary details."*

## 4. Scope & Features (In Scope)

### 4.1 Employee & Compensation Management (Core CRUD)
- Create, read, update, and soft-delete employee records.
- Each employee has identity data (name, email, employee code), organizational data (department, job title, country), and compensation data.
- **Salary history is first-class**: every compensation change creates a new immutable record rather than overwriting the old one. The current salary is derived. This gives us history and effective-dating for free.

### 4.2 Search, Filter & Pagination
- Server-side pagination, sorting, and filtering built to handle 10,000 rows without loading them all.
- Filter by department, country, status, and free-text search on name/email/code.
- Combinable filters.

### 4.3 Compensation Analytics (the "answer questions" requirement)
A dashboard-supporting API that aggregates:
- **Headcount & total spend** — org-wide, grouped strictly by payment currency.
- **Pay aggregates** — average, minimum, and maximum salaries grouped by country or department, partitioned by currency.
- **Currency separation** — all analytics calculations are isolated by payment currency, preventing mixed-currency averaging errors.

### 4.4 Authentication & Authorization
- Secure JWT-based authentication using HTTP-only cookies (`access_token`).
- All write/read routes (except public health endpoint) require authenticated session access.

### 4.5 Data Seeding
- Seed script generating **10,000 realistic employees** across multiple countries, departments, and **salary history records** (not just a flat current salary).

### 4.6 Quality Bar & Documentation
- Comprehensive unit test suites (services, controllers, custom interceptors/filters) with >95% statement coverage.
- Detailed OpenAPI/Swagger documentation configuration at `/docs` endpoint, with security declarations and response schemas.

---

## 5. Explicitly Out of Scope (and Why)

Being deliberate about *non-goals* is a core signal of product thinking. Each of these is a conscious cut, not an oversight.

| Excluded | Why it's out of scope |
|---|---|
| **Payroll processing / actual disbursement** | This is a *management & analytics* tool, not a payroll engine. Real payroll is an enormous regulated domain and a different product. |
| **USD base currency conversion / FX rate tables** | Managing an active exchange-rate table adds complex external sync. Real multi-currency analysis is solved by reporting metrics strictly partitioned by local currency, which is mathematically sound. |
| **Fine-grained role-based permissions (Viewer vs Admin)** | Secure JWT authentication protects the data from anonymous access. Additional role check hierarchies (RBAC) are left as a future enterprise extension. |
| **Audit trail logging table** | History is preserved via the immutable append-only `salaries` table. Detailed logger tables (acting as user-action logs) are excluded for simplicity. |
| **Salary components (bonus/allowance)** | Base salary answers the core organizational questions. Additional comp components are a future extension. |

---

## 6. Functional Requirements (Testable)

| ID | Requirement |
|---|---|
| FR-1 | Authenticated HR users can create an employee with all required fields; validation rejects invalid email or empty names. |
| FR-2 | Recording a salary creates a new `salaries` record (immutable history) and terminates the previous record by updating its `effective_to` date. |
| FR-3 | The employee list returns paginated, filtered, sorted results; a single page never loads all 10,000 rows. |
| FR-4 | Analytics endpoints return correct aggregates (count, min, max, average) partitioned strictly by currency. |
| FR-5 | Anonymous requests are rejected with 401 Unauthorized by the JwtAuthGuard (except the public `/health` endpoint). |
| FR-6 | Soft-deleted employees (status = terminated) are excluded from active analytics aggregates. |

---

## 7. Non-Functional Requirements

- **Performance:** List and analytics queries return in well under a second at 10k rows. Analytics rely on indexed, DB-side aggregation — never in-app row loops.
- **Correctness:** Money handled as numeric decimal strings, never floats, to maintain exact decimal precision.
- **Auditability:** No salary data is hard-mutated; history is append-only.
- **Security:** Passwords hashed using bcrypt; JWT cookies configured with httpOnly flags.
- **Maintainability:** Modular architecture (feature modules), typed end-to-end, separating controllers, services, and repositories.