# CLAUDE.md — Backend Engineering Standards

All code in this repository MUST follow these guidelines. This is a **Node.js + Express.js backend API**.

---

## Project Overview

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQL (mysql2/pg) with optional Firestore (firebase-admin)
- **Auth:** JWT (access + refresh tokens)
- **Validation:** Joi or Zod
- **Logging:** Winston
- **Testing:** Jest + Supertest

---

## Setup & Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (nodemon)
npm start            # Start production server
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
```

### Environment

Copy `.env.example` to `.env` and fill in required values. Never commit `.env` files.

Required env vars: `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `CORS_ORIGIN`

---

## Architecture

### Folder Structure

```
src/
  controllers/       # HTTP request/response handling
  services/          # Business logic
  repositories/      # Database access (queries only)
  models/            # Data models/schemas
  routes/            # Route definitions
  middlewares/       # Express middleware (auth, validation, error handling)
  validators/        # Joi/Zod request schemas
  utils/             # Helper functions
  config/            # App configuration (db, logger, env)
  constants/         # App-wide constants
  app.js             # Express app setup
```

### Request Flow (strict — never skip layers)

```
Request -> Route -> Validation Middleware -> Auth Middleware -> Controller -> Service -> Repository -> Database
```

---

## Layer Rules

### Controller
- Extract data from `req.body`, `req.params`, `req.query`
- Call the appropriate service method
- Return response using `res.success()` or pass errors to `next()`
- **Must NOT** contain business logic or database queries

### Service
- Implement all business logic and data transformation
- Call repositories for data access
- Throw `AppError` for business rule violations
- Manage transactions when needed
- **Must NOT** access `req` or `res` objects

### Repository
- Execute database queries using parameterized statements
- Return raw data — no business logic
- Handle database-specific errors
- **Must NOT** contain business rules or HTTP concerns

### Validator
- Define Joi/Zod schemas for request body validation
- Use `abortEarly: false` and `stripUnknown: true`
- Applied as middleware before the controller

---

## API Response Format

All responses use the standardized response middleware (`res.success()` / `res.error()`).

### Success
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {}
}
```

### Success (paginated)
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Email is required" }
  ]
}
```

---

## Error Handling

- Use the custom `AppError` class (`utils/errors.js`) with `message`, `statusCode`, and optional `errors` array
- Set `isOperational: true` for expected errors; unhandled errors default to 500
- All async controller methods must be wrapped with `asyncHandler` or use try/catch with `next(error)`
- The global error handler middleware suppresses stack traces and internal details in production

---

## Authentication & Authorization

- JWT Bearer tokens via `Authorization` header
- Access tokens: short-lived (default 15 minutes)
- Refresh tokens: stored in httpOnly cookies (default 7 days)
- Middleware: `authenticate` verifies token, `authorize(...roles)` checks permissions
- Route order: validation -> authentication -> authorization -> controller
- Passwords hashed with bcrypt (minimum 10 salt rounds)

---

## Security Rules (non-negotiable)

- **Parameterized queries only** — never interpolate user input into SQL strings
- **Validate all inputs** at the boundary using Joi/Zod schemas
- **Use helmet** for HTTP security headers
- **Use express-rate-limit** on auth and public endpoints
- **Use CORS** with explicit allowed origins (never `*` in production)
- **Never log** passwords, tokens, or sensitive user data
- **Never commit** `.env`, credentials, or secret keys
- **Sanitize** data before storage to prevent XSS/injection
- **Pin dependency versions** in package.json; run `npm audit` regularly

---

## Database Rules

- Always use parameterized queries (prepared statements)
- Add indexes on frequently queried columns
- Use foreign key constraints for referential integrity
- Paginate all list endpoints — never return unbounded result sets
- Version-control all schema changes via migrations with rollback scripts

### Query Optimization
- **Never use `SELECT *`** — select only the columns you need
- **Avoid N+1 queries** — use JOINs, subqueries, or batch fetching (`WHERE id IN (...)`)
- **Use `EXPLAIN`/`EXPLAIN ANALYZE`** on any query touching large tables before shipping
- **Add composite indexes** for queries that filter/sort on multiple columns — column order in the index must match the query's WHERE/ORDER BY clause
- **Avoid functions on indexed columns** in WHERE clauses (e.g., `WHERE YEAR(created_at) = 2026` breaks index usage; use range instead: `WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01'`)
- **Use LIMIT early** — when joining large tables, filter with WHERE/LIMIT before joining, not after
- **Avoid OFFSET for deep pagination** — use keyset/cursor-based pagination (`WHERE id > last_seen_id ORDER BY id LIMIT 20`) for large datasets
- **Count queries** — use `COUNT(*)` (not `COUNT(column)`) unless you specifically need to exclude NULLs; the optimizer handles `COUNT(*)` better
- **Cache expensive queries** — if a query runs frequently and the data changes infrequently, cache the result (in-memory or Redis) with a TTL and invalidate on writes

