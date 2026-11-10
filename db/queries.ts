import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import { STATUSES, type Status } from "@/lib/statuses";
import { z } from "zod";
import { db } from "@/db";
import { applicationEvents, applications, companies } from "@/db/schema";

export const PAGE_SIZE = 25;

// A cursor identifies one row's position in the sort order: [created_at, id].
const cursorSchema = z.tuple([
  z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/),
  z.number().int().positive(),
]);

type Cursor = z.infer<typeof cursorSchema>;

// The columns every application list shows.
const rowFields = {
  id: applications.id,
  position: applications.position,
  status: applications.status,
  appliedAt: applications.appliedAt,
  company: companies.name,
};

function encodeCursor(cursor: Cursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string | undefined): Cursor | null {
  if (!value) return null;

  try {
    return cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString()),
    );
  } catch {
    return null;
  }
}

export async function getApplicationsPage(
  userId: number,
  params: { after?: string; before?: string; status?: Status; q?: string },
) {
  const after = decodeCursor(params.after);
  const before = after ? null : decodeCursor(params.before);
  const backwards = before !== null;
  const cursor = after ?? before;

  const cursorCondition = cursor
    ? backwards
      ? sql`(${applications.createdAt}, ${applications.id}) > (${cursor[0]}::timestamptz, ${cursor[1]}::int)`
      : sql`(${applications.createdAt}, ${applications.id}) < (${cursor[0]}::timestamptz, ${cursor[1]}::int)`
    : undefined;

  // Escape LIKE wildcards so the user's text is matched literally.
  const pattern = params.q ? `%${params.q.replace(/[\\%_]/g, "\\$&")}%` : null;

  const searchCondition = pattern
    ? or(ilike(applications.position, pattern), ilike(companies.name, pattern))
    : undefined;

  const fetched = await db
    .select({
      ...rowFields,
      createdAtText: sql<string>`${applications.createdAt}::text`,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        eq(applications.userId, userId),
        params.status ? eq(applications.status, params.status) : undefined,
        searchCondition,
        cursorCondition,
      ),
    )
    .orderBy(
      backwards ? asc(applications.createdAt) : desc(applications.createdAt),
      backwards ? asc(applications.id) : desc(applications.id),
    )
    .limit(PAGE_SIZE + 1);

  const hasMore = fetched.length > PAGE_SIZE;
  const pageRows = fetched.slice(0, PAGE_SIZE);
  if (backwards) pageRows.reverse();

  const first = pageRows[0];
  const last = pageRows[pageRows.length - 1];
  const hasPrevious = backwards ? hasMore : after !== null;
  const hasNext = backwards ? true : hasMore;

  return {
    rows: pageRows.map(({ createdAtText, ...row }) => row),
    previousCursor:
      hasPrevious && first
        ? encodeCursor([first.createdAtText, first.id])
        : null,
    nextCursor:
      hasNext && last ? encodeCursor([last.createdAtText, last.id]) : null,
  };
}

export async function getRecentApplications(userId: number, limit: number) {
  return db
    .select(rowFields)
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt), desc(applications.id))
    .limit(limit);
}

// How many of the user's applications are in each status, including zeros.
export async function getStatusCounts(userId: number) {
  const rows = await db
    .select({ status: applications.status, count: count() })
    .from(applications)
    .where(eq(applications.userId, userId))
    .groupBy(applications.status);

  const counts = Object.fromEntries(
    STATUSES.map((status) => [status, 0]),
  ) as Record<Status, number>;

  for (const row of rows) counts[row.status] = row.count;

  return counts;
}

// Every status the application has been in, oldest first. Joined to
// applications so the ownership check lives in the same query.
export async function getApplicationHistory(
  userId: number,
  applicationId: number,
) {
  return db
    .select({
      id: applicationEvents.id,
      fromStatus: applicationEvents.fromStatus,
      toStatus: applicationEvents.toStatus,
      createdAt: applicationEvents.createdAt,
    })
    .from(applicationEvents)
    .innerJoin(applications, eq(applicationEvents.applicationId, applications.id))
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.userId, userId),
      ),
    )
    .orderBy(asc(applicationEvents.createdAt), asc(applicationEvents.id));
}

const INTERVIEW_STATUSES: Status[] = ["interview", "offer"];
const RESPONSE_STATUSES: Status[] = ["interview", "offer", "rejected"];

// Of the applications that left the wishlist: how many reached an interview,
// and the median number of days from applying to the first reply (an
// interview, offer or rejection).
export async function getPipelineStats(userId: number) {
  // An application counts as interviewed if it's in an interview status now or
  // ever was, so a later rejection doesn't erase the interview. Rows created
  // before history was recorded only have their current status to go on.
  const everInterviewed = db
    .select({ id: applicationEvents.applicationId })
    .from(applicationEvents)
    .where(inArray(applicationEvents.toStatus, INTERVIEW_STATUSES));

  // First reply, from history. Creation rows (from_status is null) are
  // skipped: an application added straight into "interview" has no measured
  // wait. Correlated per application, so it's an index lookup on
  // (application_id, created_at), not a scan of everyone's history.
  const firstResponseAt = sql`(
    select min(${applicationEvents.createdAt})
    from ${applicationEvents}
    where ${applicationEvents.applicationId} = ${applications.id}
      and ${isNotNull(applicationEvents.fromStatus)}
      and ${inArray(applicationEvents.toStatus, RESPONSE_STATUSES)}
  )`;

  const [stats] = await db
    .select({
      applied: count(),
      interviewed: sql<number>`count(*) filter (where ${or(
        inArray(applications.status, INTERVIEW_STATUSES),
        inArray(applications.id, everInterviewed),
      )})`.mapWith(Number),
      // percentile_cont skips nulls: applications still waiting for a reply.
      medianDaysToResponse: sql<number | null>`percentile_cont(0.5) within group (
        order by (${firstResponseAt})::date - ${applications.appliedAt}
      )`.mapWith((value) => (value === null ? null : Number(value))),
    })
    .from(applications)
    .where(
      and(eq(applications.userId, userId), isNotNull(applications.appliedAt)),
    );

  return stats;
}
