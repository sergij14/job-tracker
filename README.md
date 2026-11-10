# Case Study: Job Tracker - A job application tracker with AI autofill

A full-stack app for tracking job applications from wishlist to offer, with a status history for every application and pipeline stats built on it. Built with Next.js 16 (App Router, Server Actions), React 19, PostgreSQL with Drizzle ORM, better-auth (GitHub sign-in), the Vercel AI SDK with Claude, and shadcn/ui on Base UI.

## The Problem

A job search produces a long list that keeps changing while you look at it. The usual way to page through a list is `LIMIT 25 OFFSET 50`, which breaks as soon as the list moves. Add one application while you're on page 2 and every row shifts down by one, so page 3 opens with a row you've already seen. Delete one and a row slips between two pages and is never shown.

The AI autofill adds a cost problem. Every call to the model costs money, so there's a daily limit per user and a daily limit across all users. The obvious implementation is to count today's calls and, if they're under the limit, make the call and record it. That has a race: two requests that arrive together both read "9 of 10 used", both pass the check, and both make the call. Under load, the same race lets total spend run past the global cap.

## Key Technical Decisions

### Keyset pagination with full-precision cursors

Pages are fetched by position, not by offset. The list is ordered by `(created_at, id)`, newest first, and each page link carries a cursor: the `(created_at, id)` of the last row shown. The next page asks for rows that sort after that pair, so inserts and deletes elsewhere in the list can't change what comes next.

```
Page 1:  ORDER BY created_at DESC, id DESC LIMIT 26
         last row shown → cursor = ('2026-10-09 14:02:11.482913+00', 9802)

Page 2:  WHERE (created_at, id) < ('2026-10-09 14:02:11.482913+00', 9802)
         ORDER BY created_at DESC, id DESC LIMIT 26
```

Fetching 26 rows for a 25-row page tells the server whether a next page exists without a separate `COUNT`. `id` breaks ties between rows created at the same instant. Going back a page flips the comparison and the sort order, then reverses the rows.

The cursor's timestamp is read from Postgres as text (`created_at::text`), not as a JavaScript `Date`. Postgres stores microseconds, while `Date` keeps only milliseconds. A cursor cut to the millisecond is slightly earlier than the real row, so rows created in that sub-millisecond gap would be skipped. Cursors are base64url-encoded and validated with Zod when they come back. A malformed cursor falls back to the first page.

### AI quotas reserved under an advisory lock

The quota check and the usage record happen in one transaction that starts by taking a Postgres advisory lock (`pg_advisory_xact_lock`). Concurrent autofill requests wait on the lock, so each one sees the counts left by the one before it, and the last slot can only be taken once. The transaction commits before the model is called, so the lock is held for a count and an insert, not for the round trip to the AI provider.

```
autofill request → BEGIN → take lock → count today's calls (this user + everyone)
                   ├─ over either limit → "limit reached", nothing written
                   └─ under both        → insert usage row → COMMIT
                                          → call the model
                                          → write token counts onto that row
```

Because the slot is reserved before the call and the token counts are written after it, the `ai_usage` table is also a cost log. A call that fails still uses its slot, so retries can't push the total past the cap. The limits are 10 autofills per user and 100 across all users per day, set in `lib/ai-limits.ts`. An integration test fires the requests concurrently against real Postgres to prove the lock holds (see [Tested against real Postgres](#tested-against-real-postgres)).

### The job posting is untrusted input

A pasted posting is text from a stranger, and it goes straight into a prompt. The prompt wraps it in `<job_posting>` tags and tells the model to treat it as data and ignore any instructions inside it. The model has to answer in a Zod schema (`isJobPosting`, `company`, `position`) rather than free text, and the answers are cut to the same length limits as the form. Input is capped at 8,000 characters and output at 300 tokens.

The AI never writes to the database. It fills in the form, and the user checks it and saves through the same validated Server Action as a hand-typed entry.

### A status history that can't fork

A status column only says where an application is now. The questions a job search raises are about time: when did I apply, how long until they replied, how many applications got an interview, even the ones that ended in a rejection. So every status an application enters is recorded in `application_events` (`from_status`, `to_status`, `created_at`), in the same transaction as the change itself. Creating an application records its starting status with a null `from_status`.

```
updateStatus → BEGIN → SELECT status … FOR UPDATE   (lock the row, read the current status)
                     → UPDATE applications SET status = …
                     → INSERT application_events (from = old status, to = new status)
                     → COMMIT
```

Two details keep the history a single chain under concurrent edits:

- **The row is locked before the old status is read.** Without `FOR UPDATE`, two changes sent together both read the same starting status, and the history forks: `applied → interview` and `applied → rejected`, with no record of how one became the other. With the lock, the second change waits, then reads the status the first one left.
- **Events are stamped with `clock_timestamp()`, not `now()`.** In Postgres `now()` is the time the *transaction started*. A change that waited on the lock started before the change it waited behind, so it got an earlier timestamp and the timeline came out in the wrong order. The concurrency test caught this. `clock_timestamp()` is the time of the insert, which happens after the lock is taken.

The edit page shows the history as a timeline with the gap between steps ("Applied → Interview · 8 days later"). The home page uses it for two numbers:

