import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateApplication } from "@/app/actions";
import { ApplicationForm } from "@/components/application-form";
import { db } from "@/db";
import { applications, companies } from "@/db/schema";

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const applicationId = Number(id);

  if (!Number.isInteger(applicationId) || applicationId <= 0) notFound();

  const [row] = await db
    .select({
      id: applications.id,
      position: applications.position,
      status: applications.status,
      url: applications.url,
      company: companies.name,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!row) notFound();

  const action = updateApplication.bind(null, row.id);

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-2xl font-semibold">Edit application</h1>
      <ApplicationForm
        action={action}
        submitLabel="Save changes"
        initialValues={{
          company: row.company,
          position: row.position,
          url: row.url ?? "",
          status: row.status,
        }}
      />
    </main>
  );
}
