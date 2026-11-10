import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { ApplicationsTable } from "@/components/applications-table";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getPipelineStats,
  getRecentApplications,
  getStatusCounts,
} from "@/db/queries";
import { requireUser } from "@/lib/session";
import { STATUSES } from "@/lib/statuses";

const RECENT_LIMIT = 5;

// The median of an even count can land on a half day.
function formatDays(days: number) {
  const rounded = Math.round(days * 2) / 2;
  return `${rounded} ${rounded === 1 ? "day" : "days"}`;
}

export default async function HomePage() {
  const user = await requireUser();

  const [counts, recent, pipeline] = await Promise.all([
    getStatusCounts(user.id),
    getRecentApplications(user.id, RECENT_LIMIT),
    getPipelineStats(user.id),
  ]);

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <main className="mx-auto w-full max-w-4xl p-8">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description={
          total === 0
            ? "Add your first application to get started."
            : `You're tracking ${total} ${total === 1 ? "application" : "applications"}.`
        }
        userName={user.name}
      />

      <section aria-labelledby="by-status" className="mb-8">
        <h2 id="by-status" className="sr-only">
          By status
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STATUSES.map((status) => (
            <Link
              key={status}
              href={`/applications?status=${status}`}
              className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card size="sm" className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardDescription className="capitalize">
                    {status}
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums">
                    {counts[status]}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {pipeline.applied > 0 && (
        <section aria-labelledby="pipeline" className="mb-8">
          <h2 id="pipeline" className="sr-only">
            Pipeline
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card size="sm">
              <CardHeader>
                <CardDescription>Interview rate</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {Math.round((pipeline.interviewed / pipeline.applied) * 100)}%
                </CardTitle>
                <CardDescription>
                  {pipeline.interviewed} of {pipeline.applied} sent{" "}
                  {pipeline.applied === 1 ? "application" : "applications"}{" "}
                  reached an interview
                </CardDescription>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Median time to a reply</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {pipeline.medianDaysToResponse === null
                    ? "—"
                    : formatDays(pipeline.medianDaysToResponse)}
                </CardTitle>
                <CardDescription>
                  {pipeline.medianDaysToResponse === null
                    ? "No replies recorded yet"
                    : "From applying to the first interview, offer or rejection"}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      )}

      <section aria-labelledby="recent">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="recent" className="text-lg font-semibold">
            Recent applications
          </h2>
          {total > 0 && (
            <Link
              href="/applications"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View all
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          )}
        </div>
        <ApplicationsTable rows={recent} emptyMessage="No applications yet." />
      </section>
    </main>
  );
}
