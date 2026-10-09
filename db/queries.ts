import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { Status } from "@/lib/statuses";
import { z } from "zod";
import { db } from "@/db";
import { applications, companies } from "@/db/schema";

export const PAGE_SIZE = 25;

// A cursor identifies one row's position in the sort order: [created_at, id].
const cursorSchema = z.tuple([
  z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/),
  z.number().int().positive(),
]);

type Cursor = z.infer<typeof cursorSchema>;

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
      id: applications.id,
      position: applications.position,
      status: applications.status,
      appliedAt: applications.appliedAt,
      company: companies.name,
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
