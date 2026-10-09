# Case Study: Job Tracker - A job application tracker with AI autofill

A full-stack app for tracking job applications from wishlist to offer. Built with Next.js 16 (App Router, Server Actions), React 19, PostgreSQL with Drizzle ORM, better-auth (GitHub sign-in), the Vercel AI SDK with Claude, and shadcn/ui on Base UI.

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

Because the slot is reserved before the call and the token counts are written after it, the `ai_usage` table is also a cost log. A call that fails still uses its slot, so retries can't push the total past the cap. The limits are 10 autofills per user and 100 across all users per day, set in `lib/ai-limits.ts`.

### The job posting is untrusted input

A pasted posting is text from a stranger, and it goes straight into a prompt. The prompt wraps it in `<job_posting>` tags and tells the model to treat it as data and ignore any instructions inside it. The model has to answer in a Zod schema (`isJobPosting`, `company`, `position`) rather than free text, and the answers are cut to the same length limits as the form. Input is capped at 8,000 characters and output at 300 tokens.

The AI never writes to the database. It fills in the form, and the user checks it and saves through the same validated Server Action as a hand-typed entry.

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

### Smaller decisions

- **The applied date is set by the database.** `applied_at` is written as `coalesce(applied_at, current_date)` the first time an application leaves the wishlist, so later status changes never overwrite the original date.
- **Companies are upserted in one statement.** `ON CONFLICT (name) DO UPDATE … RETURNING id` returns the existing company's id on a conflict, where `DO NOTHING` would return no row and need a second query. The upsert and the application write share one transaction.
- **Migrations run only on production builds.** Vercel runs `drizzle-kit migrate` before the build only when `VERCEL_ENV` is `production`, so preview deployments never change the production schema.
- **Realistic test data.** `npm run db:seed:bulk` inserts thousands of applications in a single SQL statement with `generate_series`, for testing pagination and search on a long list.

## Running locally

```bash
npm install
docker compose up -d    # Postgres 18 on localhost:5432
npm run db:migrate
npm run dev             # http://localhost:3000
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
