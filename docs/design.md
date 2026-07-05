# Design

Implementation-level design for the salary management system: the API contract, key flows, the testing strategy, and the trade-offs made along the way. `architecture.md` covers structure; this covers *how it behaves*.

## 1. API Contract

Base path `/api/v1`. JSON request and response payloads. All responses are wrapped in a standard envelope by `ResponseInterceptor`. All routes require a valid JWT cookie except `POST /auth/login`, `POST /auth/logout`, and `GET /health`.

### Auth

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Validate credentials, issue JWT cookie |
| `POST` | `/auth/logout` | Clear the JWT cookie |
| `GET`  | `/auth/me` | Return the authenticated user's profile |

### Employees

| Method | Path | Purpose |
|---|---|---|
| `GET`    | `/employees`     | List — supports `?page`, `?limit`, `?department`, `?country`, `?status`, `?search` |
| `GET`    | `/employees/:id` | One employee detail including current active salary |
| `POST`   | `/employees`     | Create employee profile |
| `PATCH`  | `/employees/:id` | Update employee profile fields (excluding code and salaries) |
| `DELETE` | `/employees/:id` | Soft-delete (sets `employmentStatus = terminated`) |

**List response shape (wrapped in success envelope via `ResponseInterceptor`):**
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
        "id": "...",
        "baseAmount": "75000.00",
        "currency": "USD",
        "payFrequency": "annual",
        "effectiveFrom": "2026-01-01",
        "effectiveTo": null
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
| `GET`  | `/employees/:employeeId/salaries` | Full salary history, sorted newest first |
| `POST` | `/employees/:employeeId/salaries` | Record a new salary (closes the current one) |

Recording a salary is **not** an update — it appends. See §2.2.

### Analytics

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/analytics/overview`         | Headcount, total payroll cost, avg salary grouped by currency |
| `GET` | `/analytics/by-country`       | Avg / min / max / count grouped by country and currency |
| `GET` | `/analytics/by-department`    | Same, grouped by department and currency |
| `GET` | `/analytics/distribution`     | Salary count bucketed into histogram ranges, grouped by currency |

Each analytics response groups calculations strictly by currency code — a consumer never receives a mixed-currency average. The distribution endpoint uses `WIDTH_BUCKET` in Postgres to create histogram buckets without loading rows into Node.

---

## 2. Key Flows

### 2.1 Listing 10k Employees

The database table never loads all 10k rows at once.

```
Client → GET /employees?page=3&limit=50&country=IN
  → Service builds a filtered, paginated TypeORM QueryBuilder
  → Postgres returns 50 rows + COUNT(*) (indexed on country)
  → ResponseInterceptor wraps → { data, meta }
  → Client renders table; pagination controls use meta.totalPages
```

Filtering pushes down to SQL `WHERE` clauses, not JS `.filter()`. The current-salary join uses the `(employee_id, effective_from DESC)` index.

### 2.2 Changing an Employee's Salary (Append, Don't Overwrite)

This is the flow that protects pay history.

```
POST /employees/:id/salaries { baseAmount, currency, effectiveFrom, payFrequency }
  → validate DTO (positive amount, valid ISO currency, valid date, future of current salary)
  → in a single transaction:
      1. find current salary row (effective_to IS NULL)
      2. set its effective_to = new.effectiveFrom - 1 day
      3. insert new salary row (effective_to = NULL)
  → return the new salary record
```

Wrapping both writes in one transaction means there is never a gap (open period with no salary) or a duplicate current row (two `effective_to IS NULL` rows). This is the correctness-critical path and receives the most test attention.

### 2.3 Analytics Aggregate Query

```
GET /analytics/by-department
  → analytics.service runs raw SQL:
      SELECT e.department, s.currency,
             COUNT(*)      AS headcount,
             AVG(s.base_amount) AS avg_salary,
             MIN(s.base_amount) AS min_salary,
             MAX(s.base_amount) AS max_salary
      FROM salaries s
      JOIN employees e ON e.id = s.employee_id
      WHERE s.effective_to IS NULL
        AND e.employment_status = 'active'
      GROUP BY e.department, s.currency
      ORDER BY e.department, s.currency
  → shape into { group, currency, headcount, avgSalary, minSalary, maxSalary }[]
