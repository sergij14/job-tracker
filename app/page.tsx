import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { ApplicationsTable } from "@/components/applications-table";
import { db } from "@/db";
import { applications, companies } from "@/db/schema";

export default async function HomePage() {
  const rows = await db
    .select({
      id: applications.id,
      position: applications.position,
      status: applications.status,
      appliedAt: applications.appliedAt,
      company: companies.name,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .orderBy(desc(applications.createdAt), desc(applications.id));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Job applications</h1>
        <Link
          href="/applications/new"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          Add application
        </Link>
      </div>

      <ApplicationsTable rows={rows} />
    </main>
  );
}
