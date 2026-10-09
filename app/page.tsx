import Link from "next/link";
import { ApplicationsTable } from "@/components/applications-table";
import { SignOutButton } from "@/components/auth-buttons";
import { ListFilters } from "@/components/list-filters";
import { getApplicationsPage } from "@/db/queries";
import { requireUser } from "@/lib/session";
import { statusSchema } from "@/lib/validation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  const params = await searchParams;
  const after = typeof params.after === "string" ? params.after : undefined;
  const before = typeof params.before === "string" ? params.before : undefined;
  const status = statusSchema.safeParse(params.status).data;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";

  const { rows, previousCursor, nextCursor } = await getApplicationsPage(
    user.id,
    {
      after,
      before,
      status,
      q,
    },
  );

  // Pagination links keep the active filters.
  function pageHref(cursor: { after?: string; before?: string }) {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (q) next.set("q", q);
    if (cursor.after) next.set("after", cursor.after);
    if (cursor.before) next.set("before", cursor.before);
    return `/?${next}`;
  }

  const isFiltered = Boolean(status || q);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-4 flex items-center justify-end gap-4 text-sm">
        <span>{user.name}</span>
        <SignOutButton />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Job applications</h1>
        <Link
          href="/applications/new"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          Add application
        </Link>
      </div>

      <ListFilters />

      <ApplicationsTable
        rows={rows}
        emptyMessage={
          isFiltered
            ? "No applications match your filters."
            : "No applications yet."
        }
      />

      <nav className="mt-6 flex justify-between text-sm">
        {previousCursor ? (
          <Link href={pageHref({ before: previousCursor })}>← Previous</Link>
        ) : (
          <span />
        )}
        {nextCursor ? (
          <Link href={pageHref({ after: nextCursor })}>Next →</Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
