import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateApplication } from "@/app/actions";
import { ApplicationForm } from "@/components/application-form";
import { StatusTimeline } from "@/components/status-timeline";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { getApplicationHistory } from "@/db/queries";
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

  const history = await getApplicationHistory(user.id, row.id);
  const action = updateApplication.bind(null, row.id);

  return (
    <main className="mx-auto w-full max-w-md space-y-6 p-8">
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

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>History</h2>
          </CardTitle>
          <CardDescription>Every status this application has been in.</CardDescription>
        </CardHeader>
        <CardContent>
          <StatusTimeline events={history} />
        </CardContent>
      </Card>
    </main>
  );
}
