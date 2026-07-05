# Design

Implementation-level design for the salary management system: the API contract, key flows, the testing strategy, and the trade-offs made along the way. `architecture.md` covers structure; this covers *how it behaves*.

## 1. API contract

Base path `/api`. JSON in, JSON out. All list endpoints paginate.

### Employees

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/employees` | List — supports `?page`, `?limit`, `?department`, `?country`, `?status`, `?search` |
| `GET` | `/employees/:id` | One employee + current salary |
| `POST` | `/employees` | Create employee |
| `PATCH` | `/employees/:id` | Update employee fields (not salary) |
| `DELETE` | `/employees/:id` | Soft-delete (set status = terminated) |

**List response shape:**
```json
{
  "data": [ { "id": "...", "employeeCode": "E00042", "fullName": "...",
              "department": "Engineering", "country": "IN",
              "currentSalary": { "baseAmount": "1200000.00", "currency": "INR" } } ],
  "meta": { "page": 1, "limit": 50, "total": 10000, "totalPages": 200 }
}
```

### Salaries

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/employees/:id/salaries` | Full salary history, newest first |
| `POST` | `/employees/:id/salaries` | Record a new salary (closes the previous one) |

Recording a salary is **not** an update — it appends. See flow §2.2.

### Analytics

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/analytics/overview` | Headcount, total payroll cost, avg salary |
| `GET` | `/analytics/by-country` | Avg / min / max / count grouped by country |
| `GET` | `/analytics/by-department` | Same, grouped by department |
| `GET` | `/analytics/distribution` | Salary bands (histogram buckets) |

Each analytics response states its currency basis explicitly (per-currency breakdown or normalized-to-base), so a consumer never mistakes a mixed-currency average for a real number.

## 2. Key flows

### 2.1 Listing 10k employees

The table never loads all 10k at once.

```
Client (Server Component) → GET /employees?page=3&limit=50&country=IN
  → Service builds a filtered, paginated TypeORM query
  → Postgres returns 50 rows + total count (indexed on country)
  → Response { data, meta }
  → Server Component renders the table; pagination controls use meta
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

Wrapping both writes in one transaction means you can never end up with two "current" rows or a gap. This is the correctness-critical path and gets the most test attention (§3).

### 2.3 Analytics query

```
GET /analytics/by-country
  → analytics.service runs:
      SELECT country, COUNT(*), AVG(base_amount), MIN(...), MAX(...)
      FROM salaries s JOIN employees e ON e.id = s.employee_id
      WHERE s.effective_to IS NULL AND e.employment_status = 'active'
      GROUP BY country
  → shape into { country, headcount, avgSalary, ... }[]
```

Only *current* salaries of *active* employees count — a reviewer looking at "how the org pays people" should see live numbers, not historical noise.

## 3. Testing strategy

Fast, deterministic, meaningful — the assessment's exact words. Priorities:

**Unit tests (the bulk) — services, mocked repositories.** No DB, run in milliseconds.
- `salaries.service` — the append-and-close logic: new salary closes the old one; the transaction produces exactly one current row; rejects an `effectiveFrom` earlier than the current salary; handles the first-ever salary (no prior row to close). *This is the highest-value test file — the history logic is where correctness lives.*
- `analytics.service` — grouping math and currency handling on known fixtures; verifies mixed-currency inputs aren't silently averaged.
- `employees.service` — pagination meta math, filter composition, soft-delete sets status rather than hard-deleting.
- DTO validation — bad currency codes, negative amounts, malformed dates are rejected.

**Integration tests (a few) — real Postgres (test container), real queries.** Confirms the salary transaction and the aggregation SQL actually behave against the DB, since those are the two places raw SQL/transactions can lie to a mock.

**What's deliberately not tested:** the framework itself, trivial getters, the seed script's exact output. Testing NestJS's routing or TypeORM's `save()` adds no signal.

**Determinism:** fixtures use fixed dates and seeded values — no `Date.now()`, no randomness in assertions. The seed script uses a fixed RNG seed so the demo dataset is reproducible.

## 4. Seeding 10,000 employees

`database/seeds/` script:
- Generates 10k employees across a realistic spread of countries, departments, and job titles (using `@faker-js/faker` with a **fixed seed** for reproducibility).
- Assigns each a salary appropriate to their country's currency and a plausible band for their title — so analytics produce interesting, non-uniform numbers.
- Inserts in **batches of ~1,000** via `repository.insert([...])`, not 10k individual `save()` calls. Naive insertion takes minutes and hammers the DB; batching lands in a few seconds.
- Idempotent-ish: truncates the tables first (guarded to dev/seed context) so re-running gives a clean, known state for the demo.

## 5. Trade-offs and deliberate cuts

| Decision | Chose | Over | Why |
|---|---|---|---|
| Database | PostgreSQL | SQLite | Real money types, aggregation performance, concurrent edits. SQLite was offered but Postgres better fits multi-country money math. |
| Salary storage | Append-only history rows | Mutable salary column | History is core to the persona's questions; overwriting destroys it. |
| Aggregation location | In Postgres | In Node | 10k-row averages belong in SQL. |
| Auth | Single assumed HR user / minimal | Full RBAC + multi-user | One persona in the brief. Real auth is noted as the first thing to add, not built — building it would spend time the brief doesn't reward. |
| Currency normalization | Per-currency reporting (+ documented base-conversion approach) | Silent single-currency average | Mixing currencies in one number is wrong; being explicit is the product-thinking signal. |
| Caching / Redis | None | Cache layer | Pointless at 10k; would be resume-driven complexity. Path noted in architecture doc. |
| Salary components (bonus/allowance) | Modeled if time permits, else base only | Always full comp | Base pay answers the core questions; components are a clean extension, not a blocker. |

## 6. Error handling & edge cases

- New salary dated before the current one → rejected with a clear 400.
- Employee not found → 404, consistent error shape.
- Negative or zero salary → 400 at validation.
- Deleting an employee → soft delete (status = terminated); their salary history is retained, and they drop out of *active*-scoped analytics.
- Empty states (no employees match a filter) → API returns `data: [], meta.total: 0`; UI shows a "no results, adjust filters" message rather than a blank screen.

## 7. Open questions to resolve while building

- Exact salary-band bucket boundaries for the distribution endpoint (depends on the seeded spread).
- Whether to ship base-currency conversion in the demo or report strictly per-currency — either is defensible; the README will state which shipped and why.
- Whether salary components make the time budget.