### Transactions (commit/rollback)
- **Every multi-step write operation MUST be wrapped in a transaction** — if any step fails, all changes roll back
- **Always use try/catch/finally** around transactions:
  ```js
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    // ... all write operations using `connection` (not `db`)
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release(); // ALWAYS release, even on success
  }
  ```
- **Use the same connection object** for all queries within a transaction — do not mix `db.query()` and `connection.query()` inside the same transaction
- **Keep transactions short** — do all reads and validations BEFORE starting the transaction; only put actual writes inside it
- **Never await external calls inside a transaction** (HTTP requests, file I/O, email sends) — this holds the connection open and blocks the pool
- **Set a transaction timeout** — if your DB driver supports it, set a max lock wait time to prevent deadlocks from hanging forever
- **Deadlock prevention** — when multiple transactions touch the same tables, always lock rows in a **consistent order** (e.g., always lock `users` before `orders`). If a deadlock occurs, catch the error and retry once with exponential backoff
- **Isolation levels** — use the default (`REPEATABLE READ` for MySQL, `READ COMMITTED` for PostgreSQL) unless you have a specific reason to change it; document why if you do
- **Firestore transactions** — use `db.runTransaction()` which handles retries automatically; never manually commit/rollback Firestore transactions

### Connection Pool Management
- **Always use connection pooling** — never create a new connection per request
- **Configure pool limits** — set `connectionLimit` (recommended: 10-20 for most apps) based on your database's max connections divided by the number of app instances
- **Always release connections** — every `getConnection()` must have a matching `release()` in a `finally` block
- **Handle pool exhaustion** — set `waitForConnections: true` and `queueLimit: 0` (unlimited queue) so requests wait rather than fail; log a warning if the queue grows
- **Monitor for connection leaks** — if a connection is not released within 30 seconds, log an error; use `pool.on('release')` and `pool.on('acquire')` events for tracking in development

---

## Concurrency & Race Conditions

- **Idempotent endpoints** — design all write APIs so that calling them twice with the same input produces the same result (use unique constraint checks, not just INSERT)
- **Optimistic locking** — for update-sensitive data, add a `version` or `updated_at` column; on update, include `WHERE version = ?` and throw a 409 Conflict if no row was affected (another request updated it first)
- **Atomic operations** — use `UPDATE ... SET count = count + 1` instead of read-then-write patterns; the database handles atomicity
- **Avoid in-memory shared state** — do not store request-scoped data in module-level variables; Node.js is single-threaded but async interleaving causes race conditions:
  ```js
  // WRONG — race condition between concurrent requests
  let pendingCount = 0;
  app.post('/process', async (req, res) => {
    pendingCount++;
    await doWork();      // another request can interleave here
    pendingCount--;
  });
  ```
- **Use database locks for critical sections** — if two requests must not process the same resource simultaneously, use `SELECT ... FOR UPDATE` within a transaction
- **Distributed locks** — if running multiple app instances, use Redis-based locks (e.g., Redlock) for operations that must be globally exclusive (e.g., cron-like jobs, invoice number generation)
- **Queue heavy work** — if a request triggers work that takes >500ms (email, PDF generation, image processing), push it to a job queue (Bull/BullMQ with Redis) and return 202 Accepted immediately
- **Debounce duplicate submissions** — use a unique `idempotency-key` header for mutation endpoints; store it in Redis with a short TTL; return the cached response for duplicate keys

---

## Performance & Speed

### Request Lifecycle
- **Set response timeouts** — configure a global timeout (e.g., 30 seconds) so slow handlers don't hold connections forever; return 503 if a timeout is reached
- **Compress responses** — use `compression` middleware for gzip/brotli; skip for responses under 1KB
- **Stream large payloads** — never load entire files into memory; use `fs.createReadStream()` piped to `res` for file downloads, and streaming parsers for uploads
- **Limit request body size** — set `express.json({ limit: '1mb' })` (or appropriate size); reject oversized payloads early with 413

### Async Best Practices
- **Never block the event loop** — no `fs.readFileSync`, `crypto.pbkdf2Sync`, `JSON.parse` on huge strings, or CPU-heavy loops in request handlers
- **Parallelize independent async calls** with `Promise.all()`:
  ```js
  // WRONG — sequential when they could be parallel
  const user = await userRepo.findById(id);
  const orders = await orderRepo.findByUserId(id);

  // RIGHT — parallel execution
  const [user, orders] = await Promise.all([
    userRepo.findById(id),
    orderRepo.findByUserId(id),
  ]);
  ```
