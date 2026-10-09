import { createApplication } from "@/app/actions";
import { ApplicationForm } from "@/components/application-form";
import { requireUser } from "@/lib/session";

export default async function NewApplicationPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-2xl font-semibold">New application</h1>
      <ApplicationForm action={createApplication} submitLabel="Save" />
    </main>
  );
}
