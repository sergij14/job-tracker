import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ApplicationsTable } from "@/components/applications-table";
import { ListFilters } from "@/components/list-filters";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/table-skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getApplicationsPage } from "@/db/queries";
import { requireUser } from "@/lib/session";
import type { Status } from "@/lib/statuses";
import { statusSchema } from "@/lib/validation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Filters = { after?: string; before?: string; status?: Status; q: string };

async function ApplicationsList({
  userId,
  filters,
}: {
  userId: number;
  filters: Filters;
}) {
  const { rows, previousCursor, nextCursor } = await getApplicationsPage(
    userId,
    filters,
  );

  // Pagination links keep the active filters.
  function pageHref(cursor: { after?: string; before?: string }) {
    const next = new URLSearchParams();
    if (filters.status) next.set("status", filters.status);
    if (filters.q) next.set("q", filters.q);
    if (cursor.after) next.set("after", cursor.after);
    if (cursor.before) next.set("before", cursor.before);
    return `/applications?${next}`;
  }

  const isFiltered = Boolean(filters.status || filters.q);

  return (
    <>
      <ApplicationsTable
        rows={rows}
        emptyMessage={
          isFiltered
            ? "No applications match your filters."
            : "No applications yet."
        }
      />

      {(previousCursor || nextCursor) && (
        <Pagination className="mt-6">
          <PaginationContent>
            {previousCursor && (
              <PaginationItem>
                <PaginationPrevious
                  href={pageHref({ before: previousCursor })}
                />
              </PaginationItem>
            )}
            {nextCursor && (
              <PaginationItem>
                <PaginationNext href={pageHref({ after: nextCursor })} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}

export default async function ApplicationsPage({
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

  return (
    <main className="mx-auto w-full max-w-4xl p-8">
      <Link
        href="/"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "mb-2 -ml-2.5",
        })}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Home
      </Link>

      <PageHeader title="Job applications" userName={user.name} />

      <ListFilters />

      <Suspense
        key={`${after ?? ""}|${before ?? ""}`}
        fallback={<TableSkeleton />}
      >
        <ApplicationsList
          userId={user.id}
          filters={{ after, before, status, q }}
        />
      </Suspense>
    </main>
  );
}
