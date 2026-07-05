# AI Workflow & Prompts

How AI tools were used during the development of this project — the strategy, specific prompts, outcomes, and where human judgment was required.

---

## 1. AI Tools Used

| Tool | Role |
|---|---|
| **Antigravity (Google DeepMind)** | Primary agentic coding assistant — architecture decisions, code generation, debugging, test writing, documentation |
| **ChatGPT / Claude** | Secondary reference — checking library APIs, edge-case reasoning |

---

## 2. Workflow Philosophy

AI was used as a **pair programmer with agentic file-write access**, not a one-shot code generator. The approach:

1. **Plan first, code second** — ask AI to produce an implementation plan before writing any code. Review and approve the plan; execution only begins after explicit approval.
2. **Verify every step** — after AI writes code, always run it (tests, build, docker compose) before moving on.
3. **Correct and teach** — when AI made wrong assumptions or produced failing code, the correction was given precisely and the next iteration was verified.
4. **Keep AI in scope** — AI was not told "build everything". Each session had a clear bounded task.

---

## 3. Key Phases & Prompts Used

### Phase 1 — Project Setup & Architecture Planning

**Prompt (paraphrased):**
> "I need to build a salary management system for ~10,000 employees across multiple countries. Single HR manager persona. The core requirement is managing compensation records and answering analytics questions about pay. Plan the architecture — stack, data model, module boundaries — and give me a design doc before writing any code."

**What AI produced:**
- Recommended PostgreSQL (over SQLite) specifically for `NUMERIC` money types, transaction support, and `GROUP BY currency` correctness
- Proposed the append-only salary history pattern (new row per change, `effective_to` close) before any code was written
- Outlined the three-module NestJS structure: employees, salaries, analytics
- Drafted `requirements.md` and `architecture.md` as living design artifacts

**Human decision:** Approved the append-only pattern and PostgreSQL. Explicitly scoped out RBAC and FX conversion.

---

### Phase 2 — NestJS Backend

**Prompts used:**
> "Generate the Employee and Salary entities with TypeORM. Money must be NUMERIC(12,2), never a JS float."

> "Implement the salary record endpoint. It must be transactional — close the current row and insert the new one atomically."

> "Add paginated, filtered employee list. Filters are department, country, status, and free-text search on name/email/code. Push all filtering to SQL — no JS .filter()."

> "Add four analytics endpoints: overview by currency, by country, by department, and a salary distribution histogram using WIDTH_BUCKET."

**What worked well:**
- AI correctly implemented the transaction for salary append without being told the exact SQL
- AI used `QueryBuilder` with `.andWhere()` chaining for combinable filters, not raw SQL strings

**What needed correction:**
- Initial analytics service loaded all rows then aggregated in JS — corrected with: *"Aggregation must happen in Postgres, not Node. Rewrite to use raw SQL with GROUP BY."*
- TypeScript error on `Request` object missing `user` property — fixed by extending Express's `Request` interface via declaration merging

---

### Phase 3 — OpenAPI / Swagger Documentation

**Prompt:**
> "Add full Swagger/OpenAPI documentation. Every endpoint needs `@ApiOperation`, `@ApiResponse`. DTOs need `@ApiProperty`. The security scheme should be httpOnly cookie auth."

**What AI produced:**
- Full decorator coverage on all controllers
- `@ApiBearerAuth` replaced with a custom cookie security scheme
- Response DTO classes for all endpoints including analytics shapes

---

### Phase 4 — Next.js Frontend

**Prompts used:**
> "Build the employees list page. It should have server-side pagination, filter controls (department, country, status), a search box with 400ms debounce, and a sortable table."

> "Build the employee detail page with a salary history table. The current salary row should have a 'Current' badge."

> "Build the analytics dashboard. It needs four charts: overview cards (headcount + currency breakdown), grouped bar chart for by-department and by-country, and a distribution histogram. Use Recharts."

> "Build the RecordSalaryDialog — a modal form to record a new salary with validation (positive amount, ISO currency, date after current salary)."

