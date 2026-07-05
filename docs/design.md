# Design

Implementation-level design for the salary management system: the API contract, key flows, the testing strategy, and the trade-offs made along the way. `architecture.md` covers structure; this covers *how it behaves*.

## 1. API Contract

Base path `/api/v1`. JSON request and response payloads. All list endpoints are paginated.

### Employees

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/employees` | List — supports `?page`, `?limit`, `?department`, `?country`, `?status`, `?search` |
| `GET` | `/employees/:id` | One employee details + current active salary |
| `POST` | `/employees` | Create employee profile |
| `PATCH` | `/employees/:id` | Update employee profile fields (excluding code and salaries) |
| `DELETE` | `/employees/:id` | Soft-delete (set employmentStatus = terminated) |

**List response shape (wrapped in `success` envelope via ResponseInterceptor):**
```json
{
  "success": true,
  "statusCode": 200,
  "path": "/api/v1/employees?page=1&limit=50",
  "timestamp": "2026-07-05T21:49:17.000Z",
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "employeeCode": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "department": "Engineering",
      "jobTitle": "Software Engineer",
      "country": "US",
      "employmentStatus": "active",
      "hireDate": "2026-01-01",
      "currentSalary": {
        "baseAmount": "75000.00",
        "currency": "USD"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 10000,
    "totalPages": 200
  }
}
```

### Salaries

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/employees/:employeeId/salaries` | Full salary history, sorted newest first |
| `POST` | `/employees/:employeeId/salaries` | Record a new salary (closes the active one) |

Recording a salary is **not** an update — it appends. See flow §2.2.

### Analytics

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/analytics/overview` | Headcount, total payroll cost, avg salary grouped by currency |
| `GET` | `/analytics/by-country` | Avg / min / max / count grouped by country and currency |
| `GET` | `/analytics/by-department` | Same, grouped by department and currency |

Each analytics response groups calculations strictly by currency code, so a consumer never mistakes a mixed-currency average for a real number.

---

## 2. Key Flows

### 2.1 Listing 10k Employees

The database table never loads all 10k rows at once.

```
Client (Server Component) → GET /employees?page=3&limit=50&country=IN
  → Service builds a filtered, paginated TypeORM query
  → Postgres returns 50 rows + total count (indexed on country)
  → Response { data, meta }
  → Component renders the table; pagination controls use meta
```

Filtering pushes down to SQL `WHERE` clauses, not JS `.filter()`. The current-salary join uses the `(employee_id, effective_from DESC)` index.

### 2.2 Changing an employee's salary (append, don't overwrite)

This is the flow that protects pay history.

```
POST /employees/:id/salaries { baseAmount, currency, effectiveFrom, payFrequency }
  → validate DTO (positive amount, valid ISO currency, sane date)
  → in a transaction:
      1. find the current salary row (effective_to IS NULL)
      2. set its effective_to = new.effectiveFrom - 1 day
      3. insert the new salary row (effective_to = NULL)
  → return the new current salary
```

Wrapping both writes in one transaction means you can never end up with two "current" rows or a gap. This is the correctness-critical path and gets the most test attention.

### 2.3 Analytics aggregate query

```
GET /analytics/by-country
  → analytics.service runs:
      SELECT country, currency, COUNT(*), AVG(base_amount), MIN(...), MAX(...)
      FROM salaries s JOIN employees e ON e.id = s.employee_id
      WHERE s.effective_to IS NULL AND e.employment_status = 'active'
      GROUP BY country, currency
  → shape into { group, currency, headcount, avgSalary, minSalary, maxSalary }[]
```

Only *current* salaries of *active* employees count — a reviewer looking at "how the org pays people" should see live numbers, not historical noise.

---

## 3. Testing Strategy

Fast, deterministic, and meaningful.

- **Unit tests (the bulk) — services, mocked repositories & controllers.**
  - `salaries.service` — tests the transaction logic: new salary closes the old one; transaction produces exactly one current active row; rejects dates earlier than or equal to current active salary; handles the first-ever salary.
  - `analytics.service` — verifies SQL groupings and math are composure-isolated by mocking raw query results.
  - `employees.service` — verifies pagination logic, filter composition, and soft-delete states.
  - `auth.service` / `auth.controller` — verifies credentials validation, bcrypt comparisons, and secure cookie creation.
  - `AllExceptionsFilter` & `ResponseInterceptor` — validates standardized error mappings and response formatting wrapper envelopes.
- **Code Coverage Target:** Excludes migrations, seeds, guards, strategies, entities, and module descriptors to concentrate on business code, achieving >95% coverage on real logic.

---

## 4. Seeding 10,000 Employees

`database/seeds/` script:
- Generates 10k employees across a realistic spread of countries, departments, and job titles (using `@faker-js/faker` with a **fixed seed** for reproducibility).
- Assigns each a salary appropriate to their country's currency and a plausible band for their title.
- Inserts in **batches of ~1,000** via `repository.insert([...])`, not 10k individual `save()` calls. Batching completes the ingestion in a few seconds.

---

## 5. Trade-offs and Deliberate Cuts

| Decision | Chose | Over | Why |
|---|---|---|---|
| Database | PostgreSQL | SQLite | Real money decimal types, transaction performance, concurrent edits. |
| Salary storage | Append-only history rows | Mutable salary column | History is core to tracking raises and auditing; overwriting destroys it. |
| Aggregation location | In Postgres | In Node | 10k-row averages and statistics belong in SQL, not JS memory. |
| Auth | Secure session-based JWT cookie | Full RBAC + multi-user roles | One HR-manager persona in the requirements. Minimal login protection was built; Admin vs Viewer separation is left for later. |
| Currency reporting | Strict per-currency reporting | Conversion to base USD | Mixing currencies is mathematically incorrect. Partitioning aggregates by currency is cleaner than managing exchange rate tables. |
| Audit logging | Preserved via salary row append history | Separate audit logs table | Appendix history satisfies auditability of raises. Additional audit metadata tables were cut for simplicity. |