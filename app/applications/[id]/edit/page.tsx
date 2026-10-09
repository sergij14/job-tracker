import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateApplication } from "@/app/actions";
import { ApplicationForm } from "@/components/application-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { applications, companies } from "@/db/schema";
import { requireUser } from "@/lib/session";

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();

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
    .where(
      and(eq(applications.id, applicationId), eq(applications.userId, user.id)),
    )
    .limit(1);

  if (!row) notFound();

  const action = updateApplication.bind(null, row.id);

  return (
    <main className="mx-auto w-full max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Edit application</h1>
          </CardTitle>
          <CardDescription>
            Update the details of this application.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </main>
  );
}