**What worked well:**
- AI kept the `formatMoney()` utility using `Intl.NumberFormat` with fallback for unknown currencies — correct approach
- AI proposed the `AuthProvider` + `useAuth` pattern to avoid prop-drilling auth state

**What needed correction:**
- Several TypeScript errors that surfaced during `next build`:
  - `Select` state type: `Dispatch<SetStateAction<string>>` not assignable — fixed by widening the type
  - Tooltip `formatter` prop — value typed as `ValueType | undefined`, not `number` — fixed with nullish guard
  - `EmployeeQuery` not assignable to `Record<string, unknown>` — fixed by adding an index signature

---

### Phase 5 — Testing

**Backend (NestJS):**
> "Write comprehensive unit tests for salaries.service — test the transaction, the close-previous logic, the first-ever salary case, and rejection of earlier dates."

> "Write unit tests for analytics.service, employees.service, auth.service, AllExceptionsFilter, and ResponseInterceptor. Mock all repositories."

**Frontend (Next.js / Vitest):**
> "Write tests for all screens and all functionality in ./client"

**AI produced an implementation plan first** (16 files, 96 tests) with explicit mocking strategy for:
- `@/lib/api` — all endpoints mocked with `vi.mock`
- `next/navigation` — `useRouter`/`useParams` mocked per file
- Complex UI library components (Base-UI Select, Popover calendar) — tested at the boundary via `fireEvent` on controlled inputs rather than trying to drive the popup in jsdom

**Issues encountered and fixed:**
- `ReferenceError: document is not defined` when running `bun test` — jsdom not natively supported in Bun 1.3. Fixed by writing `bun.setup.ts` to bootstrap DOM globals manually and preloading it via `bunfig.toml`.
- `@testing-library/user-event` not installed — added as dev dependency.
- `CardTitle` in shadcn renders as `<div>`, not `<h2>` — tests updated to use `getByText` with `data-slot` selector rather than `getByRole('heading')`.
- Docker build failed: `bun.setup.ts` picked up by Next.js TypeScript checker. Fixed by excluding test files in `tsconfig.json` and adding `@types/jsdom`.

---

### Phase 6 — Seed Script

**Prompt:**
> "Write a seed script that generates 10,000 realistic employees using @faker-js/faker with a fixed seed for reproducibility. Each employee should have 1–4 salary history records (chronological tiers, 5–15% raises). Insert in batches of 1,000. Also insert the HR login user."

**What AI produced:**
- Fixed seed (`faker.seed(42)`) for full reproducibility
- Realistic country/currency/department/title distributions
- Batch insert via `repository.insert([...])` — completes in a few seconds
- Truncate-before-insert for re-runnability

---

## 4. Where Human Judgment Was Critical

| Decision | Human input required |
|---|---|
| Append-only salary history | Explicitly approved this pattern over a mutable column |
| `NUMERIC` for money | Insisted on no floats — caught an early AI draft using `decimal` incorrectly |
| Currency never mixed | Rejected an early AI analytics approach that averaged across currencies |
| Scope cuts | Explicitly told AI: no RBAC, no FX rates, no payroll processing |
| Test strategy | Approved the plan before execution; directed AI to test boundaries not internals |
| Docker networking | Diagnosed `ENOTFOUND db` — AI suggested `DB_HOST` env var fix; human confirmed the hostname routing |

---

## 5. Prompt Patterns That Worked Best

| Pattern | Example |
|---|---|
| **Constraint-first** | *"Money must be NUMERIC(12,2), never a JS float"* |
| **Tell it what NOT to do** | *"No in-app row loops — all aggregation in SQL"* |
| **Bounded scope** | One feature per session, not "build the whole app" |
| **Plan before code** | Always ask for an implementation plan and approve it first |
| **Paste the actual error** | Paste the exact TypeScript / test failure output, not a paraphrase |
| **Verify after each step** | Run tests/build after each AI change before continuing |