```

Only *current* salaries of *active* employees count.

### 2.4 Salary Distribution Histogram

```
GET /analytics/distribution
  → analytics.service runs raw SQL using WIDTH_BUCKET:
      SELECT currency,
             WIDTH_BUCKET(base_amount, min_val, max_val, 10) AS bucket_num,
             ...
      FROM salaries s JOIN employees e ...
      WHERE s.effective_to IS NULL AND e.employment_status = 'active'
      GROUP BY currency, bucket_num
  → returns bucket label, lower bound, and employee count per bucket
```

The client renders this as a bar chart (Recharts `<BarChart>`) per currency.

### 2.5 Authentication Flow (Client Side)

```
1. User visits any authenticated route
   → AppLayout calls useAuth() → loading=true shown
   → AuthProvider mounts → calls GET /auth/me
     a. Cookie present + valid → user set → page renders
     b. No cookie / expired → user null → replace('/login')

2. User submits login form
   → useAuth().login({ email, password })
   → POST /auth/login → server sets httpOnly cookie
   → GET /auth/me → user populated → replace('/employees')

3. User clicks Sign out
   → useAuth().logout()
   → POST /auth/logout → server clears cookie
   → user null → replace('/login')
```

---

## 3. Testing Strategy

Fast, deterministic, and meaningful — both frontend and backend.

### 3.1 Server (NestJS) — `server/`

Run with: `npm run test` (unit), `npm run test:e2e` (end-to-end), `npm run test:cov` (coverage).

- **Unit tests (the bulk) — services, controllers, filters, interceptors; repositories mocked.**
  - `salaries.service` — transaction logic: new salary closes the old one; exactly one `effective_to IS NULL` row per employee; rejects dates earlier than or equal to current active salary; handles first-ever salary.
  - `analytics.service` — verifies SQL groupings and aggregation logic are correct.
  - `employees.service` — pagination logic, filter composition, soft-delete states.
  - `auth.service` / `auth.controller` — credential validation, bcrypt comparison, cookie creation.
  - `AllExceptionsFilter` & `ResponseInterceptor` — standardised error mappings and envelope formatting.
- **Code Coverage Target:** > 95% on business logic files. Excludes migrations, seeds, guards, strategies, entities, and module descriptors.

### 3.2 Client (Next.js) — `client/`

Run with: `bun run test` (Vitest via Bun) or `bun run test:watch`.

**Test infrastructure:** Vitest + React Testing Library + `@testing-library/user-event`. Because Bun's native test runner doesn't support `jsdom` as a named environment, `bun.setup.ts` bootstraps DOM globals manually (window, document, HTMLElement) and `bunfig.toml` preloads it. The `vitest.config.ts` sets `environment: 'jsdom'` for Vitest's own runner.

**16 test files, 96 tests covering:**

| File | What's tested |
|---|---|
| `lib/utils.test.ts` | `cn()` merging, `formatMoney()` formatting + fallback |
| `lib/api.test.ts` | `ApiRequestError` construction, status, name, instanceof |
| `app/hooks/use-debounce.test.ts` | Initial return, delay, timer reset, custom delay |
| `context/auth-context.test.tsx` | Mount/me call, user set, login flow, logout flow, outside-provider throw |
| `app/login/page.test.tsx` | Form render, loading state, redirect when authed, validation errors, login call, 401 / 5xx errors |
| `app/(app)/layout.test.tsx` | Loading state, unauthenticated redirect, nav render, user email, children, sign-out |
| `app/(app)/employees/page.test.tsx` | Heading, skeleton, rows after load, empty state, error, add link, pagination, salary format, no-salary dash |
| `app/(app)/employees/employee-form.test.tsx` | Create vs edit mode fields, submit button label, pre-fill, validation block |
| `app/(app)/employees/add/page.test.tsx` | Heading, back link, form presence, validation blocks API call |
| `app/(app)/employees/[id]/page.test.tsx` | Loading, employee info, salary history, Current badge, error state, action buttons |
| `app/(app)/employees/[id]/edit/page.test.tsx` | Loading, error, heading, pre-fill, update + navigate, back link |
| `app/(app)/employees/[id]/record-salary-dialog.test.tsx` | Trigger, dialog open, validation errors, successful submit, server error, default currency |
| `app/(app)/analytics/page.test.tsx` | Loading, error, heading, all four child components present |
| `app/(app)/analytics/overview-cards.test.tsx` | Headcount, global coverage metrics |
| `app/(app)/analytics/grouped-bar-chart.test.tsx` | Title, empty data, single vs multi-currency selector |
| `app/(app)/analytics/distribution-chart.test.tsx` | Heading, empty data, single vs multi-currency selector |

**Mocking strategy:**
- All API calls (`@/lib/api`) are mocked with `vi.mock` — no real server needed.
- `next/navigation` (`useRouter`, `useParams`) is mocked per test file.
- `next/link` is stubbed as a plain `<a>` tag.
- Recharts components for chart tests are rendered with a `ResizeObserver` stub.
- Complex UI library components (Base-UI Select popup, Popover calendar) that don't render in jsdom are tested at the boundary — their underlying `react-hook-form` fields are exercised via `fireEvent` directly.

---

## 4. Seeding 10,000 Employees

`database/seeds/seed.ts`:
- Generates 10k employees across a realistic spread of countries, departments, and job titles using `@faker-js/faker` with a **fixed seed** for full reproducibility.
- Assigns each employee 1–4 staggered salary records (chronological tiers with 5%–15% raises), not just a flat current salary.
- Inserts in **batches of ~1,000** via `repository.insert([...])`, not 10k individual `save()` calls. Batching completes the full ingestion in seconds.
- Also inserts the single HR login user (`HR_EMAIL` / `HR_PASSWORD` from env).
- **Re-runnable:** truncates all tables before inserting, giving a clean known dataset every time.

---

## 5. Trade-offs and Deliberate Cuts

| Decision | Chose | Over | Why |
|---|---|---|---|
| Database | PostgreSQL | SQLite | Real money decimal types, transaction performance, concurrent edits, `WIDTH_BUCKET` for histograms. |
| Salary storage | Append-only history rows | Mutable salary column | History is core to tracking raises and auditing; overwriting destroys it. |
| Aggregation location | In Postgres | In Node | 10k-row averages and statistics belong in SQL, not JS memory. |
| Distribution query | `WIDTH_BUCKET` SQL | Load rows + bucket in JS | Keeps row loading O(1), avoids memory spikes, uses the same indexed query. |
| Auth | Secure JWT httpOnly cookie | Full RBAC + multi-user roles | One HR-manager persona in requirements. Minimal protection built; Admin/Viewer separation left for later. |
| Currency reporting | Strict per-currency grouping | Conversion to base USD | Mixing currencies is mathematically incorrect. Partitioning by currency is sound and avoids FX rate complexity. |
| Audit logging | Preserved via salary append history | Separate audit logs table | Append-only salaries satisfy raise auditability. Additional user-action log tables cut for simplicity. |
| Frontend state management | Local `useState` + `useEffect` per page | Redux / Zustand / React Query | Single user, no cross-page shared mutable state. Simpler is correct here. |
| Client test runner | Vitest + jsdom manual bootstrap | Built-in `bun test` + happy-dom | Vitest's mature mocking (`vi.mock`) and React Testing Library integration were needed; jsdom bootstrapped via `bun.setup.ts` preload to make `bun test` also work. |