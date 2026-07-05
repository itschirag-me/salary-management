# Requirements Document — ACME Salary Management System

**Author:** Chirag Raja
**Date:** July 2026
**Status:** Draft v1.0
**Audience:** Engineering reviewers, HR stakeholder (primary user)

---

## 1. Context & Problem Statement

ACME's HR team manages compensation data for **10,000 employees across multiple countries** entirely in spreadsheets. This approach has reached its breaking point:

- **No single source of truth** — multiple Excel files drift out of sync; nobody knows which is canonical.
- **No auditability** — a salary can be changed with no record of who changed it, when, or why.
- **Analysis is manual and error-prone** — answering "what's our average pay in Germany for L4 engineers?" means hand-filtering rows and writing ad-hoc formulas.
- **No access control** — a spreadsheet is all-or-nothing; you cannot grant read-only access or scope someone to one region.
- **Multi-currency is unmanaged** — salaries in EUR, USD, INR, and GBP sit side by side with no normalization, making org-wide comparison impossible.

The HR Manager needs **web-based software** to manage salary data reliably and, critically, to **answer questions about how the organization pays people**.

## 2. Goal

Deliver a production-quality web application that lets an HR Manager **manage** employee compensation records and **understand** organizational pay through analytics — replacing the spreadsheet workflow with a system that is correct, auditable, and fast at 10,000-employee scale.

## 3. Primary User Persona

**Priya — HR Manager at ACME**
- Manages compensation for the entire org across 6 countries.
- Comfortable with software but not technical; wants clarity, not configuration.
- Core jobs-to-be-done:
  1. *"Onboard a new hire and set their salary."*
  2. *"Give someone a raise and record why."*
  3. *"Find every employee matching some criteria quickly."*
  4. *"Answer leadership's questions about pay distribution, cost, and equity."*
  5. *"Prove that a change was made correctly, and by whom."*

## 4. Scope & Features (In Scope)

### 4.1 Employee & Compensation Management (Core CRUD)
- Create, read, update, and (soft-)delete employee records.
- Each employee has identity data (name, email, employee code), organizational data (department, job title, level, country, manager), and compensation data (base salary, currency, effective date).
- **Salary history is first-class**: every compensation change creates a new immutable record rather than overwriting the old one. The "current" salary is derived. This gives us history, audit, and effective-dating for free.

### 4.2 Search, Filter & Pagination
- Server-side pagination, sorting, and filtering built to handle 10,000 rows without loading them all.
- Filter by department, country, level, currency, salary range, and free-text search on name/email/code.
- Combinable filters (e.g. "Germany + Engineering + salary > €80k").

### 4.3 Compensation Analytics (the "answer questions" requirement)
This is the feature that differentiates the product from a glorified spreadsheet. A dashboard that answers:
- **Headcount & total spend** — org-wide and sliced by department/country/level.
- **Pay distribution** — min / max / mean / median / percentiles per group.
- **Currency normalization** — all figures convertible to a single base currency (USD) so cross-country comparison is meaningful.
- **Pay equity signals** — compare medians across groups to surface disparities (e.g. same level, different pay by country).
- **Compa-ratio style band analysis** — where each employee sits relative to the median of their level.

### 4.4 Multi-Currency Support
- Store salary in its native currency + code.
- Maintain an exchange-rate table (seeded, with an `effective_date`) to normalize to USD for analytics.
- Display can toggle between native currency and normalized USD.

### 4.5 Audit Trail
- Every write operation (create/update/delete) is logged: who, what entity, what changed (before → after), and when.
- Viewable per-employee ("show me this person's compensation history and who changed it").

### 4.6 Authentication & Authorization
- Login for HR users (JWT-based session).
- **Two roles**: `HR_ADMIN` (full read/write) and `HR_VIEWER` (read-only). Demonstrates that the data model and API enforce access control — a spreadsheet cannot.

### 4.7 Data Seeding
- Deterministic seed script generating **10,000 realistic employees** across 6 countries, multiple departments, levels, currencies, managers, and **salary history** (not just a flat current salary), plus exchange rates and seed users.