- **Interview rate**: the share of sent applications that reached an interview or offer, now or at any point, so a later rejection doesn't erase the interview.
- **Median time to a reply**: days from `applied_at` to the first move to interview, offer or rejection, computed in one query with `percentile_cont(0.5)`. Applications still waiting are skipped, because `percentile_cont` ignores nulls. Applications created straight into "interview" are skipped too, since they have no measured wait. The first reply is a correlated subquery per application, served by the `(application_id, created_at)` index. Over 10,000 seeded applications the whole query takes about 20 ms.

Applications created before the history existed have no events. The migration doesn't backfill guesses about their past: they count toward the interview rate by their current status and stay out of the median.

### Ownership enforced in every query

Every query for a single application filters on both the application id and the signed-in user's id in the same `WHERE` clause:

```ts
and(eq(applications.id, applicationId), eq(applications.userId, userId));
```

There's no separate "load it, then check the owner" step to forget. Updating or deleting someone else's application matches zero rows. The edit page uses the same condition and returns the same 404 for an id that doesn't exist and an id that belongs to someone else, so it doesn't reveal which ids exist. Ids and statuses sent from the browser are validated with Zod before they reach a query.

### Optimistic updates that roll themselves back

Changing a status or deleting a row updates the table immediately with React's `useOptimistic`, while the Server Action runs in a transition. If the action fails, the user sees a toast, and the optimistic change disappears when the transition ends because the table falls back to the rows the server last sent. There's no undo code to keep in sync: the server's data is always what the table returns to. Rows waiting on the server are dimmed and marked `aria-busy`.

### The URL holds the list state

The search text, status filter and page cursor all live in the URL, so a filtered view can be bookmarked, shared or reached with the back button. The status cards on the home page are plain links to `/applications?status=…`. Search updates the URL 300 ms after the user stops typing, and changing a filter drops the cursor so new results start on page one. Search text is matched literally: `%` and `_` are escaped before they go into `ILIKE`.

The Suspense boundary around the table is keyed on the cursor only. Moving to another page shows a skeleton, while changing a filter keeps the current rows on screen with a small spinner until the new ones arrive.

### Tested against real Postgres

The two claims above that matter most are about concurrency, and mocks can't test concurrency. The integration tests in `tests/` run against the docker-compose Postgres, in a separate `job_tracker_test` database that's migrated once per run and truncated between tests. The setup refuses to run against a database whose name doesn't end in `_test`.

| Test | What it fires | What must hold |
| --- | --- | --- |
| Per-user quota | 30 reservations for one user at once | Exactly 10 granted, and their `remaining` values are 9…0, each slot handed out once |
| Global quota | 120 reservations from 12 users at once | Exactly 100 granted |
| History chain | 4 status changes to one application at once | Each event's `from` is the previous event's `to`, and the last matches the row |
| Pipeline stats | Hand-written histories | Interview rate and median match a worked example, other users' data excluded |

Each concurrency test was checked by removing the lock it protects and confirming it fails. Without the advisory lock, one user got **14–15 of 10** slots, and all users together got **105–108 of 100**. Without `FOR UPDATE`, the history forked on every run.

To keep this testable, database writes live in `db/mutations.ts`, next to the reads in `db/queries.ts`, and the Server Actions handle auth, validation and revalidation. The quota reservation moved out of the `"use server"` file to `lib/ai-quota.ts`, because every export from that file becomes an endpoint the browser can call.

### Smaller decisions

- **The applied date is set by the database.** `applied_at` is written as `coalesce(applied_at, current_date)` the first time an application leaves the wishlist, so later status changes never overwrite the original date.
- **Companies are upserted in one statement.** `ON CONFLICT (name) DO UPDATE … RETURNING id` returns the existing company's id on a conflict, where `DO NOTHING` would return no row and need a second query. The upsert and the application write share one transaction.
- **Migrations run only on production builds.** Vercel runs `drizzle-kit migrate` before the build only when `VERCEL_ENV` is `production`, so preview deployments never change the production schema.
- **Realistic test data.** `npm run db:seed:bulk` inserts thousands of applications in a single SQL statement with `generate_series`, for testing pagination and search on a long list. A data-modifying CTE (`WITH inserted AS (INSERT … RETURNING …)`) writes each application's history in the same statement, so the stats have data to work with.

## Running locally

```bash
npm install
docker compose up -d    # Postgres 18 on localhost:5432
npm run db:migrate
npm run dev             # http://localhost:3000
npm test                # integration tests, against the same Postgres
```

Create `.env.local` with:

| Variable                                   | Purpose                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | Postgres connection string, e.g. `postgres://postgres:postgres@localhost:5432/job_tracker`  |
| `BETTER_AUTH_SECRET`                       | Secret used by better-auth to sign sessions                                                 |
| `BETTER_AUTH_URL`                          | The app's URL, e.g. `http://localhost:3000`                                                 |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | A GitHub OAuth app with the callback URL `http://localhost:3000/api/auth/callback/github`   |
| `ANTHROPIC_API_KEY`                        | For AI autofill                                                                             |
| `AI_MODEL`                                 | Optional. The Claude model for autofill, `claude-haiku-4-5` by default                      |
| `SEED_USER_EMAIL`                          | The email the seed scripts attach data to. Use your GitHub email to see it after signing in |

To add sample data, run `npm run db:seed` for a few applications or `npm run db:seed:bulk -- 10000` for a long list.