- **Use `Promise.allSettled()`** when you need all results even if some fail (e.g., sending notifications to multiple channels)
- **Never fire-and-forget promises** — unhandled rejections crash the process; if you intentionally don't await, add `.catch(logger.error)`
- **Avoid unbounded `Promise.all()`** — if processing a large array, batch it (e.g., 10 at a time) to avoid overwhelming the DB pool or external APIs:
  ```js
  // Process in batches of 10
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(item => processItem(item)));
  }
  ```

### Caching
- **Cache read-heavy, write-light data** — user profiles, config, permissions
- **Use TTL-based invalidation** — set a sensible expiry (e.g., 5 minutes) rather than manual invalidation when possible
- **Cache at the right layer** — repository layer for query results, service layer for computed data
- **Invalidate on writes** — after any INSERT/UPDATE/DELETE that affects cached data, delete or update the cache entry
- **Never cache user-specific data in shared in-memory objects** — use Redis or per-request caching only

### Memory & Resource Leaks
- **Close all resources** — database connections, file handles, streams, and timers must be cleaned up; use `finally` blocks
- **Set `maxSockets`** on HTTP agents when calling external APIs to prevent connection exhaustion
- **Avoid large closures** — don't capture entire `req` or large objects in callbacks that outlive the request lifecycle
- **Monitor heap usage** — in production, expose `/health` with `process.memoryUsage()` data; alert if RSS grows continuously

---

## Reliability & Fault Tolerance

- **Graceful shutdown** — on `SIGTERM`/`SIGINT`, stop accepting new requests, wait for in-flight requests to complete (with a timeout), close DB pool, then exit
- **Health check endpoint** — expose `GET /health` that verifies DB connectivity and returns 200 or 503
- **Retry with backoff** — for transient failures (network errors, DB timeouts, 502/503 from external APIs), retry up to 3 times with exponential backoff (e.g., 100ms, 400ms, 1600ms); never retry 4xx errors
- **Circuit breaker** — if an external service fails repeatedly, stop calling it for a cooldown period instead of hammering it and queuing up timeouts
- **Validate at system boundaries** — trust internal code, but validate everything entering the system (user input, webhook payloads, external API responses)
- **Handle partial failures** — if a batch operation has some items fail, log failures, process successes, and return a detailed response (not a blanket 500)
- **Unhandled rejection handler** — register `process.on('unhandledRejection')` to log and exit gracefully (do not swallow it)
- **Log with context** — every log entry for a request should include a request ID (`X-Request-Id` header or UUID generated in middleware) so you can trace the full lifecycle of a failed request

---

## Code Standards

### Naming
- Files: `camelCase.js` (e.g., `userController.js`, `authService.js`)
- Classes: `PascalCase` (e.g., `UserService`, `AppError`)
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Routes: `kebab-case` (e.g., `/api/user-profiles`)

### Pattern
- Export class instances from controllers, services, and repositories (`module.exports = new UserService()`)
- One class per file, matching file name to class purpose
- Use `async/await` over raw Promises or callbacks
- Use `const` by default; `let` only when reassignment is needed; never `var`

### Do NOT
- Leave `console.log` in production code — use Winston logger
- Commit commented-out code
- Put business logic in controllers or routes
- Put HTTP concerns (`req`/`res`) in services
- Use `SELECT *` in production queries — select only needed columns
- Catch errors silently — always log or rethrow
- Use synchronous file or crypto operations in request handlers

---

## Testing

```
tests/
  unit/
    services/
    repositories/
    utils/
  integration/
    routes/
  setup.js
```

- Unit tests: mock the repository layer when testing services
- Integration tests: use Supertest against actual routes
- Test file naming: `<module>.test.js`
- Cover success paths, error paths, and edge cases
- Run `npm test` before every commit

---

## Git Conventions

### Commit Messages (Conventional Commits)
```
feat: add user authentication with JWT
fix: resolve memory leak in image upload
refactor: extract validation logic to middleware
docs: update API documentation for user endpoints
test: add unit tests for user service
chore: update dependencies
```

### Branch Strategy
- `main` — production-ready code
- `develop` — integration branch
- `feature/<name>` — new features
- `fix/<name>` — bug fixes
- `hotfix/<name>` — urgent production fixes

### Pull Requests
- Descriptive title and description
- Link related issues
- Ensure CI passes before merge
- Request review from relevant team members

---

## Route Organization

Mount all route modules from a central `routes/index.js`:

```js
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/assessments', assessmentRoutes);
```

Each route file applies middleware in order: `validate` -> `authenticate` -> `authorize` -> `controller.method`

---

**Last Updated:** March 2026
**Version:** 3.0