### 4.8 Quality Bar
- Meaningful unit + integration tests on the core logic (salary math, currency conversion, analytics aggregation, access control).
- Fast, deterministic, readable tests.
- Deployed, fully functional software + demo video.

## 5. Explicitly Out of Scope (and Why)

Being deliberate about *non-goals* is a core signal of product thinking. Each of these is a conscious cut, not an oversight.

| Excluded | Why it's out of scope |
|---|---|
| **Payroll processing / actual disbursement** | This is a *management & analytics* tool, not a payroll engine. Real payroll (tax withholding, statutory filing, bank transfers) is an enormous regulated domain and a different product. Conflating them would blow scope and dilute the core value. |
| **Live FX rate integration** | We model currency conversion with a seeded, effective-dated rate table. Wiring a live FX API adds an external dependency and failure mode with no bearing on demonstrating the design. The table is structured so a live sync could replace the seed later. |
| **Full org-chart / performance / benefits / PTO** | The persona's job is *compensation*. Benefits, reviews, and leave are adjacent HRIS modules that would balloon the schema and distract from the assessed competency. Manager is modeled (self-referential FK) but org-chart visualization is not built. |
| **Fine-grained field-level / row-level permissions** | Two clean roles (admin/viewer) prove the authz concept. Per-field or per-region ACLs are a real enterprise need but add significant complexity for marginal demonstration value here. |
| **Bulk Excel import/export** | Tempting given the "from spreadsheets" framing, but robust import (validation, dedup, partial-failure handling) is deceptively large. The seed script proves we can ingest at scale; a CSV importer is a documented future extension. |
| **Employee self-service portal** | The sole persona is the HR Manager. Employees viewing their own pay is a separate persona, auth model, and UI surface. |
| **Approval workflows** | Multi-step raise approvals (manager → HRBP → finance) are valuable but are a workflow-engine concern layered on top of the CRUD/audit foundation we're building. |

## 6. Functional Requirements (Testable)

| ID | Requirement |
|---|---|
| FR-1 | HR_ADMIN can create an employee with all required fields; validation rejects invalid email, negative salary, or unsupported currency. |
| FR-2 | Updating a salary creates a new `salary_record` (immutable history) and does not destroy prior records. |
| FR-3 | The employee list returns paginated, filtered, sorted results server-side; a single page never loads all 10,000 rows. |
| FR-4 | Analytics endpoints return correct aggregates (count, sum, mean, median, percentiles) for any valid group-by. |
| FR-5 | All salaries can be normalized to USD using the effective-dated exchange-rate table. |
| FR-6 | Every create/update/delete produces an audit-log entry capturing actor, action, entity, and diff. |
| FR-7 | HR_VIEWER receives 403 on any write endpoint; HR_ADMIN succeeds. |
| FR-8 | Soft-deleted employees are excluded from lists and analytics by default but remain in the audit trail. |

## 7. Non-Functional Requirements

- **Performance:** List and analytics queries return in well under a second at 10k rows. Analytics rely on indexed, DB-side aggregation — never in-app row loops over the full table.
- **Correctness:** Money handled as integer minor units (cents) or fixed-precision `numeric`, never floats. All monetary math is unit-tested.
- **Auditability:** No compensation data is ever hard-mutated; history is append-only.
- **Security:** Passwords hashed (bcrypt/argon2); JWT auth; role checks enforced at the API layer via guards.
- **Maintainability:** Modular architecture (feature modules), typed end-to-end, clear separation of controller / service / repository.
- **Reproducibility:** `docker compose up` + seed brings the whole system up deterministically.

## 8. Success Criteria

The submission succeeds if a reviewer can: log in, browse/search 10k employees fluidly, create and raise a salary and see the history + audit entry, open the analytics dashboard and get correct, currency-normalized answers about org pay, watch write access be denied for a viewer — all backed by a passing, meaningful test suite and a clean incremental commit history.