import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, companies } from "@/db/schema";
import Link from "next/link";

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
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Job applications</h1>
        <Link
          href="/applications/new"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          Add application
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-500">No applications yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b text-gray-500">
            <tr>
              <th className="py-2">Company</th>
              <th className="py-2">Position</th>
              <th className="py-2">Status</th>
              <th className="py-2">Applied</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-2">{row.company}</td>
                <td className="py-2">{row.position}</td>
                <td className="py-2">{row.status}</td>
                <td className="py-2">{row.appliedAt ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
