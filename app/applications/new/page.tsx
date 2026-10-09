import { createApplication } from "@/app/actions";
import { ApplicationForm } from "@/components/application-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/session";

export default async function NewApplicationPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>New application</h1>
          </CardTitle>
          <CardDescription>
            Paste a posting or fill in the details yourself.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationForm
            action={createApplication}
            submitLabel="Save"
            autofill
          />
        </CardContent>
      </Card>
    </main>
  );
}
